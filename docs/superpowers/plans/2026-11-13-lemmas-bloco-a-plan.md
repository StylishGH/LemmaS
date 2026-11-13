# Ciclo 1 (Bloco A): Correções Estruturais de Filtros, Subtópicos, Paginação, Mobile, Simulado, /resolver e KaTeX — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir todas as falhas estruturais da frente Bloco A no LemmaS (filtros com contagens exatas, exposição de subtópicos reais, trilhas rápidas, paginação disjunta, modais em Portal acima da navbar, responsividade mobile `390×844`, `/resolver?id=...` em modo treino por padrão e blindagem do parser KaTeX) mantendo compatibilidade total com dark/light mode e zero mutações de banco neste ciclo.

**Architecture:** Extrair a lógica pura de taxonomia canônica 1:1, serialização/predicado PostgREST e agregação cruzada sobre índice leve de metadados em cache (`TTL = 120s`, lotes de `1.000` linhas respeitando `PGRST_DB_MAX_ROWS`) para `frontend/lib/question-filters.ts`, consumido igualmente por `GET` e `POST /api/questions`. Em paralelo, isolar o núcleo puro de sanitização/parse KaTeX em `frontend/lib/math-sanitize.ts`, elevar os modais via `createPortal` para `document.body`, atualizar `/questoes` com seção dedicada de Subtópicos e corrigir `/opinioes` e `/resolver`.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript 5, Tailwind CSS v4 (`@custom-variant dark`), KaTeX 0.19, Supabase PostgREST (`@supabase/supabase-js`), Node.js `node:test` + `typescript.transpileModule`.

**Spec:** [2026-11-13-lemmas-bloco-a-design.md](file:///mnt/dados/dev/LemmaS/docs/superpowers/specs/2026-11-13-lemmas-bloco-a-design.md)

## Global Constraints

- **Escopo estrito Ciclo 1:** ZERO DDL, migrations SQL, RPCs novas ou mutações em linhas de `public.questoes` no Supabase (`Bloco B` fica para ciclo próprio pós-Bloco A).
- **Limite PostgREST (`PGRST_DB_MAX_ROWS = 1000`):** Toda leitura em lote no Supabase DEVE paginar em janelas de `1000` linhas (`range(offset, offset + 999)`) e verificar o total real — nunca usar passo `5000` nem parar só porque `chunk.length < 5000`.
- **Fonte Única de Verdade (DRY):** `GET /api/questions`, `POST /api/questions` e `computeCrossFilteredFacets` compartilham exatamente as mesmas definições em `frontend/lib/question-filters.ts`.
- **Taxonomia Canônica 1:1 (Opção 1):** 16 categorias mutuamente disjuntas mapeadas por `materia` exata (sem corte `count >= 10`, exibindo `"Matemática"` como `"Matemática (Geral)"`, mantendo `Cálculo` separada de `Cálculo 3` e `Álgebra Linear I` separada do Ensino Médio).
- **Contraste Dual-Theme & Responsividade:** Preservar tokens/variantes light e dark em todos os componentes tocados (`docs/roadmap.md` + `AGENTS.md`).
- **CI Gate:** Todas as suítes `node --test` e `npm run build` (`next build` + TypeScript) devem passar com `0` falhas sem depender de rede externa durante o build.

## Review Focus

- **`subtopico` com vírgulas, parênteses e LaTeX (`31` com `,`, `51` com `()`, `5` com `\mathbb`/`\infty`):** Envio via query params repetidos (`append("subtopico", v)` / `getAll("subtopico")`) + arrays nativos em `POST` e escape em duas etapas (`escapeLikeLiteral` dentro de `escapePostgrestQuoted` / `.eq.` com variantes brutas) — testado especificamente com `"Baricentro, Incentro, Circuncentro, Ortocentro"`, `"Caça aos Ângulos (Angle Chasing)"` e `"Cálculo de Limites em $\\mathbb{R}^3$"` (Tasks 1 e 2).
- **Conflitos de capitalização em `topico` (`1` par em Cálculo 3) e `subtopico` (`33` pares):** Normalização `trim().toLowerCase()` como chave canônica nos contadores de faceta combinada a filtro case-insensitive (`.ilike` literal escapado ou expansão das variantes brutas em `.eq.`), impedindo chips duplicados ou contagens parciais — testado em Task 1 (`Limites de Funções de Várias Variáveis` + `Limites de funções de várias variáveis`).
- **Falha parcial ou truncamento ao carregar índice em cache (21.638 linhas / 22 páginas de 1.000):** Loader do índice em cache (`TTL = 120s`, deduplicação in-flight) aborta e NÃO grava snapshot parcial em memória se qualquer lote de 1.000 falhar — testado com cliente Supabase mockado em Task 1.
- **`\not` (15 questões) vs `\n` literal (`956+` questões `\nSe`/`\na)`/`\nnas`) e moeda `R$` antes de `$...$` (`#333`):** `\not` mantido na allowlist de comandos `\n*` enquanto `\nClasses`/`\nnas`/`\nA` viram quebras reais; `R$` convertido antes de `sanitizeMathText` para sentinela PUA sem letras e restaurado só na saída — testado em Task 3.
- **Race condition em `CriarSimuladoModal` (`totalFiltradas` `0 -> N` ao abrir) e clipping no viewport `390×844`:** `useEffect` sincronizando `quantidadeDesejada` e `origemQuestoes` na abertura/mudança positiva de `totalFiltradas`, e overlay em Portal `z-[100]` com `items-start sm:items-center py-6 overflow-y-auto` — verificado em Task 4 e Task 7.

---

## Mapa de Paralelismo (Arquivos Disjuntos)

| Trilha | Tasks | Arquivos Criados / Modificados | Depende de |
| :--- | :--- | :--- | :--- |
| **Track 1 (Engine & API)** | Task 1 → Task 2 | `frontend/lib/question-filters.ts`, `frontend/scripts/test-question-filters.mjs`, `frontend/app/api/questions/route.ts` | — |
| **Track 2 (KaTeX Parser)** | Task 3 | `frontend/lib/math-sanitize.ts`, `frontend/components/math/MathDisplay.tsx`, `frontend/scripts/test-math-display.mjs` | — |
| **Track 3 (Modais & `/questoes`)** | Task 4 (paralela), Task 5 (pós-Task 1/2) | Task 4: `CriarSimuladoModal.tsx`, `ReportarQuestaoModal.tsx`, `LegalConsentCheckbox.tsx`<br>Task 5: `frontend/app/(app)/questoes/page.tsx` | Task 5 depende do contrato de Task 1/2 |
| **Track 4 (`/opinioes` & `/resolver`)** | Task 6 | `frontend/app/(app)/opinioes/page.tsx`, `frontend/app/(app)/resolver/page.tsx` | — |
| **Gate Final (CI & E2E)** | Task 7 | `.github/workflows/ci.yml` + verificação build/browser | Tasks 1–6 |

---

### Task 1: Módulo Compartilhado `question-filters.ts` (Taxonomia 1:1, Índice em Cache 120s, Predicados & Facetas Cruzadas)

**Files:**
- Create: `frontend/lib/question-filters.ts`
- Test: `frontend/scripts/test-question-filters.mjs`

**Interfaces:**
- Consumes: `@supabase/supabase-js` apenas como `type { SupabaseClient }` (zero imports runtime externos ou `@/` para manter transpilação direta no `node:test`).
- Produces (`frontend/lib/question-filters.ts`):
  - `CANONICAL_MATERIAS: ReadonlyArray<{ uiName: string; dbValue: string }>` (16 entradas disjuntas 1:1, incluindo `dbValue: "Matemática"` ↔ `uiName: "Matemática (Geral)"`);
  - `getUiMateriaName(rawDbMateria: string | null | undefined): string | null` e `getDbMateriaValue(uiOrDbName: string): string | null`;
  - `type QuestionFilterInput` (`banca?: string[]`, `categoria_banca?: string[]`, `tipo_prova?: string[]`, `fase_nivel?: string[]`, `tipo_material?: string[]`, `tem_figura?: boolean | null`, `materia?: string[]`, `topico?: string[]`, `subtopico?: string[]`, `ano?: number[]`, `tipo?: string[]`, `dificuldade?: Array<"facil" | "media" | "dificil" | "nao_classificada">`, `search?: string | null`, `id?: number | null`, `ids?: number[] | null`, `lema?: string | null`);
  - `type MetadataRow` (`id, banca, categoria_banca, tipo_prova, fase_nivel, tipo_material, figura_path, ano, tipo, dificuldade, materia, topico, subtopico, lema_id, lema_codigo`);
  - `parseGetFilterParams(searchParams: URLSearchParams): QuestionFilterInput` (usando `.getAll("subtopico")` sem quebrar vírgulas internas);
  - `parsePostFilterParams(rawFilters: Record<string, unknown>, opts?: { ids?: unknown }): QuestionFilterInput`;
  - `escapePostgrestQuoted(val: string): string` e `escapeLikeLiteral(val: string): string`;
  - `buildPostgrestFilterClauses(filters: QuestionFilterInput, index?: QuestionTaxonomyIndex | null): { andEqOrClauses: Array<{ kind: "eq" | "in" | "or" | "is" | "not_is"; column?: string; value?: unknown }>; }` — ou método direto `applyFiltersToPostgrestQuery(query: any, filters: QuestionFilterInput, index?: QuestionTaxonomyIndex | null): any` + helper puro `compileFilterPredicatesForTest(filters, index)` para testar strings PostgREST sem banco;
  - `rewritePreferenceGroupForNonNull(group: string): string` (suporta `.eq.` e `.ilike.` preservando semântica de coortes);
  - `getQuestionMetadataIndex(supabase: SupabaseLike, opts?: { forceRefresh?: boolean; ttlMs?: number }): Promise<QuestionTaxonomyIndex>` (paginação em lotes de `1000`, `Promise` in-flight deduplicada, `TTL = 120_000` ms, sem gravar cache em falha parcial);
  - `clearQuestionMetadataIndexCache(): void` (para testes determinísticos);
  - `computeCrossFilteredFacets(index: QuestionTaxonomyIndex, filters: QuestionFilterInput, matchingIdsFromSearch?: Set<number> | null): CrossFilteredFacetsResult` retornando exatamente as estruturas `{ bancas, categorias_banca, tipos_prova, fases, materias, materias_com_topicos, topicos, subtopicos, anos, ano_min, ano_max, tipos, dificuldades, total_filtered }`.

- [ ] **Step 1: Write the failing test suite (`frontend/scripts/test-question-filters.mjs`)**

Criar `frontend/scripts/test-question-filters.mjs` transpilando `frontend/lib/question-filters.ts` via `typescript.transpileModule` (padrão de `scripts/test-question-page-cache.mjs`) cobrindo:
1. **Taxonomia 1:1 disjunta & "Matemática (Geral)":** `CANONICAL_MATERIAS.length === 16`; `"Cálculo"` não aceita `"Cálculo 3"`; `"Cálculo 3"` mapeia 1:1; `"Álgebra Linear I"` não aceita `"Matrizes"` quando `materia = "Álgebra Linear"`; `"Matemática"` ↔ `"Matemática (Geral)"`; nenhuma categoria ocultada por corte `>= 10` (`Álgebra Linear II` com `1` linha aparece).
2. **`subtopico` com vírgula, parênteses, LaTeX e case conflicts:**
   - `parseGetFilterParams(new URLSearchParams([["subtopico", "Baricentro, Incentro, Circuncentro, Ortocentro"], ["subtopico", "Cálculo de Limites em $\\mathbb{R}^3$"]]))` preserva exatamente os 2 elementos inteiros (`subtopico.length === 2`);
   - Na faceta `subtopicos` e `topicos`, `"Limites de Funções de Várias Variáveis"` (2 linhas) + `"Limites de funções de várias variáveis"` (1 linha) são agrupadas em **1 item** com `count === 3`, e o filtro `subtopico: ["Limites de Funções de Várias Variáveis"]` casa todas as 3 linhas em memória E gera predicado SQL que casa as 2 variações (`.eq."Limites de Funções de Várias Variáveis"` + `.eq."Limites de funções de várias variáveis"`, ou `.ilike` escapado);
   - `"Cálculo de Limites em $\\mathbb{R}^3$"` gera escape seguro de `\` e `"` para PostgREST (`escapePostgrestQuoted` / `escapeLikeLiteral`).
3. **Contagem cruzada nas 10 dimensões + `search` via `matchingIdsFromSearch`:**
   - Dataset sintético com `Cálculo 3` (CEDERJ + LemmaS), `Álgebra Linear I` (CEDERJ), `EsPCEx` (com `Determinantes`), `ITA` 2026:
     - Filtrando `materia: ["Cálculo 3"]` → `total_filtered === count("Cálculo 3")`, `materias` ainda lista outras matérias disponíveis no subconjunto sem filtro de matéria (excluindo só o próprio filtro `materia`), e `subtopicos` / `topicos` / `bancas` / `anos` refletem estritamente os registros de `Cálculo 3`;
     - Passando `matchingIdsFromSearch = new Set([id1, id2])`, todas as 10 facetas contabilizam apenas `[id1, id2]`.
4. **Índice em cache (`TTL 120s`, lotes de `1.000`, rollback em erro parcial e deduplicação concorrente):**
   - Mock Supabase com `2.500` linhas retornando no máximo `1.000` por chamada `.range(from, to)`: confirma que carrega todas as `2.500` linhas em 3 chunks (`0..999`, `1000..1999`, `2000..2499`);
   - Chamadas simultâneas executam 1 único carregamento in-flight;
   - Se o 2º chunk retornar `{ error: { message: "timeout" } }`, a Promise rejeita e o cache permanece vazio (não grava snapshot incompleto de 1.000 linhas).
5. **Reescrita de coortes em `rewritePreferenceGroupForNonNull`:**
   - Preserva ambos operadores `col.eq."Cálculo"` → `and(col.not.is.null,col.eq."Cálculo")` e `col.ilike."%ITA%"` → `and(col.not.is.null,col.ilike."%ITA%")`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && node --test scripts/test-question-filters.mjs`  
Expected: FAIL (`ENOENT` em `../lib/question-filters.ts`).

- [ ] **Step 3: Implement `frontend/lib/question-filters.ts`**

Implementar em `frontend/lib/question-filters.ts`:
- Mapa 1:1 das 16 matérias (`CANONICAL_MATERIAS` na ordem/rótulos definidos no Design Doc §4.1, com `"Matemática"` mapeando ↔ `"Matemática (Geral)"`);
- Parsers `parseGetFilterParams` (`subtopico` lido via `searchParams.getAll("subtopico")` sem split por `,`; `banca`/`materia`/`topico`/etc. mantendo split multi-select `,` com descarte de `"Todas"`/`"Todos"`) e `parsePostFilterParams` (suportando `filters.subtopico` como `string[]` ou `string`, `categoria_banca`, `tipo_prova`, `fase_nivel`, `search`, `id`, `lema`, `ano`, `tipo`, `dificuldade`);
- Predicados unificados:
  - `matchesMetadataRow(row, filters, matchingIdsFromSearch?)` usado tanto pelo índice quanto por testes de paridade 1:1;
  - `applyFiltersToPostgrestQuery(query, filters, index?)` gerando exatamente a mesma semântica em PostgREST:
    - `materia`: converte `"Matemática (Geral)"` → `"Matemática"` via `getDbMateriaValue` e usa `materia.eq."..."` (exato e imune a substring);
    - `topico` e `subtopico`: se `index` estiver presente, resolve todas as grafias originais encontradas para `val.trim().toLowerCase()` no índice e emite `col.eq."${escapePostgrestQuoted(raw)}"` (imune a `\mathbb`, `,`, `()`, `_`, `%` e case-folding); se `index` for nulo, emite `col.ilike."${escapePostgrestQuoted(escapeLikeLiteral(val))}"`;
    - `banca`: mantém suporte a `Nível 2` / `Nível 3` (`and(banca.ilike.%OBM%,fase_nivel.ilike.%Nível 2%)`), mas para bancas comuns como `"ITA"`, `"ENEM"`, `"CEDERJ"`, `"Olimpíada de Bay Area (BAMO)"`, usar match consistente no índice e no SQL (`index` usa case-insensitive substring ou exata alinhada com SQL `.ilike` escapado — ATENÇÃO: usar a **mesma regra exata** em `matchesMetadataRow` e no SQL! Se `"ENEM"` e `"ITA"` não devem colidir por substring, ex: verificar se `banca.ilike."...valor..."` ou substring: para `banca` no DB não há conflito entre nomes canônicos ou testar com `test-question-personalization.mjs`: em `route.ts` anterior `banca` usava `banca.ilike.%${val}%` e `bancaValues` são nomes exatos das 60 bancas sem case conflicts; portanto usar `.eq."${escapePostgrestQuoted(raw)}"` quando conhecido no índice ou case-insensitive exato garante que `"EN"` (Escola Naval alias?) vs `"ENEM"` NUNCA vaze! Melhor verificar: existe `"EN"` como banca ou `"Escola Naval"`? Em 60 bancas, `banca.eq` case-insensitive para chips selecionados ou exact lookup garante 1:1 exato entre contagem de banca e total retornado! Manter fallback substring apenas para `OBM Nível 2`/`3` e `prefer_banca`);
    - `search`: mantido `%substring%` em `enunciado, topico, subtopico, materia` (e `id` exato se `#123` ou `filters.id`).
- Loader `getQuestionMetadataIndex(supabase, opts)`:
  - Paging estrito de `CHUNK_SIZE = 1000`: busca página 0 com `{ count: "exact" }` e colunas leves (`id, banca, categoria_banca, tipo_prova, fase_nivel, tipo_material, figura_path, ano, tipo, dificuldade, materia, topico, subtopico, lema_id, lema_codigo`), calcula total de páginas `Math.ceil(total / 1000)` e carrega as páginas restantes em batches concorrentes (ex.: concorrência 6), validando `error` em cada batch; em qualquer erro ou truncamento inesperado, lança erro sem cachear;
  - Deduplicação de promise in-flight em `globalThis` + TTL de `120_000` ms;
  - Constrói lookup maps pré-indexados (`topicVariantsByLower`, `subtopicVariantsByLower`, `canonicalTopicsDisplay`, `canonicalSubtopicsDisplay`) escolhendo o label de maior frequência (desempate lexical).
- `computeCrossFilteredFacets(index, filters, matchingIdsFromSearch)`:
  - Para cada dimensão $D$, filtra `index.rows` ignorando **apenas** $D$ no `filters` (+ `matchingIdsFromSearch` se `search` estiver ativo), agregando contagens exatas (> 0), ordenadas por contagem desc (anos desc; dificuldades na ordem `facil`, `media`, `dificil`, `nao_classificada`), sem `ACERVO_ANOS_COUNTS` hardcoded e sem corte `>= 10`.
  - Constrói `materias_com_topicos` agrupando tópicos contextualizados por Grande Área (com `materias` > 0).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && node --test scripts/test-question-filters.mjs`  
Expected: PASS com todos os casos verdes (`0` falhas).

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/question-filters.ts frontend/scripts/test-question-filters.mjs
git commit -m "feat(filters): add 1:1 canonical taxonomy, cached metadata index, and exact cross-filtered facets"
```

---

### Task 2: Refatorar `GET` e `POST` em `frontend/app/api/questions/route.ts`

**Files:**
- Modify: `frontend/app/api/questions/route.ts`
- Test: `frontend/scripts/test-question-filters.mjs` (estender com teste de comportamento da reescrita/contrato ou `scripts/test-question-personalization.mjs`)

**Interfaces:**
- Consumes (`frontend/lib/question-filters.ts`): `CANONICAL_MATERIAS`, `parseGetFilterParams`, `parsePostFilterParams`, `applyFiltersToPostgrestQuery`, `rewritePreferenceGroupForNonNull`, `getQuestionMetadataIndex`, `computeCrossFilteredFacets`, `getDbMateriaValue`.
- Produces (`GET /api/questions` JSON): mantém todas as chaves anteriores (`questoes`, `total`, `page`, `limit`, `total_pages`, `bancas`, `categorias_banca`, `tipos_prova`, `fases`, `materias`, `materias_com_topicos`, `topicos`, `anos`, `ano_min`, `ano_max`, `tipos`, `dificuldades`) e adiciona `subtopicos: Array<{ name: string; count: number }>`, onde o primeiro item de `topicos` e `subtopicos` representa `"Todos"` com `count` exato do recorte sem aquela dimensão.
- Produces (`POST /api/questions` JSON): aceita `ids` OU `filters` completo (agora incluindo `subtopico`, `search`, `categoria_banca`, `tipo_prova`, `fase_nivel`, `id`) usando `applyFiltersToPostgrestQuery`.

- [ ] **Step 1: Escrever teste de contrato adicional para filtros `POST` / preferência `Matemática (Geral)` e `prefer_materia` em `frontend/scripts/test-question-filters.mjs`**

Adicionar casos garantindo:
- `parsePostFilterParams({ materia: "Matemática (Geral)", subtopico: ["Baricentro, Incentro, Circuncentro, Ortocentro"], search: "Stokes", categoria_banca: "Concurso Militar", tipo_prova: "Oficial", fase_nivel: "Geral" })` preserva todos os campos;
- `getPreferMateriaPostgrestGroup("Cálculo 3")` emite `materia.eq."Cálculo 3"` (disjunta de `"Cálculo"`);
- `rewritePreferenceGroupForNonNull` reescreve corretamente `or(materia.eq."Cálculo 3")` → `or(and(materia.not.is.null,materia.eq."Cálculo 3"))`.

- [ ] **Step 2: Run test to verify new test fails**

Run: `cd frontend && node --test scripts/test-question-filters.mjs`  
Expected: FAIL no novo helper ainda não exportado (ou ajustar helper em `question-filters.ts`).

- [ ] **Step 3: Atualizar `frontend/app/api/questions/route.ts` (e exportar `buildPreferMateriaClause` em `question-filters.ts` se necessário)**

Principais mudanças diretas em `frontend/app/api/questions/route.ts`:
1. Remover `CANONICAL_CATEGORIES` antigo (L7-158) e `ACERVO_ANOS_COUNTS` hardcoded (L677-710) e as RPCs `get_question_filter_counts` / `get_lemmas_global_stats` como fonte das facetas.
2. Em `GET`:
   - Parsear filtros via `parseGetFilterParams(searchParams)`;
   - Carregar índice em cache `await getQuestionMetadataIndex(supabase)`;
   - Se `filters.search` (texto livre) estiver ativo, executar query leve em `public.questoes` selecionando apenas `"id"` com o filtro textual (`search` across `enunciado,topico,subtopico,materia`) paginada estritamente em lotes de `1.000` (`range(offset, offset + 999)` usando `count: "exact"`, respeitando `PGRST_DB_MAX_ROWS`) para montar `matchingIdsFromSearch: Set<number>`, mantendo exatidão nas 10 dimensões cruzadas mesmo com `> 1.000` resultados textuais;
   - Construir `buildBaseQuery(head, exactCount)` aplicando `applyFiltersToPostgrestQuery(query, filters, metadataIndex)`;
   - **Remover `isColdStart` e `sortQuestionsByQuality(...).slice(0, limit)` da listagem paginada padrão (`!preference`):** executar `.order("ano", { ascending: false, nullsFirst: false }).order("id", { ascending: false }).range(offset, offset + limit - 1)` diretamente para Página 1..N;
   - No bloco `preference` (coortes), manter a lógica disjunta existente substituindo a lista antiga por `rewritePreferenceGroupForNonNull` e mapeando `prefer_materia` pela nova taxonomia 1:1 disjunta;
   - Calcular todas as facetas (incluindo `subtopicos`!) via `computeCrossFilteredFacets(metadataIndex, filters, matchingIdsFromSearch)`. Em falha do índice, retornar `503` com `{ error, questoes: [], total: 0, total_pages: 1 }` sem números inventados (mantendo o comentário de L806-808!).
3. Em `POST`:
   - Quando `filters` for passado sem `ids`, usar `parsePostFilterParams(filters)` + `getQuestionMetadataIndex(supabase)` + `applyFiltersToPostgrestQuery`, garantindo suporte pleno a `subtopico`, `search`, `categoria_banca`, `tipo_prova` e `fase_nivel`.

- [ ] **Step 4: Run tests & Typecheck**

Run:
```bash
cd frontend && node --test scripts/test-question-filters.mjs
cd frontend && npx tsc --noEmit
```
Expected: `node --test` PASS (`0` falhas), `tsc --noEmit` PASS (`0` erros).

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/question-filters.ts frontend/app/api/questions/route.ts frontend/scripts/test-question-filters.mjs
git commit -m "refactor(api/questions): use shared filter engine, drop cold-start slice divergence, and return subtopicos facets"
```

---

### Task 3: Blindagem do Parser KaTeX (`math-sanitize.ts` & `MathDisplay.tsx`)

**Files:**
- Create: `frontend/lib/math-sanitize.ts`
- Modify: `frontend/components/math/MathDisplay.tsx`
- Test: `frontend/scripts/test-math-display.mjs`

**Interfaces:**
- Consumes (`frontend/lib/math-parser.ts`): `normalizarMatematica`, `autoWrapLatexExpressions`.
- Produces (`frontend/lib/math-sanitize.ts` e re-exportado por `frontend/components/math/MathDisplay.tsx`):
  - `KATEX_MACROS: Record<string, string>` (incluindo `"\\overparen": "\\widehat{#1}"` e todos os macros atuais de `MathDisplay.tsx` L84-108);
  - `cleanLatexForKatex(latex: string): string`;
  - `sanitizeMathText(raw: string, opts?: { preserveCurrencyToken?: boolean }): string`;
  - `renderMathText(text: string): Array<{ type: "text" | "inline" | "block"; content: string }>`;
  - `TOKEN_REAL = "\uE00001\uE001"` (PUA sem letras/cifrões, evitando colisão com regex de palavras ou `$`).

- [ ] **Step 1: Write the failing test suite (`frontend/scripts/test-math-display.mjs`)**

Transpilar `./lib/math-parser.ts` (para `data:` URL) e `./lib/math-sanitize.ts` (substituindo `"./math-parser"` pelo `data:` URL) e testar com `katex.renderToString(..., { throwOnError: true, macros: KATEX_MACROS })`:
1. **Caso real `#333` (`R$` + `\nClasses` + `\nB` + `\nSe`):**
   - Texto `"R$ 1 680,00.\n\\nClasses A e B\\nSe $x = 10$, qual o lucro?"`:
     - Partes retornam `"R$ 1 680,00."` como `type: "text"` (nunca pareado com `$x = 10$`);
     - `\nClasses` e `\nSe` viram quebras `\n` reais;
     - Expressão `"x = 10"` renderiza no KaTeX sem erro.
2. **Proteção de `\not` e macros `\n*` (`15` questões reais + `\neq`, `\nabla`, `\notin`):**
   - Entrada `"Se $x \\not\\in A$ e $a \\neq b$ e $\\nabla f = 0$\\nLogo funciona."`:
     - Preserva `\not`, `\neq`, `\nabla` intactos (não transforma `\not` em `\n + ot`!);
     - Transforma `\nLogo` em `\nLogo`;
     - KaTeX renderiza todas as partes matemáticas sem erro.
3. **Casos reais `#59`, `#83`, `#22966` (heurística `words.length >= 2` com macros com argumento):**
   - `"Determine $\\operatorname{arcsen}\\left(\\frac{1}{2}\\right)$ e $\\operatorname{sen}(x)$"` → todas as fórmulas permanecem `type: "inline"` (nunca vazam texto cru `\operatorname{arcsen}`);
   - `"Dada $A = \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}$"` (`#59`) → permanece `inline` ou `block` válido e `katex.renderToString` passa com `throwOnError: true`;
   - Frase puramente em português `"$Seja um triângulo de lado igual a cinco$"` ainda é desembrulhada para `type: "text"`.
4. **Macro `\overparen` (`#330`):**
   - `"A medida do arco $\\overparen{AB}$ é $60^\\circ$"` → `katex.renderToString(part.content, { throwOnError: true, macros: KATEX_MACROS })` passa sem `ParseError`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && node --test scripts/test-math-display.mjs`  
Expected: FAIL (`ENOENT` em `../lib/math-sanitize.ts`).

- [ ] **Step 3: Create `frontend/lib/math-sanitize.ts` and refactor `frontend/components/math/MathDisplay.tsx`**

Em `frontend/lib/math-sanitize.ts`:
1. Definir `KATEX_MACROS` (idêntico a `MathDisplay.tsx` L84-108 + `"\\overparen": "\\widehat{#1}"`).
2. Definir `LATEX_N_COMMANDS` (`Set` com `ne`, `neq`, `neg`, `nexists`, `newline`, `notin`, `ni`, `nu`, `nabla`, `natural`, `ncong`, `nmid`, `nleq`, `ngeq`, `nless`, `ngtr`, `nsubset`, `nsubseteq`, `nsupset`, `nsupseteq`, `nparallel`, `nrightarrow`, `nleftarrow`, `nRightarrow`, `nLeftarrow`, `nshortmid`, `nshortparallel`, `nsim`, `nvDash`, `nvdash`, `nVDash`, `nolimits`, `normalsize`, `noindent`, `nonumber`, `notag`, `nobreakspace`, `not`). Substituir `\\r\\n` → `\n` e match `/(\\+)(n[a-zA-Z]*)/g`: só converte quando `slashes.length % 2 === 1` e `!LATEX_N_COMMANDS.has(cmd)`, virando `slashes.slice(0, -1) + "\n" + cmd.slice(1)`.
3. Proteger `R$` via `TOKEN_REAL = "\uE00001\uE001"` **antes** da etapa de delimitadores de `sanitizeMathText`; se chamado sem `preserveCurrencyToken: true`, restaurar `TOKEN_REAL` → `"R$"` na saída de `sanitizeMathText`; dentro de `renderMathText`, chamar `sanitizeMathText(text, { preserveCurrencyToken: true })` e restaurar `TOKEN_REAL` para `"R$"` em `text` e `"R\\$"` em `inline`/`block` (sem letters dentro do token!).
4. Extrair `isLikelyProseMistakenlyWrappedInMath(inner: string, minWords: number): boolean` compartilhada entre `sanitizeMathText` (blocos `$$` e inline `$`) e `renderMathText` Estágio 4:
   - Remove comandos LaTeX **com seus argumentos** (`/\\(?:text|textbf|textit|textrm|operatorname|begin|end|mathrm|mathbf|mathit|mathcal|mathbb|mathsf|mathtt|boldsymbol|color|textcolor|phantom|hspace|vspace)\*?\{[^}]*\}/g`) antes de remover `/\\[a-zA-Z]+/g`;
   - Se contiver estrutura matemática explícita (`\\(?:begin|frac|dfrac|tfrac|sqrt|sum|int|lim|prod|operatorname|binom|overparen)\b`), só trata como prosa se sobrarem `>= Math.max(minWords + 2, 4)` palavras reais fora de comandos; caso contrário usa `words.length >= minWords`.
5. Atualizar `frontend/components/math/MathDisplay.tsx` para importar/re-exportar `cleanLatexForKatex`, `sanitizeMathText`, `renderMathText`, `KATEX_MACROS` de `@/lib/math-sanitize` mantendo a API React e estilos inalterados.

- [ ] **Step 4: Run tests**

Run:
```bash
cd frontend && node --test scripts/test-math-display.mjs scripts/test-math-preview.mjs
cd frontend && npx tsc --noEmit
```
Expected: Ambas as suítes `node --test` PASS e `tsc --noEmit` PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/math-sanitize.ts frontend/components/math/MathDisplay.tsx frontend/scripts/test-math-display.mjs
git commit -m "fix(math): shield R$, safe literal newline replacement, LaTeX macro prose detection, and \\overparen"
```

---

### Task 4: Modais em Portal (`z-[100]`), Estado `Simulado` e Acessibilidade `LegalConsentCheckbox`

**Files:**
- Modify: `frontend/components/CriarSimuladoModal.tsx:3,58-76,186-198`
- Modify: `frontend/components/ReportarQuestaoModal.tsx:1,107-120`
- Modify: `frontend/components/LegalConsentCheckbox.tsx:25-58`

**Interfaces:**
- Mantém exatamente as props existentes (`CriarSimuladoModalProps`, `ReportarQuestaoModalProps`, `LegalConsentCheckboxProps`).

- [ ] **Step 1: Atualizar `frontend/components/CriarSimuladoModal.tsx`**

- Importar `useEffect` de `"react"` e `createPortal` de `"react-dom"`.
- Adicionar `const [mounted, setMounted] = useState(false);` com `useEffect(() => setMounted(true), []);`.
- Adicionar `useEffect` observando `[isOpen, selectedIds.length, totalFiltradas]`: quando `isOpen` abrir (ou enquanto `isOpen` for `true` e `totalFiltradas` transicionar / `selectedIds` mudar), definir:
  - Se `selectedIds.length > 0`: `origemQuestoes = "selecionadas"` e `quantidadeDesejada = selectedIds.length`;
  - Senão: `origemQuestoes = "todas_filtradas"` e `quantidadeDesejada = totalFiltradas > 0 ? Math.min(20, totalFiltradas) : 0`.
  *(Atenção: não resetar manualmente caso o usuário tenha acabado de editar o input numérico enquanto o modal já está aberto com o mesmo `totalFiltradas`; usar uma ref `wasOpenRef` para sincronizar na transição `false -> true` e também quando `quantidadeDesejada === 0 && totalFiltradas > 0`.)*
- Tratar tecla `Escape` quando `isOpen && !loading` e envolver o overlay JSX com `createPortal(..., document.body)` (quando `mounted`), usando `fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 py-6 overflow-y-auto animate-fadeIn`, e `my-auto` ou `my-2 sm:my-8` no card interno para nunca cortar o cabeçalho nem o botão `X` em `390×844`.

- [ ] **Step 2: Atualizar `frontend/components/ReportarQuestaoModal.tsx`**

- Importar `useEffect` de `"react"` e `createPortal` de `"react-dom"`.
- Renderizar o overlay (`fixed inset-0 z-[100] ... p-4 py-6 overflow-y-auto items-start sm:items-center`) via `createPortal(..., document.body)` quando `mounted && isOpen`, e fechar com `Escape` quando `!enviando`.

- [ ] **Step 3: Atualizar `frontend/components/LegalConsentCheckbox.tsx`**

- Mover os dois `<Link>` (`/termos` e `/privacidade`) para fora do `<label htmlFor="legal-consent">` dentro de um container textual (`<div className="leading-relaxed">`), mantendo `<label htmlFor="legal-consent" className="cursor-pointer">Li e concordo com os</label>` apenas no texto de consentimento não-link (ou envolvendo só o texto antes/entre os links com `onClick` / `<span className="...">` + `htmlFor`), eliminando aninhamento inválido de `<a>` dentro de `<label>` em acessibilidade/HITBOX.

- [ ] **Step 4: Run Typecheck**

Run: `cd frontend && npx tsc --noEmit`  
Expected: `0` erros.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/CriarSimuladoModal.tsx frontend/components/ReportarQuestaoModal.tsx frontend/components/LegalConsentCheckbox.tsx
git commit -m "fix(modals,a11y): portal modals above sticky navbar, sync simulado defaults, and unlink nested LegalConsent anchors"
```

---

### Task 5: `/questoes` — Subtópicos, Trilhas Rápidas, Popovers Responsivos Mobile, Escapes e Botão `Resolver`

**Files:**
- Modify: `frontend/app/(app)/questoes/page.tsx`

**Interfaces:**
- Consumes (`GET /api/questions` de Task 2):
  - `data.subtopicos: Array<{ name: string; count: number }>` (onde o primeiro item é `"Todos"` ou itens específicos);
  - `data.materias`, `data.topicos`, `data.anos`, `data.bancas`, `data.categorias_banca`, `data.tipos_prova`, `data.fases`, `data.tipos`, `data.dificuldades`.
- Consumes (`POST /api/questions` de Task 2): envia `filters.subtopico` (`string[] | undefined`), `filters.search`, `filters.categoria_banca`, `filters.tipo_prova`, `filters.fase_nivel`.

- [ ] **Step 1: Adicionar estado, URL sync, reset e parâmetro `subtopico` em `frontend/app/(app)/questoes/page.tsx`**

1. Estado `const [subtopicoFiltro, setSubtopicoFiltro] = useState<string[]>([VAL_TODOS]);` + `const [subtopicosDisponiveis, setSubtopicosDisponiveis] = useState<{ name: string; count: number }[]>([]);` + `numSubtopicos = numSelecionados(subtopicoFiltro, VAL_TODOS)` + `handleSelectSubtopico = (s: string) => toggleFiltro(setSubtopicoFiltro, s, VAL_TODOS)`.
2. Incluir `subtopico` em:
   - leitura inicial da URL (`const urlSubtopicos = sp.getAll("subtopico").map((s) => s.trim()).filter(Boolean)` — se presente, marcar `hasUrlFilters = true` e setar `subtopicoFiltro`);
   - `limparFiltros` (`setSubtopicoFiltro([VAL_TODOS])`);
   - `filtrosAtivosCount` (somar `numSubtopicos > 0 ? 1 : 0`);
   - envio em `GET /api/questions`: `subtopicoFiltro.filter((v) => v !== VAL_TODOS).forEach((s) => params.append("subtopico", s))` *(preserva vírgulas internas intactas!)*.
   - atualização e limpeza segura de `subtopicosDisponiveis` no `.then((data) => ...)`: se `data.subtopicos` vier, atualizar estado e podar seleções que não existam mais; incluir `subtopicoFiltro` no array de dependências do `useEffect`!
   - `fetchFilteredIds`: passar `subtopico: subtopicoFiltro.filter((v) => v !== VAL_TODOS)`, `categoria_banca: categoriaBancaFiltro !== "Todas" ? categoriaBancaFiltro : undefined`, `tipo_prova`, `fase_nivel`, `search: busca.trim() || undefined` (e aumentar `limit` fallback conforme necessário se `CriarSimuladoModal` pedir até `100`, preservando comportamento).
   - `handleTreinarListaEstudo`: incluir `subtopico: subtopicoFiltro.filter((v) => v !== VAL_TODOS)` em `activeFilters`.
   - Em `resumoFiltrosTexto` (L734-736), incluir `subtopicoFiltro` selecionado para que `CriarSimuladoModal` exiba o recorte completo.
   - Chip removível de Subtópico na Linha 3 ao lado de Tópico (`Subtópico: ...`).

- [ ] **Step 2: Atualizar Trilhas Rápidas, Popover `Matéria, Tópico & Subtópico` e Posicionamento Mobile `390×844`**

1. Em `aplicarTrilhaRapida` e JSX das pills (L834-858): renomear rótulos visuais `"Cálculo 3 (CEDERJ)"` → `"Cálculo 3"` e `"Álgebra Linear I (CEDERJ)"` → `"Álgebra Linear I"`, mantendo filtro por matéria (`setMateriaFiltro(["Cálculo 3"])` e `setMateriaFiltro(["Álgebra Linear I"])`, cobrindo CEDERJ + LemmaS = `242` / `59`).
2. Atualizar `topicosBaseDropdown` (L739-754) para usar `topicosDisponiveis.filter((t) => t.name !== VAL_TODOS)` diretamente (já vem cross-filtered pela API respeitando banca, ano, subtópico, busca e uma ou várias matérias selecionadas, evitando o shadowing/contagem obsoleta de `materiasComTopicos`).
3. Atualizar o rótulo do botão do popover `materia` para `"Matéria, Tópico & Subtópico"` (com resumo quando ativo, ex. contando também `numSubtopicos`) e dentro do popover (mantendo 5 botões na barra):
   - Atualizar placeholder da mini-busca `buscaTopicoInterna` para `"Buscar tópico ou subtópico..."`;
   - Filtrar `topicosBaseDropdown` e `subtopicosDisponiveis` (excluindo `VAL_TODOS`) usando `buscaTopicoInterna`;
   - Renderizar seção **Tópicos Específicos** seguida da seção dedicada **Subtópicos** (com botão `"Limpar subtópicos"` quando `numSubtopicos > 0`, botões multi-select com contagem `(N)`, e botão `"Limpar tudo"` do topo resetando matéria, tópico e subtópico).
4. Corrigir posicionamento de TODOS os 5 popovers (`banca`, `materia`, `dificuldade`, `ano`, `formato`) para não vazarem para fora da viewport `390×844`: usar largura segura no mobile (`fixed inset-x-3 top-auto mt-2 sm:inset-x-auto sm:absolute sm:top-full sm:left-auto sm:right-0 sm:mt-2 max-w-[calc(100vw-24px)] max-h-[70vh] overflow-y-auto`) com âncora `commandBarRef` / click-outside preservado! *(Testar visualmente em `390×844` na Task 7 para confirmar que não sobrepõe nem vaza horizontalmente!)*
5. Exibir texto curto `"Selecionar pág."` no mobile no botão `handleSelectAllPage` (L1638: usar `<span className="sm:hidden">Selecionar pág.</span><span className="hidden sm:inline">Selecionar página</span>` em vez de ocultar completamente).

- [ ] **Step 3: Corrigir Escapes, Plural Dinâmico e Link Direto `Resolver na Lousa →` nos Cards**

1. Corrigir escapes inválidos em L1771-1780: `clean.includes("\\frac")`, `clean.includes("\\sqrt")`, `clean.includes("\\displaystyle")`, `clean.includes("\\matrix")`, `clean.includes("\\begin")`, `clean.includes("\\sum")`, `clean.includes("\\int")`, `clean.includes("\\pmatrix")`, `clean.includes("\\bmatrix")`, `clean.includes("\\lim")`.
2. Corrigir plural dinâmico no badge do header (L769): `total === 1 ? "1 Questão Auditada" : `${total > 0 ? total.toLocaleString("pt-BR") : "—"} Questões Auditadas`` (preservando `· MathAI Engine`).
3. No rodapé de cada card (L1988-2002), importar `Link` (se ainda não importado — verificar imports de `questoes/page.tsx`) e adicionar link/botão direto `Resolver na Lousa →` apontando para `/resolver?id=${q.id}` com classe responsiva clara em light e dark mode ao lado de `+ Selecionar`.

- [ ] **Step 4: Run Typecheck**

Run: `cd frontend && npx tsc --noEmit`  
Expected: `0` erros.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/\(app\)/questoes/page.tsx
git commit -m "feat(questoes): add subtopico filter, fix quick trails, mobile popovers, escape detection, and solve link"
```

---

### Task 6: `/opinioes` Barra de Ação e `/resolver?id=...` Modo Treino por Padrão

**Files:**
- Modify: `frontend/app/(app)/opinioes/page.tsx:121-147`
- Modify: `frontend/app/(app)/resolver/page.tsx:465-480,2200-2206`

**Interfaces:**
- Contrato de URL `/resolver`:
  - `/resolver?id=123` → abre em `"treino"` (`totalTimeInitial = 0`, `timeLeft = 0`);
  - `/resolver?id=123&mode=simulado` ou `/resolver?id=123&session=simulado` → abre em `"simulado"` (`30 * 60` s).

- [ ] **Step 1: Refatorar barra de ação em `frontend/app/(app)/opinioes/page.tsx`**

Em `L121-147`: retirar `absolute right-3 bottom-4` do botão `"Comparar Abordagens"`; envolver o `<textarea>` em um container de entrada limpo seguido de uma linha flex abaixo (`flex justify-end pt-2`), mantendo `lemmas-gold-cta` e estado `loading` intactos sem sobrepor o texto digitado em mobile ou desktop.

- [ ] **Step 2: Atualizar `frontend/app/(app)/resolver/page.tsx`**

1. No `CASO 1` (`if (queryId)`, L466-479):
   - Substituir `setSessionType(modeQuery === "treino" ? "treino" : "simulado")` e timer fixo por:
     ```ts
     const nextSessionType =
       modeQuery === "simulado" || sessionQuery === "simulado" ? "simulado" : "treino";
     setSessionType(nextSessionType);
     setSessionMode("active");
     setTotalTimeInitial(nextSessionType === "simulado" ? 30 * 60 : 0);
     setTimeLeft(nextSessionType === "simulado" ? 30 * 60 : 0);
     ```
2. Em `L2204`: trocar `<span className="font-bold">✨ Modo Foco ...` por `<span className="font-bold">Modo Foco <span className="hidden lg:inline">Imersivo</span></span>` (mantendo o ícone `<Sparkles />` único ao lado).

- [ ] **Step 3: Run Typecheck**

Run: `cd frontend && npx tsc --noEmit`  
Expected: `0` erros.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/\(app\)/opinioes/page.tsx frontend/app/\(app\)/resolver/page.tsx
git commit -m "fix(opinioes,resolver): move compare button below textarea, default single question to treino mode, deduplicate sparkles"
```

---

### Task 7: CI Wiring, Build de Produção e Verificação E2E Desktop & Mobile no Navegador Real

**Files:**
- Modify: `.github/workflows/ci.yml:52-55`

**Interfaces:**
- Garante que o CI executa todas as suítes `node --test` (`test-question-page-cache.mjs`, `test-math-preview.mjs`, `test-question-filters.mjs`, `test-math-display.mjs`).

- [ ] **Step 1: Atualizar `.github/workflows/ci.yml`**

Incluir `scripts/test-question-filters.mjs` e `scripts/test-math-display.mjs` na linha `node --test` da etapa `frontend-build` em `.github/workflows/ci.yml`.

- [ ] **Step 2: Executar suítes unitárias, `tsc` e `npm run build`**

Run:
```bash
cd frontend && node --test scripts/test-question-page-cache.mjs scripts/test-math-preview.mjs scripts/test-question-filters.mjs scripts/test-math-display.mjs
cd frontend && npx tsc --noEmit && npm run build
```
Expected: todas as suítes PASS (`0` falhas), `npx tsc --noEmit` PASS e `npm run build` PASS.

- [ ] **Step 3: Subir servidor Next.js local contra Supabase e rodar `test-question-personalization.mjs` + verificação Playwright/Chromium Desktop (`1440×900`) & Mobile (`390×844`)**

1. Subir `npm run start -- -p 3099` em background (usando `.env.local` real) e aguardar readiness;
2. Rodar `LEMMAS_TEST_URL=http://127.0.0.1:3099 node --test scripts/test-question-personalization.mjs`;
3. Via Chromium headless (`puppeteer-core` / Playwright instalado no repo/sistema), verificar explicitamente todos os 7 critérios da Seção 6 do Design Doc:
   - `Cálculo 3` exibe `242` questões (`CEDERJ + LemmaS`) sem auto-reset e `Álgebra Linear I` funciona (`59`);
   - Popover `Matéria, Tópico & Subtópico` exibe `Subtópicos` reais; filtro por subtópico (inclusive com vírgula ou `EsPCEx`) mostra contagens exatas;
   - Página 1 → Página 2 com `0` IDs repetidos;
   - `Criar Simulado` abre com `20` questões (ou selecionado), renderizado via Portal (`z-[100]`) acima da `AppNavbar` e fechável em `1440×900` e `390×844`;
   - Popovers em `390×844` permanecem 100% dentro da largura `[0, 390]` sem overflow horizontal e `/opinioes` exibe `"Comparar Abordagens"` abaixo do `<textarea>`;
   - Questões `#22966`, `#83`, `#59`, `#333`, `#330` renderizam fórmulas KaTeX válidas sem `katex-error`, `R$` íntegro e zero `\n[palavra]` solto;
   - `/resolver?id=23214` abre em `Modo Treino Livre` (Dicas habilitadas) sem `"✨"` duplicado, enquanto `/resolver?id=23214&mode=simulado` ainda abre modo simulado.
4. Encerrar servidor temporário.

- [ ] **Step 4: Commit final do Ciclo 1**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add question-filters and math-display node test suites"
```
