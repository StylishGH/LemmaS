# Regras do Projeto LEMMAS (Powered by MathAI Engine)

## 0. Identidade do Ecossistema: LEMMAS vs MathAI Engine
- **Plataforma LEMMAS & LEMMAS Core**: É o produto final e ecossistema web voltado ao estudante (Next.js 16, Turbopack, Tailwind CSS v4, KaTeX, estética editorial lousa/quadro), gerenciador de autenticação/sessão, perfil cognitivo e motor determinístico de repetição espaçada SM-2 e FSRS-v4 (agnóstico a disciplinas).
- **MathAI Engine**: É o núcleo/motor cognitivo especializado em Matemática — avaliação passo a passo, OCR multimodal de rascunhos em caderno/tablet, roteamento multi-modelo (NVIDIA Nemotron para rigor axiomático e DeepSeek para intuição) e banco de lemas.
- **Diretriz de Nomenclatura**: Toda IA e documentação deve referenciar o produto como **LEMMAS** (ou **LemmaS**) impulsionado pela **MathAI Engine**.

## 1. Versões e Modelos da API do Gemini
- **Modelos Primários Recomendados**:
  - `gemini-flash-lite-latest` (Padrão 1): Latência < 0.6s, 100% de estabilidade no Free Tier, suporte completo a Visão Multimodal (OCR de cadernos/provas) e `response_schema` (JSON).
  - `gemini-3.5-flash-lite` (Padrão 2): Altamente estável, excelente para avaliação matemática passo a passo e diagnósticos pedagógicos.
- **Modelos de Fallback**:
  - `gemini-3-flash-preview`: Estável, utilizado caso os modelos lite sofram indisponibilidade pontual.
  - `gemini-3.6-flash`: Utilizar apenas como fallback secundário devido a picos intermitentes de alta demanda.
- **Modelos Proibidos / Inoperantes**:
  - **NUNCA utilize** `gemini-1.5-*` (`gemini-1.5-pro`, `gemini-1.5-flash`) nem `gemini-2.5-*` (`gemini-2.5-flash`), pois estão descontinuados e retornam erro `404 NOT_FOUND`.
  - **NÃO utilize** `gemini-3.7-flash` ou `gemini-3.8-flash`, pois retornam `503 UNAVAILABLE` com alta frequência devido a sobrecarga nos servidores da Google.
  - **NÃO utilize** `gemini-pro-latest` como padrão no Free Tier, pois ele esgota a cota imediatamente com erro `429 RESOURCE_EXHAUSTED`.

## 2. Limites de Quota, Faturamento e Tratamento de Erros
- **Diferenciação de Códigos de Erro**:
  - `402 RESOURCE_EXHAUSTED` (`prepayment credits are depleted`): Ocorre quando a chave pertence a um projeto configurado em modo Pay-As-You-Go, mas o saldo pré-pago está zerado ($0.00). O sistema deve alertar o usuário para recarregar créditos no Google Cloud Billing ou alternar para um projeto puramente Free Tier no Google AI Studio.
  - `429 RESOURCE_EXHAUSTED`: Limite de requisições por minuto (RPM) ou diário (RPD) atingido. Recomenda-se aguardar ou alternar a chave.
  - `503 UNAVAILABLE`: Servidores Google temporariamente sobrecarregados. O cliente da aplicação (`backend/app/services/mathai/gateway.py`) deve realizar fallback automático para os modelos `flash-lite`.
- **Processamento em Lote (Batch Scripts)**:
  - Scripts pesados de ingestão de banco de questões (`ingest_cg.py`, etc.) NÃO devem ser executados no Free Tier sem aviso prévio, pois consomem rapidamente o limite diário.

## 3. Web Scraping e Cloudflare
- Sites como o SSPM (Marinha Oficial) e PCI Concursos utilizam Cloudflare Turnstile, resultando em erros constantes de `403 Forbidden` ao tentar aplicar automação via scripts Python puros (`requests`/`BeautifulSoup`). Priorizar outras fontes de raspagem sem proteções anti-bot agressivas.

## 4. UI e Estilização (Frontend Next.js)
- **Modos Dark e Light**: Sempre preste atenção ao contraste e esquema de cores ao adicionar novos elementos na UI. Garanta que textos, fundos e itens selecionados não fiquem ilegíveis dependendo do tema ativo pelo usuário. Utilize variáveis de tema responsivas ou cores neutras de bom contraste com `@custom-variant dark (&:where(.dark, .dark *));` no Tailwind v4.
- **Responsividade e Modo Tablet**: Em telas médias e tablets, garanta que barras de navegação superior, numeração de questões e botões de ação não fiquem sobrepostos ou agrupados de forma truncada.

## 5. Arquitetura Monorepo LEMMAS
```
lemmas/
├── frontend/             # Next.js 16 (App Router, Turbopack, Tailwind CSS v4, KaTeX)
│   ├── app/              # /dashboard, /questoes, /resolver, /opinioes, /landing, /login, /perfil, /sobre
│   ├── components/       # UI, exercicios, math
│   └── lib/              # supabase, sm2, math-parser
├── backend/              # FastAPI modular (Python 3.12)
│   ├── app/core/         # config.py, security.py (SHA-256)
│   ├── app/models/       # Attempt imutável, AIEvaluation, Student, Exercise, Flashcard
│   ├── app/schemas/      # Pydantic DTOs
│   ├── app/services/     # MathAI Gateway (Nemotron/DeepSeek/Gemini), Tutor Socrático, FSRS-v4
│   └── app/api/routes/   # attempts, exercises, tutor, feedback, flashcards
├── data/
│   ├── repertorio/       # lemas_fundamentais.json (8 lemas)
│   └── schemas/          # 01_core_tables.sql, 02_provenance_and_consent.sql, 03_flashcards_and_fsrs.sql
├── docs/                 # architecture/, database/, ai/
└── tests/                # 17 testes unitários (backend, lemmas_core, flashcards)
```

## 6. Mandamento Epistêmico Fundamental
$$\mathbf{RAW\ DATA\ (OBSERVED)} \neq \mathbf{AI\ INTERPRETATION} \neq \mathbf{VALIDATED\ LABEL}$$
- **RAW DATA**: Imutável, auditável com hash SHA-256 determinístico.
- **AI INTERPRETATION**: Hipótese versionada com modelo, prompt e confiança (nunca sobrescreve o dado original).
- **VALIDATED LABEL**: Ground truth validado por especialista/aluno para treino e active learning.

## 7. Deploy & Nuvem
- **Frontend**: Vercel (Root Directory: `frontend`)
- **Backend**: Render / Railway (Root Directory: `backend`, command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`)
- **Database**: Supabase Postgres (RLS ativo, 20 tabelas, 288 questões, 13 usuários, 8 lemas)
- **Repo**: https://github.com/StylishGH/MathAI.git
