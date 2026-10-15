"""Audita as questões do CEDERJ diretamente no Supabase."""

from __future__ import annotations

import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import get_supabase_client


ALTERNATIVE_RE = re.compile(r"(?:^|\n)\s*\(?([A-E])\)?[.)\-:]\s+", re.IGNORECASE)


def alternativas(enunciado: str) -> list[str]:
    """Retorna as letras de alternativas encontradas no enunciado."""
    return sorted({match.group(1).upper() for match in ALTERNATIVE_RE.finditer(enunciado)})


def auditar() -> None:
    supabase = get_supabase_client()
    if supabase is None:
        raise RuntimeError("Supabase não configurado ou indisponível.")

    rows = (
        supabase.table("questoes")
        .select("id,banca,materia,topico,subtopico,tipo,ano,enunciado,gabarito")
        .ilike("banca", "%CEDERJ%")
        .order("id")
        .execute()
        .data
        or []
    )

    falsas_objetivas: list[dict] = []
    gabaritos_sem_latex: list[dict] = []

    print(f"\n=== AUDITORIA CEDERJ (Total: {len(rows)}) ===")
    for row in rows:
        enunciado = row.get("enunciado") or ""
        gabarito = row.get("gabarito") or ""
        alts = alternativas(enunciado)

        if row.get("tipo") == "objetiva" and len(alts) < 2:
            falsas_objetivas.append(row)
            print(f"[FALSA OBJETIVA] ID #{row['id']} | alternativas: {len(alts)}")

        if row.get("tipo") == "discursiva" or len(alts) < 2:
            tem_math = any(
                termo in gabarito.lower()
                for termo in ("lim", "sqrt", "nabla", "frac", "x^", "y^", "t^", "sen", "cos", "pi", "int")
            ) or "\\" in gabarito
            if tem_math and "$" not in gabarito:
                gabaritos_sem_latex.append(row)
                print(f"[GABARITO SEM LATEX] ID #{row['id']}")

    print("\n--- LISTAGEM CEDERJ ---")
    for row in rows:
        gabarito = row.get("gabarito") or ""
        print(
            f"ID #{row['id']:4d} | {row.get('materia', ''):<25s} | "
            f"Tipo: {row.get('tipo', ''):<11s} | Alts: {len(alternativas(row.get('enunciado') or ''))} | "
            f"Gab LaTeX: {'$' in gabarito} | Tópico: {row.get('topico', '')}"
        )

    todas = (
        supabase.table("questoes")
        .select("id,banca,materia,topico,enunciado")
        .eq("tipo", "objetiva")
        .execute()
        .data
        or []
    )
    falsas_globais = [row for row in todas if len(alternativas(row.get("enunciado") or "")) < 2]
    print(f"\nObjetivas no banco: {len(todas)}")
    print(f"Objetivas sem alternativas suficientes: {len(falsas_globais)}")
    for row in falsas_globais:
        print(f"ID #{row['id']} | Banca: {row.get('banca')} | {row.get('materia')} | {row.get('topico')}")

    print(f"\nResumo CEDERJ: {len(falsas_objetivas)} objetivas suspeitas; {len(gabaritos_sem_latex)} gabaritos sem LaTeX.")


if __name__ == "__main__":
    auditar()
