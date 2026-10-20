import sys
import io
from pathlib import Path
import pypdf

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
pdf_path = PROJECT_ROOT / "data" / "sources" / "escola_naval" / "raw" / "2025" / "escola_naval_2025_madematica.pdf"
out_path = PROJECT_ROOT / "data" / "sources" / "escola_naval" / "raw" / "2025" / "texto_bruto.txt"

reader = pypdf.PdfReader(str(pdf_path))
with open(out_path, "w", encoding="utf-8") as f:
    for i, page in enumerate(reader.pages):
        f.write(f"\n\n=== PAGINA {i+1} ===\n\n")
        txt = page.extract_text() or ""
        f.write(txt)

print(f"[✓] Extraídas {len(reader.pages)} páginas para {out_path}")
