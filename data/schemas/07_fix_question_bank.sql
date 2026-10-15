BEGIN;

-- 1. Adiciona as novas colunas estruturadas na tabela de questões
ALTER TABLE public.questoes 
  ADD COLUMN IF NOT EXISTS tipo_prova TEXT DEFAULT 'Oficial',
  ADD COLUMN IF NOT EXISTS fase_nivel TEXT DEFAULT 'Geral',
  ADD COLUMN IF NOT EXISTS categoria_banca TEXT DEFAULT 'Olimpíadas';

-- 2. Remove as questões de Física (ajustado para a coluna 'materia' existente em questoes)
DELETE FROM public.questoes
WHERE materia ILIKE '%física%'
   OR materia ILIKE '%fisica%';

-- 3. Classifica TIPO DE PROVA ('Oficial' vs 'Seleção e Treinamento') 
--    antes de unificar os nomes das bancas
UPDATE public.questoes
SET tipo_prova = CASE
    WHEN banca IN (
        'Préparation Olympique Française de Mathématiques',
        'China National Team Selection Test',
        'Team Selection Test',
        'Selection and Training Session',
        'SELECTION EXAMINATION',
        'Selectietoets',
        'Indija TS',
        'Saudi Booklet',
        'IRL_ABooklet',
        'Berkeley Math Circle',
        'Open Contests',
        'February'
    ) THEN 'Seleção e Treinamento'
    ELSE 'Oficial'
END;

-- 4. Classifica FASE / NÍVEL ('Nível 2', 'Nível 3', 'Final', 'Nível Júnior', 'Geral')
UPDATE public.questoes
SET fase_nivel = CASE
    WHEN banca = 'Nivel 2' OR enunciado ILIKE '%nível 2%' THEN 'Nível 2'
    WHEN banca = 'Nivel 3' OR enunciado ILIKE '%nível 3%' THEN 'Nível 3'
    WHEN banca IN ('Final round', 'IMO', 'USAMO') THEN 'Final'
    WHEN banca IN (
        'Junior Balkan Mathematical Olympiad',
        'Japan Junior Mathematical Olympiad',
        'Junior Mathematical Olympiad'
    ) THEN 'Nível Júnior'
    ELSE 'Geral'
END;

-- 5. Unifica os nomes das BANCAS (limpa os idiomas repetidos e fases que estavam como banca)
UPDATE public.questoes
SET banca = CASE
    -- Bancas que na verdade eram Nível 2 / Nível 3 da OBM
    WHEN banca IN ('Nivel 2', 'Nivel 3') THEN 'OBM'
    
    -- Países com divisão Oficial + Seleção/Treinamento
    WHEN banca IN ('Préparation Olympique Française de Mathématiques', 'Olympiades Françaises de Mathématiques') 
        THEN 'Olympiades Françaises'
    WHEN banca IN ('IRL_ABooklet', 'Ireland', 'Irska', 'Irish Mathematical Olympiad') 
        THEN 'Irish Mathematical Olympiad'
    WHEN banca IN ('Croatian Competitions', 'Croatia', 'Croatian Mathematical Olympiad') 
        THEN 'Croatian Mathematical Olympiad'
    WHEN banca IN ('Saudi Arabian Mathematical Competitions', 'Saudi Booklet') 
        THEN 'Saudi Mathematical Olympiad'
    WHEN banca IN ('Estonian Math Competitions', 'Estonian Mathematical Olympiad') 
        THEN 'Estonian Mathematical Olympiad'
    WHEN banca IN ('South African Mathematics Olympiad', 'South-Afrika') 
        THEN 'South African Olympiad'
    WHEN banca IN ('Bulgarian Mathematical Competitions', 'Bulgaria') 
        THEN 'Bulgarian Mathematical Olympiad'
    WHEN banca IN ('Macedonian Mathematical Competitions', 'Macedonian Mathematical Olympiad') 
        THEN 'Macedonian Mathematical Olympiad'
    WHEN banca IN ('Indian National Mathematical Olympiad', 'Indija TS') 
        THEN 'Indian Mathematical Olympiad'
    WHEN banca IN ('Argentina', 'Argentine Mathematical Olympiad') 
        THEN 'Argentine Mathematical Olympiad'
    WHEN banca IN ('Dutch Mathematical Olympiad', 'Selectietoets') 
        THEN 'Dutch Mathematical Olympiad'
    WHEN banca IN (
        'China Mathematical Competition', 'China Mathematical Olympiad', 
        'China Western Mathematical Olympiad', 'China Girls'' Mathematical Olympiad', 
        'China National Team Selection Test'
    ) THEN 'China Mathematical Olympiad'
    WHEN banca IN ('Japanese Mathematical Olympiad', 'Japan Junior Mathematical Olympiad')
        THEN 'Japanese Mathematical Olympiad'
    WHEN banca IN ('Balkan Mathematical Olympiad', 'Junior Balkan Mathematical Olympiad')
        THEN 'Balkan Mathematical Olympiad'
    WHEN banca IN ('HMMT', 'HMMO') 
        THEN 'HMMT'
    WHEN banca = 'Slovenija' 
        THEN 'Slovenian Mathematical Olympiad'
        
    -- Rótulos genéricos de fase/seletiva sem país explícito
    WHEN banca IN (
        'Final round', 'February', 'Open Contests', 'Team Selection Test',
        'Selection and Training Session', 'SELECTION EXAMINATION',
        'National Math Olympiad', 'Junior Mathematical Olympiad'
    ) THEN 'Olimpíadas Internacionais'
    
    ELSE banca
END;

-- 6. Separa Concursos Militares, Vestibulares e Olimpíadas para organizar o topo da UI
UPDATE public.questoes
SET categoria_banca = CASE
    WHEN banca IN ('ITA', 'IME', 'AFA', 'EFOMM', 'Escola Naval', 'EsPCEx', 'EEAR', 'EPCAR', 'Colégio Naval', 'ESA') 
        THEN 'Concurso Militar'
    WHEN banca IN ('ENEM', 'FUVEST', 'UNICAMP', 'CEDERJ') 
        THEN 'Vestibular & Superior'
    ELSE 'Olimpíadas'
END;

-- 7. Cria índices para deixar os filtros instantâneos no Front-End
CREATE INDEX IF NOT EXISTS idx_questoes_tipo_prova ON public.questoes(tipo_prova);
CREATE INDEX IF NOT EXISTS idx_questoes_fase_nivel ON public.questoes(fase_nivel);
CREATE INDEX IF NOT EXISTS idx_questoes_categoria_banca ON public.questoes(categoria_banca);
CREATE INDEX IF NOT EXISTS idx_questoes_banca ON public.questoes(banca);

-- 8. Cria a RPC/Função para o Front-End buscar as contagens reais (> 1000 linhas)
CREATE OR REPLACE FUNCTION public.get_question_filter_counts(
    p_banca TEXT DEFAULT NULL,
    p_tipo_prova TEXT DEFAULT NULL,
    p_fase_nivel TEXT DEFAULT NULL,
    p_materia TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'bancas', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('nome', banca, 'categoria', categoria_banca, 'total', cnt) ORDER BY cnt DESC)
            FROM (
                SELECT banca, categoria_banca, COUNT(*) AS cnt
                FROM public.questoes
                WHERE (p_tipo_prova IS NULL OR tipo_prova = p_tipo_prova)
                  AND (p_fase_nivel IS NULL OR fase_nivel = p_fase_nivel)
                  AND (p_materia IS NULL OR materia = p_materia)
                GROUP BY banca, categoria_banca
            ) sub_b
        ), '[]'::jsonb),
        'tipos_prova', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('nome', tipo_prova, 'total', cnt) ORDER BY cnt DESC)
            FROM (
                SELECT tipo_prova, COUNT(*) AS cnt
                FROM public.questoes
                WHERE (p_banca IS NULL OR banca = p_banca)
                  AND (p_fase_nivel IS NULL OR fase_nivel = p_fase_nivel)
                  AND (p_materia IS NULL OR materia = p_materia)
                GROUP BY tipo_prova
            ) sub_tp
        ), '[]'::jsonb),
        'fases', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('nome', fase_nivel, 'total', cnt) ORDER BY cnt DESC)
            FROM (
                SELECT fase_nivel, COUNT(*) AS cnt
                FROM public.questoes
                WHERE (p_banca IS NULL OR banca = p_banca)
                  AND (p_tipo_prova IS NULL OR tipo_prova = p_tipo_prova)
                  AND (p_materia IS NULL OR materia = p_materia)
                GROUP BY fase_nivel
            ) sub_fn
        ), '[]'::jsonb),
        'materias', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('nome', COALESCE(materia, 'Não Classificada'), 'total', cnt) ORDER BY cnt DESC)
            FROM (
                SELECT materia, COUNT(*) AS cnt
                FROM public.questoes
                WHERE (p_banca IS NULL OR banca = p_banca)
                  AND (p_tipo_prova IS NULL OR tipo_prova = p_tipo_prova)
                  AND (p_fase_nivel IS NULL OR fase_nivel = p_fase_nivel)
                GROUP BY materia
            ) sub_m
        ), '[]'::jsonb)
    ) INTO result;

    RETURN result;
END;
$$;

-- 9. Permissões para acesso público/autenticado no Supabase
REVOKE ALL ON FUNCTION public.get_question_filter_counts(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_question_filter_counts(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

COMMIT;
