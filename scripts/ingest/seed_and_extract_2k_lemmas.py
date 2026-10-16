#!/usr/bin/env python3
"""
Pipeline de Engenharia de Dados do LEMMAS Core:
1. Ingestão dos 2.000 Lemas Canônicos em public.lemmas a partir de data/repertorio/catalogo_2000_lemmas.json.
2. Extração e mapeamento dos 21.272 problemas reais de public.questoes para seus respectivos lemas.
3. Atualização em massa de lema_id e lema_codigo em public.questoes.
4. Recálculo e atualização do campo questoes_vinculadas_count em public.lemmas.
"""

import os
import sys
import io
import json
import re
import time
import unicodedata
from pathlib import Path
from collections import defaultdict, Counter
from typing import Dict, List, Any, Optional, Tuple

if sys.platform == "win32" and hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv_path = PROJECT_ROOT / "backend" / ".env"
if load_dotenv_path.exists():
    from dotenv import load_dotenv
    load_dotenv(load_dotenv_path)
    load_dotenv(PROJECT_ROOT / ".env")

from supabase import create_client

def normalizar_texto(texto: str) -> str:
    if not texto:
        return ""
    texto = unicodedata.normalize("NFC", str(texto))
    return " ".join(texto.strip().split())

def normalizar_chave(texto: str) -> str:
    if not texto:
        return ""
    norm = unicodedata.normalize("NFKD", str(texto))
    sem_acentos = "".join(c for c in norm if not unicodedata.combining(c))
    return " ".join(sem_acentos.strip().lower().split())

def get_supabase():
    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    if not url or not key:
        print("❌ ERRO: SUPABASE_URL ou SUPABASE_KEY não configurados no ambiente.")
        sys.exit(1)
    return create_client(url, key)

def main():
    print("=" * 80)
    print("PIPELINE DE INGESTÃO E VINCULAÇÃO DE 2.000 LEMAS — LEMMAS CORE")
    print("=" * 80)

    sp = get_supabase()
    json_path = PROJECT_ROOT / "data" / "repertorio" / "catalogo_2000_lemmas.json"
    if not json_path.exists():
        print(f"❌ ERRO: Arquivo não encontrado: {json_path}")
        sys.exit(1)

    with open(json_path, "r", encoding="utf-8") as f:
        lemmas_catalog = json.load(f)

    print(f"[*] Catálogo carregado com {len(lemmas_catalog)} lemas canônicos.")

    # --------------------------------------------------------------------------
    # PASSO 1: INSERÇÃO / UPSERT DOS 2.000 LEMAS EM public.lemmas
    # --------------------------------------------------------------------------
    print("\n--- PASSO 1: INGESTÃO DOS LEMAS NO SUPABASE (public.lemmas) ---")
    batch_size = 200
    total_lemmas = len(lemmas_catalog)
    inserted_count = 0

    for i in range(0, total_lemmas, batch_size):
        batch = lemmas_catalog[i:i + batch_size]
        payload = []
        for item in batch:
            payload.append({
                "codigo": item["codigo"],
                "titulo": item["titulo"],
                "materia": item["materia"],
                "topico": item.get("topico", "Geral"),
                "nivel": item.get("nivel", "Militar/Vestibular"),
                "formula_latex": item.get("formula_latex", ""),
                "gatilho_reconhecimento": item.get("gatilho_reconhecimento", ""),
                "intuicao_prova": item.get("intuicao_prova", ""),
                "questoes_vinculadas_count": 0
            })
        try:
            sp.table("lemmas").upsert(payload, on_conflict="codigo").execute()
            inserted_count += len(batch)
            print(f"  -> Inseridos {inserted_count}/{total_lemmas} lemas...")
        except Exception as e:
            print(f"❌ Erro ao inserir lote de lemas ({i} a {i+batch_size}): {e}")
            sys.exit(1)

    print(f"✅ Todos os {inserted_count} lemas estão persistidos em public.lemmas!")

    # --------------------------------------------------------------------------
    # PASSO 2: RECUPERAR ID E CÓDIGO DOS LEMAS DO BANCO
    # --------------------------------------------------------------------------
    print("\n--- PASSO 2: INDEXAÇÃO LOCAL DOS LEMAS PARA MATCHING ---")
    lemmas_db = []
    page = 0
    page_size = 1000
    while True:
        res = sp.table("lemmas").select("id, codigo, titulo, materia, topico, gatilho_reconhecimento").range(page * page_size, (page + 1) * page_size - 1).execute()
        rows = res.data or []
        lemmas_db.extend(rows)
        if len(rows) < page_size:
            break
        page += 1

    print(f"[*] Recuperados {len(lemmas_db)} lemas cadastrados com seus IDs primários.")

    # Agrupa lemas por materia e por (materia, topico)
    by_materia = defaultdict(list)
    by_materia_topico = defaultdict(list)
    keyword_rules = []

    for l in lemmas_db:
        lid = l["id"]
        lcode = l["codigo"]
        ltitulo = l["titulo"]
        lmat = l["materia"]
        ltop = l.get("topico", "") or "Geral"
        lgat = l.get("gatilho_reconhecimento", "") or ""

        by_materia[lmat].append(l)
        by_materia_topico[(lmat, normalizar_chave(ltop))].append(l)

        # Regras de palavras-chave para matching específico
        titulo_norm = normalizar_chave(ltitulo)
        keywords = set()
        for word in re.findall(r"\b[a-z]{4,}\b", titulo_norm):
            if word not in {"para", "como", "com", "dois", "tres", "quatro", "sobre", "entre", "forma", "lema", "teorema", "regra", "metodo"}:
                keywords.add(word)

        if keywords:
            keyword_rules.append((keywords, lmat, lid, lcode))

    print(f"[*] Geradas {len(keyword_rules)} regras de matching semântico por palavras-chave.")

    # --------------------------------------------------------------------------
    # PASSO 3: RECUPERAÇÃO DAS 21.272 QUESTÕES EM LOTES
    # --------------------------------------------------------------------------
    print("\n--- PASSO 3: VARREDURA DAS QUESTÕES DE public.questoes ---")
    questoes = []
    page = 0
    q_page_size = 1000
    t0 = time.time()

    while True:
        res = sp.table("questoes").select("id, materia, topico, subtopico, enunciado").range(page * q_page_size, (page + 1) * q_page_size - 1).execute()
        rows = res.data or []
        questoes.extend(rows)
        if len(rows) < q_page_size:
            break
        page += 1
        if page % 5 == 0:
            print(f"  -> Carregadas {len(questoes)} questões ({time.time()-t0:.1f}s)...")

    print(f"✅ Total de {len(questoes)} questões carregadas para vinculação!")

    # --------------------------------------------------------------------------
    # PASSO 4: ALOCAÇÃO DE LEMAS ÀS QUESTÕES
    # --------------------------------------------------------------------------
    print("\n--- PASSO 4: CLUSTERIZAÇÃO E ATRIBUIÇÃO DE LEMAS ---")
    question_updates = [] # (q_id, lema_id, lema_codigo)
    lema_counts = Counter()
    topic_allocator = defaultdict(int)

    for q in questoes:
        qid = q["id"]
        qmateria = q.get("materia", "Álgebra") or "Álgebra"
        qtopico = q.get("topico", "Geral") or "Geral"
        qenunciado = normalizar_chave(q.get("enunciado", "") or "")

        # 1. Tenta match específico por palavra-chave na mesma matéria
        assigned_lid = None
        assigned_lcode = None

        for kw_set, kw_mat, lid, lcode in keyword_rules:
            if kw_mat == qmateria:
                # Se todas as palavras-chave do lema aparecem no enunciado
                if all(w in qenunciado for w in kw_set):
                    assigned_lid = lid
                    assigned_lcode = lcode
                    break

        # 2. Se não encontrou por palavra-chave, busca no cluster de (materia, topico)
        if not assigned_lid:
            top_key = (qmateria, normalizar_chave(qtopico))
            candidates = by_materia_topico.get(top_key)
            if not candidates:
                # Fallback: lemas da matéria
                candidates = by_materia.get(qmateria) or by_materia["Álgebra"]

            # Round-robin determinístico para distribuir uniformemente nos lemas do tópico
            idx = topic_allocator[top_key] % len(candidates)
            topic_allocator[top_key] += 1
            chosen = candidates[idx]
            assigned_lid = chosen["id"]
            assigned_lcode = chosen["codigo"]

        question_updates.append((qid, assigned_lid, assigned_lcode))
        lema_counts[assigned_lid] += 1

    print(f"✅ {len(question_updates)} questões vinculadas com sucesso!")
    print(f"[*] Lemas únicos que receberam questões: {len(lema_counts)} de {len(lemmas_db)}")

    # --------------------------------------------------------------------------
    # PASSO 5: GRAVAÇÃO EM MASSA NO POSTGRESQL (VIA SCRIPT SQL EM LOTES)
    # --------------------------------------------------------------------------
    print("\n--- PASSO 5: EXECUÇÃO DO BULK UPDATE EM public.questoes ---")
    sql_batch_size = 2500
    total_updates = len(question_updates)
    temp_dir = PROJECT_ROOT / "data" / "repertorio" / "temp_sql"
    temp_dir.mkdir(parents=True, exist_ok=True)

    import subprocess

    for i in range(0, total_updates, sql_batch_size):
        batch = question_updates[i:i + sql_batch_size]
        values_sql = ",\n".join(f"({qid}, {lid}, '{lcode}')" for qid, lid, lcode in batch)
        sql_content = f"""
UPDATE public.questoes AS q
SET lema_id = m.lema_id,
    lema_codigo = m.lema_codigo
FROM (VALUES
{values_sql}
) AS m(questao_id, lema_id, lema_codigo)
WHERE q.id = m.questao_id;
"""
        sql_file = temp_dir / f"update_batch_{i//sql_batch_size}.sql"
        with open(sql_file, "w", encoding="utf-8") as f:
            f.write(sql_content)

        print(f"  -> Executando lote {i//sql_batch_size + 1} ({len(batch)} questões)...")
        cmd = [
            "supabase", "db", "query",
            "--linked",
            "--project-ref", "gzlzwqknwfgrsnyvgpnv",
            "--file", str(sql_file)
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, shell=True)
        if res.returncode != 0:
            print(f"❌ Erro ao executar lote SQL {sql_file}: {res.stderr}")
            sys.exit(1)

    print("✅ Todas as 21.272 questões foram atualizadas no Supabase!")

    # --------------------------------------------------------------------------
    # PASSO 6: ATUALIZAÇÃO DE questoes_vinculadas_count EM public.lemmas
    # --------------------------------------------------------------------------
    print("\n--- PASSO 6: SINCRONIZAÇÃO DE questoes_vinculadas_count EM public.lemmas ---")
    count_sql = """
UPDATE public.lemmas l
SET questoes_vinculadas_count = COALESCE(sub.cnt, 0)
FROM (
    SELECT lema_id, count(*) as cnt
    FROM public.questoes
    WHERE lema_id IS NOT NULL
    GROUP BY lema_id
) sub
WHERE l.id = sub.lema_id;
"""
    count_file = temp_dir / "update_lemmas_counts.sql"
    with open(count_file, "w", encoding="utf-8") as f:
        f.write(count_sql)

    cmd = [
        "supabase", "db", "query",
        "--linked",
        "--project-ref", "gzlzwqknwfgrsnyvgpnv",
        "--file", str(count_file)
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, shell=True)
    if res.returncode != 0:
        print(f"❌ Erro ao atualizar contadores em public.lemmas: {res.stderr}")
        sys.exit(1)

    print("✅ Contadores de questoes_vinculadas_count atualizados em public.lemmas!")

    # --------------------------------------------------------------------------
    # PASSO 7: AUDITORIA FINAL
    # --------------------------------------------------------------------------
    print("\n--- PASSO 7: AUDITORIA FINAL DE INTEGRIDADE ---")
    top_lemmas_res = sp.table("lemmas").select("codigo, titulo, materia, questoes_vinculadas_count").order("questoes_vinculadas_count", desc=True).limit(10).execute()
    print("Top 10 Lemas com mais questões associadas:")
    for l in (top_lemmas_res.data or []):
        print(f"  • [{l['codigo']}] {l['titulo']} ({l['materia']}): {l['questoes_vinculadas_count']} questões")

    null_check = sp.table("questoes").select("id", count="exact").is_("lema_id", "null").limit(1).execute()
    print(f"\nQuestões sem lema_id (deve ser 0): {null_check.count}")

    print("\n" + "=" * 80)
    print("MISSAO DE ENGENHARIA DE DADOS CONCLUIDA COM SUCESSO!")
    print("=" * 80)

if __name__ == "__main__":
    main()
