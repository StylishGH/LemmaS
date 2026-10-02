<div align="center">
  <h1>MathAI 🧠📐</h1>
  <p>An intelligent mathematics learning platform that evolves an individual cognitive model for each student.</p>

  <p>
    <a href="https://mathia.streamlit.app" target="_blank">
      <img src="https://static.streamlit.io/badges/streamlit_badge_black_white.svg" alt="Open in Streamlit" />
    </a>
    <a href="https://github.com/StylishGH/MathAI/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License" />
    </a>
    <img src="https://img.shields.io/badge/Python-3.11-blue.svg" alt="Python" />
    <img src="https://img.shields.io/badge/Streamlit-1.38-FF4B4B.svg" alt="Streamlit" />
    <img src="https://img.shields.io/badge/SQLite-3.45-003B57.svg" alt="SQLite" />
    <img src="https://img.shields.io/badge/Turso-Cloud%20DB-3A86FF.svg" alt="Turso" />
  </p>

  <p>🚀 <strong>Live in production:</strong> <a href="https://mathia.streamlit.app"><strong>mathia.streamlit.app</strong></a></p>
</div>

---

## 📖 The Real Story: From "AI Side Project" to Data Engineering + ML Laboratory

### The Beginning: Not "Just Another Math ChatGPT"

The seed of MathAI came from a simple idea: **I wanted to get back to doing real mathematics** and realized an AI could track *how* a person learns math, not just answer questions.

The fundamental difference appeared early:

```
Typical app:        Student → Question → AI → Answer

MathAI (vision):    Student → Question → Attempt → Time → Correct/Incorrect
                                              → Student's explanation
                                              → Strategy used
                                              → Error type
                                              → History
                                              → Student profile
                                              → Next question
```

The phrase that captures this:

> **"An AI that learns how you learn Mathematics to help you learn better."**

But **personalization ≠ reinforcing dependency**. If a student uses Ceva's Theorem in geometry, the system shouldn't just serve Ceva problems — it should ask: "Could they solve this via similarity? Coordinates? Areas?" The system must know the student without getting stuck in their current pattern.

---

### The First Big Vision: A Data System

When I thought about what needed to be stored, I realized you can't build this on top of LLM conversations alone. I started imagining tables:

| Table | Purpose |
|-------|---------|
| `users` | Students + explicit consent |
| `questoes` | Statements, LaTeX, SVG, subject, topic, difficulty, strategies |
| `tentativas` | History: time, correct/incorrect, strategy, confidence (1-5), justification, photo of resolution |
| `revisao_espacada` | **SM-2** (SuperMemo-2) algorithm for scheduling |
| `perfil_aluno_topico` | Real-time analytical aggregation per topic |
| `diagnosticos_ia` | AI interpretations (separated from facts!) |
| `dicas_socraticas` | Progressive hints history |

**The leap:** MathAI stopped being "an AI that answers math" and became **a data system about mathematical learning**.

---

### The Most Important Architectural Decision: Observed Data ≠ AI Interpretation

Imagine:
- **Observable:** Student took 84s, got it wrong, declared confidence 4/5
- **Interpretation:** "They don't master similarity", "Conceptual error"

The AI **can be wrong**. If I store interpretation as truth → train model on assumption → error cycle.

**The rule:**
```
OBSERVED DATA (raw facts) ≠ AI DIAGNOSIS (inference)
```
- Observation → stored pristine (ground truth for future ML)
- Interpretation → stored **separately**, with metadata: which model, when, input, validated

This prevents the cycle: *AI says → DB stores as truth → model learns own assumption*.

---

### The Massive Problem: The Data (Where the Project Became Engineering)

"OK, I have a cool AI. But where do questions come from?"

Enter **MathNet** — 100k+ questions from math competitions. Seemed simple: `MathNet → DataFrame → Database`.

**LOL. Not even close.**

Real dataset problems:
- Mixed languages (PT/EN/ES/others)
- Broken LaTeX mixed with text
- Inconsistent metadata: competition, edition, year, format
- Different names for same exam: `EFOMM`, `Escola de Formação`, `EFOMM-MARINHA`
- Empty fields, incomplete solutions
- **Trap:** `26th Balkan Mathematical Olympiad` → `26` is **edition**, not year. Don't invent correspondence.

#### The Language Problem → Pipeline Philosophy

Matured strategy:
```
language provided by dataset
         ↓
if missing → detect from text (strip LaTeX first!)
         ↓
if still ambiguous → AI
```

> **"LLM doesn't need to do what Python can do deterministically."**

This became the pipeline philosophy.

#### A Silly Bug That Teaches: Stripping LaTeX ≠ Stripping Spaces

```python
# Wrong: removes ALL spaces
re.sub(r"\s", "", text)  # "Determine the value of x" → "Determinethevalueofx"

# Correct: normalize spaces
re.sub(r"\s+", " ", text).strip()
```

Silly detail? In real pipelines, broken preprocessing kills seemingly unrelated stages. **Rule:** test transformations in isolation before running on full dataset.

---

### The Fundamental Shift: AI as Fallback, Not Manual Labor

**Before:**
```
Dataset → AI → AI → AI → AI → AI
```

**After (Python does 95%):**
```
Dataset → Python (cleaning, classification, regex, dedup, structural validation)
         ↓
    AI only where semantic ambiguity exists
         ↓
    Python validates AI output (JSON/LaTeX)
         ↓
    Database
```

AI enters **only where semantic ambiguity exists** — e.g., "what does this Greek statement mean in Portuguese?"

---

### Multi-Provider AI Layer: Intelligent Routing

Depending solely on `MathAI → Gemini` made no sense. Evolved to:

```
                         MATHAI
                           │
           ┌───────────────┴───────────────┐
           │                               │
      DATA LAYER                      AI LAYER
           │                               │
    MathNet / Exams                   AI Router
    Attempts                              │
    Performance                      ┌──────┼──────┐
    Metadata                         │      │      │
           │                       Gemini  NVIDIA  Others
           │
      ETL / Quality
           │
        SQLite/Turso
           │
      Student History
           │
    ┌──────┼────────┐
    │      │        │
  Profile  Review  Diagnosis
    │
    ▼
 Recommendation
    │
    ▼
 Practice
    │
    ▼
 New Attempt
    │
    └──────────→ Data (cycle closes)
```

#### The Router in Action

| Task | Primary | Fallback | Why |
|------|---------|----------|-----|
| **Socratic Hints** | NVIDIA Nemotron 3.5 Lightning (~0.9s) | DeepSeek v4.1 → Gemini | Speed, unlimited quota, native socratic tone |
| **Text Evaluation** | NVIDIA Nemotron / DeepSeek | Gemini | Heavy reasoning, structured JSON |
| **Handwritten OCR** | **Google Gemini Flash-Lite** | NVIDIA (if supported) | Best multimodal on market — reads handwriting, smudges, crumpled paper → direct LaTeX |
| **Batch Ingestion (MathNet)** | Pure Python (95%) → NVIDIA queue 38 req/min (5%) → Gemini audit (<1%) | — | Zero cost mostly, anti-429 throttle, quality gate |

> **Key discovery:** NVIDIA NIM unlocked unlimited requests (SMS verification) → free H100 GPUs with SOTA open-weights. Zero vendor lock-in.

---

### 📖 Complete AI Architecture Documentation

The detailed implementation of the router, circuit breakers, throttle, telemetry, output validation, prompt versioning, and benchmarks is in:
[**docs/ai-router.md**](docs/ai-router.md)

---

### The Database Got Serious: Traceability

To evolve toward research/ML, I need to compare `Model A vs Model B` — not "the AI said this".

Table `processamento_ia` records:
- `model_used` (e.g., `nvidia/nemotron-3.5-lightning`)
- `task` (`socratic_hint`, `text_evaluation`, `handwritten_ocr`, `latex_translation`)
- `input_hash`, `output_json`, `latency_ms`, `tokens`, `success`, `fallback_used`
- `validated_by` (human or script), `prompt_version`

---

### The Scope Problem (And How I Solved It)

**My tendency:** see V5 while building V1.

```
V1: import questions
Head: OCR + Knowledge Tracing + Recommender + Own AI + Product
```

**Solution:** Pick **one demonstrable vertical slice** — MathNet → cleaning → language → selective translation → database — and leave advanced OCR, BKT, recommender, own models for later.

> **Mindset shift:** "I need to finish MathAI" → "I need to finish a part that proves the architecture works."

Real software isn't born complete. It needs: hypothesis → implementation → test → validation → evolution.

---

### Documentation as Engineering History

Code alone wasn't enough. Started documenting decisions:

| File | Question It Answers |
|------|---------------------|
| `README.md` | What is this project? |
| `docs/architecture.md` | How did I think the system? |
| `docs/data-pipeline.md` | How does data enter and transform? |
| `docs/engineering-challenges.md` | What broke and how did I fix it? |
| `docs/ai-router.md` | How does multi-provider routing work? |
| `docs/roadmap.md` | Where is this going (honest: done vs planned)? |

This turns GitHub into **engineering history**, not a code dump.

---

### What Actually Works (✅) vs. What's Planned (📋)

#### ✅ Implemented & In Production
- **Offline-first pipeline:** PDF/Markdown → Python/Regex → DataFrames → surgical AI (LaTeX) → SQLite/Turso
- **MathNet ingestion:** 100k+ questions, exam unification, language detection, selective translation, dedup
- **Relational DB:** `questoes`, `tentativas`, `revisao_espacada` (SM-2), `perfil_aluno_topico`, FKs, constraints
- **Streamlit App (V1):** Trainer (LaTeX + SVG, clickable alternatives, metacognition, timer), Dashboard (KPIs, Radar/Bars, strategy repertoire, error causes, SM-2 reviews, sketch gallery), Question Bank (dynamic filters)
- **AI Layer:** NVIDIA router (text/reasoning) + Gemini (vision/fallback), auto-fallback, 38 req/min throttle
- **Sync worker:** SQLite local ↔ Turso cloud, anomaly cleanup
- **Management notebooks:** `gerenciador_questoes.ipynb`, `gerenciador_usuarios.ipynb`, `questoes_banca.csv` dataset

#### 📋 Honest Roadmap (Next Steps)
| Phase | Goal | Status |
|-------|------|--------|
| **V2** | Multimodal OCR: handwritten resolution analysis (photo/notebook) | 🚀 Next |
| **V3** | IRT (Item Response Theory) + BKT (Bayesian Knowledge Tracing) | Planned |
| **V4** | Adaptive recommender (Contextual Multi-Armed Bandits) | Planned |
| **V5** | Video lessons ecosystem + Freemium (own studio) | Planned |
| **V6** | Own PyTorch models (proprietary annotated resolutions dataset) | Long-term vision |

> **No vaporware:** ❌ Full knowledge tracing ❌ Full recommender ❌ Robust OCR ❌ Complete LLM tutor ❌ Large-scale own model. In roadmap, not in product.

---

## 🛠️ Tech Stack (By Layer)

| Layer | Technologies | Decision |
|-------|--------------|----------|
| **Backend / Orchestration** | Python 3.11, Streamlit 1.38 | Productivity + native deploy |
| **Data / Persistence** | SQLite 3.45 (local) + Turso (cloud sync), Pandas 2.2, NumPy | Offline-first, ACID, edge replication |
| **AI — Text & Reasoning** | NVIDIA NIM (Nemotron 3.5, DeepSeek v4.1), Gemini 3.5 Flash-Lite | Speed, unlimited quota, robust fallback |
| **AI — Multimodal Vision** | Google Gemini Flash-Lite | Best handwritten math OCR |
| **Frontend / Math Rendering** | Streamlit, KaTeX / LaTeX, SVG (Data URI) | Crisp formulas & diagrams |
| **CI/CD** | GitHub Actions → Streamlit Cloud | Continuous deploy, managed secrets |
| **Versioning / Docs** | Git/GitHub, LaTeX | Traceability, reproducibility |

---

## 📁 Repository Structure

```
MathAI/
├── ROADMAP.md                      # Strategic planning V0–V6
├── README.md                       # This file (PT-BR)
├── README.en.md                    # English version
├── mockup.html                     # Conceptual prototype
├── app.py                          # Streamlit entry point
├── requirements.txt
├── data/
│   ├── mathai.db                   # Relational SQLite (local production)
│   ├── extraidas/                  # Extraction logs (reproducibility)
│   └── uploads/
│       ├── *.svg                   # Vector diagrams (ESA 2026)
│       └── resolucoes/             # Student sketches/photos
├── notebooks/
│   ├── gerenciador_questoes.ipynb  # Question management & rendering
│   ├── gerenciador_usuarios.ipynb  # User/profile management
│   └── questoes_banca.csv          # Raw MathNET + exams dataset
├── docs/
│   ├── architecture.md             # Data model, flows, decisions
│   ├── data-pipeline.md            # Complete pipeline: PDF → structured question
│   ├── engineering-challenges.md   # 6 real incidents + solutions
│   ├── ai-router.md                # Implemented multimodal router
│   └── roadmap.md                  # Expanded roadmap
└── src/
    ├── ai/
    │   ├── client.py               # NVIDIA NIM + Gemini REST client
    │   ├── evaluator.py            # Orchestration: hints + evaluation + OCR
    │   └── router.py               # Routing logic + fallback
    ├── app/
    │   ├── utils.py                # Statement/alternative parsing
    │   ├── components/
    │   │   ├── question_view.py    # LaTeX + native SVG renderer
    │   │   └── feedback_form.py    # Alternatives, justification, metacognition
    │   └── pages/
    │       ├── resolver.py         # Interactive trainer
    │       ├── dashboard.py        # Analytics, radar, gallery
    │       └── banco.py            # Question bank explorer
    └── database/
        ├── __init__.py
        ├── schema.sql              # Complete relational schema
        ├── db.py                   # SQLite connection + CRUD
        └── attempts.py             # Attempts, metrics, SM-2
```

---

## ⚡ Run Locally

```bash
git clone https://github.com/StylishGH/MathAI.git
cd MathAI
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scriptsctivate
pip install -r requirements.txt
streamlit run app.py
```

> **Environment variables** (`.env` or Streamlit Cloud Secrets):
> - `NVIDIA_API_KEY` — NIM (Nemotron/DeepSeek) for text/reasoning
> - `GEMINI_API_KEY` — Gemini Flash-Lite (vision + fallback)
> - `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` — cloud sync (optional locally)

---

## 📈 Current Metrics

| Metric | Value |
|--------|-------|
| Questions processed (EFOMM, ESA, CEDERJ) | 500+ (MathNET 100k+ queued) |
| Socratic hint latency (NVIDIA) | <1s |
| Text evaluation latency | ~1.2s |
| Handwritten OCR latency (Gemini) | ~2.5s |
| Deploy | Continuous (GitHub Actions → Streamlit Cloud) |
| Architecture | Offline-first (local SQLite → Turso sync) |

---

## 🎓 What This Teaches for a Career

MathAI became a **technical laboratory** where I practice:

| Want to Learn | Used In Project |
|---------------|-----------------|
| Advanced SQL | Schema, queries, SM-2, analytics |
| Power BI | Learning data dashboards |
| ML | IRT, BKT, recommender, own models |
| LLMs | Diagnosis, tutor, socratic hints |
| Data Engineering | ETL, quality, MathNET ingestion |
| Architecture | AI Router, multi-provider, fallback |
| Product/UX | Streamlit, metacognition, feedback |

> **Most valuable evolution:** moved from "how do I implement this?" to "what's the source of truth?", "how do I validate?", "observed vs inferred?", "when is AI worth it?", "how to recover from failure?", "how to prove it works?"

Libraries are learned in weeks. This way of thinking takes much longer. MathAI is where I practice it.

---

## 📚 Detailed Technical Documentation

- [System Architecture](docs/architecture.md)
- [Data Pipeline](docs/data-pipeline.md) — complete cycle: PDF → structured question
- [Engineering Challenges](docs/engineering-challenges.md) — 6 real incidents (429, JSON/LaTeX, schema, sync, historical OCR, ground truth)
- [AI Router & Fallbacks](docs/ai-router.md) — task-based routing implementation
- [Roadmap](docs/roadmap.md) — V0→V6 with deliverables per phase

---

## 🤝 Contributing

Issues and PRs welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) (to be created).

---

## 📄 License

MIT License — see [LICENSE](LICENSE).

---

## 👨‍💻 Author

**Guilherme Henrique Mendes**  
Mathematics (UFF/CEDERJ) • Data Science & ML • Python • SQL • Applied AI  
[LinkedIn](https://linkedin.com/in/ghmendes02) • [GitHub](https://github.com/StylishGH) • [Email](mailto:ghmendes@id.uff.br)
