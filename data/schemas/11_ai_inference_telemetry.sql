-- ==============================================================================
-- 11_ai_inference_telemetry.sql
-- Plataforma LEMMAS (Powered by MathAI Engine)
-- Camada de Telemetria N:1: Auditoria de Chamadas, Tokens e Custos de IA
-- Princípio: Uma avaliação pedagógica pode disparar N tentativas de inferência na cascata
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.ai_inference_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id TEXT, -- Vinculado ao AiEvaluation da MathAI Engine (ex: eval_...)
    tentativa_id BIGINT REFERENCES public.tentativas(id) ON DELETE SET NULL,
    task_type TEXT NOT NULL DEFAULT 'general', -- 'axiomatic_reasoning', 'socratic_hint', 'ocr', 'second_opinion', 'general'
    provider TEXT NOT NULL, -- 'nvidia', 'google', 'deepseek', 'openrouter', 'local_vllm', 'fallback'
    model_used TEXT NOT NULL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    latency_ms NUMERIC(10, 2) NOT NULL,
    status_code INTEGER NOT NULL DEFAULT 200,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    estimated_cost_usd NUMERIC(10, 6) DEFAULT 0.0,
    raw_usage JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices otimizados para relatórios de custos e observabilidade
CREATE INDEX IF NOT EXISTS idx_ai_inference_logs_eval_id ON public.ai_inference_logs USING btree (evaluation_id);
CREATE INDEX IF NOT EXISTS idx_ai_inference_logs_tentativa_id ON public.ai_inference_logs USING btree (tentativa_id);
CREATE INDEX IF NOT EXISTS idx_ai_inference_logs_provider_model ON public.ai_inference_logs USING btree (provider, model_used);
CREATE INDEX IF NOT EXISTS idx_ai_inference_logs_created_at ON public.ai_inference_logs USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_inference_logs_task_type ON public.ai_inference_logs USING btree (task_type);

-- RLS
ALTER TABLE public.ai_inference_logs ENABLE ROW LEVEL SECURITY;

-- Apenas serviços autenticados / backend podem inserir telemetria
CREATE POLICY "Permitir insercao de telemetria pelo backend" ON public.ai_inference_logs
    FOR INSERT
    WITH CHECK (true);

-- Leitura restrita a administradores / service_role
CREATE POLICY "Permitir leitura de telemetria para usuarios autenticados" ON public.ai_inference_logs
    FOR SELECT
    USING (auth.uid() IS NOT NULL);
