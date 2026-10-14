"""
Aspirador de Datasets em Massa para a Plataforma LEMMAS (MathAI Engine)
Coleta milhares de questões de Matemática e Física já digitadas com gabarito e imagens:
1. API ENEM.DEV (api.enem.dev) - ENEM 2015 a 2023 (~1.000 questões com figuras)
2. Hugging Face BLUEX (portuguese-benchmark-datasets/BLUEX) - FUVEST (USP) e UNICAMP (~400 questões)

Gera a saída 100% compatível com a Staging Area do LEMMAS:
data/sources/<banca>/processed/<ano>/questoes.json e data/imagens/<banca>/<ano>/
"""

import os
import sys
import json
import time
import requests
from pathlib import Path
from typing import Dict, List, Any
from datasets import load_dataset
from PIL import Image

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

ROOT_DIR = Path(__file__).resolve().parents[2]

# ==============================================================================
# FONTE 1: API ENEM.DEV (Matemática + Física)
# ==============================================================================

def baixar_enem_api(anos=range(2015, 2024)):
    """Baixa questões de Matemática e Ciências da Natureza do ENEM direto da API pública."""
    print("\n" + "=" * 60)
    print("[*] Iniciando coleta da API pública do ENEM (api.enem.dev)...")
    print("=" * 60)
    base_url = "https://api.enem.dev/v1/exams"

    for ano in anos:
        out_json = ROOT_DIR / "data" / "sources" / "enem" / "processed" / str(ano) / "questoes.json"
        img_dir = ROOT_DIR / "data" / "imagens" / "enem" / str(ano)

        if out_json.exists() and out_json.stat().st_size > 100:
            print(f"[-] ENEM {ano} já processado em {out_json.relative_to(ROOT_DIR)}. Pulando...")
            continue

        questoes_ano = []
        offset = 0
        limit = 50

        print(f"[*] Baixando ENEM {ano}...")

        while True:
            url = f"{base_url}/{ano}/questions?limit={limit}&offset={offset}"
            try:
                resp = requests.get(url, timeout=15)
            except Exception as e:
                print(f"  [!] Erro de conexão em ENEM {ano} (offset {offset}): {e}")
                break

            if resp.status_code != 200:
                print(f"  [!] HTTP {resp.status_code} na API do ENEM ({url})")
                break

            dados = resp.json()
            lista = dados.get("questions", [])
            if not lista:
                break

            for q in lista:
                disciplina_raw = q.get("discipline", "")
                # Coleta Matemática
                if disciplina_raw != "matematica":
                    continue

                num = q.get("index", 0)
                contexto = (q.get("context", "") or "").strip()
                intro_alt = (q.get("alternativesIntroduction", "") or "").strip()

                corpo_enunciado = f"{contexto}\n\n{intro_alt}".strip() if intro_alt else contexto

                # Baixa imagens se houver no enunciado
                arquivos_urls = q.get("files", [])
                caminhos_imgs = []
                for idx_img, img_url in enumerate(arquivos_urls, start=1):
                    try:
                        img_dir.mkdir(parents=True, exist_ok=True)
                        ext = img_url.split(".")[-1].split("?")[0][:4] or "png"
                        if ext not in ["png", "jpg", "jpeg", "webp", "gif"]:
                            ext = "png"
                        nome_img = f"enem_{ano}_q{num:03d}_fig{idx_img}.{ext}"
                        caminho_fisico = img_dir / nome_img

                        if not caminho_fisico.exists():
                            r_img = requests.get(img_url, timeout=10)
                            if r_img.status_code == 200:
                                with open(caminho_fisico, "wb") as f:
                                    f.write(r_img.content)

                        caminhos_imgs.append(f"/data/imagens/enem/{ano}/{nome_img}")
                    except Exception:
                        pass

                alternativas = []
                for alt in q.get("alternatives", []):
                    letra = alt.get("letter", "").upper()
                    texto = alt.get("text", "") or "[Ver figura anexa]"
                    alternativas.append({
                        "letra": letra,
                        "texto": texto
                    })

                # Compila o enunciado canônico do LEMMAS (corpo + alternativas)
                enunciado_compilado = corpo_enunciado
                if alternativas:
                    enunciado_compilado += "\n\n"
                    for a in alternativas:
                        enunciado_compilado += f"({a['letra']}) {a['texto']}\n"
                    enunciado_compilado = enunciado_compilado.strip()

                figura_principal = caminhos_imgs[0] if caminhos_imgs else None

                questoes_ano.append({
                    "id_externo": f"enem_{ano}_mat_q{num:03d}",
                    "banca": "ENEM",
                    "ano": ano,
                    "numero": num,
                    "materia": "Matemática",
                    "topico": "Matemática Básica",
                    "subtopico": "ENEM Oficial",
                    "tipo": "objetiva",
                    "enunciado": enunciado_compilado,
                    "enunciado_corpo": corpo_enunciado,
                    "alternativas": alternativas,
                    "figura_path": figura_principal,
                    "figuras_todas": caminhos_imgs,
                    "gabarito": q.get("correctAlternative", "").upper(),
                    "estrategias_esperadas": json.dumps(["Interpretação de Texto Matemático", "Competências ENEM"], ensure_ascii=False),
                    "arquivo_origem": f"api.enem.dev/{ano}"
                })

            if not dados.get("metadata", {}).get("hasMore", False):
                break
            offset += limit
            time.sleep(1.0)  # Cortesia de Rate Limit

        if questoes_ano:
            out_json.parent.mkdir(parents=True, exist_ok=True)
            with open(out_json, "w", encoding="utf-8") as f:
                json.dump(questoes_ano, f, ensure_ascii=False, indent=2)
            print(f"[✓] ENEM {ano}: {len(questoes_ano)} questões de Matemática salvas com sucesso!")

# ==============================================================================
# FONTE 2: BLUEX (FUVEST + UNICAMP no Hugging Face)
# ==============================================================================

def baixar_bluex_fuvest_unicamp():
    """Puxa questões de Matemática e Física da FUVEST (USP) e UNICAMP do benchmark BLUEX."""
    print("\n" + "=" * 60)
    print("[*] Baixando dataset BLUEX (FUVEST / UNICAMP) do Hugging Face...")
    print("=" * 60)

    try:
        ds = load_dataset("portuguese-benchmark-datasets/BLUEX", split="questions")
    except Exception as e:
        print(f"[!] Falha ao carregar BLUEX do Hugging Face: {e}")
        return

    print(f"[*] Dataset carregado com {len(ds)} questões totais.")

    agrupado: Dict[tuple, List[Dict[str, Any]]] = {}

    for item in ds:
        subjects = [s.lower() for s in (item.get("subject") or [])]

        is_mat = any("mat" in s for s in subjects)
        is_fis = any("phys" in s or "fís" in s for s in subjects)

        if not (is_mat or is_fis):
            continue

        disciplina = "Matemática" if is_mat else "Física"
        disc_slug = "mat" if is_mat else "fis"

        # ID padrão: "USP_2023_35" ou "UNICAMP_2022_12"
        raw_id = item.get("id", "USP_2023_01")
        partes = raw_id.split("_")
        sigla_banca = partes[0].upper()
        banca_nome = "FUVEST" if sigla_banca in ["USP", "FUVEST"] else "UNICAMP"
        banca_slug = "fuvest" if sigla_banca in ["USP", "FUVEST"] else "unicamp"

        ano = int(partes[1]) if len(partes) > 1 and partes[1].isdigit() else 2023
        numero = int(item.get("number", 1))

        corpo_enunciado = item.get("question", "").strip()

        # Alternativas
        alternativas = []
        for alt_str in item.get("alternativas") or item.get("alternatives") or []:
            alt_clean = alt_str.strip()
            # "a) texto" ou "(a) texto"
            if alt_clean.startswith("(") and len(alt_clean) > 3:
                letra = alt_clean[1].upper()
                texto = alt_clean.split(")", 1)[-1].strip()
            elif ")" in alt_clean[:4]:
                letra = alt_clean.split(")", 1)[0].strip().upper()
                texto = alt_clean.split(")", 1)[-1].strip()
            else:
                letra = alt_clean[0].upper()
                texto = alt_clean[1:].strip()

            alternativas.append({"letra": letra, "texto": texto})

        # Compila enunciado com alternativas para a UI do LEMMAS
        enunciado_compilado = corpo_enunciado
        if alternativas:
            enunciado_compilado += "\n\n"
            for a in alternativas:
                enunciado_compilado += f"({a['letra']}) {a['texto']}\n"
            enunciado_compilado = enunciado_compilado.strip()

        # Registro
        q_dict = {
            "id_externo": f"{banca_slug}_{ano}_{disc_slug}_q{numero:02d}",
            "banca": banca_nome,
            "ano": ano,
            "numero": numero,
            "materia": disciplina,
            "topico": "Geral",
            "subtopico": f"Vestibular {banca_nome}",
            "tipo": "objetiva",
            "enunciado": enunciado_compilado,
            "enunciado_corpo": corpo_enunciado,
            "alternativas": alternativas,
            "figura_path": None,
            "figuras_todas": [],
            "gabarito": (item.get("answer") or "").upper(),
            "estrategias_esperadas": json.dumps([f"Raciocínio {banca_nome}", disciplina], ensure_ascii=False),
            "arquivo_origem": "huggingface:portuguese-benchmark-datasets/BLUEX"
        }

        chave = (banca_slug, str(ano))
        agrupado.setdefault(chave, []).append(q_dict)

    # Salva na estrutura data/sources/<banca>/processed/<ano>/questoes.json
    for (b_slug, ano_str), lista_q in agrupado.items():
        out_path = ROOT_DIR / "data" / "sources" / b_slug / "processed" / ano_str / "questoes.json"
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(lista_q, f, ensure_ascii=False, indent=2)
        print(f"[✓] {b_slug.upper()} {ano_str}: {len(lista_q)} questões salvas em {out_path.relative_to(ROOT_DIR)}")

if __name__ == "__main__":
    # 1. Puxa FUVEST e UNICAMP do Hugging Face
    baixar_bluex_fuvest_unicamp()
    # 2. Puxa ENEM da API pública
    baixar_enem_api(anos=range(2018, 2024))
