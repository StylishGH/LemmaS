import sys
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "backend"))
sys.path.insert(0, str(PROJECT_ROOT))

from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / "backend" / ".env")

try:
    from app.core.config import get_supabase_client as get_supabase
except ImportError:
    from src.database.db import get_supabase

def norm_banca(banca: str) -> str:
    b = (banca or "").lower()
    b = b.replace("colégio naval", "colegio_naval").replace("colégionaval", "colegio_naval")
    b = b.replace("escola naval", "escola_naval").replace("escolanaval", "escola_naval")
    return b

def main():
    sb = get_supabase()
    mil_bancas = ['AFA','EEAR','EFOMM','ESA','EsPCEx','ESPCEX','IME','ITA','Colégio Naval','COLEGIO NAVAL','CN','Escola Naval','ESCOLA NAVAL','EN','EPCAR']
    res = sb.table("questoes").select("id,mathnet_id,banca,ano,figura_path,enunciado").in_("banca", mil_bancas).not_.is_("figura_path", "null").execute()
    rows = [r for r in res.data if (r.get("figura_path") or "").strip()]
    
    total = len(rows)
    com_pdf = 0
    sem_pdf = 0
    
    banca_stats = {}
    
    for r in rows:
        b_raw = r.get("banca", "")
        b = norm_banca(b_raw)
        ano = str(r.get("ano", ""))
        
        raw_dir = PROJECT_ROOT / "data" / "sources" / b / "raw" / ano
        pdfs = list(raw_dir.rglob("*.pdf")) if raw_dir.exists() else []
        provas = [p for p in pdfs if "gabarito" not in p.name.lower()]
        
        banca_stats.setdefault(b, {"total": 0, "com_pdf": 0, "provas": set()})
        banca_stats[b]["total"] += 1
        
        if provas:
            com_pdf += 1
            banca_stats[b]["com_pdf"] += 1
            banca_stats[b]["provas"].add(provas[0].name)
        else:
            sem_pdf += 1
            
    print(f"Total de questões militares com figura: {total}")
    print(f"Com PDF original disponível em raw/: {com_pdf} ({com_pdf/total*100:.1f}%)")
    print(f"Sem PDF em raw/: {sem_pdf}")
    print("\nDetalhamento por banca:")
    for b, s in sorted(banca_stats.items()):
        print(f"  - {b.upper()}: {s['com_pdf']}/{s['total']} com PDF local ({len(s['provas'])} provas)")

if __name__ == "__main__":
    main()
