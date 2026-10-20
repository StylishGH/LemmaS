import sys
import fitz
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

pdf_path = Path("data/sources/eear/raw/2023/prova/2023-eear-1-concurso-port-ing-mat-fis.pdf")
doc = fitz.open(pdf_path)
page = doc[8] # página 9 (índice 8)

print("=== TEXTO COMPLETO DA PÁGINA 9 ===")
print(page.get_text())

out_dir = Path("data/imagens/eear/debug_2023")
out_dir.mkdir(parents=True, exist_ok=True)

for img in page.get_images():
    xref = img[0]
    info = doc.extract_image(xref)
    p = out_dir / f"page9_xref_{xref}.{info['ext']}"
    with open(p, "wb") as f:
        f.write(info["image"])
    print(f"Salva imagem {p}: {info['width']}x{info['height']}")
