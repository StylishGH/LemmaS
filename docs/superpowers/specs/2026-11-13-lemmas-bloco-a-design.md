# Design Doc — Ciclo 1 (Bloco A): Correções Estruturais de Navegação, Filtros, Subtópicos, Mobile, Simulado e KaTeX no LemmaS

**Data:** 2026-11-13  
**Escopo:** Ciclo 1 (Bloco A — Código Frontend + API `/api/questions` + Parser KaTeX).  
**Relação com Ciclo 2 (Bloco B):** Mutações/reclassificações em linhas de `public.questoes` no Supabase (`ID=2146`/`2158` EsPCEx Determinantes em Cálculo, `ID=22386`, 12 placeholders ITA 2023, HTML/lixo, 178 grupos duplicados, `$` ímpares persistidos) ficam explicitamente fora deste documento e serão tratadas em plano dedicado de saneamento com `--dry-run` e backup logo após o Ciclo 1.

---

## 1. Motivação e Diagnóstico Base

Auditoria completa no site em produção (`https://lemmas.com.br`, `21.638` questões) em Desktop (`1440×900`) e Mobile (`390×844`), cruzada com leitura direta do código e do banco, revelou falhas estruturais agrupadas em 6 frentes dentro do Bloco A:

1. **Trilhas rápidas quebradas (`questoes/page.tsx`, `route.ts`):** `Cálculo 3 (CEDERJ)` e `Álgebra Linear I (CEDERJ)` se auto-resetam para `"Todas"` após o retorno da API porque ambas recebem contagem `0` em `data.materias` (precedência de `break` em `CANONICAL_CATEGORIES` e matcher ausente para `"álgebra linear i"`). Além disso, o rótulo `(CEDERJ)` sugere filtro exclusivo por banca mesmo quando não define `bancaFiltro` (ocultaria questões `LemmaS` se travasse `CEDERJ`, ou engana se mantiver o sufixo).
2. **Paginação com repetição massiva (`route.ts`):** Quando não há preferências de perfil (`!preference`), `page=1` entra em `isColdStart` (`fetchLimit=45` + reordenação local `sortQuestionsByQuality(...).slice(0, 15)`), enquanto `page>=2` busca `offset=15..29` da ordem SQL crua `ano DESC, id DESC`, causando 12 cards repetidos entre Página 1 e Página 2 e omissão de questões recentes (como `LemmaS` 2026).
3. **Filtros com contagens erradas e ausência de Subtópicos (`route.ts`, `questoes/page.tsx`):**
   - `Matérias`, `Dificuldades` e `Tipos` usam totais globais fixos ignorando os filtros ativos;
   - `Anos` usa `ACERVO_ANOS_COUNTS` estático obsoleto (`2026: 8` vs `132` reais) sem filtro e só a página atual (`15` linhas) quando filtrado;
   - `Tópicos` vem apenas das `15` linhas de `sampleRows` (nunca dos `156` tópicos reais);
   - `Subtópicos` (`1.422` distintos, preenchidos em 100% das `21.638` questões) não são expostos em nenhuma faceta nem filtro dedicado na UI;
   - Regras divergentes entre `matcher` (contagem) e `filter` (query SQL) fazem `Álgebra` exibir `4.145` e retornar `4.639`.
4. **Modal `Criar Simulado` travado em `0` e preso sob Navbar (`CriarSimuladoModal.tsx`, `ReportarQuestaoModal.tsx`, `layout.tsx`):** `quantidadeDesejada` inicializa em `0` antes de `totalFiltradas` carregar e nunca sincroniza; `<main className="relative z-10">` cria contexto de empilhamento que prende modais (`z-50`) abaixo de `AppNavbar` (`z-40`); `fetchFilteredIds` omite `categoria_banca`, `tipo_prova`, `fase_nivel`, `search` e `subtopico`.
5. **Quebras Mobile (`390×844`) e Usabilidade (`/questoes`, `/resolver`, `/opinioes`, `/login`):**
   - Popovers de filtro (`left-0 sm:left-auto sm:right-0`) vazam até `93px` fora da borda direita ou abaixo da tela no celular;
   - Checkbox `"Selecionar página"` perde rótulo no celular (`hidden sm:inline`);
   - Botão `"Comparar Abordagens"` (`absolute right-3 bottom-4`) sobrepõe o `<textarea>` em `/opinioes` no celular;
   - `/resolver?id=...` abre questão avulsa no **Modo Simulado Oficial** (cronômetro 30m + IA/dicas bloqueadas) em vez de **Modo Treino**, além de exibir `"✨"` duplicado no botão Modo Foco e de não haver botão direto *"Resolver"* nos cards de `/questoes`;
   - Badge `"1 Questões Auditadas"` sem singular; strings `"\frac"`/`"\begin"` em `questoes/page.tsx` com escape inválido; `<Link>` dentro de `<label>` em `LegalConsentCheckbox.tsx`.
6. **Parser KaTeX quebrando fórmulas válidas (`MathDisplay.tsx`):**
   - Proteção de `R$` (`TOKEN_REAL`) ocorre *depois* de `sanitizeMathText`, permitindo que `R$` pareie com `$` posterior (`#333`);
   - Heurística `words.length >= 2` apaga o nome da macro (`\operatorname`, `\begin`), mas mantém `{arcsen}`, `{sen}`, `{pmatrix}`, arrancando `$...$` de fórmulas legítimas (`#22966`, `#83`, `#59`, impactando `516` questões com `\begin{...}` em `$...$` e `540` com outros comandos inline);
   - `\n(?![a-zA-Z])` deixa literais `\nClasses`, `\nB`, `\nC`, `\nSe` intactos (`956` questões);
   - `\overparen` sem macro/fallback (`8` questões, ex.: `#330`).

---

## 2. Objetivos, Não-Objetivos e Restrições

* **Objetivos:**
  * Eliminar 100% da repetição inter-páginas em `/questoes`.
  * Fazer trilhas rápidas (`Cálculo 3`, `Álgebra Linear I`, etc.) funcionarem sem auto-reset e exibirem nomes coerentes com o filtro aplicado.
  * Garantir **Invariante de Contagem Exata** em todas as 10 dimensões de filtro (`bancas`, `categorias_banca`, `tipos_prova`, `fases`, `materias`, `topicos`, `subtopicos`, `anos`, `tipos`, `dificuldades`) e expor **Subtópicos** reais dentro do popover de matéria/tópico.
  * Corrigir todos os bugs de Modal, Stacking/Z-Index, Mobile (`390×844`), Desktop (`1440×900`), `/resolver?id=...` e `MathDisplay.tsx` listados na Seção 1.
  * Garantir cobertura por testes unitários (`node --test` no CI) e validação em navegador real (Desktop e Mobile).
* **Não-Objetivos (Ciclo 2 / Bloco B):**
  * Alterar registros de questões no Supabase (reclassificação `EsPCEx`/`Cálculo` `#2146`/`#2158`, limpeza de `22386`, `ITA 2023`, duplicatas, HTML e `$` ímpares no banco);
  * Criar ou alterar migrations/RPCs SQL no Postgres remoto nesta etapa;
  * Alterar o comportamento de paginação por coortes de preferência de perfil (`preference`) além da consistência compartilhada com os novos filtros.
* **Restrições:**
  * Zero alterações no schema ou nas linhas do Supabase neste ciclo;
  * Compatibilidade integral com `/resolver`, `QuestionPageCache`, dark mode e light mode, e workflow de CI (`.github/workflows/ci.yml`: `node --test` + `npm run build`);
  * Não duplicar regras de filtro entre `GET`, `POST` e cálculo de facetas.

---

## 3. Abordagem Escolhida

* **Abordagem A1 (Escolhida):** Correção estrutural pura em Next.js/TypeScript com **índice leve de metadados em cache no servidor** (TTL de 120s, ~21,6k linhas × apenas colunas de taxonomia, sem `enunciado`/`solucao`) e módulo compartilhado de predicados/filtros para `GET`, `POST` e facetas, removendo `isColdStart` da paginação padrão.
* **Alternativa A2 (Descartada para Ciclo 1):** Criar nova RPC SQL de ranking e agregação no Supabase. Rejeitada agora por exigir DDL remoto no Postgres antes de limpar o acervo (Bloco B) e misturar risco de banco com correções de aplicação.
* **Alternativa A3 (Descartada):** Apenas remover auto-reset no frontend e manter `ACERVO_ANOS_COUNTS`/`sampleRows`. Não resolve os números errados nos filtros nem expõe os `1.422` subtópicos reais.

---

## 4. Arquitetura e Especificação das Mudanças

### 4.1 Módulo Compartilhado de Filtros e Facetas (`frontend/lib/question-filters.ts`)

Criar módulo único consumido por `GET` e `POST` em `frontend/app/api/questions/route.ts` e testável via `node --test`:

1. **Taxonomia Canônica Disjunta 1:1 (`CANONICAL_CATEGORIES` por `materia` exata):**
   - Cada Grande Área passa a mapear **exatamente** os respectivos valores da coluna `materia` no banco (`trim().toLowerCase()` em memória e `materia.eq."..."` / `materia.ilike."..."` sem `%` no PostgREST — mantendo compatibilidade plena com `preferenceGroups` em `route.ts` L374–377 ao generalizar a reescrita de não-nulo para `.eq.` e `.ilike.`):
     - `Geometria Plana` (`"Geometria Plana"` — `4.872`, sem misturar Espacial/Analítica/Diferencial);
     - `Probabilidade e Combinatória` (`"Probabilidade e Combinatória"` — `4.316`);
     - `Álgebra` (`"Álgebra"` — `4.045`, sem puxar `Desigualdades`/`Sequências` de outras matérias nem absorver `Matemática` só na contagem);
     - `Teoria dos Números` (`"Teoria dos Números"` — `3.485`);
     - `Polinômios e Complexos` (`"Polinômios e Complexos"` — `1.318`);
     - `Funções` (`"Funções"` — `981`, removendo a regra especial `enunciado.ilike."%f(x)%"`);
     - `Trigonometria` (`"Trigonometria"` — `542`);
     - `Geometria Espacial` (`"Geometria Espacial"` — `467`);
     - `Geometria Analítica` (`"Geometria Analítica"` — `428`);
     - `Cálculo` (`"Cálculo"` — `327`, separada de `Cálculo 3`);
     - `Matemática Básica` (`"Matemática Básica"` — `295`);
     - `Cálculo 3` (`"Cálculo 3"` — `242`, removendo os 12 `topico.ilike` amplos e garantindo `Cálculo 3 = 242` exatos);
     - `Álgebra Linear` (`"Álgebra Linear"` — `154`);
     - `Matemática (Geral)` (rótulo exibido na UI mapeado para `"Matemática"` no banco — `100` questões residuais visíveis até a reclassificação do Ciclo 2);
     - `Álgebra Linear I` (`"Álgebra Linear I"` — `59`, sem puxar `Matrizes`/`Determinantes`/`Sistemas Lineares` do Ensino Médio, que permanecem acessíveis via Tópicos/Subtópicos);
     - `Álgebra Linear II` (`"Álgebra Linear II"` — `7`, removendo o corte artificial `count >= 10` e exibindo qualquer categoria com `count > 0`).
   - Todas as 16 categorias são mutuamente disjuntas, somando exatamente 100% das `21.638` questões e garantindo paridade exata **1:1** entre a contagem da faceta e o `total` retornado na busca SQL.

2. **Filtro dedicado de `subtopico`, correspondência exata em `topico`/`subtopico` e suporte em `POST`:**
   - Adicionar suporte explícito ao parâmetro `subtopico` (multi-select, vírgula-separado).
   - Para que a contagem `(N)` exibida em cada chip de **Tópico** e **Subtópico** seja idêntica ao `total` ao clicar, tanto `topico=` quanto `subtopico=` usam correspondência exata case-insensitive normalizada (`trim().toLowerCase()` em memória e `.ilike."Valor Exato"` sem coringas `%` no SQL, ou `.eq` exato) — reservando busca parcial `%substring%` apenas para o parâmetro `search=` (busca textual livre).
   - Adicionar suporte a `subtopico`, `search` e campos faltantes (`categoria_banca`, `tipo_prova`, `fase_nivel`) no handler `POST /api/questions` e em `fetchFilteredIds` / `handleTreinarListaEstudo` (`questoes/page.tsx`).

3. **Índice de Metadados em Cache + Contagem Cruzada Exata (`computeCrossFilteredFacets`):**
   - Estrutura armazenada em cache global no servidor (`TTL = 120s`, deduplicação de fetch concorrente in-flight para evitar stampede): seleciona em lotes paralelos via Supabase apenas `id, banca, categoria_banca, tipo_prova, fase_nivel, ano, tipo, dificuldade, materia, topico, subtopico, lema_id, lema_codigo`. Em caso de falha parcial na carga do índice, não cacheia estado corrompido e faz fallback explícito seguro.
   - **Busca textual (`search`) com facetas exatas:** Quando `search` (não `#id`) estiver presente, executa uma query leve `.select("id")` com o filtro textual e restringe o índice em memória ao `Set<number>` resultante antes de calcular as facetas. Para `#123` (`id`), restringe ao `id === 123`.
   - **Cálculo cruzado padrão multi-select:** Para cada dimensão $D$, filtra as linhas do índice por **todas as demais dimensões ativas exceto $D$**; a opção `"Todas"`/`"Todos"` de $D$ mostra o total desse subconjunto, e cada valor $v \in D$ mostra quantas linhas desse subconjunto satisfazem $v$. Itens com `count === 0` não são exibidos nos dropdowns (exceto valores eventualmente já selecionados até serem desmarcados, evitando sumiço brusco).
   - **Anos reais dinâmicos:** Remove completamente `ACERVO_ANOS_COUNTS` hardcoded; anos e contagens vêm integralmente do índice real.

### 4.2 Paginação Determinística Sem Repetições (`frontend/app/api/questions/route.ts`)

* Remover `isColdStart` (`fetchLimit = 45` e `sortQuestionsByQuality(...).slice(0, limit)`) do fluxo `GET` quando `!preference`.
* Manter a ordenação SQL estável única `.order("ano", { ascending: false, nullsFirst: false }).order("id", { ascending: false })` em todas as páginas (`range(offset, offset + limit - 1)`), garantindo disjuntividade total entre Página 1, Página 2, ..., Página N e visibilidade das questões mais recentes (`2026`, inclusive `LemmaS`).
* Quando `preference` estiver ativo (`cohorts`), preservar a lógica disjunta existente e adicionar `search` / `subtopico` ao `buildBaseQuery` para que ambas as rotas respeitem todos os filtros ativos.
* Manter uma rota rápida de resposta quando `sortQuestionsByQuality` ainda fizer sentido **apenas** em listas fechadas já fatiadas (ex.: amostras pequenas do `POST`), mas nunca após paginar `range` sem cobrir todas as páginas. *(Chamada técnica de design: no `POST` usado para montar simulado de até `N` questões filtradas, respeitar `filters.subtopico`, `filters.search`, `filters.categoria_banca`, etc.)*

### 4.3 UI de Filtros, Subtópicos, Cards e Trilhas Rápidas (`frontend/app/(app)/questoes/page.tsx`)

1. **Trilhas rápidas ajustadas:**
   - Renomear pills `"Cálculo 3 (CEDERJ)"` → `"Cálculo 3"` e `"Álgebra Linear I (CEDERJ)"` → `"Álgebra Linear I"` (ou sufixo neutro que não prometa só CEDERJ), filtrando pela matéria inteira (ex.: `232` CEDERJ + `10` LemmaS = `242` em Cálculo 3).
   - Como `Cálculo 3` e `Álgebra Linear I` passam a constar em `data.materias` com contagem real (> 0), o auto-reset em `L521-527` deixa de zerar a seleção ao carregar, mantendo segurança apenas caso um valor realmente não exista mais com outros filtros ativos (e exibindo feedback claro se a combinação retornar 0, sem apagar filtros silenciosamente caso `topico`/`subtopico` seja escolhido).

2. **Popover `Matéria, Tópico & Subtópico`:**
   - Rótulo do botão passa a indicar seleção combinada (Matéria / Tópico / Subtópico).
   - Dentro do mesmo popover (mantendo 5 botões na barra sem estourar o celular):
     1. **Grandes Áreas** (inclui `Cálculo 3` e `Álgebra Linear I` com contagens reais);
     2. Campo único **Buscar tópico ou subtópico...** filtrando ambas as seções em tempo real;
     3. **Tópicos Específicos** (lista completa contextualizada com contagens reais, ordenada por volume desc, com badge `selected` e limpeza);
     4. **Subtópicos** (seção própria logo abaixo, listando os subtópicos contextualizados pelos filtros ativos + Grande Área/Tópico selecionado, com multi-select e envio no parâmetro `subtopico=`).
   - Chips de resumo de filtros ativos e `limparFiltros` passam a incluir `subtopicoFiltro`.

3. **Correções de Card e Escapes:**
   - Corrigir escapes inválidos `"\frac"`, `"\sqrt"`, `"\begin"`, `"\sum"`, `"\int"`, `"\lim"` → `"\\frac"`, `"\\sqrt"`, `"\\begin"`, `"\\sum"`, `"\\int"`, `"\\lim"` na detecção de alternativas complexas.
   - Corrigir plural dinâmico no badge do header: `1 Questão Auditada` vs `N Questões Auditadas`.
   - Adicionar no rodapé de cada card um botão/link direto **`Resolver na Lousa →`** apontando para `/resolver?id=${q.id}` (abrindo em Modo Treino por padrão).

### 4.4 Modais, Stacking Context e Responsividade Mobile/Desktop

1. **Modais em Portal (`CriarSimuladoModal.tsx`, `ReportarQuestaoModal.tsx`):**
   - Renderizar o overlay via `ReactDOM.createPortal(..., document.body)` (com guarda `mounted` SSR-safe e bloqueio opcional de scroll/ESC) usando `z-[100]`, escapando do `<main className="relative z-10">` em `layout.tsx` (preservando `z-10` do `<main>` contra `<AppBackground style={{ zIndex: 1 }}>` sem afetar outras rotas).
   - Ajustar container do overlay de `CriarSimuladoModal` para `items-start sm:items-center py-6 overflow-y-auto`, impedindo que o cabeçalho e o botão `X` sejam cortados em viewports pequenos (`390×844` ou altura reduzida).
   - Em `CriarSimuladoModal.tsx`, sincronizar `quantidadeDesejada` e `origemQuestoes` via `useEffect` sempre que `isOpen` passar a `true` (ou enquanto aberto quando `totalFiltradas` atualizar de `0` para `> 0`), definindo `selectedIds.length` se houver seleção ou `Math.min(20, totalFiltradas)` caso contrário.

2. **Popovers de Filtro Responsivos no Mobile (`questoes/page.tsx`):**
   - Em telas `< sm` (`390×844`), evitar que popovers ancorados em botões à direita da linha abram para fora da borda direita (`x > 390`) ou abaixo da viewport: usar posicionamento seguro no mobile (ex.: `fixed inset-x-3 top-auto` ou container âncora com `max-w-[calc(100vw-24px)]` / alinhamento dinâmico/centralizado em `< sm` e `sm:absolute sm:left-auto sm:right-0` no desktop, com `max-h-[70vh] overflow-y-auto`).
   - Exibir o rótulo do checkbox `"Selecionar página"` no mobile (remover `hidden sm:inline` ou usar texto compacto `"Selecionar pág."` legível em `390px`).

3. **`/opinioes` e `/login`:**
   - Em `frontend/app/(app)/opinioes/page.tsx`, retirar o botão `"Comparar Abordagens"` de dentro da sobreposição do `<textarea>` (`absolute right-3 bottom-4`), posicionando-o em barra de ação abaixo do `<textarea>` (ou garantindo padding-bottom suficiente se só desktop — mas barra abaixo funciona limpo no Desktop e no Mobile sem cobrir texto digitado).
   - Em `frontend/components/LegalConsentCheckbox.tsx`, mover os `<Link>`s (`/termos` e `/privacidade`) para fora do `<label htmlFor="legal-consent">` dentro do container flex/texto adjacente, eliminando colisão de hitbox e aninhamento interativo inválido.

### 4.5 Fluxo `/resolver?id=...` e Polimento do Modo Foco (`resolver/page.tsx`)

* No `CASO 1` (`if (queryId)` em `frontend/app/(app)/resolver/page.tsx`), inverter o padrão para **`modeQuery === "simulado" ? "simulado" : "treino"`** (e `totalTimeInitial = 0`, `timeLeft = 0` quando em treino). Assim, qualquer acesso via landing, dashboard, banco de questões ou link direto `/resolver?id=123` abre em **Modo Treino Livre** com Dicas Socráticas N1–N5 e Lousa habilitadas, reservando o Simulado oficial para `?mode=simulado` ou `?session=simulado`.
* Remover o emoji `"✨"` duplicado ao lado de `<Sparkles />` em `"✨ Modo Foco Imersivo"`.

### 4.6 Blindagem do Parser KaTeX (`frontend/components/math/MathDisplay.tsx`)

1. **Ordem de proteção de moeda `R$`:** Mover a substituição `R$` → `TOKEN_REAL` para **antes** da primeira etapa de `sanitizeMathText` (ou protegê-la internamente logo no topo de `sanitizeMathText` e restaurá-la na saída conforme o contexto texto vs math), impedindo que `R$` feche/abra pares com fórmulas `$...$` subsequentes (`#333`). Preservar tratamento seguro de texto + LaTeX em `math-parser` sem quebrar testes existentes.
2. **Heurística `words.length >= 2` sem falsos positivos em macros LaTeX (`sanitizeMathText` e `renderMathText` Stage 4):**
   - Antes de contar palavras em português dentro de `$...$`, remover comandos LaTeX **com seus argumentos de comando** como `\operatorname{[^}]+}`, `\begin\{[^}]+\}`, `\end\{[^}]+\}`, `\mathrm\{[^}]+\}`, `\mathcal\{[^}]+\}`, `\mathbf\{[^}]+\}`, além de `\text\{[^}]+\}` e comandos simples `\\[a-zA-Z]+`.
   - Mesmo se restarem palavras, **não** desembrulhar quando o trecho contiver estrutura matemática inequívoca (`\frac`, `\begin{`, `\operatorname`, `\sqrt`, `\sum`, `\int`, `\lim`, `^`, `_`, `=`, etc.) misturada só com rótulos curtos, evitando rasgar expressões como `\operatorname{arcsen}(...)` (`#22966`), `\operatorname{sen}` (`#83`) ou `$A = \begin{pmatrix}...\end{pmatrix}$` (`#59`).
3. **Quebras de linha literais `\n` (`sanitizeMathText` L173):**
   - Converter `\n` literal (barra invertida + `n` em ASCII) para quebra de linha real `\n` sempre que **não** for comando LaTeX conhecido começando por `\n` (`\neq`, `\ne`, `\notin`, `\ni`, `\nu`, `\nabla`, `\natural`, `\nexists`, `\neg`, `\ncong`, `\nmid`, `\nleq`, `\ngeq`, `\nless`, `\ngtr`, `\nsubset`, `\nsubseteq`, `\nsupset`, `\nsupseteq`, `\nparallel`, `\nrightarrow`, `\nleftarrow`, `\nRightarrow`, `\nLeftarrow`, `\nolimits`, `\normalsize`, `\noindent`, `\newline`), corrigindo `#333` (`\nClasses`, `\nB`, `\nC`, `\nSe`) e outras `956` questões sem quebrar macros reais.
4. **Suporte a `\overparen`:** Registrar macro `"\\overparen": "\\widehat{#1}"` (ou arco compatível em KaTeX, garantindo `throwOnError` limpo nas 8 questões como `#330`).

---

## 5. Decisões Deixadas Explícitas (Chamadas de Design & Espaço para o Implementador)

* **Chamadas já tomadas neste design:**
  * **Taxonomia canônica 1:1 disjunta por `materia` exata (Opção 1):** todas as 16 matérias do banco são exibidas sem cruzamento por substring (`Geometria Plana` separada de `Espacial`/`Analítica`, `Cálculo` separada de `Cálculo 3`, `Álgebra Linear I` separada de `Matrizes`/`Determinantes` do Ensino Médio, `Álgebra Linear II (7)` mantida via corte `count > 0` em vez de `>= 10`, `"Matemática (Geral)"` mapeada ao valor residual `"Matemática"` até o Ciclo 2);
  * **Semântica exata de chips vs busca textual:** filtros estruturados `topico=` e `subtopico=` usam correspondência exata case-insensitive (`trim().toLowerCase()` em memória e `.ilike."Valor Exato"` sem coringas `%` / `.eq` no PostgREST) para garantir paridade exata entre `(N)` e `total`; `%substring%` fica reservado a `search=`; em `preferenceGroups` (`route.ts`), generalizar a reescrita de não-nulo para aceitar `.eq.` além de `.ilike.` (ou manter `.ilike` sem `%`);
  * Uso de índice leve em cache TTL 120s no servidor Next.js em vez de migration SQL no Ciclo 1;
  * Subtópicos exibidos dentro do popover `Matéria, Tópico & Subtópico` mantendo 5 botões na barra mobile;
  * Pills renomeadas (`Cálculo 3`, `Álgebra Linear I`) filtram a matéria completa (`CEDERJ` + `LemmaS`), sem travar `banca=CEDERJ`;
  * `/resolver?id=...` abre em `treino` por padrão (simulado só com `?mode=simulado` ou `?session=simulado`);
  * `POST /api/questions` passa a suportar `subtopico`, `search`, `categoria_banca`, `tipo_prova` e `fase_nivel` para alimentar `CriarSimuladoModal` e `Treinar Lista`.
* **Deixado para o implementador no plano detalhado:**
  * Estrutura interna de memoização/cache (com deduplicação de Promise concorrente em `globalThis`/módulo) e helper de serialização PostgREST;
  * Styling detalhado de responsividade dos popovers mobile e da barra abaixo do `<textarea>` em `/opinioes` mantendo suporte aos temas light/dark;
  * Casos de teste específicos adicionados em `frontend/scripts/` (testando regressões reais de `#59`, `#83`, `#330`, `#333`, `#22966`, filtros `Cálculo 3` / `Álgebra Linear I`, `subtopico`, contagens cruzadas e paginação disjunta).

---

## 6. Critérios de Verificação do Ciclo 1

1. Todos os testes `node --test` (existentes + novas suítes para `question-filters` e `MathDisplay` sanitização/parse) aprovados com `0` falhas;
2. `npm run build` (`next build` + TypeScript) aprovado com `0` erros;
3. Verificação em navegador real (Chromium `1440×900` Desktop e `390×844` Mobile contra build local/servidor ligado ao Supabase) comprovando:
   - `Cálculo 3` retorna `242` questões (`CEDERJ + LemmaS`) e `Álgebra Linear I` funciona sem resetar;
   - Subtópicos filtram e exibem contagens exatas (`EsPCEx` mostra contagens reais do recorte);
   - Página 1 → Página 2 com `0` cards repetidos;
   - Modal `Criar Simulado` abre com `20` questões padrão (ou total selecionado), acima da navbar e fechável em Desktop e Mobile;
   - Popovers e `/opinioes` sem overflow nem sobreposição no viewport `390×844`;
   - Questões `#22966`, `#83`, `#59`, `#333`, `#330` renderizam fórmulas sem LaTeX cru nem erros de `\n`/`R$`;
   - `/resolver?id=23214` abre em `Modo Treino Livre` com Dicas habilitadas e sem ícone `✨` duplicado.
