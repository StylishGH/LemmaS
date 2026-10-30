#!/usr/bin/env python3
"""
Script de saneamento e formatação de LaTeX e tópicos para questões do CEDERJ no Supabase.

Corrige:
1. categoria_banca = 'Vestibular & Superior'
2. Enunciados e gabaritos convertidos para KaTeX/Markdown editorial perfeito ($...$ e $$...$$)
3. Remoção de artefatos de PDF (cabeçalhos, rodapés, nomes de módulos, lixo de fonte)
4. Reclassificação precisa de tópicos e subtópicos para Cálculo 3 e Álgebra Linear
"""

import os
import sys
import json
import time
import urllib.request
import urllib.error
from pathlib import Path
from supabase import create_client

ENV_PATH = Path(__file__).resolve().parent.parent.parent / "backend" / ".env"
if not ENV_PATH.exists():
    ENV_PATH = Path("backend/.env")

env = {}
if ENV_PATH.exists():
    with open(ENV_PATH) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k] = v.strip("\"'")
                os.environ.setdefault(k, env[k])

SUPABASE_URL = env.get("SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_KEY = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_KEY") or os.getenv("SUPABASE_KEY")
GEMINI_API_KEY = env.get("GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Erro: Credenciais do Supabase não encontradas.")
    sys.exit(1)

if not GEMINI_API_KEY:
    print("❌ Erro: GEMINI_API_KEY não encontrada.")
    sys.exit(1)

client = create_client(SUPABASE_URL, SUPABASE_KEY)
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key={GEMINI_API_KEY}"

BATCH_SIZE = 4


def formatar_lote_com_gemini(lote, materia_nome):
    sample = []
    for q in lote:
        enun = q.get("enunciado") or ""
        gab = q.get("gabarito") or ""
        # Limita gabarito para não estourar contexto
        sample.append({
            "id": q["id"],
            "raw_enunciado": enun[:1500],
            "raw_gabarito": gab[:2500] if gab else ""
        })

    prompt = f"""Você é um especialista em diagramação matemática de provas universitárias da UFF/CEDERJ ({materia_nome}).
Para cada item da lista JSON de entrada:
1. Recupere o 'enunciado' original formatado em KaTeX impecável ($...$ para fórmulas em linha e $$...$$ para expressões ou blocos em destaque).
2. Recupere o 'gabarito' (solução passo a passo) formatado em KaTeX limpo ($...$ e $$...$$). Se o gabarito original for curto (ex: letra 'A' ou valor numérico), preserve-o.
3. REMOVA completamente qualquer cabeçalho de prova, rodapé, número de página ou texto institucional (ex: 'CECIERJ', 'Consórcio CEDERJ', 'CÁLCULO III EP...', 'EP10 – C´ALCULO III', 'pág 139, módulo 1').
4. Corrija palavras cortadas pelo OCR (ex: 'funçãog' -> 'função $g$', 'funçãoz' -> 'função $z$', 'impl ícita' -> 'implícita', 'm ínimo' -> 'mínimo', 'sup erf ície' -> 'superfície', 'cont ínua' -> 'contínua').
5. Atribua o 'topico' e 'subtopico' matemáticos canônicos precisos de acordo com o conteúdo da questão.

Retorne EXCLUSIVAMENTE um array JSON no seguinte formato:
[
  {{
    "id": 123,
    "enunciado": "enunciado formatado em katex",
    "gabarito": "gabarito formatado em katex",
    "topico": "Nome do Tópico Canônico",
    "subtopico": "Subtópico Específico"
  }}
]

Entrada:
{json.dumps(sample, ensure_ascii=False)}"""

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json"
        }
    }

    max_retries = 3
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(
                GEMINI_URL,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=30) as res:
                data = json.loads(res.read().decode("utf-8"))
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(text)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                print(f"  [429 Rate Limit] Aguardando 10s para retry (tentativa {attempt+1}/{max_retries})...")
                time.sleep(10)
            else:
                print(f"  [HTTPError {e.code}] {e.reason}")
                time.sleep(3)
        except Exception as e:
            print(f"  [Erro Gemini]: {e}")
            time.sleep(3)

    return None


def main():
    print("🚀 Iniciando saneamento do acervo CEDERJ no Supabase...")

    # 1. Atualizar categoria_banca
    print("\n1. Atualizando categoria_banca para 'Vestibular & Superior' em todas as questões CEDERJ...")
    try:
        client.table("questoes").update({"categoria_banca": "Vestibular & Superior"}).eq("banca", "CEDERJ").execute()
        print("✅ categoria_banca atualizada com sucesso.")
    except Exception as e:
        print(f"❌ Erro ao atualizar categoria_banca: {e}")

    # 2. Buscar questões que necessitam de saneamento
    materias_alvo = ["Cálculo 3", "Álgebra Linear I", "Álgebra Linear II"]
    for mat in materias_alvo:
        print(f"\n" + "="*60)
        print(f"PROCESSANDO {mat.upper()}")
        print("="*60)

        # Buscar questões da matéria
        res = client.table("questoes").select("id, materia, topico, subtopico, enunciado, gabarito").eq("banca", "CEDERJ").eq("materia", mat).order("id").execute()
        questoes = res.data or []
        print(f"Total de questões encontradas: {len(questoes)}")

        saneadas = 0
        falhas = 0

        for i in range(0, len(questoes), BATCH_SIZE):
            lote = questoes[i:i+BATCH_SIZE]
            print(f"  Processando lote {i//BATCH_SIZE + 1}/{(len(questoes)+BATCH_SIZE-1)//BATCH_SIZE} (IDs: {[q['id'] for q in lote]})...")

            resultado = formatar_lote_com_gemini(lote, mat)
            if not resultado:
                print(f"  ⚠️ Falha ao processar lote {i//BATCH_SIZE + 1}, pulando...")
                falhas += len(lote)
                continue

            for item in resultado:
                q_id = item.get("id")
                novo_enun = item.get("enunciado")
                novo_gab = item.get("gabarito")
                novo_topico = item.get("topico")
                novo_subtopico = item.get("subtopico")

                if not q_id or not novo_enun:
                    continue

                update_payload = {
                    "enunciado": novo_enun,
                    "topico": novo_topico or "Geral",
                    "subtopico": novo_subtopico,
                    "categoria_banca": "Vestibular & Superior"
                }
                if novo_gab:
                    update_payload["gabarito"] = novo_gab

                try:
                    client.table("questoes").update(update_payload).eq("id", q_id).execute()
                    saneadas += 1
                except Exception as e:
                    print(f"    ❌ Falha ao atualizar questão {q_id}: {e}")
                    falhas += 1

            # Pausa para respeitar rate limits (15 RPM)
            time.sleep(3)

        print(f"\nFinalizado {mat}: {saneadas} saneadas, {falhas} falhas.")

    print("\n🎉 SANEAMENTO GERAL CONCLUÍDO COM SUCESSO!")


if __name__ == "__main__":
    main()
