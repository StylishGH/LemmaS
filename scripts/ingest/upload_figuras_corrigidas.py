import sys
import urllib.request
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from src.database.db import get_supabase

sp = get_supabase()
bucket = "questoes-imagens"

arquivos_para_subir = [
    ("eear/2023/eear_2023_q51_fig1.png", PROJECT_ROOT / "data" / "imagens" / "eear" / "2023" / "eear_2023_q51_fig1.png"),
    ("eear/2023/eear_2023_q52_fig1.png", PROJECT_ROOT / "data" / "imagens" / "eear" / "2023" / "eear_2023_q52_fig1.png"),
    ("eear/2023/eear_2023_q57_fig1.png", PROJECT_ROOT / "data" / "imagens" / "eear" / "2023" / "eear_2023_q57_fig1.png"),
]

for remoto, local in arquivos_para_subir:
    with open(local, "rb") as f:
        data = f.read()
    print(f"[*] Fazendo upload de {remoto} ({len(data)} bytes)...")
    res = sp.storage.from_(bucket).upload(
        remoto,
        data,
        file_options={"content-type": "image/png", "upsert": "true"}
    )
    print(f"  [✓] Upload concluído: {res}")

    cdn_url = f"https://gzlzwqknwfgrsnyvgpnv.supabase.co/storage/v1/object/public/{bucket}/{remoto}"
    req = urllib.request.Request(cdn_url, headers={"User-Agent": "LemmaS-Bot/1.0"})
    try:
        with urllib.request.urlopen(req) as resp:
            print(f"  [✓] Teste CDN 200 OK: {cdn_url} ({len(resp.read())} bytes)")
    except Exception as e:
        print(f"  ❌ Erro ao testar CDN: {e}")

print("\n[✓] Todas as imagens corrigidas sincronizadas no Storage com sucesso!")
