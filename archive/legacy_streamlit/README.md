# Streamlit Legado (MathAI v1)

Este diretório contém o frontend protótipo inicial desenvolvido em Streamlit (`app.py`).
A arquitetura principal foi desacoplada e migrada para:
- **Backend API**: `api/` (FastAPI / LEMMAS Engine)
- **Frontend Moderno**: `web/` (Next.js 16 + Tailwind CSS v4)
- **Core Compartilhado**: `src/` (banco de dados, avaliador Gemini, pipeline)

Para rodar este Streamlit legado localmente:
```powershell
streamlit run archive/legacy_streamlit/app.py
```
