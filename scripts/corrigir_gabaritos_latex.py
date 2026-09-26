"""
Script para atualizar os gabaritos discursivos do CEDERJ no SQLite e Turso.
Converte todas as notações matemáticas para LaTeX elegante e padronizado ($...$ e $$...$$).
"""

import sys
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

from src.database.db import DB_PATH, pegar_conexao

GABARITOS_LATEX = {
    "Interseção de Superfícies Tridimensionais": (
        "Substituindo $z = 2$ na equação da esfera $x^2 + y^2 + z^2 = 9$:\n\n"
        "$$x^2 + y^2 + 2^2 = 9 \\implies x^2 + y^2 = 5$$\n\n"
        "Trata-se de uma circunferência de raio $\\sqrt{5}$ contida no plano horizontal $z = 2$.\n\n"
        "Uma parametrização vetorial padrão para essa curva é dada por:\n\n"
        "$$\\vec{r}(t) = \\left( \\sqrt{5}\\cos t, \\; \\sqrt{5}\\operatorname{sen} t, \\; 2 \\right), \\quad t \\in [0, 2\\pi]$$"
    ),
    "Continuidade Pontual de Função Vetorial": (
        "A função **não é contínua** em $t = 0$.\n\n"
        "Pela definição de continuidade de funções vetoriais, devemos ter:\n\n"
        "$$\\lim_{t \\to 0} \\vec{\\alpha}(t) = \\vec{\\alpha}(0) = (1, 1)$$\n\n"
        "Calculando o limite componente a componente:\n\n"
        "* Primeira componente:\n"
        "$$\\lim_{t \\to 0} \\frac{\\operatorname{sen} t}{t} = 1$$\n\n"
        "* Segunda componente (pela Regra de L'Hôpital ou limites fundamentais):\n"
        "$$\\lim_{t \\to 0} \\frac{1 - \\cos t}{t} = \\lim_{t \\to 0} \\frac{\\operatorname{sen} t}{1} = 0$$\n\n"
        "Portanto:\n\n"
        "$$\\lim_{t \\to 0} \\vec{\\alpha}(t) = (1, 0) \\neq (1, 1) = \\vec{\\alpha}(0)$$\n\n"
        "Como o limite vetorial difere do valor da função no ponto, $\\vec{\\alpha}(t)$ é descontínua em $t = 0$."
    ),
    "Discussão de Sistemas com Parâmetro": (
        "Montando a matriz ampliada do sistema e aplicando operações elementares nas linhas:\n\n"
        "$$\\begin{pmatrix} 1 & 1 & 1 & | & 1 \\\\ 2 & 1 & 4 & | & a \\\\ 1 & 2 & -1 & | & 0 \\end{pmatrix} "
        "\\xrightarrow{L_2 \\leftarrow L_2 - 2L_1, \\; L_3 \\leftarrow L_3 - L_1} "
        "\\begin{pmatrix} 1 & 1 & 1 & | & 1 \\\\ 0 & -1 & 2 & | & a - 2 \\\\ 0 & 1 & -2 & | & -1 \\end{pmatrix}$$\n\n"
        "Somando $L_3 \\leftarrow L_3 + L_2$:\n\n"
        "$$\\begin{pmatrix} 1 & 1 & 1 & | & 1 \\\\ 0 & -1 & 2 & | & a - 2 \\\\ 0 & 0 & 0 & | & a - 3 \\end{pmatrix}$$\n\n"
        "Pelo Teorema de Rouché-Capelli:\n"
        "* Se $a \\neq 3$: a última linha resulta na equação impossível $0 = a - 3 \\neq 0$, logo o sistema é **Impossível (SI)**.\n"
        "* Se $a = 3$: o posto da matriz dos coeficientes é igual ao posto da matriz ampliada ($posto = 2 < 3$). O sistema possui 1 grau de liberdade, sendo **Possível e Indeterminado (SPI)** com infinitas soluções."
    ),
    "Verificação de Axiomas de Subespaço": (
        "**Sim**, $W$ é um subespaço vetorial de $\\mathbb{R}^3$. Demonstração dos 3 axiomas:\n\n"
        "1. **Vetor nulo pertence a $W$**:\n"
        "$$2(0) - 3(0) + (0) = 0 \\implies \\vec{0} \\in W$$\n\n"
        "2. **Fechamento sob a adição**:\n"
        "Sejam $\\vec{u} = (x_1, y_1, z_1)$ e $\\vec{v} = (x_2, y_2, z_2) \\in W$. Então $2x_1 - 3y_1 + z_1 = 0$ e $2x_2 - 3y_2 + z_2 = 0$. Somando ambas:\n"
        "$$2(x_1 + x_2) - 3(y_1 + y_2) + (z_1 + z_2) = 0 \\implies \\vec{u} + \\vec{v} \\in W$$\n\n"
        "3. **Fechamento sob multiplicação por escalar**:\n"
        "Seja $\\alpha \\in \\mathbb{R}$ e $\\vec{u} \\in W$:\n"
        "$$2(\\alpha x_1) - 3(\\alpha y_1) + (\\alpha z_1) = \\alpha(2x_1 - 3y_1 + z_1) = \\alpha(0) = 0 \\implies \\alpha\\vec{u} \\in W$$"
    ),
    "Núcleo, Imagem e Teorema da Dimensão": (
        "**(a)** O núcleo $\\ker(T)$ é o conjunto dos vetores $(x, y, z)$ tais que $T(x, y, z) = (0, 0)$:\n\n"
        "$$\\begin{cases} x - 2y + z = 0 \\\\ 2x - 4y + 2z = 0 \\end{cases} \\implies x = 2y - z$$\n\n"
        "Logo, os vetores de $\\ker(T)$ têm a forma:\n\n"
        "$$(2y - z, \\; y, \\; z) = y(2, 1, 0) + z(-1, 0, 1)$$\n\n"
        "Como os vetores $\{(2, 1, 0), (-1, 0, 1)\}$ são LI, formam uma base para $\\ker(T)$ e $\\dim(\\ker(T)) = 2$.\n\n"
        "**(b)** Pelo Teorema do Núcleo e da Imagem:\n\n"
        "$$\\dim(V) = \\dim(\\ker(T)) + \\dim(\\operatorname{Im}(T)) \\implies 3 = 2 + \\dim(\\operatorname{Im}(T)) \\implies \\dim(\\operatorname{Im}(T)) = 1$$\n\n"
        "Como $T(1, 0, 0) = (1, 2) \\neq (0, 0)$, uma base para a imagem é $\\{(1, 2)\\}$."
    ),
    "Inexistência de Limite via Regra dos Dois Caminhos": (
        "**Demonstração pela Regra dos Dois Caminhos:**\n\n"
        "1. **Aproximação por feixe de retas** $x = my$:\n\n"
        "$$\\lim_{y \\to 0} f(my, y) = \\lim_{y \\to 0} \\frac{2(my)y^2}{(my)^2 + y^4} = \\lim_{y \\to 0} \\frac{2my^3}{y^2(m^2 + y^2)} = \\lim_{y \\to 0} \\frac{2my}{m^2 + y^2} = 0 \\quad (\\text{para } m \\neq 0)$$\n\n"
        "Ao longo dos eixos coordenados ($y = 0$ ou $x = 0$), a função também é identicamente nula, sugerindo $0$ como candidato a limite.\n\n"
        "2. **Aproximação por parábolas** $x = k y^2$:\n\n"
        "$$\\lim_{y \\to 0} f(k y^2, y) = \\lim_{y \\to 0} \\frac{2(k y^2)y^2}{(k y^2)^2 + y^4} = \\lim_{y \\to 0} \\frac{2k y^4}{y^4(k^2 + 1)} = \\frac{2k}{k^2 + 1}$$\n\n"
        "Note que este valor depende diretamente da constante $k$:\n"
        "* Para $k = 1 \\implies L = \\frac{2(1)}{1^2 + 1} = 1$\n"
        "* Para $k = -1 \\implies L = \\frac{2(-1)}{(-1)^2 + 1} = -1$\n"
        "* Para $k = 0 \\implies L = 0$\n\n"
        "Como o limite assume valores distintos dependendo da trajetória de aproximação à origem $(0, 0)$, **conclui-se rigorosamente que o limite NÃO existe**."
    ),
    "Máxima Taxa de Variação e Direção de Máximo Crescimento": (
        "**(a)** As derivadas parciais da função $T(x, y) = x^2 + 3y^2$ são:\n\n"
        "$$\\frac{\\partial T}{\\partial x} = 2x \\quad \\text{e} \\quad \\frac{\\partial T}{\\partial y} = 6y$$\n\n"
        "No ponto $P(2, 1)$:\n\n"
        "$$T_x(2, 1) = 2(2) = 4 \\quad \\text{e} \\quad T_y(2, 1) = 6(1) = 6$$\n\n"
        "Portanto, o vetor gradiente é:\n\n"
        "$$\\nabla T(2, 1) = (4, 6)$$\n\n"
        "**(b)** A taxa máxima de variação ocorre na direção do vetor gradiente e seu valor é igual à sua norma euclidiana:\n\n"
        "$$\\|\\nabla T(2, 1)\\| = \\sqrt{4^2 + 6^2} = \\sqrt{16 + 36} = \\sqrt{52} = 2\\sqrt{13}$$\n\n"
        "O vetor unitário nessa direção é:\n\n"
        "$$\\vec{u} = \\frac{\\nabla T}{\\|\\nabla T\\|} = \\left( \\frac{4}{2\\sqrt{13}}, \\; \\frac{6}{2\\sqrt{13}} \\right) = \\left( \\frac{2}{\\sqrt{13}}, \\; \\frac{3}{\\sqrt{13}} \\right)$$\n\n"
        "**(c)** O vetor unitário na direção de $\\vec{v} = (3, 4)$ é $\\vec{u}_v = \\frac{(3, 4)}{\\sqrt{3^2 + 4^2}} = \\left(\\frac{3}{5}, \\frac{4}{5}\\right)$.\n\n"
        "A derivada direcional correspondente é:\n\n"
        "$$D_{\\vec{v}} T(2, 1) = \\nabla T(2, 1) \\cdot \\vec{u}_v = 4\\left(\\frac{3}{5}\\right) + 6\\left(\\frac{4}{5}\\right) = \\frac{12}{5} + \\frac{24}{5} = \\frac{36}{5} = 7{,}2$$"
    ),
    "Método dos Multiplicadores de Lagrange": (
        "**Função objetivo:** $f(x, y) = x^2 + y^2$ (quadrado da distância à origem).\n\n"
        "**Função de restrição:** $g(x, y) = x + 2y - 10 = 0$.\n\n"
        "Pelo método dos Multiplicadores de Lagrange, $\\nabla f = \\lambda \\nabla g$:\n\n"
        "$$(2x, 2y) = \\lambda(1, 2)$$\n\n"
        "Isso fornece o sistema:\n"
        "1. $2x = \\lambda \\implies \\lambda = 2x$\n"
        "2. $2y = 2\\lambda \\implies \\lambda = y$\n\n"
        "Igualando os valores de $\\lambda$, obtemos:\n\n"
        "$$y = 2x$$\n\n"
        "Substituindo na equação da reta $x + 2y = 10$:\n\n"
        "$$x + 2(2x) = 10 \\implies 5x = 10 \\implies x = 2$$\n\n"
        "Consequentemente, $y = 2(2) = 4$.\n\n"
        "O ponto da reta mais próximo da origem é **$(2, 4)$**, e a distância mínima é $d = \\sqrt{2^2 + 4^2} = \\sqrt{20} = 2\\sqrt{5}$."
    ),
    "Representação de Polinômio por Combinação Linear": (
        "Queremos determinar os escalares $\\alpha, \\beta, \\gamma \\in \\mathbb{R}$ tais que:\n\n"
        "$$5 - 3x + 2x^2 = \\alpha(2 + 4x + x^2) + \\beta(1 - 2x + 3x^2) + \\gamma(1 + x + x^2)$$\n\n"
        "Agrupando e igualando os coeficientes termo a termo:\n\n"
        "$$\\begin{cases} "
        "2\\alpha + \\beta + \\gamma = 5 & \\text{(termo independente)} \\\\ "
        "4\\alpha - 2\\beta + \\gamma = -3 & \\text{(termo em } x\\text{)} \\\\ "
        "\\alpha + 3\\beta + \\gamma = 2 & \\text{(termo em } x^2\\text{)} "
        "\\end{cases}$$\n\n"
        "Resolvendo por eliminação:\n"
        "* Subtraindo a 1ª da 2ª: $2\\alpha - 3\\beta = -8$\n"
        "* Subtraindo a 1ª da 3ª: $-\\alpha + 2\\beta = -3 \\implies \\alpha = 2\\beta + 3$\n\n"
        "Substituindo $\\alpha$:\n\n"
        "$$2(2\\beta + 3) - 3\\beta = -8 \\implies \\beta + 6 = -8 \\implies \\beta = -14$$\n\n"
        "Logo:\n\n"
        "$$\\alpha = 2(-14) + 3 = -25$$\n\n"
        "Substituindo na 1ª equação:\n\n"
        "$$2(-25) + (-14) + \\gamma = 5 \\implies -64 + \\gamma = 5 \\implies \\gamma = 69$$\n\n"
        "Portanto, os escalares são:\n\n"
        "$$\\alpha = -25, \\quad \\beta = -14, \\quad \\gamma = 69$$\n\n"
        "Ou seja: $p(x) = -25 m(x) - 14 n(x) + 69 q(x)$."
    ),
    "Dependência Linear e Independência Linear (LI vs LD)": (
        "O conjunto $S$ é **Linearmente Dependente (LD)**.\n\n"
        "**Demonstração:**\n\n"
        "Considere a equação vetorial de dependência linear:\n\n"
        "$$c_1(1, 2, 3) + c_2(0, 1, 2) + c_3(2, 5, 8) = (0, 0, 0)$$\n\n"
        "Construindo a matriz dos coeficientes $A$ com os vetores dispostos em colunas:\n\n"
        "$$A = \\begin{pmatrix} 1 & 0 & 2 \\\\ 2 & 1 & 5 \\\\ 3 & 2 & 8 \\end{pmatrix}$$\n\n"
        "Calculando o determinante pelo método de Laplace:\n\n"
        "$$\\det(A) = 1(8 - 10) - 0 + 2(4 - 3) = -2 + 2 = 0$$\n\n"
        "Como $\\det(A) = 0$, o sistema homogêneo admite soluções não triviais, o que prova que o conjunto $S$ é **LD**.\n\n"
        "**Relação explícita de dependência:**\n\n"
        "$$\\vec{v}_3 = 2\\vec{v}_1 + 1\\vec{v}_2$$\n\n"
        "De fato: $2(1, 2, 3) + (0, 1, 2) = (2, 4, 6) + (0, 1, 2) = (2, 5, 8) = \\vec{v}_3$."
    ),
    "Determinação de Autoespaços e Autovetores": (
        "Para a matriz $A = \\begin{pmatrix} 4 & 2 \\\\ 1 & 3 \\end{pmatrix}$:\n\n"
        "**(a)** Para o autovalor $\\lambda_1 = 2$:\n\n"
        "Resolvemos $(A - 2I)\\vec{v} = \\vec{0}$:\n\n"
        "$$\\begin{pmatrix} 2 & 2 \\\\ 1 & 1 \\end{pmatrix} \\begin{pmatrix} x \\\\ y \\end{pmatrix} = \\begin{pmatrix} 0 \\\\ 0 \\end{pmatrix} \\implies x + y = 0 \\implies y = -x$$\n\n"
        "Os autovetores têm a forma $(x, -x) = x(1, -1)$ com $x \\neq 0$. Uma base para o autoespaço $V_2$ é:\n\n"
        "$$\\mathcal{B}_1 = \\{(1, -1)\\}$$\n\n"
        "**(b)** Para o autovalor $\\lambda_2 = 5$:\n\n"
        "Resolvemos $(A - 5I)\\vec{v} = \\vec{0}$:\n\n"
        "$$\\begin{pmatrix} -1 & 2 \\\\ 1 & -2 \\end{pmatrix} \\begin{pmatrix} x \\\\ y \\end{pmatrix} = \\begin{pmatrix} 0 \\\\ 0 \\end{pmatrix} \\implies -x + 2y = 0 \\implies x = 2y$$\n\n"
        "Os autovetores têm a forma $(2y, y) = y(2, 1)$ com $y \\neq 0$. Uma base para o autoespaço $V_5$ é:\n\n"
        "$$\\mathcal{B}_2 = \\{(2, 1)\\}$$"
    ),
    "Matrizes de Rotação e Preservação de Comprimento": (
        "**(a)** A matriz de rotação é $R_\\theta = \\begin{pmatrix} \\cos\\theta & -\\operatorname{sen}\\theta \\\\ \\operatorname{sen}\\theta & \\cos\\theta \\end{pmatrix}$. "
        "Sua transposta é $R_\\theta^T = \\begin{pmatrix} \\cos\\theta & \\operatorname{sen}\\theta \\\\ -\\operatorname{sen}\\theta & \\cos\\theta \\end{pmatrix}$.\n\n"
        "Multiplicando $R_\\theta^T R_\\theta$:\n\n"
        "$$R_\\theta^T R_\\theta = \\begin{pmatrix} \\cos^2\\theta + \\operatorname{sen}^2\\theta & -\\cos\\theta\\operatorname{sen}\\theta + \\operatorname{sen}\\theta\\cos\\theta \\\\ -\\operatorname{sen}\\theta\\cos\\theta + \\cos\\theta\\operatorname{sen}\\theta & \\operatorname{sen}^2\\theta + \\cos^2\\theta \\end{pmatrix} = \\begin{pmatrix} 1 & 0 \\\\ 0 & 1 \\end{pmatrix} = I_2$$\n\n"
        "Logo, $R_\\theta$ é ortogonal.\n\n"
        "**(b)** Seja $\\vec{v} = (x, y) \\in \\mathbb{R}^2$. O vetor rotacionado é:\n\n"
        "$$R_\\theta \\vec{v} = (x\\cos\\theta - y\\operatorname{sen}\\theta, \\; x\\operatorname{sen}\\theta + y\\cos\\theta)$$\n\n"
        "Calculando o quadrado da norma:\n\n"
        "$$\\|R_\\theta \\vec{v}\\|^2 = (x\\cos\\theta - y\\operatorname{sen}\\theta)^2 + (x\\operatorname{sen}\\theta + y\\cos\\theta)^2$$\n\n"
        "$$= x^2(\\cos^2\\theta + \\operatorname{sen}^2\\theta) + y^2(\\operatorname{sen}^2\\theta + \\cos^2\\theta) = x^2(1) + y^2(1) = \\|\\vec{v}\\|^2$$\n\n"
        "Portanto, $\\|R_\\theta \\vec{v}\\| = \\|\\vec{v}\\|$, provando que a transformação linear preserva a norma euclidiana (é uma isometria)."
    ),
    "Campos Conservativos e Função Potencial": (
        "Considere o campo $\\vec{F}(x, y) = (2xy + e^y) \\, \\vec{i} + (x^2 + x e^y + 3y^2) \\, \\vec{j}$:\n\n"
        "**(a)** Verificação de conservatividade:\n\n"
        "$$\\frac{\\partial P}{\\partial y} = \\frac{\\partial}{\\partial y}(2xy + e^y) = 2x + e^y$$\n\n"
        "$$\\frac{\\partial Q}{\\partial x} = \\frac{\\partial}{\\partial x}(x^2 + x e^y + 3y^2) = 2x + e^y$$\n\n"
        "Como $\\frac{\\partial Q}{\\partial x} = \\frac{\\partial P}{\\partial y}$ em todo o plano $\\mathbb{R}^2$ (que é simplesmente conexo), o campo é **conservativo**.\n\n"
        "**(b)** Determinação da função potencial $\\phi(x, y)$ tal que $\\nabla \\phi = \\vec{F}$:\n\n"
        "$$\\frac{\\partial \\phi}{\\partial x} = 2xy + e^y \\implies \\phi(x, y) = \\int (2xy + e^y) \\, dx = x^2 y + x e^y + g(y)$$\n\n"
        "Derivando em relação a $y$ e comparando com $Q(x, y)$:\n\n"
        "$$\\frac{\\partial \\phi}{\\partial y} = x^2 + x e^y + g'(y) = x^2 + x e^y + 3y^2 \\implies g'(y) = 3y^2 \\implies g(y) = y^3 + C$$\n\n"
        "Portanto:\n\n"
        "$$\\phi(x, y) = x^2 y + x e^y + y^3 + C$$\n\n"
        "**(c)** Pelo Teorema Fundamental das Integrais de Linha:\n\n"
        "$$W = \\int_C \\vec{F} \\cdot d\\vec{r} = \\phi(1, 1) - \\phi(0, 0) = (1^2 \\cdot 1 + 1 \\cdot e^1 + 1^3) - (0) = e + 2$$"
    ),
    "Base Dual": (
        "Para a base $B = \\{v_1 = (1, 1), \\; v_2 = (1, -1)\\}$ de $\\mathbb{R}^2$:\n\n"
        "**(a)** O funcional linear $f_1(x, y) = ax + by$ satisfaz $f_1(v_1) = 1$ e $f_1(v_2) = 0$:\n\n"
        "$$\\begin{cases} a + b = 1 \\\\ a - b = 0 \\end{cases} \\implies a = \\frac{1}{2}, \\; b = \\frac{1}{2} \\implies f_1(x, y) = \\frac{x + y}{2}$$\n\n"
        "**(b)** O funcional $f_2(x, y) = cx + dy$ satisfaz $f_2(v_1) = 0$ e $f_2(v_2) = 1$:\n\n"
        "$$\\begin{cases} c + d = 0 \\\\ c - d = 1 \\end{cases} \\implies c = \\frac{1}{2}, \\; d = -\\frac{1}{2} \\implies f_2(x, y) = \\frac{x - y}{2}$$\n\n"
        "**(c)** Dado o funcional $f(x, y) = 3x - y$, sua decomposição na base dual $B^*$ é $f = c_1 f_1 + c_2 f_2$:\n\n"
        "* $c_1 = f(v_1) = f(1, 1) = 3(1) - 1 = 2$\n"
        "* $c_2 = f(v_2) = f(1, -1) = 3(1) - (-1) = 4$\n\n"
        "Portanto:\n\n"
        "$$f = 2f_1 + 4f_2$$"
    )
}

def atualizar_gabaritos():
    print("--- Atualizando gabaritos no SQLite Local ---")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    upd_loc = 0
    for subtopico, gab in GABARITOS_LATEX.items():
        cur.execute("UPDATE questoes SET gabarito = ? WHERE subtopico = ? AND tipo = 'discursiva'", (gab, subtopico))
        upd_loc += cur.rowcount
    conn.commit()
    conn.close()
    print(f"Gabaritos atualizados no SQLite: {upd_loc}")

    print("\n--- Atualizando gabaritos no Banco Ativo (Turso) ---")
    con = pegar_conexao()
    cur = con.cursor()
    upd_turso = 0
    for subtopico, gab in GABARITOS_LATEX.items():
        cur.execute("UPDATE questoes SET gabarito = ? WHERE subtopico = ? AND tipo = 'discursiva'", (gab, subtopico))
        upd_turso += cur.rowcount
    con.commit()
    print(f"Gabaritos atualizados no Turso: {upd_turso}")

if __name__ == "__main__":
    atualizar_gabaritos()
