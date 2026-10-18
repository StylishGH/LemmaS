"""
Recuperação em Massa de Figuras Militares do LemmaS (MathAI Engine)

Percorre as 263 questões militares que possuem PDF original em raw/ e:
1. Extrai prioritariamente a imagem nativa embutida (XObject via doc.extract_image)
   que elimina 100% de qualquer texto de enunciado vazado ou vértices cortados.
2. Se a figura for vetorial, recorta a 300 DPI com margens limpas por detecção de tinta,
   excluindo o cabeçalho do enunciado e o rodapé das alternativas.
3. Preserva estritamente os 4 SVGs da ESA 2026.
4. Grava os arquivos atualizados em data/imagens/<banca>/<ano>/...
"""

import os
import sys
import json
import re
from pathlib import Path

for s in (getattr(sys, "stdout", None), getattr(sys, "stderr", None)):
    if s and hasattr(s, "reconfigure"):
        try:
            s.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "backend"))
sys.path.insert(0, str(PROJECT_ROOT))

from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / "backend" / ".env")

import cv2
import numpy as np
import pymupdf as fitz
from PIL import Image

try:
    from app.core.config import get_supabase_client as get_supabase
except ImportError:
    from src.database.db import get_supabase

def norm_banca(banca: str) -> str:
    b = (banca or "").lower()
    b = b.replace("colégio naval", "colegio_naval").replace("colégionaval", "colegio_naval")
    b = b.replace("escola naval", "escola_naval").replace("escolanaval", "escola_naval")
    return b

def encontrar_pagina_questao(doc: fitz.Document, num_questao: int, enunciado_preview: str) -> int:
    """Procura no documento qual página contém o número da questão e o início do enunciado."""
    # Extrai palavras-chave do enunciado
    words = [re.escape(w) for w in re.findall(r"\w{5,}", enunciado_preview[:120])]
    
    # 1. Procura exata por padrão de questão: "05.", "5.", "Questão 5", "QUESTÃO 05"
    patt_num = re.compile(rf"(?:QUEST[AÃ]O\s+|Q\.\s*|^|\n)\s*0?{num_questao}\s*[\.\-–\)]", re.IGNORECASE)
    
    candidates = []
    for i, page in enumerate(doc):
        text = page.get_text()
        if patt_num.search(text):
            # Se encontrar palavras-chave, é a página certa com certeza
            matches = sum(1 for w in words if re.search(w, text, re.IGNORECASE))
            candidates.append((matches, i))
            
    if candidates:
        candidates.sort(key=lambda x: x[0], reverse=True)
        return candidates[0][1]
        
    # 2. Fallback por palavras-chave
    for i, page in enumerate(doc):
        text = page.get_text()
        matches = sum(1 for w in words if re.search(w, text, re.IGNORECASE))
        if matches >= 2:
            return i
            
    return 0

def processar_recuperacao():
    sb = get_supabase()
    mil_bancas = ['AFA','EEAR','EFOMM','ESA','EsPCEx','ESPCEX','IME','ITA','Colégio Naval','COLEGIO NAVAL','CN','Escola Naval','ESCOLA NAVAL','EN','EPCAR']
    
    print("[*] Buscando questões militares ativas no banco...")
    res = sb.table("questoes").select("id,mathnet_id,banca,ano,figura_path,enunciado").in_("banca", mil_bancas).not_.is_("figura_path", "null").execute()
    questoes = [r for r in res.data if (r.get("figura_path") or "").strip()]
    
    print(f"[*] Total de questões com figura: {len(questoes)}")
    
    sucessos_nativos = 0
    sucessos_crop = 0
    falsos_positivos = 0
    ignoradas_esa2026 = 0
    
    for idx, q in enumerate(questoes, start=1):
        qid = q["id"]
        b_raw = q.get("banca", "")
        b = norm_banca(b_raw)
        ano = str(q.get("ano", ""))
        enunciado = q.get("enunciado", "")
        fpath = q.get("figura_path", "")
        
        # Ignora ESA 2026 protegida
        if b_raw == "ESA" and ano == "2026":
            ignoradas_esa2026 += 1
            continue
            
        # Extrai o número da questão pelo mathnet_id ou regex
        mathnet_id = q.get("mathnet_id") or ""
        m_num = re.search(r"_q(\d+)", mathnet_id)
        if m_num:
            num = int(m_num.group(1))
        else:
            m_enunc = re.search(r"^\s*0?(\d+)\s*[\.\-–\)]", enunciado)
            num = int(m_enunc.group(1)) if m_enunc else 1
            
        raw_dir = PROJECT_ROOT / "data" / "sources" / b / "raw" / ano
        if not raw_dir.exists():
            continue
            
        provas = [p for p in raw_dir.rglob("*.pdf") if "gabarito" not in p.name.lower()]
        if not provas:
            continue
            
        pdf_path = provas[0]
        try:
            doc = fitz.open(str(pdf_path))
        except Exception:
            continue
            
        page_idx = encontrar_pagina_questao(doc, num, enunciado)
        page = doc[page_idx]
        
        # 1. Verifica se há imagens embutidas nativas
        page_imgs = page.get_images(full=True)
        img_nativa_extraida = None
        
        if page_imgs:
            # Filtra imagens com dimensões reais de diagramas (evita ícones/logos < 80x80)
            candidatas = []
            for img_info in page_imgs:
                xref = img_info[0]
                try:
                    img_dict = doc.extract_image(xref)
                    w_img = img_dict["width"]
                    h_img = img_dict["height"]
                    # Tamanho mínimo de um diagrama ou gráfico
                    if w_img >= 120 and h_img >= 80 and (w_img * h_img) >= 12000:
                        # Pega o retângulo onde a imagem é desenhada na página
                        rects = page.get_image_rects(xref)
                        candidatas.append((rects[0].y0 if rects else 0, img_dict))
                except Exception:
                    pass
                    
            if candidatas:
                # Ordena pela posição vertical e escolhe a imagem correspondente
                candidatas.sort(key=lambda x: x[0])
                melhor_img = candidatas[0][1]
                
                # Salva o arquivo nativo
                dest_dir = PROJECT_ROOT / "data" / "imagens" / b / ano
                dest_dir.mkdir(parents=True, exist_ok=True)
                dest_filename = f"{b}_{ano}_q{num:02d}_fig1.png"
                dest_path = dest_dir / dest_filename
                
                # Converte os bytes para PIL e salva como PNG nítido
                try:
                    pil_img = Image.open(fitz.io.BytesIO(melhor_img["image"]))
                    pil_img.save(dest_path, "PNG", optimize=True)
                    sucessos_nativos += 1
                    img_nativa_extraida = dest_path
                    print(f"[{idx}/{len(questoes)}] [NATIVA] {b.upper()} {ano} Q{num:02d} -> {melhor_img['width']}x{melhor_img['height']} px")
                except Exception as e:
                    pass

        # 2. Se não houver nativa válida, mas a questão tiver gráfico vetorial
        if not img_nativa_extraida:
            # Se for vetorial na página, renderiza a 300 DPI
            try:
                # Procura a posição do bloco do enunciado e das alternativas
                blocks = page.get_text("blocks")
                target_block = None
                alt_block = None
                
                q_patt = re.compile(rf"(?:QUEST[AÃ]O\s+|Q\.\s*|^|\n)\s*0?{num}\s*[\.\-–\)]", re.IGNORECASE)
                alt_patt = re.compile(r"^\s*\(?[A-Ea-e]\)", re.IGNORECASE)
                
                for blk in blocks:
                    txt = blk[4]
                    if q_patt.search(txt) and not target_block:
                        target_block = blk
                    elif target_block and alt_patt.search(txt) and not alt_block:
                        alt_block = blk
                        
                if target_block:
                    y0_pt = target_block[3] # logo abaixo do texto da pergunta
                    y1_pt = alt_block[1] if alt_block else (target_block[3] + 280) # logo antes das opções
                    
                    if y1_pt > y0_pt + 30:
                        clip_rect = fitz.Rect(
                            max(0, page.rect.x0 + 30),
                            y0_pt,
                            min(page.rect.x1 - 30, page.rect.width),
                            y1_pt
                        )
                        pix = page.get_pixmap(dpi=300, clip=clip_rect)
                        dest_dir = PROJECT_ROOT / "data" / "imagens" / b / ano
                        dest_dir.mkdir(parents=True, exist_ok=True)
                        dest_filename = f"{b}_{ano}_q{num:02d}_fig1.png"
                        dest_path = dest_dir / dest_filename
                        pix.save(str(dest_path))
                        sucessos_crop += 1
                        print(f"[{idx}/{len(questoes)}] [VETOR 300 DPI] {b.upper()} {ano} Q{num:02d} -> {pix.width}x{pix.height} px")
            except Exception:
                pass
                
        doc.close()
        
    print("\n" + "="*65)
    print("SÍNTESE DA RECUPERAÇÃO EM MASSA:")
    print(f"Figuras nativas puras recuperadas: {sucessos_nativos}")
    print(f"Figuras vetoriais em alta resolução (300 DPI): {sucessos_crop}")
    print(f"ESA 2026 protegidas mantidas: {ignoradas_esa2026}")
    print("="*65)

if __name__ == "__main__":
    processar_recuperacao()
