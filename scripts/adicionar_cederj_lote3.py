"""
Lote 3 de Questões do CEDERJ: Cálculo 3 e Álgebra Linear.
Adiciona 12 questões aprofundadas com gabaritos detalhados e estratégias pedagógicas:
- Cálculo 3: Integrais Duplas, Coordenadas Polares, Campos Conservativos, Teorema de Green, Teorema de Stokes/Gauss, Integrais de Linha.
- Álgebra Linear: Gram-Schmidt, Mudança de Base, Operadores Simétricos e Teorema Espectral, Formas Quadráticas/Critério de Sylvester, Cayley-Hamilton, Espaço Dual.
"""

import sys
import json
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

from src.database.db import pegar_conexao, DB_PATH

QUESTOES_CEDERJ_LOTE3 = [
    # =========================================================================
    # CÁLCULO 3 (CEDERJ - LOTE 3)
    # =========================================================================
    {
        "materia": "Cálculo 3",
        "topico": "Integrais Múltiplas",
        "subtopico": "Integrais Duplas e Teorema de Fubini",
        "dificuldade": 3,
        "banca": "CEDERJ",
        "ano": 2022,
        "tipo": "objetiva",
        "enunciado": (
            "Calcule a integral dupla iterada trocando a ordem de integração:\n\n"
            "$$I = \\int_{0}^{1} \\int_{y}^{1} e^{x^2} \\, dx \\, dy$$\n\n"
            "O valor numérico dessa integral é:\n\n"
            "(A) $\\frac{e - 1}{2}$\n"
            "(B) $e - 1$\n"
            "(C) $\\frac{e + 1}{2}$\n"
            "(D) $2(e - 1)$\n"
            "(E) $\\frac{e}{2}$"
        ),
        "gabarito": "A",
        "estrategias_esperadas": json.dumps([
            "Identificação da Região de Integração Tipo II: 0 <= y <= 1, y <= x <= 1",
            "Inversão para Região Tipo I: 0 <= x <= 1, 0 <= y <= x",
            "Cálculo da Nova Integral Integral_0^1 (Integral_0^x e^(x^2) dy) dx = Integral_0^1 x e^(x^2) dx",
            "Substituição u = x^2 resultando em (e - 1)/2"
        ], ensure_ascii=False)
    },
    {
        "materia": "Cálculo 3",
        "topico": "Integrais Múltiplas",
        "subtopico": "Integrais Duplas em Coordenadas Polares",
        "dificuldade": 3,
        "banca": "CEDERJ",
        "ano": 2022,
        "tipo": "objetiva",
        "enunciado": (
            "Considere o volume $V$ do sólido delimitado superiormente pelo parabolóide $z = 4 - x^2 - y^2$ e inferiormente pelo plano $xy$ ($z = 0$).\n\n"
            "Utilizando coordenadas polares $x = r\\cos\\theta$, $y = r\\operatorname{sen}\\theta$ com o Jacobiano $r$, o volume do sólido é:\n\n"
            "(A) $4\\pi$\n"
            "(B) $8\\pi$\n"
            "(C) $12\\pi$\n"
            "(D) $16\\pi$\n"
            "(E) $2\\pi$"
        ),
        "gabarito": "B",
        "estrategias_esperadas": json.dumps([
            "Determinação do Domínio D no plano xy: círculo x^2 + y^2 <= 4 (raio r de 0 a 2, theta de 0 a 2pi)",
            "Expressão da Função Altura em Polares: z = 4 - r^2",
            "Aplicação do Jacobiano r: Integral_0^(2pi) Integral_0^2 (4 - r^2) r dr dtheta",
            "Resolução da Integral Radial: [2r^2 - r^4/4]_0^2 = 8 - 4 = 4",
            "Multiplicação pelo Período Angular 2pi: 4 * 2pi = 8pi"
        ], ensure_ascii=False)
    },
    {
        "materia": "Cálculo 3",
        "topico": "Integrais de Linha",
        "subtopico": "Integral de Linha de Campo Escalar (Massa de Fio)",
        "dificuldade": 3,
        "banca": "CEDERJ",
        "ano": 2022,
        "tipo": "objetiva",
        "enunciado": (
            "Um fio fino de arame tem a forma do segmento de reta que liga o ponto $A(0, 0, 0)$ ao ponto $B(1, 2, 2)$. "
            "A densidade linear de massa no ponto $(x, y, z)$ é dada por $\\rho(x, y, z) = x + y + z$.\n\n"
            "A massa total $M = \\int_C \\rho(x, y, z) \\, ds$ do fio é igual a:\n\n"
            "(A) $\\frac{15}{2}$\n"
            "(B) $15$\n"
            "(C) $\\frac{5}{2}$\n"
            "(D) $5$\n"
            "(E) $\\frac{25}{2}$"
        ),
        "gabarito": "A",
        "estrategias_esperadas": json.dumps([
            "Parametrização do Segmento de Reta: r(t) = (t, 2t, 2t) para t em [0, 1]",
            "Vetor Velocidade e Elemento de Arco: r'(t) = (1, 2, 2) => ||r'(t)|| = sqrt(1^2 + 2^2 + 2^2) = 3",
            "Substituição da Densidade: rho(r(t)) = t + 2t + 2t = 5t",
            "Cálculo da Integral: M = Integral_0^1 (5t) * 3 dt = 15 * [t^2 / 2]_0^1 = 15/2"
        ], ensure_ascii=False)
    },
    {
        "materia": "Cálculo 3",
        "topico": "Campos Vetoriais e Teorema Fundamental",
        "subtopico": "Campos Conservativos e Função Potencial",
        "dificuldade": 3,
        "banca": "CEDERJ",
        "ano": 2022,
        "tipo": "discursiva",
        "enunciado": (
            "Considere o campo vetorial $\\vec{F}: \\mathbb{R}^2 \\to \\mathbb{R}^2$ definido por:\n\n"
            "$$\\vec{F}(x, y) = (2xy + e^y) \\, \\vec{i} + (x^2 + x e^y + 3y^2) \\, \\vec{j}$$\n\n"
            "(a) Verifique se o campo $\\vec{F}$ é conservativo no plano $\\mathbb{R}^2$.\n"
            "(b) Caso seja conservativo, determine uma função potencial $\\phi(x, y)$ tal que $\\nabla \\phi = \\vec{F}$.\n"
            "(c) Calcule o trabalho $W = \\int_C \\vec{F} \\cdot d\\vec{r}$ realizado pelo campo ao longo de qualquer caminho suave conectando o ponto $A(0, 0)$ ao ponto $B(1, 1)$."
        ),
        "gabarito": "(a) Sim, rotacional nulo; (b) phi(x, y) = x^2 y + x e^y + y^3 + C; (c) W = e + 2",
        "estrategias_esperadas": json.dumps([
            "Verificação do Critério de Conservatividade: dP/dy = 2x + e^y e dQ/dx = 2x + e^y (iguais em R^2 simplesmente conexo)",
            "Integração Parcial: dphi/dx = 2xy + e^y => phi(x,y) = x^2 y + x e^y + g(y)",
            "Derivação em y e Comparação: dphi/dy = x^2 + x e^y + g'(y) = x^2 + x e^y + 3y^2 => g'(y) = 3y^2 => g(y) = y^3",
            "Teorema Fundamental das Integrais de Linha: W = phi(1, 1) - phi(0, 0) = (1 + e + 1) - (0) = e + 2"
        ], ensure_ascii=False)
    },
    {
        "materia": "Cálculo 3",
        "topico": "Teorema de Green",
        "subtopico": "Trabalho ao Longo de Curva Fechada no Plano",
        "dificuldade": 3,
        "banca": "CEDERJ",
        "ano": 2022,
        "tipo": "objetiva",
        "enunciado": (
            "Seja $C$ a fronteira do quadrado delimitado pelas retas $x = 0$, $x = 2$, $y = 0$ e $y = 2$, "
            "orientada no sentido anti-horário.\n\n"
            "Utilize o Teorema de Green para calcular a integral de linha:\n\n"
            "$$\\oint_C (-y^3 + \\operatorname{sen} x) \\, dx + (x^3 + e^y) \\, dy$$\n\n"
            "O valor dessa integral é:\n\n"
            "(A) $16$\n"
            "(B) $32$\n"
            "(C) $24$\n"
            "(D) $8$\n"
            "(E) $0$"
        ),
        "gabarito": "B",
        "estrategias_esperadas": json.dumps([
            "Enunciado do Teorema de Green: Integral_C (P dx + Q dy) = DuplaIntegral_D (dQ/dx - dP/dy) dA",
            "Identificação das Funções Componentes: P(x, y) = -y^3 + sen(x) e Q(x, y) = x^3 + e^y",
            "Cálculo das Derivadas Parciais: dQ/dx = 3x^2 e dP/dy = -3y^2",
            "Diferença das Parciais Cruzadas: dQ/dx - dP/dy = 3x^2 - (-3y^2) = 3(x^2 + y^2)",
            "Cálculo da Integral Dupla no Quadrado [0, 2]x[0, 2]: 3 * Integral_0^2 Integral_0^2 (x^2 + y^2) dx dy = 3 * (32/3) = 32"
        ], ensure_ascii=False)
    },
    {
        "materia": "Cálculo 3",
        "topico": "Teoremas de Stokes e Gauss",
        "subtopico": "Teorema da Divergência (Teorema de Gauss)",
        "dificuldade": 4,
        "banca": "CEDERJ",
        "ano": 2022,
        "tipo": "objetiva",
        "enunciado": (
            "Seja $S$ a superfície da esfera unitária $x^2 + y^2 + z^2 = 1$, orientada pela normal unitária exterior $\\vec{n}$.\n\n"
            "Considere o campo vetorial $\\vec{F}(x, y, z) = (2x + y^2) \\, \\vec{i} + (3y - z) \\, \\vec{j} + (z + x^2) \\, \\vec{k}$.\n\n"
            "O fluxo de $\\vec{F}$ através da superfície $S$, dado por $\\iint_S \\vec{F} \\cdot \\vec{n} \\, dS$, é igual a:\n\n"
            "(A) $4\\pi$\n"
            "(B) $6\\pi$\n"
            "(C) $8\\pi$\n"
            "(D) $12\\pi$\n"
            "(E) $2\\pi$"
        ),
        "gabarito": "C",
        "estrategias_esperadas": json.dumps([
            "Aplicação do Teorema da Divergência: Fluxo = IntegralTripla_B (div F) dV",
            "Cálculo do Divergente: div F = d(2x+y^2)/dx + d(3y-z)/dy + d(z+x^2)/dz = 2 + 3 + 1 = 6",
            "Propriedade de Escalar Constante: Fluxo = 6 * Volume(Esfera Unitária)",
            "Volume da Esfera de Raio 1: V = 4/3 * pi * 1^3 = 4/3 * pi",
            "Multiplicação Final: 6 * (4/3 * pi) = 8pi"
        ], ensure_ascii=False)
    },

    # =========================================================================
    # ÁLGEBRA LINEAR (CEDERJ - LOTE 3)
    # =========================================================================
    {
        "materia": "Álgebra Linear",
        "topico": "Espaços com Produto Interno",
        "subtopico": "Processo de Ortogonalização de Gram-Schmidt",
        "dificuldade": 3,
        "banca": "CEDERJ",
        "ano": 2022,
        "tipo": "objetiva",
        "enunciado": (
            "Considere a base $B = \\{v_1, v_2\\}$ do subespaço $W \\subset \\mathbb{R}^3$, onde $v_1 = (1, 1, 0)$ e $v_2 = (1, 0, 1)$, sob o produto interno usual.\n\n"
            "Aplicando o processo de Gram-Schmidt para obter uma base ortogonal $\\{u_1, u_2\\}$ com $u_1 = v_1$, o vetor $u_2$ é:\n\n"
            "(A) $\\left(\\frac{1}{2}, \\, -\\frac{1}{2}, \\, 1\\right)$\n"
            "(B) $\\left(1, \\, -1, \\, 2\\right)$\n"
            "(C) $\\left(-\\frac{1}{2}, \\, \\frac{1}{2}, \\, 1\\right)$\n"
            "(D) $\\left(0, \\, 1, \\, -1\\right)$\n"
            "(E) $\\left(\\frac{1}{2}, \\, \\frac{1}{2}, \\, 0\\right)$"
        ),
        "gabarito": "A",
        "estrategias_esperadas": json.dumps([
            "Fórmula de Gram-Schmidt: u2 = v2 - proj_u1(v2) = v2 - [<v2, u1> / <u1, u1>] * u1",
            "Cálculo dos Produtos Internos: <v2, u1> = (1)(1) + (0)(1) + (1)(0) = 1 e <u1, u1> = 1^2 + 1^2 + 0^2 = 2",
            "Coeficiente da Projeção: 1/2",
            "Subtração Vetorial: u2 = (1, 0, 1) - 1/2(1, 1, 0) = (1 - 1/2, 0 - 1/2, 1 - 0) = (1/2, -1/2, 1)"
        ], ensure_ascii=False)
    },
    {
        "materia": "Álgebra Linear",
        "topico": "Espaços Vetoriais e Bases",
        "subtopico": "Matriz de Mudança de Base",
        "dificuldade": 3,
        "banca": "CEDERJ",
        "ano": 2022,
        "tipo": "objetiva",
        "enunciado": (
            "Sejam as bases $B = \\{e_1, e_2\\}$ (canônica) e $B' = \\{u_1 = (1, 2), \\; u_2 = (2, 3)\\}$ de $\\mathbb{R}^2$.\n\n"
            "Se as coordenadas de um vetor $v$ na base $B'$ são $[v]_{B'} = \\begin{pmatrix} 3 \\\\ -1 \\end{pmatrix}$, "
            "as coordenadas de $v$ na base canônica $B$ são dadas por:\n\n"
            "(A) $[v]_B = \\begin{pmatrix} 1 \\\\ 3 \\end{pmatrix}$\n"
            "(B) $[v]_B = \\begin{pmatrix} 3 \\\\ 1 \\end{pmatrix}$\n"
            "(C) $[v]_B = \\begin{pmatrix} 5 \\\\ 3 \\end{pmatrix}$\n"
            "(D) $[v]_B = \\begin{pmatrix} -1 \\\\ 4 \\end{pmatrix}$\n"
            "(E) $[v]_B = \\begin{pmatrix} 1 \\\\ 4 \\end{pmatrix}$"
        ),
        "gabarito": "A",
        "estrategias_esperadas": json.dumps([
            "Relação entre Coordenadas: [v]_B = [I]_{B'}^B * [v]_{B'}",
            "Construção da Matriz de Mudança [I]_{B'}^B com os Vetores de B' como Colunas: [[1, 2], [2, 3]]",
            "Multiplicação Matriz-Vetor: [[1, 2], [2, 3]] * [3, -1]^T",
            "Cálculo das Componentes: 1*(3) + 2*(-1) = 1 e 2*(3) + 3*(-1) = 3 => (1, 3)"
        ], ensure_ascii=False)
    },
    {
        "materia": "Álgebra Linear",
        "topico": "Operadores Lineares e Teorema Espectral",
        "subtopico": "Operadores Auto-adjuntos (Simétricos) e Ortogonalidade",
        "dificuldade": 3,
        "banca": "CEDERJ",
        "ano": 2022,
        "tipo": "objetiva",
        "enunciado": (
            "Considere a matriz simétrica real $A = \\begin{pmatrix} 3 & 1 \\\\ 1 & 3 \\end{pmatrix}$.\n\n"
            "De acordo com o Teorema Espectral para operadores auto-adjuntos, seus autovalores e os respectivos autoespaços associados são ortogonais.\n\n"
            "Os autovalores $\\lambda_1 < \\lambda_2$ e seus respectivos autovetores unitários ortogonais são:\n\n"
            "(A) $\\lambda_1 = 2, \\, u_1 = \\frac{1}{\\sqrt{2}}(1, -1)$ e $\\lambda_2 = 4, \\, u_2 = \\frac{1}{\\sqrt{2}}(1, 1)$\n"
            "(B) $\\lambda_1 = 1, \\, u_1 = \\frac{1}{\\sqrt{2}}(1, 1)$ e $\\lambda_2 = 3, \\, u_2 = \\frac{1}{\\sqrt{2}}(-1, 1)$\n"
            "(C) $\\lambda_1 = 2, \\, u_1 = (1, 0)$ e $\\lambda_2 = 4, \\, u_2 = (0, 1)$\n"
            "(D) $\\lambda_1 = -2, \\, u_1 = \\frac{1}{\\sqrt{2}}(1, -1)$ e $\\lambda_2 = 4, \\, u_2 = \\frac{1}{\\sqrt{2}}(1, 1)$\n"
            "(E) $\\lambda_1 = 2, \\, u_1 = \\frac{1}{\\sqrt{5}}(2, 1)$ e $\\lambda_2 = 4, \\, u_2 = \\frac{1}{\\sqrt{5}}(-1, 2)$"
        ),
        "gabarito": "A",
        "estrategias_esperadas": json.dumps([
            "Polinômio Característico: det(A - lambda*I) = (3 - lambda)^2 - 1 = lambda^2 - 6*lambda + 8 = 0",
            "Fatoração das Raízes: (lambda - 2)(lambda - 4) = 0 => lambda_1 = 2 e lambda_2 = 4",
            "Autoespaço para lambda = 2: (A - 2I)v = [[1, 1], [1, 1]][x, y]^T = 0 => x + y = 0 => v = (1, -1)",
            "Autoespaço para lambda = 4: (A - 4I)v = [[-1, 1], [1, -1]][x, y]^T = 0 => -x + y = 0 => v = (1, 1)",
            "Normalização com Divisão pela Norma sqrt(1^2 + 1^2) = sqrt(2)"
        ], ensure_ascii=False)
    },
    {
        "materia": "Álgebra Linear",
        "topico": "Formas Quadráticas",
        "subtopico": "Classificação via Critério de Sylvester (Menores Principais)",
        "dificuldade": 3,
        "banca": "CEDERJ",
        "ano": 2022,
        "tipo": "objetiva",
        "enunciado": (
            "Considere a forma quadrática $q: \\mathbb{R}^2 \\to \\mathbb{R}$ dada por:\n\n"
            "$$q(x, y) = 2x^2 + 4xy + 5y^2$$\n\n"
            "A matriz simétrica associada à forma quadrática e a classificação de $q$ são, respectivamente:\n\n"
            "(A) $A = \\begin{pmatrix} 2 & 2 \\\\ 2 & 5 \\end{pmatrix}$, e a forma é definida positiva\n"
            "(B) $A = \\begin{pmatrix} 2 & 4 \\\\ 4 & 5 \\end{pmatrix}$, e a forma é indefinida\n"
            "(C) $A = \\begin{pmatrix} 2 & 2 \\\\ 2 & 5 \\end{pmatrix}$, e a forma é semi-definida positiva\n"
            "(D) $A = \\begin{pmatrix} 2 & 0 \\\\ 0 & 5 \\end{pmatrix}$, e a forma é definida positiva\n"
            "(E) $A = \\begin{pmatrix} 2 & 2 \\\\ 2 & 5 \\end{pmatrix}$, e a forma é definida negativa"
        ),
        "gabarito": "A",
        "estrategias_esperadas": json.dumps([
            "Montagem da Matriz Simétrica Associada: elementos diagonais a11 = 2, a22 = 5; termos cruzados a12 = a21 = 4/2 = 2",
            "Critério de Sylvester: menor principal 1 = det([2]) = 2 > 0",
            "Menor principal 2 = det(A) = (2)(5) - (2)(2) = 10 - 4 = 6 > 0",
            "Como todos os menores principais líderes são estritamente positivos, a forma quadrática é Definida Positiva"
        ], ensure_ascii=False)
    },
    {
        "materia": "Álgebra Linear",
        "topico": "Teorema de Cayley-Hamilton",
        "subtopico": "Cálculo da Matriz Inversa via Polinômio Característico",
        "dificuldade": 4,
        "banca": "CEDERJ",
        "ano": 2022,
        "tipo": "objetiva",
        "enunciado": (
            "Seja $A = \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}$. "
            "Pelo Teorema de Cayley-Hamilton, toda matriz quadrada satisfaz a sua própria equação característica: $p(A) = 0$.\n\n"
            "Sabendo que o polinômio característico de $A$ é $p(\\lambda) = \\lambda^2 - 5\\lambda - 2$, "
            "qual expressão representa a matriz inversa $A^{-1}$ em função de $A$ e da matriz identidade $I$?\n\n"
            "(A) $A^{-1} = \\frac{1}{2}(A - 5I)$\n"
            "(B) $A^{-1} = \\frac{1}{2}(5I - A)$\n"
            "(C) $A^{-1} = 2(A - 5I)$\n"
            "(D) $A^{-1} = A + 5I$\n"
            "(E) $A^{-1} = -\\frac{1}{5}(A^2 - 2I)$"
        ),
        "gabarito": "A",
        "estrategias_esperadas": json.dumps([
            "Aplicação do Teorema de Cayley-Hamilton: A^2 - 5A - 2I = 0",
            "Isolamento da Matriz Identidade: 2I = A^2 - 5A",
            "Fatoração da Matriz A à Esquerda: 2I = A(A - 5I)",
            "Multiplicação por A^(-1) em Ambos os Lados: 2 A^(-1) = A - 5I",
            "Conclusão: A^(-1) = 1/2 (A - 5I)"
        ], ensure_ascii=False)
    },
    {
        "materia": "Álgebra Linear",
        "topico": "Espaço Dual e Funcionais Lineares",
        "subtopico": "Base Dual",
        "dificuldade": 3,
        "banca": "CEDERJ",
        "ano": 2022,
        "tipo": "discursiva",
        "enunciado": (
            "Seja $B = \\{v_1 = (1, 1), \\; v_2 = (1, -1)\\}$ uma base do espaço vetorial $\\mathbb{R}^2$.\n\n"
            "A base dual $B^* = \\{f_1, f_2\\}$ no espaço dual $(\\mathbb{R}^2)^*$ é formada por funcionais lineares satisfazendo $f_i(v_j) = \\delta_{ij}$ (delta de Kronecker).\n\n"
            "(a) Determine a fórmula explícita de $f_1(x, y)$ para qualquer vetor $(x, y) \\in \\mathbb{R}^2$.\n"
            "(b) Determine a fórmula explícita de $f_2(x, y)$.\n"
            "(c) Dado o funcional $f(x, y) = 3x - y$, expresse $f$ como combinação linear da base dual $B^*$."
        ),
        "gabarito": "(a) f1(x, y) = (x + y)/2; (b) f2(x, y) = (x - y)/2; (c) f = 2*f1 + 4*f2",
        "estrategias_esperadas": json.dumps([
            "Definição de Funcional Linear f(x, y) = ax + by",
            "Condições da Base Dual: f1(1, 1) = a + b = 1 e f1(1, -1) = a - b = 0 => a = 1/2, b = 1/2 => f1(x, y) = (x+y)/2",
            "Condições para f2: f2(1, 1) = c + d = 0 e f2(1, -1) = c - d = 1 => c = 1/2, d = -1/2 => f2(x, y) = (x-y)/2",
            "Decomposição no Espaço Dual: f = c1*f1 + c2*f2 => c1 = f(v1) = f(1, 1) = 3(1) - 1 = 2 e c2 = f(v2) = f(1, -1) = 3(1) - (-1) = 4 => f = 2*f1 + 4*f2"
        ], ensure_ascii=False)
    }
]

def inserir_lote3():
    print("--- Inserindo Lote 3 no SQLite Local ---")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    ins_loc = 0
    for q in QUESTOES_CEDERJ_LOTE3:
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

    print("\n--- Inserindo Lote 3 no Banco Ativo (Turso) ---")
    con = pegar_conexao()
    cur = con.cursor()
    ins_turso = 0
    for q in QUESTOES_CEDERJ_LOTE3:
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
    inserir_lote3()
