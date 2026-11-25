"""Bounded exact arithmetic and symbolic checks. No eval, generated code or symbolic claims."""
import ast
import re
import time
from fractions import Fraction

try:
    import sympy as sp
    from sympy.parsing.sympy_parser import (
        convert_xor,
        implicit_multiplication_application,
        parse_expr,
        standard_transformations,
    )
    _HAS_SYMPY = True
except ImportError:  # pragma: no cover - optional fallback when sympy is not installed
    sp = None
    _HAS_SYMPY = False


class Unsupported(ValueError):
    pass


def _number(expression: str) -> Fraction:
    if len(expression) > 256 or not re.fullmatch(r'[0-9.\s+*/()\-^]+', expression):
        raise Unsupported()
    tree = ast.parse(expression.replace('^', '**'), mode='eval')
    if sum(1 for _ in ast.walk(tree)) > 96:
        raise Unsupported()

    def visit(node):
        if isinstance(node, ast.Constant) and type(node.value) in (int, float):
            source = ast.get_source_segment(expression.replace('^', '**'), node)
            if len(source) > 32:
                raise Unsupported()
            value = Fraction(source)
        elif isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
            value = visit(node.operand) * (-1 if isinstance(node.op, ast.USub) else 1)
        elif isinstance(node, ast.BinOp):
            left, right = visit(node.left), visit(node.right)
            if isinstance(node.op, ast.Add): value = left + right
            elif isinstance(node.op, ast.Sub): value = left - right
            elif isinstance(node.op, ast.Mult): value = left * right
            elif isinstance(node.op, ast.Div): value = left / right
            elif isinstance(node.op, ast.Pow) and right.denominator == 1 and abs(right) <= 12:
                value = left ** int(right)
            else: raise Unsupported()
        else:
            raise Unsupported()
        if max(value.numerator.bit_length(), value.denominator.bit_length()) > 256:
            raise Unsupported()
        return value
    return visit(tree.body)


def _normalize(text: str) -> str:
    text = text.replace(r'\left', '').replace(r'\right', '')
    text = text.replace(r'\dfrac', r'\frac').replace(r'\tfrac', r'\frac')
    for _ in range(12):
        updated = re.sub(r'\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}', r'((\1)/(\2))', text)
        if updated == text: break
        text = updated
    for marker in [r'\cdot', r'\times', '×', '·']:
        text = text.replace(marker, '*')
    for marker in [r'\div', '÷', ':']:
        text = text.replace(marker, '/')
    text = text.replace('−', '-').replace('{,}', '.')
    text = re.sub(r'(?<=\d),(?=\d)', '.', text)
    text = text.replace(r'\,', '').replace(r'\;', '').replace(r'\!', '')
    return text


_ALLOWED_SYMPY_FUNCS = {'sqrt', 'sin', 'cos', 'tan', 'log', 'exp', 'abs', 'pi', 'E'}
_SYMPY_TRANSFORMATIONS = (
    standard_transformations + (implicit_multiplication_application, convert_xor)
    if _HAS_SYMPY
    else ()
)


def _normalize_sympy(expr: str) -> str:
    expr = expr.strip()
    if not expr or len(expr) > 180 or '__' in expr:
        raise Unsupported()
    expr = re.sub(r'\\sqrt\s*\[\s*([0-9]+)\s*\]\s*\{([^{}]+)\}', r'((\2)**(1/(\1)))', expr)
    for _ in range(8):
        updated = re.sub(r'\\sqrt\s*\{([^{}]+)\}', r'sqrt(\1)', expr)
        if updated == expr:
            break
        expr = updated
    for tex, py_name in [
        (r'\sen', 'sin'),
        (r'\sin', 'sin'),
        (r'\cos', 'cos'),
        (r'\tan', 'tan'),
        (r'\tg', 'tan'),
        (r'\ln', 'log'),
        (r'\exp', 'exp'),
        (r'\pi', 'pi'),
    ]:
        expr = expr.replace(tex, f' {py_name} ')
    expr = expr.replace('{', '(').replace('}', ')')
    if not re.fullmatch(r'[0-9A-Za-z.\s+*/()\-^]+', expr):
        raise Unsupported()
    # Allow only single-letter math symbols or allowlisted math functions/constants
    for token in re.findall(r'[A-Za-z]+', expr):
        if len(token) > 1 and token not in _ALLOWED_SYMPY_FUNCS:
            raise Unsupported()
    return expr


def _parse_sympy_expr(raw: str):
    """Safely parses a single LaTeX/math expression into a bounded SymPy Basic object."""
    if not _HAS_SYMPY:
        raise Unsupported()
    expr_s = _normalize_sympy(raw)
    safe_locals: dict = {
        'sqrt': sp.sqrt,
        'sin': sp.sin,
        'cos': sp.cos,
        'tan': sp.tan,
        'log': sp.log,
        'exp': sp.exp,
        'abs': sp.Abs,
        'pi': sp.pi,
        'E': sp.E,
        'e': sp.E,
    }
    for letter in 'abcdfghijklmnopqrstuvwxyzABCDFGHIJKLMNOPQRSTUVWXYZ':
        safe_locals.setdefault(letter, sp.Symbol(letter))

    safe_globals: dict = {
        '__builtins__': {},
        'Integer': sp.Integer,
        'Float': sp.Float,
        'Rational': sp.Rational,
        'Symbol': sp.Symbol,
    }

    try:
        parsed = parse_expr(expr_s, local_dict=safe_locals, global_dict=safe_globals, transformations=_SYMPY_TRANSFORMATIONS)
    except Exception as exc:
        raise Unsupported() from exc

    if not isinstance(parsed, sp.Basic):
        raise Unsupported()
    if parsed.has(sp.zoo, sp.oo, -sp.oo, sp.nan):
        raise Unsupported()

    # Cap exponent size before symbolic simplification to avoid DoS
    for node in sp.preorder_traversal(parsed):
        if (
            isinstance(node, sp.Pow)
            and node.exp.is_number
            and not node.exp.free_symbols
            and abs(complex(node.exp.evalf())) > 24
        ):
            raise Unsupported()
    return parsed


def _sympy_compare(left_raw: str, right_raw: str) -> tuple[bool, str, str]:
    lhs = _parse_sympy_expr(left_raw)
    rhs = _parse_sympy_expr(right_raw)

    diff = sp.simplify(lhs - rhs)
    if diff == 0:
        return True, str(lhs), str(rhs)
    if not diff.free_symbols:
        return False, str(lhs), str(rhs)
    # Free variables remain (e.g. x*x = 4): contingent equation, not an unconditional conflict.
    raise Unsupported()


def _schwartz_zippel_proportional(f_prev, f_curr, symbols: list) -> bool | None:
    """
    Tests if F_prev == lambda * F_curr for a nonzero scalar lambda using deterministic
    rational probes (Schwartz-Zippel randomized polynomial identity test), then confirms
    symbolically when proportional. Returns True/False, or None if indeterminate.
    """
    probe_sets = [
        {sym: sp.Rational(3 + idx * 2 + j, 5 + j) for j, sym in enumerate(symbols)}
        for idx in range(4)
    ]
    ratios = []
    for subs_map in probe_sets:
        try:
            v_prev = sp.N(f_prev.subs(subs_map), 20)
            v_curr = sp.N(f_curr.subs(subs_map), 20)
            if v_prev.has(sp.zoo, sp.oo, -sp.oo, sp.nan) or v_curr.has(sp.zoo, sp.oo, -sp.oo, sp.nan):
                continue
            if abs(complex(v_curr)) < 1e-12:
                if abs(complex(v_prev)) > 1e-9:
                    return False
                continue
            ratios.append(complex(v_prev) / complex(v_curr))
        except Exception:
            continue

    if len(ratios) < 2:
        return None
    ref = ratios[0]
    if any(abs(r - ref) > 1e-6 * max(1.0, abs(ref)) for r in ratios[1:]):
        return False

    try:
        quot = sp.simplify(f_prev / f_curr)
        if not quot.free_symbols and quot != 0:
            return True
    except Exception:
        pass
    return None


def _compare_equation_steps(prev_eq: tuple, curr_eq: tuple) -> bool | None:
    """
    Verifies whether two consecutive algebraic equations (L1 = R1) -> (L2 = R2)
    over the same free variables preserve solution equivalence / valid implication.
    Returns True (consistent), False (conflict), or None (unsupported/indeterminate).
    """
    if not _HAS_SYMPY:
        return None
    l1, r1, _ = prev_eq
    l2, r2, _ = curr_eq
    f1 = l1 - r1
    f2 = l2 - r2
    syms1 = f1.free_symbols
    syms2 = f2.free_symbols
    if not syms1 or syms1 != syms2 or len(syms1) > 4:
        return None

    # 1. Univariate exact solution-set comparison over Reals
    if len(syms1) == 1:
        var = next(iter(syms1))
        try:
            sol1 = sp.solveset(f1, var, sp.S.Reals)
            sol2 = sp.solveset(f2, var, sp.S.Reals)
            if isinstance(sol1, sp.FiniteSet) and isinstance(sol2, sp.FiniteSet):
                if len(sol1) > 0 and len(sol2) > 0:
                    if sol1 == sol2 or sol1.is_subset(sol2):
                        return True
                    # Neither is a subset of the other (includes disjoint solution sets like {3} vs {7})
                    if not sol2.is_subset(sol1):
                        return False
                    # sol2 is a strict subset of sol1 (e.g. x^2=4 -> x=2 when domain x>0 is implicit): leave indeterminate
                    return None
        except Exception:
            pass

    # 2. Multivariate / fallback scalar proportionality check via Schwartz-Zippel + simplify
    return _schwartz_zippel_proportional(f1, f2, sorted(syms1, key=lambda s: s.name))


def check_arithmetic(transcription: str) -> dict:
    """Check only explicit numeric equalities, never invented solution steps."""
    start = time.perf_counter()
    checks = []
    if not isinstance(transcription, str) or len(transcription) > 8000:
        return {'status': 'unsupported', 'checks': []}
    blocks = re.findall(r'\$\$?(.*?)\$\$?', transcription, re.S) or transcription.splitlines()
    for block in blocks[:32]:
        if time.perf_counter() - start > .15:
            break
        normalized = _normalize(block)
        step_equations = []
        # Split assignment prefixes/implications; do not treat inequalities as equalities.
        for chain in re.split(r'\\(?:implies|Rightarrow|therefore)|\\\\(?![A-Za-z])|=>|->|→|;|\n', normalized):
            sides = re.split(r'(?<![<>!:=])=(?!=)', chain)
            if len(sides) == 2:
                try:
                    l_expr = _parse_sympy_expr(sides[0].strip())
                    r_expr = _parse_sympy_expr(sides[1].strip())
                    if (l_expr - r_expr).free_symbols:
                        step_equations.append((l_expr, r_expr, f'{sides[0].strip()} = {sides[1].strip()}'))
                except (ValueError, SyntaxError, ZeroDivisionError, OverflowError, RecursionError, TypeError):
                    pass

            for left, right in zip(sides, sides[1:]):
                if len(checks) >= 32: break
                left_s, right_s = left.strip(), right.strip()
                try:
                    a, b = _number(left_s), _number(right_s)
                    checks.append({'expression': f'{left_s} = {right_s}', 'equal': a == b,
                                   'left': str(a), 'right': str(b)})
                except (ValueError, SyntaxError, ZeroDivisionError, OverflowError, RecursionError):
                    try:
                        eq, sym_l, sym_r = _sympy_compare(left_s, right_s)
                        checks.append({'expression': f'{left_s} = {right_s}', 'equal': eq,
                                       'left': sym_l, 'right': sym_r, 'engine': 'sympy'})
                    except (ValueError, SyntaxError, ZeroDivisionError, OverflowError, RecursionError, TypeError):
                        continue

        for prev_eq, curr_eq in zip(step_equations, step_equations[1:]):
            if len(checks) >= 32 or time.perf_counter() - start > .15:
                break
            step_ok = _compare_equation_steps(prev_eq, curr_eq)
            if step_ok is not None:
                checks.append({
                    'expression': f'{prev_eq[2]} -> {curr_eq[2]}',
                    'equal': step_ok,
                    'left': prev_eq[2],
                    'right': curr_eq[2],
                    'engine': 'sympy-step',
                })
    return {'status': 'conflict' if any(not c['equal'] for c in checks) else 'consistent' if checks else 'unsupported',
            'checks': checks, 'latency_ms': round((time.perf_counter() - start) * 1000, 3)}


def protect_evaluation(result: dict, *, has_image: bool, confirmed_text: str | None = None) -> dict:
    result = dict(result)
    transcription = confirmed_text if confirmed_text is not None else result.get('transcricao_latex', '')
    check = check_arithmetic(transcription)
    result['arithmetic_check'] = check
    result['ocr_review_required'] = False
    if has_image and (check['status'] == 'conflict' or result.get('ocr_ambiguo') is True):
        message = 'A leitura do manuscrito precisa de confirmação. Confira a transcrição abaixo; sua tentativa e seu rascunho foram preservados.'
        result.update(precisa_revisao_humana=True, ocr_review_required=True,
                      feedback_latex=message, diagnostico=message, status_resolucao='incompleto',
                      resultado_final_correto=False)
    elif check['status'] == 'conflict':
        # A confirmed/textual arithmetic conflict cannot be approved by the model.
        result['resultado_final_correto'] = False
        if result.get('veredito') == 'aprovado':
            result.update(veredito='parcial', status_resolucao='erro_conta_sinal',
                          feedback_latex='Há uma igualdade numérica inconsistente no desenvolvimento confirmado. Revise a conta antes de concluir.')
    return result
