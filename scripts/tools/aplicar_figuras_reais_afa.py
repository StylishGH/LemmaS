import sys
from pathlib import Path
from PIL import Image

for s in (getattr(sys, "stdout", None), getattr(sys, "stderr", None)):
    if s and hasattr(s, "reconfigure"):
        try:
            s.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

PROJECT_ROOT = Path(__file__).resolve().parents[2]
test_dir = PROJECT_ROOT / "data" / "imagens" / "afa" / "test_extract"

# Carrega as imagens extraídas da prova oficial
img_q18 = Image.open(test_dir / "page_7_xref_98_631x489.jpeg")
img_q28 = Image.open(test_dir / "page_11_xref_114_590x522.jpeg")
img_q29 = Image.open(test_dir / "page_11_xref_115_800x266.jpeg")

# Para a Q20, vamos compor as taças 103 e 104 lado a lado (com a tromba e a esfera)
# xref 103: 474x367, xref 104: 474x286
im103 = Image.open(test_dir / "page_8_xref_103_474x367.jpeg")
im104 = Image.open(test_dir / "page_8_xref_104_474x286.jpeg")

# Altura máxima unificada para alinhamento perfeito
h_target = max(im103.height, im104.height)
# Cria canvas branco
w_total = im103.width + im104.width + 40
composite_q20 = Image.new("RGB", (w_total, h_target), (255, 255, 255))
# Cola taça 1 (início) e taça 2 (final)
y_offset_103 = (h_target - im103.height) // 2
y_offset_104 = (h_target - im104.height) // 2
composite_q20.paste(im103, (0, y_offset_103))
composite_q20.paste(im104, (im103.width + 40, y_offset_104))

# Salva para 2025 e 2024
for ano in ["2024", "2025"]:
    dest_dir = PROJECT_ROOT / "data" / "imagens" / "afa" / ano
    dest_dir.mkdir(parents=True, exist_ok=True)
    
    img_q18.save(dest_dir / f"afa_{ano}_q18_fig1.png", "PNG", optimize=True)
    composite_q20.save(dest_dir / f"afa_{ano}_q20_fig1.png", "PNG", optimize=True)
    img_q28.save(dest_dir / f"afa_{ano}_q28_fig1.png", "PNG", optimize=True)
    img_q29.save(dest_dir / f"afa_{ano}_q29_fig1.png", "PNG", optimize=True)
    print(f"[✓] Gravadas figuras reais para AFA {ano} (Q18, Q20, Q28, Q29)")

print("[✓] Concluído com sucesso!")
