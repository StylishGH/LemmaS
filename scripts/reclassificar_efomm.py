"""
Batch classification for all EFOMM questions in Supabase using gemini-flash-lite-latest.
Saves updates directly into Supabase via execute_sql or generates the SQL script.
"""
import os
import sys
import json
import time
from dotenv import load_dotenv
from google import genai
from google.genai import types
from supabase import create_client

load_dotenv("frontend/.env.local")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
GEMINI_KEY = os.getenv("GEMINI_API_KEY")

sb = create_client(SUPABASE_URL, SUPABASE_KEY)
client = genai.Client(api_key=GEMINI_KEY)

MODEL_ID = "gemini-flash-lite-latest"

PROMPT_CLASSIFICACAO = """
Você é um professor catedrático de Matemática e avaliador de bancas de concursos militares de alto nível (EFOMM, IME, ITA, Escola Naval, AFA, ESA).

Sua missão é classificar cada questão nas seguintes MATÉRIAS padronizadas (use ESTRITAMENTE um destes valores exatos para o campo "materia"):
- "Cálculo" (Limites, Derivadas, Integrais, Aplicações, Taxas Relacionadas, Volumes)
- "Álgebra Linear" (Matrizes, Determinantes, Sistemas Lineares, Espaços Vetoriais, Autovalores)
- "Geometria Analítica" (Retas, Planos, Circunferência no Plano, Cônicas: Elipse, Hipérbole, Parábola, Vetores)
- "Geometria Espacial" (Prismas, Pirâmides, Cilindros, Cones, Esferas, Poliedros, Posições Relativas)
- "Geometria Plana" (Triângulos, Circunferência Plana, Polígonos, Áreas de Figuras Planas)
- "Trigonometria" (Ciclo Trigonométrico, Identidades, Equações Trigonométricas, Relações Fundamentais)
- "Álgebra" (Funções Afim/Quadrática/Exponencial/Logarítmica/Modular, Inequações, Progressões PA/PG, Binômio)
- "Polinômios e Complexos" (Polinômios, Girard, Raízes, Fatoração, Números Complexos)
- "Probabilidade e Estatística" (Combinatória, Probabilidade Condicional, Distribuições, Estatística)
- "Matemática Financeira" (Juros Simples e Compostos, SAC, Tabela Price)

Para cada questão, retorne um objeto JSON contendo:
- "id": número do ID fornecido
- "materia": exatamente uma das 10 matérias padronizadas acima
- "topico": nome claro do tópico (ex: "Integrais", "Matrizes", "Cônicas", "Logaritmos", "Progressões", "Polinômios", "Números Complexos", "Probabilidade", "Trigonometria")
- "subtopico": detalhamento pedagógico conciso

Retorne APENAS o array JSON válido:
[
  {
    "id": 1234,
    "materia": "Cálculo",
    "topico": "Integrais",
    "subtopico": "Cálculo de Área entre Curvas"
  }
]
"""

def process_all_efomm():
    print("Buscando questões EFOMM no Supabase...")
    res = sb.table("questoes").select("id, ano, enunciado, materia, topico").eq("banca", "EFOMM").order("id").execute()
    questoes = res.data
    print(f"Total de questões EFOMM encontradas: {len(questoes)}")

    # Filtra apenas as que precisam de classificação (materia == 'Matemática')
    pendentes = [q for q in questoes if q.get("materia") == "Matemática"]
    print(f"Questões pendentes de classificação: {len(pendentes)}")

    if not pendentes:
        print("Todas as questões já estão classificadas!")
        return

    batch_size = 20
    classificacoes_totais = []

    for i in range(0, len(pendentes), batch_size):
        batch = pendentes[i : i + batch_size]
        print(f"\n--- Processando Lote {i // batch_size + 1}/{(len(pendentes) + batch_size - 1) // batch_size} ({len(batch)} questões) ---")

        batch_input = []
        for q in batch:
            linhas = [l for l in q["enunciado"].split("\n") if l.strip()][:5]
            resumo = " ".join(linhas)[:350]
            batch_input.append({
                "id": q["id"],
                "ano": q["ano"],
                "enunciado": resumo
            })

        sucesso = False
        tentativas = 0
        while not sucesso and tentativas < 3:
            try:
                tentativas += 1
                resp = client.models.generate_content(
                    model=MODEL_ID,
                    contents=[PROMPT_CLASSIFICACAO, json.dumps(batch_input, ensure_ascii=False)],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.1
                    )
                )
                resultado = json.loads(resp.text)
                classificacoes_totais.extend(resultado)
                print(f"  Sucesso: {len(resultado)} questões classificadas.")
                sucesso = True
            except Exception as e:
                print(f"  Erro na tentativa {tentativas}: {e}")
                time.sleep(3)

        time.sleep(1.5)  # Respeita o rate limit

    # Salva o arquivo JSON com os resultados
    output_json = "scripts/efomm_classificadas.json"
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(classificacoes_totais, f, ensure_ascii=False, indent=2)
    print(f"\nArquivo de classificação salvo em: {output_json} com {len(classificacoes_totais)} registros.")

    # Gera instruções SQL de update
    sql_statements = []
    for item in classificacoes_totais:
        qid = item["id"]
        materia = item["materia"].replace("'", "''")
        topico = item["topico"].replace("'", "''")
        subtopico = (item.get("subtopico") or "").replace("'", "''")
        sql_statements.append(
            f"UPDATE questoes SET materia = '{materia}', topico = '{topico}', subtopico = '{subtopico}' WHERE id = {qid};"
        )

    output_sql = "scripts/update_efomm_topics.sql"
    with open(output_sql, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_statements))
    print(f"Arquivo SQL gerado em: {output_sql} com {len(sql_statements)} statements.")

if __name__ == "__main__":
    process_all_efomm()
