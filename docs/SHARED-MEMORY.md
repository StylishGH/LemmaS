# SHARED-MEMORY — MathAI / LEMMAS

Memória compartilhada entre agentes de IA e desenvolvedores para documentar pegadinhas, decisões arquiteturais e evitar reincidência de erros.

---

### [2026-10-06] — Transição Arquitetural: MathAI -> LEMMAS
- **Regra:** O projeto como um todo se chama **LEMMAS** (Adaptive Learning Platform). O termo **MathAI** passa a se referir estritamente ao "Engine Especialista" de matemática. 
- **Por quê:** O sistema evoluiu de um chatbot/experimento de matemática para uma plataforma modular que suporta disciplinas variadas. O core geral (LEMMAS Core: histórico, repetição espaçada, SM-2, perfil do aluno) deve ser isolado dos módulos especialistas (MathAI, BioIA, QuimIA). Nunca referenciar toda a aplicação apenas como "MathAI", especialmente na Landing Page.
- **Quem achou:** Usuário / Antigravity (Decisão de Produto/Portfólio).

---

### [2026-10-07] — Diretriz Operacional: Cérebro (Antigravity+User) vs Braços (Hermes)
- **Regra:** O Antigravity (IA principal) e o Usuário atuam como o **Cérebro** (estrategistas, arquitetos, revisores). Sempre que houver uma tarefa densa, repetitiva ou com alto consumo de tokens (como importar layouts inteiros do Higgsfield/v0, refatorar grandes blocos de código ou criar boilerplate de novas rotas), o Antigravity deve **proativamente propor delegar a tarefa para o Hermes** (`alethe_delegate` ou background task).
- **Importante:** NÃO force/hardcode um modelo específico e pesado (ex: `nvidia/nemotron-3-ultra-550b-a55b`) no JSON da task, a menos que seja estritamente necessário. Deixe vazio para que o Hermes utilize o seu modelo configurado por padrão (o combo de `fallback` de alta velocidade hospedado no 9Router).
- **Por quê:** Economia de tokens da janela de contexto principal e ganho gigantesco de velocidade de resposta. Modelos muito pesados têm latência alta, enquanto o combo de fallback do 9Router pula nós inativos e devolve a resposta instantaneamente.
- **Quem achou:** Usuário / Antigravity.

---

### [2026-10-04] — Nomes das Funções de Usuário em `src/database/users.py`
- **Regra:** Usar sempre `fazer_login(email, senha, ip=None)` para autenticar e `criar_sessao_lembrada(usuario_id)` para emitir o token de sessão criptografado.
- **Por quê:** O módulo `users.py` não exporta `autenticar_usuario` nem `criar_sessao_persistente`. Funções renomeadas ou refatoradas no passado geram `ImportError` silencioso se presumidas por convenção padrão.
- **Quem achou:** Antigravity (Missão Noturna MathAI-Web).

---

### [2026-10-04] — SQLite Concorrência no Windows (WAL Mode)
- **Regra:** Em servidores FastAPI consumindo SQLite local no Windows, SEMPRE ativar `PRAGMA journal_mode = WAL;` e `PRAGMA busy_timeout = 5000;` no ciclo de vida (`lifespan`) da aplicação.
- **Por quê:** O Windows utiliza locking mandatório de arquivos (`LockFileEx`). Sob requisições concorrentes ou requisições paralelas do frontend, o SQLite padrão pode lançar erros `database is locked` / `SQLITE_BUSY`. O modo WAL (Write-Ahead Logging) permite leituras concorrentes simultâneas com escrita.
- **Quem achou:** Revisão Técnica Impiedosa com NVIDIA Nemotron-3 Ultra (550B) / Antigravity.

---

### [2026-10-04] — Fórmulas Matemáticas e Expressões em JSX/TSX
- **Regra:** Nunca inserir chaves LaTeX brutas como `{a+b-c}` diretamente no corpo de elementos JSX sem escape (`{"{...}"}` ou texto plano adaptado).
- **Por quê:** O compilador TypeScript/Babel do Next.js interpreta `{...}` dentro de tags JSX como blocos de código JavaScript. Chaves LaTeX geram erro `TS2304: Cannot find name 'a'`.
- **Quem achou:** Antigravity (Next.js build check).

---

### [2026-10-04] — Banco de Dados em Clones Locais Isolados
- **Regra:** Em clones isolados (ex: `D:\dev\mathai-web`), copiar o arquivo `data/mathai.db` do repositório principal para permitir testes locais imediatos com o acervo real de questões.
- **Por quê:** O arquivo `.sqlite` ou `.db` é ignorado pelo `.gitignore`. Um clone inicial criará um banco vazio (`Total questoes: 0`), o que impede a validação visual do frontend sem ingestão prévia.
- **Quem achou:** Antigravity.
