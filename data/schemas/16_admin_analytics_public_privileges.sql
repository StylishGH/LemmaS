-- Garante que as tabelas auxiliares não herdem acesso por privilégios PUBLIC.
REVOKE ALL ON public.student_presence FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.student_presence TO authenticated;

REVOKE ALL ON public.analytics_admins FROM PUBLIC, anon, authenticated;
