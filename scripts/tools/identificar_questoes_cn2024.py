from PIL import Image
from pathlib import Path

pages_dir = Path("D:/dev/LemmaS/data/imagens/colegio_naval/pages_2024")

for i in range(2, 12):
    p = pages_dir / f"p{i}.png"
    if p.exists():
        im = Image.open(p)
        # Recorta o topo da coluna esquerda e topo da coluna direita (para ver número das questões)
        # im tem tamanho ~ 1240 x 1754 (150 DPI)
        q_left = im.crop((30, 20, 550, 150))
        q_right = im.crop((600, 20, 1150, 150))
        q_left.save(pages_dir / f"p{i}_top_left.png")
        q_right.save(pages_dir / f"p{i}_top_right.png")

print("Top headers saved!")
