# LemmaS + MathAI Engine — Roadmap Mestre

> **Versão:** 1.1 — consolidação ampliada com auditoria da Linha de Montagem Híbrida 01 Turbo  
> **Data:** 14/10/2026  
> **Status deste documento:** proposta de fonte única da verdade; inclui auditoria técnica do pipeline Turbo reportado, ainda precisa ser revisada e incorporada ao repositório  
> **Objetivo:** reunir produto, engenharia de software, engenharia de dados, dados pedagógicos, IA e Ciência de Dados em um plano só, distinguindo o que foi relatado como feito do que foi realmente verificado.

---

## 0. Como ler este roadmap

Os status abaixo são deliberadamente conservadores:

- **[x] Reportado como implementado:** existe um relatório de trabalho que diz que foi feito; isso não garante que esteja no `main` remoto, que o SQL tenha sido executado ou que funcione em produção.
- **[~] Parcial / precisa validar:** há implementação ou documentação, mas existem contradições, dependências externas ou testes pendentes.
- **[ ] Pendente:** ainda não foi implementado ou não há evidência suficiente para afirmar que foi concluído.
- **[!] Problema observado:** foi encontrado durante teste ou há risco conhecido que precisa ser resolvido.
- **[→] Futuro:** ideia válida, mas não deve desviar o foco das tarefas críticas.
- **[ARCHIVE] Histórico:** documento ou plano útil como referência, mas não deve ser tratado automaticamente como instrução vigente.

**Regra de ouro:** um item só é “concluído” quando o código certo está na branch certa, os pré-requisitos externos foram aplicados, os testes relevantes passaram e, quando necessário, a produção foi verificada.

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

### 2.1 Contagens de questões e lemas

Há contagens divergentes nas fontes consultadas:

- **Relato recente do projeto:** banco com **22.124 questões** e repertório com **135 lemas**.
- **`AGENTS.md` no GitHub:** menciona 288 questões, 8 lemas, 20 tabelas e 13 usuários.
- **`docs/ai/ROADMAP_MATHAI_ML.md`:** descreve uma fase de dados com 288 questões.
- **GitHub `main`:** não apresenta os arquivos `supabase_simulados_and_stats.sql`, `execute_sql_corrected.py`, `IMPLEMENTATION_AND_INSTRUCTIONS.md` nem a tabela `question_lemmas` no snapshot consultado.

**Decisão:** tratar 22.124/135 como números reportados pelo ambiente de trabalho, não como contagem de produção verificada. Antes de divulgar números no site ou README, registrar a contagem no banco real e a data da consulta. Verificar também quantos lemas existem no JSON local, quantos foram carregados no banco e se existem duplicatas.

### 2.2 Arquitetura descrita de formas diferentes

- `docs/architecture.md` descreve uma arquitetura anterior com Streamlit, SQLite e Turso.
- `docs/architecture/system.md`, os READMEs atuais e `AGENTS.md` descrevem a arquitetura web com Next.js, FastAPI e Supabase/PostgreSQL, embora `AGENTS.md` ainda tenha referências locais antigas e contagens defasadas.
- `docs/MATHAI-WEB-MISSION.md` descreve uma migração Streamlit → web e contém instruções específicas de uma missão antiga.
- O README do GitHub diz que partes das rotas de tentativas, feedback e flashcards ainda utilizam armazenamento em memória; isso precisa ser auditado no código atual.

**Decisão:** a arquitetura-alvo será Next.js + Supabase/PostgreSQL para a plataforma web, mantendo o FastAPI/Python para serviços e pipelines que justifiquem essa separação. Não remover nem migrar o backend inteiro antes de mapear as responsabilidades atuais.

### 2.3 Divergência entre a branch local e o GitHub

Um relatório local informou que a branch `main` estava 48 commits à frente de `origin/main`, sem push. Por isso, os documentos e arquivos encontrados no `main` remoto podem não refletir o ambiente local que está sendo testado.

**Decisão:** antes de publicar, comparar local e remoto, identificar os commits e revisar o diff. Não fazer push de toda a branch apenas para publicar uma correção pequena.

### 2.4 Contradições na tarefa da RPC de estatísticas

Um relatório afirma que `frontend/app/api/questions/route.ts` já foi atualizado para usar `get_lemmas_global_stats()`. Outro trecho do mesmo conjunto de notas lista a atualização da API como pendente.

**Status real:** **[~] precisa confirmar no código local, no schema do Supabase e em uma chamada real da API**.

### 2.5 O SQL do Supabase

O relatório anterior diz que `supabase_simulados_and_stats.sql` requer execução manual e que a tabela `simulados` e a RPC `get_lemmas_global_stats()` precisam ser verificadas. Não há confirmação, no material recebido, de que a migration foi executada em produção.

**Status real:** **[~] pendente de verificação no banco**. Não executar o SQL cegamente: inspecionar o arquivo, verificar quais objetos já existem, entender as políticas RLS e aplicar uma migration revisada pelo procedimento escolhido para o projeto.

---

## 3. Prioridade imediata — P0: corrigir e validar o simulado

Esta é a prioridade atual. Não iniciar recursos novos antes que o caminho principal funcione localmente.

### 3.1 Problemas observados no teste local

- **[!] Gabarito indefinido:** `frontend/app/(app)/resolver/page.tsx`, no cálculo local dos resultados, tenta executar `q.gabarito.toUpperCase()`; a exceção indica que `q.gabarito` está `undefined` em pelo menos um caso.
- **[!] Chave duplicada `AFA`:** `frontend/app/(app)/questoes/page.tsx` usa `key={b.name}`, mas a lista contém nomes duplicados. Isso precisa ser resolvido na origem dos dados ou na normalização, não escondido com `key={index}`.
- **[~] Formato de `answers`:** a correção relatada mudou o armazenamento de respostas de índice do array para ID real da questão (`answers[q.id]`). É necessário validar essa convenção de ponta a ponta e confirmar que o endpoint recebe o mesmo formato.
- **[~] Fallback local:** foi relatado que o app usa `sessionStorage` se a API falhar. A consistência entre envio persistido e fallback precisa ser testada.

### 3.2 Tarefas P0

- [ ] Rastrear a estrutura real da questão desde a API/estado do frontend até o cálculo do resultado.
- [ ] Identificar o campo canônico do gabarito e normalizá-lo em uma fronteira explícita, sem presumir que `gabarito` sempre existe.
- [ ] Distinguir “resposta errada” de “não foi possível determinar o gabarito”. Não classificar uma resposta como errada quando o gabarito está ausente.
- [ ] Verificar se as questões sem gabarito são registros inválidos, campos com outro nome ou dados transformados incorretamente.
- [ ] Manter a chave `answers[q.id]` de forma consistente em seleção, confirmação, envio, resultado e revisão, se isso corresponder ao contrato confirmado.
- [ ] Investigar por que existe mais de uma entrada `AFA`; normalizar/combinar duplicatas legítimas e preservar os filtros.
- [ ] Confirmar que a lista de bancas, depois da correção, não apresenta aviso de key duplicada.
- [ ] Executar o build e os testes disponíveis.
- [ ] Testar um fluxo local completo antes de qualquer deploy.

### 3.3 Casos de regressão obrigatórios

- [ ] Simulado com várias respostas corretas.
- [ ] Simulado com respostas incorretas.
- [ ] Questão deixada em branco.
- [ ] Questão cujo gabarito esteja ausente ou inválido.
- [ ] Voltar a uma questão, alterar a alternativa e entregar.
- [ ] Revisão pós-simulado mostra a resposta realmente selecionada.
- [ ] Falha da API: mensagem compreensível e fallback consistente, sem duplicar submissões.
- [ ] Envio à API e cálculo local produzem a mesma interpretação do resultado para os mesmos dados.
- [ ] Console sem exceções relacionadas ao fluxo.

**Critério de saída P0:** a entrega local funciona, a contagem de acertos/erros/brancos bate com o gabarito disponível, questões sem gabarito não geram classificação falsa, a revisão está correta e o aviso de banca duplicada foi resolvido.

### 3.4 Deploy: bloqueado até validação

- [ ] Revisar `git status`, branch, arquivos modificados e commits à frente do remoto.
- [ ] Comparar os 48 commits reportados com `origin/main` (ou obter a contagem atual).
- [ ] Identificar quais alterações são necessárias para produção e quais são trabalho paralelo.
- [ ] Não fazer push/deploy de todos os commits sem revisão.
- [ ] Depois da publicação autorizada, validar a Vercel com usuário autenticado e inspecionar a requisição de envio, o resultado e os logs.

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

- [ ] Confirmar se `/api/questions` chama a RPC para os facets globais.
- [ ] Eliminar dependência de `.limit(1000)` para contagens que precisam representar o banco inteiro, usando agregação no banco/RPC.
- [ ] Diferenciar estatísticas globais das estatísticas de uma busca já filtrada.
- [ ] Verificar paginação e a contagem total sem retornar todas as questões ao frontend.
- [ ] Validar filtros de banca, matéria, tipo, dificuldade e ano, incluindo “todos os anos”.
- [ ] Confirmar que o modo de fallback não mostra contagens de amostras como se fossem números reais do banco.
- [ ] Testar registros com nomes de banca com espaços, caixa diferente e duplicatas legítimas.

### 4.3 Persistência e histórico

- [ ] Inventariar quais endpoints persistem no Supabase e quais ainda usam memória ou `sessionStorage`.
- [ ] Mapear as rotas de questões, simulados, tentativas, feedback, flashcards e revisões.
- [ ] Definir a fonte de verdade de cada entidade e eliminar persistências concorrentes/confusas.
- [ ] Investigar o histórico de questões resolvidas e políticas RLS de `tentativas`/`user_attempts` (confirmar os nomes reais antes de alterar).
- [ ] Garantir que registros importantes sobrevivam ao refresh e reinício dos serviços.
- [ ] Evitar migração ampla de backend até essa auditoria terminar.

**Critério de saída P1:** API, filtros e simulados usam o schema real, as contagens são confiáveis, a persistência está documentada e as permissões foram testadas.

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

## 14. Backlog consolidado por prioridade

### P0 — Fazer agora

- [ ] Corrigir a causa de `q.gabarito` indefinido e não classificar respostas sem gabarito como erradas.
- [ ] Corrigir a duplicação de banca `AFA` na origem dos dados/lista.
- [ ] Testar seleção/alteração/envio/revisão de respostas por ID real da questão.
- [ ] Executar casos de regressão para certas, erradas, em branco, gabarito ausente e fallback.
- [ ] Passar build e testes disponíveis.
- [ ] Revisar a divergência local/remoto antes de publicar qualquer commit/push.

### P1 — Próximo bloco

- [ ] Auditar schema, contagem real de questões/lemas e estado real do Supabase.
- [ ] Verificar/aplicar corretamente SQL de `simulados` e RPC global de estatísticas.
- [ ] Validar facets, paginação e contagens globais sem limite de 1000.
- [ ] Auditar persistência e RLS de tentativas, simulados e histórico.
- [ ] Atualizar dicionário de dados, AGENTS e documentação de arquitetura com fatos verificados.
- [ ] Consolidar o roadmap como fonte única no GitHub depois de revisão humana.

### P2 — Base de dados e diferencial pedagógico

- [ ] Melhorar pipeline de ingestão, tradução PT-BR e preservação de LaTeX.
- [ ] Auditar e endurecer a Linha de Montagem Híbrida 01 Turbo (extração, deduplicação, bounding boxes, enriquecimento, Storage e upsert) antes de confiar nela em escala.
- [ ] Auditar e classificar taxonomia/matérias com controle de qualidade.
- [ ] Preparar associação questão–lema com schema correto, embeddings, regras e validação.
- [ ] Construir dataset de referência e métricas para associação.
- [ ] Integrar filtro/card de lema depois de validar a qualidade.
- [ ] Priorizar persistência durável para tentativas e demais eventos essenciais.

### P3 — Personalização e crescimento

- [ ] Construir Caçador de Gatilhos com suporte a estratégias equivalentes.
- [ ] Agendar revisão por lema/habilidade com questão inédita quando houver conteúdo.
- [ ] Validar algoritmo atual de repetição espaçada antes de adotar FSRS.
- [ ] Construir baseline de domínio por lema; avaliar Elo/IRT quando houver dados suficientes.
- [ ] Implementar PDF de simulados.
- [ ] Melhorar avatar, dashboard, UI das bancas e experiência pública.
- [ ] Desenvolver modelos preditivos/recomendadores com avaliação offline e acompanhamento de qualidade.

### P4 — Visão de longo prazo

- [ ] OCR multimodal de resolução manuscrita com transcrição matemática validada.
- [ ] Diagnóstico de erros passo a passo e tutoria socrática personalizada.
- [ ] Aprendizado de conhecimento (*Knowledge Tracing*) e recomendação adaptativa avançada.
- [ ] Fine-tuning de modelos especializados apenas quando houver volume adequado de dados validados e consentidos.
- [ ] Explorar outras IAs especialistas (BioIA, QuimIA, PhIA) depois que LEMMAS Core e a governança estiverem estáveis.
- [ ] Escalar o acervo rumo à meta de 100 mil questões, se ela continuar sendo objetivo, com qualidade e proveniência preservadas.

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
