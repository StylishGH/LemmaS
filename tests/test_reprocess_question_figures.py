"""
Testes unitários do reprocessador seletivo de figuras
(scripts/tools/reprocess_question_figures.py).

Cobrem recorte, validação estrutural, margens adaptativas, nomes de
saída únicos (nunca sobrescrever) e o status SOURCE_MISSING — sem
dependência de APIs externas. Executar com o Python 3.12 do sistema:

    C:/Users/guigu/AppData/Local/Programs/Python/Python312/python.exe -m pytest tests/test_reprocess_question_figures.py -v
"""

import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from scripts.tools.reprocess_question_figures import (  # noqa: E402
    FigureRecord,
    _id_matches,
    _norm_text,
    _unique_output_path,
    adaptive_expand_bbox,
    crop_with_margin,
    process_figure,
    validate_structural,
)


# ----------------------------------------------------------------------
# helpers
# ----------------------------------------------------------------------
def _make_png(path: Path, size=(100, 80), draw_ink=True) -> Path:
    from PIL import Image, ImageDraw
    img = Image.new("RGB", size, (255, 255, 255))
    if draw_ink:
        d = ImageDraw.Draw(img)
        d.ellipse((30, 20, 70, 60), fill=(0, 0, 0))
    img.save(path)
    return path


@pytest.fixture()
def png_com_tinta(tmp_path):
    return _make_png(tmp_path / "fig.png")


# ----------------------------------------------------------------------
# validate_structural
# ----------------------------------------------------------------------
class TestValidateStructural:
    def test_png_valido_com_tinta(self, png_com_tinta):
        assert validate_structural(png_com_tinta) is True

    def test_png_valido_require_ink(self, png_com_tinta):
        assert validate_structural(png_com_tinta, require_ink=True) is True

    def test_png_totalmente_branco_reprovado_com_require_ink(self, tmp_path):
        p = _make_png(tmp_path / "branco.png", draw_ink=False)
        assert validate_structural(p, require_ink=True) is False
        # sem require_ink, arquivo tecnicamente válido passa
        assert validate_structural(p) is True

    def test_arquivo_corrompido(self, tmp_path):
        p = tmp_path / "corrompido.png"
        p.write_bytes(b"isto nao eh um png de verdade" * 10)
        assert validate_structural(p) is False

    def test_arquivo_vazio(self, tmp_path):
        p = tmp_path / "vazio.png"
        p.write_bytes(b"")
        assert validate_structural(p) is False

    def test_arquivo_inexistente_e_none(self, tmp_path):
        assert validate_structural(tmp_path / "nao_existe.png") is False
        assert validate_structural(None) is False

    def test_svg_valido(self, tmp_path):
        p = tmp_path / "fig.svg"
        p.write_text('<svg xmlns="x"><path d="M0 0"/></svg>', encoding="utf-8")
        assert validate_structural(p) is True

    def test_svg_invalido(self, tmp_path):
        p = tmp_path / "fig.svg"
        p.write_text("não é xml de svg", encoding="utf-8")
        assert validate_structural(p) is False

    def test_dimensoes_minimas(self, tmp_path):
        p = _make_png(tmp_path / "min.png", size=(6, 6))
        assert validate_structural(p, min_dim=8) is False
        assert validate_structural(p, min_dim=4) is True


# ----------------------------------------------------------------------
# crop_with_margin
# ----------------------------------------------------------------------
class TestCropWithMargin:
    def test_recorte_normal(self, tmp_path):
        src = _make_png(tmp_path / "page.png", size=(200, 150))
        out = crop_with_margin(src, (50, 40, 100, 60), margin_px=10)
        assert out.is_file()
        from PIL import Image
        with Image.open(out) as im:
            assert im.size == (120, 80)  # 100+2*10 x 60+2*10

    def test_bbox_negativo_clampa(self, tmp_path):
        src = _make_png(tmp_path / "page.png", size=(200, 150))
        out = crop_with_margin(src, (5, 5, 50, 50), margin_px=20)
        from PIL import Image
        with Image.open(out) as im:
            # x0=0 (clamp), x1=min(5+50+20,200)=75 → 75x75
            assert im.size == (75, 75)

    def test_bbox_alem_da_pagina_clampa(self, tmp_path):
        src = _make_png(tmp_path / "page.png", size=(200, 150))
        out = crop_with_margin(src, (180, 130, 40, 30), margin_px=30)
        from PIL import Image
        with Image.open(out) as im:
            # x0=150, x1=min(220+30,200)=200; y0=100, y1=min(160+30,150)=150
            assert im.size == (50, 50)

    def test_margem_zero(self, tmp_path):
        src = _make_png(tmp_path / "page.png", size=(200, 150))
        out = crop_with_margin(src, (10, 10, 50, 50), margin_px=0)
        from PIL import Image
        with Image.open(out) as im:
            assert im.size == (50, 50)


# ----------------------------------------------------------------------
# adaptive_expand_bbox (numpy)
# ----------------------------------------------------------------------
class TestAdaptiveExpandBbox:
    @pytest.fixture(autouse=True)
    def _requires_numpy(self):
        import numpy as np  # noqa: F401

    def _bin(self, arr):
        import numpy as np
        return np.array(arr, dtype="uint8")

    def test_expande_ate_gap_de_whitespace(self):
        import numpy as np
        # tinta contígua à esquerda do bbox; whitespace depois
        page = np.zeros((100, 100), dtype="uint8")
        page[40:60, 20:35] = 255          # elemento decepado à esquerda
        page[40:60, 40:70] = 255         # figura original (bbox)
        bbox_final, margens = adaptive_expand_bbox(
            page, (40, 40, 70, 60), min_pad=4, gap=5, max_frac=0.5
        )
        assert margens["left"] >= 15     # recuperou o elemento à esquerda
        assert margens["right"] <= 10    # whitespace: parou na margem mínima

    def test_limite_maximo_respeitado(self):
        import numpy as np
        # tinta em TODA a página: sem gap, a expansão deve parar em max_frac
        page = np.full((200, 200), 255, dtype="uint8")
        bbox_final, margens = adaptive_expand_bbox(
            page, (80, 80, 120, 120), min_pad=4, gap=5, max_frac=0.1
        )
        max_exp = int(0.1 * 40)
        assert margens["left"] <= 4 + max_exp + 5
        assert margens["right"] <= 4 + max_exp + 5

    def test_figura_na_borda_da_pagina_clampa(self):
        import numpy as np
        page = np.zeros((100, 100), dtype="uint8")
        page[0:20, 0:30] = 255  # colada no canto superior esquerdo
        bbox_final, margens = adaptive_expand_bbox(
            page, (0, 0, 30, 20), min_pad=6, gap=5, max_frac=0.5
        )
        assert bbox_final[0] == 0 and bbox_final[1] == 0
        assert margens["left"] == 0 and margens["top"] == 0

    def test_margem_minima_aplicada_em_whitespace(self):
        import numpy as np
        page = np.zeros((100, 100), dtype="uint8")
        page[50:60, 50:60] = 255
        bbox_final, margens = adaptive_expand_bbox(
            page, (50, 50, 60, 60), min_pad=8, gap=5, max_frac=0.3
        )
        assert margens == {"left": 8, "right": 8, "top": 8, "bottom": 8}


# ----------------------------------------------------------------------
# _unique_output_path (nunca sobrescrever)
# ----------------------------------------------------------------------
class TestUniqueOutputPath:
    def test_caminho_novo(self, tmp_path):
        p = tmp_path / "novo.png"
        out, suffixed = _unique_output_path(p)
        assert out == p and suffixed is False

    def test_caminho_existente_ganha_sufixo(self, tmp_path):
        p = tmp_path / "existe.png"
        p.write_bytes(b"original")
        out, suffixed = _unique_output_path(p)
        assert out.name == "existe_v2.png" and suffixed is True
        assert p.read_bytes() == b"original"  # original intacto

    def test_caminho_existente_v2_ganha_v3(self, tmp_path):
        p = tmp_path / "existe.png"
        p.write_bytes(b"original")
        (tmp_path / "existe_v2.png").write_bytes(b"v2")
        out, _ = _unique_output_path(p)
        assert out.name == "existe_v3.png"
        assert p.read_bytes() == b"original"  # nenhum original sobrescrito


# ----------------------------------------------------------------------
# SOURCE_MISSING e utilidades
# ----------------------------------------------------------------------
class TestStatusEUtils:
    def test_source_missing_sem_pdf(self, tmp_path):
        import argparse
        rec = FigureRecord(
            question_id="x", mathnet_id="banco_inexistente_2099_q01",
            banco="banco_inexistente", ano=2099, numero=1, figura_path="",
        )
        args = argparse.Namespace(
            dpi=72, margin=10, execute=False, strategy="auto",
            report_dir=tmp_path, page=None, region=None,
        )
        res = process_figure(rec, args)
        assert res["status"] == "SOURCE_MISSING"
        assert "PDF original não encontrado" in res["notes"]

    def test_norm_text_remove_latex_e_acentos(self):
        toks = _norm_text(r"Considere a função $f(x)=\frac{1}{2}$")
        assert "considere" in toks and "funcao" in toks and "frac" not in toks

    def test_id_matches_numerico_e_textual(self):
        rec = FigureRecord("12", "m", "afa", 2012, 12, "")
        assert _id_matches(rec, [12]) is True
        rec2 = FigureRecord("afa_x", "m", "afa", 2012, 10, "")
        assert _id_matches(rec2, [10]) is False  # id textual não numérico
        assert _id_matches(rec2, []) is False
