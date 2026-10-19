import sys
from pathlib import Path
import fitz
from PIL import Image

for s in (getattr(sys, "stdout", None), getattr(sys, "stderr", None)):
    if s and hasattr(s, "reconfigure"):
        try:
            s.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

PROJECT_ROOT = Path(__file__).resolve().parents[2]
test_dir = PROJECT_ROOT / "data" / "imagens" / "epcar" / "test_extract"
dest_dir = PROJECT_ROOT / "data" / "imagens" / "epcar" / "2020"
dest_dir.mkdir(parents=True, exist_ok=True)

# 1. Q33, Q34, Q35
Image.open(test_dir / "p7_xref_62_1391x833.png").save(dest_dir / "epcar_2020_q33_fig1.png", "PNG", optimize=True)
Image.open(test_dir / "p7_xref_64_1351x861.png").save(dest_dir / "epcar_2020_q34_fig1.png", "PNG", optimize=True)
Image.open(test_dir / "p7_xref_61_550x432.png").save(dest_dir / "epcar_2020_q35_fig1.png", "PNG", optimize=True)

# 2. Q38, Q39
Image.open(test_dir / "p8_xref_71_525x330.png").save(dest_dir / "epcar_2020_q38_fig1.png", "PNG", optimize=True)
Image.open(test_dir / "p9_xref_78_634x700.png").save(dest_dir / "epcar_2020_q39_fig1.png", "PNG", optimize=True)

# 3. Q42: composição dos gráficos de casos e mortes
im_casos = Image.open(test_dir / "p10_xref_86_962x606.png")
im_mortes = Image.open(test_dir / "p10_xref_85_936x594.png")
w_q42 = max(im_casos.width, im_mortes.width)
h_q42 = im_casos.height + im_mortes.height + 30
comp_q42 = Image.new("RGB", (w_q42, h_q42), (255, 255, 255))
comp_q42.paste(im_casos, ((w_q42 - im_casos.width) // 2, 0))
comp_q42.paste(im_mortes, ((w_q42 - im_mortes.width) // 2, im_casos.height + 30))
comp_q42.save(dest_dir / "epcar_2020_q42_fig1.png", "PNG", optimize=True)

# 4. Q46: crop de alta precisão da página 12 (cartas e naipes)
pdf_path = PROJECT_ROOT / "data" / "sources" / "epcar" / "raw" / "2020" / "provas" / "2020-21-epcar-provas-de-lingua-inglesa-lingua-portuguesa-matematica-e-redacao.pdf"
doc = fitz.open(str(pdf_path))
p12 = doc[11] # página 12 (0-indexed 11)
# Bounding box das 4 tabelas/figuras: y de 135 a 580 pt
clip_q46 = fitz.Rect(25, 135, p12.rect.width - 25, 580)
pix_q46 = p12.get_pixmap(dpi=300, clip=clip_q46)
pix_q46.save(str(dest_dir / "epcar_2020_q46_fig1.png"))

# 5. Q47, Q48
Image.open(test_dir / "p13_xref_108_594x594.png").save(dest_dir / "epcar_2020_q47_fig1.png", "PNG", optimize=True)
Image.open(test_dir / "p13_xref_109_1154x649.png").save(dest_dir / "epcar_2020_q48_fig1.png", "PNG", optimize=True)

print("[✓] EPCAR 2020: 9 figuras reais aplicadas com sucesso!")
