-- Inclui avatarUrl seguro nos comentários da comunidade. Requer 19_question_comments.sql.
BEGIN;

CREATE OR REPLACE FUNCTION community_private.author_avatar(p_user_id uuid) RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_email text;
  v_meta jsonb;
  v_motivos_raw text;
  v_motivos jsonb;
  v_candidate text;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT lower(u.email), u.raw_user_meta_data
    INTO v_email, v_meta
    FROM auth.users u
   WHERE u.id = p_user_id;

  IF v_email IS NOT NULL THEN
    SELECT us.motivos
      INTO v_motivos_raw
      FROM public.usuarios us
     WHERE lower(us.email) = v_email
     ORDER BY us.id DESC
     LIMIT 1;

    IF v_motivos_raw IS NOT NULL AND left(btrim(v_motivos_raw), 1) = '{' THEN
      BEGIN
        v_motivos := v_motivos_raw::jsonb;
        v_candidate := nullif(btrim(v_motivos->>'foto_url'), '');
      EXCEPTION WHEN OTHERS THEN
        v_candidate := NULL;
      END;
    END IF;
  END IF;

  IF v_candidate IS NULL AND v_meta IS NOT NULL THEN
    v_candidate := coalesce(
      nullif(btrim(v_meta->>'foto_url'), ''),
      nullif(btrim(v_meta->>'avatar_url'), ''),
      nullif(btrim(v_meta->>'picture'), '')
    );
  END IF;

  IF v_candidate IS NULL THEN
    RETURN NULL;
  END IF;

  IF char_length(v_candidate) <= 2048
     AND v_candidate ~ '^https://[^[:space:]"<>'']+$' THEN
    RETURN v_candidate;
  END IF;

  IF char_length(v_candidate) <= 150000
     AND v_candidate ~ '^data:image/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$' THEN
    RETURN v_candidate;
  END IF;

  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION community_private.comment_json(c public.question_comments) RETURNS jsonb
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'id', c.id, 'questionId', c.question_id, 'parentId', c.parent_id,
    'body', CASE WHEN c.status = 'removed' THEN '' ELSE c.body END,
    'alias', CASE WHEN c.status = 'removed' THEN 'Comentário removido'
                  ELSE coalesce((SELECT p.alias FROM public.community_profiles p WHERE p.user_id = c.author_id), 'Estudante') END,
    'avatarUrl', CASE WHEN c.status = 'removed' THEN NULL
                      ELSE community_private.author_avatar(c.author_id) END,
    'spoiler', c.spoiler, 'status', c.status, 'createdAt', c.created_at,
    'mine', coalesce(c.author_id = auth.uid(), false) AND c.status <> 'removed',
    'liked', EXISTS(SELECT 1 FROM public.comment_likes l WHERE l.comment_id = c.id AND l.user_id = auth.uid()),
    'likes', (SELECT count(*) FROM public.comment_likes l WHERE l.comment_id = c.id),
    'replyCount', (SELECT count(*) FROM public.question_comments r WHERE r.parent_id = c.id AND r.status = 'visible')
  )
$$;

REVOKE ALL ON FUNCTION community_private.author_avatar(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION community_private.comment_json(public.question_comments) FROM PUBLIC, anon, authenticated;

COMMIT;
