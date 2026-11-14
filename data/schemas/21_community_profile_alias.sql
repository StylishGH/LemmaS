-- Move a escolha do apelido para o perfil. Requer 19_question_comments.sql.
BEGIN;
CREATE FUNCTION community_private.profile_alias(p_alias text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE uid uuid := auth.uid(); saved text;
BEGIN
  IF uid IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id = uid AND NOT coalesce(is_anonymous, false)) THEN
    RAISE EXCEPTION 'Faça login para configurar seu apelido.' USING ERRCODE = '42501';
  END IF;
  IF p_alias IS NOT NULL THEN
    IF char_length(btrim(p_alias)) NOT BETWEEN 3 AND 30 OR p_alias ~ '[<>[:cntrl:]]' THEN
      RAISE EXCEPTION 'Escolha um apelido de 3 a 30 caracteres.' USING ERRCODE = '22023';
    END IF;
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text, 19019));
    INSERT INTO public.community_profiles(user_id, alias) VALUES(uid, btrim(p_alias))
      ON CONFLICT(user_id) DO UPDATE SET alias = EXCLUDED.alias;
  END IF;
  SELECT alias INTO saved FROM public.community_profiles WHERE user_id = uid;
  RETURN jsonb_build_object('alias', saved);
END $$;
CREATE FUNCTION public.community_profile(p_alias text DEFAULT NULL) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT community_private.profile_alias(p_alias) $$;
REVOKE ALL ON FUNCTION public.community_profile(text), community_private.profile_alias(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_profile(text), community_private.profile_alias(text) TO authenticated;
COMMIT;
