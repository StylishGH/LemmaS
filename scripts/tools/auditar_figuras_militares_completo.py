import sys
from pathlib import Path
import hashlib
from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / "backend" / ".env")

from app.core.config import get_supabase_client

sb = get_supabase_client()
mil_bancas = ['AFA','EEAR','EFOMM','ESA','EsPCEx','ESPCEX','IME','ITA','Colégio Naval','COLEGIO NAVAL','CN','Escola Naval','ESCOLA NAVAL','EN','EPCAR']

res = sb.table("questoes").select("id,mathnet_id,banca,ano,figura_path,enunciado").in_("banca", mil_bancas).not_.is_("figura_path", "null").execute()
questoes = [r for r in res.data if (r.get("figura_path") or "").strip()]

print(f"Total de questões militares com figura_path: {len(questoes)}")

BAD_LOGOS = {
    '7707327fb5c9fe6f176c45cd7ab512be7aaa8abb9c7c43b05743d46cce169a70': 'AFA_LOGO_128x157',
    'ed5768f9f1db212a81ddbbe2c0cef8c3ec56741e9a7c9648438cbb2afb434f7f': 'EPCAR_LOGO_145x119',
    '2b7f46a69d63864b205dea7a69c66b598fd094a99a21af79b757e1f2dcbe0cf5': 'ESPCEX_LOGO_125x160',
    'd881bf5b60722f4cb82156c942a05ed7586ad461e665f44794f65d5a2903e145': 'ESPCEX_2022_HEADER_367x478',
    'b223ece143c126f5522e9a0d55a96cefe65c52f7658c073910fd36d26763c5a3': 'ESPCEX_2023_HEADER_2049x500',
}

full_page_scans = []
corrupted_by_logo = []
missing_files = []
ok_files = []

for q in questoes:
    fpath_str = q.get("figura_path", "")
    if fpath_str.startswith("/"):
        local_path = PROJECT_ROOT / fpath_str.lstrip("/")
    else:
        local_path = PROJECT_ROOT / fpath_str
        
    if not local_path.exists():
        # Tenta em data/
        local_path = PROJECT_ROOT / "data" / fpath_str.lstrip("/")
        
    if not local_path.exists():
        missing_files.append((q, fpath_str))
        continue
        
    data = local_path.read_bytes()
    h = hashlib.sha256(data).hexdigest()
    
    if h in BAD_LOGOS:
        corrupted_by_logo.append((q, BAD_LOGOS[h], local_path))
        continue
        
    try:
        im = Image.open(local_path)
        # Check if full page scan (> 1400 x 2000)
        if im.width >= 1400 and im.height >= 2000:
            full_page_scans.append((q, f"{im.width}x{im.height}", local_path))
            continue
        # Check if tiny icon
        if im.width < 80 or im.height < 60:
            corrupted_by_logo.append((q, f"TINY_{im.width}x{im.height}", local_path))
            continue
    except Exception:
        pass
        
    ok_files.append((q, local_path))

print(f"\n[!] Corrompidas por LOGO: {len(corrupted_by_logo)}")
for q, reason, p in corrupted_by_logo:
    print(f"  - {q['banca']} {q['ano']} (ID: {q['id']}, mathnet: {q['mathnet_id']}) -> {reason} ({p.name})")

print(f"\n[!] SCANS DE PÁGINA INTEIRA (sem recorte): {len(full_page_scans)}")
for q, dim, p in full_page_scans:
    print(f"  - {q['banca']} {q['ano']} (ID: {q['id']}, mathnet: {q['mathnet_id']}) -> {dim} ({p.name})")

print(f"\n[!] Arquivos não encontrados no disco: {len(missing_files)}")
for q, p in missing_files:
    print(f"  - {q['banca']} {q['ano']} (ID: {q['id']}) -> {p}")

print(f"\n[✓] Figuras aparentemente legítimas: {len(ok_files)}")
