import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / "backend" / ".env")

from app.core.config import get_supabase_client

sb = get_supabase_client()
res = sb.table("questoes").select("id,mathnet_id,banca,ano,enunciado,figura_path").eq("banca", "AFA").eq("ano", 2025).execute()

for r in res.data:
    txt = (r.get("enunciado") or "")[:120].replace("\n", " ")
    fig = r.get("figura_path")
    if "mar" in txt.lower() or "esbo" in txt.lower() or fig:
        print(f"ID: {r['id']} | Q{r.get('numero')} | mathnet: {r.get('mathnet_id')}")
        print(f"  Fig: {fig}")
        print(f"  Txt: {txt}")
        print("-" * 50)
