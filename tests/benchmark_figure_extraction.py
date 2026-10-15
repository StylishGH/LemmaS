"""
Benchmark Isolado e Rigoroso de Extração Inteligente de Figuras PDF -> SVG.
Compara:
- Rota A: Exportação Vetorial Nativa (PyMuPDF get_svg_image via set_cropbox)
- Rota B: Extração Direta de Imagens Incorporadas (PyMuPDF doc.extract_image)
- Rota C: Tracing Raster Baseline (PyMuPDF Pixmap 250 DPI -> Lanczos 2x -> Bilateral -> VTracer)

Regras:
- Não altera arquivos de produção nem banco de dados.
- Não faz chamadas de rede ou APIs externas.
- Medição isolada de cada sub-etapa com time.perf_counter().
- Salva resultados em tests/benchmark_output/.
"""

import os
import sys
import time
import json
import base64
import tempfile
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

import fitz  # PyMuPDF
import cv2
import numpy as np
from PIL import Image
import vtracer

BENCHMARK_DIR = Path("tests/benchmark_output")
BENCHMARK_DIR.mkdir(parents=True, exist_ok=True)

TARGETS = [
    {
        "id": "afa_2011_q06",
        "exam": "AFA 2011",
        "question": 6,
        "pdf_path": "data/sources/afa/raw/2011/afa_2011_madematica.pdf",
        "page_idx": 3,  # Page 4
        # Coordenadas reais em pontos PDF
        "pdf_rect": fitz.Rect(158.07, 72.47, 437.67, 283.85),
        "expected_xref": 179,
        # Bbox normalizada (0 a 1000) usada no pipeline anterior
        # Page height = 842.0, width = 595.0
        "norm_bbox": {"ymin": 86, "xmin": 265, "ymax": 337, "xmax": 735},
        "description": "Gráfico de barras 'Distribuição de idades dos cadetes' (título e eixos com números)"
    },
    {
        "id": "afa_2012_q10",
        "exam": "AFA 2012",
        "question": 10,
        "pdf_path": "data/sources/afa/raw/2012/afa_2012_madematica.pdf",
        "page_idx": 11,  # Page 12
        "pdf_rect": fitz.Rect(173.04, 72.0, 423.84, 279.0),
        "expected_xref": 413,
        "norm_bbox": {"ymin": 85, "xmin": 290, "ymax": 331, "xmax": 712},
        "description": "Elipse circunscrita por circunferência no plano cartesiano"
    },
    {
        "id": "afa_2012_q12",
        "exam": "AFA 2012",
        "question": 12,
        "pdf_path": "data/sources/afa/raw/2012/afa_2012_madematica.pdf",
        "page_idx": 12,  # Page 13
        "pdf_rect": fitz.Rect(180.72, 346.80, 416.04, 548.52),
        "expected_xref": 218,
        "norm_bbox": {"ymin": 412, "xmin": 303, "ymax": 651, "xmax": 699},
        "description": "Gráfico cartesiano de função com descontinuidade e eixos x/y"
    },
    {
        "id": "afa_2012_q20",
        "exam": "AFA 2012",
        "question": 20,
        "pdf_path": "data/sources/afa/raw/2012/afa_2012_madematica.pdf",
        "page_idx": 19,  # Page 20
        "pdf_rect": fitz.Rect(206.88, 157.68, 389.88, 250.68),
        "expected_xref": 247,
        "norm_bbox": {"ymin": 187, "xmin": 347, "ymax": 298, "xmax": 655},
        "description": "Tabela com percentuais de acertos por questão"
    }
]

# ==========================================
# IMPLEMENTAÇÃO DAS ROTAS
# ==========================================

def execute_route_a(page: fitz.Page, target_rect: fitz.Rect, out_path: Path, pad: float = 6.0) -> Dict[str, Any]:
    """
    Rota A: Exportação Vetorial Nativa do PyMuPDF via set_cropbox.
    Modifica temporariamente o cropbox da página em memória e chama get_svg_image().
    """
    rect_with_pad = fitz.Rect(
        max(0, target_rect.x0 - pad),
        max(0, target_rect.y0 - pad),
        min(page.rect.width, target_rect.x1 + pad),
        min(page.rect.height, target_rect.y1 + pad)
    )
    
    orig_crop = page.cropbox
    
    t0 = time.perf_counter()
    page.set_cropbox(rect_with_pad)
    svg_content = page.get_svg_image(text_as_path=True)
    page.set_cropbox(orig_crop)
    t1 = time.perf_counter()
    
    t_write_0 = time.perf_counter()
    out_path.write_text(svg_content, encoding="utf-8")
    t_write_1 = time.perf_counter()
    
    file_size = out_path.stat().st_size
    
    # Análise estrutural do SVG gerado
    has_image_tag = "<image" in svg_content
    has_path_tag = "<path" in svg_content
    
    return {
        "route": "Rota A (PyMuPDF SVG Nativo)",
        "extract_ms": (t1 - t0) * 1000,
        "write_ms": (t_write_1 - t_write_0) * 1000,
        "total_ms": (t_write_1 - t0) * 1000,
        "file_size_bytes": file_size,
        "width_pt": rect_with_pad.width,
        "height_pt": rect_with_pad.height,
        "structure": "embedded_image_in_svg" if has_image_tag else "pure_vector_paths",
        "has_path": has_path_tag,
        "has_image": has_image_tag,
        "out_file": str(out_path)
    }

def execute_route_b(doc: fitz.Document, page: fitz.Page, target_rect: fitz.Rect, out_base: Path) -> Dict[str, Any]:
    """
    Rota B: Extração Direta de Imagens Incorporadas no PDF.
    Busca xrefs de imagens dentro ou sobrepostas à bounding box e extrai os bytes originais.
    Também encapsula em SVG limpo (SVG wrapper) para compatibilidade imediata.
    """
    t0 = time.perf_counter()
    
    matching_xref = None
    matching_rect = None
    
    for img_info in page.get_images():
        xref = img_info[0]
        rects = page.get_image_rects(xref)
        for r in rects:
            # Verifica se há sobreposição significativa
            intersect = r & target_rect
            if intersect.is_valid and (intersect.width * intersect.height) > 0.5 * (r.width * r.height):
                matching_xref = xref
                matching_rect = r
                break
        if matching_xref:
            break
            
    if not matching_xref:
        t1 = time.perf_counter()
        return {
            "route": "Rota B (Extração Direta)",
            "success": False,
            "error": "Nenhuma imagem raster incorporada encontrada no bbox",
            "extract_ms": (t1 - t0) * 1000,
            "total_ms": (t1 - t0) * 1000,
            "file_size_bytes": 0
        }
        
    extracted = doc.extract_image(matching_xref)
    img_bytes = extracted["image"]
    ext = extracted["ext"]
    w = extracted["width"]
    h = extracted["height"]
    t1 = time.perf_counter()
    
    # Grava imagem raster original
    img_out_path = out_base.with_suffix(f".{ext}")
    t_write_0 = time.perf_counter()
    img_out_path.write_bytes(img_bytes)
    
    # Cria wrapper SVG limpo e auto-contido
    b64_data = base64.b64encode(img_bytes).decode("ascii")
    mime = "image/png" if ext.lower() == "png" else "image/jpeg"
    svg_wrapper = (
        f'<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
        f'width="{w}" height="{h}" viewBox="0 0 {w} {h}">\n'
        f'  <image width="{w}" height="{h}" href="data:{mime};base64,{b64_data}" />\n'
        f'</svg>'
    )
    svg_out_path = out_base.with_suffix(".b_wrapped.svg")
    svg_out_path.write_text(svg_wrapper, encoding="utf-8")
    t_write_1 = time.perf_counter()
    
    return {
        "route": "Rota B (Extração Direta)",
        "success": True,
        "xref": matching_xref,
        "format": ext,
        "orig_width": w,
        "orig_height": h,
        "extract_ms": (t1 - t0) * 1000,
        "write_ms": (t_write_1 - t_write_0) * 1000,
        "total_ms": (t_write_1 - t0) * 1000,
        "raster_size_bytes": img_out_path.stat().st_size,
        "svg_wrapped_size_bytes": svg_out_path.stat().st_size,
        "raster_file": str(img_out_path),
        "svg_file": str(svg_out_path)
    }

def execute_route_c(page: fitz.Page, norm_bbox: Dict[str, int], out_path: Path, dpi: int = 250) -> Dict[str, Any]:
    """
    Rota C: Baseline de Tracing Raster (Pipeline Atual).
    1. Renderiza página a 250 DPI com corte de 6% cabeçalho/rodapé.
    2. Recorta bbox com padding dinâmico.
    3. 2x Lanczos upsampling.
    4. Filtro bilateral sutil (d=3, sigma=15).
    5. Binarização suave de fundo e traço.
    6. Vetorização via VTracer (spline, color, hierarchical stacked).
    """
    # 1. Renderização
    t_render_0 = time.perf_counter()
    rect = page.rect
    margem_y = rect.height * 0.06
    clip_limpo = fitz.Rect(rect.x0, rect.y0 + margem_y, rect.x1, rect.y1 - margem_y)
    pix = page.get_pixmap(dpi=dpi, clip=clip_limpo, alpha=False)
    img_pagina = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    t_render_1 = time.perf_counter()
    
    # 2. Recorte com margem generosa (exatamente como em pipeline_01_nim_gemini.py)
    t_prep_0 = time.perf_counter()
    w, h = img_pagina.size
    pad_x = max(28, int(w * 0.024))
    pad_y = max(24, int(h * 0.020))
    left = max(0, int((norm_bbox["xmin"] / 1000.0) * w) - pad_x)
    top = max(0, int((norm_bbox["ymin"] / 1000.0) * h) - pad_y)
    right = min(w, int((norm_bbox["xmax"] / 1000.0) * w) + pad_x)
    bottom = min(h, int((norm_bbox["ymax"] / 1000.0) * h) + pad_y)
    
    crop_np = np.array(img_pagina.crop((left, top, right, bottom)).convert("L"))
    h_c, w_c = crop_np.shape
    
    # 3. 2x Lanczos upsampling
    up = cv2.resize(crop_np, (w_c * 2, h_c * 2), interpolation=cv2.INTER_LANCZOS4)
    
    # 4. Filtro bilateral
    suave = cv2.bilateralFilter(up, d=3, sigmaColor=15, sigmaSpace=15)
    suave[suave > 215] = 255
    suave[suave < 100] = 0
    
    img_rgb = cv2.cvtColor(suave, cv2.COLOR_GRAY2RGB)
    
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp_png = tmp.name
        cv2.imwrite(tmp_png, img_rgb)
    t_prep_1 = time.perf_counter()
    
    # 5. Vetorização VTracer
    t_trace_0 = time.perf_counter()
    try:
        vtracer.convert_image_to_svg_py(
            tmp_png,
            str(out_path),
            colormode="color",
            hierarchical="stacked",
            mode="spline",
            filter_speckle=3,
            color_precision=6,
            layer_difference=16,
            path_precision=5
        )
        success = True
    except Exception as e:
        success = False
        print(f"Erro VTracer: {e}")
    finally:
        if os.path.exists(tmp_png):
            os.remove(tmp_png)
    t_trace_1 = time.perf_counter()
    
    file_size = out_path.stat().st_size if out_path.exists() else 0
    
    return {
        "route": "Rota C (Baseline VTracer Tracing)",
        "success": success,
        "render_ms": (t_render_1 - t_render_0) * 1000,
        "prep_ms": (t_prep_1 - t_prep_0) * 1000,
        "trace_ms": (t_trace_1 - t_trace_0) * 1000,
        "total_ms": (t_trace_1 - t_render_0) * 1000,
        "crop_width_px": w_c,
        "crop_height_px": h_c,
        "traced_width_px": w_c * 2,
        "traced_height_px": h_c * 2,
        "file_size_bytes": file_size,
        "out_file": str(out_path)
    }

# ==========================================
# EXECUÇÃO DO BENCHMARK ISOLADO (5 REPETIÇÕES)
# ==========================================

def run_benchmark(n_runs: int = 5):
    print("=" * 80)
    print(f"INICIANDO BENCHMARK DE EXTRAÇÃO DE FIGURAS ({n_runs} iterações por rota)")
    print(f"Versões: PyMuPDF {fitz.__version__} | OpenCV {cv2.__version__} | Python {sys.version.split()[0]}")
    print("=" * 80)
    
    results = []
    
    for target in TARGETS:
        tid = target["id"]
        pdf_path = target["pdf_path"]
        page_idx = target["page_idx"]
        pdf_rect = target["pdf_rect"]
        norm_bbox = target["norm_bbox"]
        
        print(f"\n>>> Processando {target['exam']} - Questão {target['question']} ({tid})")
        print(f"    Descrição: {target['description']}")
        print(f"    Página PDF: {page_idx + 1} | Rect: {pdf_rect}")
        
        doc = fitz.open(pdf_path)
        page = doc[page_idx]
        
        # Mede inspeção isolada
        t_insp_0 = time.perf_counter()
        imgs_list = page.get_images()
        draws_list = page.get_drawings()
        t_insp_1 = time.perf_counter()
        insp_ms = (t_insp_1 - t_insp_0) * 1000
        print(f"    [Inspeção de página]: {len(imgs_list)} imagens, {len(draws_list)} desenhos ({insp_ms:.3f} ms)")
        
        # Rota A - Múltiplas execuções
        out_a = BENCHMARK_DIR / f"{tid}_route_a.svg"
        metrics_a_runs = []
        for _ in range(n_runs):
            m = execute_route_a(page, pdf_rect, out_a)
            metrics_a_runs.append(m)
        med_a = {
            "extract_ms": np.median([m["extract_ms"] for m in metrics_a_runs]),
            "write_ms": np.median([m["write_ms"] for m in metrics_a_runs]),
            "total_ms": np.median([m["total_ms"] for m in metrics_a_runs]),
            "file_size": metrics_a_runs[0]["file_size_bytes"],
            "structure": metrics_a_runs[0]["structure"]
        }
        print(f"    [Rota A - SVG Nativo]:     Extração={med_a['extract_ms']:.2f}ms | Total={med_a['total_ms']:.2f}ms | Tamanho={med_a['file_size']:,} B ({med_a['structure']})")
        
        # Rota B - Múltiplas execuções
        out_b_base = BENCHMARK_DIR / f"{tid}_route_b"
        metrics_b_runs = []
        for _ in range(n_runs):
            m = execute_route_b(doc, page, pdf_rect, out_b_base)
            metrics_b_runs.append(m)
        med_b = {
            "extract_ms": np.median([m["extract_ms"] for m in metrics_b_runs]),
            "write_ms": np.median([m["write_ms"] for m in metrics_b_runs]),
            "total_ms": np.median([m["total_ms"] for m in metrics_b_runs]),
            "raster_size": metrics_b_runs[0]["raster_size_bytes"],
            "svg_size": metrics_b_runs[0]["svg_wrapped_size_bytes"],
            "format": metrics_b_runs[0]["format"],
            "dim": f"{metrics_b_runs[0]['orig_width']}x{metrics_b_runs[0]['orig_height']}"
        }
        print(f"    [Rota B - Extração Direta]: Extração={med_b['extract_ms']:.2f}ms | Total={med_b['total_ms']:.2f}ms | Raster={med_b['raster_size']:,} B | SVG={med_b['svg_size']:,} B ({med_b['dim']} {med_b['format']})")
        
        # Rota C - Múltiplas execuções
        out_c = BENCHMARK_DIR / f"{tid}_route_c.svg"
        metrics_c_runs = []
        for _ in range(n_runs):
            m = execute_route_c(page, norm_bbox, out_c)
            metrics_c_runs.append(m)
        med_c = {
            "render_ms": np.median([m["render_ms"] for m in metrics_c_runs]),
            "prep_ms": np.median([m["prep_ms"] for m in metrics_c_runs]),
            "trace_ms": np.median([m["trace_ms"] for m in metrics_c_runs]),
            "total_ms": np.median([m["total_ms"] for m in metrics_c_runs]),
            "file_size": metrics_c_runs[0]["file_size_bytes"],
            "dim": f"{metrics_c_runs[0]['traced_width_px']}x{metrics_c_runs[0]['traced_height_px']}"
        }
        print(f"    [Rota C - VTracer Tracing]: Render={med_c['render_ms']:.1f}ms | Prep={med_c['prep_ms']:.1f}ms | Trace={med_c['trace_ms']:.1f}ms | Total={med_c['total_ms']:.1f}ms | Tamanho={med_c['file_size']:,} B ({med_c['dim']})")
        
        speedup_b_vs_c = med_c["total_ms"] / med_b["total_ms"]
        speedup_a_vs_c = med_c["total_ms"] / med_a["total_ms"]
        size_reduction_b_vs_c = (1.0 - (med_b["svg_size"] / med_c["file_size"])) * 100
        print(f"    ==> GANHO: Rota B é {speedup_b_vs_c:.1f}x MAIS RÁPIDA que Rota C (economia de {size_reduction_b_vs_c:.1f}% em tamanho de arquivo)")
        print(f"    ==> GANHO: Rota A é {speedup_a_vs_c:.1f}x MAIS RÁPIDA que Rota C")
        
        results.append({
            "target": target,
            "inspection_ms": insp_ms,
            "route_a": med_a,
            "route_b": med_b,
            "route_c": med_c,
            "speedup_b_vs_c": speedup_b_vs_c,
            "speedup_a_vs_c": speedup_a_vs_c,
            "size_reduction_b_vs_c": size_reduction_b_vs_c
        })
        
        doc.close()
        
    # Salva resumo JSON do benchmark
    summary_path = BENCHMARK_DIR / "benchmark_results.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, default=str)
    print(f"\n[OK] Benchmark completo. Resultados estruturados salvos em: {summary_path}")
    return results

if __name__ == "__main__":
    run_benchmark(n_runs=5)
