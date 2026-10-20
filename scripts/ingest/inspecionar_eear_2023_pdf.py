import sys
import fitz
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

pdf_path = Path("data/sources/eear/raw/2023/prova/2023-eear-1-concurso-port-ing-mat-fis.pdf")
doc = fitz.open(pdf_path)

print(f"Total de páginas no PDF da EEAR 2023: {len(doc)}")
for i, page in enumerate(doc):
    txt = page.get_text()
    if "MATEMÁTICA" in txt.upper():
        print(f"\n--- PÁGINA {i+1} (MATEMÁTICA) ---")
        lines = [line.strip() for line in txt.split("\n") if line.strip()]
        for line in lines[:20]:
            print(f"  {line}")
        imgs = page.get_images()
        print(f"  Imagens encontradas: {len(imgs)}")
        for img in imgs:
            xref = img[0]
            info = doc.extract_image(xref)
            print(f"    xref {xref}: {info['width']}x{info['height']} ({info['ext']}, {len(info['image'])/1024:.1f} KB)")
