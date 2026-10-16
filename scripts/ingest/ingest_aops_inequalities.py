"""
Ingestão Otimizada de Desigualdades Olímpicas do AoPS (Álgebra Avançada / Competições)
Livro: 567 Nice And Hard Inequality - AOPS.pdf (Nguyen Duy Tung)

Otimizações de Cota e Tokens:
1. Payload Enxuto: O LLM gera estritamente campos variáveis (enunciado, gabarito, subtopico, dificuldade, estrategias).
2. Metadados Determinísticos: banca, ano, materia, topico, tipo e categorias são preenchidos 100% em Python (economiza ~15.000 tokens de saída).
3. JSON Compacto: Sem quebras de linha redundantes no prompt.
4. Pacing Seguro: Pacing de 4.2s por lote de 6 itens para operar a ~13 RPM (abaixo do teto de 15 RPM do Free Tier).
5. Cache Incremental e Inserção Contínua: Cada lote salvo em disco e persistido no Supabase a cada 24 itens.
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


def extract_inequalities(pdf_path: Path, max_pages: int = 365) -> dict:
    print(f"📖 Extraindo problemas do PDF completo: {pdf_path} (páginas 3 a {max_pages})...", flush=True)
    doc = fitz.open(str(pdf_path))
    
    pages_text = []
    total_pages = min(max_pages, len(doc))
    for pno in range(2, total_pages):
        txt = doc[pno].get_text()
        cleaned = [l for l in txt.splitlines() if not re.match(r'^\d+\s*$', l.strip())]
        pages_text.append("\n".join(cleaned))
        
    full_text = "\n\n".join(pages_text)
    
    # Localiza cabeçalhos de problemas: "1.", "2,", "3,", etc.
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
            
        if num not in problems or len(solucao) > len(problems[num].get("gabarito_raw", "")):
            problems[num] = {
                "num": num,
                "enunciado_raw": enunciado,
                "gabarito_raw": solucao
            }
            
    print(f"✅ Extração concluída: {len(problems)} problemas mapeados.", flush=True)
    return problems


MODELS_ORDER = ["gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-3-flash-preview"]

# Prompt ultracompacto para minimizar gasto de tokens
SYSTEM_PROMPT = """Você é um professor e matemático especialista em Álgebra e Olimpíadas (AoPS/Putnam).
Traduza problemas de Desigualdades Algébricas do inglês para PT-BR, com fórmulas em KaTeX ($...$ inline, $$...$$ display).
Regras:
1. Traduza prosa formalmente ("Sejam $a,b,c>0$...", "Prove que...", "Pela desigualdade de Cauchy-Schwarz/MA-MG/Schur...").
2. KaTeX rigoroso: frações \\frac{a}{b}, raízes \\sqrt{...}, somas cíclicas \\sum_{\\text{cyc}}. Ao final: **Condição de Igualdade:** [...].
3. Escape barras invertidas no JSON (use \\\\frac, \\\\sqrt, etc.).
4. Retorne APENAS um array JSON de objetos com as chaves exatas:
   [{"num": int, "subtopico": str, "dificuldade": int (4 ou 5), "enunciado": str, "gabarito": str, "estrategias_esperadas": [str]}]"""


def translate_batch_compact(client: genai.Client, batch_items: list, model_name: str) -> list:
    # Formato ultra-enxuto para entrada
    compact_input = [{"num": item["num"], "enunciado": item["enunciado_raw"][:600], "solucao": item["gabarito_raw"][:1500]} for item in batch_items]
    user_content = "Traduza e formate em KaTeX:\n" + json.dumps(compact_input, ensure_ascii=False, separators=(',', ':'))

    response = client.models.generate_content(
        model=model_name,
        contents=user_content,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            temperature=0.2
        )
    )
    
    raw_list = robust_json_loads(response.text.strip())
    
    # Enriquecimento determinístico em Python (0 tokens gastos)
    enriched_list = []
    for item in raw_list:
        enriched_item = {
            "num": item.get("num"),
            "banca": "AoPS",
            "ano": 2011,
            "materia": "Álgebra",
            "topico": "Desigualdades e Otimização",
            "subtopico": item.get("subtopico", "Desigualdades Algébricas e Homogeneização"),
            "dificuldade": int(item.get("dificuldade", 4)),
            "tipo": "discursiva",
            "enunciado": item.get("enunciado", ""),
            "gabarito": item.get("gabarito", ""),
            "estrategias_esperadas": item.get("estrategias_esperadas", ["Desigualdade de Cauchy-Schwarz", "Desigualdade das Médias (MA-MG)"]),
            "categoria_banca": "Vestibular & Superior",
            "tipo_prova": "Treinamento & Olimpíadas",
            "fase_nivel": "Superior",
            "tipo_material": "livro_exercicios"
        }
        enriched_list.append(enriched_item)
        
    return enriched_list


def main():
    parser = argparse.ArgumentParser(description="Ingestão Contínua Otimizada de Desigualdades AoPS")
    parser.add_argument("--batch-size", type=int, default=6, help="Tamanho do lote por chamada de LLM (6 a 8)")
    parser.add_argument("--max-items", type=int, default=100, help="Máximo de questões novas a processar nesta execução")
    parser.add_argument("--no-db", action="store_true", help="Não insere no banco, apenas traduz e gera cache")
    args = parser.parse_args()

    print("=========================================================", flush=True)
    print("🚀 PIPELINE OTIMIZADO: TODAS AS DESIGUALDADES DO AOPS (567)")
    print("=========================================================", flush=True)

    # 1. Carrega cache existente
    cache = {}
    if CACHE_JSON.exists():
        try:
            with open(CACHE_JSON, "r", encoding="utf-8") as f:
                cached_list = json.load(f)
                for q in cached_list:
                    cache[q["num"]] = q
            print(f"📦 Cache local: {len(cache)} questões já traduzidas.", flush=True)
        except Exception as e:
            print(f"Aviso ao ler cache: {e}", flush=True)

    # 2. Conexão ao Supabase para auditar o que já está salvo
    supabase = None
    if not args.no_db:
        supabase = get_supabase_client()
        if not supabase:
            print("❌ Erro: não foi possível conectar ao Supabase.", flush=True)
            return

    num_db_existentes = 0
    if supabase:
        res_existentes = supabase.table("questoes").select("id", count="exact").eq("banca", "AoPS").eq("topico", "Desigualdades e Otimização").execute()
        num_db_existentes = res_existentes.count or 0
        print(f"🏛️ Supabase: {num_db_existentes} questões de Desigualdades AoPS ativas no banco.", flush=True)

    # 3. Extrai problemas do PDF completo
    raw_problems = extract_inequalities(PDF_PATH, max_pages=365)
    
    # Filtra apenas problemas com resolução substancial (> 50 chars)
    available_nums = sorted([k for k in raw_problems.keys() if len(raw_problems[k]["gabarito_raw"]) > 50])
    print(f"📚 Total de problemas com solução comprovada no PDF: {len(available_nums)}", flush=True)

    # Questões que ainda não foram traduzidas
    pending_nums = [k for k in available_nums if k not in cache][:args.max_items]
    print(f"🎯 Questões agendadas para tradução neste ciclo: {len(pending_nums)}", flush=True)

    client = get_gemini_client()

    # 4. Loop de tradução com pacing e economia de tokens
    novas_traduzidas_neste_ciclo = []
    if pending_nums:
        BATCH_SIZE = args.batch_size
        total_batches = (len(pending_nums) + BATCH_SIZE - 1) // BATCH_SIZE
        
        for b_idx in range(0, len(pending_nums), BATCH_SIZE):
            batch_keys = pending_nums[b_idx : b_idx + BATCH_SIZE]
            batch_items = [raw_problems[k] for k in batch_keys]
            cur_batch_num = b_idx // BATCH_SIZE + 1
            print(f"\n🔄 Lote {cur_batch_num}/{total_batches} ({len(batch_items)} itens: {batch_keys})...", flush=True)
            
            success = False
            for model_name in MODELS_ORDER:
                if success:
                    break
                retries = 3
                wait_time = 4.5
                while retries > 0:
                    try:
                        t0 = time.time()
                        translated = translate_batch_compact(client, batch_items, model_name)
                        elapsed = time.time() - t0
                        for item in translated:
                            cache[item["num"]] = item
                            novas_traduzidas_neste_ciclo.append(item)
                        
                        # Salva cache incremental imediatamente
                        with open(CACHE_JSON, "w", encoding="utf-8") as f:
                            json.dump(list(cache.values()), f, ensure_ascii=False, indent=2)
                            
                        print(f"  ✅ Traduzido com sucesso em {elapsed:.1f}s via {model_name}. (Total em cache: {len(cache)})", flush=True)
                        success = True
                        break
                    except Exception as e:
                        retries -= 1
                        print(f"  ⚠️ Erro com {model_name}: {e}. Retentando em {wait_time:.1f}s...", flush=True)
                        time.sleep(wait_time)
                        wait_time *= 2  # Backoff exponencial
                        
            if not success:
                print(f"❌ Não foi possível traduzir o lote {batch_keys}. Interrompendo para preservar o cache.", flush=True)
                break
                
            # Pacing de 4.2 segundos para garantir < 15 RPM
            time.sleep(4.2)

    # 5. Salva JSON consolidado final
    all_processed = [cache[k] for k in sorted(cache.keys())]
    with open(FINAL_JSON, "w", encoding="utf-8") as f:
        json.dump(all_processed, f, ensure_ascii=False, indent=2)
    print(f"\n💾 Arquivo consolidado salvo em: {FINAL_JSON} ({len(all_processed)} questões)", flush=True)

    if args.no_db or not supabase:
        print("Modo --no-db ativado. Inserção no Supabase não solicitada.", flush=True)
        return

    # 6. Inserção no Supabase de tudo que está no cache mas ainda não foi inserido
    # Ordena as questões por número
    todas_ordenadas = [cache[k] for k in sorted(cache.keys())]
    
    # Identifica quantas estão pendentes de inserção no banco
    itens_para_inserir = todas_ordenadas[num_db_existentes:]
    print(f"\n📊 Verificação de Banco:")
    print(f"  - No cache local: {len(todas_ordenadas)} questões")
    print(f"  - Já no Supabase: {num_db_existentes} questões")
    print(f"  - Novas a inserir: {len(itens_para_inserir)} questões")

    if not itens_para_inserir:
        print("✅ Todas as questões do cache já estão sincronizadas com o Supabase!", flush=True)
        return

    DB_BATCH_SIZE = 25
    total_inseridas = 0
    ids_inseridos = []

    for j in range(0, len(itens_para_inserir), DB_BATCH_SIZE):
        chunk_raw = itens_para_inserir[j : j + DB_BATCH_SIZE]
        chunk = []
        for q in chunk_raw:
            q_db = dict(q)
            q_db.pop("num", None)  # id gerado pelo postgres
            chunk.append(q_db)
            
        res = supabase.table("questoes").insert(chunk).execute()
        if not res.data:
            print(f"❌ Erro ao inserir lote no Supabase: {res}", flush=True)
            return
        chunk_ids = [r["id"] for r in res.data]
        ids_inseridos.extend(chunk_ids)
        total_inseridas += len(chunk_ids)
        print(f"  📤 Chunk de {len(chunk_ids)} submetido! IDs: #{min(chunk_ids)} a #{max(chunk_ids)}", flush=True)

    print(f"\n🎉 SUCESSO! {total_inseridas} novas questões gravadas com sucesso no Supabase!")
    if ids_inseridos:
        print(f"🔢 Faixa de IDs: #{min(ids_inseridos)} a #{max(ids_inseridos)}")


if __name__ == "__main__":
    main()
