import fitz

PROJECT_ROOT = "D:/dev/LemmaS"
pdf_path = f"{PROJECT_ROOT}/data/sources/colegio_naval/raw/2023/provas/2023-colegio-naval-1-dia-matematica-e-ingles-amarela.pdf"
doc = fitz.open(pdf_path)

dest_dir = f"{PROJECT_ROOT}/data/imagens/colegio_naval/2023"

# Q14 (Page 4): x from 300 to 540, y from 105 to 305
p4 = doc[3]
clip_q14 = fitz.Rect(300, 105, 540, 305)
pix_q14 = p4.get_pixmap(dpi=300, clip=clip_q14)
pix_q14.save(f"{dest_dir}/colegio_naval_2023_q14_fig1.png")

# Q20 (Page 5): x from 300 to 540, y from 105 to 260
p5 = doc[4]
clip_q20 = fitz.Rect(300, 105, 540, 260)
pix_q20 = p5.get_pixmap(dpi=300, clip=clip_q20)
pix_q20.save(f"{dest_dir}/colegio_naval_2023_q20_fig1.png")

print("Recorte perfeito gravado!")
