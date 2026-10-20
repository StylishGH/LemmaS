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

# 1. EsPCEx 2022 Dia 2
pdf22 = PROJECT_ROOT / "data" / "sources" / "espcex" / "raw" / "2022" / "provas" / "2022 PROVA DIA 2 MODELO D.pdf"
doc22 = fitz.open(str(pdf22))
print(f"=== EsPCEx 2022 Dia 2 ({len(doc22)} páginas) ===")
for i, page in enumerate(doc22):
    txt = page.get_text()
    if "hipérbole" in txt.lower() or "questões 3 e 4" in txt.lower() or "421 alunos" in txt.lower():
        print(f"Encontrado na página {i+1}:")
        imgs = page.get_images()
        print(f"  Imagens: {len(imgs)}")
        for img in imgs:
            xref = img[0]
            idict = doc22.extract_image(xref)
            print(f"    xref {xref}: {idict['width']}x{idict['height']} rects: {page.get_image_rects(xref)}")

# 2. EsPCEx 2023 Dia 2
pdf23 = PROJECT_ROOT / "data" / "sources" / "espcex" / "raw" / "2023" / "provas" / "2023-modelo-d-2-dia-de-prova.pdf"
if not pdf23.exists():
    pdf23 = PROJECT_ROOT / "data" / "sources" / "espcex" / "raw" / "2023" / "provas" / "2023-modelo-a-1-dia-de-prova.pdf"

doc23 = fitz.open(str(pdf23))
print(f"\n=== EsPCEx 2023 ({pdf23.name}, {len(doc23)} páginas) ===")
for i, page in enumerate(doc23):
    txt = page.get_text()
    if "gráfico da função" in txt.lower() or "reservatório" in txt.lower() or "treinamento físico" in txt.lower():
        print(f"Encontrado na página {i+1}:")
        imgs = page.get_images()
        print(f"  Imagens: {len(imgs)}")
        for img in imgs:
            xref = img[0]
            idict = doc23.extract_image(xref)
            print(f"    xref {xref}: {idict['width']}x{idict['height']} rects: {page.get_image_rects(xref)}")
