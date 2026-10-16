-- ==============================================================================
-- 12_tabela_catalogo_lemas.sql
-- Plataforma LEMMAS (Powered by MathAI Engine)
-- Catálogo Canônico de Lemas, Teoremas Mestres e Micro-Lemas Táticos
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.lemmas (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(32) UNIQUE NOT NULL, -- Ex: 'LEMA-0001'
    titulo VARCHAR(255) NOT NULL,       -- Ex: 'Teorema de Stewart para Cevianas'
    materia VARCHAR(100) NOT NULL,      -- Uma das 12 Grandes Áreas Canônicas
    topico VARCHAR(150),
    nivel VARCHAR(50) DEFAULT 'Avançado', -- 'Fundamentos', 'Militar/Vestibular', 'Olímpico', 'Superior/DataScience'
    formula_latex TEXT NOT NULL,        -- Fórmula ou enunciado formal em LaTeX
    gatilho_reconhecimento TEXT NOT NULL, -- Quando usar este lema ao ler uma questão
    intuicao_prova TEXT,                -- Ideia central da demonstração em 2 frases
    questoes_vinculadas_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_lemmas_materia ON public.lemmas(materia);
CREATE INDEX IF NOT EXISTS idx_lemmas_topico ON public.lemmas(topico);
CREATE INDEX IF NOT EXISTS idx_lemmas_codigo ON public.lemmas(codigo);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.lemmas ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Permitir leitura publica de lemas" ON public.lemmas;
CREATE POLICY "Permitir leitura publica de lemas" ON public.lemmas
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir operacoes de lemas por servicos autenticados" ON public.lemmas;
CREATE POLICY "Permitir operacoes de lemas por servicos autenticados" ON public.lemmas
    FOR ALL USING (true);

-- Vincular colunas de referência em public.questoes
ALTER TABLE public.questoes ADD COLUMN IF NOT EXISTS lema_id INT REFERENCES public.lemmas(id) ON DELETE SET NULL;
ALTER TABLE public.questoes ADD COLUMN IF NOT EXISTS lema_codigo VARCHAR(32);

CREATE INDEX IF NOT EXISTS idx_questoes_lema_id ON public.questoes(lema_id);
CREATE INDEX IF NOT EXISTS idx_questoes_lema_codigo ON public.questoes(lema_codigo);
