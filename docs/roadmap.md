# LemmaS + MathAI Engine — Roadmap Mestre

> **Versão:** 1.4 — Release de Modo Foco, personalização e vitrine
> **Data:** 11/11/2026
> **Status deste documento:** Registra a entrega em produção do PR #83 e preserva o histórico das fases anteriores. Contagens atuais têm data e fonte; validação de interface e API não equivale a calibração psicométrica ou benchmark dos provedores.
> **Objetivo:** Reunir produto, engenharia de software, engenharia de dados, dados pedagógicos, IA e Ciência de Dados em um plano unificado, garantindo integridade epistemológica: `DADO OBSERVADO ≠ INTERPRETAÇÃO DA IA ≠ DADO VALIDADO`.

---

## 0. Como ler este roadmap

Os status abaixo refletem o estado real verificado do código, testes e ambiente:

- **[x] Concluído & Validado:** Implementado no código, com testes unitários/integrados aprovados, contratos de API auditados e verificado em execução.
- **[~] Parcial / em refinamento contínuo:** Há implementação funcional ativa em produção/piloto, com refinamentos incrementais planejados.
- **[ ] Planejado:** Próxima funcionalidade na fila de prioridades estratégicas da plataforma.
- **[!] Atenção Arquitetural / Regra de Ouro:** Diretriz que deve ser preservada rigorosamente por todos os agentes e desenvolvedores.
- **[→] Visão de Longo Prazo:** Próximas fronteiras científicas e de produto (TRI, Fine-Tuning local de SLM, Knowledge Tracing).

**Regra de ouro:** Um item só é considerado concluído quando o código foi auditado, os testes relevantes passaram e a compatibilidade de contratos (frontend, backend e banco) foi demonstrada ponta a ponta.

Este documento consolida fontes que divergem. Quando há conflito entre um relatório antigo e um erro reproduzido agora, prevalece a evidência mais recente do teste — e a divergência fica registrada para auditoria.

## 0.1 Release publicada em 11/11/2026

**Evidência:** [PR #83 integrado](https://github.com/StylishGH/LemmaS/pull/83), commit de produção `1a6ed119e340f19ebae04e211f555fb1659890d7`, checks de CI e deploy Vercel aprovados. Site: [lemmas.com.br](https://lemmas.com.br).

### Entregue e verificado

- [x] Landing do estudante e portfólio técnico com capturas maiores, LaTeX corrigido e alegações alinhadas ao código; sem promessas de IA sem erros ou de calibração psicométrica já concluída.
- [x] Modo Foco com lousa/GeoGebra, painel flutuante da questão e acesso ao Tutor Socrático no próprio overlay.
- [x] Painel de dicas compartilha estado, histórico e progressão com a bancada. O nível 5 mantém confirmação de rendição e a política de penalidade SM-2; os diálogos ficam acima do overlay. Durante simulados ativos, o painel informa que as dicas estão desabilitadas.
- [x] Preferências do perfil ordenam o banco completo. Bancas têm prioridade, seguidas das matérias dentro dos grupos; filtros manuais e de URL continuam restringindo a consulta.
- [x] Paginação entre grupos mantém o total e não repete questões na transição. Preferência por Escola Naval não exclui as outras bancas.
- [x] Correção da consulta de Funções, normalização de nomes/IDs do perfil e tratamento de falha da API com repetição da consulta sem apagar filtros.
- [x] Vitrine usa `/api/stats`; indisponibilidade produz “—”, sem contagens antigas apresentadas como atuais.

### Evidência de validação e limites

- Build de produção, TypeScript e testes de backend aprovados no GitHub.
- 14 testes do motor pedagógico e 4 regressões da API de ordenação aprovados; as quatro regressões também passaram contra o domínio de produção.
- Navegador: abertura do painel em treino, confirmação do nível 5 acima do overlay, layout de tablet e bloqueio em simulado. Landing publicada sem imagens quebradas ou erros KaTeX nos elementos inspecionados.
- O teste do painel não executou chamadas reais de IA, gravação autenticada de rendição ou benchmark de caneta. A confirmação visual não comprova esses fluxos de ponta a ponta.
- Revisão local de 11/11/2026: testes automatizados de desenho/histórico e componentes reais no Chrome, incluindo Foco e tema claro. [Evidência, referências e limites](architecture/lousa-focus-validation.md). A validação física com S-Pen permanece pendente.

### Próximas verificações

- [ ] Validar dicas autenticadas N1–N5 em produção, incluindo falha/repetição de chamada, registro da rendição e persistência após recarregar.
- [ ] Validar preservação do rascunho e histórico ao navegar entre questões e entrar/sair do Modo Foco em tablet com caneta real.
- [ ] Medir latência, custo e qualidade dos provedores com entradas comparáveis; não inferir desempenho de uma captura de tela.
- [ ] Consolidar a fonte de verdade do agendamento SM-2/agendador experimental antes de qualquer substituição; manter TRI e active learning como pesquisa futura.

## 0.2 Navegação e carregamento progressivo

- [x] Barras da bancada com quatro ferramentas distribuídas em colunas iguais; navegação do resolver em blocos de até 20 números com “Ir para”, sem rolagem horizontal (PR #85).
- [x] Busca personalizada sem contagem antecipada de todos os grupos; contagem de grupos anteriores apenas quando necessária para traduzir um salto de página (PR #86).
- [x] Banco mostra as 15 questões atuais antes de antecipar a próxima página em segundo plano, usando os mesmos filtros e parâmetros de prioridade (PR #87).
- [x] Cache em memória desta visita, limitado a seis páginas; reaproveita páginas concluídas e requisições já em andamento. Troca de usuário, filtros, preferências ou repetição explícita da consulta invalida a fila.
- [x] Falha de antecipação não substitui a lista por erro; ao navegar, a página não carregada pode ser solicitada novamente.
- [x] Cinco testes do cache no CI: reutilização, concorrência, repetição após falha, limite de memória e cancelamento de respostas antigas. Verificação de navegador cobre avanço/retorno sem nova consulta da mesma página, mudança de filtros e falha em segundo plano.

## 0.3 Orientação da landing do estudante

- [x] Acesso a “Definir meu objetivo” com explicação de que as preferências priorizam questões, mantendo o restante do acervo disponível.
- [x] Ciclo de estudo em três passos com linguagem voltada ao estudante; encerramento direciona ao perfil ou ao banco.
- [x] FAQ acessível por teclado sobre conta, uso sem tablet, dicas/rendição e limites da IA.
- [x] Contato profissional restrito ao portfólio técnico.
- [x] Amostras identificadas como exemplos didáticos, sem atribuição não comprovada a provas. Corrigidos o discriminante da parábola e a renderização de matrizes; expressões da landing preservam delimitadores explícitos sem alterar o parser de questões importadas.

- [x] Prévias das recomendações no painel preservam fórmulas delimitadas completas ao resumir o enunciado, com altura limitada e regressão para sistemas de equações.

## 0.4 Sanear acervo (Blocos A e B) e comentários por questão (implementação local)

- [x] **Bloco A (Frontend / filtros / simulado):** ajustes de renderização KaTeX segura (`strict: "ignore"`), filtros de matéria/subtópico e estabilidade de UI no resolver verificados localmente em testes unitários, TypeScript e build de produção.
- [~] **Bloco B (Sanitização e reclassificação do acervo):** script determinístico (`scripts/maintenance/bloco_b_remediation.py`), suíte TDD (`tests/test_bloco_b_remediation.py`) e migration transacional (`data/schemas/20_bloco_b_sanitization_and_reclassification.sql`) preparados e auditados localmente contra snapshot de 21.638 questões; aguardam aplicação da migration no Supabase.
- [~] **Comentários humanos por questão (antecipação isolada da Fase 04):** schema com RLS/rate-limit em RPC (`data/schemas/19_question_comments.sql`), rotas Next.js (`/api/community`, `/api/admin/comments`), UI (`QuestionDiscussion`, `/admin/comments`), testes SQL em PostgreSQL local (`tests/community/`) e testes de contrato validados localmente; migration remota e fluxo autenticado em produção pendentes de aplicação. [Arquitetura e limites](architecture/community-comments.md).

## 1. Visão do produto

### 1.1 Identidade

- **LemmaS / LEMMAS:** plataforma educacional usada pelo estudante para encontrar questões, praticar, revisar, acompanhar a evolução e estudar Matemática.
- **MathAI Engine:** camada especializada de inteligência matemática que apoia tutoria socrática, análise de resoluções, OCR matemático, avaliação e recomendação.
- **LEMMAS Core:** lógica reutilizável de aprendizagem — perfil, tentativas, histórico, repetição espaçada e ferramentas genéricas — sem acoplar tudo exclusivamente à Matemática.

A plataforma é o produto. O MathAI é o motor de inteligência, não uma segunda marca de site independente.

### 1.2 Resultado de longo prazo

Construir uma plataforma confiável que conecte:

1. **Questões e resoluções de qualidade**;
2. **Lemas, gatilhos e estratégias matemáticas**;
3. **Tentativas reais dos estudantes**;
4. **Revisão e recomendação adaptativas**;
5. **Métricas pedagógicas mensuráveis**;
6. **Modelos de IA/ML avaliados com dados rastreáveis**.

### 1.3 Princípio epistemológico

> **Dado observado ≠ interpretação da IA ≠ dado validado.**

- **Observado:** resposta enviada, tempo, confiança declarada, resolução original e metadados da tentativa.
- **Inferido pela IA:** transcrição, classificação de erro, lema candidato ou dica.
- **Validado:** correção confirmada por regra determinística, gabarito oficial confiável, aluno ou revisão humana.

Uma inferência do modelo nunca deve sobrescrever silenciosamente a resposta original ou ser tratada automaticamente como rótulo verdadeiro de treinamento.

---

## 2. Auditoria do estado atual: conflitos a resolver

Esta seção é essencial para que os agentes não trabalhem com versões diferentes da realidade.

### 2.1 Contagens de questões e lemas — [x] Auditado & Verificado

Consulta à [API de estatísticas de produção](https://lemmas.com.br/api/stats) em **11/11/2026**:

- **Questões:** **21.578 registros** em `public.questoes`.
- **Lemas:** **3.000 registros** em `public.lemmas`.
- **Fonte operacional:** `frontend/app/api/stats/route.ts`, com contagem exata. Os números mudam com a curadoria; quantidade de registros não comprova revisão individual.
- **Histórico:** a auditoria anterior registrava 21.272 questões e o catálogo canônico inicial de 2.000 lemas (`data/repertorio/canonical_lemmas_2000.json`). Essas referências históricas abaixo não devem ser usadas como contagem atual.

- **Taxonomia Canônica (12 Grandes Áreas):** Reclassificação consolidada com a matéria *Funções* desmembrada com 2.148 questões, e eliminação definitiva de resíduos com menos de 10 questões (`Geral`, `Lógica`, `Matemática Geral`).
- **Tabelas Canônicas:** `public.questoes` (acervo), `public.lemmas` (catálogo), `public.tentativas` (histórico de submissões discursivas e objetivas com SHA-256), `public.avaliacoes_ia` (persistência completa de avaliações pedagógicas) e `public.ai_inference_logs` (telemetria N:1 com tokens).

### 2.2 Arquitetura Oficial Consolidada — [x] Padrão Estabelecido

- **Frontend:** Next.js 16 (App Router, Turbopack, Tailwind CSS v4, KaTeX, Lucide React).
- **Backend Cognitivo:** FastAPI modular (Python 3.12, Pydantic DTOs, MathAI Gateway sob Padrão Strategy).
- **Database & Storage:** Supabase PostgreSQL com Row-Level Security (RLS) ativo e Supabase Storage para figuras e diagramas.
- **Roteamento de IA Centralizado:** Fim do split-brain. Toda inferência analítica e socrática é delegada pelo Next.js com autoridade única ao FastAPI, mantendo contingência local e descarte estrito de saídas corrompidas.

### 2.3 RPC de Estatísticas e Facets Globais — [x] Concluído

- `frontend/app/api/questions/route.ts` integra a RPC `get_lemmas_global_stats()` com caching inteligente em memória (TTL de 60s) e contagem exata sem limite artificial de 1000 questões.
- Anos com contagem zero eliminados da interface via agregação factual (`ACERVO_ANOS_COUNTS`).

---

## 3. Prioridade imediata — P0: corrigir e validar o simulado

Esta seção preserva a prioridade original de estabilização, cujo critério de saída foi registrado como atingido. As verificações imediatas da release atual estão na seção 0.1.

### 3.1 Problemas observados no teste local — [x] Resolvidos

- **[x] Gabarito indefinido:** `frontend/app/(app)/resolver/page.tsx` e `/api/simulados/enviar/route.ts` utilizam fronteira canônica `(q.gabarito || "").trim().toUpperCase()`, com salvaguardas contra valores nulos e ausentes.
- **[x] Chave duplicada `AFA`:** `frontend/app/api/questions/route.ts` agora consolida e soma contagens de bancas duplicadas via mapa normalizado `trim().toUpperCase()`, garantindo chaves únicas no front-end.
- **[x] Formato de `answers`:** Armazenamento unificado por ID real da questão (`answers[q.id]`) validado ponta a ponta em seleção, confirmação, envio, revisão e feedback do estudante.
- **[x] Fallback local:** Adicionada computação e persistência local determinística em `sessionStorage` com objetos SM-2 caso a API de simulados enfrente instabilidade de rede.
- **[x] Bancada de Geometria Euclidiana:** Destravada com fallback de segurança por timeout (3.5s) e seletor manual de motor (Script Nativo vs. Iframe Embed Oficial) em `GeometricCompassBoard.tsx`.

### 3.2 Tarefas P0

- [x] Rastrear a estrutura real da questão desde a API/estado do frontend até o cálculo do resultado.
- [x] Identificar o campo canônico do gabarito e normalizá-lo em uma fronteira explícita, sem presumir que `gabarito` sempre existe.
- [x] Distinguir “resposta errada” de “não foi possível determinar o gabarito”. Não classificar uma resposta como errada quando o gabarito está ausente.
- [x] Verificar se as questões sem gabarito são registros inválidos, campos com outro nome ou dados transformados incorretamente.
- [x] Manter a chave `answers[q.id]` de forma consistente em seleção, confirmação, envio, resultado e revisão.
- [x] Investigar por que existe mais de uma entrada `AFA`; normalizar/combinar duplicatas legítimas e preservar os filtros.
- [x] Confirmar que a lista de bancas, depois da correção, não apresenta aviso de key duplicada.
- [x] Executar o build e os testes disponíveis (`npx tsc --noEmit` aprovado com 0 erros).
- [x] Testar um fluxo local completo antes de qualquer deploy.

### 3.3 Casos de regressão obrigatórios

- [x] Simulado com várias respostas corretas.
- [x] Simulado com respostas incorretas.
- [x] Questão deixada em branco.
- [x] Questão cujo gabarito esteja ausente ou inválido.
- [x] Voltar a uma questão, alterar a alternativa e entregar.
- [x] Revisão pós-simulado mostra a resposta realmente selecionada.
- [x] Falha da API: mensagem compreensível e fallback consistente, sem duplicar submissões.
- [x] Envio à API e cálculo local produzem a mesma interpretação do resultado para os mesmos dados.
- [x] Console sem exceções relacionadas ao fluxo.

**Critério de saída P0:** ATINGIDO. A entrega local funciona, a contagem de acertos/erros/brancos bate com o gabarito disponível, questões sem gabarito não geram classificação falsa, a revisão está correta, a bancada geométrica euclidiana não congela e o aviso de banca duplicada foi resolvido.

### 3.4 Deploy: autorização concedida

- [x] Revisar `git status`, branch, arquivos modificados e commits à frente do remoto.
- [x] Build TypeScript `npx tsc --noEmit` validado com 0 erros.
- [x] Deploy autorizado pelo usuário via comando explícito ("pode comitar e dar push").

---

## 4. P1 — Banco, filtros e estabilidade da aplicação

### 4.1 Tabela de simulados e RPC global — [x] Concluído & Validado

- [x] Inspecionar `data/schemas/09_simulados_and_stats.sql` no ambiente local.
- [x] Verificar no Supabase se a tabela `simulados` existe e se os campos usados pela API correspondem ao schema.
- [x] Verificar se `get_lemmas_global_stats()` existe, tem o retorno esperado e funciona com as permissões adequadas (integrada em `/api/questions` e `/api/stats`).
- [x] Revisar as políticas RLS da tabela de simulados e das tabelas de tentativas antes de testar persistência multiusuário (`04_production_rls_hardening.sql`).
- [x] Aplicar a migration pelo procedimento oficial do projeto após revisão versionada no repositório.
- [x] Fazer consultas de verificação pós-migration e registrar os resultados em testes de integração (`tests/test_live_api.py`).

> Nota de segurança: uma chave `service_role` da API Supabase não deve ser tratada automaticamente como senha do PostgreSQL. Conexões diretas precisam usar uma connection string/credencial de banco válida; nunca colocar segredos no repositório ou nos logs.

### 4.2 API de questões, limites e filtros

- [x] Confirmar se `/api/questions` chama a RPC para os facets globais (`get_lemmas_global_stats()` integrado).
- [x] Eliminar dependência de `.limit(1000)` para contagens que precisam representar o banco inteiro: fatias de facetas agora batem 100% com o total canônico do acervo (validadas em `tests/test_live_api.py`).
- [x] Diferenciar estatísticas globais das estatísticas de uma busca já filtrada.
- [x] Verificar paginação e a contagem total sem retornar todas as questões ao frontend.
- [x] Validar filtros de banca, matéria, tipo, dificuldade e ano, incluindo “todos os anos”.
- [x] Confirmar que o modo de fallback não mostra contagens de amostras como se fossem números reais do banco (vitrine consome `/api/stats` sem números fake).
- [x] Testar registros com nomes de banca com espaços, caixa diferente e duplicatas legítimas.

### 4.3 Persistência e histórico — [x] Concluído & Validado

- [x] Inventariar quais endpoints persistem no Supabase e quais ainda usam memória ou `sessionStorage`:
  - `public.tentativas`: submissões objetivas e discursivas de estudantes com hash SHA-256 e status.
  - `public.avaliacoes_ia`: avaliações pedagógicas completas geradas pela IA (vereditos, notas, rubricas, tokens).
  - `sessionStorage`: rascunhos da lousa SpenSmartCanvas isolados por questão e dados de sessão de simulado.
- [x] Mapear as rotas de questões, simulados, tentativas, feedback, flashcards e revisões.
- [x] Definir a fonte de verdade de cada entidade e eliminar persistências concorrentes/confusas.
- [x] Investigar o histórico de questões resolvidas e políticas RLS de `tentativas` e `avaliacoes_ia`.
- [x] Garantir que registros importantes sobrevivam ao refresh e reinício dos serviços (persistência completa auditada).
- [x] Evitar migração ampla de backend sem antes auditar o schema real.

### 4.4 Desacoplamento da MathAI Engine & Telemetria N:1 — [x] Concluído

- [x] **Padrão Strategy no MathAI Gateway:** Criada hierarquia `BaseLLMProvider`, `OpenAICompatibleProvider`, `GeminiProvider` e `DeterministicAutonomousProvider` em `backend/app/services/mathai/gateway.py`.
- [x] **Suporte a Modelos Abertos Locais (vLLM / Ollama):** Suporte nativo a SLMs matemáticos (ex: `Qwen2.5-Math-7B-Instruct`) via variáveis `LOCAL_LLM_URL`, `LOCAL_LLM_MODEL` e seleção de provedor com `PRIMARY_AI_PROVIDER`.
- [x] **Eliminação de Bypasses no Next.js (Fim do Split-Brain):** As rotas de frontend `frontend/app/api/ai/solve/route.ts` e `frontend/app/api/ai/compare/route.ts` não mais chamam APIs de LLM externas diretamente; toda inferência é delegada com autoridade única ao FastAPI com timeout de 45s (absorvendo cold starts) e contingência local estrita.
- [x] **Schema de Telemetria N:1:** Criado `data/schemas/11_ai_inference_telemetry.sql` (`ai_inference_logs`), rastreando cada tentativa de inferência com latência, status, tokens de entrada/saída, provedor e modelo, preservando a relação de 1 avaliação para N tentativas de provedor.
- [x] **Validação e Descarte de Saída Corrompida:** Respostas que falham na validação de JSON estruturado ou KaTeX são imediatamente descartadas e acionam o próximo provedor na cascata, impedindo que falhas de formatação alcancem o estudante.
- [x] **Testes Automatizados:** Suíte `tests/test_gateway_strategy.py` aprovada com 100% de sucesso nos 4 cenários (Local SLM, Fallback, Descarte de JSON Corrompido e Autônomo).

**Critério de saída P1:** API, filtros e simulados usam o schema real, as contagens são confiáveis, a persistência está documentada, a MathAI Engine opera desacoplada sob o Padrão Strategy e a telemetria N:1 está modelada.

---

## 5. P1 — Auditoria canônica de dados e documentação — [x] 100% Concluído

### 5.1 Fonte de verdade do schema

- [x] Consultar o schema real do Supabase, não depender somente de documentação Markdown.
- [x] Levantar tabelas, colunas, tipos, PK/FK, índices, constraints, RLS, triggers e funções/RPCs relevantes.
- [x] Comparar schema remoto, migrations versionadas, código Next.js e código FastAPI.
- [x] Criar um dicionário de dados que reflita o ambiente real (`docs/database/schema.md` e `docs/database/data-dictionary.md`).
- [x] Documentar entidades de questões, lemas, tentativas, simulados, agendamento de revisão, perfil do aluno e avaliações de IA.
- [x] Identificar campos redundantes ou com nomes incompatíveis entre serviços.

### 5.2 Qualidade e contagem do acervo

- [x] Medir contagem real de questões por fonte, banca, ano, matéria e status de validação (21.272 questões factuais).
- [x] Medir quantas questões têm enunciado, alternativas, gabarito e resolução utilizáveis.
- [x] Medir quantidade real de lemas no JSON e no banco: 2.000 lemas canônicos cadastrados em `public.lemmas` (`data/repertorio/canonical_lemmas_2000.json`).
- [x] Separar questões válidas, incompletas, duplicadas e em quarentena.
- [x] Definir regras de deduplicação e normalização para nomes de bancas/matérias.
- [x] Vitrine dinâmica implementada: `/api/stats` consulta o banco em tempo real com `head: true`, eliminando números fixos obsoletos.

### 5.3 Qualidade documental

- [x] Atualizar `AGENTS.md` com contagens canônicas e regras arquiteturais vigentes.
- [x] Corrigir referências locais, caminhos antigos e URLs de repositório que não correspondam à estrutura vigente.
- [x] Sinalizar `docs/architecture.md` como histórico e manter referências à arquitetura atual Next.js 16 + FastAPI.
- [x] Marcar `docs/MATHAI-WEB-MISSION.md` como plano histórico da migração, não como instrução operacional vigente.
- [x] Manter `README.md` e `README.pt-BR.md` sincronizados com badges dark/light, diagramas Mermaid e transparência epistemológica.

---

## 6. P2 — Pipeline de dados e Engenharia de Dados

O objetivo é demonstrar que o acervo pode ser ingerido, limpo, traduzido e classificado de forma reproduzível, sem corromper Matemática ou LaTeX.

### 6.1 Pipeline robusto

- [ ] Mapear os pipelines e scripts já existentes antes de criar novos.
- [ ] Separar entrada bruta, estágio intermediário e dataset curado.
- [ ] Implementar execução resumível, retry/backoff, logs, checksums, versionamento e idempotência onde estiver faltando.
- [ ] Registrar origem do documento, página, prova, ano, banca, etapa de processamento e versão de parser/modelo.
- [ ] Adicionar relatórios de registros aceitos, rejeitados, incompletos e duplicados.
- [ ] Criar amostras de QA para revisão humana e testes de regressão de parsers.

### 6.2 Tradução PT-BR e preservação de LaTeX

- [ ] Definir formato canônico do enunciado, alternativas, solução e fórmulas.
- [ ] Proteger blocos matemáticos e tokens LaTeX durante a tradução para PT-BR; não enviar ou reescrever fórmulas sem validação.
- [ ] Preservar o texto original e guardar a tradução em campos separados, com status e versão do processamento.
- [ ] Validar contagem e integridade de delimitadores (`$...$`, `\\(...\\)`, `\\[...\\]`), chaves, ambientes matemáticos e macros.
- [ ] Fazer dry-run em uma amostra representativa antes de processar milhares de questões.
- [ ] Comparar casos com frações, matrizes, sistemas, alinhamentos, figuras, raízes e texto dentro de fórmulas.
- [ ] Retomar lotes interrompidos sem reprocessar tudo e minimizar chamadas pagas de IA.

### 6.3 OCR e visão computacional

- [ ] Auditar o pipeline existente de PDFs/imagens e o uso real de PyMuPDF/MuPDF e OCR.
- [ ] Comparar extração nativa de texto com OCR multimodal apenas quando necessário.
- [ ] Medir falhas específicas de fórmulas, diagramação, imagens e texto em colunas.
- [ ] Avaliar VTracer/SVG apenas para casos em que vetorizar figuras melhore a fidelidade; não introduzir ferramenta só para enriquecer o stack.
- [ ] Manter uma trilha de auditoria que permita comparar o documento fonte com o resultado extraído.

### 6.4 Reclassificação de matérias — [x] Concluído & Validado

- [x] Auditar taxonomia e exemplos rotulados antes de classificar em lote.
- [x] Regras determinísticas e normalização canônica consolidadas (`data/schemas/10_reclassificacao_funcoes_e_limpeza_materias.sql`).
- [x] Reclassificação factual: matéria *Funções* desmembrada com 2.148 questões auditadas.
- [x] Eliminação definitiva de categorias residuais com menos de 10 questões (`Geral`, `Lógica`, `Matemática Geral`).
- [x] Validação das 12 Grandes Áreas Canônicas sem sobreposição.

**Critério de saída P2:** pipeline idempotente e rastreável, LaTeX preservado em testes, contagens auditáveis e rótulos com proveniência.


### 6.5 Linha de Montagem Híbrida 01 Turbo — PDF → visão → SVG → enriquecimento → Supabase

**Fonte:** relatório técnico compartilhado em 14/10/2026, atribuído ao Antigravity e ao time LEMMAS. O relatório declara execução da prova AFA 2012 em 119,6 segundos, com 20 questões e três figuras. Esses números são **resultados reportados, ainda não verificados independentemente por nós**. Uma execução bem-sucedida em uma prova não demonstra, por si só, integridade de 100%, estabilidade geral ou desempenho equivalente em outras bancas.

#### Pipeline reportado

1. PyMuPDF renderiza as páginas em paralelo, a 250 DPI.
2. Gemini Vision extrai questões em lotes de cinco páginas, com schema estruturado e coordenadas de figuras.
3. A deduplicação em memória tenta consolidar a prova e as páginas de resolução.
4. OpenCV aplica ampliação/filtro e VTracer produz SVG, preservando também PNG local.
5. NVIDIA NIM enriquece lotes com matéria, tópico, dificuldade e solução autoral.
6. O pipeline gera JSON local e tenta publicar imagens no Supabase Storage e realizar batch upsert na tabela `questoes`, usando `mathnet_id` como chave de conflito.

#### Benchmark declarado — precisa de reprodução

| Métrica | Resultado informado | Como validar |
|---|---:|---|
| Renderização de 21 páginas | 1,31 s | Repetir em hardware registrado; medir frio/quente e uso de memória |
| Extração Gemini | 22,7 s | Registrar modelo real, tamanho dos lotes, tentativas, rate limits e páginas efetivamente cobertas |
| Tempo total | 119,6 s | Repetir em mais provas, reportar mediana/p95 e estado final de todas as etapas |
| Questões após deduplicação | 20 | Comparar com gabarito/índice esperado e auditar números ausentes/repetidos |
| Figuras SVG | 3 | Inspecionar visualmente SVGs e PNGs lado a lado com o PDF original |
| Upsert | Um batch | Confirmar contagem persistida, campos atualizados, conflitos e erros; não basta o script terminar |

O ganho de 336,0 s para 119,6 s é uma comparação entre duas provas/execuções diferentes (AFA 2011 e AFA 2012) segundo o relatório. Antes de declarar “redução de 64,4%” como ganho comparável, rodar benchmark A/B com o mesmo PDF, hardware, versões, configurações e critérios de qualidade.

#### Auditoria estática do código fornecido — riscos a resolver antes de chamar o pipeline de produção confiável

- [ ] **Sucesso falso de sincronização:** o código captura falhas de upsert, tenta outro caminho e, mesmo que ambos falhem, continua imprimindo `[✓ PROCESSO CONCLUÍDO COM SUCESSO]`. O resultado precisa ter estados explícitos (extração, enriquecimento, artefatos, upload e banco) e retornar erro/código de saída diferente de zero quando uma etapa obrigatória falhar.
- [ ] **Fallback de tabela perigoso:** após falhar `table("questoes").upsert(..., on_conflict="mathnet_id")`, o código tenta gravar o mesmo payload em `table("questions")` sem `on_conflict` e sem demonstrar que os nomes de colunas são compatíveis. Remover fallback silencioso; configurar explicitamente schema/tabela e falhar de forma clara se o contrato não corresponder.
- [ ] **Deduplicação pode perder informação:** o algoritmo escolhe uma versão de questão e só combina parte dos campos no caminho alternativo. Auditar e mesclar campo a campo enunciado, alternativas, gabarito, resolução, figura e metadados; não descartar um gabarito ou alternativa confiável porque outra versão ganhou a pontuação.
- [ ] **Valores padrão podem mascarar falhas de IA:** quando o NIM falha ou não retorna um item, o código atribui `Álgebra`, `Geral` e `Média`. Isso transforma falha de enriquecimento em rótulo aparentemente válido. Guardar `enrichment_status`, manter campos desconhecidos como nulos/quarentena e não misturar rótulos de fallback com rótulos validados.
- [ ] **Cobertura incompleta de extração:** se um lote Gemini falha ou devolve zero questões, o código retorna uma lista vazia, mas não existe reconciliação obrigatória de páginas, números de questões esperados, gabaritos e questões ausentes. Gerar relatório de cobertura e bloquear publicação automática quando a cobertura ficar abaixo dos critérios definidos.
- [ ] **Recorte fixo de 6%:** cortar sempre 6% do topo e do rodapé pode eliminar texto ou figuras legítimas em alguns PDFs. Validar por tipo de prova e permitir configuração; comparar amostras dos extremos com o PDF original antes de habilitar em lote.
- [ ] **Validação de bounding boxes:** as descrições Pydantic não impõem limites numéricos. Adicionar validação de `0 <= coordenada <= 1000`, `xmin < xmax`, `ymin < ymax` e página dentro do lote; mandar caixas inválidas para revisão em vez de gerar recortes silenciosamente errados.
- [ ] **Margem e vetorização não garantem fidelidade perfeita:** filtros e Lanczos podem ajudar a leitura, mas também alterar traços finos, símbolos e rótulos. Manter o original recortado como evidência e comparar automaticamente dimensões/artefatos mais revisão visual de uma amostra.
- [ ] **Rate limit e failover do NIM:** o `sleep(0.3)` entre submissões não constitui rate limiter. Implementar backoff exponencial com jitter, respeito a `Retry-After`, limites de concorrência, métricas e tratamento específico de 429/5xx/timeouts. Usar múltiplas chaves somente quando autorizadas e em conformidade com os termos e quotas do provedor; não tratar rotação de chaves como forma garantida de contornar rate limits.
- [ ] **Resolução de modelo pode retornar um fallback não verificado:** se todos os probes falharem, a função retorna o nome Nemotron padrão mesmo sem confirmar que está acessível. A etapa deve abortar ou marcar o modelo como não validado, não sugerir que o preflight passou.
- [ ] **Armazenamento pode ficar parcialmente sincronizado:** as figuras são enviadas antes do upsert de questões. Se o banco falhar, podem sobrar arquivos órfãos. Criar manifesto de execução, caminhos idempotentes, estado de upload/DB e rotina segura para retomar ou limpar artefatos não referenciados.
- [ ] **Idempotência e chunking:** confirmar que conflitos em `mathnet_id` atualizam apenas os campos desejados, que o upsert é idempotente e que lotes grandes sejam divididos com limite explícito, sem perder rastreabilidade.
- [ ] **Carregamento de configuração:** revisar a ordem dos imports e `load_dotenv`; confirmar que `get_supabase()` lê a configuração no momento certo e que nenhuma credencial é impressa no console.
- [ ] **Definição de qualidade:** “SVG gerado” não significa “figura matematicamente fiel”. Criar QA específico para eixos, rótulos, pontos abertos/fechados, setas, legendas, sinais, proporções e texto integrado à imagem.

#### Critérios de aprovação do pipeline Turbo

- [ ] Executar o mesmo PDF em modo `--no-db` e verificar JSON, contagens, LaTeX, gabaritos e imagens antes de escrever no banco.
- [ ] Criar teste dourado com PDFs de diferentes bancas, layouts e resoluções, contendo páginas com e sem figuras.
- [ ] Comparar todas as questões extraídas com um inventário de referência; documentar questões omitidas, duplicatas e campos ausentes.
- [ ] Revisar manualmente todas as figuras na amostra inicial e registrar correções de bounding boxes.
- [ ] Fazer upsert apenas após validação local; depois consultar o banco e confirmar contagens/chaves persistidas.
- [ ] Simular falhas de Gemini, NIM, Storage e banco para confirmar que o pipeline indica falha parcial e consegue retomar sem duplicar nem fingir sucesso.
- [ ] Guardar logs estruturados sem segredos, tempo por etapa, modelo/versão, número de tentativas, custos/quota quando disponíveis e versão do pipeline.
- [ ] Produzir benchmark repetível com o mesmo PDF e hardware, incluindo mediana, p95, taxa de sucesso, cobertura e qualidade — não só tempo total.
- [ ] Separar status de ingestão de status de publicação: `extracted`, `validated`, `enriched`, `assets_uploaded`, `db_synced`.

**Status neste roadmap:** [~] pipeline e benchmark reportados pelo usuário/agente; o código foi revisado estaticamente a partir do trecho fornecido, mas a execução, os resultados, o estado remoto e a fidelidade das figuras ainda não foram verificados independentemente. Não declarar como totalmente validado em produção até fechar os critérios acima.

---

## 7. P2 — Grafo de Conhecimento: questões ↔ lemas

Este é o elo central entre o banco de questões e o repertório matemático. Só deve avançar após P0 e a auditoria do schema.

### 7.1 Modelo de dados — [x] Concluído & Aplicado

Catálogo estruturado e persistido no Supabase via migrations versionadas:

- [x] Confirmar nomes canônicos: tabelas `public.questoes` e `public.lemmas` (`id text primary key`).
- [x] Chaves e atributos consolidados: `id`, `nome`, `definicao`, `latex`, `gatilho`, `categoria`, `tags`.
- [x] Criação da tabela `public.lemmas` versionada (`data/schemas/11_tabela_catalogo_lemas.sql` e `12_tabela_catalogo_lemas.sql`).
- [x] Índices eficientes criados para busca por lema, categoria e tags no PostgreSQL.
- [x] Vínculo canônico de questões a lemas estabelecido em `public.questoes.lemma_id` e repertório JSON (`data/repertorio/canonical_lemmas_2000.json`).

### 7.2 Classificação híbrida

Não assumir que similaridade vetorial comprova que o lema foi aplicado. O objetivo dos embeddings é recuperar candidatos relevantes; a associação final precisa de evidência.

Pipeline recomendado:

1. Criar uma descrição semântica padronizada de cada lema: condições, padrão detectado, ação, fórmula, exemplos e casos de não aplicação.
2. Construir texto de recuperação a partir de enunciado, solução e metadados, preservando o LaTeX.
3. Recuperar candidatos por embedding e complementar com palavras-chave/fórmulas/regras.
4. Avaliar condições de aplicabilidade e evidências na resolução.
5. Aceitar automaticamente apenas categorias de alta confiança após medir desempenho; manter casos incertos em revisão.
6. Gravar origem, versão e trecho de evidência.

- [x] Descrição semântica padronizada para 2.000 lemas com fórmulas KaTeX e gatilhos heurísticos.
- [ ] Comparar opções de embeddings, incluindo modelos abertos (por exemplo, `BAAI/bge-m3`) e provedores gerenciados, conforme custo e infraestrutura disponíveis.
- [ ] Verificar `pgvector` e a arquitetura de armazenamento de embeddings no PostgreSQL.
- [ ] Não treinar embeddings do zero sem evidência de que seja necessário.
- [ ] Fazer dry-run e gerar arquivo de candidatos antes de gravar relações no banco.
- [ ] Fazer o pipeline ser idempotente e registrar contagens de inserções, atualizações, rejeições e erros.

### 7.3 Avaliação antes da execução em massa

- [ ] Criar conjunto de referência rotulado e revisado, diversificado por banca, matéria, dificuldade e tipo de resolução.
- [ ] Definir como lidar com vários lemas válidos para uma mesma questão.
- [ ] Medir precisão, recall, precisão@K e desempenho por lema, não só uma média global.
- [ ] Comparar com baseline simples de regras/keywords.
- [ ] Examinar falsos positivos e falsos negativos em especial para lemas matematicamente próximos.
- [ ] Só escalar para o acervo inteiro quando o limiar de qualidade estiver definido e atingido.

### 7.4 Integração no produto — [x] Concluído & Em Produção

- [x] Adicionar filtro de questões por lema (integrado com Popover e badge interativo).
- [x] Mostrar “Lema-chave da questão” via componente `LemaBadge` com Popover contextual e renderização KaTeX.
- [x] Gatilhos heurísticos e enunciados de prova visíveis sob demanda no card da questão.
- [x] Permitir reportar erros ou solicitar ajustes via modal de feedback.
- [x] Telemetria de uso dos lemas no tutor socrático.

**Critério de saída:** o usuário consegue encontrar questões por lema e as associações têm métricas de qualidade, rastreabilidade e forma de correção.

---

## 8. P3 — Caçador de Gatilhos / Treino de reconhecimento

Objetivo pedagógico: treinar o aluno para reconhecer *qual estratégia iniciar*, e não apenas para calcular depois que a estratégia foi revelada.

### 8.1 MVP

- [ ] Criar modo “Caçador de Gatilhos” separado do fluxo padrão de múltipla escolha.
- [ ] Exibir o enunciado antes das alternativas ou da solução.
- [ ] Perguntar qual lema/estratégia destrava a questão.
- [ ] Oferecer opções plausíveis e matematicamente defensáveis; evitar distratores absurdos.
- [ ] Não assumir um único método possível: aceitar alternativas equivalentes quando o conteúdo validado indicar isso.
- [ ] Após a escolha, explicar a evidência do gatilho, o motivo da aplicação e quando o lema não seria apropriado.

### 8.2 Instrumentação pedagógica

Registrar separadamente, conforme consentimento e minimização de dados:

- questão e opções apresentadas;
- lemas escolhidos e lema(s) esperado(s) validado(s);
- correção do reconhecimento;
- resposta/solução da questão, quando realizada;
- tempo de resposta e confiança declarada, se coletados de forma transparente;
- dica utilizada e feedback do aluno;
- versão do mapeamento questão–lema.

Não confundir erro de reconhecimento de estratégia, erro conceitual, erro de cálculo e ausência de gabarito.

### 8.3 Revisão em questão inédita

- [ ] Agendar a habilidade/lema que o aluno não reconheceu, além de qualquer revisão de questão necessária.
- [ ] Recuperar uma questão inédita associada ao mesmo lema, validando que ela é apropriada para o nível/contexto.
- [ ] Evitar revisar exclusivamente a mesma questão, para não medir apenas memorização do enunciado.
- [ ] Manter fallback para casos em que não existe outra questão adequada ligada ao lema.

**Critério de saída:** erros de reconhecimento e erros de execução são distinguíveis, e o sistema consegue propor uma questão diferente para praticar o mesmo lema quando há conteúdo disponível.

---

## 9. P3 — Repetição espaçada e modelo do aluno

### 9.1 Antes de trocar de algoritmo

Há referências a SM-2, FSRS-v4 e um agendador simplificado inspirado no FSRS em documentos diferentes. O `AGENTS.md` também menciona SM-2 em parte da arquitetura.

- [ ] Identificar qual implementação está realmente em uso no frontend e no backend, se existem duas implementações e qual delas é a fonte de verdade.
- [ ] Testar a persistência do estado de revisão e o efeito de respostas repetidas.
- [ ] Definir a unidade de revisão: inicialmente pode ser questão; para o Caçador de Gatilhos, também deve existir revisão por lema/habilidade.
- [ ] Estabelecer testes de regressão e baseline antes de substituir SM-2.
- [ ] Avaliar integração com uma implementação madura de FSRS em vez de reimplementar uma fórmula isolada e chamá-la de FSRS.

### 9.2 Elo / IRT / previsão

- [ ] Começar por métricas simples e transparentes de domínio por lema.
- [ ] Construir baseline estatístico antes de modelos mais complexos.
- [ ] Avaliar Elo ou IRT quando houver tentativas suficientes e confiáveis.
- [ ] Não atribuir ratings arbitrários como “Fácil = 1000, Difícil = 1800” e apresentar isso como dificuldade empírica calibrada.
- [ ] Para IRT, estimar parâmetros com dados suficientes e avaliar identificabilidade e calibração.
- [ ] Separar por tempo/usuário no conjunto de avaliação para evitar vazamento entre treino e teste.
- [ ] Reportar métricas apropriadas (por exemplo, log loss, Brier score, AUC e calibração, conforme a tarefa).
- [ ] Não chamar probabilidade de acerto em uma questão de “probabilidade real de aprovação”. Aprovação depende também da prova, da concorrência e dos critérios aplicados.

### 9.3 Ciência de Dados e recomendações

- [ ] Estabelecer baseline baseado em regras e dificuldade/tópico.
- [ ] Comparar com recuperação semântica de questões e ranking.
- [ ] Definir métricas antes do experimento: Precision/Recall/F1 para classificação; Recall@K/NDCG@K para ranking, quando adequados.
- [ ] Registrar versão de dados, código, parâmetros e resultados para reproduzir experimentos.
- [ ] Monitorar qualidade, latência e custo por tipo de tarefa.
- [ ] Só partir para Gradient Boosting, Learning to Rank, Knowledge Tracing ou fine-tuning de SLM quando houver dataset consentido, suficientemente grande e auditado.

---

## 10. P2/P3 — Melhorias de produto e experiência — [x] Concluído & Em Produção

### Área do aluno & Autenticação
- [x] Ajustar o texto do objetivo pedagógico sem promessas não medidas.
- [x] Histórico de questões resolvidas e persistência em `public.tentativas` e `public.avaliacoes_ia`.
- [x] Autenticação Google OAuth automática com verificação de e-mail e auto-upsert de perfil.
- [ ] Upload de avatar customizado com bucket do Supabase Storage.

### Banco de questões e lemas
- [x] Organizar a exibição das bancas principais: 5 Popovers instantâneos e 5 Trilhas Rápidas de 1 clique (Militares, Geometria, Olimpíadas, Cálculo, Vestibulares).
- [x] Corrigir filtros de ano e facets usando contagens reais do banco (`ACERVO_ANOS_COUNTS`, eliminando zeros `(0)`).
- [x] Habilitar busca/filtro por lema com catálogo canônico de 2.000 lemas e badges KaTeX interativos.
- [x] Evitar duplicatas visuais de bancas, matérias e rótulos via normalização rigorosa.

### Exportação de simulado para PDF
- [ ] Criar opção de gerar caderno de prova A4 diagramado em duas colunas estilo concurso com gabarito ao final.
- [ ] Testar fórmulas KaTeX/LaTeX, figuras, margens, fontes e impressão A4.

### Divulgação, SEO e Usabilidade Pública
- [x] Landing page (`/landing`) oficial com design editorial lousa/quadro e contagem viva do banco via `/api/stats`.
- [x] Redirecionamento automático de visitantes deslogados da raiz `/` para `/landing`.
- [x] Redirecionamento canônico de domínios Vercel (`lemmas-ochre.vercel.app`) para `lemmas.com.br`.
- [x] Responsividade mobile aprimorada: menu retrátil na landing e trilhas acessíveis em telas menores.
- [x] SEO e indexação: `sitemap.ts`, `robots.ts` e meta tags normalizadas.
- [x] README com logo SVG adaptativa (dark/light) e caixas institucionais de mandato alinhadas.

---

## 11. P1/P2 — Organização do GitHub e fonte única da verdade — [x] Concluído

### Arquitetura documental consolidada
- **`docs/roadmap.md`** — Documento canônico consolidado com prioridades, status, dependências e critérios de conclusão.
- **`docs/roadmap_produto_lemmas.html`** — Visualização interativa e executiva do Roadmap de Produto & Engenharia (Fases 1 a 5).
- **`README.md` / `README.pt-BR.md`** — Apresentação institucional, arquitetura real, como executar, diagramas Mermaid e transparência técnica.
- **`AGENTS.md`** — Instruções operacionais atualizadas e verificadas (Next.js 16 + FastAPI + Supabase, contagens canônicas).
- **`docs/database/schema.md` / `data-dictionary.md`** — Dicionário de dados e schemas refletindo o ambiente real.

### Governança e consistência do repositório
- [x] Diagrama Mermaid da arquitetura atual no README mestre.
- [x] `.gitignore` atualizado protegendo segredos, caches e artefatos voláteis.
- [x] Sincronização entre `AGENTS.md`, `README.md` e schemas.
- [x] Distinção rigorosa entre o que está implementado, o que foi adicionado e planos futuros.

---

## 12. Segurança, privacidade e governança — [x] Concluído & Aplicado

- [x] Políticas de Row-Level Security (RLS) aplicadas e endurecidas em todas as tabelas (`04_production_rls_hardening.sql`).
- [x] Não gravar chaves, tokens, service-role secrets ou dados pessoais em logs/README/fixtures.
- [x] Princípio Epistemológico fundamental respeitado em todas as rotas e pipelines: `DADO OBSERVADO ≠ INTERPRETAÇÃO DA IA ≠ DADO VALIDADO`.
- [x] Consentimento e proveniência modelados (`02_provenance_and_consent.sql` e `05_legal_consent_and_billing.sql`).
- [x] Preservação de dados brutos imutáveis (hash SHA-256) garantindo que inferências de IA nunca sobrescrevam a resposta real do estudante.

---

## 13. Portfólio de Engenharia de Dados, Ciência de Dados e IA

O LemmaS deve provar competências por resultados mensuráveis — não só pela lista de tecnologias.

### Evidências que o projeto deve produzir

**Engenharia de Software**
- Testes de regressão, contratos claros, build reproduzível e tratamento de erros consistente.

**Engenharia de Dados**
- Pipeline reexecutável/idempotente, migrations versionadas, dicionário de dados, checks de qualidade, proveniência, métricas de processamento e tratamento de falhas.

**Ciência de Dados**
- Dataset de referência revisado, baseline, validação sem vazamento, análise de erros e comparação com métricas adequadas.

**Engenharia de IA**
- Avaliação por tarefa/provedor, registros de latência/custo, validação de saída estruturada e distinção entre predição e verdade validada.

### Itens de portfólio futuros

- [ ] README técnico com arquitetura Mermaid e screenshots reais.
- [ ] Relatório de qualidade da base e pipeline, incluindo benchmark reproduzível da Linha de Montagem Turbo.
- [ ] Avaliação de associação questão–lema em conjunto de referência.
- [ ] Benchmark de provedores para tutoria/OCR, se houver dados e teste controlados.
- [ ] Experimento de recomendação/domínio com baseline e relatório reprodutível.
- [ ] Publicação clara de limitações e dados sintéticos usados nos testes.

---

## 14. Backlog consolidado por prioridade — histórico de entregas e expansões

### P0 — Simulado, Gabaritos e Estabilidade Principal — [x] 100% Concluído
- [x] Corrigir a causa de `q.gabarito` indefinido e não classificar respostas sem gabarito como erradas.
- [x] Corrigir a duplicação de banca `AFA` na origem dos dados/lista com unificação normalizada.
- [x] Testar seleção/alteração/envio/revisão de respostas por ID real da questão (`answers[q.id]`).
- [x] Executar casos de regressão para certas, erradas, em branco, gabarito ausente e fallback local com SM-2.
- [x] Passar build (`npm run build` com Turbopack / Next 16) e testes unitários e de integração com 0 erros (`npx tsc --noEmit`).
- [x] Validar Bancada de Geometria Euclidiana destravada com fallback de segurança por timeout (3.5s).

### P1 — Banco, Taxonomia e Desacoplamento da MathAI Engine — [x] 100% Concluído
- [x] Auditar schema e contagem canônica: 21.272 questões em `public.questoes` e 2.000 lemas no catálogo canônico.
- [x] Validar RPC `get_lemmas_global_stats()` e facets globais sem limite artificial de 1000 questões.
- [x] Taxonomia Canônica: reclassificação da matéria *Funções* (2.148 questões) e eliminação de resíduos (`Geral`, `Lógica` e categorias <10).
- [x] Desacoplar MathAI Gateway com Padrão Strategy (`BaseLLMProvider`, `OpenAICompatibleProvider`, `GeminiProvider`, `DeterministicAutonomousProvider`).
- [x] Eliminar bypasses de IA no Next.js: toda inferência analítica delegada com autoridade única ao FastAPI.
- [x] Modelar schema de telemetria N:1 de inferência com rastreabilidade de tokens (`data/schemas/11_ai_inference_telemetry.sql`).
- [x] Suporte nativo a SLMs locais (vLLM / Ollama: `Qwen2.5-Math-7B-Instruct`).
- [x] Descarte automático e failover imediato para saídas de IA com JSON corrompido ou KaTeX inválido.

### P2 — Reengenharia de Figuras & Redesign de Questões — [x] 100% Concluído
- [x] Separação epistemológica estrita: PDFs de resolução comentada não são provas originais (AFA 2012 Q10 mantida como `SOURCE_MISSING`).
- [x] Recuperação isolada e auditoria visual da AFA 2011 Q17 (recorte limpo, deduplicação semântica).
- [x] Blindagem e preservação dos 4 SVGs canônicos da ESA 2026.
- [x] Suíte de testes do pipeline de figuras aprovada com 39 testes de cobertura e proveniência sem regressão.
- [x] Redesign Minimalista LeetCode/Linear da barra de comando (`questoes/page.tsx` $\le 140\text{px}$).
- [x] 5 Trilhas Rápidas de 1 clique (Oficiais Militares, Geometria, Olimpíadas, Cálculo, Vestibulares).
- [x] 5 Popovers com busca interna instantânea e bancas de elite no topo fixadas.
- [x] Contagens reais de anos no banco (eliminação definitiva de botões residuais com zeros `(0)`).
- [x] Resolução de falsos positivos de alternativas em discursivas: regex estrita em `math-parser.ts` para não confundir expressões funcionais (`\max(A)`, `P(A)`) com múltipla escolha.

### P3 — Bancada Discursiva & Tutoria Socrática por Perfil — [x] 100% Concluído
- [x] Fechamento dos 4 vereditos de ponta a ponta: `aprovado`, `parcial`, `sem_desenvolvimento`, `incorreto`.
- [x] Heurística robusta de desenvolvimento sem penalizar demonstrações curtas válidas e sem confundir falha de OCR com erro matemático.
- [x] Fallback resiliente no frontend: quando backend indisponível, retorna `inconclusivo` com `precisa_revisao_humana: true` (sem inventar veredito falso ou nota).
- [x] Persistência única e controle de tentativas: submissões `sem_desenvolvimento` preservam o rascunho sem incrementar contadores indevidamente.
- [x] Integração das 3 ferramentas da Bancada: Lousa de Giz Digital, Compasso Euclidiano e Dedução OCR.
- [x] Personalização Pedagógica Socrática por Perfil: adaptação dinâmica de tom, intuição e rigor axiomático para Licenciatura/Docente, Militares (ITA/IME/AFA), Ciência de Dados & ML, e Concursos.
- [x] Suítes de testes automatizados com 100% de aprovação (`test_acceptance_mission_integrated.py`, `test_discursive_bench_suite.py`, `test_fase2_personalizacao.py`).

### P3.1 — Personalização Pedagógica Inteligente V2 (Motor Determinístico & Explicável) — [x] 100% Concluído & Validado
- [x] **P1 (Soberania da Preferência Manual):** A preferência explícita do estudante (`pedagogicalPreference`) nunca mais é sobrescrita silenciosamente por objetivos ou bancas em `resolver/page.tsx`. Objetivos sugerem preferências apenas quando o campo estiver nulo ou indefinido.
- [x] **P2 (Motor de Recomendação V1 Determinístico & Explicável):** Implementado `frontend/lib/pedagogical-engine.ts` sob função de pontuação ponderada $S(t) = w_1 G(t) + w_2 P(t) + w_3 A(t) + w_4 D(t)$, classificando conteúdos em `prioritaria`, `complementar` e `futura` com geração de justificativas em linguagem natural ("Por que recomendamos:").
- [x] **P2.1 (Grafo de Pré-Requisitos Matemáticos - DAG):** Grafo direcionado acíclico mapeando a cadeia de dependências epistemológicas (Matemática Básica ➔ Álgebra ➔ Funções ➔ Trigonometria & Geometria Analítica ➔ Cálculo ➔ Álgebra Linear ➔ Otimização & Análise Real) sem ciclos.
- [x] **P3 (Nova Modelagem do Perfil & Desacoplamento Selecionado vs. Recomendado):**
  - Distinção rigorosa entre `objetivoPrincipal` (exclusivo) e `objetivosSecundarios` (opcionais).
  - Separação entre sugestões do motor (`conteudosRecomendados`) e a escolha ativa do estudante (`conteudosSelecionados`), eliminando auto-seleção forçada.
  - Sinalização honesta de trilhas conceituais e bancas em planejamento (0 questões no banco) sem promessas falsas.
  - Calibração de disponibilidade diária em minutos e meta ajustável (`questoes` vs. `sessoes`), corrigindo rótulos como "lemas/dia" e estimativas estáticas irreais.
- [x] **Compatibilidade Retroativa:** Estrutura persistida em JSON dentro de `usuarios.motivos` sem quebra de migrações ou perda de perfis antigos.
- [x] **Interface do Perfil Reestruturada em 5 Etapas:** (1) Seus Objetivos; (2) Como Deseja Aprender; (3) Sua Trilha Sugerida; (4) Ajustes Avançados & Catálogo; (5) Sua Rotina.
- [x] **Suíte de Testes Automatizados:** 18 testes automatizados aprovados (`tests/test_fase2_personalizacao.py` e `tests/test_fase2_recomendacao_pedagogica_v2.py`).
- [x] **P3.2 (Feed de Questões Alinhado ao Perfil Pedagógico em Toda a Plataforma):**
  - **Banco de Questões (`/questoes`):** Preferências do perfil ordenam o acervo completo, priorizando bancas e matérias alinhadas ao plano sem selecionar filtros automaticamente. Filtros manuais e parâmetros explícitos de URL restringem a lista. Paginação entre grupos sem duplicatas, contagem integral e opção de usar a ordem padrão.
  - **Área de Resolução (`/resolver`):** Carregamento de questões em Standby e geração de "Simulado Rápido" (15 questões) calibrados dinamicamente para o foco do perfil, com identificação visual do foco ativo.
  - **Dashboard (`/`):** Seção interativa "Questões Recomendadas para o seu Perfil" com 3 cartões prioritários contextualizados com fórmulas matemáticas renderizadas via KaTeX (`MathText`), metadados de banca/dificuldade e atalho de resolução imediata.

### P3+ — Entregas & Inovações Adicionadas Além do Escopo Original — [x] 100% Concluído & Em Produção
*(Funcionalidades de alto valor pedagógico e técnico implementadas sem previsão no roadmap inicial)*

1. **🖊️ Lousa Digital SpenSmartCanvas Dual-Canvas:**
   - [x] Arquitetura Dual-Canvas (`baseCanvas` estático + `inkCanvas` desynchronized em tempo real O(1)).
   - [x] Suporte dedicado a stylus S-Pen e Apple Pencil com interpolação Bézier cúbica/quadrática.
   - [x] Rejeição estrita de palma (palm rejection) e suporte a botão de borracha lateral.
   - [x] Trava de DPR `Math.min(DPR, 2)` protegendo a VRAM de Galaxy Tab e iPad.
   - [x] Isolamento de traços por questão em `sessionStorage` e exportação com OCR para a bancada discursiva.
2. **🪜 Escada Socrática de Polya em 5 Níveis (Socratic Scaffolding):**
   - [x] Rótulos da interface atual: N1 (Intuição) ➔ N2 (Lema) ➔ N3 (Primeiro Passo) ➔ N4 (Destravamento) ➔ N5 (Resolução).
   - [x] Registro formal de rendição pedagógica quando o estudante solicita o Nível 5.
   - [x] Penalidade formal calculada e aplicada ao algoritmo de repetição espaçada SM-2.
   - [x] Schema de cache de dicas socráticas em `data/schemas/13_socratic_hint_cache.sql`; latência efetiva requer medição.
3. **⚖️ Segunda Opinião Ortogonal com Debate Multi-Modelo:**
   - [x] Rota `/opinioes` com debate entre dois modelos distintos (ex: Gemini Flash Lite com intuição analítica vs. NVIDIA Nemotron com prova dedutiva).
   - [x] Regra estrita de não-canibalização: cada modelo cumpre seu papel sem repetições.
   - [x] Normalização de retornos em objetos `{name, role, content}` e proteção por orçamento global de timeout.
4. **🏛️ Catálogo Tático Canônico de 2.000 Lemas:**
   - [x] Expansão do catálogo de 138 para 2.000 lemas axiomáticos e táticos em `data/repertorio/canonical_lemmas_2000.json`.
   - [x] Tabela `public.lemmas` no Supabase (`data/schemas/11_tabela_catalogo_lemas.sql` e `12_tabela_catalogo_lemas.sql`).
   - [x] Mapeamento no acervo de questões (`questoes.lemma_id`).
   - [x] Componente `LemaBadge` interativo com Popover, renderização KaTeX e filtro dinâmico de questões.
5. **🌐 Expansão Multidisciplinar do Acervo (Olimpíadas & Ensino Superior):**
   - [x] **AoPS (Art of Problem Solving):** Ingestão de 315 questões olímpicas de alta dificuldade (100 de limites/cálculo + 215 de desigualdades).
   - [x] **CEDERJ (Graduação/Licenciatura):** Ingestão e categorização de questões de Cálculo 3 e Álgebra Linear I.
   - [x] **Escola Naval 2026:** Ingestão curada em lote de 12 questões recentes com KaTeX e gabaritos auditados.
6. **📐 Blindagem & Sanitização KaTeX Anti-Crash:**
   - [x] Sanitização avançada de blocos display `$$...$$` preservando comandos como `\neq`, `\nu`, `\not`.
   - [x] Eliminação de quebras e espaçamentos verticais anormais ao redor de fórmulas.
   - [x] Suporte e mapeamento de comandos trigonométricos brasileiros (`\tg`, `\sen`).
7. **📊 Persistência Completa de Avaliações & Telemetria de Tokens:**
   - [x] Tabela `public.avaliacoes_ia` gravando vereditos, justificativas, rubricas e timestamps.
   - [x] Rastreamento de tokens de entrada (prompt) e saída (completion) em `public.ai_inference_logs`.
8. **🚀 Vitrine Viva & Domínio Oficial:**
   - [x] Domínio oficial `lemmas.com.br` ativo em produção.
   - [x] Middleware com redirecionamento de domínios legados da Vercel (`lemmas-ochre.vercel.app`).
   - [x] Vitrine `/landing` consumindo dados reais do Supabase via `/api/stats` sem números estáticos.
   - [x] Autenticação Google OAuth automática com auto-verificação e sincronização de perfil.
9. **🛡️ Curadoria Contínua & Listener Local Hermes:**
   - [x] Script listener local com integração de notificações nativas no desktop para tarefas do agente Hermes.

---

## 15. Alinhamento com o Roadmap de Produto (Fases 1 a 5)

Conforme consolidado em `docs/roadmap_produto_lemmas.html`:

| Fase | Título | Status | Principais Entregas |
|---|---|---|---|
| **Fase 01** | Fundação Canônica & Lousa Digital | **[x] Concluído & Estável** | 2.000 Lemas em `public.lemmas`, acervo com contagem dinâmica, SpenSmartCanvas Dual-Canvas, KaTeX Anti-Crash. |
| **Fase 02** | Motor Socrático & Cascata de IA Resiliente | **[x] Operando / Produção** | Escada Socrática 5 Níveis com Polya, Segunda Opinião Ortogonal (Gemini + NVIDIA), MathAI Gateway desacoplado. |
| **Fase 03** | Retenção, Simulados & Métricas do Aluno | **[~] Próximo Foco Imediato** | Radar de Habilidades (6 eixos), Modo Simulado Militar Realista cronometrado, Caderno de Erros SM-2. |
| **Fase 04** | Gamificação, Comunidade & Mobile First | **[~] Comentários locais prontos; restante planejado** | Comentários por questão + moderação implementados localmente (pendente migration remota); Patentes & Ranks Militares, Streaks diários e PWA seguem planejados. |
| **Fase 05** | Monetização, Assinaturas & Go-To-Market | **[ ] Escala Comercial** | Checkout transparente PIX/Cartão (Asaas/Stripe), Planos Free vs Pro, B2B para Cursos Preparatórios. |

---

## 16. Próximas Fronteiras Estratégicas (Fase 3 & V2) — [ ] Próximo Horizonte

- [ ] **Modo Simulado Cronometrado:** Montagem de cadernos militares oficiais (ex: 20 questões AFA em 4 horas), cronômetro contínuo e cartão-resposta com simulação de nota de corte.
- [ ] **Radar de Habilidades & Diagnóstico:** Gráfico Radar dos 6 Eixos Temáticos com identificação de pontos cegos e histórico de evolução temporal.
- [ ] **Caderno de Erros Inteligente (SM-2):** Fila dinâmica de revisão para questões erradas e treino focado por lemas fracos.
- [ ] **Teoria de Resposta ao Item (TRI):** Calibração empírica dos parâmetros psicométricos $a$ (discriminação), $b$ (dificuldade) e $c$ (acerto casual) das questões.
- [ ] **Exportação de Provas em PDF:** Geração de cadernos de prova A4 diagramados em duas colunas estilo concurso com gabarito ao final.
- [ ] **Fine-Tuning de SLM Local:** Ajuste fino de modelo especializado em demonstrações axiomáticas (`Qwen2.5-Math-7B`) rodando localmente com latência submétrica e custo zero de inferência.

---

## 17. Definição de pronto por fase

| Fase | Só considerar concluída quando… |
|---|---|
| P0 — Simulados | Testes locais passam e respostas/resultados/revisão são consistentes; problemas observados corrigidos. |
| P1 — Dados e filtros | Schema e RPC conferidos; contagens reais; filtros e persistência validados; RLS testada. |
| P2 — Pipeline | Dados reproduzíveis, LaTeX preservado, classificação rastreável e checks de qualidade publicados. |
| P2 — Grafo de lemas | Associações avaliadas com amostra revisada, falsos positivos analisados e relações auditáveis. |
| P3 — Caçador de Gatilhos | Reconhecimento de estratégia é medido separadamente da execução e há caminho de revisão. |
| P3 — ML | Baseline, dataset consentido, avaliação apropriada, ausência de vazamento e limitações documentadas. |
| GitHub/Portfólio | README e roadmap refletem a versão real do produto; não reivindicam funcionalidades ou resultados ainda não verificados. |

---

## 18. Distribuição recomendada de agentes

Para evitar que vários agentes alterem os mesmos arquivos sem coordenação:

- **Hermes — P0 Simulado:** investigar `resolver/page.tsx` e `questoes/page.tsx`, corrigir os dois erros, adicionar testes e reportar evidências. Não mexer em grafo de lemas, ML, schema amplo ou deploy.
- **Agente de Banco/Dados — somente auditoria inicialmente:** produzir um relatório read-only de tabelas, colunas, contagens, RLS, funções e migrations; não executar DDL nem gravar dados até revisão.
- **Agente de Pipeline — depois da auditoria:** mapear scripts existentes e propor melhorias de ingestão/tradução/LaTeX, com dry-run e amostra de QA antes de alterar acervo.
- **Agente de IA/ML — planejamento, sem código de produção agora:** desenhar avaliação para classificação questão–lema e baseline; não popular toda a tabela nem treinar modelo sem conjunto de referência.
- **Agente de documentação:** atualizar o documento canônico somente depois da revisão e manter os outros documentos como resumos, apêndices ou históricos.

Cada missão de agente precisa indicar arquivos permitidos, o que não pode alterar, comandos/testes exigidos e formato do relatório final. Não permita que dois agentes modifiquem simultaneamente o mesmo arquivo de fluxo crítico sem coordenação.

---

## 19. Fontes consolidadas

Documentos do repositório consultados no GitHub `StylishGH/LemmaS` (branch `main` remoto):

- [`README.md`](https://github.com/StylishGH/LemmaS/blob/main/README.md)
- [`README.pt-BR.md`](https://github.com/StylishGH/LemmaS/blob/main/README.pt-BR.md)
- [`AGENTS.md`](https://github.com/StylishGH/LemmaS/blob/main/AGENTS.md)
- [`docs/roadmap.md`](https://github.com/StylishGH/LemmaS/blob/main/docs/roadmap.md)
- [`docs/TODO.md`](https://github.com/StylishGH/LemmaS/blob/main/docs/TODO.md)
- [`docs/ai/ROADMAP_MATHAI_ML.md`](https://github.com/StylishGH/LemmaS/blob/main/docs/ai/ROADMAP_MATHAI_ML.md)
- [`docs/architecture.md`](https://github.com/StylishGH/LemmaS/blob/main/docs/architecture.md)
- [`docs/architecture/system.md`](https://github.com/StylishGH/LemmaS/blob/main/docs/architecture/system.md)
- [`docs/architecture/data-flow.md`](https://github.com/StylishGH/LemmaS/blob/main/docs/architecture/data-flow.md)
- [`docs/architecture/ai-pipeline.md`](https://github.com/StylishGH/LemmaS/blob/main/docs/architecture/ai-pipeline.md)
- [`docs/architecture/privacy.md`](https://github.com/StylishGH/LemmaS/blob/main/docs/architecture/privacy.md)
- [`docs/database/schema.md`](https://github.com/StylishGH/LemmaS/blob/main/docs/database/schema.md)
- [`docs/database/data-dictionary.md`](https://github.com/StylishGH/LemmaS/blob/main/docs/database/data-dictionary.md)
- [`docs/MATHAI-WEB-MISSION.md`](https://github.com/StylishGH/LemmaS/blob/main/docs/MATHAI-WEB-MISSION.md) — histórico da migração.

Também foram incorporados ao planejamento o relatório da “Linha de Montagem Híbrida 01 Turbo” (Gemini Vision, PyMuPDF, OpenCV/VTracer, NVIDIA NIM e Supabase) e os relatórios/propostas compartilhados nesta conversa: SQL de simulados/estatísticas, sprint de correções de UI, atualização de filtros, reclassificação de matérias, relação `question_lemmas`, Caçador de Gatilhos, FSRS/Elo/IRT e exportação PDF. Esses pontos refletem relatórios/propostas do ambiente local e não foram tratados como verificação independente do código remoto.

---

## Decisão executiva final

**Agora:** corrigir o erro do gabarito indefinido e a duplicação de `AFA`; validar localmente o fluxo completo do simulado.  
**Em paralelo, sem expandir o escopo de produção:** revisar estaticamente o pipeline Turbo, especialmente sucesso falso, perda de dados na deduplicação, fallbacks de enriquecimento e sincronização.  
**Depois:** auditar o schema real e a diferença entre o ambiente local e o GitHub; verificar SQL, RPC, filtros e persistência.  
**Em seguida:** preparar o pipeline híbrido questões–lemas com uma amostra rotulada e métricas antes de classificar milhares de questões.  
**Mais adiante:** transformar as associações validadas em Caçador de Gatilhos, revisão por lema e experimentos de personalização/ML.

A prioridade não é acumular funcionalidades. É criar uma sequência em que cada etapa esteja testada, produza dados confiáveis e prepare a próxima.
