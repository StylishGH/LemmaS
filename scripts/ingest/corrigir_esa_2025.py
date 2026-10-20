import sys
import shutil
import urllib.request
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from src.database.db import get_supabase

# 1. Copia as imagens nítidas da pasta inspecao para data/imagens/esa/2025
base_dir = PROJECT_ROOT / "data" / "imagens" / "esa" / "2025"
insp_dir = base_dir / "inspecao"

shutil.copyfile(insp_dir / "p2_xref36_hi.png", base_dir / "esa_2025_q03_fig1.png")
shutil.copyfile(insp_dir / "p5_xref52_hi.png", base_dir / "esa_2025_q13_fig1.png")
shutil.copyfile(insp_dir / "p5_xref55_hi.png", base_dir / "esa_2025_q14_fig1.png")

# Remove arquivos espúrios
for fake in ["esa_2025_q04_fig1.png", "esa_2025_q07_fig1.png"]:
    fake_path = base_dir / fake
    if fake_path.exists():
        fake_path.unlink()
        print(f"[✓] Removido arquivo espúrio local: {fake}")

# 2. Upload para Supabase Storage
sp = get_supabase()
bucket = "questoes-imagens"

targets = [
    ("esa/2025/esa_2025_q03_fig1.png", base_dir / "esa_2025_q03_fig1.png"),
    ("esa/2025/esa_2025_q13_fig1.png", base_dir / "esa_2025_q13_fig1.png"),
    ("esa/2025/esa_2025_q14_fig1.png", base_dir / "esa_2025_q14_fig1.png"),
]

for remoto, local in targets:
    with open(local, "rb") as f:
        data = f.read()
    sp.storage.from_(bucket).upload(
        remoto,
        data,
        file_options={"content-type": "image/png", "upsert": "true"}
    )
    cdn_url = f"https://gzlzwqknwfgrsnyvgpnv.supabase.co/storage/v1/object/public/{bucket}/{remoto}"
    with urllib.request.urlopen(urllib.request.Request(cdn_url, headers={"User-Agent": "LemmaS-Bot"})) as resp:
        print(f"[✓] Storage CDN 200 OK: {remoto} ({len(resp.read())} bytes)")

# 3. Atualizar no banco Supabase
print("[*] Atualizando questoes no banco Supabase...")
# Q04 e Q07 ficam com figura_path = None
sp.table("questoes").update({"figura_path": None}).eq("id", 1792).execute()
print("  [✓] Questão #1792 (ESA 2025 Q04) -> figura_path = None")

sp.table("questoes").update({"figura_path": None}).eq("id", 1795).execute()
print("  [✓] Questão #1795 (ESA 2025 Q07) -> figura_path = None")

# Q03, Q13, Q14 confirmam figura_path
sp.table("questoes").update({"figura_path": "/data/imagens/esa/2025/esa_2025_q03_fig1.png"}).eq("id", 1791).execute()
sp.table("questoes").update({"figura_path": "/data/imagens/esa/2025/esa_2025_q13_fig1.png"}).eq("id", 1801).execute()
sp.table("questoes").update({"figura_path": "/data/imagens/esa/2025/esa_2025_q14_fig1.png"}).eq("id", 1802).execute()
print("  [✓] Questões #1791, #1801, #1802 confirmadas com imagens em 300 DPI!")

print("\n[✓] ESA 2025 100% Saneada e Corrigida!")
