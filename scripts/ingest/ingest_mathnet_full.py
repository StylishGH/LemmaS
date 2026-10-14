"""
Script canônico de ingestão do acervo MathNet (Olimpíadas Internacionais)
no Supabase PostgreSQL do LEMMAS.

Aplica:
1. Tradução e normalização exaustiva da taxonomia (materia, topico, subtopico) para PT-BR.
2. Metadados olímpicos: edicao, etapa, tipo_material, pais, solucao.
3. Upsert idempotente usando a constraint 'uq_questoes_mathnet_id' (on_conflict='mathnet_id').
4. Processamento em lotes com tratamento de exceções e retry.
"""

import sys
import os
import re
import argparse
from pathlib import Path
from typing import Dict, Any, List
import pandas as pd
import numpy as np
from tqdm import tqdm

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.database.db import get_supabase, inserir_questoes_lote
from scripts.ingest.mathnet_taxonomy import traduzir_taxonomia_mathnet

ROMANO_PARA_ANO_OBM = {
    'I': 1979, 'II': 1980, 'III': 1981, 'IV': 1982, 'V': 1983,
    'VI': 1984, 'VII': 1985, 'VIII': 1986, 'IX': 1987, 'X': 1988,
    'XI': 1989, 'XII': 1990, 'XIII': 1991, 'XIV': 1992, 'XV': 1993,
    'XVI': 1994, 'XVII': 1995, 'XVIII': 1996, 'XIX': 1997, 'XX': 1998,
    'XXI': 1999, 'XXII': 2000, 'XXIII': 2001, 'XXIV': 2002, 'XXV': 2003,
    'XXVI': 2004, 'XXVII': 2005, 'XXVIII': 2006, 'XXIX': 2007, 'XXX': 2008,
    'XXXI': 2009, 'XXXII': 2010, 'XXXIII': 2011, 'XXXIV': 2012, 'XXXV': 2013,
    'XXXVI': 2014, 'XXXVII': 2015, 'XXXVIII': 2016, 'XXXIX': 2017, 'XL': 2018,
    'XLI': 2019, 'XLII': 2020, 'XLIII': 2021, 'XLIV': 2022, 'XLV': 2023,
    'XLVI': 2024, 'XLVII': 2025, 'XLVIII': 2026
}

REGRAS_COMPETICAO = [
    ('HMMT', r'\b(?:Harvard[- ]MIT|HMMT)\b'),
    ('OBM', r'\b(?:OBM|Brazilian\s+(?:Math|Mathematical)\s+Olympiad)\b'),
    ('Baltic Way', r'\bBaltic\s+Way\b'),
    ('Canadian Mathematical Olympiad', r'\bCanadian\s+Mathematical\s+Olympiad\b|\bCMO\b'),
    ('Iranian Mathematical Olympiad', r'\bIranian\s+Mathematical\s+Olympiad\b|\bIran(?:ian)?\s+MO\b'),
    ('Mongolian Mathematical Olympiad', r'\bMongolian\s+(?:National\s+)?Mathematical\s+Olympiad\b'),
    ('Estonian Mathematical Olympiad', r'\bEstonian\s+Mathematical\s+Olympiad\b'),
    ('Estonian Math Competitions', r'\bEstonian\s+Math\s+Competitions\b'),
    ('IMO', r'\bIMO\b|\bInternational\s+Mathematical\s+Olympiad\b|\bInternational(?:e|en)\s+Mathematik[- ]Olympiade\b'),
    ('Romanian Mathematical Olympiad', r'\bRomanian\s+(?:National\s+)?Mathematical\s+Olympiad\b|\bRomanian\s+NMO\b'),
    ('Balkan Mathematical Olympiad', r'\bBalkan\s+Mathematical\s+Olympiad\b'),
    ('Ukrainian Mathematical Olympiad', r'\bUkrainian\s+(?:National\s+)?Mathematical\s+Olympiad\b|\bMathematical\s+Olympiad\s+in\s+Ukraine\b|\bUkraineMO\b'),
    ('Croatian Competitions', r'\bMathemat(?:ica|ical)\s+competitions?\s+in\s+Croatia\b|\bCroatia\s+Mathematical\s+Competitions\b|\bCroatian\s+Mathematical\s+Society\s+Competitions\b|\bCroatianCompetitions(?:\d{4})?\b'),
    ('Préparation Olympique Française de Mathématiques', r'Pr[eé]paration\s+Olympique\s+Fran[cç]aise\s+de\s+Math[eé]matiques'),
    ('Olympiades Françaises de Mathématiques', r'Olympiades\s+Fran[cç]aises\s+de\s+Math[eé]matiques'),
    ('Saudi Arabian Mathematical Competitions', r'\bSaudi\s+Arab(?:ia|ian)\s+Mathematical\s+Competitions?\b|\bSAMC\b'),
    ('Singapore Mathematical Olympiad', r'\bSingapore\s+Mathematical\s+Olympiad\b|\bSMO\s+Finalrunde\b'),
    ('South African Mathematics Olympiad', r'\bSouth\s+African\s+Mathematics\s+Olympiad\b'),
    ('China Mathematical Competition', r'\bChina\s+Mathematical\s+Competition\b'),
    ('China Mathematical Olympiad', r'\b(?:China|Chinese)\s+Mathematical\s+Olympiad\b'),
    ('Philippine Mathematical Olympiad', r'\bPhilippines?\s+Mathematical\s+Olympiad\b'),
    ('Bulgarian Mathematical Competitions', r'\bBulgarian\s+Mathematical\s+Competitions?\b'),
    ('Ibero-American Mathematical Olympiad', r'\bIbero[ -]?American\s+Mathematical\s+Olympiad\b|\bIberoamerican\s+Mathematical\s+Olympiad\b'),
    ('Middle European Mathematical Olympiad', r'\bMiddle\s+European\s+Mathematical\s+Olympiad\b|\bMEMO\b'),
    ('Russian Mathematical Olympiad', r'\bRussian\s+Mathematical\s+Olympiad\b|\bRussian\s+mathematical\s+olympiad\b'),
    ('Belarusian Mathematical Olympiad', r'\bBelarusian\s+Mathematical\s+Olympiad\b'),
    ('Indian National Mathematical Olympiad', r'\bINMO\b|\bIndian\s+National\s+Mathematical\s+Olympiad\b'),
    ('Macedonian Mathematical Competitions', r'\bMacedonian\s+Mathematical\s+Competitions\b'),
    ('Macedonian Mathematical Olympiad', r'\bMacedonian\s+Mathematical\s+Olympiad\b'),
    ('Irish Mathematical Olympiad', r'\bIrish\s+Mathematical\s+Olympiad\b'),
    ('Italian Mathematical Olympiad', r'\bItalian\s+Mathematical\s+Olympiad\b|Olimpiade\s+Italiana\s+di\s+Matematica'),
    ('China Girls\' Mathematical Olympiad', r'\bChina\s+Girls[\'’]?\s+Mathematical\s+Olympiad\b|\bCGMO\b'),
    ('China Western Mathematical Olympiad', r'\bChina\s+Western\s+Mathematical\s+Olympiad\b'),
    ('China Southeastern Mathematical Olympiad', r'\bChina\s+Southeastern\s+Mathematical\s+Olympiad\b'),
    ('Hellenic Mathematical Olympiad', r'\bHellenic\s+Mathematical\s+Olympiad\b'),
    ('Argentine Mathematical Olympiad', r'\bArgentine\s+National\s+Olympiad\b|Olimpiada\s+Matem[aá]tica\s+Argentina'),
    ('New Zealand Mathematical Olympiad', r'\bNew\s+Zealand\s+Mathematical\s+Olympiad\b|\bNZMO\b'),
    ('Macedonian Junior Mathematical Olympiad', r'\bJunior\s+Macedonian\s+Mathematical\s+Olympiad\b|\bMacedonian\s+Junior\s+Mathematical\s+Olympiad\b'),
    ('Austrian Mathematical Olympiad', r'\bAustrian\s+Mathematical\s+Olympiad\b|\bAustriaMO(?:\d{4})?\b'),
    ('Spanish Mathematical Olympiad', r'\bSpanish\s+Mathematical\s+Olympiad\b|Olimpiada\s+Matem[aá]tica\s+Espa[nñ]ola'),
    ('Slovenian National Mathematical Olympiad', r'\bNational\s+Math(?:ematical)?\s+Olympiad\s+in\s+Slovenia\b'),
    ('Japanese Mathematical Olympiad', r'\bJapan(?:ese)?\s+Mathematical\s+Olympiad\b'),
    ('Junior Balkan Mathematical Olympiad', r'\bJunior\s+Balkan\s+Mathematical\s+Olympiad\b|\bJBMO\b'),
]

def extrair_str_segura(v):
    if v is None:
        return None
    if isinstance(v, (list, np.ndarray)):
        return ', '.join(str(x) for x in v) if len(v) > 0 else None
    if pd.isna(v):
        return None
    s = str(v).strip()
    return None if s.lower() in ('<na>', 'nan', 'none', '') else s

def carregar_e_processar_mathnet(min_count: int = 50, banca_filter: str = None) -> List[Dict[str, Any]]:
    caminho_orig = PROJECT_ROOT / "data" / "backups" / "mathnet_original.parquet"
    caminho_trad = PROJECT_ROOT / "data" / "backups" / "questoes_traduzidas_ptbr.parquet"

    print(f"[*] Carregando parquets de {caminho_orig} e {caminho_trad}...")
    df_orig = pd.read_parquet(caminho_orig)
    df_trad = pd.read_parquet(caminho_trad)

    df = df_orig.copy()
    df = df.rename(columns={
        'problem_markdown': 'enunciado',
        'solutions_markdown': 'solucao_markdown',
        'images': 'imagens',
        'country': 'pais',
        'competition': 'banca',
        'topics_flat': 'topico',
        'language': 'idioma'
    })

    mapa_texto = df_trad.set_index('id')['enunciado_ptbr_reconstruido']
    mapa_status = df_trad.set_index('id')['status_reconstrucao']

    df['enunciado_ptbr_reconstruido'] = df['id'].map(mapa_texto).fillna(df['enunciado'])
    df['status_reconstrucao'] = df['id'].map(mapa_status).fillna('original_pt')

    # Metadados de banca e ano
    banca_raw = df['banca'].astype('string')
    df['ano_extraido'] = banca_raw.str.extract(r'(?<!\d)((?:19|20)\d{2})(?!\d)')[0]
    df['ano'] = pd.to_numeric(df['ano_extraido'], errors='coerce')

    banca_limpa = banca_raw.str.replace(r'(?<!\d)(?:19|20)\d{2}(?!\d)', '', regex=True).str.strip(' -_,')

    df['competicao_base'] = banca_limpa.copy()
    for nome_canonico, padrao in REGRAS_COMPETICAO:
        corresponde = banca_raw.str.contains(padrao, case=False, na=False, regex=True)
        df.loc[corresponde, 'competicao_base'] = nome_canonico

    df['banca'] = df['competicao_base']

    # OBM anos romanos
    edicao_romana_obm = banca_raw.str.extract(
        r'\b([IVXLCDM]+)\s+(?:OBM|Brazilian\s+(?:Math|Mathematical)\s+Olympiad)\b',
        flags=re.IGNORECASE, expand=False
    ).str.upper()
    ano_pelo_romano = edicao_romana_obm.map(ROMANO_PARA_ANO_OBM)
    df['ano'] = df['ano'].fillna(ano_pelo_romano)

    # Edição
    df['edicao_competicao'] = pd.Series(pd.NA, index=df.index, dtype='string')
    mascara_hmmt = df['competicao_base'].eq('HMMT')
    temporada_hmmt = banca_raw.where(mascara_hmmt).str.extract(
        r'\b(november|february)\b', flags=re.IGNORECASE, expand=False
    ).str.capitalize()
    df.loc[mascara_hmmt & temporada_hmmt.notna(), 'edicao_competicao'] = temporada_hmmt

    mascara_obm = df['competicao_base'].eq('OBM')
    df.loc[mascara_obm & edicao_romana_obm.notna(), 'edicao_competicao'] = edicao_romana_obm

    mascara_iran = df['competicao_base'].eq('Iranian Mathematical Olympiad')
    edicao_iran = banca_raw.where(mascara_iran).str.extract(
        r'\b(\d+)(?:st|nd|rd|th)\b', flags=re.IGNORECASE, expand=False
    )
    df.loc[mascara_iran & edicao_iran.notna(), 'edicao_competicao'] = edicao_iran

    # Etapa e tipo de material
    df['etapa'] = banca_raw.str.extract(
        r'\b(final\s+round|district\s+round|qualifying\s+stage|area\s+stage|national\s+stage|oral\s+phase|(?:\d+(?:st|nd|rd|th)|first|second|third|fourth)\s+(?:round|selection\s+test)|round\s+\d+|n[ií]vel\s+\d+|level\s+\d+)\b',
        flags=re.IGNORECASE, expand=False
    )

    df['tipo_material'] = pd.Series('competicao', index=df.index, dtype='string')
    mascara_shortlist = banca_raw.str.contains(r'\bshort\s*list(?:ed)?\b|\bSHL\b', case=False, na=False)
    mascara_seletiva = banca_raw.str.contains(
        r'\bTST\b|team\s+selection|selection\s+test|auswahl|sele[cç][aã]o|selectie|baraj\s+de\s+selec',
        case=False, na=False
    )
    mascara_treino = banca_raw.str.contains(
        r'training|treinamento|treino|pr[eé]paration|preparation|entra[iî]nement|envoi',
        case=False, na=False
    )
    df.loc[mascara_treino, 'tipo_material'] = 'treinamento'
    df.loc[mascara_seletiva, 'tipo_material'] = 'seletiva'
    df.loc[mascara_shortlist, 'tipo_material'] = 'shortlist'

    # Filtragem
    if banca_filter:
        df = df[df['banca'].str.lower() == banca_filter.lower()]
    elif min_count > 0:
        bancas_top = df['banca'].value_counts()[lambda x: x >= min_count].index.tolist()
        df = df[df['banca'].isin(bancas_top)]

    print(f"[✓] Total de registros filtrados para ingestão: {len(df)}")
    print(f"[✓] Bancas selecionadas ({df['banca'].nunique()} bancas): {list(df['banca'].value_counts().head(10).index)}")

    registros = []
    for _, row in df.iterrows():
        enunciado_final = extrair_str_segura(row.get('enunciado_ptbr_reconstruido'))
        if not enunciado_final:
            enunciado_final = extrair_str_segura(row.get('enunciado')) or ''

        # Tradução canônica da taxonomia
        topico_raw = row.get('topico')
        materia_pt, topico_pt, subtopico_pt = traduzir_taxonomia_mathnet(topico_raw)

        ano_val = int(row['ano']) if pd.notna(row.get('ano')) else None
        solucao_val = extrair_str_segura(row.get('solucao_markdown'))
        edicao_val = extrair_str_segura(row.get('edicao_competicao'))
        etapa_val = extrair_str_segura(row.get('etapa'))
        tipo_mat_val = extrair_str_segura(row.get('tipo_material')) or 'competicao'
        pais_val = extrair_str_segura(row.get('pais'))

        reg = {
            'materia': materia_pt,
            'topico': topico_pt,
            'subtopico': subtopico_pt,
            'dificuldade': 5,  # Olimpíada / Avançado
            'banca': str(row['banca']),
            'ano': ano_val,
            'edicao': edicao_val,
            'etapa': etapa_val,
            'tipo_material': tipo_mat_val,
            'pais': pais_val,
            'enunciado': enunciado_final,
            'gabarito': 'Discursiva',
            'solucao': solucao_val,
            'figura_path': None,
            'tipo': 'discursiva',
            'mathnet_id': str(row['id']),
            'estrategias_esperadas': [topico_pt, 'Demonstração Axiomática'],
        }
        registros.append(reg)

    return registros

def main():
    parser = argparse.ArgumentParser(description="Ingestão MathNet no Supabase LEMMAS")
    parser.add_argument("--min-count", type=int, default=50, help="Quantidade mínima de questões por banca (padrão: 50)")
    parser.add_argument("--banca", type=str, default=None, help="Filtrar uma banca específica (ex: OBM, IMO, HMMT)")
    parser.add_argument("--limit", type=int, default=None, help="Limite máximo de questões a inserir (teste)")
    parser.add_argument("--chunk-size", type=int, default=100, help="Tamanho do lote por upsert HTTP (padrão: 100)")
    args = parser.parse_args()

    registros = carregar_e_processar_mathnet(min_count=args.min_count, banca_filter=args.banca)
    if args.limit:
        registros = registros[:args.limit]
        print(f"[!] Limitando execução para {len(registros)} questões de teste.")

    print(f"\n[*] Iniciando upsert em lote de {len(registros)} questões no Supabase...")
    total_sucesso = 0
    chunk_size = args.chunk_size

    with tqdm(total=len(registros), desc="Ingestão MathNet", unit="questão") as pbar:
        for i in range(0, len(registros), chunk_size):
            lote = registros[i : i + chunk_size]
            try:
                n = inserir_questoes_lote(lote, chunk_size=chunk_size)
                total_sucesso += n
            except Exception as e:
                print(f"\n[!] Erro no lote {i//chunk_size + 1}: {e}")
            pbar.update(len(lote))

    print(f"\n=======================================================")
    print(f" [✓] INGESTÃO CONCLUÍDA: {total_sucesso} questões sincronizadas!")
    print(f"=======================================================")

if __name__ == "__main__":
    main()
