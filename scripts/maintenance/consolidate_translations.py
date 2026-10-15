#!/usr/bin/env python3
"""Consolida as traduções locais e as retraduções Gemini em um dataset final.

Lê o JSONL principal e o JSONL do Gemini (se existir), mantendo o registro mais
recente por ID, aplica as retraduções bem-sucedidas do Gemini sobre os casos
problemáticos locais e grava: JSONL canônico, CSV (utf-8-sig, QUOTE_ALL, pronto
para pandas/SQL) e um JSON de estatísticas.
"""

from __future__ import annotations

import argparse
import csv
import json
from collections import Counter
from pathlib import Path
from typing import Any

COLUMNS = [
    "id",
    "idioma_origem",
    "idioma_rotulo",
    "modelo",
    "licenca_modelo",
    "identificador_idioma",
    "dispositivo",
    "hash_original_sha256",
    "enunciado_original",
    "enunciado_ptbr",
    "math_spans",
    "integridade_matematica",
    "status",
    "revisao_humana",
    "origem_traducao",
    "erro",
]


def load_latest_by_id(path: Path) -> dict[str, dict[str, Any]]:
    latest: dict[str, dict[str, Any]] = {}
    with path.open(encoding="utf-8") as handle:
        for raw in handle:
            raw = raw.strip()
            if not raw:
                continue
            try:
                row = json.loads(raw)
            except json.JSONDecodeError:
                continue
            qid = str(row.get("id", "") or "")
            if qid:
                latest[qid] = row
    return latest


def flatten(value: Any) -> Any:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)
    return value


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--main",
        type=Path,
        default=Path("data/translations/mathnet_enunciados_ptbr.jsonl"),
    )
    parser.add_argument(
        "--gemini",
        type=Path,
        default=Path("data/translations/mathnet_enunciados_ptbr_gemini.jsonl"),
    )
    parser.add_argument("--out-dir", type=Path, default=Path("data/consolidated"))
    args = parser.parse_args()

    if not args.main.is_file():
        parser.error(f"arquivo principal não encontrado: {args.main}")

    local = load_latest_by_id(args.main)
    gemini = load_latest_by_id(args.gemini) if args.gemini.is_file() else {}

    merged: dict[str, dict[str, Any]] = {}
    for qid, row in local.items():
        record = dict(row)
        override = gemini.get(qid)
        if override and override.get("status") == "translated_unreviewed":
            record = dict(override)
            record["origem_traducao"] = "gemini"
        else:
            record["origem_traducao"] = "local"
            if override and override.get("erro"):
                prior_error = str(record.get("erro", "") or "")
                record["erro"] = (prior_error + " | retradução: " if prior_error else "retradução: ") + str(override["erro"])
        merged[qid] = record

    # Robustez: sucessos do Gemini sem registro local correspondente.
    for qid, override in gemini.items():
        if qid not in merged and override.get("status") == "translated_unreviewed":
            record = dict(override)
            record["origem_traducao"] = "gemini"
            merged[qid] = record

    rows = [merged[qid] for qid in sorted(merged)]

    args.out_dir.mkdir(parents=True, exist_ok=True)
    jsonl_path = args.out_dir / "mathnet_translations_final.jsonl"
    with jsonl_path.open("w", encoding="utf-8", newline="\n") as handle:
        for record in rows:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")

    csv_path = args.out_dir / "mathnet_translations_final.csv"
    with csv_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=COLUMNS, extrasaction="ignore", quoting=csv.QUOTE_ALL)
        writer.writeheader()
        for record in rows:
            writer.writerow({column: flatten(record.get(column)) for column in COLUMNS})

    by_status = Counter(str(r.get("status", "")) for r in rows)
    by_origin = Counter(str(r.get("origem_traducao", "")) for r in rows)
    by_model = Counter(str(r.get("modelo", "") or "") for r in rows if r.get("status") == "translated_unreviewed")
    by_language = Counter(str(r.get("idioma_origem", "") or "?") for r in rows)
    math_ok = sum(1 for r in rows if r.get("integridade_matematica"))

    stats = {
        "total_registros": len(rows),
        "traduzidas": by_status.get("translated_unreviewed", 0),
        "revisao_pendente": by_status.get("review_required", 0),
        "por_status": dict(by_status),
        "por_origem": dict(by_origin),
        "por_modelo_traduzidas": dict(by_model),
        "por_idioma_origem": dict(by_language),
        "integridade_matematica_ok": math_ok,
        "arquivos": {
            "jsonl": str(jsonl_path),
            "csv": str(csv_path),
        },
    }
    stats_path = args.out_dir / "translation_stats.json"
    stats_path.write_text(json.dumps(stats, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Total de registros únicos: {len(rows)}")
    print(f"  Traduzidas (aguardando revisão humana): {by_status.get('translated_unreviewed', 0)}")
    print(f"  Revisão obrigatória: {by_status.get('review_required', 0)}")
    print(f"  Origem local: {by_origin.get('local', 0)} | Origem Gemini: {by_origin.get('gemini', 0)}")
    print(f"  Integridade matemática ok: {math_ok}/{len(rows)}")
    print(f"JSONL: {jsonl_path}")
    print(f"CSV:   {csv_path}")
    print(f"Stats: {stats_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
