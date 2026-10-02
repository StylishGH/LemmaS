# MathAI 🧠📐

[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://python.org)
[![Streamlit](https://img.shields.io/badge/Streamlit-1.38-FF4B4B.svg)](https://streamlit.io)
[![SQLite](https://img.shields.io/badge/SQLite-3.45-003B57.svg)](https://sqlite.org)
[![Turso](https://img.shields.io/badge/Turso-Cloud%20DB-3A86FF.svg)](https://turso.tech)
[![Gemini API](https://img.shields.io/badge/Gemini-API-4285F4.svg)](https://ai.google.dev)
[![NVIDIA NIM](https://img.shields.io/badge/NVIDIA-NIM-76B900.svg)](https://nim.nvidia.com)
[![DeepSeek](https://img.shields.io/badge/DeepSeek-v4.1-FF6B35.svg)](https://deepseek.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Deploy](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://mathia.streamlit.app)

---

## 🚀 Live Demo
**[mathia.streamlit.app](https://mathia.streamlit.app)** — try the platform now

## 📸 Visual Demo
![MathAI Demo](assets/demo.gif)

---

## 🎯 Objective
Build an adaptive tutor that evolves a cognitive model of each student from:
- Solved questions, correct/incorrect answers, resolution time
- Strategies used, confidence level, justifications
- Handwritten resolutions (photo/notebook), socratic hint interactions

**Long-term vision:** Knowledge Tracing (BKT/DKT), personalized recommendation, custom ML models trained on collected data.

---

## 🏗️ AI Architecture — Intelligent Task Routing

MathAI's key technical differentiator is a **multimodal AI router** that selects the best model per task, optimizing latency, cost, and quality:

```
                            [ Student / System Input ]
                                          │
        ┌─────────────────────────────────┼────────────────────────────────┐
        ▼                                 ▼                                ▼
 💡 Socratic Hints             📝 Student Resolution             📦 Batch Ingestion
  ("Reveal Hint" btn)           (Cognitive Evaluator)            (MathNet / Exams)
        │                                 │                                │
        │                    ┌────────────┴────────────┐                   │
        │                    ▼                         ▼                   │
        │             [ Text Only ]              [ Photo/Notebook ]        │
        │                    │                         │                   │
        ▼                    ▼                         ▼                   ▼
┌─────────────────────────────────┐           ┌──────────────────┐  ┌──────────────────┐
│      NVIDIA NIM (Primary)       │           │  Google Gemini   │  │   Pure Python    │
│  - Nemotron 3.5 Lightning (1s)  │           │   (Flash-Lite)   │  │   (95% Volume)   │
│  - DeepSeek v4.1 Flash (MoE)    │           │                  │  │                  │
│                                 │           │  Multimodal OCR  │  │   Filters/Regex  │
│  *Latency < 1s / Unlimited Quota│           │   notebooks &    │  │   zero AI cost   │
└────────────────┬────────────────┘           │   handwritten    │  └────────┬─────────┘
                 │ (timeout/error)            └────────┬─────────┘           │ (5% Hard Cases)
                 ▼                                     │                     ▼
┌─────────────────────────────────┐                    │            ┌──────────────────┐
│      Google Gemini (Fallback)   │◄───────────────────┘            │ NVIDIA NIM Queue │
│  - gemini-3.5-flash-lite        │                                 │ (Throttling 38   │
│  - gemini-flash-lite-latest     │                                 │  req/min)        │
└─────────────────────────────────┘                                 └──────────────────┘
```

### Per-Use-Case Breakdown

#### 1. 💡 Socratic Hints (`obter_dica_socratica`)
| Priority | Model | Rationale |
|----------|-------|-----------|
| **Primary** | **NVIDIA Nemotron 3.5 Lightning** | ~0.9s response, native socratic tone, unlimited quota |
| **Backup** | **DeepSeek v4.1 Flash (MoE)** | Robust alternative via NVIDIA NIM |
| **Fallback** | **Google Gemini 3.5 Flash-Lite** | If NVIDIA timeout (>12s) or error |

#### 2. 🧠 Cognitive Evaluation (`analisar_resolucao`)

| Input Type | Primary Engine | Why |
|------------|----------------|-----|
| **Text (justification)** | NVIDIA Nemotron 3.5 / DeepSeek v4.1 | Heavy reasoning, structured JSON, speed |
| **Photo/Notebook/PDF** | **Google Gemini Flash-Lite** | Best-in-class multimodal OCR — reads handwriting, smudges, crumpled paper → direct LaTeX |

**Unified fallback:** Gemini takes over if NVIDIA fails on any route.

#### 3. 📦 Batch Ingestion Pipeline (MathNet — *In Progress*)
| Phase | Volume | Technology | Control |
|-------|--------|------------|---------|
| **1. Deterministic processing** | 95% | Pure Python (Regex, LaTeX validation, dedup, language detection) | **Zero AI cost** |
| **2. Ambiguous/rare languages** | 5% | NVIDIA NIM queue (38 req/min — respects 40 RPM cap) | Auto-throttling anti-429 |
| **3. Failure audit** | <1% | Gemini Flash-Lite (point review of broken LaTeX) | Quality gate |

### Role Summary
| Provider | System Role |
|----------|-------------|
| **NVIDIA NIM** | Volume engine, speed (<1s), heavy text reasoning — shields Gemini quota |
| **Google Gemini** | Multimodal vision specialist (eyes on notebook) + high-fidelity auditor |
| **Python/Regex** | 95% deterministic layer — zero cost, max throughput |

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Backend / Orchestration** | Python 3.11, Streamlit 1.38 |
| **Data / Persistence** | SQLite 3.45 (local) + Turso (cloud sync), Pandas 2.2, NumPy |
| **AI — Text & Reasoning** | NVIDIA NIM (Nemotron 3.5, DeepSeek v4.1), Google Gemini 3.5 Flash-Lite |
| **AI — Multimodal Vision** | Google Gemini Flash-Lite (handwritten OCR → LaTeX) |
| **Frontend / Math Rendering** | Streamlit, KaTeX / LaTeX |
| **CI/CD** | GitHub Actions → Streamlit Cloud (continuous deploy) |
| **Versioning / Docs** | Git/GitHub, LaTeX (teaching materials) |

---

## ⚡ Run Locally

```bash
git clone https://github.com/StylishGH/MathAI.git
cd MathAI
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
streamlit run app.py
```

> **Required environment variables** (set in `.env` or Streamlit Cloud secrets):
> - `NVIDIA_API_KEY` — for NIM (Nemotron/DeepSeek)
> - `GEMINI_API_KEY` — for Gemini Flash-Lite (vision + fallback)
> - `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` — cloud sync (optional locally)

---

## 📊 Project Metrics
- **500+ questions** processed (EFOMM, ESA, CEDERJ) — *expanding*
- **Avg socratic hint latency:** <1s (NVIDIA NIM)
- **Avg text evaluation latency:** ~1.2s
- **Avg handwritten OCR latency:** ~2.5s (Gemini Flash-Lite)
- **Deploy:** Continuous via GitHub Actions → Streamlit Cloud
- **Architecture:** Offline-first (local SQLite) → Turso sync (production)

---

## 📚 Technical Documentation
- [System Architecture](docs/architecture.md) — data model, flows, decisions
- [Data Pipeline](docs/data-pipeline.md) — PDF → ETL → SQLite/Turso
- [AI Router & Fallbacks](docs/ai-router.md) — routing implementation
- [Challenges & Decisions](docs/challenges.md) — lessons learned

---

## 🗺️ Roadmap
- [ ] **Knowledge Tracing** (BKT/DKT) on student history
- [ ] **Personalized recommendation** (bandit / embedding similarity)
- [ ] **Custom models** fine-tuned on collected data (distillation from Nemotron/DeepSeek)
- [ ] **REST API** for external integration (schools, platforms)
- [ ] **Teacher analytics dashboard** (classes, gap heatmaps)

---

## 🤝 Contributing
Issues and PRs welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 📄 License
MIT License — see [LICENSE](LICENSE).

---

## 👨‍💻 Author
**Guilherme Henrique Mendes**  
Mathematics (UFF/CEDERJ) • Data Science & ML • Python • SQL • Applied AI  
[LinkedIn](https://linkedin.com/in/ghmendes02) • [GitHub](https://github.com/StylishGH) • [Email](mailto:ghmendes@id.uff.br)