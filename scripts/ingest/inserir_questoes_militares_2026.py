import os
import sys
import io
import json
import re
import unicodedata
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Any, Optional

if sys.platform == "win32" and hasattr(sys.stdout, "buffer") and not getattr(sys.stdout, "_is_utf8_wrapped", False):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stdout._is_utf8_wrapped = True
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")
    sys.stderr._is_utf8_wrapped = True

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from src.database.db import get_supabase

def normalizar_chave(texto: str) -> str:
    if not texto:
        return ""
    norm = unicodedata.normalize("NFKD", str(texto))
    sem_acentos = "".join(c for c in norm if not unicodedata.combining(c))
    return " ".join(sem_acentos.strip().lower().split())

def carregar_indice_lemas(sp):
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

    by_materia_topico = defaultdict(list)
    by_topico = defaultdict(list)
    for l in lemmas_db:
        ltop = normalizar_chave(l.get("topico", "") or "Geral")
        lmat = l.get("materia", "") or "Matemática"
        by_materia_topico[(lmat, ltop)].append(l)
        by_topico[ltop].append(l)

    return lemmas_db, by_materia_topico, by_topico

def encontrar_melhor_lema(q, lemmas_db, by_materia_topico, by_topico):
    topico = q.get("topico", "")
    subtopico = q.get("subtopico", "")
    enunciado = q.get("enunciado", "")
    topico_norm = normalizar_chave(topico)
    subtopico_norm = normalizar_chave(subtopico)
    texto_busca = normalizar_chave(f"{topico} {subtopico} {enunciado[:200]}")

    candidatos = by_topico.get(topico_norm, [])
    if not candidatos:
        for t_key, l_list in by_topico.items():
            if t_key in topico_norm or topico_norm in t_key:
                candidatos.extend(l_list)

    if not candidatos:
        candidatos = lemmas_db

    melhor = None
    melhor_score = -1

    for l in candidatos:
        score = 0
        ltitulo = normalizar_chave(l.get("titulo", ""))
        lgatilho = normalizar_chave(l.get("gatilho_reconhecimento", ""))
        
        # Palavras em comum com subtopico
        for word in re.findall(r"\b[a-z]{4,}\b", subtopico_norm):
            if word in ltitulo or word in lgatilho:
                score += 3
        # Palavras em comum com texto geral
        for word in re.findall(r"\b[a-z]{4,}\b", ltitulo):
            if word in texto_busca:
                score += 1
        
        if score > melhor_score:
            melhor_score = score
            melhor = l

    if not melhor and candidatos:
        melhor = candidatos[0]

    return melhor

def sincronizar_json_para_db(json_path: Path):
    if not json_path.exists():
        print(f"❌ Arquivo não encontrado: {json_path}")
        return

    with open(json_path, "r", encoding="utf-8") as f:
        questoes = json.load(f)

    if not questoes:
        print(f"❌ Nenhuma questão em {json_path}")
        return

    sp = get_supabase()
    lemmas_db, by_materia_topico, by_topico = carregar_indice_lemas(sp)

    banca = questoes[0].get("banca", "MILITAR")
    ano = questoes[0].get("ano", 2026)

    print(f"\n=======================================================")
    print(f"[*] Inserindo/Atualizando {len(questoes)} questões de {banca} {ano}")
    print(f"=======================================================")

    inseridas = 0
    atualizadas = 0

    for q in questoes:
        # Formata enunciado com alternativas
        enunciado_base = q["enunciado"].strip()
        alts = q.get("alternativas")
        if alts and isinstance(alts, dict) and "(a)" not in enunciado_base and "a)" not in enunciado_base.lower()[-100:]:
            alts_str = "\n\n" + "\n".join([f"({k.lower()}) {v}" for k, v in sorted(alts.items())])
            enunciado_final = enunciado_base + alts_str
        else:
            enunciado_final = enunciado_base

        lema = encontrar_melhor_lema(q, lemmas_db, by_materia_topico, by_topico)
        lema_id = lema["id"] if lema else None
        lema_codigo = lema["codigo"] if lema else None

        gabarito = (q.get("gabarito") or "").strip().upper()
        figura_path = q.get("figura_path")

        id_externo = q.get("id_externo")

        registro = {
            "materia": q.get("materia", "Matemática"),
            "topico": q.get("topico", "Geral"),
            "subtopico": q.get("subtopico"),
            "dificuldade": q.get("dificuldade", 2),
            "banca": banca,
            "ano": int(ano),
            "enunciado": enunciado_final,
            "figura_path": figura_path,
            "gabarito": gabarito,
            "estrategias_esperadas": q.get("estrategias_esperadas"),
            "tipo": q.get("tipo", "objetiva"),
            "lema_id": lema_id,
            "lema_codigo": lema_codigo,
            "mathnet_id": id_externo
        }

        # Busca idempotente: 1) por mathnet_id; 2) fallback por snippet de enunciado
        busca = None
        if id_externo:
            busca = (
                sp.table("questoes")
                .select("id")
                .eq("banca", banca)
                .eq("ano", int(ano))
                .eq("mathnet_id", id_externo)
                .execute()
            )

        if not (busca and busca.data and len(busca.data) > 0):
            snippet = enunciado_base[:60].strip()
            # Remove caracteres como % e _ que afetam o ilike
            snippet_limpo = re.sub(r"[%_\\]", "", snippet[:40])
            busca = (
                sp.table("questoes")
                .select("id")
                .eq("banca", banca)
                .eq("ano", int(ano))
                .ilike("enunciado", f"%{snippet_limpo}%")
                .execute()
            )

        if busca.data and len(busca.data) > 0:
            qid = busca.data[0]["id"]
            sp.table("questoes").update(registro).eq("id", qid).execute()
            atualizadas += 1
            print(f"  [~] Questão #{qid} atualizada ({id_externo}, {lema_codigo})")
        else:
            res = sp.table("questoes").insert(registro).execute()
            if res.data:
                novo_id = res.data[0]["id"]
                inseridas += 1
                print(f"  [+] Questão #{novo_id} inserida ({id_externo}, {lema_codigo})")

    print(f"\n[✓] Concluído para {banca} {ano}: {inseridas} inseridas, {atualizadas} atualizadas.")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        path = Path(sys.argv[1])
    else:
        path = PROJECT_ROOT / "data" / "sources" / "afa" / "processed" / "2026" / "questoes.json"
    sincronizar_json_para_db(path)
