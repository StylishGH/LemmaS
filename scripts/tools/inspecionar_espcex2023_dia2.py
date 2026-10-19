import sys
from pathlib import Path
import fitz

PROJECT_ROOT = Path(__file__).resolve().parents[2]
pdf_path = PROJECT_ROOT / "data" / "sources" / "espcex" / "raw" / "2023" / "provas" / "2023-modelo-d-2-dia-de-prova.pdf"
doc = fitz.open(str(pdf_path))

print(f"EsPCEx 2023 Dia 2 pages: {len(doc)}")
for i in range(min(10, len(doc))):
    p = doc[i]
    imgs = p.get_images()
    print(f"Page {i+1}: {len(imgs)} images")
    for img in imgs:
        xref = img[0]
        idict = doc.extract_image(xref)
        rects = p.get_image_rects(xref)
        print(f"  xref {xref}: {idict['width']}x{idict['height']} ({idict['ext']}) rects: {rects}")
