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

if not pdf_path.exists():
    pdf_path = PROJECT_ROOT / "data" / "sources" / "espcex" / "raw" / "2025" / "provas" / "2025-modelo-a-1-dia-de-prova.pdf"

doc = fitz.open(str(pdf_path))
print(f"Exam PDF: {pdf_path.name}, pages: {len(doc)}")

for i, page in enumerate(doc):
    txt = page.get_text()
    if "bissetriz" in txt.lower() or "prisma hexagonal" in txt.lower():
        print(f"\n=== Found on Page {i+1} ===")
        print(txt[:300])
        imgs = page.get_images()
        print(f"Images on page: {len(imgs)}")
        for img in imgs:
            idict = doc.extract_image(img[0])
            print("  xref", img[0], idict["width"], "x", idict["height"], page.get_image_rects(img[0]))
