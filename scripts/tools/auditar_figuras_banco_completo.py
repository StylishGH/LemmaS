import sys
import io
import urllib.request
from pathlib import Path
from collections import defaultdict

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))
from src.database.db import get_supabase
SUPABASE_STORAGE_URL = "https://gzlzwqknwfgrsnyvgpnv.supabase.co/storage/v1/object/public/questoes-imagens"

sp = get_supabase()

print("=================================================================")
print("  AUDITORIA GERAL DE FIGURAS NO SUPABASE POSTGRES + STORAGE CDN  ")
print("=================================================================")

# Busca todas as questões com figura_path preenchido
page_size = 1000
todas_com_figura = []
page = 0
while True:
    res = sp.table("questoes").select("id, banca, ano, mathnet_id, figura_path").not_.is_("figura_path", "null").range(page * page_size, (page + 1) * page_size - 1).execute()
    rows = res.data or []
    todas_com_figura.extend(rows)
    if len(rows) < page_size:
        break
    page += 1

print(f"Total de questões no banco com figura_path preenchido: {len(todas_com_figura)}")

# Agrupa por banca e ano
by_banca_ano = defaultdict(list)
for q in todas_com_figura:
    by_banca_ano[(q.get("banca"), q.get("ano"))].append(q)

print(f"Total de provas distintas com figuras: {len(by_banca_ano)}")

# Vamos testar o CDN para as bancas militares nos anos 2024, 2025, 2026
militares = ["AFA", "EsPCEx", "EFOMM", "Escola Naval", "Colégio Naval", "EPCAR", "EEAR", "ESA", "IME", "ITA"]

print("\n--- STATUS DO ACERVO MILITAR (2024 - 2026) ---")
total_militares = 0
erros_cdn = []
ok_cdn = 0

for (banca, ano), qs in sorted(by_banca_ano.items(), key=lambda x: (str(x[0][0]), str(x[0][1]))):
    if not any(m.lower() in str(banca).lower() for m in militares):
        continue
    if ano not in [2024, 2025, 2026]:
        continue

    print(f"\n📁 [{banca} {ano}] ({len(qs)} questões com figura):")
    for q in sorted(qs, key=lambda x: str(x.get("mathnet_id") or x.get("id"))):
        total_militares += 1
        fpath = q.get("figura_path")
        # Limpa o fpath para o CDN
        clean = (
            fpath.replace("/data/imagens/", "")
            .replace("data/imagens/", "")
            .replace("/uploads/", "uploads/")
            .lstrip("/")
        )
        url = f"{SUPABASE_STORAGE_URL}/{clean}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "LemmaS-Bot/1.0"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                sz = len(resp.read())
                ok_cdn += 1
                status = f"✓ 200 OK ({sz/1024:.1f} KB)"
        except Exception as e:
            erros_cdn.append((q["id"], banca, ano, fpath, str(e)))
            status = f"❌ ERRO: {e}"

        print(f"   #{q['id']} ({q.get('mathnet_id')}) -> {fpath} | {status}")

print(f"\n=================================================================")
print(f"  RESUMO DA AUDITORIA MILITAR (2024-2026):")
print(f"  Total testadas: {total_militares}")
print(f"  HTTP 200 OK: {ok_cdn}")
print(f"  Erros: {len(erros_cdn)}")
print(f"=================================================================")

if erros_cdn:
    print("\n🚨 DETALHE DOS ERROS:")
    for eid, ebanca, eano, efpath, err in erros_cdn:
        print(f"  - #{eid} [{ebanca} {eano}] {efpath}: {err}")
