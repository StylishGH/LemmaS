#!/usr/bin/env python3
"""
Reprocessador seletivo de figuras matemáticas do LemmaS.

Recupera figuras a partir do PDF original com extração adaptativa
(Rota B: imagem embutida nativa; Rota A: cluster vetorial;
Rota C: renderização em alta resolução da região correta;
Rota C-scan: template matching da figura publicada contra a página,
para provas escaneadas), margens adaptativas baseadas em conteúdo e
folha de contato para inspeção visual.

NÃO realiza uploads nem alterações no banco/produção. O modo dry-run é
o padrão; use --execute para gravar artefatos reais no diretório do
relatório (nunca sobre arquivos existentes: grava sufixo _v2 e avisa).

IMPORTANTE — interpretador: este script requer PyMuPDF, OpenCV e numpy.
No ambiente local eles estão no Python 3.12 do sistema:
    C:/Users/guigu/AppData/Local/Programs/Python/Python312/python.exe
O `python` do PATH (venv do Hermes) só tem PIL.

Exemplos:
    # Piloto AFA+EEAR (dry-run):
    C:/.../Python312/python.exe -m scripts.tools.reprocess_question_figures \\
        --inventory data/audit/reprocessed_figures_pilot/pilot_inventory.json \\
        --report-dir data/audit/reprocessed_figures_pilot

    # Execução real (grava PNGs, folhas de contato e relatórios):
    ... mesmos args ... --execute

    # Registrar veredito visual após inspeção humana (nunca automático):
    ... --record-visual militar_afa_2011_q06=PASS_VISUAL \\
        --record-visual militar_afa_2012_q10=FAIL_VISUAL

    # Região manual (página e bbox em pontos PDF) após revisão:
    ... --strategy manual --page 3 --region 54,100,283,291 --execute

Statuses (estrutural) x veredito visual são SEPARADOS:
    PASS_STRUCTURAL   arquivo tecnicamente válido (magic, dims, não-vazio)
    FAIL_STRUCTURAL   arquivo inválido/corrompido/vazio
    SOURCE_MISSING    PDF original não encontrado
    MANUAL_REVIEW_REQUIRED  região não determinável com confiança
    (visual_status, campo separado): PENDING_INSPECTION | PASS_VISUAL |
    FAIL_VISUAL — atualizado SOMENTE via --record-visual.

Uma página inteira como recorte NÃO é recuperação: com --strategy
fullpage o resultado é marcado MANUAL_REVIEW_REQUIRED.
"""

import argparse
import json
import os
import re
import sys
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

# Garantir que o diretório raiz do projeto esteja no sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

try:
    import pandas as pd
except Exception:  # pragma: no cover
    pd = None  # type: ignore

try:
    import cv2  # type: ignore
    import numpy as np  # type: ignore
except Exception:  # pragma: no cover
    cv2 = None  # type: ignore
    np = None  # type: ignore

try:
    import pymupdf  # type: ignore
except Exception:  # pragma: no cover
    pymupdf = None  # type: ignore

# ----------------------------------------------------------------------
# Configurações padrão
# ----------------------------------------------------------------------
DEFAULT_DPI = 300          # DPI do render final do recorte
DEFAULT_MARGIN_PCX = 10    # margem mínima em px ao redor da bbox (legado)
DEFAULT_EXTENSIONS = {".png", ".svg"}
DEFAULT_REPORT_DIR = PROJECT_ROOT / "data" / "audit" / "reprocessed_figures"

# --- parâmetros da extração adaptativa ---
ANALYSIS_DPI = 150         # DPI do render usado para análise/matching
MIN_PAD_PX = 24            # margem mínima final por lado (px @ANALYSIS_DPI)
WHITESPACE_GAP_PX = 10     # gap de whitespace que interrompe a expansão
MAX_EXPAND_FRAC = 0.22     # expansão máx. por lado (fração da dimensão)
TEMPLATE_MIN_SCORE = 0.45  # score mínimo de matchTemplate (TM_CCOEFF_NORMED)
TEMPLATE_AMBIGUOUS_DELTA = 0.02  # 2º match a esta distância => ambíguo
TEMPLATE_SCALES = (
    [round(0.08 + 0.04 * i, 2) for i in range(19)]   # 0.08..0.80 passo 0.04
    + [0.30, 0.57, 0.63, 0.72]                        # escalas derivadas do pipeline (VTracer viewBox/2)
)
TEMPLATE_EARLY_EXIT_PAGE = 0.03  # após 6 escalas, página sem nenhum score >= valor é descartada
EMBEDDED_MIN_AREA_PT2 = 1500.0  # área mínima p/ cluster de imagens embutidas
EMBEDDED_CLUSTER_GAP_PT = 8.0    # gap p/ agrupar fragmentos da mesma figura
VECTOR_MIN_PATHS = 8       # nº mínimo de paths p/ cluster vetorial
VECTOR_MIN_AREA_PT2 = 2000.0
VECTOR_CLUSTER_GAP_PT = 15.0
# regex de início de questão: "57 –", "12)", "QUESTÃO 10", "20."
QUESTION_START_RE = re.compile(r"^\s*(?:QUEST[AÃ]O\s+)?(?P<num>\d{1,3})\s*[–\-—.)]\s")

STATUS_PASS_STRUCT = "PASS_STRUCTURAL"
STATUS_FAIL_STRUCT = "FAIL_STRUCTURAL"
STATUS_SOURCE_MISSING = "SOURCE_MISSING"
STATUS_MANUAL_REVIEW = "MANUAL_REVIEW_REQUIRED"
VISUAL_PENDING = "PENDING_INSPECTION"

# ----------------------------------------------------------------------
# Funções auxiliares
# ----------------------------------------------------------------------
def run_cmd(cmd: List[str], cwd: Optional[Path] = None, check: bool = True) -> subprocess.CompletedProcess:
    """Executa um comando e retorna o CompletedProcess."""
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, check=check)

def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)

def is_dryrun(args: argparse.Namespace) -> bool:
    return getattr(args, "execute", False) is False

# ----------------------------------------------------------------------
# Classes de dados
# ----------------------------------------------------------------------
class FigureRecord:
    def __init__(
        self,
        question_id: str,
        mathnet_id: str,
        banco: str,
        ano: int,
        numero: int,
        figura_path: str,
        enunciado_preview: str = "",
    ):
        self.question_id = question_id
        self.mathnet_id = mathnet_id
        self.banco = banco.lower()
        self.ano = ano
        self.numero = numero
        self.figura_path = figura_path
        self.enunciado_preview = enunciado_preview

    @property
    def local_pdf_path(self) -> Optional[Path]:
        """
        Tenta localizar o PDF original baseado em convenções do projeto.
        Ordem: original/<ano>/ → raw/<ano>/ (busca recursiva; prefere
        arquivos de prova e ignora gabaritos). Retorna None se não encontrado.
        """
        base_orig = PROJECT_ROOT / "data" / "sources" / self.banco / "original" / str(self.ano)
        base_raw = PROJECT_ROOT / "data" / "sources" / self.banco / "raw" / str(self.ano)
        for base in (base_orig, base_raw):
            if not base.is_dir():
                continue
            pdfs = sorted(base.rglob("*.pdf"))
            if not pdfs:
                continue
            # nome explícito contendo mathnet_id/question_id
            for pdf in pdfs:
                if self.mathnet_id in pdf.name or str(self.question_id) in pdf.name:
                    return pdf
            # preferir provas; ignorar gabaritos
            provas = [p for p in pdfs if "gabarito" not in p.name.lower()]
            provas = [p for p in provas if "prova" in str(p).lower()] or provas
            if provas:
                return provas[0]
        return None

    def __repr__(self) -> str:
        return f"<FigureRecord {self.mathnet_id} Q{self.numero} ({self.banco}/{self.ano})>"


# ----------------------------------------------------------------------
# Funções de carregamento de inventário
# ----------------------------------------------------------------------
def load_inventory_csv(path: Path) -> List[FigureRecord]:
    if pd is None:
        raise RuntimeError("pandas não está instalado; não é possível ler CSV")
    df = pd.read_csv(path)
    records: List[FigureRecord] = []
    for _, row in df.iterrows():
        records.append(
            FigureRecord(
                question_id=str(row.get("question_id", "")),
                mathnet_id=str(row.get("mathnet_id", "")),
                banco=str(row.get("banco", "")),
                ano=int(row.get("ano", 0)),
                numero=int(row.get("numero", 0)),
                figura_path=str(row.get("figura_path", "")),
                enunciado_preview=str(row.get("enunciado_preview", "")),
            )
        )
    return records


def load_inventory_json(path: Path) -> List[FigureRecord]:
    data = json.loads(path.read_text(encoding="utf-8"))
    records: List[FigureRecord] = []
    for item in data:
        records.append(
            FigureRecord(
                question_id=item.get("question_id", ""),
                mathnet_id=item.get("mathnet_id", ""),
                banco=item.get("banco", ""),
                ano=int(item.get("ano", 0)),
                numero=int(item.get("numero", 0)),
                figura_path=item.get("figura_path", ""),
                enunciado_preview=item.get("enunciado_preview", ""),
            )
        )
    return records


def load_inventory(path: Path) -> List[FigureRecord]:
    if path.suffix.lower() == ".csv":
        return load_inventory_csv(path)
    elif path.suffix.lower() == ".json":
        return load_inventory_json(path)
    else:
        raise ValueError(f"Formato de inventário não suportado: {path.suffix}")


# ----------------------------------------------------------------------
# Resolução da figura atual (referência/template) e utilidades de imagem
# ----------------------------------------------------------------------
def _pt_to_px(v: float, dpi: int) -> int:
    return int(round(v * dpi / 72.0))


def _px_to_pt(v: float, dpi: int) -> float:
    return v * 72.0 / dpi


def _binarize_from_pil(img, threshold: int = 200):
    """Converte imagem PIL em array uint8 com tinta=255 e fundo=0."""
    if np is None:
        raise RuntimeError("numpy não está disponível neste interpretador")
    arr = np.array(img.convert("L"))
    return np.where(arr < threshold, 255, 0).astype(np.uint8)


def rasterize_svg(svg_path: Path, dpi: int = 144) -> Optional[Path]:
    """Rasteriza um SVG para PNG via PyMuPDF (1 unidade SVG = 1px @72dpi)."""
    if pymupdf is None:
        return None
    try:
        doc = pymupdf.open(str(svg_path))
        pix = doc[0].get_pixmap(dpi=dpi)
        out = svg_path.with_suffix(".raster.png")
        pix.save(str(out))
        doc.close()
        return out
    except Exception:
        return None


def resolve_current_figure(record: "FigureRecord", cache_dir: Path) -> Dict[str, Any]:
    """
    Resolve a figura atualmente publicada (referência) para o contact sheet
    e para template matching. Suporta:
      - URL http(s) (SVG do Supabase Storage): download read-only + raster;
      - caminho local estilo '/data/imagens/...': resolvido a partir do
        PROJECT_ROOT do repositório;
      - ausente: retorna kind='missing'.
    Nunca escreve sobre o original; downloads vão para cache_dir.
    """
    ensure_dir(cache_dir)
    info: Dict[str, Any] = {"kind": "missing", "sheet_path": None, "template_path": None, "source": record.figura_path}
    fp = (record.figura_path or "").strip()
    if not fp:
        return info
    try:
        if fp.startswith("http://") or fp.startswith("https://"):
            ext = Path(fp.split("?")[0]).suffix or ".bin"
            local = cache_dir / f"{record.mathnet_id}{ext}"
            if not local.is_file():
                urllib.request.urlretrieve(fp, local)
            info["source"] = str(local)
            if ext.lower() == ".svg":
                raster = rasterize_svg(local)
                if raster and raster.is_file():
                    info.update(kind="url_svg", sheet_path=str(raster), template_path=str(raster))
                else:
                    info.update(kind="url_svg_raster_failed", sheet_path=str(local))
            else:
                info.update(kind="url_img", sheet_path=str(local), template_path=str(local))
        else:
            # caminho local: aceita 'D:/...' e '/data/imagens/...'
            p = Path(fp)
            if not p.is_absolute():
                p = PROJECT_ROOT / fp.lstrip("/\\")
            if p.is_file():
                if p.suffix.lower() == ".svg":
                    raster = rasterize_svg(p)
                    if raster and raster.is_file():
                        info.update(kind="local_svg", sheet_path=str(raster), template_path=str(raster))
                    else:
                        info.update(kind="local_svg_raster_failed", sheet_path=str(p))
                else:
                    info.update(kind="local_img", sheet_path=str(p), template_path=str(p))
            else:
                info["notes"] = f"figura local não encontrada: {p}"
        return info
    except Exception as e:
        info["notes"] = f"falha ao resolver figura atual: {e}"
        return info


# ----------------------------------------------------------------------
# Localização de questões e figuras (rotas A, B e C)
# ----------------------------------------------------------------------
def _iter_question_start_lines(page):
    """Gera (num, line_bbox) para cada linha que inicia uma questão."""
    d = page.get_text("dict")
    for block in d.get("blocks", []):
        for line in block.get("lines", []):
            text = "".join(s.get("text", "") for s in line.get("spans", [])).strip()
            m = QUESTION_START_RE.match(text)
            if m:
                yield int(m.group("num")), tuple(line["bbox"]), text


def _norm_text(s: str) -> List[str]:
    """Normaliza texto para comparação de associação (sem acentos/latex/pontuação)."""
    import unicodedata
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"\\[a-zA-Z]+|[{}$]", " ", s)
    s = re.sub(r"[^a-zA-Z0-9ç ]", " ", s.lower())
    return [t for t in s.split() if len(t) > 1]


def locate_question_extent(
    doc, numero: int, max_pages_scan: int = 30, enunciado_hint: str = ""
) -> Optional[List[Tuple[int, Any]]]:
    """
    Localiza a extensão (página(s) + coluna + faixa vertical) de uma questão
    em PDFs com camada de texto legível. Retorna lista de
    (page_index, pymupdf.Rect) ou None se não localizar.

    Se enunciado_hint for fornecido, todos os candidatos com o número da
    questão são ranqueados por similaridade com o enunciado esperado
    (confirmação de associação questão↔página) e o melhor é escolhido.
    Páginas com OCR-lixo (texto inutilizável) são ignoradas.
    """
    if pymupdf is None:
        return None
    pages_to_scan = min(doc.page_count, max_pages_scan)
    # 1. coletar TODOS os candidatos (prova vem antes da resolução,
    #    mas números podem iniciar linhas em contexto errado)
    candidates: List[Tuple[int, Tuple[float, float, float, float], str]] = []
    for pno in range(pages_to_scan):
        if not _page_text_usable(doc[pno]):
            continue
        for num, bbox, text in _iter_question_start_lines(doc[pno]):
            if num == numero:
                candidates.append((pno, bbox, text))
    if not candidates:
        return None
    start = candidates[0]
    if enunciado_hint:
        hint_tokens = _norm_text(enunciado_hint)[:14]
        if hint_tokens:
            def _score(cand) -> float:
                pno, bbox, _ = cand
                # texto da questão: da linha inicial até ~4 linhas abaixo
                page = doc[pno]
                rect = pymupdf.Rect(bbox[0], bbox[1], page.rect.width, bbox[3] + 40.0)
                qtext = page.get_text("text", clip=rect)
                qt = set(_norm_text(qtext))
                return sum(1 for t in hint_tokens if t in qt) / len(hint_tokens)
            ranked = sorted(candidates, key=_score, reverse=True)
            start = ranked[0]
            # se o melhor não tem nenhuma palavra em comum, mantém o primeiro
            # (avaliação registrada pelo chamador via scores)
    pno0, (x0, y0, x1, y1) = start[0], start[1]
    page0 = doc[pno0]
    mid = page0.rect.width / 2.0
    col_x0, col_x1 = (0.0, mid) if x0 < mid else (mid, page0.rect.width)
    extents: List[Tuple[int, Any]] = []
    # 2. fim da coluna na página inicial
    next_y = None
    for num, bbox, _ in _iter_question_start_lines(page0):
        if num != numero and bbox[1] > y0 + 1 and (bbox[0] < mid) == (x0 < mid):
            if next_y is None or bbox[1] < next_y:
                next_y = bbox[1]
    y_end = (next_y - 4.0) if next_y else (page0.rect.height - 24.0)
    extents.append((pno0, pymupdf.Rect(col_x0, max(0.0, y0 - 2.0), col_x1, y_end)))
    # 3. continuação na página seguinte (mesma coluna, sem novo início)
    if next_y is None and pno0 + 1 < doc.page_count:
        pnext = doc[pno0 + 1]
        first_lines = [
            (num, bbox)
            for num, bbox, _ in _iter_question_start_lines(pnext)
        ]
        same_col = [b for _, b in first_lines if (b[0] < mid) == (x0 < mid)]
        topmost = min((b for _, b in same_col), key=lambda b: b[1], default=None)
        if topmost is None or topmost[1] > 90.0:  # coluna da próxima pág. não começa com questão
            nxt_y = (topmost[1] - 4.0) if topmost else (pnext.rect.height - 24.0)
            nxt_y0 = 54.0 if topmost is None else 54.0  # pular cabeçalho da página
            if nxt_y > nxt_y0:
                extents.append((pno0 + 1, pymupdf.Rect(col_x0, nxt_y0, col_x1, nxt_y)))
    return extents


def find_embedded_figure(doc, extents) -> Optional[Tuple[Any, List[int], int]]:
    """
    Rota B: agrupa por proximidade as imagens embutidas cujos centros estão
    dentro da extensão da questão (uma mesma figura pode estar fatiada em
    vários objetos, ex.: tabela em linhas-imagem) e retorna o bbox do maior
    cluster. Retorna (bbox_pt, xrefs, page_idx) ou None. Se o cluster tiver
    exatamente 1 xref, a imagem nativa pode ser extraída.
    """
    if pymupdf is None:
        return None
    gap = EMBEDDED_CLUSTER_GAP_PT
    best = None  # (area, rect, xrefs, pno)
    for pno, extent in extents:
        page = doc[pno]
        try:
            infos = page.get_image_info(xrefs=True)
        except TypeError:  # versões antigas do pymupdf
            infos = page.get_image_info()
        cands: List[Tuple[Any, int]] = []
        for info in infos:
            bb = info.get("bbox")
            if bb is None:
                continue
            r = pymupdf.Rect(bb)
            if r.get_area() < 200.0:  # ignora símbolos/sobrescritos minúsculos
                continue
            cx, cy = (r.x0 + r.x1) / 2.0, (r.y0 + r.y1) / 2.0
            if not (extent.x0 <= cx <= extent.x1 and extent.y0 <= cy <= extent.y1):
                continue
            cands.append((r, info.get("xref", -1)))
        if not cands:
            continue
        # clusterização por gap
        clusters: List[List[Tuple[Any, int]]] = []
        for r, xref in cands:
            placed = False
            for c in clusters:
                if any(pymupdf.Rect(q.x0 - gap, q.y0 - gap, q.x1 + gap, q.y1 + gap).intersects(r) for q, _ in c):
                    c.append((r, xref))
                    placed = True
                    break
            if not placed:
                clusters.append([(r, xref)])
        for c in clusters:
            u = c[0][0]
            for q, _ in c[1:]:
                u |= q
            area = u.get_area()
            if area < EMBEDDED_MIN_AREA_PT2:
                continue
            if best is None or area > best[0]:
                best = (area, u, [x for _, x in c], pno)
    if best is None:
        return None
    return best[1], best[2], best[3]


def find_vector_cluster(doc, extents) -> Optional[Tuple[Any, int]]:
    """
    Rota A: agrupa desenhos vetoriais dentro da extensão da questão e
    retorna o bbox do maior cluster (page, rect) ou None.
    Exclui réguas de coluna/página (largas e finas).
    """
    if pymupdf is None:
        return None
    for pno, extent in extents:
        page = doc[pno]
        pw = page.rect.width
        rects = []
        try:
            drawings = page.get_drawings()
        except Exception:
            return None
        for d in drawings:
            r = d.get("rect")
            if r is None:
                continue
            if r.width > 0.8 * pw and r.height < 3.0:  # régua/linha separadora
                continue
            if r.get_area() < 4.0:
                continue
            if not (extent.intersects(r)):
                continue
            rects.append(r)
        if len(rects) < VECTOR_MIN_PATHS:
            continue
        # clusterização por proximidade (merge iterativo)
        def _expanded(r, gap: float):
            return pymupdf.Rect(r.x0 - gap, r.y0 - gap, r.x1 + gap, r.y1 + gap)

        clusters: List[List] = [[r] for r in rects]
        merged = True
        while merged:
            merged = False
            out: List[List] = []
            for c in clusters:
                placed = False
                for i, o in enumerate(out):
                    oc = o[0]
                    for r in o[1:]:
                        oc |= r
                    if any(_expanded(oc, VECTOR_CLUSTER_GAP_PT).intersects(r) for r in c):
                        out[i] = o + c
                        placed = True
                        merged = True
                        break
                if not placed:
                    out.append(c)
            clusters = out
        best = None
        for c in clusters:
            u = c[0]
            for r in c[1:]:
                u |= r
            if len(c) >= VECTOR_MIN_PATHS and u.get_area() >= VECTOR_MIN_AREA_PT2:
                if best is None or u.get_area() > best.get_area():
                    best = u
        if best is not None:
            return best, pno
    return None


def template_match_figure(doc, template_path: Path, page_indices=None) -> Optional[Dict[str, Any]]:
    """
    Rota C (escaneado): casamento por template da figura publicada
    (rasterizada) contra as páginas do PDF renderizadas a ANALYSIS_DPI,
    em múltiplas escalas. Retorna dict com best/second/ambiguous ou None.
    """
    if cv2 is None or np is None:
        raise RuntimeError("cv2/numpy ausentes — use o Python 3.12 do sistema")
    from PIL import Image
    tmpl = Image.open(template_path)
    tarr = _binarize_from_pil(tmpl)
    th0, tw0 = tarr.shape[:2]
    if page_indices is None:
        page_indices = range(doc.page_count)
    results = []
    for pno in page_indices:
        pix = doc[pno].get_pixmap(dpi=ANALYSIS_DPI)
        img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        pbin = _binarize_from_pil(img)
        page_best = -1.0
        scales_done = 0
        for s in TEMPLATE_SCALES:
            tw, th = max(8, int(tw0 * s)), max(8, int(th0 * s))
            if tw >= pbin.shape[1] or th >= pbin.shape[0]:
                continue
            tsmall = cv2.resize(tarr, (tw, th), interpolation=cv2.INTER_AREA)
            res = cv2.matchTemplate(pbin, tsmall, cv2.TM_CCOEFF_NORMED)
            res = np.nan_to_num(res, nan=-1.0, posinf=-1.0, neginf=-1.0)
            _, maxv, _, maxloc = cv2.minMaxLoc(res)
            results.append({"score": float(maxv), "page": pno, "x": maxloc[0], "y": maxloc[1], "w": tw, "h": th})
            page_best = max(page_best, float(maxv))
            scales_done += 1
            if page_best >= 0.80:  # match forte: pula escalas restantes desta página
                break
            if scales_done >= 6 and page_best < TEMPLATE_EARLY_EXIT_PAGE:
                break  # página sem chance: descarta escalas restantes
    if not results:
        return None
    results.sort(key=lambda r: -r["score"])
    best = results[0]
    second = next((r for r in results[1:] if r["page"] != best["page"]), None)
    ambiguous = bool(
        second is not None
        and second["score"] >= TEMPLATE_MIN_SCORE
        and (best["score"] - second["score"]) < TEMPLATE_AMBIGUOUS_DELTA
    )
    # top-3 páginas distintas (páginas 1-based), p/ auditoria prova × resolução
    top_matches, seen = [], set()
    for r in results:
        if r["page"] not in seen:
            seen.add(r["page"])
            top_matches.append({**r, "page": r["page"] + 1})
        if len(top_matches) >= 3:
            break
    return {"best": best, "second": second, "ambiguous": ambiguous, "top_matches": top_matches}


def adaptive_expand_bbox(
    page_bin,
    bbox_px: Tuple[int, int, int, int],
    min_pad: int = MIN_PAD_PX,
    gap: int = WHITESPACE_GAP_PX,
    max_frac: float = MAX_EXPAND_FRAC,
) -> Tuple[Tuple[int, int, int, int], Dict[str, int]]:
    """
    Margens adaptativas: aplica margem mínima e expande cada lado enquanto
    houver tinta na banda adjacente (elementos decepados), parando em gap
    de whitespace, limite de expansão ou borda da página.
    Retorna (bbox_final, margens_aplicadas_por_lado em px).
    """
    h, w = page_bin.shape[:2]
    bx0, by0, bx1, by1 = bbox_px  # bbox original da figura
    x0, y0, x1, y1 = bx0, by0, bx1, by1
    max_expand = int(max_frac * max(x1 - x0, y1 - y0))

    def has_ink(a, b, c, d):
        a, b = max(0, a), max(0, b)
        c, d = min(w, c), min(h, d)
        if a >= c or b >= d:
            return False
        return bool((page_bin[b:d, a:c] > 0).any())

    # margem mínima
    x0 -= min_pad; y0 -= min_pad; x1 += min_pad; y1 += min_pad
    # expansão por tinta
    for side in ("left", "right", "top", "bottom"):
        done = 0
        while done < max_expand:
            if side == "left":
                if x0 - gap < 0 or not has_ink(x0 - gap, y0, x0, y1):
                    break
                x0 -= gap
            elif side == "right":
                if x1 + gap > w or not has_ink(x1, y0, x1 + gap, y1):
                    break
                x1 += gap
            elif side == "top":
                if y0 - gap < 0 or not has_ink(x0, y0 - gap, x1, y0):
                    break
                y0 -= gap
            else:
                if y1 + gap > h or not has_ink(x0, y1, x1, y1 + gap):
                    break
                y1 += gap
            done += gap
    # clamp
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(w, x1), min(h, y1)
    margins = {
        "left": bx0 - x0, "right": x1 - bx1,
        "top": by0 - y0, "bottom": y1 - by1,
    }
    return (x0, y0, x1, y1), margins


def render_clip(doc, page_idx: int, rect_pt, dpi: int, out_path: Path) -> Tuple[Path, Tuple[int, int]]:
    """Renderiza um recorte (pontos PDF) em alta resolução via PyMuPDF."""
    page = doc[page_idx]
    clip = pymupdf.Rect(rect_pt) & page.rect
    pix = page.get_pixmap(dpi=dpi, clip=clip)
    pix.save(str(out_path))
    return out_path, (pix.width, pix.height)


def extract_embedded_native(doc, xref: int, out_path: Path) -> Optional[Path]:
    """Extrai a imagem embutida original (bytes nativos) do PDF."""
    try:
        pix = pymupdf.Pixmap(doc, xref)
        if pix.colorspace and pix.colorspace.n > 3:
            pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
        pix.save(str(out_path))
        return out_path
    except Exception:
        return None


# ----------------------------------------------------------------------
# Extração de figura a partir de PDF (legado: pdftoppm / página inteira)
# ----------------------------------------------------------------------
def render_page_to_image(pdf_path: Path, page_number: int, dpi: int = DEFAULT_DPI) -> Path:
    """
    Renderiza uma página do PDF para uma imagem PNG usando pdftoppm.
    Retorna o caminho da imagem gerada.
    """
    with tempfile.TemporaryDirectory() as td:
        out_prefix = Path(td) / "page"
        cmd = [
            "pdftoppm",
            "-png",
            "-rx", str(dpi),
            "-ry", str(dpi),
            "-f", str(page_number),
            "-l", str(page_number),
            str(pdf_path),
            str(out_prefix),
        ]
        proc = run_cmd(cmd)
        if proc.returncode != 0:
            raise RuntimeError(f"pdftoppm falhou: {proc.stderr}")
        # pdftoppm gera <prefix>-<page_number>.png
        img_path = out_prefix.with_name(f"{out_prefix.name}-{page_number}.png")
        if not img_path.is_file():
            # fallback: try to find any file matching pattern
            candidates = list(Path(td).glob(f"{out_prefix.name}-*.png"))
            if candidates:
                img_path = candidates[0]
            else:
                raise FileNotFoundError(f"Imagem renderizada não encontrada em {td}")
        # copiar para um local temporário persistente
        tmp_out = PROJECT_ROOT / "tmp" / f"{pdf_path.stem}_p{page_number}.png"
        ensure_dir(tmp_out.parent)
        tmp_out.write_bytes(img_path.read_bytes())
        return tmp_out


def detect_figure_bbox(
    page_img: Path,
    mathnet_id: str,
    # Estratégia simples: tentar localizar um template salvo; se não, usar OCR ou fallback
) -> Tuple[int, int, int, int]:
    """
    Detecta a bounding box da figura na imagem da página.
    Retorna (x, y, width, height) em pixels da imagem renderizada.
    Por enquanto, retorna a caixa inteira da página (fallback).
    """
    # TODO: implementar detecção real via template matching, OCR ou features.
    # Como placeholder, usamos a imagem inteira.
    try:
        from PIL import Image  # type: ignore
        with Image.open(page_img) as img:
            w, h = img.size
        return (0, 0, w, h)
    except Exception as e:  # pragma: no cover
        # Final fallback: retorna caixa vazia
        return (0, 0, 0, 0)


def crop_with_margin(
    src_img: Path,
    bbox: Tuple[int, int, int, int],
    margin_px: int = DEFAULT_MARGIN_PCX,
) -> Path:
    """
    Recorta a região da imagem com margem de segurança.
    Retorna o caminho da imagem recortada.
    """
    try:
        from PIL import Image  # type: ignore
        img = Image.open(src_img)
        w, h = img.size
        x, y, width, height = bbox
        x0 = max(x - margin_px, 0)
        y0 = max(y - margin_px, 0)
        x1 = min(x + width + margin_px, w)
        y1 = min(y + height + margin_px, h)
        crop = img.crop((x0, y0, x1, y1))
        out_path = PROJECT_ROOT / "tmp" / f"crop_{src_img.stem}_{x0}_{y0}_{x1}_{y1}.png"
        ensure_dir(out_path.parent)
        crop.save(out_path)
        return out_path
    except Exception as e:  # pragma: no cover
        raise RuntimeError(f"Falha ao recortar com margem: {e}")


# ----------------------------------------------------------------------
# Validação básica (estrutural)
# ----------------------------------------------------------------------
def validate_structural(img_path: Path, min_dim: int = 8, require_ink: bool = False) -> bool:
    """
    Verifica se o arquivo é uma imagem válida (PNG, SVG) e não está corrompida.
    PNG: magic + verificação de integridade via PIL + dimensões mínimas +
    (opcional) presença de tinta (razão de pixels escuros entre 0.1% e 99.5%).
    SVG: XML bem formado com <svg>...</svg>.
    """
    if img_path is None:
        return False
    p = Path(img_path)
    if not p.is_file() or p.stat().st_size == 0:
        return False
    suf = p.suffix.lower()
    if suf == ".png":
        try:
            from PIL import Image  # type: ignore
            with Image.open(p) as img:
                img.verify()  # integridade
            with Image.open(p) as img:
                w, h = img.size
                if w < min_dim or h < min_dim:
                    return False
                if require_ink:
                    g = img.convert("L")
                    hist = g.histogram()
                    dark = sum(hist[:200])
                    total = w * h
                    if total <= 0:
                        return False
                    ink_ratio = dark / total
                    if ink_ratio < 0.001 or ink_ratio > 0.995:
                        return False
            return True
        except Exception:
            return False
    elif suf == ".svg":
        try:
            content = p.read_text(encoding="utf-8")
            return "<svg" in content and "</svg>" in content
        except Exception:
            return False
    else:
        return False


# ----------------------------------------------------------------------
# Geração de relatório
# ----------------------------------------------------------------------
def build_report(records: List[FigureRecord], results: List[Dict[str, Any]], report_dir: Path) -> Tuple[Path, Path]:
    """
    Gera arquivos CSV e JSON com o relatório de reprocessamento.
    """
    ensure_dir(report_dir)
    csv_path = report_dir / "reprocess_report.csv"
    json_path = report_dir / "reprocess_report.json"

    # Preparar linhas para CSV (campos aninhados serializados como JSON)
    rows = []
    for rec, res in zip(records, results):
        row = {
            "question_id": rec.question_id,
            "mathnet_id": rec.mathnet_id,
            "banca": rec.banco,
            "ano": rec.ano,
            "numero": rec.numero,
            "original_figura_path": rec.figura_path,
            "pdf_origem": res.get("pdf_origem", ""),
            "estrategia": res.get("strategy", ""),
            "rota": res.get("route", ""),
            "status": res.get("status", "UNKNOWN"),
            "status_visual": res.get("visual_status", ""),
            "metodo_extracao": res.get("method", ""),
            "pagina_origem": res.get("page", ""),
            "bbox_origem_pt": res.get("bbox_pt_origem", ""),
            "bbox_final_pt": res.get("bbox_pt_final", ""),
            "origem_bbox": res.get("bbox_source", ""),
            "margens_px": json.dumps(res.get("margins_px", {}), ensure_ascii=False),
            "analysis_dpi": res.get("analysis_dpi", ""),
            "render_dpi": res.get("render_dpi", ""),
            "template_score": res.get("template_score", ""),
            "atinge_borda_pagina": res.get("reaches_page_edge", ""),
            "dimensoes_saida": res.get("output_dimensions", ""),
            "caminho_saida": res.get("output_path", ""),
            "caminho_native": res.get("native_path", ""),
            "folha_contato": res.get("contact_sheet", ""),
            "validade_estrutural": res.get("structural_valid", False),
            "figura_atual_tipo": (res.get("current_figure") or {}).get("kind", ""),
            "timings_ms": json.dumps(res.get("timings", {}), ensure_ascii=False),
            "observacoes": res.get("notes", ""),
        }
        rows.append(row)

    if pd is not None:
        df = pd.DataFrame(rows)
        df.to_csv(csv_path, index=False)
    else:
        # Fallback manual
        import csv
        with csv_path.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=rows[0].keys() if rows else [])
            writer.writeheader()
            writer.writerows(rows)

    json_path.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    return csv_path, json_path


# ----------------------------------------------------------------------
# Pipeline principal
# ----------------------------------------------------------------------
def _unique_output_path(path: Path) -> Tuple[Path, bool]:
    """Nunca sobrescreve: se existir, usa sufixo _v2, _v3... Retorna (path, usou_sufixo)."""
    if not path.exists():
        return path, False
    for i in range(2, 100):
        cand = path.with_name(f"{path.stem}_v{i}{path.suffix}")
        if not cand.exists():
            return cand, True
    raise RuntimeError(f"não foi possível gerar nome único para {path}")


def _page_text_usable(page) -> bool:
    """
    Heurística: a página tem camada de texto legível (não lixo de OCR)?
    Lixo de OCR = excesso de chars de controle (<0x20). Fontes simbólicas
    (setas \uf0ae etc., private use area) são texto legítimo de fórmulas.
    """
    t = page.get_text().strip()
    if len(t) < 40:
        return False
    control = sum(1 for ch in t if ord(ch) < 32 and ch not in "\n\t\r")
    if control / len(t) > 0.10:
        return False
    alnum_or_space = sum(ch.isalnum() or ch.isspace() for ch in t)
    return (alnum_or_space / len(t)) > 0.75


def build_contact_sheet(record: FigureRecord, current_img, new_img, meta: Dict[str, Any], out_path: Path) -> Path:
    """Folha de contato: [figura atual | novo recorte] + metadados da extração."""
    from PIL import Image, ImageDraw, ImageFont
    HEADER_H, PANEL_MAX_W, PANEL_MAX_H, PAD = 110, 620, 520, 16
    try:
        font = ImageFont.truetype("arial.ttf", 14)
        font_small = ImageFont.truetype("arial.ttf", 12)
    except Exception:
        font = font_small = ImageFont.load_default()

    def load(p):
        if p and Path(p).is_file():
            try:
                return Image.open(p).convert("RGB")
            except Exception:
                return None
        return None

    def scaled(im):
        w, h = im.size
        f = min(PANEL_MAX_W / w, PANEL_MAX_H / h, 1.0)
        return im.resize((max(1, int(w * f)), max(1, int(h * f))))

    cur, new = load(current_img), load(new_img)
    panels = [
        scaled(cur) if cur else Image.new("RGB", (300, 120), (225, 225, 225)),
        scaled(new) if new else Image.new("RGB", (300, 120), (225, 225, 225)),
    ]
    W = PAD * 3 + sum(p.width for p in panels)
    H = HEADER_H + max(p.height for p in panels) + PAD + 8
    sheet = Image.new("RGB", (W, H), (245, 245, 245))
    d = ImageDraw.Draw(sheet)
    line1 = (f"{record.mathnet_id}  |  {record.banco.upper()} {record.ano} Q{record.numero}  |  "
             f"metodo={meta.get('route')}  pag={meta.get('page')}  origem_bbox={meta.get('bbox_source')}")
    line2 = (f"bbox_pt={meta.get('bbox_pt')}  |  render_dpi={meta.get('render_dpi')}  "
             f"margens_px={meta.get('margins_px')}")
    line3 = (f"dims_saida={meta.get('dims')}  |  status={meta.get('status')}  "
             f"visual={meta.get('visual_status')}  template_score={meta.get('template_score')}")
    d.text((PAD, 8), line1, fill=(20, 20, 20), font=font)
    d.text((PAD, 30), line2, fill=(60, 60, 60), font=font_small)
    d.text((PAD, 50), line3, fill=(60, 60, 60), font=font_small)
    x = PAD
    for p, lab in zip(panels, ("ATUAL (publicada)", "NOVO RECORTE")):
        d.text((x, 74), lab, fill=(0, 0, 0), font=font)
        sheet.paste(p, (x, HEADER_H))
        d.rectangle([x - 1, HEADER_H - 1, x + p.width, HEADER_H + p.height], outline=(120, 120, 120))
        x += p.width + PAD
    out_path, _ = _unique_output_path(out_path)
    sheet.save(out_path)
    return out_path


def process_figure(record: FigureRecord, args: argparse.Namespace) -> Dict[str, Any]:
    """
    Processa uma única figura com extração adaptativa:
      auto → texto/embedded (Rota B) → vetor (Rota A) → template (Rota C-scan)
      manual → página+bbox fornecidos por revisão humana
      fullpage → legado; MARCADO MANUAL_REVIEW_REQUIRED (não é recuperação)
    """
    t_total = time.perf_counter()
    result: Dict[str, Any] = {
        "question_id": record.question_id,
        "mathnet_id": record.mathnet_id,
        "banca": record.banco,
        "ano": record.ano,
        "numero": record.numero,
        "status": STATUS_SOURCE_MISSING,
        "visual_status": VISUAL_PENDING,
        "notes": "",
        "timings": {},
        "strategy": getattr(args, "strategy", "auto"),
    }

    def _finish() -> Dict[str, Any]:
        result["timings"]["total_ms"] = round((time.perf_counter() - t_total) * 1000, 1)
        return result

    pdf_path = record.local_pdf_path
    result["pdf_origem"] = str(pdf_path) if pdf_path else ""
    if pdf_path is None or not pdf_path.is_file():
        result["notes"] = f"PDF original não encontrado para {record.mathnet_id}"
        return _finish()
    if pymupdf is None:
        result["status"] = STATUS_MANUAL_REVIEW
        result["notes"] = "pymupdf ausente neste interpretador (use o Python 3.12 do sistema)"
        return _finish()

    doc = pymupdf.open(str(pdf_path))
    strategy = getattr(args, "strategy", "auto")
    route, page_idx, bbox_pt, bbox_source = None, None, None, None
    extra: Dict[str, Any] = {}

    # figura atual (referência para contact sheet e/ou template)
    cur = resolve_current_figure(record, Path(args.report_dir) / "current_cache")
    result["current_figure"] = {k: cur.get(k) for k in ("kind", "source", "notes")}

    # ---------------- seleção da região ----------------
    if strategy == "manual":
        if not getattr(args, "page", None) or not getattr(args, "region", None):
            result["status"] = STATUS_MANUAL_REVIEW
            result["notes"] = "--strategy manual exige --page N e --region x0,y0,x1,y1 (pontos PDF)"
            return _finish()
        page_idx = int(args.page) - 1
        try:
            bbox_pt = tuple(float(v) for v in str(args.region).split(","))
            if len(bbox_pt) != 4 or bbox_pt[2] <= bbox_pt[0] or bbox_pt[3] <= bbox_pt[1]:
                raise ValueError
        except Exception:
            result["status"] = STATUS_MANUAL_REVIEW
            result["notes"] = f"--region inválido: {args.region} (esperado x0,y0,x1,y1)"
            return _finish()
        route, bbox_source = "manual", "manual"
    else:
        extents = None
        if strategy in ("auto", "embedded", "vector"):
            t0 = time.perf_counter()
            # localização por texto; páginas com OCR-lixo são ignoradas
            # internamente (gate _page_text_usable)
            extents = locate_question_extent(
                doc, record.numero, enunciado_hint=record.enunciado_preview
            )
            result["timings"]["locate_ms"] = round((time.perf_counter() - t0) * 1000, 1)
        if extents:
            result["question_located"] = True
        else:
            result["question_located"] = False

        emb = None
        if strategy in ("auto", "embedded") and extents:
            t0 = time.perf_counter()
            emb = find_embedded_figure(doc, extents)
            result["timings"]["embedded_ms"] = round((time.perf_counter() - t0) * 1000, 1)
        if emb:
            bbox_pt, page_idx = tuple(emb[0]), emb[2]
            route, bbox_source = "embedded_native", "imagem_embutida"
            extra["xref"] = emb[1][0] if len(emb[1]) == 1 else None
            extra["xrefs"] = emb[1]
        elif strategy in ("auto", "vector") and extents:
            t0 = time.perf_counter()
            vec = find_vector_cluster(doc, extents)
            result["timings"]["vector_ms"] = round((time.perf_counter() - t0) * 1000, 1)
            if vec:
                bbox_pt, page_idx = tuple(vec[0]), vec[1]
                route, bbox_source = "vector_cluster", "desenhos_vetoriais"
        if route is None and strategy in ("auto", "template") and cur.get("template_path") and Path(cur["template_path"]).is_file():
            t0 = time.perf_counter()
            try:
                match = template_match_figure(doc, Path(cur["template_path"]))
            except RuntimeError as e:
                match, extra["template_error"] = None, str(e)
            result["timings"]["template_ms"] = round((time.perf_counter() - t0) * 1000, 1)
            if match:
                b = match["best"]
                extra["template_score"] = round(b["score"], 4)
                extra["template_scale_px"] = [b["w"], b["h"]]
                if match["second"]:
                    extra["template_second"] = {"page": match["second"]["page"] + 1, "score": round(match["second"]["score"], 4)}
                extra["template_matches"] = match.get("top_matches")
                if b["score"] >= TEMPLATE_MIN_SCORE and not match["ambiguous"]:
                    page_idx = b["page"]
                    bbox_pt = (
                        _px_to_pt(b["x"], ANALYSIS_DPI), _px_to_pt(b["y"], ANALYSIS_DPI),
                        _px_to_pt(b["x"] + b["w"], ANALYSIS_DPI), _px_to_pt(b["y"] + b["h"], ANALYSIS_DPI),
                    )
                    route, bbox_source = "template_scan", "template_da_figura_publicada"
                elif match["ambiguous"]:
                    extra["template_ambiguous"] = True
        if route is None and strategy == "fullpage":
            page_idx = (int(args.page) - 1) if getattr(args, "page", None) else 0
            pg = doc[page_idx]
            bbox_pt = (0.0, 0.0, pg.rect.width, pg.rect.height)
            route, bbox_source = "fullpage_fallback", "pagina_inteira"

        if route is None:
            result["status"] = STATUS_MANUAL_REVIEW
            notes = []
            if not extents:
                notes.append("questão não localizável por texto (sem camada legível ou numeração fora do padrão)")
            else:
                notes.append("sem imagem embutida e sem cluster vetorial na extensão da questão")
            if extra.get("template_error"):
                notes.append(f"template matching indisponível: {extra['template_error']}")
            elif "template_score" in extra and extra.get("template_ambiguous"):
                notes.append("template matching ambíguo (score similar em outra página)")
            elif "template_score" in extra:
                notes.append(f"template matching abaixo do limiar (score={extra['template_score']} < {TEMPLATE_MIN_SCORE})")
            elif cur.get("template_path") is None:
                notes.append("sem figura publicada para usar como template")
            result["notes"] = "; ".join(notes)
            result["route"] = None
            return _finish()

    # invariante: rota definida => página e região definidas
    assert page_idx is not None and bbox_pt is not None, "rota sem região definida"

    # ---------------- margens adaptativas ----------------
    from PIL import Image
    t0 = time.perf_counter()
    page = doc[page_idx]
    pix = page.get_pixmap(dpi=ANALYSIS_DPI)
    page_img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    page_bin = _binarize_from_pil(page_img)
    bbox_px = (
        _pt_to_px(bbox_pt[0], ANALYSIS_DPI), _pt_to_px(bbox_pt[1], ANALYSIS_DPI),
        _pt_to_px(bbox_pt[2], ANALYSIS_DPI), _pt_to_px(bbox_pt[3], ANALYSIS_DPI),
    )
    if route in ("embedded_native", "vector_cluster", "template_scan"):
        bbox_px_final, margins_px = adaptive_expand_bbox(page_bin, bbox_px)
    else:  # manual/fullpage: região explícita; apenas clamp aos limites da página
        bbox_px_final = (
            max(0, bbox_px[0]), max(0, bbox_px[1]),
            min(pix.width, bbox_px[2]), min(pix.height, bbox_px[3]),
        )
        margins_px = {"left": 0, "right": 0, "top": 0, "bottom": 0}
    result["timings"]["margins_ms"] = round((time.perf_counter() - t0) * 1000, 1)
    bbox_final_pt = tuple(round(_px_to_pt(v, ANALYSIS_DPI), 2) for v in bbox_px_final)
    result["reaches_page_edge"] = bool(
        bbox_px_final[0] <= 0 or bbox_px_final[1] <= 0
        or bbox_px_final[2] >= pix.width or bbox_px_final[3] >= pix.height
    )

    # ---------------- render final + artefatos ----------------
    out_dir = Path(args.report_dir)
    ensure_dir(out_dir)
    base_name = f"{record.mathnet_id}_reproc"
    out_png, suffixed = _unique_output_path(out_dir / f"{base_name}.png")
    check_file: Optional[Path] = None
    dims = (0, 0)
    if is_dryrun(args):
        # dry-run: renderiza em tmp apenas para validação; nada é gravado no report_dir
        tmp_dir = PROJECT_ROOT / "tmp" / "reprocess_dryrun"
        ensure_dir(tmp_dir)
        tmp_png, _ = _unique_output_path(tmp_dir / f"{base_name}.png")
        t0 = time.perf_counter()
        tmp_png, dims = render_clip(doc, page_idx, bbox_final_pt, args.dpi, tmp_png)
        result["timings"]["render_ms"] = round((time.perf_counter() - t0) * 1000, 1)
        check_file = tmp_png
        result["output_path"] = str(out_png) + " (dry-run; não gravado no report_dir)"
        result["dry_run_tmp_render"] = str(tmp_png)
    else:
        t0 = time.perf_counter()
        out_png, dims = render_clip(doc, page_idx, bbox_final_pt, args.dpi, out_png)
        result["timings"]["render_ms"] = round((time.perf_counter() - t0) * 1000, 1)
        check_file = out_png
        result["output_path"] = str(out_png)
        result["output_suffixed"] = suffixed
        if route == "embedded_native" and extra.get("xref"):
            nat, _ = _unique_output_path(out_dir / f"{base_name}_native.png")
            if extract_embedded_native(doc, extra["xref"], nat):
                result["native_path"] = str(nat)

    # ---------------- validação estrutural ----------------
    struct_ok = validate_structural(check_file, require_ink=True)
    result["structural_valid"] = struct_ok
    if not struct_ok:
        result["status"] = STATUS_FAIL_STRUCT
        result["notes"] += " validação estrutural falhou (arquivo inválido/vazio/sem tinta)"
    else:
        result["status"] = STATUS_PASS_STRUCT
    if route == "fullpage_fallback":
        # página inteira NÃO é recuperação — exige revisão manual da região
        result["status"] = STATUS_MANUAL_REVIEW
        result["notes"] += " [fullpage: região não determinada — recorte genérico não é recuperação]"
    if is_dryrun(args):
        result["notes"] += " [DRY-RUN]"

    result.update(
        {
            "route": route,
            "method": route,  # compat com relatórios anteriores
            "bbox_source": bbox_source,
            "page": page_idx + 1,
            "bbox_pt_origem": [round(v, 2) for v in bbox_pt],
            "bbox_pt_final": list(bbox_final_pt),
            "bbox": [round(v, 2) for v in bbox_pt],  # compat
            "analysis_dpi": ANALYSIS_DPI,
            "render_dpi": args.dpi,
            "margins_px": margins_px,
            "output_dimensions": f"{dims[0]}x{dims[1]}",
            "template_score": extra.get("template_score"),
            "template_second": extra.get("template_second"),
            "template_matches": extra.get("template_matches"),
            "xref": extra.get("xref"),
        }
    )

    # ---------------- folha de contato ----------------
    if not is_dryrun(args):
        t0 = time.perf_counter()
        sheets_dir = out_dir / "contact_sheets"
        ensure_dir(sheets_dir)
        sheet = build_contact_sheet(
            record,
            cur.get("sheet_path"),
            str(out_png),
            {
                "route": route, "page": page_idx + 1, "bbox_source": bbox_source,
                "bbox_pt": list(bbox_final_pt), "render_dpi": args.dpi,
                "margins_px": margins_px, "dims": result["output_dimensions"],
                "status": result["status"], "visual_status": result["visual_status"],
                "template_score": extra.get("template_score"),
            },
            sheets_dir / f"{record.mathnet_id}_sheet.png",
        )
        result["contact_sheet"] = str(sheet)
        result["timings"]["sheet_ms"] = round((time.perf_counter() - t0) * 1000, 1)

    doc.close()
    return _finish()


def main() -> None:
    parser = argparse.ArgumentParser(description="Reprocessador seletivo de figuras do LemmaS")
    group = parser.add_mutually_exclusive_group(required=False)
    group.add_argument(
        "--ids",
        nargs="+",
        type=int,
        help="Lista de question_ids para processar",
    )
    group.add_argument(
        "--inventory",
        type=Path,
        help="Caminho para CSV ou JSON de inventário (filtrar por --ids se também fornecido)",
    )
    parser.add_argument(
        "--banco",
        help="Filtrar por banco (quando usar --inventory)",
    )
    parser.add_argument(
        "--ano",
        type=int,
        help="Filtrar por ano (quando usar --inventory)",
    )
    parser.add_argument(
        "--strategy",
        choices=["auto", "embedded", "vector", "template", "manual", "fullpage"],
        default="auto",
        help=("Rota de extração: auto (texto→embedded→vetor→template), "
              "embedded, vector, template, manual (exige --page/--region), "
              "fullpage (legado; resultado marcado MANUAL_REVIEW_REQUIRED)"),
    )
    parser.add_argument(
        "--page",
        type=int,
        help="Página (1-based) para --strategy manual/fullpage",
    )
    parser.add_argument(
        "--region",
        help="Região x0,y0,x1,y1 em PONTOS PDF para --strategy manual",
    )
    parser.add_argument(
        "--record-visual",
        nargs="+",
        metavar="ID=VEREDITO",
        help=("Registra veredito visual (PASS_VISUAL|FAIL_VISUAL) por mathnet_id "
              "em reprocess_report.json existente. Ex.: --record-visual "
              "militar_afa_2011_q06=PASS_VISUAL. Nunca é atribuído automaticamente."),
    )
    parser.add_argument(
        "--dpi",
        type=int,
        default=DEFAULT_DPI,
        help=f"DPI do render final do recorte (padrão: {DEFAULT_DPI})",
    )
    parser.add_argument(
        "--margin",
        type=int,
        default=DEFAULT_MARGIN_PCX,
        help=f"Margem legada em pixels (usada só em --strategy fullpage; padrão: {DEFAULT_MARGIN_PCX})",
    )
    parser.add_argument(
        "--report-dir",
        type=Path,
        default=DEFAULT_REPORT_DIR,
        help=f"Diretório onde relatórios e figuras reprocessadas serão salvos (padrão: {DEFAULT_REPORT_DIR})",
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Executar realmente (sem este flag, o modo dry-run é ativado)",
    )
    args = parser.parse_args()

    # ---------- fluxo: registrar veredito visual ----------
    if args.record_visual:
        report_json = args.report_dir / "reprocess_report.json"
        report_csv = args.report_dir / "reprocess_report.csv"
        if not report_json.is_file():
            sys.exit(f"Relatório não encontrado: {report_json} (gere-o antes de registrar vereditos)")
        valid = {"PASS_VISUAL", "FAIL_VISUAL"}
        mapping: Dict[str, str] = {}
        for rv in args.record_visual:
            if "=" not in rv:
                sys.exit(f"Formato inválido: {rv!r} (use mathnet_id=PASS_VISUAL|FAIL_VISUAL)")
            ident, verdict = rv.split("=", 1)
            ident, verdict = ident.strip(), verdict.strip()
            if verdict not in valid:
                sys.exit(f"Veredito inválido: {verdict!r} (use {sorted(valid)})")
            mapping[ident] = verdict
        data = json.loads(report_json.read_text(encoding="utf-8"))
        updated = 0
        for entry in data:
            if entry.get("mathnet_id") in mapping:
                entry["visual_status"] = mapping[entry["mathnet_id"]]
                updated += 1
        report_json.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        if report_csv.is_file():
            import csv as _csv
            with report_csv.open(newline="", encoding="utf-8") as f:
                rows = list(_csv.DictReader(f))
                fieldnames = list(rows[0].keys()) if rows else []
            for row in rows:
                if row.get("mathnet_id") in mapping:
                    row["status_visual"] = mapping[row["mathnet_id"]]
            with report_csv.open("w", newline="", encoding="utf-8") as f:
                w = _csv.DictWriter(f, fieldnames=fieldnames or ["mathnet_id", "status_visual"])
                w.writeheader()
                w.writerows(rows)
        print(f"Vereditos visuais registrados: {updated} registro(s) atualizado(s) em {report_json}")
        return

    if not args.ids and not args.inventory:
        parser.error("informe --inventory, --ids ou --record-visual")

    # Carregar registros
    records: List[FigureRecord] = []
    if args.inventory:
        if not args.inventory.is_file():
            sys.exit(f"Arquivo de inventário não encontrado: {args.inventory}")
        records = load_inventory(args.inventory)
        # Aplicar filtros
        if args.banco:
            records = [r for r in records if r.banco.lower() == args.banco.lower()]
        if args.ano is not None:
            records = [r for r in records if r.ano == args.ano]
    if args.ids:
        if records:
            records = [r for r in records if _id_matches(r, args.ids)]
        else:
            sys.exit("--ids sem --inventory não é suportado: forneça o inventário de auditoria")

    if not records:
        print("Nenhum registro encontrado para processar com os filtros fornecidos.")
        sys.exit(0)

    print(f"Processando {len(records)} figura(s) (dry-run: {is_dryrun(args)}, strategy: {args.strategy})...")

    results: List[Dict[str, Any]] = []
    for rec in records:
        print(f"  - {rec}")
        res = process_figure(rec, args)
        results.append(res)
        print(f"      rota={res.get('route')} status={res.get('status')} visual={res.get('visual_status')}")

    # Gerar relatório
    ensure_dir(args.report_dir)
    csv_path, json_path = build_report(records, results, args.report_dir)
    print(f"\nRelatório gerado:")
    print(f"  CSV: {csv_path}")
    print(f"  JSON: {json_path}")

    # Imprimir resumo
    status_counts: Dict[str, int] = {}
    for r in results:
        s = r.get("status", "UNKNOWN")
        status_counts[s] = status_counts.get(s, 0) + 1
    print("\nResumo por status (estrutural):")
    for status, count in sorted(status_counts.items()):
        print(f"  {status}: {count}")
    print("Vereditos visuais: use --record-visual id=PASS_VISUAL|FAIL_VISUAL após inspeção das folhas de contato.")


def _id_matches(rec: FigureRecord, ids: List[int]) -> bool:
    """Compara question_id numérico ou textual com a lista de --ids."""
    try:
        return int(rec.question_id) in ids
    except (TypeError, ValueError):
        return str(rec.question_id) in {str(i) for i in ids}


if __name__ == "__main__":
    main()