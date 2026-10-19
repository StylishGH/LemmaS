import sys
from pathlib import Path

for s in (getattr(sys, "stdout", None), getattr(sys, "stderr", None)):
    if s and hasattr(s, "reconfigure"):
        try:
            s.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / "backend" / ".env")

from app.core.config import get_supabase_client
sb = get_supabase_client()

res = sb.table("questoes").select("id,mathnet_id,banca,ano,enunciado,figura_path").in_("banca", ["Colégio Naval", "COLEGIO NAVAL", "CN"]).in_("ano", [2024, 2025]).execute()

for r in res.data:
    if r.get("figura_path"):
        txt = (r.get("enunciado") or "")[:120].replace("\n", " ")
        print(f"{r['ano']} | {r['mathnet_id']} (ID: {r['id']})")
        print(f"  Fig: {r['figura_path']}")
        print(f"  Txt: {txt}")
        print("-" * 50)
