import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types
from supabase import create_client

load_dotenv("frontend/.env.local")
sb = create_client(os.getenv("NEXT_PUBLIC_SUPABASE_URL"), os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY"))
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

res = sb.table("questoes").select("id, materia, topico, enunciado").eq("banca", "CEDERJ").is_("subtopico", "null").execute()
items = [{"id": r["id"], "materia": r["materia"], "topico": r["topico"], "enunciado": r["enunciado"][:200]} for r in res.data]

prompt = """Para cada questão abaixo, defina um subtópico pedagógico conciso e preciso (campo "subtopico") e uma dificuldade inteira de 1 a 5 (campo "dificuldade") correspondente:
1=Muito Fácil, 2=Fácil, 3=Média, 4=Difícil, 5=Desafio.

Retorne APENAS um array JSON:
[
  {
    "id": 1452,
    "subtopico": "Soma de Frações com Mesmo Denominador",
    "dificuldade": 1
  }
]
"""

resp = client.models.generate_content(
    model="gemini-flash-lite-latest",
    contents=[prompt, json.dumps(items, ensure_ascii=False)],
    config=types.GenerateContentConfig(response_mime_type="application/json")
)

parsed = json.loads(resp.text)
print("Total classificados:", len(parsed))

with open("scripts/cederj_subtopicos.json", "w", encoding="utf-8") as f:
    json.dump(parsed, f, ensure_ascii=False, indent=2)

sql_statements = []
for p in parsed:
    qid = p["id"]
    sub = (p.get("subtopico") or "").replace("'", "''")
    dif = p.get("dificuldade")
    sql_statements.append(f"UPDATE questoes SET subtopico = '{sub}', dificuldade = {dif} WHERE id = {qid};")

with open("scripts/update_cederj_subtopicos.sql", "w", encoding="utf-8") as f:
    f.write("\n".join(sql_statements))

print("SQL gerado em scripts/update_cederj_subtopicos.sql")
