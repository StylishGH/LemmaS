"""
Ingestão do Lote Piloto: 10 Questões de Limites (Cálculo) do AoPS
Traduzidas rigorosamente para PT-BR com KaTeX.
Origem: A Collection of Limits - AOPS.pdf
"""

import sys
import json
from pathlib import Path

# Configura UTF-8 no Windows
sys.stdout.reconfigure(encoding='utf-8')

# Adiciona caminhos do backend
PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import get_supabase_client

OUTPUT_JSON = PROJECT_ROOT / "data" / "sources" / "aops" / "processed" / "limits_piloto_10.json"
OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)

QUESTOES_PILOTO = [
    {
        "banca": "AoPS",
        "ano": 2011,
        "materia": "Cálculo",
        "topico": "Limites e Continuidade",
        "subtopico": "Indeterminações com Radicais Cúbicos no Infinito",
        "dificuldade": 3,
        "tipo": "discursiva",
        "enunciado": (
            "Calcule o seguinte limite no infinito com diferença de radicais cúbicos:\n\n"
            "$$\\lim_{n\\to\\infty} \\left(\\sqrt[3]{n^3 + 2n^2 + 1} - \\sqrt[3]{n^3 - 1}\\right)$$"
        ),
        "gabarito": (
            "**Resolução Passo a Passo:**\n\n"
            "Temos uma indeterminação do tipo $\\infty - \\infty$. Multiplicamos e dividimos pela expressão conjugada baseada na identidade algébrica da diferença de cubos $a^3 - b^3 = (a - b)(a^2 + ab + b^2)$:\n\n"
            "$$\\lim_{n\\to\\infty} \\frac{(n^3 + 2n^2 + 1) - (n^3 - 1)}{\\sqrt[3]{(n^3 + 2n^2 + 1)^2} + \\sqrt[3]{(n^3 - 1)(n^3 + 2n^2 + 1)} + \\sqrt[3]{(n^3 - 1)^2}}$$\n\n"
            "Simplificando o numerador:\n"
            "$$(n^3 + 2n^2 + 1) - (n^3 - 1) = 2n^2 + 2$$\n\n"
            "Colocando o termo dominante $n^2$ em evidência no numerador e denominador:\n"
            "$$\\lim_{n\\to\\infty} \\frac{n^2\\left(2 + \\frac{2}{n^2}\\right)}{n^2\\left(\\sqrt[3]{\\left(1 + \\frac{2}{n} + \\frac{1}{n^3}\\right)^2} + \\sqrt[3]{\\left(1 - \\frac{1}{n^3}\\right)\\left(1 + \\frac{2}{n} + \\frac{1}{n^3}\\right)} + \\sqrt[3]{\\left(1 - \\frac{1}{n^3}\\right)^2}\\right)}$$\n\n"
            "Cancelando $n^2$ e aplicando o limite quando $n \\to \\infty$:\n"
            "$$= \\frac{2 + 0}{1 + 1 + 1} = \\frac{2}{3}$$\n\n"
            "**Resposta Final:** $\\frac{2}{3}$."
        ),
        "estrategias_esperadas": ["Fator Racionalizante de Ordem 3", "Termos Dominantes no Infinito"],
        "categoria_banca": "Vestibular & Superior",
        "tipo_prova": "Treinamento & Olimpíadas",
        "fase_nivel": "Superior",
        "tipo_material": "livro_exercicios"
    },
    {
        "banca": "AoPS",
        "ano": 2011,
        "materia": "Cálculo",
        "topico": "Limites e Continuidade",
        "subtopico": "Racionalização Dupla e Indeterminação 0/0",
        "dificuldade": 3,
        "tipo": "discursiva",
        "enunciado": (
            "Calcule o seguinte limite com indeterminação do tipo $\\frac{0}{0}$:\n\n"
            "$$\\lim_{x\\to -2} \\frac{\\sqrt[3]{5x + 2} + 2}{\\sqrt{3x + 10} - 2}$$"
        ),
        "gabarito": (
            "**Resolução Passo a Passo:**\n\n"
            "Ao substituir $x = -2$, temos $\\frac{\\sqrt[3]{-8} + 2}{\\sqrt{4} - 2} = \\frac{0}{0}$. Multiplicamos o numerador e o denominador pelos seus respectivos fatores racionalizantes:\n\n"
            "1. Para o numerador (raiz cúbica): multiplicamos por $\\sqrt[3]{(5x+2)^2} - 2\\sqrt[3]{5x+2} + 4$, resultando em:\n"
            "$$(5x + 2) + 2^3 = 5x + 10 = 5(x + 2)$$\n\n"
            "2. Para o denominador (raiz quadrada): multiplicamos por $\\sqrt{3x + 10} + 2$, resultando em:\n"
            "$$(3x + 10) - 2^2 = 3x + 6 = 3(x + 2)$$\n\n"
            "Reescrevendo a fração original:\n"
            "$$\\lim_{x\\to -2} \\frac{5(x + 2)}{3(x + 2)} \\cdot \\frac{\\sqrt{3x + 10} + 2}{\\sqrt[3]{(5x + 2)^2} - 2\\sqrt[3]{5x + 2} + 4}$$\n\n"
            "Cancelando o fator nulo $(x + 2)$:\n"
            "$$= \\frac{5}{3} \\cdot \\frac{\\sqrt{3(-2) + 10} + 2}{\\sqrt[3]{(5(-2) + 2)^2} - 2\\sqrt[3]{5(-2) + 2} + 4}$$\n"
            "$$= \\frac{5}{3} \\cdot \\frac{2 + 2}{4 - 2(-2) + 4} = \\frac{5}{3} \\cdot \\frac{4}{12} = \\frac{5}{3} \\cdot \\frac{1}{3} = \\frac{5}{9}$$\n\n"
            "**Resposta Final:** $\\frac{5}{9}$."
        ),
        "estrategias_esperadas": ["Racionalização Dupla", "Cancelamento de Fatores Algébricos"],
        "categoria_banca": "Vestibular & Superior",
        "tipo_prova": "Treinamento & Olimpíadas",
        "fase_nivel": "Superior",
        "tipo_material": "livro_exercicios"
    },
    {
        "banca": "AoPS",
        "ano": 2011,
        "materia": "Cálculo",
        "topico": "Sequências e Séries",
        "subtopico": "Limites de Sequências e Progressões Aritméticas",
        "dificuldade": 3,
        "tipo": "discursiva",
        "enunciado": (
            "Considere a sequência $(a_n)_{n\\ge 1}$ tal que a soma de seus $n$ primeiros termos é dada por:\n\n"
            "$$\\sum_{k=1}^n a_k = \\frac{3n^2 + 9n}{2}, \\quad \\forall n \\ge 1$$\n\n"
            "Prove que esta sequência é uma progressão aritmética (P.A.) e calcule o limite:\n\n"
            "$$\\lim_{n\\to\\infty} \\frac{1}{n a_n} \\sum_{k=1}^n a_k$$"
        ),
        "gabarito": (
            "**Resolução Passo a Passo:**\n\n"
            "Seja $S_n = \\sum_{k=1}^n a_k = \\frac{3n^2 + 9n}{2}$.\n\n"
            "Para $n = 1$, temos $a_1 = S_1 = \\frac{3(1) + 9(1)}{2} = 6$.\n\n"
            "Para todo $n \\ge 2$, o termo geral é dado por $a_n = S_n - S_{n-1}$:\n"
            "$$a_n = \\frac{3n^2 + 9n}{2} - \\frac{3(n-1)^2 + 9(n-1)}{2}$$\n"
            "$$a_n = \\frac{(3n^2 + 9n) - [3(n^2 - 2n + 1) + 9n - 9]}{2}$$\n"
            "$$a_n = \\frac{3n^2 + 9n - (3n^2 + 3n - 6)}{2} = \\frac{6n + 6}{2} = 3(n + 1)$$\n\n"
            "Como $a_n - a_{n-1} = 3(n + 1) - 3n = 3$ é uma constante para todo $n \\ge 2$, a sequência $(a_n)_{n\\ge 1}$ é, por definição, uma progressão aritmética com primeiro termo $a_1 = 6$ e razão $r = 3$.\n\n"
            "Agora, calculamos o limite pedido:\n"
            "$$\\lim_{n\\to\\infty} \\frac{1}{n a_n} S_n = \\lim_{n\\to\\infty} \\frac{1}{n \\cdot 3(n + 1)} \\cdot \\frac{3n^2 + 9n}{2}$$\n"
            "$$= \\lim_{n\\to\\infty} \\frac{3n(n + 3)}{6n(n + 1)} = \\lim_{n\\to\\infty} \\frac{n + 3}{2(n + 1)} = \\frac{1}{2}$$\n\n"
            "**Resposta Final:** A sequência é uma P.A. de razão $r=3$ e termo $a_n = 3n + 3$; o limite vale $\\frac{1}{2}$."
        ),
        "estrategias_esperadas": ["Relação entre Soma Parcial e Termo Geral", "Limites de Funções Racionais"],
        "categoria_banca": "Vestibular & Superior",
        "tipo_prova": "Treinamento & Olimpíadas",
        "fase_nivel": "Superior",
        "tipo_material": "livro_exercicios"
    },
    {
        "banca": "AoPS",
        "ano": 2011,
        "materia": "Cálculo",
        "topico": "Sequências e Séries",
        "subtopico": "Teorema de Weierstrass e Sequências Recorrentes",
        "dificuldade": 4,
        "tipo": "discursiva",
        "enunciado": (
            "Considere a sequência $(a_n)_{n\\ge 1}$ definida recursivamente por $a_1 = a_2 = 0$ e:\n\n"
            "$$a_{n+1} = \\frac{1}{3}\\left(a_n + a_{n-1}^2 + b\\right), \\quad \\text{onde } 0 \\le b < 1$$\n\n"
            "Prove que a sequência é convergente e determine $\\lim_{n\\to\\infty} a_n$."
        ),
        "gabarito": (
            "**Resolução Passo a Passo:**\n\n"
            "1. **Monotonia:**\n"
            "Temos $a_2 - a_1 = 0$ e $a_3 - a_2 = \\frac{b}{3} \\ge 0$.\n"
            "Subtraindo termos consecutivos da relação de recorrência:\n"
            "$$a_{n+1} - a_n = \\frac{1}{3}\\left[(a_n - a_{n-1}) + (a_{n-1}^2 - a_{n-2}^2)\\right] = \\frac{1}{3}\\left[(a_n - a_{n-1}) + (a_{n-1} - a_{n-2})(a_{n-1} + a_{n-2})\\right]$$\n"
            "Por indução finita, como todos os termos são não negativos, $a_n \\ge a_{n-1} \\implies a_{n+1} \\ge a_n$. Portanto, $(a_n)$ é monótona crescente.\n\n"
            "2. **Limitação Superior:**\n"
            "Como $b < 1$, temos $a_3 = \\frac{b}{3} < 1$. Supondo por indução que $a_{n-1} < 1$ e $a_n < 1$:\n"
            "$$a_{n+1} = \\frac{1}{3}(a_n + a_{n-1}^2 + b) < \\frac{1}{3}(1 + 1 + 1) = 1$$\n"
            "Logo, $a_n \\in [0, 1)$ para todo $n \\ge 1$, sendo a sequência limitada superiormente.\n\n"
            "3. **Existência do Limite e Cálculo:**\n"
            "Pelo Teorema de Weierstrass (Toda sequência monótona e limitada é convergente), existe $L = \\lim_{n\\to\\infty} a_n$.\n"
            "Tomando o limite em ambos os lados da recorrência:\n"
            "$$L = \\frac{1}{3}(L + L^2 + b) \\iff 3L = L^2 + L + b \\iff L^2 - 2L + b = 0$$\n"
            "Resolvendo a equação quadrática em $L$:\n"
            "$$(L - 1)^2 = 1 - b \\implies L = 1 \\pm \\sqrt{1 - b}$$\n\n"
            "Como $a_n < 1$ para todo $n$, devemos ter $L \\le 1$. Logo, descartamos a raiz $1 + \\sqrt{1 - b} > 1$.\n\n"
            "**Resposta Final:** A sequência converge para $L = 1 - \\sqrt{1 - b}$."
        ),
        "estrategias_esperadas": ["Teorema da Convergência Monótona (Weierstrass)", "Equação de Ponto Fixo"],
        "categoria_banca": "Vestibular & Superior",
        "tipo_prova": "Treinamento & Olimpíadas",
        "fase_nivel": "Superior",
        "tipo_material": "livro_exercicios"
    },
    {
        "banca": "AoPS",
        "ano": 2011,
        "materia": "Cálculo",
        "topico": "Sequências e Séries",
        "subtopico": "Recorrências Lineares e Limites Infinitos",
        "dificuldade": 3,
        "tipo": "discursiva",
        "enunciado": (
            "Considere uma sequência de números reais $(x_n)_{n\\ge 1}$ tal que $x_1 = 1$ e:\n\n"
            "$$x_n = 2x_{n-1} + \\frac{1}{2}, \\quad \\forall n \\ge 2$$\n\n"
            "Determine o valor de $\\lim_{n\\to\\infty} x_n$."
        ),
        "gabarito": (
            "**Resolução Passo a Passo:**\n\n"
            "Vamos calcular os primeiros termos da sequência para identificar o padrão do termo geral:\n"
            "* $x_1 = 1$\n"
            "* $x_2 = 2(1) + \\frac{1}{2} = 2 + \\frac{1}{2}$\n"
            "* $x_3 = 2\\left(2 + \\frac{1}{2}\\right) + \\frac{1}{2} = 2^2 + 1 + \\frac{1}{2} = 2^2 + \\frac{1}{2}(2 + 1)$\n"
            "* $x_4 = 2\\left(2^2 + \\frac{3}{2}\\right) + \\frac{1}{2} = 2^3 + 3 + \\frac{1}{2} = 2^3 + \\frac{1}{2}(2^2 + 2 + 1)$\n\n"
            "Pela soma de uma progressão geométrica finita de razão 2:\n"
            "$$x_n = 2^{n-1} + \\frac{1}{2}\\sum_{k=0}^{n-2} 2^k = 2^{n-1} + \\frac{1}{2}(2^{n-1} - 1) = \\frac{3}{2}\\cdot 2^{n-1} - \\frac{1}{2}$$\n\n"
            "Aplicando o limite quando $n \\to \\infty$:\n"
            "Como a base da potência é $2 > 1$, temos $\\lim_{n\\to\\infty} 2^{n-1} = +\\infty$.\n\n"
            "$$\\lim_{n\\to\\infty} x_n = \\lim_{n\\to\\infty} \\left(\\frac{3}{2}\\cdot 2^{n-1} - \\frac{1}{2}\\right) = +\\infty$$\n\n"
            "**Resposta Final:** A sequência diverge para $+\\infty$."
        ),
        "estrategias_esperadas": ["Termo Geral de Recorrência Linear de Primeira Ordem", "Comportamento Assintótico"],
        "categoria_banca": "Vestibular & Superior",
        "tipo_prova": "Treinamento & Olimpíadas",
        "fase_nivel": "Superior",
        "tipo_material": "livro_exercicios"
    },
    {
        "banca": "AoPS",
        "ano": 2011,
        "materia": "Cálculo",
        "topico": "Limites e Continuidade",
        "subtopico": "Teste da Razão e Limites Trigonométricos",
        "dificuldade": 3,
        "tipo": "discursiva",
        "enunciado": (
            "Calcule o seguinte limite:\n\n"
            "$$\\lim_{n\\to\\infty} \\left[ n\\left(\\frac{4}{5}\\right)^n + n^2 \\sin^n\\left(\\frac{\\pi}{6}\\right) + \\cos\\left(\\frac{2n\\pi + \\pi}{n}\\right) \\right]$$"
        ),
        "gabarito": (
            "**Resolução Passo a Passo:**\n\n"
            "Analisamos cada parcela individualmente pela propriedade da soma de limites:\n\n"
            "1. **Primeira Parcela:** $u_n = n\\left(\\frac{4}{5}\\right)^n$.\n"
            "Aplicando o teste da razão de d'Alembert:\n"
            "$$\\lim_{n\\to\\infty} \\frac{u_{n+1}}{u_n} = \\lim_{n\\to\\infty} \\frac{(n+1)\\left(\\frac{4}{5}\\right)^{n+1}}{n\\left(\\frac{4}{5}\\right)^n} = \\frac{4}{5} \\cdot 1 = \\frac{4}{5} < 1$$\n"
            "Como a razão é menor que 1, pelo teste da razão para sequências, $\\lim_{n\\to\\infty} n\\left(\\frac{4}{5}\\right)^n = 0$.\n\n"
            "2. **Segunda Parcela:** Como $\\sin(\\pi/6) = \\frac{1}{2}$, temos $v_n = n^2 \\left(\\frac{1}{2}\\right)^n = \\frac{n^2}{2^n}$.\n"
            "Aplicando o teste da razão:\n"
            "$$\\lim_{n\\to\\infty} \\frac{v_{n+1}}{v_n} = \\lim_{n\\to\\infty} \\frac{(n+1)^2}{2^{n+1}} \\cdot \\frac{2^n}{n^2} = \\frac{1}{2} < 1 \\implies \\lim_{n\\to\\infty} \\frac{n^2}{2^n} = 0$$\n\n"
            "3. **Terceira Parcela:** Pela continuidade da função cosseno:\n"
            "$$\\lim_{n\\to\\infty} \\cos\\left(\\frac{2n\\pi + \\pi}{n}\\right) = \\lim_{n\\to\\infty} \\cos\\left(2\\pi + \\frac{\\pi}{n}\\right) = \\cos(2\\pi + 0) = \\cos(2\\pi) = 1$$\n\n"
            "Somando os três limites:\n"
            "$$\\lim_{n\\to\\infty} \\left[ n\\left(\\frac{4}{5}\\right)^n + n^2 \\sin^n\\left(\\frac{\\pi}{6}\\right) + \\cos\\left(\\frac{2n\\pi + \\pi}{n}\\right) \\right] = 0 + 0 + 1 = 1$$\n\n"
            "**Resposta Final:** $1$."
        ),
        "estrategias_esperadas": ["Teste da Razão para Sequências", "Continuidade de Funções Trigonométricas"],
        "categoria_banca": "Vestibular & Superior",
        "tipo_prova": "Treinamento & Olimpíadas",
        "fase_nivel": "Superior",
        "tipo_material": "livro_exercicios"
    },
    {
        "banca": "AoPS",
        "ano": 2011,
        "materia": "Cálculo",
        "topico": "Sequências e Séries",
        "subtopico": "Soma Telescópica com Fatoriais",
        "dificuldade": 3,
        "tipo": "discursiva",
        "enunciado": (
            "Calcule o limite da soma finita quando $n \\to \\infty$:\n\n"
            "$$\\lim_{n\\to\\infty} \\frac{\\sum_{k=1}^n k! \\cdot k}{(n + 1)!}$$"
        ),
        "gabarito": (
            "**Resolução Passo a Passo:**\n\n"
            "Reescrevemos o termo geral do somatório através da identidade algébrica:\n"
            "$$k! \\cdot k = k! \\cdot [(k + 1) - 1] = (k + 1) \\cdot k! - k! = (k + 1)! - k!$$\n\n"
            "Aplicando a soma telescópica de $k = 1$ até $n$:\n"
            "$$\\sum_{k=1}^n k! \\cdot k = \\sum_{k=1}^n [(k + 1)! - k!]$$\n"
            "$$= (2! - 1!) + (3! - 2!) + (4! - 3!) + \\dots + [(n + 1)! - n!]$$\n"
            "$$= (n + 1)! - 1! = (n + 1)! - 1$$\n\n"
            "Substituindo de volta na fração do limite:\n"
            "$$\\lim_{n\\to\\infty} \\frac{(n + 1)! - 1}{(n + 1)!} = \\lim_{n\\to\\infty} \\left(1 - \\frac{1}{(n + 1)!}\\right) = 1 - 0 = 1$$\n\n"
            "**Resposta Final:** $1$."
        ),
        "estrategias_esperadas": ["Fatoração Telescópica", "Propriedades de Fatoriais"],
        "categoria_banca": "Vestibular & Superior",
        "tipo_prova": "Treinamento & Olimpíadas",
        "fase_nivel": "Superior",
        "tipo_material": "livro_exercicios"
    },
    {
        "banca": "AoPS",
        "ano": 2011,
        "materia": "Cálculo",
        "topico": "Sequências e Séries",
        "subtopico": "Produtório Telescópico",
        "dificuldade": 3,
        "tipo": "discursiva",
        "enunciado": (
            "Calcule o limite do produto infinito:\n\n"
            "$$\\lim_{n\\to\\infty} \\left(1 - \\frac{1}{2^2}\\right)\\left(1 - \\frac{1}{3^2}\\right) \\cdots \\left(1 - \\frac{1}{n^2}\\right)$$"
        ),
        "gabarito": (
            "**Resolução Passo a Passo:**\n\n"
            "Reescrevemos o termo geral do produto pela fatoração da diferença de quadrados:\n"
            "$$1 - \\frac{1}{r^2} = \\frac{r^2 - 1}{r^2} = \\frac{(r - 1)(r + 1)}{r \\cdot r}$$\n\n"
            "Escrevendo o produto $P_n = \\prod_{r=2}^n \\left(1 - \\frac{1}{r^2}\\right)$ expandido:\n"
            "$$P_n = \\left(\\frac{1 \\cdot 3}{2 \\cdot 2}\\right) \\cdot \\left(\\frac{2 \\cdot 4}{3 \\cdot 3}\\right) \\cdot \\left(\\frac{3 \\cdot 5}{4 \\cdot 4}\\right) \\cdots \\left(\\frac{(n-1)(n+1)}{n \\cdot n}\\right)$$\n\n"
            "Agrupando os fatores em dois produtos separados:\n"
            "$$P_n = \\left(\\frac{1}{2} \\cdot \\frac{2}{3} \\cdot \\frac{3}{4} \\cdots \\frac{n-1}{n}\\right) \\cdot \\left(\\frac{3}{2} \\cdot \\frac{4}{3} \\cdot \\frac{5}{4} \\cdots \\frac{n+1}{n}\\right)$$\n\n"
            "Ambos os produtos são telescópicos e cancelam quase todos os termos:\n"
            "* O primeiro produto simplifica para $\\frac{1}{n}$.\n"
            "* O segundo produto simplifica para $\\frac{n+1}{2}$.\n\n"
            "Multiplicando os dois resultados:\n"
            "$$P_n = \\frac{1}{n} \\cdot \\frac{n + 1}{2} = \\frac{n + 1}{2n} = \\frac{1}{2}\\left(1 + \\frac{1}{n}\\right)$$\n\n"
            "Tomando o limite quando $n \\to \\infty$:\n"
            "$$\\lim_{n\\to\\infty} P_n = \\lim_{n\\to\\infty} \\frac{1}{2}\\left(1 + \\frac{1}{n}\\right) = \\frac{1}{2}$$\n\n"
            "**Resposta Final:** $\\frac{1}{2}$."
        ),
        "estrategias_esperadas": ["Fatoração Telescópica de Produtos", "Diferença de Quadrados"],
        "categoria_banca": "Vestibular & Superior",
        "tipo_prova": "Treinamento & Olimpíadas",
        "fase_nivel": "Superior",
        "tipo_material": "livro_exercicios"
    },
    {
        "banca": "AoPS",
        "ano": 2011,
        "materia": "Cálculo",
        "topico": "Sequências e Séries",
        "subtopico": "Critério da Razão-Raiz de Cauchy-D'Alembert",
        "dificuldade": 4,
        "tipo": "discursiva",
        "enunciado": (
            "Calcule o limite da raiz $n$-ésima:\n\n"
            "$$\\lim_{n\\to\\infty} \\sqrt[n]{\\frac{3^{3n}(n!)^3}{(3n)!}}$$"
        ),
        "gabarito": (
            "**Resolução Passo a Passo:**\n\n"
            "Seja $a_n = \\frac{3^{3n}(n!)^3}{(3n)!} = \\frac{27^n (n!)^3}{(3n)!}$.\n\n"
            "Utilizamos o **Critério de Cauchy-D'Alembert** (Critério da Razão-Raiz): se uma sequência de termos estritamente positivos $(a_n)$ satisfaz $\\lim_{n\\to\\infty} \\frac{a_{n+1}}{a_n} = L$, então $\\lim_{n\\to\\infty} \\sqrt[n]{a_n} = L$.\n\n"
            "Calculamos a razão $\\frac{a_{n+1}}{a_n}$:\n"
            "$$\\frac{a_{n+1}}{a_n} = \\frac{3^{3(n+1)} [(n + 1)!]^3}{[3(n + 1)]!} \\cdot \\frac{(3n)!}{3^{3n} (n!)^3}$$\n"
            "$$= \\frac{27 \\cdot 3^{3n} \\cdot (n + 1)^3 (n!)^3}{(3n + 3)(3n + 2)(3n + 1)(3n)!} \\cdot \\frac{(3n)!}{3^{3n} (n!)^3}$$\n"
            "$$= \\frac{27 (n + 1)^3}{(3n + 3)(3n + 2)(3n + 1)}$$\n\n"
            "Como $3n + 3 = 3(n + 1)$, simplificamos um fator $(n + 1)$:\n"
            "$$= \\frac{27 (n + 1)^3}{3(n + 1)(3n + 2)(3n + 1)} = \\frac{9 (n + 1)^2}{(3n + 2)(3n + 1)}$$\n\n"
            "Calculando o limite da razão quando $n \\to \\infty$:\n"
            "$$\\lim_{n\\to\\infty} \\frac{9(n^2 + 2n + 1)}{9n^2 + 9n + 2} = \\lim_{n\\to\\infty} \\frac{9n^2}{9n^2} = 1$$\n\n"
            "Como $\\lim_{n\\to\\infty} \\frac{a_{n+1}}{a_n} = 1$, pelo teorema, temos:\n"
            "$$\\lim_{n\\to\\infty} \\sqrt[n]{a_n} = 1$$\n\n"
            "**Resposta Final:** $1$."
        ),
        "estrategias_esperadas": ["Critério de Cauchy-D'Alembert (Razão-Raiz)", "Simplificação de Fatoriais"],
        "categoria_banca": "Vestibular & Superior",
        "tipo_prova": "Treinamento & Olimpíadas",
        "fase_nivel": "Superior",
        "tipo_material": "livro_exercicios"
    },
    {
        "banca": "AoPS",
        "ano": 2011,
        "materia": "Cálculo",
        "topico": "Sequências e Séries",
        "subtopico": "Teorema do Confronto (Sanduíche)",
        "dificuldade": 3,
        "tipo": "discursiva",
        "enunciado": (
            "Considere uma sequência de números reais positivos $(x_n)_{n\\ge 1}$ tal que:\n\n"
            "$$(n + 1)x_{n+1} - n x_n < 0, \\quad \\forall n \\ge 1$$\n\n"
            "Prove que a sequência é convergente e calcule o seu limite."
        ),
        "gabarito": (
            "**Resolução Passo a Passo:**\n\n"
            "A desigualdade fornecida pode ser reescrita como:\n"
            "$$(n + 1)x_{n+1} < n x_n, \\quad \\forall n \\ge 1$$\n\n"
            "Isso significa que a sequência auxiliar $y_n = n x_n$ é estritamente decrescente para todo $n \\ge 1$:\n"
            "$$x_1 > 2x_2 > 3x_3 > 4x_4 > \\dots > n x_n$$\n\n"
            "Em particular, para qualquer $n \\ge 1$:\n"
            "$$n x_n < x_1 \\implies x_n < \\frac{x_1}{n}$$\n\n"
            "Como todos os termos $x_n$ são estritamente positivos por hipótese, temos o confinamento:\n"
            "$$0 < x_n < \\frac{x_1}{n}, \\quad \\forall n \\ge 1$$\n\n"
            "Calculamos os limites dos extremos quando $n \\to \\infty$:\n"
            "* $\\lim_{n\\to\\infty} 0 = 0$\n"
            "* $\\lim_{n\\to\\infty} \\frac{x_1}{n} = 0$ (já que $x_1$ é uma constante fixa)\n\n"
            "Pelo **Teorema do Confronto** (Teorema do Sanduíche / Squeeze Theorem), segue diretamente que a sequência $(x_n)_{n\\ge 1}$ converge e seu limite é:\n"
            "$$\\lim_{n\\to\\infty} x_n = 0$$\n\n"
            "**Resposta Final:** A sequência converge e seu limite é $0$."
        ),
        "estrategias_esperadas": ["Teorema do Confronto (Sanduíche)", "Desigualdades em Sequências"],
        "categoria_banca": "Vestibular & Superior",
        "tipo_prova": "Treinamento & Olimpíadas",
        "fase_nivel": "Superior",
        "tipo_material": "livro_exercicios"
    }
]


def main():
    print("=== INGESTÃO DO LOTE PILOTO (10 QUESTÕES DE LIMITES - AOPS) ===")
    print(f"Total de questões traduzidas e formatadas: {len(QUESTOES_PILOTO)}")

    # 1. Salva Backup JSON
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(QUESTOES_PILOTO, f, ensure_ascii=False, indent=2)
    print(f"Backup JSON salvo em: {OUTPUT_JSON}")

    # 2. Conecta ao Supabase
    supabase = get_supabase_client()
    if not supabase:
        print("Erro: não foi possível conectar ao Supabase.")
        return

    # 3. Insere no Supabase
    res = supabase.table("questoes").insert(QUESTOES_PILOTO).execute()
    if not res.data:
        print(f"Erro ao inserir no Supabase: {res}")
        return

    ids = [r["id"] for r in res.data]
    print(f"\n✅ {len(ids)} questões inseridas com sucesso no Supabase!")
    print(f"Faixa de IDs gerada: #{min(ids)} a #{max(ids)}")

    for r in res.data:
        print(f"  ID #{r['id']} | {r['subtopico']} (Dificuldade {r['dificuldade']})")


if __name__ == "__main__":
    main()
