-- Script SQL para importação de traduções MathNet
-- Execute no Supabase SQL Editor

-- 1. Criar tabela se não existir
create table if not exists mathnet_enunciados (
    id text primary key,
    idioma_origem text,
    idioma_rotulo text,
    modelo text,
    licenca_modelo text,
    identificador_idioma text,
    geracao jsonb,
    dispositivo text,
    hash_original_sha256 text,
    enunciado_original text,
    math_spans integer,
    integridade_matematica boolean,
    status text check (status in ('translated_unreviewed', 'review_required')),
    revisao_humana text,
    enunciado_ptbr text,
    created_at timestamp default now(),
    updated_at timestamp default now()
);

-- 2. Habilitar RLS se não estiver ativo
alter table mathnet_enunciados enable row level security;

-- 3. Política básica para leitura (ajuste conforme necessidade)
create policy if not exists " Authenticated users can read all" on mathnet_enunciados
    for select using (auth.role() = 'authenticated');

-- 4. Índices para performance
create index if not exists idx_mathnet_status on mathnet_enunciados(status);
create index if not exists idx_mathnet_idioma on mathnet_enunciados(idioma_origem);
create index if not exists idx_mathnet_integridade on mathnet_enunciados(integridade_matematica);

-- 5. Function para upsert
create or replace function upsert_enunciado(
    p_id text,
    p_idioma_origem text,
    p_idioma_rotulo text,
    p_modelo text,
    p_licenca_modelo text,
    p_identificador_idioma text,
    p_geracao jsonb,
    p_dispositivo text,
    p_hash_original_sha256 text,
    p_enunciado_original text,
    p_math_spans integer,
    p_integridade_matematica boolean,
    p_status text,
    p_revisao_humana text,
    p_enunciado_ptbr text
) returns void as $$
begin
    insert into mathnet_enunciados (
        id, idioma_origem, idioma_rotulo, modelo, licenca_modelo,
        identificador_idioma, geracao, dispositivo, hash_original_sha256,
        enunciado_original, math_spans, integridade_matematica, status,
        revisao_humana, enunciado_ptbr
    ) values (
        p_id, p_idioma_origem, p_idioma_rotulo, p_modelo, p_licenca_modelo,
        p_identificador_idioma, p_geracao, p_dispositivo, p_hash_original_sha256,
        p_enunciado_original, p_math_spans, p_integridade_matematica, p_status,
        p_revisao_humana, p_enunciado_ptbr
    ) on conflict (id) do update set
        idioma_origem = excluded.idioma_origem,
        idioma_rotulo = excluded.idioma_rotulo,
        modelo = excluded.modelo,
        licenca_modelo = excluded.licenca_modelo,
        identificador_idioma = excluded.identificador_idioma,
        geracao = excluded.geracao,
        dispositivo = excluded.dispositivo,
        hash_original_sha256 = excluded.hash_original_sha256,
        enunciado_original = excluded.enunciado_original,
        math_spans = excluded.math_spans,
        integridade_matematica = excluded.integridade_matematica,
        status = excluded.status,
        revisao_humana = excluded.revisao_humana,
        enunciado_ptbr = excluded.enunciado_ptbr,
        updated_at = now();
end;
$$ language plpgsql security definer;

-- 6. Teste rápido
select 
    status,
    count(*) as total,
    round(100.0 * count(*) / sum(count(*)) over(), 2) as pct
from mathnet_enunciados
group by status;