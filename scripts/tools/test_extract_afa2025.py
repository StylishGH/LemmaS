import sys
from pathlib import Path
import fitz
from PIL import Image
import io

PROJECT_ROOT = Path(__file__).resolve().parents[2]
pdf_path = PROJECT_ROOT / "data" / "sources" / "afa" / "raw" / "2025" / "provas" / "2025-26-afa-provas-de-lingua-inglesa-fisica-lingua-portuguesa-matematica-e-redacao.pdf"
doc = fitz.open(str(pdf_path))

out_dir = PROJECT_ROOT / "data" / "imagens" / "afa" / "test_extract"
out_dir.mkdir(parents=True, exist_ok=True)

for p_idx, p_num in enumerate([7, 8, 11]):
    page = doc[p_num - 1]
    for img in page.get_images():
        xref = img[0]
        idict = doc.extract_image(xref)
        rects = page.get_image_rects(xref)
        fname = f"page_{p_num}_xref_{xref}_{idict['width']}x{idict['height']}.{idict['ext']}"
        fpath = out_dir / fname
        fpath.write_bytes(idict["image"])
        print(f"Saved {fname} | rects: {rects}")
