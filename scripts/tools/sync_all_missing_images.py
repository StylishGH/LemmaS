"""
Script de Extração, Sincronização e Blindagem de Imagens do LEMMAS.
Resolve definitivamente as imagens da FUVEST, UNICAMP e Olimpíadas (MathNet).

Fontes:
1. BLUEX (Hugging Face) -> FUVEST e UNICAMP (base64 em associated_images).
2. mathnet_original.parquet -> Olimpíadas Internacionais / Nacionais (bytes em images).
3. Sincronização Local (frontend/public/data/imagens) + Supabase Storage (questoes-imagens) + Postgres (questoes.figura_path e enunciado).
"""

import os
import sys
import io
import re
import base64
import time
from pathlib import Path
from PIL import Image
from tqdm import tqdm
from dotenv import load_dotenv

# Configura encoding UTF-8
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

# Carrega variáveis de ambiente
load_dotenv(ROOT_DIR / "frontend" / ".env.local")
load_dotenv(ROOT_DIR / "backend" / ".env")
load_dotenv(ROOT_DIR / ".env")

from supabase import create_client

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("[!] Erro: Credenciais do Supabase não encontradas.")
    sys.exit(1)

client = create_client(SUPABASE_URL, SUPABASE_KEY)
PUBLIC_DIR = ROOT_DIR / "frontend" / "public"

def upload_to_supabase_storage(storage_path: str, file_bytes: bytes, mime_type: str = "image/png") -> bool:
    """Faz upload com retry para o Supabase Storage bucket 'questoes-imagens'."""
    try:
        client.storage.from_("questoes-imagens").upload(
            storage_path,
            file_bytes,
            file_options={"upsert": "true", "content-type": mime_type}
        )
        return True
    except Exception as e:
        # Se já existe ou erro transitório, tenta com retry
        try:
            time.sleep(0.5)
            client.storage.from_("questoes-imagens").upload(
                storage_path,
                file_bytes,
                file_options={"upsert": "true", "content-type": mime_type}
            )
            return True
        except Exception as e2:
            print(f"[!] Falha no upload para {storage_path}: {e2}")
            return False

def sincronizar_fuvest_unicamp():
    """Extrai e sincroniza imagens da FUVEST e UNICAMP do dataset BLUEX."""
    print("\n" + "=" * 65)
    print("🚀 FASE 1: Extração de Imagens da FUVEST & UNICAMP (BLUEX)")
    print("=" * 65)

    from datasets import load_dataset
    print("[*] Carregando dataset BLUEX do Hugging Face...")
    ds = load_dataset("portuguese-benchmark-datasets/BLUEX", split="questions")

    # Mapeia itens com imagens por snippet do texto da questão
    bluex_com_imagens = {}
    for item in ds:
        if item.get("has_associated_images") and item.get("associated_images"):
            q_text = item.get("question", "").strip()
            if q_text:
                snip = " ".join(q_text[:60].split()).lower()
                bluex_com_imagens[snip] = item

    print(f"[*] {len(bluex_com_imagens)} questões com figuras no dataset BLUEX.")

    # Busca questões da FUVEST e UNICAMP no Supabase
    sb_res = client.table("questoes").select("id, banca, ano, enunciado, figura_path").in_("banca", ["FUVEST", "UNICAMP"]).execute()
    questoes_sb = sb_res.data or []
    print(f"[*] {len(questoes_sb)} questões da FUVEST/UNICAMP encontradas no Supabase.")

    atualizadas = 0
    with tqdm(total=len(questoes_sb), desc="Sincronizando FUVEST/UNICAMP", unit="questão") as pbar:
        for q in questoes_sb:
            snip = " ".join(q["enunciado"][:60].split()).lower()
            if snip not in bluex_com_imagens:
                pbar.update(1)
                continue

            item = bluex_com_imagens[snip]
            images_b64 = item.get("associated_images") or []
            if not images_b64:
                pbar.update(1)
                continue

            raw_id = item.get("id", "USP_2021_01")
            partes = raw_id.split("_")
            sigla = partes[0].upper()
            banca_slug = "fuvest" if sigla in ["USP", "FUVEST"] else "unicamp"
            ano = partes[1] if len(partes) > 1 and partes[1].isdigit() else str(q.get("ano") or 2021)
            num = int(item.get("number", 1))

            caminhos_locais = []
            caminhos_storage = []

            for idx, b64_str in enumerate(images_b64, start=1):
                try:
                    img_bytes = base64.b64decode(b64_str)
                    filename = f"{banca_slug}_{ano}_q{num:02d}_fig{idx}.png"
                    
                    # Salva no disco local
                    local_dir = PUBLIC_DIR / "data" / "imagens" / banca_slug / str(ano)
                    local_dir.mkdir(parents=True, exist_ok=True)
                    local_file = local_dir / filename
                    with open(local_file, "wb") as f:
                        f.write(img_bytes)

                    rel_path = f"/data/imagens/{banca_slug}/{ano}/{filename}"
                    caminhos_locais.append(rel_path)

                    # Upload para Supabase Storage
                    storage_path = f"{banca_slug}/{ano}/{filename}"
                    upload_to_supabase_storage(storage_path, img_bytes)
                    caminhos_storage.append(storage_path)
                except Exception as err:
                    print(f"[!] Erro ao decodificar imagem {idx} de {raw_id}: {err}")

            if caminhos_locais:
                figura_principal = caminhos_locais[0]
                
                # Higieniza o enunciado: substitui [IMAGE 0] pelo markdown com link relativo correto
                enunciado_atual = q["enunciado"]
                enunciado_novo = enunciado_atual
                for idx, path_fig in enumerate(caminhos_locais):
                    pattern = re.compile(rf"\[IMAGE\s*{idx}\]", re.IGNORECASE)
                    enunciado_novo = pattern.sub(f"![Figura {idx+1}]({path_fig})", enunciado_novo)

                # Se sobraram tags genéricas [IMAGE], limpa
                enunciado_novo = re.sub(r"\[IMAGE(?:\s*\d+)?\]", "", enunciado_novo).strip()

                # Atualiza no Supabase
                try:
                    client.table("questoes").update({
                        "figura_path": figura_principal,
                        "enunciado": enunciado_novo
                    }).eq("id", q["id"]).execute()
                    atualizadas += 1
                except Exception as err_up:
                    print(f"[!] Erro no update da questão {q['id']}: {err_up}")

            pbar.update(1)

    print(f"[✓] Concluído: {atualizadas} questões da FUVEST/UNICAMP com figuras sincronizadas!\n")

def sincronizar_olimpiadas_mathnet():
    """Extrai e sincroniza imagens das Olimpíadas (MathNet) do arquivo parquet."""
    print("=" * 65)
    print("🚀 FASE 2: Extração de Imagens das Olimpíadas (MathNet Parquet)")
    print("=" * 65)

    import pandas as pd
    parquet_path = ROOT_DIR / "data" / "backups" / "mathnet_original.parquet"
    if not parquet_path.exists():
        print(f"[!] Erro: {parquet_path} não encontrado.")
        return

    print("[*] Carregando mathnet_original.parquet...")
    df = pd.read_parquet(parquet_path)
    df_com_img = df[df["images"].apply(lambda x: x is not None and len(x) > 0)]
    print(f"[*] {len(df_com_img)} registros com imagens no Parquet.")

    # Mapeia mathnet_id -> lista de imagens (bytes)
    mapa_imagens = {}
    for _, row in df_com_img.iterrows():
        mid = str(row["id"])
        imgs = row["images"]
        mapa_imagens[mid] = imgs

    # Puxa questões do Supabase que têm 'attached_image' no enunciado
    print("[*] Buscando questões com 'attached_image' no Supabase...")
    res = client.table("questoes").select("id, mathnet_id, banca, enunciado, figura_path").ilike("enunciado", "%attached_image%").execute()
    questoes_olimp = res.data or []
    print(f"[*] {len(questoes_olimp)} questões olímpicas com 'attached_image' encontradas.")

    local_dir = PUBLIC_DIR / "data" / "imagens" / "olimpiadas"
    local_dir.mkdir(parents=True, exist_ok=True)

    atualizadas = 0
    with tqdm(total=len(questoes_olimp), desc="Sincronizando Olimpíadas", unit="questão") as pbar:
        for q in questoes_olimp:
            mid = str(q.get("mathnet_id") or "")
            if mid not in mapa_imagens:
                pbar.update(1)
                continue

            imgs_array = mapa_imagens[mid]
            caminhos_locais = []

            for idx, img_data in enumerate(imgs_array, start=1):
                try:
                    raw_bytes = None
                    if isinstance(img_data, dict) and "bytes" in img_data:
                        raw_bytes = img_data["bytes"]
                    elif hasattr(img_data, "get") and img_data.get("bytes"):
                        raw_bytes = img_data["bytes"]

                    if not raw_bytes:
                        continue

                    # Converte para PNG via PIL para normalização
                    im = Image.open(io.BytesIO(raw_bytes))
                    filename = f"{mid}_fig{idx}.png"
                    local_file = local_dir / filename
                    im.save(local_file, format="PNG")

                    # Converte buffer para upload
                    buf = io.BytesIO()
                    im.save(buf, format="PNG")
                    png_bytes = buf.getvalue()

                    rel_path = f"/data/imagens/olimpiadas/{filename}"
                    caminhos_locais.append(rel_path)

                    # Upload para Supabase Storage
                    storage_path = f"olimpiadas/{filename}"
                    upload_to_supabase_storage(storage_path, png_bytes)
                except Exception as e_img:
                    print(f"[!] Erro ao processar imagem {idx} de mathnet_id {mid}: {e_img}")

            if caminhos_locais:
                figura_principal = caminhos_locais[0]

                # Higieniza o enunciado: substitui ![](attached_image_1.png) pelo caminho real
                enunciado_atual = q["enunciado"]
                enunciado_novo = enunciado_atual
                for idx, path_fig in enumerate(caminhos_locais, start=1):
                    # Substitui ![](attached_image_1.png) e variações
                    pattern = re.compile(rf"!\[.*?\]\(attached_image_{idx}\.(?:png|jpg|jpeg)\)", re.IGNORECASE)
                    enunciado_novo = pattern.sub(f"![Figura {idx}]({path_fig})", enunciado_novo)

                # Limpa qualquer attached_image remanescente
                enunciado_novo = re.sub(r"!\[.*?\]\(attached_image_\d+\.(?:png|jpg|jpeg)\)", "", enunciado_novo).strip()

                try:
                    client.table("questoes").update({
                        "figura_path": figura_principal,
                        "enunciado": enunciado_novo
                    }).eq("id", q["id"]).execute()
                    atualizadas += 1
                except Exception as err_up:
                    print(f"[!] Erro ao atualizar questão olímpica {q['id']}: {err_up}")

            pbar.update(1)

    print(f"[✓] Concluído: {atualizadas} questões olímpicas com figuras sincronizadas!\n")

def sincronizar_uploads_existentes():
    """Garante que qualquer imagem em frontend/public/uploads seja enviada ao Supabase Storage."""
    print("=" * 65)
    print("🚀 FASE 3: Sincronização da Pasta frontend/public/uploads -> Storage")
    print("=" * 65)

    uploads_dir = PUBLIC_DIR / "uploads"
    if not uploads_dir.exists():
        print("[!] Pasta uploads não encontrada.")
        return

    arquivos = [f for f in uploads_dir.rglob("*") if f.is_file() and f.suffix.lower() in [".png", ".jpg", ".jpeg", ".svg", ".webp"]]
    print(f"[*] {len(arquivos)} arquivos de imagem/vetor em uploads/.")

    enviados = 0
    for arq in tqdm(arquivos, desc="Subindo uploads para Storage", unit="arquivo"):
        rel_posix = arq.relative_to(PUBLIC_DIR).as_posix()
        # storage path será uploads/...
        with open(arq, "rb") as f:
            data = f.read()
        mime = "image/svg+xml" if arq.suffix.lower() == ".svg" else "image/png"
        if upload_to_supabase_storage(rel_posix, data, mime_type=mime):
            enviados += 1

    print(f"[✓] {enviados} arquivos de uploads sincronizados no Supabase Storage!\n")

if __name__ == "__main__":
    sincronizar_fuvest_unicamp()
    sincronizar_olimpiadas_mathnet()
    sincronizar_uploads_existentes()
    print("✨ TODAS AS IMAGENS FORAM EXTRAÍDAS, NORMALIZADAS E SINCRONIZADAS COM SUCESSO!")
