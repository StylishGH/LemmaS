"""
Script para popular o banco de repertório (conceitos e lemas) no Supabase Postgres.
Suporta execução em lote idempotente com ON CONFLICT (nome).
"""
import json
import os
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
REPERTORIO_FILE = BASE_DIR / "data" / "repertorio" / "lemas_fundamentais.json"

PROJECT_REF = os.getenv("SUPABASE_PROJECT_REF", "gzlzwqknwfgrsnyvgpnv")
PAT = os.getenv("SUPABASE_PAT", "")
URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"

def run_query(sql: str):
    if not PAT:
        raise ValueError(
            "SUPABASE_PAT não configurado no ambiente. "
            "Defina SUPABASE_PAT com seu Personal Access Token do Supabase."
        )
    headers = {
        "Authorization": f"Bearer {PAT}",
        "Content-Type": "application/json"
    }
    body = json.dumps({"query": sql}).encode("utf-8")
    req = urllib.request.Request(URL, data=body, headers=headers, method="POST")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def seed():
    if not REPERTORIO_FILE.exists():
        print("Arquivo de repertório não encontrado.")
        return

    lemas = json.loads(REPERTORIO_FILE.read_text(encoding="utf-8"))
    print(f"Sincronizando {len(lemas)} lemas no Supabase...")

    # Monta inserção em lote com ON CONFLICT (nome) para idempotência
    values = []
    for lema in lemas:
        nome = lema["nome"].replace("'", "''")
        materia = lema["materia"].replace("'", "''")
        topico = lema["topico"].replace("'", "''")
        gatilho = lema["gatilho"].replace("'", "''")
        acao = lema["acao_ou_teorema"].replace("'", "''")
        formula = lema["formula_latex"].replace("'", "''")
        values.append(f"('{nome}', '{materia}', '{topico}', '{gatilho}', '{acao}', '{formula}')")

    sql = (
        "INSERT INTO conceitos (nome, materia, topico, gatilho, acao_ou_teorema, formula_latex) VALUES\n"
        + ",\n".join(values)
        + "\nON CONFLICT (nome) DO UPDATE SET "
        + "materia = EXCLUDED.materia, "
        + "topico = EXCLUDED.topico, "
        + "gatilho = EXCLUDED.gatilho, "
        + "acao_ou_teorema = EXCLUDED.acao_ou_teorema, "
        + "formula_latex = EXCLUDED.formula_latex;"
    )

    try:
        run_query(sql)
        res = run_query("SELECT COUNT(*) as count FROM conceitos;")
        print(f"Total de conceitos/lemas no Supabase agora: {res[0]['count']}")
    except Exception as e:
        print(f"Aviso ao rodar via REST API: {e}")
        print("Caso não possua SUPABASE_PAT, utilize o Supabase MCP ou execute o SQL gerado.")

if __name__ == "__main__":
    seed()
