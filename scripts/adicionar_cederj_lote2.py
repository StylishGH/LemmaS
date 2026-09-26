"""
Lote 2 de Questões do CEDERJ: Cálculo 3 e Álgebra Linear.
Adiciona 16 questões autênticas com gabaritos detalhados e estratégias pedagógicas.
"""

import sys
import json
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

from src.database.db import pegar_conexao, DB_PATH

QUESTOES_CEDERJ_LOTE2 = [
    # =========================================================================
    # CÁLCULO 3 (CEDERJ - LOTE 2)
    # =========================================================================
    {
        "materia": "Cálculo 3",
        "topico": "Curvas no Espaço e Parametrização",
        "subtopico": "Reta Tangente e Vetor Velocidade da Hélice",
        "dificuldade": 3,
        "banca": "CEDERJ",
        "ano": 2022,
        "tipo": "objetiva",
        "enunciado": (
            "Considere a curva espacial (hélice circular) parametrizada por "
            "$\\vec{\\alpha}(t) = (2\\cos t, \\, 2\\operatorname{sen} t, \\, 3t)$, com $t \\in [0, 4\\pi]$.\n\n"
            "A equação vetorial da reta tangente a essa curva no ponto correspondente a $t = \\frac{\\pi}{2}$ é dada por:\n\n"
            "(A) $\\vec{r}(\\lambda) = (0, \\, 2, \\, \\frac{3\\pi}{2}) + \\lambda(-2, \\, 0, \\, 3), \\quad \\lambda \\in \\mathbb{R}$\n"
            "(B) $\\vec{r}(\\lambda) = (2, \\, 0, \\, \\frac{3\\pi}{2}) + \\lambda(0, \\, 2, \\, 3), \\quad \\lambda \\in \\mathbb{R}$\n"
            "(C) $\\vec{r}(\\lambda) = (0, \\, 2, \\, 3\\pi) + \\lambda(-2, \\, 2, \\, 3), \\quad \\lambda \\in \\mathbb{R}$\n"
            "(D) $\\vec{r}(\\lambda) = (0, \\, 2, \\, \\frac{3\\pi}{2}) + \\lambda(2, \\, 0, \\, -3), \\quad \\lambda \\in \\mathbb{R}$\n"
            "(E) $\\vec{r}(\\lambda) = (-2, \\, 0, \\, 3) + \\lambda(0, \\, 2, \\, \\frac{3\\pi}{2}), \\quad \\lambda \\in \\mathbb{R}$"
        ),
        "gabarito": "A",
        "estrategias_esperadas": json.dumps([
            "Derivada Componente a Componente para Obter o Vetor Tangente alpha'(t)",
            "Avaliação do Ponto de Tangência alpha(pi/2)",
            "Montagem da Equação Paramétrica da Reta r(lambda) = P + lambda*v"
        ], ensure_ascii=False)
    },
    {
        "materia": "Cálculo 3",
        "topico": "Curvas no Espaço e Parametrização",
        "subtopico": "Comprimento de Arco de Curva Espacial",
        "dificuldade": 3,
        "banca": "CEDERJ",
        "ano": 2022,
        "tipo": "objetiva",
        "enunciado": (
            "O comprimento de arco $L$ de uma curva regular $\\vec{r}(t)$ no intervalo $t \\in [a, b]$ é dado pela integral $L = \\int_a^b \\|\\vec{r}'(t)\\| \\, dt$.\n\n"
            "Calcule o comprimento da curva $\\vec{r}(t) = \\left( \\cos t, \\; \\operatorname{sen} t, \\; \\frac{2}{3}t^{3/2} \\right)$ para $t \\in [0, 3]$:\n\n"
            "(A) $\\frac{14}{3}$\n"
            "(B) $\\frac{16}{3}$\n"
            "(C) $7$\n"
            "(D) $\\frac{19}{3}$\n"
            "(E) $8$"
        ),
        "gabarito": "A",
        "estrategias_esperadas": json.dumps([
            "Derivação Vetorial r'(t) = (-sen t, cos t, t^(1/2))",
            "Cálculo da Norma Euclidiana ||r'(t)|| = sqrt(sen^2 t + cos^2 t + t) = sqrt(1 + t)",
            "Integração por Substituição Simples Integral_0^3 (1 + t)^(1/2) dt"
        ], ensure_ascii=False)
    },
    {
        "materia": "Cálculo 3",
        "topico": "Funções de Várias Variáveis",
        "subtopico": "Curvas de Nível e Geometria do Plano",
        "dificuldade": 2,
        "banca": "CEDERJ",
        "ano": 2022,
        "tipo": "objetiva",
        "enunciado": (
            "A temperatura em cada ponto do plano $xy$ é dada pela função $T(x, y) = x^2 + 3y^2$.\n\n"
            "As curvas de nível de temperatura constante $T(x, y) = c$ (com $c > 0$) e a equação da curva de nível que passa pelo ponto $P(2, 1)$ são, respectivamente:\n\n"
            "(A) Círculos concêntricos e $x^2 + 3y^2 = 5$\n"
            "(B) Elipses concêntricas e $x^2 + 3y^2 = 7$\n"
            "(C) Hipérboles equiláteras e $x^2 - 3y^2 = 1$\n"
            "(D) Parábolas com vértice na origem e $y = 3x^2 + 7$\n"
            "(E) Elipses com focos no eixo $x$ e $x^2 + 3y^2 = 4$"
        ),
        "gabarito": "B",
        "estrategias_esperadas": json.dumps([
            "Definição de Curva de Nível f(x, y) = c",
            "Reconhecimento da Equação de Elipse com Coeficientes Positivos Diferentes",
            "Substituição das Coordenadas do Ponto P(2, 1) para Encontrar a Constante c = 2^2 + 3(1)^2 = 7"
        ], ensure_ascii=False)
    },
    {
        "materia": "Cálculo 3",
        "topico": "Limites de Funções de Várias Variáveis",
        "subtopico": "Inexistência de Limite via Regra dos Dois Caminhos",
        "dificuldade": 3,
        "banca": "CEDERJ",
        "ano": 2022,
        "tipo": "discursiva",
        "enunciado": (
            "Considere a função real de duas variáveis reais:\n\n"
            "$$f(x, y) = \\frac{2xy^2}{x^2 + y^4}, \\quad (x, y) \\neq (0, 0)$$\n\n"
            "Mostre detalhadamente que o limite $\\lim_{(x, y) \\to (0, 0)} f(x, y)$ **NÃO existe**, "
            "comparando o comportamento da função ao longo de:\n"
            "1. Retas que passam pela origem da forma $x = my$;\n"
            "2. Parábolas da forma $x = k y^2$."
        ),
        "gabarito": (
            "Demonstração pela Regra dos Dois Caminhos: "
            "1. Caminho por retas x = my: "
            "lim_{y->0} f(my, y) = lim_{y->0} (2*(my)*y^2) / ((my)^2 + y^4) = lim_{y->0} (2m*y^3) / (y^2*(m^2 + y^2)) = lim_{y->0} (2m*y) / (m^2 + y^2) = 0 (para m != 0). "
            "Ao longo do eixo x (y = 0) ou eixo y (x = 0), a função também é identicamente nula, sugerindo que o limite poderia ser 0. "
            "2. Caminho por parábolas x = k*y^2: "
            "lim_{y->0} f(k*y^2, y) = lim_{y->0} (2*(k*y^2)*y^2) / ((k*y^2)^2 + y^4) = lim_{y->0} (2k*y^4) / (k^2*y^4 + y^4) = lim_{y->0} (2k) / (k^2 + 1) = (2k) / (k^2 + 1). "
            "Note que este valor depende diretamente de k (por exemplo, se k = 1 o limite é 2/2 = 1; se k = -1 o limite é -1; se k = 0 o limite é 0). "
            "Como o limite assume valores distintos dependendo da trajetória de aproximação à origem, concluímos rigorosamente que o limite NÃO existe."
        ),
        "estrategias_esperadas": json.dumps([
            "Aproximação por Retas Lineares x = my Resultando em Limite 0",
            "Aproximação por Trajetórias Parabólicas x = ky^2 Balanceando os Graus do Denominador",
            "Conclusão pelo Teorema dos Limites Direcionais Distintos"
        ], ensure_ascii=False)
    },
    {
        "materia": "Cálculo 3",
        "topico": "Derivadas Parciais e Diferenciabilidade",
        "subtopico": "Plano Tangente a Superfície Explícita",
        "dificuldade": 2,
        "banca": "CEDERJ",
        "ano": 2022,
        "tipo": "objetiva",
        "enunciado": (
            "Considere o paraboloide elíptico dado pelo gráfico da função $z = f(x, y) = 4x^2 + y^2$.\n\n"
            "A equação do plano tangente a essa superfície no ponto $P(1, \\, 2, \\, 8)$ é:\n\n"
            "(A) $8x + 4y - z = 8$\n"
            "(B) $4x + 2y - z = 0$\n"
            "(C) $8x + 4y + z = 24$\n"
            "(D) $8x - 4y - z = -8$\n"
            "(E) $2x + y - z = -5$"
        ),
        "gabarito": "A",
        "estrategias_esperadas": json.dumps([
            "Cálculo das Derivadas Parciais fx = 8x e fy = 2y",
            "Avaliação no Ponto de Tangência fx(1, 2) = 8 e fy(1, 2) = 4",
            "Aplicação da Fórmula do Plano Tangente z - z0 = fx*(x - x0) + fy*(y - y0)"
        ], ensure_ascii=False)
    },
    {
        "materia": "Cálculo 3",
        "topico": "Derivada Direcional e Vetor Gradiente",
        "subtopico": "Máxima Taxa de Variação e Direção de Máximo Crescimento",
        "dificuldade": 3,
        "banca": "CEDERJ",
        "ano": 2022,
        "tipo": "discursiva",
        "enunciado": (
            "Seja a função de distribuição de temperatura $T(x, y) = x^2 + 3y^2$ e o ponto $P(2, 1)$.\n\n"
            "(a) Calcule o vetor gradiente $\\nabla T$ no ponto $P(2, 1)$;\n"
            "(b) Determine a taxa máxima de variação da temperatura a partir de $P$ e o vetor unitário $\\vec{u}$ na direção em que essa máxima taxa ocorre;\n"
            "(c) Determine a taxa de variação da temperatura na direção do vetor $\\vec{v} = (3, 4)$."
        ),
        "gabarito": (
            "(a) As derivadas parciais são Tx(x, y) = 2x e Ty(x, y) = 6y. "
            "No ponto P(2, 1): Tx(2, 1) = 2(2) = 4 e Ty(2, 1) = 6(1) = 6. "
            "Logo, o vetor gradiente é nabla T(2, 1) = (4, 6). "
            "(b) A taxa máxima de variação ocorre na direção do gradiente e seu valor é a norma do gradiente: "
            "||nabla T(2, 1)|| = sqrt(4^2 + 6^2) = sqrt(16 + 36) = sqrt(52) = 2*sqrt(13). "
            "O vetor unitário na direção de máxima variação é u = nabla T / ||nabla T|| = (4/(2*sqrt(13)), 6/(2*sqrt(13))) = (2/sqrt(13), 3/sqrt(13)). "
            "(c) O vetor unitário na direção de v = (3, 4) é u_v = (3, 4)/sqrt(3^2 + 4^2) = (3/5, 4/5). "
            "A derivada direcional é D_v T(2, 1) = nabla T(2, 1) . u_v = 4*(3/5) + 6*(4/5) = 12/5 + 24/5 = 36/5 = 7.2."
        ),
        "estrategias_esperadas": json.dumps([
            "Cálculo do Gradiente via Derivadas Parciais nabla T = (Tx, Ty)",
            "Teorema do Gradiente para Taxa Máxima de Variação ||nabla T||",
            "Produto Escalar da Derivada Direcional D_u T = nabla T . u_unitario"
        ], ensure_ascii=False)
    },
    {
        "materia": "Cálculo 3",
        "topico": "Regra da Cadeia Multivariada",
        "subtopico": "Transformação para Coordenadas Polares",
        "dificuldade": 4,
        "banca": "CEDERJ",
        "ano": 2022,
        "tipo": "objetiva",
        "enunciado": (
            "Seja $z = f(x, y)$ uma função com derivadas parciais contínuas, onde $x = r\\cos\\theta$ e $y = r\\operatorname{sen}\\theta$.\n\n"
            "Utilizando a Regra da Cadeia, a expressão da soma dos quadrados das derivadas parciais cartesianas "
            "$\\left(\\frac{\\partial z}{\\partial x}\\right)^2 + \\left(\\frac{\\partial z}{\\partial y}\\right)^2$ em termos das coordenadas polares $r$ e $\\theta$ é igual a:\n\n"
            "(A) $\\left(\\frac{\\partial z}{\\partial r}\\right)^2 + \\left(\\frac{\\partial z}{\\partial \\theta}\\right)^2$\n"
            "(B) $\\left(\\frac{\\partial z}{\\partial r}\\right)^2 + \\frac{1}{r^2}\\left(\\frac{\\partial z}{\\partial \\theta}\\right)^2$\n"
            "(C) $r^2 \\left(\\frac{\\partial z}{\\partial r}\\right)^2 + \\left(\\frac{\\partial z}{\\partial \\theta}\\right)^2$\n"
            "(D) $\\frac{1}{r}\\left(\\frac{\\partial z}{\\partial r}\\right)^2 + \\frac{1}{r^2}\\left(\\frac{\\partial z}{\\partial \\theta}\\right)^2$\n"
            "(E) $\\left(\\frac{\\partial z}{\\partial r}\\right)^2 - \\frac{1}{r^2}\\left(\\frac{\\partial z}{\\partial \\theta}\\right)^2$"
        ),
        "gabarito": "B",
        "estrategias_esperadas": json.dumps([
            "Derivação em Cadeia z_r = z_x*cos theta + z_y*sen theta",
            "Derivação em Cadeia z_theta = -r*z_x*sen theta + r*z_y*cos theta",
            "Combinação Quadrática (z_r)^2 + (1/r^2)*(z_theta)^2 = (z_x)^2 + (z_y)^2"
        ], ensure_ascii=False)
    },
    {
        "materia": "Cálculo 3",
        "topico": "Otimização e Máximos e Mínimos",
        "subtopico": "Método dos Multiplicadores de Lagrange",
        "dificuldade": 3,
        "banca": "CEDERJ",
        "ano": 2022,
        "tipo": "discursiva",
        "enunciado": (
            "Utilize o **Método dos Multiplicadores de Lagrange** para determinar o ponto da reta $x + 2y = 10$ "
            "que está mais próximo da origem $(0, 0)$.\n\n"
            "Dica: Minimizando o quadrado da distância $f(x, y) = x^2 + y^2$ sob a restrição $g(x, y) = x + 2y - 10 = 0$."
        ),
        "gabarito": (
            "Função a minimizar: f(x, y) = x^2 + y^2. "
            "Função de restrição: g(x, y) = x + 2y = 10. "
            "Pelo método de Lagrange: nabla f = lambda * nabla g. "
            "Calculando os gradientes: nabla f = (2x, 2y) e nabla g = (1, 2). "
            "Isso gera o sistema: "
            "1) 2x = lambda * 1 => lambda = 2x "
            "2) 2y = lambda * 2 => lambda = y "
            "Igualando os lambdas: y = 2x. "
            "Substituindo na restrição x + 2y = 10: "
            "x + 2(2x) = 10 => 5x = 10 => x = 2. "
            "Logo, y = 2(2) = 4. "
            "O ponto mais próximo da origem é (2, 4) e a distância mínima é d = sqrt(2^2 + 4^2) = sqrt(20) = 2*sqrt(5)."
        ),
        "estrategias_esperadas": json.dumps([
            "Formulação do Problema de Otimização via Quadrado da Distância",
            "Montagem do Sistema de Lagrange nabla f = lambda * nabla g",
            "Resolução das Relações Lineares entre as Coordenadas e Restrição"
        ], ensure_ascii=False)
    },

    # =========================================================================
    # ÁLGEBRA LINEAR (CEDERJ - LOTE 2)
    # =========================================================================
    {
        "materia": "Álgebra Linear",
        "topico": "Espaços Vetoriais e Combinação Linear",
        "subtopico": "Representação de Polinômio por Combinação Linear",
        "dificuldade": 3,
        "banca": "CEDERJ",
        "ano": 2021,
        "tipo": "discursiva",
        "enunciado": (
            "No espaço vetorial dos polinômios de grau menor ou igual a 2 ($P_2(\\mathbb{R})$), "
            "escreva o polinômio $p(x) = 5 - 3x + 2x^2$ como combinação linear dos polinômios:\n\n"
            "$$m(x) = 2 + 4x + x^2, \\quad n(x) = 1 - 2x + 3x^2, \\quad q(x) = 1 + x + x^2$$\n\n"
            "Determine explicitamente os coeficientes escalares $\\alpha, \\beta, \\gamma \\in \\mathbb{R}$ tais que $p(x) = \\alpha m(x) + \\beta n(x) + \\gamma q(x)$."
        ),
        "gabarito": (
            "Queremos determinar alfa, beta, gamma tais que: "
            "5 - 3x + 2x^2 = alfa*(2 + 4x + x^2) + beta*(1 - 2x + 3x^2) + gamma*(1 + x + x^2). "
            "Agrupando por potências de x: "
            "Termo constante: 2*alfa + beta + gamma = 5 "
            "Termo em x: 4*alfa - 2*beta + gamma = -3 "
            "Termo em x^2: alfa + 3*beta + gamma = 2. "
            "Subtraindo a 1ª da 2ª: 2*alfa - 3*beta = -8. "
            "Subtraindo a 1ª da 3ª: -alfa + 2*beta = -3 => alfa = 2*beta + 3. "
            "Substituindo: 2*(2*beta + 3) - 3*beta = -8 => 4*beta + 6 - 3*beta = -8 => beta = -14. "
            "Então: alfa = 2*(-14) + 3 = -28 + 3 = -25. "
            "Da 1ª equação: 2*(-25) + (-14) + gamma = 5 => -50 - 14 + gamma = 5 => gamma = 69. "
            "Portanto, os escalares são alfa = -25, beta = -14 e gamma = 69, ou seja, p(x) = -25*m(x) - 14*n(x) + 69*q(x)."
        ),
        "estrategias_esperadas": json.dumps([
            "Igualdade Polinomial Coeficiente a Coeficiente",
            "Montagem do Sistema Linear 3x3 de Escalares",
            "Resolução do Sistema por Substituição ou Escalonamento"
        ], ensure_ascii=False)
    },
    {
        "materia": "Álgebra Linear",
        "topico": "Espaços com Produto Interno",
        "subtopico": "Produto Interno Euclidiano, Norma e Ângulo",
        "dificuldade": 2,
        "banca": "CEDERJ",
        "ano": 2021,
        "tipo": "objetiva",
        "enunciado": (
            "Considere o espaço euclidiano $\\mathbb{R}^3$ munido do produto interno usual. "
            "Sejam os vetores $\\vec{u} = (1, \\, -2, \\, 2)$ e $\\vec{v} = (4, \\, 0, \\, -2)$.\n\n"
            "O produto interno $\\langle \\vec{u}, \\vec{v} \\rangle$, a norma $\\|\\vec{u}\\|$ e o cosseno do ângulo $\\theta$ entre $\\vec{u}$ e $\\vec{v}$ valem, respectivamente:\n\n"
            "(A) $\\langle \\vec{u}, \\vec{v} \\rangle = 0, \\quad \\|\\vec{u}\\| = 3, \\quad \\cos\\theta = 0 \\quad (\\text{vetores ortogonais})$\n"
            "(B) $\\langle \\vec{u}, \\vec{v} \\rangle = 4, \\quad \\|\\vec{u}\\| = 9, \\quad \\cos\\theta = \\frac{4}{9}$\n"
            "(C) $\\langle \\vec{u}, \\vec{v} \\rangle = 2, \\quad \\|\\vec{u}\\| = 3, \\quad \\cos\\theta = \\frac{1}{3\\sqrt{5}}$\n"
            "(D) $\\langle \\vec{u}, \\vec{v} \\rangle = 0, \\quad \\|\\vec{u}\\| = 9, \\quad \\cos\\theta = 1$\n"
            "(E) $\\langle \\vec{u}, \\vec{v} \\rangle = -4, \\quad \\|\\vec{u}\\| = 3, \\quad \\cos\\theta = -\\frac{4}{3\\sqrt{20}}$"
        ),
        "gabarito": "A",
        "estrategias_esperadas": json.dumps([
            "Cálculo do Produto Interno <u, v> = u1*v1 + u2*v2 + u3*v3 = 4 + 0 - 4 = 0",
            "Cálculo da Norma Euclidiana ||u|| = sqrt(1^2 + (-2)^2 + 2^2) = sqrt(9) = 3",
            "Identificação da Ortogonalidade quando o Produto Interno se Anula"
        ], ensure_ascii=False)
    },
    {
        "materia": "Álgebra Linear",
        "topico": "Espaços com Produto Interno",
        "subtopico": "Projeção Ortogonal de Vetores",
        "dificuldade": 2,
        "banca": "CEDERJ",
        "ano": 2021,
        "tipo": "objetiva",
        "enunciado": (
            "A projeção ortogonal do vetor $\\vec{u}$ sobre a direção do vetor não nulo $\\vec{v}$ é dada por "
            "$\\operatorname{proj}_{\\vec{v}}(\\vec{u}) = \\frac{\\langle \\vec{u}, \\vec{v} \\rangle}{\\|\\vec{v}\\|^2} \\vec{v}$.\n\n"
            "Dados $\\vec{u} = (-1, \\, 1, \\, 1)$ e $\\vec{v} = (2, \\, 1, \\, -2)$ em $\\mathbb{R}^3$, a projeção $\\operatorname{proj}_{\\vec{v}}(\\vec{u})$ é igual a:\n\n"
            "(A) $\\left( -\\frac{2}{3}, \\; -\\frac{1}{3}, \\; \\frac{2}{3} \\right)$\n"
            "(B) $\\left( -\\frac{2}{9}, \\; -\\frac{1}{9}, \\; \\frac{2}{9} \\right)$\n"
            "(C) $\\left( \\frac{2}{3}, \\; \\frac{1}{3}, \\; -\\frac{2}{3} \\right)$\n"
            "(D) $( -2, \\; -1, \\; 2 )$\n"
            "(E) $( 0, \\; 0, \\; 0 )$"
        ),
        "gabarito": "A",
        "estrategias_esperadas": json.dumps([
            "Cálculo do Produto Escalar <u, v> = (-1)*2 + 1*1 + 1*(-2) = -2 + 1 - 2 = -3",
            "Cálculo do Quadrado da Norma ||v||^2 = 2^2 + 1^2 + (-2)^2 = 4 + 1 + 4 = 9",
            "Multiplicação pelo Vetor v: (-3/9)*(2, 1, -2) = (-1/3)*(2, 1, -2) = (-2/3, -1/3, 2/3)"
        ], ensure_ascii=False)
    },
    {
        "materia": "Álgebra Linear",
        "topico": "Espaços Vetoriais e Base",
        "subtopico": "Dependência Linear e Independência Linear (LI vs LD)",
        "dificuldade": 3,
        "banca": "CEDERJ",
        "ano": 2021,
        "tipo": "discursiva",
        "enunciado": (
            "Considere o conjunto de vetores de $\\mathbb{R}^3$:\n\n"
            "$$S = \\left\\{ \\vec{v}_1 = (1, 2, 3), \\; \\vec{v}_2 = (0, 1, 2), \\; \\vec{v}_3 = (2, 5, 8) \\right\\}$$\n\n"
            "Determine formalmente se o conjunto $S$ é **Linearmente Independente (LI)** ou **Linearmente Dependente (LD)**. "
            "Se for LD, expresse um dos vetores como combinação linear dos demais."
        ),
        "gabarito": (
            "O conjunto S é Linearmente Dependente (LD). "
            "Demonstração: "
            "Montando a equação vetorial c1*v1 + c2*v2 + c3*v3 = (0, 0, 0): "
            "c1*(1, 2, 3) + c2*(0, 1, 2) + c3*(2, 5, 8) = (0, 0, 0). "
            "Isso gera a matriz dos coeficientes com os vetores nas colunas: "
            "A = [[1, 0, 2], [2, 1, 5], [3, 2, 8]]. "
            "Calculando o determinante de A: "
            "det(A) = 1*(8 - 10) - 0 + 2*(4 - 3) = 1*(-2) + 2*(1) = -2 + 2 = 0. "
            "Como det(A) = 0, o sistema homogêneo admite soluções não triviais, logo S é LD. "
            "Relação de dependência linear: "
            "Notemos que v3 = 2*v1 + 1*v2, pois 2*(1, 2, 3) + (0, 1, 2) = (2, 4, 6) + (0, 1, 2) = (2, 5, 8) = v3."
        ),
        "estrategias_esperadas": json.dumps([
            "Critério do Determinante para n Vetores em R^n",
            "Identificação da Relação de Dependência v3 = 2*v1 + v2",
            "Definição Formal de Solução Não Trivial c1*v1 + c2*v2 + c3*v3 = 0"
        ], ensure_ascii=False)
    },
    {
        "materia": "Álgebra Linear",
        "topico": "Autovalores e Autovetores",
        "subtopico": "Cálculo de Autovalores via Polinômio Característico",
        "dificuldade": 3,
        "banca": "CEDERJ",
        "ano": 2021,
        "tipo": "objetiva",
        "enunciado": (
            "Os autovalores $\\lambda$ de uma matriz quadrada $A$ são as raízes da equação característica $\\det(A - \\lambda I) = 0$.\n\n"
            "Dada a matriz $A = \\begin{pmatrix} 4 & 2 \\\\ 1 & 3 \\end{pmatrix}$, os seus autovalores são:\n\n"
            "(A) $\\lambda_1 = 2$ e $\\lambda_2 = 5$\n"
            "(B) $\\lambda_1 = 1$ e $\\lambda_2 = 6$\n"
            "(C) $\\lambda_1 = 3$ e $\\lambda_2 = 4$\n"
            "(D) $\\lambda_1 = -2$ e $\\lambda_2 = -5$\n"
            "(E) $\\lambda_1 = 0$ e $\\lambda_2 = 7$"
        ),
        "gabarito": "A",
        "estrategias_esperadas": json.dumps([
            "Construção da Matriz Característica A - lambda*I",
            "Cálculo do Determinante det(A - lambda*I) = (4 - lambda)(3 - lambda) - 2",
            "Resolução da Equação Quadrática lambda^2 - 7*lambda + 10 = 0"
        ], ensure_ascii=False)
    },
    {
        "materia": "Álgebra Linear",
        "topico": "Autovalores e Autovetores",
        "subtopico": "Determinação de Autoespaços e Autovetores",
        "dificuldade": 3,
        "banca": "CEDERJ",
        "ano": 2021,
        "tipo": "discursiva",
        "enunciado": (
            "Para a matriz $A = \\begin{pmatrix} 4 & 2 \\\\ 1 & 3 \\end{pmatrix}$, que possui autovalores $\\lambda_1 = 2$ e $\\lambda_2 = 5$:\n\n"
            "(a) Determine uma base para o autoespaço $V_{\\lambda_1}$ correspondente ao autovalor $\\lambda_1 = 2$;\n"
            "(b) Determine uma base para o autoespaço $V_{\\lambda_2}$ correspondente ao autovalor $\\lambda_2 = 5$."
        ),
        "gabarito": (
            "(a) Para lambda_1 = 2, resolvemos (A - 2*I)*v = 0: "
            "[[4-2, 2], [1, 3-2]] * [x, y]^T = [0, 0]^T => [[2, 2], [1, 1]] * [x, y]^T = [0, 0]^T. "
            "Ambas as linhas geram a equação: x + y = 0 => y = -x. "
            "Logo os autovetores têm a forma (x, -x) = x*(1, -1), com x != 0. "
            "Uma base para V_2 é {(1, -1)}. "
            "(b) Para lambda_2 = 5, resolvemos (A - 5*I)*v = 0: "
            "[[4-5, 2], [1, 3-5]] * [x, y]^T = [0, 0]^T => [[-1, 2], [1, -2]] * [x, y]^T = [0, 0]^T. "
            "Ambas as linhas geram a equação: -x + 2y = 0 => x = 2y. "
            "Logo os autovetores têm a forma (2y, y) = y*(2, 1), com y != 0. "
            "Uma base para V_5 é {(2, 1)}."
        ),
        "estrategias_esperadas": json.dumps([
            "Resolução do Sistema Homogêneo (A - lambda*I)v = 0",
            "Identificação de Graus de Liberdade e Variáveis Livres",
            "Parametrização dos Autoespaços V_lambda"
        ], ensure_ascii=False)
    },
    {
        "materia": "Álgebra Linear",
        "topico": "Diagonalização de Operadores",
        "subtopico": "Critério de Diagonalizabilidade e Matrizes Deficientes",
        "dificuldade": 4,
        "banca": "CEDERJ",
        "ano": 2021,
        "tipo": "objetiva",
        "enunciado": (
            "Uma matriz $A$ de ordem $n \\times n$ é dita diagonalizável se, e somente se, admite $n$ autovetores linearmente independentes "
            "(a multiplicidade geométrica de cada autovalor é igual à sua multiplicidade algébrica).\n\n"
            "Analise a matriz $B = \\begin{pmatrix} 1 & 1 \\\\ 0 & 1 \\end{pmatrix}$. É correto afirmar que:\n\n"
            "(A) $B$ é diagonalizável, pois possui autovalor duplo $\\lambda = 1$ e dois autovetores LI.\n"
            "(B) $B$ NÃO é diagonalizável, pois o autovalor $\\lambda = 1$ possui multiplicidade algébrica 2, mas multiplicidade geométrica 1.\n"
            "(C) $B$ é diagonalizável, pois seu determinante é diferente de zero ($\\det(B) = 1$).\n"
            "(D) $B$ NÃO é diagonalizável, pois não possui autovalores reais.\n"
            "(E) $B$ é diagonalizável com matriz diagonal associada $D = \\begin{pmatrix} 1 & 0 \\\\ 0 & -1 \\end{pmatrix}$."
        ),
        "gabarito": "B",
        "estrategias_esperadas": json.dumps([
            "Cálculo do Polinômio Característico det(B - lambda*I) = (1 - lambda)^2 = 0",
            "Determinação do Autoespaço V_1 gerando y = 0 => (x, 0) com dimensão 1",
            "Comparação entre Multiplicidade Algébrica (2) e Geométrica (1) para Concluir Não Diagonalizabilidade"
        ], ensure_ascii=False)
    },
    {
        "materia": "Álgebra Linear",
        "topico": "Transformações e Operadores Ortogonais",
        "subtopico": "Matrizes de Rotação e Preservação de Comprimento",
        "dificuldade": 3,
        "banca": "CEDERJ",
        "ano": 2021,
        "tipo": "discursiva",
        "enunciado": (
            "Considere o operador linear de rotação em $\\mathbb{R}^2$ por um ângulo $\\theta$, representado na base canônica pela matriz:\n\n"
            "$$R_\\theta = \\begin{pmatrix} \\cos\\theta & -\\operatorname{sen}\\theta \\\\ \\operatorname{sen}\\theta & \\cos\\theta \\end{pmatrix}$$\n\n"
            "(a) Mostre que $R_\\theta$ é uma matriz ortogonal, isto é, que $R_\\theta^T R_\\theta = I_2$;\n"
            "(b) Demonstre que a rotação preserva comprimentos de vetores, ou seja, que $\\|R_\\theta \\vec{v}\\| = \\|\\vec{v}\\|$ para qualquer $\\vec{v} \\in \\mathbb{R}^2$."
        ),
        "gabarito": (
            "(a) Calculando a transposta R_theta^T = [[cos theta, sen theta], [-sen theta, cos theta]]. "
            "Multiplicando R_theta^T * R_theta: "
            "Linha 1, Coluna 1: cos^2 theta + sen^2 theta = 1. "
            "Linha 1, Coluna 2: cos theta * (-sen theta) + sen theta * cos theta = 0. "
            "Linha 2, Coluna 1: -sen theta * cos theta + cos theta * sen theta = 0. "
            "Linha 2, Coluna 2: (-sen theta)^2 + cos^2 theta = sen^2 theta + cos^2 theta = 1. "
            "Portanto, R_theta^T * R_theta = [[1, 0], [0, 1]] = I_2, provando que R_theta é ortogonal. "
            "(b) Seja v = (x, y). Então ||v||^2 = x^2 + y^2. "
            "O vetor rotacionado é R_theta * v = (x*cos theta - y*sen theta, x*sen theta + y*cos theta). "
            "Calculando ||R_theta * v||^2: "
            "(x*cos theta - y*sen theta)^2 + (x*sen theta + y*cos theta)^2 = "
            "[x^2 cos^2 theta - 2xy cos theta sen theta + y^2 sen^2 theta] + "
            "[x^2 sen^2 theta + 2xy cos theta sen theta + y^2 cos^2 theta] = "
            "x^2(cos^2 theta + sen^2 theta) + y^2(sen^2 theta + cos^2 theta) = "
            "x^2(1) + y^2(1) = x^2 + y^2 = ||v||^2. "
            "Tomando a raiz quadrada positiva, ||R_theta * v|| = ||v||, o que demonstra a preservação da norma euclidiana."
        ),
        "estrategias_esperadas": json.dumps([
            "Multiplicação da Transposta pela Matriz Original e Identidade Fundamental",
            "Propriedade de Isometria Linear ||Tv|| = ||v||",
            "Cancelamento dos Termos Cruzados e Fatoração por cos^2 + sen^2 = 1"
        ], ensure_ascii=False)
    }
]

def inserir_lote2():
    print("--- Inserindo Lote 2 no SQLite Local ---")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    ins_loc = 0
    for q in QUESTOES_CEDERJ_LOTE2:
        cur.execute("SELECT id FROM questoes WHERE enunciado = ?", (q["enunciado"],))
        if cur.fetchone():
            continue
        cur.execute("""
            INSERT INTO questoes (materia, topico, subtopico, dificuldade, banca, ano, enunciado, figura_path, gabarito, estrategias_esperadas, tipo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            q["materia"], q["topico"], q["subtopico"], q["dificuldade"],
            q["banca"], q["ano"], q["enunciado"], None,
            q["gabarito"], q["estrategias_esperadas"], q["tipo"]
        ))
        ins_loc += 1
    conn.commit()
    conn.close()
    print(f"Novas questões adicionadas no SQLite Local: {ins_loc}")

    print("\n--- Inserindo Lote 2 no Banco Ativo (Turso) ---")
    con = pegar_conexao()
    cur = con.cursor()
    ins_turso = 0
    for q in QUESTOES_CEDERJ_LOTE2:
        cur.execute("SELECT id FROM questoes WHERE enunciado = ?", (q["enunciado"],))
        if cur.fetchone():
            continue
        cur.execute("""
            INSERT INTO questoes (materia, topico, subtopico, dificuldade, banca, ano, enunciado, figura_path, gabarito, estrategias_esperadas, tipo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            q["materia"], q["topico"], q["subtopico"], q["dificuldade"],
            q["banca"], q["ano"], q["enunciado"], None,
            q["gabarito"], q["estrategias_esperadas"], q["tipo"]
        ))
        ins_turso += 1
    con.commit()
    print(f"Novas questões adicionadas no Banco Ativo: {ins_turso}")

if __name__ == "__main__":
    inserir_lote2()
