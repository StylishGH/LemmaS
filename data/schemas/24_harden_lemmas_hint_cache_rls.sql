-- Hardening RLS & Grants for public.lemmas and public.socratic_hint_cache
-- Prevents anonymous/client defacement, deletion, or stored-XSS cache poisoning.

BEGIN;

-- 1. public.lemmas: public read-only; writes restricted to service_role
DROP POLICY IF EXISTS "Permitir operacoes de lemas por servicos autenticados" ON public.lemmas;
DROP POLICY IF EXISTS "Permitir leitura publica de lemas" ON public.lemmas;

CREATE POLICY "Permitir leitura publica de lemas" ON public.lemmas
    FOR SELECT TO anon, authenticated, service_role
    USING (true);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.lemmas FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.lemmas TO anon, authenticated;
GRANT ALL ON public.lemmas TO service_role;

-- 2. public.socratic_hint_cache: prevent anonymous UPDATE overwrites of hint_text
DROP POLICY IF EXISTS "Permitir leitura de dicas em cache" ON public.socratic_hint_cache;
DROP POLICY IF EXISTS "Permitir insercao de dicas em cache por usuarios autenticados" ON public.socratic_hint_cache;
DROP POLICY IF EXISTS "Permitir atualizacao de hit_count em cache" ON public.socratic_hint_cache;

CREATE POLICY "Permitir leitura de dicas em cache"
    ON public.socratic_hint_cache FOR SELECT
    TO anon, authenticated, service_role
    USING (true);

CREATE POLICY "Permitir insercao de dicas em cache por autenticados"
    ON public.socratic_hint_cache FOR INSERT
    TO authenticated, service_role
    WITH CHECK (true);

REVOKE UPDATE, DELETE, TRUNCATE ON public.socratic_hint_cache FROM PUBLIC, anon, authenticated;
REVOKE INSERT ON public.socratic_hint_cache FROM PUBLIC, anon;
GRANT SELECT ON public.socratic_hint_cache TO anon, authenticated;
GRANT INSERT ON public.socratic_hint_cache TO authenticated;
GRANT ALL ON public.socratic_hint_cache TO service_role;

-- Safe RPC to increment hit_count without granting column-level UPDATE on hint_text
CREATE OR REPLACE FUNCTION public.increment_hint_cache_hit(p_cache_id BIGINT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.socratic_hint_cache
  SET hit_count = hit_count + 1,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_cache_id;
$$;

REVOKE ALL ON FUNCTION public.increment_hint_cache_hit(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_hint_cache_hit(BIGINT) TO anon, authenticated, service_role;

-- 3. public.questoes: public read-only; block anonymous/authenticated INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Permitir atualizacao de questoes" ON public.questoes;
DROP POLICY IF EXISTS "Permitir insercao de questoes" ON public.questoes;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.questoes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.questoes TO anon, authenticated;
GRANT ALL ON public.questoes TO service_role;

-- 4. storage.objects (questoes-imagens): public read-only; block public upload/overwrite
DROP POLICY IF EXISTS "Allow upload questoes-imagens" ON storage.objects;
DROP POLICY IF EXISTS "Allow update questoes-imagens" ON storage.objects;

COMMIT;
