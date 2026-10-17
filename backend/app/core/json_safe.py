"""
Utilitário para parsing tolerante e resiliente de JSON gerado por LLMs contendo expressões matemáticas em LaTeX.
Espelha a implementação comprovada de frontend/lib/json-safe.ts.
"""

import json
import re
from typing import Any, Dict, Tuple


def safe_parse_json_with_latex(raw: str) -> Any:
    """
    Realiza o parse de JSON gerado por LLMs que contêm contrabarras não escapadas de LaTeX
    (ex: \\frac, \\text, \\in, \\forall) ou quebras literais de linha dentro de strings.
    """
    if not raw or not isinstance(raw, str):
        raise ValueError("Input inválido para safe_parse_json_with_latex.")

    clean = raw.strip()

    # Remove markdown code fences se presentes (```json ... ``` ou ``` ... ```)
    if clean.startswith("```"):
        clean = re.sub(r"^```(?:json)?\s*", "", clean, flags=re.IGNORECASE)
        clean = re.sub(r"\s*```$", "", clean)
        clean = clean.strip()

    # Isola o primeiro '{' e o último '}'
    first_brace = clean.find("{")
    last_brace = clean.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        clean = clean[first_brace : last_brace + 1]

    # 1. Tenta o parsing nativo direto primeiro
    try:
        return json.loads(clean)
    except Exception:
        pass

    # 2. Sanitizador de strings JSON respeitando delimitadores de aspas
    sanitized = []
    in_string = False
    is_escaped = False
    i = 0
    n = len(clean)

    while i < n:
        char = clean[i]

        if not in_string:
            if char == '"':
                in_string = True
            sanitized.append(char)
            i += 1
        else:
            if is_escaped:
                # O caractere anterior foi uma barra invertida mantida propositalmente
                is_escaped = False
                sanitized.append(char)
                i += 1
            elif char == "\\":
                next_char = clean[i + 1] if i + 1 < n else ""
                next_next = clean[i + 2] if i + 2 < n else ""

                # 1. Aspas escapadas \" -> manter como escape válido
                if next_char == '"':
                    sanitized.append('\\"')
                    i += 2
                # 2. Barra invertida já escapada \\ -> manter ambas
                elif next_char == "\\":
                    sanitized.append("\\\\")
                    i += 2
                # 3. Barra diagonal \/ -> manter
                elif next_char == "/":
                    sanitized.append("\\/")
                    i += 2
                # 4. Unicode escape \uXXXX
                elif next_char == "u" and re.match(r"^[0-9a-fA-F]{4}$", clean[i + 2 : i + 6]):
                    sanitized.append(clean[i : i + 6])
                    i += 6
                # 5. LaTeX vs Newline/Tab/Carriage Return/Backspace/FormFeed:
                # Se \n, \t, \r, \b, \f for seguido de letra (ex: \neg, \neq, \to, \times, \rho, \beta, \forall, \frac),
                # é um comando LaTeX, e NÃO um caractere de controle! Deve ser escapado como \\!
                elif next_char in ("n", "t", "r", "b", "f") and re.match(r"^[a-zA-Z]", next_next):
                    sanitized.append("\\\\")
                    i += 1
                # 6. Controles reais legítimos \n, \r, \t (não seguidos de letra)
                elif next_char in ("n", "r", "t"):
                    sanitized.append("\\" + next_char)
                    i += 2
                # 7. Qualquer outro caractere após barra invertida (ex: \alpha, \in, \subset, \sum, \int, \{, \}, \$, \_):
                else:
                    sanitized.append("\\\\")
                    i += 1
            elif char == '"':
                in_string = False
                sanitized.append(char)
                i += 1
            elif char == "\n":
                sanitized.append("\\n")
                i += 1
            elif char == "\r":
                sanitized.append("\\r")
                i += 1
            elif char == "\t":
                sanitized.append("\\t")
                i += 1
            else:
                sanitized.append(char)
                i += 1

    sanitized_str = "".join(sanitized)

    try:
        return json.loads(sanitized_str)
    except Exception:
        # Se ainda falhar, tenta remover trailing commas antes de fechamento de objeto/array
        fixed_trailing = re.sub(r",\s*([}\]])", r"\1", sanitized_str)
        return json.loads(fixed_trailing)
