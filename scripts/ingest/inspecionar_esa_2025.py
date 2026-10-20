import sys
import fitz
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

pdf_path = Path("data/sources/esa/raw/2025/provas/prova2025-26-portugues-matematica-historia-geografia-ingles.pdf")
doc = fitz.open(pdf_path)

print(f"Total de páginas ESA 2025: {len(doc)}")
for p_no in range(1, 6): # páginas 2 a 6
    page = doc[p_no]
    txt = page.get_text()
    print(f"\n==========================================")
    print(f"--- PÁGINA {p_no + 1} ---")
    print(f"==========================================")
    for line in [l.strip() for l in txt.split("\n") if l.strip()][:25]:
        print(f"  {line}")
    imgs = page.get_images()
    print(f"  Imagens encontradas: {len(imgs)}")
    for img in imgs:
        xref = img[0]
        info = doc.extract_image(xref)
        rects = page.get_image_rects(xref)
        print(f"    xref {xref}: {info['width']}x{info['height']} ({len(info['image'])/1024:.1f} KB), rects={rects}")
