"""
Ingestão Completa: 100 Questões de Limites (Cálculo) do AoPS
Traduzidas rigorosamente para PT-BR com KaTeX e inseridas no Supabase.
Origem: A Collection of Limits - AOPS.pdf
"""

import sys
import os
import re
import json
import time
from pathlib import Path

# Configura UTF-8 no Windows
sys.stdout.reconfigure(encoding='utf-8')

import fitz  # PyMuPDF
from google import genai
from google.genai import types

# Configuração de caminhos
PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import get_supabase_client

PDF_PATH = Path(r"C:\Users\guigu\Downloads\drive-download-20261016T140335Z-1-001\A Collection of Limits - AOPS.pdf")
PILOTO_JSON = PROJECT_ROOT / "data" / "sources" / "aops" / "processed" / "limits_piloto_10.json"
CACHE_JSON = PROJECT_ROOT / "data" / "sources" / "aops" / "processed" / "limits_full_cache.json"
FINAL_JSON = PROJECT_ROOT / "data" / "sources" / "aops" / "processed" / "limits_full_100.json"
CACHE_JSON.parent.mkdir(parents=True, exist_ok=True)


def get_gemini_client():
    env_path = PROJECT_ROOT / "frontend" / ".env.local"
    gemini_key = None
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if line.startswith("GEMINI_API_KEY="):
                gemini_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                break
    if not gemini_key:
        gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        raise ValueError("GEMINI_API_KEY não encontrada em frontend/.env.local ou variáveis de ambiente.")
    return genai.Client(api_key=gemini_key)


def robust_json_loads(text: str):
    """
    Decodifica JSON com tolerância a barras invertidas de KaTeX/LaTeX escapadas de forma incompleta.
    """
    text_clean = text.strip()
    if text_clean.startswith("```json"):
        text_clean = text_clean[7:]
    if text_clean.startswith("```"):
        text_clean = text_clean[3:]
    if text_clean.endswith("```"):
        text_clean = text_clean[:-3]
    text_clean = text_clean.strip()

    try:
        return json.loads(text_clean)
    except json.JSONDecodeError:
        pass

    # Corrige \frac, \formfeed, etc.
    s_fixed = re.sub(r'\\(?![/"\\bfnrtu])', r'\\\\', text_clean)
    s_fixed = re.sub(r'(?<!\\)\\frac', r'\\\\frac', s_fixed)
    try:
        return json.loads(s_fixed)
    except json.JSONDecodeError:
        pass

    # Corrige qualquer barra simples antes de letra
    s_fixed2 = re.sub(r'(?<!\\)\\([a-zA-Z])', r'\\\\\1', text_clean)
    return json.loads(s_fixed2)


def parse_pdf_problems(pdf_path: Path) -> dict:
    print(f"Abrindo PDF: {pdf_path}")
    doc = fitz.open(str(pdf_path))
    
    pages_text = []
    for pno in range(24, len(doc)):
        text = doc[pno].get_text()
        cleaned_lines = []
        for line in text.splitlines():
            l = line.strip()
            if l in ["Chapter 3", "Solutions", "A Collection of Limits"] or re.match(r'^(Solutions|\d+|A Collection of Limits)\s*$', l):
                continue
            cleaned_lines.append(line)
        pages_text.append("\n".join(cleaned_lines))
    
    full_text = "\n\n".join(pages_text)
    
    problems = {}
    pos = 0
    for k in range(1, 101):
        pat = re.compile(rf'(?:^|\n){k}\.\s+', re.MULTILINE)
        found_match = None
        for m in pat.finditer(full_text, pos):
            following = full_text[m.end():m.end()+1500]
            if re.search(r'(?:First\s+solution|Solution|Proof):', following, re.IGNORECASE):
                found_match = m
                break
                
        if not found_match:
            raise RuntimeError(f"Erro ao localizar Questão {k} a partir da posição {pos}")
            
        prob_start = found_match.end()
        
        sol_match = re.search(r'(?:^|\n)(?:First\s+solution|Solution|Proof):', full_text[prob_start:prob_start+2000], re.IGNORECASE)
        if not sol_match:
            sol_match = re.search(r'(?:First\s+solution|Solution|Proof):', full_text[prob_start:prob_start+2000], re.IGNORECASE)
        if not sol_match:
            raise RuntimeError(f"Erro ao localizar início da solução para Questão {k}")
            
        enunciado_raw = full_text[prob_start : prob_start + sol_match.start()].strip()
        sol_start = prob_start + sol_match.end()
        
        if k < 100:
            next_pat = re.compile(rf'(?:^|\n){k+1}\.\s+', re.MULTILINE)
            next_match = None
            for nm in next_pat.finditer(full_text, sol_start):
                following = full_text[nm.end():nm.end()+1500]
                if re.search(r'(?:First\s+solution|Solution|Proof):', following, re.IGNORECASE):
                    next_match = nm
                    break
            if not next_match:
                raise RuntimeError(f"Erro ao localizar fronteira para Questão {k+1}")
            gabarito_raw = full_text[sol_start : next_match.start()].strip()
            pos = next_match.start()
        else:
            gabarito_raw = full_text[sol_start:].strip()
            
        problems[k] = {
            "num": k,
            "enunciado_raw": enunciado_raw,
            "gabarito_raw": gabarito_raw
        }
        
    print(f"Sucesso: 100/100 questões e soluções extraídas do PDF.")
    return problems


MODELS_ORDER = ["gemini-flash-lite-latest", "gemini-3-flash-preview"]

def translate_batch(client: genai.Client, batch_items: list, model_name: str) -> list:
    prompt = """Você é um matemático especialista e professor universitário de Cálculo e Análise Real da plataforma LEMMAS.
Sua missão é traduzir problemas de Cálculo Avançado / Olimpíadas (AoPS - A Collection of Limits) do inglês para o Português do Brasil (PT-BR), formatando rigorosamente todas as fórmulas matemáticas em KaTeX ($...$ para inline e $$...$$ para display).

Diretrizes obrigatórias:
1. Traduza o texto em prosa para Português formal, elegante e didático.
   - "Evaluate" -> "Calcule" ou "Determine"
   - "Prove that" -> "Prove que"
   - "Consider the sequence" -> "Considere a sequência"
   - "Squeeze Theorem" -> "Teorema do Confronto (Sanduíche)"
   - "Cesaro-Stolz lemma" -> "Lema de Cesàro-Stolz"
   - "Cauchy-Schwarz inequality" -> "Desigualdade de Cauchy-Schwarz"
   - "Ratio test" -> "Critério da Razão (D'Alembert)"
2. Converta símbolos e fórmulas matemáticas extraídas do PDF em KaTeX limpo e 100% legível:
   - Radicais: "3p ..." ou "3√..." -> \\sqrt[3]{...}, "p ..." ou "√..." -> \\sqrt{...}
   - Limites: \\lim_{n \\to \\infty} ou \\lim_{x \\to a}
   - Frações com \\frac{numerador}{denominador}
   - Somatórios e produtórios com \\sum e \\prod
   - Garanta que no final do gabarito conste explicitamente: **Resposta Final:** [expressão/valor].
3. Preencha os metadados:
   - banca: "AoPS"
   - ano: 2011
   - materia: "Cálculo"
   - topico: "Limites e Continuidade" ou "Sequências e Séries"
   - subtopico: descrição concisa do método ou tipo de indeterminação (ex: "Lema de Cesàro-Stolz e Médias", "Indeterminação 1^infinito", "Equivalências Assintóticas")
   - dificuldade: 3 ou 4 (inteiro)
   - tipo: "discursiva"
   - estrategias_esperadas: lista com 2 a 4 técnicas/teoremas (ex: ["Lema de Cesàro-Stolz", "Soma de Riemann"])
   - categoria_banca: "Vestibular & Superior"
   - tipo_prova: "Treinamento & Olimpíadas"
   - fase_nivel: "Superior"
   - tipo_material: "livro_exercicios"

IMPORTANTE DE FORMATO:
Você está gerando um JSON válido. Em strings JSON, toda barra invertida de fórmulas KaTeX DEVE ser escapada com duas barras: \\\\lim, \\\\frac, \\\\sqrt, \\\\to, \\\\sum, etc. NUNCA coloque uma única barra invertida para comandos LaTeX.

Retorne estritamente um JSON no formato array de objetos com as chaves:
num, banca, ano, materia, topico, subtopico, dificuldade, tipo, enunciado, gabarito, estrategias_esperadas, categoria_banca, tipo_prova, fase_nivel, tipo_material.

Questões a traduzir e formatar:
""" + json.dumps(batch_items, ensure_ascii=False, indent=2)

    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json"
        )
    )
    
    text = response.text.strip()
    return robust_json_loads(text)


def main():
    print("=========================================================")
    print("🚀 INGESTÃO COMPLETA: 100 QUESTÕES DE LIMITES - AOPS")
    print("=========================================================")
    
    # 1. Carrega piloto já aprovado (1..10)
    piloto = []
    if PILOTO_JSON.exists():
        with open(PILOTO_JSON, "r", encoding="utf-8") as f:
            piloto = json.load(f)
        print(f"Lote Piloto carregado: {len(piloto)} questões (1 a 10).")
    else:
        print("Aviso: Lote Piloto não encontrado.")

    # 2. Carrega cache existente
    cache = {}
    if CACHE_JSON.exists():
        with open(CACHE_JSON, "r", encoding="utf-8") as f:
            cached_list = json.load(f)
            for q in cached_list:
                cache[q["num"]] = q
        print(f"Cache existente carregado: {len(cache)} questões já traduzidas.")

    # 3. Extrai problemas do PDF
    raw_problems = parse_pdf_problems(PDF_PATH)
    
    # 4. Traduz questões faltantes (11 a 100)
    client = get_gemini_client()
    missing_nums = [k for k in range(11, 101) if k not in cache]
    print(f"Questões pendentes de tradução (11..100): {len(missing_nums)}")
    
    BATCH_SIZE = 10
    for i in range(0, len(missing_nums), BATCH_SIZE):
        batch_keys = missing_nums[i : i + BATCH_SIZE]
        batch_items = [raw_problems[k] for k in batch_keys]
        print(f"\n🔄 Traduzindo lote {i//BATCH_SIZE + 1}/{(len(missing_nums) + BATCH_SIZE - 1)//BATCH_SIZE}: Questões {batch_keys[0]} a {batch_keys[-1]}...")
        
        success = False
        for model_name in MODELS_ORDER:
            if success:
                break
            retries = 3
            while retries > 0:
                try:
                    print(f"  Tentando modelo: {model_name}...")
                    translated = translate_batch(client, batch_items, model_name)
                    for item in translated:
                        cache[item["num"]] = item
                    
                    # Salva cache incremental
                    with open(CACHE_JSON, "w", encoding="utf-8") as f:
                        json.dump(list(cache.values()), f, ensure_ascii=False, indent=2)
                    print(f"  ✅ Lote traduzido com sucesso via {model_name}. Total em cache: {len(cache)} questões.")
                    success = True
                    break
                except Exception as e:
                    retries -= 1
                    print(f"  ⚠️ Erro com {model_name}: {e}. Tentativas restantes: {retries}")
                    time.sleep(4)
                    
        if not success:
            raise RuntimeError(f"Falha ao traduzir lote {batch_keys} após tentar todos os modelos.")
        time.sleep(2)

    # 5. Monta dataset completo de 100 questões
    todas_100 = []
    for idx, q in enumerate(piloto, start=1):
        q_copy = dict(q)
        q_copy["num"] = idx
        todas_100.append(q_copy)
        
    for k in range(11, 101):
        if k in cache:
            todas_100.append(cache[k])
        else:
            raise RuntimeError(f"Questão {k} não encontrada em cache!")

    print(f"\nDataset completo compilado: {len(todas_100)}/100 questões.")
    with open(FINAL_JSON, "w", encoding="utf-8") as f:
        json.dump(todas_100, f, ensure_ascii=False, indent=2)
    print(f"Arquivo final salvo em: {FINAL_JSON}")

    # 6. Conecta ao Supabase e insere apenas as questões novas (11..100)
    supabase = get_supabase_client()
    if not supabase:
        print("Erro: não foi possível conectar ao Supabase.")
        return

    novas_para_inserir = []
    for q in todas_100:
        if q.get("num", 0) >= 11:
            q_db = dict(q)
            q_db.pop("num", None)
            novas_para_inserir.append(q_db)

    print(f"\nPreparando inserção de {len(novas_para_inserir)} questões novas no Supabase (Questões 11 a 100)...")

    DB_BATCH_SIZE = 25
    total_inseridas = 0
    primeiro_id = None
    ultimo_id = None
    
    for j in range(0, len(novas_para_inserir), DB_BATCH_SIZE):
        chunk = novas_para_inserir[j : j + DB_BATCH_SIZE]
        print(f"  Inserindo chunk {j//DB_BATCH_SIZE + 1}/{(len(novas_para_inserir) + DB_BATCH_SIZE - 1)//DB_BATCH_SIZE} ({len(chunk)} itens)...")
        res = supabase.table("questoes").insert(chunk).execute()
        if not res.data:
            print(f"❌ Erro ao inserir chunk no Supabase: {res}")
            return
        chunk_ids = [r["id"] for r in res.data]
        if primeiro_id is None:
            primeiro_id = min(chunk_ids)
        ultimo_id = max(chunk_ids)
        total_inseridas += len(chunk_ids)
        print(f"    Submetido! IDs: #{min(chunk_ids)} a #{max(chunk_ids)}")

    print(f"\n🎉 SUCESSO TOTAL!")
    print(f"Total de questões inseridas no Supabase: {total_inseridas}")
    print(f"Faixa de IDs das questões 11 a 100: #{primeiro_id} a #{ultimo_id}")
    print(f"Junto com o piloto (#22583 a #22592), toda a coleção de 100 Limites do AoPS está ativa no LemmaS!")


if __name__ == "__main__":
    main()
