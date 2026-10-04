# ☀️ Bom dia, Guilherme! — Guia Rápido ao Acordar

A missão noturna foi concluída com **100% de sucesso**. O MathAI agora possui um frontend profissional e moderno em **Next.js 16 (App Router) + Tailwind CSS**, conectado diretamente ao seu banco de dados e regras em Python via **FastAPI Shim**.

---

## 🚀 Como Subir o Sistema (2 Comandos)

Você pode dar duplo clique no script executável ou rodar manualmente:

### Opção A: Duplo Clique Automático
Basta executar o arquivo:
👉 `D:\dev\mathai-web\web\start-local.cmd`
*(Ele já abre o backend na porta 8000 e o frontend na porta 3000 em janelas separadas).*

---

### Opção B: Manual pelo Terminal

**Terminal 1 (Backend Python API):**
```powershell
cd D:\dev\mathai-web
python -m uvicorn web.api.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 (Frontend Next.js):**
```powershell
cd D:\dev\mathai-web\web
npm run dev
```

---

## 🌐 URLs de Validação Imediata

1. **Frontend Principal:**
   👉 [http://localhost:3000](http://localhost:3000)
   - **Dashboard (/):** Métricas pedagógicas, taxa de acerto por matéria, contagem das questões do banco local.
   - **Treino de Questões (/questoes):** Busca questões reais do seu SQLite local com cronômetro, seleção de alternativas e gabarito imediato.
   - **Segunda Opinião (/opinioes):** Painel lado a lado comparando **NVIDIA Nemotron-3 Ultra (550B)** (rigor analítico/teoremas) com **DeepSeek R1** (intuição heurística).
   - **Sobre Nós (/sobre):** Manifesto pedagógico da plataforma e arquitetura técnica.

2. **Backend API Health:**
   👉 [http://localhost:8000/api/health](http://localhost:8000/api/health)
   - Retorna o status da conexão com o SQLite local e confirma o carregamento das **288 questões**.

3. **Documentação Swagger Interativa:**
   👉 [http://localhost:8000/docs](http://localhost:8000/docs)
   - Permite testar todos os endpoints REST diretamente pelo navegador.

---

## 🛡️ Regras Invioláveis Cumpridas

- **Lógica e dados intocados:** `src/ai`, `src/pipeline`, `src/analytics`, `src/database`, `src/auth` e `app.py` (Streamlit) permaneceram **estritamente intactos (read-only)**.
- **Clone isolado:** Todo o trabalho foi feito em `D:\dev\mathai-web` — o repositório principal no OneDrive permaneceu intocado.
- **Build testado e verde:** `npm run build` executado e gerou todas as 5 rotas com zero erros de compilação ou TypeScript.
- **Revisão impiedosa com Nemotron-3:** Código revisado pela IA (NVIDIA Nemotron-3 Ultra) e ajustado com modo WAL no SQLite e headers anti-cache.
