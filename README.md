<div align="center">
  <h1>Lemmas 📐</h1>
  <p><strong>Adaptive mathematics learning platform powered by data, psychometrics, and multi-model AI.</strong></p>
  <p>An applied engineering project exploring Data Engineering, Applied Machine Learning, and Epistemic System Design.</p>
  <p><a href="./README.pt-BR.md">🇧🇷 Português (Brasil)</a> &nbsp;|&nbsp; <strong>🇺🇸 English</strong></p>
  <p><a href="https://lemmas-ochre.vercel.app/dashboard"><strong>🚀 Try Lemmas Live Demo</strong></a></p>
  <p>
    <img src="https://img.shields.io/badge/Next.js-16-000000?logo=next.js" alt="Next.js 16" />
    <img src="https://img.shields.io/badge/FastAPI-Python%203.12-009688?logo=fastapi" alt="FastAPI" />
    <img src="https://img.shields.io/badge/Supabase-PostgreSQL%20RLS-3ECF8E?logo=supabase" alt="Supabase / PostgreSQL" />
    <img src="https://img.shields.io/badge/AI%20Gateway-Nemotron%20%7C%20DeepSeek%20%7C%20Gemini-76B900" alt="Multi-Model Gateway" />
    <img src="https://img.shields.io/badge/Psychometrics-FSRS--v4%20%7C%20SM--2%20%7C%20IRT--3PL-blue" alt="FSRS & IRT" />
    <img src="https://img.shields.io/badge/Data%20Integrity-SHA--256%20Provenance-orange" alt="SHA-256 Provenance" />
    <img src="https://img.shields.io/badge/Status-V1%20Launch%20Ready-success" alt="V1 Launch Ready" />
  </p>
</div>

---

## 📌 Executive Summary

What happens when an adaptive learning platform treats the student's problem-solving process as **structured data** rather than merely logging binary correct/incorrect answers?

Two students can miss the same calculus problem for completely different reasons: one may suffer from an axiomatic misconception (e.g., misapplying the Chain Rule), while the other understands the concept perfectly but made an elementary arithmetic error. 

**Lemmas** was architected from first principles by a Mathematics undergraduate at **Universidade Federal Fluminense (UFF)**. It unites mathematical rigor, modern Data Engineering, and psychometric modeling to evaluate discursive mathematical proofs step-by-step.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CORE EPISTEMIC MANDATE                                │
│                                                                             │
│   RAW OBSERVED DATA        AI INTERPRETATION         VALIDATED GROUND TRUTH │
│  [Immutable SHA-256]   ≠   [Versioned Model]    ≠     [Human-in-the-Loop]   │
│   Student's verbatim        Hypothesis with            Verified label for   │
│    handwriting/text          prompt provenance          supervised training │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📸 Product Visual Showcase

| Discursive Workbench & KaTeX Rendering | Multi-Model Second Opinion |
| :---: | :---: |
| ![Bancada Discursiva](docs/assets/bancada.png) | ![Segunda Opinião](docs/assets/segunda_opiniao.png) |
| *Step-by-step proof workbench with canvas scratchpad, compass, and multimodal OCR.* | *Side-by-side comparative debate: Axiomatic Rigor (Nemotron) vs Heuristics.* |

| Metacognitive Dashboard & Mastery Radar | Audited Question & Lemma Repository (20,803 Items) |
| :---: | :---: |
| ![Dashboard](docs/assets/dashboard.png) | ![Banco de Questões](docs/assets/banco_questoes.png) |
| *Retention cycles, domain mastery metrics, and error pattern telemetry.* | *Classified Olympiad & military exam questions rendered in native KaTeX.* |

---

## 🏗️ System Architecture

The platform separates user interaction, API contracts, model routing, and persistent storage into isolated layers:

```mermaid
flowchart TD
    subgraph Client ["Client Layer · Next.js 16 (App Router + Turbopack + KaTeX)"]
        UI_Bench["Discursive Workbench (Canvas / OCR / Text)"]
        UI_Dash["Metacognition Dashboard & Radar"]
        UI_Repo["Repository (20,803 Questions & Lemmata)"]
    end

    subgraph Backend ["Engine Layer · FastAPI (Python 3.12)"]
        Auth["Security Guard (Token & Anon Key Validator)"]
        HashEngine["Integrity Engine (Deterministic SHA-256 Hash)"]
        Router["MathAI Multi-Model Gateway Strategy"]
        Sched["Memory & Psychometrics (FSRS-v4 / SM-2 / IRT-3PL)"]
    end

    subgraph Providers ["Inference Layer (LLM & Vision Providers)"]
        Nemo["NVIDIA Nemotron (Axiomatic Proofs & Formal Logic)"]
        Deep["DeepSeek (Intuitive Heuristics & Alternative Paths)"]
        Gemini["Google Gemini Flash-Lite (Multimodal OCR & Vision)"]
    end

    subgraph Storage ["Data Platform · Supabase PostgreSQL"]
        DB_Raw[("Raw Submissions (Observed, Immutable)")]
        DB_Eval[("AI Evaluations (Hypotheses & Logs)")]
        DB_Feedback[("Validated Feedback (Ground Truth)")]
        DB_Meta[("Student Metacognition & Flashcards")]
    end

    UI_Bench --> Auth
    UI_Dash --> Auth
    UI_Repo --> Auth

    Auth --> HashEngine
    HashEngine --> DB_Raw

    HashEngine --> Router
    Router --> Nemo
    Router --> Deep
    Router --> Gemini

    Nemo --> DB_Eval
    Deep --> DB_Eval
    Gemini --> DB_Eval

    UI_Dash --> Sched
    Sched --> DB_Meta
    DB_Eval -.-> DB_Feedback
```

---

## 🔬 Mathematical & Psychometric Modeling

Lemmas avoids opaque "black-box" guessing by implementing proven mathematical models for knowledge retention and student ability:

### 1. Retention Modeling: FSRS-v4 & SM-2
To predict the optimal moment for reviewing mathematical lemmata, the engine implements a spaced-repetition scheduler inspired by the Free Spaced Repetition Scheduler (FSRS-v4):
$$R(t) = \left(1 + F \cdot \frac{t}{S}\right)^{-1}$$
Where:
- $R(t)$ is the probability of retrievability at day $t$.
- $S$ is memory stability (days until retrievability drops to 90%).
- $F$ is a factor calibrated against student difficulty ratings ($D \in [1, 10]$).

### 2. Item Response Theory (IRT / TRI 3PL)
Question calibration uses the Three-Parameter Logistic Model:
$$P(\theta) = c + \frac{1 - c}{1 + e^{-a(\theta - b)}}$$
- $\theta$: Student latent ability level.
- $a$: Discrimination parameter of the question.
- $b$: Difficulty parameter of the theorem/exercise.
- $c$: Pseudo-chance (guessing probability for multiple-choice items).

---

## 🛠️ Data Engineering & MLOps Highlights

- **Data Integrity & Traceability:** Every student submission computes a deterministic SHA-256 digest over the raw input (canvas strokes, transcribed text, or uploaded image bytes) before entering the inference pipeline.
- **Strict Data Contracts:** Clean Pydantic schemas (DTOs) enforce input/output contracts across all FastAPI routes.
- **Relational Integrity with Row Level Security (RLS):** 20 PostgreSQL tables hosted on Supabase enforce multi-tenant isolation so no student data can ever leak across sessions.
- **Multi-Model Strategy Pattern:** A dynamic routing gateway decouples application code from concrete AI providers:
  - **NVIDIA Nemotron 70B/120B:** Formal derivation and rigorous verification.
  - **Google Gemini Flash-Lite:** Low-latency (<600ms) OCR of handwritten student notebook pages.
  - **DeepSeek:** Conceptual suggestions and creative heuristic shortcuts.

---

## 💻 Tech Stack

| Domain | Technologies |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, KaTeX |
| **Backend** | Python 3.12, FastAPI, Pydantic V2, Uvicorn |
| **Database & Auth** | Supabase (PostgreSQL with RLS), deterministic SHA-256 hashing |
| **Applied AI & Vision** | Google Gemini (OCR), NVIDIA NIM / Nemotron, DeepSeek |
| **Psychometrics & Memory**| FSRS-v4 Spaced Repetition, SM-2 Engine, Item Response Theory (3PL) |
| **Testing & Quality** | pytest (Backend & Core architecture), Vitest (Frontend components) |

---

## 🚀 Running Locally

### Prerequisites
- Python 3.12+
- Node.js 20+
- A Supabase project (or local PostgreSQL)

### 1. Clone the repository
```bash
git clone https://github.com/StylishGH/LemmaS.git
cd LemmaS
```

### 2. Start Backend API
```bash
cd backend
python -m venv .venv

# Linux / macOS:
source .venv/bin/activate
# Windows:
.venv\Scripts\Activate.ps1

pip install -r requirements.txt
cp ../.env.example .env
uvicorn app.main:app --reload --port 8000
```
*API documentation will be available at `http://localhost:8000/docs`.*

### 3. Start Frontend
```bash
cd ../frontend
npm install
npm run dev
```
*Open `http://localhost:3000` in your browser.*

---

## 🎯 Current Status & Deliberate Engineering Roadmap

- [x] **Monorepo Architecture:** Next.js 16 frontend + FastAPI backend.
- [x] **Epistemic Data Pipeline:** SHA-256 hashing and raw submission isolation.
- [x] **Discursive Workbench & Multimodal OCR:** KaTeX parsing of handwritten drafts.
- [x] **Audited Question Bank:** 20,803 classified math problems.
- [x] **Multi-Model Gateway:** Rerouting between Nemotron, Gemini, and DeepSeek.
- [ ] **Full Database Migration:** Replacing remaining prototype in-memory stores with durable PostgreSQL tables.
- [ ] **Empirical Calibration:** Fine-tuning FSRS parameters with real student interaction logs.
- [ ] **Model Evals Harness:** Systematic latency, cost, and hallucination benchmark suite across mathematical task types.

---

## 👨‍💻 About the Author

**Guilherme Henrique Mendes**  
*Undergraduate in Mathematics at Universidade Federal Fluminense (UFF)*  
Passionate about Data Science, Machine Learning, Psychometrics, and Software Engineering.

- 💼 **LinkedIn:** [linkedin.com/in/ghmendes02](https://linkedin.com/in/ghmendes02)
- 🐙 **GitHub:** [github.com/StylishGH](https://github.com/StylishGH)
- 📧 **Email:** [ghmendes@id.uff.br](mailto:ghmendes@id.uff.br)

---

*Lemmas is the learning platform. MathAI is the specialized intelligence layer powering it.*
