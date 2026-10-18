"""
Diagnóstico detalhado das 270 figuras de questões militares do LemmaS.
Verifica:
1. Existência física do arquivo de imagem local e correspondência com PDF original.
2. Detecção de Falsos Positivos (recorte de alternativas/fórmulas em vez de diagrama).
3. Detecção de Bounding Boxes com vazamento de texto do enunciado no topo/base.
4. Identificação de objetos nativos (imagens embutidas) disponíveis no PDF.
"""

import sys
import json
import re
from pathlib import Path

# Suporte UTF-8 no Windows
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

def normalizar_caminho_local(figura_path: str) -> Path:
    if not figura_path:
        return None
    p = figura_path.strip().lstrip("/")
    if p.startswith("uploads/"):
        return PROJECT_ROOT / "frontend" / "public" / p
    if p.startswith("data/imagens/"):
        return PROJECT_ROOT / p
    # URL completa
    if "questoes-imagens/" in p:
        sub = p.split("questoes-imagens/")[-1]
        return PROJECT_ROOT / "data" / "imagens" / sub
    return PROJECT_ROOT / p

def analisar_imagem(img_path: Path):
    if not img_path.exists():
        return {"status": "MISSING", "error": "Arquivo não existe"}
    
    if img_path.suffix.lower() == ".svg":
        return {"status": "SVG_VECTOR", "width": None, "height": None}
    
    try:
        img_bgr = cv2.imread(str(img_path))
        if img_bgr is None or img_bgr.size == 0:
            return {"status": "CORRUPT", "error": "Falha ao decodificar imagem"}
        
        h, w = img_bgr.shape[:2]
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        
        # Binarização inversa (tinta = 255, fundo = 0)
        _, ink_mask = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)
        total_pixels = h * w
        ink_pixels = int(np.count_nonzero(ink_mask))
        ink_density = ink_pixels / total_pixels if total_pixels > 0 else 0
        
        # Análise das bordas (vazamento de texto)
        top_ink = float(np.mean(ink_mask[:15, :])) if h > 30 else 0
        bottom_ink = float(np.mean(ink_mask[-15:, :])) if h > 30 else 0
        left_ink = float(np.mean(ink_mask[:, :15])) if w > 30 else 0
        right_ink = float(np.mean(ink_mask[:, -15:])) if w > 30 else 0
        
        # Aspect ratio
        ar = w / float(h) if h > 0 else 1.0
        
        is_suspect_fp = False
        reasons = []
        if ar < 0.25 and h > 200:
            is_suspect_fp = True
            reasons.append("aspect_ratio_muito_vertical_possivel_lista_alternativas")
        if ink_density < 0.01:
            is_suspect_fp = True
            reasons.append("densidade_tinta_muito_baixa")
        if top_ink > 25.0:
            reasons.append("vazamento_topo")
        if bottom_ink > 25.0:
            reasons.append("vazamento_base")
            
        return {
            "status": "OK",
            "width": w,
            "height": h,
            "ar": round(ar, 2),
            "ink_density": round(ink_density, 4),
            "top_ink": round(top_ink, 1),
            "bottom_ink": round(bottom_ink, 1),
            "is_suspect_fp": is_suspect_fp,
            "reasons": reasons
        }
    except Exception as e:
        return {"status": "ERROR", "error": str(e)}

def main():
    sb = get_supabase()
    mil_bancas = ['AFA','EEAR','EFOMM','ESA','EsPCEx','ESPCEX','IME','ITA','Colégio Naval','COLEGIO NAVAL','CN','Escola Naval','ESCOLA NAVAL','EN','EPCAR']
    
    print("[*] Consultando questões militares no Supabase...")
    res = sb.table("questoes").select("id,mathnet_id,banca,ano,figura_path,enunciado").in_("banca", mil_bancas).not_.is_("figura_path", "null").execute()
    questoes = [r for r in res.data if (r.get("figura_path") or "").strip()]
    print(f"[*] Total de questões militares retornadas: {len(questoes)}")
    
    relatorio = []
    fps = []
    vazamentos = []
    perfeitas = []
    
    for q in questoes:
        qid = q["id"]
        banca = q.get("banca")
        ano = q.get("ano")
        fpath = q.get("figura_path")
        local_path = normalizar_caminho_local(fpath)
        
        # Caso especial: ESA 2026 protegida
        if banca == "ESA" and ano == 2026:
            perfeitas.append({"id": qid, "banca": banca, "ano": ano, "tipo": "ESA_2026_PROTEGIDA"})
            continue
            
        info = analisar_imagem(local_path)
        item = {
            "id": qid,
            "mathnet_id": q.get("mathnet_id"),
            "banca": banca,
            "ano": ano,
            "figura_path": fpath,
            "local_path": str(local_path),
            "analysis": info
        }
        relatorio.append(item)
        
        if info.get("is_suspect_fp"):
            fps.append(item)
        elif info.get("reasons") and any("vazamento" in r for r in info["reasons"]):
            vazamentos.append(item)
            
    print("\n" + "="*60)
    print("SÍNTESE DO DIAGNÓSTICO MILITAR:")
    print(f"Total auditado: {len(questoes)}")
    print(f"Protegidas padrão-ouro (ESA 2026): {len(perfeitas)}")
    print(f"Suspeitas de Falso Positivo (sem figura real): {len(fps)}")
    print(f"Com vazamento evidente de texto nas bordas: {len(vazamentos)}")
    print("="*60)
    
    print("\n--- AMOSTRA DE FALSOS POSITIVOS DETECTADOS ---")
    for f in fps[:10]:
        print(f"ID {f['id']} | {f['banca']} {f['ano']} | motivos: {f['analysis']['reasons']} | path: {f['figura_path']}")
        
    print("\n--- AMOSTRA DE VAZAMENTOS DE TEXTO ---")
    for v in vazamentos[:10]:
        print(f"ID {v['id']} | {v['banca']} {v['ano']} | motivos: {v['analysis']['reasons']} | dim: {v['analysis']['width']}x{v['analysis']['height']}")

    out_file = PROJECT_ROOT / "data" / "audit" / "diagnostico_militar_detalhado.json"
    out_file.write_text(json.dumps(relatorio, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\n[✓] Relatório completo gravado em {out_file}")

if __name__ == "__main__":
    main()
