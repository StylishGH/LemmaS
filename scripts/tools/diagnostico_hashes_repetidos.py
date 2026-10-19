import sys
from pathlib import Path
import hashlib
from collections import defaultdict
from PIL import Image

for s in (getattr(sys, "stdout", None), getattr(sys, "stderr", None)):
    if s and hasattr(s, "reconfigure"):
        try:
            s.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

PROJECT_ROOT = Path(__file__).resolve().parents[2]
img_root = PROJECT_ROOT / "data" / "imagens"

hashes = defaultdict(list)
for f in img_root.rglob("*.png"):
    try:
        h = hashlib.sha256(f.read_bytes()).hexdigest()
        hashes[h].append(f)
    except Exception:
        pass

print("=== IMAGENS COM REPETIÇÃO (SUSPEITAS DE LOGO / CABEÇALHO) ===")
for h, flist in sorted(hashes.items(), key=lambda x: len(x[1]), reverse=True):
    if len(flist) >= 2:
        f0 = flist[0]
        try:
            im = Image.open(f0)
            dim = f"{im.width}x{im.height}"
        except Exception:
            dim = "unknown"
        print(f"\nHash: {h} | Count: {len(flist)} | Dim: {dim}")
        for f in flist:
            rel = f.relative_to(PROJECT_ROOT)
            print(f"  {rel}")
