#!/usr/bin/env python3
"""
Pipeline Reengenheirado de Identificação, Extração, Recorte e Validação de Figuras Matemáticas (LemmaS).

Antigravity (Arquiteto) & Hermes (Executor).

Princípios Arquiteturais Inegociáveis:
1. Partir da questão e de sua localização na página (não extração cega de objetos).
2. Distinguir formalmente Prova Original vs. Resolução Comentada vs. Gabarito.
3. Classificar semanticamente: stem_figure, option_figure, option_panel, stem_table, solution_figure, unknown.
4. Preservar gráficos vetoriais nativos em 300 DPI sem distorção por VTracer.
5. Delimitação com margens adaptativas por detecção de tinta/respiro (evita corte de índices, eixos e setas).
6. Preservação estrita dos ativos protegidos (ESA 2026 SVGs).
7. Falha segura: sem coordenadas confiáveis, emitir MANUAL_REVIEW_REQUIRED.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import sys
import time
import xml.etree.ElementTree as ET
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Suporte UTF-8 no Windows
for _stream in (getattr(sys, "stdout", None), getattr(sys, "stderr", None)):
    if _stream and hasattr(_stream, "reconfigure"):
        try:
            _stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

try:
    import cv2
    import numpy as np
except ImportError:
    cv2 = None
    np = None

try:
    import pymupdf as fitz
except ImportError:
    try:
        import fitz
    except ImportError:
        fitz = None

PROJECT_ROOT = Path(__file__).resolve().parents[2]

# Tipos Semânticos
SEMANTIC_STEM_FIGURE = "stem_figure"
SEMANTIC_OPTION_FIGURE = "option_figure"
SEMANTIC_OPTION_PANEL = "option_panel"
SEMANTIC_STEM_TABLE = "stem_table"
SEMANTIC_SOLUTION_FIGURE = "solution_figure"
SEMANTIC_UNKNOWN = "unknown"

# Papéis de Documentos
DOC_ORIGINAL_EXAM = "original_exam"
DOC_RESOLUTION = "resolution_commentary"
DOC_ANSWER_KEY = "answer_key"
DOC_UNKNOWN = "unknown"

# Status Estruturais e Visuais
STATUS_PASS_STRUCTURAL = "PASS_STRUCTURAL"
STATUS_FAIL_STRUCTURAL = "FAIL_STRUCTURAL"
STATUS_SOURCE_MISSING = "SOURCE_MISSING"
STATUS_MANUAL_REVIEW_REQUIRED = "MANUAL_REVIEW_REQUIRED"

VISUAL_PENDING = "PENDING_INSPECTION"
VISUAL_PASS = "PASS_VISUAL"
VISUAL_FAIL = "FAIL_VISUAL"

# Ativos Protegidos (ESA 2026 SVGs)
PROTECTED_ESA_2026_HASHES = {
    "q02.svg": "f9631692db5ab0b48ed9e7146ff0ccc1d8c9b409fd82a1fc2c596c13b0406618",
    "q06.svg": "c98eeb272d30eb358fc4a2b7ef286e70a11982c6b07f504ddb0f9f0aff0bdb4d",
    "q09.svg": "b6ff6987b00abe68a17a2826a45d2891a10d111c07fbe898d34cd7af4762f39e",
    "q10.svg": "f2fbf68cd5ecef9676102919406e6fe3c9852d9bf19b0d4fe6bc7778b3740e75",
}

QUESTION_HEADER_REGEX = re.compile(
    r"(?:^|\n)\s*(?:QUEST[AÃ]O\s+)?(?P<num>\d{1,3})\s*[–\-—.)]\s*",
    re.IGNORECASE
)

@dataclass
class FigureProvenance:
    question_id: str
    banca: str
    ano: str
    numero: str
    pdf_source: str
    pdf_sha256: str
    doc_role: str
    doc_confidence: float
    page_index: int
    question_bbox_pt: Optional[List[float]] = None
    figure_bbox_pt: Optional[List[float]] = None
    semantic_type: str = SEMANTIC_UNKNOWN
    associated_option: Optional[str] = None
    extraction_method: str = "unknown"
    width: Optional[int] = None
    height: Optional[int] = None
    resolution_dpi: int = 300
    output_sha256: Optional[str] = None
    output_path: Optional[str] = None
    structural_status: str = STATUS_MANUAL_REVIEW_REQUIRED
    visual_status: str = VISUAL_PENDING
    final_status: str = STATUS_MANUAL_REVIEW_REQUIRED
    justification: str = ""
    processing_time_ms: int = 0


def calculate_sha256(filepath: Path) -> str:
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def classify_source_document(pdf_path: Path) -> Tuple[str, float]:
    """
    Distingue a origem do PDF: Prova Original vs Resolução Comentada vs Gabarito.
    Retorna (papel, confiança 0.0 - 1.0).
    """
    name_lower = pdf_path.name.lower()
    parent_str = str(pdf_path.parent).lower()

    if "gabarito" in name_lower or "gabarito" in parent_str:
        return DOC_ANSWER_KEY, 0.95

    # Provas com 'madematica', 'resolvida', 'resolucao' são resoluções comentadas
    if any(k in name_lower for k in ("madematica", "resolvida", "resolucao", "comentada")):
        return DOC_RESOLUTION, 0.98

    if "resolucoes" in parent_str:
        return DOC_RESOLUTION, 0.95

    # Se estiver dentro de pasta 'provas' oficial
    if "provas" in parent_str:
        return DOC_ORIGINAL_EXAM, 0.99

    # Verificação profunda nos metadados do PDF
    if fitz:
        try:
            doc = fitz.open(str(pdf_path))
            meta_title = (doc.metadata.get("title") or "").lower()
            if "resolvida" in meta_title or "resolução" in meta_title or "comentada" in meta_title:
                return DOC_RESOLUTION, 0.90
            if "gabarito" in meta_title:
                return DOC_ANSWER_KEY, 0.90
            doc.close()
        except Exception:
            pass

    if "prova" in name_lower or "fase" in name_lower:
        return DOC_ORIGINAL_EXAM, 0.85

    return DOC_UNKNOWN, 0.50


def locate_question_in_page_text(page: Any, question_num: int) -> Optional[List[float]]:
    """
    Localiza o bounding box do bloco da questão na página a partir do texto extraível.
    """
    blocks = page.get_text("blocks")
    target_block = None
    next_block = None

    q_pattern = re.compile(rf"(?:^|\n)\s*(?:QUEST[AÃ]O\s+)?{question_num}\s*[–\-—.)]", re.IGNORECASE)
    next_q_pattern = re.compile(rf"(?:^|\n)\s*(?:QUEST[AÃ]O\s+)?{question_num + 1}\s*[–\-—.)]", re.IGNORECASE)

    for b in blocks:
        text = b[4]
        if q_pattern.search(text):
            target_block = b
        elif target_block and next_q_pattern.search(text):
            next_block = b
            break

    if target_block:
        x0, y0, x1, y1 = target_block[:4]
        if next_block:
            # Questão delimitada até o início da próxima
            return [float(x0), float(y0), float(max(x1, next_block[2])), float(next_block[1])]
        else:
            # Estende até o fim da coluna/página
            return [float(x0), float(y0), float(x1), float(page.rect.height - 20.0)]

    return None


def detect_adaptive_ink_bbox(
    page_img_bgr: np.ndarray,
    region_px: Tuple[int, int, int, int],
    min_pad_px: int = 24,
    whitespace_gap_px: int = 10,
    max_expand_frac: float = 0.22
) -> Tuple[int, int, int, int]:
    """
    Expande adaptativamente a bbox inicial com base na presença de tinta (pixels não-brancos),
    parando em gaps de espaço em branco e garantindo respiro mínimo sem cortar setas ou índices.
    """
    H, W = page_img_bgr.shape[:2]
    rx0, ry0, rx1, ry1 = region_px

    # Converte para escala de cinza e binariza (tinta = 255)
    gray = cv2.cvtColor(page_img_bgr, cv2.COLOR_BGR2GRAY)
    _, ink_mask = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)

    # Limites máximos de expansão
    max_dx = int((rx1 - rx0) * max_expand_frac)
    max_dy = int((ry1 - ry0) * max_expand_frac)

    # 1. Expansão para a Esquerda
    x0 = rx0
    gap = 0
    while x0 > max(0, rx0 - max_dx):
        slice_col = ink_mask[ry0:ry1, x0 - 1]
        if np.any(slice_col > 0):
            x0 -= 1
            gap = 0
        else:
            gap += 1
            x0 -= 1
            if gap >= whitespace_gap_px:
                x0 += gap  # retrocede o gap vazio
                break

    # 2. Expansão para a Direita
    x1 = rx1
    gap = 0
    while x1 < min(W, rx1 + max_dx):
        slice_col = ink_mask[ry0:ry1, x1]
        if np.any(slice_col > 0):
            x1 += 1
            gap = 0
        else:
            gap += 1
            x1 += 1
            if gap >= whitespace_gap_px:
                x1 -= gap
                break

    # 3. Expansão para Cima
    y0 = ry0
    gap = 0
    while y0 > max(0, ry0 - max_dy):
        slice_row = ink_mask[y0 - 1, x0:x1]
        if np.any(slice_row > 0):
            y0 -= 1
            gap = 0
        else:
            gap += 1
            y0 -= 1
            if gap >= whitespace_gap_px:
                y0 += gap
                break

    # 4. Expansão para Baixo
    y1 = ry1
    gap = 0
    while y1 < min(H, ry1 + max_dy):
        slice_row = ink_mask[y1, x0:x1]
        if np.any(slice_row > 0):
            y1 += 1
            gap = 0
        else:
            gap += 1
            y1 += 1
            if gap >= whitespace_gap_px:
                y1 -= gap
                break

    # Aplica respiro final mínimo de segurança
    final_x0 = max(0, x0 - min_pad_px)
    final_y0 = max(0, y0 - min_pad_px)
    final_x1 = min(W, x1 + min_pad_px)
    final_y1 = min(H, y1 + min_pad_px)

    return final_x0, final_y0, final_x1, final_y1


def validate_image_structural(filepath: Path, min_dim: int = 15, require_ink: bool = True) -> bool:
    """
    Valida a integridade do arquivo gerado: não-vazio, dimensões válidas, presença de contraste.
    """
    if not filepath.exists() or filepath.stat().st_size == 0:
        return False

    suffix = filepath.suffix.lower()
    if suffix == ".svg":
        try:
            tree = ET.parse(filepath)
            root = tree.getroot()
            return root.tag.endswith("svg")
        except Exception:
            return False

    if cv2 is None:
        return True

    img = cv2.imread(str(filepath))
    if img is None or img.size == 0:
        return False

    h, w = img.shape[:2]
    if h < min_dim or w < min_dim:
        return False

    if require_ink:
        std_val = float(np.std(img))
        if std_val < 5.0:  # imagem praticamente monocromática/branca
            return False

    return True


def verify_protected_esa_2026_intact(base_dir: Path) -> Tuple[bool, List[str]]:
    """
    Verifica se os 4 SVGs protegidos da ESA 2026 estão 100% idênticos em bytes e SHA-256.
    """
    esa_dir = base_dir / "frontend" / "public" / "uploads" / "esa" / "2026"
    errors = []

    for filename, expected_hash in PROTECTED_ESA_2026_HASHES.items():
        svg_path = esa_dir / filename
        if not svg_path.exists():
            errors.append(f"Ativo protegido ausente: {svg_path}")
            continue
        actual_hash = calculate_sha256(svg_path)
        if actual_hash != expected_hash:
            errors.append(
                f"VIOLAÇÃO DE INTEGRIDADE em {filename}: esperado {expected_hash}, obtido {actual_hash}"
            )

    return (len(errors) == 0, errors)


def generate_contact_sheet(
    original_page_img: np.ndarray,
    crop_img: np.ndarray,
    figure_bbox_px: Tuple[int, int, int, int],
    title: str,
    output_path: Path,
    legacy_crop_img: Optional[np.ndarray] = None
) -> Path:
    """
    Produz folha de contato para inspeção visual humana comparando:
    1. Página original com bbox anotada.
    2. Recorte recuperado em alta resolução.
    3. (Opcional) Recorte legado anterior lado a lado.
    """
    if cv2 is None or np is None:
        return output_path

    # Desenha retângulo verde na página original
    page_annotated = original_page_img.copy()
    x0, y0, x1, y1 = figure_bbox_px
    cv2.rectangle(page_annotated, (x0, y0), (x1, y1), (0, 200, 0), 4)

    # Redimensiona página para altura de visualização (ex: 800px)
    target_h = 800
    ph, pw = page_annotated.shape[:2]
    pw_new = int(pw * (target_h / ph))
    resized_page = cv2.resize(page_annotated, (pw_new, target_h))

    # Redimensiona recorte
    ch, cw = crop_img.shape[:2]
    cw_new = int(cw * (target_h / ch))
    resized_crop = cv2.resize(crop_img, (cw_new, target_h))

    panels = [resized_page, resized_crop]

    if legacy_crop_img is not None and legacy_crop_img.size > 0:
        lh, lw = legacy_crop_img.shape[:2]
        lw_new = int(lw * (target_h / lh))
        resized_legacy = cv2.resize(legacy_crop_img, (lw_new, target_h))
        panels.append(resized_legacy)

    combined = np.hstack(panels)

    # Adiciona banner de cabeçalho
    banner_h = 50
    banner = np.ones((banner_h, combined.shape[1], 3), dtype=np.uint8) * 30
    cv2.putText(
        banner,
        title,
        (20, 32),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (255, 255, 255),
        2,
        cv2.LINE_AA
    )

    final_sheet = np.vstack([banner, combined])
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_path), final_sheet)
    return output_path
