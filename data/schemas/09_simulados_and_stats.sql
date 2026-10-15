-- Tabela de Simulados
CREATE TABLE IF NOT EXISTS simulados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bancas TEXT[] NOT NULL,
  total_questoes INTEGER NOT NULL,
  tempo_total_segundos INTEGER NOT NULL,
  com_tempo BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'finalizado', 'cancelado')),
  acertos INTEGER DEFAULT 0,
  erros INTEGER DEFAULT 0,
  em_branco INTEGER DEFAULT 0,
  tempo_gasto_segundos INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalizado_em TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_simulados_aluno_id ON simulados(aluno_id);
CREATE INDEX IF NOT EXISTS idx_simulados_status ON simulados(status);
CREATE INDEX IF NOT EXISTS idx_simulados_criado_em ON simulados(criado_em DESC);

-- RLS Policies
ALTER TABLE simulados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own simulados" ON simulados
  FOR SELECT USING (auth.uid() = aluno_id);

CREATE POLICY "Users can insert own simulados" ON simulados
  FOR INSERT WITH CHECK (auth.uid() = aluno_id);

CREATE POLICY "Users can update own simulados" ON simulados
  FOR UPDATE USING (auth.uid() = aluno_id);

-- Função RPC para estatísticas globais (resolve Landing Page + Filtros + Limite 1000)
CREATE OR REPLACE FUNCTION get_lemmas_global_stats() RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    -- 1. Para a Landing Page e Área do Aluno (Total real do banco)
    'total_questoes', (SELECT COUNT(*) FROM questoes),
    
    -- 2. Para o filtro de Anos (pega o menor e maior ano real e todos os anos existentes)
    'ano_min', (SELECT MIN(ano) FROM questoes WHERE ano IS NOT NULL AND ano > 1900),
    'ano_max', (SELECT MAX(ano) FROM questoes WHERE ano IS NOT NULL AND ano <= 2026),
    'anos_disponiveis', (
      SELECT jsonb_agg(DISTINCT ano ORDER BY ano DESC) 
      FROM questoes 
      WHERE ano IS NOT NULL AND ano BETWEEN 1940 AND 2026
    ),

    -- 3. Contagem real de Dificuldade (sem o teto de 1000!)
    'dificuldades', (
      SELECT jsonb_object_agg(COALESCE(dificuldade::text, 'Não Classificada'), cnt)
      FROM (SELECT dificuldade, COUNT(*) AS cnt FROM questoes GROUP BY dificuldade) d
    ),

    -- 4. Contagem real de Tipo de Resolução (Objetivas vs Discursivas sem teto de 1000!)
    'tipos', (
      SELECT jsonb_object_agg(COALESCE(tipo, 'discursiva'), cnt)
      FROM (SELECT tipo, COUNT(*) AS cnt FROM questoes GROUP BY tipo) t
    ),

    -- 5. Contagem real de Grande Área / Matéria
    'materias', (
      SELECT jsonb_agg(jsonb_build_object('nome', COALESCE(materia, 'Não Classificada'), 'total', cnt) ORDER BY cnt DESC)
      FROM (SELECT materia, COUNT(*) AS cnt FROM questoes GROUP BY materia) m
    )
  );
$$;

-- Grant para o role anon (se necessário para landing page pública)
GRANT EXECUTE ON FUNCTION get_lemmas_global_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_lemmas_global_stats() TO authenticated;

-- ==============================================================================
-- Função RPC para Upsert de Conceitos / Lemas (com SECURITY DEFINER e Idempotência)
-- ==============================================================================
CREATE OR REPLACE FUNCTION upsert_conceito(
  p_nome TEXT,
  p_materia TEXT,
  p_topico TEXT,
  p_gatilho TEXT,
  p_acao_ou_teorema TEXT,
  p_formula_latex TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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

GRANT EXECUTE ON FUNCTION upsert_conceito(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;