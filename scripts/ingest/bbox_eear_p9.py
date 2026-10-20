import sys
import fitz
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

pdf_path = Path("data/sources/eear/raw/2023/prova/2023-eear-1-concurso-port-ing-mat-fis.pdf")
doc = fitz.open(pdf_path)
page = doc[8]

print("=== POSIÇÃO DAS IMAGENS NA PÁGINA 9 ===")
for img in page.get_images():
    xref = img[0]
    rects = page.get_image_rects(xref)
    info = doc.extract_image(xref)
    print(f"xref {xref} ({info['width']}x{info['height']}): rects = {rects}")
