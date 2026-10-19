import sys
from pathlib import Path
import fitz
from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parents[2]
pdf_path = PROJECT_ROOT / "data" / "sources" / "colegio_naval" / "raw" / "2023" / "provas" / "2023-colegio-naval-1-dia-matematica-e-ingles-amarela.pdf"
doc = fitz.open(str(pdf_path))

dest_dir = PROJECT_ROOT / "data" / "imagens" / "colegio_naval" / "2023"
dest_dir.mkdir(parents=True, exist_ok=True)

# Page 4 (0-indexed 3): Questão 14
# Na página 4, a Questão 14 está na coluna direita (x de 285 a 550 pt, y de 100 a 350 pt)
p4 = doc[3]
clip_q14 = fitz.Rect(290, 105, 545, 345)
pix_q14 = p4.get_pixmap(dpi=300, clip=clip_q14)
pix_q14.save(str(dest_dir / "colegio_naval_2023_q14_fig1.png"))

# Page 5 (0-indexed 4): Questão 20
# Na página 5, a Questão 20 está na coluna direita (x de 295 a 550 pt, y de 100 a 300 pt)
p5 = doc[4]
clip_q20 = fitz.Rect(300, 105, 545, 300)
pix_q20 = p5.get_pixmap(dpi=300, clip=clip_q20)
pix_q20.save(str(dest_dir / "colegio_naval_2023_q20_fig1.png"))

print("[✓] CN 2023 Q14 e Q20 recortadas com sucesso a 300 DPI!")
