\set ON_ERROR_STOP on
BEGIN;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
SELECT public.community_profile('Cadete_2027');
DO $$ BEGIN
 IF public.community_profile()->>'alias' <> 'Cadete_2027' THEN RAISE EXCEPTION 'alias not saved'; END IF;
END $$;
SELECT public.community_profile('Cadete_2028');
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
DO $$ BEGIN
 IF public.community_profile()->>'alias' IS NOT NULL THEN RAISE EXCEPTION 'foreign alias exposed'; END IF;
 BEGIN
  PERFORM public.community_profile('cadete_2028');
  RAISE EXCEPTION 'duplicate alias allowed';
 EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;
RESET ROLE;
SET ROLE anon;
DO $$ BEGIN
 BEGIN
  PERFORM public.community_profile('Anonymous');
  RAISE EXCEPTION 'anonymous alias write';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
