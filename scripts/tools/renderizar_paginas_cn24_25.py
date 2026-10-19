import sys
from pathlib import Path
import fitz

PROJECT_ROOT = Path(__file__).resolve().parents[2]

for ano in ["2024", "2025"]:
    pdf_path = PROJECT_ROOT / "data" / "sources" / "colegio_naval" / "raw" / ano / "provas" / f"{ano}-colegio-naval-1-dia-matematica-e-ingles-amarela.pdf"
    doc = fitz.open(str(pdf_path))
    out_dir = PROJECT_ROOT / "data" / "imagens" / "colegio_naval" / f"pages_{ano}"
    out_dir.mkdir(parents=True, exist_ok=True)
    
    # Salva cada uma das 10 primeiras páginas como imagem
    for i in range(min(11, len(doc))):
        pix = doc[i].get_pixmap(dpi=150)
        pix.save(str(out_dir / f"p{i+1}.png"))
        
    print(f"[✓] CN {ano} páginas 1 a 11 renderizadas em data/imagens/colegio_naval/pages_{ano}/")
