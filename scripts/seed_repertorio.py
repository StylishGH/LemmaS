"""
Script para popular o banco de repertório (conceitos e lemas) no Supabase Postgres.
"""
import json
import urllib.request
from pathlib import Path

import os

BASE_DIR = Path(__file__).resolve().parent.parent
REPERTORIO_FILE = BASE_DIR / "data" / "repertorio" / "lemas_fundamentais.json"

PROJECT_REF = os.getenv("SUPABASE_PROJECT_REF", "gzlzwqknwfgrsnyvgpnv")
PAT = os.getenv("SUPABASE_PAT", "")
URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"

def run_query(sql: str):
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
    print(f"Inserindo {len(lemas)} lemas no Supabase...")

    for lema in lemas:
        nome = lema["nome"].replace("'", "''")
        materia = lema["materia"].replace("'", "''")
        topico = lema["topico"].replace("'", "''")
        gatilho = lema["gatilho"].replace("'", "''")
        acao = lema["acao_ou_teorema"].replace("'", "''")
        formula = lema["formula_latex"].replace("'", "''")

        sql = f"""
        INSERT INTO conceitos (nome, materia, topico, gatilho, acao_ou_teorema, formula_latex)
        VALUES ('{nome}', '{materia}', '{topico}', '{gatilho}', '{acao}', '{formula}');
        """
        run_query(sql)

    res = run_query("SELECT COUNT(*) as count FROM conceitos;")
    print(f"Total de conceitos/lemas no Supabase agora: {res[0]['count']}")

if __name__ == "__main__":
    seed()
