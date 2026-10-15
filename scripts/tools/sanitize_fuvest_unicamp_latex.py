"""
Script de Higienização e Enriquecimento de LaTeX para Questões FUVEST e UNICAMP no Supabase.
Padroniza caracteres Unicode matemáticos, resolve radicais aninhados e assegura delimitação KaTeX.
"""

import os
import sys
import io
import re
from pathlib import Path
from dotenv import load_dotenv

# UTF-8 para Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / "frontend" / ".env.local")
load_dotenv(ROOT_DIR / "backend" / ".env")
load_dotenv(ROOT_DIR / ".env")

from supabase import create_client

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("[!] Erro: Credenciais do Supabase não encontradas.")
    sys.exit(1)

client = create_client(SUPABASE_URL, SUPABASE_KEY)

def extrair_parenteses_balanceados(s: str, start_idx: int):
    if start_idx >= len(s) or s[start_idx] != "(":
        return None
    depth = 0
    for i in range(start_idx, len(s)):
        if s[i] == "(":
            depth += 1
        elif s[i] == ")":
            depth -= 1
            if depth == 0:
                return {"conteudo": s[start_idx + 1:i], "fim_index": i}
    return None

def normalizar_radicais(texto: str) -> str:
    if not texto:
        return ""
    res = []
    i = 0
    n = len(texto)
    while i < n:
        indice = None
        radical_len = 0
        if texto[i:i+1] == "∜" or texto[i:i+2] == "⁴√":
            indice = "4"
            radical_len = 2 if texto[i:i+2] == "⁴√" else 1
        elif texto[i:i+2] == "³√":
            indice = "3"
            radical_len = 2
        elif texto[i] == "√" and (i == 0 or texto[i-1] != "\\"):
            indice = None
            radical_len = 1

        if radical_len > 0:
            next_idx = i + radical_len
            if next_idx < n and texto[next_idx] == "(":
                bal = extrair_parenteses_balanceados(texto, next_idx)
                if bal:
                    prefixo = f"\\sqrt[{indice}]{{" if indice else "\\sqrt{"
                    res.append(prefixo + normalizar_radicais(bal["conteudo"]) + "}")
                    i = bal["fim_index"] + 1
                    continue
            else:
                match_tok = re.match(r"^[a-zA-Z0-9]+", texto[next_idx:])
                if match_tok:
                    tok = match_tok.group(0)
                    prefixo = f"\\sqrt[{indice}]{{" if indice else "\\sqrt{"
                    res.append(prefixo + tok + "}")
                    i = next_idx + len(tok)
                    continue

            res.append(f"\\sqrt[{indice}]" if indice else "\\sqrt")
            i += radical_len
            continue

        res.append(texto[i])
        i += 1

    final_str = "".join(res)
    final_str = re.sub(r"\\sqrt\(([^)]+)\)", r"\\sqrt{\1}", final_str)
    final_str = re.sub(r"\\sqrt\[([^\]]+)\]\(([^)]+)\)", r"\\sqrt[\1]{\2}", final_str)
    return final_str

def normalizar_matematica(texto: str) -> str:
    if not texto:
        return ""
    res = texto

    # Remove tags residuais [IMAGE 0]
    res = re.sub(r"\[IMAGE(?:\s*\d+)?\]", "", res).strip()

    # Caracteres tipográficos
    res = re.sub(r"[\u2013\u2014]", "-", res) # en-dash e em-dash
    res = res.replace("ƒ", "f")
    res = re.sub(r"[\u2219\u22c5]", r" \\cdot ", res) # ∙ e ⋅
    res = res.replace("×", r" \times ")
    res = res.replace("÷", r" \div ")
    res = res.replace("≤", r" \le ")
    res = res.replace("≥", r" \ge ")
    res = res.replace("≠", r" \neq ")
    res = res.replace("∈", r" \in ")
    res = res.replace("∉", r" \notin ")
    res = res.replace("→", r" \to ")
    res = res.replace("±", r" \pm ")

    # Conjuntos
    res = res.replace("ℝ", r"\mathbb{R}")
    res = res.replace("ℕ", r"\mathbb{N}")
    res = res.replace("ℤ", r"\mathbb{Z}")
    res = res.replace("ℚ", r"\mathbb{Q}")
    res = res.replace("ℂ", r"\mathbb{C}")

    # Logaritmos
    res = res.replace("log₂", r"\log_2 ")
    res = res.replace("log₃", r"\log_3 ")
    res = res.replace("log₅", r"\log_5 ")
    res = res.replace("log₁₀", r"\log_{10} ")

    # Radicais
    res = normalizar_radicais(res)

    return res

def auto_wrap_latex(texto: str) -> str:
    if not texto:
        return ""
    res = texto

    # Se a questão já tiver $, não forçamos auto-wrap global
    if "$" not in res:
        # 1. Funções com domínio: f: \mathbb{R} \to \mathbb{R}
        res = re.sub(r"([a-zA-Z]\s*:\s*\\mathbb\{[A-Z]\}\s*\\to\s*\\mathbb\{[A-Z]\})", r"$\1$", res)

        # 2. Pertencimento: a,b,c \in \mathbb{R} ou x \in \mathbb{Z}
        res = re.sub(r"([a-zA-Z](?:\s*,\s*[a-zA-Z])*\s*\\in\s*\\mathbb\{[A-Z]\})", r"$\1$", res)

        # 3. Desigualdades e negações: a \neq 0, x \le y
        res = re.sub(r"([a-zA-Z0-9]+\s*\\(?:neq|le|ge)\s*-?[a-zA-Z0-9]+)", r"$\1$", res)

        # 4. Definições de função com potências: f(x) = ax^2 +bx+c ou f(x) = ax^2 + bx + c
        res = re.sub(r"([a-zA-Z]\([a-zA-Z]\)\s*=\s*[^,\n.]+)", r"$\1$", res)

        # 5. Logaritmos: \log_2 y = (-1/2)+(2/3)*\log_2 x
        res = re.sub(r"(\\log_[0-9]+\s*[a-zA-Z0-9]+(?:\s*[+\-*\/=]\s*[^,\n.]+)*)", r"$\1$", res)

        # 6. Equações lineares simples: y = 2, x = 0
        res = re.sub(r"\b([a-zA-Z]\s*=\s*-?[0-9]+(?:\.[0-9]+)?)\b", r"$\1$", res)

        # 7. Expressões algébricas: a+b+c
        res = re.sub(r"\b([a-zA-Z](?:\s*[+\-*\/]\s*[a-zA-Z])+)\b", r"$\1$", res)

    return res

def processar_questao(enunciado: str) -> str:
    # 1. Normaliza caracteres
    texto = normalizar_matematica(enunciado)

    # 2. Divide em corpo e alternativas
    regex_alt = re.compile(r"\(([A-E])\)\s*([^\n\r]+)")
    matches = list(regex_alt.finditer(texto))

    if len(matches) >= 2:
        primeiro_idx = matches[0].start()
        corpo = texto[:primeiro_idx].rstrip()
        corpo_formatado = auto_wrap_latex(corpo)

        alts_formatadas = []
        for m in matches:
            letra = m.group(1)
            conteudo = m.group(2).strip()

            # Se for imagem, NÃO mexe nem coloca $
            if "![" in conteudo or "/data/imagens/" in conteudo or ".png" in conteudo:
                conteudo = re.sub(r"^\$+|\$+$", "", conteudo).strip()
                alts_formatadas.append(f"({letra}) {conteudo}")
                continue

            # Se não for imagem e não tiver $, avalia se deve ter $
            if "$" not in conteudo:
                has_latex = bool(re.search(r"\\[a-zA-Z]+|[{}^_]", conteudo))
                has_math = bool(re.search(r"[0-9]+\s*[/+*=-]\s*[0-9]+|\^\s*[0-9]+|_\s*[0-9]+|\\frac|\\sqrt|\\sum|\\int|\\log|\\pm|\\le|\\ge|\\neq|\\in|\\to|\\cdot|\\mathbb|\b[a-zA-Z]\s*=\s*", conteudo))
                if has_latex or has_math:
                    conteudo = f"${conteudo}$"

            alts_formatadas.append(f"({letra}) {conteudo}")

        return corpo_formatado + "\n\n" + "\n".join(alts_formatadas)
    else:
        return auto_wrap_latex(texto)

def main(dry_run=True):
    print(f"[*] Buscando questões FUVEST e UNICAMP no Supabase (DRY_RUN={dry_run})...")
    res = client.table("questoes").select("id, banca, ano, enunciado, figura_path").in_("banca", ["FUVEST", "UNICAMP"]).execute()
    questoes = res.data or []
    print(f"[*] Total recuperadas: {len(questoes)}")

    modificadas = 0
    for q in questoes:
        original = q["enunciado"]
        processado = processar_questao(original)

        if processado != original:
            modificadas += 1
            if modificadas <= 5 or q["id"] in [2327, 2331, 2333, 3749]:
                print(f"\n{'='*60}")
                print(f"ID {q['id']} | {q['banca']} {q['ano']}")
                print(f"{'='*60}")
                print("--- ORIGINAL (primeiros 200 chars) ---")
                print(original[:200])
                print("--- PROCESSADO (primeiros 200 chars) ---")
                print(processado[:200])

            if not dry_run:
                try:
                    client.table("questoes").update({"enunciado": processado}).eq("id", q["id"]).execute()
                except Exception as err:
                    print(f"[!] Erro ao atualizar ID {q['id']}: {err}")

    print(f"\n[*] Concluído! Total com alterações necessárias: {modificadas} de {len(questoes)}")

if __name__ == "__main__":
    is_dry = "--apply" not in sys.argv
    main(dry_run=is_dry)
