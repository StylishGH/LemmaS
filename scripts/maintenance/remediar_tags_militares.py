#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
remediar_tags_militares.py
Aplica a remediação aprovada nas 131 questões de bancas militares
no Supabase (public.questoes), padronizando:
  - categoria_banca: 'Concurso Militar'
  - tipo_material: 'concurso_militar'
"""

import json
import urllib.request
import urllib.parse
import sys

SUPABASE_URL = "https://gzlzwqknwfgrsnyvgpnv.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bHp3cWtud2ZncnNueXZncG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MTgzNzcsImV4cCI6MjEwNjk5NDM3N30.L2G9NrtgQM0MzvVJ50tG3S_4eso99INrsl9g2b7sVHI"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

MILITAR_BANCAS = [
    "Escola Naval", "AFA", "EsPCEx", "EFOMM", 
    "Colégio Naval", "EPCAR", "IME", "ITA", "EEAR", "ESA"
]

def main():
    print("1. Identificando questões inconsistentes...")
    inconsistent = []
    for b in MILITAR_BANCAS:
        url = f"{SUPABASE_URL}/rest/v1/questoes?banca=eq.{urllib.parse.quote(b)}&select=id,banca,ano,categoria_banca,tipo_material,mathnet_id"
        req = urllib.request.Request(url, headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"})
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            for q in data:
                cat = q.get("categoria_banca")
                mat = q.get("tipo_material")
                if cat != "Concurso Militar" or mat != "concurso_militar":
                    inconsistent.append(q)

    total = len(inconsistent)
    print(f"Total de questões identificadas: {total}")
    if total == 0:
        print("Nenhuma questão necessita de correção. Abortando.")
        return

    # Patch in batches of 20 IDs using `id=in.(id1,id2,...)`
    batch_size = 20
    payload = json.dumps({
        "categoria_banca": "Concurso Militar",
        "tipo_material": "concurso_militar",
    }).encode("utf-8")

    updated_count = 0
    for i in range(0, total, batch_size):
        chunk = inconsistent[i:i + batch_size]
        ids = [str(q["id"]) for q in chunk]
        id_filter = f"({','.join(ids)})"
        url = f"{SUPABASE_URL}/rest/v1/questoes?id=in.{id_filter}"
        
        req = urllib.request.Request(url, headers=HEADERS, data=payload, method="PATCH")
        with urllib.request.urlopen(req) as resp:
            res = json.loads(resp.read().decode())
            updated_count += len(res)
            print(f"  Lote {i // batch_size + 1}/{(total + batch_size - 1) // batch_size}: {len(res)} questões atualizadas (IDs: {ids[:3]}...)")

    print(f"\nTotal atualizado com sucesso: {updated_count}/{total}")

    # Validação pós-remediação
    print("\n2. Executando auditoria de validação pós-patch...")
    remaining_errors = 0
    for b in MILITAR_BANCAS:
        url = f"{SUPABASE_URL}/rest/v1/questoes?banca=eq.{urllib.parse.quote(b)}&select=id,categoria_banca,tipo_material"
        req = urllib.request.Request(url, headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"})
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            for q in data:
                cat = q.get("categoria_banca")
                mat = q.get("tipo_material")
                if cat != "Concurso Militar" or mat != "concurso_militar":
                    remaining_errors += 1
                    print(f"  ALERTA: ID {q['id']} ainda inconsistente ({b}): cat={cat}, tipo_mat={mat}")

    if remaining_errors == 0:
        print("Validação 100% CONCLUÍDA! Zero inconsistências remanescentes em bancas militares.")
    else:
        print(f"ALERTA: {remaining_errors} questões ainda inconsistentes.")
        sys.exit(1)

if __name__ == "__main__":
    main()
