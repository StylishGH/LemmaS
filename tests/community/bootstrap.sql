-- Somente PostgreSQL descartável local. Nunca executar em Supabase hospedado.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email_confirmed_at timestamptz, is_anonymous boolean DEFAULT false);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS
$$ SELECT jsonb_build_object('email', current_setting('request.jwt.claim.email', true)) $$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.uid(), auth.jwt() TO anon, authenticated;
CREATE TABLE public.questoes (id bigint PRIMARY KEY);
INSERT INTO public.questoes VALUES (1), (2);
CREATE TABLE public.analytics_admins (email text PRIMARY KEY);
INSERT INTO public.analytics_admins VALUES ('admin@example.test');
CREATE FUNCTION public.is_analytics_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = '' AS $$ SELECT auth.uid() IS NOT NULL AND EXISTS (
SELECT 1 FROM public.analytics_admins WHERE email = auth.jwt()->>'email') $$;
INSERT INTO auth.users VALUES
('00000000-0000-0000-0000-000000000001', now(), false),
('00000000-0000-0000-0000-000000000002', now(), false),
('00000000-0000-0000-0000-000000000003', now(), false),
('00000000-0000-0000-0000-000000000004', NULL, false);
