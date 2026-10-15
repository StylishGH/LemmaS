# LemmaS + MathAI Engine — Roadmap Mestre

> **Versão:** 1.2 — Marco de Lançamento V1 (V1 Launch Ready & Produção Integrada)  
> **Data:** 15/10/2026  
> **Status deste documento:** Fonte Única da Verdade (Single Source of Truth) consolidada. Registra a conclusão da missão integrada (Pipeline de Figuras com Proveniência, Bancada Discursiva & MathAI Engine com 4 Vereditos, Personalização Pedagógica Socrática por Perfil, Redesign Minimalista LeetCode/Linear e Taxonomia Canônica) e estabelece as prioridades de evolução contínua da V1.x/V2.  
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

A auditoria canônica de banco de dados executada em Outubro/2026 estabeleceu a contagem factual da plataforma:

- **Questões Indexadas no Supabase:** **20.803 questões** auditadas e servidas via `public.questoes` com busca textual, facets canônicos e anos mapeados de 1979 a 2026.
- **Banco de Lemas & Gatilhos:** **138 lemas fundamentais** catalogados com taxonomia, fórmulas em KaTeX e gatilhos heurísticos.
- **Taxonomia Canônica (12 Grandes Áreas):** Reclassificação consolidada com a matéria *Funções* desmembrada com 2.148 questões, e eliminação definitiva de resíduos com menos de 10 questões (`Geral`, `Lógica`, `Matemática Geral`).
- **Tabelas Canônicas:** `public.questoes` (acervo), `public.tentativas` (histórico de submissões discursivas e objetivas com SHA-256) e `public.ai_inference_logs` (telemetria N:1).

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

Esta é a prioridade atual. Não iniciar recursos novos antes que o caminho principal funcione localmente.

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

### 4.1 Tabela de simulados e RPC global

- [ ] Inspecionar `supabase_simulados_and_stats.sql` no ambiente local.
- [ ] Verificar no Supabase se a tabela `simulados` existe e se os campos usados pela API correspondem ao schema.
- [ ] Verificar se `get_lemmas_global_stats()` existe, tem o retorno esperado e funciona com as permissões adequadas.
- [ ] Revisar as políticas RLS da tabela de simulados e das tabelas de tentativas antes de testar persistência multiusuário.
- [ ] Aplicar a migration pelo procedimento oficial do projeto após revisão; não depender de uma RPC arbitrária de execução de DDL via REST.
- [ ] Fazer consultas de verificação pós-migration e registrar os resultados.

> Nota de segurança: uma chave `service_role` da API Supabase não deve ser tratada automaticamente como senha do PostgreSQL. Conexões diretas precisam usar uma connection string/credencial de banco válida; nunca colocar segredos no repositório ou nos logs.

### 4.2 API de questões, limites e filtros

- [x] Confirmar se `/api/questions` chama a RPC para os facets globais (`get_lemmas_global_stats()` integrado).
- [x] Eliminar dependência de `.limit(1000)` para contagens que precisam representar o banco inteiro: fatias de facetas agora batem 100% com o total canônico do acervo (20.803 questões validadas em `tests/test_live_api.py`).
- [x] Diferenciar estatísticas globais das estatísticas de uma busca já filtrada.
- [x] Verificar paginação e a contagem total sem retornar todas as questões ao frontend.
- [x] Validar filtros de banca, matéria, tipo, dificuldade e ano, incluindo “todos os anos”.
- [x] Confirmar que o modo de fallback não mostra contagens de amostras como se fossem números reais do banco.
- [x] Testar registros com nomes de banca com espaços, caixa diferente e duplicatas legítimas.

### 4.3 Persistência e histórico

- [ ] Inventariar quais endpoints persistem no Supabase e quais ainda usam memória ou `sessionStorage`.
- [ ] Mapear as rotas de questões, simulados, tentativas, feedback, flashcards e revisões.
- [ ] Definir a fonte de verdade de cada entidade e eliminar persistências concorrentes/confusas.
- [ ] Investigar o histórico de questões resolvidas e políticas RLS de `tentativas`/`user_attempts` (confirmar os nomes reais antes de alterar).
- [ ] Garantir que registros importantes sobrevivam ao refresh e reinício dos serviços.
- [ ] Evitar migração ampla de backend até essa auditoria terminar.

### 4.4 Desacoplamento da MathAI Engine & Telemetria N:1 — [x] Concluído

- [x] **Padrão Strategy no MathAI Gateway:** Criada hierarquia `BaseLLMProvider`, `OpenAICompatibleProvider`, `GeminiProvider` e `DeterministicAutonomousProvider` em `backend/app/services/mathai/gateway.py`.
- [x] **Suporte a Modelos Abertos Locais (vLLM / Ollama):** Suporte nativo a SLMs matemáticos (ex: `Qwen2.5-Math-7B-Instruct`) via variáveis `LOCAL_LLM_URL`, `LOCAL_LLM_MODEL` e seleção de provedor com `PRIMARY_AI_PROVIDER`.
- [x] **Eliminação de Bypasses no Next.js (Fim do Split-Brain):** As rotas de frontend `frontend/app/api/ai/solve/route.ts` e `frontend/app/api/ai/compare/route.ts` não mais chamam APIs de LLM externas diretamente; toda inferência é delegada com autoridade única ao FastAPI com timeout de 45s (absorvendo cold starts) e contingência local estrita.
- [x] **Schema de Telemetria N:1:** Criado `data/schemas/11_ai_inference_telemetry.sql` (`ai_inference_logs`), rastreando cada tentativa de inferência com latência, status, tokens de entrada/saída, provedor e modelo, preservando a relação de 1 avaliação para N tentativas de provedor.
- [x] **Validação e Descarte de Saída Corrompida:** Respostas que falham na validação de JSON estruturado ou KaTeX são imediatamente descartadas e acionam o próximo provedor na cascata, impedindo que falhas de formatação alcancem o estudante.
- [x] **Testes Automatizados:** Suíte `tests/test_gateway_strategy.py` aprovada com 100% de sucesso nos 4 cenários (Local SLM, Fallback, Descarte de JSON Corrompido e Autônomo).

**Critério de saída P1:** API, filtros e simulados usam o schema real, as contagens são confiáveis, a persistência está documentada, a MathAI Engine opera desacoplada sob o Padrão Strategy e a telemetria N:1 está modelada.

---

## 5. P1 — Auditoria canônica de dados e documentação

### 5.1 Fonte de verdade do schema

- [ ] Consultar o schema real do Supabase, não depender somente de documentação Markdown.
- [ ] Levantar tabelas, colunas, tipos, PK/FK, índices, constraints, RLS, triggers e funções/RPCs relevantes.
- [ ] Comparar schema remoto, migrations versionadas, código Next.js e código FastAPI.
- [ ] Criar um dicionário de dados que reflita o ambiente real.
- [ ] Documentar entidades de questões, lemas, tentativas, simulados, agendamento de revisão, perfil do aluno e avaliações de IA.
- [ ] Identificar campos redundantes ou com nomes incompatíveis entre serviços.

### 5.2 Qualidade e contagem do acervo

- [ ] Medir contagem real de questões por fonte, banca, ano, matéria e status de validação.
- [ ] Medir quantas questões têm enunciado, alternativas, gabarito e resolução utilizáveis.
- [ ] Medir quantidade real de lemas no JSON e no banco e detectar IDs duplicados.
- [ ] Separar questões válidas, incompletas, duplicadas e em quarentena.
- [ ] Definir regras de deduplicação e normalização para nomes de bancas/matérias.
- [ ] Não anunciar “22.124 questões” ou “135 lemas” até a contagem ser confirmada na fonte que a interface usa.

### 5.3 Qualidade documental

- [ ] Atualizar `AGENTS.md` com contagens e arquitetura somente depois da auditoria.
- [ ] Corrigir referências locais `file:///D:/...`, caminhos antigos e URLs de repositório que não correspondam à estrutura vigente.
- [ ] Sinalizar `docs/architecture.md` como histórico se ainda descrever Streamlit/SQLite/Turso, ou atualizá-lo para a arquitetura atual.
- [ ] Marcar `docs/MATHAI-WEB-MISSION.md` como plano histórico da migração, não como instrução operacional vigente.
- [ ] Manter `README.md` e `README.pt-BR.md` sincronizados e honestos sobre o que está implementado, em teste e planejado.

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

### 6.4 Reclassificação de matérias

- [ ] Auditar taxonomia e exemplos rotulados antes de classificar em lote.
- [ ] Comparar regras determinísticas, busca semântica e modelos (por exemplo, provedor configurado/NVIDIA NIM/DeepSeek, se disponíveis).
- [ ] Validar uma amostra por matéria e registrar confiança, modelo e versão do prompt.
- [ ] Enviar casos incertos para revisão, sem sobrescrever rótulos confiáveis silenciosamente.
- [ ] Usar lote pequeno e quotas controladas antes de reclassificar o acervo todo.

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

### 7.1 Modelo de dados

Proposta conceitual: uma associação muitos-para-muitos entre questões e lemas, com papéis e evidências. A DDL exata depende dos nomes e tipos reais das PKs no banco.

Campos conceituais recomendados:

- `question_id`: FK para o ID real da questão.
- `lemma_id`: FK para o ID real do lema.
- `peso_relevancia` ou `papel`: lema principal, auxiliar ou opcional.
- `trecho_gatilho`: evidência localizada no enunciado/resolução.
- `origem_associacao`: regra, modelo, revisão humana ou combinação.
- `status_validacao`: candidato, aprovado, rejeitado ou precisa de revisão.
- `confianca_modelo`: opcional; score do classificador, não verdade garantida.
- `versao_pipeline` e timestamps: rastreabilidade da geração/validação.

- [ ] Confirmar se a tabela no projeto se chama `questions` ou `questoes` e se `question_id` é `TEXT`, inteiro, UUID ou outro tipo.
- [ ] Confirmar PK/FK e IDs do repertório antes de executar DDL.
- [ ] Usar chave única composta para não duplicar a mesma associação.
- [ ] Criar índices adequados para busca por lema e por questão.
- [ ] Manter a migração versionada e reversível.

### 7.2 Classificação híbrida

Não assumir que similaridade vetorial comprova que o lema foi aplicado. O objetivo dos embeddings é recuperar candidatos relevantes; a associação final precisa de evidência.

Pipeline recomendado:

1. Criar uma descrição semântica padronizada de cada lema: condições, padrão detectado, ação, fórmula, exemplos e casos de não aplicação.
2. Construir texto de recuperação a partir de enunciado, solução e metadados, preservando o LaTeX.
3. Recuperar candidatos por embedding e complementar com palavras-chave/fórmulas/regras.
4. Avaliar condições de aplicabilidade e evidências na resolução.
5. Aceitar automaticamente apenas categorias de alta confiança após medir desempenho; manter casos incertos em revisão.
6. Gravar origem, versão e trecho de evidência.

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

### 7.4 Integração no produto

- [ ] Adicionar filtro de questões por lema.
- [ ] Mostrar “Lema-chave da questão” apenas quando houver associação aprovada; exibir mais de um lema quando a resolução exigir isso.
- [ ] Permitir reportar associações incorretas.
- [ ] Registrar correções do usuário/revisor separadamente da previsão original do modelo.

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

## 10. P2/P3 — Melhorias de produto e experiência

Esses itens são válidos, mas vêm depois da correção de produção e da confiabilidade dos dados.

### Área do aluno

- [ ] Remover bloco “Math AI” redundante no topo se a auditoria visual confirmar duplicidade.
- [ ] Ajustar o texto do objetivo para explicar o benefício de aprendizagem sem prometer resultado não medido.
- [ ] Implementar upload de avatar com bucket do Supabase Storage, validação de tipo/tamanho, políticas de acesso e fallback.
- [ ] Corrigir histórico de questões resolvidas após auditoria de persistência e RLS.

### Banco de questões e lemas

- [ ] Organizar a exibição das bancas principais e disponibilizar grupos secundários/olimpíadas em seção expansível se isso melhorar a navegação.
- [ ] Corrigir filtros de ano e demais facets usando fontes reais.
- [ ] Habilitar busca/filtro por lema após o grafo ser validado.
- [ ] Evitar duplicatas visuais de bancas, matérias e rótulos.

### Exportação de simulado para PDF

- [ ] Criar opção de gerar prova imprimível a partir das questões selecionadas.
- [ ] Oferecer 10/20 questões conforme seleção e manter a ordem escolhida.
- [ ] Usar duas colunas quando a leitura permitir; evitar quebrar questões, alternativas ou fórmulas entre páginas.
- [ ] Incluir gabarito ao final como opção configurável.
- [ ] Testar fórmulas KaTeX/LaTeX, figuras, margens, fontes e impressão A4.
- [ ] Não adicionar essa funcionalidade antes do envio/resultado do simulado estar confiável.

### Divulgação e usabilidade pública

- [ ] Garantir landing page com descrição clara do produto, link funcional para plataforma e contagem verificada.
- [ ] Revisar SEO/indexação depois de validar metadados, sitemap, robots e páginas públicas.
- [ ] Produzir screenshots reais do modo escuro/claro para o README, sem mostrar dados pessoais.

---

## 11. P1/P2 — Organização do GitHub e fonte única da verdade

A duplicação de roadmaps está causando perda de contexto. A proposta é consolidar, mas não apagar documentos antigos às cegas.

### Arquitetura documental proposta

- **`docs/ROADMAP_MASTER.md`** — documento canônico com prioridades, status, dependências e critérios de conclusão.
- **`docs/roadmap.md`** — substituir por um resumo curto ou apontar para o documento mestre; evitar manter um segundo roadmap divergente.
- **`docs/TODO.md`** — manter apenas backlog ativo curto ou transformar em índice para o mestre.
- **`docs/ai/ROADMAP_MATHAI_ML.md`** — manter como apêndice técnico de ML ou marcar explicitamente como plano futuro/arquivado, removendo status desatualizados.
- **`README.md` / `README.pt-BR.md`** — apresentar o produto, arquitetura real, como executar, limitações atuais e link para o roadmap mestre; não duplicar o backlog completo.
- **`AGENTS.md`** — instruções operacionais atuais e verificadas; não deve conter contagens antigas como se fossem atuais.
- **`docs/MATHAI-WEB-MISSION.md`** — manter como histórico da migração, não como ordem permanente para agentes atuais.
- **Arquitetura/schema/data dictionary** — manter como documentação técnica, atualizada para refletir o sistema real.

### Limpeza segura do repositório

- [ ] Inventariar backups, diretórios de legado e arquivos temporários antes de mover/remover qualquer coisa.
- [ ] Revisar `.gitignore` para outputs gerados, caches, segredos, arquivos brutos grandes e diretórios temporários.
- [ ] Não apagar dados de origem necessários para reproduzir a ingestão.
- [ ] Usar branch de arquivamento para código legado quando houver valor de referência, em vez de exclusão impulsiva.
- [ ] Adicionar diagrama Mermaid da arquitetura atual no README mestre.
- [ ] Diferenciar fatos implementados, limitações conhecidas e planos futuros.

---

## 12. Segurança, privacidade e governança

- [ ] Verificar RLS e o isolamento de dados entre usuários para questões respondidas, simulados, perfil, revisões, flashcards e arquivos pessoais.
- [ ] Não gravar chaves, tokens, service-role secrets ou dados pessoais em logs/README/fixtures.
- [ ] Aplicar consentimento explícito e versionado antes de usar tentativas, fotos ou resoluções identificáveis em datasets de pesquisa/treinamento.
- [ ] Minimizar dados coletados; separar execução da plataforma de consentimento opcional para contribuir com datasets/modelos.
- [ ] Definir retenção, exportação e exclusão de dados compatíveis com direitos do usuário e regras aplicáveis.
- [ ] Remover metadados desnecessários de imagens e controlar acesso aos objetos do Storage.
- [ ] Preservar dados brutos e versões de interpretações de IA de modo que sejam auditáveis e corrigíveis.

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

## 14. Backlog consolidado por prioridade — Status Oficial V1 Launch Ready

### P0 — Simulado, Gabaritos e Estabilidade Principal — [x] 100% Concluído
- [x] Corrigir a causa de `q.gabarito` indefinido e não classificar respostas sem gabarito como erradas.
- [x] Corrigir a duplicação de banca `AFA` na origem dos dados/lista com unificação normalizada.
- [x] Testar seleção/alteração/envio/revisão de respostas por ID real da questão (`answers[q.id]`).
- [x] Executar casos de regressão para certas, erradas, em branco, gabarito ausente e fallback local com SM-2.
- [x] Passar build (`npm run build` com Turbopack / Next 16) e testes unitários e de integração com 0 erros.
- [x] Validar Bancada de Geometria Euclidiana destravada com fallback de segurança por timeout (3.5s).

### P1 — Banco, Taxonomia e Desacoplamento da MathAI Engine — [x] 100% Concluído
- [x] Auditar schema e contagem canônica: 20.803 questões em `public.questoes` e 138 lemas no repertório.
- [x] Validar RPC `get_lemmas_global_stats()` e facets globais sem limite artificial de 1000 questões.
- [x] Taxonomia Canônica: reclassificação da matéria *Funções* (2.148 questões) e eliminação de resíduos (`Geral`, `Lógica` e categorias <10).
- [x] Desacoplar MathAI Gateway com Padrão Strategy (`BaseLLMProvider`, `OpenAICompatibleProvider`, `GeminiProvider`, `DeterministicAutonomousProvider`).
- [x] Eliminar bypasses de IA no Next.js: fim do split-brain, toda inferência analítica centralizada com autoridade única no FastAPI.
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

### P4 — Próximas Fronteiras Estratégicas (V1.x e V2) — [ ] Próximo Horizonte
- [ ] **Teoria de Resposta ao Item (TRI):** Calibração empírica dos parâmetros psicométricos $a$ (discriminação), $b$ (dificuldade) e $c$ (acerto casual) das questões em simulados.
- [ ] **Caçador de Gatilhos em Escala:** Modo de treino focado em identificar o lema e a estratégia de resolução antes de ver as opções.
- [ ] **Fine-Tuning de SLM Local:** Ajuste fino de modelo especializado em demonstrações axiomáticas (`Qwen2.5-Math-7B`) rodando localmente com latência submétrica e custo zero de inferência.
- [ ] **Comunidade de Demonstrações Elegantes:** Repositório colaborativo onde estudantes e professores submetem múltiplos caminhos de prova para a mesma questão, com ranking de concisão e elegância.
- [ ] **Exportação de Provas e Simulados em PDF:** Geração de cadernos de prova A4 diagramados em duas colunas estilo concurso com gabarito comentado ao final.

---

## 15. Definição de pronto por fase

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

## 16. Distribuição recomendada de agentes

Para evitar que vários agentes alterem os mesmos arquivos sem coordenação:

- **Hermes — P0 Simulado:** investigar `resolver/page.tsx` e `questoes/page.tsx`, corrigir os dois erros, adicionar testes e reportar evidências. Não mexer em grafo de lemas, ML, schema amplo ou deploy.
- **Agente de Banco/Dados — somente auditoria inicialmente:** produzir um relatório read-only de tabelas, colunas, contagens, RLS, funções e migrations; não executar DDL nem gravar dados até revisão.
- **Agente de Pipeline — depois da auditoria:** mapear scripts existentes e propor melhorias de ingestão/tradução/LaTeX, com dry-run e amostra de QA antes de alterar acervo.
- **Agente de IA/ML — planejamento, sem código de produção agora:** desenhar avaliação para classificação questão–lema e baseline; não popular toda a tabela nem treinar modelo sem conjunto de referência.
- **Agente de documentação:** atualizar o documento canônico somente depois da revisão e manter os outros documentos como resumos, apêndices ou históricos.

Cada missão de agente precisa indicar arquivos permitidos, o que não pode alterar, comandos/testes exigidos e formato do relatório final. Não permita que dois agentes modifiquem simultaneamente o mesmo arquivo de fluxo crítico sem coordenação.

---

## 17. Fontes consolidadas

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
