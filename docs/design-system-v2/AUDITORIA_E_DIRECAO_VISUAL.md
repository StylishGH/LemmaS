# LEMMAS Design System 2.0 — Auditoria e Direção Visual (Marcos 1 e 2)

> **Data:** Novembro de 2026 · **Branch:** `feat/emil-design-polish`  
> **Missão:** Consolidar a linguagem visual proprietária **A Matemática Clássica encontra a Inteligência Contemporânea**, garantindo dualidade real entre **Modo Clássico (Quadro Negro & Giz)** e **Modo Contemporâneo (Lousa Branca & Pincel Atômico)**.

---

## MARCO 1 — Auditoria Visual e Diagnóstico Técnico

### 1.1 Problemas Estruturais Identificados

| Severidade | Código / Ocorrência | Onde ocorre | Impacto no Produto & Marca |
| :--- | :--- | :--- | :--- |
| **P0** | Sequestro global pelo `<ProtoDesignPicker />` (`DEFAULT_VARIANT_INDEX = 2`) | [layout.tsx](../../frontend/app/layout.tsx), [ProtoDesignPicker.tsx](../../frontend/components/ProtoDesignPicker.tsx), [globals.css](../../frontend/app/globals.css) | Injeta `data-design-variant="glass"` por padrão em toda a plataforma, forçando `backdrop-filter: blur(20px)`, gradientes radiais índigo (`#080910`, `rgba(99, 102, 241, 0.08)`), além de manter uma barra fixa flutuante no rodapé que cobre botões em telas menores e vaza no mobile (`390px`). |
| **P0** | Alertas automáticos do detector `impeccable detect` | `globals.css:656, 665` (`side-tab`), `BoardFrame.css:2` (`codex-grid-background`) | Regras `border-left: 3px solid ... !important` da variante `studio` e malha `repeating-linear-gradient` em 2 eixos na superfície do quadro. |
| **P1** | Dupla personalidade no Dark Mode (Roxo Noturno vs. Ardósia Mineral) | `.lemmas-app-frame` (`#0e0d16`), `AppNavbar.tsx` (`#0e0d16`, `#1a172c`, `#110f1e`), `ThemeToggle.tsx` (`#181528`), `Sidebar.tsx` (`#110f1c`, `#141222`), `MathDisplay.tsx` (`#1a172c`), `LandingPage.css` (`#141222`, `rgba(15, 14, 23, 0.75)`) | Conflita com a ardósia mineral neutra (`#101316` / `#14171c`) definida nos tokens raiz, dando tom "roxo SaaS" sobre a moldura de madeira. |
| **P1** | Proliferação de 900+ hexadecimais hardcoded | `LandingPage.css` (253), `resolver/page.tsx` (133), `questoes/page.tsx` (116), `perfil/page.tsx` (83), `page.tsx` (58), `LandingPage.tsx` (55), `HeroProductPreview.tsx` (30) | Impede evolução centralizada de paleta e cria desvios sutis entre cartões, enunciados e cabeçalhos. |
| **P1** | Roxo genérico de IA (`purple-500` / `#9333ea`) na MathAI Engine | [resolver/page.tsx](../../frontend/app/(app)/resolver/page.tsx) (~12 ocorrências: `ThoughtLine`, diagnóstico, histórico de dicas N1–N4, botão Dedução & OCR) | Quebra a linguagem funcional da lousa (giz azul / verde / coral / amarelo) e remete a templates SaaS genéricos de IA. |
| **P1** | Tipografia sem fontes reais + `@import` bloqueante | `globals.css:179,200` (caindo em `-apple-system` e `Georgia`), `LandingPage.css:1` (`@import url(...)` render-blocking) | Falta integração via `next/font` para o tripé editorial: Sans de interface, Serifa acadêmica/editorial, Monospace tabular e acento manuscrito pontual. |
| **P2** | Moldura pesada em telas pequenas + textura pontilhada | `BoardFrame.css`, `globals.css:254` | Parafusos `.lemmas-board-mount` e `padding` fixo roubam espaço útil em smartphones (`390px`); `repeating-radial-gradient` cria efeito visual de papel de parede pontilhado atrás de `Carregando ambiente...`. |
| **P2** | Emojis como ícones e `transition-all` | `ThemeToggle.tsx:59` (`🖊️` / `🪵`), `ThemeToggle.tsx`, `Sidebar.tsx`, `AppNavbar.tsx`, `LemaBadge.tsx` | Viola `craft-floor` (emojis substituindo sistema vetorial de ícones) e `animation-performance` (`transition: all` fora da GPU). |
| **P2** | Fallback vazio no Hero da Landing (`— questões e — lemas`) | [LandingPage.tsx](../../frontend/app/(public)/landing/components/LandingPage.tsx) | Antes de `/api/stats` responder ou hidratar no cliente, exibe dois travessões vazios no bloco de confiança do Hero. |

### 1.2 Matriz de Consistência (Estado Inicial Auditado)

| Superfície / Rota | Tokens Semânticos | Cores Hardcoded | Tipografia | `lemmas-dark` | `lemmas-light` | Anti-padrões | Escopo no Piloto (Marco 3) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`globals.css` & `layout.tsx`** | Parcial | Médio | Sistema (`-apple-system` / `Georgia`) | Ardósia + override Glass | Porcelana + override Glass | `ProtoDesignPicker` v=3 padrão + `side-tab` | **SIM** |
| **Navegação (`AppNavbar`, `Sidebar`, `ThemeToggle`, `BoardFrame`)** | Baixo | Alto (`#0e0d16`, `#181528`, `#141222`) | Sistema | Roxo noturno colidindo com madeira | Bom, mas com barra Glass invasiva | Emojis `🖊️`/`🪵`, `transition-all`, `codex-grid-background` | **SIM** |
| **Landing (`/landing`)** | Baixo | Muito alto (253 em CSS + 55 em TSX) | `@import` bloqueante + `Georgia` | Bom conceito, roxo vazando no mode-selector | Adaptado via overrides manuais | Hero trust `— questões`, picker mobile overflow | **SIM** |
| **Resolução (`/resolver`)** | Médio | Alto (133 em TSX) | `font-serif-math` caiu em Georgia | Bom esqueleto, `#9333ea` em IA | Bom contraste, `#9333ea` em IA | Roxo IA em `ThoughtLine` / Pólya N1–N4 | **SIM** |
| **`/questoes`, `/dashboard`, `/perfil`, `/opinioes`, `/login`** | Médio-Baixo | Alto (257+ somados) | Sistema | Misto (`#14171c` vs roxo herdado) | Misto | Sobrescritas de variante Glass | **NÃO (Marco 5 pós-aprovação)** |

---

## MARCO 2 — Moodboard e Direção Visual

### 2.1 Análise de Referências Visuais (Moodboard)

1. **Brilliant:**
   - *Adotar:* Clareza na decomposição em blocos visuais, botões táteis para micro-interações e sensação de descoberta ativa em cada etapa.
   - *Evitar:* Excesso de gamificação colorida (gradientes neon, badges festivos estilo Duolingo, aparência infantil que dilui o rigor de IME/ITA/EFOMM/UFF).
2. **Mathigon:**
   - *Adotar:* Elegância tipográfica em definições e teoremas, organização espacial generosa e uso funcional de poucas cores para diferenciar objetos geométricos/algébricos.
   - *Evitar:* Excesso de animações ornamentais contínuas durante leitura de prova longa.
3. **3Blue1Brown:**
   - *Adotar:* A própria essência cromática do giz sobre ardósia profunda: **fundo neutro escuro de baixo brilho**, traços luminosos porém suaves (creme marfim, azul celeste, verde menta, âmbar clássico) usados estritamente como **código semântico matemático**, nunca como enfeite.
   - *Evitar:* Renderização puramente cinematográfica sem ergonomia para leitura longa de enunciados densos ou suporte à luz do dia (lousa branca).
4. **Math Academy:**
   - *Adotar:* Disciplina minimalista, ausência total de ruído visual na bancada de estudo, tipografia limpa, números tabulares consistentes e clareza imediata do próximo passo cognitivo.
   - *Evitar:* Estética puramente utilitária/fria sem identidade cultural de sala de aula de matemática.
5. **GeoGebra Notes / Goodnotes:**
   - *Adotar:* Separação clara entre o plano de escrita (lousa S-Pen de latência zero) e os controles de ferramentas ao redor; contraste cirúrgico de linhas finas e curvas geométricas.
   - *Evitar:* Efeitos de desfoque (`backdrop-filter`) ou camadas compostas sobre o canvas que comprometam a taxa de atualização 120Hz/240Hz da S-Pen.
6. **Qconcursos / Bancos Acadêmicos:**
   - *Adotar:* Anatomia objetiva de cabeçalho de questão (Instituição · Ano · Disciplina · Tópico · Nível · ID), ergonomia de alternativas com atalho de foco e feedback imediato abaixo do enunciado.
   - *Evitar:* Densidade claustrofóbica, tabelas cinzentas antigas e banners concorrendo com o enunciado.

---

### 2.2 Duas Propostas Visuais para o Conceito Clássico / Contemporâneo

> **Princípio Invariante:** *“O quadro permanece. O instrumento evolui.”* Ambas as propostas preservam rigorosamente o mesmo grid, hierarquia e sistema de componentes entre Dark e Light — alternando apenas superfície, instrumento de escrita e pigmentos funcionais.

#### Proposta A (Recomendada & Padrão): **"Ardósia Mineral & Porcelana Editorial"**
- **Metáfora:** Tratado clássico de matemática sobre ardósia mineral neutra no modo escuro; lousa de porcelana acetinada e pincel atômico cirúrgico no modo claro.
- **Paleta Clássica (`lemmas-dark`):**
  - Superfícies neutras (zero tom roxo): Ardósia base `#101316`, Cartão/Lousa `#15191f`, Superfície elevada `#1c222a`, Sutil `#252c37`.
  - Giz marfim: Principal `#eceff4`, Secundário `#9aa5b4`, Mudo `#6e7a8a`.
  - Pigmentos de giz funcionais: Azul `#93c5fd` (Raciocínio/Banca/MathAI Formal), Verde `#86efac` (Validação/Passo Correto), Coral `#fda4af` (Desvio/Difícil), Âmbar Giz `#fde047` (Teorema/Lema/Destaque).
  - Moldura discreta em nogueira escura (`#5c3a21` / chanfro `#b88149` a 22%) no desktop; maximizada no mobile.
- **Paleta Contemporânea (`lemmas-light`):**
  - Superfícies: Porcelana `#f6f8fa`, Quadro Branco Puro `#ffffff`, Elevado `#eef2f6`.
  - Marcador preto denso `#0f172a`, Grafite `#475569`, Traço suave `#64748b`.
  - Tintas de pincel atômico: Azul Royal `#1d4ed8`, Verde Folha `#15803d`, Carmim `#dc2626`, Âmbar Ocre `#b45309`.
  - Moldura sutil em alumínio anodizado (`#cbd5e1`).
- **Sistema Tipográfico (`next/font`):**
  - **UI & Controle:** `Plus Jakarta Sans` (geométrica humanista legível em densidades compactas).
  - **Editorial, Títulos & Enunciados:** `Newsreader` (serifa óptica editorial de alto conforto para leitura longa e convivência harmônica com KaTeX).
  - **Telemetria, Códigos & Progresso:** `JetBrains Mono` com `tabular-nums`.
  - **Acento Pontual de Quadro:** `Caveat` restrita exclusivamente a micro-anotações marginais da lousa (máximo 1 por seção hero/card).

#### Proposta B (Alternativa Testável ao Vivo via `?proposal=b`): **"Atelier Euclidiano & Caderno de Demonstração"**
- **Metáfora:** Lousa verde-lousa universitária clássica (tradição MIT/ETH/IMPA) no modo escuro; papel monográfico marfim aquecido no modo claro, com bordas mais secas (`6px`–`8px`) e linhas arquitetônicas de `1px`.
- **Paleta Clássica (`lemmas-dark`):** Fundo `#0d1412`, Cartão `#121b18`, Elevado `#192521`, Giz creme `#f2efe9`, Acento ocre-giz `#facc15`, Azul glacial `#7dd3fc`.
- **Paleta Contemporânea (`lemmas-light`):** Fundo papel `#faf7f2`, Cartão `#ffffff`, Elevado `#f3eee6`, Tinta nanquim `#141413`, Azul cobalto `#1e40af`, Dourado sépia `#a16207`.

### 2.3 Comparação Objetiva das Propostas

| Critério | Proposta A: *Ardósia Mineral & Porcelana* (Padrão) | Proposta B: *Atelier Euclidiano & Caderno* (`?proposal=b`) | Análise Técnica |
| :--- | :--- | :--- | :--- |
| **1. Identidade** | Alta sobriedade contemporânea com alma de quadro clássico sem caricatura; moldura em nogueira no dark e alumínio no light. | Nostalgia forte de lousa verde de anfiteatro universitário e papel monográfico marfim. | Proposta A envelhece melhor em uso prolongado de bancada; Proposta B tem apelo nostálgico mais marcante. |
| **2. Legibilidade** | Máximo contraste neutro em KaTeX e figuras P&B invertidas (`#eceff4` sobre `#15191f`, `#0f172a` sobre `#ffffff`). Pigmentos de giz (azul, verde, coral, âmbar) não sofrem interferência do matiz de fundo. | Fundo esverdeado (`#121b18`) desloca levemente a percepção do giz verde (`#86efac`) e exige maior calibração em figuras diagramáticas invertidas. | **Vencedora: Proposta A** (neutralidade acromática da ardósia garante fidelidade semântica às 4 cores funcionais e ao KaTeX). |
| **3. Originalidade** | Combina tipografia editorial (`Newsreader`) com instrumentação de lousa real e dualidade coerente entre épocas (Giz ↔ Pincel Atômico). | Clássica e reconhecível em escolas/universidades tradicionais de matemática. | **Empate técnico** com vantagem estética da Proposta A pela transição porcelana/ardósia mais nítida. |
| **4. Coerência com a Marca** | Alinha perfeitamente ao `Logo` (`Lem | maS`), às normas do `AGENTS.md` e à sobriedade da MathAI Engine sem distrações visuais. | Muito coerente com sala de aula clássica, porém ligeiramente menos tecnológica na interface do tutor. | **Vencedora: Proposta A** (equilíbrio exato entre Clássico e Contemporâneo). |
| **5. Facilidade de Manutenção** | Escala acromática base (`slate`/`zinc`) + 4 tokens de marcador torna novos gráficos, tabelas e cards previsíveis em Dark e Light. | Tons esverdeados e creme exigem calibração manual constante em novos gráficos Recharts e badges de dificuldade. | **Vencedora: Proposta A** (menor custo cognitivo e de manutenção no Marco 5). |

**Decisão do Piloto:** Adotar **Proposta A ("Ardósia Mineral & Porcelana Editorial")** como sistema canônico padrão do LEMMAS Design System 2.0, mantendo a **Proposta B** acessível ao vivo pelo parâmetro `?proposal=b` para inspeção comparativa direta do usuário antes do Marco 5.

---

## MARCO 5 & 6 — Propagação Completa e Matriz Final Before/After

### 5.1 Decisão Aprovada e Escopo Expandido
Com a aprovação da **Opção 1 (Proposta A como padrão canônico)**, o Design System 2.0 foi propagado para todas as páginas autenticadas, fluxos públicos, modais e componentes de comunidade fora do núcleo protegido de lousa/S-Pen:

- **Modais, Banners & Comunidade:**
  - `frontend/components/ReportarQuestaoModal.tsx` (emojis substituídos por ícones Lucide, remoção de `backdrop-blur-xs`, tokens semânticos).
  - `frontend/components/FeedbackModal.tsx` (remoção de `backdrop-blur-xs`, tokens semânticos).
  - `frontend/components/CriarSimuladoModal.tsx` (remoção de `backdrop-blur-sm`, tokens semânticos).
  - `frontend/components/EmailVerificationBanner.tsx` (remoção de `transition-all`, tokens semânticos).
  - `frontend/components/community/QuestionDiscussion.tsx` & `CommunityAliasField.tsx` (`font-serif-math`, superfícies e abas tokenizadas).
- **Resolução (`/resolver`):**
  - `frontend/app/(app)/resolver/page.tsx`: modais (`AuthPromptModal`, `ConfirmarEntregaModal`, Dica Nível 5), tela pós-simulado, caixas de feedback discursiva/SM-2, navegação inferior e `Suspense fallback`.
- **Dashboard (`/dashboard` / `frontend/app/(app)/page.tsx`):**
  - Remoção de glow orb `blur-3xl`, gradientes hero e duplicação de bordas; aplicação de `font-mono tabular-nums` nos KPIs; migração completa de cartões, radar SVG, diagnóstico cognitivo, revisões SM-2 e tabela de histórico.
- **Banco de Questões (`/questoes` / `frontend/app/(app)/questoes/page.tsx`):**
  - Cabeçalho editorial em `Newsreader`, barra de comandos e busca, trilhas rápidas, todos os 5 popovers de filtro (Banca, Matéria/Tópico/Subtópico, Dificuldade, Ano, Formato & Fase), barra de seleção em lote, paginação e cards `.lemmas-question-item` com enunciado `font-serif-math max-w-[68ch]`.
- **Segunda Opinião (`/opinioes` / `frontend/app/(app)/opinioes/page.tsx`):**
  - Cartões comparativos e `<ThoughtLine color="var(--marker-blue)" glyphColor="var(--marker-blue)" />`.
- **Perfil & Faturamento (`/perfil` e `/perfil/faturamento`):**
  - `frontend/app/(app)/perfil/page.tsx` & `frontend/app/(app)/perfil/faturamento/page.tsx`: vistas de visitante/carregamento e configuração completa, substituição de emojis de trilhas/modos por ícones Lucide.
- **Autenticação & Onboarding (`/login` e `/onboarding`):**
  - `frontend/app/(public)/login/page.tsx`, `AuthCard.tsx`, `Signup.css`, `Signup.tsx`: `<ThemeToggle compact />` unificado em sincronia com `lemmas-theme`, substituição de emojis por ícones Lucide e superfícies tokenizadas.
  - `frontend/app/(public)/onboarding/page.tsx`: `<ThemeToggle compact />` unificado, remoção de alternador local legado, ícones Lucide e tokens semânticos.
  - Varredura residual final em `AppHeader.tsx`, `BancadaShowcase.tsx`, `auth/callback/route.ts`, `admin/analytics/ui.tsx` e `auditoria-figuras/page.tsx` para eliminar hexadecimais roxos legados, `backdrop-blur` e `transition-all`.
- **Invariantes Preservadas:** Zero edições nos 5 arquivos protegidos da bancada S-Pen/Canvas (`SpenSmartCanvas.tsx`, `ImmersiveFocusOverlay.tsx`, `FloatingQuestionHUD.tsx`, `MathScratchpad.tsx`, `GeometricCompassBoard.tsx`) e zero alterações no backend.

### 5.2 Matriz Before / After (Marco 5 + Piloto)

Diagnósticos automatizados gravados em [before/_diagnostics_marco5.json](captures/before/_diagnostics_marco5.json) (13 capturas Marco 5) e [after/_diagnostics_marco5.json](captures/after/_diagnostics_marco5.json) (17 capturas Marco 5), totalizando **28 PNGs** em `captures/before/` e **36 PNGs** em `captures/after/` considerando o piloto completo:

| Rota / Superfície | Antes (Diagnóstico) | Depois (`after-*` Marco 5) | Resultado Visual & Técnico |
| :--- | :--- | :--- | :--- |
| **`/questoes` (Dark / Light / Tablet / Mobile)** | `#14171c` / `#101316` hardcoded em filtros/popovers e `transition-all` | `after-questoes-{dark-desktop,light-desktop,dark-tablet,dark-mobile}.png` | Ardósia `rgb(16, 19, 22)` / Porcelana `rgb(246, 248, 250)`, `overflow=false` em `1440px`, `820px` e `390px`, KaTeX nítido. |
| **`/dashboard` (Dark / Light / Mobile)** | Glow orb `blur-3xl`, hexadecimais mistos `#161a1e`/`#201c38`, borda duplicada | `after-dashboard-{dark-desktop,light-desktop,dark-mobile}.png` | KPIs `font-mono tabular-nums`, ausência de orbs, enquadramento consistente em `1440px` e `390px`. |
| **`/opinioes` (Dark / Light)** | Superfícies pré-tokenização no comparador | `after-opinioes-{dark-desktop,light-desktop}.png` | Colunas verde (`#86efac`) vs. âmbar (`#fde047`) com `ThoughtLine` azul giz e KaTeX sem perda de contraste. |
| **`/perfil` (Dark / Light)** | `#0e0d16` / `#141222` / `#1b172e`, emojis em trilhas/modos | `after-perfil-{dark-desktop,light-desktop}.png` | Tela visitante e seções tokenizadas, zero roxo SaaS, ícones Lucide. |
| **`/login` (Dark / Light)** | Alternador de tema local dessincronizado e emojis no `Signup` | `after-login-{dark-desktop,light-desktop}.png` | `<ThemeToggle compact />` sincronizado, cartões em ardósia/porcelana, `overflow=false`. |
| **`/onboarding` (Dark / Light)** | Estado local `#141222` + ícones unicode | `after-onboarding-{dark-desktop,light-desktop}.png` | Integrado ao `ThemeProvider` global e `BoardFrame` mineral. |
| **Proposta B (`?proposal=b`)** | Restrita ao piloto `/landing` e `/resolver` | `after-questoes-proposal-b-dark-desktop.png`, `after-dashboard-proposal-b-light-desktop.png` | Verde lousa `rgb(13, 20, 18)` e papel `rgb(250, 247, 242)` propagados em toda a UI via CSS tokens. |
