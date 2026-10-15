# LemmaS — Missão Integrada Definitiva
## Reengenharia do Catálogo de Imagens + Conclusão da Bancada Discursiva + MathAI Engine

**Coordenador:** Antigravity  
**Executor operacional:** Hermes, utilizando o Alethe Orchestrator quando disponível  
**Objetivo:** corrigir a origem e a qualidade das imagens das questões e concluir a integração real da avaliação discursiva, da contabilização e da persistência.

---

# 0. REGRAS DE COORDENAÇÃO ENTRE ANTIGRAVITY E HERMES

O Antigravity deve atuar como arquiteto, coordenador, integrador e revisor. O Hermes deve executar tarefas técnicas delimitadas, produzir artefatos verificáveis e testar suas entregas.

Não delegue todas as alterações a um único agente. Distribua o trabalho considerando dependências e propriedade dos arquivos.

## Divisão de trabalho

### Antigravity — arquitetura e integração

Responsabilidades:

- Auditar o estado atual do repositório e os diffs preexistentes.
- Definir os contratos e os critérios de aceitação.
- Inspecionar a persistência, a avaliação e o fluxo real do MathAI Engine.
- Coordenar e revisar as entregas do Hermes.
- Implementar ou supervisionar as correções de backend e integração necessárias.
- Garantir que os resultados da avaliação discursiva sejam preservados e contabilizados corretamente.
- Executar os testes integrados e a compilação final.
- Entregar um relatório consolidado com evidências reais.

### Hermes — Missão A: reengenharia das imagens

Responsabilidades:

- Inventariar o catálogo e os PDFs de origem.
- Auditar os scripts antigos de extração e recorte.
- Construir um pipeline experimental isolado.
- Gerar manifestos de proveniência, candidatos e folhas de contato.
- Validar a recuperação da Q17 da AFA 2011 e os casos de teste selecionados.
- Criar testes para recortes incompletos, associações incorretas e contaminação por resoluções comentadas.

### Hermes — Missão B: interface da Bancada discursiva

Responsabilidades:

- Inspecionar e completar a interface em `frontend/app/(app)/resolver/page.tsx`.
- Garantir que os três atalhos realmente ativem as abas correspondentes e realizem o scroll até a Bancada.
- Apresentar os quatro vereditos da avaliação de forma consistente.
- Preservar o rascunho quando faltar desenvolvimento.
- Implementar ou completar a contabilização visual conforme os contratos definidos pelo Antigravity.
- Testar os comportamentos de interface e documentar as limitações.

### Regra de propriedade dos arquivos

Não permita que dois agentes editem o mesmo arquivo simultaneamente.

O Antigravity deve definir antecipadamente a propriedade dos arquivos de integração. O Hermes não deve modificar rotas de backend ou serviços do MathAI fora de seu escopo. O Antigravity não deve sobrescrever as alterações de interface produzidas pelo Hermes.

Se uma alteração compartilhada for necessária, coordenem sua transferência explicitamente.

Utilize ferramentas reais de delegação. Confirme que as tarefas foram executadas antes de considerar uma delegação concluída. Caso o Hermes ou o Alethe Orchestrator esteja indisponível, informe o impedimento e prossiga com as tarefas que puderem ser realizadas sem simular execuções.

---

# 1. AUDITORIA GLOBAL ANTES DE EDITAR

Inspecione o estado real do projeto, incluindo:

- `git status --short` e diffs existentes.
- Os diretórios dos PDFs originais, dos gabaritos e das resoluções comentadas.
- `data/imagens/`.
- `data/audit/reprocessed_figures_pilot/`.
- `data/audit/reprocessed_figures_pilot/afa_2011_q17/`.
- Os scripts antigos de extração, vetorização e recorte de figuras.
- O catálogo e os registros que associam questões a imagens.
- `frontend/app/(app)/resolver/page.tsx`.
- `frontend/app/api/ai/solve/route.ts`.
- `frontend/app/api/questions/[id]/submit/route.ts`.
- `backend/app/api/routes/tutor.py`.
- `backend/app/services/mathai/evaluator.py`.
- `backend/app/schemas/ai_evaluation.py`.
- Os componentes e hooks das três ferramentas da Bancada.
- A estrutura e o uso real de `public.tentativas` e `public.revisao_espacada`.
- Os testes já existentes para figuras, avaliação discursiva e SM-2.

Os caminhos acima são pontos de partida. Confirme quais arquivos existem e quais participam efetivamente dos fluxos atuais.

Antes de alterar, produza um resumo com:

1. Estado atual das imagens e suas associações.
2. Arquivos de produção que dependem dos recursos antigos.
3. Fluxo real da submissão discursiva nas três ferramentas.
4. Formato real do retorno da avaliação.
5. Forma de persistência e contabilização das tentativas.
6. Arquivos sob responsabilidade de cada agente.
7. Dependências ou bloqueios que exijam alteração de esquema.

Depois dessa auditoria, prossiga sem solicitar nova autorização, desde que respeite as restrições desta missão.

---

# MISSÃO A — RECONSTRUIR O PIPELINE DE IMAGENS

## 2. Objetivo e diagnóstico

O pipeline anterior falhou não apenas no recorte, mas também na associação semântica entre imagens e questões.

Os problemas observados incluem:

- Imagens retiradas de resoluções comentadas atribuídas à prova original.
- Gráficos das alternativas tratados como figuras soltas, sem preservar sua função.
- Recortes que capturam somente parte da figura.
- Recortes que incluem trechos do enunciado ou de questões vizinhas.
- Objetos incorporados ao PDF considerados relevantes sem confirmar sua posição na página.
- Gráficos vetoriais reconstruídos por vetorização que degrada sua aparência.
- Falta de rastreabilidade entre o PDF original, a página, a região e o arquivo produzido.

**A regra central do novo sistema é: localizar a questão na fonte correta antes de extrair sua figura.**

Não basta extrair todas as imagens de um PDF e tentar associá-las depois.

## 3. Inventário e política para o catálogo legado

Gere um manifesto completo dos recursos existentes.

Para cada imagem, registre, quando possível:

- Caminho e hash SHA-256.
- Prova, instituição, ano e questão.
- PDF de origem.
- Tipo de documento: prova original, gabarito, resolução comentada ou desconhecido.
- Página e coordenadas de origem.
- Papel semântico: figura do enunciado, gráfico de alternativa, painel de alternativas, figura de resolução ou desconhecido.
- Referências utilizadas pela aplicação.
- Dimensões, formato e resolução.
- Evidências de validação.
- Status de confiança.

Use categorias equivalentes a:

- `trusted_keep`
- `legacy_unverified`
- `audit_candidate`
- `approved_new`

Adapte esses valores ao padrão real dos relatórios e manifestos existentes.

### ESA 2026

Identifique os SVGs das questões da ESA 2026 que já estão corretos.

Calcule e registre seus hashes e dimensões. Preserve os arquivos originais byte a byte e mantenha suas referências funcionais.

Esses recursos são o conjunto inicialmente confiável. Não os rasterize, reformate, vetorize novamente ou substitua.

### Demais imagens

Para o redesenho, trate todas as imagens antigas como **não verificadas até serem reavaliadas**, exceto os recursos efetivamente aprovados da ESA 2026.

Não apague fisicamente as imagens antigas. Preserve-as para auditoria e rollback.

A intenção é construir um catálogo limpo a partir das fontes originais, utilizando apenas recursos aprovados. Não confunda essa política lógica com uma autorização para executar uma exclusão em massa.

O novo catálogo deve ser gerado inicialmente em um diretório isolado, sem modificar `data/imagens/` durante o piloto.

## 4. Identificar corretamente a prova original

Para cada conjunto de questões, determine quais PDFs correspondem à prova original, ao gabarito e à resolução comentada.

A escolha deve considerar os metadados existentes, a estrutura do projeto e as evidências visuais e textuais.

Não presuma que todos os PDFs com nomes parecidos possuem o mesmo conteúdo.

Uma imagem encontrada exclusivamente na resolução comentada não pode ser atribuída à prova original automaticamente.

Se a origem estiver incerta, mantenha o recurso pendente e registre a incerteza.

Se a prova original realmente não possuir uma figura, registre `SOURCE_MISSING` ou um status equivalente. Não preencha a lacuna com uma figura de outra fonte como se fosse parte da prova.

## 5. Localizar a questão antes de localizar a figura

Implemente um processo que primeiro identifique a região da questão e depois determine a posição da figura dentro dessa região.

Utilize as evidências disponíveis:

- Texto extraível e coordenadas dos spans.
- Blocos e limites do enunciado.
- Posição e numeração da questão.
- Organização em colunas.
- Imagens efetivamente visíveis.
- Desenhos vetoriais.
- OCR para páginas escaneadas.
- Inspeção visual dos casos ambíguos.

Considere que algumas provas contêm fontes não padronizadas, como Type3, que podem inviabilizar a localização por uma simples busca textual.

O sistema também deve lidar com questões que ocupam mais de uma página, enunciados que continuam na página seguinte e alternativas distribuídas em colunas.

Não suponha que toda questão tenha uma única imagem nem que toda figura esteja abaixo do texto.

## 6. Preservar a semântica das figuras

Diferencie conceitualmente:

- Figura pertencente ao enunciado.
- Tabela do enunciado.
- Gráfico ou figura de uma alternativa.
- Painel contendo várias alternativas gráficas.
- Figura presente somente na resolução comentada.
- Objeto cuja função ainda não foi identificada.

Quando as alternativas A, B, C e D forem quatro gráficos, preserve a associação entre cada gráfico e sua alternativa.

Se a interface atual suportar uma imagem única contendo todas as alternativas, essa pode ser a representação apropriada.

Se suportar imagens individuais associadas às opções, preserve essa estrutura.

Não crie novos campos no banco nem altere contratos sem necessidade demonstrada. Se o modelo atual não conseguir representar corretamente a semântica da questão, documente a limitação e proponha a evolução mínima necessária.

## 7. Estratégia de extração e recorte

### Imagens rasterizadas

Quando o objeto incorporado corresponder à figura desejada, prefira extrair os bytes originais ou respeitar a transformação efetiva do objeto na página.

Não selecione objetos apenas por suas dimensões. Imagens pequenas também podem representar diagramas, gráficos e alternativas.

Confirme que o objeto realmente aparece na região da questão.

### Gráficos vetoriais

Quando o PDF contiver desenho vetorial, renderize diretamente a região desejada da página original, desde que isso preserve o resultado visual.

Não utilize automaticamente o VTracer em gráficos que já estão corretamente representados como vetores no PDF.

Não distorça a proporção nem altere arbitrariamente o `viewBox` do SVG.

Preserve os SVGs confiáveis da ESA 2026.

### PDFs escaneados

Quando não houver uma figura isolada recuperável, renderize a página ou a região correta e recorte manual ou automaticamente com base em coordenadas verificáveis.

Use OCR como apoio para localizar a questão, não como prova suficiente de fidelidade matemática.

### Transformações de coordenadas

Registre explicitamente o sistema de coordenadas usado pelo recorte.

Garanta que as conversões entre coordenadas do PDF, da página renderizada, de imagens incorporadas e de imagens previamente aparadas sejam corretas.

Considere rotação da página, dimensões visíveis e transformação efetiva de cada imagem.

Não aplique bounding boxes de uma imagem aparada diretamente na página original sem converter as coordenadas.

### Margens

Use margens adaptativas conforme a natureza da figura.

Não utilize uma expansão fixa que absorva o enunciado inteiro ou elementos de questões próximas.

Preserve eixos, rótulos, símbolos, letras das alternativas, arcos, setas e elementos próximos às bordas.

Se o recorte continuar ambíguo, encaminhe para revisão humana.

## 8. Piloto obrigatório de recuperação de imagens

Antes de reconstruir o catálogo completo, execute o novo pipeline em um piloto representativo.

Inclua, no mínimo:

- AFA 2011 Q17.
- AFA 2011 Q6 e Q13.
- AFA 2012 Q12 e Q20.
- AFA 2012 Q10.
- Um caso em que o pipeline antigo utilizou imagem de resolução comentada.
- Questões com várias alternativas gráficas.
- Figuras incorporadas diretamente no PDF.
- Gráficos vetoriais.
- PDFs escaneados.
- Figuras próximas às margens.
- Páginas com duas colunas.
- Questões com enunciado e figura visualmente próximos.
- Casos em que a questão se estende por mais de uma região ou página.

Inclua casos adicionais conforme os problemas encontrados na auditoria.

### AFA 2011 Q17: fechamento específico

A Q17 já possui um artefato candidato recuperado na auditoria anterior, incluindo:

- `data/audit/reprocessed_figures_pilot/afa_2011_q17/militar_afa_2011_q17_native.png`
- `data/audit/reprocessed_figures_pilot/afa_2011_q17/militar_afa_2011_q17_reproc_300dpi.png`
- `data/audit/reprocessed_figures_pilot/afa_2011_q17/militar_afa_2011_q17_sheet.png`
- `data/audit/reprocessed_figures_pilot/afa_2011_q17/RELATORIO_Q17.md`

Confirme os caminhos reais dos arquivos.

A recuperação da imagem já recebeu aprovação no relatório anterior. Não recomece a análise matemática da inequação sem uma discrepância concreta.

O problema operacional restante é confirmar se a aplicação ainda referencia o SVG defeituoso ou se já utiliza o recurso recuperado.

Rastreie a associação entre a questão e o arquivo efetivamente exibido pelo LemmaS.

Se a referência atual continuar apontando para o SVG defeituoso, prepare uma correção controlada e reversível para utilizar o candidato aprovado. Não modifique `data/imagens/` durante o piloto, não atualize o banco de produção e não declare que a imagem foi corrigida na aplicação apenas porque o candidato está salvo na auditoria.

A alteração da referência somente poderá ser concluída quando a implementação real permitir uma atualização reversível, sem violar as restrições de dados desta missão. Caso contrário, documente exatamente qual associação precisa ser atualizada na migração futura.

AFA 2012 Q10 deve continuar documentada como decisão editorial se a prova original realmente não contiver figura.

## 9. Validação e geração de relatórios

Cada candidato deve ter:

- Fonte identificada.
- Questão e região de origem confirmadas.
- Bounding box da página e da figura.
- Método de extração.
- Dimensões e resolução.
- Hash do arquivo final.
- Verificação estrutural.
- Inspeção visual.
- Verificação de associação semântica.
- Veredito e justificativa.

Produza folhas de contato com:

1. Página original e região selecionada marcada.
2. Recorte final ampliado.
3. Imagem legada, quando relevante, comparada ao novo resultado.
4. Identificação de prova, ano, questão e página.

Distinga claramente:

- `PASS_STRUCTURAL`
- `PASS_VISUAL`
- `PASS_ASSOCIATION`
- `MANUAL_REVIEW_REQUIRED`
- `SOURCE_MISSING`

Esses estados são uma proposta conceitual e devem ser adaptados à nomenclatura real dos relatórios.

Não aprove uma figura apenas porque o arquivo é válido ou o recorte parece plausível.

---

# MISSÃO B — CONCLUIR AS QUESTÕES DISCURSIVAS E A BANCADA

## 10. Objetivo

Concluir a integração entre as questões discursivas da página `/resolver`, as três ferramentas da Bancada, o avaliador do MathAI Engine, o estado de navegação e a persistência.

Não crie novos inputs de resposta final dentro do card do enunciado.

O aluno deve desenvolver sua resolução nas ferramentas existentes:

- Lousa de Rascunho.
- Geometria Euclidiana.
- Dedução & OCR.

A implementação anterior declarou a integração concluída, mas precisamos confirmar e corrigir os pontos de robustez descritos abaixo.

## 11. Auditoria do fluxo real

Rastreie as três ferramentas desde a submissão até o resultado mostrado na interface.

Inspecione, quando existentes:

- `frontend/app/(app)/resolver/page.tsx`
- Os componentes e hooks da Lousa.
- Os componentes e hooks da Geometria Euclidiana.
- Os componentes e hooks da Dedução & OCR.
- `frontend/app/api/ai/solve/route.ts`
- `frontend/app/api/questions/[id]/submit/route.ts`
- `backend/app/api/routes/tutor.py`
- `backend/app/services/mathai/evaluator.py`
- `backend/app/schemas/ai_evaluation.py`

Verifique também o comportamento do fallback frontend quando o serviço backend não responde.

Não presuma que os três modos utilizam a mesma rota. Confirme o percurso e os formatos de submissão reais antes de alterar os contratos.

O fallback não pode inventar uma classificação matemática definitiva por meio de uma heurística simplista quando o serviço avaliador estiver indisponível. Se não houver informação suficiente para avaliar a resolução, apresente uma avaliação inconclusiva e permita a nova tentativa sem perder o conteúdo.

## 12. CTA nas questões discursivas

Na página `frontend/app/(app)/resolver/page.tsx`, mostre um banner abaixo do enunciado e da figura somente quando não houver alternativas.

Utilize a condição compatível com os tipos existentes, equivalente a:

`!q.alternativas || q.alternativas.length === 0`

### Título

**📝 Questão Discursiva — Resolução Analítica na Bancada**

### Descrição

"Esta questão exige desenvolvimento. Utilize uma das ferramentas da Bancada de Resolução abaixo para construir sua prova, escrever os cálculos ou enviar foto do seu papel."

### Atalhos

1. **✏️ Resolver na Lousa de Rascunho**
2. **📐 Construir na Geometria Euclidiana**
3. **📷 Digitar ou Enviar Foto (Dedução & OCR)**

Cada botão deve:

- Ativar efetivamente a aba correspondente.
- Executar scroll suave até a Bancada.
- Funcionar em desktop e celular.
- Respeitar os estados de carregamento e a renderização condicional.
- Utilizar os elementos e mecanismos existentes, sem duplicar componentes.

O uso de `scrollIntoView` isoladamente não comprova a ativação da aba. Verifique se `setBancadaModo` ou o mecanismo real seleciona a ferramenta correta e se o conteúdo correspondente é montado no DOM.

Preserve o estilo visual, a acessibilidade e a navegação atual do LemmaS.

## 13. Vereditos estruturados do MathAI Engine

O contrato da avaliação deve admitir quatro vereditos de negócio:

- `aprovado`
- `parcial`
- `sem_desenvolvimento`
- `incorreto`

O contrato existente pode ser utilizado como base. Inspecione os tipos reais antes de editar.

Como referência conceitual:

```typescript
interface DiscursiveEvaluationResult {
  veredito:
    | "aprovado"
    | "parcial"
    | "sem_desenvolvimento"
    | "incorreto";

  desenvolvimento_presente: boolean;
  resultado_final_correto: boolean;
  etapas_corretas: string[];
  erros_identificados: string[];
  feedback_latex: string;
  precisa_revisao_humana: boolean;
}
```

Adapte o exemplo aos contratos existentes. Não duplique campos que já existam com finalidade equivalente.

Valide o retorno do serviço antes de atualizar a interface ou persistir uma tentativa.

Um estado técnico de avaliação inconclusiva pode ser representado separadamente dos quatro vereditos. Não o confunda com uma quinta classificação matemática nem force um erro quando a avaliação não puder ser concluída.

### Critérios matemáticos

**`aprovado`:** desenvolvimento válido e resultado correto. Uma demonstração deve justificar a conclusão adequadamente.

**`parcial`:** raciocínio relevante e essencialmente correto, com erro localizado ou etapa incompleta que justifique crédito parcial.

**`incorreto`:** existe desenvolvimento identificável, mas há erro conceitual, lógico ou matemático que invalida a resolução.

**`sem_desenvolvimento`:** o aluno informou somente o resultado final, sem desenvolvimento matemático verificável.

Não force demonstrações longas quando uma sequência concisa de operações ou uma construção geométrica válida já represente o raciocínio.

Utilize o enunciado, a solução de referência ou os critérios existentes e a representação real da resposta do aluno.

Não invente uma solução de referência se ela não existir.

## 14. Corrigir a detecção de desenvolvimento

O relatório anterior indicou uma heurística baseada na ausência de operadores matemáticos e em comprimento inferior a 20 caracteres.

Essa regra não deve continuar sendo o único critério de detecção.

Ela pode rejeitar respostas legítimas, como uma justificativa textual curta, uma construção geométrica válida ou uma demonstração concisa.

Adapte a avaliação à origem da tentativa.

### Lousa de Rascunho

Inspecione a representação real produzida pela Lousa. Considere os passos ou expressões efetivamente registrados, sem depender apenas do texto final.

### Geometria Euclidiana

Verifique as construções, objetos, relações e justificativas que a ferramenta realmente fornece.

Não exija que uma construção válida seja convertida artificialmente em texto extenso.

### Dedução & OCR

Preserve a imagem original enviada pelo estudante e o resultado do OCR quando disponível.

Avalie o conteúdo extraído considerando que o OCR pode omitir operadores, expoentes, raízes, símbolos e elementos gráficos.

Uma imagem ilegível não significa uma resposta matematicamente incorreta.

### Regra comum

Se não houver informação suficiente para determinar se existe desenvolvimento, peça esclarecimento ou encaminhe para revisão. Não rejeite silenciosamente o conteúdo nem contabilize a tentativa como erro.

Não considere a mera existência de um texto, imagem ou objeto gráfico como prova de desenvolvimento matemático.

O avaliador deve justificar o veredito a partir da evidência que realmente recebeu.

## 15. Regra obrigatória para `sem_desenvolvimento`

Exiba a mensagem:

"Você indicou o resultado final, mas em questões discursivas é obrigatório demonstrar o raciocínio (na Lousa, GeoGebra ou Foto/Dedução) para validar os pontos."

Nesse caso:

- Não marque a questão como concluída.
- Não incremente o contador de questões respondidas.
- Não pinte o número como uma tentativa validamente avaliada.
- Não acione Elo ou qualquer calibração de habilidade.
- Não registre a resposta final como resultado matemático definitivo.
- Preserve justificativas, imagens e rascunhos para edição contínua.
- Permita que o aluno retorne à Bancada sem perder seu trabalho.

Se a rota atual utilizar HTTP 400 para sinalizar a ausência de desenvolvimento, garanta que o frontend apresente a mensagem específica. Não mostre somente um erro genérico.

## 16. Contabilização e navegação `1..22`

Inspecione o tipo e os consumidores do estado atual `answers`.

Não misture avaliações discursivas em um estado tipado para alternativas objetivas se isso quebrar contratos existentes.

Se necessário, mantenha um estado específico para os resultados discursivos, seguindo as convenções reais do projeto.

A contagem deve refletir cada questão respondida apenas uma vez, mesmo após múltiplas tentativas.

Quando houver desenvolvimento real e o avaliador retornar:

- `aprovado`: contabilizar como respondida; indicador verde.
- `parcial`: contabilizar como respondida; indicador âmbar.
- `incorreto`: contabilizar como respondida; indicador vermelho.

`sem_desenvolvimento` não conclui a questão.

Uma avaliação inconclusiva não deve ser apresentada como erro matemático nem marcar a questão como concluída.

Não permita que reenvios aumentem indevidamente o contador.

### Feedback visual

Para `aprovado`, use o status qualitativo:

**✓ Discursiva Validada pela Banca**

Para `parcial`, apresente:

**Crédito Parcial Atribuído**

Para `incorreto`, apresente:

**Desenvolvimento Incorreto**

Não exiba percentuais de domínio, `100% dos Pontos`, notas quantitativas ou pontuações arbitrárias sem uma rubrica de correção real e verificável.

Mantenha o feedback didático em LaTeX e destaque os passos corretos e os erros identificados.

## 17. Persistência e integridade das tentativas

Inspecione o esquema real de `public.tentativas` e as consultas efetivamente utilizadas.

O relatório anterior indicou campos como `questao_id`, `aluno_id`, `tempo_segundos`, `acertou` e `tipo_erro`. Confirme que essa ainda é a estrutura real e inspecione as restrições existentes.

Verifique onde são preservados os quatro vereditos completos.

Se a persistência possuir somente um indicador binário `acertou`, não considere isso suficiente para preservar a diferença entre `aprovado`, `parcial` e `incorreto`.

Procure primeiro um campo ou estrutura já existente e compatível para registrar o resultado estruturado, sem pressupor que exista uma coluna JSON.

Se não houver uma estrutura compatível:

1. Não tente inserir colunas que não existem.
2. Não altere o banco de produção.
3. Não esconda a perda de informação convertendo todos os vereditos em um único estado.
4. Documente a limitação exata.
5. Se necessário, produza uma proposta de migração revisável, sem aplicá-la, indicando os contratos de código que dependerão dela.

Para cada tentativa legítima, preserve o histórico compatível com a estrutura existente, incluindo, quando suportado:
- Usuário e questão.
- Ferramenta utilizada.
- Desenvolvimento submetido.
- Veredito estruturado.
- Feedback.
- Momento da avaliação.
- Estado de revisão, se aplicável.

Trate erros de persistência explicitamente. Não informe sucesso definitivo se a gravação falhou.

Evite duplicações por clique duplo, retries automáticos ou respostas repetidas do mesmo pedido. Preserve as tentativas legítimas anteriores quando o projeto mantém histórico.

## 18. Integração com SM-2 e ausência de Elo

Inspecione a função real `calcularProximoIntervaloSM2`, os contratos utilizados e a operação em `public.revisao_espacada`.

Garanta que os resultados discursivos sejam mapeados para o agendamento por uma regra explícita, compatível com a implementação atual.

Não transforme os vereditos em uma medida artificial de habilidade.

Não confunda SM-2 com Elo.

O mecanismo `registrar_duelo_aluno_questao` foi anteriormente reportado como inexistente. Confirme novamente antes de qualquer integração.

Se o Elo não existir ou não estiver calibrado, mantenha-o inativo. A contabilização das tentativas e o funcionamento da Bancada não podem depender dele.

Não estime a habilidade inicial com base somente no objetivo ou na preferência pedagógica do estudante.

Se a regra de SM-2 não puder preservar um comportamento coerente com os vereditos disponíveis, documente o problema e proponha o ajuste mínimo necessário, sem executar alterações de produção.

---

# FASE FINAL — INTEGRAÇÃO, TESTES E ACEITAÇÃO

## 19. Testes obrigatórios das imagens

Execute os testes disponíveis para:

- Proveniência do PDF original.
- Separação entre prova e resolução comentada.
- Identificação correta da questão.
- Figuras do enunciado e gráficos de alternativas.
- PDFs escaneados.
- Elementos vetoriais.
- Transformações de coordenadas.
- Recortes com margens inadequadas.
- Objetos gráficos pequenos.
- Figuras ausentes da prova.
- Q17 da AFA 2011.
- Integridade dos recursos anteriormente aprovados.
- Integridade dos hashes dos SVGs protegidos da ESA 2026.

Não considere uma figura aprovada apenas porque o arquivo existe ou os testes estruturais passaram.

## 20. Testes obrigatórios da Bancada

Cubra as três ferramentas em conjunto:

- Lousa de Rascunho.
- Geometria Euclidiana.
- Dedução & OCR.

Teste:

1. Resolução correta com desenvolvimento.
2. Erro localizado.
3. Erro conceitual.
4. Resposta final isolada.
5. Imagem ilegível e avaliação inconclusiva.
6. Demonstração matemática concisa.
7. Expressões matemáticas equivalentes à solução de referência.
8. Resposta enviada novamente.
9. Falha de rede.
10. Falha na persistência.
11. Incremento e desduplicação do contador.
12. Atualização correta das cores na navegação `1..22`.
13. Preservação do rascunho após `sem_desenvolvimento`.
14. Compatibilidade com as questões objetivas.
15. Persistência e histórico dos vereditos.
16. Comportamento do SM-2.

Crie ou atualize testes automatizados utilizando as ferramentas existentes no projeto.

Diferencie testes unitários, testes de integração e testes reais de interação no navegador. Não declare ponta a ponta validado se o percurso inteiro não tiver sido executado.

## 21. Build e revisão final

Execute:

- Testes do pipeline de imagens.
- Testes de aceitação da Q17.
- Testes do avaliador discursivo.
- Testes frontend pertinentes.
- Testes de persistência e SM-2 pertinentes.
- `npx tsc --noEmit`, se compatível com os scripts do projeto.
- `npm run build` no diretório correto do frontend.

Corrija os problemas introduzidos pelas alterações.

Diferencie falhas preexistentes de falhas causadas pelo trabalho desta missão.

O resultado de um build não substitui a validação dos comportamentos.

## 22. Restrições globais de segurança

- Não realizar deploy.
- Não modificar segredos ou variáveis de ambiente.
- Não executar uploads, upserts, updates ou deletes no Supabase de produção.
- Não aplicar migrações de produção.
- Não apagar arquivos legados.
- Não modificar as questões ou suas alternativas.
- Não modificar `data/imagens/` durante o piloto de imagens.
- Não sobrescrever os artefatos de auditoria anteriores.
- Não modificar os SVGs protegidos da ESA 2026.
- Não sobrescrever alterações de outros agentes.
- Não criar funções fictícias de Elo.
- Não inventar resultados de testes.
- Não declarar uma integração validada quando houver etapas não executadas.

Todos os novos candidatos de imagem devem permanecer isolados em um diretório de auditoria. Alterações da interface e do backend devem ser reversíveis e restritas ao escopo necessário.

---

# RELATÓRIO FINAL CONSOLIDADO

O Antigravity deve produzir um único relatório com as duas missões, deixando claro o que foi realizado por cada agente e o que foi efetivamente validado.

## A. Coordenação
- Tarefas delegadas ao Hermes.
- Tarefas executadas pelo Antigravity.
- Arquivos editados por cada agente.
- Conflitos evitados ou resolvidos.
- Testes e evidências revisados.

## B. Imagens
- Inventário dos recursos antigos.
- PDFs originais e resoluções identificados.
- Recursos protegidos da ESA 2026.
- Novo pipeline e arquivos criados.
- Questões testadas.
- Folhas de contato e caminhos dos artefatos.
- Estado de proveniência, associação e qualidade.
- Estado da Q17 na auditoria e na referência utilizada pela aplicação.
- Plano para reconstruir e migrar o catálogo completo.
- Casos que exigem revisão manual.

## C. Bancada discursiva
- CTA e funcionamento real dos três atalhos.
- Contrato dos quatro vereditos.
- Tratamento de avaliação inconclusiva.
- Correção da heurística de desenvolvimento.
- Comportamento da Lousa, Geometria e Dedução & OCR.
- Contabilização e atualização da navegação.
- Persistência efetiva dos vereditos.
- Tratamento de erros e reenvios.
- Integração com SM-2.
- Estado real da integração com Elo.

## D. Testes
- Comandos executados.
- Resultados reais.
- Testes unitários, de integração e de navegador.
- Resultado de `npm run build`.
- Limitações e testes não realizados.

## E. Segurança
- Estado final do Git.
- Confirmação das áreas e arquivos preservados.
- Confirmação de que nenhuma operação proibida foi realizada.
- Migrações ou alterações de esquema propostas, caso necessárias, sem execução em produção.

### Critério de conclusão

A missão somente pode ser considerada concluída quando:

1. O novo pipeline conseguir demonstrar a origem e a integridade das figuras do piloto.
2. A aplicação não continuar usando uma associação defeituosa sem que isso seja explicitamente identificado.
3. As três ferramentas da Bancada enviarem suas resoluções corretamente para avaliação.
4. Os quatro vereditos forem tratados de forma consistente.
5. A ausência de desenvolvimento não concluir a questão nem apagar o rascunho.
6. A persistência preservar as distinções necessárias ou documentar precisamente qualquer bloqueio de esquema.
7. A contabilização, a navegação e o SM-2 funcionarem segundo regras explícitas.
8. Os testes e o build forem executados e seus resultados reportados honestamente.

Não declare tudo concluído apenas porque o pipeline gera imagens ou a interface compila. As duas frentes devem ser validadas individualmente e depois revisadas em conjunto.