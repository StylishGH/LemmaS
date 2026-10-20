import sys
import fitz
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

pdf_path = Path("data/sources/esa/raw/2025/provas/prova2025-26-portugues-matematica-historia-geografia-ingles.pdf")
doc = fitz.open(pdf_path)

out_dir = Path("data/imagens/esa/2025/inspecao")
out_dir.mkdir(parents=True, exist_ok=True)

# Extrai e renderiza em alta definição as regiões de imagens das páginas 2 e 5
# Página 2:
p2 = doc[1]
r36 = fitz.Rect(185, 500, 410, 660)
pix36 = p2.get_pixmap(dpi=300, clip=r36)
pix36.save(str(out_dir / "p2_xref36_hi.png"))

# Página 5:
p5 = doc[4]
r52 = fitz.Rect(235, 310, 360, 430)
pix52 = p5.get_pixmap(dpi=300, clip=r52)
pix52.save(str(out_dir / "p5_xref52_hi.png"))

r55 = fitz.Rect(245, 540, 365, 660)
pix55 = p5.get_pixmap(dpi=300, clip=r55)
pix55.save(str(out_dir / "p5_xref55_hi.png"))

print(f"[✓] Salvas imagens de ESA 2025 em {out_dir}")
