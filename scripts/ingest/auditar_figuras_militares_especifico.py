import sys
import io
import os
from pathlib import Path
from PIL import Image

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
military_dirs = [
    "afa", "espcex", "efomm", "escola_naval", "colegio_naval",
    "epcar", "eear", "esa", "ime", "ita"
]

print("=== AUDITORIA DE FIGURAS MILITARES (DIMENSÕES E QUALIDADE) ===")
total_checked = 0
suspect_logos = []

for m in military_dirs:
    target_dir = PROJECT_ROOT / "data" / "imagens" / m
    if not target_dir.exists():
        continue
    for p in target_dir.rglob("*.png"):
        total_checked += 1
        try:
            with Image.open(p) as img:
                w, h = img.size
                size_kb = p.stat().st_size / 1024
                # Logos militares típicos: 128x157, 175x177, ou quadrados muito pequenos < 160x160
                is_logo = (w == 128 and h == 157) or (w == 175 and h == 177) or (w < 150 and h < 150)
                if is_logo:
                    suspect_logos.append((p.relative_to(PROJECT_ROOT), w, h, size_kb))
                    print(f"🚨 [LOGO/BRASÃO SUSPEITO]: {p.relative_to(PROJECT_ROOT)} ({w}x{h}, {size_kb:.1f} KB)")
                else:
                    # Imagem válida real
                    pass
        except Exception as e:
            print(f"❌ Erro ao abrir {p}: {e}")

print(f"\nTotal de figuras militares verificadas: {total_checked}")
print(f"Total de logos/brasões suspeitos encontrados: {len(suspect_logos)}")

if suspect_logos:
    print("\nLista detalhada de suspeitos:")
    for path, w, h, sz in suspect_logos:
        print(f"  - {path} ({w}x{h}, {sz:.1f} KB)")
