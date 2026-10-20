import sys
sys.stdout.reconfigure(encoding='utf-8')
import fitz
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
pdf_path = PROJECT_ROOT / "data" / "sources" / "afa" / "raw" / "2026" / "afa_2026_madematica.pdf"
doc = fitz.open(str(pdf_path))

print(f"Total de páginas no PDF: {len(doc)}")
for i in range(10):
    page = doc[i]
    txt = page.get_text()
    imgs = page.get_images()
    q_matches = re.findall(r'(?:^|\n)\s*(\d+)\)', txt)
    print(f"=== PÁGINA {i+1} ===")
    print(f"  Questões: {q_matches}")
    for idx, img_info in enumerate(imgs):
        xref = img_info[0]
        base = doc.extract_image(xref)
        w, h = base["width"], base["height"]
        print(f"    Img xref {xref}: {w}x{h} ({base['ext']})")
