import sys
from pathlib import Path
import fitz

PROJECT_ROOT = Path(__file__).resolve().parents[2]
pdf_path = PROJECT_ROOT / "data" / "sources" / "espcex" / "raw" / "2024" / "espcex_2024_madematica.pdf"
doc = fitz.open(str(pdf_path))

out_dir = PROJECT_ROOT / "data" / "imagens" / "espcex" / "test_extract"
out_dir.mkdir(parents=True, exist_ok=True)

# Page 3: Q12 -> xref 85
(out_dir / "espcex_2024_q12.png").write_bytes(doc.extract_image(85)["image"])
# Page 4: Q15 -> xref 102
(out_dir / "espcex_2024_q15.png").write_bytes(doc.extract_image(102)["image"])
# Page 5: xref 118
(out_dir / "espcex_2024_xref118.png").write_bytes(doc.extract_image(118)["image"])

print("[✓] Extraídas imagens da EsPCEx 2024 com sucesso!")
