import sys
import fitz
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

pdf_path = Path("data/sources/eear/raw/2025/prova/2025-eear-1-concurso-port-ing-mat-fis.pdf")
doc = fitz.open(pdf_path)

print(f"Total páginas EEAR 2025: {len(doc)}")
for i, page in enumerate(doc):
    txt = page.get_text()
    if "46 –" in txt or "46 -" in txt or "47 –" in txt or "47 -" in txt:
        print(f"\n=== PÁGINA {i+1} ===")
        print(txt)
        print("Imagens encontradas:")
        for img in page.get_images():
            xref = img[0]
            info = doc.extract_image(xref)
            rects = page.get_image_rects(xref)
            print(f"  xref {xref}: {info['width']}x{info['height']} ({len(info['image'])/1024:.1f} KB), rects={rects}")
