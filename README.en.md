<div align="center">
  <h1>Lemmas 🧠📐</h1>
  <p>An adaptive mathematics learning platform combining Mathematics, Artificial Intelligence, Data Science, and spaced repetition.</p>

  <p align="right">
    <b>🇧🇷 Versão em Português</b> &nbsp;|&nbsp; <a href="./README.md">🇺🇸 English Version</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-15-black.svg?style=flat-square" alt="Next.js" />
    <img src="https://img.shields.io/badge/FastAPI-0.115-009688.svg?style=flat-square" alt="FastAPI" />
    <img src="https://img.shields.io/badge/PostgreSQL-16-336791.svg?style=flat-square" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Tailwind-v4-06B6D4.svg?style=flat-square" alt="Tailwind" />
    <img src="https://img.shields.io/badge/Python-3.11-blue.svg?style=flat-square" alt="Python" />
  </p>

  <p><strong>Powered by the <a href="#-mathai">MathAI Engine</a></strong></p>
</div>

---

## 🪦 Before Lemmas, there was MathAI

**Lemmas** was born from a project called **MathAI**.

The original idea was relatively simple: create a study tool that could learn from the student's own answers, identify errors, recommend exercises, and help during Mathematics study.

Over time, the project grew.

MathAI ceased to be just a study application and started to involve:

* language models;
* analysis of student resolutions;
* exercise recommendation;
* spaced repetition;
* computer vision;
* data collection and structuring;
* personalized learning models.

At this point, a problem emerged:

> **MathAI no longer described the product.**

So **MathAI was "retired" as the platform name**.

And **Lemmas** was born.

The name MathAI, however, did not completely die.

It was transformed into the original idea that gave birth to the project: **a future AI specialized in mathematical learning**, responsible for acting as the intelligent brain behind Lemmas.

```text
                    MATHAI
                       │
             ┌─────────┴─────────┐
             │                   │
       old product          future IA
             │                   │
             ▼                   ▼
          LEMMAS              MathAI
        platform            system brain
```

Thus, Lemmas is the platform.

MathAI will be, in the future, its intelligence.

---

# 🧠 What is Lemmas?

Lemmas is an adaptive mathematics learning platform that combines **Mathematics, Artificial Intelligence, Data Science, and spaced repetition** to build a personalized study experience.

The goal is not simply to answer questions.

Lemmas seeks to understand:

* how the student solves problems;
* where they tend to err;
* which concepts they master;
* which difficulties persist;
* how their memory evolves;
* which exercises are most suitable;
* and which study strategies work best for them.

The central idea is to transform every interaction with the platform into a learning opportunity — both for the student and for the system.

---

# 📖 The idea behind the project

Lemmas starts from a simple premise:

> **Two people can get the same question wrong for completely different reasons.**

One may not know the concept.

Another may know the concept but make an algebraic error.

Another may solve correctly but struggle to recognize when that concept should be applied.

Therefore, the system must not merely record:

```text
Student → got it right
Student → got it wrong
```

It must seek to understand:

```text
What did the student do?
Why did they probably do that?
What happened before?
How did they respond to feedback?
Did that error return?
Which intervention helped?
```

This information forms the basis of the Lemmas learning model.

---

# 🏗️ Architecture

```text
                                    ┌──────────────────────┐
                                    │        STUDENT       │
                                    │                      │
                                    │ questions            │
                                    │ answers              │
                                    │ images               │
                                    │ feedback             │
                                    └──────────┬───────────┘
                                               │
                                               ▼
                              ┌─────────────────────────────┐
                              │          FRONTEND           │
                              │                             │
                              │         Next.js             │
                              │         React               │
                              └──────────────┬──────────────┘
                                             │
                                             ▼
                              ┌─────────────────────────────┐
                              │           BACKEND           │
                              │                             │
                              │           FastAPI           │
                              └──────────────┬──────────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    ▼                        ▼                        ▼
             ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
             │  DATABASE   │         │    MATHAI   │         │    VISION   │
             │             │         │   Gateway   │         │             │
             │ PostgreSQL  │         │             │         │ OCR / Image │
             │ / Supabase  │         └──────┬──────┘         └──────┬──────┘
             └──────┬──────┘                │                       │
                    │                       ▼                       │
                    │                ┌─────────────┐                │
                    │                │   ROUTING   │◄───────────────┘
                    │                └──────┬──────┘
                    │                       │
                    │                       ▼
                    │                    9Router
                    │                       │
                    │             ┌─────────┼─────────┐
                    │             ▼         ▼         ▼
                    │          Model A   Model B   Model C
                    │          primary  fallback  fallback
                    │
                    ▼
             ┌────────────────────┐
             │   AI_EVALUATION   │
             │                    │
             │ model              │
             │ provider           │
             │ version            │
             │ prompt             │
             │ timestamp          │
             │ confidence         │
             └──────────┬─────────┘
                        │
                        ▼
                 STUDENT FEEDBACK
                        │
                        ▼
                  DATA PIPELINE
                        │
             ┌──────────┴──────────┐
             ▼                     ▼
      TRUSTED DATA           AMBIGUOUS DATA
             │                     │
             ▼                     ▼
          ML / IA              review
             │
             ▼
          MATHAI
```

---

# 🤖 MathAI

**MathAI** is the future specialized intelligence layer of Lemmas.

It does not need to be a single model.

The architecture was designed so that MathAI can use different models and components depending on the task.

### Possible capabilities

* Mathematical tutoring;
* resolution correction;
* error identification;
* concept explanation;
* question generation;
* exercise recommendation;
* review card generation;
* student history analysis;
* understanding of images and handwritten resolutions;
* learning profile construction;
* intelligent routing between different models.

The MathAI Gateway acts as the intermediate layer between Lemmas and the models used by the system.

---

# 🔀 Model Routing

The Gateway determines **what the task requires**.

Example:

```text
Simple question
      ↓
fast model

Complex math question
      ↓
mathematical reasoning model

Handwritten resolution
      ↓
multimodal model

Critical evaluation
      ↓
strongest model
```

After selection, **9Router** can handle routing and fallback mechanisms.

```text
MathAI Gateway
      │
      ▼
   9Router
      │
      ▼
  Model A
      │
  failed?
      │
      ▼
  Model B
      │
  failed?
      │
      ▼
  Model C
```

Model infrastructure can change without the rest of the application needing to be rewritten.

---

# 🗃️ Data: preserving what the student actually did

One of Lemmas' core architectural decisions is to separate:

```text
OBSERVED DATA
       ≠
AI INTERPRETATION
       ≠
VALIDATED DATA
```

## Observed Data

Represents what actually happened.

```text
original answer
original image
question
time spent
previous attempts
hints used
student feedback
```

## AI Interpretation

Represents what MathAI inferred.

```text
probable error
related concept
estimated difficulty
mastery level
recommendation
confidence
```

## Validated Data

Represents information that has undergone some validation process.

```text
confirmed error
confirmed concept
revised label
validated evaluation
```

### Fundamental Rule

> **The student's original data must never be overwritten by AI interpretation.**

This way, the same original data can be re-evaluated by different models in the future.

---

# 🔬 Evaluation provenance

Every evaluation produced by MathAI can record:

```text
attempt_id
model_provider
model_name
model_version
prompt_version
evaluator_version
fallback_level
timestamp
input_hash
output
confidence
```

This allows tracing exactly where a given interpretation came from.

For example:

```text
Attempt #92817

Model:
DeepSeek X

Version:
3.2

Prompt:
evaluator_v7

Fallback:
0

Result:
sign_error

Confidence:
0.91
```

If we later discover that a certain model version has issues with geometry, we can identify exactly which evaluations were produced by it.

---

# 📚 Adaptive learning

The future goal is to build a **Student Model** capable of representing each student's learning state.

```text
                       STUDENT
                          │
          ┌───────────────┼────────────────┐
          ▼               ▼                ▼
      concepts       difficulties      history
          │               │                │
          └───────────────┼────────────────┘
                          ▼
                    STUDENT MODEL
                          │
                 ┌────────┼────────┐
                 ▼        ▼        ▼
              mastery   memory   errors
                          │
                          ▼
                    recommendation
```

The model may use information such as:

* performance by concept;
* error frequency;
* resolution time;
* attempts;
* reviews;
* retention;
* feedback;
* exercise difficulty.

---

# 🔁 Spaced repetition

Lemmas has its own review card system.

Cards can be:

### Generated by MathAI

```text
recurring error
      ↓
MathAI identifies pattern
      ↓
suggests card
      ↓
student edits / accepts / rejects
```

### Created by the student

The student can also create their own cards.

### Possible types

```text
Formula
Concept
Recognition
Application
Personal error
Image / diagram
```

Each review's history is stored so the system can estimate retention and improve future reviews.

Anki integration is treated as **export**, while the complete learning history remains with Lemmas.

---

# 📈 Forgetting curve and memory

The review system does not need to assume a single universal forgetting curve.

The project may study and compare different models and approaches, including:

```text
Ebbinghaus
Exponential
Power law
Hyperbolic models
Half-Life Regression
FSRS
```

Long term, Lemmas' own collected data may allow investigating how different retention patterns appear in different students and concepts.

```text
                    REVISION DATA
                          │
                          ▼
                  RETENTION MODEL
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
      Exponential      Power            FSRS
          │               │               │
          └───────────────┼───────────────┘
                          ▼
                    better prediction
                          │
                          ▼
                   better scheduler
```

---

# 🧠 From student to data

Each interaction can generate a chain of information:

```text
Question
   ↓
Attempt
   ↓
Error / success
   ↓
MathAI Analysis
   ↓
Feedback
   ↓
Review
   ↓
Retention
   ↓
New recommendation
```

With platform growth, this chain can transform into data for research and Machine Learning.

---

# 📊 Data Pipeline

```text
                  STUDENT DATA
                         │
                         ▼
                      RAW DATA
                         │
                         ▼
                 DATA VALIDATION
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
        quality      consent      deduplication
             │           │           │
             └───────────┼───────────┘
                         ▼
                  LABEL GENERATION
                         │
             ┌───────────┼───────────┐
             ▼                       ▼
       AI-generated             Human validated
             │                       │
             └───────────┼───────────┘
                         ▼
                       DATASET
                         │
                         ▼
                    ML / STATS
```

Ambiguous data should not be automatically used for training.

The idea is to preserve quality and provenance of examples before using them in future models.

---

# 🔬 Research and Machine Learning

With sufficient data, Lemmas may investigate questions like:

* Which error types appear most frequently?
* Which interventions help each student type?
* Which cards show highest retention?
* Which review interval works best for a given concept?
* Which AI model is most accurate for a given problem type?
* Which models offer the best cost-benefit?
* Can we predict when a given concept will likely be forgotten?
* Can we predict which exercise will benefit a given student most?

The goal is not merely to accumulate data.

It is to transform learning data into **knowledge about learning**.

---

# ⚡ Quick Start

## Prerequisites

Before starting, install:

* [Git](https://git-scm.com/)
* [Node.js](https://nodejs.org/)
* [Python](https://www.python.org/)
* PostgreSQL or a Supabase instance

## 1. Clone the repository

```bash
git clone https://github.com/seu-usuario/lemmas.git
cd lemmas
```

## 2. Configure the backend

```bash
cd backend

python -m venv .venv
```

### Linux / macOS

```bash
source .venv/bin/activate
```

### Windows

```powershell
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create your environment file:

```bash
cp .env.example .env
```

Fill in the necessary variables in `.env`, including database and AI service credentials.

Start the API:

```bash
uvicorn app.main:app --reload
```

The backend will be available locally at:

```text
http://localhost:8000
```

API documentation can be accessed at:

```text
http://localhost:8000/docs
```

## 3. Configure the frontend

In another terminal:

```bash
cd frontend
npm install
```

Create the environment file:

```bash
cp .env.example .env.local
```

Configure the API URL:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the frontend:

```bash
npm run dev
```

The application will be available at:

```text
http://localhost:3000
```

## 4. Local environment

With both services running:

```text
Browser
   │
   ▼
localhost:3000
   │
   ▼
Next.js
   │
   │ API
   ▼
localhost:8000
   │
   ▼
FastAPI
   │
   ├── PostgreSQL / Supabase
   │
   └── MathAI Gateway
            │
            ▼
         9Router
```

> **Note:** environment variable names and scripts may change per current project implementation. The `.env.example` should be kept as the reference source for local configuration.

---

# 🧪 Planned Evolution

```text
PHASE 1
────────────────────────────
MVP
│
├── exercises
├── attempts
├── tutor
├── database
└── initial MathAI


PHASE 2
────────────────────────────
Real data
│
├── users
├── feedback
├── AI evaluations
├── spaced repetition
└── initial Student Model


PHASE 3
────────────────────────────
Adaptive intelligence
│
├── recommendation
├── model routing
├── error analysis
└── computer vision


PHASE 4
────────────────────────────
Machine Learning
│
├── retention models
├── recommendation
├── model evaluation
└── personalization


PHASE 5
────────────────────────────
Specialized MathAI
│
├── curated datasets
├── fine-tuning
├── specialized models
└── continuous improvement
```

---

# 🏗️ Project Structure

```text
lemmas/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── repositories/
│   │   ├── services/
│   │   │   ├── mathai/
│   │   │   │   ├── gateway.py
│   │   │   │   ├── tutor.py
│   │   │   │   ├── evaluator.py
│   │   │   │   ├── vision.py
│   │   │   │   └── recommender.py
│   │   │   ├── vision/
│   │   │   ├── recommendation/
│   │   │   └── analytics/
│   │   └── main.py
│   │
│   ├── tests/
│   └── requirements.txt
│
├── data/
├── docs/
├── .env.example
├── .gitignore
├── README.md
└── LICENSE
```

---

# ☁️ Infrastructure

```text
GitHub
   │
   ├──────────────► Vercel
   │                  └── Frontend
   │
   └──────────────► Render
                      └── Backend
                            │
                    ┌───────┴───────┐
                    ▼               ▼
                Supabase          9Router
                PostgreSQL
```

Architecture designed to start simple and allow evolution as the project gains users and data volume.

---

# 🎯 Vision

Lemmas does not aim to simply put an AI inside an exercise platform.

The proposal is to build a system where **every learning step generates useful information to personalize the next**.

```text
             LEARN
                 │
                 ▼
             PRACTICE
                 │
                 ▼
                ERR
                 │
                 ▼
              ANALYZE
                 │
                 ▼
               REVIEW
                 │
                 ▼
                MEASURE
                 ▼
            PERSONALIZE
                 │
                 └──────────────► LEARN AGAIN
```

> **Lemmas is the platform.**
>
> **MathAI is the brain we want to build.**

---

# 🚧 Status

Project in development.

Lemmas is being developed as a project uniting **Mathematics, Artificial Intelligence, Data Science, and adaptive learning**.

MathAI, originally the name of the entire project, now represents the future specialized intelligence to be built from this platform and responsibly collected learning data.

---

# 📜 License

To be defined.

---

# 👨‍💻 Author

**Guilherme Henrique Mendes**  
Bachelor's in Mathematics (UFF/CEDERJ) • Data Science & ML • Python • SQL • Applied AI  
[LinkedIn](https://linkedin.com/in/ghmendes02) • [GitHub](https://github.com/StylishGH) • [Email](mailto:ghmendes@id.uff.br)