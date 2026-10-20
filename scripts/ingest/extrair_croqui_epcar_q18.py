import sys
import fitz
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

pdf_path = Path("data/sources/epcar/raw/2025/provas/2025-26-epcar-provas-de-lingua-inglesa-lingua-portuguesa-matematica-e-redacao-a.pdf")
doc = fitz.open(pdf_path)
p5 = doc[4] # Página 5

# Procura o texto "18 - Um pai" e "A área destinada ao filho 4"
# para obter o bounding box exato da Questão 18
rects_q18 = p5.search_for("18 - Um pai")
rects_end = p5.search_for("A área destinada ao filho 4")

print("Q18 start:", rects_q18)
print("Q18 end:", rects_end)

# O croqui fica entre y ~ 410 e y ~ 530
croqui_rect = fitz.Rect(50, 420, 280, 520)
pix = p5.get_pixmap(dpi=300, clip=croqui_rect)

out_file = Path("data/imagens/epcar/2025/epcar_2025_q18_fig1.png")
pix.save(str(out_file))
print(f"[✓] Croqui real da Q18 salvo em {out_file}: {pix.width}x{pix.height} ({out_file.stat().st_size/1024:.1f} KB)")
