# SHARED-MEMORY — MathAI

Memória compartilhada entre agentes de IA e desenvolvedores para documentar pegadinhas, decisões arquiteturais e evitar reincidência de erros.

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
