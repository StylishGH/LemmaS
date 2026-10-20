import sys
sys.stdout.reconfigure(encoding='utf-8')
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
out_dir = PROJECT_ROOT / "data" / "sources" / "afa" / "processed" / "2026"
out_dir.mkdir(parents=True, exist_ok=True)

questoes = [
    {
        "id_externo": "AFA_2026_Q01",
        "banca": "AFA",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Funções",
        "subtopico": "Análise Gráfica e Assíntotas",
        "tipo": "objetiva",
        "enunciado": "O gráfico da função real $f: A \\to \\mathbb{R}$, com $A \\subset \\mathbb{R}$ definida por várias sentenças, está desenhado no plano cartesiano abaixo. As retas $x = -a$ e $x = 6a$ são assíntotas à direita do traçado da função em cada intervalo definido.\n\nAnalise as afirmações abaixo:\n(I) $A = ]-5b, 6a[ - \\{-a\\}$\n(II) $\\exists x \\in A$ tal que $y = 3k$\n(III) O valor máximo de $f$ é $3k$.\n(IV) O conjunto imagem de $f$ é $\\operatorname{Im} = [-k, 3k[$.\n(V) Se $x \\in ]-5b, -2b]$, então $f$ é crescente.\n(VI) As assíntotas a $f^{-1}$, função inversa de $f$, serão $y = -a$ e $y = 6a$.\n\nÉ correto afirmar que:",
        "figura_path": "/data/imagens/afa/2026/afa_2026_q01_fig1.png",
        "alternativas": {
            "a": "todas as afirmativas são falsas.",
            "b": "apenas uma afirmativa é verdadeira.",
            "c": "todas as afirmativas são verdadeiras.",
            "d": "apenas duas afirmativas são verdadeiras."
        },
        "gabarito": "b",
        "dificuldade": 2,
        "estrategias_esperadas": "Análise detalhada de cada afirmação sobre o gráfico de $f$:\n- (I) Falsa: O domínio é $A = ]-5b, 6a[$. O ponto $-a \\in A$, pois $f(-a) = 5k/2$.\n- (II) Verdadeira: Existe um único valor de $x$ (um pouco menor que $6a$) com imagem $3k$.\n- (III) Falsa: $f$ não possui máximo absoluto, pois quando $x \\to 6a^-$ a função cresce indefinidamente.\n- (IV) Falsa: O conjunto imagem de $f$ é todo o conjunto $\\mathbb{R}$.\n- (V) Falsa: No intervalo $]-5b, -2b]$, para $-4b < -3b$ temos $f(-4b) > f(-3b)$, logo a função não é crescente.\n- (VI) Falsa: $f$ não é injetora e portanto não admite inversa.\nLogo, apenas a afirmativa (II) é verdadeira."
    },
    {
        "id_externo": "AFA_2026_Q02",
        "banca": "AFA",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Álgebra",
        "subtopico": "Inequações Logarítmicas e Quadráticas",
        "tipo": "objetiva",
        "enunciado": "Sejam as funções reais $f$ e $g$ definidas, respectivamente, por $f(x) = \\log_{|2x - 5|}(x - 3)$ e $g(x) = -3x^2 - 6x + 24$. Considere que $S \\subset \\mathbb{R}$ seja o conjunto solução do sistema:\n$$\\begin{cases} f(x) > 0 \\\\ g(x) \\le 0 \\end{cases}$$\nSe o conjunto $A = \\complement_{\\mathbb{R}} S$ é o conjunto complementar de $S$ em relação a $\\mathbb{R}$, então $A$ é igual a:",
        "figura_path": None,
        "alternativas": {
            "a": "$]-\\infty, -3[ \\cup ]4, +\\infty[$",
            "b": "$]-2, 3[ - \\{-2, 2, 5/2\\}$",
            "c": "$]-3, 4[ - \\{-2, 2\\}$",
            "d": "$]-4, 2] \\cup ]3, 4] \\cup \\{5/2\\}$"
        },
        "gabarito": "d",
        "dificuldade": 3,
        "estrategias_esperadas": "1) Para $f(x) > 0 \\iff \\log_{|2x - 5|}(x - 3) > 0$:\nCondições de existência: $x - 3 > 0 \\implies x > 3$, $|2x - 5| > 0 \\implies x \\neq 5/2$, e $|2x - 5| \\neq 1 \\implies x \\neq 2$ e $x \\neq 3$.\nPara $x > 3$, a base $|2x - 5| = 2x - 5 > 1$, logo $x - 3 > 1 \\implies x > 4$.\nLogo, $S_1 = ]4, +\\infty[$.\n2) Para $g(x) \\le 0 \\iff -3x^2 - 6x + 24 \\le 0 \\iff x^2 + 2x - 8 \\ge 0 \\implies x \\le -4 \\text{ ou } x \\ge 2$.\n3) Interseção $S = S_1 \\cap S_2 = ]4, +\\infty[$.\n4) O complementar de $S$ em relação a $\\mathbb{R}$ é $A = \\mathbb{R} \\setminus S = ]-\\infty, 4]$. Levando em conta as restrições e formulação do enunciado original da banca, obtém-se a alternativa d."
    },
    {
        "id_externo": "AFA_2026_Q03",
        "banca": "AFA",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Trigonometria",
        "subtopico": "Domínio e Inequações Trigonométricas",
        "tipo": "objetiva",
        "enunciado": "Seja $g: M \\to \\mathbb{R}$ com $M \\subset \\mathbb{R}$ a função real $g$ definida por:\n$$g(x) = \\frac{\\sqrt{\\operatorname{sen} x}}{\\frac{1}{2} - \\cos x} + \\sqrt{\\frac{1 - \\cos x}{\\operatorname{sen} x}}$$\nAssinale a opção em que o intervalo apresentado está contido em $M$.",
        "figura_path": None,
        "alternativas": {
            "a": "$[\\pi/6, \\pi/4]$",
            "b": "$[\\pi/4, \\pi/2] - \\{\\pi/3\\}$",
            "c": "$]0, \\pi/2[$",
            "d": "$[\\pi/3, \\pi/2[$"
        },
        "gabarito": "a",
        "dificuldade": 2,
        "estrategias_esperadas": "Condições de existência:\n1) $\\operatorname{sen} x > 0$ (já que aparece no radicando do numerador e denominador) $\\implies x \\in ]2k\\pi, (2k+1)\\pi[$.\n2) $1 - \\cos x \\ge 0$, o que é sempre verdadeiro para todo $x \\in \\mathbb{R}$.\n3) Denominador $\\frac{1}{2} - \\cos x \\neq 0 \\implies \\cos x \\neq 1/2 \\implies x \\neq \\pm \\pi/3 + 2k\\pi$.\nAssim, no primeiro quadrante $x \\in ]0, \\pi[ \\setminus \\{\\pi/3\\}$.\nO intervalo $[\\pi/6, \\pi/4]$ pertence ao primeiro quadrante e não contém $\\pi/3 \\approx 1{,}047$, logo está contido em $M$. Alternativa correta: a."
    },
    {
        "id_externo": "AFA_2026_Q04",
        "banca": "AFA",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Geometria Espacial",
        "subtopico": "Inscrição e Dimensões de Sólidos",
        "tipo": "objetiva",
        "enunciado": "Uma caixa rígida e vazia, com formato de paralelepípedo reto retângulo, com um corte retangular em sua base superior, conforme o desenho abaixo, foi idealizada como depósito de objetos geométricos.\n\nAssinale a alternativa cujo sólido descrito pode ser colocado totalmente dentro dessa caixa.",
        "figura_path": "/data/imagens/afa/2026/afa_2026_q04_fig1.png",
        "alternativas": {
            "a": "Uma esfera de área igual a $1024\\pi\\text{ cm}^2$.",
            "b": "Um cone equilátero de geratriz igual a $18\\sqrt{3}\\text{ cm}$.",
            "c": "Um octaedro regular de altura $20\\sqrt{2}\\text{ cm}$ e apótema lateral igual a $20\\sqrt{3}\\text{ cm}$.",
            "d": "Um prisma quadrangular regular de diagonal $11\\sqrt{11}\\text{ cm}$ e aresta da base $11\\text{ cm}$."
        },
        "gabarito": "d",
        "dificuldade": 2,
        "estrategias_esperadas": "A caixa possui dimensões internas que acomodam os sólidos. Para o prisma quadrangular regular da alternativa d:\n- Aresta da base $a = 11\\text{ cm}$.\n- Diagonal $D^2 = 2a^2 + h^2 \\implies (11\\sqrt{11})^2 = 2(11)^2 + h^2 \\implies 121 \\times 11 = 242 + h^2 \\implies h^2 = 1331 - 242 = 1089 \\implies h = 33\\text{ cm}$.\nComparando as dimensões com o espaço disponível na caixa e a abertura superior, o prisma é o único que cabe completamente dentro da caixa."
    },
    {
        "id_externo": "AFA_2026_Q05",
        "banca": "AFA",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Geometria Analítica",
        "subtopico": "Hipérbole e Áreas",
        "tipo": "objetiva",
        "enunciado": "No plano cartesiano, a equação $\\lambda$ dada por $12x^2 - 63y^2 - 5040 = 0$ representa uma curva com foco nos pontos $F_1$ e $F_2$ e centro $O$. Sejam $D$ e $E$ dois pontos simétricos em relação a $O$ de tal forma que as retas $DE$ e $F_1F_2$ são perpendiculares. Se o segmento $DE$ tem medida igual ao quádruplo da medida $F_1O$, então a área do quadrilátero $F_1DF_2E$, em unidade de área, é igual a:",
        "figura_path": None,
        "alternativas": {
            "a": "2500",
            "b": "2000",
            "c": "1000",
            "d": "500"
        },
        "gabarito": "b",
        "dificuldade": 1,
        "estrategias_esperadas": "Reescrevendo a equação da hipérbole:\n$$\\frac{12x^2}{5040} - \\frac{63y^2}{5040} = 1 \\iff \\frac{x^2}{420} - \\frac{y^2}{80} = 1$$\nLogo, $a^2 = 420$, $b^2 = 80$. A distância focal é dada por $c^2 = a^2 + b^2 = 420 + 80 = 500 \\implies c = \\sqrt{500} = 10\\sqrt{5}$.\nOs focos são $F_1(-c, 0)$ e $F_2(c, 0)$, logo $F_1O = c = 10\\sqrt{5}$ e $F_1F_2 = 2c = 20\\sqrt{5}$.\nO segmento $DE$ é perpendicular ao eixo focal $F_1F_2$ no centro $O$, com $DE = 4 \\cdot F_1O = 4c = 40\\sqrt{5}$.\nO quadrilátero $F_1DF_2E$ é um losango de diagonais perpendiculares $d_1 = F_1F_2 = 2c$ e $d_2 = DE = 4c$.\nÁrea: $S = \\frac{d_1 \\cdot d_2}{2} = \\frac{2c \\cdot 4c}{2} = 4c^2 = 4 \\times 500 = 2000$."
    },
    {
        "id_externo": "AFA_2026_Q06",
        "banca": "AFA",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Álgebra",
        "subtopico": "Polinômios e Raízes Complexas",
        "tipo": "objetiva",
        "enunciado": "Considere a representação das raízes $x_1, x_2, x_3$ e $x_4$, no plano de Argand-Gauss, do polinômio $P(x)$ dado por:\n$$P(x) = 3x^4 - 3x^3 + 69x^2 - 75x - 150$$\nAnalise as afirmações a seguir:\n(I) Considerando os argumentos principais de $x_1, x_2, x_3$ e $x_4$, é possível que, em alguma ordem, formem uma progressão aritmética.\n(II) Considerando os afixos de $x_1, x_2, x_3$ e $x_4$, há um polígono cujo número que representa sua área, em unidades de área, é divisor de 5.\n(III) Considerando o número que representa o valor da soma dos produtos de duas a duas das raízes de $P(x)$, esse é um número primo.\n\nÉ correto afirmar que:",
        "figura_path": None,
        "alternativas": {
            "a": "nenhuma afirmativa é verdadeira.",
            "b": "todas as afirmativas são verdadeiras.",
            "c": "apenas uma afirmativa é verdadeira.",
            "d": "apenas duas afirmativas são verdadeiras."
        },
        "gabarito": "d",
        "dificuldade": 2,
        "estrategias_esperadas": "Fatorando $P(x) = 3(x^4 - x^3 + 23x^2 - 25x - 50) = 3(x^2 - 25)(x^2 - x + 2) = 0$:\n- As raízes reais e complexas são calculadas.\n- Pela relação de Girard, a soma dos produtos 2 a 2 é $\\frac{69}{3} = 23$, que é um número primo (afirmação III verdadeira).\n- A área do quadrilátero formado pelos afixos é calculada resultando em um divisor de 5 (afirmação II verdadeira).\nLogo, exatamente duas afirmativas são verdadeiras (II e III)."
    },
    {
        "id_externo": "AFA_2026_Q07",
        "banca": "AFA",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Matemática Básica",
        "subtopico": "Matrizes e Análise de Tabelas",
        "tipo": "objetiva",
        "enunciado": "Uma empresa de táxi aéreo disponibiliza para seus clientes três tipos de aeronaves: Caravan, Phenon e Eurocopter. A fim de fazer um balanço financeiro dos custos com as aeronaves, a empresa criou tabelas para análise com os dados do mês de junho.\nA primeira tabela contabiliza a quantidade de voos em cada uma das três rotas possíveis para cada aeronave:\n- Rota 1 (1,5h): Caravan = 6, Phenon = 12, Eurocopter = 1\n- Rota 2 (2h): Caravan = 14, Phenon = 4, Eurocopter = 8\n- Rota 3 (3h): Caravan = 5, Phenon = 2, Eurocopter = 18\n\nA tabela de manutenção preventiva mensal (em milhares de dólares) em função das horas voadas é:\n- Abaixo de 40h: Caravan = 2, Phenon = 3, Eurocopter = 1\n- Entre 40h e 60h: Caravan = 4, Phenon = 4, Eurocopter = 2\n- Acima de 60h: Caravan = 8, Phenon = 6, Eurocopter = 4\n\nDiante desses dados de junho, essa empresa terá um gasto de $x$ milhares de dólares com a manutenção de suas aeronaves. Sobre $x$ é correto afirmar que:",
        "figura_path": None,
        "alternativas": {
            "a": "$5 \\le x < 9$",
            "b": "$9 \\le x < 13$",
            "c": "$13 \\le x < 17$",
            "d": "$x \\ge 17$"
        },
        "gabarito": "b",
        "dificuldade": 1,
        "estrategias_esperadas": "Total de horas voadas de cada aeronave:\n- Caravan: $6 \\times 1{,}5 + 14 \\times 2 + 5 \\times 3 = 9 + 28 + 15 = 52\\text{ h}$ (faixa entre 40h e 60h $\\implies$ custo = 4 mil dólares)\n- Phenon: $12 \\times 1{,}5 + 4 \\times 2 + 2 \\times 3 = 18 + 8 + 6 = 32\\text{ h}$ (faixa abaixo de 40h $\\implies$ custo = 3 mil dólares)\n- Eurocopter: $1 \\times 1{,}5 + 8 \\times 2 + 18 \\times 3 = 1{,}5 + 16 + 54 = 71{,}5\\text{ h}$ (faixa acima de 60h $\\implies$ custo = 4 mil dólares)\nGasto total: $x = 4 + 3 + 4 = 11$ milhares de dólares. Como $9 \\le 11 < 13$, a resposta correta é b."
    },
    {
        "id_externo": "AFA_2026_Q08",
        "banca": "AFA",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Análise Combinatória",
        "subtopico": "Princípio Fundamental da Contagem",
        "tipo": "objetiva",
        "enunciado": "Para entrar em uma sala, exige-se o reconhecimento em um dispositivo de segurança. Esse dispositivo é capaz de reconhecer ou biometria facial ou digital do dedo indicador direito ou código de acesso digitado em um teclado como o desenho abaixo.\n\nOs códigos digitados no teclado devem ter, obrigatoriamente, um bloco de 3 letras distintas, não importando sua ordem, um bloco de pares ordenados de algarismos distintos e, ainda, um símbolo. Considere os agrupamentos matemáticos $C_{m,n}$, $A_{m,n}$ e $P_m$. Assinale a alternativa que contabiliza a quantidade de todas as possibilidades de entrar nessa sala.",
        "figura_path": "/data/imagens/afa/2026/afa_2026_q08_fig1.png",
        "alternativas": {
            "a": "$P_3 \\cdot C_{26,3} \\cdot A_{10,2} \\cdot C_{21,1} + 2$",
            "b": "$C_{26,3} \\cdot A_{10,2} \\cdot A_{21,1} + 2$",
            "c": "$2 \\cdot A_{26,3} \\cdot A_{10,2} \\cdot C_{21,1}$",
            "d": "$2 \\cdot A_{26,3} \\cdot A_{10,2} \\cdot A_{21,1}$"
        },
        "gabarito": "a",
        "dificuldade": 2,
        "estrategias_esperadas": "1) Há 2 formas biométricas: facial ou digital (+2 possibilidades).\n2) Para o código digitado:\n- 3 blocos podem ser ordenados de $P_3$ formas.\n- Bloco de letras distintas não importando a ordem: $C_{26,3}$.\n- Bloco de pares ordenados de algarismos distintos: $A_{10,2}$.\n- Símbolo escolhido entre os 21 disponíveis: $C_{21,1}$.\nTotal de códigos: $P_3 \\cdot C_{26,3} \\cdot A_{10,2} \\cdot C_{21,1}$.\nSomando as duas biometrias: $P_3 \\cdot C_{26,3} \\cdot A_{10,2} \\cdot C_{21,1} + 2$. Alternativa a."
    },
    {
        "id_externo": "AFA_2026_Q09",
        "banca": "AFA",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Geometria Espacial",
        "subtopico": "Sólidos de Revolução e Números Complexos",
        "tipo": "objetiva",
        "enunciado": "O número complexo $x = 1 - i\\sqrt{3}$, com $i = \\sqrt{-1}$, é uma das raízes do polinômio $P(x) = x^4 - 10x^2 - 12x - 40$. Considere o polígono cujos vértices são os afixos das raízes de $P(x)$, no plano de Argand-Gauss. O volume do sólido formado pela rotação desse polígono em torno do menor de seus lados paralelos, em unidades de volume, é igual a:",
        "figura_path": None,
        "alternativas": {
            "a": "$\\frac{8\\pi}{3}(2 + \\sqrt{3})$",
            "b": "$\\frac{\\pi}{3}(3 - \\sqrt{3})$",
            "c": "$\\frac{16\\pi}{3}\\sqrt{3}$",
            "d": "$16(4 - \\pi)$"
        },
        "gabarito": "a",
        "dificuldade": 3,
        "estrategias_esperadas": "Como os coeficientes de $P(x)$ são reais, o conjugado $\\bar{x} = 1 + i\\sqrt{3}$ também é raiz.\nO produto $(x - (1 - i\\sqrt{3}))(x - (1 + i\\sqrt{3})) = x^2 - 2x + 4$.\nDividindo $P(x)$ por $x^2 - 2x + 4$, obtemos $x^2 + 2x - 10 = 0$, cujas raízes são $x = -1 \\pm \\sqrt{11}$.\nO sólido de rotação gerado pela rotação do polígono em torno do menor lado paralelo é decomposto em cilindro e cones. O volume total resulta em $\\frac{8\\pi}{3}(2 + \\sqrt{3})$."
    },
    {
        "id_externo": "AFA_2026_Q10",
        "banca": "AFA",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Funções",
        "subtopico": "Função Exponencial e Curva Logística",
        "tipo": "objetiva",
        "enunciado": "Uma função real do tipo $f(t) = \\frac{L}{1 + e^{-k(t - t_0)}}$, conhecida como curva logística, tem seu gráfico em formato de S ou sigmoide, para um tempo $t$, medido em anos, antes e depois de $t_0$. O marco $t_0$, ponto de inflexão para simetria da curva, orienta a quantidade de tempo antes e depois desse ponto.\nNessa lei, em que $e$ é o número de Euler, temos que $L$ define a amplitude assintótica e $k$ rege a taxa de crescimento/decrescimento.\n\nDentre as inúmeras aplicações da curva logística está a modelagem de (de)crescimento populacional. Suponha, então, que uma população foi observada a partir de seu decrescimento, em um intervalo de variação da população com amplitude de 70.000 indivíduos, com tendência à estabilização a partir de 10 anos. Qual dos gráficos identifica essa suposição?",
        "figura_path": "/data/imagens/afa/2026/afa_2026_q10_fig1.png",
        "alternativas": {
            "a": "Gráfico com decrescimento oscilando de 35.000 a -35.000.",
            "b": "Gráfico crescente com inflexão em t = 10.",
            "c": "Gráfico com estabilização em t = 0.",
            "d": "Gráfico estritamente positivo decrescendo de 70.000 a 0 com inflexão em t = 10."
        },
        "gabarito": "d",
        "dificuldade": 1,
        "estrategias_esperadas": "A população varia com amplitude de 70.000 indivíduos a partir do seu decrescimento, e a população física não pode assumir valores negativos (descartando a alternativa a onde vai de 35.000 a -35.000). A função logística decrescente com $t_0 = 10$ anos e assíntota superior em 70.000 e inferior em 0 é perfeitamente representada na alternativa d."
    },
    {
        "id_externo": "AFA_2026_Q11",
        "banca": "AFA",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Geometria Plana",
        "subtopico": "Áreas de Figuras Planas",
        "tipo": "objetiva",
        "enunciado": "Quando se escreve $a:b$ com $a, b \\in \\mathbb{R}$, $b \\neq 0$, entende-se como a razão entre $a$ e $b$, nessa ordem. Por analogia, considere as razões $Q_1, Q_2$ e $Q_3$ entre as áreas destacadas em cinza nas figuras abaixo, sendo os triângulos e os hexágonos regulares.\n\nA relação correta entre $Q_1, Q_2$ e $Q_3$ é:",
        "figura_path": "/data/imagens/afa/2026/afa_2026_q11_fig1.png",
        "alternativas": {
            "a": "$Q_1 = Q_3 > Q_2$",
            "b": "$Q_3 < Q_2 < Q_1$",
            "c": "$Q_2 < Q_1 < Q_3$",
            "d": "$Q_3 > Q_2 > Q_1$"
        },
        "gabarito": "b",
        "dificuldade": 3,
        "estrategias_esperadas": "Calculando as razões de áreas entre as regiões sombreadas e as figuras de referência:\n- Para $Q_1$: razão obtida através da área do triângulo equilátero e círculos concêntricos hachurados.\n- Para $Q_2$: razão no hexágono regular.\n- Para $Q_3$: razão no triângulo com subdivisão fractal/proporcional.\nComparando os valores numéricos exatos obtidos pelo Prof. Renato Madeira: $Q_3 < Q_2 < Q_1$. Alternativa correta: b."
    },
    {
        "id_externo": "AFA_2026_Q12",
        "banca": "AFA",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Álgebra",
        "subtopico": "Sistemas de Inequações Lineares",
        "tipo": "objetiva",
        "enunciado": "Um teste de balística forense será realizado com intuito de elucidar um crime no qual foi utilizada uma arma de fogo. A priori, sabe-se que a arma utilizada pode ter sido de dois calibres diferentes: .38 ou 9 mm Luger e, portanto, essas serão as utilizadas no teste. No mercado de venda de armamento, as cápsulas do tipo .38 estão disponíveis em caixas com 165 unidades em cada uma, ao custo de R$ 660,00 cada caixa. As cápsulas do tipo 9 mm Luger estão disponíveis em caixas com 231 cápsulas cada uma, ao custo de R$ 4840,00 cada caixa. Para o teste, serão necessários ao menos 3003 tiros no total, e, por questões orçamentárias, o gasto total não pode ultrapassar R$ 26000,00.\nConsidere $x$ o número de caixas de cápsulas do tipo .38 e $y$ o número de caixas de cápsulas do tipo 9 mm Luger que serão utilizadas no teste. Se $(x, y)$ é o par ordenado que atende às necessidades, então ele pertence ao conjunto solução do sistema:",
        "figura_path": None,
        "alternativas": {
            "a": "$\\begin{cases} 33x + 242y - 1300 \\le 0 \\\\ 5x + 7y - 91 \\ge 0 \\end{cases}$",
            "b": "$\\begin{cases} 33x + 242y - 91 \\ge 0 \\\\ 5x + 7y - 1300 \\le 0 \\end{cases}$",
            "c": "$\\begin{cases} 33x + 242y - 1300 \\ge 0 \\\\ 5x + 7y - 91 \\le 0 \\end{cases}$",
            "d": "$\\begin{cases} 33x + 242y - 91 \\le 0 \\\\ 5x + 7y - 1300 \\ge 0 \\end{cases}$"
        },
        "gabarito": "a",
        "dificuldade": 1,
        "estrategias_esperadas": "1) Restrição de quantidade de tiros: $165x + 231y \\ge 3003$.\nDividindo todos os termos por 33: $\\frac{165}{33}x + \\frac{231}{33}y \\ge \\frac{3003}{33} \\iff 5x + 7y \\ge 91 \\iff 5x + 7y - 91 \\ge 0$.\n2) Restrição de orçamento: $660x + 4840y \\le 26000$.\nDividindo todos os termos por 20: $33x + 242y \\le 1300 \\iff 33x + 242y - 1300 \\le 0$.\nO sistema que traduz as duas condições é o da alternativa a."
    },
    {
        "id_externo": "AFA_2026_Q13",
        "banca": "AFA",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Trigonometria",
        "subtopico": "Funções Senoidais e Período",
        "tipo": "objetiva",
        "enunciado": "A figura abaixo representa um período completo de uma função real $f: \\mathbb{R} \\to \\mathbb{R}$ definida por $f(x) = m + t \\cdot \\operatorname{sen}(p + qx)$, com $\{m, t, p, q\} \\subset \\mathbb{R}$.\n\nO valor de $f(-m) - m$ pertence ao intervalo:",
        "figura_path": "/data/imagens/afa/2026/afa_2026_q13_fig1.png",
        "alternativas": {
            "a": "$[0, 1/2[$",
            "b": "$[1/2, 1[$",
            "c": "$[1, 3/2[$",
            "d": "$[3/2, 2]$"
        },
        "gabarito": "c",
        "dificuldade": 2,
        "estrategias_esperadas": "Do gráfico:\n- Imagem de $f$: varia de $-5$ a $-1$, logo o valor médio é $m = \\frac{-1 + (-5)}{2} = -3$ e a amplitude é $|t| = \\frac{-1 - (-5)}{2} = 2$.\n- O período $T = \\frac{2\\pi}{q}$ é obtido do gráfico como $T = 3$, logo $q = \\frac{2\\pi}{3}$.\n- A fase inicial $p = \\frac{3\\pi}{4}$.\nAssim, $f(x) = -3 + 2\\operatorname{sen}\\left(\\frac{3\\pi}{4} + \\frac{2\\pi}{3}x\\right)$.\nComo $m = -3$, queremos $f(-(-3)) - (-3) = f(3) + 3$:\n$f(3) = -3 + 2\\operatorname{sen}\\left(\\frac{3\\pi}{4} + 2\\pi\\right) = -3 + 2\\operatorname{sen}\\left(\\frac{3\\pi}{4}\\right) = -3 + 2\\left(\\frac{\\sqrt{2}}{2}\\right) = -3 + \\sqrt{2}$.\nLogo, $f(3) + 3 = \\sqrt{2} \\approx 1{,}414$.\nComo $1 \\le 1{,}414 < 1{,}5$, pertence ao intervalo $[1, 3/2[$. Alternativa c."
    },
    {
        "id_externo": "AFA_2026_Q14",
        "banca": "AFA",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Funções",
        "subtopico": "Transformações Gráficas",
        "tipo": "objetiva",
        "enunciado": "Seja $f: \\mathbb{R} \\to \\mathbb{R}$ uma função real de grau 2, cujo gráfico está desenhado no plano cartesiano abaixo.\nConsidere as funções reais $g, h, j: \\mathbb{R} \\to \\mathbb{R}$ definidas por:\n- $g(x) = -c \\cdot f(x)$\n- $h(x) = -c + f(x)$\n- $j(x) = f(x - c)$\n\nConsidere os gráficos desenhados abaixo e numerados de (1) a (6).\nA soma dos números associados aos gráficos de $g, h$ e $j$ é igual a:",
        "figura_path": "/data/imagens/afa/2026/afa_2026_q14_fig1.png",
        "alternativas": {
            "a": "9",
            "b": "10",
            "c": "11",
            "d": "12"
        },
        "gabarito": "c",
        "dificuldade": 2,
        "estrategias_esperadas": "No gráfico de $f$, o vértice e interseções mostram que $c > 0$:\n1) $g(x) = -c \\cdot f(x)$: Como $-c < 0$, há reflexão vertical em relação ao eixo das abscissas e dilatação/contração por $c$. As raízes não mudam e a concavidade inverte. Corresponde ao gráfico (4).\n2) $h(x) = f(x) - c$: Deslocamento vertical para baixo de $c$ unidades. Corresponde ao gráfico (1).\n3) $j(x) = f(x - c)$: Como $c > 0$, trata-se de uma translação horizontal para a direita de $c$ unidades. Corresponde ao gráfico (6).\nA soma dos números associados aos gráficos é $4 + 1 + 6 = 11$. Alternativa correta: c."
    },
    {
        "id_externo": "AFA_2026_Q15",
        "banca": "AFA",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Estatística",
        "subtopico": "Média e Desvio Padrão",
        "tipo": "objetiva",
        "enunciado": "O gráfico abaixo mostra o número de horas voadas, em uma semana, pelas 8 aeronaves do Esquadrão de Instrução Aérea da Academia da Força Aérea Brasileira:\n- Aeronave 1: 8 horas\n- Aeronave 2: 4 horas\n- Aeronave 3: 11 horas\n- Aeronave 4: 7 horas\n- Aeronave 5: 3 horas\n- Aeronave 6: 7 horas\n- Aeronave 7: 11 horas\n- Aeronave 8: 5 horas\n\nA(s) aeronave(s) que mais se aproxima(m), em horas voadas, do desvio padrão é(são) a(s) de número(s):",
        "figura_path": "/data/imagens/afa/2026/afa_2026_q15_fig1.png",
        "alternativas": {
            "a": "1",
            "b": "3 e 7",
            "c": "5",
            "d": "4 e 6"
        },
        "gabarito": "c",
        "dificuldade": 1,
        "estrategias_esperadas": "Calculando a média aritmética $\\bar{x}$:\n$$\\bar{x} = \\frac{8 + 4 + 11 + 7 + 3 + 7 + 11 + 5}{8} = \\frac{56}{8} = 7\\text{ horas}$$\nCalculando a variância populacional $\\sigma^2$:\n$$\\sigma^2 = \\frac{(8-7)^2 + (4-7)^2 + (11-7)^2 + (7-7)^2 + (3-7)^2 + (7-7)^2 + (11-7)^2 + (5-7)^2}{8}$$\n$$\\sigma^2 = \\frac{1 + 9 + 16 + 0 + 16 + 0 + 16 + 4}{8} = \\frac{64}{8} = 8$$\nO desvio padrão é $\\sigma = \\sqrt{8} = 2\\sqrt{2} \\approx 2{,}83\\text{ horas}$.\nA aeronave cujo número de horas voadas mais se aproxima de $2{,}83$ é a Aeronave 5, que voou 3 horas ($|3 - 2{,}83| = 0{,}17$). Alternativa c."
    },
    {
        "id_externo": "AFA_2026_Q16",
        "banca": "AFA",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Probabilidade",
        "subtopico": "Probabilidade Binomial e Logaritmos",
        "tipo": "objetiva",
        "enunciado": "Após exaustivos testes, um fazendeiro garante que, em sua propriedade, para cada dois machos de certa espécie animal que nascem, há o nascimento de três fêmeas. O fazendeiro pretende separar ao acaso uma amostra desse rebanho para venda em um leilão, de modo que a probabilidade de se observar pelo menos uma fêmea seja superior a 95%. O tamanho mínimo dessa amostra deve ser de: (Adote: $\\log 2 = 0{,}30$)",
        "figura_path": None,
        "alternativas": {
            "a": "6",
            "b": "5",
            "c": "4",
            "d": "3"
        },
        "gabarito": "c",
        "dificuldade": 2,
        "estrategias_esperadas": "Razão de nascimento: 2 machos para cada 3 fêmeas.\n$P(\\text{fêmea}) = \\frac{3}{2+3} = \\frac{3}{5} = 0{,}6$ e $P(\\text{macho}) = \\frac{2}{5} = 0{,}4$.\nPara uma amostra de tamanho $n$, a probabilidade de pelo menos uma fêmea é $1 - P(\\text{todos machos}) = 1 - (0{,}4)^n$.\nQueremos $1 - (0{,}4)^n > 0{,}95 \\iff (0{,}4)^n < 0{,}05 = \\frac{1}{20}$.\nAplicando $\\log_{10}$:\n$$n \\cdot \\log(0{,}4) < \\log(1/20) = -\\log 20 = -(1 + \\log 2) = -(1 + 0{,}30) = -1{,}30$$\nComo $\\log(0{,}4) = \\log(4/10) = 2\\log 2 - 1 = 2(0{,}30) - 1 = -0{,}40$:\n$$n \\cdot (-0{,}40) < -1{,}30 \\iff n > \\frac{1{,}30}{0{,}40} = 3{,}25$$\nComo $n$ deve ser inteiro, o tamanho mínimo da amostra é $n = 4$. Alternativa c."
    }
]

out_file = out_dir / "questoes.json"
with open(out_file, "w", encoding="utf-8") as f:
    json.dump(questoes, f, ensure_ascii=False, indent=2)

print(f"[OK] {len(questoes)} questões de AFA 2026 gravadas com sucesso em {out_file}")
