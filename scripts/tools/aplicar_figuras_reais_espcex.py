import sys
from pathlib import Path
from PIL import Image

for s in (getattr(sys, "stdout", None), getattr(sys, "stderr", None)):
    if s and hasattr(s, "reconfigure"):
        try:
            s.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

PROJECT_ROOT = Path(__file__).resolve().parents[2]
test_dir = PROJECT_ROOT / "data" / "imagens" / "espcex" / "test_extract"

# EsPCEx 2024
dir2024 = PROJECT_ROOT / "data" / "imagens" / "espcex" / "2024"
dir2024.mkdir(parents=True, exist_ok=True)
Image.open(test_dir / "espcex_2024_q12.png").save(dir2024 / "espcex_2024_q12_fig1.png", "PNG", optimize=True)
Image.open(test_dir / "espcex_2024_q15.png").save(dir2024 / "espcex_2024_q15_fig1.png", "PNG", optimize=True)
Image.open(test_dir / "espcex_2024_xref118.png").save(dir2024 / "espcex_2024_q19_fig1.png", "PNG", optimize=True)

# EsPCEx 2025
dir2025 = PROJECT_ROOT / "data" / "imagens" / "espcex" / "2025"
dir2025.mkdir(parents=True, exist_ok=True)
Image.open(test_dir / "espcex_2025_q03_real.png").save(dir2025 / "espcex_2025_q03_fig1.png", "PNG", optimize=True)
Image.open(test_dir / "espcex_2025_q18_real.png").save(dir2025 / "espcex_2025_q18_fig1.png", "PNG", optimize=True)

print("[✓] EsPCEx 2024 e 2025 figuras reais salvas com sucesso!")
