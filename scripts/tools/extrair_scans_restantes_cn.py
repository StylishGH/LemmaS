import sys
sys.stdout.reconfigure(encoding='utf-8')
import fitz
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]

years = ["2016", "2017", "2019", "2021"]
for y in years:
    raw_dir = PROJECT_ROOT / "data" / "sources" / "colegio_naval" / "raw" / y / "provas"
    pdfs = list(raw_dir.glob("*1-dia*.pdf"))
    if not pdfs:
        pdfs = list(raw_dir.glob("*.pdf"))
    print(f"CN {y}: {len(pdfs)} pdfs found -> {[p.name for p in pdfs]}")
    if pdfs:
        doc = fitz.open(str(pdfs[0]))
        print(f"  Pages: {len(doc)}")
