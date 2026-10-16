"""
Script de Extração e Ingestão Completa do CEDERJ (Notion)
Disciplinas: Lógica e Teoria dos Conjuntos + Construções Geométricas
Salva JSON canônico e insere no Supabase (public.questoes)
"""

import os
import sys
import re
import json
import unicodedata
from pathlib import Path

# Configura UTF-8 no Windows
sys.stdout.reconfigure(encoding='utf-8')

# Adiciona raiz do projeto e backend
PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

import fitz  # PyMuPDF
from app.core.config import get_supabase_client

NOTION_ROOT = Path(r"D:\Downloads\Notion\Auxílio para estudos\Quarto Período")
OUTPUT_JSON = PROJECT_ROOT / "data" / "sources" / "cederj" / "processed" / "cederj_notion_logica_cg.json"
OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)


def clean_cederj_text(text: str) -> str:
    """Corrige diacríticos e caracteres quebrados da exportação do LaTeX/CEDERJ."""
    text = text.replace('˜a', 'ã').replace('˜o', 'õ').replace('˜A', 'Ã')
    text = text.replace('´a', 'á').replace('´e', 'é').replace('´ı', 'í').replace('´i', 'í').replace('´o', 'ó').replace('´u', 'ú')
    text = text.replace('´A', 'Á').replace('´E', 'É').replace('´I', 'Í').replace('´O', 'Ó').replace('´U', 'Ú')
    text = text.replace('ˆa', 'â').replace('ˆe', 'ê').replace('ˆo', 'ô')
    text = text.replace('ˆA', 'Â').replace('ˆE', 'Ê').replace('ˆO', 'Ô')
    text = text.replace('¸c', 'ç').replace('¸C', 'Ç')
    text = text.replace('`a', 'à').replace('`A', 'À')
    text = text.replace('¨u', 'ü').replace('¨U', 'Ü')
    text = text.replace('ﬁ', 'fi').replace('ﬂ', 'fl')
    return text


def polish_math_latex(text: str) -> str:
    """Padroniza símbolos matemáticos com KaTeX."""
    text = clean_cederj_text(text)
    # Grau
    text = re.sub(r'(\d+(?:[.,]\d+)?)\s*◦', r'$\1^\\circ$', text)
    text = re.sub(r'(\d+)\s*º\s*(\d+)\s*[\'’]', r'$\1^\\circ \2\'$', text)
    text = re.sub(r'(\d+)\s*º', r'$\1^\\circ$', text)
    # Ângulos tipo ˆA, ˆB
    text = re.sub(r'(?:ˆ|\^)([A-Z])', r'$\\hat{\1}$', text)
    # Raízes quadradas
    text = re.sub(r'√\s*(\d+)', r'$\\sqrt{\1}$', text)
    # Quebras de linha e espaçamentos repetidos
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]+', ' ', text)
    return text.strip()


def normalize_key(text: str) -> str:
    """Gera chave normalizada para deduplicação precisa de enunciados."""
    s = re.sub(r'\W+', '', text.lower())
    return s[:120]


def classify_cg_subtopic(enunciado: str) -> str:
    low = enunciado.lower()
    if any(w in low for w in ['arco capaz', 'lugar geométrico', 'lugares geométricos']):
        return 'Arco Capaz e Lugares Geométricos'
    elif any(w in low for w in ['polígono', 'poligono', 'estrelado', 'hexágono', 'hexagono', 'pentágono', 'pentagono', 'octógono', 'octogono', 'pontas']):
        return 'Polígonos Regulares e Estrelados'
    elif any(w in low for w in ['triângulo', 'triangulo', 'isósceles', 'equilátero', 'retângulo', 'incentro', 'circuncentro', 'ortocentro', 'baricentro', 'mediana', 'altura']):
        return 'Construção de Triângulos e Pontos Notáveis'
    elif any(w in low for w in ['circunferência', 'circunferencia', 'círculo', 'circulo', 'tangente', 'tangenciam', 'corda', 'raio']):
        return 'Circunferências e Tangência'
    elif any(w in low for w in ['proporcional', 'média geométrica', 'media geometrica', 'divida', 'razão', 'razao', 'áureo', 'aureo', 'quarta proporcional']):
        return 'Segmentos Proporcionais e Média Geométrica'
    elif any(w in low for w in ['ângulo', 'angulo', 'graus', 'minutos', 'bissetriz']):
        return 'Ângulos Notáveis e Bissetrizes'
    elif any(w in low for w in ['perpendicular', 'paralela', 'mediatriz']):
        return 'Retas Paralelas e Perpendiculares'
    else:
        return 'Construções Euclidianas Fundamentais'


def extract_logica_questions() -> list[dict]:
    """Extrai as 15 questões estruturadas de Lógica e Teoria dos Conjuntos (APX1, APX2, AD1, AD2)."""
    logica_dir = NOTION_ROOT / "Lógica e Teoria dos Conjuntos 2022 1" / "Provas Anteriores"
    questoes = []

    # 1. APX1 2022-1 (5 questões completas com gabarito oficial)
    apx1_itens = [
        {
            "num": 1,
            "subtopico": "Simbolização e Conectivos Lógicos",
            "dificuldade": 2,
            "enunciado": (
                "Simbolizar os seguintes enunciados, levando em conta a sua formação por meio de conectivos:\n\n"
                "(a) Aldo vai perder o posto de vendedor caso não faça boas vendas este mês, mesmo sendo primo da dona da loja.\n\n"
                "(b) Uma depressão vai acontecer se o governo não aumentar os gastos, mas a inflação só vai crescer se o governo aumentar os gastos."
            ),
            "gabarito": (
                "**Resolução Oficial (Coord. Lógica e Teoria dos Conjuntos):**\n\n"
                "**(a)** Legenda:\n"
                "* $p$: Aldo vai perder o posto de vendedor.\n"
                "* $q$: Aldo faz boas vendas este mês.\n"
                "* $r$: Aldo é primo da dona da loja.\n\n"
                "**Simbolização:** $(\\neg q \\to p) \\land r$\n\n"
                "**(b)** Legenda:\n"
                "* $p$: Uma depressão vai acontecer.\n"
                "* $q$: O governo vai aumentar os gastos.\n"
                "* $r$: A inflação vai crescer.\n\n"
                "**Simbolização:** $(\\neg q \\to p) \\land (r \\to q)$"
            ),
            "topico": "Lógica Matemática"
        },
        {
            "num": 2,
            "subtopico": "Tabelas-Verdade e Avaliação Semântica",
            "dificuldade": 3,
            "enunciado": (
                "Determine o valor lógico do seguinte enunciado no contexto usual em que ele está proferido:\n\n"
                "\"Se a lua é feita de queijo ou de salame, então o sanduíche de lua tem recheio de alface ou brócolis.\""
            ),
            "gabarito": (
                "**Resolução Oficial:**\n\n"
                "**Legenda:**\n"
                "* $p$: A lua é feita de queijo.\n"
                "* $q$: A lua é feita de salame.\n"
                "* $r$: O sanduíche de lua tem recheio de alface.\n"
                "* $s$: O sanduíche de lua tem recheio de brócolis.\n\n"
                "**Simbolização:** $(p \\lor q) \\to (r \\lor s)$\n\n"
                "**Avaliação Semântica:**\n"
                "No contexto usual do mundo real, temos:\n"
                "$p = F$ e $q = F$.\n"
                "Portanto, o antecedente $p \\lor q$ avalia para $F \\lor F = F$.\n\n"
                "Pela tabela-verdade do condicional ($\to$), quando o antecedente é Falso, o condicional inteiro é **Verdadeiro** ($V$), independentemente do valor lógico do consequente ($r \\lor s$).\n\n"
                "**Valor Lógico:** **V** (Verdadeiro)."
            ),
            "topico": "Lógica Matemática"
        },
        {
            "num": 3,
            "subtopico": "Tabelas-Verdade e Equivalências Lógicas",
            "dificuldade": 3,
            "enunciado": (
                "Mostre que os seguintes enunciados são logicamente equivalentes, apresentando uma sequência de equivalências que transforma um enunciado no outro:\n\n"
                "$$p \\lor (q \\leftrightarrow r) \\quad \\text{e} \\quad (p \\lor q) \\leftrightarrow (p \\lor r)$$"
            ),
            "gabarito": (
                "**Resolução Oficial por Passos Lógicos de Equivalência:**\n\n"
                "Iniciando pela forma $(p \\lor q) \\leftrightarrow (p \\lor r)$:\n\n"
                "1. Pela definição do bicondicional ($A \\leftrightarrow B \\equiv (A \\to B) \\land (B \\to A)$):\n"
                "$$[(p \\lor q) \\to (p \\lor r)] \\land [(p \\lor r) \\to (p \\lor q)]$$\n\n"
                "2. Pela equivalência da implicação ($A \\to B \\equiv \\neg A \\lor B$):\n"
                "$$[\\neg(p \\lor q) \\lor (p \\lor r)] \\land [\\neg(p \\lor r) \\lor (p \\lor q)]$$\n\n"
                "3. Aplicando as Leis de De Morgan ($\\neg(p \\lor q) \\equiv \\neg p \\land \\neg q$):\n"
                "$$[(\\neg p \\land \\neg q) \\lor (p \\lor r)] \\land [(\\neg p \\land \\neg r) \\lor (p \\lor q)]$$\n\n"
                "4. Pela distributividade da disjunção sobre a conjunção e eliminação do termo neutro/tautológico $(\\neg p \\lor p \\lor r \\equiv V)$:\n"
                "$$(\\neg q \\lor p \\lor r) \\land (\\neg r \\lor p \\lor q)$$\n\n"
                "5. Reagrupando os termos por comutatividade e distributividade de $p$:\n"
                "$$p \\lor [(\\neg q \\lor r) \\land (\\neg r \\lor q)]$$\n\n"
                "6. Reconhecendo as implicações nos fatores internos:\n"
                "$$p \\lor [(q \\to r) \\land (r \\to q)]$$\n\n"
                "7. Pela definição de bicondicional:\n"
                "$$p \\lor (q \\leftrightarrow r) \\quad \\blacksquare$$"
            ),
            "topico": "Lógica Matemática"
        },
        {
            "num": 4,
            "subtopico": "Simbolização e Conectivos Lógicos",
            "dificuldade": 3,
            "enunciado": (
                "Determine se a negação do enunciado:\n\n"
                "\"Se $x$ é positivo se e somente se é maior que ou igual a 1, então $x$ é um número natural.\"\n\n"
                "é $V$ ou $F$ quando $x$ assume o valor $-1$."
            ),
            "gabarito": (
                "**Resolução Oficial:**\n\n"
                "**1. Legenda:**\n"
                "* $p$: $x$ é positivo.\n"
                "* $q$: $x$ é maior que 1.\n"
                "* $r$: $x$ é igual a 1.\n"
                "* $s$: $x$ é número.\n"
                "* $t$: $x$ é natural.\n\n"
                "**2. Simbolização do enunciado:**\n"
                "$$[p \\leftrightarrow (q \\lor r)] \\to (s \\land t)$$\n\n"
                "**3. Negação do enunciado:**\n"
                "$\\neg \\{[p \\leftrightarrow (q \\lor r)] \\to (s \\land t)\\}$\n"
                "$\\equiv [p \\leftrightarrow (q \\lor r)] \\land \\neg(s \\land t)$\n"
                "$\\equiv [p \\leftrightarrow (q \\lor r)] \\land (\\neg s \\lor \\neg t)$\n\n"
                "**4. Avaliação para $x = -1$:**\n"
                "* $p$: Falso ($-1$ não é positivo)\n"
                "* $q$: Falso ($-1$ não é maior que 1)\n"
                "* $r$: Falso ($-1$ não é igual a 1)\n"
                "* $s$: Verdadeiro ($-1$ é número)\n"
                "* $t$: Falso ($-1$ não é natural)\n\n"
                "Substituindo na negação:\n"
                "$$[F \\leftrightarrow (F \\lor F)] \\land (\\neg V \\lor \\neg F) = (F \\leftrightarrow F) \\land (F \\lor V) = V \\land V = V$$\n\n"
                "**Resultado:** **V** (Verdadeiro)."
            ),
            "topico": "Lógica Matemática"
        },
        {
            "num": 5,
            "subtopico": "Quantificadores e Lógica de Primeira Ordem",
            "dificuldade": 3,
            "enunciado": (
                "Simbolizar os seguintes enunciados, levando em conta a sua formação por meio de constantes, propriedades, relações, conectivos e quantificadores:\n\n"
                "(a) Qualquer número natural primo é positivo.\n\n"
                "(b) Não há conjunto que pertença a si mesmo.\n\n"
                "(c) Uma tabela é uma matriz se e somente se seus elementos são números reais.\n\n"
                "(d) 2 é primo e todos os outros primos são maiores do que 2."
            ),
            "gabarito": (
                "**Resolução Oficial:**\n\n"
                "**(a)** Legenda: $P(x)$: $x$ é número; $Q(x)$: $x$ é natural; $R(x)$: $x$ é primo; $S(x)$: $x$ é positivo.\n"
                "$$\\forall x \\{[P(x) \\land Q(x) \\land R(x)] \\to S(x)\\}$$\n\n"
                "**(b)** Legenda: $P(x)$: $x$ é conjunto; $Q(x, y)$: $x$ pertence a $y$.\n"
                "$$\\neg \\exists x [P(x) \\land Q(x, x)]$$\n\n"
                "**(c)** Legenda: $P(x)$: $x$ é tabela; $Q(x)$: $x$ é matriz; $R(y, x)$: $y$ é elemento de $x$; $S(y)$: $y$ é número; $T(y)$: $y$ é real.\n"
                "$$\\forall x \\{P(x) \\to [Q(x) \\leftrightarrow \\forall y (R(y, x) \\to (S(y) \\land T(y)))]\\}$$\n\n"
                "**(d)** Legenda: $a$: 2; $P(x)$: $x$ é primo; $D(x, y)$: $x \\neq y$; $R(x, y)$: $x > y$.\n"
                "$$P(a) \\land \\forall x \\{[P(x) \\land D(x, a)] \\to R(x, a)\\}$$"
            ),
            "topico": "Lógica Matemática"
        }
    ]

    for item in apx1_itens:
        questoes.append({
            "banca": "CEDERJ",
            "ano": 2022,
            "materia": "Probabilidade e Combinatória",
            "topico": item["topico"],
            "subtopico": item["subtopico"],
            "dificuldade": item["dificuldade"],
            "tipo": "discursiva",
            "enunciado": item["enunciado"],
            "gabarito": item["gabarito"],
            "estrategias_esperadas": ["Lógica Proposicional e de Primeira Ordem", "Simbolização e Tabelas-Verdade"],
            "categoria_banca": "Vestibular & Superior",
            "tipo_prova": "Oficial",
            "fase_nivel": "Superior",
            "tipo_material": "prova"
        })

    # 2. APX2 2022-1 (5 questões completas com gabarito oficial)
    apx2_itens = [
        {
            "num": 1,
            "subtopico": "Simbolização e Conectivos Lógicos",
            "dificuldade": 2,
            "enunciado": (
                "Simbolizar os seguintes enunciados, levando em conta a sua formação por meio de conectivos:\n\n"
                "(a) Se você tiver uma dúvida, ela vai respondê-la se a dúvida for enviada para ela e chegar na sua caixa de correio.\n\n"
                "(b) Não podemos atravessar a rua sem que o sinal esteja vermelho para os carros e verde para os pedestres."
            ),
            "gabarito": (
                "**Resolução Oficial:**\n\n"
                "**(a)** Legenda:\n"
                "* $p$: Você tem uma dúvida.\n"
                "* $q$: Ela responde a dúvida.\n"
                "* $r$: A dúvida é enviada para ela.\n"
                "* $s$: A dúvida chega na caixa de correio dela.\n\n"
                "**Simbolização:** $p \\to [(r \\land s) \\to q]$ (ou equivalentemente: $(p \\land r \\land s) \\to q$).\n\n"
                "**(b)** Legenda:\n"
                "* $p$: Nós podemos atravessar a rua.\n"
                "* $q$: O sinal está vermelho para os carros.\n"
                "* $r$: O sinal está verde para os pedestres.\n\n"
                "**Simbolização:** $p \\to (q \\land r)$ (ou equivalentemente: $\\neg(q \\land r) \\to \\neg p$)."
            ),
            "topico": "Lógica Matemática"
        },
        {
            "num": 2,
            "subtopico": "Dedução Lógica e Argumentos",
            "dificuldade": 4,
            "enunciado": (
                "Mostre que o seguinte argumento é válido apresentando uma demonstração direta da sua validade baseada em passos lógicos:\n\n"
                "\"Se comprarmos um piano, nós vamos à falência se instalarmos um ar-condicionado. Não podemos comprar um piano sem instalarmos um ar-condicionado pois o piano não pode ficar em lugar úmido. De fato, compramos um piano. Logo, vamos à falência.\""
            ),
            "gabarito": (
                "**Resolução Oficial:**\n\n"
                "**1. Legenda:**\n"
                "* $p$: Nós compramos um piano.\n"
                "* $q$: Nós vamos à falência.\n"
                "* $r$: Nós instalamos um ar-condicionado.\n"
                "* $s$: O piano pode ficar em lugar úmido.\n\n"
                "**2. Simbolização das Premissas e Conclusão:**\n"
                "1. $p \\to (r \\to q)$\n"
                "2. $\\neg s \\land [\\neg r \\to \\neg p]$\n"
                "3. $p$\n"
                "Conclusão: $q$\n\n"
                "**3. Demonstração por Passos Lógicos:**\n"
                "* De (2), por eliminação da conjunção: $\\neg r \\to \\neg p$ (4)\n"
                "* De (3) e (4), por Modus Tollens ou contraposição: $r$ (5)\n"
                "* De (1) e (3), por Modus Ponens: $r \\to q$ (6)\n"
                "* De (5) e (6), por Modus Ponens: $q$ (7)\n\n"
                "Logo, o argumento é válido. $\\blacksquare$"
            ),
            "topico": "Lógica Matemática"
        },
        {
            "num": 3,
            "subtopico": "Quantificadores e Lógica de Primeira Ordem",
            "dificuldade": 4,
            "enunciado": (
                "Simbolizar os seguintes enunciados, levando em conta a sua formação por meio de constantes, propriedades, relações, conectivos e quantificadores:\n\n"
                "(a) Se algum número natural é interessante, zero é um número natural interessante.\n\n"
                "(b) Nenhum número é menor do que zero ou igual ao infinito.\n\n"
                "(c) Zero é menor que qualquer número natural positivo.\n\n"
                "(d) Para todo número não interessante dado, se existe um número interessante menor do que ele, então o número dado é interessante."
            ),
            "gabarito": (
                "**Resolução Oficial:**\n\n"
                "**(a)** Legenda: $P(x)$: $x$ é número; $Q(x)$: $x$ é natural; $R(x)$: $x$ é interessante; $a$: zero.\n"
                "$$\\exists x [P(x) \\land Q(x) \\land R(x)] \\to [P(a) \\land Q(a) \\land R(a)]$$\n\n"
                "**(b)** Legenda: $P(x)$: $x$ é número; $Q(x, y)$: $x < y$; $R(x, y)$: $x = y$; $a$: zero; $b$: infinito.\n"
                "$$\\neg \\exists x \\{P(x) \\land [Q(x, a) \\lor R(x, b)]\\}$$\n\n"
                "**(c)** Legenda: $P(x)$: $x$ é número; $Q(x)$: $x$ é natural; $R(x)$: $x$ é positivo; $S(x, y)$: $x < y$; $a$: zero.\n"
                "$$\\forall x \\{[P(x) \\land Q(x) \\land R(x)] \\to S(a, x)\\}$$\n\n"
                "**(d)** Legenda: $P(x)$: $x$ é número; $Q(x)$: $x$ é interessante; $R(x, y)$: $x < y$.\n"
                "$$\\forall x \\{[P(x) \\land \\neg Q(x)] \\to [\\exists y (P(y) \\land Q(y) \\land R(y, x)) \\to Q(x)]\\}$$"
            ),
            "topico": "Lógica Matemática"
        },
        {
            "num": 4,
            "subtopico": "Métodos de Demonstração Matemática",
            "dificuldade": 4,
            "enunciado": (
                "Demonstre os seguintes enunciados:\n\n"
                "(a) Para todos $x, y, z \\in \\mathbb{N}$, se $x$ e $y$ são pares e $z$ é ímpar, então $xy + z$ é ímpar. (Usando o **Método da Suposição**).\n\n"
                "(b) Para todos os conjuntos $A, B$ e $C$, se $A \\not\\subseteq B$, então $A \\not\\subseteq B \\cap C$. (Usando o **Método da Contraposição**)."
            ),
            "gabarito": (
                "**Resolução Oficial:**\n\n"
                "**(a) Demonstração pelo Método da Suposição:**\n"
                "Sejam $x, y, z \\in \\mathbb{N}$.\n"
                "Suponhamos que $x$ e $y$ são pares e $z$ é ímpar.\n"
                "Pela definição de paridade, existem $k, l, m \\in \\mathbb{N}$ tais que:\n"
                "$$x = 2k, \\quad y = 2l, \\quad z = 2m + 1$$\n"
                "Efetuando o produto e a soma:\n"
                "$$xy + z = (2k)(2l) + (2m + 1) = 4kl + 2m + 1 = 2(2kl + m) + 1$$\n"
                "Como $2kl + m \\in \\mathbb{N}$, pela definição de número ímpar, $xy + z$ é ímpar. $\\blacksquare$\n\n"
                "**(b) Demonstração pelo Método da Contraposição:**\n"
                "Queremos provar $A \\not\\subseteq B \\implies A \\not\\subseteq B \\cap C$.\n"
                "A contrapositiva equivalente é: $A \\subseteq B \\cap C \\implies A \\subseteq B$.\n"
                "Suponhamos a hipótese contraposta: $A \\subseteq B \\cap C$.\n"
                "Pela definição de inclusão de conjuntos:\n"
                "$$\\forall x (x \\in A \\to x \\in B \\cap C)$$\n"
                "Pela definição de interseção:\n"
                "$$\\forall x [x \\in A \\to (x \\in B \\land x \\in C)]$$\n"
                "Dado $x$, se $x \\in A \\to (x \\in B \\land x \\in C)$, então pela eliminação da conjunção temos $x \\in A \\to x \\in B$.\n"
                "Por generalização universal, $\\forall x (x \\in A \\to x \\in B)$, o que significa $A \\subseteq B$.\n"
                "Logo, por contraposição, $A \\not\\subseteq B \\implies A \\not\\subseteq B \\cap C$. $\\blacksquare$"
            ),
            "topico": "Teoria dos Conjuntos"
        },
        {
            "num": 5,
            "subtopico": "Dedução Lógica e Argumentos",
            "dificuldade": 4,
            "enunciado": (
                "Um estudante elaborou a seguinte estratégia para aplicar Métodos de Prova na demonstração da validade de argumentos simbolizados:\n\n"
                "\"Para provar que um argumento com premissas $\\phi_1, \\dots, \\phi_n$ e conclusão $\\psi$ é válido, basta fazer o seguinte:\n"
                "1. Supor $\\neg \\psi$;\n"
                "2. Demonstrar um enunciado que contradiga uma das premissas, por meio de passos lógicos.\"\n\n"
                "(a) Qual é o Método de Prova que o estudante está usando para fundamentar a sua estratégia?\n\n"
                "(b) Usando a estratégia elaborada pelo estudante, demonstre que o seguinte argumento é válido:\n"
                "Premissas:\n"
                "1. $p \\to (q \\to r)$\n"
                "2. $p \\to s$\n"
                "3. $(q \\to t) \\to (r \\to u)$\n"
                "4. $(\\neg p \\land \\neg s) \\to (r \\to t)$\n"
                "5. $\\neg s$\n"
                "6. $\\neg u \\lor \\neg t$\n"
                "Conclusão: $\\neg r \\lor \\neg q$"
            ),
            "gabarito": (
                "**Resolução Oficial:**\n\n"
                "**(a)** O método fundamentador é o **Método de Redução ao Absurdo** (ou Prova por Contradição / *reductio ad absurdum*).\n\n"
                "**(b) Demonstração por Redução ao Absurdo:**\n"
                "Suponhamos todas as premissas (1 a 6).\n"
                "Suponhamos, por hipótese de absurdo, a negação da conclusão:\n"
                "$$\\neg(\\neg r \\lor \\neg q) \\equiv r \\land q$$\n"
                "Daí temos $r$ e $q$.\n\n"
                "* De (2) $p \\to s$ e (5) $\\neg s$, por Modus Tollens: $\\neg p$.\n"
                "* Como temos $\\neg p$ e $\\neg s$, temos $\\neg p \\land \\neg s$.\n"
                "* De (4) $(\\neg p \\land \\neg s) \\to (r \\to t)$ e $\\neg p \\land \\neg s$, por Modus Ponens: $r \\to t$.\n"
                "* De $r$ e $r \\to t$, por Modus Ponens: $t$.\n"
                "* De $t$, podemos inferir a implicação $q \\to t$.\n"
                "* De (3) $(q \\to t) \\to (r \\to u)$ e $q \\to t$, por Modus Ponens: $r \\to u$.\n"
                "* De $r$ e $r \\to u$, por Modus Ponens: $u$.\n"
                "* Consequentemente, temos $u \\land t$.\n"
                "* Pela premissa (6), temos $\\neg u \\lor \\neg t$, que pelas Leis de De Morgan é equivalente a $\\neg(u \\land t)$.\n\n"
                "Chegamos à contradição explícita $(u \\land t) \\land \\neg(u \\land t)$.\n"
                "Portanto, a hipótese $\\neg(\\neg r \\lor \\neg q)$ é falsa, provando que $\\neg r \\lor \\neg q$ se deduz logicamente das premissas. $\\blacksquare$"
            ),
            "topico": "Lógica Matemática"
        }
    ]

    for item in apx2_itens:
        questoes.append({
            "banca": "CEDERJ",
            "ano": 2022,
            "materia": "Probabilidade e Combinatória",
            "topico": item["topico"],
            "subtopico": item["subtopico"],
            "dificuldade": item["dificuldade"],
            "tipo": "discursiva",
            "enunciado": item["enunciado"],
            "gabarito": item["gabarito"],
            "estrategias_esperadas": ["Métodos de Demonstração Matemática", "Redução ao Absurdo", "Passos Lógicos de Inferência"],
            "categoria_banca": "Vestibular & Superior",
            "tipo_prova": "Oficial",
            "fase_nivel": "Superior",
            "tipo_material": "prova"
        })

    # 3. AD1 2022-1 (3 questões)
    ad1_itens = [
        {
            "num": 1,
            "subtopico": "Simbolização e Conectivos Lógicos",
            "dificuldade": 2,
            "enunciado": (
                "Simbolizar os seguintes enunciados da linguagem natural:\n\n"
                "(a) Ambos os números, o de pessoas e o de cadeiras, é menor do que trinta.\n"
                "(b) Papelão é ecologicamente correto mas plástico não é caro.\n"
                "(c) Ele ou ela, mas não ambos, virá de bicicleta.\n"
                "(d) Nem ele nem ela é essencial para o plano dar certo.\n"
                "(e) Não chegando hoje, a encomenda chegará amanhã se o correio não estiver em greve."
            ),
            "gabarito": (
                "**Resolução Sugerida:**\n\n"
                "(a) $p$: O número de pessoas é menor que 30; $q$: O número de cadeiras é menor que 30. Simbolização: $p \\land q$.\n"
                "(b) $p$: Papelão é ecologicamente correto; $q$: Plástico é caro. Simbolização: $p \\land \\neg q$.\n"
                "(c) $p$: Ele virá de bicicleta; $q$: Ela virá de bicicleta. Simbolização: $(p \\lor q) \\land \\neg(p \\land q)$ (ou disjunção exclusiva $p \\veebar q$).\n"
                "(d) $p$: Ele é essencial para o plano; $q$: Ela é essencial para o plano. Simbolização: $\\neg p \\land \\neg q$ (ou $\\neg(p \\lor q)$).\n"
                "(e) $p$: A encomenda chega hoje; $q$: A encomenda chega amanhã; $r$: O correio está em greve. Simbolização: $\\neg p \\to (\\neg r \\to q)$."
            ),
            "topico": "Lógica Matemática"
        },
        {
            "num": 2,
            "subtopico": "Tabelas-Verdade e Equivalências Lógicas",
            "dificuldade": 3,
            "enunciado": (
                "1. Classifique como V ou F e justifique baseado no entendimento do contexto:\n"
                "(a) A negação de \"Aldo é mais alto do que Beto\" é \"Beto é mais baixo do que Aldo\".\n"
                "(b) A negação de \"Aldo tem ao menos a mesma idade do que Beto\" é \"Beto é mais novo do que Aldo\".\n\n"
                "2. Negar o seguinte enunciado, reescrevendo a negação de maneira informativa:\n"
                "\"O candidato tem ao menos 21 anos de idade e não tem experiência neste tipo de trabalho ou tem menos de 21 e tem experiência, se se candidata ao emprego.\""
            ),
            "gabarito": (
                "**Resolução Sugerida:**\n\n"
                "1. (a) **Falso**. A negação de $A > B$ é $A \\le B$ (Aldo tem altura menor ou igual à de Beto), e não que Beto é estritamente mais baixo.\n"
                "1. (b) **Falso**. \"Ter ao menos a mesma idade\" significa Idade(Aldo) $\\ge$ Idade(Beto). Sua negação lógica é Idade(Aldo) < Idade(Beto), o que significa que Aldo é mais novo que Beto (logo Beto é mais velho que Aldo, e não mais novo).\n\n"
                "2. Estrutura do enunciado: $C \\to [(A \\land \\neg E) \\lor (\\neg A \\land E)]$.\n"
                "A negação de $P \\to Q$ é $P \\land \\neg Q$.\n"
                "Portanto, a negação é: O candidato se candidata ao emprego, mas tem menos de 21 anos ou tem experiência, e tem ao menos 21 anos ou não tem experiência (isto é, ele ou tem ambos [$\ge 21$ anos e experiência] ou não tem nenhum dos dois)."
            ),
            "topico": "Lógica Matemática"
        },
        {
            "num": 3,
            "subtopico": "Quantificadores e Lógica de Primeira Ordem",
            "dificuldade": 3,
            "enunciado": (
                "Simbolizar as seguintes \"definições\", explicitando conectivos, quantificadores, propriedades, constantes e relações:\n\n"
                "(a) Um número natural é par se e somente se é divisível por 2.\n"
                "(b) Um número natural é par se e somente se é o produto de 2 por algum número natural.\n"
                "(c) Um número inteiro é não negativo se e somente se é diferente de zero e é positivo.\n"
                "(d) Um número real é não negativo se e somente se é o produto de um número real por si mesmo.\n"
                "(e) Um número natural é primo se e somente se é diferente de zero e de um e todos os seus fatores são iguais a um ou a ele mesmo."
            ),
            "gabarito": (
                "**Resolução Sugerida:**\n\n"
                "(a) $\\forall x \\{N(x) \\to [Par(x) \\leftrightarrow Div(2, x)]\\}$\n"
                "(b) $\\forall x \\{N(x) \\to [Par(x) \\leftrightarrow \\exists y (N(y) \\land x = 2y)]\\}$\n"
                "(c) $\\forall x \\{Z(x) \\to [NaoNeg(x) \\leftrightarrow (x = 0 \\lor Pos(x))]\\}$\n"
                "(d) $\\forall x \\{R(x) \\to [NaoNeg(x) \\leftrightarrow \\exists y (R(y) \\land x = y^2)]\\}$\n"
                "(e) $\\forall x \\{N(x) \\to [Primo(x) \\leftrightarrow (x \\neq 0 \\land x \\neq 1 \\land \\forall y (Div(y, x) \\to (y = 1 \\lor y = x)))]\\}$"
            ),
            "topico": "Lógica Matemática"
        }
    ]

    for item in ad1_itens:
        questoes.append({
            "banca": "CEDERJ",
            "ano": 2022,
            "materia": "Probabilidade e Combinatória",
            "topico": item["topico"],
            "subtopico": item["subtopico"],
            "dificuldade": item["dificuldade"],
            "tipo": "discursiva",
            "enunciado": item["enunciado"],
            "gabarito": item["gabarito"],
            "estrategias_esperadas": ["Lógica Proposicional", "Simbolização Formal de Definições"],
            "categoria_banca": "Vestibular & Superior",
            "tipo_prova": "Oficial",
            "fase_nivel": "Superior",
            "tipo_material": "prova"
        })

    # 4. AD2 2022-1 (2 questões)
    ad2_itens = [
        {
            "num": 1,
            "subtopico": "Dedução Lógica e Argumentos",
            "dificuldade": 4,
            "enunciado": (
                "Mostre que o seguinte argumento é válido, apresentando uma demonstração direta da sua validade:\n\n"
                "\"Se março for chuvoso, as flores nascerão em abril e os mosquitos em maio. A dengue vai aumentar em junho se os mosquitos nascerem em maio. Se as flores nascerem em abril, a colheita de mel vai ser farta em agosto; mas a grama vai secar completamente se março não for chuvoso. Assim, a colheita de mel vai ser farta em agosto e a dengue vai aumentar em junho, ou a grama vai secar completamente.\""
            ),
            "gabarito": (
                "**Resolução Sugerida:**\n\n"
                "**Legenda:**\n"
                "* $p$: Março é chuvoso.\n"
                "* $q$: Flores nascem em abril.\n"
                "* $r$: Mosquitos nascem em maio.\n"
                "* $s$: Dengue aumenta em junho.\n"
                "* $t$: Colheita de mel é farta em agosto.\n"
                "* $u$: Grama seca completamente.\n\n"
                "**Premissas:**\n"
                "1. $p \\to (q \\land r)$\n"
                "2. $r \\to s$\n"
                "3. $q \\to t$\n"
                "4. $\\neg p \\to u$\n"
                "Conclusão: $(t \\land s) \\lor u$\n\n"
                "**Demonstração por Análise de Casos ($p \\lor \\neg p$):**\n"
                "* Caso 1 ($p$ é verdadeiro):\n"
                "De (1), $q \\land r$. Portanto, $q$ e $r$.\n"
                "De $q$ e (3), temos $t$.\n"
                "De $r$ e (2), temos $s$.\n"
                "Logo, $t \\land s$ é verdadeiro, implicando $(t \\land s) \\lor u$.\n\n"
                "* Caso 2 ($\\neg p$ é verdadeiro):\n"
                "De (4), temos $u$.\n"
                "Logo, $(t \\land s) \\lor u$ é verdadeiro.\n\n"
                "Como a conclusão se sustenta em ambos os casos, o argumento é válido. $\\blacksquare$"
            ),
            "topico": "Lógica Matemática"
        },
        {
            "num": 2,
            "subtopico": "Métodos de Demonstração Matemática",
            "dificuldade": 4,
            "enunciado": (
                "Demonstre os seguintes enunciados conforme os conteúdos da disciplina:\n\n"
                "(a) Prove, usando o **Método da Suposição**, que: Se $x$ e $y$ são números pares, então $(x + y)^2$ é um número par.\n\n"
                "(b) Prove, usando o **Método de Redução ao Absurdo**, que: $(A \\cup B)^c \\subseteq A^c \\cap B^c$.\n\n"
                "(c) Prove que: Para todos os conjuntos $A, B, C$ e $D$, se $A \\subseteq B$ e $B \\subseteq C$, então $A \\subseteq C \\cup D$."
            ),
            "gabarito": (
                "**Resolução Sugerida:**\n\n"
                "**(a) Método da Suposição:**\n"
                "Sejam $x, y \\in \\mathbb{Z}$ pares. Por definição, existem $k, l \\in \\mathbb{Z}$ tais que $x = 2k$ e $y = 2l$.\n"
                "$$(x + y)^2 = (2k + 2l)^2 = [2(k + l)]^2 = 4(k + l)^2 = 2[2(k + l)^2]$$\n"
                "Como $2(k + l)^2 \\in \\mathbb{Z}$, segue que $(x + y)^2$ é par. $\\blacksquare$\n\n"
                "**(b) Redução ao Absurdo:**\n"
                "Suponhamos que existe $x \\in (A \\cup B)^c$ tal que $x \\notin A^c \\cap B^c$.\n"
                "Por $x \\notin A^c \\cap B^c$, temos $x \\notin A^c$ ou $x \\notin B^c$, o que equivale a $x \\in A$ ou $x \\in B$.\n"
                "Logo, $x \\in A \\cup B$.\n"
                "Por outro lado, por hipótese, $x \\in (A \\cup B)^c \\implies x \\notin A \\cup B$.\n"
                "Contradição: $x \\in A \\cup B$ e $x \\notin A \\cup B$.\n"
                "Logo, $(A \\cup B)^c \\subseteq A^c \\cap B^c$. $\\blacksquare$\n\n"
                "**(c) Inclusão:**\n"
                "Seja $x \\in A$. Como $A \\subseteq B$, $x \\in B$.\n"
                "Como $B \\subseteq C$, $x \\in C$.\n"
                "Pela definição de união, se $x \\in C$, então $x \\in C \\cup D$.\n"
                "Portanto, $A \\subseteq C \\cup D$. $\\blacksquare$"
            ),
            "topico": "Teoria dos Conjuntos"
        }
    ]

    for item in ad2_itens:
        questoes.append({
            "banca": "CEDERJ",
            "ano": 2022,
            "materia": "Probabilidade e Combinatória",
            "topico": item["topico"],
            "subtopico": item["subtopico"],
            "dificuldade": item["dificuldade"],
            "tipo": "discursiva",
            "enunciado": item["enunciado"],
            "gabarito": item["gabarito"],
            "estrategias_esperadas": ["Métodos de Demonstração Matemática", "Teoria dos Conjuntos"],
            "categoria_banca": "Vestibular & Superior",
            "tipo_prova": "Oficial",
            "fase_nivel": "Superior",
            "tipo_material": "prova"
        })

    return questoes


def extract_cg_questions() -> list[dict]:
    """Extrai todas as questões únicas das 50 avaliações com gabarito de Construções Geométricas."""
    folder = NOTION_ROOT / "Construções Geométricas 2021 2" / "Provas Anteriores"
    gabs = [f for f in os.listdir(folder) if f.endswith('.pdf') and any(k in f.lower() for k in ['gabarito', 'tutor'])]

    seen = {}
    questoes = []

    for f in sorted(gabs):
        path = folder / f
        ano_match = re.search(r'20\d\d', f)
        ano = int(ano_match.group(0)) if ano_match else 2021

        doc = fitz.open(path)
        full_text = ''
        for p in doc:
            full_text += p.get_text() + '\n'
        doc.close()

        full_text = clean_cederj_text(full_text)
        # Remove cabeçalhos
        full_text = re.sub(r'Fundação\s+Centro\s+de\s+Ciências.*?\n', '', full_text, flags=re.IGNORECASE)
        full_text = re.sub(r'Consórcio\s+CEDERJ.*?\n', '', full_text, flags=re.IGNORECASE)
        full_text = re.sub(r'Centro\s+de\s+Educação\s+Superior.*?\n', '', full_text, flags=re.IGNORECASE)
        full_text = re.sub(r'Curso\s+de\s+Licenciatura\s+em\s+Matemática.*?\n', '', full_text, flags=re.IGNORECASE)

        pattern = re.compile(r'(?:^|\n)\s*(Quest[aã]o\s+\d+|Quest[aã]o\s+0?\d+)\s*[:\-\[]', re.IGNORECASE)
        splits = list(pattern.finditer(full_text))

        for i, m in enumerate(splits):
            start = m.start()
            end = splits[i+1].start() if i+1 < len(splits) else len(full_text)
            chunk = full_text[start:end].strip()

            sol_match = re.search(r'(?:^|\n)\s*(Solu[cç][aã]o|Chave\s+de\s+corre[cç][aã]o|Gabarito)\s*[:\-\n]', chunk, re.IGNORECASE)
            if sol_match:
                enunciado = chunk[:sol_match.start()].strip()
                gabarito = chunk[sol_match.start():].strip()
            else:
                enunciado = chunk
                gabarito = "Resolução geométrica por meio de régua e compasso conforme parâmetros da avaliação."

            enunciado = re.sub(r'^Quest[aã]o\s+\d+\s*[:\-\[]?[^\]\n]*\]?\s*', '', enunciado, flags=re.IGNORECASE).strip()

            if len(enunciado) > 20:
                key = normalize_key(enunciado)
                if key not in seen:
                    seen[key] = f
                    enunciado_polido = polish_math_latex(enunciado)
                    gabarito_polido = polish_math_latex(gabarito)
                    subtopico = classify_cg_subtopic(enunciado_polido)
                    
                    # Dificuldade estimada
                    if any(w in subtopico.lower() for w in ['estrelado', 'lugares']):
                        dificuldade = 4
                    elif any(w in subtopico.lower() for w in ['retas', 'euclidiana']):
                        dificuldade = 2
                    else:
                        dificuldade = 3

                    questoes.append({
                        "banca": "CEDERJ",
                        "ano": ano,
                        "materia": "Geometria Plana",
                        "topico": "Construções Geométricas",
                        "subtopico": subtopico,
                        "dificuldade": dificuldade,
                        "tipo": "discursiva",
                        "enunciado": enunciado_polido,
                        "gabarito": gabarito_polido,
                        "estrategias_esperadas": ["Construções Geométricas com Régua e Compasso", subtopico],
                        "categoria_banca": "Vestibular & Superior",
                        "tipo_prova": "Oficial",
                        "fase_nivel": "Superior",
                        "tipo_material": "prova"
                    })

    return questoes


def main():
    print("=== INGESTÃO CEDERJ NOTION (LÓGICA + CONSTRUÇÕES GEOMÉTRICAS) ===")
    
    print("\n1. Extraindo questões de Lógica e Teoria dos Conjuntos...")
    logica_qs = extract_logica_questions()
    print(f"-> {len(logica_qs)} questões estruturadas de Lógica prontas.")

    print("\n2. Extraindo questões de Construções Geométricas das 50 avaliações com gabarito...")
    cg_qs = extract_cg_questions()
    print(f"-> {len(cg_qs)} questões únicas de Construções Geométricas prontas.")

    todas_questoes = logica_qs + cg_qs
    print(f"\nTotal geral de questões preparadas: {len(todas_questoes)}")

    # Salva backup em JSON
    with open(OUTPUT_JSON, "w", encoding="utf-8") as fp:
        json.dump(todas_questoes, fp, ensure_ascii=False, indent=2)
    print(f"Backup estruturado salvo em: {OUTPUT_JSON}")

    # Conecta ao Supabase
    supabase = get_supabase_client()
    if not supabase:
        print("Erro: não foi possível conectar ao Supabase.")
        return

    print("\n3. Inserindo no Supabase (tabela public.questoes)...")
    batch_size = 25
    total_inseridas = 0
    ids_inseridos = []

    for i in range(0, len(todas_questoes), batch_size):
        batch = todas_questoes[i:i + batch_size]
        res = supabase.table("questoes").insert(batch).execute()
        if not res.data:
            print(f"Erro ao inserir lote {i}: {res}")
            break
        batch_ids = [r["id"] for r in res.data]
        ids_inseridos.extend(batch_ids)
        total_inseridas += len(res.data)
        print(f"  Lote {i // batch_size + 1:2d} inserido: {len(res.data):2d} itens | IDs: {batch_ids[0]} a {batch_ids[-1]}")

    print(f"\n=== SUCESSO! ===")
    print(f"Total de questões inseridas no Supabase: {total_inseridas}")
    if ids_inseridos:
        print(f"Faixa de IDs gerada: #{min(ids_inseridos)} até #{max(ids_inseridos)}")


if __name__ == "__main__":
    main()
