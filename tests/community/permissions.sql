\set ON_ERROR_STOP on
BEGIN;
SET ROLE anon;
SELECT public.community_list(1, 'recent', 0, NULL);
DO $$ BEGIN
  PERFORM public.community_write('post', 1, NULL, NULL, 'BANAL.', false, 'Cadete', NULL);
  RAISE EXCEPTION 'anonymous write allowed';
EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
SELECT public.community_write('post', 1, NULL, NULL, 'BANAL.', false, 'Cadete', NULL) AS posted \gset
DO $$ BEGIN
  IF (public.community_list(1, 'recent', 0, NULL)->>'total')::int <> 1 THEN RAISE EXCEPTION 'missing comment'; END IF;
  BEGIN
    PERFORM public.community_write('post', 1, NULL, NULL, 'spam', false, NULL, NULL);
    RAISE EXCEPTION 'rate limit bypassed';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM <> 'Aguarde antes de publicar novamente.' THEN RAISE; END IF;
  END;
END $$;
RESET ROLE;
-- Persist test reference without exposing author IDs through public API.
SELECT id AS root_id FROM public.question_comments WHERE body = 'BANAL.' \gset
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
SELECT public.community_write('like', 1, :'root_id', NULL, NULL, false, NULL, NULL);
SELECT public.community_write('like', 1, :'root_id', NULL, NULL, false, NULL, NULL);
SELECT public.community_write('post', 1, NULL, :'root_id', 'Banal é minha nota', false, 'Recruta', NULL);
DO $$ DECLARE r jsonb; BEGIN
  r := public.community_list(1, 'popular', 0, NULL);
  IF (r->'items'->0->>'likes')::int <> 1 THEN RAISE EXCEPTION 'duplicate likes'; END IF;
  IF r->'items'->0 ? 'author_id' THEN RAISE EXCEPTION 'private author leaked'; END IF;
END $$;
-- Another user cannot remove the root.
SELECT public.community_write('report', 1, :'root_id', NULL, NULL, false, NULL, 'spam');
DO $$ DECLARE cid uuid; BEGIN
  cid := (public.community_list(1, 'recent', 0, NULL)->'items'->0->>'id')::uuid;
  BEGIN
    PERFORM public.community_write('remove', 1, cid, NULL, NULL, false, NULL, NULL);
    RAISE EXCEPTION 'foreign removal allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.community_write('post', 2, NULL, cid, 'cross question', false, 'Recruta', NULL);
    RAISE EXCEPTION 'cross-question reply allowed';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; WHEN SQLSTATE 'P0001' THEN NULL; END;
  BEGIN
    PERFORM public.community_moderation(0);
    RAISE EXCEPTION 'non-admin moderation allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM 1 FROM public.comment_reports;
    RAISE EXCEPTION 'reports exposed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.question_comments(question_id, author_id, body) VALUES (1, auth.uid(), 'bypass');
    RAISE EXCEPTION 'direct table write allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
-- Administrator can hide, restore and resolve reports.
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
SELECT set_config('request.jwt.claim.email', 'admin@example.test', true);
SELECT public.community_moderation(0);
SELECT public.community_write('hide', 1, :'root_id', NULL, NULL, false, NULL, NULL);
DO $$ BEGIN
 IF (public.community_list(1, 'recent', 0, NULL)->>'total')::int <> 0 THEN RAISE EXCEPTION 'hidden replies leaked'; END IF;
END $$;
SELECT public.community_write('restore', 1, :'root_id', NULL, NULL, false, NULL, NULL);
SELECT public.community_write('resolve', 1, :'root_id', NULL, NULL, false, NULL, NULL);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
SELECT public.community_write('remove', 1, :'root_id', NULL, NULL, false, NULL, NULL);
DO $$ DECLARE r jsonb; BEGIN
  r := public.community_list(1, 'recent', 0, NULL);
  IF r->'items'->0->>'body' <> '' OR r->'items'->0->>'alias' <> 'Comentário removido' THEN RAISE EXCEPTION 'removed text leaked'; END IF;
END $$;
ROLLBACK;
\echo 'community permission tests passed'
