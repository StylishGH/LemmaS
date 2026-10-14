"""Insere as 12 questões da ESA 2026 (backup) com figuras em /uploads/esa/2026/."""
import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from app.core.config import get_supabase_client

# Questões (ordem da prova) que possuem figura SVG
FIGURAS = {2: "q02.svg", 6: "q06.svg", 9: "q09.svg", 10: "q10.svg"}

def main():
    supabase = get_supabase_client()
    backup = json.loads(
        (PROJECT_ROOT / "data/sources/esa/2026/backup/questoes.json").read_text(encoding="utf-8")
    )
    esa = sorted([q for q in backup if q.get("banca") == "ESA"], key=lambda q: q["id"])
    assert len(esa) == 12, f"Esperava 12 questões ESA, achei {len(esa)}"

    payload = []
    for numero, q in enumerate(esa, start=1):
        q = {k: v for k, v in q.items() if k not in ("id", "criado_em")}
        q["figura_path"] = f"/uploads/esa/2026/{FIGURAS[numero]}" if numero in FIGURAS else None
        payload.append(q)

    res = supabase.table("questoes").insert(payload).execute()
    ids = [r["id"] for r in res.data]
    print(f"✅ {len(ids)} questões ESA inseridas (IDs {ids[0]} a {ids[-1]})")
    for numero, r in enumerate(res.data, start=1):
        print(f"  Q{numero:02d} -> #{r['id']} | {r['topico']} | figura={r['figura_path']}")

if __name__ == "__main__":
    main()
