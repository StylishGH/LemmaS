import sys
import fitz
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

pdf_path = Path("data/sources/epcar/raw/2025/provas/2025-26-epcar-provas-de-lingua-inglesa-lingua-portuguesa-matematica-e-redacao-a.pdf")
doc = fitz.open(pdf_path)

print(f"Total de páginas EPCAR 2025: {len(doc)}")
for i, page in enumerate(doc):
    txt = page.get_text()
    if "MATEMÁTICA" in txt.upper():
        print(f"\n==========================================")
        print(f"--- PÁGINA {i + 1} (MATEMÁTICA) ---")
        print(f"==========================================")
        for line in [l.strip() for l in txt.split("\n") if l.strip()][:15]:
            print(f"  {line}")
        imgs = page.get_images()
        print(f"  Imagens encontradas: {len(imgs)}")
        for img in imgs:
            xref = img[0]
            info = doc.extract_image(xref)
            rects = page.get_image_rects(xref)
            print(f"    xref {xref}: {info['width']}x{info['height']} ({len(info['image'])/1024:.1f} KB), rects={rects}")
