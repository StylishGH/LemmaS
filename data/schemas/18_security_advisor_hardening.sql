-- Fecha leituras indevidas e reduz o custo das policies RLS sinalizadas pelo
-- Supabase Security Advisor. Aplicado em 2026-11-11.

-- Views usam o contexto do chamador e a exportação fica disponível apenas para
-- operações administrativas via service_role.
ALTER VIEW public.vw_sft_dataset_export SET (security_invoker = true);
REVOKE ALL ON public.vw_sft_dataset_export FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.vw_sft_dataset_export TO service_role;

-- Telemetria e relatos podem ser enviados pela aplicação, mas não lidos por
-- usuários finais. Operadores administrativos seguem usando service_role.
DROP POLICY IF EXISTS "Permitir leitura de telemetria para usuarios autenticados"
  ON public.ai_inference_logs;
REVOKE SELECT ON public.ai_inference_logs FROM PUBLIC, anon, authenticated;
GRANT INSERT ON public.ai_inference_logs TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Permitir leitura de relatos pelo autor"
  ON public.question_reports;
REVOKE SELECT ON public.question_reports FROM PUBLIC, anon, authenticated;
GRANT INSERT ON public.question_reports TO anon, authenticated, service_role;

-- Remove política permissiva legada que anulava o isolamento dos códigos.
DROP POLICY IF EXISTS "Acesso codigos_verificacao" ON public.codigos_verificacao;

-- Avaliações de identidade JWT passam a ser initplans, executadas uma vez por
-- consulta em vez de uma vez por linha. As condições de propriedade são mantidas.
DROP POLICY IF EXISTS "usuarios_leitura_propria_ou_demo" ON public.usuarios;
CREATE POLICY "usuarios_leitura_propria_ou_demo"
ON public.usuarios FOR SELECT TO public
USING (
  id = 9999
  OR (
    ((SELECT auth.jwt()) ->> 'email') IS NOT NULL
    AND email = ((SELECT auth.jwt()) ->> 'email')
  )
);

DROP POLICY IF EXISTS "usuarios_atualizacao_propria" ON public.usuarios;
CREATE POLICY "usuarios_atualizacao_propria"
ON public.usuarios FOR UPDATE TO authenticated
USING (email = ((SELECT auth.jwt()) ->> 'email'))
WITH CHECK (email = ((SELECT auth.jwt()) ->> 'email'));

DROP POLICY IF EXISTS "codigos_verificacao_proprio_email" ON public.codigos_verificacao;
CREATE POLICY "codigos_verificacao_proprio_email"
ON public.codigos_verificacao FOR ALL TO authenticated
USING (email = ((SELECT auth.jwt()) ->> 'email'))
WITH CHECK (email = ((SELECT auth.jwt()) ->> 'email'));

DROP POLICY IF EXISTS "flashcards_proprio_estudante" ON public.flashcards;
CREATE POLICY "flashcards_proprio_estudante"
ON public.flashcards FOR ALL TO public
USING (
  student_id = '9999'
  OR student_id = 'student-demo-01'
  OR student_id = ((SELECT auth.uid()))::text
  OR student_id = ((SELECT auth.jwt()) ->> 'email')
  OR student_id = ((SELECT public.current_aluno_id()))::text
)
WITH CHECK (
  student_id = '9999'
  OR student_id = 'student-demo-01'
  OR student_id = ((SELECT auth.uid()))::text
  OR student_id = ((SELECT auth.jwt()) ->> 'email')
  OR student_id = ((SELECT public.current_aluno_id()))::text
);

DROP POLICY IF EXISTS "card_reviews_proprio_estudante" ON public.card_reviews;
CREATE POLICY "card_reviews_proprio_estudante"
ON public.card_reviews FOR ALL TO public
USING (
  student_id = '9999'
  OR student_id = 'student-demo-01'
  OR student_id = ((SELECT auth.uid()))::text
  OR student_id = ((SELECT auth.jwt()) ->> 'email')
  OR student_id = ((SELECT public.current_aluno_id()))::text
)
WITH CHECK (
  student_id = '9999'
  OR student_id = 'student-demo-01'
  OR student_id = ((SELECT auth.uid()))::text
  OR student_id = ((SELECT auth.jwt()) ->> 'email')
  OR student_id = ((SELECT public.current_aluno_id()))::text
);

DROP POLICY IF EXISTS "Users can view own simulados" ON public.simulados;
CREATE POLICY "Users can view own simulados"
ON public.simulados FOR SELECT TO public
USING ((SELECT auth.uid()) = aluno_id);

DROP POLICY IF EXISTS "Users can insert own simulados" ON public.simulados;
CREATE POLICY "Users can insert own simulados"
ON public.simulados FOR INSERT TO public
WITH CHECK ((SELECT auth.uid()) = aluno_id);

DROP POLICY IF EXISTS "Users can update own simulados" ON public.simulados;
CREATE POLICY "Users can update own simulados"
ON public.simulados FOR UPDATE TO public
USING ((SELECT auth.uid()) = aluno_id)
WITH CHECK ((SELECT auth.uid()) = aluno_id);

-- SECURITY DEFINER com search_path vazio; objetos sempre qualificados.
CREATE OR REPLACE FUNCTION public.current_aluno_id()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT u.id
  FROM public.usuarios AS u
  WHERE u.email = (auth.jwt() ->> 'email')
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_lemmas_global_stats()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'total_questoes', (SELECT COUNT(*) FROM public.questoes),
    'ano_min', (SELECT MIN(ano) FROM public.questoes WHERE ano IS NOT NULL AND ano > 1900),
    'ano_max', (SELECT MAX(ano) FROM public.questoes WHERE ano IS NOT NULL AND ano <= 2026),
    'anos_disponiveis', (
      SELECT jsonb_agg(DISTINCT ano ORDER BY ano DESC)
      FROM public.questoes WHERE ano IS NOT NULL AND ano BETWEEN 1940 AND 2026
    ),
    'dificuldades', (
      SELECT jsonb_object_agg(COALESCE(dificuldade::text, 'Não Classificada'), cnt)
      FROM (SELECT dificuldade, COUNT(*) AS cnt FROM public.questoes GROUP BY dificuldade) AS d
    ),
    'tipos', (
      SELECT jsonb_object_agg(COALESCE(tipo, 'discursiva'), cnt)
      FROM (SELECT tipo, COUNT(*) AS cnt FROM public.questoes GROUP BY tipo) AS t
    ),
    'materias', (
      SELECT jsonb_agg(
        jsonb_build_object('nome', COALESCE(materia, 'Não Classificada'), 'total', cnt)
        ORDER BY cnt DESC
      )
      FROM (SELECT materia, COUNT(*) AS cnt FROM public.questoes GROUP BY materia) AS m
    )
  );
$$;
REVOKE ALL ON FUNCTION public.get_lemmas_global_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_lemmas_global_stats() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.upsert_conceito(
  p_nome TEXT,
  p_materia TEXT,
  p_topico TEXT,
  p_gatilho TEXT,
  p_acao_ou_teorema TEXT,
  p_formula_latex TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id BIGINT;
BEGIN
  INSERT INTO public.conceitos (nome, materia, topico, gatilho, acao_ou_teorema, formula_latex)
  VALUES (p_nome, p_materia, p_topico, p_gatilho, p_acao_ou_teorema, p_formula_latex)
  ON CONFLICT (nome) DO UPDATE SET
    materia = EXCLUDED.materia,
    topico = EXCLUDED.topico,
    gatilho = EXCLUDED.gatilho,
    acao_ou_teorema = EXCLUDED.acao_ou_teorema,
    formula_latex = EXCLUDED.formula_latex
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id, 'nome', p_nome);
END;
$$;
REVOKE ALL ON FUNCTION public.upsert_conceito(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_conceito(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  TO service_role;
