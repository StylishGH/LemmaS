"""
Script automatizado de migração completa para o Supabase Postgres via Management API.
"""
import urllib.request
import json
from pathlib import Path

import os

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

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

def migrate_chunks():
    chunk_files = sorted(DATA_DIR.glob("migrate_questoes_chunk_*.sql"))
    print(f"Encontrados {len(chunk_files)} chunks de questões para migrar.")
    
    for cf in chunk_files:
        print(f"Migrando {cf.name}...")
        sql = cf.read_text(encoding="utf-8")
        run_query(sql)
        print(f" -> {cf.name} migrado com sucesso.")

    # Atualiza sequence
    seq_file = DATA_DIR / "migrate_questoes_seq.sql"
    if seq_file.exists():
        run_query(seq_file.read_text(encoding="utf-8"))
        print(" -> Sequência de questões atualizada.")

    # Validar contagem final
    res_questoes = run_query("SELECT COUNT(*) as count FROM questoes;")
    res_usuarios = run_query("SELECT COUNT(*) as count FROM usuarios;")
    print(f"RESULTADO FINAL NO SUPABASE:")
    print(f" - Questoes: {res_questoes[0]['count']}")
    print(f" - Usuarios: {res_usuarios[0]['count']}")

if __name__ == "__main__":
    migrate_chunks()
