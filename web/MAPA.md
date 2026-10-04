# MAPA DE MIGRAÇÃO: Streamlit → Web (MathAI)

Este documento mapeia todas as telas, fluxos e regras do Streamlit legado (`app.py` e `src/app/pages/*`) para os respectivos endpoints da API FastAPI (`web/api/main.py`) e componentes do frontend Next.js (`web/app/*`).

---

## 1. Mapeamento de Telas e Módulos

| Tela / Recurso (Streamlit) | Módulo Streamlit Legado | Módulo Python Core (Read-Only) | Endpoint API Shim Proposto | Rota Frontend Next.js |
| :--- | :--- | :--- | :--- | :--- |
| **Status do Sistema** | `app.py` (init) | `src/database/db.py` | `GET /api/health` | (Global / Monitoring) |
| **Login & Cadastro** | `src/app/pages/login.py` | `src/database/users.py` | `POST /api/auth/login`<br>`POST /api/auth/register`<br>`GET /api/auth/me` | `/login`, `/cadastro` |
| **Treino Livre / Questão** | `src/app/pages/resolver.py`<br>`src/app/components/question_view.py` | `src/database/db.py`<br>`src/app/utils.py` | `GET /api/questions/random`<br>`GET /api/questions/{id}` | `/questoes` |
| **Envio de Resposta / Metacognição** | `src/app/components/feedback_form.py` | `src/database/attempts.py`<br>`src/ai/evaluator.py` | `POST /api/questions/{id}/submit` | `/questoes` |
| **Banco & Listas** | `src/app/pages/banco.py` | `src/database/db.py` | `GET /api/questions` | `/banco` |
| **Perfil Cognitivo** | `src/app/pages/dashboard.py` | `src/database/attempts.py` | `GET /api/analytics/dashboard` | `/dashboard` |
| **Painel "Segunda Opinião"** | *(Conceito novo do plano)* | `src/ai/client.py` (ou NVIDIA NIM shim) | `POST /api/ai/compare` | `/opinioes` |
| **Sobre o MathAI** | `src/app/pages/sobre.py` | N/A (conteúdo institucional) | N/A (estático) | `/sobre` |

---

## 2. Detalhamento dos Endpoints Prioritários (MVP Inicial)

### `GET /api/health`
- **Função:** Diagnóstico de vida da API, status do banco de dados SQLite local e total de questões cadastradas.
- **Python Source:** `src.database.db.pegar_conexao`, `listar_questoes`.
- **Payload Resposta:**
  ```json
  {
    "status": "ok",
    "db": "connected",
    "total_questions": 288,
    "timestamp": "2026-10-04T05:22:00Z"
  }
  ```

### `GET /api/questions/random`
- **Função:** Sorteia e retorna uma questão aleatória do banco (com suporte a filtro opcional por `materia` ou `banca`).
- **Python Source:** `src.database.db.listar_questoes`, `src.app.utils.extrair_enunciado_e_alternativas`.
- **Processamento:** Extrai enunciado limpo e mapeia o dicionário de alternativas (`A`, `B`, `C`, `D`, `E`).
- **Payload Resposta:**
  ```json
  {
    "id": 1234,
    "materia": "Álgebra",
    "topico": "Sistemas Lineares",
    "banca": "ESA",
    "ano": 2023,
    "tipo": "objetiva",
    "enunciado": "...",
    "alternativas": {
      "A": "...",
      "B": "...",
      "C": "...",
      "D": "...",
      "E": "..."
    }
  }
  ```

### `POST /api/auth/login`
- **Função:** Autentica o estudante usando bcrypt e cria uma sessão com token seguro.
- **Python Source:** `src.database.users.autenticar_usuario`, `criar_sessao_persistente`.
- **Payload Requisição:**
  ```json
  {
    "email": "aluno@exemplo.com",
    "senha": "senhaSegura123"
  }
  ```

### `GET /api/analytics/summary`
- **Função:** Retorna métricas resumidas para o Dashboard (taxa de acerto, total de questões resolvidas, sequência de estudos).
- **Python Source:** `src.database.attempts.obter_estatisticas_aluno` (com fallback para mock pedagógico em caso de aluno novo).

### `POST /api/ai/compare` (Segunda Opinião)
- **Função:** Consulta comparativa de dois modelos para a mesma dúvida matemática (ex: NVIDIA Nemotron-3 vs DeepSeek-R1 / Gemini).
- **Frontend Target:** Página `/opinioes` com layout de 2 colunas lado a lado.

---

## 3. Diretrizes de Preservação e Integração
1. **Regra de Ouro:** Zero alterações em `src/*` e `app.py`. A pasta `web/api` roda como processo independente ou módulo integrado que importa diretamente os submódulos de `src`.
2. **CORS:** O servidor FastAPI deve permitir requisições de origens locais (`http://localhost:3000`, `http://127.0.0.1:3000`).
3. **Contrato de Tipos:** O frontend Next.js consome estritamente as respostas JSON tipadas em TypeScript.
