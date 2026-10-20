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
pdf_path = PROJECT_ROOT / "data" / "sources" / "espcex" / "raw" / "2024" / "provas" / "2024-modelo-d-2-dia-de-prova.pdf"

if not pdf_path.exists():
    print("Not found:", pdf_path)
    sys.exit(1)

doc = fitz.open(str(pdf_path))
print("EsPCEx 2024 Dia 2 total pages:", len(doc))

for i, page in enumerate(doc):
    text = page.get_text()
    for q in [12, 15, 19]:
        if f"[{q}]" in text or f"{q}." in text or f"Questão {q}" in text or f"{q} -" in text or f" {q} " in text[:50]:
            print(f"\n=== EsPCEx 2024 Q{q} na página {i+1} ===")
            lines = [l.strip() for l in text.split("\n") if l.strip()]
            for l in lines[:6]:
                print("  ", l)
            imgs = page.get_images()
            print("  Imagens:", len(imgs))
            for img in imgs:
                xref = img[0]
                idict = doc.extract_image(xref)
                rects = page.get_image_rects(xref)
                print(f"    xref {xref}: {idict['width']}x{idict['height']} ({idict['ext']}) rects: {rects}")
