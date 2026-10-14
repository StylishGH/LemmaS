-- Retorna a contagem exata por banca para montar o seletor do catálogo.
-- SECURITY INVOKER preserva as permissões e as políticas RLS de questoes.
CREATE OR REPLACE FUNCTION public.get_question_banca_counts()
RETURNS TABLE (banca text, quantidade bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT q.banca::text, count(*)::bigint
  FROM public.questoes AS q
  WHERE q.banca IS NOT NULL
    AND btrim(q.banca) <> ''
  GROUP BY q.banca
  ORDER BY count(*) DESC, q.banca ASC;
$$;

REVOKE ALL ON FUNCTION public.get_question_banca_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_question_banca_counts() TO anon, authenticated;
