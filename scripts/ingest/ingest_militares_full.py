"""
Script canônico de ingestão das questões militares e de vestibulares (3.400+ questões)
extraídas dos PDFs para o Supabase PostgreSQL do LEMMAS.

Fontes contempladas:
- ITA, IME, EsPCEx, EEAR, AFA, Escola Naval, EFOMM, Colégio Naval, EPCAR, ESA, ENEM, FUVEST, UNICAMP.
"""

import sys
import os
import json
import hashlib
import argparse
from pathlib import Path
from typing import Dict, Any, List
from tqdm import tqdm

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.database.db import get_supabase, inserir_questoes_lote

BANCA_DISPLAY_NAMES = {
    'afa': 'AFA',
    'colegio_naval': 'Colégio Naval',
    'eear': 'EEAR',
    'efomm': 'EFOMM',
    'enem': 'ENEM',
    'epcar': 'EPCAR',
    'esa': 'ESA',
    'escola_naval': 'Escola Naval',
    'espcex': 'EsPCEx',
    'fuvest': 'FUVEST',
    'ime': 'IME',
    'ita': 'ITA',
    'unicamp': 'UNICAMP',
}

DIFICULDADE_POR_BANCA = {
    'ita': 5,
    'ime': 5,
    'escola_naval': 4,
    'efomm': 4,
    'afa': 4,
    'fuvest': 4,
    'unicamp': 4,
    'espcex': 3,
    'colegio_naval': 3,
    'eear': 2,
    'epcar': 2,
    'esa': 2,
    'enem': 2,
}

def formatar_figura_path(path_str: str) -> str:
    """Normaliza o caminho da imagem para acesso web via Next.js (/data/imagens/...)."""
    if not path_str:
        return None
    p = str(path_str).replace("\\", "/")
    if p.startswith("/"):
        return p
    if p.startswith("data/imagens/"):
        return "/" + p
    if p.startswith("frontend/public/"):
        return "/" + p[len("frontend/public/"):]
    return "/" + p

def carregar_questoes_militares(banca_filter: str = None) -> List[Dict[str, Any]]:
    sources_dir = PROJECT_ROOT / "data" / "sources"
    registros = []
    seen_ids = set()

    arquivos = sorted(sources_dir.glob("*/processed/*/questoes.json"))
    print(f"[*] Varrendo {len(arquivos)} cadernos processados em data/sources/...")

    for path in arquivos:
        banca_key = path.parts[path.parts.index("sources") + 1].lower()
        ano_str = path.parts[path.parts.index("sources") + 3]
        
        if banca_filter and banca_key != banca_filter.lower():
            continue

        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            print(f"[!] Erro ao ler {path}: {e}")
            continue

        questoes = data if isinstance(data, list) else data.get("questoes", [])
        banca_nome = BANCA_DISPLAY_NAMES.get(banca_key, banca_key.upper())
        dificuldade_padrao = DIFICULDADE_POR_BANCA.get(banca_key, 3)
        tipo_material = "vestibular" if banca_key in ("enem", "fuvest", "unicamp") else "concurso_militar"

        for idx, q in enumerate(questoes):
            enunciado = q.get("enunciado") or q.get("enunciado_corpo") or ""
            if not enunciado.strip():
                continue

            num = q.get("numero", idx + 1)
            materia = q.get("materia", "Matemática")
            topico = q.get("topico", "Geral")
            subtopico = q.get("subtopico")
            tipo = q.get("tipo", "objetiva")
            gabarito = q.get("gabarito")
            if not gabarito:
                gabarito = "Discursiva" if tipo == "discursiva" else "Sem Gabarito Oficial"

            figura = formatar_figura_path(q.get("figura_path"))
            
            # Geração de mathnet_id determinístico e sem colisões
            origem = Path(q.get("arquivo_origem", "")).stem.lower()
            tag_fase = ""
            if "fase1" in origem or "1f" in origem or "1-dia" in origem:
                tag_fase = "_1f"
            elif "fase2" in origem or "2f" in origem or "2-dia" in origem:
                tag_fase = "_2f"

            disc_code = "mat" if "mat" in materia.lower() else "fis"
            base_id = f"militar_{banca_key}_{ano_str}{tag_fase}_{disc_code}_q{num:02d}"

            if base_id in seen_ids:
                # Resolve colisão anexando hash do enunciado
                h = hashlib.md5(enunciado.encode("utf-8")).hexdigest()[:6]
                base_id = f"{base_id}_{h}"

            seen_ids.add(base_id)

            ano_int = None
            try:
                ano_int = int(ano_str)
            except Exception:
                pass

            reg = {
                "materia": materia,
                "topico": topico,
                "subtopico": subtopico,
                "dificuldade": dificuldade_padrao,
                "banca": banca_nome,
                "ano": ano_int,
                "edicao": None,
                "etapa": "1ª Fase" if "1f" in tag_fase else ("2ª Fase" if "2f" in tag_fase else None),
                "tipo_material": tipo_material,
                "pais": "Brasil",
                "enunciado": enunciado,
                "gabarito": gabarito,
                "solucao": None,
                "figura_path": figura,
                "tipo": tipo,
                "mathnet_id": base_id,
                "estrategias_esperadas": q.get("estrategias_esperadas") or [topico, "Raciocínio Dedutivo"],
            }
            registros.append(reg)

    return registros

def main():
    parser = argparse.ArgumentParser(description="Ingestão das Questões Militares no Supabase LEMMAS")
    parser.add_argument("--banca", type=str, default=None, help="Filtrar uma banca específica (ex: ita, ime, espcex)")
    parser.add_argument("--limit", type=int, default=None, help="Limite máximo de questões a inserir (teste)")
    parser.add_argument("--chunk-size", type=int, default=100, help="Tamanho do lote por upsert HTTP (padrão: 100)")
    args = parser.parse_args()

    registros = carregar_questoes_militares(banca_filter=args.banca)
    if args.limit:
        registros = registros[:args.limit]
        print(f"[!] Limitando para {len(registros)} questões.")

    print(f"\n[✓] Total de questões militares preparadas: {len(registros)}")
    banca_counts = {}
    for r in registros:
        b = r["banca"]
        banca_counts[b] = banca_counts.get(b, 0) + 1
    for b, c in sorted(banca_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  - {b}: {c} questões")

    print(f"\n[*] Iniciando upsert no Supabase...")
    total_sucesso = 0
    chunk_size = args.chunk_size

    with tqdm(total=len(registros), desc="Ingestão Militares", unit="questão") as pbar:
        for i in range(0, len(registros), chunk_size):
            lote = registros[i : i + chunk_size]
            try:
                n = inserir_questoes_lote(lote, chunk_size=chunk_size)
                total_sucesso += n
            except Exception as e:
                print(f"\n[!] Erro no lote {i//chunk_size + 1}: {e}")
            pbar.update(len(lote))

    print(f"\n=======================================================")
    print(f" [✓] INGESTÃO CONCLUÍDA: {total_sucesso} questões militares sincronizadas!")
    print(f"=======================================================")

if __name__ == "__main__":
    main()
