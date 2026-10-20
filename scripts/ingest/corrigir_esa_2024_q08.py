import sys
import fitz
import urllib.request
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))
from src.database.db import get_supabase

pdf_path = Path("data/sources/esa/raw/2024/provas/prova-2024-25-portugues-matematica-historia-geografia-e-ingles.pdf")
doc = fitz.open(pdf_path)
p3 = doc[2] # Página 3

# Renderiza a figura da Q08 (xref 45: garagem com telhado e cumeeira) a 300 DPI
rect_q08 = p3.get_image_rects(45)[0]
clip = fitz.Rect(rect_q08.x0 - 2, rect_q08.y0 - 2, rect_q08.x1 + 2, rect_q08.y1 + 2)
pix = p3.get_pixmap(dpi=300, clip=clip)

out_file = Path("data/imagens/esa/2024/esa_2024_q08_fig1.png")
pix.save(str(out_file))
print(f"[✓] Figura real da cumeeira (Q08) salva: {pix.width}x{pix.height} ({out_file.stat().st_size/1024:.1f} KB)")

# Upload para Supabase Storage com upsert
sp = get_supabase()
bucket = "questoes-imagens"
remoto = "esa/2024/esa_2024_q08_fig1.png"

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

print("[✓] ESA 2024 Q08 corrigida com sucesso!")
