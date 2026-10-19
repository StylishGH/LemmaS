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

# 1. EsPCEx 2022
pdf22 = PROJECT_ROOT / "data" / "sources" / "espcex" / "raw" / "2022" / "provas" / "2022 PROVA DIA 2 MODELO D.pdf"
doc22 = fitz.open(str(pdf22))
dir2022 = PROJECT_ROOT / "data" / "imagens" / "espcex" / "2022"
dir2022.mkdir(parents=True, exist_ok=True)

# Q03 e Q04: xref 13 (hipérbole)
img_q03_04 = Image.open(fitz.io.BytesIO(doc22.extract_image(13)["image"]))
img_q03_04.save(dir2022 / "espcex_2022_q03_fig1.png", "PNG", optimize=True)
img_q03_04.save(dir2022 / "espcex_2022_q04_fig1.png", "PNG", optimize=True)

# Q07: xref 20 (alunos)
img_q07 = Image.open(fitz.io.BytesIO(doc22.extract_image(20)["image"]))
img_q07.save(dir2022 / "espcex_2022_q07_fig1.png", "PNG", optimize=True)
print("[✓] EsPCEx 2022: Q03, Q04, Q07 figuras reais gravadas!")

# 2. EsPCEx 2023
dir2023 = PROJECT_ROOT / "data" / "imagens" / "espcex" / "2023"
dir2023.mkdir(parents=True, exist_ok=True)
test_dir = PROJECT_ROOT / "data" / "imagens" / "espcex" / "test_extract"

Image.open(test_dir / "espcex23_xref10_p4.png").save(dir2023 / "espcex_2023_q06_fig1.png", "PNG", optimize=True)
Image.open(test_dir / "espcex23_xref18_p6.png").save(dir2023 / "espcex_2023_q10_fig1.png", "PNG", optimize=True)
Image.open(test_dir / "espcex23_xref32_p10.png").save(dir2023 / "espcex_2023_q18_fig1.png", "PNG", optimize=True)
print("[✓] EsPCEx 2023: Q06, Q10, Q18 figuras reais gravadas!")
