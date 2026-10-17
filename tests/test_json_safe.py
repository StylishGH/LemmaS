import pytest
from backend.app.core.json_safe import safe_parse_json_with_latex

def test_safe_parse_json_with_latex():
    raw = r"""
    {
      "model_a": {
        "name": "Rigor",
        "content": "Pelo Teorema de Pitágoras: \frac{a+b-c}{2} e \text{ cm} com \to \alpha."
      },
      "sintese": "Relação válida \forall x \in \mathbb{R}."
    }
    """
    res = safe_parse_json_with_latex(raw)
    assert res["model_a"]["name"] == "Rigor"
    assert r"\frac{a+b-c}{2}" in res["model_a"]["content"]
    assert r"\text{ cm}" in res["model_a"]["content"]
    assert r"\forall" in res["sintese"]

def test_safe_parse_already_valid_json():
    raw = '{"status": "ok", "count": 42}'
    res = safe_parse_json_with_latex(raw)
    assert res == {"status": "ok", "count": 42}
