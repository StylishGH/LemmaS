import sys
import fitz
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

pdf_path = Path("data/sources/esa/raw/2025/provas/prova2025-26-portugues-matematica-historia-geografia-ingles.pdf")
doc = fitz.open(pdf_path)

with open("data/sources/esa/raw/2025/texto_matematica.txt", "w", encoding="utf-8") as f:
    for p_no in range(1, 5):
        f.write(f"\n\n=== PÁGINA {p_no + 1} ===\n\n")
        f.write(doc[p_no].get_text())

print("[✓] Salvo texto de Matemática em data/sources/esa/raw/2025/texto_matematica.txt")
