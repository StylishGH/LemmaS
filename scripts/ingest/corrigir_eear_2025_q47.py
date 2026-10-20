import sys
import fitz
import urllib.request
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))
from src.database.db import get_supabase

pdf_path = Path("data/sources/eear/raw/2025/prova/2025-eear-1-concurso-port-ing-mat-fis.pdf")
doc = fitz.open(pdf_path)
p8 = doc[7] # Página 8

# Renderiza a figura da Q47 (xref 62: círculo com 4 triângulos equiláteros) a 300 DPI
rect_q47 = p8.get_image_rects(62)[0]
clip = fitz.Rect(rect_q47.x0 - 2, rect_q47.y0 - 2, rect_q47.x1 + 2, rect_q47.y1 + 2)
pix = p8.get_pixmap(dpi=300, clip=clip)

out_file = Path("data/imagens/eear/2025/eear_2025_q47_fig1.png")
pix.save(str(out_file))
print(f"[✓] Figura real da Q47 salva: {pix.width}x{pix.height} ({out_file.stat().st_size/1024:.1f} KB)")

# Upload para Supabase Storage com upsert
sp = get_supabase()
bucket = "questoes-imagens"
remoto = "eear/2025/eear_2025_q47_fig1.png"

with open(out_file, "rb") as f:
    data = f.read()

sp.storage.from_(bucket).upload(
    remoto,
    data,
    file_options={"content-type": "image/png", "upsert": "true"}
)

cdn_url = f"https://gzlzwqknwfgrsnyvgpnv.supabase.co/storage/v1/object/public/{bucket}/{remoto}"
with urllib.request.urlopen(urllib.request.Request(cdn_url, headers={"User-Agent": "LemmaS-Bot"})) as resp:
    print(f"[✓] Storage CDN 200 OK: {cdn_url} ({len(resp.read())} bytes)")

print("[✓] EEAR 2025 Q47 corrigida com sucesso!")
