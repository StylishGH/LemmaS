"""Bounded exact arithmetic checks. No eval, generated code or symbolic claims."""
import ast
import re
import time
from fractions import Fraction


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


def check_arithmetic(transcription: str) -> dict:
    """Check only explicit numeric equalities, never invented solution steps."""
    start = time.perf_counter()
    checks = []
    if not isinstance(transcription, str) or len(transcription) > 8000:
        return {'status': 'unsupported', 'checks': []}
    blocks = re.findall(r'\$\$?(.*?)\$\$?', transcription, re.S) or transcription.splitlines()
    for block in blocks[:32]:
        if time.perf_counter() - start > .03:
            break
        normalized = _normalize(block)
        # Split assignment prefixes/implications; do not treat inequalities as equalities.
        for chain in re.split(r'\\(?:implies|Rightarrow|therefore)|=>|→|;|\n', normalized):
            sides = re.split(r'(?<![<>!:=])=(?!=)', chain)
            for left, right in zip(sides, sides[1:]):
                if len(checks) >= 32: break
                try:
                    a, b = _number(left.strip()), _number(right.strip())
                except (ValueError, SyntaxError, ZeroDivisionError, OverflowError, RecursionError):
                    continue
                checks.append({'expression': f'{left.strip()} = {right.strip()}', 'equal': a == b,
                               'left': str(a), 'right': str(b)})
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
