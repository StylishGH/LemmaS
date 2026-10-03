<div align="center">
  <h1>MathAI 🧠📐</h1>
  <p>Uma plataforma inteligente de aprendizagem matemática que evolui um modelo cognitivo individual de cada estudante.</p>

  <p align="right">
    <a href="./README.en.md">🇺🇸 English Version</a> &nbsp;|&nbsp; <b>🇧🇷 Versão em Português</b>
  </p>

  <p>
      <a href="https://mathia.streamlit.app" target="_blank">
        <img src="https://static.streamlit.io/badges/streamlit_badge_black_white.svg" alt="Open in Streamlit" />
      </a>
      <a href="https://github.com/StylishGH/MathAI/actions/workflows/ci.yml">
        <img src="https://github.com/StylishGH/MathAI/actions/workflows/ci.yml/badge.svg" alt="CI" />
      </a>
      <a href="https://github.com/StylishGH/MathAI/blob/main/LICENSE">
        <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License" />
      </a>
      <img src="https://img.shields.io/badge/Python-3.11-blue.svg" alt="Python" />
      <img src="https://img.shields.io/badge/Streamlit-1.38-FF4B4B.svg" alt="Streamlit" />
      <img src="https://img.shields.io/badge/SQLite-3.45-003B57.svg" alt="SQLite" />
      <img src="https://img.shields.io/badge/Turso-Cloud%20DB-3A86FF.svg" alt="Turso" />
    </p>

  <p>🚀 <strong>Aplicação em produção:</strong> <a href="https://mathia.streamlit.app"><strong>mathia.streamlit.app</strong></a></p>
</div>

---

## 📖 A História Real: Do "Projetinho de IA" a Laboratório de Engenharia de Dados

### O Início: Não Era Para Ser "Mais um ChatGPT de Matemática"

A semente do MathAI veio de uma ideia simples: **queria voltar a resolver matemática de verdade** e percebi que uma IA poderia acompanhar *como* uma pessoa aprende matemática, não apenas responder perguntas.

A diferença fundamental apareceu cedo:

```
App comum:          Aluno → Questão → IA → Resposta

MathAI (visão):     Aluno → Questão → Tentativa → Tempo → Acerto/Erro
                                              → Explicação do aluno
                                              → Estratégia usada
                                              → Tipo de erro
                                              → Histórico
                                              → Perfil do aluno
                                              → Próxima questão
```

A frase que resume isso:

> **"Uma IA que aprende como você aprende Matemática para ajudar você a aprender melhor."**

Mas a personalização **não significava reforçar dependência**. Se o aluno usa Teorema de Ceva em geometria, o sistema não deve só dar questões de Ceva — deve perguntar: "Será que ele resolveria por semelhança? Por coordenadas? Por áreas?" O sistema deve conhecer o aluno sem ficar preso ao padrão atual dele.

---

### A Primeira Grande Visão: O Sistema de Dados

Quando pensei no que precisava armazenar, percebi que não dava pra fazer tudo em conversa com LLM. Comecei a imaginar tabelas:

| Tabela | Propósito |
|--------|-----------|
| `users` | Alunos + consentimento explícito |
| `questoes` | Enunciados, LaTeX, SVG, matéria, tópico, dificuldade, estratégias |
| `tentativas` | Histórico: tempo, acerto/erro, estratégia, confiança (1-5), justificativa, foto da resolução |
| `revisao_espacada` | Algoritmo **SM-2** (SuperMemo-2) para agendamento |
| `perfil_aluno_topico` | Agregação analítica em tempo real por assunto |
| `diagnosticos_ia` | Interpretações da IA (separadas dos fatos!) |
| `dicas_socraticas` | Histórico de dicas progressivas |

**O salto:** O MathAI deixou de ser "uma IA que responde matemática" e virou **um sistema de dados sobre aprendizagem matemática**.

---

### A Decisão Arquitetural Mais Importante: Dado Observado ≠ Interpretação da IA

Imagine:
- **Observável:** Aluno demorou 84s, errou, disse confiança 4/5
- **Interpretação:** "Ele não domina semelhança", "Erro conceitual"

A IA **pode estar errada**. Se eu gravar a interpretação como verdade → treino modelo em cima de suposição → ciclo de erro.

**A regra:**
```
DADOS OBSERVADOS (fatos brutos) ≠ DIAGNÓSTICO DA IA (inferência)
```
- Observação → armazena imaculado (ground truth para ML futuro)
- Interpretação → armazena **separadamente**, com metadados: qual modelo, quando, entrada, validado

Isso evita o ciclo: *IA diz → banco grava como verdade → modelo aprende a própria suposição*.

---

### O Problema Gigantesco: Os Dados (Onde o Projeto Virou Engenharia)

"Tá, tenho IA legal. Mas de onde vêm as questões?"

Entrou o **MathNet** — 100k+ questões de competições matemáticas. Parecia simples: `MathNet → DataFrame → Banco`.

**KKKKKK. Não foi nem perto.**

Problemas reais de dataset:
- Idiomas mistos (PT/EN/ES/outros)
- LaTeX quebrado misturado com texto
- Metadados inconsistentes: competição, edição, ano, formato
- Nomes diferentes pra mesma banca: `EFOMM`, `Escola de Formação`, `EFOMM-MARINHA`
- Campos vazios, soluções incompletas
- **Armadilha:** `26th Balkan Mathematical Olympiad` → `26` não é ano, é **edição**. Não inventar correspondência.

#### O Problema do Idioma → A Filosofia do Pipeline

Estratégia amadurecida:
```
idioma já fornecido pelo dataset
         ↓
se não existir → detectar pelo texto (remover LaTeX antes!)
         ↓
se ainda ambíguo → IA
```

> **"LLM não precisa fazer aquilo que Python consegue fazer deterministicamente."**

Essa frase virou filosofia do pipeline.

#### Bug Besta Que Ensina: Remover LaTeX ≠ Remover Espaços

```python
# Errado: remove TODOS os espaços
re.sub(r"\s", "", texto)  # "Determine the value of x" → "Determinethevalueofx"

# Correto: normaliza espaços
re.sub(r"\s+", " ", texto).strip()
```

Detalhe ridículo? Em pipeline real, pré-processamento quebrado derruba etapa aparentemente não relacionada. **Regra:** testar transformação isoladamente antes de jogar no dataset inteiro.

---

### A Mudança Fundamental: IA Como Fallback, Não Trabalhador Braçal

**Antes:**
```
Dataset → IA → IA → IA → IA → IA
```

**Depois (Python faz 95%):**
```
Dataset → Python (limpeza, classificação, regex, dedup, validação estrutural)
         ↓
    IA somente onde há ambiguidade semântica
         ↓
    Python valida saída da IA (JSON/LaTeX)
         ↓
    Banco
```

A IA entra **onde existe ambiguidade semântica** — ex: "esse enunciado em grego significa o quê em português?"

---

### A Camada de IA Multi-Provider: Roteamento Inteligente

Não fazia sentido depender só de `MathAI → Gemini`. Evoluiu para:

```
                         MATHAI
                           │
           ┌───────────────┴───────────────┐
           │                               │
      DATA LAYER                      AI LAYER
           │                               │
    MathNet / Provas                  AI Router
    Tentativas                            │
    Desempenho                     ┌──────┼──────┐
    Metadados                      │      │      │
           │                    Gemini  NVIDIA  Outros
           │
      ETL / Qualidade
           │
        SQLite/Turso
           │
      Histórico do Aluno
           │
    ┌──────┼────────┐
    │      │        │
  Perfil  Revisão  Diagnóstico
    │
    ▼
 Recomendação
    │
    ▼
 Prática
    │
    ▼
 Nova Tentativa
    │
    └──────────→ Dados (ciclo fecha)
```

#### O Roteador em Ação

| Tarefa | Primário | Fallback | Por Quê |
|--------|----------|----------|---------|
| **Dicas Socráticas** | NVIDIA Nemotron 3.5 Lightning (~0.9s) | DeepSeek v4.1 → Gemini | Velocidade, cota ilimitada, tom socrático nativo |
| **Avaliação Texto** | NVIDIA Nemotron / DeepSeek | Gemini | Raciocínio pesado, JSON estruturado |
| **OCR Manuscrito** | **Google Gemini Flash-Lite** | NVIDIA (se suportar) | Melhor multimodal do mercado — lê caligrafia, rasuras, papel amassado → LaTeX direto |
| **Ingestão Lote (MathNet)** | Python puro (95%) → Fila NVIDIA 38 req/min (5%) → Gemini auditoria (<1%) | — | Custo zero na maioria, throttle anti-429, quality gate |

> **Descoberta crucial:** NVIDIA NIM liberou requisições ilimitadas (verificação SMS) → GPUs H100 grátis com modelos open-weights de ponta. Zero vendor lock-in.

---

### 📖 Documentação Completa da Arquitetura de IA

A implementação detalhada do roteador, circuit breakers, throttle, telemetria, validação de saída, versionamento de prompts e benchmarks está em:
[**docs/ai-router.md**](docs/ai-router.md)

---

### O Banco Ficou Sério: Rastreabilidade

Para evoluir para pesquisa/ML, preciso comparar `Modelo A vs Modelo B` — não "a IA falou isso".

Tabela `processamento_ia` registra:
- `modelo_usado` (ex: `nvidia/nemotron-3.5-lightning`)
- `tarefa` (`dica_socratica`, `avaliacao_texto`, `ocr_manuscrito`, `traducao_latex`)
- `entrada_hash`, `saida_json`, `latencia_ms`, `tokens`, `sucesso`, `fallback_usado`
- `validado_por` (humano ou script), `versao_prompt`

---

### O Problema do Escopo (E Como Resolvi)

**Minha tendência:** enxergar V5 enquanto construo V1.

```
V1: importar questões
Cabeça: OCR + Knowledge Tracing + Recomendador + IA Própria + Produto
```

**Solução:** Escolher **uma fatia vertical demonstrável** — o pipeline MathNet → limpeza → idioma → tradução seletiva → banco — e deixar OCR avançado, BKT, recomendador, modelos próprios para depois.

> **Mudança de mindset:** "Preciso terminar o MathAI" → "Preciso terminar uma parte que prove que a arquitetura funciona."

Software real não nasce completo. Precisa: hipótese → implementação → teste → validação → evolução.

---

### Documentação Como História de Engenharia

Não bastava `code/`. Comecei a documentar decisões:

| Arquivo | Pergunta Que Responde |
|---------|----------------------|
| `README.md` | O que é o projeto? |
| `docs/architecture.md` | Como pensei o sistema? |
| `docs/data-pipeline.md` | Como os dados entram e são transformados? |
| `docs/engineering-challenges.md` | Onde deu errado e como resolvi? |
| `docs/ai-router.md` | Como funciona o roteamento multi-provider? |
| `docs/roadmap.md` | Para onde o projeto vai (honesto: feito vs planejado)? |

Isso transforma o GitHub em **história de engenharia**, não depósito de código.

---

### O Que Já Funciona (✅) vs. O Que É Planejado (📋)

#### ✅ Implementado e Em Produção
- **Pipeline offline-first:** PDF/Markdown → Python/Regex → DataFrames → IA cirúrgica (LaTeX) → SQLite/Turso
- **MathNet ingestion:** 100k+ questões, unificação de bancas, detecção de idioma, tradução seletiva, dedup
- **Banco relacional:** `questoes`, `tentativas`, `revisao_espacada` (SM-2), `perfil_aluno_topico`, FKs, constraints
- **Streamlit App (V1):** Treinador (LaTeX + SVG vetorial, alternativas clicáveis, metacognição, cronômetro), Dashboard (KPIs, Radar/Barras, repertório estratégias, causas de erro, revisões SM-2, galeria rascunhos), Banco (filtros dinâmicos)
- **IA Layer:** Roteador NVIDIA (texto/raciocínio) + Gemini (visão/fallback), fallback automático, throttle 38 req/min
- **Sync worker:** SQLite local ↔ Turso cloud, limpeza de anomalias
- **Notebooks de gestão:** `gerenciador_questoes.ipynb`, `gerenciador_usuarios.ipynb`, dataset `questoes_banca.csv`

#### 📋 Roadmap Honesto (Próximos Passos)
| Fase | Objetivo | Status |
|------|----------|--------|
| **V2** | OCR multimodal: análise de resoluções manuscritas (foto/caderno) | 🚀 Próximo |
| **V3** | TRI (Teoria de Resposta ao Item) + BKT (Bayesian Knowledge Tracing) | Planejado |
| **V4** | Recomendador adaptativo (Contextual Multi-Armed Bandits) | Planejado |
| **V5** | Ecossistema videoaulas + Freemium (studio próprio) | Planejado |
| **V6** | Modelos próprios PyTorch (dataset proprietário de resoluções anotadas) | Visão longa |

> **Não vendo fumaça:** ❌ Knowledge tracing completo ❌ Recomendador completo ❌ OCR robusto ❌ Tutor LLM completo ❌ Modelo próprio treinado em larga escala. Estão no roadmap, não no produto.

---

## 🛠️ Stack Tecnológica (Por Camada)

| Camada | Tecnologias | Decisão |
|--------|-------------|---------|
| **Backend / Orquestração** | Python 3.11, Streamlit 1.38 | Produtividade + deploy nativo |
| **Dados / Persistência** | SQLite 3.45 (local) + Turso (cloud sync), Pandas 2.2, NumPy | Offline-first, ACID, edge replication |
| **IA — Texto & Raciocínio** | NVIDIA NIM (Nemotron 3.5, DeepSeek v4.1), Gemini 3.5 Flash-Lite | Velocidade, cota ilimitada, fallback robusto |
| **IA — Visão Multimodal** | Google Gemini Flash-Lite | Melhor OCR matemático manuscrito |
| **Frontend / Math Rendering** | Streamlit, KaTeX / LaTeX, SVG (Data URI) | Renderização nítida fórmulas/diagramas |
| **CI/CD** | GitHub Actions → Streamlit Cloud | Deploy contínuo, secrets gerenciados |
| **Versionamento / Docs** | Git/GitHub, LaTeX | Rastreabilidade, reprodutibilidade |

---

## 📁 Estrutura do Repositório

```
MathAI/
├── ROADMAP.md                      # Planejamento estratégico V0–V6
├── README.md                       # Este arquivo (história + técnica)
├── README.en.md                    # Versão em inglês
├── mockup.html                     # Protótipo conceitual
├── app.py                          # Entry point Streamlit
├── requirements.txt
├── data/
│   ├── mathai.db                   # SQLite relacional (produção local)
│   ├── extraidas/                  # Logs de extração (reprodutibilidade)
│   └── uploads/
│       ├── *.svg                   # Diagramas vetoriais (ESA 2026)
│       └── resolucoes/             # Rascunhos/fotos dos alunos
├── notebooks/
│   ├── gerenciador_questoes.ipynb  # Gestão & renderização de questões
│   ├── gerenciador_usuarios.ipynb  # Gestão de usuários/perfis
│   └── questoes_banca.csv          # Dataset bruto MathNET + bancas
├── docs/
│   ├── architecture.md             # Modelo de dados, fluxos, decisões
│   ├── data-pipeline.md            # Pipeline completo: PDF → questão estruturada
│   ├── engineering-challenges.md   # 6 desafios reais + soluções
│   ├── ai-router.md                # Roteador multimodal implementado
│   └── roadmap.md                  # Roadmap expandido
└── src/
    ├── ai/
    │   ├── client.py               # Cliente REST NVIDIA NIM + Gemini
    │   ├── evaluator.py            # Orquestração: dicas + avaliação + OCR
    │   └── router.py               # Lógica de roteamento + fallback
    ├── app/
    │   ├── utils.py                # Parsing enunciados/alternativas
    │   ├── components/
    │   │   ├── question_view.py    # Renderizador LaTeX + SVG nativo
    │   │   └── feedback_form.py    # Alternativas, justificativa, metacognição
    │   └── pages/
    │       ├── resolver.py         # Treinador interativo
    │       ├── dashboard.py        # Analytics, radar, galeria
    │       └── banco.py            # Explorador do acervo
    └── database/
        ├── __init__.py
        ├── schema.sql              # Schema relacional completo
        ├── db.py                   # Conexão SQLite + CRUD
        └── attempts.py             # Tentativas, métricas, SM-2
```

---

## ⚡ Como Rodar Localmente

```bash
git clone https://github.com/StylishGH/MathAI.git
cd MathAI
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scriptsctivate
pip install -r requirements.txt
streamlit run app.py
```

> **Variáveis de ambiente** (`.env` ou Streamlit Cloud Secrets):
> - `NVIDIA_API_KEY` — NIM (Nemotron/DeepSeek) para texto/raciocínio
> - `GEMINI_API_KEY` — Gemini Flash-Lite (visão + fallback)
> - `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` — sync cloud (opcional local)

---

## 📈 Métricas Atuais

| Métrica | Valor |
|---------|-------|
| Questões processadas (EFOMM, ESA, CEDERJ) | 500+ (MathNET 100k+ na fila) |
| Latência dicas socráticas (NVIDIA) | <1s |
| Latência avaliação texto | ~1.2s |
| Latência OCR manuscrito (Gemini) | ~2.5s |
| Deploy | Contínuo (GitHub Actions → Streamlit Cloud) |
| Arquitetura | Offline-first (SQLite local → Turso sync) |

---

## 🎓 O Que Isso Ensina Para Carreira

O MathAI virou **laboratório técnico** onde pratico:

| Quero Aprender | Uso No Projeto |
|----------------|----------------|
| SQL avançado | Schema, queries, SM-2, analytics |
| Power BI | Dashboards dos dados de aprendizagem |
| ML | TRI, BKT, recomendador, modelos próprios |
| LLMs | Diagnóstico, tutor, dicas socráticas |
| Engenharia de dados | ETL, qualidade, ingestão MathNET |
| Arquitetura | AI Router, multi-provider, fallback |
| Produto/UX | Streamlit, metacognição, feedback |

> **A evolução mais valiosa:** passei de "como implemento isso?" para "qual é a fonte de verdade?", "como valido?", "o que é observado vs inferido?", "quando vale usar IA?", "como recupero de falha?", "como demonstro que funciona?"

Bibliotecas se aprendem em semanas. Essa forma de raciocinar demora muito mais. O MathAI é onde pratico isso.

---

## 📚 Documentação Técnica Detalhada

- [Arquitetura do Sistema](docs/architecture.md)
- [Pipeline de Dados](docs/data-pipeline.md) — ciclo completo PDF → questão estruturada
- [Desafios de Engenharia](docs/engineering-challenges.md) — 6 incidentes reais (429, JSON/LaTeX, schema, sync, OCR histórico, ground truth)
- [Roteador de IA & Fallbacks](docs/ai-router.md) — implementação do roteamento por tarefa
- [Roadmap](docs/roadmap.md) — V0→V6 com entregáveis por fase

---

## 🤝 Contribuição

Issues e PRs bem-vindos! Veja [CONTRIBUTING.md](CONTRIBUTING.md) (a criar).

---

## 📄 Licença

MIT License — veja [LICENSE](LICENSE).

---

## 👨‍💻 Autor

**Guilherme Henrique Mendes**  
Licenciatura em Matemática (UFF/CEDERJ) • Data Science & ML • Python • SQL • IA Aplicada  
[LinkedIn](https://linkedin.com/in/ghmendes02) • [GitHub](https://github.com/StylishGH) • [Email](mailto:ghmendes@id.uff.br)
