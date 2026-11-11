-- Atividade diária de resolução nos últimos 30 dias (horário de São Paulo).
-- Exclui o perfil de demonstração (aluno_id = 9999).
SELECT
  DATE(data_hora AT TIME ZONE 'America/Sao_Paulo') AS dia,
  COUNT(DISTINCT aluno_id) AS estudantes_ativos,
  COUNT(*) AS questoes_respondidas,
  COUNT(*) FILTER (WHERE acertou = 1) AS acertos
FROM public.tentativas
WHERE data_hora >= NOW() - INTERVAL '30 days'
  AND aluno_id <> 9999
GROUP BY 1
ORDER BY dia DESC;
