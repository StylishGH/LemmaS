-- Rate limiting for AI endpoints, lemma provenance tracking, and mock-exam blank state

BEGIN;

-- 1. Rate-limit ledger & RPC for serverless AI endpoints (/api/ai/*)
CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
    bucket TEXT PRIMARY KEY,
    window_start TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    request_count INTEGER NOT NULL DEFAULT 1
);

ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ai_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(
    p_bucket TEXT,
    p_limit INTEGER DEFAULT 10,
    p_window_seconds INTEGER DEFAULT 60
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_window INTERVAL := make_interval(secs => GREATEST(1, p_window_seconds));
    v_row public.ai_rate_limits%ROWTYPE;
    v_retry INTEGER;
BEGIN
    INSERT INTO public.ai_rate_limits (bucket, window_start, request_count)
    VALUES (p_bucket, v_now, 1)
    ON CONFLICT (bucket) DO UPDATE
    SET
        request_count = CASE
            WHEN public.ai_rate_limits.window_start + v_window <= v_now THEN 1
            ELSE public.ai_rate_limits.request_count + 1
        END,
        window_start = CASE
            WHEN public.ai_rate_limits.window_start + v_window <= v_now THEN v_now
            ELSE public.ai_rate_limits.window_start
        END
    RETURNING * INTO v_row;

    v_retry := GREATEST(1, CEIL(EXTRACT(EPOCH FROM ((v_row.window_start + v_window) - v_now)))::INTEGER);

    RETURN jsonb_build_object(
        'allowed', v_row.request_count <= p_limit,
        'remaining', GREATEST(0, p_limit - v_row.request_count),
        'retry_after_seconds', v_retry
    );
END;
$$;

REVOKE ALL ON FUNCTION public.check_ai_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_ai_rate_limit(TEXT, INTEGER, INTEGER) TO anon, authenticated, service_role;

-- 2. Provenance column for question <-> lemma links (separates heuristic guesses from verified links)
ALTER TABLE IF EXISTS public.questoes
ADD COLUMN IF NOT EXISTS lema_provenance TEXT DEFAULT 'unassigned';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'questoes_lema_provenance_check'
    ) THEN
        ALTER TABLE public.questoes
        ADD CONSTRAINT questoes_lema_provenance_check
        CHECK (lema_provenance IN ('human_verified', 'llm_anchored_high_conf', 'heuristic_unverified', 'unassigned'));
    END IF;
END $$;

-- 3. Allow recording blank items in mock exams without MNAR bias
ALTER TABLE IF EXISTS public.tentativas DROP CONSTRAINT IF EXISTS tentativas_tipo_erro_check;
ALTER TABLE IF EXISTS public.tentativas
ADD CONSTRAINT tentativas_tipo_erro_check
CHECK (
    tipo_erro IN (
        'nenhum',
        'conta_sinal',
        'manipulacao_algebrica',
        'conceitual',
        'interpretacao',
        'outro',
        'simulado_incorreto',
        'simulado_em_branco'
    )
);

COMMIT;
