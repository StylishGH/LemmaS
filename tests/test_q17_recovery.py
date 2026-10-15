"""
Testes unitários de validação estrutural e visual para a recuperação da figura AFA 2011 Q17.
"""

from pathlib import Path
import cv2
import numpy as np
import pytest

def test_q17_artifacts_exist_and_valid():
    out_dir = Path("data/audit/reprocessed_figures_pilot/afa_2011_q17")
    native_path = out_dir / "militar_afa_2011_q17_native.png"
    reproc_path = out_dir / "militar_afa_2011_q17_reproc_300dpi.png"
    sheet_path = out_dir / "militar_afa_2011_q17_sheet.png"
    report_path = out_dir / "RELATORIO_Q17.md"

    assert native_path.exists(), "Arquivo nativo não foi gerado"
    assert reproc_path.exists(), "Arquivo reproc 300dpi não foi gerado"
    assert sheet_path.exists(), "Folha de contato não foi gerada"
    assert report_path.exists(), "Relatório da Q17 não foi gerado"

    img_native = cv2.imread(str(native_path))
    assert img_native is not None
    assert img_native.shape == (431, 432, 3), f"Dimensões inesperadas: {img_native.shape}"
    assert np.std(img_native) > 20.0, "Imagem nativa sem contraste/tinta"

    img_reproc = cv2.imread(str(reproc_path))
    assert img_reproc is not None
    assert img_reproc.shape[0] > 1000 and img_reproc.shape[1] > 1000, f"Resolução 300dpi muito baixa: {img_reproc.shape}"
    assert np.std(img_reproc) > 20.0, "Imagem 300dpi sem contraste/tinta"

    img_sheet = cv2.imread(str(sheet_path))
    assert img_sheet is not None
    assert img_sheet.shape[1] > img_reproc.shape[1] // 3, "Folha de contato com largura insuficiente"
