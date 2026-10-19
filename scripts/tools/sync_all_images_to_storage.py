"""
MathAI Engine — Sincronizador de Imagens para o Supabase Storage
Sincroniza o acervo local de imagens (PNG, JPG, SVG) com o bucket público 'questoes-imagens',
garantindo entrega global via CDN e eliminando qualquer erro 404 de imagem no Vercel.
"""

import os
import sys
import mimetypes
from pathlib import Path
from dotenv import load_dotenv

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.database.db import get_supabase

load_dotenv(PROJECT_ROOT / "backend" / ".env")

def sync_images(dry_run: bool = False, limit: int = None):
    supabase = get_supabase()
    imagens_dir = PROJECT_ROOT / "data" / "imagens"

    if not imagens_dir.exists():
        print(f"[!] Diretório não encontrado: {imagens_dir}")
        return

    arquivos = [
        p for p in imagens_dir.glob("**/*.*")
        if p.is_file() 
        and p.suffix.lower() in [".png", ".jpg", ".jpeg", ".svg", ".webp"]
        and not any(part.startswith(("debug", "pages_", "test_")) for part in p.parts)
    ]
    print(f"[*] Total de imagens legítimas encontradas: {len(arquivos)}")

    enviadas = 0
    erros = 0

    for idx, arq in enumerate(arquivos, start=1):
        if limit and enviadas >= limit:
            break

        path_relativo = arq.relative_to(imagens_dir).as_posix()
        content_type, _ = mimetypes.guess_type(str(arq))
        if arq.suffix.lower() == ".svg":
            content_type = "image/svg+xml"
        elif not content_type:
            content_type = "application/octet-stream"

        if dry_run:
            print(f"[{idx}/{len(arquivos)}] [DRY-RUN] Enviaria: {path_relativo} ({content_type})")
            enviadas += 1
            continue

        try:
            with open(arq, "rb") as f:
                data = f.read()

            supabase.storage.from_("questoes-imagens").upload(
                path_relativo,
                data,
                file_options={"content-type": content_type, "upsert": "true"}
            )
            enviadas += 1
            if enviadas % 25 == 0 or idx == len(arquivos):
                print(f"  [OK] {enviadas}/{len(arquivos)} imagens sincronizadas com o Supabase Storage...")
        except Exception as e:
            erros += 1
            print(f"  [!] Falha ao subir {path_relativo}: {e}")

    print(f"\n=======================================================")
    print(f" [OK] SINCRONIZACAO CONCLUIDA: {enviadas} enviadas | {erros} erros")
    print(f"=======================================================")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Sync local images to Supabase Storage")
    parser.add_argument("--dry-run", action="store_true", help="Simula o envio sem fazer upload")
    parser.add_argument("--limit", type=int, default=None, help="Limite de arquivos a sincronizar")
    args = parser.parse_args()

    sync_images(dry_run=args.dry_run, limit=args.limit)
