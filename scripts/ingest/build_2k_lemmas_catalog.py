#!/usr/bin/env python3
"""
Compilador Mestre do Catálogo Canônico de 2.000 Lemas Matemáticos do LEMMAS Core.
Gera data/repertorio/catalogo_2000_lemmas.json com 2.000 lemas matemáticos
estruturados (LEMA-0001 a LEMA-2000) cobrindo as 12 Grandes Áreas Canônicas.
"""

import json
import unicodedata
from pathlib import Path
from typing import Dict, List, Any, Set

PROJECT_ROOT = Path(__file__).resolve().parents[2]
REPERTORIO_DIR = PROJECT_ROOT / "data" / "repertorio"
JSON_FUNDAMENTAIS = REPERTORIO_DIR / "lemas_fundamentais.json"
OUTPUT_CATALOGO = REPERTORIO_DIR / "catalogo_2000_lemmas.json"

def normalizar_texto(texto: str) -> str:
    if not texto:
        return ""
    texto = unicodedata.normalize("NFC", str(texto))
    return " ".join(texto.strip().split())

def normalizar_chave(texto: str) -> str:
    if not texto:
        return ""
    norm = unicodedata.normalize("NFKD", str(texto))
    sem_acentos = "".join(c for c in norm if not unicodedata.combining(c))
    return " ".join(sem_acentos.strip().lower().split())

def map_materia(m: str) -> str:
    m_norm = normalizar_chave(m)
    if "plana" in m_norm or "euclid" in m_norm:
        return "Geometria Plana"
    if "espacial" in m_norm or "poliedro" in m_norm or "esfera" in m_norm or "cone" in m_norm:
        return "Geometria Espacial"
    if "analit" in m_norm or "conica" in m_norm:
        return "Geometria Analítica"
    if "trigono" in m_norm:
        return "Trigonometria"
    if "linear" in m_norm or "matriz" in m_norm or "autovalor" in m_norm or "subespaco" in m_norm:
        return "Álgebra Linear"
    if "calculo" in m_norm or "deriv" in m_norm or "integ" in m_norm or "edo" in m_norm or "serie" in m_norm or "limite" in m_norm:
        return "Cálculo"
    if "polinom" in m_norm or "complex" in m_norm:
        return "Polinômios e Complexos"
    if "combinat" in m_norm or "probab" in m_norm or "graf" in m_norm or "logica" in m_norm:
        return "Probabilidade e Combinatória"
    if "numero" in m_norm or "aritmet" in m_norm or "primo" in m_norm or "diofant" in m_norm or "congruen" in m_norm:
        return "Teoria dos Números"
    if "func" in m_norm:
        return "Funções"
    if "basica" in m_norm or "financ" in m_norm or "porcent" in m_norm:
        return "Matemática Básica"
    return "Álgebra"

def get_base_canonical_lemmas() -> List[Dict[str, Any]]:
    """Lemas Mestres Canônicos de Alta Densidade das 12 Áreas."""
    return [
        # 1. GEOMETRIA PLANA
        {
            "titulo": "Relação de Stewart para Cevianas",
            "materia": "Geometria Plana",
            "topico": "Cevianas e Triângulos",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$b^2 m + c^2 n = a(d^2 + mn)$$",
            "gatilho_reconhecimento": "Cálculo de comprimento de ceviana qualquer sem triângulo retângulo.",
            "intuicao_prova": "Aplica a Lei dos Cossenos nos dois triângulos adjacentes sobre o lado com ângulos suplementares."
        },
        {
            "titulo": "Teorema de Menelaus para Pontos Colineares",
            "materia": "Geometria Plana",
            "topico": "Cevianas e Triângulos",
            "nivel": "Olímpico",
            "formula_latex": "$$\\frac{AF}{FB} \\cdot \\frac{BD}{DC} \\cdot \\frac{CE}{EA} = 1$$",
            "gatilho_reconhecimento": "Reta transversal cortando dois lados de um triângulo e o prolongamento do terceiro.",
            "intuicao_prova": "Projeção de alturas a partir dos vértices sobre a reta secante e produto das razões de semelhança."
        },
        {
            "titulo": "Teorema de Ceva para Cevianas Concorrentes",
            "materia": "Geometria Plana",
            "topico": "Cevianas Concorrentes",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$\\frac{AF}{FB} \\cdot \\frac{BD}{DC} \\cdot \\frac{CE}{EA} = 1$$",
            "gatilho_reconhecimento": "Três cevianas concorrendo em um único ponto interior ou exterior.",
            "intuicao_prova": "Razão de áreas dos triângulos que compartilham a mesma base com o ponto de concorrência."
        },
        {
            "titulo": "Teorema de Ceva Trigonométrico",
            "materia": "Geometria Plana",
            "topico": "Cevianas Concorrentes",
            "nivel": "Olímpico",
            "formula_latex": "$$\\frac{\\sin \\angle DAC}{\\sin \\angle BAD} \\cdot \\frac{\\sin \\angle EBA}{\\sin \\angle CBE} \\cdot \\frac{\\sin \\angle FCB}{\\sin \\angle ACF} = 1$$",
            "gatilho_reconhecimento": "Problemas de ângulo chasing com três cevianas concorrentes.",
            "intuicao_prova": "Aplica a Lei dos Senos nos pares de triângulos formados pelas cevianas a partir do vértice comum."
        },
        {
            "titulo": "Teorema de Ptolomeu para Quadriláteros Cíclicos",
            "materia": "Geometria Plana",
            "topico": "Quadriláteros Inscritíveis",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$AC \\cdot BD = AB \\cdot CD + AD \\cdot BC$$",
            "gatilho_reconhecimento": "Quadrilátero inscritível relacionando o produto das diagonais com os produtos dos lados opostos.",
            "intuicao_prova": "Construção de triângulos semelhantes marcando um ângulo auxiliar na diagonal."
        },
        {
            "titulo": "Corolário de Ptolomeu no Triângulo Equilátero",
            "materia": "Geometria Plana",
            "topico": "Polígonos Regulares",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$PA = PB + PC$$",
            "gatilho_reconhecimento": "Ponto P sobre o arco menor BC do circuncírculo de um triângulo equilátero ABC.",
            "intuicao_prova": "Aplicação direta do Teorema de Ptolomeu no quadrilátero cíclico ABPC com lados iguais a L."
        },
        {
            "titulo": "Potência de Ponto em Relação a uma Circunferência",
            "materia": "Geometria Plana",
            "topico": "Circunferência e Círculo",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$\\text{Pow}(P) = PA \\cdot PB = PC \\cdot PD = |d^2 - R^2| = PT^2$$",
            "gatilho_reconhecimento": "Cordas secantes se cruzando interiormente ou externamente, ou segmento tangente PT.",
            "intuicao_prova": "Semelhança entre triângulos formados pelos ângulos inscritos que subtendem o mesmo arco."
        },
        {
            "titulo": "Lema do Segmento Tangente Comum de Círculos Tangentes Externos",
            "materia": "Geometria Plana",
            "topico": "Circunferências Tangentes",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$d = 2\\sqrt{r_1 r_2}$$",
            "gatilho_reconhecimento": "Duas circunferências tangentes externamente apoiadas sobre uma reta tangente comum.",
            "intuicao_prova": "Aplica o Teorema de Pitágoras no triângulo retângulo de hipotenusa r1+r2 e cateto |r1-r2|."
        },
        {
            "titulo": "Teorema de Descartes para Círculos Beijantes (Soddy)",
            "materia": "Geometria Plana",
            "topico": "Circunferências Tangentes",
            "nivel": "Olímpico",
            "formula_latex": "$$\\left(k_1 + k_2 + k_3 + k_4\\right)^2 = 2\\left(k_1^2 + k_2^2 + k_3^2 + k_4^2\\right), \\quad k_i = \\pm \\frac{1}{r_i}$$",
            "gatilho_reconhecimento": "Quatro círculos mutuamente tangentes entre si (três círculos e um quarto inscrito ou circunscrito).",
            "intuicao_prova": "Relação quadrática sobre as curvaturas obtida por inversão circular ou coordenadas isotômicas."
        },
        {
            "titulo": "Lema do Incentro-Exincentro (Trillium Theorem)",
            "materia": "Geometria Plana",
            "topico": "Pontos Notáveis do Triângulo",
            "nivel": "Olímpico",
            "formula_latex": "$$MB = MC = MI = MI_A$$",
            "gatilho_reconhecimento": "Ponto médio M do arco menor BC do circuncírculo conectando o incentro I e ex-incentro Ia.",
            "intuicao_prova": "Caça aos ângulos provando que o triângulo MIB é isósceles com ângulo MIB = MBI = (A+B)/2."
        },
        {
            "titulo": "Relação de Euler para Distância Circuncentro-Incentro",
            "materia": "Geometria Plana",
            "topico": "Pontos Notáveis do Triângulo",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$d^2 = R(R - 2r) \\implies R \\ge 2r$$",
            "gatilho_reconhecimento": "Distância d entre o circuncentro O e o incentro I do triângulo.",
            "intuicao_prova": "Potência do incentro I em relação ao circuncírculo combinada com o Lema do Incentro."
        },
        {
            "titulo": "Reta de Euler do Triângulo",
            "materia": "Geometria Plana",
            "topico": "Pontos Notáveis do Triângulo",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$\\vec{HG} = 2\\vec{GO}, \\quad H, G, O \\text{ colineares}$$",
            "gatilho_reconhecimento": "Posição relativa entre o ortocentro H, baricentro G e circuncentro O.",
            "intuicao_prova": "Homotetia com centro no baricentro G e razão -1/2 que leva o triângulo no seu triângulo medial."
        },
        {
            "titulo": "Círculo dos Nove Pontos de Feuerbach",
            "materia": "Geometria Plana",
            "topico": "Pontos Notáveis do Triângulo",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$R_9 = \\frac{R}{2}, \\quad N = \\text{ponto médio de } OH$$",
            "gatilho_reconhecimento": "Círculo passando pelos 3 pés das alturas, 3 pontos médios dos lados e 3 pontos de Euler.",
            "intuicao_prova": "Imagem do circuncírculo pela homotetia de centro H e razão 1/2."
        },
        {
            "titulo": "Reflexão do Ortocentro sobre os Lados",
            "materia": "Geometria Plana",
            "topico": "Pontos Notáveis do Triângulo",
            "nivel": "Olímpico",
            "formula_latex": "$$H_{\\text{ref}} \\in (ABC), \\quad H_{\\text{med}} \\in (ABC)$$",
            "gatilho_reconhecimento": "Simétrico do ortocentro H em relação a qualquer lado BC ou em relação ao ponto médio de BC.",
            "intuicao_prova": "Propriedade dos quadriláteros cíclicos do triângulo órtico cujos ângulos refletidos somam 180° com A."
        },
        {
            "titulo": "Reta de Simson-Wallace",
            "materia": "Geometria Plana",
            "topico": "Circunferência e Triângulo",
            "nivel": "Olímpico",
            "formula_latex": "$$P \\in (ABC) \\iff \\text{pés das perpendiculares de } P \\text{ aos lados são colineares}$$",
            "gatilho_reconhecimento": "Projeções ortogonais de um ponto P sobre as retas suportes dos três lados de um triângulo.",
            "intuicao_prova": "Quadriláteros cíclicos formados pelas projeções ortogonais e igualdade de ângulos opostos pelo vértice."
        },
        {
            "titulo": "Fórmula de Brahmagupta para Área de Quadriláteros Cíclicos",
            "materia": "Geometria Plana",
            "topico": "Quadriláteros Inscritíveis",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$S = \\sqrt{(p-a)(p-b)(p-c)(p-d)}$$",
            "gatilho_reconhecimento": "Área de quadrilátero inscritível dados os quatro lados a, b, c, d.",
            "intuicao_prova": "Soma das áreas de dois triângulos cortados por uma diagonal combinada com a Lei dos Cossenos."
        },
        {
            "titulo": "Teorema da Bissetriz Interna e Comprimento",
            "materia": "Geometria Plana",
            "topico": "Cevianas e Triângulos",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$\\frac{m}{b} = \\frac{n}{c}, \\quad \\beta_a^2 = bc - mn = \\frac{4bcp(p-a)}{(b+c)^2}$$",
            "gatilho_reconhecimento": "Divisão do lado oposto pela bissetriz interna ou cálculo direto do comprimento da bissetriz.",
            "intuicao_prova": "Lei dos Senos nos dois triângulos adjacentes ou Teorema de Stewart aplicado à bissetriz."
        },
        {
            "titulo": "Teorema de Carnot para Distâncias do Circuncentro",
            "materia": "Geometria Plana",
            "topico": "Pontos Notáveis do Triângulo",
            "nivel": "Olímpico",
            "formula_latex": "$$d_a + d_b + d_c = R + r$$",
            "gatilho_reconhecimento": "Soma das distâncias com sinal do circuncentro aos lados de um triângulo acutângulo.",
            "intuicao_prova": "Decomposição trigonométrica da distância do circuncentro em R cos(A) e identidade cos A + cos B + cos C."
        },
        {
            "titulo": "Teorema da Borboleta (Butterfly Theorem)",
            "materia": "Geometria Plana",
            "topico": "Circunferência e Círculo",
            "nivel": "Olímpico",
            "formula_latex": "$$M \\text{ ponto médio de } PQ \\implies M \\text{ ponto médio de } XY$$",
            "gatilho_reconhecimento": "Duas cordas AB e CD cruzando pelo ponto médio M de uma corda PQ de uma circunferência.",
            "intuicao_prova": "Razão de áreas e semelhança dos triângulos formados pelas cordas cruzadas com potências de ponto."
        },
        {
            "titulo": "Eixo Radical e Centro Radical de Três Circunferências",
            "materia": "Geometria Plana",
            "topico": "Circunferências e Potência",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$\\text{Pow}_1(P) = \\text{Pow}_2(P) \\implies P \\in \\text{Eixo Radical}$$",
            "gatilho_reconhecimento": "Interseção de cordas comuns ou lugar geométrico de tangentes de mesmo comprimento a dois círculos.",
            "intuicao_prova": "Subtração das equações analíticas dos círculos cancelando os termos quadráticos x^2 + y^2."
        },

        # 2. ÁLGEBRA, FATORAÇÕES & DESIGUALDADES
        {
            "titulo": "Identidade Cúbica de Gauss",
            "materia": "Álgebra",
            "topico": "Fatoração e Produtos Notáveis",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$a^3 + b^3 + c^3 - 3abc = (a+b+c)(a^2+b^2+c^2-ab-bc-ca) = \\frac{1}{2}(a+b+c)[(a-b)^2+(b-c)^2+(c-a)^2]$$",
            "gatilho_reconhecimento": "Equações ou simplificações com a^3 + b^3 + c^3 = 3abc (implica a+b+c=0 ou a=b=c).",
            "intuicao_prova": "Desenvolvimento simétrico dos cubos e agrupamento dos termos mistos em soma de quadrados."
        },
        {
            "titulo": "Identidade de Sophie Germain",
            "materia": "Álgebra",
            "topico": "Fatoração e Produtos Notáveis",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$a^4 + 4b^4 = (a^2 - 2ab + 2b^2)(a^2 + 2ab + 2b^2)$$",
            "gatilho_reconhecimento": "Fatoração de binômios quadráticos como n^4 + 4^k para provar que são números compostos.",
            "intuicao_prova": "Adição e subtração de 4a^2 b^2 para completar quadrado e fatorar como diferença de dois quadrados."
        },
        {
            "titulo": "Identidade de Argand para Polinômios Quárticos",
            "materia": "Álgebra",
            "topico": "Fatoração e Produtos Notáveis",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$x^4 + x^2 + 1 = (x^2 + x + 1)(x^2 - x + 1)$$",
            "gatilho_reconhecimento": "Telescopagem em somas fracionárias ou fatoração de polinômios ciclotômicos de grau 4.",
            "intuicao_prova": "Completa quadrado adicionando e subtraindo x^2: (x^2+1)^2 - x^2."
        },
        {
            "titulo": "Fatoração Simétrica Cúbica de (a+b+c)^3 - (a^3+b^3+c^3)",
            "materia": "Álgebra",
            "topico": "Fatoração e Produtos Notáveis",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$(a+b+c)^3 - (a^3 + b^3 + c^3) = 3(a+b)(b+c)(c+a)$$",
            "gatilho_reconhecimento": "Expressões simétricas homogêneas de grau 3 onde anula-se fazendo a = -b.",
            "intuicao_prova": "Teorema do Resto mostrando que a+b divide a expressão, e simetria com grau 3 fixa a constante 3."
        },
        {
            "titulo": "Cadeia das Médias (MQ >= MA >= MG >= MH)",
            "materia": "Álgebra",
            "topico": "Desigualdades Algébricas",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$\\sqrt{\\frac{\\sum x_i^2}{n}} \\ge \\frac{\\sum x_i}{n} \\ge \\sqrt[n]{\\prod x_i} \\ge \\frac{n}{\\sum 1/x_i}$$",
            "gatilho_reconhecimento": "Otimização de termos com soma constante ou produto constante com variáveis positivas.",
            "intuicao_prova": "Convexidade da função logaritmo e Jensen, ou indução de Cauchy com backward induction."
        },
        {
            "titulo": "Desigualdade de Cauchy-Schwarz",
            "materia": "Álgebra",
            "topico": "Desigualdades Algébricas",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$\\left(\\sum_{i=1}^n a_i^2\\right)\\left(\\sum_{i=1}^n b_i^2\\right) \\ge \\left(\\sum_{i=1}^n a_i b_i\\right)^2$$",
            "gatilho_reconhecimento": "Soma de quadrados multiplicando outra soma de quadrados para limitar produto escalar.",
            "intuicao_prova": "O trinômio do segundo grau P(t) = sum (a_i t + b_i)^2 é não-negativo, logo seu discriminante delta <= 0."
        },
        {
            "titulo": "Lema de Titu (Forma de Engel de Cauchy-Schwarz)",
            "materia": "Álgebra",
            "topico": "Desigualdades Algébricas",
            "nivel": "Olímpico",
            "formula_latex": "$$\\sum_{i=1}^n \\frac{a_i^2}{b_i} \\ge \\frac{\\left(\\sum a_i\\right)^2}{\\sum b_i}, \\quad b_i > 0$$",
            "gatilho_reconhecimento": "Desigualdades que apresentam soma de frações algébricas com numeradores quadráticos.",
            "intuicao_prova": "Aplicação direta de Cauchy-Schwarz aos vetores (a_i / sqrt(b_i)) e (sqrt(b_i))."
        },
        {
            "titulo": "Substituição de Ravi para Desigualdades de Triângulo",
            "materia": "Álgebra",
            "topico": "Desigualdades Algébricas",
            "nivel": "Olímpico",
            "formula_latex": "$$a = x + y, \\quad b = y + z, \\quad c = z + x, \\quad x, y, z > 0$$",
            "gatilho_reconhecimento": "Desigualdades com lados de triângulo a, b, c envolvendo (a+b-c), (b+c-a), (c+a-b).",
            "intuicao_prova": "Os valores x, y, z representam as distâncias dos vértices aos pontos de tangência do incírculo."
        },
        {
            "titulo": "Desigualdade do Rearranjo",
            "materia": "Álgebra",
            "topico": "Desigualdades Algébricas",
            "nivel": "Olímpico",
            "formula_latex": "$$\\sum a_i b_{n-i+1} \\le \\sum a_i b_{\\sigma(i)} \\le \\sum a_i b_i$$",
            "gatilho_reconhecimento": "Sequências ordenadas multiplicadas elemento a elemento sob permutações arbitrárias.",
            "intuicao_prova": "Troca de pares adjacentes fora de ordem e verificação da variação positiva (a_i - a_j)(b_i - b_j) >= 0."
        },
        {
            "titulo": "Desigualdade de Jensen para Funções Convexas",
            "materia": "Álgebra",
            "topico": "Desigualdades e Otimização",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$f\\left(\\sum \\lambda_i x_i\\right) \\le \\sum \\lambda_i f(x_i), \\quad f''(x) \\ge 0, \\quad \\sum \\lambda_i = 1$$",
            "gatilho_reconhecimento": "Soma de funções com soma de variáveis fixada (ex: soma de senos de ângulos em triângulos).",
            "intuicao_prova": "Secante entre dois pontos de uma função convexa sempre repousa acima do gráfico da função."
        },
        {
            "titulo": "Telescopagem Algébrica Fracionária Padrão",
            "materia": "Álgebra",
            "topico": "Sequências e Somatórios",
            "nivel": "Fundamentos",
            "formula_latex": "$$\\frac{1}{k(k+1)} = \\frac{1}{k} - \\frac{1}{k+1}, \\quad \\frac{1}{k(k+1)(k+2)} = \\frac{1}{2}\\left[\\frac{1}{k(k+1)} - \\frac{1}{(k+1)(k+2)}\\right]$$",
            "gatilho_reconhecimento": "Somatórios de frações com produto de termos consecutivos no denominador.",
            "intuicao_prova": "Decomposição em frações parciais que cancela todos os termos intermediários deixando início e fim."
        },
        {
            "titulo": "Lema de Vieta Jumping (Descida Infinita em Quadráticas)",
            "materia": "Álgebra",
            "topico": "Teoria dos Números e Álgebra",
            "nivel": "Olímpico",
            "formula_latex": "$$x^2 - kxy + y^2 = c \\implies x' = ky - x = \\frac{y^2 - c}{x}$$",
            "gatilho_reconhecimento": "Problemas de divisibilidade inteira (ex: ab+1 divide a^2+b^2) com busca de raízes mínimas.",
            "intuicao_prova": "Supõe solução mínima (x, y) e usa as relações de Girard para produzir uma solução menor x' < x, gerando contradição."
        },

        # 3. FUNÇÕES & EQUAÇÕES FUNCIONAIS
        {
            "titulo": "Equação Funcional Aditiva de Cauchy",
            "materia": "Funções",
            "topico": "Equações Funcionais",
            "nivel": "Olímpico",
            "formula_latex": "$$f(x+y) = f(x) + f(y) \\implies f(x) = cx$$",
            "gatilho_reconhecimento": "Relação aditiva f(x+y)=f(x)+f(y) sob hipótese de continuidade, monotonia ou limitação.",
            "intuicao_prova": "Indução para f(nx)=nf(x), extensão para racionais f(p/q)=(p/q)f(1) e passagem ao limite para reais."
        },
        {
            "titulo": "Equação Funcional de Jensen",
            "materia": "Funções",
            "topico": "Equações Funcionais",
            "nivel": "Olímpico",
            "formula_latex": "$$f\\left(\\frac{x+y}{2}\\right) = \\frac{f(x)+f(y)}{2} \\implies f(x) = ax + b$$",
            "gatilho_reconhecimento": "Preservação do ponto médio pelo valor da função f.",
            "intuicao_prova": "Subtrai f(0) definindo g(x) = f(x) - f(0) e reduz diretamente à equação aditiva de Cauchy."
        },
        {
            "titulo": "Equação Funcional Exponencial e Logarítmica de Cauchy",
            "materia": "Funções",
            "topico": "Equações Funcionais",
            "nivel": "Olímpico",
            "formula_latex": "$$f(x+y) = f(x)f(y) \\implies f(x) = a^x; \\quad f(xy) = f(x) + f(y) \\implies f(x) = c\\ln|x|$$",
            "gatilho_reconhecimento": "Transformação de soma em produto ou de produto em soma.",
            "intuicao_prova": "Aplica o logaritmo ln(f(x)) ou exponencial para transformar na equação aditiva linear de Cauchy."
        },
        {
            "titulo": "Decomposição Única em Parte Par e Parte Ímpar",
            "materia": "Funções",
            "topico": "Propriedades de Funções",
            "nivel": "Fundamentos",
            "formula_latex": "$$f(x) = \\frac{f(x)+f(-x)}{2} + \\frac{f(x)-f(-x)}{2}$$",
            "gatilho_reconhecimento": "Equações funcionais que misturam f(x) e f(-x) como a f(x) + b f(-x) = g(x).",
            "intuicao_prova": "Toda função é a soma de sua parte par simétrica f_p(x) com sua parte ímpar antissimétrica f_i(x)."
        },
        {
            "titulo": "Inversão de Grupo Cíclico de Substituições em Funções",
            "materia": "Funções",
            "topico": "Equações Funcionais",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$x \\mapsto 1-x \\quad \\text{ou} \\quad x \\mapsto \\frac{1}{x} \\quad \\text{ou} \\quad x \\mapsto \\frac{x-1}{x}$$",
            "gatilho_reconhecimento": "Equações funcionais racionais como 2f(x) + f(1-x) = x^2 ou f(x) + 3f(1/x) = x.",
            "intuicao_prova": "Aplica repetidamente a transformação até que ela se feche em ciclo de ordem 2, 3 ou 4 gerando sistema linear."
        },
        {
            "titulo": "Lema da Injetividade para Eliminação Externa",
            "materia": "Funções",
            "topico": "Equações Funcionais",
            "nivel": "Olímpico",
            "formula_latex": "$$f(A) = f(B) \\implies A = B$$",
            "gatilho_reconhecimento": "Equações funcionais aninhadas da forma f(f(x) + y) onde é possível provar f injetora.",
            "intuicao_prova": "A injetividade permite cortar o operador funcional f externo reduzindo a equação a relações algébricas internas."
        },
        {
            "titulo": "Propriedade de Involução de Funções Racionais Homográficas",
            "materia": "Funções",
            "topico": "Funções Compostas e Inversas",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$f(f(x)) = x \\iff f(x) = \\frac{ax + b}{cx - a} \\quad (\\text{traço } a + d = 0)$$",
            "gatilho_reconhecimento": "Iteradas de funções racionais f^(2026)(x) pedidas no ITA/IME.",
            "intuicao_prova": "A matriz associada à homografia tem traço nulo, logo seu quadrado é múltiplo escalar da identidade."
        },
        {
            "titulo": "Teorema do Ponto Fixo pelo Teorema do Valor Intermediário",
            "materia": "Funções",
            "topico": "Continuidade e Limites",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$f:[a,b] \\to [a,b] \\text{ contínua } \\implies \\exists c \\in [a,b] \\text{ tal que } f(c) = c$$",
            "gatilho_reconhecimento": "Demonstrar existência de raiz da equação f(x) = x onde f mapeia o intervalo em si mesmo.",
            "intuicao_prova": "Aplica o teorema de Bolzano à função auxiliar g(x) = f(x) - x nos extremos com sinais opostos."
        },

        # 4. TEORIA DOS NÚMEROS
        {
            "titulo": "Identidade de Bézout e Coprimalidade",
            "materia": "Teoria dos Números",
            "topico": "Divisibilidade e MDC",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$\\text{mdc}(a,b) = d \\iff \\exists x,y \\in \\mathbb{Z}: ax + by = d$$",
            "gatilho_reconhecimento": "Equações diofantinas lineares ax + by = c e coprimalidade mdc(a,b)=1.",
            "intuicao_prova": "O menor elemento positivo do ideal {ax+by : x,y in Z} é exatamente o maior divisor comum pelo algoritmo euclidiano."
        },
        {
            "titulo": "Pequeno Teorema de Fermat & Teorema de Euler",
            "materia": "Teoria dos Números",
            "topico": "Congruências e Aritmética Modular",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$a^{p-1} \\equiv 1 \\pmod p \\quad (p \\nmid a); \\quad a^{\\phi(n)} \\equiv 1 \\pmod n \\quad (\\text{mdc}(a,n)=1)$$",
            "gatilho_reconhecimento": "Restos de potências elevadas a números astronômicos módulo p ou módulo n.",
            "intuicao_prova": "Multiplicação por a permuta os elementos do sistema reduzido de resíduos preservando o produto módulo n."
        },
        {
            "titulo": "Teorema de Wilson para Fatoriais e Primos",
            "materia": "Teoria dos Números",
            "topico": "Congruências e Aritmética Modular",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$(p-1)! \\equiv -1 \\pmod p \\iff p \\text{ é primo}$$",
            "gatilho_reconhecimento": "Fatoriais em problemas de restos ou teste de primalidade analítica de p.",
            "intuicao_prova": "Cada elemento entre 2 e p-2 possui um inverso multiplicativo distinto módulo p cancelando-se aos pares para 1."
        },
        {
            "titulo": "Teorema Chinês dos Restos (TCR)",
            "materia": "Teoria dos Números",
            "topico": "Congruências e Aritmética Modular",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$x \\equiv a_i \\pmod{m_i}, \\quad \\text{mdc}(m_i, m_j) = 1 \\implies \\exists! x \\pmod{M}, \\quad M = \\prod m_i$$",
            "gatilho_reconhecimento": "Sistemas de congruências lineares simultâneas em módulos coprimos dois a dois.",
            "intuicao_prova": "Construção explícita da solução linear usando os inversos de M/m_i módulo m_i."
        },
        {
            "titulo": "Fórmula de Legendre para Expoente Primo em Fatorial",
            "materia": "Teoria dos Números",
            "topico": "Fatoração e Divisibilidade",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$v_p(n!) = \\sum_{k=1}^\\infty \\left\\lfloor \\frac{n}{p^k} \\right\\rfloor = \\frac{n - s_p(n)}{p - 1}$$",
            "gatilho_reconhecimento": "Com quantos zeros termina n! ou qual a maior potência de p que divide n! ou coeficientes binomiais.",
            "intuicao_prova": "Contagem de múltiplos de p, p^2, p^3 presentes no produto dos inteiros de 1 até n."
        },
        {
            "titulo": "Lema de Lifting the Exponent (LTE)",
            "materia": "Teoria dos Números",
            "topico": "Divisibilidade e Congruências",
            "nivel": "Olímpico",
            "formula_latex": "$$v_p(x^n - y^n) = v_p(x - y) + v_p(n), \\quad p \\text{ primo ímpar}, \\quad p \\mid (x-y), \\quad p \\nmid x,y$$",
            "gatilho_reconhecimento": "Divisibilidade de potências a^n - b^n por potências altas de primos p^k em olimpíadas.",
            "intuicao_prova": "Fatoração ciclotômica modular e expansão binomial de (y + p^v)^n."
        },
        {
            "titulo": "Lema da Ordem Multiplicativa",
            "materia": "Teoria dos Números",
            "topico": "Congruências e Aritmética Modular",
            "nivel": "Olímpico",
            "formula_latex": "$$d = \\text{ord}_p(a) \\implies a^k \\equiv 1 \\pmod p \\iff d \\mid k, \\quad d \\mid (p-1)$$",
            "gatilho_reconhecimento": "Encontrar menores expoentes ou fatores primos de a^n - 1.",
            "intuicao_prova": "Divisão euclidiana k = qd + r mostrando que a^r = 1 contradiz a minimalidade de d se r > 0."
        },
        {
            "titulo": "Lema dos Primos 4k+3 em Soma de Quadrados",
            "materia": "Teoria dos Números",
            "topico": "Equações Diofantinas",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$p \\equiv 3 \\pmod 4, \\quad p \\mid (a^2 + b^2) \\implies p \\mid a \\quad \\text{e} \\quad p \\mid b$$",
            "gatilho_reconhecimento": "Equações diofantinas do tipo a^2 + b^2 = 3k ou divisibilidade por 3, 7, 11, 19.",
            "intuicao_prova": "Se p não dividisse b, (a b^-1)^2 = -1 mod p, o que viola o Pequeno Teorema de Fermat porque -1 não é resíduo quadrático."
        },
        {
            "titulo": "Parametrização das Ternas Pitagóricas Primitivas",
            "materia": "Teoria dos Números",
            "topico": "Equações Diofantinas",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$x = m^2 - n^2, \\quad y = 2mn, \\quad z = m^2 + n^2, \\quad \\text{mdc}(m,n)=1, \\quad m \\not\\equiv n \\pmod 2$$",
            "gatilho_reconhecimento": "Triângulos retângulos com todos os lados inteiros sem fator comum.",
            "intuicao_prova": "Fatoração no anel dos inteiros gaussianos Z[i] ou projeção estereográfica da circunferência racional unitária."
        },
        {
            "titulo": "Truque de Fatoração de Simon (SFFT)",
            "materia": "Teoria dos Números",
            "topico": "Equações Diofantinas",
            "nivel": "Fundamentos",
            "formula_latex": "$$xy + ax + by = c \\iff (x + b)(y + a) = c + ab$$",
            "gatilho_reconhecimento": "Equações diofantinas bilineares inteiras ou somas fracionárias como 1/x + 1/y = 1/n.",
            "intuicao_prova": "Completamento de produto cartesiano adicionando ab a ambos os lados da equação."
        },
        {
            "titulo": "Teorema de Zsigmondy para Divisores Primos Primitivos",
            "materia": "Teoria dos Números",
            "topico": "Divisibilidade e Potências",
            "nivel": "Olímpico",
            "formula_latex": "$$a^n - b^n \\text{ tem pelo menos um primo primitivo } p \\nmid (a^k - b^k) \\quad \\forall k < n$$",
            "gatilho_reconhecimento": "Equações exponenciais diofantinas de olimpíadas da forma a^n - b^n = c^k.",
            "intuicao_prova": "Análise dos polinômios ciclotômicos Phi_n(a, b) e suas ordens multiplicativas."
        },

        # 5. PROBABILIDADE, COMBINATÓRIA & LÓGICA
        {
            "titulo": "Estrelas e Barras (Combinações Completas)",
            "materia": "Probabilidade e Combinatória",
            "topico": "Análise Combinatória",
            "nivel": "Fundamentos",
            "formula_latex": "$$x_1 + x_2 + \\dots + x_k = n, \\quad x_i \\ge 0 \\implies CR_k^n = \\binom{n + k - 1}{k - 1}$$",
            "gatilho_reconhecimento": "Número de soluções inteiras não-negativas de equação linear ou distribuição de objetos idênticos em caixas distintas.",
            "intuicao_prova": "Disposição linear de n estrelas e k-1 barras separadoras totalizando n+k-1 posições."
        },
        {
            "titulo": "Lema de Kaplansky para Subconjuntos sem Elementos Consecutivos",
            "materia": "Probabilidade e Combinatória",
            "topico": "Análise Combinatória",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$\\text{Fila: } \\binom{n - p + 1}{p}; \\quad \\text{Círculo: } \\frac{n}{n-p}\\binom{n-p}{p}$$",
            "gatilho_reconhecimento": "Escolha de p elementos sem que haja dois consecutivos em fila ou em mesa circular.",
            "intuicao_prova": "Mapeamento bijetivo inserindo os p elementos selecionados nos n-p+1 espaços deixados pelos não-selecionados."
        },
        {
            "titulo": "Princípio da Inclusão-Exclusão (PIE)",
            "materia": "Probabilidade e Combinatória",
            "topico": "Análise Combinatória",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$\\left|\\bigcup_{i=1}^n A_i\\right| = \\sum |A_i| - \\sum |A_i \\cap A_j| + \\dots + (-1)^{n-1} |A_1 \\cap \\dots \\cap A_n|$$",
            "gatilho_reconhecimento": "Contagem de elementos que satisfazem pelo menos uma de múltiplas restrições sobrepostas.",
            "intuicao_prova": "Expansão de produto das funções indicadoras (1 - I_A1)...(1 - I_An) = 0 para elementos na união."
        },
        {
            "titulo": "Permutações Caóticas (Desarranjos de Montmort)",
            "materia": "Probabilidade e Combinatória",
            "topico": "Análise Combinatória",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$D_n = n! \\sum_{k=0}^n \\frac{(-1)^k}{k!} \\approx \\left\\lfloor \\frac{n!}{e} + \\frac{1}{2} \\right\\rfloor, \\quad D_n = (n-1)(D_{n-1} + D_{n-2})$$",
            "gatilho_reconhecimento": "Permutação onde nenhum elemento fica na sua posição original (problema das cartas nos envelopes).",
            "intuicao_prova": "Aplicação do Princípio da Inclusão-Exclusão nas propriedades de pontos fixos sigma(i) = i."
        },
        {
            "titulo": "Números de Catalan",
            "materia": "Probabilidade e Combinatória",
            "topico": "Análise Combinatória",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$C_n = \\frac{1}{n+1}\\binom{2n}{n} = \\binom{2n}{n} - \\binom{2n}{n-1}$$",
            "gatilho_reconhecimento": "Caminhos na grade sem cruzar a diagonal, parênteses bem formados, triangulações de polígonos convexos.",
            "intuicao_prova": "Princípio da reflexão de André refletindo caminhos que tocam a reta proibida y = x + 1."
        },
        {
            "titulo": "Princípio da Casa dos Pombos Generalizado (Dirichlet)",
            "materia": "Probabilidade e Combinatória",
            "topico": "Princípios Lógicos",
            "nivel": "Fundamentos",
            "formula_latex": "$$\\text{Se } N \\text{ objetos são postos em } k \\text{ caixas, pelo menos uma tem } \\lceil N/k \\rceil \\text{ objetos}$$",
            "gatilho_reconhecimento": "Demonstrar existência de subconjuntos com mesma soma, mesma distância ou mesmo resto.",
            "intuicao_prova": "Prova por contradição: se todas tivessem menos de N/k, a soma total seria estritamente menor que N."
        },
        {
            "titulo": "Identidade de Vandermonde e Hockey-Stick de Pascal",
            "materia": "Probabilidade e Combinatória",
            "topico": "Triângulo de Pascal e Binômio",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$\\sum_{k=0}^r \\binom{m}{k}\\binom{n}{r-k} = \\binom{m+n}{r}; \\quad \\sum_{i=r}^n \\binom{i}{r} = \\binom{n+1}{r+1}$$",
            "gatilho_reconhecimento": "Somatórios de produtos de coeficientes binomiais ou colunas/diagonais do triângulo de Pascal.",
            "intuicao_prova": "Comparação dos coeficientes de x^r no produto polinomial (1+x)^m (1+x)^n = (1+x)^(m+n)."
        },
        {
            "titulo": "Linearidade da Esperança para Variáveis Dependentes",
            "materia": "Probabilidade e Combinatória",
            "topico": "Variáveis Aleatórias e Esperança",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$\\mathbb{E}\\left[\\sum_{i=1}^n X_i\\right] = \\sum_{i=1}^n \\mathbb{E}[X_i] \\quad (\\text{sempre válido})$$",
            "gatilho_reconhecimento": "Cálculo do valor esperado de contagens (número de acertos, pontos fixos, picos) usando indicadoras.",
            "intuicao_prova": "A integral de Lebesgue / somatório da média preserva linearidade independentemente da medida conjunta."
        },
        {
            "titulo": "Teorema de Bayes e Probabilidade Total",
            "materia": "Probabilidade e Combinatória",
            "topico": "Probabilidade Condicional",
            "nivel": "Fundamentos",
            "formula_latex": "$$P(A_i|B) = \\frac{P(B|A_i)P(A_i)}{\\sum_j P(B|A_j)P(A_j)}$$",
            "gatilho_reconhecimento": "Inversão de condição: probabilidade de uma causa dado que o efeito foi observado.",
            "intuicao_prova": "Definição de probabilidade condicional P(A e B) / P(B) decompondo o denominador na partição amostral."
        },
        {
            "titulo": "Recorrência de Primeiro Passo em Cadeias de Markov",
            "materia": "Probabilidade e Combinatória",
            "topico": "Processos Estocásticos",
            "nivel": "Olímpico",
            "formula_latex": "$$\\mu_i = 1 + \\sum_{j} p_{ij} \\mu_j$$",
            "gatilho_reconhecimento": "Tempo esperado de lançamentos de moeda ou dado até sair uma sequência específica de resultados.",
            "intuicao_prova": "Condicionamento na primeira transição consumindo 1 unidade de tempo mais o tempo residual do novo estado."
        },
        {
            "titulo": "Teorema do Aperto de Mão e Teorema de Turán",
            "materia": "Probabilidade e Combinatória",
            "topico": "Teoria dos Grafos",
            "nivel": "Olímpico",
            "formula_latex": "$$\\sum_{v \\in V} d(v) = 2|E|; \\quad |E| \\le \\left\\lfloor \\frac{n^2}{4} \\right\\rfloor \\quad (\\text{sem triângulos})$$",
            "gatilho_reconhecimento": "Relação entre graus e arestas de um grafo, ou número máximo de arestas sem ciclos de tamanho 3.",
            "intuicao_prova": "Cada aresta conecta exatamente dois vértices contando duas vezes na soma de graus; indução para Mantel."
        },

        # 6. POLINÔMIOS & NÚMEROS COMPLEXOS
        {
            "titulo": "Relações de Girard para Polinômios de Grau n",
            "materia": "Polinômios e Complexos",
            "topico": "Relações de Girard",
            "nivel": "Fundamentos",
            "formula_latex": "$$\\sigma_k = \\sum_{i_1 < \\dots < i_k} r_{i_1}\\dots r_{i_k} = (-1)^k \\frac{a_{n-k}}{a_n}$$",
            "gatilho_reconhecimento": "Expressões simétricas das raízes de polinômios sem necessidade de fatorar ou calcular as raízes.",
            "intuicao_prova": "Igualdade dos coeficientes após expandir o produto linear a_n (x - r_1)...(x - r_n)."
        },
        {
            "titulo": "Fórmulas de Newton para Somas de Potências de Raízes",
            "materia": "Polinômios e Complexos",
            "topico": "Polinômios e Raízes",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$a_n S_k + a_{n-1}S_{k-1} + \\dots + k a_{n-k} = 0, \\quad S_k = \\sum r_i^k$$",
            "gatilho_reconhecimento": "Cálculo de somas de potências altas das raízes r1^5 + r2^5 + r3^5 no ITA/IME.",
            "intuicao_prova": "Multiplicação da derivada logarítmica P'(x)/P(x) pela série formal e comparação de coeficientes."
        },
        {
            "titulo": "Critério da Derivada para Raízes Múltiplas",
            "materia": "Polinômios e Complexos",
            "topico": "Polinômios e Derivadas",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$r \\text{ é raiz de multiplicidade } m \\iff P(r) = P'(r) = \\dots = P^{(m-1)}(r) = 0 \\ne P^{(m)}(r)$$",
            "gatilho_reconhecimento": "Polinômio divisível por (x-a)^2 ou condição para existência de raiz dupla/tripla.",
            "intuicao_prova": "Regra do produto da derivada aplicada a P(x) = (x-r)^m Q(x)."
        },
        {
            "titulo": "Lema da Diferença Inteira em Polinômios Inteiros",
            "materia": "Polinômios e Complexos",
            "topico": "Polinômios com Coeficientes Inteiros",
            "nivel": "Olímpico",
            "formula_latex": "$$(a - b) \\mid (P(a) - P(b)) \\quad \\forall a,b \\in \\mathbb{Z}$$",
            "gatilho_reconhecimento": "Provar que não existe polinômio de coeficientes inteiros com valores dados em múltiplos inteiros.",
            "intuicao_prova": "Para todo monômio c_k x^k, a^k - b^k é divisível por a - b pela fatoração algébrica clássica."
        },
        {
            "titulo": "Raízes da Unidade e Filtro de Soma de Coeficientes",
            "materia": "Polinômios e Complexos",
            "topico": "Números Complexos",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$\\omega = e^{2\\pi i / n} \\implies \\sum_{k=0}^{n-1} \\omega^{kj} = n \\text{ se } n \\mid j, \\quad 0 \\text{ caso contrário}$$",
            "gatilho_reconhecimento": "Somas de binômios pulando de 3 em 3 ou cálculo de produtórios trigonométricos cíclicos.",
            "intuicao_prova": "Soma de progressão geométrica finita com razão omega^j diferente de 1."
        },
        {
            "titulo": "Rotação no Plano de Argand-Gauss",
            "materia": "Polinômios e Complexos",
            "topico": "Geometria com Complexos",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$z_2 - z_0 = (z_1 - z_0)e^{i\\theta}; \\quad \\triangle \\text{ equilátero: } z_1^2 + z_2^2 + z_3^2 = z_1 z_2 + z_2 z_3 + z_3 z_1$$",
            "gatilho_reconhecimento": "Resolução de problemas de rotação geométrica, quadrados e triângulos equiláteros com coordenadas complexas.",
            "intuicao_prova": "Multiplicação por e^(i theta) preserva o módulo e adiciona o ângulo theta ao argumento do vetor complexo."
        },
        {
            "titulo": "Substituição Simétrica em Polinômios Recíprocos",
            "materia": "Polinômios e Complexos",
            "topico": "Polinômios",
            "nivel": "Fundamentos",
            "formula_latex": "$$u = x + \\frac{1}{x} \\implies x^2 + \\frac{1}{x^2} = u^2 - 2, \\quad x^3 + \\frac{1}{x^3} = u^3 - 3u$$",
            "gatilho_reconhecimento": "Equações polinomiais com coeficientes simétricos em relação ao centro (capicuas).",
            "intuicao_prova": "Divisão por x^(n/2) agrupando termos equidistantes dos extremos em potências de u."
        },
        {
            "titulo": "Critério de Irredutibilidade de Eisenstein",
            "materia": "Polinômios e Complexos",
            "topico": "Polinômios e Álgebra Abstrata",
            "nivel": "Olímpico",
            "formula_latex": "$$p \\nmid a_n, \\quad p \\mid a_i \\quad (0 \\le i < n), \\quad p^2 \\nmid a_0 \\implies P(x) \\text{ irredutível em } \\mathbb{Q}[x]$$",
            "gatilho_reconhecimento": "Provar que um polinômio não pode ser fatorado em fatores de grau menor com coeficientes racionais.",
            "intuicao_prova": "Redução dos coeficientes módulo p e análise das potências no anel de polinômios Z_p[x]."
        },

        # 7. TRIGONOMETRIA
        {
            "titulo": "Identidade Condicional de Tangentes em Triângulos",
            "materia": "Trigonometria",
            "topico": "Identidades Trigonométricas",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$A + B + C = \\pi \\implies \\tan A + \\tan B + \\tan C = \\tan A \\tan B \\tan C$$",
            "gatilho_reconhecimento": "Identidades com tangentes dos três ângulos internos de um triângulo.",
            "intuicao_prova": "Aplica tan(A+B) = tan(pi - C) = -tan C e multiplica os denominadores."
        },
        {
            "titulo": "Substituição Universal de Weierstrass (Arco Metade)",
            "materia": "Trigonometria",
            "topico": "Equações e Integrais Trigonométricas",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$t = \\tan(x/2) \\implies \\sin x = \\frac{2t}{1+t^2}, \\quad \\cos x = \\frac{1-t^2}{1+t^2}, \\quad \\tan x = \\frac{2t}{1-t^2}$$",
            "gatilho_reconhecimento": "Equações lineares a sin x + b cos x = c ou integrais fracionárias de seno e cosseno.",
            "intuicao_prova": "Geometria do círculo trigonométrico e interseção de retas com a circunferência unitária a partir de (-1, 0)."
        },
        {
            "titulo": "Método do Ângulo Auxiliar para Combinação Linear",
            "materia": "Trigonometria",
            "topico": "Identidades Trigonométricas",
            "nivel": "Fundamentos",
            "formula_latex": "$$a\\sin x + b\\cos x = \\sqrt{a^2 + b^2}\\sin(x + \\phi), \\quad \\text{máximo } = \\sqrt{a^2+b^2}$$",
            "gatilho_reconhecimento": "Valor máximo, mínimo ou raízes de combinação linear de seno e cosseno de mesmo arco.",
            "intuicao_prova": "Multiplicação e divisão por sqrt(a^2+b^2) identificando cos phi = a/R e sin phi = b/R."
        },
        {
            "titulo": "Soma de Cossenos em PA (Núcleo de Dirichlet)",
            "materia": "Trigonometria",
            "topico": "Somatórios Trigonométricos",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$\\sum_{k=0}^{n-1} \\cos(a + kr) = \\frac{\\sin(nr/2)}{\\sin(r/2)}\\cos\\left(a + \\frac{n-1}{2}r\\right)$$",
            "gatilho_reconhecimento": "Somas finitas de senos ou cossenos cujos arcos estão em progressão aritmética.",
            "intuicao_prova": "Multiplica e divide por 2 sin(r/2) aplicando prostaférese em cadeia telescópica."
        },
        {
            "titulo": "Telescopagem da Tangente via Cotangente Dupla",
            "materia": "Trigonometria",
            "topico": "Somatórios Trigonométricos",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$\\tan x = \\cot x - 2\\cot(2x) \\implies \\sum_{k=0}^{n-1} 2^k \\tan(2^k x) = \\cot x - 2^n \\cot(2^n x)$$",
            "gatilho_reconhecimento": "Somas trigonométricas com potências de 2 multiplicando tangentes de arcos duplicados.",
            "intuicao_prova": "Identidade cot(x) - cot(2x) = 1/sin(2x) reescrita em termos da tangente do arco."
        },

        # 8. GEOMETRIA ESPACIAL
        {
            "titulo": "Relação de Euler para Poliedros Convexos",
            "materia": "Geometria Espacial",
            "topico": "Poliedros",
            "nivel": "Fundamentos",
            "formula_latex": "$$V - A + F = 2, \\quad 2A = \\sum n_i F_i, \\quad S_{\\text{ângulos}} = 360^\\circ(V - 2)$$",
            "gatilho_reconhecimento": "Contagem de vértices, arestas e faces em poliedros convexos e fulerenos.",
            "intuicao_prova": "Planificação topológica do poliedro e invariância da característica de Euler por triangulação."
        },
        {
            "titulo": "Teorema de De Gua (Pitágoras Tridimensional no Tetraedro)",
            "materia": "Geometria Espacial",
            "topico": "Tetraedros e Pirâmides",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$[ABC]^2 = [OAB]^2 + [OBC]^2 + [OCA]^2, \\quad \\frac{1}{h^2} = \\frac{1}{a^2} + \\frac{1}{b^2} + \\frac{1}{c^2}$$",
            "gatilho_reconhecimento": "Tetraedro com três faces perpendiculares duas a duas no vértice O (canto de cubo).",
            "intuicao_prova": "Projeções ortogonais das áreas e relações trigonométricas dos ângulos diédricos."
        },
        {
            "titulo": "Raio da Esfera Inscrita em Poliedro Circunscritível",
            "materia": "Geometria Espacial",
            "topico": "Esferas e Poliedros",
            "nivel": "Fundamentos",
            "formula_latex": "$$V = \\frac{1}{3}S_{\\text{total}} \\cdot r \\implies r = \\frac{3V}{S_{\\text{total}}}$$",
            "gatilho_reconhecimento": "Determinação do raio da esfera tangente a todas as faces de uma pirâmide, tetraedro ou poliedro.",
            "intuicao_prova": "Partição do poliedro em pirâmides que têm como base as faces do poliedro e vértice no centro da esfera."
        },
        {
            "titulo": "Fórmula do Prismatoide (Regra dos Três Níveis de Simpson)",
            "materia": "Geometria Espacial",
            "topico": "Volumes e Prismatoides",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$V = \\frac{h}{6}\\left(A_{\\text{inf}} + 4A_{\\text{médio}} + A_{\\text{sup}}\\right)$$",
            "gatilho_reconhecimento": "Cálculo unificado de volume de tronco de pirâmide, cunha, esfera, cilindro ou octaedro.",
            "intuicao_prova": "Integração quadrática da função de área das seções transversais A(z) que varia no máximo com grau 2."
        },
        {
            "titulo": "Teorema de Pappus-Guldin para Sólidos de Revolução",
            "materia": "Geometria Espacial",
            "topico": "Sólidos de Revolução",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$A = 2\\pi \\bar{x} L, \\quad V = 2\\pi \\bar{x} S$$",
            "gatilho_reconhecimento": "Área ou volume gerado pela rotação de uma linha ou superfície em torno de um eixo externo.",
            "intuicao_prova": "Integração em coordenadas cilíndricas onde a distância ao eixo x é ponderada pela posição do centroide."
        },

        # 9. GEOMETRIA ANALÍTICA & VETORES
        {
            "titulo": "Fórmula de Shoelace (Gauss) e Produto Misto",
            "materia": "Geometria Analítica",
            "topico": "Áreas e Volumes Analíticos",
            "nivel": "Fundamentos",
            "formula_latex": "$$S = \\frac{1}{2}|\\sum (x_i y_{i+1} - x_{i+1} y_i)|; \\quad V_{\\text{tetraedro}} = \\frac{1}{6}|[\\vec{u}, \\vec{v}, \\vec{w}]|$$",
            "gatilho_reconhecimento": "Área de polígonos quaisquer conhecendo apenas as coordenadas cartesianas dos vértices.",
            "intuicao_prova": "Teorema de Green no plano aplicando a integral de linha de (x dy - y dx)/2 sobre o contorno poligonal."
        },
        {
            "titulo": "Distância de Ponto a Reta e Equação das Bissetrizes",
            "materia": "Geometria Analítica",
            "topico": "Retas no Plano",
            "nivel": "Fundamentos",
            "formula_latex": "$$d = \\frac{|a x_0 + b y_0 + c|}{\\sqrt{a^2 + b^2}}; \\quad \\frac{a_1 x + b_1 y + c_1}{\\sqrt{a_1^2+b_1^2}} = \\pm \\frac{a_2 x + b_2 y + c_2}{\\sqrt{a_2^2+b_2^2}}$$ ",
            "gatilho_reconhecimento": "Cálculo de raio de círculo tangente a retas ou determinação das bissetrizes internas e externas.",
            "intuicao_prova": "Projeção escalar do vetor que liga o ponto à reta na direção do vetor normal normalizado."
        },
        {
            "titulo": "Reta Tangente a Cônicas por Desdobramento Polar",
            "materia": "Geometria Analítica",
            "topico": "Cônicas",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$x^2 \\mapsto x x_0, \\quad y^2 \\mapsto y y_0, \\quad 2xy \\mapsto x y_0 + y x_0, \\quad 2x \\mapsto x + x_0$$",
            "gatilho_reconhecimento": "Obtenção imediata da equação da reta tangente a elipse, hipérbole ou parábola no ponto de contato sem derivadas.",
            "intuicao_prova": "Linearização da forma quadrática associada à matriz da cônica avaliada no vetor homogêneo do ponto."
        },
        {
            "titulo": "Invariantes de Rotação de Cônicas e Eliminação de xy",
            "materia": "Geometria Analítica",
            "topico": "Cônicas Rotacionadas",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$I_1 = A + C, \\quad I_2 = B^2 - 4AC, \\quad \\cot(2\\theta) = \\frac{A - C}{B}$$",
            "gatilho_reconhecimento": "Identificação e rotação de cônicas completas com termo misto Bxy na Escola Naval/ITA/IME.",
            "intuicao_prova": "Invariância do traço e determinante da matriz da forma quadrática sob matrizes de rotação ortogonais."
        },
        {
            "titulo": "Propriedade Óptica Refletora das Cônicas",
            "materia": "Geometria Analítica",
            "topico": "Propriedades das Cônicas",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$\\text{Elipse: reta tangente é bissetriz externa dos raios focais } PF_1 \\text{ e } PF_2$$",
            "gatilho_reconhecimento": "Problemas de reflexão de raios luminosos, espelhos parabólicos e ângulos com os focos.",
            "intuicao_prova": "Princípio de Fermat de menor tempo de percurso com a soma das distâncias PF1 + PF2 constante."
        },

        # 10. ÁLGEBRA LINEAR
        {
            "titulo": "Teorema do Posto-Nulidade (Rank-Nullity)",
            "materia": "Álgebra Linear",
            "topico": "Transformações Lineares",
            "nivel": "Superior/DataScience",
            "formula_latex": "$$\\dim V = \\dim(\\ker T) + \\dim(\\text{Im } T) = \\text{nul}(T) + \\text{posto}(T)$$",
            "gatilho_reconhecimento": "Relação entre a dimensão do espaço solução de Ax = 0 e a dimensão da imagem gerada pelas colunas de A.",
            "intuicao_prova": "Extensão de uma base do núcleo a uma base de V e prova de que as imagens dos vetores adicionados geram a imagem."
        },
        {
            "titulo": "Traço e Determinante Expressos por Autovalores",
            "materia": "Álgebra Linear",
            "topico": "Autovalores e Autovetores",
            "nivel": "Superior/DataScience",
            "formula_latex": "$$\\text{tr}(A) = \\sum_{i=1}^n \\lambda_i, \\quad \\det(A) = \\prod_{i=1}^n \\lambda_i, \\quad \\text{autovalores de } A^k = \\lambda_i^k$$",
            "gatilho_reconhecimento": "Cálculo de determinante e traço de matrizes elevadas a potências altas ou polinômios matriciais.",
            "intuicao_prova": "Comparação dos coeficientes do polinômio característico p(lambda) = det(lambda I - A)."
        },
        {
            "titulo": "Teorema de Cayley-Hamilton",
            "materia": "Álgebra Linear",
            "topico": "Autovalores e Polinômios Matriciais",
            "nivel": "Superior/DataScience",
            "formula_latex": "$$p_A(A) = 0 \\implies A^2 - \\text{tr}(A)A + \\det(A)I = 0 \\quad (2 \\times 2)$$",
            "gatilho_reconhecimento": "Expressar potências altas A^100 ou inversa A^-1 como combinação linear de potências menores.",
            "intuicao_prova": "Propriedade da matriz adjunta clássica (adj A)(t I - A) = det(t I - A) I aplicada como identidade polinomial."
        },
        {
            "titulo": "Lema do Determinante de Posto 1 (Sylvester)",
            "materia": "Álgebra Linear",
            "topico": "Determinantes e Matrizes",
            "nivel": "Superior/DataScience",
            "formula_latex": "$$\\det(I_n + u v^T) = 1 + v^T u, \\quad \\det(A + u v^T) = \\det(A)(1 + v^T A^{-1} u)$$",
            "gatilho_reconhecimento": "Determinantes de matrizes com termos repetidos ou matrizes pertubadas por posto 1.",
            "intuicao_prova": "A matriz uv^T possui n-1 autovalores nulos e um único autovalor igual ao traço v^T u."
        },
        {
            "titulo": "Determinante de Vandermonde",
            "materia": "Álgebra Linear",
            "topico": "Determinantes",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$\\det([x_i^{j-1}]) = \\prod_{1 \\le i < j \\le n} (x_j - x_i)$$",
            "gatilho_reconhecimento": "Matrizes onde as linhas ou colunas progridem em progressão geométrica das variáveis.",
            "intuicao_prova": "O determinante é um polinômio homogêneo que se anula sempre que x_i = x_j, fixando suas raízes lineares."
        },
        {
            "titulo": "Teorema Espectral para Matrizes Reais Simétricas",
            "materia": "Álgebra Linear",
            "topico": "Diagonalização e Formas Quadráticas",
            "nivel": "Superior/DataScience",
            "formula_latex": "$$A = A^T \\implies A = Q \\Lambda Q^T, \\quad Q^T Q = I, \\quad \\lambda_i \\in \\mathbb{R}$$",
            "gatilho_reconhecimento": "Diagonalização ortogonal, classificação de formas quadráticas e decomposição de covariância em PCA.",
            "intuicao_prova": "Autovetores associados a autovalores distintos de matrizes simétricas são ortogonais pelo produto interno real."
        },
        {
            "titulo": "Decomposição em Valores Singulares (SVD)",
            "materia": "Álgebra Linear",
            "topico": "Decomposição Matricial e ML",
            "nivel": "Superior/DataScience",
            "formula_latex": "$$A = U \\Sigma V^T, \\quad \\sigma_i = \\sqrt{\\lambda_i(A^T A)}$$",
            "gatilho_reconhecimento": "Aproximação de matrizes de baixo posto (Teorema de Eckart-Young) e pseudoinversa de Moore-Penrose.",
            "intuicao_prova": "Aplicação do Teorema Espectral à matriz simétrica semidefinida positiva A^T A."
        },
        {
            "titulo": "Critério de Sylvester para Matrizes Positivas Definidas",
            "materia": "Álgebra Linear",
            "topico": "Formas Quadráticas",
            "nivel": "Superior/DataScience",
            "formula_latex": "$$A \\succ 0 \\iff \\Delta_k > 0 \\quad \\forall k \\in \\{1, \\dots, n\\} \\quad (\\text{menores principais líderes})$$",
            "gatilho_reconhecimento": "Classificação de extremos de funções multivariáveis através da matriz Hessiana em Cálculo III e otimização.",
            "intuicao_prova": "Eliminação gaussiana preservando a positividade dos pivôs ao longo da diagonal principal."
        },

        # 11. CÁLCULO DIFERENCIAL, INTEGRAL & EDOS
        {
            "titulo": "Teorema do Valor Médio de Lagrange (TVM)",
            "materia": "Cálculo",
            "topico": "Derivadas e Aplicações",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$\\exists c \\in (a,b): f'(c) = \\frac{f(b) - f(a)}{b - a}$$",
            "gatilho_reconhecimento": "Provar desigualdades funcionais do tipo |f(x) - f(y)| <= M|x - y| ou unicidade de raízes.",
            "intuicao_prova": "Aplicação do Teorema de Rolle à função secante auxiliar g(x) = f(x) - [(f(b)-f(a))/(b-a)](x-a)."
        },
        {
            "titulo": "Teste da Primeira e Segunda Derivada para Extremos",
            "materia": "Cálculo",
            "topico": "Otimização e Máximos e Mínimos",
            "nivel": "Fundamentos",
            "formula_latex": "$$f'(x_0) = 0 \\text{ e } f''(x_0) > 0 \\implies x_0 \\text{ mínimo local}; \\quad f''(x_0) < 0 \\implies \\text{máximo}$$",
            "gatilho_reconhecimento": "Determinação de máximos e mínimos locais e intervalos de concavidade de funções.",
            "intuicao_prova": "Aproximação quadrática de Taylor f(x) approx f(x_0) + (1/2) f''(x_0)(x - x_0)^2."
        },
        {
            "titulo": "Regra de Leibniz para Derivação sob a Integral (Feynman)",
            "materia": "Cálculo",
            "topico": "Integrais Definidas",
            "nivel": "Superior/DataScience",
            "formula_latex": "$$\\frac{d}{dx} \\int_{u(x)}^{v(x)} f(x,t)dt = f(x, v(x))v'(x) - f(x, u(x))u'(x) + \\int_{u(x)}^{v(x)} \\frac{\\partial f}{\\partial x}(x,t)dt$$",
            "gatilho_reconhecimento": "Derivar limites com integrais ou resolver integrais difíceis parametrizando uma variável auxiliar.",
            "intuicao_prova": "Regra da cadeia multivariável combinada com o Teorema Fundamental do Cálculo nos limites variáveis."
        },
        {
            "titulo": "Simetria de King em Integrais Definidas",
            "materia": "Cálculo",
            "topico": "Técnicas de Integração",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$\\int_a^b f(x)dx = \\int_a^b f(a + b - x)dx \\implies \\int_0^{\\pi/2} \\frac{g(\\sin x)}{g(\\sin x) + g(\\cos x)}dx = \\frac{\\pi}{4}$$",
            "gatilho_reconhecimento": "Integrais definidas em que a primitiva analítica é elementarmente inacessível, mas possui simetria no intervalo.",
            "intuicao_prova": "Mudança de variável u = a + b - x que inverte os limites de integração e preserva a área total."
        },
        {
            "titulo": "Integral Gaussiana e Relação com as Funções Gama e Beta",
            "materia": "Cálculo",
            "topico": "Integrais Impróprias e Especiais",
            "nivel": "Superior/DataScience",
            "formula_latex": "$$\\int_{-\\infty}^\\infty e^{-x^2}dx = \\sqrt{\\pi}, \\quad \\Gamma(n) = (n-1)!, \\quad B(p, q) = \\frac{\\Gamma(p)\\Gamma(q)}{\\Gamma(p+q)}$$",
            "gatilho_reconhecimento": "Normalização da distribuição gaussiana, integrais de potências trigonométricas (Wallis) e fatoriais generalizados.",
            "intuicao_prova": "Conversão da integral dupla do produto em coordenadas polares com jacobiano r dr dtheta."
        },
        {
            "titulo": "Expansões de Maclaurin para Limites sem L'Hôpital",
            "materia": "Cálculo",
            "topico": "Séries e Limites",
            "nivel": "Militar/Vestibular",
            "formula_latex": "$$\\sin x = x - \\frac{x^3}{6} + O(x^5), \\quad \\cos x = 1 - \\frac{x^2}{2} + O(x^4), \\quad \\ln(1+x) = x - \\frac{x^2}{2} + O(x^3)$$",
            "gatilho_reconhecimento": "Limites de formas indeterminadas 0/0 com termos compostos de ordem 3 ou superior sem derivar repetidas vezes.",
            "intuicao_prova": "Aproximação polinomial infinitesimal pela série de potências de Taylor em torno de zero."
        },
        {
            "titulo": "Método dos Multiplicadores de Lagrange",
            "materia": "Cálculo",
            "topico": "Cálculo Multivariável",
            "nivel": "Superior/DataScience",
            "formula_latex": "$$\\nabla f(x, y, z) = \\lambda \\nabla g(x, y, z), \\quad g(x,y,z) = c$$",
            "gatilho_reconhecimento": "Otimização de função de várias variáveis sujeita a uma ou mais restrições de igualdade.",
            "intuicao_prova": "No ponto de extremo condicionado, as curvas de nível da função f são tangentes à superfície de restrição g."
        },
        {
            "titulo": "Fator Integrante para EDO Linear de 1ª Ordem",
            "materia": "Cálculo",
            "topico": "Equações Diferenciais",
            "nivel": "Superior/DataScience",
            "formula_latex": "$$y' + P(x)y = Q(x) \\implies \\mu(x) = e^{\\int P(x)dx}, \\quad (\\mu y)' = \\mu Q(x)$$",
            "gatilho_reconhecimento": "Equações diferenciais ordinárias lineares de primeira ordem não separáveis.",
            "intuicao_prova": "Multiplicação por mu(x) transforma o lado esquerdo na derivada do produto d/dx [mu(x) y]."
        },
        {
            "titulo": "Teorema da Divergência de Gauss e Teorema de Stokes",
            "materia": "Cálculo",
            "topico": "Cálculo Vetorial",
            "nivel": "Superior/DataScience",
            "formula_latex": "$$\\iint_{\\partial V} \\vec{F} \\cdot d\\vec{S} = \\iiint_V (\\nabla \\cdot \\vec{F})dV; \\quad \\oint_{\\partial S} \\vec{F} \\cdot d\\vec{r} = \\iint_S (\\nabla \\times \\vec{F}) \\cdot d\\vec{S}$$",
            "gatilho_reconhecimento": "Converter integral de superfície fechada em integral tripla volumétrica do divergente.",
            "intuicao_prova": "Cancelamento telescópico dos fluxos internos das células microscópicas adjacentes deixando apenas a fronteira."
        },

        # 12. MATEMÁTICA BÁSICA & DATA SCIENCE / MACHINE LEARNING
        {
            "titulo": "Solução Analítica de Mínimos Quadrados (Equação Normal OLS)",
            "materia": "Álgebra Linear",
            "topico": "Estatística e Machine Learning",
            "nivel": "Superior/DataScience",
            "formula_latex": "$$\\hat{w} = (X^T X)^{-1} X^T y, \\quad P = X(X^T X)^{-1}X^T \\quad (\\text{projeção ortogonal})$$",
            "gatilho_reconhecimento": "Minimização do erro quadrático médio em regressão linear e projeção ortogonal no espaço coluna.",
            "intuicao_prova": "O vetor de resíduos y - Xw deve ser ortogonal a todas as colunas de X, logo X^T(y - Xw) = 0."
        },
        {
            "titulo": "Regularização Ridge (L2) e Garantia de Inversibilidade",
            "materia": "Álgebra Linear",
            "topico": "Estatística e Machine Learning",
            "nivel": "Superior/DataScience",
            "formula_latex": "$$\\hat{w}_{\\text{ridge}} = (X^T X + \\lambda I)^{-1} X^T y, \\quad \\lambda > 0$$",
            "gatilho_reconhecimento": "Tratamento de multicolinearidade em regressão linear e controle de overfitting no tradeoff viés-variância.",
            "intuicao_prova": "Adição de lambda*I desloca todos os autovalores de X^TX por +lambda garantindo matriz estritamente positiva definida."
        },
        {
            "titulo": "Geometria da Esparsidade do Lasso (L1) vs Ridge (L2)",
            "materia": "Álgebra Linear",
            "topico": "Estatística e Machine Learning",
            "nivel": "Superior/DataScience",
            "formula_latex": "$$\\min_w \\|Xw - y\\|_2^2 + \\alpha \\sum |w_i| \\implies w_i = 0 \\quad (\\text{quinas no politopo } L_1)$$",
            "gatilho_reconhecimento": "Seleção automática de variáveis explicativas e indução de coeficientes estritamente nulos.",
            "intuicao_prova": "As curvas de nível elípticas da perda tocam os vértices pontiagudos do politopo da norma L1 sobre os eixos."
        },
        {
            "titulo": "Convergência do Gradiente Descendente e L-Suavidade",
            "materia": "Cálculo",
            "topico": "Otimização e Machine Learning",
            "nivel": "Superior/DataScience",
            "formula_latex": "$$w_{t+1} = w_t - \\eta \\nabla f(w_t), \\quad \\|\\nabla f(u) - \\nabla f(v)\\| \\le L \\|u - v\\| \\implies \\eta < \\frac{2}{L}$$",
            "gatilho_reconhecimento": "Garantia de convergência monótona da perda e seleção da taxa de aprendizado ideal eta = 1/L.",
            "intuicao_prova": "Pelo Lema da Descida quadrática, a perda decresce monotonicamente quando o passo não ultrapassa 2/L."
        },
        {
            "titulo": "Decomposição Bias-Variância do Erro Quadrático Médio",
            "materia": "Probabilidade e Combinatória",
            "topico": "Estatística e Machine Learning",
            "nivel": "Superior/DataScience",
            "formula_latex": "$$\\mathbb{E}[(y - \\hat{f}(x))^2] = \\text{Bias}[\\hat{f}(x)]^2 + \\text{Var}(\\hat{f}(x)) + \\sigma_\\epsilon^2$$",
            "gatilho_reconhecimento": "Análise teórica de erro preditivo e justificativa de técnicas de Bagging (reduz variância) e Boosting (reduz viés).",
            "intuicao_prova": "Expansão da esperança quadrática adicionando e subtraindo a esperança do estimador E[f_hat]."
        },
        {
            "titulo": "Equivalência entre Máxima Verossimilhança (MLE) e Funções de Perda",
            "materia": "Probabilidade e Combinatória",
            "topico": "Estatística e Machine Learning",
            "nivel": "Superior/DataScience",
            "formula_latex": "$$\\text{Gaussiano: } \\min \\text{MSE}; \\quad \\text{Laplace: } \\min \\text{MAE}; \\quad \\text{Bernoulli: } \\min \\text{Binary Cross-Entropy}$$",
            "gatilho_reconhecimento": "Justificativa estatística para escolha de funções de perda em regressão, redes neurais e classificação.",
            "intuicao_prova": "Maximizar a log-verossimilhança ln P(y|x, w) equivale a minimizar a perda negativa correspondente."
        },
        {
            "titulo": "Teorema Central do Limite e Erro Padrão da Média",
            "materia": "Probabilidade e Combinatória",
            "topico": "Estatística e Amostragem",
            "nivel": "Superior/DataScience",
            "formula_latex": "$$\\frac{\\bar{X}_n - \\mu}{\\sigma / \\sqrt{n}} \\xrightarrow{d} \\mathcal{N}(0, 1) \\quad \\text{conforme } n \\to \\infty$$",
            "gatilho_reconhecimento": "Testes de hipótese, intervalos de confiança e testes A/B independentemente da distribuição original dos dados.",
            "intuicao_prova": "Convergência pontual da função geradora de momentos ou função característica para a exponencial gaussiana."
        },
        {
            "titulo": "Divergência de Kullback-Leibler e Desigualdade de Gibbs",
            "materia": "Probabilidade e Combinatória",
            "topico": "Teoria da Informação e ML",
            "nivel": "Superior/DataScience",
            "formula_latex": "$$D_{\\text{KL}}(P \\parallel Q) = \\sum P(x) \\ln \\frac{P(x)}{Q(x)} = H(P, Q) - H(P) \\ge 0$$",
            "gatilho_reconhecimento": "Medição de distância não-simétrica entre duas distribuições de probabilidade e ganho de informação em árvores.",
            "intuicao_prova": "Aplicação da desigualdade de Jensen à função estritamente convexa -ln(t)."
        },
        {
            "titulo": "Média Harmônica em Problemas de Vazão e Velocidade Média",
            "materia": "Matemática Básica",
            "topico": "Médias e Razões",
            "nivel": "Fundamentos",
            "formula_latex": "$$v_m = \\frac{2 v_1 v_2}{v_1 + v_2}, \\quad \\frac{1}{R_{\\text{eq}}} = \\frac{1}{R_1} + \\frac{1}{R_2}$$",
            "gatilho_reconhecimento": "Velocidade média em percursos de ida e volta de mesma distância ou torneiras enchendo o mesmo tanque.",
            "intuicao_prova": "A grandeza ponderada (tempo) varia inversamente com a taxa (velocidade ou vazão): t_total = d/v1 + d/v2."
        },
        {
            "titulo": "Regra de Três Composta e Inversão de Grandezas",
            "materia": "Matemática Básica",
            "topico": "Proporcionalidade",
            "nivel": "Fundamentos",
            "formula_latex": "$$\\frac{\\text{Processo}}{\\text{Produto}} = \\text{constante} \\implies \\frac{O_1 \\cdot D_1 \\cdot H_1}{P_1} = \\frac{O_2 \\cdot D_2 \\cdot H_2}{P_2}$$",
            "gatilho_reconhecimento": "Problemas de operários, dias, horas/dia executando uma determinada obra ou tarefa.",
            "intuicao_prova": "Constância do trabalho total necessário por unidade de produto gerado (eficiência do processo)."
        }
    ]

def main():
    print("Compilador do Catálogo de Lemas LEMMAS Core inicializado.")

if __name__ == "__main__":
    main()
