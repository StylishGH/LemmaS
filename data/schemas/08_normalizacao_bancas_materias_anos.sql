-- ==============================================================================
-- 08_normalizacao_bancas_materias_anos.sql
-- Normalização Canônica: Bancas, Matérias, Fases/Níveis e Tradução para PT-BR
-- ==============================================================================

BEGIN;

-- 1. Padronizar espaços em bancas
UPDATE public.questoes SET banca = TRIM(banca) WHERE banca IS DISTINCT FROM TRIM(banca);

-- 2. Corrigir bancas que na verdade são níveis olímpicos (Nível 2, Nível 3)
--    Movê-los para banca = 'OBM' e definir fase_nivel apropriado ('Nível 2', 'Nível 3')
UPDATE public.questoes
SET banca = 'OBM',
    fase_nivel = 'Nível 2'
WHERE banca IN ('Nível 2', 'Nivel 2') OR banca ILIKE '%Nivel 2%';

UPDATE public.questoes
SET banca = 'OBM',
    fase_nivel = 'Nível 3'
WHERE banca IN ('Nível 3', 'Nivel 3') OR banca ILIKE '%Nivel 3%';

-- 3. Tradução Canônica de Todas as Bancas Olímpicas Internacionais para Português (PT-BR)
UPDATE public.questoes SET banca = 'Olimpíada Romena de Matemática' WHERE banca = 'Romanian Mathematical Olympiad';
UPDATE public.questoes SET banca = 'Olimpíada Ucraniana de Matemática' WHERE banca = 'Ukrainian Mathematical Olympiad';
UPDATE public.questoes SET banca = 'Olimpíada Balcânica de Matemática' WHERE banca = 'Balkan Mathematical Olympiad';
UPDATE public.questoes SET banca = 'Olimpíadas Francesas de Matemática' WHERE banca IN ('Olympiades Françaises', 'Préparation Olympique Française de Mathématiques');
UPDATE public.questoes SET banca = 'Olimpíada Croata de Matemática' WHERE banca = 'Croatian Mathematical Olympiad';
UPDATE public.questoes SET banca = 'Olimpíada Saudita de Matemática' WHERE banca = 'Saudi Mathematical Olympiad';
UPDATE public.questoes SET banca = 'Olimpíada Chinesa de Matemática' WHERE banca = 'China Mathematical Olympiad';
UPDATE public.questoes SET banca = 'Olimpíada Filipina de Matemática' WHERE banca = 'Philippine Mathematical Olympiad';
UPDATE public.questoes SET banca = 'Olimpíada Irlandesa de Matemática' WHERE banca = 'Irish Mathematical Olympiad';
UPDATE public.questoes SET banca = 'Olimpíada Mongol de Matemática' WHERE banca = 'Mongolian Mathematical Olympiad';
UPDATE public.questoes SET banca = 'Olimpíada Iraniana de Matemática' WHERE banca = 'Iranian Mathematical Olympiad';
UPDATE public.questoes SET banca = 'Olimpíada Bielorrussa de Matemática' WHERE banca = 'Belarusian Mathematical Olympiad';
UPDATE public.questoes SET banca = 'Olimpíada Estoniana de Matemática' WHERE banca = 'Estonian Mathematical Olympiad';
UPDATE public.questoes SET banca = 'Olimpíada Japonesa de Matemática' WHERE banca = 'Japanese Mathematical Olympiad';
UPDATE public.questoes SET banca = 'Olimpíada Russa de Matemática' WHERE banca = 'Russian Mathematical Olympiad';
UPDATE public.questoes SET banca = 'Olimpíada Canadense de Matemática' WHERE banca = 'Canadian Mathematical Olympiad';
UPDATE public.questoes SET banca = 'Olimpíada Espanhola de Matemática' WHERE banca = 'Spanish Mathematical Olympiad';
UPDATE public.questoes SET banca = 'Olimpíada Sul-Africana de Matemática' WHERE banca = 'South African Olympiad';
UPDATE public.questoes SET banca = 'Olimpíada Indiana de Matemática' WHERE banca = 'Indian Mathematical Olympiad';
UPDATE public.questoes SET banca = 'Olimpíada Búlgara de Matemática' WHERE banca = 'Bulgarian Mathematical Olympiad';
UPDATE public.questoes SET banca = 'Olimpíada de Singapura de Matemática' WHERE banca = 'Singapore Mathematical Olympiad';
UPDATE public.questoes SET banca = 'Olimpíada Centro-Europeia de Matemática' WHERE banca = 'Middle European Mathematical Olympiad';
UPDATE public.questoes SET banca = 'Olimpíada Macedônia de Matemática' WHERE banca = 'Macedonian Mathematical Olympiad';
UPDATE public.questoes SET banca = 'Olimpíada Italiana de Matemática' WHERE banca IN ('Italian Mathematical Olympiad', 'Progetto Olimpiadi di Matematica');
UPDATE public.questoes SET banca = 'Olimpíada Austríaca de Matemática' WHERE banca = 'Austrian Mathematical Olympiad';
UPDATE public.questoes SET banca = 'Olimpíada Argentina de Matemática' WHERE banca = 'Argentine Mathematical Olympiad';
UPDATE public.questoes SET banca = 'Olimpíada Holandesa de Matemática' WHERE banca = 'Dutch Mathematical Olympiad';
UPDATE public.questoes SET banca = 'Olimpíada Ibero-Americana de Matemática' WHERE banca = 'Ibero-American Mathematical Olympiad';
UPDATE public.questoes SET banca = 'Olimpíada Grega de Matemática' WHERE banca = 'Hellenic Mathematical Olympiad';
UPDATE public.questoes SET banca = 'Olimpíada da Moldávia de Matemática' WHERE banca = 'Olimpiada Republicană la Matematică';
UPDATE public.questoes SET banca = 'Olimpíada da Nova Zelândia de Matemática' WHERE banca = 'New Zealand Mathematical Olympiad';
UPDATE public.questoes SET banca = 'Olimpíada Eslovena de Matemática' WHERE banca = 'Slovenian Mathematical Olympiad';
UPDATE public.questoes SET banca = 'Olimpíada de Bay Area (BAMO)' WHERE banca = 'Bay Area Mathematical Olympiad';
UPDATE public.questoes SET banca = 'Círculo Matemático de Berkeley' WHERE banca = 'Berkeley Math Circle';

-- 4. Definir tipo_prova = 'Oficial' para provas militares e vestibulares
UPDATE public.questoes
SET tipo_prova = 'Oficial'
WHERE UPPER(TRIM(banca)) IN ('ITA','IME','AFA','EFOMM','ESCOLA NAVAL','ESPCEX','EEAR','EPCAR','COLÉGIO NAVAL','ESA')
   OR UPPER(TRIM(banca)) IN ('ENEM','FUVEST','UNICAMP','CEDERJ')
   OR tipo_prova ILIKE '%Oficial%';

-- 5. Normalização de matérias (Grande Área)
UPDATE public.questoes
SET materia = CASE
    WHEN UPPER(TRIM(materia)) IN ('CÁLCULO','CÁLCULO 1','CÁLCULO 2','CÁLCULO 3','CÁLCULO VETORIAL','GEOMETRIA DIFERENCIAL') THEN 'Cálculo'
    WHEN UPPER(TRIM(materia)) IN ('PROBABILIDADE E COMBINATÓRIA','ANÁLISE COMBINATÓRIA','PROBABILIDADE','ESTATÍSTICA') THEN 'Probabilidade e Combinatória'
    WHEN UPPER(TRIM(materia)) IN ('GEOMETRIA PLANA','GEOMETRIA') THEN 'Geometria Plana'
    WHEN UPPER(TRIM(materia)) IN ('ÁLGEBRA LINEAR','GEOMETRIA ANALÍTICA E ÁLGEBRA LINEAR') THEN 'Álgebra Linear'
    WHEN UPPER(TRIM(materia)) IN ('ÁLGEBRA','TEORIA DOS CONJUNTOS') THEN 'Álgebra'
    WHEN UPPER(TRIM(materia)) = 'TEORIA DOS NÚMEROS' THEN 'Teoria dos Números'
    WHEN UPPER(TRIM(materia)) = 'POLINÔMIOS E COMPLEXOS' THEN 'Polinômios e Complexos'
    WHEN UPPER(TRIM(materia)) = 'TRIGONOMETRIA' THEN 'Trigonometria'
    WHEN UPPER(TRIM(materia)) = 'GEOMETRIA ESPACIAL' THEN 'Geometria Espacial'
    WHEN UPPER(TRIM(materia)) = 'GEOMETRIA ANALÍTICA' THEN 'Geometria Analítica'
    WHEN UPPER(TRIM(materia)) = 'MATEMÁTICA BÁSICA' THEN 'Matemática Básica'
    WHEN UPPER(TRIM(materia)) = 'MATEMÁTICA' THEN
        CASE
            WHEN topico IS NOT NULL AND TRIM(topico) <> '' THEN TRIM(topico)
            ELSE 'Matemática Geral'
        END
    ELSE materia
END
WHERE materia IS NOT NULL;

-- 6. Padronizar espaços em materia e tipo_prova
UPDATE public.questoes SET materia = TRIM(materia) WHERE materia IS DISTINCT FROM TRIM(materia);
UPDATE public.questoes SET tipo_prova = TRIM(tipo_prova) WHERE tipo_prova IS DISTINCT FROM TRIM(tipo_prova);

COMMIT;
