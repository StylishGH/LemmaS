-- ============================================================================
-- MIGRATION 10: PROMOÇÃO DE "FUNÇÕES" A GRANDE ÁREA REAL E FIM DE "GERAL"
-- Plataforma LEMMAS (Powered by MathAI Engine)
-- ============================================================================

-- 1. Promove para a Grande Área 'Funções' todas as questões que estavam em Álgebra/Geral
-- cujo tópico ou enunciado seja claramente de Funções (Afim, Quadrática, Exponencial, Logarítmica, Equações Funcionais)
UPDATE public.questoes
SET materia = 'Funções'
WHERE materia IN ('Álgebra', 'Geral', 'Matemática Geral', 'Matemática', 'Matemática Básica')
  AND (
    LOWER(COALESCE(topico, '')) SIMILAR TO '%(funç|func|afim|quadrátic|quadratic|parábola|parabola|exponencial|logarítm|logaritm|modular|domínio|dominio|injetora|bijetora|inversa)%'
    OR enunciado LIKE '%f(x)%'
    OR enunciado LIKE '%g(x)%'
    OR enunciado LIKE '%f: \mathbb{R}%'
    OR enunciado LIKE '%f:\mathbb{R}%'
    OR LOWER(enunciado) LIKE '%função%'
  );

-- 2. Redistribui os registros de 'Geral', 'Matemática Geral', 'Matemática Financeira' e 'Lógica' analisando o tópico e o enunciado
UPDATE public.questoes
SET materia = CASE
    WHEN LOWER(COALESCE(topico, '') || ' ' || LEFT(enunciado, 300)) SIMILAR TO '%(triângul|triangul|circunferênci|circulo|círculo|polígon|poligon|área|area|geometria plana|ceviana|bissetriz|retângul|quadriláter)%' THEN 'Geometria Plana'
    WHEN LOWER(COALESCE(topico, '') || ' ' || LEFT(enunciado, 300)) SIMILAR TO '%(prisma|pirâmide|piramide|esfera|cilindro|cone|poliedro|tetraedro|volume|espacial)%' THEN 'Geometria Espacial'
    WHEN LOWER(COALESCE(topico, '') || ' ' || LEFT(enunciado, 300)) SIMILAR TO '%(elipse|hipérbole|hiperbole|cartesiano|reta|cônica|conica|analítica|analitica)%' THEN 'Geometria Analítica'
    WHEN LOWER(COALESCE(topico, '') || ' ' || LEFT(enunciado, 300)) SIMILAR TO '%(seno|cosseno|tangente|\sin|\cos|\tan|trigonom)%' THEN 'Trigonometria'
    WHEN LOWER(COALESCE(topico, '') || ' ' || LEFT(enunciado, 300)) SIMILAR TO '%(matriz|determinante|sistema linear|autovalor|vetorial|linear)%' THEN 'Álgebra Linear'
    WHEN LOWER(COALESCE(topico, '') || ' ' || LEFT(enunciado, 300)) SIMILAR TO '%(limite|derivada|integral|\int|\lim|edo|cálculo|calculo)%' THEN 'Cálculo'
    WHEN LOWER(COALESCE(topico, '') || ' ' || LEFT(enunciado, 300)) SIMILAR TO '%(probabilidade|combinatória|combinatoria|permuta|arranjo|escolh|sortei|dado|urna|baralho|contagem|lógica|logica)%' THEN 'Probabilidade e Combinatória'
    WHEN LOWER(COALESCE(topico, '') || ' ' || LEFT(enunciado, 300)) SIMILAR TO '%(primo|divisibil|módulo|modulo|congruênc|mdc|mmc|inteiro|diofantin)%' THEN 'Teoria dos Números'
    WHEN LOWER(COALESCE(topico, '') || ' ' || LEFT(enunciado, 300)) SIMILAR TO '%(polinôm|polinom|complexo|imaginári|raízes|girard|briot)%' THEN 'Polinômios e Complexos'
    WHEN LOWER(COALESCE(topico, '') || ' ' || LEFT(enunciado, 300)) SIMILAR TO '%(porcentagem|regra de três|fração|razão|proporção|mmc|aritméti|financeir)%' THEN 'Matemática Básica'
    ELSE 'Álgebra'
END
WHERE materia IN ('Geral', 'Matemática Geral', 'Matemática', 'Matemática Financeira', 'Lógica') OR materia IS NULL;

-- 3. View opcional de compatibilidade
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'questions' AND schemaname = 'public') THEN
        CREATE OR REPLACE VIEW public.questions AS SELECT * FROM public.questoes;
    END IF;
END $$;
