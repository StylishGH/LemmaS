# MISSÃO MATHAI-WEB — migração gradual Streamlit → web profissional

> **Leia MATHAI-WEB-PLAN completo antes de começar.** Execução por workers paralelos
> no canvas. O usuário está DORMINDO: trabalhe a noite toda, NÃO commite no repo
> core, deixe tudo no working tree + relatório final. Aprovação é dele de manhã.

## Regras invioláveis (Guilherme dormindo — acordar ele é falha)

1. **NÃO MEXER NA LÓGICA**: `src/ai`, `src/pipeline`, `src/analytics`,
   `src/database`, `src/auth`, `app.py` (Streamlit) são **READ-ONLY**. Sua limpeza
   de dados, SM-2, roteador multi-provider: intocados. O front consome; nunca
   reescreve.
2. **Trabalho todo em `web/`** (pasta nova na raiz): front Next.js + API leve
   que CHAMA o Python existente (subprocess/API shim), não reimplementa.
3. **Repositório é clone isolado** (`D:\dev\mathai-web`, remote `mathai-core`
   local): commits ficam AQUI, o MathAI real (OneDrive) nem fica sabendo.
4. **Localmente rodando ao acordar**: `web/README-ACORDAR.md` com os 2 comandos
   (npm install já feito; `npm run dev` + o backend que vocês escolherem) e
   print-screen das URLs. Se não rodar de primeira, a missão falhou.
5. **Zero custo**: nada de chaves novas, nada pago, quota Google só no planner.
6. **Relatório de manhã**: `web/RELATORIO-NIGHT.md` — o que fizeram, o que falta,
   decisões tomadas (com justificativa), bugs conhecidos.
7. **Bug novo/pegadinha → SHARED-MEMORY.md** (criar se não existir) + commit.

## Arquitetura alvo (discutida com o usuário + consultoria)

- **Front**: Next.js 14+ (App Router) + Tailwind, visual limpo/moderno ("css
  bonitinho"), dark-mode-first (MathAI é usado de noite). Inspirar-se no
  mockup.html se existir, senão: dashboard de estudos + página de questão.
- **Backend**: **preservar Python**. Opção preferida: **FastAPI shim** em
  `web/api/` que importa/invoca os módulos existentes (`src/*`) direto —
  mesmo processo, zero reescrita. Alternativa se FastAPI der problema no
  Windows dos workers: micro-http via `flask` OU subprocess do app.py com
  query params — o que RODAR primeiro, documentando a escolha no relatório.
- **Auth existente** (`src/auth`): integrar via shim (login/registro já
  prontos no Python).
- **Painel "Segunda opinião"**: o GPT deu a ideia — uma página `/opinioes`
  onde o fluxo de IA consulta 2 modelos (NVIDIA: nemotron + deepseek) e
  mostra lado a lado. Vira MVP de 1 página estática com os dois cards.

## Fases da noite (workers paralelos onde der)

**F1 · LEVANTAMENTO (primeiro, solo)**: mapear `app.py` + `src/` → escrever
`web/MAPA.md`: cada tela/função do Streamlit → endpoint de API proposto →
módulo Python que atende. 15 min de leitura, sem código.

**F2 · SCAFFOLD** (worker A): `npx create-next-app@latest web --ts --tailwind
--app --no-src-dir` na RAIZ do clone (web/ fica fora do git do core Python? não —
web/ dentro do repo clone, é o mesmo repo). ESLint default. Rodar `npm run build`
verde antes de seguir.

**F3 · API SHIM** (worker B): FastAPI `web/api/main.py` com:
- `/api/health` → {"status":"ok"}
- `/api/auth/*` → chama src/auth (reusar funções, não reescrever)
- `/api/questions/random` → chama o que o Streamlit usa hoje (mesma função!)
- 3-6 endpoints no máximo (MVP). `pip install fastapi uvicorn` no venv DO CLONE.

**F4 · FRONT** (worker C, depois de F2): layout (Sidebar: Dashboard, Questões,
Opiniões, Sobre) + 3 páginas wireframe bonito: Dashboard (stats fake por ora),
Questões (consome /api/questions/random), Opiniões (2 cards lado a lado).

**F5 · REVIEWER** (worker D — o brabo): a cada fase concluída, chamar
`hermes_think` com model `nvidia/nemotron-3-ultra-550b-a55b` pedindo review
impiedosa do diff. Consertar críticas válidas. Repetir até build verde.

**F6 · DEIXAR RODANDO**: script `web/start-local.cmd` que sobe API (uvicorn) +
front (next dev) em duas janelas. Escrever o "comandos pra acordar" no
README-ACORDAR.md e RODAR ELES uma vez (deixar os processos vivos de manhã).

## Checklist de manhã (pro Guilherme)

- [ ] `web/README-ACORDAR.md` existe e é claro
- [ ] `npm run dev` sobe em localhost:3000 (já instalado)
- [ ] API responde em localhost:8000/api/health
- [ ] Página Questões mostra uma questão de verdade (do seu banco via Python!)
- [ ] RELATORIO-NIGHT.md conta a história da noite
- [ ] git log do clone mostra os commits da noite (repo isolado, core intacto)
