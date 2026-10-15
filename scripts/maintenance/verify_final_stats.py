import os
import sys
from dotenv import load_dotenv

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

load_dotenv("backend/.env")
from supabase import create_client
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

# 1. RPC stats
res = supabase.rpc("get_lemmas_global_stats").execute()
print(f"Total geral de questoes: {res.data.get('total_questoes')}")
print("\nDistribuicao por Materia (RPC get_lemmas_global_stats):")
for m in res.data.get("materias", []):
    nome = m.get("nome", "")
    tot = m.get("total", 0)
    print(f"  • {nome.ljust(30)}: {str(tot).rjust(5)} questoes")

# 2. Check sample Funcoes questions
f_res = supabase.table("questoes").select("id, banca, ano, topico, enunciado").eq("materia", "Funções").limit(4).execute()
print("\nExemplos de Questoes na Grande Area Funcoes:")
for q in f_res.data:
    qid = q.get("id")
    banca = q.get("banca")
    ano = q.get("ano")
    topico = q.get("topico")
    enunc = (q.get("enunciado") or "")[:90].replace("\n", " ")
    print(f"  • [ID {qid}] {banca} ({ano}) | Topico: {topico} | Enunciado: {enunc}...")
