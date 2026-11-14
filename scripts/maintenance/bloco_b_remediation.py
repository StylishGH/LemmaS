"""Deterministic remediation, deduplication, and taxonomy reclassification for public.questoes (Bloco B).

Reads an exported snapshot of ``public.questoes``, detects confirmed placeholders and
truncated PDF fragments, consolidates exact/near-duplicate questions, repairs control
characters, PUA glyphs, HTML markup, LaTeX tables, and broken KaTeX syntax across text
fields, reclassifies non-canonical ``materia`` values, and emits an idempotent transactional
PostgreSQL migration script (remapping all FK references before any DELETE).
"""

from __future__ import annotations

import argparse
from collections import defaultdict
from dataclasses import dataclass
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from typing import Iterable


ACTIVE_POST_BLOCO_B_MATERIAS: frozenset[str] = frozenset(
    {
        "Geometria Plana",
        "Probabilidade e Combinatória",
        "Álgebra",
        "Teoria dos Números",
        "Polinômios e Complexos",
        "Funções",
        "Trigonometria",
        "Geometria Espacial",
        "Geometria Analítica",
        "Cálculo",
        "Matemática Básica",
        "Cálculo 3",
        "Álgebra Linear",
        "Álgebra Linear I",
    }
)

TEXT_FIELDS: tuple[str, ...] = ("enunciado", "solucao", "gabarito")

CONFIRMED_PLACEHOLDER_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"^Questão de Matemática extraída do gabarito oficial\.?$", re.IGNORECASE),
    re.compile(r"^AJIHFLMNEODCBKG$"),
    re.compile(r"^Questão teste pipeline turbo$", re.IGNORECASE),
    re.compile(r"^Veja os Exercícios de revisão para a AP2\b", re.IGNORECASE),
)

CHOPPED_CEDERJ_PREFIX_RE = re.compile(
    r"^(?:c\s*\n\s*b\s*\n\s*a|2\s*\n\s*2\s*\n\s*\.|[a-zçáéíóúâêôãõ]{2,}(?<!^onstrua)\b)",
)

RECOVERABLE_PREFIX_IDS: frozenset[int] = frozenset({22444, 22476, 22477, 22535, 22546, 22563, 23001, 23002})

EXACT_CHOPPED_FRAGMENT_IDS: frozenset[int] = frozenset(
    {
        22459,
        22460,
        22461,
        22462,
        22463,
        22464,
        22474,
        22475,
        22489,
        22490,
        22493,
        22494,
        22495,
        22496,
        22497,
        22498,
        22499,
        22500,
        22501,
    }
)

HIGH_SCHOOL_AND_MILITAR_NON_CALC_BANCAS: frozenset[str] = frozenset(
    {"AFA", "ESA", "EEAR", "EPCAR", "EsPCEx", "FUVEST", "ENEM", "Colégio Naval"}
)

ACTUAL_CALCULUS_MARKERS_RE = re.compile(
    r"(?:\\int|\\lim\b|\blim_|derivad|inflex[aã]o|concavidade|l['’]?h[oô]pital|taxa\s+de\s+varia|"
    r"taxas?\s+relacionad|vaz[aã]o|ass[ií]ntota|taylor|maclaurin|primitiva|diferenci[aá]vel|equa[cç][aã]o\s+diferencial|"
    r"\b[fg]['′]{1,2}\s*\(|\\frac\{d|\\partial|\\nabla|\\iint|\\iiint|\\oint|\bd[a-zA-Z]/d[a-zA-Z]\b|"
    r"s[eé]rie\s+(?:de\s+pot|converg|diverg|infinita)|converg[eê]ncia|integr[aá]vel|"
    r"comprimento\s+(?:de\s+arco|(?:exato\s+)?da\s+curva)|"
    r"volume\s+do\s+s[oó]lido\s+obtido\s+pela\s+rota|[aá]rea\s+(?:entre\s+curvas|(?:da\s+regi[aã]o\s+)?limitada)|"
    r"reta\s+(?:secante|tangente)|[aâ]ngulo\s+entre\s+curvas|otimiza[cç][aã]o|"
    r"\b(?:derivative|differentiable|integral|differential equation|tangent line)\b)",
    re.IGNORECASE,
)

CALCULUS_TOPICO_PREFIXES: tuple[str, ...] = (
    "continuidade",
    "cálculo",
    "limites",
    "derivadas",
    "integrais",
    "equações diferenciais",
    "sequências e séries",
)

MATRIX_DETERMINANT_SYSTEM_RE = re.compile(
    r"(?:\bmatriz(?:es)?\b|\bdeterminante\b|\\det\b|\\begin\{[pbvV]?matrix\}|\bsistema\s+linear\b)",
    re.IGNORECASE,
)

PUA_REPLACEMENTS: dict[str, str] = {
    "\uf0a5": r"\mathbb{N}",
    "\uf02b": "+",
    "\uf02d": "-",
    "\uf03d": "=",
    "\uf06c": r"\ell",
    "\uf0db": r"\Leftrightarrow",
}

PUA_RANGE_RE = re.compile(r"[\ue000-\uf8ff]+")


class _HtmlTableParser(HTMLParser):
    """Minimal HTML table parser converting HTML tables into GFM Markdown rows."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.rows: list[list[str]] = []
        self._in_row = False
        self._in_cell = False
        self._cell_chunks: list[str] = []
        self._current_row: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag_l = tag.lower()
        if tag_l == "tr":
            self._in_row = True
            self._current_row = []
        elif tag_l in ("td", "th") and self._in_row:
            self._in_cell = True
            self._cell_chunks = []
        elif self._in_cell and tag_l == "br":
            self._cell_chunks.append(" ")
        elif self._in_cell and tag_l in ("b", "strong"):
            self._cell_chunks.append("**")
        elif self._in_cell and tag_l in ("i", "em"):
            self._cell_chunks.append("*")

    def handle_endtag(self, tag: str) -> None:
        tag_l = tag.lower()
        if tag_l == "tr" and self._in_row:
            if any(c.strip() for c in self._current_row) or self._current_row:
                self.rows.append(self._current_row)
            self._in_row = False
        elif tag_l in ("td", "th") and self._in_cell:
            cell_text = re.sub(r"\s+", " ", "".join(self._cell_chunks)).strip()
            self._current_row.append(cell_text)
            self._in_cell = False
        elif self._in_cell and tag_l in ("b", "strong"):
            self._cell_chunks.append("**")
        elif self._in_cell and tag_l in ("i", "em"):
            self._cell_chunks.append("*")

    def handle_data(self, data: str) -> None:
        if self._in_cell:
            self._cell_chunks.append(data)


def _rows_to_markdown_table(rows: list[list[str]]) -> str:
    if not rows:
        return ""
    width = max(len(r) for r in rows)
    if width == 0:
        return ""
    padded = [r + [""] * (width - len(r)) for r in rows]
    lines = ["| " + " | ".join(cell.replace("|", "\\|") for cell in padded[0]) + " |"]
    lines.append("| " + " | ".join(":---" for _ in range(width)) + " |")
    for row in padded[1:]:
        lines.append("| " + " | ".join(cell.replace("|", "\\|") for cell in row) + " |")
    return "\n" + "\n".join(lines) + "\n"


def _convert_html_table_match(match: re.Match[str]) -> str:
    parser = _HtmlTableParser()
    parser.feed(match.group(0))
    parser.close()
    md = _rows_to_markdown_table(parser.rows)
    return md.strip() if md else match.group(0)


def _split_top_level_row_cells(row: str) -> list[str]:
    cells: list[str] = []
    current: list[str] = []
    depth = 0
    i = 0
    while i < len(row):
        ch = row[i]
        if ch == "\\" and i + 1 < len(row):
            current.append(row[i : i + 2])
            i += 2
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth = max(0, depth - 1)
        elif ch == "&" and depth == 0:
            cells.append("".join(current).strip())
            current = []
            i += 1
            continue
        current.append(ch)
        i += 1
    cells.append("".join(current).strip())
    return cells


def _read_brace_group(text: str, pos: int) -> tuple[str, int] | None:
    if pos >= len(text) or text[pos] != "{":
        return None
    depth = 0
    for i in range(pos, len(text)):
        if text[i] == "\\":
            continue
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return text[pos + 1 : i], i + 1
    return None


def _clean_tabular_cell(cell: str) -> str:
    cell = re.sub(r"\\multirow\{[^}]*\}\{[^}]*\}\{([^}]*)\}", r"\1", cell)
    cell = re.sub(r"\\multicolumn\{\d+\}\{[^}]*\}\{([^}]*)\}", r"\1", cell)
    cell = re.sub(r"\\textbf\{([^{}]*)\}", r"**\1**", cell)
    return re.sub(r"\s+", " ", cell).strip()


def _convert_tabular_block(match: re.Match[str]) -> str:
    body = match.group(2)
    body = re.sub(r"\\hline\b|\\cline\{[^}]*\}", "", body)
    raw_rows = [r.strip() for r in re.split(r"\\\\(?:\[[^\]]*\])?", body) if r.strip()]
    table_rows: list[list[str]] = []
    for raw_row in raw_rows:
        cells = [_clean_tabular_cell(c) for c in _split_top_level_row_cells(raw_row)]
        if any(cells):
            table_rows.append(cells)
    return _rows_to_markdown_table(table_rows).strip()


def _fix_control_chars_and_pua(text: str) -> str:
    text = text.replace("\r\n", "\n")
    text = re.sub(r"\x0crac\b", r"\\frac", text)
    text = text.replace("\x0c", "\n\n")
    text = re.sub(r"\x08(?=(?:inom|mod|ar|egin|ackslash|eta|ot|ig|ullet|oxed)\b)", r"\\b", text)
    text = text.replace("\x08", "")
    text = re.sub(r"\r(?=(?:ight|angle|ho)\b)", r"\\r", text)
    text = text.replace("\r", "")
    text = re.sub(r"\t(?=(?:ext(?:bf|it)?|heta|imes|au|op|riangle|an|frac|o|ilde)\b)", r"\\t", text)
    text = text.replace("\t", " ")
    text = text.replace("\x05", "").replace("\xa0", " ")

    # Artifact 1274144 wrapping display formulas in CEDERJ PDF imports (e.g. id=23068)
    text = re.sub(
        r"1274144\s*(.*?)\s*1274144?",
        lambda m: f"$$\n{m.group(1).strip()}\n$$",
        text,
        flags=re.DOTALL,
    )

    # Multi-line PDF piecewise braces (\uf8f1 .. \uf8f4) and tall parens (\uf8eb-\uf8ed, \uf8f6-\uf8f8)
    text = text.replace("\uf8eb", "(").replace("\uf8ec", "").replace("\uf8ed", "")
    text = text.replace("\uf8f6", ")").replace("\uf8f7", "").replace("\uf8f8", "")
    text = re.sub(r"[\uf8f1\uf8f2\uf8f3\uf8f4\n\s]{3,}", "\n", text)

    for pua_char, replacement in PUA_REPLACEMENTS.items():
        if pua_char in ("\uf02b", "\uf02d", "\uf03d"):
            text = re.sub(rf"\s*{re.escape(pua_char)}\s*", f" {replacement} ", text)
        else:
            text = text.replace(pua_char, replacement)

    text = text.replace("\u0338=", r"\neq").replace("\u2044=", r"\neq")
    text = PUA_RANGE_RE.sub(" ", text)
    return text


def _convert_html_and_tables(text: str) -> str:
    text = re.sub(r"<table\b[^>]*>[\s\S]*?</table>", _convert_html_table_match, text, flags=re.IGNORECASE)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<(?:b|strong)>(.*?)</(?:b|strong)>", r"**\1**", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<(?:i|em)>(.*?)</(?:i|em)>", r"*\1*", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"</?(?:span|center|div|p|u)\b[^>]*>", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\*([A-Za-z])\*<sub>([^<]+)</sub>", r"$\1_{\2}$", text)
    text = re.sub(r"([A-Za-z])<sub>([^<]+)</sub>", r"$\1_{\2}$", text)
    text = re.sub(r"<sub>([^<]+)</sub>", r"_{\1}", text, flags=re.IGNORECASE)
    text = re.sub(r"<sup>([^<]+)</sup>", r"^{\1}", text, flags=re.IGNORECASE)

    # Convert LaTeX tabular environments outside/inside math into Markdown tables
    text = re.sub(
        r"(?:\$\$\s*)?\\begin\{tabular\}(\{[^}]*\})([\s\S]*?)\\end\{tabular\}(?:\s*\$\$)?",
        _convert_tabular_block,
        text,
    )
    return text


def _strip_inner_dollars_in_env(match: re.Match[str]) -> str:
    env_body = match.group(2)
    # Keep escaped \$ inside \text or math; strip unescaped $ mistakenly placed inside aligned/cases/array
    cleaned = re.sub(r"(?<!\\)\$", "", env_body)
    return f"{match.group(1)}{cleaned}{match.group(3)}"


def _strip_extra_tags_in_display(match: re.Match[str]) -> str:
    block = match.group(0)
    tag_count = 0

    def _replace_tag(tag_m: re.Match[str]) -> str:
        nonlocal tag_count
        tag_count += 1
        return tag_m.group(0) if tag_count == 1 else f"\\quad ({tag_m.group(1)})"

    if len(re.findall(r"\\tag\{([^}]*)\}", block)) <= 1:
        return block
    return re.sub(r"\\tag\{([^}]*)\}", _replace_tag, block)


def _replace_nested_math_inside_text_arg(text: str) -> str:
    # Convert \text{(... $inner$ ...)} -> \text{(... } inner \text{ ...)} when inside math
    pattern = re.compile(r"\\text\{([^{}]*?(?<!\\)\$[^{}]*?)\}")
    while pattern.search(text):
        text = pattern.sub(
            lambda m: "\\text{"
            + re.sub(r"(?<!\\)\$([^$]+?)(?<!\\)\$", r"} \1\\text{", m.group(1))
            + "}",
            text,
        )
    text = re.sub(r"\\text\{\}", "", text)
    return text


def _repair_latex_for_katex(text: str) -> str:
    # Specific prefix recoveries verified against backup (22535, 22546)
    text = re.sub(r"^onstrua\b", "Construa", text)
    text = re.sub(r"^pt\]\s*Construa\b", "Construa", text)

    # Escaped/stray dollar defects inside delimiters
    text = re.sub(r"\\\$(\s*(?:\n|$|\)))", r"$\1", text)
    text = re.sub(r"\^(\s*)\$\\circ\$?", r"^\\circ", text)
    text = re.sub(r"(?<![R\w])\\\$(?=[a-zA-Z0-9\\({])", "", text)
    text = text.replace(r"\$$", "$$")

    # Strip unescaped $ nested inside multi-line math environments
    text = re.sub(
        r"(\\begin\{(?:aligned|align\*?|cases|gathered|array)\})([\s\S]*?)(\\end\{(?:aligned|align\*?|cases|gathered|array)\})",
        _strip_inner_dollars_in_env,
        text,
    )

    # Replace blanks (____) inside \text{} or bare math expressions with clean underlines
    text = re.sub(r"\\text\{([^{}]*?)_{2,}([^{}]*?)\}", lambda m: (
        f"\\text{{{m.group(1)}}}\\underline{{\\hspace{{2em}}}}\\text{{{m.group(2)}}}"
        .replace("\\text{}", "")
    ), text)
    text = re.sub(r"_{3,}", r"\\underline{\\hspace{2em}}", text)

    # Un-nest inline $...$ inside \text{...} BEFORE escaping snake_case underscores in prose \text{...}
    text = _replace_nested_math_inside_text_arg(text)

    # Escape raw underscores inside \text{foo_bar} identifiers
    text = re.sub(
        r"\\text\{([^{}]*?(?:[A-Za-z]{2,}_[A-Za-z]+|[A-Za-z]+_[A-Za-z]{2,})[^{}]*?)\}",
        lambda m: f"\\text{{{re.sub(r'(?<=[A-Za-z])_(?=[A-Za-z])', r'\\_', m.group(1))}}}",
        text,
    )

    # Unsupported KaTeX macros & broken escapes from ingestion
    text = re.sub(r"\\tgg\b", r"\\operatorname{tg}", text)
    text = text.replace(r"\text{\prime}", "'").replace(r"\text{\textordmasculine}", r"\text{º}")
    text = re.sub(r"\\textsuperscript\{([^{}]*)\}", r"^{\1}", text)
    text = text.replace(r"\mathbb{R}_^*^+", r"\mathbb{R}^*_+").replace(r"\=", "=")
    text = re.sub(r"\\begin\\\{(aligned|align\*?|cases|gathered|array)\\\}", r"\\begin{\1}", text)
    text = re.sub(r"\\end\\\{(aligned|align\*?|cases|gathered|array)\\\}", r"\\end{\1}", text)
    text = re.sub(r"\\cline\{[^}]*\}(?:\s*\\\\)?", "", text)
    text = re.sub(r"\\multicolumn\{\d+\}\{[^}]*\}\{([^{}]*)\}", r"\\text{\1}", text)
    text = text.replace(r"\triangleright", r"\blacktriangleright")
    text = text.replace(r"6#", r"6\#")

    # Double superscripts seen in olympiad solutions (4398, 4951, 5101)
    text = re.sub(r"([A-Za-z]'\w*)\^(\d+|\{[^}]+\})", r"{\1}^\2", text)
    text = re.sub(r"([A-Za-z]\^\{[^{}]+\})\^(\{[^}]+\}|\*\s*\*|\d+)", lambda m: f"{{{m.group(1)}}}^{m.group(2) if m.group(2).startswith('{') else '{' + m.group(2) + '}'}", text)

    # Multiple \tag in a single display block
    text = re.sub(r"\$\$[\s\S]*?\$\$", _strip_extra_tags_in_display, text)
    text = re.sub(r"\\begin\{align\*?\}[\s\S]*?\\end\{align\*?\}", _strip_extra_tags_in_display, text)

    # Specific broken delimiter constructs from KaTeX audit
    text = text.replace(r"\right\)", r"\right)").replace(r"\left\(", r"\left(")
    text = text.replace(r"$\left(3i+\frac{i^2}{50}\right\)$", r"$\left(3i+\frac{i^2}{50}\right)$")
    text = text.replace(r"(\left(3i+\frac{i^2}{50}\right\))", r"$\left(3i+\frac{i^2}{50}\right)$")
    text = text.replace(r"\partial}{\r}", r"\partial r}")
    text = text.replace(r"\\nabla V \\}", r"\|\nabla V\|")
    text = text.replace(r"S\(S'\cup\{q'\}\)", r"S \setminus (S' \cup \{q'\})")
    return text


def sanitize_question_text(text: str | None) -> str | None:
    """Repair control chars, PUA glyphs, HTML markup, LaTeX tables, and broken math delimiters."""
    if text is None:
        return None
    out = _fix_control_chars_and_pua(text)
    out = _convert_html_and_tables(out)
    out = _repair_latex_for_katex(out)
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out


def is_stub_or_chopped_fragment(row: dict) -> tuple[bool, str]:
    """Identify unrecoverable placeholder rows or sliced PDF stubs for deletion BEFORE dedup."""
    qid = row.get("id")
    if qid in EXACT_CHOPPED_FRAGMENT_IDS:
        return True, "chopped_cederj_fragment"

    enunc = (row.get("enunciado") or "").strip()
    if not enunc:
        return True, "empty_enunciado"

    for pat in CONFIRMED_PLACEHOLDER_PATTERNS:
        if pat.match(enunc):
            return True, "confirmed_placeholder"

    if qid in RECOVERABLE_PREFIX_IDS:
        return False, ""

    if row.get("banca") == "CEDERJ" and len(enunc) < 250 and CHOPPED_CEDERJ_PREFIX_RE.match(enunc):
        return True, "chopped_cederj_fragment"

    return False, ""


def _map_algebra_subtopico(subtopico: str, enunciado: str) -> str:
    sub_l = subtopico.lower()
    if any(k in sub_l for k in ("polinôm", "polinom", "complex", "girard", "argand")):
        return "Polinômios e Complexos"
    if any(k in sub_l for k in ("função", "funcao", "funções", "funcoes", "quadrática", "exponencial", "logarítmica")):
        if "inequações" not in sub_l and "equações" not in sub_l:
            return "Funções"
    if any(k in sub_l for k in ("diofantin", "divisores", "primos", "congru", "aritmética modular")):
        return "Teoria dos Números"
    if "sequên" not in sub_l and "matriz" in sub_l:
        return "Álgebra"
    return "Álgebra"


def _classify_from_topico_and_content(row: dict) -> str:
    top = (row.get("topico") or "").strip()
    sub = (row.get("subtopico") or "").strip()
    enunc = (row.get("enunciado") or "").strip()
    top_l = top.lower()
    sub_l = sub.lower()

    direct_topico_map: dict[str, str] = {
        "geometria plana": "Geometria Plana",
        "geometria espacial": "Geometria Espacial",
        "geometria analítica": "Geometria Analítica",
        "geometria analítica espacial": "Geometria Analítica",
        "trigonometria": "Trigonometria",
        "análise combinatória": "Probabilidade e Combinatória",
        "combinatória": "Probabilidade e Combinatória",
        "probabilidade": "Probabilidade e Combinatória",
        "estatística": "Probabilidade e Combinatória",
        "teoria dos grafos": "Probabilidade e Combinatória",
        "números complexos": "Polinômios e Complexos",
        "polinômios": "Polinômios e Complexos",
        "polinômios e complexos": "Polinômios e Complexos",
        "matemática básica": "Matemática Básica",
        "matemática financeira": "Matemática Básica",
        "conjuntos": "Probabilidade e Combinatória",
        "cálculo": "Cálculo",
        "cálculo diferencial": "Cálculo",
        "cálculo integral": "Cálculo",
        "cálculo diferencial e integral": "Cálculo",
        "cálculo e análise real": "Cálculo",
        "limites e continuidade": "Cálculo",
        "sequências e séries": "Cálculo",
        "equações diferenciais": "Cálculo",
        "cálculo 3": "Cálculo 3",
        "álgebra linear": "Álgebra Linear",
        "funções": "Funções",
        "funções e otimização": "Funções",
        "teoria dos números": "Teoria dos Números",
    }
    if top_l == "álgebra":
        return _map_algebra_subtopico(sub, enunc)
    if top_l in direct_topico_map:
        return direct_topico_map[top_l]

    if "complex" in sub_l or "polinôm" in sub_l:
        return "Polinômios e Complexos"
    if "grafos" in enunc.lower() or "combinat" in sub_l or "probabil" in sub_l:
        return "Probabilidade e Combinatória"
    if MATRIX_DETERMINANT_SYSTEM_RE.search(enunc):
        return "Álgebra"
    return "Funções"


def reclassify_materia(row: dict) -> str:
    """Return canonical post-Bloco-B ``materia`` preserving valid existing classifications."""
    qid = row.get("id")
    if qid == 79:
        return "Probabilidade e Combinatória"
    if qid == 81:
        return "Polinômios e Complexos"

    mat = (row.get("materia") or "").strip()
    banca = (row.get("banca") or "").strip()
    top = (row.get("topico") or "").strip()
    sub = (row.get("subtopico") or "").strip()
    enunc = (row.get("enunciado") or "").strip()
    sol = (row.get("solucao") or "").strip()
    combined = f"{enunc}\n{sol}"

    if mat == "Matemática":
        return _classify_from_topico_and_content(row)

    if mat == "Álgebra Linear II":
        return "Álgebra Linear"

    if mat == "Funções":
        sub_l = sub.lower()
        if top == "Álgebra" and (
            MATRIX_DETERMINANT_SYSTEM_RE.search(enunc)
            or any(k in sub_l for k in ("matriz", "sistema", "divisão de polinômios", "números complexos"))
        ):
            if MATRIX_DETERMINANT_SYSTEM_RE.search(enunc) or "matriz" in sub_l or "sistema" in sub_l:
                return "Álgebra"
            if "complex" in sub_l or "polinôm" in sub_l:
                return "Polinômios e Complexos"
            return "Álgebra"
        return "Funções"

    if mat == "Cálculo":
        if "teoria dos grafos" in combined.lower() or top.lower() == "geometria diferencial" and "grafos" in combined.lower():
            return "Probabilidade e Combinatória"

        is_hs_banca = banca in HIGH_SCHOOL_AND_MILITAR_NON_CALC_BANCAS
        top_l = top.lower()
        sub_l = sub.lower()
        has_uni_calculus_topic = not is_hs_banca and (
            (top_l != "cálculo" and top_l.startswith(CALCULUS_TOPICO_PREFIXES))
            or any(
                k in sub_l
                for k in (
                    "derivad",
                    "integral",
                    "integrais",
                    "comprimento de arco",
                    "taxas relacionadas",
                    "volume de sólido de revolução",
                    "área entre curvas",
                    "equações diferenciais",
                )
            )
        )
        has_real_calculus = bool(ACTUAL_CALCULUS_MARKERS_RE.search(combined))

        # High school / ESA / AFA / EsPCEx never test formal university Calculus;
        # EsPCEx tangent lines to quadratics belong in Geometria Analítica.
        if is_hs_banca or (not has_uni_calculus_topic and not has_real_calculus):
            if MATRIX_DETERMINANT_SYSTEM_RE.search(enunc):
                return "Álgebra"
            if re.search(r"reta\s+tangente|par[aá]bola|circunfer[êe]ncia|elipse|hip[eé]rbole", enunc, re.IGNORECASE):
                return "Geometria Analítica"
            if re.search(r"radic|racionaliza|n[uú]meros reais e fra", sub_l):
                return "Matemática Básica"
            if re.search(r"progress[aã]o\s+(?:aritm[eé]tica|geom[eé]trica)|soma\s+infinita\s+da\s+progress", enunc, re.IGNORECASE):
                if "exponencial" in sub_l or "funç" in sub_l:
                    return "Funções"
                return "Álgebra"
            if re.search(r"polin[ôo]mio", enunc, re.IGNORECASE):
                return "Polinômios e Complexos"
            if re.search(r"\b(?:cos|sen|tan|arctg|arcsen)\b", enunc, re.IGNORECASE) and "funç" not in sub_l and "função" not in enunc.lower():
                return "Trigonometria"
            if re.search(r"\btrap[eé]zio|\btri[âa]ngulo|\braz[aã]o\b|\bcusto\b|\bporcent", enunc, re.IGNORECASE) and "funç" not in sub_l and "função" not in enunc.lower():
                return "Matemática Básica"
            return "Funções"

    if mat in ACTIVE_POST_BLOCO_B_MATERIAS:
        return mat

    return _classify_from_topico_and_content(row)


def _normalize_for_dedup(enunciado: str) -> str:
    text = enunciado.lower()
    text = re.sub(r"^(?:problema?|quest[aã]o\s*\d*)\s*:?\s*", "", text)
    text = re.sub(r"[\s$.,;:!?\"'()\[\]{}]+", " ", text)
    return text.strip()


def select_canonical_duplicate(group_rows: list[dict]) -> dict:
    """Choose the best surviving row from a duplicate cluster deterministically."""

    def score(row: dict) -> tuple[int, int, int, int, int, int]:
        has_fig = 1 if row.get("figura_path") else 0
        sol_len = len((row.get("solucao") or "").strip())
        gab_len = len((row.get("gabarito") or "").strip())
        canonical_mat = 1 if row.get("materia") in ACTIVE_POST_BLOCO_B_MATERIAS else 0
        # Prefer earlier official exam year when equal (e.g. AFA 2024 vs mis-ingested 2025 copy)
        ano = row.get("ano")
        ano_score = -ano if isinstance(ano, int) else -9999
        return (has_fig, sol_len, gab_len, canonical_mat, ano_score, -int(row["id"]))

    return max(group_rows, key=score)


@dataclass
class RemediationResult:
    """Structured plan returned by ``remediate_catalog``."""

    delete_stub_ids: list[int]
    duplicate_remaps: dict[int, int]
    field_updates: dict[int, dict[str, object]]
    remediated_rows: list[dict]
    report: dict


def remediate_catalog(rows: list[dict]) -> RemediationResult:
    """Run full Bloco B pipeline: stubs -> dedup -> text repair -> taxonomy reclassification."""
    delete_stub_ids: list[int] = []
    stub_reasons: dict[int, str] = {}
    surviving_after_stubs: list[dict] = []

    for row in rows:
        is_stub, reason = is_stub_or_chopped_fragment(row)
        if is_stub:
            qid = int(row["id"])
            delete_stub_ids.append(qid)
            stub_reasons[qid] = reason
        else:
            surviving_after_stubs.append(dict(row))

    # Group duplicates among surviving rows ONLY, grouped by (banca, normalized enunciado)
    clusters: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for row in surviving_after_stubs:
        banca = (row.get("banca") or "").strip().lower()
        norm = _normalize_for_dedup(row.get("enunciado") or "")
        clusters[(banca, norm)].append(row)

    duplicate_remaps: dict[int, int] = {}
    canonical_rows: list[dict] = []
    for key, group in clusters.items():
        if len(group) == 1:
            canonical_rows.append(group[0])
            continue
        winner = select_canonical_duplicate(group)
        canonical_rows.append(winner)
        for member in group:
            if member["id"] != winner["id"]:
                duplicate_remaps[int(member["id"])] = int(winner["id"])

    canonical_rows.sort(key=lambda r: int(r["id"]))

    field_updates: dict[int, dict[str, object]] = {}
    text_changed_count = 0
    materia_changed_count = 0

    for row in canonical_rows:
        qid = int(row["id"])
        updates: dict[str, object] = {}

        for field in TEXT_FIELDS:
            original = row.get(field)
            repaired = sanitize_question_text(original)
            if repaired != original:
                updates[field] = repaired
                row[field] = repaired
                text_changed_count += 1

        new_materia = reclassify_materia(row)
        if new_materia != row.get("materia"):
            updates["materia"] = new_materia
            row["materia"] = new_materia
            materia_changed_count += 1

        if updates:
            field_updates[qid] = updates

    report = {
        "summary": {
            "input_rows": len(rows),
            "deleted_stubs_count": len(delete_stub_ids),
            "dedup_remapped_count": len(duplicate_remaps),
            "surviving_rows": len(canonical_rows),
            "updated_rows_count": len(field_updates),
            "text_field_updates_count": text_changed_count,
            "materia_reclassifications_count": materia_changed_count,
        },
        "delete_stub_ids": delete_stub_ids,
        "stub_reasons": stub_reasons,
        "duplicate_remaps": duplicate_remaps,
        "materia_distribution_after": _count_materias(canonical_rows),
    }

    return RemediationResult(
        delete_stub_ids=delete_stub_ids,
        duplicate_remaps=duplicate_remaps,
        field_updates=field_updates,
        remediated_rows=canonical_rows,
        report=report,
    )


def _count_materias(rows: Iterable[dict]) -> dict[str, int]:
    counts: dict[str, int] = defaultdict(int)
    for row in rows:
        counts[str(row.get("materia"))] += 1
    return dict(sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])))


def _sql_quote(value: object) -> str:
    if value is None:
        return "NULL"
    text = str(value).replace("'", "''")
    return f"'{text}'"


def generate_migration_sql(result: RemediationResult) -> str:
    """Generate idempotent, transactional SQL that remaps all FKs before deleting any row."""
    lines: list[str] = [
        "-- Bloco B Question Bank Sanitization, Deduplication & Taxonomy Reclassification",
        "-- Idempotent & transactional: remaps ALL FKs before any DELETE FROM public.questoes.",
        "BEGIN;",
        "",
    ]

    if result.duplicate_remaps:
        lines.extend(
            [
                "CREATE TEMP TABLE _bloco_b_dedup_map (dup_id bigint PRIMARY KEY, canonical_id bigint NOT NULL) ON COMMIT DROP;",
                "INSERT INTO _bloco_b_dedup_map (dup_id, canonical_id) VALUES",
            ]
        )
        pairs = sorted(result.duplicate_remaps.items())
        for idx, (dup_id, can_id) in enumerate(pairs):
            sep = ";" if idx == len(pairs) - 1 else ","
            lines.append(f"  ({dup_id}, {can_id}){sep}")
        lines.extend(
            [
                "",
                "-- 1. Handle user spaced-repetition / flashcard uniqueness before generic FK remap",
                "DO $$",
                "DECLARE",
                "  owner_col text;",
                "BEGIN",
                "  IF to_regclass('public.revisao_espacada') IS NOT NULL THEN",
                "    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'revisao_espacada' AND column_name = 'item_id')",
                "       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'revisao_espacada' AND column_name = 'item_tipo') THEN",
                "      SELECT column_name INTO owner_col FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'revisao_espacada' AND column_name IN ('aluno_id', 'user_id', 'student_id') LIMIT 1;",
                "      IF owner_col IS NOT NULL THEN",
                "        EXECUTE format('DELETE FROM public.revisao_espacada r USING _bloco_b_dedup_map m, public.revisao_espacada c WHERE r.item_tipo = ''questao'' AND c.item_tipo = ''questao'' AND r.item_id = m.dup_id AND c.item_id = m.canonical_id AND c.%I IS NOT DISTINCT FROM r.%I', owner_col, owner_col);",
                "      END IF;",
                "      EXECUTE 'UPDATE public.revisao_espacada r SET item_id = m.canonical_id FROM _bloco_b_dedup_map m WHERE r.item_tipo = ''questao'' AND r.item_id = m.dup_id';",
                "    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'revisao_espacada' AND column_name = 'questao_id') THEN",
                "      SELECT column_name INTO owner_col FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'revisao_espacada' AND column_name IN ('user_id', 'aluno_id', 'student_id') LIMIT 1;",
                "      IF owner_col IS NOT NULL THEN",
                "        EXECUTE format('DELETE FROM public.revisao_espacada r USING _bloco_b_dedup_map m, public.revisao_espacada c WHERE r.questao_id = m.dup_id AND c.questao_id = m.canonical_id AND c.%I IS NOT DISTINCT FROM r.%I', owner_col, owner_col);",
                "      END IF;",
                "      EXECUTE 'UPDATE public.revisao_espacada r SET questao_id = m.canonical_id FROM _bloco_b_dedup_map m WHERE r.questao_id = m.dup_id';",
                "    END IF;",
                "  END IF;",
                "  IF to_regclass('public.flashcards') IS NOT NULL THEN",
                "    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'flashcards' AND column_name = 'questao_id') THEN",
                "      SELECT column_name INTO owner_col FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'flashcards' AND column_name IN ('user_id', 'student_id', 'aluno_id') LIMIT 1;",
                "      IF owner_col IS NOT NULL THEN",
                "        EXECUTE format('DELETE FROM public.flashcards f USING _bloco_b_dedup_map m, public.flashcards c WHERE f.questao_id = m.dup_id AND c.questao_id = m.canonical_id AND c.%I IS NOT DISTINCT FROM f.%I', owner_col, owner_col);",
                "      END IF;",
                "      EXECUTE 'UPDATE public.flashcards f SET questao_id = m.canonical_id FROM _bloco_b_dedup_map m WHERE f.questao_id = m.dup_id';",
                "    END IF;",
                "  END IF;",
                "END $$;",
                "",
                "-- 2. Dynamically remap every remaining FK column in public referencing public.questoes(id)",
                "DO $$",
                "DECLARE",
                "  fk record;",
                "  dup_row record;",
                "BEGIN",
                "  FOR fk IN",
                "    SELECT conrelid::regclass AS tbl, a.attname AS col",
                "    FROM pg_constraint c",
                "    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)",
                "    WHERE c.contype = 'f'",
                "      AND c.confrelid = 'public.questoes'::regclass",
                "  LOOP",
                "    BEGIN",
                "      EXECUTE format(",
                "        'UPDATE %s t SET %I = m.canonical_id FROM _bloco_b_dedup_map m WHERE t.%I = m.dup_id',",
                "        fk.tbl, fk.col, fk.col",
                "      );",
                "    EXCEPTION WHEN unique_violation THEN",
                "      FOR dup_row IN EXECUTE format(",
                "        'SELECT t.ctid AS row_ctid, m.canonical_id FROM %s t JOIN _bloco_b_dedup_map m ON t.%I = m.dup_id',",
                "        fk.tbl, fk.col",
                "      ) LOOP",
                "        BEGIN",
                "          EXECUTE format('UPDATE %s SET %I = $1 WHERE ctid = $2', fk.tbl, fk.col)",
                "            USING dup_row.canonical_id, dup_row.row_ctid;",
                "        EXCEPTION WHEN unique_violation THEN",
                "          EXECUTE format('DELETE FROM %s WHERE ctid = $1', fk.tbl)",
                "            USING dup_row.row_ctid;",
                "        END;",
                "      END LOOP;",
                "    END;",
                "  END LOOP;",
                "END $$;",
                "",
            ]
        )

    if result.delete_stub_ids:
        stub_csv = ", ".join(str(x) for x in sorted(result.delete_stub_ids))
        lines.extend(
            [
                "-- 3. Purge FK children strictly referencing deleted stubs before deleting stubs",
                "DO $$",
                "DECLARE",
                "  fk record;",
                f"  stub_ids bigint[] := ARRAY[{stub_csv}]::bigint[];",
                "BEGIN",
                "  FOR fk IN",
                "    SELECT conrelid::regclass AS tbl, a.attname AS col",
                "    FROM pg_constraint c",
                "    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)",
                "    WHERE c.contype = 'f'",
                "      AND c.confrelid = 'public.questoes'::regclass",
                "  LOOP",
                "    EXECUTE format('DELETE FROM %s WHERE %I = ANY ($1)', fk.tbl, fk.col) USING stub_ids;",
                "  END LOOP;",
                "  IF to_regclass('public.revisao_espacada') IS NOT NULL",
                "     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'revisao_espacada' AND column_name = 'item_id')",
                "     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'revisao_espacada' AND column_name = 'item_tipo') THEN",
                "    EXECUTE 'DELETE FROM public.revisao_espacada WHERE item_tipo = ''questao'' AND item_id = ANY ($1)' USING stub_ids;",
                "  END IF;",
                "END $$;",
                "",
                "-- 4. Delete confirmed placeholders & truncated PDF fragments",
                f"DELETE FROM public.questoes WHERE id IN ({stub_csv});",
                "",
            ]
        )

    if result.duplicate_remaps:
        lines.extend(
            [
                "-- 5. Delete deduplicated secondary rows (all FK references already remapped above)",
                "DELETE FROM public.questoes q USING _bloco_b_dedup_map m WHERE q.id = m.dup_id;",
                "",
            ]
        )

    if result.field_updates:
        lines.append("-- 6. Apply sanitized text fields and reclassified materia values")
        for qid in sorted(result.field_updates):
            updates = result.field_updates[qid]
            assignments = ", ".join(f"{col} = {_sql_quote(val)}" for col, val in updates.items())
            lines.append(f"UPDATE public.questoes SET {assignments} WHERE id = {qid};")
        lines.append("")

    lines.append("COMMIT;")
    return "\n".join(lines) + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Bloco B question bank remediation tool.")
    parser.add_argument("--input", type=Path, required=True, help="Path to exported public.questoes JSON array.")
    parser.add_argument("--sql-out", type=Path, default=None, help="Output path for migration SQL file.")
    parser.add_argument("--report-out", type=Path, default=None, help="Output path for JSON audit report.")
    parser.add_argument("--remediated-json", type=Path, default=None, help="Output path for remediated JSON array.")
    parser.add_argument("--dry-run", action="store_true", help="Compute audit summary without writing SQL or JSON dataset.")
    args = parser.parse_args(argv)

    rows = json.loads(args.input.read_text(encoding="utf-8"))
    result = remediate_catalog(rows)
    report_payload = {"dry_run": args.dry_run, **result.report}

    if args.report_out:
        args.report_out.parent.mkdir(parents=True, exist_ok=True)
        args.report_out.write_text(json.dumps(report_payload, ensure_ascii=False, indent=2), encoding="utf-8")

    if not args.dry_run:
        if args.sql_out:
            args.sql_out.parent.mkdir(parents=True, exist_ok=True)
            args.sql_out.write_text(generate_migration_sql(result), encoding="utf-8")
        if args.remediated_json:
            args.remediated_json.parent.mkdir(parents=True, exist_ok=True)
            args.remediated_json.write_text(
                json.dumps(result.remediated_rows, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )

    print(json.dumps(report_payload["summary"], ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
