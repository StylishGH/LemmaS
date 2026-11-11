-- ==============================================================================
-- 14_add_resposta_aluno_and_resolucao_storage.sql
-- Plataforma LEMMAS (Powered by MathAI Engine)
-- Camada 1 & 2: Preservação de Dados Brutos de Treino (SFT / TRI / DPO)
-- Princípio: DADO OBSERVADO != INTERPRETAÇÃO DA IA != DADO VALIDADO
-- ==============================================================================

-- 1. ADICIONA A ALTERNATIVA MARCADA (OBJETIVAS) E TEXTO BRUTO (DISCURSIVAS) EM TENTATIVAS
-- Essencial para: Análise de Distratores na TRI, Matriz de Confusão e SFT Multimodal
ALTER TABLE public.tentativas 
    ADD COLUMN IF NOT EXISTS resposta_aluno TEXT,
    ADD COLUMN IF NOT EXISTS texto_resolucao TEXT;

CREATE INDEX IF NOT EXISTS idx_tentativas_resposta_aluno 
    ON public.tentativas USING btree (resposta_aluno);

CREATE INDEX IF NOT EXISTS idx_tentativas_questao_acerto 
    ON public.tentativas USING btree (questao_id, acertou, resposta_aluno);

-- 2. ENRIQUECIMENTO DE FEEDBACK DO ALUNO PARA ALINHAMENTO DPO / RLHF
-- Conecta o feedback do aluno (útil / concorda) com a linha exata da tentativa e do parecer da IA
ALTER TABLE public.feedbacks_aluno
    ADD COLUMN IF NOT EXISTS tentativa_id BIGINT REFERENCES public.tentativas(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS avaliacao_ia_id BIGINT REFERENCES public.avaliacoes_ia(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_feedbacks_aluno_tentativa_id 
    ON public.feedbacks_aluno USING btree (tentativa_id);

CREATE INDEX IF NOT EXISTS idx_feedbacks_aluno_avaliacao_ia_id 
    ON public.feedbacks_aluno USING btree (avaliacao_ia_id);

-- 3. PROVISIONAMENTO DO BUCKET DE RESOLUÇÕES MANUSCRITAS (SUPABASE STORAGE)
-- Armazena PNGs renderizados da lousa SpenSmartCanvas e fotos de caderno com hash SHA-256
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'resolucoes',
            'resolucoes',
            true,
            10485760, -- 10 MB
            ARRAY['image/png', 'image/jpeg', 'image/webp']
        )
        ON CONFLICT (id) DO UPDATE SET
            public = true,
            file_size_limit = 10485760;
    END IF;
END $$;

-- 4. POLÍTICAS DE ACESSO STORAGE (PÚBLICO LEITURA / ANON INSERÇÃO)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
        DROP POLICY IF EXISTS "Acesso publico resolucoes" ON storage.objects;
        CREATE POLICY "Acesso publico resolucoes" ON storage.objects
            FOR SELECT USING (bucket_id = 'resolucoes');

        DROP POLICY IF EXISTS "Insercao resolucoes autenticadas e anonimas" ON storage.objects;
        CREATE POLICY "Insercao resolucoes autenticadas e anonimas" ON storage.objects
            FOR INSERT WITH CHECK (bucket_id = 'resolucoes');
    END IF;
END $$;

-- 5. VIEW ANALÍTICA CANÔNICA PARA CIÊNCIA DE DADOS E EXPORTAÇÃO SFT / TRI
-- Junta o enunciado, gabarito, resposta do aluno, diagnóstico da IA e feedback
CREATE OR REPLACE VIEW public.vw_sft_dataset_export AS
SELECT
    t.id AS tentativa_id,
    t.questao_id,
    q.materia,
    q.topico,
    q.banca,
    q.ano,
    q.dificuldade,
    q.tipo AS tipo_questao,
    q.enunciado,
    q.gabarito AS gabarito_oficial,
    COALESCE(t.resposta_aluno, substring(t.anotacoes from '\[RESPOSTA:([^\]]+)\]')) AS resposta_aluno,
    t.acertou,
    t.tempo_segundos,
    t.confianca_aluno,
    t.estrategia_usada,
    t.tipo_erro,
    t.imagem_resolucao_path,
    a.id AS avaliacao_ia_id,
    a.provedor_modelo,
    a.nome_modelo,
    a.latencia_ms,
    a.output_estruturado->>'veredito' AS veredito_ia,
    a.output_estruturado->>'diagnostico' AS diagnostico_ia,
    a.output_estruturado->>'feedback_latex' AS feedback_latex_ia,
    a.output_estruturado->'erros_identificados' AS erros_identificados_ia,
    a.output_estruturado->'raw_input_aluno' AS raw_input_aluno,
    f.util AS feedback_util,
    f.concorda_diagnostico AS feedback_concorda,
    f.comentario AS feedback_comentario,
    t.data_hora
FROM public.tentativas t
JOIN public.questoes q ON q.id = t.questao_id
LEFT JOIN public.avaliacoes_ia a ON a.tentativa_id = t.id
LEFT JOIN public.feedbacks_aluno f ON f.tentativa_id = t.id;

COMMENT ON VIEW public.vw_sft_dataset_export IS 'View unificada para exportação de dados para Fine-Tuning (SFT/DPO), TRI e análise de distratores.';
