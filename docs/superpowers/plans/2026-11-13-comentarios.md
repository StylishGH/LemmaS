# Comentários Implementation Plan

> For agentic workers: use executing-plans to implement task by task.

**Goal:** Entregar comentários humanos por questão com moderação e proteção de autoria.
**Architecture:** Componentes React isolados, rotas Next.js de sessão e RPCs PostgreSQL. Tabelas protegidas por RLS sem escrita direta; funções privadas validam identidade e limites transacionalmente.
**Tech Stack:** Next.js 16, React 19, Supabase, PostgreSQL, KaTeX.
**Spec:** `docs/superpowers/specs/2026-11-13-comentarios-design.md` (aprovada em 13/11/2026).

## Global Constraints

Sem IA, Realtime, anexos ou notificações. Leitura pública; escrita autenticada. Não aplicar migration remota nem publicar sem revisão final. Preservar mudanças preexistentes. Executar no checkout atual disponibilizado pelo usuário, sem commits automáticos.

## Review Focus

1. Ataques diretos às tabelas/RPCs não podem falsificar autoria ou contornar limites.
2. Respostas a pais ocultos não podem vazar conteúdo.
3. Navegação/troca de conta não pode mostrar respostas antigas.
4. Erro de publicação deve preservar rascunho.
5. KaTeX de terceiros não pode executar HTML ou carregar recursos externos.

### Task 1: Banco e permissões

**Files:** `data/schemas/19_question_comments.sql`, `tests/community/`.
**Interfaces:** `community_list(question, sort, page, parent)` retorna itens, contagens, apelido e permissões; `community_write(action, question, comment, parent, body, spoiler, alias, reason)` altera somente o que a sessão permite; `community_moderation(page)` lista fila administrativa.

- [ ] Escrever teste SQL de acesso visitante/autoria/curtidas/spam/respostas/moderação e observar falha sem migration.
- [ ] Implementar tabelas, RPCs, RLS, limites e grants explícitos.
- [ ] Executar em PostgreSQL isolado com identidades de teste e repetir testes de concorrência.

### Task 2: Contratos HTTP

**Files:** `frontend/lib/community.ts`, `frontend/app/api/community/route.ts`, `frontend/app/api/admin/comments/route.ts`.
**Interfaces:** GET/POST de comentários e GET de moderação chamam as RPCs da tarefa 1 com cliente de sessão.

- [ ] Validar entradas, limites de tamanho, erros públicos e cache privado.
- [ ] Usar `getUser()` antes de escrita, sem aceitar autoria do navegador.
- [ ] Verificar TypeScript e contratos de entrada com testes Node.

### Task 3: Interface e integração

**Files:** `frontend/components/community/*`, resolver, `frontend/app/admin/comments/page.tsx`, atalho administrativo.
**Interfaces:** `QuestionDiscussion({questionId, blocked?, children?})` controla abas, contador, lista paginada e formulários.

- [ ] Implementar texto seguro com LaTeX opcional, apelido, publicação, respostas, curtidas, remoção, spoilers e denúncia.
- [ ] Integrar treino e revisão; bloquear no simulado sem consultar comentários.
- [ ] Implementar fila administrativa paginada com ocultar/restaurar/resolver denúncia.
- [ ] Executar lint, TypeScript, build e verificação de navegador disponível.

### Task 4: Revisão e entrega

- [ ] Revisão independente da alteração completa, corrigindo problemas materiais.
- [ ] Registrar evidências, limitações e procedimento de aplicação em `docs/architecture/community-comments.md`.
- [ ] Atualizar roadmap como implementação local, sem alegar publicação.

## Ledger

- Início: memória sem hit relevante na consulta anterior, design aprovado; notebook e script de pipeline preexistentes preservados.
- Ruling: executar neste checkout sem commit/push; ambiente disponibiliza `.git` somente para leitura. Todas as mudanças do recurso ficam em arquivos identificáveis.
