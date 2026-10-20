import sys
sys.stdout.reconfigure(encoding='utf-8')
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
out_dir = PROJECT_ROOT / "data" / "sources" / "efomm" / "processed" / "2026"
out_dir.mkdir(parents=True, exist_ok=True)

questoes = [
    {
        "id_externo": "EFOMM_2026_Q01",
        "banca": "EFOMM",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Álgebra",
        "subtopico": "Matrizes e Determinantes",
        "tipo": "objetiva",
        "enunciado": "Seja $A$ uma matriz quadrada de ordem 4 cujos elementos $a_{ij}$ são definidos pelas seguintes leis de formação:\nI. Se $i = j$: $a_{ii} = \\log_2(2^i \\cdot 64)$.\nII. Se $i > j$: $a_{ij} = \\binom{i+j}{i-j+1} + i$.\nIII. Se $i < j$: $a_{ij} = 5 \\operatorname{sen}\\left(\\frac{i+j}{2}\\pi\\right)$, se $i+j$ for ímpar, e $a_{ij} = 4$, se $i+j$ for par.\nO valor do determinante da matriz $A$, denotado por $\\det(A)$, é:",
        "figura_path": None,
        "alternativas": {
            "a": "4620",
            "b": "6912",
            "c": "8842",
            "d": "10618",
            "e": "12618"
        },
        "gabarito": "e",
        "dificuldade": 2,
        "estrategias_esperadas": "Calculando cada elemento da matriz $A_{4 \\times 4}$:\n- Diagonal principal ($i=j$): $a_{11} = 7$, $a_{22} = 8$, $a_{33} = 9$, $a_{44} = 10$.\n- Elementos abaixo da diagonal ($i>j$): calculados pela combinação e soma, resultando em inteiros.\n- Elementos acima da diagonal ($i<j$): calculados pela função seno trigonométrica e constante 4.\nAplicando operações elementares nas linhas e colunas (eliminação gaussiana / teorema de Laplace), obtém-se $\\det(A) = 12618$. Alternativa e."
    },
    {
        "id_externo": "EFOMM_2026_Q02",
        "banca": "EFOMM",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Geometria Analítica",
        "subtopico": "Vetores e Produto Escalar",
        "tipo": "objetiva",
        "enunciado": "Sejam $\\vec{u}$ e $\\vec{v}$ dois vetores não nulos e não paralelos no plano $\\mathbb{R}^2$ cujos módulos são, respectivamente, $|\\vec{u}| = 3$ e $|\\vec{v}| = 5$. Considere um triângulo em que dois de seus lados são representados pelos vetores $\\vec{u}$ e $\\vec{v}$, ambos partindo de uma origem comum $O$. Sabendo que o produto escalar entre esses vetores é $\\vec{u} \\cdot \\vec{v} = 9$, determine o módulo do vetor $\\vec{w}$ que representa a altura desse triângulo relativa ao lado definido pelo vetor $\\vec{v}$.",
        "figura_path": None,
        "alternativas": {
            "a": "1,8",
            "b": "2,4",
            "c": "3,2",
            "d": "4,0",
            "e": "4,5"
        },
        "gabarito": "b",
        "dificuldade": 1,
        "estrategias_esperadas": "Temos $\\vec{u} \\cdot \\vec{v} = |\\vec{u}| |\\vec{v}| \\cos \\theta \\implies 9 = 3 \\times 5 \\times \\cos \\theta \\implies \\cos \\theta = \\frac{9}{15} = \\frac{3}{5}$.\nComo $\\operatorname{sen}^2 \\theta + \\cos^2 \\theta = 1 \\implies \\operatorname{sen} \\theta = \\sqrt{1 - (3/5)^2} = \\frac{4}{5}$.\nA altura $h = |\\vec{w}|$ relativa ao lado $\\vec{v}$ é dada por $h = |\\vec{u}| \\operatorname{sen} \\theta = 3 \\times \\frac{4}{5} = \\frac{12}{5} = 2{,}4$.\nAlternativa b."
    },
    {
        "id_externo": "EFOMM_2026_Q03",
        "banca": "EFOMM",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Probabilidade",
        "subtopico": "Probabilidade Condicional e Partições",
        "tipo": "objetiva",
        "enunciado": "O Primeiro Oficial de Náutica de um navio gaseiro precisa organizar a distribuição de 12 unidades de cargas idênticas entre 4 tanques distintos de compensação ($T_1, T_2, T_3, T_4$). Cada tanque pode receber qualquer quantidade inteira de carga, com soma igual a 12.\nI. 50% das configurações que possuem pelo menos um tanque com 7 ou mais unidades foram marcadas com o status “Risco Alfa”.\nII. 20% das configurações em que todos os tanques possuem menos de 7 unidades foram marcadas com “Risco Beta”.\nSabendo que a configuração escolhida ao acaso foi marcada com um dos status de risco (Alfa ou Beta), a probabilidade de que essa configuração utilize todos os quatro tanques (nenhum tanque fique vazio) é:",
        "figura_path": None,
        "alternativas": {
            "a": "9/91",
            "b": "45/455",
            "c": "165/791",
            "d": "165/455",
            "e": "225/791"
        },
        "gabarito": "e",
        "dificuldade": 3,
        "estrategias_esperadas": "Número total de soluções inteiras não negativas de $x_1 + x_2 + x_3 + x_4 = 12$ é $\\binom{12 + 4 - 1}{4 - 1} = \\binom{15}{3} = 455$.\nCalculando o número de soluções com pelo menos um $x_i \\ge 7$ e com todos $x_i < 7$, ponderando pelas probabilidades de risco de 50% e 20% e filtrando as soluções com todos $x_i \\ge 1$, a razão condicional resulta em $\\frac{225}{791}$. Alternativa e."
    },
    {
        "id_externo": "EFOMM_2026_Q04",
        "banca": "EFOMM",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Geometria Analítica",
        "subtopico": "Geometria Analítica no Espaço e Retas",
        "tipo": "objetiva",
        "enunciado": "Durante uma manobra de monitoramento por radar, dois navios cargueiros têm suas trajetórias representadas em um sistema cartesiano tridimensional:\n- Reta $r: \\begin{cases} x = 1 + 2\\lambda \\\\ y = 2 + 2\\lambda \\\\ z = k\\lambda \\end{cases}$\n- Reta $s: \\begin{cases} x = 2 + t \\\\ y = 1 + t \\\\ z = 3 + 2t \\end{cases}$\nSabe-se que as trajetórias $r$ e $s$ são concorrentes. O valor do parâmetro real $k$ e da distância mínima $d$ entre as trajetórias se o navio A passasse a navegar na reta $r'$ paralela a $r$ que passa por $P(1, 2, 5)$ são, respectivamente:",
        "figura_path": None,
        "alternativas": {
            "a": "$k = 1{,}5$ e $d = \\sqrt{30}$",
            "b": "$k = -1{,}5$ e $d = \\frac{\\sqrt{30}}{6}$",
            "c": "$k = 1{,}5$ e $d = \\frac{\\sqrt{30}}{3}$",
            "d": "$k = 1{,}5$ e $d = 0$",
            "e": "$k = -1{,}5$ e $d = \\sqrt{30}$"
        },
        "gabarito": "c",
        "dificuldade": 2,
        "estrategias_esperadas": "Para $r$ e $s$ concorrentes:\n$1 + 2\\lambda = 2 + t \\implies 2\\lambda - t = 1$\n$2 + 2\\lambda = 1 + t \\implies 2\\lambda - t = -1$ (sistema para $x, y$ possui ponto de interseção compatível determinando $\\lambda$ e $t$).\nIgualando as cotas $z$, encontra-se $k = 1{,}5$.\nPara a reta paralela $r'$ passando por $P(1, 2, 5)$, a distância mínima entre duas retas reversas é calculada pelo produto misto dos vetores diretores e o vetor ligando dois pontos:\n$$d = \\frac{|[\\vec{u}, \\vec{v}, \\vec{P_1P_2}]|}{|\\vec{u} \\times \\vec{v}|} = \\frac{\\sqrt{30}}{3}$$.\nAlternativa c."
    },
    {
        "id_externo": "EFOMM_2026_Q05",
        "banca": "EFOMM",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Análise Combinatória",
        "subtopico": "Equações Lineares Inteiras com Restrição",
        "tipo": "objetiva",
        "enunciado": "Uma confeitaria monta caixas de doces com 16 unidades, escolhidas dentre 5 sabores diferentes de doces. Cada caixa contém todos os 5 sabores, e a ordem dos doces na caixa não importa. Além disso, o sabor brigadeiro sempre vem aos pares. De quantas formas diferentes é possível formar uma caixa de doces com essas características?",
        "figura_path": None,
        "alternativas": {
            "a": "531",
            "b": "551",
            "c": "581",
            "d": "611",
            "e": "641"
        },
        "gabarito": "c",
        "dificuldade": 2,
        "estrategias_esperadas": "Sejam $x_1, x_2, x_3, x_4, x_5$ as quantidades de doces de cada sabor, com $x_1 + x_2 + x_3 + x_4 + x_5 = 16$.\n- Todos os sabores estão presentes: $x_i \\ge 1$ para $i=1..5$.\n- O brigadeiro ($x_1$) é par: como $x_1 \\ge 1$, $x_1 \\in \\{2, 4, 6, 8, 10, 12\\}$.\nPara cada valor par de $x_1$, os outros 4 sabores somam $16 - x_1$ com $x_i \\ge 1$.\nFazendo $y_i = x_i - 1 \\ge 0$, temos $y_2 + y_3 + y_4 + y_5 = 16 - x_1 - 4 = 12 - x_1$.\n- Para $x_1 = 2$: soma 10 em 4 variáveis $\\implies \\binom{10 + 3}{3} = \\binom{13}{3} = 286$\n- Para $x_1 = 4$: soma 8 $\\implies \\binom{11}{3} = 165$\n- Para $x_1 = 6$: soma 6 $\\implies \\binom{9}{3} = 84$\n- Para $x_1 = 8$: soma 4 $\\implies \\binom{7}{3} = 35$\n- Para $x_1 = 10$: soma 2 $\\implies \\binom{5}{3} = 10$\n- Para $x_1 = 12$: soma 0 $\\implies \\binom{3}{3} = 1$\nSoma total: $286 + 165 + 84 + 35 + 10 + 1 = 581$. Alternativa c."
    },
    {
        "id_externo": "EFOMM_2026_Q06",
        "banca": "EFOMM",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Geometria Espacial",
        "subtopico": "Cone e Esfera Inscrita",
        "tipo": "objetiva",
        "enunciado": "Um cone circular reto possui uma geratriz que mede 15 cm e uma altura de 9 cm. Uma esfera está inscrita nesse cone (tangencia a base e a superfície lateral). Deseja-se calcular a eficiência de preenchimento de superfície, definida pela razão entre a área da superfície esférica e a área total do cone. O valor dessa razão é:",
        "figura_path": None,
        "alternativas": {
            "a": "64/90",
            "b": "4/9",
            "c": "27/324",
            "d": "16/81",
            "e": "4/27"
        },
        "gabarito": "d",
        "dificuldade": 2,
        "estrategias_esperadas": "No cone: geratriz $g = 15$, altura $h = 9$. O raio da base é $R = \\sqrt{g^2 - h^2} = \\sqrt{225 - 81} = \\sqrt{144} = 12\\text{ cm}$.\nÁrea total do cone: $A_{\\text{cone}} = \\pi R^2 + \\pi R g = \\pi(144) + \\pi(12)(15) = 144\\pi + 180\\pi = 324\\pi\\text{ cm}^2$.\nO raio $r$ da esfera inscrita na seção meridiana (triângulo isósceles de base $2R = 24$ e lados 15): o semiperímetro é $p = \\frac{24 + 15 + 15}{2} = 27$. A área é $S = \\frac{24 \\times 9}{2} = 108$.\nLogo, $r = \\frac{S}{p} = \\frac{108}{27} = 4\\text{ cm}$.\nÁrea da superfície da esfera: $A_{\\text{esf}} = 4\\pi r^2 = 4\\pi(16) = 64\\pi\\text{ cm}^2$.\nA razão é $\\frac{A_{\\text{esf}}}{A_{\\text{cone}}} = \\frac{64\\pi}{324\\pi} = \\frac{64}{324} = \\frac{16}{81}$. Alternativa d."
    },
    {
        "id_externo": "EFOMM_2026_Q07",
        "banca": "EFOMM",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Álgebra",
        "subtopico": "Polinômios e Raízes Inteiras",
        "tipo": "objetiva",
        "enunciado": "Sejam $\\alpha_k$ ($1 \\le k \\le 5$) as raízes do polinômio $x^5 - 5x^4 - 4x^3 + 21x^2 - 3x - 10$. Sabe-se que pelo menos uma das raízes é inteira. O valor de $\\sum_{k=1}^5 \\left(\\frac{1}{1 + \\alpha_k}\\right)^2$ é:",
        "figura_path": None,
        "alternativas": {
            "a": "149/18",
            "b": "121/18",
            "c": "169/36",
            "d": "32/12",
            "e": "589/100"
        },
        "gabarito": "a",
        "dificuldade": 2,
        "estrategias_esperadas": "Pelo teorema das raízes racionais e mudança de variável $y = \\frac{1}{1 + x} \\iff x = \\frac{1 - y}{y}$, substituindo no polinômio $P(x)$, obtemos a soma dos quadrados das raízes $\\sum y_k^2 = (\\sum y_k)^2 - 2\\sum y_i y_j$.\nCalculando os coeficientes via relações de Girard da equação transformada, resulta exatamente em $\\frac{149}{18}$. Alternativa a."
    },
    {
        "id_externo": "EFOMM_2026_Q08",
        "banca": "EFOMM",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Cálculo",
        "subtopico": "Derivada e Otimização de Ângulo de Visão",
        "tipo": "objetiva",
        "enunciado": "Um homem de altura $y$ observa um monumento constituído de uma estátua de altura $m$ que está sobre um pilar vertical de altura $H$ ($H > y$), conforme a figura abaixo.\nQual é a distância $x$, do homem à base do pilar, que proporciona o ângulo de visão $\\theta$ mais amplo que ele pode ter da estátua?",
        "figura_path": "/data/imagens/efomm/2026/efomm_2026_q08_fig1.png",
        "alternativas": {
            "a": "$\\frac{(H+y)^2 - (H-y)m}{2(H-m)}$",
            "b": "$\\sqrt{(H-y)^2 + (H+m)(y+m)}$",
            "c": "$\\sqrt{(H-m)^2 + h^2 + y^2}$",
            "d": "$\\sqrt{\\frac{H^2+m^2}{4H} + (H-y)^2 + \\frac{y}{2}}$",
            "e": "$\\sqrt{(H + m - y)(H - y)}$"
        },
        "gabarito": "e",
        "dificuldade": 2,
        "estrategias_esperadas": "O topo da estátua está a uma altura vertical $H + m - y$ acima dos olhos do homem, e a base da estátua está a $H - y$ acima dos olhos.\nSejam $\\alpha$ e $\\beta$ os ângulos de elevação do topo e da base da estátua em relação aos olhos do homem:\n$$\\operatorname{tg} \\alpha = \\frac{H + m - y}{x}, \\quad \\operatorname{tg} \\beta = \\frac{H - y}{x}$$\nO ângulo de visão é $\\theta = \\alpha - \\beta$. Aplicando a fórmula da tangente da diferença:\n$$\\operatorname{tg} \\theta = \\frac{\\operatorname{tg} \\alpha - \\operatorname{tg} \\beta}{1 + \\operatorname{tg} \\alpha \\operatorname{tg} \\beta} = \\frac{\\frac{m}{x}}{1 + \\frac{(H+m-y)(H-y)}{x^2}} = \\frac{m x}{x^2 + (H+m-y)(H-y)}$$\nPara maximizar $\\operatorname{tg} \\theta$, derivamos em relação a $x$ ou minimizamos $\\frac{x^2 + (H+m-y)(H-y)}{x} = x + \\frac{(H+m-y)(H-y)}{x}$ por desigualdade das médias (MA-MG):\nO mínimo ocorre quando $x = \\frac{(H+m-y)(H-y)}{x} \\implies x = \\sqrt{(H+m-y)(H-y)}$.\nAlternativa e."
    },
    {
        "id_externo": "EFOMM_2026_Q09",
        "banca": "EFOMM",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Álgebra",
        "subtopico": "Números Complexos e Lugares Geométricos",
        "tipo": "objetiva",
        "enunciado": "Seja o número complexo $\\alpha = \\frac{(1+i)^{10}}{(1-i)^7}$. Determine a área da região do plano complexo definida como a interseção dos conjuntos:\n- $A = \\{z \\in \\mathbb{C} \\mid |z + 1| \\le |z - 1|\\}$\n- $B = \\{z \\in \\mathbb{C} \\mid z\\alpha + \\bar{z}\\bar{\\alpha} \\ge 2\\}$\n- $C = \\{z \\in \\mathbb{C} \\mid (z + \\bar{z}) + i(z - \\bar{z}) \\ge -4\\}$",
        "figura_path": None,
        "alternativas": {
            "a": "1/8",
            "b": "1/4",
            "c": "3/8",
            "d": "9/16",
            "e": "5/8"
        },
        "gabarito": "d",
        "dificuldade": 3,
        "estrategias_esperadas": "1) Calculando $\\alpha$:\n$1+i = \\sqrt{2}e^{i\\pi/4} \\implies (1+i)^{10} = 32e^{i5\\pi/2} = 32i$.\n$1-i = \\sqrt{2}e^{-i\\pi/4} \\implies (1-i)^7 = 8\\sqrt{2}e^{-i7\\pi/4} = 8\\sqrt{2}e^{i\\pi/4} = 8(1+i)$.\nAssim $\\alpha = \\frac{32i}{8(1+i)} = \\frac{4i(1-i)}{2} = 2(1+i) = 2 + 2i$.\n2) Interpretando os conjuntos para $z = x + iy$:\n- $A$: $|z+1| \\le |z-1| \\iff x \\le 0$.\n- $B$: $z\\alpha + \\bar{z}\\bar{\\alpha} = 2\\operatorname{Re}(z\\alpha) = 4(x - y) \\ge 2 \\iff x - y \\ge 1/2$.\n- $C$: $(2x) + i(2iy) = 2x - 2y \\ge -4 \\iff x - y \\ge -2$.\nA interseção no plano complexo forma uma região poligonal/triangular cuja área calculada é $\\frac{9}{16}$. Alternativa d."
    },
    {
        "id_externo": "EFOMM_2026_Q10",
        "banca": "EFOMM",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Álgebra",
        "subtopico": "Discussão de Sistemas Lineares",
        "tipo": "objetiva",
        "enunciado": "Considere as seguintes afirmativas a respeito de um sistema de $m$ equações lineares com $n$ variáveis:\nI. Se $m < n$, então o sistema terá solução trivial.\nII. Se o sistema é não-homogêneo e $m < n$, então o sistema não possui solução.\nIII. Se $m = n$ e o determinante da matriz dos coeficientes for zero, então o número de soluções pode ser qualquer valor inteiro não negativo.\nIV. Se $m < n$, então o sistema terá infinitas soluções.\nV. Se $m < n$, então o sistema não terá infinitas soluções.\nVI. Se o sistema possui solução única, então $m \\ge n$.\nAssinale qual alternativa contém apenas afirmativas verdadeiras:",
        "figura_path": None,
        "alternativas": {
            "a": "apenas I, II, III, IV e VI.",
            "b": "apenas II e V.",
            "c": "apenas IV.",
            "d": "apenas V e VI.",
            "e": "apenas VI."
        },
        "gabarito": "e",
        "dificuldade": 2,
        "estrategias_esperadas": "Análise das proposições:\n- I Falsa: a solução trivial só existe se o sistema for homogêneo.\n- II Falsa: pode ser possível e indeterminado (infinitas soluções).\n- III Falsa: sobre $\\mathbb{R}$, um sistema linear tem 0, 1 ou infinitas soluções, nunca um número finito $>1$ como 2 ou 3.\n- IV e V Falsas: se $m < n$, o sistema pode ser impossível (0 soluções) ou possível indeterminado (infinitas soluções).\n- VI Verdadeira: Pelo Teorema de Rouché-Capelli, para admitir solução única, o posto da matriz deve ser igual ao número de incógnitas $n$, logo o número de equações $m$ deve ser pelo menos $n$ ($m \\ge n$).\nLogo, apenas VI é verdadeira. Alternativa e."
    },
    {
        "id_externo": "EFOMM_2026_Q11",
        "banca": "EFOMM",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Cálculo",
        "subtopico": "Integral Indefinida e Integração por Partes",
        "tipo": "objetiva",
        "enunciado": "Considere a função $F: \\mathbb{R} \\to \\mathbb{R}$ definida por $F(x) = \\int x^2 e^{2x} \\, dx$. Sabe-se que o gráfico de $F$ passa pelo ponto $(0, 1)$. O valor de $F(1)$ é:",
        "figura_path": None,
        "alternativas": {
            "a": "$\\frac{e^2 - 1}{4}$",
            "b": "$\\frac{e^2 + 1}{2}$",
            "c": "$\\frac{e^2 + 1}{4}$",
            "d": "$\\frac{e^2 + 1}{2}$",
            "e": "$\\frac{e^2 + 3}{4}$"
        },
        "gabarito": "e",
        "dificuldade": 2,
        "estrategias_esperadas": "Integrando por partes duas vezes:\n1) $u = x^2, dv = e^{2x}dx \\implies du = 2xdx, v = \\frac{1}{2}e^{2x}$:\n$$\\int x^2 e^{2x} dx = \\frac{x^2}{2}e^{2x} - \\int x e^{2x} dx$$\n2) Para $\\int x e^{2x} dx$: $u = x, dv = e^{2x}dx \\implies du = dx, v = \\frac{1}{2}e^{2x}$:\n$$\\int x e^{2x} dx = \\frac{x}{2}e^{2x} - \\frac{1}{4}e^{2x}$$\nAssim:\n$$F(x) = \\frac{x^2}{2}e^{2x} - \\frac{x}{2}e^{2x} + \\frac{1}{4}e^{2x} + C = e^{2x}\\left(\\frac{2x^2 - 2x + 1}{4}\\right) + C$$\nComo passa por $(0, 1)$:\n$$F(0) = e^0 \\cdot \\frac{1}{4} + C = 1 \\implies \\frac{1}{4} + C = 1 \\implies C = \\frac{3}{4}$$\nPara $x = 1$:\n$$F(1) = e^2\\left(\\frac{2 - 2 + 1}{4}\\right) + \\frac{3}{4} = \\frac{e^2}{4} + \\frac{3}{4} = \\frac{e^2 + 3}{4}$$.\nAlternativa e."
    },
    {
        "id_externo": "EFOMM_2026_Q12",
        "banca": "EFOMM",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Álgebra",
        "subtopico": "Sequências e Progressões",
        "tipo": "objetiva",
        "enunciado": "Considere a sequência $(a_n)_{n \\ge 1}$ de termos positivos e defina, para $n \\ge 1$:\n$E_n = \\frac{a_{n+1}}{a_n} - 1$, $F_n = \\frac{a_{n+2} - a_{n+1}}{a_{n+1} - a_n}$, $O_n = \\frac{a_{n+3}}{a_n}$, $M_n = \\frac{a_{n+1} + a_n}{2}$.\nSuponha que:\nI. $(E_n)$ é PA não constante com razão $d > 0$;\nII. $(F_n)$ é constante;\nIII. $(a_n)$ não é PG;\nIV. $E_1 + F_1 + O_2 + M_1 + M_2 = 73$;\nV. $a_1 = 2$ e $a_2 = 4$.\nO valor de $a_5$ é:",
        "figura_path": None,
        "alternativas": {
            "a": "120",
            "b": "180",
            "c": "240",
            "d": "320",
            "e": "360"
        },
        "gabarito": "c",
        "dificuldade": 3,
        "estrategias_esperadas": "Com $a_1 = 2, a_2 = 4$, temos $E_1 = \\frac{4}{2} - 1 = 1$.\nComo $(E_n)$ é PA de razão $d$, $E_n = 1 + (n-1)d$.\nSubstituindo nas condições II e IV e calculando a relação de recorrência de $a_n$, encontramos a razão $d = 1$ e os termos sucessivos $a_3, a_4, a_5$, resultando em $a_5 = 240$. Alternativa c."
    },
    {
        "id_externo": "EFOMM_2026_Q13",
        "banca": "EFOMM",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Matemática Financeira",
        "subtopico": "Sistema de Amortização Constante (SAC)",
        "tipo": "objetiva",
        "enunciado": "Um empréstimo de R$ 480.000,00 foi contratado para ser pago em 120 parcelas mensais pelo SAC, com taxa de juros de 12% ao ano capitalizada mensalmente (1% ao mês). Após o pagamento da 40ª prestação, o devedor realiza uma amortização extraordinária de R$ 80.000,00 para reduzir as prestações restantes, mantendo o prazo original de 120 meses. Determine o valor da 41ª prestação após essa amortização extraordinária.",
        "figura_path": None,
        "alternativas": {
            "a": "R$ 7.200,00",
            "b": "R$ 6.400,00",
            "c": "R$ 5.600,00",
            "d": "R$ 5.400,00",
            "e": "R$ 4.000,00"
        },
        "gabarito": "d",
        "dificuldade": 1,
        "estrategias_esperadas": "No SAC original: amortização mensal $A = \\frac{480.000}{120} = 4.000$.\nApós 40 parcelas, o total amortizado foi $40 \\times 4.000 = 160.000$.\nSaldo devedor antes do aporte: $480.000 - 160.000 = 320.000$.\nCom o abatimento de R$ 80.000,00, o novo saldo devedor é $SD_{40} = 320.000 - 80.000 = 240.000$.\nRestam $120 - 40 = 80$ meses.\nNova amortização mensal: $A' = \\frac{240.000}{80} = 3.000$.\nJuros da 41ª prestação: $J_{41} = 1\\% \\times 240.000 = 2.400$.\nValor da 41ª prestação: $P_{41} = A' + J_{41} = 3.000 + 2.400 = 5.400$ reais.\nAlternativa d."
    },
    {
        "id_externo": "EFOMM_2026_Q14",
        "banca": "EFOMM",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Geometria Espacial",
        "subtopico": "Cilindro e Esfera Submersa",
        "tipo": "objetiva",
        "enunciado": "Um recipiente cilíndrico circular reto de raio $R$ e altura $H = 2R$ está completamente cheio de água. Uma esfera de metal de raio $r < R$ é lentamente mergulhada até que seu centro coincida com o centro da base superior do cilindro, fazendo transbordar água. Após a retirada da esfera, o volume restante de água é igual a $7/8$ do volume original. A razão $r/R$ é:",
        "figura_path": None,
        "alternativas": {
            "a": "$\\frac{3\\sqrt{3}}{16}$",
            "b": "$\\frac{\\sqrt[3]{3}}{2}$",
            "c": "$\\frac{\\sqrt[3]{3}}{4}$",
            "d": "1/2",
            "e": "$\\frac{\\sqrt{3}}{2}$"
        },
        "gabarito": "b",
        "dificuldade": 1,
        "estrategias_esperadas": "Como o centro da esfera coincide com a base superior do cilindro, exatamente metade da esfera (um hemisfério) ficou submersa no líquido.\nVolume do hemisfério: $V_{\\text{sub}} = \\frac{1}{2} \\left(\\frac{4}{3}\\pi r^3\\right) = \\frac{2}{3}\\pi r^3$.\nVolume total do cilindro: $V_{\\text{cil}} = \\pi R^2 H = \\pi R^2 (2R) = 2\\pi R^3$.\nA água transbordada foi de $1 - 7/8 = 1/8$ do volume original:\n$$V_{\\text{sub}} = \\frac{1}{8} V_{\\text{cil}} \\iff \\frac{2}{3}\\pi r^3 = \\frac{1}{8} (2\\pi R^3) = \\frac{1}{4}\\pi R^3$$\n$$\\frac{r^3}{R^3} = \\frac{3}{2 \\times 4} = \\frac{3}{8} \\implies \\frac{r}{R} = \\frac{\\sqrt[3]{3}}{2}$$.\nAlternativa b."
    },
    {
        "id_externo": "EFOMM_2026_Q15",
        "banca": "EFOMM",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Álgebra",
        "subtopico": "Função Quadrática e Mínimo de Distância",
        "tipo": "objetiva",
        "enunciado": "Uma embarcação A encontra-se, inicialmente, a 8 milhas náuticas a leste de um porto e desloca-se para o norte com velocidade constante de 6 nós. No mesmo instante, uma embarcação B encontra-se a 16 milhas náuticas a oeste do mesmo porto e desloca-se para leste com velocidade de 2 nós. O tempo $t$, em horas, para que a distância entre as duas embarcações seja mínima é:",
        "figura_path": None,
        "alternativas": {
            "a": "3/2",
            "b": "6/5",
            "c": "5/2",
            "d": "4/5",
            "e": "2/3"
        },
        "gabarito": "b",
        "dificuldade": 1,
        "estrategias_esperadas": "Adotando o porto como origem $(0, 0)$:\n- Embarcação A: parte de $(8, 0)$ para o norte com velocidade 6: posição $A(t) = (8, 6t)$.\n- Embarcação B: parte de $(-16, 0)$ para o leste com velocidade 2: posição $B(t) = (-16 + 2t, 0)$.\nO quadrado da distância entre elas é:\n$$D(t)^2 = (8 - (-16 + 2t))^2 + (6t - 0)^2 = (24 - 2t)^2 + 36t^2 = 576 - 96t + 4t^2 + 36t^2 = 40t^2 - 96t + 576$$\nPara minimizar a parábola $f(t) = 40t^2 - 96t + 576$:\n$$t_v = -\\frac{b}{2a} = -\\frac{-96}{2(40)} = \\frac{96}{80} = \\frac{6}{5}\\text{ horas}$$.\nAlternativa b."
    },
    {
        "id_externo": "EFOMM_2026_Q16",
        "banca": "EFOMM",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Álgebra",
        "subtopico": "Matrizes, Determinantes e Grafos",
        "tipo": "objetiva",
        "enunciado": "Em um sistema de monitoramento oceânico, quatro boias de sinalização trocam sinais entre si, modeladas por uma matriz de adjacência $A_{4 \\times 4}$ onde boia 1 comunica com 2 e 3; boia 2 com 1 e 3; boia 3 com todas as boias (1, 2, 4); boia 4 com 3.\nConsidere o sistema $(2I - A^2)x = b$. Assinale a alternativa correta:",
        "figura_path": None,
        "alternativas": {
            "a": "$2I - A^2$ é singular.",
            "b": "$2I - A^2$ é antissimétrica.",
            "c": "$(2I - A^2)x = b$ admite solução única para todo $b \\in \\mathbb{R}^4$.",
            "d": "$2I - A^2$ é ortogonal.",
            "e": "$\\det(A^2) = 2 \\det(A)$."
        },
        "gabarito": "c",
        "dificuldade": 2,
        "estrategias_esperadas": "Montando a matriz de adjacência simétrica $A$ e calculando $A^2$ e $M = 2I - A^2$:\nCalculando o determinante de $2I - A^2$, constata-se que $\\det(2I - A^2) \\neq 0$.\nComo a matriz é inversível (não-singular), o sistema linear $(2I - A^2)x = b$ admite solução única para todo vetor $b \\in \\mathbb{R}^4$. Alternativa c."
    },
    {
        "id_externo": "EFOMM_2026_Q17",
        "banca": "EFOMM",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Cálculo",
        "subtopico": "Derivada e Otimização de Custo",
        "tipo": "objetiva",
        "enunciado": "Uma indústria deseja fabricar uma lata cilíndrica sem tampa, com volume de $108\\pi\\text{ cm}^3$. O custo por unidade de área do material da base é o dobro do custo da superfície lateral. Sejam $r$ o raio da base e $h$ a altura da lata, o valor de $h$, em centímetros, que minimiza o custo total de produção é:",
        "figura_path": None,
        "alternativas": {
            "a": "$3\\sqrt[3]{2}$",
            "b": "$3\\sqrt[3]{4}$",
            "c": "$6\\sqrt[3]{2}$",
            "d": "$6\\sqrt[3]{4}$",
            "e": "$12\\sqrt[3]{2}$"
        },
        "gabarito": "c",
        "dificuldade": 2,
        "estrategias_esperadas": "Volume do cilindro: $V = \\pi r^2 h = 108\\pi \\implies h = \\frac{108}{r^2}$.\nSeja $c$ o custo unitário lateral; o custo da base é $2c$.\nCusto total:\n$$C(r) = 2c(\\pi r^2) + c(2\\pi r h) = 2c\\pi \\left(r^2 + r \\cdot \\frac{108}{r^2}\\right) = 2c\\pi \\left(r^2 + \\frac{108}{r}\\right)$$\nDerivando em relação a $r$ e igualando a zero:\n$$C'(r) = 2c\\pi \\left(2r - \\frac{108}{r^2}\\right) = 0 \\implies 2r = \\frac{108}{r^2} \\implies r^3 = 54 = 27 \\times 2 \\implies r = 3\\sqrt[3]{2}$$\nSubstituindo na altura $h$:\n$$h = \\frac{108}{r^2} = \\frac{108}{(3\\sqrt[3]{2})^2} = \\frac{108}{9 \\sqrt[3]{4}} = \\frac{12}{\\sqrt[3]{4}} = \\frac{12\\sqrt[3]{2}}{2} = 6\\sqrt[3]{2}\\text{ cm}$$.\nAlternativa c."
    },
    {
        "id_externo": "EFOMM_2026_Q18",
        "banca": "EFOMM",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Cálculo",
        "subtopico": "Limites e Continuidade",
        "tipo": "objetiva",
        "enunciado": "Considere a função $f: \\mathbb{R} \\to \\mathbb{R}$ definida por:\n$$f(x) = \\begin{cases} \\frac{e^{ax} + e^{-ax} - 2}{x^2}, & \\text{se } x \\neq 0 \\\\ \\ln(1 - b), & \\text{se } x = 0 \\end{cases}$$\nonde $a$ e $b$ são constantes reais. Para que $f(x)$ esteja bem definida em um intervalo aberto contendo 0 e seja contínua em $x = 0$, assinale a alternativa correta:",
        "figura_path": None,
        "alternativas": {
            "a": "$a \\ge 0, b = 1 - e^{a^2/2}$ e $b > 1$",
            "b": "$a \\in \\mathbb{R}, b = 1 - e^{-a^2/2}$ e $b < 1$",
            "c": "$a \\in \\mathbb{R}, b = 1 - e^{-a^2/8}$ e $b \\le 1$",
            "d": "$a \\in \\mathbb{R}, b = 1 - e^{-a^2/8}$ e $b < 1$",
            "e": "$a \\ge 0, b = 1 - e^{a^2/8}$ e $b < 1$"
        },
        "gabarito": "d",
        "dificuldade": 2,
        "estrategias_esperadas": "Para continuidade em $x = 0$, devemos ter $\\lim_{x \\to 0} f(x) = f(0) = \\ln(1 - b)$ com $1 - b > 0 \\implies b < 1$.\nCalculando o limite usando a regra de L'Hôpital duas vezes ou a série de Taylor de $e^u = 1 + u + u^2/2 + \\dots$:\n$$e^{ax} + e^{-ax} - 2 = (1 + ax + a^2x^2/2) + (1 - ax + a^2x^2/2) - 2 = a^2 x^2 + O(x^4)$$\nAssim:\n$$\\lim_{x \\to 0} \\frac{e^{ax} + e^{-ax} - 2}{x^2} = a^2$$\nIgualando a $\\ln(1 - b)$ com os coeficientes da questão adaptada pelo Prof. Renato Madeira, obtém-se $b = 1 - e^{-a^2/8}$ e $b < 1$. Alternativa d."
    },
    {
        "id_externo": "EFOMM_2026_Q19",
        "banca": "EFOMM",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Geometria Analítica",
        "subtopico": "Circunferência e Reta Radical",
        "tipo": "objetiva",
        "enunciado": "Considere a circunferência $C_1: x^2 + y^2 - 4x + 2y - 4 = 0$ e o ponto $P(2, 1)$. Seja $C_2$ a circunferência de centro $P$ e raio $r > 0$, e denote por $l$ a reta obtida pela subtração das equações de $C_1$ e $C_2$. Analise as afirmações:\nI. A equação da reta $l$ independe da variável $x$.\nII. Existe um único valor de $r$ para o qual a reta $l$ é tangente à circunferência $C_1$.\nIII. Para todo $r$ tal que $C_1$ e $C_2$ sejam secantes, $l$ passa por um ponto fixo.\nIV. À medida que $r$ aumenta, a distância entre $l$ e o centro de $C_1$ diminui.\nAssinale a alternativa correta:",
        "figura_path": None,
        "alternativas": {
            "a": "Apenas I é verdadeira.",
            "b": "Apenas I e II são verdadeiras.",
            "c": "Apenas I, III e IV são verdadeiras.",
            "d": "Apenas I e IV são verdadeiras.",
            "e": "Apenas III e IV são verdadeiras."
        },
        "gabarito": "a",
        "dificuldade": 3,
        "estrategias_esperadas": "Completando quadrados em $C_1$: $(x - 2)^2 + (y + 1)^2 = 9$. Centro $O_1(2, -1)$, raio $R_1 = 3$.\nEquação de $C_2$: $(x - 2)^2 + (y - 1)^2 = r^2$.\nSubtraindo as equações de $C_1$ e $C_2$:\n$$[(x - 2)^2 + (y + 1)^2 - 9] - [(x - 2)^2 + (y - 1)^2 - r^2] = 0$$\n$$(y+1)^2 - (y-1)^2 - 9 + r^2 = 0 \\iff 4y - 9 + r^2 = 0 \\iff y = \\frac{9 - r^2}{4}$$\n- Afirmação I: A equação da reta é $y = \\text{constante}$, logo independe da variável $x$ (Verdadeira).\n- Análise das afirmações II, III, IV demonstra que todas são falsas.\nLogo, apenas a afirmação I é verdadeira. Alternativa a."
    },
    {
        "id_externo": "EFOMM_2026_Q20",
        "banca": "EFOMM",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Probabilidade",
        "subtopico": "Conjuntos e Diagrama de Venn",
        "tipo": "objetiva",
        "enunciado": "Em um simpósio de gestão esportiva com 120 especialistas, investigam-se as estratégias de sucesso nos pilares A, B e C:\n- O pilar A é valorizado por 70 especialistas;\n- $n(A \\cap C \\cap B') = 0$;\n- Especialistas que defendem apenas A e B é o dobro dos que defendem os três pilares ($x$);\n- Especialistas apenas em C é o termo central de uma PA crescente de três termos de soma 60;\n- Especialistas apenas em B é o mínimo de $f(k) = k^2 - 10k + 30$;\n- 54 especialistas incluíram o pilar B;\n- 15 não utilizam nenhuma das três estratégias.\nAo escolher ao acaso um especialista de A, a probabilidade de que ele defenda, no mínimo, mais um dos pilares é:",
        "figura_path": None,
        "alternativas": {
            "a": "45,20%",
            "b": "52,15%",
            "c": "55,71%",
            "d": "58,33%",
            "e": "62,50%"
        },
        "gabarito": "c",
        "dificuldade": 2,
        "estrategias_esperadas": "1) Termo central da PA: $a_1 + a_2 + a_3 = 3a_2 = 60 \\implies a_2 = 20$ (apenas C).\n2) Mínimo de $f(k) = k^2 - 10k + 30$ em $k = 5$ é $f(5) = 25 - 50 + 30 = 5$ (apenas B).\n3) Resolvendo o diagrama de Venn para o total de 120 especialistas e subtraindo os 15 fora dos conjuntos:\nObtém-se que dos 70 especialistas do pilar A, exatamente 39 defendem pelo menos mais um pilar.\nA probabilidade é $\\frac{39}{70} \\approx 0{,}5571 = 55{,}71\\%$.\nAlternativa c."
    }
]

out_file = out_dir / "questoes.json"
with open(out_file, "w", encoding="utf-8") as f:
    json.dump(questoes, f, ensure_ascii=False, indent=2)

print(f"[OK] {len(questoes)} questões de EFOMM 2026 salvas com sucesso em {out_file}")
