import json
import sys
from pathlib import Path

# Setup paths
PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import get_supabase_client

def insert_cederj():
    supabase = get_supabase_client()
    if not supabase:
        raise ValueError("Could not connect to Supabase.")

    json_path = PROJECT_ROOT / "data" / "sources" / "cederj" / "backup" / "questoes.json"
    with open(json_path, "r", encoding="utf-8") as f:
        questoes = json.load(f)

    print(f"Lendo {len(questoes)} questoes do CEDERJ...")

    # Garante que nenhum campo 'id' esteja presente para o banco gerar 1..74
    for q in questoes:
        q.pop("id", None)
        q.pop("criado_em", None)

    # Inserção em lotes de 25
    batch_size = 25
    total_inseridas = 0
    ids_gerados = []

    for i in range(0, len(questoes), batch_size):
        batch = questoes[i:i + batch_size]
        res = supabase.table("questoes").insert(batch).execute()
        if not res.data:
            raise RuntimeError(f"Erro ao inserir lote {i}: {res}")
        batch_ids = [item["id"] for item in res.data]
        ids_gerados.extend(batch_ids)
        total_inseridas += len(res.data)
        print(f"Lote {i // batch_size + 1} inserido: {len(res.data)} questoes (IDs: {batch_ids[0]} a {batch_ids[-1]})")

    print(f"\nSucesso total! {total_inseridas} questoes inseridas.")
    print(f"Menor ID: {min(ids_gerados)} | Maior ID: {max(ids_gerados)}")
    return ids_gerados

if __name__ == "__main__":
    insert_cederj()
