import sys
import fitz
import urllib.request
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))
from src.database.db import get_supabase

pdf_path = Path("data/sources/epcar/raw/2025/provas/2025-26-epcar-provas-de-lingua-inglesa-lingua-portuguesa-matematica-e-redacao-a.pdf")
doc = fitz.open(pdf_path)
p5 = doc[4]

croqui_rect = fitz.Rect(30, 450, 290, 580)
pix = p5.get_pixmap(dpi=300, clip=croqui_rect)
out_file = Path("data/imagens/epcar/2025/epcar_2025_q18_fig1.png")
pix.save(str(out_file))
print(f"[✓] Croqui exato da Q18 salvo: {pix.width}x{pix.height} ({out_file.stat().st_size/1024:.1f} KB)")

# Upload para Supabase Storage
sp = get_supabase()
bucket = "questoes-imagens"
remoto = "epcar/2025/epcar_2025_q18_fig1.png"

with open(out_file, "rb") as f:
    data = f.read()

sp.storage.from_(bucket).upload(
    remoto,
    data,
    file_options={"content-type": "image/png", "upsert": "true"}
)

cdn_url = f"https://gzlzwqknwfgrsnyvgpnv.supabase.co/storage/v1/object/public/{bucket}/{remoto}"
with urllib.request.urlopen(urllib.request.Request(cdn_url, headers={"User-Agent": "LemmaS-Bot"})) as resp:
    print(f"[✓] Teste CDN 200 OK: {cdn_url} ({len(resp.read())} bytes)")
