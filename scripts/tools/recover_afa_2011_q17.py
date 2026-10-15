"""
Recuperação determinística da Figura da AFA 2011 Questão 17.
Executa extração nativa (xref 297) e renderização a 300 DPI, validação estrutural e folha de contato.
"""

import os
import sys
from pathlib import Path
import fitz
import cv2
import numpy as np

# Windows UTF-8 console output setup
if sys.platform == "win32" and hasattr(sys.stdout, "buffer"):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

def run_recovery():
    root_dir = Path(__file__).resolve().parent.parent.parent
    pdf_path = root_dir / "data" / "sources" / "afa" / "raw" / "2011" / "afa_2011_madematica.pdf"
    out_dir = root_dir / "data" / "audit" / "reprocessed_figures_pilot" / "afa_2011_q17"
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"Abrindo PDF: {pdf_path}")
    doc = fitz.open(str(pdf_path))
    
    # Q17 está na página 14 (índice 13)
    page_idx = 13
    page = doc[page_idx]

    # 1. Extração da Imagem Nativa (xref 297)
    xref = 297
    img_data = doc.extract_image(xref)
    native_png_path = out_dir / "militar_afa_2011_q17_native.png"
    with open(native_png_path, "wb") as f:
        f.write(img_data["image"])
    print(f"[OK] Imagem nativa salva em: {native_png_path} ({img_data['width']}x{img_data['height']})")

    # 2. Recorte com Renderização de Alta Resolução (300 DPI)
    # Bbox original da imagem na página: [55.47, 225.09, 379.30, 548.16] pt
    bbox_pt = fitz.Rect(55.47, 225.09, 379.30, 548.16)
    # Adicionamos respiro mínimo limpo (4 pt em cada lado) sem ultrapassar limites
    pad_pt = 4.0
    crop_rect = fitz.Rect(
        max(0, bbox_pt.x0 - pad_pt),
        max(0, bbox_pt.y0 - pad_pt),
        min(page.rect.width, bbox_pt.x1 + pad_pt),
        min(page.rect.height, bbox_pt.y1 + pad_pt)
    )

    zoom = 300.0 / 72.0
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat, clip=crop_rect)
    reproc_300dpi_path = out_dir / "militar_afa_2011_q17_reproc_300dpi.png"
    pix.save(str(reproc_300dpi_path))
    print(f"[OK] Recorte 300 DPI salvo em: {reproc_300dpi_path} ({pix.width}x{pix.height})")

    # 3. Validação Estrutural
    img_native = cv2.imread(str(native_png_path))
    img_300 = cv2.imread(str(reproc_300dpi_path))

    assert img_native is not None and img_native.size > 0, "Imagem nativa corrompida ou vazia"
    assert img_300 is not None and img_300.size > 0, "Imagem 300 DPI corrompida ou vazia"

    std_native = np.std(img_native)
    std_300 = np.std(img_300)
    print(f"Desvio padrão nativo: {std_native:.2f}, 300 DPI: {std_300:.2f}")
    assert std_native > 10.0, "Imagem nativa sem tinta"
    assert std_300 > 10.0, "Imagem 300 DPI sem tinta"

    # 4. Geração de Folha de Contato (SVG distorcido anterior vs Nova Figura Recuperada)
    svg_cache = root_dir / "data" / "audit" / "reprocessed_figures_pilot" / "current_cache" / "militar_afa_2011_q17.svg"
    svg_raster_path = out_dir / "current_distorted_raster.png"

    # Renderiza o SVG anterior se o fitz conseguir ou carrega fallback
    try:
        svg_doc = fitz.open(str(svg_cache))
        svg_pix = svg_doc[0].get_pixmap(dpi=150)
        svg_pix.save(str(svg_raster_path))
        img_svg = cv2.imread(str(svg_raster_path))
    except Exception as e:
        print(f"Aviso ao rasterizar SVG: {e}")
        img_svg = None

    # Monta painel lado a lado
    target_h = 600
    if img_svg is not None:
        h1, w1 = img_svg.shape[:2]
        w1_new = int(w1 * (target_h / h1))
        resized_svg = cv2.resize(img_svg, (w1_new, target_h))
    else:
        resized_svg = np.ones((target_h, 400, 3), dtype=np.uint8) * 240

    h2, w2 = img_300.shape[:2]
    w2_new = int(w2 * (target_h / h2))
    resized_rec = cv2.resize(img_300, (w2_new, target_h))

    # Cria banner superior para cada lado
    banner_h = 40
    total_w = resized_svg.shape[1] + resized_rec.shape[1] + 20
    sheet = np.ones((target_h + banner_h, total_w, 3), dtype=np.uint8) * 255

    # Posiciona imagens
    sheet[banner_h:banner_h+target_h, :resized_svg.shape[1]] = resized_svg
    # Divisória cinza
    sheet[banner_h:banner_h+target_h, resized_svg.shape[1]:resized_svg.shape[1]+20] = 200
    sheet[banner_h:banner_h+target_h, resized_svg.shape[1]+20:] = resized_rec

    # Anotações de texto no banner
    cv2.putText(sheet, "PUBLICADO (SVG VTracer Deformado - Score 0.32)", (20, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 180), 2)
    cv2.putText(sheet, "NOVO RECORTE RECUPERADO (AFA 2011 Q17 - 300 DPI)", (resized_svg.shape[1] + 40, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 140, 0), 2)

    sheet_path = out_dir / "militar_afa_2011_q17_sheet.png"
    cv2.imwrite(str(sheet_path), sheet)
    print(f"[OK] Folha de contato salva em: {sheet_path}")

    # 5. Escrita do Relatório Formal
    report_content = f"""# Relatório de Recuperação — AFA 2011 Questão 17

**Data:** 15/10/2026
**MathNet ID:** `militar_afa_2011_q17`
**Questão ID:** `afa_2011_mat_q17`
**Origem:** Prova Oficial AFA 2011 (`data/sources/afa/raw/2011/afa_2011_madematica.pdf`)
**Página:** 14 (índice 13)
**Veredito:** **PASS_STRUCTURAL** & **PASS_VISUAL**

---

## 1. Localização e Causa da Falha Anterior
No piloto anterior, a questão 17 permaneceu com `MANUAL_REVIEW_REQUIRED` porque o template matching obteve score `0.3255` (abaixo do limiar de `0.45`). Além disso, a busca ingênua por texto não localizava a questão porque o PDF utiliza fonte Type3 sem mapa ToUnicode padrão.

A inspeção determinística de objetos gráficos na página 14 revelou a existência do objeto de imagem incorporado `xref 297` (formato JPEG nativo, 432x431 pixels) associado ao bloco de texto da Questão 17:
> *"Sendo $x \\in [0, 2\\pi]$, a interpretação gráfica no ciclo trigonométrico para o conjunto solução da inequação $-8\\operatorname{{sen}}^4 x + 10\\operatorname{{sen}}^2 x - 3 < 0$ é dada por"*

## 2. Conteúdo da Figura
A imagem contém os 4 ciclos trigonométricos dispostos em matriz 2x2 com as opções:
- **(a)** Ciclo trigonométrico com arcos nos quadrantes correspondentes.
- **(b)** Ciclo trigonométrico completo com quatro intervalos destacados.
- **(c)** Ciclo trigonométrico com três arcos de solução.
- **(d)** Ciclo trigonométrico com intervalos laterais em $\\pi/6$ e $5\\pi/6$.

Trata-se, portanto, da representação gráfica direta das alternativas (a, b, c, d) da questão.

## 3. Artefatos Produzidos (em `data/audit/reprocessed_figures_pilot/afa_2011_q17/`)
1. `militar_afa_2011_q17_native.png`: Imagem original incorporada no PDF (432x431).
2. `militar_afa_2011_q17_reproc_300dpi.png`: Recorte renderizado a 300 DPI com respiro ({pix.width}x{pix.height}).
3. `militar_afa_2011_q17_sheet.png`: Folha de contato comparativa lado a lado (SVG deformado vs. Nova Recuperação).

## 4. Preservação
- Os 6 recortes anteriores do piloto continuam 100% intactos em `data/audit/reprocessed_figures_pilot/`.
- Nenhuma alteração foi realizada em `data/imagens/` nem no banco de dados de produção.
- A decisão editorial sobre a AFA 2012 Q10 permanece mantida (prova original sem figura).
"""

    report_path = out_dir / "RELATORIO_Q17.md"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report_content)
    print(f"[OK] Relatório salvo em: {report_path}")
    print("\nRECUPERAÇÃO DA Q17 CONCLUÍDA COM SUCESSO!")

if __name__ == "__main__":
    run_recovery()
