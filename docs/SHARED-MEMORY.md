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


---

### [2026-10-08] — AUDITORIA DE SEGURANÇA CRÍTICA — LEMMAS / MathAI
**Baseado em:** PLANO-DE-CORRECOES.md (análise do repositório + site publicado)  
**Executada por:** 4 subagentes de segurança paralelos (Hermes delegated tasks)  
**Status:** TODOS os 10 itens críticos/altos CONFIRMADOS no código atual

#### 🔴 CRÍTICO — Correção IMEDIATA (HOJE)

| # | Vulnerabilidade | Arquivo/Local | Evidência |
|---|----------------|---------------|-----------|
| 1 | **Supabase anon key hardcoded** | `backend/app/core/config.py:50-56` | `SUPABASE_URL` = `https://gzlzwqknwfgrsnyvgpnv.supabase.co`, `SUPABASE_KEY` = JWT real de produção (`eyJhbG...sVHI`) |
| 2 | **SECRET_KEY JWT fraca e pública** | `backend/app/core/config.py:32-34` | Default: `lemmas-mathai-super-secret-key-change-in-production-2026` — permite forjar tokens JWT |
| 3 | **DEBUG=true + conta demo** | `backend/app/core/config.py:29` + `backend/app/api/routes/auth.py:142-150` | `DEBUG` default `true`; login aceita `demo@lemmas.app` / `lemmas123` |
| 4 | **CORS `*` + `allow_credentials=True`** | `backend/app/main.py:34-44` | Fallback para `["*"]` com credentials — vetor CSRF clássico |
| 5 | **Rotas /tutor/* sem autenticação** | `backend/app/api/routes/tutor.py` | `/hint`, `/evaluate`, `/ocr`, `/review-schedule` — **zero `Depends(get_current_student)`** |
| 6 | **IDOR em `/review-schedule`** | `backend/app/api/routes/tutor.py:200` | Aceita `student_id` do payload em vez de derivar do JWT |
| 7 | **Credenciais Supabase no frontend** | `frontend/lib/supabase.ts:3-6` | URL e anon key reais como fallback no código client-side |

#### 🟠 ALTO — Esta Semana

| # | Item | Localização | Ação |
|---|------|-------------|------|
| 8 | **Rate limiting ausente** | `backend/app/main.py` + `requirements.txt` | `slowapi` não instalado; nenhuma rota protegida |
| 9 | **OpenAPI docs expostas** | `backend/app/main.py:29-30` | `docs_url="/docs"`, `redoc_url="/redoc"` hardcoded |
| 10 | **Middleware auth frontend inexistente** | `frontend/middleware.ts` | Não existe; `/perfil` e `/resolver` acessíveis sem login |
| 11 | **@supabase/ssr não instalado** | `frontend/package.json` | Apenas `@supabase/supabase-js` presente |
| 12 | **RLS não configurado no Supabase** | Banco de dados | Dados expostos via Data API pública |

#### ✅ Checklist de Verificação Pós-Correção
```bash
# 1. Dashboard exige login (janela anônima):
curl -s -o /dev/null -w "%{http_code}
" https://lemmas-ochre.vercel.app/perfil
# Esperado: 307 redirect → /login

# 2. /docs desativado em produção:
curl -s -o /dev/null -w "%{http_code}
" https://SEU-BACKEND.onrender.com/docs
# Esperado: 404

# 3. Rotas de IA exigem token (401 sem auth):
curl -s -o /dev/null -w "%{http_code}
" -X POST https://SEU-BACKEND.onrender.com/api/tutor/hint -H "Content-Type: application/json" -d '{"level":1}'
# Esperado: 401

# 4. Login demo desativado:
curl -s -o /dev/null -w "%{http_code}
" -X POST https://SEU-BACKEND.onrender.com/api/auth/login -H "Content-Type: application/json" -d '{"email":"demo@lemmas.app","password":"lemmas123"}'
# Esperado: 401

# 5. RLS ativo (Data API direto):
curl "https://SEU-PROJETO.supabase.co/rest/v1/tentativas?select=*" -H "apikey: ANON_KEY"
# Esperado: [] ou erro — NUNCA dados reais

# 6. Segredos no histórico do Git:
gitleaks git . --verbose
# Se encontrar chaves: ROTACIONAR IMEDIATAMENTE
```

#### 🎯 Ordem de Execução Recomendada (15 min → 2h)
1. **Rotacionar anon key Supabase** + remover hardcode no config.py (15 min)
2. **SECRET_KEY forte no Render** + fail-fast no main.py (10 min)
3. **DEBUG=false no Render** + remover bloco demo em auth.py (5 min)
4. **Auth nas rotas /tutor/*** + user_id do JWT (30 min)
5. **Rate limiting (slowapi)** (30 min)
6. **RLS no Supabase** (1-2h)
7. **Middleware auth frontend** + @supabase/ssr (1h)
8. **CORS com domínios reais** no Render (5 min)
9. **Cloudflare na frente do backend** (1h)
10. **gitleaks + rotação de chaves no histórico** (30 min)

**Quem achou:** 4 subagentes Hermes (security auditors) + Usuário (iniciador da auditoria).

---

### [2026-10-08] — CORREÇÕES DE SEGURANÇA APLICADAS (Backend + Frontend)
**Commit backend:** `4aca117` — fix(security): rotacionar segredos, remover credenciais hardcoded e proteger rotas /tutor  
**Commit frontend:** `77fb5ba` — fix(security): frontend - remover hardcodes, adicionar @supabase/ssr, middleware auth e client servidor

#### ✅ CONCLUÍDO — Backend
| Item | Ação | Arquivo/Commit |
|------|------|----------------|
| 1 | SUPABASE_URL / SUPABASE_KEY hardcoded → **removidos** | `config.py` |
| 2 | SECRET_KEY sem default (fail-fast) | `config.py` + `main.py` |
| 3 | DEBUG default `false` | `config.py` |
| 4 | Token expiry 7d → **8h** | `config.py` |
| 5 | CORS sem fallback `*`; origens fixas | `main.py` |
| 6 | OpenAPI docs só em DEBUG | `main.py` |
| 7 | Rate limiting (slowapi) integrado | `main.py` + `requirements.txt` |
| 8 | Demo creds removidas | `auth.py` |
| 9 | 4 rotas `/tutor/*` protegidas com `Depends(get_current_student)` | `tutor.py` |
| 10 | IDOR corrigido: student_id do JWT | `tutor.py` |

#### ✅ CONCLUÍDO — Frontend
| Item | Ação | Arquivo/Commit |
|------|------|----------------|
| 1 | Supabase URL/key hardcoded → **removidos** + fail-fast | `lib/supabase.ts` |
| 2 | `@supabase/ssr` instalado | `package.json` |
| 3 | Middleware auth criado | `middleware.ts` |
| 4 | SSR client para Server Components | `lib/supabase-server.ts` |
| 5 | Proteção: /perfil /resolver /dashboard | `middleware.ts` |

#### ⏳ PENDENTE (Ação sua)
| Item | O que fazer | Onde |
|------|-------------|------|
| 1 | **Rotacionar anon key Supabase** + definir em Render + Vercel | Supabase Dashboard → Settings → API |
| 2 | **Definir SECRET_KEY forte** (64+ chars) no Render | Render → Environment |
| 3 | **DEBUG=false** no Render | Render → Environment |
| 4 | **SUPABASE_URL / SUPABASE_KEY** no Render | Render → Environment |
| 5 | **NEXT_PUBLIC_SUPABASE_URL / ANON_KEY** no Vercel | Vercel → Settings → Environment Variables |
| 6 | **Aplicar RLS** no Supabase | Supabase Dashboard → SQL Editor → rodar `04_production_rls_hardening.sql` |
| 7 | **gitleaks** no histórico + rotação se houver vazamento | `gitleaks git . --verbose` |
| 8 | **Cloudflare** na frente do backend (opcional, recomendado) | Cloudflare Dashboard |

#### 🔍 Checklist de Verificação Pós-Deploy
```bash
# 1. Dashboard exige login (janela anônima):
curl -s -o /dev/null -w "%{http_code}
" https://lemmas-ochre.vercel.app/perfil
# Esperado: 307 redirect → /login

# 2. /docs desativado em produção:
curl -s -o /dev/null -w "%{http_code}
" https://SEU-BACKEND.onrender.com/docs
# Esperado: 404

# 3. Rotas de IA exigem token (401 sem auth):
curl -s -o /dev/null -w "%{http_code}
" -X POST https://SEU-BACKEND.onrender.com/api/tutor/hint -H "Content-Type: application/json" -d '{"level":1}'
# Esperado: 401

# 4. Login demo desativado:
curl -s -o /dev/null -w "%{http_code}
" -X POST https://SEU-BACKEND.onrender.com/api/auth/login -H "Content-Type: application/json" -d '{"email":"demo@lemmas.app","password":"lemmas123"}'
# Esperado: 401

# 5. RLS ativo (Data API direto):
curl "https://SEU-PROJETO.supabase.co/rest/v1/tentativas?select=*" -H "apikey: ANON_KEY"
# Esperado: [] ou erro — NUNCA dados reais

# 6. Segredos no histórico do Git:
gitleaks git . --verbose
# Se encontrar chaves: ROTACIONAR IMEDIATAMENTE
```

---

### [2026-10-08] — FIX BUILD FRONTEND: Tipagem CookieOptions
**Commit:** `1a643fb` — fix(frontend): tipar CookieOptions no middleware e supabase-server para build passar

#### Erro Original
```
lib/supabase-server.ts(15,16): error TS7006: Parameter 'cookiesToSet' implicitly has an 'any' type.
middleware.ts(17,16): error TS7006: Parameter 'cookiesToSet' implicitly has an 'any' type.
```

#### Correção
```typescript
// Em ambos os arquivos:
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// setAll tipado explicitamente:
setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[])
```

#### Status
- ✅ `npm run build` passa (Next.js 16.3.8 + Turbopack + TypeScript)
- ⚠️ Aviso "middleware → proxy" é depreciação futura apenas; funciona normal
- Migração futura: `npx @next/codemod@canary middleware-to-proxy .`