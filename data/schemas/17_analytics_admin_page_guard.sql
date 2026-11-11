-- Permite que a renderização do painel verifique a allowlist sem carregar métricas.
CREATE OR REPLACE FUNCTION public.is_analytics_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
    SELECT auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1
        FROM public.analytics_admins a
        WHERE a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
    );
$function$;

REVOKE ALL ON FUNCTION public.is_analytics_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_analytics_admin() TO authenticated;
