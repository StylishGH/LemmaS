import sys
import io
from pathlib import Path

if sys.platform == "win32" and hasattr(sys.stdout, "buffer") and not getattr(sys.stdout, "_is_utf8_wrapped", False):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stdout._is_utf8_wrapped = True
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")
    sys.stderr._is_utf8_wrapped = True

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from src.database.db import get_supabase
from scripts.ingest.inserir_questoes_militares_2026 import sincronizar_json_para_db

def main():
    sp = get_supabase()
    print("[*] Removendo questões anteriores com colisão de Escola Naval 2026...")
    res = sp.table("questoes").delete().eq("banca", "Escola Naval").eq("ano", 2026).execute()
    print(f"[✓] Removidas questões antigas.")

    json_path = PROJECT_ROOT / "data" / "sources" / "escola_naval" / "processed" / "2026" / "questoes.json"
    print(f"[*] Sincronizando {json_path}...")
    sincronizar_json_para_db(json_path)

if __name__ == "__main__":
    main()
