<div align="center">
  <img src="docs/assets/logo.svg" alt="Lemmas — left half dark chalkboard mode, right half light whiteboard mode" width="480" />
  <p><strong>Adaptive mathematics learning platform powered by data, psychometrics, and multi-model AI.</strong></p>
  <p>An applied engineering project exploring Data Engineering, Applied Machine Learning, and Epistemic System Design.</p>
  <p><a href="./README.pt-BR.md">🇧🇷 Português (Brasil)</a> &nbsp;|&nbsp; <strong>🇺🇸 English</strong></p>
  <p><a href="https://lemmas-ochre.vercel.app/dashboard"><strong>🚀 Try Lemmas Live Demo</strong></a></p>
  <p>
    <img src="https://img.shields.io/badge/Next.js-16-000000?logo=next.js" alt="Next.js 16" />
    <img src="https://img.shields.io/badge/FastAPI-Python%203.12-009688?logo=fastapi" alt="FastAPI" />
    <img src="https://img.shields.io/badge/Supabase-PostgreSQL%20RLS-3ECF8E?logo=supabase" alt="Supabase / PostgreSQL" />
    <img src="https://img.shields.io/badge/AI%20Gateway-Nemotron%20%7C%20DeepSeek%20%7C%20Gemini-76B900" alt="Multi-Model Gateway" />
    <img src="https://img.shields.io/badge/Psychometrics-SM--2%20(Live)%20%7C%20FSRS--v4%20%26%20IRT%20(Roadmap)-blue" alt="SM-2 & Psychometrics" />
    <img src="https://img.shields.io/badge/Data%20Integrity-SHA--256%20Provenance-orange" alt="SHA-256 Provenance" />
    <img src="https://img.shields.io/badge/Status-V1%20Launch%20Ready-success" alt="V1 Launch Ready" />
  </p>
</div>

---

## 📌 Executive Summary

What happens when an adaptive learning platform treats the student's problem-solving process as **structured data** rather than merely logging binary correct/incorrect answers?

Two students can miss the same calculus problem for completely different reasons: one may suffer from an axiomatic misconception (e.g., misapplying the Chain Rule), while the other understands the concept perfectly but made an elementary arithmetic error. 

**Lemmas** was architected from first principles by a Mathematics undergraduate at **Universidade Federal Fluminense (UFF)**. It unites mathematical rigor, modern Data Engineering, and psychometric modeling to evaluate discursive mathematical proofs step-by-step.

<table align="center">
  <tr>
    <td colspan="5" align="center"><strong>CORE EPISTEMIC MANDATE</strong></td>
  </tr>
  <tr>
    <td align="center">
      <strong>RAW OBSERVED DATA</strong><br />
      [Immutable SHA-256]<br />
      Student's verbatim<br />
      handwriting/text
    </td>
    <td align="center">≠</td>
    <td align="center">
      <strong>AI INTERPRETATION</strong><br />
      [Versioned Model]<br />
      Hypothesis with<br />
      prompt provenance
    </td>
    <td align="center">≠</td>
    <td align="center">
      <strong>VALIDATED GROUND TRUTH</strong><br />
      [Human-in-the-Loop]<br />
      Verified label for<br />
      supervised training
    </td>
  </tr>
</table>

---

## 📸 Product Visual Showcase

<table align="center">
  <tr>
    <td align="center" width="50%">
      <strong>Discursive Workbench &amp; KaTeX Rendering</strong><br />
      <img src="docs/assets/bancada.png" alt="Bancada Discursiva" width="100%" /><br />
      <em>Step-by-step proof workbench with canvas scratchpad, compass, and multimodal OCR.</em>
    </td>
    <td align="center" width="50%">
      <strong>Multi-Model Second Opinion</strong><br />
      <img src="docs/assets/segunda_opiniao.png" alt="Segunda Opinião" width="100%" /><br />
      <em>Side-by-side comparative debate: Axiomatic Rigor (Nemotron) vs Heuristics.</em>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <strong>Metacognitive Dashboard &amp; Mastery Radar</strong><br />
      <img src="docs/assets/dashboard.png" alt="Dashboard" width="100%" /><br />
      <em>Retention cycles, domain mastery metrics, and error pattern telemetry.</em>
    </td>
    <td align="center" width="50%">
      <strong>Audited Question &amp; Lemma Repository (20,803 Items)</strong><br />
      <img src="docs/assets/banco_questoes.png" alt="Banco de Questões" width="100%" /><br />
      <em>Classified Olympiad &amp; military exam questions rendered in native KaTeX.</em>
    </td>
  </tr>
</table>

---

## 🏗️ System Architecture

The platform separates user interaction, API contracts, model routing, and persistent storage into isolated layers:

<table align="center">
  <tr>
    <td align="center">
      <strong>Client Layer · Next.js 16 (App Router + Turbopack + KaTeX)</strong><br />
      Discursive Workbench (Canvas / OCR / Text) · Metacognition Dashboard &amp; Radar · Repository (20,803 Questions &amp; Lemmata)
    </td>
  </tr>
  <tr><td align="center">⬇</td></tr>
  <tr>
    <td align="center">
      <strong>Engine Layer · FastAPI (Python 3.12)</strong><br />
      Security Guard (Token &amp; Anon Key Validator) · Integrity Engine (Deterministic SHA-256 Hash) · MathAI Multi-Model Gateway Strategy · Memory &amp; Psychometrics (FSRS-v4 / SM-2 / IRT-3PL)
    </td>
  </tr>
  <tr><td align="center">⬇</td></tr>
  <tr>
    <td align="center">
      <strong>Inference Layer (LLM &amp; Vision Providers)</strong><br />
      NVIDIA Nemotron (Axiomatic Proofs &amp; Formal Logic) · DeepSeek (Intuitive Heuristics &amp; Alternative Paths) · Google Gemini Flash-Lite (Multimodal OCR &amp; Vision)
    </td>
  </tr>
  <tr><td align="center">⬇</td></tr>
  <tr>
    <td align="center">
      <strong>Data Platform · Supabase PostgreSQL</strong><br />
      Raw Submissions (Observed, Immutable) · AI Evaluations (Hypotheses &amp; Logs) · Validated Feedback (Ground Truth) · Student Metacognition &amp; Flashcards
    </td>
  </tr>
</table>

---

## 🔬 Mathematical & Psychometric Foundations

Lemmas approaches learning through formal mathematical modeling rather than opaque heuristic guessing, strictly distinguishing between **what runs in production today** and **exploratory research**:

### 1. Spaced Repetition in Production: SuperMemo-2 (SM-2)
In the current live deployment, retention schedules for questions and lemmata are actively computed and persisted using the deterministic **SuperMemo-2 (SM-2)** algorithm:
- Every evaluated submission updates the student's Ease Factor ($EF \in [1.3, 2.5]$) and interval $I(n)$:
  $$EF' = \max\left(1.3, \; EF + (0.1 - (5 - q) \cdot (0.08 + (5 - q) \cdot 0.02))\right)$$
  Where $q \in [0, 5]$ is the performance grade mapped from the four qualitative verdicts.
- Persistent state is written immediately to `public.revisao_espacada` on Supabase PostgreSQL.

### 2. Algorithmic Prototype: FSRS-v4 (Free Spaced Repetition Scheduler)
For flashcard and lemmata decay modeling, the backend provides an initial implementation inspired by the modern FSRS formulation:
$$R(t) = \left(1 + F \cdot \frac{t}{S}\right)^{-1}$$
- Memory stability ($S$) and difficulty ($D$) data contracts are implemented in `app/services/mathai/flashcards.py`.
- *Status:* Operational in prototype mode with heuristic constants; empirical parameter optimization via maximum likelihood estimation is planned once user interaction volume increases.

### 3. Scientific Research Target: Item Response Theory (IRT / TRI 3PL)
To evolve beyond ordinal difficulty tags (1 to 5) into continuous psychometrics, future offline data science experiments will calibrate items using the Three-Parameter Logistic Model:
$$P(\theta) = c + \frac{1 - c}{1 + e^{-a(\theta - b)}}$$
- $\theta$: Latent mathematical proficiency of the student.
- $a$: Item discrimination power.
- $b$: Item intrinsic difficulty parameter.
- $c$: Pseudo-guessing parameter for multiple-choice questions.
- *Status:* Formal research roadmap. No custom latent trait estimator is claimed as deployed today.

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
| **Psychometrics & Memory**| SM-2 Engine (Active in production), FSRS-v4 (Prototype), IRT 3PL (Research Roadmap) |
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
