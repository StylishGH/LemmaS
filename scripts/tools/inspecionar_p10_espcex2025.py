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
pdf_path = PROJECT_ROOT / "data" / "sources" / "espcex" / "raw" / "2025" / "provas" / "2025-modelo-d-2-dia-de-prova.pdf"
doc = fitz.open(str(pdf_path))

p10 = doc[9] # page 10
print("=== Page 10 text ===")
print(p10.get_text())

imgs = p10.get_images()
print("Images on page 10:", len(imgs))
for img in imgs:
    xref = img[0]
    idict = doc.extract_image(xref)
    rects = p10.get_image_rects(xref)
    print(f"  xref {xref}: {idict['width']}x{idict['height']} rects: {rects}")
