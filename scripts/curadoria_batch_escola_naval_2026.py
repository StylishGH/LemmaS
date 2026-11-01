#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
curadoria_batch_escola_naval_2026.py — Curadoria em lote das 12 questões da Escola Naval 2026.

Substitui alternativas mock ("Opção A", etc.) e enunciados truncados pelos enunciados e 
fórmulas reais em KaTeX, gabaritos oficiais e resoluções completas passo a passo.
"""

import json
import urllib.request
import sys

SUPABASE_URL = "https://gzlzwqknwfgrsnyvgpnv.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bHp3cWtud2ZncnNueXZncG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MTgzNzcsImV4cCI6MjEwNjk5NDM3N30.L2G9NrtgQM0MzvVJ50tG3S_4eso99INrsl9g2b7sVHI"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

UPDATES = [
    {
        "id": 22959,
        "mathnet_id": "ESCOLA_NAVAL_2026_Q06",
        "gabarito": "A",
        "enunciado": """Os alunos da Escola Naval estavam estudando Série com a professora de Cálculo II, com o subtítulo de identidades algébricas. Dessa forma, foi proposta a simplificação do seguinte polinômio:
$$1 - \\frac{x}{1!} + \\frac{x(x - 1)}{2!} - \\frac{x(x - 1)(x - 2)}{3!} + \\dots + (-1)^n \\frac{x(x - 1)\\cdots(x - n + 1)}{n!}$$
Sendo assim, após a simplificação, é correto afirmar que o aspirante deverá encontrar a seguinte simplificação:

(a) $(-1)^n \\frac{(x - 1)(x - 2)\\cdots(x - n)}{n!}$
(b) $(-1)^n \\frac{(x - 1)(x - 2)\\cdots(x + n)}{n!}$
(c) $(-1)^n \\frac{(x - 1)(x - 2)\\cdots(x - n + 1)}{n!}$
(d) $(-1)^n \\frac{(x - 1)(x - 2)\\cdots(x - 2n)}{n!}$
(e) $(-1)^n \\frac{x(x - 1)(x - 2)\\cdots(x - n + 1)}{n!}$""",
        "solucao": """Vamos reescrever a expressão em função dos coeficientes binomiais:
$$\\sum_{k=0}^n (-1)^k \\binom{x}{k} = \\binom{x}{0} - \\binom{x}{1} + \\binom{x}{2} - \\dots + (-1)^n \\binom{x}{n}$$
Aplicando a relação de Stifel telescópica $\\binom{x}{k} = \\binom{x-1}{k-1} + \\binom{x-1}{k}$:
$$\\binom{x}{0} = \\binom{x-1}{0}$$
$$-\\binom{x}{1} = -\\binom{x-1}{0} - \\binom{x-1}{1}$$
$$\\binom{x}{2} = \\binom{x-1}{1} + \\binom{x-1}{2}$$
Ao somar todos os termos de $k=0$ até $n$, ocorre um cancelamento telescópico em que todos os termos intermediários se anulam, restando apenas:
$$(-1)^n \\binom{x-1}{n} = (-1)^n \\frac{(x - 1)(x - 2)\\cdots(x - n)}{n!}$$""",
        "estrategias_esperadas": "Expressão reescrita em termos de coeficientes binomiais e simplificada por cancelamento telescópico com a Relação de Stifel, resultando na alternativa a."
    },
    {
        "id": 22961,
        "mathnet_id": "ESCOLA_NAVAL_2026_Q08",
        "gabarito": "C",
        "enunciado": """Considere um icosaedro regular convexo. Assinale a opção que apresenta o valor do ângulo entre duas faces adjacentes.

(a) $\\operatorname{arcsen}\\left(-\\frac{\\sqrt{5}}{7}\\right)$
(b) $\\operatorname{arctg}\\left(-\\frac{\\sqrt{5}}{4}\\right)$
(c) $\\operatorname{arccos}\\left(-\\frac{\\sqrt{5}}{3}\\right)$
(d) $\\operatorname{arccossec}\\left(-\\frac{\\sqrt{5}}{5}\\right)$
(e) $\\operatorname{arccos}\\left(-\\frac{\\sqrt{5}}{2}\\right)$""",
        "solucao": """Seja um icosaedro regular de aresta $x$. Cada vértice é o vértice de uma pirâmide pentagonal regular de aresta $x$.
Seja $M$ o ponto médio da aresta comum $CV$ entre duas faces adjacentes triangulares. Os segmentos $BM$ e $DM$ são alturas de triângulos equiláteros de lado $x$, logo:
$$BM = DM = \\frac{x\\sqrt{3}}{2}$$
A diagonal $BD = d$ do pentágono regular de lado $x$ é a razão áurea:
$$d = \\frac{1 + \\sqrt{5}}{2}x$$
Aplicando a Lei dos Cossenos no triângulo $BMD$ com ângulo diedro $\\theta = B\\hat{M}D$:
$$BD^2 = BM^2 + DM^2 - 2 \\cdot BM \\cdot DM \\cdot \\cos\\theta$$
$$\\left(\\frac{1+\\sqrt{5}}{2}x\\right)^2 = 2\\left(\\frac{x\\sqrt{3}}{2}\\right)^2 - 2\\left(\\frac{x\\sqrt{3}}{2}\\right)^2 \\cos\\theta$$
$$\\frac{6 + 2\\sqrt{5}}{4} = \\frac{3}{2}(1 - \\cos\\theta) \\implies \\cos\\theta = -\\frac{\\sqrt{5}}{3} \\implies \\theta = \\operatorname{arccos}\\left(-\\frac{\\sqrt{5}}{3}\\right)$$""",
        "estrategias_esperadas": "Determinação do ângulo diedro do icosaedro regular via pirâmide pentagonal de vértice, Teorema de Ptolomeu/diagonal do pentágono regular e Lei dos Cossenos, resultando na alternativa c."
    },
    {
        "id": 22962,
        "mathnet_id": "ESCOLA_NAVAL_2026_Q09",
        "gabarito": "A",
        "enunciado": """Calcule a integral $\\int_{\\pi/4}^{\\pi/2} x \\cdot [\\operatorname{cotg}(x)]^2\\,dx$ e assinale a opção correta.

(a) $-\\ln\\left(\\frac{\\sqrt{2}}{2}\\right) + \\frac{\\pi}{4} - \\frac{3\\pi^2}{32}$
(b) $\\ln\\left(\\frac{\\sqrt{2}}{4}\\right) + \\frac{\\pi}{4} - \\frac{5\\pi^2}{32}$
(c) $-\\ln\\left(\\frac{\\sqrt{2}}{2}\\right) + \\frac{\\pi}{2} + \\frac{7\\pi^2}{32}$
(d) $\\ln\\left(\\frac{\\sqrt{2}}{2}\\right) + \\frac{\\pi}{4} + \\frac{5\\pi^2}{16}$
(e) $-\\ln\\left(\\frac{\\sqrt{2}}{2}\\right) + \\frac{\\pi}{4} - \\frac{\\pi^2}{32}$""",
        "solucao": """Usando a identidade trigonométrica $[\\operatorname{cotg}(x)]^2 = \\operatorname{cossec}^2(x) - 1$:
$$\\int_{\\pi/4}^{\\pi/2} x [\\operatorname{cotg}(x)]^2\\,dx = \\int_{\\pi/4}^{\\pi/2} x \\operatorname{cossec}^2(x)\\,dx - \\int_{\\pi/4}^{\\pi/2} x\\,dx$$
A segunda integral é:
$$\\int_{\\pi/4}^{\\pi/2} x\\,dx = \\left[\\frac{x^2}{2}\\right]_{\\pi/4}^{\\pi/2} = \\frac{1}{2}\\left(\\frac{\\pi^2}{4} - \\frac{\\pi^2}{16}\\right) = \\frac{3\\pi^2}{32}$$
Para a primeira integral, integramos por partes: $u = x \\implies du = dx$ e $dv = \\operatorname{cossec}^2(x)\\,dx \\implies v = -\\operatorname{cotg}(x)$:
$$\\int x \\operatorname{cossec}^2(x)\\,dx = -x\\operatorname{cotg}(x) + \\int \\operatorname{cotg}(x)\\,dx = -x\\operatorname{cotg}(x) + \\ln|\\operatorname{sen}(x)|$$
Avaliando de $\\pi/4$ a $\\pi/2$:
$$\\left[-x\\operatorname{cotg}(x) + \\ln(\\operatorname{sen} x)\\right]_{\\pi/4}^{\\pi/2} = (0 + 0) - \\left(-\\frac{\\pi}{4} \\cdot 1 + \\ln\\left(\\frac{\\sqrt{2}}{2}\\right)\\right) = \\frac{\\pi}{4} - \\ln\\left(\\frac{\\sqrt{2}}{2}\\right)$$
Subtraindo a segunda parte:
$$-\\ln\\left(\\frac{\\sqrt{2}}{2}\\right) + \\frac{\\pi}{4} - \\frac{3\\pi^2}{32}$$""",
        "estrategias_esperadas": "Substituição de cotg²(x) por cossec²(x) - 1, integração por partes e cálculo dos limites definidos, resultando na alternativa a."
    },
    {
        "id": 22965,
        "mathnet_id": "ESCOLA_NAVAL_2026_Q14",
        "gabarito": "C",
        "enunciado": """Suponha que um ponto material desloca-se sobre a curva $xy = 4$ de modo que a velocidade em $y$ tenha um valor constante igual a $\\alpha \\in \\mathbb{R}^*$. Assinale a opção que apresenta a aceleração da abscissa quando $x = 2$.

(a) $\\alpha$
(b) $\\frac{\\alpha}{4}$
(c) $\\alpha^2$
(d) $\\alpha^3$
(e) $\\frac{\\alpha}{2}$""",
        "solucao": """Dado que $\\frac{dy}{dt} = \\alpha$ (constante), diferenciamos $xy = 4$ em relação ao tempo $t$:
$$\\frac{dx}{dt} \\cdot y + x \\cdot \\frac{dy}{dt} = 0 \\implies \\frac{dx}{dt} \\cdot y + x \\alpha = 0$$
Diferenciando novamente para encontrar a aceleração $\\frac{d^2x}{dt^2}$:
$$\\frac{d^2x}{dt^2} \\cdot y + \\frac{dx}{dt} \\cdot \\frac{dy}{dt} + \\frac{dx}{dt} \\alpha = 0 \\implies \\frac{d^2x}{dt^2} \\cdot y + 2\\alpha \\frac{dx}{dt} = 0$$
Quando $x = 2$, temos $2y = 4 \\implies y = 2$.
Substituindo na primeira derivada:
$$\\frac{dx}{dt} \\cdot 2 + 2\\alpha = 0 \\implies \\frac{dx}{dt} = -\\alpha$$
Substituindo na equação da aceleração:
$$\\frac{d^2x}{dt^2} \\cdot 2 + 2\\alpha(-\\alpha) = 0 \\implies 2\\frac{d^2x}{dt^2} = 2\\alpha^2 \\implies \\frac{d^2x}{dt^2} = \\alpha^2$$""",
        "estrategias_esperadas": "Derivação implícita temporal sucessiva da curva hiperbólica xy = 4 com taxa de variação constante em y, determinando a aceleração em x como α² (alternativa c)."
    },
    {
        "id": 22966,
        "mathnet_id": "ESCOLA_NAVAL_2026_Q15",
        "gabarito": "B",
        "enunciado": """Seja $f$ uma função definida por $f(x) = \\operatorname{arcsen}\\left(\\frac{2x - 1}{x + 2}\\right) + \\operatorname{arccos}\\left(\\frac{2x - 1}{x + 2}\\right)$. Assinale a opção que apresenta a área da região limitada pelo gráfico de $f$, pelo eixo $x$ e pelas retas verticais que delimitam o domínio da função.

(a) $\\frac{3\\pi}{2}$
(b) $\\frac{5\\pi}{3}$
(c) $\\frac{7\\pi}{2}$
(d) $\\frac{9\\pi}{5}$
(e) $\\frac{\\pi}{2}$""",
        "solucao": """Identidade trigonométrica fundamental: para qualquer $u \\in [-1, 1]$, temos $\\operatorname{arcsen}(u) + \\operatorname{arccos}(u) = \\frac{\\pi}{2}$.
Portanto, para todo $x$ pertencente ao domínio da função, $f(x) = \\frac{\\pi}{2}$ (função constante).
O domínio é determinado por:
$$-1 \\le \\frac{2x - 1}{x + 2} \\le 1$$
Resolvendo a dupla desigualdade com $x \\neq -2$:
1) $\\frac{2x - 1}{x + 2} + 1 \\ge 0 \\iff \\frac{3x + 1}{x + 2} \\ge 0 \\iff x < -2 \\text{ ou } x \\ge -\\frac{1}{3}$
2) $\\frac{2x - 1}{x + 2} - 1 \\le 0 \\iff \\frac{x - 3}{x + 2} \\le 0 \\iff -2 < x \\le 3$
A interseção das duas condições fornece o domínio:
$$D_f = \\left[-\\frac{1}{3}, 3\\right]$$
O comprimento da base do retângulo é:
$$L = 3 - \\left(-\\frac{1}{3}\\right) = \\frac{10}{3}$$
A altura é constante igual a $\\frac{\\pi}{2}$. Logo, a área sob o gráfico é:
$$\\text{Área} = \\frac{10}{3} \\cdot \\frac{\\pi}{2} = \\frac{5\\pi}{3}$$""",
        "estrategias_esperadas": "Reconhecimento da identidade arcsen(u) + arccos(u) = π/2, resolução de inequação quociente para domínio fechado [-1/3, 3] e cálculo de área retangular (alternativa b)."
    },
    {
        "id": 22967,
        "mathnet_id": "ESCOLA_NAVAL_2026_Q16",
        "gabarito": "D",
        "enunciado": """Um veículo foi adquirido por R$ 150.000,00. O interessado na aquisição do veículo percebeu que este apresentou duas perdas sucessivas de 10% e 30% ao longo de dois anos sobre o valor de aquisição. Tentando não ter tanta perda, o dono do veículo propôs vendê-lo com um acréscimo de 40% sobre o valor atual do veículo. Sendo assim, assinale a opção que apresenta por quanto o proprietário venderá o veículo.

(a) R$ 125.100,00
(b) R$ 98.200,00
(c) R$ 102.400,00
(d) R$ 132.300,00
(e) R$ 84.000,00""",
        "solucao": """O valor do veículo após as duas desvalorizações sucessivas de 10% e 30% é dado por:
$$V_1 = 150.000 \\cdot (1 - 0,10) \\cdot (1 - 0,30) = 150.000 \\cdot 0,90 \\cdot 0,70 = 150.000 \\cdot 0,63 = 94.500$$
O preço de venda é calculado aplicando-se um acréscimo de 40% sobre o valor residual atual ($V_1 = \\text{R\\$\\ } 94.500,00$):
$$V_{\\text{venda}} = 94.500 \\cdot (1 + 0,40) = 94.500 \\cdot 1,40 = 132.300$$
Portanto, o proprietário venderá o veículo por R$ 132.300,00.""",
        "estrategias_esperadas": "Aplicação de fatores sucessivos de desconto multiplicativos (0,90 × 0,70) seguidos de fator de acréscimo (1,40), resultando na alternativa d."
    },
    {
        "id": 22968,
        "mathnet_id": "ESCOLA_NAVAL_2026_Q17",
        "gabarito": "B",
        "enunciado": """Seja $B$ uma matriz quadrada de ordem $n$ e $I_n$ a matriz identidade de ordem $n$, tal que:
$$B \\cdot \\overline{B} = \\overline{B} \\cdot B = \\det(B) \\cdot I_n$$
em que $\\overline{B}$ é a matriz adjunta de $B$. Existe um teorema em Matemática que envolve a estrutura matemática acima. Um aspirante para prová-lo enuncia que:
$$B \\cdot \\overline{B} = (b_{ik})$$
Daí, por produto de matrizes, temos:
$$b_{ik} = \\sum_{j=1}^n a_{ij} \\cdot \\overline{B}_{jk} = \\sum_{j=1}^n a_{ij} \\cdot A_{kj}$$
logo,
se $i = k \\implies b_{ik} = \\det(B)$ (1) e
se $i \\neq k \\implies b_{ik} = 0$ (2)

Sendo assim, considerando que o aspirante tenha enunciado e feito a demonstração do teorema corretamente, os teoremas das condições (1) e (2) são, respectivamente, os teoremas de:

(a) Chió e Laplace
(b) Laplace e Cauchy
(c) Cramer e Laplace
(d) Cauchy e Laplace
(e) Chió e Binet""",
        "solucao": """A condição (1) afirma que a soma dos produtos dos elementos de uma linha pelos seus respectivos cofatores é igual ao determinante da matriz:
$$\\sum_{j=1}^n a_{ij} A_{ij} = \\det(B)$$
Este é o clássico Teorema de Laplace para o desenvolvimento de determinantes.

A condição (2) afirma que a soma dos produtos dos elementos de uma linha pelos cofatores de uma linha paralela distinta é igual a zero:
$$\\sum_{j=1}^n a_{ij} A_{kj} = 0 \\quad (i \\neq k)$$
Este é o Teorema de Cauchy (ou Teorema de Jacobi/Laplace complementar sobre filas paralelas).
Portanto, os teoremas são, respectivamente, Laplace e Cauchy (alternativa b).""",
        "estrategias_esperadas": "Identificação estrutural da definição de determinante via expansão de Laplace na diagonal principal e anulação de linhas por cofatores paralelos via Teorema de Cauchy (alternativa b)."
    },
    {
        "id": 22969,
        "mathnet_id": "ESCOLA_NAVAL_2026_Q18",
        "gabarito": "A",
        "enunciado": """Sejam $f$ e $g$ duas funções definidas por $f(x) = ax^2 - 7$ e $g(x) = -x^2 + 1$, com $a \\in \\mathbb{R}$. Assinale a opção que apresenta o valor de $a$ para que os gráficos de $f$ e $g$ se intersectem ortogonalmente.

(a) $\\frac{1}{31}$
(b) $\\frac{27}{4}$
(c) $\\frac{17}{27}$
(d) $\\frac{1}{17}$
(e) $\\frac{7}{14}$""",
        "solucao": """As curvas se intersectam quando $f(x) = g(x)$:
$$ax^2 - 7 = -x^2 + 1 \\implies (a + 1)x^2 = 8 \\implies x^2 = \\frac{8}{a + 1}$$
Para que a interseção seja ortogonal, o produto das derivadas no ponto de contato deve ser igual a $-1$:
$$f'(x) = 2ax, \\quad g'(x) = -2x$$
$$f'(x) \\cdot g'(x) = -1 \\implies (2ax)(-2x) = -1 \\implies -4ax^2 = -1 \\implies 4ax^2 = 1 \\implies x^2 = \\frac{1}{4a}$$
Igualando as duas expressões de $x^2$:
$$\\frac{8}{a + 1} = \\frac{1}{4a} \\implies 32a = a + 1 \\implies 31a = 1 \\implies a = \\frac{1}{31}$$""",
        "estrategias_esperadas": "Condição de ortogonalidade de curvas f'(x)·g'(x) = -1 combinada com a igualdade f(x) = g(x) para isolar o parâmetro a = 1/31 (alternativa a)."
    },
    {
        "id": 22970,
        "mathnet_id": "ESCOLA_NAVAL_2026_Q19",
        "gabarito": "E",
        "enunciado": """Sabe-se que em Matemática uma proposição ou sentença é toda oração declarativa que pode ser classificada em verdadeira ou falsa. Sejam $m$ e $n$ proposições lógicas, considere que $(m \\to n) \\iff (\\sim n \\to \\sim m)$. Assim, assinale a opção que apresenta a sequência lógica da relação $(\\sim n \\to \\sim m)$, obtida em uma tabela-verdade construída na ordem usual das proposições $m$ e $n$ (isto é, VV, VF, FV, FF).

(a) V, V, V, F
(b) V, F, V, F
(c) V, F, F, V
(d) V, V, F, F
(e) V, F, V, V""",
        "solucao": """A ordem usual das valorações para duas proposições $m$ e $n$ é:
1. $m = V, n = V \\implies \\sim n = F, \\sim m = F \\implies (F \\to F) = V$
2. $m = V, n = F \\implies \\sim n = V, \\sim m = F \\implies (V \\to F) = F$
3. $m = F, n = V \\implies \\sim n = F, \\sim m = V \\implies (F \\to V) = V$
4. $m = F, n = F \\implies \\sim n = V, \\sim m = V \\implies (V \\to V) = V$

Portanto, a coluna resultante da relação contrapositiva $(\\sim n \\to \\sim m)$ é exatamente V, F, V, V (alternativa e).""",
        "estrategias_esperadas": "Construção passo a passo da tabela-verdade da condicional contrapositiva (~n → ~m) na ordem canônica VV, VF, FV, FF (alternativa e)."
    },
    {
        "id": 22971,
        "mathnet_id": "ESCOLA_NAVAL_2026_Q20",
        "gabarito": "B",
        "enunciado": """Em um pleito eleitoral no Brasil, as eleições são divididas em dois turnos. Sabe-se que existem 5 (cinco) candidatos para a disputa para a presidência da República no Brasil. As pesquisas eleitorais são permitidas de acordo com as leis vigentes do país. Um instituto de pesquisa de notoriedade revelou que a probabilidade de um candidato "A" ganhar em primeiro turno da eleição é igual à probabilidade de "B" ganhar. A probabilidade de "C" ganhar é um terço desta probabilidade, enquanto a probabilidade de "D" ganhar é igual à de "E" ganhar, correspondendo ao dobro da probabilidade de "C" ganhar. Supondo que "A" e "D" tenham passado para o segundo turno da eleição, mantendo-se proporcionalmente as chances de ganhar, calcule a probabilidade de "A" vencer no segundo turno e assinale a opção correta.

(a) $\\frac{2}{5}$
(b) $\\frac{3}{5}$
(c) $\\frac{3}{11}$
(d) $\\frac{5}{11}$
(e) $\\frac{6}{11}$""",
        "solucao": """Seja $P(A) = P(B) = k$.
A probabilidade de $C$ é $P(C) = \\frac{k}{3}$.
A probabilidade de $D$ e $E$ é $P(D) = P(E) = 2 \\cdot P(C) = \\frac{2k}{3}$.
No segundo turno disputado entre $A$ e $D$, mantendo-se a proporcionalidade relativa entre eles, a probabilidade condicional de $A$ vencer é:
$$P(A \\mid A \\cup D) = \\frac{P(A)}{P(A) + P(D)} = \\frac{k}{k + \\frac{2k}{3}} = \\frac{k}{\\frac{5k}{3}} = \\frac{3}{5}$$
Portanto, a probabilidade de $A$ vencer no segundo turno é $\\frac{3}{5}$ (alternativa b).""",
        "estrategias_esperadas": "Normalização de probabilidades a um parâmetro proporcional k e cálculo de probabilidade condicional de segundo turno restrito ao espaço amostral A ∪ D (alternativa b)."
    },
    {
        "id": 22972,
        "mathnet_id": "ESCOLA_NAVAL_2026_Q21",
        "gabarito": "D",
        "enunciado": """Assinale a opção que apresenta o valor de $\\left(\\sum_{n=1}^{+\\infty} \\left(\\frac{1}{3^n} + \\frac{1}{2^n}\\right)\\right)^4$.

(a) $\\frac{70}{29}$
(b) $\\frac{70}{79}$
(c) $\\frac{79}{16}$
(d) $\\frac{81}{16}$
(e) $\\frac{80}{61}$""",
        "solucao": """A soma infinita pode ser separada em duas séries geométricas convergentes:
$$\\sum_{n=1}^{+\\infty} \\left(\\frac{1}{3^n} + \\frac{1}{2^n}\\right) = \\sum_{n=1}^{+\\infty} \\left(\\frac{1}{3}\\right)^n + \\sum_{n=1}^{+\\infty} \\left(\\frac{1}{2}\\right)^n$$
1) Para a primeira série geométrica: $a_1 = \\frac{1}{3}$ e razão $q = \\frac{1}{3}$:
$$S_1 = \\frac{\\frac{1}{3}}{1 - \\frac{1}{3}} = \\frac{\\frac{1}{3}}{\\frac{2}{3}} = \\frac{1}{2}$$
2) Para a segunda série geométrica: $b_1 = \\frac{1}{2}$ e razão $q' = \\frac{1}{2}$:
$$S_2 = \\frac{\\frac{1}{2}}{1 - \\frac{1}{2}} = \\frac{\\frac{1}{2}}{\\frac{1}{2}} = 1$$
A soma total no interior dos parênteses é:
$$S = S_1 + S_2 = \\frac{1}{2} + 1 = \\frac{3}{2}$$
Elevando à quarta potência:
$$S^4 = \\left(\\frac{3}{2}\\right)^4 = \\frac{81}{16}$$""",
        "estrategias_esperadas": "Linearidade de séries infinitas, fórmula da soma de progressão geométrica infinita S = a1/(1-q) e exponenciação da soma (alternativa d)."
    },
    {
        "id": 22973,
        "mathnet_id": "ESCOLA_NAVAL_2026_Q22",
        "gabarito": "A",
        "enunciado": """Considere a equação da curva no $\\mathbb{R}^2$:
$$x^2 + 16y^2 + 2mxy - 1 = 0$$
Qual é o valor estabelecido plenamente sobre $m$ de modo que a curva represente uma hipérbole?

(a) $m < -4$ ou $m > 4$
(b) $m < -5$ ou $m > 2$
(c) $-2 < m < 2$
(d) $m < -8$
(e) $m > 8$""",
        "solucao": """A equação geral de uma cônica é dada por $Ax^2 + Bxy + Cy^2 + Dx + Ey + F = 0$.
No caso:
$$A = 1, \\quad B = 2m, \\quad C = 16, \\quad F = -1$$
O indicador discriminante da cônica $\\Delta$ é dado por:
$$\\Delta = B^2 - 4AC = (2m)^2 - 4(1)(16) = 4m^2 - 64$$
Para que a curva represente uma hipérbole não-degenerada, o discriminante deve ser estritamente positivo:
$$\\Delta > 0 \\iff 4m^2 - 64 > 0 \\iff m^2 - 16 > 0 \\iff m < -4 \\text{ ou } m > 4$$
Portanto, a condição necessária e suficiente é $m < -4$ ou $m > 4$ (alternativa a).""",
        "estrategias_esperadas": "Classificação de cônicas gerais em R² via indicador discriminante B² - 4AC > 0 para hipérbole (alternativa a)."
    }
]

def main():
    print(f"🚀 Iniciando curadoria em lote de {len(UPDATES)} questões da Escola Naval 2026...")
    success_count = 0
    for q in UPDATES:
        qid = q["id"]
        mathnet = q["mathnet_id"]
        payload = {
            "enunciado": q["enunciado"],
            "gabarito": q["gabarito"],
            "solucao": q["solucao"],
            "estrategias_esperadas": q["estrategias_esperadas"]
        }
        url = f"{SUPABASE_URL}/rest/v1/questoes?id=eq.{qid}"
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=HEADERS, method="PATCH")
        try:
            with urllib.request.urlopen(req, timeout=12.0) as resp:
                res = json.loads(resp.read().decode("utf-8", errors="replace"))
                if res:
                    print(f"✓ Questão #{qid} ({mathnet}) atualizada com sucesso! Gabarito: {res[0]['gabarito']}")
                    success_count += 1
                else:
                    print(f"⚠️ Questão #{qid} retornou vazio")
        except Exception as e:
            print(f"❌ Erro ao atualizar questão #{qid}: {e}")

    print(f"\n🎉 Curadoria concluída: {success_count}/{len(UPDATES)} questões atualizadas com perfeição!")

if __name__ == "__main__":
    main()
