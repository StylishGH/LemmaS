"""
Script de Sincronização da Staging Area (processed/ + data/imagens/) para o Supabase
Faz o upload de ativos visuais para o Supabase Storage (bucket 'questoes-imagens')
e insere/atualiza os registros na tabela canônica 'public.questoes' com idempotência.
"""

import os
import json
from pathlib import Path
from typing import Optional, List
from dotenv import load_dotenv

load_dotenv()

try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False

SUPABASE_URL = os.getenv("SUPABASE_URL")
# Para uploads em storage e modificações administrativas, prefere SERVICE_ROLE_KEY
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
BUCKET_NAME = "questoes-imagens"

def get_client() -> Optional[Client]:
    if not SUPABASE_AVAILABLE or not SUPABASE_URL or not SUPABASE_KEY:
        print("[!] Supabase client indisponível ou credenciais ausentes no .env")
        return None
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def upload_imagem_para_storage(
    supabase: Client, 
    caminho_fisico: Path, 
    storage_path: str
) -> Optional[str]:
    """
    Sobe o arquivo de imagem para o Supabase Storage e retorna a URL pública.
    """
    try:
        with open(caminho_fisico, "rb") as f:
            supabase.storage.from_(BUCKET_NAME).upload(
                path=storage_path,
                file=f,
                file_options={"content-type": "image/png", "upsert": "true"}
            )
        return supabase.storage.from_(BUCKET_NAME).get_public_url(storage_path)
    except Exception as e:
        print(f"  [!] Falha no upload para o Storage ({storage_path}): {e}")
        # Se falhou, retorna None para manter o caminho relativo local de fallback
        return None

def sincronizar_ano_para_supabase(
    root_dir: Path, 
    banca: str, 
    ano: str, 
    upload_storage: bool = False
):
    """
    Sincroniza um ano de questões da Staging Area para o Supabase Postgres.
    Se upload_storage=True, envia os PNGs para o Supabase Storage.
    Caso contrário, grava o caminho relativo que a Junction do Next.js lê perfeitamente.
    """
    banca_slug = banca.lower().replace(" ", "_")
    json_path = root_dir / "data" / "sources" / banca_slug / "processed" / str(ano) / "questoes.json"

    if not json_path.exists():
        print(f"[!] Arquivo de staging não encontrado: {json_path}")
        return

    with open(json_path, "r", encoding="utf-8") as f:
        questoes = json.load(f)

    if not questoes:
        print(f"[!] Nenhuma questão encontrada em {json_path}")
        return

    supabase = get_client()
    if not supabase:
        print("[!] Abortando sincronização por falta de cliente Supabase.")
        return

    print(f"\n=======================================================")
    print(f"[*] Sincronizando {len(questoes)} questões de {banca.upper()} {ano}")
    print(f"[*] Upload para Supabase Storage: {upload_storage}")
    print(f"=======================================================")

    inseridas = 0
    atualizadas = 0

    for q in questoes:
        caminho_figura_final = q.get("figura_path")

        # 1. Se configurado para upload no Storage e houver figura local
        if upload_storage and caminho_figura_final and caminho_figura_final.startswith("/data/imagens/"):
            # Converte o caminho relativo em físico
            rel_path = caminho_figura_final.lstrip("/")
            caminho_fisico = root_dir / rel_path

            if caminho_fisico.exists():
                storage_dest = f"{banca_slug}/{ano}/{caminho_fisico.name}"
                url_pub = upload_imagem_para_storage(supabase, caminho_fisico, storage_dest)
                if url_pub:
                    caminho_figura_final = url_pub

        # 2. Prepara o payload para a tabela canônica 'public.questoes'
        registro_sql = {
            "materia": q.get("materia", "Matemática"),
            "topico": q.get("topico", "Geral"),
            "subtopico": q.get("subtopico"),
            "banca": q.get("banca", banca.upper()),
            "ano": int(q.get("ano", ano)),
            "enunciado": q["enunciado"],
            "figura_path": caminho_figura_final,
            "gabarito": q.get("gabarito"),
            "estrategias_esperadas": q.get("estrategias_esperadas"),
            "tipo": q.get("tipo", "objetiva")
        }

        # 3. Verificação de Idempotência: busca se a questão já existe (banca + ano + trecho do enunciado)
        snippet = q["enunciado"][:60].strip()
        busca = (
            supabase.table("questoes")
            .select("id")
            .eq("banca", registro_sql["banca"])
            .eq("ano", registro_sql["ano"])
            .ilike("enunciado", f"%{snippet}%")
            .execute()
        )

        if busca.data and len(busca.data) > 0:
            qid = busca.data[0]["id"]
            # Atualiza figura_path e tópicos se necessário
            supabase.table("questoes").update({
                "figura_path": caminho_figura_final,
                "topico": registro_sql["topico"],
                "subtopico": registro_sql["subtopico"],
                "estrategias_esperadas": registro_sql["estrategias_esperadas"]
            }).eq("id", qid).execute()
            atualizadas += 1
            print(f"  [~] Questão #{qid} atualizada ({q.get('id_externo')})")
        else:
            res = supabase.table("questoes").insert(registro_sql).execute()
            if res.data:
                inseridas += 1
                novo_id = res.data[0]["id"]
                print(f"  [+] Questão #{novo_id} inserida ({q.get('id_externo')})")

    print(f"\n[✓] Sincronização concluída: {inseridas} inseridas, {atualizadas} atualizadas.")

if __name__ == "__main__":
    ROOT = Path(__file__).resolve().parents[2]
    # Sincroniza localmente (upload_storage=False preserva o caminho relativo da Junction)
    sincronizar_ano_para_supabase(ROOT, banca="afa", ano="2024", upload_storage=False)
