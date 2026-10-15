"""
Script para higienizar questões onde as alternativas contêm imagens.
Garante que a alternativa (A) não seja indevidamente exibida como figura do enunciado.
"""

import os
import sys
import re
from pathlib import Path
from dotenv import load_dotenv

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / "frontend" / ".env.local")
load_dotenv(ROOT_DIR / "backend" / ".env")
load_dotenv(ROOT_DIR / ".env")

from supabase import create_client

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")

client = create_client(SUPABASE_URL, SUPABASE_KEY)

res = client.table("questoes").select("id, banca, ano, figura_path, enunciado").ilike("enunciado", "%(A) ![%").execute()
print(f"[*] Analisando {len(res.data)} questões com alternativas em imagem...")

atualizadas = 0
for q in res.data:
    enunc = q["enunciado"]
    partes = enunc.split("(A)")
    corpo = partes[0]

    # Verifica se há imagem no corpo antes de (A)
    match_corpo = re.search(r"!\[.*?\]\((/data/imagens/[^)]+)\)", corpo)
    if match_corpo:
        nova_figura = match_corpo.group(1)
    else:
        nova_figura = None

    if q["figura_path"] != nova_figura:
        client.table("questoes").update({"figura_path": nova_figura}).eq("id", q["id"]).execute()
        print(f"  [✓] Questão {q['id']} ({q['banca']} {q['ano']}): figura_path ajustado de '{q['figura_path']}' para '{nova_figura}'")
        atualizadas += 1

print(f"\n[✓] Total de {atualizadas} questões corrigidas!")
