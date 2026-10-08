# 🌙 Relatório da Noite: Migração MathAI Web

**Data:** 04 de Outubro de 2026  
**Ambiente:** Clone isolado em `D:\dev\mathai-web` (Core no OneDrive permaneceu intocado)  
**Status da Missão:** Concluída com sucesso e build 100% verde  

---

## 1. O que foi Feito

### Fase 1: Levantamento & Mapeamento de Rotas
- Mapeado todo o fluxo do Streamlit legado (`app.py`, `src/app/pages/*`, `src/database/*`).
- Criado o documento [`web/MAPA.md`](MAPA.md) definindo a equivalência de cada tela para rotas Next.js e endpoints da API FastAPI.

### Fase 2: Scaffold Frontend Next.js
- Inicializado o projeto Next.js 16 (Turbopack, TypeScript, Tailwind CSS, App Router) na pasta `web/`.
- Configurado o tema visual dark-mode-first com as cores exatas do MathAI:
  - Fundo escuro: `#0a0a0f` / `#13111f`
  - Bordas violeta: `rgba(124, 58, 237, 0.35)`
  - Destaques em ouro: `#fbbf24` / `#f59e0b`
- `npm run build` validado sem erros de compilação ou linter.

### Fase 3: API Shim FastAPI (`web/api/main.py`)
- Criada a camada de API REST em FastAPI mantendo o Python existente **100% read-only**:
  - `GET /api/health`: retorna status do banco SQLite local e total de questões (288 questões).
  - `POST /api/auth/login` e `POST /api/auth/register`: integrados com `src/database/users.py` (`fazer_login`, `cadastrar_usuario`, `criar_sessao_lembrada`).
  - `GET /api/auth/me`: validação de sessão por token Bearer.
  - `GET /api/questions/random`: sorteia questões reais com extração limpa de enunciado e alternativas (`A` a `E`) via `src.app.utils`.
  - `GET /api/questions/{id}`: busca questão específica por ID.
  - `POST /api/questions/{id}/submit`: valida resposta contra gabarito e grava tentativa em `src/database/attempts.py` (`registrar_tentativa`).
  - `POST /api/ai/compare`: endpoint para o painel Segunda Opinião.

### Fase 4: Frontend Moderno (4 Módulos)
- **Sidebar persistente (`web/components/Sidebar.tsx`):**
  - Navegação entre Dashboard, Questões, Segunda Opinião e Sobre.
  - Badge de status da API Python em tempo real com número de questões no banco.
  - Gestão de ciclo de vida com `AbortController` e pausa automática quando a aba está em background.
- **Dashboard (`web/app/page.tsx`):**
  - Cards de métricas reais (Aproveitamento, Questões do Banco, Sequência de Dias, Concurso Alvo).
  - Radar de desempenho por tópico matemático com barras de progresso dinâmicas.
- **Treino de Questões (`web/app/questoes/page.tsx`):**
  - Consome diretamente `/api/questions/random` do SQLite local.
  - Exibe metadados oficiais (Banca, Ano, Dificuldade, Tópico).
  - Seleção interativa de alternativas, cronômetro de resolução com pausa, envio assíncrono e feedback imediato (Acertou ✅ / Errou ❌ com gabarito oficial).
- **Segunda Opinião (`web/app/opinioes/page.tsx`):**
  - Painel de comparação lado a lado entre **NVIDIA Nemotron-3 Ultra (550B)** (foco em rigor axiomático) e **DeepSeek R1** (foco em heurística/intuição geométrica).
- **Sobre Nós (`web/app/sobre/page.tsx`):**
  - Manifesto pedagógico da plataforma e documentação da stack técnica.

### Fase 5: Code Review com NVIDIA Nemotron-3 Ultra (550B)
- Chamada da tool `hermes_think` com o modelo `nvidia/nemotron-3-ultra-550b-a55b` para auditoria impiedosa do diff.
- **Melhorias apontadas e implementadas:**
  1. *SQLite Lock Contention no Windows:* Inserida configuração explícita de `PRAGMA journal_mode = WAL;` e `PRAGMA busy_timeout = 5000;` no `lifespan` do FastAPI.
  2. *Cache-Control:* Adicionado header `no-store, no-cache, must-revalidate` em `/api/questions/random` para impedir cache estático pelo navegador.
  3. *AbortController & VisibilityChange:* Polling do Sidebar protegido contra vazamento de memória e chamadas fantasmas em segundo plano.
  4. *Anti Double-Submit:* Proteção contra duplo clique na submissão de respostas.

### Fase 6: Scripts e Validação de Inicialização
- Criado `web/start-local.cmd` para inicialização automática em dois terminais com um único clique.
- Criado `web/README-ACORDAR.md` com instruções objetivas para o acordar.

---

## 2. Decisões Tomadas e Justificativas

1. **FastAPI Shim como processo único importando `src/*`:**
   - *Por quê:* Evita qualquer reescrita de código. As funções de banco e autenticação existentes no Python são invocadas diretamente sem latência de IPC ou subprocessos complexos.
2. **Next.js 16 com Turbopack (App Router):**
   - *Por quê:* Proporciona renderização rápida, TypeScript nativo e suporte completo ao Tailwind CSS v4, garantindo um design limpo e de alto padrão visual.
3. **Cópia do banco `mathai.db` para o clone isolado:**
   - *Por quê:* O banco de dados do OneDrive tem 288 questões reais. Para que o clone local funcionasse de forma 100% autônoma sem poluir o git nem o OneDrive do usuário, o arquivo foi copiado para `data/mathai.db` no clone (que já consta no `.gitignore`).

---

## 3. O que Falta / Próximos Passos (Backlog Futuro)

1. **Componente de LaTeX Renderizado (KaTeX):**
   - Atualmente, as fórmulas aparecem em texto com notação matemática limpa. Adicionar `rehype-katex` ou componente leve KaTeX para renderizar expressões como $\frac{a+b}{2}$ em SVG/HTML estilizado.
2. **Integração Real de Streaming com LLM:**
   - O endpoint `/api/ai/compare` retorna a estrutura pedagógica completa; pode ser conectado diretamente ao SDK da NVIDIA/OpenAI para geração em tempo real sob demanda do usuário.
3. **Página do Simulador com Tempo Limite Rígido:**
   - O backend já suporta listas e tentativas; criar uma tela para bater simulados de 60 minutos cronometrados com entrega em bloco.

---

## 4. Bugs Conhecidos

- Nenhum erro de runtime ou compilação ativo.
- Caso o usuário inicie o frontend sem rodar o backend, a página exibe de forma elegante um aviso em vermelho informando que o backend Python precisa ser iniciado na porta 8000.
