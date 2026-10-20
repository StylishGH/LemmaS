import sys
import io
import json
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
out_dir = PROJECT_ROOT / "data" / "sources" / "escola_naval" / "processed" / "2025"
out_dir.mkdir(parents=True, exist_ok=True)
out_file = out_dir / "questoes.json"

questoes = [
    {
        "id_externo": "ESCOLA_NAVAL_2025_Q01",
        "materia": "Matemática",
        "topico": "Cálculo Diferencial e Integral",
        "subtopico": "Integração por partes",
        "dificuldade": 3,
        "banca": "Escola Naval",
        "ano": 2025,
        "enunciado": "Resolva a integral $\\int_{0}^{\\sqrt{3}} \\ln(x + \\sqrt{x^2 + 1})\\,dx$ e assinale a opção correta.",
        "figura_path": None,
        "gabarito": "B",
        "tipo": "objetiva",
        "alternativas": {
            "a": "$\\sqrt{3}\\ln(\\sqrt{3} + 2) + 1$",
            "b": "$\\sqrt{3}\\ln(\\sqrt{3} + 2) - 1$",
            "c": "$-\\sqrt{3}\\ln(\\sqrt{3} + 2) + 1$",
            "d": "$-\\sqrt{3}\\ln(\\sqrt{3} + 2) - 1$",
            "e": "$\\sqrt{3}\\ln(\\sqrt{3} + 2)$"
        },
        "estrategias_esperadas": ["Integração por partes com u = ln(x + sqrt(x^2 + 1)) e dv = dx"]
    },
    {
        "id_externo": "ESCOLA_NAVAL_2025_Q02",
        "materia": "Matemática",
        "topico": "Geometria Espacial",
        "subtopico": "Tronco de pirâmide e progressões",
        "dificuldade": 3,
        "banca": "Escola Naval",
        "ano": 2025,
        "enunciado": "Um tronco de pirâmide regular de base hexagonal e volume $126\\text{ u.v.}$ possui lado da base menor, lado da base maior e altura, nesta ordem, formando uma progressão geométrica de razão natural não nula e termo inicial no intervalo $[3/2, 2]$. Determine o ângulo formado pela face lateral do tronco e a base maior e assinale a opção correta.",
        "figura_path": None,
        "gabarito": "A",
        "tipo": "objetiva",
        "alternativas": {
            "a": "$\\operatorname{arctg}\\left(\\frac{8\\sqrt{3}}{3}\\right)$",
            "b": "$\\operatorname{arctg}(2\\sqrt{3})$",
            "c": "$\\operatorname{arctg}(\\sqrt{3})$",
            "d": "$\\operatorname{arctg}\\left(\\frac{2\\sqrt{3}}{3}\\right)$",
            "e": "$\\operatorname{arctg}\\left(\\frac{\\sqrt{3}}{3}\\right)$"
        },
        "estrategias_esperadas": ["Volume de tronco de pirâmide", "Apotema do tronco e trigonometria no triângulo retângulo da face lateral"]
    },
    {
        "id_externo": "ESCOLA_NAVAL_2025_Q03",
        "materia": "Matemática",
        "topico": "Geometria Plana",
        "subtopico": "Divisão de áreas e baricentro",
        "dificuldade": 2,
        "banca": "Escola Naval",
        "ano": 2025,
        "enunciado": "Um triângulo $ABC$ de área $108\\text{ u.a.}$ possui $AM$ e $CP$ como medianas encontrando-se no ponto $Q$. Considere o ponto $R$ sobre $AC$ de modo que $5AR = AC$ e o ponto $S$ sobre $AB$ de forma que $4AS = AB$. Calcule a área do quadrilátero $ARQS$, em unidades de área, e assinale a opção correta.",
        "figura_path": None,
        "gabarito": "B",
        "tipo": "objetiva",
        "alternativas": {
            "a": "12,0",
            "b": "16,2",
            "c": "19,5",
            "d": "22,3",
            "e": "27,0"
        },
        "estrategias_esperadas": ["Propriedades do baricentro (razão 2:1)", "Proporcionalidade de áreas por bases e alturas comuns"]
    },
    {
        "id_externo": "ESCOLA_NAVAL_2025_Q04",
        "materia": "Matemática",
        "topico": "Cálculo Diferencial e Integral",
        "subtopico": "Análise de gráficos de funções racionais",
        "dificuldade": 3,
        "banca": "Escola Naval",
        "ano": 2025,
        "enunciado": "Assinale a opção que apresenta o gráfico da função $f(x) = \\frac{x^3 - x^2 - 3x + 1}{x^2 - x}$.",
        "figura_path": "/data/imagens/escola_naval/2025/escola_naval_2025_q04_fig1.png",
        "gabarito": "E",
        "tipo": "objetiva",
        "alternativas": {
            "a": "Gráfico (A) da figura",
            "b": "Gráfico (B) da figura",
            "c": "Gráfico (C) da figura",
            "d": "Gráfico (D) da figura",
            "e": "Gráfico (E) da figura"
        },
        "estrategias_esperadas": ["Assíntotas verticais em x=0 e x=1", "Assíntota oblíqua y = x", "Análise de derivada primeira e segunda"]
    },
    {
        "id_externo": "ESCOLA_NAVAL_2025_Q05",
        "materia": "Matemática",
        "topico": "Álgebra",
        "subtopico": "Equações diofantinas e divisores",
        "dificuldade": 2,
        "banca": "Escola Naval",
        "ano": 2025,
        "enunciado": "Considere o conjunto $P = \\left\\{(a,b) \\in \\mathbb{Z}^* \\times \\mathbb{Z}^* \\mid \\frac{1}{a} + \\frac{1}{b} = \\frac{1}{50}\\right\\}$. Assinale a opção que apresenta corretamente o número de elementos do conjunto $P$.",
        "figura_path": None,
        "gabarito": "C",
        "tipo": "objetiva",
        "alternativas": {
            "a": "27",
            "b": "28",
            "c": "29",
            "d": "30",
            "e": "31"
        },
        "estrategias_esperadas": ["Fatoração de Simon: (a - 50)(b - 50) = 50^2", "Cálculo da quantidade de divisores inteiros de 2500"]
    },
    {
        "id_externo": "ESCOLA_NAVAL_2025_Q06",
        "materia": "Matemática",
        "topico": "Álgebra Linear",
        "subtopico": "Potências de matrizes e séries geométricas",
        "dificuldade": 2,
        "banca": "Escola Naval",
        "ano": 2025,
        "enunciado": "Dada uma matriz quadrada $A$, definimos o traço de $A$ como a soma dos elementos de sua diagonal principal. Denotar-se-á tal número por $\\operatorname{tr}(A)$. Com base nessas informações calcule $\\sum_{n=1}^{+\\infty} \\frac{1}{\\operatorname{tr}(M^{8n-4})}$, onde $M = \\begin{pmatrix} 1 & 0 & i \\\\ 0 & 0 & 0 \\\\ i & 0 & 1 \\end{pmatrix}$, com $i \\in \\mathbb{C}$ e $i^2 = -1$, e assinale a opção correta.",
        "figura_path": None,
        "gabarito": "B",
        "tipo": "objetiva",
        "alternativas": {
            "a": "$-\\frac{1}{15}$",
            "b": "$-\\frac{2}{15}$",
            "c": "$\\frac{1}{15}$",
            "d": "$\\frac{2}{15}$",
            "e": "0"
        },
        "estrategias_esperadas": ["Diagonalização ou cálculo de potências de M", "Soma de progressão geométrica infinita"]
    },
    {
        "id_externo": "ESCOLA_NAVAL_2025_Q07",
        "materia": "Matemática",
        "topico": "Trigonometria",
        "subtopico": "Ângulos complementares e inequações trigonométricas",
        "dificuldade": 1,
        "banca": "Escola Naval",
        "ano": 2025,
        "enunciado": "Considere $a = (\\operatorname{cotg} 1^\\circ)(\\operatorname{cotg} 2^\\circ)\\cdots(\\operatorname{cotg} 88^\\circ)(\\operatorname{cotg} 89^\\circ)$. Determine o conjunto solução da inequação $\\cos(2x) + \\operatorname{sen}(x) > 2 - a$, com $x \\in [0, \\pi]$, e assinale a opção correta.",
        "figura_path": None,
        "gabarito": "D",
        "tipo": "objetiva",
        "alternativas": {
            "a": "$\\left]0, \\frac{\\pi}{3}\\right[ \\cup \\left]\\frac{2\\pi}{3}, \\pi\\right[$",
            "b": "$\\left]0, \\frac{\\pi}{4}\\right[ \\cup \\left]\\frac{3\\pi}{4}, \\pi\\right[$",
            "c": "$\\left]0, \\frac{\\pi}{6}\\right[ \\cup \\left]\\frac{\\pi}{4}, \\pi\\right[$",
            "d": "$\\left]0, \\frac{\\pi}{6}\\right[ \\cup \\left]\\frac{5\\pi}{6}, \\pi\\right[$",
            "e": "$]0, \\pi[$"
        },
        "estrategias_esperadas": ["Propriedade cotg(x)cotg(90 - x) = 1", "Inequação do segundo grau em sen(x)"]
    },
    {
        "id_externo": "ESCOLA_NAVAL_2025_Q08",
        "materia": "Matemática",
        "topico": "Geometria Analítica",
        "subtopico": "Circunferência e sólidos de revolução",
        "dificuldade": 2,
        "banca": "Escola Naval",
        "ano": 2025,
        "enunciado": "Os pontos $A(5,9)$, $B(4,4)$ e $C(10,4)$ pertencem a uma circunferência de raio $r$, centrada em $O(x_0, y_0)$. Além disso, os pontos $P(x_0 + 3r, y_0)$, $O$ e $C$ formam um triângulo que será rotacionado em torno da reta $x = x_0$ produzindo o sólido de revolução $S$. Com base nessas informações, calcule o volume de $S$ em unidades de volume e assinale a opção correta.",
        "figura_path": None,
        "gabarito": "C",
        "tipo": "objetiva",
        "alternativas": {
            "a": "$\\pi(8 + \\sqrt{13})$",
            "b": "$\\pi(8 - \\sqrt{13})$",
            "c": "$\\pi(6 + \\sqrt{13})\\sqrt{13}$",
            "d": "$\\pi(6 - \\sqrt{13})\\sqrt{13}$",
            "e": "$\\pi(8 + \\sqrt{13})\\sqrt{13}$"
        },
        "estrategias_esperadas": ["Determinação do centro e raio da circunferência circunscrita", "Teorema de Pappus-Guldin ou integração para sólido de revolução"]
    },
    {
        "id_externo": "ESCOLA_NAVAL_2025_Q09",
        "materia": "Matemática",
        "topico": "Cálculo Diferencial e Integral",
        "subtopico": "Derivadas, máximos e mínimos e erro relativo",
        "dificuldade": 2,
        "banca": "Escola Naval",
        "ano": 2025,
        "enunciado": "Um aspirante, encantado pelo Pão de Açúcar, um dos famosos pontos turísticos observados a partir da Escola Naval, resolveu utilizar os conceitos aprendidos em Cálculo para estimar as alturas do morro do Pão de Açúcar (A) e do morro da Urca (B), considerados extremos. Para isto, modelou ambos os morros de acordo com a função $f(x) = 400 - (x - 2)^2 e^{-x}$, representada no gráfico abaixo com $x$ e $y$ em metros. Sabendo que as alturas dos morros do Pão de Açúcar e da Urca são 391 metros e 220 metros, respectivamente, assinale a alternativa correta. (Considere $e^{1/4} \\approx 1,2$).",
        "figura_path": "/data/imagens/escola_naval/2025/escola_naval_2025_q09_fig1.png",
        "gabarito": "D",
        "tipo": "objetiva",
        "alternativas": {
            "a": "A altura dos morros foi estimada com erro relativo inferior a 5%.",
            "b": "A altura dos morros foi estimada com erro relativo igual a 10%.",
            "c": "A altura dos morros foi estimada com erro relativo superior a 40%.",
            "d": "A altura do morro do Pão de Açúcar foi estimada com erro relativo inferior a 10%, enquanto a altura do morro da Urca teve erro relativo superior a 40%.",
            "e": "A altura do morro da Urca foi estimada com erro relativo inferior a 10%, enquanto a altura estimada para o morro do Pão de Açúcar teve erro relativo superior a 40%."
        },
        "estrategias_esperadas": ["Derivada f'(x) para encontrar pontos críticos (extremos locais)", "Cálculo de erro relativo |valor_estimado - valor_real| / valor_real"]
    },
    {
        "id_externo": "ESCOLA_NAVAL_2025_Q10",
        "materia": "Matemática",
        "topico": "Cálculo Diferencial e Integral",
        "subtopico": "Pontos de inflexão e Tridente de Newton",
        "dificuldade": 1,
        "banca": "Escola Naval",
        "ano": 2025,
        "enunciado": "Examine o gráfico abaixo. As funções do tipo $y = ax^2 + bx + c + \\frac{d}{x}$, com $a, b, c, d \\in \\mathbb{Z}$, sendo $a \\neq 0$ e $d \\neq 0$, são conhecidas como os Tridentes de Newton. O gráfico apresenta um Tridente de Newton que contém os pontos $A(2,-6)$ e $B(1,-3)$ e cujo ponto $C(-1,0)$ é um ponto de inflexão. Assim, assinale a opção que apresenta o valor correto de $ab + cd$.",
        "figura_path": "/data/imagens/escola_naval/2025/escola_naval_2025_q10_fig1.png",
        "gabarito": "C",
        "tipo": "objetiva",
        "alternativas": {
            "a": "0",
            "b": "-1",
            "c": "-5",
            "d": "1",
            "e": "5"
        },
        "estrategias_esperadas": ["Segunda derivada y''(x) = 2a + 2d/x^3 = 0 no ponto de inflexão", "Sistema linear para a, b, c, d com pontos dados"]
    },
    {
        "id_externo": "ESCOLA_NAVAL_2025_Q11",
        "materia": "Matemática",
        "topico": "Funções e Otimização",
        "subtopico": "Otimização geométrica e cálculo de custo",
        "dificuldade": 2,
        "banca": "Escola Naval",
        "ano": 2025,
        "enunciado": "A turma do primeiro ano da Escola Naval foi dividida em grupos e recebeu a tarefa de construir uma embarcação a vela. Um dos grupos deveria dimensionar a vela, a qual seria constituída de um semicírculo apoiado pelo diâmetro em um retângulo de base igual ao diâmetro do semicírculo. Sabe-se que a área da vela é a maior possível e seu perímetro total é igual a $W$. Além disso, foi determinado que apenas a região retangular da vela fosse pintada, com uma tinta que custa R$ 5,00 por unidade de área. Assim, determine o custo com a pintura desta vela e assinale a opção correta.",
        "figura_path": None,
        "gabarito": "E",
        "tipo": "objetiva",
        "alternativas": {
            "a": "$\\frac{8W^2}{(8+\\pi)^2}$",
            "b": "$\\frac{40W^2}{(4+\\pi)^2}$",
            "c": "$\\frac{20W^2}{(8+\\pi)^2}$",
            "d": "$\\frac{20W^2}{(4+\\pi)^2}$",
            "e": "$\\frac{40W^2}{(8+\\pi)^2}$"
        },
        "estrategias_esperadas": ["Vínculo de perímetro W = 2x + 2y + pi*x", "Função quadrática de área e vértice da parábola"]
    },
    {
        "id_externo": "ESCOLA_NAVAL_2025_Q12",
        "materia": "Matemática",
        "topico": "Trigonometria",
        "subtopico": "Identidades telescópicas e cossecante",
        "dificuldade": 3,
        "banca": "Escola Naval",
        "ano": 2025,
        "enunciado": "Calcule $\\sum_{n=1}^{100} \\operatorname{cossec}(2^n)$ e assinale a opção correta.",
        "figura_path": None,
        "gabarito": "E",
        "tipo": "objetiva",
        "alternativas": {
            "a": "$\\frac{\\operatorname{sen}(2^{100})}{\\operatorname{sen} 1 \\operatorname{sen}(2^{200})}$",
            "b": "$\\frac{\\operatorname{sen}(2^{100}-1)}{\\operatorname{sen} 2 \\operatorname{sen}(2^{100})}$",
            "c": "$\\frac{\\operatorname{sen}(2^{100}-1)}{\\operatorname{sen} 1 \\operatorname{sen}(2^{10})}$",
            "d": "$\\frac{\\operatorname{sen}(2^{100}+1)}{\\operatorname{sen} 2 \\operatorname{sen}(2^{100})}$",
            "e": "$\\frac{\\operatorname{sen}(2^{100}-1)}{\\operatorname{sen} 1 \\operatorname{sen}(2^{100})}$"
        },
        "estrategias_esperadas": ["Identidade cotg(x) - cotg(2x) = cossec(2x)", "Soma telescópica trigonométrica"]
    },
    {
        "id_externo": "ESCOLA_NAVAL_2025_Q13",
        "materia": "Matemática",
        "topico": "Cálculo Diferencial e Integral",
        "subtopico": "Limites no infinito e expansão binomial",
        "dificuldade": 2,
        "banca": "Escola Naval",
        "ano": 2025,
        "enunciado": "Calcule o $\\lim_{x \\to +\\infty} \\left(\\sqrt[5]{x^5 + 10x^4 - 20x^3 + 30x^2 - 15x + 1} - x\\right)$ e assinale a opção correta.",
        "figura_path": None,
        "gabarito": "B",
        "tipo": "objetiva",
        "alternativas": {
            "a": "0",
            "b": "2",
            "c": "3",
            "d": "10",
            "e": "$+\\infty$"
        },
        "estrategias_esperadas": ["Expansão binomial (1 + u)^(1/5) = 1 + u/5 + O(u^2)", "Racionalização de ordem 5"]
    },
    {
        "id_externo": "ESCOLA_NAVAL_2025_Q14",
        "materia": "Matemática",
        "topico": "Geometria Plana",
        "subtopico": "Potência de ponto e secantes",
        "dificuldade": 3,
        "banca": "Escola Naval",
        "ano": 2025,
        "enunciado": "Examine a figura abaixo. A figura apresenta uma circunferência de centro $O$, na qual os pontos $R, M, V, U, G$ e $S$ são fixos e pertencem à circunferência. Os segmentos $RU, RP, PJ$ e $JK$ medem $16$, $2$, $4$ e $3$, respectivamente. Considerando que o segmento $KL$ mede $x$ e o segmento $LU$ mede $y$, calcule $\\frac{x}{y}$ e assinale a opção correta.",
        "figura_path": "/data/imagens/escola_naval/2025/escola_naval_2025_q14_fig1.png",
        "gabarito": "A",
        "tipo": "objetiva",
        "alternativas": {
            "a": "1,8",
            "b": "2,0",
            "c": "3,2",
            "d": "4,0",
            "e": "5,6"
        },
        "estrategias_esperadas": ["Teorema das cordas e potência de pontos internos e externos"]
    },
    {
        "id_externo": "ESCOLA_NAVAL_2025_Q15",
        "materia": "Matemática",
        "topico": "Cálculo e Análise Real",
        "subtopico": "Derivadas e propriedades de funções reais",
        "dificuldade": 1,
        "banca": "Escola Naval",
        "ano": 2025,
        "enunciado": "Considere as afirmativas abaixo e assinale a opção correta:\n\nI. Se $a^{a+1} = y^{1/x}$, com $\\ln x = 3\\ln y > 0$, então $a$ é um número racional.\nII. Se $A = \\frac{a+1}{4a^2+8a+4}$, então $A = \\frac{1}{2}$, $\\forall a \\in \\mathbb{R} \\setminus \\{-1\\}$.\nIII. Se $B = \\frac{d}{dx}\\left[e^{x^2+x+8} + 2^{\\ln 16}\\right]$, então $B = (2x+1)e^{x^2+x+8}$.",
        "figura_path": None,
        "gabarito": "D",
        "tipo": "objetiva",
        "alternativas": {
            "a": "Apenas as afirmativas I e II são verdadeiras.",
            "b": "Todas as afirmativas são verdadeiras.",
            "c": "Apenas as afirmativas II e III são verdadeiras.",
            "d": "Apenas a afirmativa III é verdadeira.",
            "e": "Apenas a afirmativa II é verdadeira."
        },
        "estrategias_esperadas": ["Regra da cadeia para derivadas de exponenciais", "Análise de frações algébricas e números irracionais"]
    },
    {
        "id_externo": "ESCOLA_NAVAL_2025_Q16",
        "materia": "Matemática",
        "topico": "Funções",
        "subtopico": "Domínio de funções trigonométricas inversas",
        "dificuldade": 1,
        "banca": "Escola Naval",
        "ano": 2025,
        "enunciado": "Dada a função real $f(x) = \\cos(\\operatorname{sen} x) + \\operatorname{arcsen}\\left(\\frac{x^2+1}{2x}\\right)$, assinale a opção correta referente ao domínio de $f(x)$.",
        "figura_path": None,
        "gabarito": "A",
        "tipo": "objetiva",
        "alternativas": {
            "a": "É um conjunto com exatamente 2 elementos.",
            "b": "É um conjunto com exatamente 3 elementos.",
            "c": "É um conjunto com exatamente 4 elementos.",
            "d": "É um conjunto com exatamente 8 elementos.",
            "e": "É um conjunto infinito."
        },
        "estrategias_esperadas": ["Condição de existência do arco-seno: -1 <= (x^2+1)/(2x) <= 1", "Desigualdade das médias (AM-GM)"]
    },
    {
        "id_externo": "ESCOLA_NAVAL_2025_Q17",
        "materia": "Matemática",
        "topico": "Números Complexos",
        "subtopico": "Lugares geométricos e argumento complexo",
        "dificuldade": 2,
        "banca": "Escola Naval",
        "ano": 2025,
        "enunciado": "Os números complexos $z_1 = x + yi$, $z_2 = y + xi$, $z_3 = xi$ e $z_4 = yi$, com $x$ e $y$ não nulos, são tais que o argumento de $z_1^2 - 6z_1 + iz_1^2 + z_2^2 - z_3^2 - z_4^2 - i z_1 - 14$ é igual a $\\frac{5\\pi}{4}$. Determine o valor de $x + y$ sabendo que $z_1$ possui o maior módulo possível e assinale a opção correta.",
        "figura_path": None,
        "gabarito": "D",
        "tipo": "objetiva",
        "alternativas": {
            "a": "$3 + \\sqrt{2}$",
            "b": "$3 - \\sqrt{2}$",
            "c": "$2(3 - \\sqrt{2})$",
            "d": "$2(3 + \\sqrt{2})$",
            "e": "$2\\sqrt{3} + 2$"
        },
        "estrategias_esperadas": ["Simplificação algébrica de números complexos", "Interpretação geométrica de semi-retas no plano complexo"]
    },
    {
        "id_externo": "ESCOLA_NAVAL_2025_Q18",
        "materia": "Matemática",
        "topico": "Probabilidade",
        "subtopico": "Permutações com repetição e contagem complementar",
        "dificuldade": 3,
        "banca": "Escola Naval",
        "ano": 2025,
        "enunciado": "Suponha que a Marinha do Brasil realizará um desfile naval passando pelo litoral do Rio de Janeiro no próximo dia 7 de setembro. No desfile serão usados navios de 4 classes distintas, nas quantidades descritas na tabela abaixo e idênticos por classe. A formatura contará com uma única coluna com navios equidistantes e em alinhamento perfeito, ou seja, um militar de um navio observa apenas o navio que está imediatamente à sua frente. Calcule a probabilidade de organizar a formatura de forma que ao menos duas Fragatas visualizem outro navio de mesma classe e assinale a opção correta.\n\nClasses e Quantidades:\n- Apoio: 4\n- Corveta: 3\n- Fragata: 4\n- Patrulha: 3",
        "figura_path": None,
        "gabarito": "B",
        "tipo": "objetiva",
        "alternativas": {
            "a": "$\\frac{3}{91}$",
            "b": "$\\frac{16}{91}$",
            "c": "$\\frac{19}{91}$",
            "d": "$\\frac{32}{91}$",
            "e": "$\\frac{35}{91}$"
        },
        "estrategias_esperadas": ["Total de permutações com repetição: 14! / (4! 3! 4! 3!)", "Contagem por blocos de elementos adjacentes"]
    },
    {
        "id_externo": "ESCOLA_NAVAL_2025_Q19",
        "materia": "Matemática",
        "topico": "Geometria Analítica",
        "subtopico": "Rotação de eixos e matriz de rotação",
        "dificuldade": 1,
        "banca": "Escola Naval",
        "ano": 2025,
        "enunciado": "Um triângulo de vértices $A(0,0)$, $B(2,3)$ e $C(5,1)$ é rotacionado de $60^\\circ$ no sentido anti-horário em torno do ponto $A$, de forma que os pontos $B$ e $C$ tornem-se $B'$ e $C'$, respectivamente. Determine a soma das coordenadas de $B'$ e $C'$ e assinale a opção correta.",
        "figura_path": None,
        "gabarito": "D",
        "tipo": "objetiva",
        "alternativas": {
            "a": "$\\frac{3\\sqrt{3} - 11}{2}$",
            "b": "$\\frac{3\\sqrt{3} + 11}{2}$",
            "c": "$\\frac{11 - 3\\sqrt{3}}{2}$",
            "d": "$\\frac{11 + 3\\sqrt{3}}{2}$",
            "e": "$\\frac{13\\sqrt{3} + 2}{3}$"
        },
        "estrategias_esperadas": ["Matriz de rotação R(60°) = [[cos 60°, -sen 60°], [sen 60°, cos 60°]]", "Multiplicação por complexo cis(pi/3)"]
    },
    {
        "id_externo": "ESCOLA_NAVAL_2025_Q20",
        "materia": "Matemática",
        "topico": "Polinômios",
        "subtopico": "Relações de Girard e extremos de funções trigonométricas",
        "dificuldade": 2,
        "banca": "Escola Naval",
        "ano": 2025,
        "enunciado": "Sejam $P_1(x) = x^3 + 3x^2 - 6x + a$ e $P_2(x) = x^3 - 3x^2 - x + b$ polinômios com $a, b \\in \\mathbb{R}$ e raízes, respectivamente, em progressão geométrica e progressão aritmética. Assinale o intervalo que apresenta o valor máximo admitido pela função $f(x) = a \\operatorname{sen}\\left(4x - \\frac{7\\pi}{6}\\right) + b \\cos\\left(4x - \\frac{7\\pi}{6}\\right)$.",
        "figura_path": None,
        "gabarito": "A",
        "tipo": "objetiva",
        "alternativas": {
            "a": "$[8, 9]$",
            "b": "$[7, 8]$",
            "c": "$[6, 7]$",
            "d": "$[5, 6]$",
            "e": "$[4, 5]$"
        },
        "estrategias_esperadas": ["Relações de Girard para raízes em PG e PA para determinar a e b", "Amplitude máxima sqrt(a^2 + b^2)"]
    },
    {
        "id_externo": "ESCOLA_NAVAL_2025_Q21",
        "materia": "Matemática",
        "topico": "Geometria Analítica Espacial",
        "subtopico": "Produto vetorial e identificação de cônicas",
        "dificuldade": 2,
        "banca": "Escola Naval",
        "ano": 2025,
        "enunciado": "O plano $\\pi: 2x - y + 3z - 4 = 0$ e a reta $r: \\begin{cases} x = -1 + 2t \\\\ y = 5 + 3t \\\\ z = 3 - t \\end{cases}$ com $t \\in \\mathbb{R}$ intersectam-se no ponto $P$. Os pontos $Q(-3, 1, 2)$ e $R(x, y, 0)$ são tais que o paralelogramo gerado pelos vetores $\\vec{PQ}$ e $\\vec{PR}$ possui área igual a $10\\text{ u.a.}$. O lugar geométrico formado pelos pares $(x, y) \\in \\mathbb{R}^2$ é uma:",
        "figura_path": None,
        "gabarito": "E",
        "tipo": "objetiva",
        "alternativas": {
            "a": "elipse de centro $C(3,0)$, excentricidade $\\frac{\\sqrt{5}}{5}$ e eixo maior paralelo ao eixo $y$.",
            "b": "hipérbole de excentricidade $\\frac{3\\sqrt{5}}{5}$ e eixo real paralelo ao eixo $x$.",
            "c": "elipse de centro $C(-3,0)$, excentricidade $\\frac{\\sqrt{5}}{5}$ e eixo maior paralelo ao eixo $x$.",
            "d": "hipérbole de excentricidade $\\frac{3}{2}$ e eixo maior paralelo ao eixo $x$.",
            "e": "elipse de centro $C(-3,0)$, excentricidade $\\frac{\\sqrt{5}}{5}$ e eixo maior paralelo ao eixo $y$."
        },
        "estrategias_esperadas": ["Interseção reta-plano para achar P", "Módulo do produto vetorial ||PQ x PR|| = 10", "Equação reduzida da elipse"]
    },
    {
        "id_externo": "ESCOLA_NAVAL_2025_Q22",
        "materia": "Matemática",
        "topico": "Geometria Analítica",
        "subtopico": "Área de polígonos côncavos pelo algoritmo do cadarço",
        "dificuldade": 1,
        "banca": "Escola Naval",
        "ano": 2025,
        "enunciado": "Seja o polígono $ABCDEFG$ côncavo, cujos vértices representam parte de uma estrutura de uma embarcação, com as seguintes coordenadas: $A(3,1)$, $B(5,2)$, $C(7,3)$, $D(6,8)$, $E(4,6)$, $F(2,10)$ e $G(1,5)$. Um engenheiro naval precisou averiguar a compatibilidade da área dessa estrutura à embarcação na qual seria instalada. Assim, assinale a opção que apresenta o valor da área dessa estrutura em unidade de área.",
        "figura_path": None,
        "gabarito": "B",
        "tipo": "objetiva",
        "alternativas": {
            "a": "39",
            "b": "29",
            "c": "19",
            "d": "10",
            "e": "9"
        },
        "estrategias_esperadas": ["Fórmula de Gauss / Shoelace formula: 1/2 |sum(x_i y_{i+1} - x_{i+1} y_i)|"]
    }
]

with open(out_file, "w", encoding="utf-8") as f:
    json.dump(questoes, f, ensure_ascii=False, indent=2)

print(f"[✓] Gerado com sucesso: {out_file} ({len(questoes)} questões)")
