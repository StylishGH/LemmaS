import sys
from pathlib import Path

# Adiciona caminhos canonicos ao sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"

for path in [str(ROOT_DIR), str(BACKEND_DIR)]:
    if path not in sys.path:
        sys.path.insert(0, path)
