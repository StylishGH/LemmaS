import sys
import fitz
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

pdf_path = Path("data/sources/esa/raw/2024/provas/prova-2024-25-portugues-matematica-historia-geografia-e-ingles.pdf")
doc = fitz.open(pdf_path)

print(f"Total páginas ESA 2024: {len(doc)}")
for i, page in enumerate(doc):
    txt = page.get_text()
    if "MATEMÁTICA" in txt.upper() or "cumeeira" in txt.lower():
        print(f"\n=== PÁGINA {i+1} ===")
        for line in [l.strip() for l in txt.split("\n") if l.strip()][:20]:
            print(f"  {line}")
        print("Imagens encontradas:")
        for img in page.get_images():
            xref = img[0]
            info = doc.extract_image(xref)
            rects = page.get_image_rects(xref)
            print(f"  xref {xref}: {info['width']}x{info['height']} ({len(info['image'])/1024:.1f} KB), rects={rects}")
