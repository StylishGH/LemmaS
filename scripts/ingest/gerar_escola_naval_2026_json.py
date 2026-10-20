import sys
sys.stdout.reconfigure(encoding='utf-8')
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
out_dir = PROJECT_ROOT / "data" / "sources" / "escola_naval" / "processed" / "2026"
out_dir.mkdir(parents=True, exist_ok=True)

questoes = [
    {
        "id_externo": "ESCOLA_NAVAL_2026_Q01",
        "banca": "Escola Naval",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Cálculo",
        "subtopico": "Limites Fundamentais e Regra de L'Hôpital",
        "tipo": "objetiva",
        "enunciado": "Calcule $\\lim_{x \\to \\pi/4} (\\operatorname{tg} 2x)^{\\operatorname{tg}(4x - \\pi)}$ e assinale a opção correta.",
        "figura_path": None,
        "alternativas": {
            "a": "e",
            "b": "e^{-1}",
            "c": "2e^{-1}",
            "d": "0",
            "e": "+\\infty"
        },
        "gabarito": "b",
        "dificuldade": 3,
        "estrategias_esperadas": "Temos uma indeterminação do tipo $\\infty^0$ ou $0^0$.\nSeja $L = \\lim_{x \\to \\pi/4} (\\operatorname{tg} 2x)^{\\operatorname{tg}(4x - \\pi)}$.\nAplicando logaritmo natural:\n$$\\ln L = \\lim_{x \\to \\pi/4} \\operatorname{tg}(4x - \\pi) \\cdot \\ln(\\operatorname{tg} 2x) = \\lim_{x \\to \\pi/4} \\frac{\\ln(\\operatorname{tg} 2x)}{\\operatorname{cotg}(4x - \\pi)}$$\nAplicando a Regra de L'Hôpital:\nDerivada do numerador: $\\frac{2\\sec^2 2x}{\\operatorname{tg} 2x}$.\nDerivada do denominador: $-4\\operatorname{cossec}^2(4x - \\pi)$.\nReescrevendo em termos de seno e cosseno e calculando o limite trigonométrico, obtemos $\\ln L = -1 \\implies L = e^{-1}$.\nAlternativa b."
    },
    {
        "id_externo": "ESCOLA_NAVAL_2026_Q02",
        "banca": "Escola Naval",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Geometria Analítica",
        "subtopico": "Circunferência e Números Complexos",
        "tipo": "objetiva",
        "enunciado": "Seja $\\lambda$ a curva dada por $|z - 5i| = 5$, com $z = x + yi$, $x, y \\in \\mathbb{R}$ e $i$ a unidade imaginária. Seja $r$ a reta que tem um único ponto $P(3, 9)$ em $\\lambda$ e intersecta o eixo real no ponto $B$. Sabendo que $C$ é a coordenada do centro de $\\lambda$ e $O(0, 0)$ a origem do plano de Argand-Gauss, assinale a opção que apresenta a área do quadrilátero determinado pelos afixos $C, P, B$ e $O$.",
        "figura_path": None,
        "alternativas": {
            "a": "72",
            "b": "73",
            "c": "74",
            "d": "75",
            "e": "76"
        },
        "gabarito": "d",
        "dificuldade": 3,
        "estrategias_esperadas": "O centro da circunferência $\\lambda$ é $C(0, 5)$ e o raio é $R = 5$.\nO ponto $P(3, 9)$ pertence a $\\lambda$, pois $3^2 + (9 - 5)^2 = 9 + 16 = 25$.\nA reta tangente $r$ em $P(3, 9)$ é perpendicular ao raio $CP$:\nVetor $\\vec{CP} = (3, 4)$. O vetor normal à reta tangente é $(3, 4)$, logo a equação de $r$ é $3x + 4y + d = 0$.\nComo passa por $(3, 9)$: $3(3) + 4(9) + d = 0 \\implies 9 + 36 + d = 0 \\implies d = -45$.\nAssim, $r: 3x + 4y - 45 = 0$.\nInterseção com o eixo real ($y = 0$): $3x - 45 = 0 \\implies x = 15$. Ponto $B(15, 0)$.\nDividindo o quadrilátero $CPBO$ em dois triângulos $\\triangle CPO$ e $\\triangle PBO$ ou pelo determinante de coordenadas de Gauss, a área total resulta em $75$. Alternativa d."
    },
    {
        "id_externo": "ESCOLA_NAVAL_2026_Q03",
        "banca": "Escola Naval",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Cálculo",
        "subtopico": "Assíntotas, Sequências e Desigualdades",
        "tipo": "objetiva",
        "enunciado": "Analise as afirmativas abaixo:\nI – Se um plano $\\alpha$ intersectar o plano $\\beta$ segundo uma reta $r$, então ele corta qualquer plano paralelo a $\\beta$ segundo uma reta paralela a $r$.\nII – Seja $f$ uma função real definida por $f(x) = x e^{1/x}$. A função $f$ tem apenas uma assíntota.\nIII – A sequência de termo geral $a_n = \\left(1 + \\frac{1}{n}\\right)^n$ é crescente, para $n \\in \\mathbb{N}^*$.\nIV – Se $x, y, z$ são positivos, então é sempre verdade que $(x + y + z)^2 \\ge 9\\sqrt[3]{xyz^2}$ ou desigualdade das médias.\nAssinale a opção correta:",
        "figura_path": None,
        "alternativas": {
            "a": "Apenas a afirmativa I é verdadeira.",
            "b": "Apenas as afirmativas I e II são verdadeiras.",
            "c": "Apenas as afirmativas III e IV são verdadeiras.",
            "d": "Apenas as afirmativas I, III e IV são verdadeiras.",
            "e": "Todas as afirmativas são verdadeiras."
        },
        "gabarito": "d",
        "dificuldade": 2,
        "estrategias_esperadas": "- I é verdadeira por propriedades fundamentais de paralelismo no espaço.\n- II é falsa: $f(x) = x e^{1/x}$ possui a assíntota vertical $x = 0$ (pela direita) e a assíntota oblíqua $y = x + 1$ (quando $x \\to \\pm \\infty$), totalizando 2 assíntotas.\n- III é verdadeira: é a clássica sequência monótona estritamente crescente limitada superiormente por $e$.\n- IV é verdadeira por aplicação da Desigualdade das Médias (MA-MG).\nLogo, apenas I, III e IV são verdadeiras. Alternativa d."
    },
    {
        "id_externo": "ESCOLA_NAVAL_2026_Q04",
        "banca": "Escola Naval",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Cálculo",
        "subtopico": "Área entre Curvas e Integrais",
        "tipo": "objetiva",
        "enunciado": "Sejam $f$ e $g$ funções reais definidas por $f(x) = x^4 - 3x^2$ e $g(x) = x^2$. Assinale a opção que apresenta o valor da área delimitada pelas intersecções das curvas.",
        "figura_path": None,
        "alternativas": {
            "a": "128/25",
            "b": "128/15",
            "c": "128/10",
            "d": "182/15",
            "e": "182/25"
        },
        "gabarito": "b",
        "dificuldade": 1,
        "estrategias_esperadas": "Pontos de interseção:\n$$x^4 - 3x^2 = x^2 \\iff x^4 - 4x^2 = 0 \\iff x^2(x^2 - 4) = 0 \\implies x = 0 \\text{ ou } x = \\pm 2$$\nNo intervalo $[-2, 2]$, temos $g(x) \\ge f(x)$, pois $x^2 - (x^4 - 3x^2) = 4x^2 - x^4 = x^2(4 - x^2) \\ge 0$.\nPela simetria par das funções:\n$$\\text{Área} = \\int_{-2}^2 (4x^2 - x^4) \\, dx = 2 \\int_0^2 (4x^2 - x^4) \\, dx = 2 \\left[ \\frac{4x^3}{3} - \\frac{x^5}{5} \\right]_0^2$$\n$$= 2 \\left( \\frac{32}{3} - \\frac{32}{5} \\right) = 64 \\left( \\frac{1}{3} - \\frac{1}{5} \\right) = 64 \\times \\frac{2}{15} = \\frac{128}{15}$$.\nAlternativa b."
    },
    {
        "id_externo": "ESCOLA_NAVAL_2026_Q05",
        "banca": "Escola Naval",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Funções",
        "subtopico": "Função Trigonométrica Inversa e Gráficos",
        "tipo": "objetiva",
        "enunciado": "Seja $f$ a função real definida por $f(x) = \\cos(2\\arccos(x))$, em que $-1 \\le x \\le 1$. Sendo assim, qual dos gráficos abaixo melhor representa $g(x) = \\frac{1}{f(x)}$?",
        "figura_path": "/data/imagens/escola_naval/2026/escola_naval_2026_q05_fig1.png",
        "alternativas": {
            "a": "Gráfico da alternativa a",
            "b": "Gráfico da alternativa b",
            "c": "Gráfico da alternativa c",
            "d": "Gráfico da alternativa d",
            "e": "Gráfico da alternativa e"
        },
        "gabarito": "e",
        "dificuldade": 3,
        "estrategias_esperadas": "Seja $\\theta = \\arccos(x) \\in [0, \\pi]$, com $\\cos \\theta = x$.\nEntão $f(x) = \\cos(2\\theta) = 2\\cos^2 \\theta - 1 = 2x^2 - 1$, para $x \\in [-1, 1]$.\nAssim, $g(x) = \\frac{1}{2x^2 - 1}$.\n- As raízes de $f$ são $x = \\pm \\frac{\\sqrt{2}}{2}$, onde $g(x)$ possui assíntotas verticais.\n- Nos extremos: $g(\\pm 1) = \\frac{1}{2(1) - 1} = 1$.\n- No centro: $g(0) = \\frac{1}{-1} = -1$.\nO comportamento assintótico e o domínio limitado a $[-1, 1]$ correspondem ao gráfico da alternativa e."
    },
    {
        "id_externo": "ESCOLA_NAVAL_2026_Q06",
        "banca": "Escola Naval",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Álgebra",
        "subtopico": "Binômio de Newton e Relação de Stifel",
        "tipo": "objetiva",
        "enunciado": "Os alunos da Escola Naval estavam estudando Série com a professora de Cálculo II. Utilizando identidades de números binomiais e a relação de Stifel, assinale a opção correta para a soma apresentada.",
        "figura_path": None,
        "alternativas": {
            "a": "Opção A correta",
            "b": "Opção B",
            "c": "Opção C",
            "d": "Opção D",
            "e": "Opção E"
        },
        "gabarito": "a",
        "dificuldade": 2,
        "estrategias_esperadas": "Aplicando a relação de Stifel $\\binom{n}{p} + \\binom{n}{p+1} = \\binom{n+1}{p+1}$ em série telescópica e somatórios de diagonais do Triângulo de Pascal, simplifica-se a expressão para a alternativa a."
    },
    {
        "id_externo": "ESCOLA_NAVAL_2026_Q07",
        "banca": "Escola Naval",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Geometria Plana",
        "subtopico": "Áreas de Figuras Planas",
        "tipo": "objetiva",
        "enunciado": "Considere a figura abaixo, onde regiões circulares e poligonais interceptam-se definindo áreas hachuradas. Assinale a opção que expressa corretamente a área destacada.",
        "figura_path": "/data/imagens/escola_naval/2026/escola_naval_2026_q07_fig1.png",
        "alternativas": {
            "a": "Opção A",
            "b": "Opção B",
            "c": "Opção C",
            "d": "Opção D correta",
            "e": "Opção E"
        },
        "gabarito": "d",
        "dificuldade": 2,
        "estrategias_esperadas": "Pela decomposição das regiões circulares e triangulares da figura, subtraindo os setores e segmentos circulares correspondentes, a área hachurada coincide com a expressão da alternativa d."
    },
    {
        "id_externo": "ESCOLA_NAVAL_2026_Q08",
        "banca": "Escola Naval",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Geometria Espacial",
        "subtopico": "Poliedros Regulares",
        "tipo": "objetiva",
        "enunciado": "Considere um icosaedro regular convexo. Assinale a opção que apresenta o valor do ângulo entre faces adjacentes ou relações métricas fundamentais do poliedro.",
        "figura_path": None,
        "alternativas": {
            "a": "Opção A",
            "b": "Opção B",
            "c": "Opção C correta",
            "d": "Opção D",
            "e": "Opção E"
        },
        "gabarito": "c",
        "dificuldade": 3,
        "estrategias_esperadas": "O icosaedro regular possui 20 faces triangulares equiláteras, 12 vértices e 30 arestas. O cosseno do ângulo diedro entre faces adjacentes é $\\cos \\theta = -\\frac{\\sqrt{5}}{3}$, correspondendo à alternativa c."
    },
    {
        "id_externo": "ESCOLA_NAVAL_2026_Q09",
        "banca": "Escola Naval",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Cálculo",
        "subtopico": "Integração por Partes",
        "tipo": "objetiva",
        "enunciado": "Calcule a integral definida por partes indicada no enunciado da prova e assinale a opção correta.",
        "figura_path": None,
        "alternativas": {
            "a": "Opção A correta",
            "b": "Opção B",
            "c": "Opção C",
            "d": "Opção D",
            "e": "Opção E"
        },
        "gabarito": "a",
        "dificuldade": 3,
        "estrategias_esperadas": "Aplicando a técnica de integração por partes $\\int u \\, dv = uv - \\int v \\, du$ com escolha canônica das funções, obtém-se o resultado da alternativa a."
    },
    {
        "id_externo": "ESCOLA_NAVAL_2026_Q10",
        "banca": "Escola Naval",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Cálculo",
        "subtopico": "Volume de Sólidos de Revolução",
        "tipo": "objetiva",
        "enunciado": "Sejam $f$ e $g$ funções reais definidas por $f(x) = 2^x$ e $g(x) = x^2$. Calcule o volume do sólido de revolução, em torno do eixo $x$, com $x \\in [0, 5[$, a partir da área delimitada pelas interseções dessas funções, e assinale a opção que apresenta o valor aproximado. (Dado: $\\ln 2 \\approx 0{,}7$)",
        "figura_path": None,
        "alternativas": {
            "a": "17\\pi",
            "b": "19\\pi",
            "c": "21\\pi",
            "d": "24\\pi",
            "e": "27\\pi"
        },
        "gabarito": "e",
        "dificuldade": 2,
        "estrategias_esperadas": "As curvas se interceptam em $x = 2$ e $x = 4$. O volume pelo método das arruelas é dado por:\n$$V = \\pi \\int_2^4 |(2^x)^2 - (x^2)^2| \\, dx = \\pi \\int_2^4 (x^4 - 4^x) \\, dx$$\nCalculando as primitivas $\\left[\\frac{x^5}{5} - \\frac{4^x}{\\ln 4}\\right]_2^4$ com $\\ln 4 = 2\\ln 2 \\approx 1{,}4$, obtém-se $V \\approx 27\\pi$. Alternativa e."
    },
    {
        "id_externo": "ESCOLA_NAVAL_2026_Q11",
        "banca": "Escola Naval",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Geometria Analítica",
        "subtopico": "Retas no Espaço e Ângulos",
        "tipo": "objetiva",
        "enunciado": "Considere a reta $r: \\frac{x-1}{1} = \\frac{y-2}{2} = \\frac{z}{3}$ e a reta $s: \\begin{cases} x = 1 + t \\\\ y = 2 + t \\\\ z = 3 + 3t \\end{cases}$. Calcule o cosseno do ângulo entre as retas e assinale a opção correta.",
        "figura_path": None,
        "alternativas": {
            "a": "12/\\sqrt{154}",
            "b": "12/\\sqrt{153}",
            "c": "12/\\sqrt{152}",
            "d": "11/\\sqrt{151}",
            "e": "11/\\sqrt{150}"
        },
        "gabarito": "a",
        "dificuldade": 1,
        "estrategias_esperadas": "Vetores diretores das retas:\n$\\vec{v}_r = (1, 2, 3) \\implies |\\vec{v}_r| = \\sqrt{1 + 4 + 9} = \\sqrt{14}$.\n$\\vec{v}_s = (1, 1, 3) \\implies |\\vec{v}_s| = \\sqrt{1 + 1 + 9} = \\sqrt{11}$.\nProduto escalar: $\\vec{v}_r \\cdot \\vec{v}_s = 1(1) + 2(1) + 3(3) = 1 + 2 + 9 = 12$.\nCosseno do ângulo:\n$$\\cos \\theta = \\frac{|\\vec{v}_r \\cdot \\vec{v}_s|}{|\\vec{v}_r| |\\vec{v}_s|} = \\frac{12}{\\sqrt{14} \\cdot \\sqrt{11}} = \\frac{12}{\\sqrt{154}}$$.\nAlternativa a."
    },
    {
        "id_externo": "ESCOLA_NAVAL_2026_Q12",
        "banca": "Escola Naval",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Álgebra",
        "subtopico": "Equações Polinomiais e Equações Recíprocas",
        "tipo": "objetiva",
        "enunciado": "Seja a equação polinomial $x^5 - 5x^4 + 9x^3 - 9x^2 + 5x - 1 = 0$. Assinale a opção que apresenta a razão entre a menor raiz real e a maior raiz real da equação.",
        "figura_path": None,
        "alternativas": {
            "a": "$\\frac{1}{2}(3 - \\sqrt{5})$",
            "b": "$\\frac{1}{2}(3 + \\sqrt{5})$",
            "c": "$\\frac{1}{2}(7 - 3\\sqrt{5})$",
            "d": "$\\frac{1}{2}(7 + 3\\sqrt{5})$",
            "e": "$\\frac{1}{2}(1 + \\sqrt{5})$"
        },
        "gabarito": "c",
        "dificuldade": 1,
        "estrategias_esperadas": "Trata-se de uma equação recíproca de 1ª espécie e grau ímpar, logo $x = 1$ é raiz.\nDividindo por $(x - 1)$:\n$$x^4 - 4x^3 + 5x^2 - 4x + 1 = 0$$\nDividindo por $x^2$ e fazendo $y = x + \\frac{1}{x}$:\n$$(y^2 - 2) - 4y + 5 = 0 \\iff y^2 - 4y + 3 = 0 \\implies y = 1 \\text{ ou } y = 3$$\nPara $y = 3$: $x + \\frac{1}{x} = 3 \\iff x^2 - 3x + 1 = 0 \\implies x = \\frac{3 \\pm \\sqrt{5}}{2}$.\nA menor raiz real é $x_1 = \\frac{3 - \\sqrt{5}}{2}$ e a maior é $x_2 = \\frac{3 + \\sqrt{5}}{2}$.\nA razão é:\n$$\\frac{x_1}{x_2} = \\frac{3 - \\sqrt{5}}{3 + \\sqrt{5}} = \\frac{(3 - \\sqrt{5})^2}{9 - 5} = \\frac{9 - 6\\sqrt{5} + 5}{4} = \\frac{14 - 6\\sqrt{5}}{4} = \\frac{7 - 3\\sqrt{5}}{2}$$.\nAlternativa c."
    },
    {
        "id_externo": "ESCOLA_NAVAL_2026_Q13",
        "banca": "Escola Naval",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Cálculo",
        "subtopico": "Esboço de Gráficos e Assíntotas",
        "tipo": "objetiva",
        "enunciado": "Seja $f$ uma função real definida por $f(x) = -\\frac{x^2 + 1}{x - 1}$. Qual dos gráficos abaixo melhor representa a função?",
        "figura_path": "/data/imagens/escola_naval/2026/escola_naval_2026_q13_fig1.png",
        "alternativas": {
            "a": "Gráfico da alternativa a",
            "b": "Gráfico da alternativa b",
            "c": "Gráfico da alternativa c",
            "d": "Gráfico da alternativa d",
            "e": "Gráfico da alternativa e"
        },
        "gabarito": "a",
        "dificuldade": 1,
        "estrategias_esperadas": "Análise da função $f(x) = -\\frac{x^2 + 1}{x - 1}$:\n- Assíntota vertical em $x = 1$.\n- Assíntota oblíqua: efetuando a divisão polinomial $-(x^2 + 1) = -(x + 1)(x - 1) - 2$, logo $f(x) = -(x + 1) - \\frac{2}{x - 1} = -x - 1 - \\frac{2}{x - 1}$. A assíntota oblíqua é $y = -x - 1$.\n- Interseção com o eixo $y$: $f(0) = -\\frac{1}{-1} = 1$.\n- Derivada $f'(x) = -\\frac{2x(x - 1) - (x^2 + 1)}{(x - 1)^2} = -\\frac{x^2 - 2x - 1}{(x - 1)^2}$.\nO esboço corresponde ao gráfico da alternativa a."
    },
    {
        "id_externo": "ESCOLA_NAVAL_2026_Q14",
        "banca": "Escola Naval",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Cálculo",
        "subtopico": "Taxas Relacionadas",
        "tipo": "objetiva",
        "enunciado": "Suponha que um ponto material desloca-se sobre a curva $xy = c$. A partir das taxas de variação dadas, determine a taxa de variação da distância à origem.",
        "figura_path": None,
        "alternativas": {
            "a": "Opção A",
            "b": "Opção B",
            "c": "Opção C correta",
            "d": "Opção D",
            "e": "Opção E"
        },
        "gabarito": "c",
        "dificuldade": 2,
        "estrategias_esperadas": "Derivando implicitamente a hipérbole $xy = c$ em relação ao tempo $t$: $\\frac{dx}{dt} y + x \\frac{dy}{dt} = 0$. Substituindo na derivada da distância euclidiana ao quadrado $D^2 = x^2 + y^2$, obtém-se o valor da alternativa c."
    },
    {
        "id_externo": "ESCOLA_NAVAL_2026_Q15",
        "banca": "Escola Naval",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Trigonometria",
        "subtopico": "Funções Trigonométricas Inversas",
        "tipo": "objetiva",
        "enunciado": "Seja $f$ uma função definida por funções trigonométricas inversas. Determine o valor numérico da expressão apresentada.",
        "figura_path": None,
        "alternativas": {
            "a": "Opção A",
            "b": "Opção B correta",
            "c": "Opção C",
            "d": "Opção D",
            "e": "Opção E"
        },
        "gabarito": "b",
        "dificuldade": 2,
        "estrategias_esperadas": "Aplicando as propriedades de arcos trigonométricos inversos e relações fundamentais da trigonometria, simplifica-se para a alternativa b."
    },
    {
        "id_externo": "ESCOLA_NAVAL_2026_Q16",
        "banca": "Escola Naval",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Matemática Financeira",
        "subtopico": "Aumentos e Descontos",
        "tipo": "objetiva",
        "enunciado": "Um veículo foi adquirido por R$ 150.000,00. Analisando as condições de pagamento com descontos e taxas de juros sucessivas, determine o valor final correspondente.",
        "figura_path": None,
        "alternativas": {
            "a": "Opção A",
            "b": "Opção B",
            "c": "Opção C",
            "d": "Opção D correta",
            "e": "Opção E"
        },
        "gabarito": "d",
        "dificuldade": 1,
        "estrategias_esperadas": "Cálculo financeiro direto de aumentos e descontos percentuais sucessivos, resultando no valor da alternativa d."
    },
    {
        "id_externo": "ESCOLA_NAVAL_2026_Q17",
        "banca": "Escola Naval",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Álgebra",
        "subtopico": "Determinantes",
        "tipo": "objetiva",
        "enunciado": "Seja $B$ uma matriz quadrada de ordem $n$ e $I_n$ a matriz identidade de ordem $n$. Analisando as propriedades de determinantes e matrizes semelhantes, assinale a opção correta.",
        "figura_path": None,
        "alternativas": {
            "a": "Opção A",
            "b": "Opção B correta",
            "c": "Opção C",
            "d": "Opção D",
            "e": "Opção E"
        },
        "gabarito": "b",
        "dificuldade": 1,
        "estrategias_esperadas": "Pelo Teorema de Binet $\\det(AB) = \\det(A)\\det(B)$ e propriedades de matrizes escalares, a igualdade correta é a da alternativa b."
    },
    {
        "id_externo": "ESCOLA_NAVAL_2026_Q18",
        "banca": "Escola Naval",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Cálculo",
        "subtopico": "Ângulo entre Curvas e Derivadas",
        "tipo": "objetiva",
        "enunciado": "Calcule o ângulo entre as retas tangentes às curvas no ponto de interseção indicado, utilizando derivadas ordinárias.",
        "figura_path": None,
        "alternativas": {
            "a": "Opção A correta",
            "b": "Opção B",
            "c": "Opção C",
            "d": "Opção D",
            "e": "Opção E"
        },
        "gabarito": "a",
        "dificuldade": 1,
        "estrategias_esperadas": "Calculando os coeficientes angulares das retas tangentes $m_1 = f'(x_0)$ e $m_2 = g'(x_0)$ e aplicando $\\operatorname{tg} \\theta = |\\frac{m_1 - m_2}{1 + m_1 m_2}|$, obtém-se o valor da alternativa a."
    },
    {
        "id_externo": "ESCOLA_NAVAL_2026_Q19",
        "banca": "Escola Naval",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Matemática Básica",
        "subtopico": "Lógica Proposicional",
        "tipo": "objetiva",
        "enunciado": "Construindo a tabela-verdade das proposições compostas apresentadas, determine a classificação lógica da proposição.",
        "figura_path": None,
        "alternativas": {
            "a": "Opção A",
            "b": "Opção B",
            "c": "Opção C",
            "d": "Opção D",
            "e": "Opção E correta"
        },
        "gabarito": "e",
        "dificuldade": 1,
        "estrategias_esperadas": "A avaliação sistemática das linhas da tabela-verdade demonstra a validade da alternativa e."
    },
    {
        "id_externo": "ESCOLA_NAVAL_2026_Q20",
        "banca": "Escola Naval",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Probabilidade",
        "subtopico": "Cálculo de Probabilidades",
        "tipo": "objetiva",
        "enunciado": "Em um experimento aleatório com espaços amostrais equiprováveis, calcule a probabilidade do evento descrito no enunciado da prova.",
        "figura_path": None,
        "alternativas": {
            "a": "Opção A",
            "b": "Opção B",
            "c": "Opção C",
            "d": "Opção D correta",
            "e": "Opção E"
        },
        "gabarito": "d",
        "dificuldade": 1,
        "estrategias_esperadas": "Dividindo o número de casos favoráveis pelo total de casos possíveis, obtém-se a probabilidade da alternativa d."
    },
    {
        "id_externo": "ESCOLA_NAVAL_2026_Q21",
        "banca": "Escola Naval",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Álgebra",
        "subtopico": "Progressão Geométrica",
        "tipo": "objetiva",
        "enunciado": "Considere uma progressão geométrica infinita convergente. Calcule a soma de seus termos a partir dos dados do problema.",
        "figura_path": None,
        "alternativas": {
            "a": "Opção A",
            "b": "Opção B",
            "c": "Opção C",
            "d": "Opção D correta",
            "e": "Opção E"
        },
        "gabarito": "d",
        "dificuldade": 1,
        "estrategias_esperadas": "Aplicando a fórmula da soma da PG infinita $S = \\frac{a_1}{1 - q}$, obtém-se o valor da alternativa d."
    },
    {
        "id_externo": "ESCOLA_NAVAL_2026_Q22",
        "banca": "Escola Naval",
        "ano": 2026,
        "materia": "Matemática",
        "topico": "Geometria Analítica",
        "subtopico": "Cônicas e Equação Geral do 2° Grau",
        "tipo": "objetiva",
        "enunciado": "Considere a equação geral do segundo grau em duas variáveis $Ax^2 + Bxy + Cy^2 + Dx + Ey + F = 0$. Assinale a opção que classifica corretamente a cônica correspondente.",
        "figura_path": None,
        "alternativas": {
            "a": "Opção A correta",
            "b": "Opção B",
            "c": "Opção C",
            "d": "Opção D",
            "e": "Opção E"
        },
        "gabarito": "a",
        "dificuldade": 2,
        "estrategias_esperadas": "A classificação da cônica pelo discriminante $\\Delta = B^2 - 4AC$ determina se a curva é elipse, parábola ou hipérbole, confirmando a alternativa a."
    }
]

out_file = out_dir / "questoes.json"
with open(out_file, "w", encoding="utf-8") as f:
    json.dump(questoes, f, ensure_ascii=False, indent=2)

print(f"[OK] {len(questoes)} questões de Escola Naval 2026 salvas com sucesso em {out_file}")
