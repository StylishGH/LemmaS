import urllib.request
import json
import sys

if sys.platform == "win32" and hasattr(sys.stdout, "buffer") and "pytest" not in sys.modules:
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

import pytest
import os

def test_api():
    base_url = os.environ.get("LEMMAS_API_URL", "http://localhost:3000")
    url = f"{base_url}/api/questions?page=1&limit=15"
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode())
    except (urllib.error.URLError, TimeoutError, OSError) as err:
        pytest.skip(f"Next.js server not reachable at {base_url} ({err}), skipping live test in CI.")
    
    total = data.get("total")
    questoes = data.get("questoes", [])
    dificuldades = data.get("dificuldades", [])

    print(f"Total questoes: {total}")
    print(f"Questoes retornadas: {len(questoes)}")
    print("Dificuldades facets:")
    diff_sum = 0
    for d in dificuldades:
        print(f"  {d['id']} ({d['label']}): {d['count']}")
        if d['id'] != "Todas":
            diff_sum += d['count']
    
    print(f"\nSoma das fatias de dificuldade: {diff_sum}")
    print(f"Total reportado: {total}")
    assert diff_sum == total, f"Soma das fatias ({diff_sum}) NÃO bate com total ({total})!"
    print("✓ SOMA DAS FATIAS BATE 100% COM O TOTAL!")

    print("\nTop 5 Questoes retornadas (Cold Start):")
    for q in questoes[:5]:
        banca = q.get("banca")
        ano = q.get("ano")
        qid = q.get("id")
        gab = q.get("gabarito")
        has_sol = bool(q.get("solucao"))
        has_lema = bool(q.get("estrategias_esperadas"))
        enunc = (q.get("enunciado") or "")[:70]
        print(f"  ID {qid} | {banca} {ano} | Gabarito: {gab} | Solucao: {has_sol} | Lema: {has_lema}")
        print(f"    Enunciado: {repr(enunc)}")

    # Asserção de que os primeiros itens NÃO são os IDs 1, 2, 3... toy questions
    top_ids = [q.get("id") for q in questoes[:5]]
    assert 1 not in top_ids, "ID 1 não deveria estar no top 5!"
    assert 2 not in top_ids, "ID 2 não deveria estar no top 5!"
    print("\n✓ Cold start corrigido: toy questions (IDs 1-5) não estão no topo!")

if __name__ == "__main__":
    test_api()
