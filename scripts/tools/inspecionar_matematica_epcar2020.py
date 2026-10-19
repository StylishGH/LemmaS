import sys
from pathlib import Path
import fitz
import re

for s in (getattr(sys, "stdout", None), getattr(sys, "stderr", None)):
    if s and hasattr(s, "reconfigure"):
        try:
            s.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

PROJECT_ROOT = Path(__file__).resolve().parents[2]
pdf_path = PROJECT_ROOT / "data" / "sources" / "epcar" / "raw" / "2020" / "provas" / "2020-21-epcar-provas-de-lingua-inglesa-lingua-portuguesa-matematica-e-redacao.pdf"
doc = fitz.open(str(pdf_path))

out_dir = PROJECT_ROOT / "data" / "imagens" / "epcar" / "test_extract"
out_dir.mkdir(parents=True, exist_ok=True)

# Vamos inspecionar todas as páginas de Matemática da EPCAR 2020 (páginas 6 a 14)
for i in range(5, 14):
    p = doc[i]
    text = p.get_text()
    if "MATEMÁTICA" in text.upper() or re.search(r"\b(?:3[3-9]|4[0-8])\s*[-–\.]", text):
        print(f"\n==================== Página {i+1} ====================")
        # Mostra números das questões na página
        q_nums = re.findall(r"(?:^|\n)\s*(0?(?:3[3-9]|4[0-8]))\s*[-–\.]", text)
        print(f"Questões identificadas: {q_nums}")
        imgs = p.get_images()
        for img in imgs:
            xref = img[0]
            idict = doc.extract_image(xref)
            rects = p.get_image_rects(xref)
            fname = f"p{i+1}_xref_{xref}_{idict['width']}x{idict['height']}.png"
            (out_dir / fname).write_bytes(idict["image"])
            print(f"  Imagem salva: {fname} | rects: {rects}")
