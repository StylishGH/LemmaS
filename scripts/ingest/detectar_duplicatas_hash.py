import sys
import io
import hashlib
from pathlib import Path
from collections import defaultdict
from PIL import Image

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
military_dirs = ["afa", "espcex", "efomm", "escola_naval", "colegio_naval", "epcar", "eear", "esa", "ime", "ita"]

hashes = defaultdict(list)
total_files = 0

for m in military_dirs:
    target_dir = PROJECT_ROOT / "data" / "imagens" / m
    if not target_dir.exists():
        continue
    for p in target_dir.rglob("*.png"):
        total_files += 1
        with open(p, "rb") as f:
            content = f.read()
        h = hashlib.md5(content).hexdigest()
        hashes[h].append(p)

print(f"Total de arquivos analisados: {total_files}")
duplicados = {h: paths for h, paths in hashes.items() if len(paths) > 1}
print(f"Imagens com mesmo hash (duplicadas em múltiplas questões): {len(duplicados)}")

for h, paths in duplicados.items():
    print(f"\n[HASH {h[:8]}...] presente em {len(paths)} arquivos:")
    for p in paths:
        try:
            with Image.open(p) as img:
                dims = f"{img.size[0]}x{img.size[1]}"
        except:
            dims = "unknown"
        print(f"   - {p.relative_to(PROJECT_ROOT)} ({dims}, {p.stat().st_size/1024:.1f} KB)")
