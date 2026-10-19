import sys
from pathlib import Path
import fitz

for s in (getattr(sys, "stdout", None), getattr(sys, "stderr", None)):
    if s and hasattr(s, "reconfigure"):
        try:
            s.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

PROJECT_ROOT = Path(__file__).resolve().parents[2]
pdf_path = PROJECT_ROOT / "data" / "sources" / "afa" / "raw" / "2025" / "provas" / "2025-26-afa-provas-de-lingua-inglesa-fisica-lingua-portuguesa-matematica-e-redacao.pdf"
doc = fitz.open(str(pdf_path))

for p_num in [7, 8, 11]:
    page = doc[p_num - 1]
    print(f"\n==================== PAGE {p_num} ====================")
    print(page.get_text())
