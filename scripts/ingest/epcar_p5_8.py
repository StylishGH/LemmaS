import sys
import fitz
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

pdf_path = Path("data/sources/epcar/raw/2025/provas/2025-26-epcar-provas-de-lingua-inglesa-lingua-portuguesa-matematica-e-redacao-a.pdf")
doc = fitz.open(pdf_path)

for p in [4, 5, 6, 7]: # páginas 5, 6, 7, 8
    print(f"\n=== PÁGINA {p+1} ===")
    print(doc[p].get_text())
