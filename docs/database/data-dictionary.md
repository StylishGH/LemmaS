# Dicionário de Dados Canônico (Data Dictionary)

> **Documento:** Dicionário Completo de Entidades, Colunas e Linhagem de Dados  
> **Status:** Ativo / Produção  
> **Última Atualização:** 2026-10-08  
> **Classificação de Fonte:**  
> - `OBSERVED`: Dado empírico, factual e observável coletado diretamente do usuário ou banca.  
> - `AI`: Dado derivado probabilisticamente por modelos de linguagem/visão artificial.  
> - `VALIDATED`: Dado revisado e certificado por auditoria humana (professores, monitores ou gabarito oficial).  

---

## 1. Tabela `usuarios`
Armazena a identidade cadastral, perfil acadêmico e credenciais de acesso de cada estudante.

| Coluna | Tipo | Fonte | Nullable | Descrição / Regra de Negócio |
|---|---|---|---|---|
| `id` | `INT / SERIAL` | `OBSERVED` | NÃO | Identificador numérico primário e imutável do usuário. |
| `nome` | `VARCHAR(255)` | `OBSERVED` | NÃO | Nome completo ou nome social do estudante. |
| `email` | `VARCHAR(255)` | `OBSERVED` | NÃO | Endereço de correio eletrônico único para autenticação. |
| `senha_hash` | `VARCHAR(255)` | `OBSERVED` | NÃO | Hash criptográfico seguro (SHA-256 / bcrypt) da senha. |
| `cpf` | `VARCHAR(14)` | `OBSERVED` | SIM | Cadastro de Pessoa Física para emissão fiscal (000.000.000-00). |
| `idade` | `INT` | `OBSERVED` | SIM | Idade declarada em anos (restrição `CHECK BETWEEN 5 AND 120`). |
| `celular` | `VARCHAR(25)` | `OBSERVED` | SIM | Telefone móvel com DDD para notificações e suporte. |
| `cep` | `VARCHAR(10)` | `OBSERVED` | SIM | Código de Endereçamento Postal (00000-000). |
| `logradouro` | `VARCHAR(255)` | `OBSERVED` | SIM | Nome da rua, avenida ou endereço residencial. |
| `numero` | `VARCHAR(20)` | `OBSERVED` | SIM | Número do imóvel ou 'S/N'. |
| `bairro` | `VARCHAR(100)` | `OBSERVED` | SIM | Bairro residencial. |
| `cidade` | `VARCHAR(100)` | `OBSERVED` | SIM | Município de residência. |
| `estado` | `VARCHAR(2)` | `OBSERVED` | SIM | Sigla da Unidade Federativa (UF, ex: RJ, SP). |
| `motivos` | `JSON / TEXT` | `OBSERVED` | SIM | Array JSON com os objetivos de estudo (ex: `["concurso_militar", "graduacao"]`). |
| `escolaridade` | `VARCHAR(50)` | `OBSERVED` | SIM | Grau de instrução formal (ex: 'Ensino Médio', 'Graduação'). |
| `faculdade` | `VARCHAR(100)` | `OBSERVED` | SIM | Instituição de ensino superior de vínculo (ex: 'UFF', 'USP', 'ITA'). |
| `curso` | `VARCHAR(100)` | `OBSERVED` | SIM | Curso acadêmico matriculado (ex: 'Licenciatura em Matemática'). |
| `concursos_foco`| `JSON / TEXT` | `OBSERVED` | SIM | Array JSON das bancas pretendidas (ex: `["ESA", "EFOMM", "AFA"]`). |
| `verificado` | `INT` | `OBSERVED` | NÃO | Flag booleana: `0` para e-mail pendente de ativação, `1` para verificado. Padrão `0`. |
| `criado_em` | `TIMESTAMP` | `OBSERVED` | NÃO | Timestamp UTC do momento de criação do registro. |

---

## 2. Tabela `codigos_verificacao`
Gerenciamento de códigos descartáveis (OTP) para confirmação de conta e redefinição de acesso.

| Coluna | Tipo | Fonte | Nullable | Descrição / Regra de Negócio |
|---|---|---|---|---|
| `id` | `INT / SERIAL` | `OBSERVED` | NÃO | Identificador primário da solicitação de código. |
| `email` | `VARCHAR(255)` | `OBSERVED` | NÃO | E-mail de destino do envio do código. |
| `codigo` | `VARCHAR(10)` | `OBSERVED` | NÃO | Sequência alfanumérica de 6 dígitos gerada criptograficamente. |
| `expira_em` | `TIMESTAMP` | `OBSERVED` | NÃO | Data/hora limite de validade (geralmente 15 minutos após emissão). |
| `usado` | `INT` | `OBSERVED` | NÃO | Flag booleana: `0` para pendente, `1` para já consumido. |
| `criado_em` | `TIMESTAMP` | `OBSERVED` | NÃO | Timestamp UTC da geração do código. |

---

## 3. Tabela `sessoes_lembradas`
Controle de sessões persistentes no navegador para autenticação sem atrito.

| Coluna | Tipo | Fonte | Nullable | Descrição / Regra de Negócio |
|---|---|---|---|---|
| `token` | `VARCHAR(128)` | `OBSERVED` | NÃO | Token criptográfico randômico seguro enviado no cookie HTTP-only. |
| `usuario_id` | `INT` | `OBSERVED` | NÃO | Chave estrangeira referenciando `usuarios(id)`. |
| `expira_em` | `TIMESTAMP` | `OBSERVED` | NÃO | Data limite da sessão lembrada (geralmente 30 dias). |
| `criado_em` | `TIMESTAMP` | `OBSERVED` | NÃO | Timestamp UTC do login original. |

---

## 4. Tabela `questoes`
Repositório central de problemas, exercícios e enunciados matemáticos.

| Coluna | Tipo | Fonte | Nullable | Descrição / Regra de Negócio |
|---|---|---|---|---|
| `id` | `INT / SERIAL` | `VALIDATED` | NÃO | Identificador primário da questão. |
| `materia` | `VARCHAR(100)` | `VALIDATED` | NÃO | Grande área temática (ex: 'Geometria Plana', 'Cálculo I', 'Álgebra Linear'). |
| `topico` | `VARCHAR(100)` | `VALIDATED` | NÃO | Tópico específico (ex: 'Semelhança de Triângulos', 'Derivadas', 'Espaços Vetoriais'). |
| `subtopico` | `VARCHAR(100)` | `VALIDATED` | SIM | Micro-tópico de detalhe (ex: 'Teorema de Menelaus', 'Regra da Cadeia'). |
| `dificuldade` | `INT` | `VALIDATED` | SIM | Nível na escala de 1 a 5 (1 = fundamental, 5 = olimpíada/IME/ITA). |
| `banca` | `VARCHAR(50)` | `VALIDATED` | SIM | Instituição examinadora (ex: 'ESA', 'ITA', 'EFOMM', 'OBMEP'). |
| `ano` | `INT` | `VALIDATED` | SIM | Ano da aplicação da prova oficial. |
| `enunciado` | `TEXT` | `VALIDATED` | NÃO | Texto do enunciado com expressões formatadas em LaTeX (`$...$` ou `$$...$$`). |
| `figura_path` | `TEXT` | `VALIDATED` | SIM | URL ou caminho relativo da ilustração geométrica/diagrama. |
| `gabarito` | `VARCHAR(255)` | `VALIDATED` | SIM | Letra da alternativa correta ('A'-'E') ou expressão canônica. |
| `estrategias_esperadas` | `JSON / TEXT` | `VALIDATED` | SIM | Array JSON de métodos de resolução previstos (ex: `["Tales", "Semelhanca"]`). |
| `tipo` | `VARCHAR(20)` | `VALIDATED` | NÃO | Categoria: `'objetiva'` (múltipla escolha) ou `'discursiva'`. Padrão `'objetiva'`. |
| `mathnet_id` | `VARCHAR(100)` | `VALIDATED` | SIM | Identificador de rastreabilidade caso importado do dataset MathNet. |
| `criado_em` | `TIMESTAMP` | `OBSERVED` | NÃO | Data de cadastro no sistema. |

---

## 5. Tabela `conceitos`
Banco de lemas matemáticos, teoremas fundamentais e cartões de gatilho cognitivo.

| Coluna | Tipo | Fonte | Nullable | Descrição / Regra de Negócio |
|---|---|---|---|---|
| `id` | `INT / SERIAL` | `VALIDATED` | NÃO | Identificador primário do conceito/lema. |
| `materia` | `VARCHAR(100)` | `VALIDATED` | NÃO | Grande área matemática de enquadramento. |
| `topico` | `VARCHAR(100)` | `VALIDATED` | NÃO | Tópico conceitual. |
| `nome` | `VARCHAR(150)` | `VALIDATED` | NÃO | Nome formal do lema/teorema (ex: 'Teorema de Ceva', 'Substituição Trigonométrica'). |
| `gatilho` | `TEXT` | `VALIDATED` | NÃO | Condição observável no problema (Frente do flashcard: "Cevianas concorrentes num triângulo"). |
| `acao_ou_teorema` | `TEXT` | `VALIDATED` | NÃO | Ação matemática prescrita (Verso do flashcard: "Aplicar razão dos segmentos = 1"). |
| `formula_latex` | `TEXT` | `VALIDATED` | SIM | Equação canônica em KaTeX correspondente ao teorema. |
| `criado_em` | `TIMESTAMP` | `OBSERVED` | NÃO | Timestamp UTC de criação do lema. |

---

## 6. Tabela `tentativas`
Registro factual e imutável de cada sessão de resolução executada por um estudante.

| Coluna | Tipo | Fonte | Nullable | Descrição / Regra de Negócio |
|---|---|---|---|---|
| `id` | `INT / SERIAL` | `OBSERVED` | NÃO | Identificador primário da tentativa. |
| `questao_id` | `INT` | `OBSERVED` | NÃO | Chave estrangeira referenciando `questoes(id)`. |
| `aluno_id` | `INT` | `OBSERVED` | NÃO | Chave estrangeira referenciando `usuarios(id)`. |
| `data_hora` | `TIMESTAMP` | `OBSERVED` | NÃO | Momento exato em que a submissão foi recebida. |
| `tempo_segundos` | `INT` | `OBSERVED` | NÃO | Cronometragem real despendida pelo aluno (inteiro >= 0). |
| `acertou` | `INT` | `OBSERVED` | NÃO | Booleano determinístico: `1` se igual ao gabarito oficial, `0` caso contrário. |
| `estrategia_usada` | `TEXT` | `OBSERVED` | SIM | Estratégia autodeclarada pelo aluno antes de ver a resolução. |
| `tipo_erro` | `VARCHAR(50)` | `OBSERVED` | SIM | Erro autodeclarado pelo aluno ou padrão `'nenhum'`. |
| `confianca_aluno` | `INT` | `OBSERVED` | SIM | Nota metacognitiva de 1 a 5 (1 = chute, 5 = certeza absoluta). |
| `anotacoes` | `TEXT` | `OBSERVED` | SIM | Justificativa em texto digitada pelo estudante. |
| `imagem_resolucao_path`| `TEXT` | `OBSERVED` | SIM | URI do arquivo de imagem do rascunho salvo no Storage. |

---

## 7. Tabela `revisao_espacada`
Parâmetros e agendamentos calculados pelo algoritmo determinístico SuperMemo-2.

| Coluna | Tipo | Fonte | Nullable | Descrição / Regra de Negócio |
|---|---|---|---|---|
| `id` | `INT / SERIAL` | `OBSERVED` | NÃO | Identificador do agendamento. |
| `aluno_id` | `INT` | `OBSERVED` | NÃO | Chave estrangeira para `usuarios(id)`. |
| `item_tipo` | `VARCHAR(20)` | `OBSERVED` | NÃO | Discriminador polimórfico: `'questao'` ou `'conceito'`. |
| `item_id` | `INT` | `OBSERVED` | NÃO | Chave do item apontado (`questoes.id` ou `conceitos.id`). |
| `fator_facilidade` | `NUMERIC(4,2)`| `OBSERVED` | NÃO | Fator de Facilidade (EF) do SM-2 (mínimo de 1.30, padrão 2.50). |
| `intervalo_dias` | `INT` | `OBSERVED` | NÃO | Quantidade de dias até a próxima revisão (>= 1). |
| `repeticoes` | `INT` | `OBSERVED` | NÃO | Número de revisões consecutivas bem-sucedidas. |
| `proxima_revisao` | `DATE` | `OBSERVED` | NÃO | Data do calendário (YYYY-MM-DD) da revisão programada. |
| `ultima_revisao` | `TIMESTAMP` | `OBSERVED` | NÃO | Data e hora do último cálculo de ciclo. |

---

## 8. Tabela `perfil_aluno_topico`
Cache agregado de performance e maestria cognitiva por matéria e tópico.

| Coluna | Tipo | Fonte | Nullable | Descrição / Regra de Negócio |
|---|---|---|---|---|
| `id` | `INT / SERIAL` | `OBSERVED` | NÃO | Identificador da linha de métricas. |
| `aluno_id` | `INT` | `OBSERVED` | NÃO | Chave estrangeira para `usuarios(id)`. |
| `materia` | `VARCHAR(100)` | `OBSERVED` | NÃO | Nome da matéria agregada. |
| `topico` | `VARCHAR(100)` | `OBSERVED` | NÃO | Nome do tópico agregado. |
| `total_tentativas` | `INT` | `OBSERVED` | NÃO | Contagem cumulativa de tentativas realizadas no tópico. |
| `total_acertos` | `INT` | `OBSERVED` | NÃO | Contagem cumulativa de acertos no tópico. |
| `tempo_medio_segundos`| `NUMERIC(8,2)`| `OBSERVED`| NÃO | Média móvel do tempo de resolução em segundos. |
| `estrategia_favorita`| `VARCHAR(100)` | `OBSERVED` | SIM | Estratégia matemática mais frequentemente empregada pelo aluno. |
| `atualizado_em` | `TIMESTAMP` | `OBSERVED` | NÃO | Data/hora da última atualização pós-tentativa. |

---

## 9. Tabela `diagnosticos_ia`
Avaliações qualitativas e transcrições geradas pelos motores de Inteligência Artificial.

| Coluna | Tipo | Fonte | Nullable | Descrição / Regra de Negócio |
|---|---|---|---|---|
| `id` | `INT / SERIAL` | `AI` | NÃO | Identificador da análise de IA. |
| `tentativa_id` | `INT` | `OBSERVED` | SIM | FK opcional apontando para a tentativa factual. |
| `questao_id` | `INT` | `OBSERVED` | NÃO | FK referenciando `questoes(id)`. |
| `aluno_id` | `INT` | `OBSERVED` | NÃO | FK referenciando `usuarios(id)`. |
| `modelo_gemini` | `VARCHAR(100)` | `AI` | SIM | Identificador do modelo gerador (ex: `'gemini-flash-lite-latest'`, `'nemotron-3.5'`). |
| `imagem_path` | `TEXT` | `OBSERVED` | SIM | URI do rascunho inspecionado pela visão computacional. |
| `justificativa_texto` | `TEXT` | `OBSERVED` | SIM | Texto do aluno fornecido como contexto para a IA. |
| `transcricao_latex` | `TEXT` | `AI` | SIM | Transcrição normalizada em KaTeX do que foi lido na folha/canvas. |
| `passos_json` | `JSON / TEXT` | `AI` | SIM | Array de etapas lógicas identificadas na resolução do estudante. |
| `estrategia_identificada`| `VARCHAR(100)`| `AI` | SIM | Nome do método ou lema detectado na resolução. |
| `status_resolucao` | `VARCHAR(50)` | `AI` | SIM | Classificação do raciocínio: `'correto'`, `'erro_conta_sinal'`, etc. |
| `diagnostico` | `TEXT` | `AI` | SIM | Parecer pedagógico detalhado sem dar spoiler da resposta. |
| `linha_do_erro` | `TEXT` | `AI` | SIM | Apontamento da etapa exata onde ocorreu a divergência lógica. |
| `dica_proximo_passo` | `TEXT` | `AI` | SIM | Pergunta ou provocação socrática reflexiva. |
| `criado_em` | `TIMESTAMP` | `OBSERVED` | NÃO | Data/hora do diagnóstico. |

---

## 10. Tabela `log_dicas_socraticas`
Histórico de interações pedagógicas graduais solicitadas pelo aluno durante o exercício.

| Coluna | Tipo | Fonte | Nullable | Descrição / Regra de Negócio |
|---|---|---|---|---|
| `id` | `INT / SERIAL` | `OBSERVED` | NÃO | Identificador do log de ajuda socrática. |
| `questao_id` | `INT` | `OBSERVED` | NÃO | FK referenciando a questão. |
| `aluno_id` | `INT` | `OBSERVED` | NÃO | FK referenciando o estudante. |
| `nivel_dica` | `INT` | `OBSERVED` | NÃO | Profundidade da dica: escala de 1 (gatilho conceitual) a 5 (orientação direta). |
| `texto_dica` | `TEXT` | `AI` | SIM | Conteúdo textual devolvido pela IA. |
| `modelo_gemini` | `VARCHAR(100)` | `AI` | SIM | Identificador do modelo de IA que gerou o texto. |
| `criado_em` | `TIMESTAMP` | `OBSERVED` | NÃO | Timestamp UTC do pedido de auxílio. |

---

## 11. Tabela `questoes_reportadas`
Canal de auditoria e controle de qualidade para detecção de anomalias no acervo ou na IA.

| Coluna | Tipo | Fonte | Nullable | Descrição / Regra de Negócio |
|---|---|---|---|---|
| `id` | `INT / SERIAL` | `OBSERVED` | NÃO | Identificador do reporte. |
| `questao_id` | `INT` | `OBSERVED` | NÃO | FK referenciando a questão sob reporte. |
| `aluno_id` | `INT` | `OBSERVED` | SIM | FK do usuário relator (ou nulo se anônimo). |
| `motivo` | `VARCHAR(50)` | `OBSERVED` | NÃO | Categoria: `'latex_quebrado'`, `'figura_problema'`, `'gabarito_errado'`, `'ia_alucinou'`, etc. |
| `descricao` | `TEXT` | `OBSERVED` | SIM | Comentário livre detalhando a inconsistência. |
| `status` | `VARCHAR(30)` | `VALIDATED` | NÃO | Estado da triagem: `'pendente'`, `'em_analise'`, `'resolvido'`, `'descartado'`. Padrão `'pendente'`. |
| `criado_em` | `TIMESTAMP` | `OBSERVED` | NÃO | Timestamp UTC do envio do reporte. |

---

## 12. Tabela `consentimentos_usuarios`
Rastreamento formal de consentimento segundo a LGPD (Lei 13.709/2018).

| Coluna | Tipo | Fonte | Nullable | Descrição / Regra de Negócio |
|---|---|---|---|---|
| `id` | `INT / SERIAL` | `OBSERVED` | NÃO | Identificador primário do termo outorgado. |
| `usuario_id` | `INT` | `OBSERVED` | NÃO | FK referenciando `usuarios(id)`. |
| `versao_termos` | `VARCHAR(20)` | `OBSERVED` | NÃO | Versão semântica do documento legal (ex: `'v1.0.0'`). |
| `finalidade_funcional` | `BOOLEAN` | `OBSERVED` | NÃO | Flag indicando aceite dos termos de serviço essenciais. |
| `finalidade_pesquisa_ml`| `BOOLEAN` | `OBSERVED` | NÃO | Flag opt-in autorizando uso anonimizado de rascunhos para ML. |
| `ip_origem` | `VARCHAR(45)` | `OBSERVED` | NÃO | Endereço IP anonimizado no momento do aceite. |
| `user_agent` | `TEXT` | `OBSERVED` | NÃO | Cabeçalho do navegador de registro. |
| `concedido_em` | `TIMESTAMP` | `OBSERVED` | NÃO | Data/hora do aceite explícito. |
| `revogado_em` | `TIMESTAMP` | `OBSERVED` | SIM | Data/hora de eventual revogação (se aplicável). |
