import sys
sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import mimetypes
import time

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from src.database.db import get_supabase

sb = get_supabase()
imagens_dir = PROJECT_ROOT / "data" / "imagens"

folders = [
    PROJECT_ROOT / 'data/imagens/afa/2024',
    PROJECT_ROOT / 'data/imagens/afa/2025',
    PROJECT_ROOT / 'data/imagens/epcar/2020',
    PROJECT_ROOT / 'data/imagens/espcex/2022',
    PROJECT_ROOT / 'data/imagens/espcex/2023',
    PROJECT_ROOT / 'data/imagens/espcex/2024',
    PROJECT_ROOT / 'data/imagens/espcex/2025',
    PROJECT_ROOT / 'data/imagens/colegio_naval/2023',
    PROJECT_ROOT / 'data/imagens/colegio_naval/2024',
    PROJECT_ROOT / 'data/imagens/colegio_naval/2025',
]

arquivos = []
for f in folders:
    if f.exists():
        arquivos.extend([p for p in f.glob('*.png')])

print(f"[*] Total de arquivos militares para sincronizar/retentar: {len(arquivos)}")

def upload_file_with_retry(arq: Path, retries: int = 3):
    path_relativo = arq.relative_to(imagens_dir).as_posix()
    content_type, _ = mimetypes.guess_type(str(arq))
    if not content_type:
        content_type = "image/png"
    
    with open(arq, "rb") as fp:
        data = fp.read()

    for attempt in range(1, retries + 1):
        try:
            sb.storage.from_("questoes-imagens").upload(
                path_relativo,
                data,
                file_options={"content-type": content_type, "upsert": "true"}
            )
            return path_relativo
        except Exception as e:
            if attempt == retries:
                raise e
            time.sleep(0.5 * attempt)

success = 0
errors = 0

with ThreadPoolExecutor(max_workers=3) as executor:
    future_to_file = {executor.submit(upload_file_with_retry, arq): arq for arq in arquivos}
    for future in as_completed(future_to_file):
        arq = future_to_file[future]
        try:
            rel = future.result()
            success += 1
            if success % 10 == 0 or success == len(arquivos):
                print(f"  [OK] {success}/{len(arquivos)} sincronizados com sucesso!")
        except Exception as e:
            errors += 1
            print(f"  [!] Falha definitiva em {arq.name}: {e}")

print(f"\n=======================================================")
print(f" [OK] RESULTADO FINAL: {success} enviados | {errors} erros")
print(f"=======================================================")
