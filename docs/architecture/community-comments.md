# Comentários humanos por questão

Comunidade assíncrona vinculada a cada questão (`public.questoes.id`), separada da camada de IA: a MathAI Engine não lê, modera nem responde automaticamente aos comentários.

## Arquitetura e isolamento de segurança

- **Persistência e RPCs (`data/schemas/19_question_comments.sql`):**
  - Tabelas `public.community_profiles`, `public.question_comments`, `public.comment_likes`, `public.comment_reports` e `community_private.write_events` com RLS habilitado e privilégios diretos revogados de `PUBLIC`, `anon` e `authenticated`.
  - Leitura (`public.community_list`), escrita (`public.community_write`) e fila administrativa (`public.community_moderation`) expostas como wrappers `SECURITY INVOKER` que delegam para funções `SECURITY DEFINER` em `community_private` com `search_path = ''`.
  - `community_private.write_comment` serializa mutações por usuário com `pg_advisory_xact_lock`, exige conta autenticada não anônima com e-mail confirmado (`email_confirmed_at IS NOT NULL`) e impõe no banco intervalo mínimo de 15 s entre publicações, máximo de 20 publicações/hora e máximo de 10 denúncias/hora.
  - Respostas limitadas a 1 nível na mesma questão; comentários pai removidos pelo autor mantêm a estrutura da thread quando possuem respostas visíveis, ocultando autor e corpo originais.
  - Moderação restrita a `public.is_analytics_admin()` (requer `data/schemas/15_admin_analytics_presence.sql` e `data/schemas/17_analytics_admin_page_guard.sql`). Denúncias não ocultam conteúdo automaticamente.
- **Rotas Next.js (`frontend/app/api/community/route.ts`, `frontend/app/api/admin/comments/route.ts`, `frontend/lib/community.ts`):**
  - Validação estrita de tipos/limites no servidor (`parseCommunityWrite`), checagem de `Origin` em `POST`, limite de payload de 16 KB, cabeçalhos `Cache-Control: private, no-store` + `Vary: Cookie` e `supabase.auth.getUser()` antes de ações de escrita/moderação.
  - Erros internos de banco/PostgREST são mapeados para mensagens públicas controladas via `communityError`.
- **Interface (`frontend/components/community/`, `frontend/app/(app)/resolver/page.tsx`, `frontend/app/admin/comments/page.tsx`):**
  - `QuestionDiscussion` isola o estado por `${questionId}:${identity}`, exibe abas `Resolução` e `Comentários (N)`, ordenação (`popular` / `recent`), paginação, formulário com apelido público único, respostas de 1 nível, spoilers recolhidos por padrão, denúncia por motivo e remoção pelo autor.
  - No simulado ativo (`blocked={isSimuladoAtivo}`), a aba de comentários fica bloqueada sem consultar `/api/community`; na revisão pós-simulado e no treino livre, os comentários ficam liberados.
  - `CommentText` mantém texto puro escapado pelo React e renderiza apenas delimitadores LaTeX explícitos via KaTeX com `trust: false` e `strict: 'ignore'`, sem imagens Markdown ou links HTML.

## Procedimento de aplicação no Supabase

1. Garantir que `data/schemas/15_admin_analytics_presence.sql` (e `17_analytics_admin_page_guard.sql`, se aplicável) estejam aplicados.
2. Aplicar `data/schemas/19_question_comments.sql` no SQL Editor do Supabase (transação única `BEGIN; ... COMMIT;`).
3. Caso `data/schemas/20_bloco_b_sanitization_and_reclassification.sql` seja aplicado antes ou depois, seu bloco dinâmico de remapeamento via `pg_constraint` preserva eventuais FKs em `public.question_comments(question_id)`.

## Verificação reproduzível

- **SQL isolado em PostgreSQL 18 (`tests/community/`):** `bootstrap.sql` -> `data/schemas/19_question_comments.sql` -> `permissions.sql` -> `edge_cases.sql` validam permissões `anon`/`authenticated`, unicidade de curtida, isolamento entre questões, resposta aninhada bloqueada, ocultação/restauração por admin, ocultação de texto removido e limites de taxa.
- **Contratos JS/TS e XSS (`tests/community/contracts.test.mjs`):** `node --test ../tests/community/contracts.test.mjs` a partir de `frontend/`.
- **Build, tipos e browser headless:** verificados com `npx tsc --noEmit --incremental false`, `npm run build` e inspeção visual em Light/Dark em `/resolver` e `/resolver?session=simulado`.

## Limites conhecidos

- A migration `19_question_comments.sql` e a aplicação em produção no Supabase permanecem pendentes de revisão/execução remota; até serem aplicadas no banco remoto, a UI exibe estado de indisponibilidade controlado sem simular persistência.
- Fluxos autenticados reais ponta a ponta (publicação com usuário autenticado real no Supabase hospedado, denúncia, fila `/admin/comments` em produção) ainda não foram exercitados em ambiente remoto.
