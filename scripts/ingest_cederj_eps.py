#!/usr/bin/env python3
"""
Script de extração e ingestão no Supabase das questões dos EPs autênticos do CEDERJ.

Fontes:
- Álgebra Linear I: /mnt/dados/01_Estudos/Notion/Auxílio para estudos/Quarto Período/Álgebra linear I 2021 2/
  (Semana 1 a 16, arquivos EP*-ALI-*.pdf)
- Cálculo 3: /mnt/dados/01_Estudos/Notion/Auxílio para estudos/Quinto Período/Cálculo III 2022 1/
  (Semana 1 a 15, Materiais e Ferramentas com EP*-CIII-*-Aluno.pdf e EP*-CIII-*-Tutor.pdf)

Extrai cada questão com:
- banca: 'CEDERJ'
- ano: ano do EP (ex: 2021 ou 2022)
- materia: 'Álgebra Linear I' ou 'Cálculo 3'
- topico e subtopico adequados
- tipo: 'discursiva'
- enunciado em KaTeX/Markdown limpo
- gabarito / solucao: resolução oficial do tutor
"""

import os
import re
import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict

import pypdf
from supabase import create_client


# ============================================================================
# CONFIGURAÇÃO
# ============================================================================

ENV_PATH = Path(__file__).resolve().parent.parent / "backend" / ".env"
if ENV_PATH.exists():
    with open(ENV_PATH) as f:
        for line in f:
            if line.strip() and not line.startswith("#") and "=" in line:
                k, v = line.strip().split("=", 1)
                os.environ.setdefault(k, v.strip("\"'"))

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://gzlzwqknwfgrsnyvgpnv.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bHp3cWtud2ZncnNueXZncG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MTgzNzcsImV4cCI6MjEwNjk5NDM3N30.L2G9NrtgQM0MzvVJ50tG3S_4eso99INrsl9g2b7sVHI")

# Diretórios base
ALI_BASE = Path("/mnt/dados/01_Estudos/Notion/Auxílio para estudos/Quarto Período/Álgebra linear I 2021 2")
C3_BASE = Path("/mnt/dados/01_Estudos/Notion/Auxílio para estudos/Quinto Período/Cálculo III 2022 1")

BATCH_SIZE = 50


# ============================================================================
# ESTRUTURAS DE DADOS
# ============================================================================

@dataclass
class Questao:
    """Representa uma questão extraída."""
    materia: str
    topico: str
    subtopico: Optional[str]
    dificuldade: Optional[int]
    banca: str
    ano: int
    enunciado: str
    gabarito: str
    tipo: str = "discursiva"
    figura_path: Optional[str] = None
    estrategias_esperadas: Optional[str] = None


# ============================================================================
# MAPEAMENTO DE TÓPICOS
# ============================================================================

# Mapeamento por número do EP para tópicos conhecidos (baseado no conteúdo real)
ALI_EP_TOPICOS = {
    1: {"topico": "Matrizes e Operações", "subtopico": "Soma, multiplicação por escalar, transposta"},
    2: {"topico": "Matrizes Especiais", "subtopico": "Matrizes simétricas e anti-simétricas"},
    3: {"topico": "Matrizes Especiais", "subtopico": "Matrizes simétricas - determinação de parâmetros"},
    4: {"topico": "Matrizes Especiais", "subtopico": "Propriedades de matrizes simétricas"},
    5: {"topico": "Matrizes Especiais", "subtopico": "Matrizes diagonais e transposta"},
    6: {"topico": "Sistemas Lineares", "subtopico": "Eliminação de Gauss"},
    7: {"topico": "Sistemas Lineares", "subtopico": "Classificação e resolução"},
    8: {"topico": "Determinantes", "subtopico": "Cálculo e propriedades"},
    9: {"topico": "Determinantes", "subtopico": "Aplicações (regra de Cramer, inversa)"},
    10: {"topico": "Espaços Vetoriais", "subtopico": "Subespaços, base e dimensão"},
}

C3_EP_TOPICOS_2013 = {
    1: {"topico": "Funções Vetoriais", "subtopico": "Domínio, limites e operações vetoriais"},
    2: {"topico": "Curvas Parametrizadas", "subtopico": "Parametrização e equações cartesianas de curvas planas"},
    3: {"topico": "Curvas Parametrizadas", "subtopico": "Equação cartesiana e orientação de curvas"},
    4: {"topico": "Curvas no Espaço", "subtopico": "Interseção de superfícies e equações paramétricas"},
    5: {"topico": "Limites de Funções Vetoriais", "subtopico": "Cálculo de limites e formas indeterminadas"},
    6: {"topico": "Continuidade de Funções Vetoriais", "subtopico": "Pontos de continuidade e descontinuidade"},
    7: {"topico": "Diferenciabilidade", "subtopico": "Diferenciabilidade de funções de várias variáveis na origem"},
    8: {"topico": "Curvas Parametrizadas", "subtopico": "Interseção de superfícies (cilindro e paraboloide)"},
    9: {"topico": "Derivadas Parciais", "subtopico": "Interpretação geométrica e plano tangente"},
    10: {"topico": "Plano Tangente e Reta Normal", "subtopico": "Equação do plano tangente e reta normal a superfícies"},
    11: {"topico": "Regra da Cadeia", "subtopico": "Regra da cadeia para funções de várias variáveis"},
    12: {"topico": "Regra da Cadeia", "subtopico": "Derivadas de funções compostas e matriz Jacobiana"},
    13: {"topico": "Derivada Direcional e Gradiente", "subtopico": "Cálculo de derivada direcional e vetor gradiente"},
    14: {"topico": "Derivadas de Ordem Superior", "subtopico": "Derivadas parciais de segunda ordem e equação de Laplace"},
    15: {"topico": "Máximos e Mínimos", "subtopico": "Extremos locais e globais em regiões limitadas"},
    16: {"topico": "Multiplicadores de Lagrange", "subtopico": "Otimização com restrições de igualdade"},
    17: {"topico": "Diferenciabilidade e Aproximação", "subtopico": "Plano tangente e aproximação linear"},
    18: {"topico": "Curvas no Espaço", "subtopico": "Vetor tangente, normal, binormal e plano osculador"},
}

C3_EP_TOPICOS_2014 = {
    1: {"topico": "Funções Vetoriais", "subtopico": "Operações com funções vetoriais (produto escalar e vetorial)"},
    2: {"topico": "Limites de Funções Vetoriais", "subtopico": "Limites trigonométricos e exponenciais"},
    3: {"topico": "Curvas Parametrizadas", "subtopico": "Equação cartesiana, identificação de curvas, pontos inicial/final"},
    4: {"topico": "Limites de Funções Vetoriais", "subtopico": "Limites com formas indeterminadas (L'Hôpital)"},
    5: {"topico": "Curvas Parametrizadas", "subtopico": "Reta, segmento, hipérbole no primeiro quadrante"},
    6: {"topico": "Curvas Parametrizadas", "subtopico": "Parábola, cúbica, circunferência, elipse"},
    7: {"topico": "Curvas Parametrizadas", "subtopico": "Curvas distintas entre dois pontos"},
    8: {"topico": "Curvas Parametrizadas", "subtopico": "Mesma equação cartesiana, diferentes parametrizações"},
    9: {"topico": "Curvas no Espaço", "subtopico": "Interseção de planos, esfera-plano, paraboloides"},
    10: {"topico": "Continuidade de Funções Vetoriais", "subtopico": "Pontos de continuidade (componentes racionais/trigonométricas)"},
    11: {"topico": "Continuidade de Funções Vetoriais", "subtopico": "Continuidade em ponto (limite bilateral)"},
    12: {"topico": "Derivadas de Funções Vetoriais", "subtopico": "Regra da cadeia, velocidade, aceleração"},
    13: {"topico": "Integrais de Funções Vetoriais", "subtopico": "Integração componente a componente"},
    14: {"topico": "Curvatura e Comprimento de Arco", "subtopico": "Fórmulas de curvatura"},
    15: {"topico": "Coordenadas Polares e Cônicas", "subtopico": "Equações polares de cônicas"},
    16: {"topico": "Superfícies Quádricas", "subtopico": "Classificação e esboço"},
    17: {"topico": "Funções de Várias Variáveis", "subtopico": "Limites e continuidade em R^n"},
    18: {"topico": "Derivadas Parciais", "subtopico": "Cálculo e interpretação geométrica"},
}


# ============================================================================
# FUNÇÕES AUXILIARES DE EXTRAÇÃO DE TEXTO
# ============================================================================

def extrair_texto_pdf(caminho: Path) -> str:
    """Extrai todo o texto de um PDF."""
    try:
        with open(caminho, "rb") as f:
            reader = pypdf.PdfReader(f)
            textos = []
            for page in reader.pages:
                texto = page.extract_text()
                if texto:
                    textos.append(texto)
            return "\n".join(textos)
    except Exception as e:
        print(f"  [ERRO] Falha ao extrair {caminho}: {e}")
        return ""


def limpar_texto_bruto(texto: str) -> str:
    """Limpa artefatos de extração de PDF (ligaduras, espaços extras, etc.)."""
    # Normalização de diacríticos e acentuação TeX/CEDERJ
    texto = re.sub(r"Exerc\s*[´`^~]?\s*[iíı]\s*cio", "Exercício", texto, flags=re.IGNORECASE)
    texto = re.sub(r"Solu\s*¸\s*c\s*˜\s*ao", "Solução", texto, flags=re.IGNORECASE)
    texto = re.sub(r"¸\s*c", "ç", texto)
    texto = re.sub(r"¸\s*C", "Ç", texto)
    texto = re.sub(r"˜\s*a", "ã", texto)
    texto = re.sub(r"˜\s*o", "õ", texto)
    texto = re.sub(r"ˆ\s*e", "ê", texto)
    texto = re.sub(r"ˆ\s*a", "â", texto)
    texto = re.sub(r"´\s*[ıi]", "í", texto)
    texto = re.sub(r"´\s*a", "á", texto)
    texto = re.sub(r"´\s*e", "é", texto)
    texto = re.sub(r"´\s*o", "ó", texto)
    texto = re.sub(r"´\s*u", "ú", texto)

    # Substituições comuns de ligaduras/encoding quebrado
    substituicoes = {
        "": "",  # delimitadores de matriz quebrados
        "": "-",
        "": "+",
        "": "",
        "": "",
        "": "",
        "": "",
        "": "",
        "": "",
        "": "=",
        "": "",
        "": "",
        "": "",
        "": "",
        "": "",
        "": "",
        "": "",
        "": "",
        "−": "-",  # minus sign unicode
        "→": "->",
        "∈": " in ",
        "∪": " U ",
        "∩": " ∩ ",
        "⊂": " sub ",
        "⊆": " sub= ",
        "∑": " soma ",
        "∏": " prod ",
        "√": "sqrt",
        "∞": "oo",
        "π": "pi",
        "α": "alpha",
        "β": "beta",
        "γ": "gamma",
        "δ": "delta",
        "ε": "epsilon",
        "θ": "theta",
        "λ": "lambda",
        "μ": "mu",
        "σ": "sigma",
        "φ": "phi",
        "ω": "omega",
        "∂": "d",
        "∫": "int",
        "∮": "oint",
        "∇": "nabla",
        "·": "*",
        "×": "x",
        "÷": "/",
        "±": "+-",
        "∓": "-+",
        "≤": "<=",
        "≥": ">=",
        "≠": "!=",
        "≈": "~=",
        "≡": "==",
        "∝": "prop",
        "∴": ":.",
        "∵": ".:",
        "∀": "para todo",
        "∃": "existe",
        "∄": "nao existe",
        "∅": "vazio",
        "ℝ": "R",
        "ℂ": "C",
        "ℤ": "Z",
        "ℕ": "N",
        "ℚ": "Q",
        "𝑖": "i",
        "𝑗": "j",
        "𝑘": "k",
        "𝑥": "x",
        "𝑦": "y",
        "𝑧": "z",
        "𝑡": "t",
        "𝐴": "A",
        "𝐵": "B",
        "𝐶": "C",
        "𝑇": "T",
        "𝑎": "a",
        "𝑏": "b",
        "𝑐": "c",
        "𝑑": "d",
        "𝑒": "e",
        "𝑓": "f",
        "𝑔": "g",
        "ℎ": "h",
        "𝑙": "l",
        "𝑚": "m",
        "𝑛": "n",
        "𝑜": "o",
        "𝑝": "p",
        "𝑞": "q",
        "𝑟": "r",
        "𝑠": "s",
        "𝑢": "u",
        "𝑣": "v",
        "𝑤": "w",
        "𝐹": "F",
        "𝐺": "G",
        "𝐻": "H",
        "𝐼": "I",
        "𝐽": "J",
        "𝐾": "K",
        "𝐿": "L",
        "𝑀": "M",
        "𝑁": "N",
        "𝑂": "O",
        "𝑃": "P",
        "𝑄": "Q",
        "𝑅": "R",
        "𝑆": "S",
        "𝑈": "U",
        "𝑉": "V",
        "𝑊": "W",
        "𝑋": "X",
        "𝑌": "Y",
        "𝑍": "Z",
    }
    
    for k, v in substituicoes.items():
        texto = texto.replace(k, v)
    
    # Normaliza espaços
    texto = re.sub(r"[ \t]+", " ", texto)
    texto = re.sub(r"\n{3,}", "\n\n", texto)
    texto = texto.strip()
    
    return texto


def converter_para_katex(texto: str) -> str:
    """Converte notação matemática bruta para KaTeX/LaTeX limpo."""
    # Frações simples: a/b -> \frac{a}{b} (cuidadoso)
    # Matrizes: [a b; c d] -> \begin{pmatrix} a & b \\ c & d \end{pmatrix}
    # Potencias: x^2 -> x^2 (já OK), x2 -> x^2 (se contexto)
    # Subscritos: x_1 -> x_1
    
    # Por enquanto, retorna o texto limpo; conversão completa seria complexa
    # e requereria parsing mais sofisticado. O texto limpo já é utilizável.
    return texto


# ============================================================================
# PARSING DE QUESTÕES
# ============================================================================

def parsear_questoes_ali(texto_enunciado: str, texto_gabarito: str, ep_num: int) -> List[Questao]:
    """Parseia questões de Álgebra Linear I a partir dos textos brutos."""
    questoes = []
    
    # Divide o enunciado por questões numeradas (1., 2., 3., etc.)
    # Padrão: número seguido de ponto e espaço, no início de linha ou após \n
    padrao_questao = re.compile(r"(?:^|\n)\s*(\d+)\.\s+")
    
    # Encontra posições de início de cada questão
    matches = list(padrao_questao.finditer(texto_enunciado))
    if not matches:
        return questoes
    
    # Extrai cada questão
    for i, match in enumerate(matches):
        inicio = match.end()
        fim = matches[i + 1].start() if i + 1 < len(matches) else len(texto_enunciado)
        q_texto = texto_enunciado[inicio:fim].strip()
        
        # Extrai número da questão
        q_num = int(match.group(1))
        
        # Busca gabarito correspondente
        gabarito = extrair_gabarito_ali(texto_gabarito, q_num)
        
        if q_texto and gabarito:
            topico_info = ALI_EP_TOPICOS.get(ep_num, {"topico": "Geral", "subtopico": None})
            questoes.append(Questao(
                materia="Álgebra Linear I",
                topico=topico_info["topico"],
                subtopico=topico_info["subtopico"],
                dificuldade=3,  # padrão médio
                banca="CEDERJ",
                ano=2021,
                enunciado=converter_para_katex(q_texto),
                gabarito=converter_para_katex(gabarito),
                tipo="discursiva",
            ))
    
    return questoes


def extrair_gabarito_ali(texto_gabarito: str, q_num: int) -> str:
    """Extrai a resolução de uma questão específica do gabarito de ALI."""
    # Procura por "N. " ou "N. Considere" ou "N. Solução"
    padrao = re.compile(rf"(?:^|\n)\s*{q_num}\.\s*(?:Solu[cç][aã]o\.?\s*)?(.+?)(?=\n\s*\d+\.\s|$)", re.DOTALL | re.IGNORECASE)
    match = padrao.search(texto_gabarito)
    if match:
        return match.group(1).strip()
    
    # Fallback: procura só pelo número
    padrao2 = re.compile(rf"(?:^|\n)\s*{q_num}\.\s+(.+?)(?=\n\s*\d+\.\s|$)", re.DOTALL)
    match = padrao2.search(texto_gabarito)
    if match:
        return match.group(1).strip()
    
    return ""


def parsear_questoes_c3(texto_enunciado: str, texto_gabarito: str, ep_num: int, ano: int) -> List[Questao]:
    """Parseia questões de Cálculo 3 a partir dos textos brutos."""
    questoes = []
    
    # Padrão: "Exercício N" ou "Exercício N(AD...)" 
    padrao_questao = re.compile(r"(?:^|\n)\s*Exerc[ií]cio\s+(\d+)\s*(?:\([^)]+\))?\s*", re.IGNORECASE)
    
    matches = list(padrao_questao.finditer(texto_enunciado))
    if not matches:
        # Tenta padrão alternativo: "N." no início de linha
        padrao_alt = re.compile(r"(?:^|\n)\s*(\d+)\.\s+")
        matches = list(padrao_alt.finditer(texto_enunciado))
    
    if not matches:
        return questoes
    
    for i, match in enumerate(matches):
        inicio = match.end()
        fim = matches[i + 1].start() if i + 1 < len(matches) else len(texto_enunciado)
        q_texto = texto_enunciado[inicio:fim].strip()
        
        q_num = int(match.group(1))
        gabarito = extrair_gabarito_c3(texto_gabarito, q_num)
        
        if q_texto and gabarito:
            # Determina tópicos baseado no ano
            if ano == 2013:
                topico_info = C3_EP_TOPICOS_2013.get(ep_num, {"topico": "Geral", "subtopico": None})
            else:
                topico_info = C3_EP_TOPICOS_2014.get(ep_num, {"topico": "Geral", "subtopico": None})
            
            questoes.append(Questao(
                materia="Cálculo 3",
                topico=topico_info["topico"],
                subtopico=topico_info["subtopico"],
                dificuldade=3,
                banca="CEDERJ",
                ano=ano,
                enunciado=converter_para_katex(q_texto),
                gabarito=converter_para_katex(gabarito),
                tipo="discursiva",
            ))
    
    return questoes


def extrair_gabarito_c3(texto_gabarito: str, q_num: int) -> str:
    """Extrai a resolução de uma questão específica do gabarito de Cálculo 3."""
    padrao_bloco = re.compile(
        rf"(?:^|\n)\s*Exercício\s+{q_num}(?!\d)(?:[^\n]*\n)(.+?)(?=\n\s*Exercício\s+\d+|$)",
        re.DOTALL | re.IGNORECASE
    )
    match_bloco = padrao_bloco.search(texto_gabarito)
    if not match_bloco:
        padrao_bloco2 = re.compile(
            rf"Exercício\s+{q_num}(?!\d)(.+?)(?=Exercício\s+\d+|$)",
            re.DOTALL | re.IGNORECASE
        )
        match_bloco = padrao_bloco2.search(texto_gabarito)
    
    if not match_bloco:
        return ""
    
    bloco = match_bloco.group(1).strip()
    m_sol = re.search(r"Solu[cç][aã]o:?\s*(.+)$", bloco, re.DOTALL | re.IGNORECASE)
    if m_sol:
        return m_sol.group(1).strip()
    return bloco


# ============================================================================
# DESCOBERTA DE ARQUIVOS
# ============================================================================

def descobrir_arquivos_ali() -> List[Tuple[int, Path, Path]]:
    """Descobre pares (enunciado, gabarito) para Álgebra Linear I.
    Retorna lista de (ep_num, path_enunciado, path_gabarito)."""
    pares = []
    
    # Verifica Semana 1 a 16
    for semana in range(1, 17):
        pasta = ALI_BASE / f"Semana {semana}"
        if not pasta.exists():
            continue
        
        # Procura EP{N}-ALI-2021-2.pdf e EP{N}-ALI-2021-2-gabarito.pdf
        for ep_num in range(1, 20):  # até EP19 por segurança
            enunciado = pasta / f"EP{ep_num}-ALI-2021-2.pdf"
            gabarito = pasta / f"EP{ep_num}-ALI-2021-2-gabarito.pdf"
            
            if enunciado.exists() and gabarito.exists():
                pares.append((ep_num, enunciado, gabarito))
    
    # Remove duplicatas (Semana 6 tem duplicatas de EP1-EP5)
    vistos = set()
    unicos = []
    for ep_num, enun, gab in pares:
        if ep_num not in vistos:
            vistos.add(ep_num)
            unicos.append((ep_num, enun, gab))
    
    return sorted(unicos, key=lambda x: x[0])


def descobrir_arquivos_c3_semanas() -> List[Tuple[int, int, Path, Path]]:
    """Descobre pares (enunciado, gabarito) para Cálculo 3 nas pastas Semana.
    Retorna lista de (ep_num, ano, path_enunciado, path_gabarito)."""
    pares = []
    
    # Mapeamento de pasta -> (EP inicial, ano)
    # As pastas Semana têm nomenclatura variada
    semanas_info = [
        ("Semana 1", 1, 2014),  # EP1questoes.pdf, EP1gabarito.pdf
        ("Semana 2 - Parte I", 2, 2014),
        ("Semana 2 - Parte II", None, None),  # sem EP
        ("Semana 3", 3, 2014),
        ("Semana 4", 4, 2014),
        ("Semana 5", 5, 2014),
        ("Semanas 6 e 7", 6, 2014),  # EP6 + EP7-CIII-2014-2
        ("Semana 8", 8, 2014),
        ("Semana 9", 9, 2014),
        ("Semana 10", 10, 2014),
        ("Semana 11", 11, 2014),
        ("Semana 12", 12, 2014),
        ("Semana 13", 13, 2014),
        ("Semana 14", 14, 2014),
        ("Semana 15", 15, 2014),  # EP15, EP16, EP17
    ]
    
    for pasta_nome, ep_base, ano in semanas_info:
        if ep_base is None:
            continue
        pasta = C3_BASE / pasta_nome
        if not pasta.exists():
            continue
        
        # Lista arquivos na pasta
        arquivos = list(pasta.glob("*.pdf"))
        
        # Agrupa por número do EP
        eps_encontrados = {}
        for arq in arquivos:
            # Padrões: EP{N}questoes.pdf, EP{N}gab.pdf, EP{N}gabarito.pdf, 
            # EP{N}-CIII-2014-2-questoes.pdf, EP{N}-CIII-2014-2-Tutor.pdf
            m = re.search(r"EP(\d+)", arq.name, re.IGNORECASE)
            if m:
                ep_num = int(m.group(1))
                if "gabarito" in arq.name.lower() or "gab" in arq.name.lower():
                    eps_encontrados.setdefault(ep_num, {})["gabarito"] = arq
                elif "questao" in arq.name.lower() or "aluno" in arq.name.lower() or "quest" in arq.name.lower():
                    eps_encontrados.setdefault(ep_num, {})["enunciado"] = arq
        
        for ep_num, arquivos_ep in eps_encontrados.items():
            if "enunciado" in arquivos_ep and "gabarito" in arquivos_ep:
                pares.append((ep_num, ano, arquivos_ep["enunciado"], arquivos_ep["gabarito"]))
    
    return sorted(pares, key=lambda x: (x[1], x[0]))


def descobrir_arquivos_c3_materiais() -> List[Tuple[int, int, Path, Path]]:
    """Descobre pares do diretório Materiais e Ferramentas (EP1-EP18 de 2013/2)."""
    pares = []
    pasta = C3_BASE / "Materiais e Ferramentas"
    if not pasta.exists():
        return pares
    
    arquivos = list(pasta.glob("*.pdf"))
    eps_encontrados = {}
    
    for arq in arquivos:
        # Padrão: EP{N}-CIII-2013-2-Aluno.pdf / EP{N}-CIII-2013-2-Tutor.pdf
        m = re.search(r"EP(\d+)-CIII-(\d{4})-(\d)-", arq.name, re.IGNORECASE)
        if m:
            ep_num = int(m.group(1))
            ano = int(m.group(2))
            semestre = m.group(3)
            if "aluno" in arq.name.lower():
                eps_encontrados.setdefault((ep_num, ano), {})["enunciado"] = arq
            elif "tutor" in arq.name.lower():
                eps_encontrados.setdefault((ep_num, ano), {})["gabarito"] = arq
    
    for (ep_num, ano), arquivos_ep in eps_encontrados.items():
        if "enunciado" in arquivos_ep and "gabarito" in arquivos_ep:
            pares.append((ep_num, ano, arquivos_ep["enunciado"], arquivos_ep["gabarito"]))
    
    return sorted(pares, key=lambda x: (x[1], x[0]))


# ============================================================================
# INGESTÃO NO SUPABASE
# ============================================================================

def inserir_lote_supabase(client, questoes: List[Questao]) -> Tuple[int, int]:
    """Insere um lote de questões no Supabase. Retorna (sucessos, falhas)."""
    if not questoes:
        return 0, 0
    
    payload = []
    for q in questoes:
        payload.append({
            "materia": q.materia,
            "topico": q.topico,
            "subtopico": q.subtopico,
            "dificuldade": q.dificuldade,
            "banca": q.banca,
            "ano": q.ano,
            "enunciado": q.enunciado,
            "figura_path": q.figura_path,
            "gabarito": q.gabarito,
            "estrategias_esperadas": q.estrategias_esperadas,
            "tipo": q.tipo,
        })
    
    try:
        result = client.table("questoes").upsert(payload).execute()
        return len(payload), 0
    except Exception as e:
        print(f"  [ERRO] Falha ao inserir lote: {e}")
        # Tenta inserir um a um para identificar qual falhou
        sucessos = 0
        falhas = 0
        for item in payload:
            try:
                client.table("questoes").upsert([item]).execute()
                sucessos += 1
            except Exception as e2:
                falhas += 1
                print(f"    [FALHA] {item['materia']} EP{item.get('ano')} - {e2}")
        return sucessos, falhas


def carregar_assinaturas_existentes(client, materia: str) -> set:
    """Carrega assinaturas normalizadas de enunciados já no banco para evitar duplicatas."""
    try:
        res = client.table("questoes").select("enunciado").eq("materia", materia).execute()
        return set(re.sub(r"\s+", "", q["enunciado"][:80]) for q in res.data if q.get("enunciado"))
    except Exception as e:
        print(f"  [AVISO] Erro ao carregar questões existentes de {materia}: {e}")
        return set()


# ============================================================================
# PIPELINE PRINCIPAL
# ============================================================================

def processar_ali(client) -> int:
    """Processa todos os EPs de Álgebra Linear I."""
    print("\n" + "="*60)
    print("PROCESSANDO ÁLGEBRA LINEAR I (2021/2)")
    print("="*60)
    
    existentes = carregar_assinaturas_existentes(client, "Álgebra Linear I")
    print(f"Questões já existentes no banco para Álgebra Linear I: {len(existentes)}")

    pares = descobrir_arquivos_ali()
    print(f"Encontrados {len(pares)} EPs únicos")
    
    total_inseridas = 0
    todas_questoes = []
    vistos_locais = set(existentes)
    
    for ep_num, path_enun, path_gab in pares:
        print(f"\n  EP{ep_num}: {path_enun.name}")
        
        texto_enun = limpar_texto_bruto(extrair_texto_pdf(path_enun))
        texto_gab = limpar_texto_bruto(extrair_texto_pdf(path_gab))
        
        if not texto_enun or not texto_gab:
            print(f"    [AVISO] Texto vazio, pulando")
            continue
        
        questoes = parsear_questoes_ali(texto_enun, texto_gab, ep_num)
        novas = []
        for q in questoes:
            sig = re.sub(r"\s+", "", q.enunciado[:80])
            if sig not in vistos_locais:
                vistos_locais.add(sig)
                novas.append(q)

        print(f"    Extraídas {len(questoes)} questões ({len(novas)} novas)")
        
        for idx, q in enumerate(novas, 1):
            print(f"      Q{idx}: {q.enunciado[:80]}..." if len(q.enunciado) > 80 else f"      Q: {q.enunciado}")
        
        todas_questoes.extend(novas)
    
    # Insere em lotes
    for i in range(0, len(todas_questoes), BATCH_SIZE):
        lote = todas_questoes[i:i+BATCH_SIZE]
        sucessos, falhas = inserir_lote_supabase(client, lote)
        total_inseridas += sucessos
        print(f"  Lote {i//BATCH_SIZE + 1}: {sucessos} inseridas, {falhas} falhas")
    
    return total_inseridas


def processar_c3(client) -> int:
    """Processa todos os EPs de Cálculo 3 (Semanas + Materiais)."""
    print("\n" + "="*60)
    print("PROCESSANDO CÁLCULO 3")
    print("="*60)
    
    existentes = carregar_assinaturas_existentes(client, "Cálculo 3")
    print(f"Questões já existentes no banco para Cálculo 3: {len(existentes)}")

    # Processa pastas Semana (2014/2)
    pares_semanas = descobrir_arquivos_c3_semanas()
    print(f"Encontrados {len(pares_semanas)} EPs nas pastas Semana (2014/2)")
    
    # Processa Materiais e Ferramentas (2013/2)
    pares_materiais = descobrir_arquivos_c3_materiais()
    print(f"Encontrados {len(pares_materiais)} EPs em Materiais e Ferramentas (2013/2)")
    
    todos_pares = pares_semanas + pares_materiais
    # Remove duplicatas por (ep_num, ano)
    vistos = set()
    pares_unicos = []
    for ep_num, ano, enun, gab in todos_pares:
        chave = (ep_num, ano)
        if chave not in vistos:
            vistos.add(chave)
            pares_unicos.append((ep_num, ano, enun, gab))
    
    print(f"Total de EPs únicos: {len(pares_unicos)}")
    
    total_inseridas = 0
    todas_questoes = []
    vistos_locais = set(existentes)
    
    for ep_num, ano, path_enun, path_gab in pares_unicos:
        print(f"\n  EP{ep_num} ({ano}): {path_enun.name}")
        
        texto_enun = limpar_texto_bruto(extrair_texto_pdf(path_enun))
        texto_gab = limpar_texto_bruto(extrair_texto_pdf(path_gab))
        
        if not texto_enun or not texto_gab:
            print(f"    [AVISO] Texto vazio, pulando")
            continue
        
        questoes = parsear_questoes_c3(texto_enun, texto_gab, ep_num, ano)
        novas = []
        for q in questoes:
            sig = re.sub(r"\s+", "", q.enunciado[:80])
            if sig not in vistos_locais:
                vistos_locais.add(sig)
                novas.append(q)

        print(f"    Extraídas {len(questoes)} questões ({len(novas)} novas)")
        
        todas_questoes.extend(novas)
    
    print(f"\nTotal de questões inéditas de Cálculo 3 a inserir: {len(todas_questoes)}")

    # Insere em lotes
    for i in range(0, len(todas_questoes), BATCH_SIZE):
        lote = todas_questoes[i:i+BATCH_SIZE]
        sucessos, falhas = inserir_lote_supabase(client, lote)
        total_inseridas += sucessos
        print(f"  Lote {i//BATCH_SIZE + 1}: {sucessos} inseridas, {falhas} falhas")
    
    return total_inseridas


def main():
    print("🚀 Iniciando ingestão de EPs CEDERJ no Supabase")
    print(f"Supabase URL: {SUPABASE_URL}")
    
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Testa conexão
    try:
        result = client.table("questoes").select("id", count="exact").limit(1).execute()
        print(f"✅ Conexão OK. Questões atuais no banco: {result.count}")
    except Exception as e:
        print(f"❌ Falha na conexão: {e}")
        return
    
    # Processa Álgebra Linear I
    total_ali = processar_ali(client)
    
    # Processa Cálculo 3
    total_c3 = processar_c3(client)
    
    # Relatório final
    print("\n" + "="*60)
    print("RELATÓRIO FINAL")
    print("="*60)
    print(f"Álgebra Linear I: {total_ali} questões inseridas")
    print(f"Cálculo 3:        {total_c3} questões inseridas")
    print(f"TOTAL:            {total_ali + total_c3} questões inseridas")
    
    # Verifica contagem final
    try:
        result = client.table("questoes").select("id", count="exact").execute()
        print(f"Questões no banco após ingestão: {result.count}")
    except Exception as e:
        print(f"Erro ao verificar contagem final: {e}")


if __name__ == "__main__":
    main()