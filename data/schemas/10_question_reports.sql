-- ==============================================================================
-- 10_question_reports.sql
-- Plataforma LEMMAS (Powered by MathAI Engine)
-- Curadoria Colaborativa: Relato de Inconsistências (LaTeX, Digitação, Imagem, Gabarito)
-- ==============================================================================

-- Tabela para armazenar relatos de inconsistências enviados pelos estudantes
CREATE TABLE IF NOT EXISTS public.question_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id BIGINT NOT NULL REFERENCES public.questoes(id) ON DELETE CASCADE,
    reporter_id BIGINT REFERENCES public.usuarios(id) ON DELETE SET NULL,
    reason TEXT NOT NULL, -- 'erro_digitacao', 'problema_imagem', 'gabarito_incorreto', 'enunciado_incompleto', 'outro'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- RLS
ALTER TABLE public.question_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir insercao de relatos por qualquer usuario" ON public.question_reports
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Permitir leitura de relatos pelo autor" ON public.question_reports
    FOR SELECT
    USING (auth.uid() IS NOT NULL);
