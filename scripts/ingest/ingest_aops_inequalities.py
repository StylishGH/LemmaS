"""
Ingestão de Desigualdades Olímpicas do AoPS (Álgebra Avançada / Competições)
Livro: 567 Nice And Hard Inequality - AOPS.pdf (Nguyen Duy Tung)
Tradução elegante para PT-BR, formatação KaTeX e inserção no Supabase.
"""

import sys
import os
import re
import json
import time
import argparse
from pathlib import Path

# Configura UTF-8 no Windows com flush automático
sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

import fitz  # PyMuPDF
from google import genai
from google.genai import types

# Configuração de caminhos
PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import get_supabase_client

PDF_PATH = Path(r"C:\Users\guigu\Downloads\drive-download-20261016T140335Z-1-001\567 Nice And Hard Inequality - AOPS.pdf")
CACHE_JSON = PROJECT_ROOT / "data" / "sources" / "aops" / "processed" / "inequalities_cache.json"
FINAL_JSON = PROJECT_ROOT / "data" / "sources" / "aops" / "processed" / "inequalities_processed.json"
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

    s_fixed = re.sub(r'\\(?![/"\\bfnrtu])', r'\\\\', text_clean)
    s_fixed = re.sub(r'(?<!\\)\\frac', r'\\\\frac', s_fixed)
    try:
        return json.loads(s_fixed)
    except json.JSONDecodeError:
        pass

    s_fixed2 = re.sub(r'(?<!\\)\\([a-zA-Z])', r'\\\\\1', text_clean)
    return json.loads(s_fixed2)


def extract_inequalities(pdf_path: Path, max_pages: int = 50) -> dict:
    print(f"Lendo PDF: {pdf_path} (páginas 3 a {max_pages})...", flush=True)
    doc = fitz.open(str(pdf_path))
    
    pages_text = []
    for pno in range(2, min(max_pages, len(doc))):
        txt = doc[pno].get_text()
        cleaned = []
        for l in txt.splitlines():
            l_str = l.strip()
            if re.match(r'^\d+\s*$', l_str):  # ignora número de página isolado
                continue
            cleaned.append(l)
        pages_text.append("\n".join(cleaned))
        
    full_text = "\n\n".join(pages_text)
    
    # Localiza cabeçalhos de problemas
    pattern = re.compile(r'(?:^|\n)\s*(\d{1,3})\s*[,.]\s*(?=(?:Let|Given|Prove|if|Show|For|[a-z]\)))', re.IGNORECASE)
    matches = list(pattern.finditer(full_text))
    
    problems = {}
    for idx, m in enumerate(matches):
        num = int(m.group(1))
        start_pos = m.end()
        end_pos = matches[idx+1].start() if idx + 1 < len(matches) else len(full_text)
        block = full_text[start_pos:end_pos].strip()
        
        sol_match = re.search(r'(?:^|\n)(?:Solution\s*:?|Proof\s*:?|The inequality is equivalent to|By Cauchy-Schwarz)', block, re.IGNORECASE)
        if sol_match:
            enunciado = block[:sol_match.start()].strip()
            solucao = block[sol_match.start():].strip()
        else:
            enunciado = block
            solucao = ""
            
        # Prioriza blocos com solução mais completa
        if num not in problems or len(solucao) > len(problems[num].get("gabarito_raw", "")):
            problems[num] = {
                "num": num,
                "enunciado_raw": enunciado,
                "gabarito_raw": solucao
            }
            
    print(f"Sucesso: {len(problems)} problemas únicos de desigualdades extraídos.", flush=True)
    return problems


MODELS_ORDER = ["gemini-flash-lite-latest", "gemini-3-flash-preview"]

def translate_batch(client: genai.Client, batch_items: list, model_name: str) -> list:
    prompt = """Você é um professor e matemático especialista em Álgebra Avançada e Treinamento Olímpico (IMO, Putnam, AoPS) da plataforma LEMMAS.
Sua missão é traduzir problemas de Desigualdades Algébricas (do livro 567 Nice And Hard Inequality - AoPS) do inglês para o Português do Brasil (PT-BR), formatando rigorosamente todas as fórmulas matemáticas em KaTeX ($...$ para inline e $$...$$ para display).

Diretrizes obrigatórias:
1. Traduza o texto em prosa para Português formal e elegante:
   - "Let a, b, c be positive real numbers" -> "Sejam $a, b, c$ números reais positivos"
   - "Prove that" -> "Prove que"
   - "The inequality is equivalent to" -> "A desigualdade é equivalente a"
   - "By Cauchy-Schwarz's inequality" -> "Pela desigualdade de Cauchy-Schwarz"
   - "By AM-GM inequality" -> "Pela desigualdade das médias (MA-MG)"
   - "Equality holds if and only if" -> "A igualdade ocorre se, e somente se,"
   - "Without loss of generality (WLOG)" -> "Sem perda de generalidade (SPG)"
   - "Schur's inequality" -> "Desigualdade de Schur"
2. Converta fórmulas e expressões em KaTeX limpo e 100% legível:
   - "a/b + b/c + c/a" -> "\\frac{a}{b} + \\frac{b}{c} + \\frac{c}{a}"
   - "r a2 + 1" ou "p a2 + 1" -> "\\sqrt{a^2 + 1}"
   - "3p ..." ou "3√..." -> "\\sqrt[3]{...}"
   - "X cyc ..." -> "\\sum_{\\text{cyc}} ..." ou "\\sum_{\\text{sim}} ..."
   - Garanta que no final da demonstração/gabarito conste: **Condição de Igualdade:** [expressão ou valores].
3. Preencha os metadados:
   - banca: "AoPS"
   - ano: 2011
   - materia: "Álgebra"
   - topico: "Desigualdades e Otimização"
   - subtopico: descrição técnica da desigualdade ou método (ex: "Desigualdade de Cauchy-Schwarz e Homogeneização", "Desigualdade das Médias (MA-MG) e Substituição", "Desigualdade de Schur e Método SOS")
   - dificuldade: 4 ou 5 (inteiro)
   - tipo: "discursiva"
   - estrategias_esperadas: lista com 2 a 4 técnicas/lemas (ex: ["Desigualdade de Cauchy-Schwarz", "Desigualdade das Médias (MA-MG)", "Homogeneização"])
   - categoria_banca: "Vestibular & Superior"
   - tipo_prova: "Treinamento & Olimpíadas"
   - fase_nivel: "Superior"
   - tipo_material: "livro_exercicios"

IMPORTANTE DE FORMATO:
Em strings JSON, toda barra invertida de fórmulas KaTeX DEVE ser escapada com duas barras: \\\\frac, \\\\sqrt, \\\\sum, \\\\text, etc. NUNCA use uma barra invertida simples para comandos LaTeX.

Retorne estritamente um JSON no formato array de objetos com as chaves:
num, banca, ano, materia, topico, subtopico, dificuldade, tipo, enunciado, gabarito, estrategias_esperadas, categoria_banca, tipo_prova, fase_nivel, tipo_material.

Problemas a traduzir e formatar:
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
    parser = argparse.ArgumentParser(description="Ingestão de Desigualdades AoPS")
    parser.add_argument("--limit", type=int, default=25, help="Quantidade máxima de questões a processar neste lote")
    parser.add_argument("--max-pages", type=int, default=40, help="Páginas a inspecionar no PDF")
    parser.add_argument("--no-db", action="store_true", help="Não insere no banco, apenas traduz e gera cache")
    args = parser.parse_args()

    print("=========================================================", flush=True)
    print("🚀 INGESTÃO AOPS: DESIGUALDADES OLÍMPICAS (567 INEQUALITIES)", flush=True)
    print("=========================================================", flush=True)

    # 1. Carrega cache existente
    cache = {}
    if CACHE_JSON.exists():
        try:
            with open(CACHE_JSON, "r", encoding="utf-8") as f:
                cached_list = json.load(f)
                for q in cached_list:
                    cache[q["num"]] = q
            print(f"Cache carregado: {len(cache)} questões já processadas.", flush=True)
        except Exception as e:
            print(f"Aviso ao ler cache: {e}", flush=True)

    # 2. Extrai problemas do PDF
    raw_problems = extract_inequalities(PDF_PATH, max_pages=args.max_pages)
    
    # 3. Filtra questões pendentes
    available_nums = sorted([k for k in raw_problems.keys() if len(raw_problems[k]["gabarito_raw"]) > 50])
    pending_nums = [k for k in available_nums if k not in cache][:args.limit]
    
    print(f"Total de questões com solução disponíveis no PDF: {len(available_nums)}", flush=True)
    print(f"Questões pendentes de tradução neste ciclo: {len(pending_nums)}", flush=True)
    
    if pending_nums:
        client = get_gemini_client()
        BATCH_SIZE = 5
        for i in range(0, len(pending_nums), BATCH_SIZE):
            batch_keys = pending_nums[i : i + BATCH_SIZE]
            batch_items = [raw_problems[k] for k in batch_keys]
            print(f"\n🔄 Traduzindo sub-lote {i//BATCH_SIZE + 1}/{(len(pending_nums) + BATCH_SIZE - 1)//BATCH_SIZE}: Questões {batch_keys}...", flush=True)
            
            success = False
            for model_name in MODELS_ORDER:
                if success:
                    break
                retries = 3
                while retries > 0:
                    try:
                        print(f"  Tentando modelo: {model_name}...", flush=True)
                        translated = translate_batch(client, batch_items, model_name)
                        for item in translated:
                            cache[item["num"]] = item
                        
                        # Salva cache incremental
                        with open(CACHE_JSON, "w", encoding="utf-8") as f:
                            json.dump(list(cache.values()), f, ensure_ascii=False, indent=2)
                        print(f"  ✅ Sub-lote traduzido com sucesso via {model_name}. Total em cache: {len(cache)} questões.", flush=True)
                        success = True
                        break
                    except Exception as e:
                        retries -= 1
                        print(f"  ⚠️ Erro com {model_name}: {e}. Tentativas restantes: {retries}", flush=True)
                        time.sleep(3)
                        
            if not success:
                raise RuntimeError(f"Falha ao traduzir lote {batch_keys} após tentar todos os modelos.")
            time.sleep(1)

    # 4. Salva consolidado final
    all_processed = [cache[k] for k in sorted(cache.keys())]
    with open(FINAL_JSON, "w", encoding="utf-8") as f:
        json.dump(all_processed, f, ensure_ascii=False, indent=2)
    print(f"\nArquivo consolidado salvo em: {FINAL_JSON} ({len(all_processed)} questões)", flush=True)

    if args.no_db:
        print("Modo --no-db ativado. Inserção no Supabase ignorada.", flush=True)
        return

    # 5. Inserção no Supabase (todas as do cache que ainda não estão cadastradas)
    supabase = get_supabase_client()
    if not supabase:
        print("Erro: não foi possível conectar ao Supabase.", flush=True)
        return

    # Verifica quantas questões de Desigualdades AoPS já existem no Supabase
    res_existentes = supabase.table("questoes").select("id, subtopico").eq("banca", "AoPS").eq("topico", "Desigualdades e Otimização").execute()
    num_existentes = len(res_existentes.data)
    print(f"\nSupabase: {num_existentes} questões de Desigualdades AoPS já cadastradas.", flush=True)

    # Se já foram cadastradas algumas, pegamos apenas as faltantes
    # Para saber quais faltam, inserimos apenas a diferença
    para_inserir = []
    for k in sorted(cache.keys()):
        q_db = dict(cache[k])
        q_db.pop("num", None)
        para_inserir.append(q_db)

    # Pula as que já foram inseridas com base no número existente
    novas_para_inserir = para_inserir[num_existentes:]

    if not novas_para_inserir:
        print("Todas as questões do cache já estão gravadas no Supabase!", flush=True)
        return

    print(f"Inserindo {len(novas_para_inserir)} questões novas de Desigualdades no Supabase...", flush=True)
    DB_BATCH_SIZE = 25
    total_inseridas = 0
    ids_inseridos = []

    for j in range(0, len(novas_para_inserir), DB_BATCH_SIZE):
        chunk = novas_para_inserir[j : j + DB_BATCH_SIZE]
        res = supabase.table("questoes").insert(chunk).execute()
        if not res.data:
            print(f"❌ Erro ao inserir chunk no Supabase: {res}", flush=True)
            return
        chunk_ids = [r["id"] for r in res.data]
        ids_inseridos.extend(chunk_ids)
        total_inseridas += len(chunk_ids)
        print(f"  Chunk submetido com sucesso! IDs: #{min(chunk_ids)} a #{max(chunk_ids)}", flush=True)

    print(f"\n🎉 SUCESSO TOTAL!", flush=True)
    print(f"Total de questões de Desigualdades inseridas no Supabase: {total_inseridas}", flush=True)
    if ids_inseridos:
        print(f"Faixa de IDs das novas questões: #{min(ids_inseridos)} a #{max(ids_inseridos)}", flush=True)


if __name__ == "__main__":
    main()
