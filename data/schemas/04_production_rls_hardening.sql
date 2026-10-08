-- ==============================================================================
-- 04_production_rls_hardening.sql
-- Plataforma LEMMAS (Powered by MathAI Engine)
-- Endurecimento de Segurança: Row Level Security (RLS) Tabela por Tabela
-- ==============================================================================
-- Este script:
-- 1. Remove políticas permissivas antigas ("USING (true)" em dados de usuário).
-- 2. Habilita ROW LEVEL SECURITY em todas as tabelas públicas.
-- 3. Cria função determinística de mapeamento de sessão do Supabase Auth.
-- 4. Aplica políticas estritas de isolamento multilocatário (dono lê/grava o próprio dado).
-- 5. Preserva leitura pública de acervos didáticos (questões, conceitos/lemas).
-- 6. Protege a conta visitante demo (ID 9999) sem expor dados privados de outros alunos.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. FUNÇÃO AUXILIAR: Mapeamento de Usuário Autenticado
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_aluno_id()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.usuarios 
  WHERE email = (auth.jwt() ->> 'email') 
  LIMIT 1;
$$;

-- ------------------------------------------------------------------------------
-- 1. HABILITAR RLS EM TODAS AS TABELAS
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.questoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conceitos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mathnet_ingestao ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.codigos_verificacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sessoes_lembradas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tentativas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.revisao_espacada ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.perfil_aluno_topico ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.consentimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.avaliacoes_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.diagnosticos_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.log_dicas_socraticas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feedback_tentativa ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.validacao_humana ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.card_reviews ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. LIMPEZA DE POLÍTICAS PERMISSIVAS LEGADAS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Acesso usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Acesso tentativas" ON public.tentativas;
DROP POLICY IF EXISTS "Acesso revisao_espacada" ON public.revisao_espacada;
DROP POLICY IF EXISTS "Acesso consentimentos" ON public.consentimentos;
DROP POLICY IF EXISTS "Acesso avaliacoes_ia" ON public.avaliacoes_ia;
DROP POLICY IF EXISTS "Acesso feedback_tentativa" ON public.feedback_tentativa;
DROP POLICY IF EXISTS "Acesso validacao_humana" ON public.validacao_humana;
DROP POLICY IF EXISTS "Acesso flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "Acesso card_reviews" ON public.card_reviews;

-- ------------------------------------------------------------------------------
-- 3. POLÍTICAS: ACERVO PÚBLICO DE ESTUDO (questoes, conceitos, mathnet_ingestao)
-- ------------------------------------------------------------------------------
-- Leitura pública para qualquer visitante/estudante
DROP POLICY IF EXISTS "Leitura pública de questoes" ON public.questoes;
CREATE POLICY "Leitura pública de questoes"
ON public.questoes FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Leitura pública de conceitos" ON public.conceitos;
CREATE POLICY "Leitura pública de conceitos"
ON public.conceitos FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Leitura pública de mathnet_ingestao" ON public.mathnet_ingestao;
CREATE POLICY "Leitura pública de mathnet_ingestao"
ON public.mathnet_ingestao FOR SELECT
TO public
USING (true);

-- ------------------------------------------------------------------------------
-- 4. POLÍTICAS: USUÁRIOS E PERFIS (usuarios, codigos_verificacao, sessoes_lembradas)
-- ------------------------------------------------------------------------------
-- Anti-enumeração: Aluno só visualiza e edita seu próprio perfil.
-- O perfil 9999 (Visitante Convidado) tem visualização permitida para a demo da plataforma.
DROP POLICY IF EXISTS "usuarios_leitura_propria_ou_demo" ON public.usuarios;
CREATE POLICY "usuarios_leitura_propria_ou_demo"
ON public.usuarios FOR SELECT
TO public
USING (
    id = 9999 
    OR (auth.jwt() ->> 'email' IS NOT NULL AND email = (auth.jwt() ->> 'email'))
);

DROP POLICY IF EXISTS "usuarios_atualizacao_propria" ON public.usuarios;
CREATE POLICY "usuarios_atualizacao_propria"
ON public.usuarios FOR UPDATE
TO authenticated
USING (email = (auth.jwt() ->> 'email'))
WITH CHECK (email = (auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "usuarios_insercao_cadastro" ON public.usuarios;
CREATE POLICY "usuarios_insercao_cadastro"
ON public.usuarios FOR INSERT
TO public
WITH CHECK (true);

-- Códigos de verificação e sessões lembradas: Nunca públicos
DROP POLICY IF EXISTS "codigos_verificacao_proprio_email" ON public.codigos_verificacao;
CREATE POLICY "codigos_verificacao_proprio_email"
ON public.codigos_verificacao FOR ALL
TO authenticated
USING (email = (auth.jwt() ->> 'email'))
WITH CHECK (email = (auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "sessoes_lembradas_proprio_usuario" ON public.sessoes_lembradas;
CREATE POLICY "sessoes_lembradas_proprio_usuario"
ON public.sessoes_lembradas FOR ALL
TO authenticated
USING (usuario_id = public.current_aluno_id())
WITH CHECK (usuario_id = public.current_aluno_id());

-- ------------------------------------------------------------------------------
-- 5. POLÍTICAS: ESTADO DE APRENDIZAGEM (tentativas, revisao_espacada, perfil_topico)
-- ------------------------------------------------------------------------------
-- Tentativas: Aluno autenticado acessa apenas suas submissões; visitante lê apenas ID 9999
DROP POLICY IF EXISTS "tentativas_proprio_aluno_select" ON public.tentativas;
CREATE POLICY "tentativas_proprio_aluno_select"
ON public.tentativas FOR SELECT
TO public
USING (
    aluno_id = 9999 
    OR aluno_id = public.current_aluno_id()
);

DROP POLICY IF EXISTS "tentativas_proprio_aluno_insert" ON public.tentativas;
CREATE POLICY "tentativas_proprio_aluno_insert"
ON public.tentativas FOR INSERT
TO public
WITH CHECK (
    aluno_id = 9999 
    OR aluno_id = public.current_aluno_id()
);

-- Revisão Espaçada (SM-2)
DROP POLICY IF EXISTS "revisao_espacada_proprio_aluno" ON public.revisao_espacada;
CREATE POLICY "revisao_espacada_proprio_aluno"
ON public.revisao_espacada FOR ALL
TO public
USING (
    aluno_id = 9999 
    OR aluno_id = public.current_aluno_id()
)
WITH CHECK (
    aluno_id = 9999 
    OR aluno_id = public.current_aluno_id()
);

-- Perfil por Tópico
DROP POLICY IF EXISTS "perfil_aluno_topico_proprio_aluno" ON public.perfil_aluno_topico;
CREATE POLICY "perfil_aluno_topico_proprio_aluno"
ON public.perfil_aluno_topico FOR ALL
TO public
USING (
    aluno_id = 9999 
    OR aluno_id = public.current_aluno_id()
)
WITH CHECK (
    aluno_id = 9999 
    OR aluno_id = public.current_aluno_id()
);

-- ------------------------------------------------------------------------------
-- 6. POLÍTICAS: FLASHCARDS & FSRS-v4 (flashcards, card_reviews)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "flashcards_proprio_estudante" ON public.flashcards;
CREATE POLICY "flashcards_proprio_estudante"
ON public.flashcards FOR ALL
TO public
USING (
    student_id = '9999'
    OR student_id = 'student-demo-01'
    OR student_id = (auth.uid())::text
    OR student_id = (auth.jwt() ->> 'email')
    OR student_id = (public.current_aluno_id())::text
)
WITH CHECK (
    student_id = '9999'
    OR student_id = 'student-demo-01'
    OR student_id = (auth.uid())::text
    OR student_id = (auth.jwt() ->> 'email')
    OR student_id = (public.current_aluno_id())::text
);

DROP POLICY IF EXISTS "card_reviews_proprio_estudante" ON public.card_reviews;
CREATE POLICY "card_reviews_proprio_estudante"
ON public.card_reviews FOR ALL
TO public
USING (
    student_id = '9999'
    OR student_id = 'student-demo-01'
    OR student_id = (auth.uid())::text
    OR student_id = (auth.jwt() ->> 'email')
    OR student_id = (public.current_aluno_id())::text
)
WITH CHECK (
    student_id = '9999'
    OR student_id = 'student-demo-01'
    OR student_id = (auth.uid())::text
    OR student_id = (auth.jwt() ->> 'email')
    OR student_id = (public.current_aluno_id())::text
);

-- ------------------------------------------------------------------------------
-- 7. POLÍTICAS: PROVENIÊNCIA, LGPD & IA (consentimentos, avaliacoes, feedbacks)
-- ------------------------------------------------------------------------------
-- Consentimentos LGPD: Apenas o dono pode ver ou modificar
DROP POLICY IF EXISTS "consentimentos_proprio_aluno" ON public.consentimentos;
CREATE POLICY "consentimentos_proprio_aluno"
ON public.consentimentos FOR ALL
TO public
USING (
    aluno_id = 9999 
    OR aluno_id = public.current_aluno_id()
)
WITH CHECK (
    aluno_id = 9999 
    OR aluno_id = public.current_aluno_id()
);

-- Avaliações de IA: Leitura vinculada à tentativa do próprio aluno
DROP POLICY IF EXISTS "avaliacoes_ia_leitura_dono_tentativa" ON public.avaliacoes_ia;
CREATE POLICY "avaliacoes_ia_leitura_dono_tentativa"
ON public.avaliacoes_ia FOR SELECT
TO public
USING (
    EXISTS (
        SELECT 1 FROM public.tentativas t
        WHERE t.id = avaliacoes_ia.tentativa_id
          AND (t.aluno_id = 9999 OR t.aluno_id = public.current_aluno_id())
    )
);

DROP POLICY IF EXISTS "avaliacoes_ia_insercao_permitida" ON public.avaliacoes_ia;
CREATE POLICY "avaliacoes_ia_insercao_permitida"
ON public.avaliacoes_ia FOR INSERT
TO public
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.tentativas t
        WHERE t.id = avaliacoes_ia.tentativa_id
          AND (t.aluno_id = 9999 OR t.aluno_id = public.current_aluno_id())
    )
);

-- Diagnósticos de IA (Legado / Paralelo)
DROP POLICY IF EXISTS "diagnosticos_ia_proprio_aluno" ON public.diagnosticos_ia;
CREATE POLICY "diagnosticos_ia_proprio_aluno"
ON public.diagnosticos_ia FOR ALL
TO public
USING (
    aluno_id = 9999 
    OR aluno_id = public.current_aluno_id()
)
WITH CHECK (
    aluno_id = 9999 
    OR aluno_id = public.current_aluno_id()
);

-- Log Dicas Socráticas
DROP POLICY IF EXISTS "log_dicas_socraticas_proprio_aluno" ON public.log_dicas_socraticas;
CREATE POLICY "log_dicas_socraticas_proprio_aluno"
ON public.log_dicas_socraticas FOR ALL
TO public
USING (
    aluno_id = 9999 
    OR aluno_id = public.current_aluno_id()
)
WITH CHECK (
    aluno_id = 9999 
    OR aluno_id = public.current_aluno_id()
);

-- Feedback da Tentativa (Human-in-the-Loop Aluno)
DROP POLICY IF EXISTS "feedback_tentativa_dono" ON public.feedback_tentativa;
CREATE POLICY "feedback_tentativa_dono"
ON public.feedback_tentativa FOR ALL
TO public
USING (
    EXISTS (
        SELECT 1 FROM public.tentativas t
        WHERE t.id = feedback_tentativa.tentativa_id
          AND (t.aluno_id = 9999 OR t.aluno_id = public.current_aluno_id())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.tentativas t
        WHERE t.id = feedback_tentativa.tentativa_id
          AND (t.aluno_id = 9999 OR t.aluno_id = public.current_aluno_id())
    )
);

-- Validação Humana (Curadoria Especializada)
-- Leitura permitida para o aluno ver a validação da sua tentativa; inserção restrita
DROP POLICY IF EXISTS "validacao_humana_leitura_aluno" ON public.validacao_humana;
CREATE POLICY "validacao_humana_leitura_aluno"
ON public.validacao_humana FOR SELECT
TO public
USING (
    validador_id = public.current_aluno_id()
    OR EXISTS (
        SELECT 1 FROM public.tentativas t
        WHERE t.id = validacao_humana.tentativa_id
          AND (t.aluno_id = 9999 OR t.aluno_id = public.current_aluno_id())
    )
);

-- ------------------------------------------------------------------------------
-- FIM DO SCRIPT DE HARDENING RLS
-- ------------------------------------------------------------------------------
