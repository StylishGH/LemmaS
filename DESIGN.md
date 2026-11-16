# DESIGN.md — LEMMAS Design System 2.0

> **Conceito Central:** *A Matemática Clássica encontra a Inteligência Contemporânea.*  
> **Invariante Arquitetural:** *O quadro permanece. O instrumento evolui.*  
> Os modos Dark e Light compartilham exatamente a mesma estrutura, grade, tipografia e anatomia de componentes. Alternar o tema transforma a materialidade da superfície e do instrumento de escrita.

---

## 1. Dualidade de Épocas e Materialidade

| Dimensão | **Modo Clássico (`lemmas-dark`)** | **Modo Contemporâneo (`lemmas-light`)** |
| :--- | :--- | :--- |
| **Superfície** | Quadro Negro de Ardósia Mineral Fosca | Lousa Branca de Porcelana Acetinada |
| **Instrumento** | Giz Marfim & Pigmentos Minerais Pastéis | Pincel Atômico Preto & Tintas Técnicas |
| **Moldura Estrutural** | Madeira Nogueira Escura Discreta (`#5c3a21` / `#b88149`) | Alumínio Anodizado Claro (`#cbd5e1`) |
| **Raciocínio MathAI** | Giz Azul Celeste (`#93c5fd`) + Giz Amarelo (`#fde047`) | Piloto Azul Royal (`#1d4ed8`) + Âmbar Ocre (`#b45309`) |

---

## 2. Tokens Semânticos Canônicos

### 2.1 Superfícies & Contornos

| Token CSS | `lemmas-light` (Porcelana) | `lemmas-dark` (Ardósia) | Uso |
| :--- | :--- | :--- | :--- |
| `--bg-board` | `#f6f8fa` | `#101316` | Fundo da lousa / quadro completo |
| `--bg-card` | `#ffffff` | `#15191f` | Enunciados, painéis de estudo, modais, header |
| `--bg-elevated` | `#eef2f6` | `#1c222a` | Alternativas em repouso, inputs, blocos KaTeX destacados |
| `--bg-subtle` | `#e2e8f0` | `#252c37` | Badges neutros, trilhos e divisórias preenchidas |
| `--border-subtle` | `#e2e8f0` | `rgba(236, 239, 244, 0.08)` | Bordas de repouso de cartões e seções |
| `--border-default` | `#cbd5e1` | `rgba(236, 239, 244, 0.14)` | Bordas de inputs, alternativas, navbar |
| `--border-strong` | `#94a3b8` | `rgba(236, 239, 244, 0.24)` | Bordas de foco/hover e divisórias principais |

### 2.2 Tintas (Escrita & Leitura)

| Token CSS | `lemmas-light` | `lemmas-dark` | Uso |
| :--- | :--- | :--- | :--- |
| `--ink-primary` | `#0f172a` | `#eceff4` | Enunciados, KaTeX, títulos, alternativa ativa |
| `--ink-secondary` | `#475569` | `#9aa5b4` | Subtítulos, descrições, rótulos de apoio |
| `--ink-muted` | `#64748b` | `#6e7a8a` | Metadados (#ID), placeholders, breadcrumbs |

### 2.3 Pigmentos Funcionais (Linguagem Pedagógica — Proibido Uso Decorativo)

| Token CSS | `lemmas-light` | `lemmas-dark` | Significado Funcional |
| :--- | :--- | :--- | :--- |
| `--marker-blue` | `#1d4ed8` | `#93c5fd` | **Rigor / MathAI Engine / Geometria & Tópicos** |
| `--marker-green` | `#15803d` | `#86efac` | **Validação / Gabarito / SM-2 em dia / Fácil** |
| `--marker-red` | `#dc2626` | `#fda4af` | **Desvio Conceitual / Nível 5 Rendição / Difícil** |
| `--marker-amber` | `#b45309` | `#fde047` | **Lema / Gatilho Cognitivo / CTA Principal / Simulado** |

Cada pigmento possui pares de superfície translúcida (`--marker-*-dim`) e borda (`--marker-*-border`). **Nenhum componente da MathAI Engine deve usar roxo genérico (`#9333ea` / `purple-*`)**: diagnósticos formais e raciocínio lógico usam `--marker-blue` (Rigor) com destaque de teorema em `--marker-amber` (Lema).

---

## 3. Tipografia (`next/font/google`)

| Papel | Família | Variável CSS | Regras |
| :--- | :--- | :--- | :--- |
| **Interface & Controles** | `Plus Jakarta Sans` | `--font-sans` | Escala limpa, `letter-spacing: -0.01em` em UI média |
| **Editorial, Títulos & Enunciados** | `Newsreader` | `--font-serif` / `.font-serif-math` | Optical size nativo, ótimo pareamento com KaTeX em enunciados |
| **Telemetria, IDs & Métricas** | `JetBrains Mono` | `--font-mono` | Sempre usar `font-variant-numeric: tabular-nums` |
| **Acento Manuscrito Pontual** | `Caveat` | `--font-chalk` | Apenas micro-anotações marginais de quadro (máx. 1 por dobra) |

---

## 4. Regras de Ouro & Guardrails

1. **Zero AI Slop:** Proibido glassmorphism pesado (`backdrop-filter: blur(20px)` em cards comuns), proibidos gradientes roxos, proibido substituir ícones Lucide/SVG por emojis, proibida faixa colorida lateral de 3px (`side-tab`) em cards repetidos.
2. **S-Pen Latency Guardrail (`SpenSmartCanvas`):** Nunca aplicar `backdrop-filter`, `filter` ou animações CSS pesadas sobre containers que envolvam o canvas de tinta vetorial/HTML5; o canvas permanece isolado sem reflow durante o traço.
3. **Disciplina de Movimento:** Nunca usar `transition: all`. Especificar explicitamente `transition-[background-color,border-color,color,transform]` com curva `cubic-bezier(0.23, 1, 0.32, 1)` (`150ms`–`180ms`) e respeitar `prefers-reduced-motion`.
4. **Responsividade Real:** Moldura externa discreta no desktop/tablet e colapsada no mobile (`< 640px`) para entregar 100% de área útil ao enunciado e às alternativas.
5. **Variante Comparativa:** `?proposal=b` ativa o tema **Atelier Euclidiano & Caderno de Demonstração** (`html[data-proposal="b"]`) usando exatamente a mesma camada de tokens.
