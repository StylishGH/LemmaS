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
pdf_path = PROJECT_ROOT / "data" / "sources" / "epcar" / "raw" / "2020" / "provas" / "2020-21-epcar-provas-de-lingua-inglesa-lingua-portuguesa-matematica-e-redacao.pdf"

doc = fitz.open(str(pdf_path))
print(f"Total pages: {len(doc)}")

questions_to_check = [33, 34, 35, 38, 39, 42, 46, 47, 48]

for i, page in enumerate(doc):
    text = page.get_text()
    for qnum in questions_to_check:
        if f"{qnum} -" in text or f"{qnum}." in text or f"QUESTÃO {qnum}" in text.upper():
            print(f"\n=== Questão {qnum} (Página {i+1}) ===")
            imgs = page.get_images()
            print(f"  Imagens na página: {len(imgs)}")
            for img in imgs:
                xref = img[0]
                idict = doc.extract_image(xref)
                rects = page.get_image_rects(xref)
                print(f"    xref {xref}: {idict['width']}x{idict['height']} ({idict['ext']}) rects: {rects}")
            drawings = page.get_drawings()
            print(f"  Drawings count: {len(drawings)}")
