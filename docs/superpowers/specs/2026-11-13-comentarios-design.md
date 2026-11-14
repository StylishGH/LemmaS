# Comentários por questão — proposta para aprovação

## Objetivo

Adicionar ao LEMMAS uma comunidade humana vinculada a cada questão. O estudante pode fazer piadas, reclamar da banca, comemorar, perguntar e compartilhar resoluções. Não há obrigação de discutir matemática. A MathAI Engine não lê, modera nem responde automaticamente às conversas.

## Abordagens

- **Comentários assíncronos no Supabase existente (recomendada):** identidade da conta atual, histórico por questão, curtidas e respostas. Evita manter um segundo serviço e atende ao fluxo proposto pelo usuário.
- **Serviço externo de comentários:** acelera parte da interface, mas introduz outra identidade, regras de acesso e dependência externa.
- **Chat em tempo real:** exige presença e sincronização contínua, sem benefício necessário para conversas acumuladas por questão. Fora deste MVP.

A escolha recomendada ainda aguarda aprovação; as decisões técnicas abaixo são propostas do implementador.

## Interface e comportamento

Na tela `/resolver?questionId=…`, preservar a navegação e ferramentas atuais e acrescentar uma área com abas `Resolução` e `Comentários (N)`. O componente de comentários deve ficar separado do arquivo principal do resolver. Conferir o parâmetro real de navegação na implementação; o caminho aqui descreve a intenção.

```text
Resolução | Comentários (12)

Comentários de quem encarou essa questão
Mais curtidos · Mais recentes

Deixe seu comentário, dúvida, meme ou resolução…
[ ] Contém spoiler                       Publicar

Apelido · há 2 horas
BANAL.
Curtir 87 · Responder · Denunciar
```

- Visitantes podem ler. Publicar, curtir, responder e denunciar exigem autenticação confirmada no servidor.
- Nome público/apelido escolhido pelo usuário; não publicar automaticamente nome completo, e-mail ou outros dados privados do perfil. Pedir um apelido na primeira publicação, reaproveitado nos comentários seguintes.
- Texto livre de 1 a 2.000 caracteres, sem HTML executável; LaTeX opcional usando o renderizador seguro existente.
- Respostas em um nível, ligadas a um comentário da mesma questão. Respostas também aceitam spoiler e denúncia.
- Ordenação por recentes ou quantidade de curtidas, com desempate estável e paginação; contador representa comentários e respostas visíveis.
- Uma curtida por conta e comentário; clicar novamente desfaz.
- Spoilers começam recolhidos e só aparecem por ação explícita. Não prometer detecção automática de gabaritos.
- Comentários indisponíveis durante simulado ativo, liberados na revisão após entrega. Essa restrição é proposta para preservar a prova, inclusive contra spoilers não marcados.
- Estado vazio real, carregamento, repetição após falha e erro de publicação sem apagar o rascunho. Nenhum comentário fictício no produto.
- Preservar legibilidade nos temas claro e escuro e layout em celular/tablet. Abas e ações operáveis por teclado.

## Persistência e acesso

Usar Next.js e o cliente Supabase de sessão existente; validar usuário com `auth.getUser()` no servidor. Não confiar em IDs/autoria enviados pelo navegador nem no estado local do perfil.

Preparar migration versionada com comentários, curtidas, denúncias e identidade pública mínima. Referenciar `public.questoes.id` (BIGINT) e `auth.users.id` (UUID); o ID legado de `public.usuarios` é BIGINT e não deve ser confundido com o UUID autenticado. Verificar o schema real antes da aplicação.

RLS deve permitir leitura pública apenas de comentários visíveis; escrita somente com autoria derivada da sessão. Impedir alteração de autoria, questão e estado de moderação pelo autor. Curtidas e denúncias devem ter unicidade por usuário/comentário. Denúncias e informações privadas de moderação não são públicas. Contagens e listagens não podem exigir acesso público às tabelas privadas de usuários.

Limitar publicação no banco, inclusive acesso direto via SDK, com verificação transacional por usuário: intervalo mínimo de 15 segundos e máximo de 20 publicações por hora, incluindo respostas. Limitar também denúncias; impedir referências entre questões e árvores arbitrárias de respostas. Ajustar limites após uso observado, sem serviços pagos novos.

## Moderação humana

Denúncia com motivo (spam, ofensa/assédio, conteúdo inadequado ou outro) e confirmação de recebimento. Fornecer fila restrita a administradores para revisar, ocultar/restaurar comentários e resolver denúncias. Reutilizar o controle de administradores existente após conferir suas permissões; nunca inferir privilégio por e-mail no cliente. Denúncias não ocultam automaticamente conteúdo, evitando brigadas. Autor pode remover o próprio texto, preservando a estrutura das respostas com marcador de removido.

## Escopo e implantação

O roadmap mestre situa comunidade na Fase 04. Esta solicitação antecipa apenas comentários por questão, sem ampliar para feed, mensagens privadas, notificações, ranks, anexos ou Realtime. Não altera avaliação, dicas, agendamento ou resultados dos simulados.

Primeiro preparar código e SQL para revisão e validar localmente. A aplicação da migration e a publicação dependem da revisão do resultado concreto e das permissões do ambiente. Este documento não autoriza deploy, push ou mudança remota. Se o banco não tiver a migration, apresentar indisponibilidade compreensível, sem simular persistência.

## Validação e conclusão

Verificar TypeScript/lint nos arquivos alterados e build. Cobrir contratos e isolamento: visitante não escreve; usuário A não modifica B; curtida repetida não duplica; respostas não cruzam questões; limite de spam resiste a concorrência; denúncias ficam privadas; somente administrador modera. Validar RLS em banco de teste antes de declarar segurança confirmada.

Verificar interface com sessão e visitante, ordenação/paginação, navegação entre questões sem conteúdo atrasado, rascunho após erro, spoiler, temas, tablet e bloqueio no simulado. Distinguir testes locais de fluxos autenticados/remotos ainda pendentes. Não declarar funcionalidade em produção até migration, deploy e verificação ponta a ponta.

## Contexto consultado

- `docs/roadmap.md`: release atual, prioridade de estabilidade e comunidade como fase futura.
- `frontend/app/(app)/resolver/page.tsx`: treino, simulado e revisão existentes.
- `frontend/app/(app)/questoes/page.tsx`: encaminhamento para resolução.
- `frontend/lib/use-user.tsx`, `frontend/lib/supabase-server.ts`: perfil e cliente de sessão atuais.
- `data/schemas/01_core_tables.sql`: questão e usuário legado com IDs BIGINT.
- Memória: sem hit relevante para comentários, inclusive na busca global. Nenhuma escrita na memória compartilhada.
