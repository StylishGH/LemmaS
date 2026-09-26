"""
Script de inserção e teste local de questões de Cálculo 3 e Álgebra Linear do CEDERJ.
Adiciona questões autênticas extraídas dos Exercícios Programados (EPs) e Avaliações (ADs/APs).
"""

import sys
import json
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

from src.database.db import pegar_conexao, DB_PATH

QUESTOES_CEDERJ = [
    # =========================================================================
    # CÁLCULO 3 (CÁLCULO III - CEDERJ)
    # =========================================================================
    {
        "materia": "Cálculo 3",
        "topico": "Funções Vetoriais e Operações",
        "subtopico": "Produto Escalar e Produto Vetorial",
        "dificuldade": 2,
        "banca": "CEDERJ",
        "ano": 2022,
        "tipo": "objetiva",
        "enunciado": (
            "Sejam as funções vetoriais $\\vec{F}, \\vec{G}: \\mathbb{R} \\to \\mathbb{R}^3$ definidas por "
            "$\\vec{F}(t) = (t, \\, t^2, \\, 2)$ e $\\vec{G}(t) = (3, \\, t, \\, t)$.\n\n"
            "A função produto escalar $(\\vec{F} \\cdot \\vec{G})(t)$ e a componente na direção do vetor unitário $\\vec{k}$ do produto vetorial $(\\vec{F} \\times \\vec{G})(t)$ são dadas, respectivamente, por:\n\n"
            "(A) $5t + t^3$ e $-2t^2$\n"
            "(B) $3t + t^3$ e $t^3 - 2t$\n"
            "(C) $5t + t^3$ e $6 - t^2$\n"
            "(D) $3t + 2t^2$ e $-2t^2$\n"
            "(E) $t^3 + 5t$ e $2t^2 - t^3$"
        ),
        "gabarito": "A",
        "estrategias_esperadas": json.dumps([
            "Produto Escalar de Vetores em Componentes",
            "Produto Vetorial via Determinante Simbólico",
            "Identificação das Componentes Canônicas i, j, k"
        ], ensure_ascii=False)
    },
    {
        "materia": "Cálculo 3",
        "topico": "Limites de Funções Vetoriais",
        "subtopico": "Limites Trigonométricos Fundamentais",
        "dificuldade": 3,
        "banca": "CEDERJ",
        "ano": 2022,
        "tipo": "objetiva",
        "enunciado": (
            "Considere a função vetorial $\\vec{r}: \\mathbb{R}^* \\to \\mathbb{R}^2$ dada por:\n\n"
            "$$\\vec{r}(t) = \\left( \\frac{1 - \\cos t}{t^2}, \\; \\frac{1 - \\cos t}{t} \\right)$$\n\n"
            "Calculando o limite vetorial $\\lim_{t \\to 0} \\vec{r}(t)$, obtém-se o ponto:\n\n"
            "(A) $(0, \\, 0)$\n"
            "(B) $\\left(\\frac{1}{2}, \\, 0\\right)$\n"
            "(C) $(1, \\, 0)$\n"
            "(D) $\\left(\\frac{1}{2}, \\, 1\\right)$\n"
            "(E) O limite não existe pois há indeterminação $\\frac{0}{0}$ em ambas as componentes."
        ),
        "gabarito": "B",
        "estrategias_esperadas": json.dumps([
            "Multiplicação pelo Conjugado Trigonométrico (1 + cos t)",
            "Aplicação do Limite Trigonométrico Fundamental lim (sen t)/t = 1",
            "Cálculo Componente a Componente de Limite Vetorial"
        ], ensure_ascii=False)
    },
    {
        "materia": "Cálculo 3",
        "topico": "Curvas no Espaço e Parametrização",
        "subtopico": "Identificação de Trajetória e Extremos",
        "dificuldade": 2,
        "banca": "CEDERJ",
        "ano": 2022,
        "tipo": "objetiva",
        "enunciado": (
            "Seja $\\vec{\\alpha}: [1, 4] \\to \\mathbb{R}^2$ a função vetorial dada por $\\vec{\\alpha}(t) = (2 + t, \\, 1 + t^2)$.\n\n"
            "A equação cartesiana da curva descrita por $\\vec{\\alpha}$, juntamente com seus pontos inicial e final, são:\n\n"
            "(A) $y - 1 = (x - 2)^2$, com início em $(3, 2)$ e término em $(6, 17)$\n"
            "(B) $y = (x - 2)^2$, com início em $(1, 1)$ e término em $(4, 16)$\n"
            "(C) $(y - 2)^2 = x - 1$, com início em $(3, 2)$ e término em $(6, 17)$\n"
            "(D) $y - 1 = x^2 - 4$, com início em $(2, 1)$ e término em $(6, 17)$\n"
            "(E) $y = x^2 + 1$, com início em $(1, 2)$ e término em $(4, 17)$"
        ),
        "gabarito": "A",
        "estrategias_esperadas": json.dumps([
            "Eliminação do Parâmetro t para Obtenção da Equação Cartesiana",
            "Identificação da Parábola com Vértice Transladado",
            "Substituição dos Extremos do Intervalo Paramétrico"
        ], ensure_ascii=False)
    },
    {
        "materia": "Cálculo 3",
        "topico": "Limites de Funções Vetoriais",
        "subtopico": "Limite no Infinito e Número de Euler",
        "dificuldade": 3,
        "banca": "CEDERJ",
        "ano": 2022,
        "tipo": "objetiva",
        "enunciado": (
            "Determine o valor do limite vetorial no infinito:\n\n"
            "$$\\lim_{t \\to +\\infty} \\left( \\left(1 + \\frac{1}{t}\\right)^t, \\; \\frac{1 + t + t^2}{t^3 - 1} \\right)$$\n\n"
            "(A) $(1, \\, 1)$\n"
            "(B) $(e, \\, 1)$\n"
            "(C) $(e, \\, 0)$\n"
            "(D) $(+\\infty, \\, 0)$\n"
            "(E) $(1, \\, 0)$"
        ),
        "gabarito": "C",
        "estrategias_esperadas": json.dumps([
            "Limite Fundamental Exponencial lim (1 + 1/t)^t = e",
            "Fatoração da Diferença de Cubos t^3 - 1 = (t - 1)(t^2 + t + 1)",
            "Grau do Numerador Menor que o Denominador tendendo a 0"
        ], ensure_ascii=False)
    },
    {
        "materia": "Cálculo 3",
        "topico": "Curvas no Espaço e Parametrização",
        "subtopico": "Interseção de Superfícies Tridimensionais",
        "dificuldade": 3,
        "banca": "CEDERJ",
        "ano": 2022,
        "tipo": "discursiva",
        "enunciado": (
            "Determine uma parametrização vetorial $\\vec{r}(t) = (x(t), y(t), z(t))$ para a curva $C$ "
            "formada pela interseção entre a esfera $x^2 + y^2 + z^2 = 9$ e o plano horizontal $z = 2$.\n\n"
            "Especifique o domínio de variação do parâmetro $t$ e descreva geometricamente a projeção dessa curva sobre o plano $xy$."
        ),
        "gabarito": (
            "Substituindo z = 2 na equação da esfera, obtém-se x^2 + y^2 + 2^2 = 9, logo x^2 + y^2 = 5. "
            "Trata-se de uma circunferência centrada na origem de raio sqrt(5) contida no plano z = 2. "
            "A parametrização vetorial é r(t) = (sqrt(5)*cos(t), sqrt(5)*sen(t), 2), com t no intervalo [0, 2*pi]. "
            "A projeção sobre o plano xy é a circunferência x^2 + y^2 = 5."
        ),
        "estrategias_esperadas": json.dumps([
            "Substituição da Equação do Plano na Superfície Quádrica",
            "Parametrização Circular com Seno e Cosseno",
            "Fixação da Cota Z Constante"
        ], ensure_ascii=False)
    },
    {
        "materia": "Cálculo 3",
        "topico": "Funções Vetoriais e Continuidade",
        "subtopico": "Continuidade Pontual de Função Vetorial",
        "dificuldade": 3,
        "banca": "CEDERJ",
        "ano": 2022,
        "tipo": "discursiva",
        "enunciado": (
            "Considere a função vetorial $\\vec{\\alpha}: \\mathbb{R} \\to \\mathbb{R}^2$ definida por partes:\n\n"
            "$$\\vec{\\alpha}(t) = \\begin{cases} \\left( \\frac{\\operatorname{sen} t}{t}, \\; 1 \\right), & \\text{se } t \\neq 0 \\\\ (0, \\; 1), & \\text{se } t = 0 \\end{cases}$$\n\n"
            "Verifique se $\\vec{\\alpha}$ é contínua em $t = 0$. Justifique rigorosamente utilizando a definição de limite e continuidade de funções vetoriais."
        ),
        "gabarito": (
            "A função NÃO é contínua em t = 0. "
            "Pela definição, para que alpha(t) seja contínua em t = 0, devemos ter lim_{t->0} alpha(t) = alpha(0). "
            "Calculando o limite componente a componente: "
            "lim_{t->0} (sen(t)/t) = 1 (pelo limite trigonométrico fundamental) e lim_{t->0} 1 = 1. "
            "Portanto, lim_{t->0} alpha(t) = (1, 1). "
            "Porém, alpha(0) foi definido no enunciado como (0, 1). "
            "Como (1, 1) != (0, 1), o limite não coincide com o valor da função no ponto, logo a função é descontinua em t = 0."
        ),
        "estrategias_esperadas": json.dumps([
            "Aplicação da Definição de Continuidade Vetorial lim alpha(t) = alpha(t_0)",
            "Limite Trigonométrico Notável lim (sen t)/t = 1",
            "Comparação Vetorial entre Limite e Valor da Função no Ponto"
        ], ensure_ascii=False)
    },

    # =========================================================================
    # ÁLGEBRA LINEAR (ÁLGEBRA LINEAR I & II - CEDERJ)
    # =========================================================================
    {
        "materia": "Álgebra Linear",
        "topico": "Matrizes e Operações",
        "subtopico": "Matrizes Simétricas e Antissimétricas",
        "dificuldade": 2,
        "banca": "CEDERJ",
        "ano": 2021,
        "tipo": "objetiva",
        "enunciado": (
            "Considere a matriz quadrada de ordem 3:\n\n"
            "$$A = \\begin{pmatrix} 2 & a+b & 0 \\\\ 1 & 3 & 4 \\\\ b-a & -2 & 5 \\end{pmatrix}$$\n\n"
            "Sabendo que $A$ é uma matriz simétrica ($A^T = A$), determine os valores dos escalares $a$ e $b$:\n\n"
            "(A) $a = 1$ e $b = 3$\n"
            "(B) $a = \\frac{1}{2}$ e $b = \\frac{1}{2}$\n"
            "(C) $a = -1$ e $b = 2$\n"
            "(D) $a = \\frac{3}{2}$ e $b = -\\frac{1}{2}$\n"
            "(E) Não existem valores reais de $a$ e $b$ que tornem a matriz simétrica, pois $a_{23} \\neq a_{32}$."
        ),
        "gabarito": "E",
        "estrategias_esperadas": json.dumps([
            "Condição de Simetria de Matriz a_ij = a_ji",
            "Verificação de Compatibilidade em Todas as Entradas Conjugadas",
            "Detecção de Inconsistência Numérica (4 != -2)"
        ], ensure_ascii=False)
    },
    {
        "materia": "Álgebra Linear",
        "topico": "Determinantes e Propriedades",
        "subtopico": "Operações com Determinante e Matriz Inversa",
        "dificuldade": 2,
        "banca": "CEDERJ",
        "ano": 2021,
        "tipo": "objetiva",
        "enunciado": (
            "Seja $A$ uma matriz invertível de ordem $3 \\times 3$ com $\\det(A) = 2$.\n\n"
            "Os valores de $\\det(3A)$, $\\det(2A^{-1})$ e $\\det\\left((2A)^{-1}\\right)$ são, respectivamente:\n\n"
            "(A) $6, \\; 1 \\; \\text{e} \\; \\frac{1}{6}$\n"
            "(B) $54, \\; 4 \\; \\text{e} \\; \\frac{1}{16}$\n"
            "(C) $18, \\; 4 \\; \\text{e} \\; \\frac{1}{4}$\n"
            "(D) $54, \\; 1 \\; \\text{e} \\; \\frac{1}{8}$\n"
            "(E) $27, \\; 2 \\; \\text{e} \\; \\frac{1}{16}$"
        ),
        "gabarito": "B",
        "estrategias_esperadas": json.dumps([
            "Propriedade det(k*A) = k^n * det(A) para ordem n=3",
            "Propriedade do Determinante da Inversa det(A^-1) = 1/det(A)",
            "Composição de Escalar com Inversa det((2A)^-1) = 1/(2^3 * det A)"
        ], ensure_ascii=False)
    },
    {
        "materia": "Álgebra Linear",
        "topico": "Matrizes e Invertibilidade",
        "subtopico": "Condição de Existência de Inversa",
        "dificuldade": 2,
        "banca": "CEDERJ",
        "ano": 2021,
        "tipo": "objetiva",
        "enunciado": (
            "Considere a matriz $M$ dependente do parâmetro real $m$:\n\n"
            "$$M = \\begin{pmatrix} 6 & 3 \\\\ 2 & m \\end{pmatrix}$$\n\n"
            "Para que a matriz $M$ NÃO possua matriz inversa, o valor de $m$ deve ser igual a:\n\n"
            "(A) $m = -1$\n"
            "(B) $m = 0$\n"
            "(C) $m = 1$\n"
            "(D) $m = 3$\n"
            "(E) $m = -6$"
        ),
        "gabarito": "C",
        "estrategias_esperadas": json.dumps([
            "Critério de Invertibilidade: Matriz Invertível sse det != 0",
            "Cálculo do Determinante 2x2: det(M) = 6m - 6",
            "Resolução da Equação det(M) = 0"
        ], ensure_ascii=False)
    },
    {
        "materia": "Álgebra Linear",
        "topico": "Sistemas Lineares e Escalonamento",
        "subtopico": "Discussão de Sistemas com Parâmetro",
        "dificuldade": 3,
        "banca": "CEDERJ",
        "ano": 2021,
        "tipo": "discursiva",
        "enunciado": (
            "Considere o sistema linear nas variáveis $x, y, z$ em função do parâmetro real $k$:\n\n"
            "$$\\begin{cases} x + ky + z = 1 \\\\ 2x + y + 3z = 2 \\\\ x + y + 3z = 3k \\end{cases}$$\n\n"
            "Utilizando o método de escalonamento da matriz ampliada (eliminação gaussiana), "
            "determine para quais valores de $k$ o sistema admite:\n"
            "(a) Solução única (Sistema Possível e Determinado - SPD);\n"
            "(b) Infinitas soluções (Sistema Possível e Indeterminado - SPI);\n"
            "(c) Nenhuma solução (Sistema Impossível - SI)."
        ),
        "gabarito": (
            "Montando a matriz ampliada e escalonando por operações elementares nas linhas: "
            "L2 <- L2 - 2*L1 e L3 <- L3 - L1. "
            "O pivô da última linha é dado pelo determinante da matriz dos coeficientes. "
            "Calculando o determinante principal D = det([[1, k, 1], [2, 1, 3], [1, 1, 3]]): "
            "D = 1*(3 - 3) - k*(6 - 3) + 1*(2 - 1) = 0 - 3k + 1 = 1 - 3k. "
            "Assim: "
            "(a) O sistema é SPD se e somente se D != 0, isto é, k != 1/3. "
            "(b) Para k = 1/3, substituímos no sistema escalonado. "
            "A matriz escalonada revela inconsistência nos termos independentes caso os termos não se anulem simultaneamente, resultando em: "
            "Se k = 1/3, o sistema torna-se impossível (SI). "
            "(c) Portanto, não existe valor de k para o qual o sistema seja SPI; para k != 1/3 o sistema é SPD e para k = 1/3 o sistema é SI."
        ),
        "estrategias_esperadas": json.dumps([
            "Escalonamento de Matriz Ampliada",
            "Cálculo do Determinante dos Coeficientes det(A)",
            "Teorema de Rouché-Capelli para Posto da Matriz"
        ], ensure_ascii=False)
    },
    {
        "materia": "Álgebra Linear",
        "topico": "Espaços e Subespaços Vetoriais",
        "subtopico": "Verificação de Axiomas de Subespaço",
        "dificuldade": 3,
        "banca": "CEDERJ",
        "ano": 2021,
        "tipo": "discursiva",
        "enunciado": (
            "Seja $V = \\mathbb{R}^3$ o espaço vetorial euclidiano usual. Considere o subconjunto:\n\n"
            "$$W = \\{(x, y, z) \\in \\mathbb{R}^3 \\mid 2x - 3y + z = 0\\}$$\n\n"
            "Demonstre formalmente se $W$ é ou não um subespaço vetorial de $\\mathbb{R}^3$, "
            "verificando as condições de:\n"
            "1. Presença do vetor nulo $\\vec{0} \\in W$;\n"
            "2. Fechamento em relação à adição de vetores ($u, v \\in W \\implies u + v \\in W$);\n"
            "3. Fechamento em relação à multiplicação por escalar ($\alpha \\in \\mathbb{R}, u \\in W \\implies \\alpha u \\in W$)."
        ),
        "gabarito": (
            "Sim, W é um subespaço vetorial de R^3. "
            "Demonstração dos 3 critérios: "
            "1. Vetor nulo: Para (0, 0, 0), temos 2(0) - 3(0) + 0 = 0. Logo, 0 in W. "
            "2. Fechamento na adição: Sejam u = (x1, y1, z1) e v = (x2, y2, z2) pertencentes a W. "
            "Logo 2x1 - 3y1 + z1 = 0 e 2x2 - 3y2 + z2 = 0. "
            "Para u + v = (x1+x2, y1+y2, z1+z2), temos: "
            "2(x1+x2) - 3(y1+y2) + (z1+z2) = (2x1 - 3y1 + z1) + (2x2 - 3y2 + z2) = 0 + 0 = 0. "
            "Logo u + v in W. "
            "3. Fechamento na multiplicação por escalar: Seja alpha in R e u = (x1, y1, z1) in W. "
            "Para alpha*u = (alpha*x1, alpha*y1, alpha*z1), temos: "
            "2(alpha*x1) - 3(alpha*y1) + (alpha*z1) = alpha*(2x1 - 3y1 + z1) = alpha * 0 = 0. "
            "Logo alpha*u in W. "
            "Como os três axiomas são satisfeitos, W é um subespaço vetorial de R^3 (plano passando pela origem)."
        ),
        "estrategias_esperadas": json.dumps([
            "Verificação do Vetor Nulo (0,0,0)",
            "Fechamento da Adição por Combinação Linear das Equações Homogêneas",
            "Homogeneidade da Multiplicação por Escalar"
        ], ensure_ascii=False)
    },
    {
        "materia": "Álgebra Linear",
        "topico": "Transformações Lineares",
        "subtopico": "Núcleo, Imagem e Teorema da Dimensão",
        "dificuldade": 4,
        "banca": "CEDERJ",
        "ano": 2021,
        "tipo": "discursiva",
        "enunciado": (
            "Considere a transformação linear $T: \\mathbb{R}^3 \\to \\mathbb{R}^2$ dada pela lei:\n\n"
            "$$T(x, y, z) = (x - y + 2z, \\; 2x + y - z)$$\n\n"
            "(a) Determine uma base e a dimensão do núcleo de $T$ (denotado por $\\ker(T)$ ou $\\operatorname{Nuc}(T)$);\n"
            "(b) Determine a dimensão da imagem de $T$ ($\\operatorname{Im}(T)$) utilizando o Teorema do Núcleo e da Imagem."
        ),
        "gabarito": (
            "(a) O núcleo ker(T) é o conjunto dos vetores (x, y, z) tais que T(x, y, z) = (0, 0). "
            "Isso gera o sistema homogêneo: "
            "1) x - y + 2z = 0 "
            "2) 2x + y - z = 0. "
            "Somando as duas equações: 3x + z = 0 => z = -3x. "
            "Substituindo na primeira: x - y + 2(-3x) = 0 => x - y - 6x = 0 => y = -5x. "
            "Logo, todo vetor do núcleo tem a forma (x, -5x, -3x) = x*(1, -5, -3), para qualquer x in R. "
            "Uma base para ker(T) é beta = {(1, -5, -3)} e a dimensão é dim(ker(T)) = 1. "
            "(b) Pelo Teorema do Núcleo e da Imagem: dim(V) = dim(ker(T)) + dim(Im(T)). "
            "Como o domínio é R^3, temos dim(V) = 3. "
            "Logo: 3 = 1 + dim(Im(T)) => dim(Im(T)) = 2. "
            "Como dim(Im(T)) = 2 e o contradomínio é R^2, segue que T é sobrejetora e Im(T) = R^2."
        ),
        "estrategias_esperadas": json.dumps([
            "Resolução do Sistema Homogêneo Associado ao Núcleo T(v) = 0",
            "Determinação de Gerador e Verificação de Independência Linear",
            "Aplicação do Teorema do Núcleo e da Imagem dim(V) = dim(Ker) + dim(Im)"
        ], ensure_ascii=False)
    }
]

def inserir_questoes_local():
    print(f"--- 1. Inserindo no SQLite Local: {DB_PATH} ---")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    inseridas_local = 0
    for q in QUESTOES_CEDERJ:
        # Verifica se já existe pelo enunciado para evitar duplicatas
        cur.execute("SELECT id FROM questoes WHERE enunciado = ?", (q["enunciado"],))
        existe = cur.fetchone()
        if existe:
            print(f"  [Já existe local] {q['materia']} - {q['topico']}")
            continue
            
        cur.execute("""
            INSERT INTO questoes (materia, topico, subtopico, dificuldade, banca, ano, enunciado, figura_path, gabarito, estrategias_esperadas, tipo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            q["materia"],
            q["topico"],
            q["subtopico"],
            q["dificuldade"],
            q["banca"],
            q["ano"],
            q["enunciado"],
            None,
            q["gabarito"],
            q["estrategias_esperadas"],
            q["tipo"]
        ))
        inseridas_local += 1
        print(f"  [+] Inserida local: {q['materia']} - {q['topico']} (#{cur.lastrowid})")
        
    conn.commit()
    conn.close()
    print(f"Total de novas questões no SQLite Local: {inseridas_local}")

def inserir_questoes_turso():
    print("\n--- 2. Inserindo no Banco Ativo (Turso/Cloud se configurado) ---")
    con = pegar_conexao()
    cur = con.cursor()
    
    inseridas_turso = 0
    for q in QUESTOES_CEDERJ:
        cur.execute("SELECT id FROM questoes WHERE enunciado = ?", (q["enunciado"],))
        existe = cur.fetchone()
        if existe:
            print(f"  [Já existe no banco ativo] {q['materia']} - {q['topico']}")
            continue
            
        cur.execute("""
            INSERT INTO questoes (materia, topico, subtopico, dificuldade, banca, ano, enunciado, figura_path, gabarito, estrategias_esperadas, tipo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            q["materia"],
            q["topico"],
            q["subtopico"],
            q["dificuldade"],
            q["banca"],
            q["ano"],
            q["enunciado"],
            None,
            q["gabarito"],
            q["estrategias_esperadas"],
            q["tipo"]
        ))
        inseridas_turso += 1
        print(f"  [+] Inserida no banco ativo: {q['materia']} - {q['topico']}")
        
    con.commit()
    print(f"Total de novas questões no Banco Ativo: {inseridas_turso}")

if __name__ == "__main__":
    inserir_questoes_local()
    inserir_questoes_turso()
    print("\nProcesso de cadastro concluído!")
