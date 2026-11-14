-- Comentários humanos por questão. Requer 15_admin_analytics_presence.sql.
-- Aplicar integralmente após revisão. Não altera o acervo nem resultados.
BEGIN;
CREATE SCHEMA IF NOT EXISTS community_private;
REVOKE ALL ON SCHEMA community_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA community_private TO anon, authenticated;

CREATE TABLE public.community_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  alias text NOT NULL CHECK (char_length(btrim(alias)) BETWEEN 3 AND 30 AND alias !~ '[<>[:cntrl:]]'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX community_alias_unique ON public.community_profiles(lower(alias));
CREATE TABLE public.question_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id bigint NOT NULL REFERENCES public.questoes(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  parent_id uuid REFERENCES public.question_comments(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) <= 2000),
  spoiler boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden', 'removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  moderated_at timestamptz,
  moderated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CHECK (status = 'removed' OR char_length(btrim(body)) > 0)
);
CREATE INDEX question_comments_thread ON public.question_comments(question_id, parent_id, created_at DESC, id);
CREATE TABLE public.comment_likes (
  comment_id uuid NOT NULL REFERENCES public.question_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY(comment_id, user_id)
);
CREATE TABLE public.comment_reports (
  comment_id uuid NOT NULL REFERENCES public.question_comments(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'other')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY(comment_id, reporter_id)
);
CREATE INDEX comment_reports_pending ON public.comment_reports(created_at DESC) WHERE resolved_at IS NULL;
-- Retain rate-limit history even when an author removes their comment.
CREATE TABLE community_private.write_events (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX community_events_user_time ON community_private.write_events(user_id, action, created_at DESC);

ALTER TABLE public.community_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_private.write_events ENABLE ROW LEVEL SECURITY;
-- No direct table grants/policies: all access goes through the narrow RPC API.
-- Definer implementations are outside PostgREST's exposed public schema and
-- validate identity/ownership themselves. Public wrappers are SECURITY INVOKER.
REVOKE ALL ON public.community_profiles, public.question_comments, public.comment_likes,
  public.comment_reports, community_private.write_events FROM PUBLIC, anon, authenticated;

CREATE FUNCTION community_private.comment_json(c public.question_comments) RETURNS jsonb
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'id', c.id, 'questionId', c.question_id, 'parentId', c.parent_id,
    'body', CASE WHEN c.status = 'removed' THEN '' ELSE c.body END,
    'alias', CASE WHEN c.status = 'removed' THEN 'Comentário removido'
                  ELSE coalesce((SELECT p.alias FROM public.community_profiles p WHERE p.user_id = c.author_id), 'Estudante') END,
    'spoiler', c.spoiler, 'status', c.status, 'createdAt', c.created_at,
    'mine', coalesce(c.author_id = auth.uid(), false) AND c.status <> 'removed',
    'liked', EXISTS(SELECT 1 FROM public.comment_likes l WHERE l.comment_id = c.id AND l.user_id = auth.uid()),
    'likes', (SELECT count(*) FROM public.comment_likes l WHERE l.comment_id = c.id),
    'replyCount', (SELECT count(*) FROM public.question_comments r WHERE r.parent_id = c.id AND r.status = 'visible')
  )
$$;

CREATE FUNCTION community_private.list_comments(p_question_id bigint, p_sort text, p_page integer, p_parent_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb; total bigint; thread_total bigint;
BEGIN
  IF p_question_id IS NULL OR p_question_id <= 0 OR p_sort IS NULL OR p_sort NOT IN ('recent', 'popular')
     OR p_page IS NULL OR p_page NOT BETWEEN 0 AND 5000 THEN
    RAISE EXCEPTION 'Consulta inválida.' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.questoes WHERE id = p_question_id) THEN
    RAISE EXCEPTION 'Questão não encontrada.' USING ERRCODE = 'P0002';
  END IF;
  IF p_parent_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.question_comments WHERE id = p_parent_id AND question_id = p_question_id
    AND parent_id IS NULL AND status <> 'hidden'
  ) THEN RAISE EXCEPTION 'Conversa indisponível.' USING ERRCODE = 'P0002'; END IF;

  SELECT count(*) INTO total FROM public.question_comments c WHERE c.question_id = p_question_id
    AND c.status = 'visible' AND (c.parent_id IS NULL OR EXISTS (
      SELECT 1 FROM public.question_comments p WHERE p.id = c.parent_id AND p.status <> 'hidden'));
  SELECT count(*) INTO thread_total FROM public.question_comments c WHERE c.question_id = p_question_id
    AND c.parent_id IS NOT DISTINCT FROM p_parent_id AND (c.status = 'visible' OR (
      c.status = 'removed' AND c.parent_id IS NULL AND EXISTS (
        SELECT 1 FROM public.question_comments r WHERE r.parent_id = c.id AND r.status = 'visible')));

  SELECT coalesce(jsonb_agg(item ORDER BY position), '[]'::jsonb) INTO result FROM (
    SELECT community_private.comment_json(c) item, row_number() OVER (
      ORDER BY CASE WHEN p_sort = 'popular' THEN (SELECT count(*) FROM public.comment_likes l WHERE l.comment_id = c.id) END DESC,
      c.created_at DESC, c.id DESC) position
    FROM public.question_comments c WHERE c.question_id = p_question_id
    AND c.parent_id IS NOT DISTINCT FROM p_parent_id AND (c.status = 'visible' OR (
      c.status = 'removed' AND c.parent_id IS NULL AND EXISTS (
        SELECT 1 FROM public.question_comments r WHERE r.parent_id = c.id AND r.status = 'visible')))
    ORDER BY position LIMIT 20 OFFSET p_page * 20
  ) page;
  RETURN jsonb_build_object('items', result, 'total', total, 'hasMore', thread_total > (p_page + 1) * 20,
    'alias', (SELECT alias FROM public.community_profiles WHERE user_id = auth.uid()),
    'canPost', EXISTS(SELECT 1 FROM auth.users WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL AND NOT coalesce(is_anonymous, false)),
    'isAdmin', CASE WHEN auth.uid() IS NOT NULL THEN public.is_analytics_admin() ELSE false END);
END $$;

CREATE FUNCTION community_private.write_comment(p_action text, p_question_id bigint, p_comment_id uuid,
  p_parent_id uuid, p_body text, p_spoiler boolean, p_alias text, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE uid uuid := auth.uid(); target public.question_comments; new_id uuid; is_admin boolean;
BEGIN
  IF uid IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = uid
    AND email_confirmed_at IS NOT NULL AND NOT coalesce(is_anonymous, false)) THEN
    RAISE EXCEPTION 'Entre com uma conta e confirme seu e-mail para participar.' USING ERRCODE = '42501';
  END IF;
  -- Serialize writes by identity across requests, including direct SDK RPC calls.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text, 19019));
  is_admin := public.is_analytics_admin();
  IF p_action = 'post' THEN
    IF p_question_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.questoes WHERE id = p_question_id)
      OR p_body IS NULL OR char_length(btrim(p_body)) NOT BETWEEN 1 AND 2000 OR p_spoiler IS NULL THEN
      RAISE EXCEPTION 'Escreva entre 1 e 2.000 caracteres em uma questão válida.' USING ERRCODE = '22023';
    END IF;
    IF p_parent_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.question_comments
      WHERE id = p_parent_id AND question_id = p_question_id AND parent_id IS NULL AND status <> 'hidden') THEN
      RAISE EXCEPTION 'Resposta inválida para esta conversa.' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (SELECT 1 FROM community_private.write_events WHERE user_id = uid AND action = 'post'
      AND created_at > clock_timestamp() - interval '15 seconds') THEN
      RAISE EXCEPTION 'Aguarde antes de publicar novamente.';
    END IF;
    IF (SELECT count(*) FROM community_private.write_events WHERE user_id = uid AND action = 'post'
      AND created_at > clock_timestamp() - interval '1 hour') >= 20 THEN
      RAISE EXCEPTION 'Limite de 20 publicações por hora atingido.';
    END IF;
    IF NOT EXISTS(SELECT 1 FROM public.community_profiles WHERE user_id = uid) THEN
      IF p_alias IS NULL OR char_length(btrim(p_alias)) NOT BETWEEN 3 AND 30 OR p_alias ~ '[<>[:cntrl:]]' THEN
        RAISE EXCEPTION 'Escolha um apelido de 3 a 30 caracteres.' USING ERRCODE = '22023';
      END IF;
      INSERT INTO public.community_profiles(user_id, alias) VALUES (uid, btrim(p_alias));
    END IF;
    INSERT INTO public.question_comments(question_id, author_id, parent_id, body, spoiler)
      VALUES(p_question_id, uid, p_parent_id, btrim(p_body), p_spoiler) RETURNING id INTO new_id;
    INSERT INTO community_private.write_events(user_id, action) VALUES(uid, 'post');
    RETURN jsonb_build_object('id', new_id);
  END IF;

  SELECT * INTO target FROM public.question_comments WHERE id = p_comment_id AND question_id = p_question_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Comentário indisponível.' USING ERRCODE = 'P0002'; END IF;
  IF p_action IN ('hide', 'restore', 'resolve') THEN
    IF NOT is_admin THEN RAISE EXCEPTION 'Acesso restrito à moderação.' USING ERRCODE = '42501'; END IF;
    IF p_action IN ('hide', 'restore') AND target.status <> 'removed' THEN
      UPDATE public.question_comments SET status = CASE WHEN p_action = 'hide' THEN 'hidden' ELSE 'visible' END,
        moderated_at = now(), moderated_by = uid WHERE id = target.id;
    ELSIF p_action = 'resolve' THEN
      UPDATE public.comment_reports SET resolved_at = now(), resolved_by = uid
        WHERE comment_id = target.id AND resolved_at IS NULL;
    END IF;
  ELSIF p_action = 'remove' THEN
    IF target.author_id IS DISTINCT FROM uid THEN RAISE EXCEPTION 'Você só pode remover seus comentários.' USING ERRCODE = '42501'; END IF;
    UPDATE public.question_comments SET body = '', status = 'removed', spoiler = false WHERE id = target.id;
    DELETE FROM public.comment_likes WHERE comment_id = target.id;
  ELSE
    IF target.status <> 'visible' OR (target.parent_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.question_comments WHERE id = target.parent_id AND status = 'hidden')) THEN
      RAISE EXCEPTION 'Comentário indisponível.' USING ERRCODE = 'P0002';
    END IF;
    IF p_action = 'like' THEN
      INSERT INTO public.comment_likes VALUES(target.id, uid) ON CONFLICT DO NOTHING;
    ELSIF p_action = 'unlike' THEN
      DELETE FROM public.comment_likes WHERE comment_id = target.id AND user_id = uid;
    ELSIF p_action = 'report' THEN
      IF p_reason IS NULL OR p_reason NOT IN ('spam', 'harassment', 'inappropriate', 'other') THEN
        RAISE EXCEPTION 'Escolha um motivo para a denúncia.' USING ERRCODE = '22023';
      END IF;
      IF NOT EXISTS(SELECT 1 FROM public.comment_reports WHERE comment_id = target.id AND reporter_id = uid) THEN
        IF (SELECT count(*) FROM community_private.write_events WHERE user_id = uid AND action = 'report'
          AND created_at > clock_timestamp() - interval '1 hour') >= 10 THEN
          RAISE EXCEPTION 'Limite de denúncias por hora atingido.';
        END IF;
        INSERT INTO public.comment_reports(comment_id, reporter_id, reason) VALUES(target.id, uid, p_reason);
        INSERT INTO community_private.write_events(user_id, action) VALUES(uid, 'report');
      END IF;
    ELSE RAISE EXCEPTION 'Ação inválida.' USING ERRCODE = '22023'; END IF;
  END IF;
  RETURN jsonb_build_object('success', true);
END $$;

CREATE FUNCTION community_private.moderation(p_page integer) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb; total bigint;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_analytics_admin() THEN
    RAISE EXCEPTION 'Acesso restrito à moderação.' USING ERRCODE = '42501';
  END IF;
  IF p_page IS NULL OR p_page NOT BETWEEN 0 AND 5000 THEN RAISE EXCEPTION 'Página inválida.' USING ERRCODE = '22023'; END IF;
  SELECT count(*) INTO total FROM public.question_comments c WHERE c.status = 'hidden'
    OR EXISTS(SELECT 1 FROM public.comment_reports r WHERE r.comment_id = c.id AND r.resolved_at IS NULL);
  SELECT coalesce(jsonb_agg(item ORDER BY created_at DESC, id DESC), '[]'::jsonb) INTO result FROM (
    SELECT c.id, c.created_at, community_private.comment_json(c) || jsonb_build_object('reports', coalesce((
      SELECT jsonb_agg(jsonb_build_object('reason', r.reason, 'createdAt', r.created_at) ORDER BY r.created_at DESC)
      FROM public.comment_reports r WHERE r.comment_id = c.id AND r.resolved_at IS NULL), '[]'::jsonb)) item
    FROM public.question_comments c WHERE c.status = 'hidden'
      OR EXISTS(SELECT 1 FROM public.comment_reports r WHERE r.comment_id = c.id AND r.resolved_at IS NULL)
    ORDER BY c.created_at DESC, c.id DESC LIMIT 20 OFFSET p_page * 20
  ) page;
  RETURN jsonb_build_object('items', result, 'hasMore', total > (p_page + 1) * 20);
END $$;

CREATE FUNCTION public.community_list(p_question_id bigint, p_sort text DEFAULT 'recent', p_page integer DEFAULT 0, p_parent_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT community_private.list_comments(p_question_id, p_sort, p_page, p_parent_id)
$$;
CREATE FUNCTION public.community_write(p_action text, p_question_id bigint DEFAULT NULL, p_comment_id uuid DEFAULT NULL,
  p_parent_id uuid DEFAULT NULL, p_body text DEFAULT NULL, p_spoiler boolean DEFAULT false, p_alias text DEFAULT NULL, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT community_private.write_comment(p_action, p_question_id, p_comment_id, p_parent_id, p_body, p_spoiler, p_alias, p_reason)
$$;
CREATE FUNCTION public.community_moderation(p_page integer DEFAULT 0) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$ SELECT community_private.moderation(p_page) $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA community_private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.community_list(bigint, text, integer, uuid),
  public.community_write(text, bigint, uuid, uuid, text, boolean, text, text), public.community_moderation(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION community_private.list_comments(bigint, text, integer, uuid),
  public.community_list(bigint, text, integer, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION community_private.write_comment(text, bigint, uuid, uuid, text, boolean, text, text),
  public.community_write(text, bigint, uuid, uuid, text, boolean, text, text),
  community_private.moderation(integer), public.community_moderation(integer) TO authenticated;
COMMIT;
