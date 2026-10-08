"""Inicializador do pacote backend da plataforma LEMMAS.

Garante que o diretório backend esteja no sys.path para importações relativas e absolutas.
"""

from pathlib import Path
import sys

_backend_dir = str(Path(__file__).resolve().parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)
