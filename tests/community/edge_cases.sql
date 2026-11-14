\set ON_ERROR_STOP on
BEGIN;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', true);
DO $$ BEGIN
  BEGIN
    PERFORM public.community_write('post', 1, NULL, NULL, 'unverified', false, 'Unverified', NULL);
    RAISE EXCEPTION 'unverified account wrote';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
INSERT INTO public.question_comments(id, question_id, author_id, body) VALUES
('10000000-0000-0000-0000-000000000001',1,'00000000-0000-0000-0000-000000000001','root'),
('10000000-0000-0000-0000-000000000002',2,'00000000-0000-0000-0000-000000000001','other');
INSERT INTO public.question_comments(id, question_id, author_id, body, parent_id) VALUES
('10000000-0000-0000-0000-000000000003',1,'00000000-0000-0000-0000-000000000001','reply','10000000-0000-0000-0000-000000000001');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
DO $$ BEGIN
  BEGIN
    PERFORM public.community_write('post', 1, NULL, '10000000-0000-0000-0000-000000000002', 'cross', false, 'Recruta', NULL);
    RAISE EXCEPTION 'cross question reply allowed';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    PERFORM public.community_write('post', 1, NULL, '10000000-0000-0000-0000-000000000003', 'nested', false, 'Recruta', NULL);
    RAISE EXCEPTION 'nested reply allowed';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    PERFORM public.community_write('hide', 1, '10000000-0000-0000-0000-000000000001', NULL, NULL, false, NULL, NULL);
    RAISE EXCEPTION 'non admin hid comment';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
INSERT INTO community_private.write_events(user_id, action, created_at)
  SELECT '00000000-0000-0000-0000-000000000002', 'post', clock_timestamp() - interval '1 minute' FROM generate_series(1,20);
SET ROLE authenticated;
DO $$ BEGIN
  BEGIN
    PERFORM public.community_write('post', 1, NULL, NULL, 'hourly bypass', false, 'Recruta', NULL);
    RAISE EXCEPTION 'hourly limit bypassed';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM <> 'Limite de 20 publicações por hora atingido.' THEN RAISE; END IF;
  END;
END $$;
RESET ROLE;
INSERT INTO community_private.write_events(user_id, action, created_at)
  SELECT '00000000-0000-0000-0000-000000000002', 'report', clock_timestamp() - interval '1 minute' FROM generate_series(1,10);
SET ROLE authenticated;
DO $$ BEGIN
  BEGIN
    PERFORM public.community_write('report', 1, '10000000-0000-0000-0000-000000000001', NULL, NULL, false, NULL, 'spam');
    RAISE EXCEPTION 'report limit bypassed';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM <> 'Limite de denúncias por hora atingido.' THEN RAISE; END IF;
  END;
END $$;
ROLLBACK;
\echo 'community edge case tests passed'
