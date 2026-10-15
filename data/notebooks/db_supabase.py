"""
Atalho de conveniência para data/notebooks/db_supabase.py.
Importa diretamente tudo de src.database.db.
"""

import sys
from pathlib import Path

NOTEBOOK_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = NOTEBOOK_DIR.parent.parent

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.database.db import *
