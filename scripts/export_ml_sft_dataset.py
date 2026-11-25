#!/usr/bin/env python3
"""Gera um lote privado para análise de distratores, sem identificadores de alunos.

A publicação de SFT fica suspensa até existir uma fonte versionada de rótulos
humanos aprovados com autorização de treino verificável.
"""

from __future__ import annotations

import csv
import hashlib
import hmac
import json
import os
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from dotenv import dotenv_values

OPTIONS = frozenset("ABCDE")
DISTRACTOR_FIELDS = ("questao_id", "student_hash", "gabarito_oficial", "resposta_marcada", "acertou", "tempo_segundos")


def get_supabase_client():
    from supabase import create_client

    env_paths = [
        Path("frontend/.env.local"),
        Path("backend/.env"),
        Path(".env"),
    ]
    cfg = {}
    for p in env_paths:
        if p.exists():
            cfg.update(dotenv_values(str(p)))

    cfg.update(os.environ)
    url = cfg.get("NEXT_PUBLIC_SUPABASE_URL") or cfg.get("SUPABASE_URL")
    key = cfg.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        raise RuntimeError("Configure a URL do Supabase e SUPABASE_SERVICE_ROLE_KEY.")

    return create_client(url, key)


def extract_answer_from_annotations(anotacoes: Optional[str]) -> Optional[str]:
    """Extrai a alternativa marcada caso a coluna resposta_aluno não esteja populada."""
    if not anotacoes:
        return None
    match = re.search(r"\[RESPOSTA:([^\]]+)\]", anotacoes)
    if match:
        return match.group(1).strip()
    return None


def extract_justification_from_annotations(anotacoes: Optional[str]) -> Optional[str]:
    """Extrai o texto bruto digitado pelo aluno a partir das anotações estruturadas."""
    if not anotacoes:
        return None
    match = re.search(r"\[JUSTIFICATIVA_BRUTA:(.*?)\](?:\s*\[|$)", anotacoes)
    if match:
        return match.group(1).strip()
    return None


def iter_attempts(client):
    """Leia uma única fonte para ambos os formatos, com paginação por ID."""
    cursor = 0
    while True:
        result = (
            client.table("tentativas")
            .select("id,questao_id,aluno_id,resposta_aluno,anotacoes,tempo_segundos,questoes(tipo,gabarito)")
            .gt("id", cursor)
            .order("id")
            .limit(500)
            .execute()
        )
        if not result.data:
            return
        yield from result.data
        cursor = result.data[-1]["id"]


def pseudonymize_student_id(aluno_id: Any, salt: Optional[str]) -> Optional[str]:
    if not salt or aluno_id is None:
        return None
    return hmac.new(salt.encode("utf-8"), str(aluno_id).encode("utf-8"), hashlib.sha256).hexdigest()[:16]


def distractor_rows(attempts, pseudonym_salt: Optional[str] = None):
    if pseudonym_salt is None:
        pseudonym_salt = os.environ.get("LEMMAS_EXPORT_PSEUDONYM_SALT")
    for attempt in attempts:
        question = attempt.get("questoes") or {}
        if question.get("tipo") != "objetiva":
            continue
        answer = (attempt.get("resposta_aluno") or
                  extract_answer_from_annotations(attempt.get("anotacoes")) or "").strip().upper()
        key = (question.get("gabarito") or "").strip().upper()
        if answer not in OPTIONS or key not in OPTIONS:
            continue
        yield {
            "questao_id": attempt["questao_id"],
            "student_hash": pseudonymize_student_id(attempt.get("aluno_id"), pseudonym_salt) or "",
            "gabarito_oficial": key,
            "resposta_marcada": answer,
            "acertou": int(answer == key),
            "tempo_segundos": attempt.get("tempo_segundos"),
        }


def export_datasets(output_dir: Path = Path("data/exports")) -> Path:
    rows = list(distractor_rows(iter_attempts(get_supabase_client())))
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_dir = Path(tempfile.mkdtemp(prefix=f"{timestamp}-", dir=output_dir))
    csv_path = run_dir / "tri_distractor_analysis.csv"
    json_path = run_dir / "tri_distractor_analysis.json"
    with csv_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=DISTRACTOR_FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    json_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    manifest = {
        "run_id": run_dir.name,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "schema_version": 1,
        "source": "tentativas + questoes",
        "purpose": "distractor_analysis",
        "rows": len(rows),
        "files_sha256": {
            path.name: hashlib.sha256(path.read_bytes()).hexdigest()
            for path in (csv_path, json_path)
        },
    }
    (run_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return run_dir


if __name__ == "__main__":
    print(export_datasets())
