"""
Script para exportar dados de Turso/SQLite para arquivos SQL compatíveis com Supabase Postgres.
"""
from pathlib import Path
import json
import re
import sys

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.database.db import pegar_conexao
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

def sql_quote(val):
    if val is None:
        return "NULL"
    if isinstance(val, (int, float)):
        return str(val)
    # escape single quotes for Postgres
    s = str(val).replace("'", "''")
    return f"'{s}'"

def export_usuarios():
    con = pegar_conexao()
    users = con.execute("SELECT * FROM usuarios").fetchall()
    print(f"Exportando {len(users)} usuarios...")
    cols = ['id', 'nome', 'email', 'senha_hash', 'cpf', 'idade', 'celular', 'cep', 'logradouro', 'numero', 'bairro', 'cidade', 'estado', 'motivos', 'escolaridade', 'faculdade', 'curso', 'concursos_foco', 'verificado', 'criado_em']
    rows = []
    for u in users:
        vals = [sql_quote(u[c]) for c in cols]
        rows.append(f"({', '.join(vals)})")
    
    sql = f"INSERT INTO usuarios ({', '.join(cols)})\nVALUES\n" + ",\n".join(rows) + "\nON CONFLICT (id) DO NOTHING;\n"
    sql += f"SELECT setval('usuarios_id_seq', (SELECT COALESCE(MAX(id), 1) FROM usuarios));\n"
    (DATA_DIR / "migrate_usuarios.sql").write_text(sql, encoding="utf-8")
    print("Salvo: migrate_usuarios.sql")

def export_questoes():
    con = pegar_conexao()
    questoes = con.execute("SELECT * FROM questoes ORDER BY id ASC").fetchall()
    print(f"Exportando {len(questoes)} questoes...")
    cols = ['id', 'materia', 'topico', 'subtopico', 'dificuldade', 'banca', 'ano', 'enunciado', 'figura_path', 'gabarito', 'estrategias_esperadas', 'tipo', 'criado_em']
    
    # Gerar em lotes de 50 para execução controlada no Supabase
    chunk_size = 50
    for i in range(0, len(questoes), chunk_size):
        chunk = questoes[i:i + chunk_size]
        rows = []
        for q in chunk:
            vals = [sql_quote(q[c]) for c in cols]
            rows.append(f"({', '.join(vals)})")
        sql = f"INSERT INTO questoes ({', '.join(cols)})\nVALUES\n" + ",\n".join(rows) + "\nON CONFLICT (id) DO NOTHING;\n"
        chunk_idx = i // chunk_size
        (DATA_DIR / f"migrate_questoes_chunk_{chunk_idx}.sql").write_text(sql, encoding="utf-8")
    
    # Atualizar sequence
    seq_sql = "SELECT setval('questoes_id_seq', (SELECT COALESCE(MAX(id), 1) FROM questoes));\n"
    (DATA_DIR / "migrate_questoes_seq.sql").write_text(seq_sql, encoding="utf-8")
    print(f"Salvos {((len(questoes) - 1) // chunk_size) + 1} chunks de questoes.")

if __name__ == "__main__":
    export_usuarios()
    export_questoes()
    print("Exportação finalizada com sucesso!")
