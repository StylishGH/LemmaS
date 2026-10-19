import sys
sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.extend([str(PROJECT_ROOT), str(PROJECT_ROOT / 'backend')])

from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / "backend" / ".env")

from app.core.config import get_supabase_client
sb = get_supabase_client()

ids = [587, 593, 596, 597, 602, 603, 612, 615, 617, 621, 625, 630, 631, 636, 1820, 1863, 1878, 1881, 1883, 1884, 1886, 1889, 1896, 1897, 1900, 1903, 1956, 1960, 1964, 1968, 1986]

res = sb.table('questoes').select('id,banca,ano,mathnet_id,enunciado,figura_path').in_('id', ids).order('id').execute()

print(f"Total retornadas: {len(res.data)}")
for r in res.data:
    txt = (r.get('enunciado') or '').replace('\n', ' ')[:100]
    has_fig_word = any(w in txt.lower() for w in ['figura', 'gráfico', 'grafico', 'abaixo', 'desenho', 'tabela'])
    print(f"ID {r['id']} | {r['banca']} {r['ano']} | {r['mathnet_id']} | HasFigWord: {has_fig_word}")
    print(f"   Fig: {r['figura_path']}")
    print(f"   Enunciado: {txt}...")
