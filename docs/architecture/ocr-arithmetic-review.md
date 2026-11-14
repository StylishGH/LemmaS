# Conferência aritmética e confirmação do manuscrito

Implementação local em 14/11/2026; publicação pendente.

O avaliador continua exigindo desenvolvimento matemático. Uma alternativa correta isolada não é prova de raciocínio. Uma solução concisa pode ser suficiente quando aplica diretamente a relação necessária.

`backend/app/services/mathai/arithmetic.py` confere igualdades numéricas explícitas com frações exatas, usando somente a biblioteca padrão Python. Aceita operações básicas, potências inteiras limitadas, frações LaTeX e vírgula decimal. Não executa código gerado, não usa `eval`, não resolve demonstrações nem valida a escolha de teoremas. Expressões fora do subconjunto suportado retornam `unsupported`, nunca um certificado de correção. Limites de caracteres, nós, dígitos, expoentes e quantidade de comparações limitam o custo.

Uma igualdade contraditória na transcrição de uma imagem, como `8*7/2=17.5`, gera `precisa_revisao_humana` e `ocr_review_required`. A bancada e o painel flutuante exibem a transcrição editável. Enquanto pendente, o fluxo retorna antes da seleção automática/persistência/SM-2; a API de submissão também rejeita esses indicadores dentro de `avaliacao_ia`.

Na confirmação, o cliente reenvia a imagem original e o texto confirmado em campos separados. O servidor usa o texto para reavaliar, sem repetir o OCR. Confirmar texto incorreto não aprova a conta. A inferência continua julgando o procedimento; a conferência aritmética só impede aceitar uma igualdade numérica falsa. No caminho FastAPI, a transcrição original da visão prevalece sobre qualquer reescrita pelo avaliador.

A conferência é feita no mesmo processo da avaliação FastAPI. O caminho de contingência Next.js chama `/api/tutor/verify-arithmetic`, autenticado, sem inferência ou gravação, com espera máxima de 800 ms. Se essa conferência estiver indisponível, uma imagem fica pendente. Isso exige publicar o backend antes do frontend; um backend antigo não tem esse endpoint. O fluxo de inferência já existente não foi substituído: nenhuma chamada adicional à IA foi acrescentada à avaliação normal. A confirmação explícita desencadeia uma nova avaliação solicitada pelo aluno.

## Evidências locais

- 33 testes Python: verificador, integração de avaliação/confirmação e regressões discursivas existentes.
- 6 testes da rota Next.js com provedores/rede simulados: caminho FastAPI, contingência, conflito, confirmação, indisponibilidade e resposta isolada.
- Build de produção Next.js, TypeScript e lint dos componentes alterados e da rota de perfil aprovados.
- Microbenchmark local: cerca de 0,109 ms por conferência do exemplo, média de 1.000 execuções. Não mede rede, latência total nem desempenho dos provedores.
- Não foi executada chamada real à IA com a imagem do aluno. O reconhecimento de todos os tipos de caligrafia não está garantido; o verificador só detecta conflitos nas igualdades suportadas.

Comandos: `.venv/bin/python -m pytest tests/ocr tests/test_discursive_evaluation.py tests/test_discursive_bench_suite.py -q`; `node tests/ocr/solve-route.test.cjs`.

## Apelido no perfil

O pedido anterior também foi implementado: o campo fica no perfil, com salvamento explícito e autenticação; comentários usam o apelido salvo e apontam para o perfil quando ele não existe. Apelidos anteriores são preservados. `data/schemas/21_community_profile_alias.sql` acrescenta RPCs com autoria derivada de `auth.uid()`, sem expor a tabela de perfis ou mudar as permissões existentes. Alterar o apelido atualiza o nome exibido também nos comentários anteriores.

Migration e isolamento de contas foram verificados somente no PostgreSQL descartável local, com `tests/community/profile_alias.sql`. A migration não foi aplicada ao Supabase hospedado.

Memória: sem hit relevante para esta correção; nenhuma gravação na memória compartilhada.

Revisão: o alerta de persistência pendente foi conferido contra o retorno antecipado em `submeterResolucaoDiscursiva`: ele ocorre antes da seleção automática e do envio de tentativa. O bloqueio da API também verifica os indicadores aninhados. Não foram alterados resultados históricos já registrados.
