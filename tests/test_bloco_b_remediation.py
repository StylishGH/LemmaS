"""Unit tests for Bloco B question bank remediation, dedup, and taxonomy reclassification."""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

from scripts.maintenance.bloco_b_remediation import (
    ACTIVE_POST_BLOCO_B_MATERIAS,
    generate_migration_sql,
    is_stub_or_chopped_fragment,
    main,
    reclassify_materia,
    remediate_catalog,
    sanitize_question_text,
    select_canonical_duplicate,
)


def _row(**overrides: object) -> dict:
    base = {
        "id": 1,
        "banca": "AFA",
        "ano": 2024,
        "materia": "Álgebra",
        "topico": "Álgebra",
        "subtopico": "Equações",
        "enunciado": "Determine o valor de $x$ real tal que $2x + 4 = 10$.",
        "solucao": None,
        "gabarito": "B",
        "figura_path": None,
        "tipo": "objetiva",
        "dificuldade": 2,
        "lema_id": 10,
        "lema_codigo": "LEMA-0010",
    }
    base.update(overrides)
    return base


def test_control_chars_and_pua_glyphs_restored_without_corrupting_whitespace() -> None:
    raw_frac = "Ponha $t = \x0crac{1}{x}$ e $2^{-\x08inom{n}{2}}$ com $k \x08mod 4$ e $|\\bar{z}| = |\x08ar{z}|$."
    fixed = sanitize_question_text(raw_frac)
    assert fixed is not None
    assert "\x0c" not in fixed and "\x08" not in fixed
    assert r"\frac{1}{x}" in fixed
    assert r"\binom{n}{2}" in fixed
    assert r"\bmod 4" in fixed
    assert r"\bar{z}" in fixed

    raw_rt = "Se $f\\left(\\frac{a}{2}-1\\right) + f\\left(4+\\frac{a}{2}\right\r)$ e $18\\,\text{cm}$ e $a\times b$ e a\tprose"
    fixed_rt = sanitize_question_text(raw_rt)
    assert fixed_rt is not None
    assert "\r" not in fixed_rt and "\t" not in fixed_rt
    assert r"\right)" in fixed_rt
    assert r"\text{cm}" in fixed_rt
    assert r"\times b" in fixed_rt
    assert "a prose" in fixed_rt

    raw_pua = "Se $n \\in \uf0a5$ e $\uf06c = 72\\text{ mm}$ com $a \uf02b b \uf03d c$, $a \uf02d b$, $P \uf0db Q$ e $x ̸= 0$."
    fixed_pua = sanitize_question_text(raw_pua)
    assert fixed_pua is not None
    assert not re.search(r"[\ue000-\uf8ff]", fixed_pua)
    assert r"\mathbb{N}" in fixed_pua
    assert r"\ell" in fixed_pua
    assert "+" in fixed_pua and "-" in fixed_pua and "=" in fixed_pua
    assert r"\Leftrightarrow" in fixed_pua
    assert r"\neq" in fixed_pua

    raw_wrap_bug = "temos:\n1274144xy - 1 > 0 \\iff xy > 11274144\ncom \x08egin{cases} x=1 \\end{cases}\x0cOutra parte"
    fixed_wrap = sanitize_question_text(raw_wrap_bug)
    assert fixed_wrap is not None
    assert "1274144" not in fixed_wrap
    assert "$$\nxy - 1 > 0 \\iff xy > 1\n$$" in fixed_wrap
    assert r"\begin{cases}" in fixed_wrap


def test_strict_html_and_latex_tables_convert_cleanly_while_preserving_math_inequalities() -> None:
    math_ineq = "Para $0<b+1$ e $1<i<n$ e <p\n$$0 < p \\leqslant n$$ nada deve mudar."
    assert sanitize_question_text(math_ineq) == math_ineq

    html_sample = (
        "Veja:<br/>"
        "<table><thead><tr><th><b>Item</b></th><th>Valor</th></tr></thead>"
        "<tbody><tr><td>A<br>1</td><td>2</td></tr></tbody></table>\n"
        '<span style="color:red;">Importante</span>, <center>Centro</center>, *P*<sub>1</sub> e P<sub>2</sub>.'
    )
    cleaned = sanitize_question_text(html_sample)
    assert cleaned is not None
    for tag in ("<br", "<table>", "<thead>", "<tbody>", "<tr>", "<th>", "<td>", "<b>", "<span", "<center>", "<sub>"):
        assert tag not in cleaned.lower()
    assert "| **Item** | Valor |" in cleaned or "| Item | Valor |" in cleaned
    assert "| :--- | :--- |" in cleaned
    assert "| A 1 | 2 |" in cleaned
    assert "Importante" in cleaned and "Centro" in cleaned
    assert "$P_1$" in cleaned or "_{1}" in cleaned

    tabular_sample = (
        "\\begin{tabular}{|c|c|c|}\n\\hline\n"
        "\\textbf{Dia} & $1$ & $2$ \\\\\n\\hline\n"
        "Valor & $10$ & $20$ \\\\\n\\hline\n\\end{tabular}"
    )
    tab_cleaned = sanitize_question_text(tabular_sample)
    assert tab_cleaned is not None
    assert "\\begin{tabular}" not in tab_cleaned
    assert "| **Dia** | $1$ | $2$ |" in tab_cleaned
    assert "| :--- | :--- | :--- |" in tab_cleaned
    assert "| Valor | $10$ | $20$ |" in tab_cleaned


def test_latex_delimiter_and_katex_defect_repairs() -> None:
    samples = [
        (r"Conjunto $D = \{x \in \mathbb{R} \mid x \neq k\pi, k \in \mathbb{Z}\$", r"\mathbb{Z}$"),
        (r"O ângulo $\alpha = 30^$\circ$ e $\tgg y$", r"^\circ"),
        (r"A medida é $AB = \text{____ }\text{cm}$ e $FD = _____$.", r"\underline"),
        (r"Com $x \in \mathbb{R}_^*^+$ e $\text{lucas_strs}$ e $2^{2}_{n\ 2\text{\prime}s}$", r"\mathbb{R}^*_+"),
        (r"Tabela $21^{\text{\textordmasculine}}$ e $a'_1^2 \le b^{x \ y}^{* *}d$", "{a'_1}^2"),
        (r"Função $a^{x}$ e $\begin{aligned} x &= $\frac{1}{2}$ + y \end{aligned}$", r"\begin{aligned} x &= \frac{1}{2} + y \end{aligned}"),
        (r"$$\begin{align*} a &= 1 \tag{1}\\ b &= 2 \tag{2}\end{align*}$$", None),
        (r"$S = \text{(symmetric reflection of $b_j$)}$", r"\text{(symmetric reflection of } b_j\text{)}"),
    ]
    for raw, expected_sub in samples:
        out = sanitize_question_text(raw)
        assert out is not None
        assert r"\tgg" not in out
        assert r"\$" not in out.replace(r"R\$", "")
        assert "____" not in out
        if expected_sub:
            assert expected_sub in out
    multi_tag_out = sanitize_question_text(samples[6][0])
    assert multi_tag_out is not None
    assert multi_tag_out.count(r"\tag{") <= 1


def test_stub_detection_distinguishes_placeholders_and_chopped_fragments_from_valid_rows() -> None:
    assert is_stub_or_chopped_fragment(_row(id=3394, banca="ITA", enunciado="Questão de Matemática extraída do gabarito oficial."))[0]
    assert is_stub_or_chopped_fragment(_row(id=13014, banca="HMMT", enunciado="AJIHFLMNEODCBKG"))[0]
    assert is_stub_or_chopped_fragment(_row(id=22386, banca="AFA", enunciado="Questão teste pipeline turbo"))[0]
    assert is_stub_or_chopped_fragment(_row(id=23203, banca="CEDERJ", enunciado="Veja os Exercícios de revisão para a AP2 (EP17)."))[0]
    assert is_stub_or_chopped_fragment(_row(id=22463, banca="CEDERJ", enunciado="relativa a BC. Construa o triângulo ABC."))[0]
    assert is_stub_or_chopped_fragment(_row(id=22495, banca="CEDERJ", enunciado="com centro de homotetia em O, e a reta s' seja 4/3."))[0]
    assert is_stub_or_chopped_fragment(_row(id=22461, banca="CEDERJ", enunciado="2\n2\n.\nc\nb\na\n\uf02b\n sabendo que o segmento de comprimento a é a terceira."))[0]

    # Recoverable / valid rows MUST be kept
    assert not is_stub_or_chopped_fragment(_row(id=11, banca="CEDERJ", enunciado="Encontre as raízes da equação $$2x^{2}+3x-2=0$$."))[0]
    assert not is_stub_or_chopped_fragment(_row(id=22444, banca="CEDERJ", enunciado="Encontre os segmentos x = a.b\nc\ne y tal que y2 = b.x"))[0]
    assert not is_stub_or_chopped_fragment(_row(id=22476, banca="CEDERJ", enunciado="mm\n72\n\uf03d\n\uf06c\n. Construa um triângulo ABC, sabendo que a + b = \uf06c."))[0]
    assert not is_stub_or_chopped_fragment(_row(id=22535, banca="CEDERJ", enunciado="onstrua um segmento de comprimento igual $\\sqrt{21}$ cm, sem utilizar aproximações."))[0]
    assert not is_stub_or_chopped_fragment(_row(id=22546, banca="CEDERJ", enunciado="pt] Construa o triângulo retângulo ABC, com ângulo reto em C."))[0]
    assert not is_stub_or_chopped_fragment(_row(id=18489, banca="HMMT", enunciado="Problem:\n\nCompute $(x-a)(x-b)\\cdots(x-z)$"))[0]

    repaired_22535 = sanitize_question_text("onstrua um segmento de comprimento igual $\\sqrt{21}$ cm.")
    repaired_22546 = sanitize_question_text("pt] Construa\no\ntriângulo retângulo ABC.")
    assert repaired_22535 is not None and repaired_22535.startswith("Construa ")
    assert repaired_22546 is not None and repaired_22546.startswith("Construa")


def test_duplicate_consolidation_deletes_stubs_first_and_remaps_fks_before_delete() -> None:
    rows = [
        # Stub duplicate group (must ALL be deleted, never consolidated to a surviving canonical!)
        _row(id=3394, banca="ITA", ano=2023, gabarito="C", enunciado="Questão de Matemática extraída do gabarito oficial."),
        _row(id=3395, banca="ITA", ano=2023, gabarito="E", enunciado="Questão de Matemática extraída do gabarito oficial."),
        # Real duplicate pair: id 32 has single $ and shorter gabarito/no figura; id 11 is canonical or whichever scores better
        _row(id=11, banca="CEDERJ", ano=2021, gabarito="Dada a equação...", solucao="Passo 1 " * 20, enunciado="Encontre as raízes da equação $$2x^{2}+3x-2=0$$."),
        _row(id=32, banca="CEDERJ", ano=2021, gabarito="Dada", solucao=None, enunciado="Encontre as raízes da equação $2x^{2}+3x-2=0$."),
        # AFA 2024 vs 2025 duplicate: keep earlier official year (2024 id 510) unless figure wins
        _row(id=510, banca="AFA", ano=2024, materia="Probabilidade e Combinatória", figura_path="/data/fig.png", enunciado="A quantidade de números pares distintos de cinco algarismos."),
        _row(id=542, banca="AFA", ano=2025, materia="Álgebra", figura_path=None, enunciado="A quantidade de números pares distintos de cinco algarismos."),
    ]
    res = remediate_catalog(rows)
    assert 3394 in res.delete_stub_ids and 3395 in res.delete_stub_ids
    assert 3394 not in res.duplicate_remaps.values() and 3395 not in res.duplicate_remaps.values()
    assert res.duplicate_remaps == {32: 11, 542: 510}

    sql = generate_migration_sql(res)
    assert "BEGIN;" in sql and "COMMIT;" in sql
    assert "pg_constraint" in sql
    assert "revisao_espacada" in sql and "flashcards" in sql
    assert "information_schema.columns" in sql and "unique_violation" in sql
    # Safety ordering invariant: ALL FK remapping statements MUST execute BEFORE ANY DELETE FROM public.questoes
    last_remap_idx = max(sql.rfind("pg_constraint"), sql.rfind("revisao_espacada"), sql.rfind("flashcards"))
    delete_match = re.search(r"^DELETE FROM public\.questoes\b", sql, re.MULTILINE)
    assert delete_match is not None
    assert delete_match.start() > last_remap_idx > 0
    assert "3394" in sql and "3395" in sql and "32" in sql and "542" in sql


def test_taxonomy_reclassification_eliminates_matematica_and_fixes_misplaced_rows_preserving_subtopico() -> None:
    rows = [
        _row(id=22905, banca="AFA", ano=2026, materia="Matemática", topico="Análise Combinatória", subtopico="Princípio Fundamental, Contagem", enunciado="Quantas senhas existem?"),
        _row(id=22992, banca="Escola Naval", ano=2026, materia="Matemática", topico="Números Complexos", subtopico="Lugares geométricos e argumento", enunciado="Seja z complexo de módulo unitário."),
        _row(id=22995, banca="Escola Naval", ano=2026, materia="Matemática", topico="Polinômios", subtopico="Relações de Girard", enunciado="O polinômio cúbico p(x) tem raízes reais."),
        _row(id=22912, banca="AFA", ano=2026, materia="Matemática", topico="Estatística", subtopico="Média e Desvio Padrão", enunciado="O gráfico mostra as horas voadas."),
        _row(id=22967, banca="Escola Naval", ano=2026, materia="Matemática", topico="Matemática Financeira", subtopico="Aumentos e Descontos", enunciado="Um capital recebe desconto sucessivo."),
        _row(id=59, banca="CEDERJ", ano=2022, materia="Álgebra Linear II", topico="Autovalores e Autovetores", enunciado="Encontre os autovalores da matriz T."),
        _row(id=47, banca="CEDERJ", ano=2022, materia="Álgebra Linear I", topico="Espaços Vetoriais", enunciado="Verifique se W é subespaço vetorial."),
        _row(id=2146, banca="EsPCEx", ano=2020, materia="Cálculo", topico="Cálculo", enunciado="O determinante da matriz $$\\begin{pmatrix} 1 & x \\end{pmatrix}$$"),
        _row(id=2130, banca="EsPCEx", ano=2020, materia="Cálculo", topico="Cálculo", enunciado="Uma reta tangente à curva de equação $y=x^2$ é paralela à reta $6x - y + 5 = 0$."),
        _row(id=317, banca="AFA", ano=2017, materia="Cálculo", topico="Cálculo", enunciado="Considere a função real $f(x) = \\frac{1}{2x+2}$."),
        _row(id=3114, banca="ITA", ano=2019, materia="Cálculo", topico="Cálculo", enunciado="O limite $\\lim_{x \\to 0} \\frac{\\tan(x) - x}{x^3}$ é igual a:"),
        _row(id=1978, banca="Escola Naval", ano=2021, materia="Funções", topico="Álgebra", enunciado="Calcule o determinante da matriz abaixo."),
        _row(id=79, banca="ESA", ano=2020, materia="Álgebra", topico="Conjuntos", enunciado="Pesquisa para verificar a preferência para três modalidades esportivas."),
        _row(id=81, banca="ESA", ano=2020, materia="Álgebra", topico="Polinômios", enunciado="As raízes do polinômio $p(x) = 2x^3 - mx^2 + 17x - 6$ são $a, b, 2$."),
        _row(id=5264, banca="Olimpíada Filipina de Matemática", ano=None, materia="Cálculo", topico="Geometria Diferencial", enunciado="Problema: O Teorema da Coragem de Quatro da Teoria dos Grafos..."),
        _row(id=23, banca="CEDERJ", ano=2021, materia="Cálculo", topico="Continuidade de uma função", subtopico="Continuidade de Funções em um Ponto", enunciado="Determine se $f(x)$ é contínua em $x=1$."),
        _row(id=519, banca="AFA", ano=2024, materia="Funções", topico="Álgebra", subtopico="Matrizes e Polinômios", enunciado="Determine a soma dos elementos da matriz resultante."),
        _row(id=521, banca="AFA", ano=2024, materia="Cálculo", topico="Cálculo", subtopico="Funções Exponencial e Logarítmica", enunciado="Na figura, observamos os gráficos de $f(x) = e^x$ e $g(x) = \\ln(x)$."),
        _row(id=4523, banca="HMMT", ano=None, materia="Cálculo", topico="Cálculo Diferencial", subtopico="Regras de Derivação", enunciado="Problem: Find the derivative and minimum vertical distance between $2+\\sin(x)$ and $\\cos(x)$."),
        _row(id=1554, banca="EPCAR", ano=2021, materia="Cálculo", topico="Cálculo", subtopico="Radicais e Racionalização", enunciado="O valor da soma $S = \\frac{1}{\\sqrt{1}+\\sqrt{2}} + \\dots$ é um número:"),
        _row(id=1805, banca="Escola Naval", ano=2022, materia="Cálculo", topico="Cálculo", subtopico="Derivada de Função Inversa", enunciado="Sabendo que $f$ admite função inversa $g$, calcule $g''(1)$."),
        _row(id=1261, banca="EFOMM", ano=2023, materia="Cálculo", topico="Cálculo", subtopico="Comprimento de Arco", enunciado="Seguindo a curva $f(x) = x^{3/2}$ entre $(1,1)$ e $(4,8)$."),
    ]
    res = remediate_catalog(rows)
    by_id = {r["id"]: r for r in res.remediated_rows}

    assert by_id[22905]["materia"] == "Probabilidade e Combinatória"
    assert by_id[22905]["subtopico"] == "Princípio Fundamental, Contagem"
    assert by_id[22992]["materia"] == "Polinômios e Complexos"
    assert by_id[22995]["materia"] == "Polinômios e Complexos"
    assert by_id[22912]["materia"] == "Probabilidade e Combinatória"
    assert by_id[22967]["materia"] == "Matemática Básica"
    assert by_id[59]["materia"] == "Álgebra Linear"
    assert by_id[47]["materia"] == "Álgebra Linear I"
    assert by_id[2146]["materia"] == "Álgebra"
    assert by_id[2130]["materia"] in ("Funções", "Geometria Analítica")
    assert by_id[317]["materia"] == "Funções"
    assert by_id[3114]["materia"] == "Cálculo"
    assert by_id[1978]["materia"] == "Álgebra"
    assert by_id[79]["materia"] == "Probabilidade e Combinatória"
    assert by_id[81]["materia"] == "Polinômios e Complexos"
    assert by_id[5264]["materia"] == "Probabilidade e Combinatória"
    assert by_id[23]["materia"] == "Cálculo"
    assert by_id[519]["materia"] == "Álgebra"
    assert by_id[521]["materia"] == "Funções"
    assert by_id[4523]["materia"] == "Cálculo"
    assert by_id[1554]["materia"] == "Matemática Básica"
    assert by_id[1805]["materia"] == "Cálculo"
    assert by_id[1261]["materia"] == "Cálculo"

    for row in res.remediated_rows:
        assert row["materia"] in ACTIVE_POST_BLOCO_B_MATERIAS


def test_cli_dry_run_does_not_overwrite_files(tmp_path: Path) -> None:
    inp = tmp_path / "in.json"
    sql_out = tmp_path / "out.sql"
    rep_out = tmp_path / "report.json"
    inp.write_text(json.dumps([_row(id=1), _row(id=3394, banca="ITA", enunciado="Questão de Matemática extraída do gabarito oficial.")]), encoding="utf-8")

    rc = main(["--input", str(inp), "--sql-out", str(sql_out), "--report-out", str(rep_out), "--dry-run"])
    assert rc == 0
    assert not sql_out.exists()
    assert rep_out.exists()
    report = json.loads(rep_out.read_text(encoding="utf-8"))
    assert report["dry_run"] is True
    assert report["summary"]["deleted_stubs_count"] == 1
