-- ==============================================================================
-- 05_legal_consent_and_billing.sql
-- Modelagem de Dados para Consentimento Legal (LGPD/CDC), Perfil Acadêmico
-- e Faturamento Fiscal (NFS-e / Gateways de Pagamento)
-- Plataforma LEMMAS (Powered by MathAI Engine)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Extensão para Auditoria do Aceite Legal (LGPD & CDC)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS usuarios ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP NULL;
ALTER TABLE IF EXISTS usuarios ADD COLUMN IF NOT EXISTS terms_version VARCHAR(10) DEFAULT '1.2';
ALTER TABLE IF EXISTS usuarios ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMP NULL;

-- ------------------------------------------------------------------------------
-- 2. Perfil Acadêmico e Metas de Estudo (Onboarding)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS usuarios ADD COLUMN IF NOT EXISTS education_level VARCHAR(50) NULL;
ALTER TABLE IF EXISTS usuarios ADD COLUMN IF NOT EXISTS institution VARCHAR(100) NULL;
ALTER TABLE IF EXISTS usuarios ADD COLUMN IF NOT EXISTS course VARCHAR(100) NULL;
ALTER TABLE IF EXISTS usuarios ADD COLUMN IF NOT EXISTS target_goals JSONB NULL; -- ex: ["ESA", "EsPCEx", "EFOMM"]

-- ------------------------------------------------------------------------------
-- 3. Tabela Dedicada de Faturamento e Dados Fiscais (NFS-e)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS billing_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL,
    aluno_id BIGINT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    birth_date DATE NOT NULL,
    postal_code VARCHAR(9) NOT NULL,
    street VARCHAR(150) NOT NULL,
    number VARCHAR(20) NOT NULL,
    complement VARCHAR(100),
    neighborhood VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_billing_profiles_cpf ON billing_profiles(cpf);
CREATE INDEX IF NOT EXISTS idx_billing_profiles_aluno_id ON billing_profiles(aluno_id);
CREATE INDEX IF NOT EXISTS idx_billing_profiles_user_id ON billing_profiles(user_id);

-- ------------------------------------------------------------------------------
-- 4. Políticas de Segurança em Nível de Linha (RLS - Row Level Security)
-- ------------------------------------------------------------------------------
ALTER TABLE billing_profiles ENABLE ROW LEVEL SECURITY;

-- Usuário autenticado só pode consultar e editar seu próprio perfil fiscal
DROP POLICY IF EXISTS "Usuário consulta seu próprio perfil de faturamento" ON billing_profiles;
CREATE POLICY "Usuário consulta seu próprio perfil de faturamento"
    ON billing_profiles
    FOR SELECT
    USING (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
        (aluno_id = (SELECT id FROM usuarios WHERE email = auth.jwt()->>'email' LIMIT 1))
    );

DROP POLICY IF EXISTS "Usuário gerencia seu próprio perfil de faturamento" ON billing_profiles;
CREATE POLICY "Usuário gerencia seu próprio perfil de faturamento"
    ON billing_profiles
    FOR ALL
    USING (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
        (aluno_id = (SELECT id FROM usuarios WHERE email = auth.jwt()->>'email' LIMIT 1))
    )
    WITH CHECK (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
        (aluno_id = (SELECT id FROM usuarios WHERE email = auth.jwt()->>'email' LIMIT 1))
    );
