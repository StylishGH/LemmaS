"""
Script de Reclassificação e Padronização Completa das Questões do CEDERJ.
1. Reclassifica as 20 questões que estavam como 'objetiva' sem alternativas para 'discursiva'.
2. Atualiza seus gabaritos para KaTeX com passos completos.
3. Sincroniza todas as 74 questões do CEDERJ no SQLite Local e no Turso Cloud.
"""

import sys
import json
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

from src.database.db import DB_PATH, pegar_conexao

GABARITOS_UPGRADE = {
    1461: (
        "Questão discursiva/trabalho pedagógico.\n\n"
        "**Relação de Euler para Poliedros Convexos:**\n"
        "$$V - A + F = 2$$\n"
        "Onde:\n"
        "* $V$ é o número de vértices;\n"
        "* $A$ é o número de arestas;\n"
        "* $F$ é o número de faces.\n\n"
        "**Recursos didáticos recomendados:**\n"
        "1. **Modelos manipuláveis tridimensionais:** montagem de sólidos com canudos e massinha de modelar (ou palitos e jujubas) para contagem direta de $V$, $A$ e $F$.\n"
        "2. **Software de Geometria Dinâmica (GeoGebra 3D):** visualização e manipulação interativa de poliedros regulares (Platão) e semirregulares (Arquimedes).\n"
        "3. **Planificação e achatamento planar:** projeção do grafo planar do poliedro para contagem das regiões do plano."
    ),
    1462: (
        "Questão discursiva/trabalho avaliativo de pesquisa.\n\n"
        "**Poliedros Estrelados (Poliedros de Kepler-Poinsot):**\n"
        "São poliedros regulares não convexos cujas faces são polígonos estrelados ou cujas figuras de vértice são estreladas. Existem exatamente 4 poliedros de Kepler-Poinsot:\n"
        "1. Pequeno dodecaedro estrelado\n"
        "2. Grande dodecaedro estrelado\n"
        "3. Grande dodecaedro\n"
        "4. Grande icosaedro\n\n"
        "Para esses poliedros não convexos, a característica de Euler pode assumir valores diferentes de 2 (por exemplo, $\\chi = V - A + F = -6$ para o pequeno dodecaedro estrelado)."
    ),
    1463: (
        "Questão discursiva/trabalho prático interdisciplinar.\n\n"
        "**Orientações Pedagógicas:**\n"
        "Identificação de conceitos geométricos espaciais em estruturas da arquitetura e engenharia urbana:\n"
        "* **Prismas e Paralelepípedos:** edifícios residenciais e comerciais (estudo de paralelismo, perpendicularismo, faces e cálculo de volume $V = A_b \\cdot h$).\n"
        "* **Pirâmides e Cúpulas:** coberturas de ginásios e monumentos históricos.\n"
        "* **Cilindros e Superfícies Cônicas:** caixas d'água, reservatórios e pilares de pontes."
    ),
    1464: (
        "Questão discursiva/trabalho avaliativo.\n\n"
        "**Sólidos de Revolução:**\n"
        "Corpos geométricos gerados pela rotação completa ($360^\\circ$) de uma figura plana em torno de um eixo coplanar fixo:\n"
        "1. **Cilindro circular reto:** rotação de um retângulo em torno de um de seus lados ($V = \\pi r^2 h$).\n"
        "2. **Cone circular reto:** rotação de um triângulo retângulo em torno de um dos catetos ($V = \\frac{1}{3}\\pi r^2 h$).\n"
        "3. **Esfera:** rotação de um semicírculo em torno do seu diâmetro ($V = \\frac{4}{3}\\pi r^3$).\n\n"
        "No Ensino Superior (Cálculo), seus volumes são calculados via integrais definidas pelo método dos discos/anéis ou cascas cilíndricas:\n"
        "$$V = \\pi \\int_a^b [f(x)]^2 \\, dx$$"
    ),
    1465: (
        "Dada a equação quadrática:\n"
        "$$2x^2 + 3x - 2 = 0$$\n\n"
        "Identificando os coeficientes: $a = 2, \\; b = 3, \\; c = -2$.\n\n"
        "Calculando o discriminante ($\\Delta$):\n"
        "$$\\Delta = b^2 - 4ac = 3^2 - 4(2)(-2) = 9 + 16 = 25$$\n\n"
        "Aplicando a fórmula de Bhaskara:\n"
        "$$x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a} = \\frac{-3 \\pm \\sqrt{25}}{2(2)} = \\frac{-3 \\pm 5}{4}$$\n\n"
        "Portanto, as raízes são:\n"
        "$$x_1 = \\frac{-3 + 5}{4} = \\frac{2}{4} = \\frac{1}{2} \\quad \\text{e} \\quad x_2 = \\frac{-3 - 5}{4} = \\frac{-8}{4} = -2$$"
    ),
    1466: (
        "Dada a equação quadrática:\n"
        "$$x^2 + x - 6 = 0$$\n\n"
        "Com coeficientes $a = 1, \\; b = 1, \\; c = -6$.\n\n"
        "Pelas relações de Girard (Soma e Produto das raízes):\n"
        "$$S = x_1 + x_2 = -\\frac{b}{a} = -1$$\n"
        "$$P = x_1 \\cdot x_2 = \\frac{c}{a} = -6$$\n\n"
        "Buscamos dois números inteiros cujo produto seja $-6$ e cuja soma seja $-1$:\n"
        "* Testando a soma $(-3) + 2 = -1$ e produto $(-3) \\times 2 = -6$.\n\n"
        "Portanto, as raízes são:\n"
        "$$x_1 = -3 \\quad \\text{e} \\quad x_2 = 2$$"
    ),
    1467: (
        "Dados os vetores:\n"
        "$$\\vec{z} = a\\vec{x} + b\\vec{y}, \\quad \\vec{w} = c\\vec{x} + d\\vec{y}$$\n"
        "$$\\vec{u} = \\vec{z} + \\vec{w} = (a + c)\\vec{x} + (b + d)\\vec{y}$$\n\n"
        "Substituindo os parâmetros ($a = -5, \\; b = 0, \\; c = 7, \\; d = -5$):\n"
        "$$\\vec{u} = (-5 + 7)\\vec{x} + (0 - 5)\\vec{y} = 2\\vec{x} - 5\\vec{y}$$\n\n"
        "Considerando $\\vec{x}$ e $\\vec{y}$ vetores ortonormais canônicos:\n"
        "$$\\|\\vec{u}\\| = \\sqrt{2^2 + (-5)^2} = \\sqrt{4 + 25} = \\sqrt{29} \\approx 5{,}39$$"
    ),
    1468: (
        "Dados os vetores:\n"
        "$$\\vec{z} = a\\vec{x} + b\\vec{y}, \\quad \\vec{w} = c\\vec{x} + d\\vec{y}$$\n"
        "$$\\vec{u} = 2\\vec{z} + 5\\vec{w} = 2(a\\vec{x} + b\\vec{y}) + 5(c\\vec{x} + d\\vec{y}) = (2a + 5c)\\vec{x} + (2b + 5d)\\vec{y}$$\n\n"
        "Substituindo os valores ($a = 3, \\; b = 9, \\; c = -3, \\; d = 9$):\n"
        "$$2a + 5c = 2(3) + 5(-3) = 6 - 15 = -9$$\n"
        "$$2b + 5d = 2(9) + 5(9) = 18 + 45 = 63$$\n\n"
        "Logo: $\\vec{u} = -9\\vec{x} + 63\\vec{y}$.\n\n"
        "Calculando a norma:\n"
        "$$\\|\\vec{u}\\| = \\sqrt{(-9)^2 + 63^2} = \\sqrt{81 + 3969} = \\sqrt{4050} \\approx 63{,}64$$"
    ),
    1488: (
        "Para que $f(x)$ seja contínua em $x = 1$, é necessário que $\\lim_{x \\to 1} f(x) = f(1)$.\n\n"
        "Calculando o limite para $x \\to 1$:\n"
        "$$\\lim_{x \\to 1} f(x) = \\lim_{x \\to 1} \\frac{x^2 - 1}{x - 1} = \\lim_{x \\to 1} \\frac{(x - 1)(x + 1)}{x - 1} = \\lim_{x \\to 1} (x + 1) = 1 + 1 = 2$$\n\n"
        "No entanto, o valor definido no ponto é:\n"
        "$$f(1) = 1$$\n\n"
        "Como $\\lim_{x \\to 1} f(x) = 2 \\neq 1 = f(1)$, **a função é descontínua em $x = 1$** (descontinuidade removível)."
    ),
    1489: (
        "Para analisar a continuidade de $f(x)$ em $x = -1$, calculamos os limites laterais e o valor no ponto:\n\n"
        "1. **Valor no ponto** ($x = -1$ pertence a $x \\ge -1$):\n"
        "$$f(-1) = (-1)^2 - (-1) - 2 = 1 + 1 - 2 = 0$$\n\n"
        "2. **Limite lateral pela direita** ($x \\to -1^+$):\n"
        "$$\\lim_{x \\to -1^+} (x^2 - x - 2) = (-1)^2 - (-1) - 2 = 0$$\n\n"
        "3. **Limite lateral pela esquerda** ($x \\to -1^-$):\n"
        "$$\\lim_{x \\to -1^-} (x + 1) = -1 + 1 = 0$$\n\n"
        "Como os limites laterais coincidem e são iguais ao valor da função ($0$), **a função é contínua em $x = -1$**."
    ),
    1490: (
        "Calculando o limite:\n"
        "$$L = \\lim_{x \\to 1} \\frac{x - 1}{x^2 - 4x + 3}$$\n\n"
        "Avaliando em $x = 1$, temos uma indeterminação do tipo $\\left[\\frac{0}{0}\\right]$.\n\n"
        "Fatorando o denominador $x^2 - 4x + 3 = (x - 1)(x - 3)$:\n"
        "$$L = \\lim_{x \\to 1} \\frac{x - 1}{(x - 1)(x - 3)} = \\lim_{x \\to 1} \\frac{1}{x - 3}$$\n\n"
        "Substituindo $x = 1$:\n"
        "$$L = \\frac{1}{1 - 3} = -\\frac{1}{2}$$"
    ),
    1491: (
        "Calculando o limite no infinito:\n"
        "$$L = \\lim_{x \\to +\\infty} \\frac{5 - x^3}{8x - 2}$$\n\n"
        "Colocando o termo de maior grau em evidência:\n"
        "$$L = \\lim_{x \\to +\\infty} \\frac{-x^3\\left(1 - \\frac{5}{x^3}\\right)}{8x\\left(1 - \\frac{2}{8x}\\right)} = \\lim_{x \\to +\\infty} \\left(-\\frac{x^2}{8}\\right) = -\\infty$$"
    ),
    1492: (
        "Calculando o limite no infinito:\n"
        "$$L = \\lim_{x \\to +\\infty} \\frac{2x^4 + 3x^2 - 2}{4 - x^4}$$\n\n"
        "Como os graus do numerador e do denominador são iguais (grau 4), o limite é dado pela razão dos coeficientes dos termos líderes:\n"
        "$$L = \\lim_{x \\to +\\infty} \\frac{x^4\\left(2 + \\frac{3}{x^2} - \\frac{2}{x^4}\\right)}{x^4\\left(\\frac{4}{x^4} - 1\\right)} = \\frac{2 + 0 - 0}{0 - 1} = -2$$"
    ),
    1493: (
        "Calculando o limite:\n"
        "$$L = \\lim_{x \\to +\\infty} (\\sqrt{x + 3} - \\sqrt{x})$$\n\n"
        "Temos uma indeterminação do tipo $[\\infty - \\infty]$. Multiplicando e dividindo pelo conjugado $(\\sqrt{x + 3} + \\sqrt{x})$:\n\n"
        "$$L = \\lim_{x \\to +\\infty} \\frac{(\\sqrt{x + 3} - \\sqrt{x})(\\sqrt{x + 3} + \\sqrt{x})}{\\sqrt{x + 3} + \\sqrt{x}} = \\lim_{x \\to +\\infty} \\frac{(x + 3) - x}{\\sqrt{x + 3} + \\sqrt{x}} = \\lim_{x \\to +\\infty} \\frac{3}{\\sqrt{x + 3} + \\sqrt{x}}$$\n\n"
        "Quando $x \\to +\\infty$, o denominador tende a $+\\infty$:\n"
        "$$L = 0$$"
    ),
    1494: (
        "Calculando o limite polinomial por substituição direta:\n"
        "$$\\lim_{x \\to 2} (2x^2 - 7x + 4)$$\n\n"
        "Por ser uma função polinomial contínua em todo $\\mathbb{R}$:\n"
        "$$\\lim_{x \\to 2} (2x^2 - 7x + 4) = 2(2)^2 - 7(2) + 4 = 2(4) - 14 + 4 = 8 - 14 + 4 = -2$$"
    ),
    1495: (
        "Calculando o limite racional por substituição direta:\n"
        "$$L = \\lim_{x \\to 1} \\frac{x^2 + 7x - 2}{-3x + 5}$$\n\n"
        "Como o denominador em $x = 1$ é não nulo ($-3(1) + 5 = 2 \\neq 0$):\n"
        "$$L = \\frac{1^2 + 7(1) - 2}{-3(1) + 5} = \\frac{1 + 7 - 2}{-3 + 5} = \\frac{6}{2} = 3$$"
    ),
    1496: (
        "Calculando o limite por substituição direta:\n"
        "$$L = \\lim_{x \\to 27} \\frac{\\sqrt[3]{x} - 1}{x - 2}$$\n\n"
        "Como o denominador em $x = 27$ é $27 - 2 = 25 \\neq 0$:\n"
        "$$L = \\frac{\\sqrt[3]{27} - 1}{27 - 2} = \\frac{3 - 1}{25} = \\frac{2}{25}$$"
    ),
    1497: (
        "Dada a equação quadrática:\n"
        "$$2x^2 + 3x - 2 = 0$$\n\n"
        "Calculando o discriminante:\n"
        "$$\\Delta = 3^2 - 4(2)(-2) = 9 + 16 = 25$$\n"
        "$$x = \\frac{-3 \\pm \\sqrt{25}}{2(2)} = \\frac{-3 \\pm 5}{4}$$\n\n"
        "Portanto, as raízes são:\n"
        "$$x_1 = \\frac{1}{2} \\quad \\text{e} \\quad x_2 = -2$$"
    ),
    1498: (
        "Dada a equação quadrática:\n"
        "$$x^2 + x - 6 = 0$$\n\n"
        "Pelo método da soma e produto:\n"
        "$$S = x_1 + x_2 = -1 \\quad \\text{e} \\quad P = x_1 \\cdot x_2 = -6$$\n\n"
        "Buscando dois números cuja soma seja $-1$ e o produto seja $-6$:\n"
        "$$x_1 = -3 \\quad \\text{e} \\quad x_2 = 2$$"
    ),
    1499: (
        "Dada a expressão quadrática:\n"
        "$$x^2 + 8x + 1$$\n\n"
        "Para completar o quadrado perfeito $(x + 4)^2 = x^2 + 8x + 16$, somamos e subtraímos $16$:\n"
        "$$x^2 + 8x + 1 = (x^2 + 8x + 16) - 16 + 1 = (x + 4)^2 - 15$$"
    )
}

def reclassificar_e_sincronizar():
    print("=== 1. Atualizando Questões no Turso Cloud ===")
    con = pegar_conexao()
    cur = con.cursor()
    
    # Atualiza as 20 falsas objetivas para discursiva e atualiza gabarito
    upd_turso = 0
    for qid, novo_gab in GABARITOS_UPGRADE.items():
        cur.execute("""
            UPDATE questoes 
            SET tipo = 'discursiva', gabarito = ?
            WHERE id = ?
        """, (novo_gab, qid))
        upd_turso += cur.rowcount
    con.commit()
    print(f"Questões reclassificadas e atualizadas no Turso: {upd_turso}")

    print("\n=== 2. Buscando todas as 74 questões CEDERJ do Turso ===")
    cur.execute("SELECT * FROM questoes WHERE banca LIKE '%CEDERJ%' ORDER BY id")
    questoes_turso = cur.fetchall()
    print(f"Total de questões CEDERJ recuperadas do Turso: {len(questoes_turso)}")

    print("\n=== 3. Sincronizando com o SQLite Local (mathai.db) ===")
    conn_loc = sqlite3.connect(DB_PATH)
    cur_loc = conn_loc.cursor()

    # Deleta registros antigos de CEDERJ no SQLite para reinserir com os IDs e dados sincronizados
    cur_loc.execute("DELETE FROM questoes WHERE banca LIKE '%CEDERJ%'")
    
    inseridas_loc = 0
    for q in questoes_turso:
        d = dict(q)
        cur_loc.execute("""
            INSERT OR REPLACE INTO questoes (
                id, materia, topico, subtopico, dificuldade, banca, ano, 
                enunciado, figura_path, gabarito, estrategias_esperadas, tipo, mathnet_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            d.get("id"), d.get("materia"), d.get("topico"), d.get("subtopico"),
            d.get("dificuldade"), d.get("banca"), d.get("ano"), d.get("enunciado"),
            d.get("figura_path"), d.get("gabarito"), d.get("estrategias_esperadas"),
            d.get("tipo"), d.get("mathnet_id")
        ))
        inseridas_loc += 1

    conn_loc.commit()
    conn_loc.close()
    print(f"Total sincronizado no SQLite Local: {inseridas_loc} questões!")

if __name__ == "__main__":
    reclassificar_e_sincronizar()
