# AGENTS.md — MathAI Project Context for AI Agents

## Project Overview
MathAI — Plataforma de aprendizado matemático adaptativo com roteamento multimodal de IA.
- **Frontend**: Streamlit (Python) — deploy em mathia.streamlit.app
- **Backend**: Python 3.11+ — módulos em `src/`
- **IA Routing**: NVIDIA NIM (Nemotron 3.5, DeepSeek v4.1) + Google Gemini Flash-Lite OCR
- **Banco**: SQLite (questões, usuários, progresso SM-2)
- **Auth**: Próprio (src/auth) — login, registro, sessões

## Arquitetura
```
MathAI/
├── app.py                 # Entry point Streamlit
├── src/
│   ├── ai/               # Roteamento multimodal (NVIDIA NIM + Gemini OCR)
│   ├── analytics/        # Métricas, dashboards, SM-2 scheduler
│   ├── app/              # Componentes Streamlit (UI)
│   ├── auth/             # Autenticação, usuários, sessões
│   ├── database/         # SQLite, models, queries, migrações
│   └── pipeline/         # Processamento de questões (PDF/OCR → structured)
├── data/                 # Banco SQLite, assets (gitignored)
├── requirements.txt
└── .env                  # NVIDIA_API_KEY, GEMINI_API_KEY
```

## Como Rodar
```bash
# 1. Venv
python -m venv .venv && source .venv/bin/activate  # Linux/Mac
.venv\Scripts\activate                              # Windows

# 2. Deps
pip install -r requirements.txt

# 3. .env (copie .env.example)
# NVIDIA_API_KEY=...
# GEMINI_API_KEY=...

# 4. Roda
streamlit run app.py
```

## Como Testar
```bash
# Unitários
pytest tests/ -v

# Smoke manual
streamlit run app.py --server.headless true &
sleep 5
curl localhost:8501/_stcore/health
```

## Convenções de Código
- **Python**: Black (line-length=100), Ruff, type hints obrigatórios
- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`)
- **Branches**: `feat/`, `fix/`, `docs/`, `refactor/`
- **PR**: Descrição + testes + screenshots se UI

## Módulos-Chave (não mexer sem review)
| Módulo | Responsabilidade | Owner |
|--------|------------------|-------|
| `src/ai/router.py` | Roteamento NVIDIA NIM + Gemini OCR | IA Core |
| `src/pipeline/ocr.py` | PDF → texto estruturado | Pipeline |
| `src/analytics/sm2.py` | Algoritmo SM-2 (repetição espaçada) | Analytics |
| `src/auth/session.py` | Sessões, tokens, refresh | Auth |

## Variáveis de Ambiente Obrigatórias
| Var | Descrição |
|-----|-----------|
| `NVIDIA_API_KEY` | NVIDIA NIM (Nemotron, DeepSeek) |
| `GEMINI_API_KEY` | Google Gemini Flash-Lite OCR |
| `DATABASE_URL` | SQLite path (default: `data/mathai.db`) |

## Deploy
- **Streamlit Cloud**: `mathia.streamlit.app` (auto-deploy do main)
- **Secrets**: NVIDIA_API_KEY, GEMINI_API_KEY no painel Streamlit

## Contatos / Owner
- Guilherme Henrique Mendes (StylishGH)
- Repo: https://github.com/StylishGH/MathAI
