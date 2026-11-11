-- Presença recente e painel administrativo de atividade do estudante.
-- O histórico completo de respostas continua em public.tentativas; esta tabela
-- guarda somente o último heartbeat por estudante.

CREATE TABLE IF NOT EXISTS public.student_presence (
    student_id BIGINT PRIMARY KEY REFERENCES public.usuarios(id) ON DELETE CASCADE,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    current_section TEXT NOT NULL DEFAULT 'other'
        CHECK (current_section IN ('resolver', 'questoes', 'other'))
);

CREATE INDEX IF NOT EXISTS idx_student_presence_last_seen
    ON public.student_presence (last_seen_at DESC);

ALTER TABLE public.student_presence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_presence FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.student_presence TO authenticated;

DROP POLICY IF EXISTS student_presence_self_access ON public.student_presence;
CREATE POLICY student_presence_self_access
    ON public.student_presence
    FOR ALL
    TO authenticated
    USING (student_id = public.current_aluno_id())
    WITH CHECK (student_id = public.current_aluno_id());

CREATE TABLE IF NOT EXISTS public.analytics_admins (
    email TEXT PRIMARY KEY CHECK (email = lower(btrim(email))),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.analytics_admins FROM PUBLIC, anon, authenticated;

-- O proprietário conectado ao projeto Vercel é o administrador inicial.
INSERT INTO public.analytics_admins (email)
VALUES ('guiguimendes2002@gmail.com')
ON CONFLICT (email) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_get_analytics(p_hours INTEGER DEFAULT 24)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_email TEXT := lower(coalesce(auth.jwt() ->> 'email', ''));
    v_result JSONB;
BEGIN
    IF auth.uid() IS NULL OR NOT EXISTS (
        SELECT 1
        FROM public.analytics_admins a
        WHERE a.email = v_email
    ) THEN
        RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
    END IF;

    IF p_hours NOT IN (24, 168, 720) THEN
        RAISE EXCEPTION 'Janela de consulta inválida.' USING ERRCODE = '22023';
    END IF;

    SELECT jsonb_build_object(
        'onlineStudents', coalesce((
            SELECT jsonb_agg(jsonb_build_object(
                'studentId', u.id,
                'name', u.nome,
                'email', u.email,
                'lastSeenAt', p.last_seen_at,
                'section', p.current_section
            ) ORDER BY p.last_seen_at DESC)
            FROM public.student_presence p
            JOIN public.usuarios u ON u.id = p.student_id
            WHERE p.student_id <> 9999
              AND p.last_seen_at >= now() - interval '2 minutes'
        ), '[]'::jsonb),
        'summary', jsonb_build_object(
            'attempts', (
                SELECT count(*)
                FROM public.tentativas t
                WHERE t.aluno_id <> 9999
                  AND t.data_hora >= now() - make_interval(hours => p_hours)
            ),
            'activeStudents', (
                SELECT count(DISTINCT t.aluno_id)
                FROM public.tentativas t
                WHERE t.aluno_id <> 9999
                  AND t.data_hora >= now() - make_interval(hours => p_hours)
            ),
            'correctAnswers', (
                SELECT count(*)
                FROM public.tentativas t
                WHERE t.aluno_id <> 9999
                  AND t.acertou = 1
                  AND t.data_hora >= now() - make_interval(hours => p_hours)
            )
        ),
        'recentAttempts', coalesce((
            SELECT jsonb_agg(item ORDER BY occurred_at DESC)
            FROM (
                SELECT
                    t.data_hora AS occurred_at,
                    jsonb_build_object(
                        'attemptId', t.id,
                        'studentName', u.nome,
                        'studentEmail', u.email,
                        'questionId', q.id,
                        'subject', q.materia,
                        'topic', q.topico,
                        'correct', t.acertou = 1,
                        'occurredAt', t.data_hora
                    ) AS item
                FROM public.tentativas t
                JOIN public.usuarios u ON u.id = t.aluno_id
                JOIN public.questoes q ON q.id = t.questao_id
                WHERE t.aluno_id <> 9999
                  AND t.data_hora >= now() - make_interval(hours => p_hours)
                ORDER BY t.data_hora DESC
                LIMIT 50
            ) attempts
        ), '[]'::jsonb)
    ) INTO v_result;

    RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_get_analytics(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_analytics(INTEGER) TO authenticated;
