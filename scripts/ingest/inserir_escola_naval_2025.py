import sys
import io
import json
import re
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from src.database.db import get_supabase
from scripts.ingest.inserir_questoes_militares_2026 import carregar_indice_lemas, encontrar_melhor_lema

def main():
    json_path = PROJECT_ROOT / "data" / "sources" / "escola_naval" / "processed" / "2025" / "questoes.json"
    with open(json_path, "r", encoding="utf-8") as f:
        questoes = json.load(f)

    sp = get_supabase()
    lemmas_db, by_materia_topico, by_topico = carregar_indice_lemas(sp)

    # Verifica linhas órfãs unassigned para reaproveitar
    res_orfas = sp.table("questoes").select("id").eq("banca", "Escola Naval").is_("mathnet_id", "null").execute()
    orfas = [r["id"] for r in (res_orfas.data or [])]
    print(f"[*] Linhas órfãs disponíveis para reaproveitamento: {orfas}")

    for i, q in enumerate(questoes):
        enunciado_base = q["enunciado"].strip()
        alts = q.get("alternativas", {})
        alts_str = "\n\n" + "\n".join([f"({k.lower()}) {v}" for k, v in sorted(alts.items())])
        enunciado_final = enunciado_base + alts_str

        lema = encontrar_melhor_lema(q, lemmas_db, by_materia_topico, by_topico)
        lema_id = lema["id"] if lema else None
        lema_codigo = lema["codigo"] if lema else None
        id_externo = q["id_externo"]

        registro = {
            "materia": q.get("materia", "Matemática"),
            "topico": q.get("topico", "Geral"),
            "subtopico": q.get("subtopico"),
            "dificuldade": q.get("dificuldade", 2),
            "banca": "Escola Naval",
            "ano": 2025,
            "enunciado": enunciado_final,
            "figura_path": q.get("figura_path"),
            "gabarito": q.get("gabarito", "").strip().upper(),
            "estrategias_esperadas": q.get("estrategias_esperadas"),
            "tipo": "objetiva",
            "lema_id": lema_id,
            "lema_codigo": lema_codigo,
            "mathnet_id": id_externo
        }

        # 1. Verifica se já existe por mathnet_id
        busca = sp.table("questoes").select("id").eq("banca", "Escola Naval").eq("ano", 2025).eq("mathnet_id", id_externo).execute()
        if busca.data and len(busca.data) > 0:
            qid = busca.data[0]["id"]
            sp.table("questoes").update(registro).eq("id", qid).execute()
            print(f"  [~] Questão #{qid} atualizada ({id_externo}, {lema_codigo})")
        elif orfas:
            qid_reuso = orfas.pop(0)
            sp.table("questoes").update(registro).eq("id", qid_reuso).execute()
            print(f"  [↻] Questão reaproveitada #{qid_reuso} ({id_externo}, {lema_codigo})")
        else:
            ins = sp.table("questoes").insert(registro).execute()
            novo_id = ins.data[0]["id"] if ins.data else "?"
            print(f"  [+] Questão #{novo_id} inserida ({id_externo}, {lema_codigo})")

    print("[✓] Todas as 22 questões de Escola Naval 2025 sincronizadas com sucesso!")

if __name__ == "__main__":
    main()
