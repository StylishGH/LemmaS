import sys
import fitz
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

pdf_path = Path("data/sources/eear/raw/2023/prova/2023-eear-1-concurso-port-ing-mat-fis.pdf")
doc = fitz.open(pdf_path)
page = doc[8]

dest_dir = Path("data/imagens/eear/2023")
dest_dir.mkdir(parents=True, exist_ok=True)

# Mapeamento exato verificado por coordenadas da página:
# Q51: cone -> rect da imagem xref 67
# Q52: triângulo ABC -> rect da imagem xref 63
# Q57: hexágono -> rect da imagem xref 65

targets = [
    ("eear_2023_q51_fig1.png", 67),
    ("eear_2023_q52_fig1.png", 63),
    ("eear_2023_q57_fig1.png", 65),
]

for filename, xref in targets:
    rect = page.get_image_rects(xref)[0]
    # Expande 2 pontos de margem
    clip = fitz.Rect(rect.x0 - 2, rect.y0 - 2, rect.x1 + 2, rect.y1 + 2)
    pix = page.get_pixmap(dpi=300, clip=clip)
    out_path = dest_dir / filename
    pix.save(str(out_path))
    print(f"[✓] Salvo {filename}: {pix.width}x{pix.height} ({out_path.stat().st_size/1024:.1f} KB)")
