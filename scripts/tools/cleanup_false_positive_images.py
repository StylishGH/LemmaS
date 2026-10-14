"""
Script de Limpeza de Falsos-Positivos de Imagens (Fórmulas Recortadas).
Detecta imagens minúsculas (fórmulas e frações recortadas do ENEM),
transcreve via Gemini Flash Lite para LaTeX puro ($...$),
injeta no corpo do enunciado e limpa a coluna figura_path.
"""

import os
import sys
import re
import json
import time
from pathlib import Path
from PIL import Image
from tqdm import tqdm
from dotenv import load_dotenv
from google import genai

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.database.db import get_supabase

load_dotenv(PROJECT_ROOT / "backend" / ".env")
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY não encontrada em backend/.env")

client = genai.Client(api_key=api_key)

def transcrever_formula_imagem(caminho_imagem: Path) -> str:
    """Usa Gemini Flash Lite para transcrever com precisão matemática a imagem para LaTeX."""
    try:
        img = Image.open(caminho_imagem)
        prompt = (
            "Transcreva com extremo rigor matemático a fórmula ou texto desta imagem para LaTeX. "
            "Se for uma fórmula ou fração curta, retorne delimitada por cifrões $...$. "
            "Se for uma equação em destaque, retorne $$...$$. "
            "NÃO inclua comentários, explicações, nem blocos de código com crases. "
            "Retorne APENAS o código LaTeX."
        )
        resp = client.models.generate_content(
            model="gemini-flash-lite-latest",
            contents=[img, prompt]
        )
        texto = resp.text.strip()
        # Remove eventuais blocos de código markdown que o modelo coloque
        texto = re.sub(r"^```(?:latex)?\s*", "", texto)
        texto = re.sub(r"\s*```$", "", texto)
        texto = texto.strip()
        if not texto.startswith("$"):
            texto = f"${texto}$"
        return texto
    except Exception as e:
        print(f"  [!] Erro ao transcrever {caminho_imagem.name}: {e}")
        return ""

def processar_limpeza_enem():
    supabase = get_supabase()
    enem_dir = PROJECT_ROOT / "data" / "sources" / "enem" / "processed"
    arquivos = sorted(enem_dir.glob("*/questoes.json"))
    
    total_modificadas = 0

    for arq in arquivos:
        ano = arq.parent.name
        with open(arq, "r", encoding="utf-8") as f:
            questoes = json.load(f)

        alterou_arquivo = False

        for q in questoes:
            figuras = q.get("figuras_todas", [])
            enunciado = q.get("enunciado", "")
            imgs_markdown = re.findall(r'!\[\]\((https://enem\.dev/[^)]+)\)', enunciado)

            if not imgs_markdown and not figuras:
                continue

            figuras_reais = []
            substituicoes = {}

            # Avalia cada imagem da questão
            for idx, fig_ref in enumerate(figuras):
                # Normaliza caminho local no disco
                p_local = fig_ref.lstrip("/")
                caminho_disco = PROJECT_ROOT / p_local
                if not caminho_disco.exists():
                    caminho_disco = PROJECT_ROOT / "frontend" / "public" / p_local

                if not caminho_disco.exists():
                    continue

                try:
                    with Image.open(caminho_disco) as img:
                        w, h = img.size
                except Exception:
                    continue

                if w < 150 or h < 80:
                    # É fórmula ou falso-positivo! Transcreve para LaTeX
                    latex = transcrever_formula_imagem(caminho_disco)
                    if latex and idx < len(imgs_markdown):
                        url_md = imgs_markdown[idx]
                        substituicoes[url_md] = latex
                else:
                    figuras_reais.append(fig_ref)

            # Aplica substituições no enunciado
            if substituicoes:
                for url_md, latex in substituicoes.items():
                    tag_md = f"![]({url_md})"
                    enunciado = enunciado.replace(tag_md, latex)
                
                q["enunciado"] = enunciado
                if "enunciado_corpo" in q and q["enunciado_corpo"]:
                    corpo = q["enunciado_corpo"]
                    for url_md, latex in substituicoes.items():
                        tag_md = f"![]({url_md})"
                        corpo = corpo.replace(tag_md, latex)
                    q["enunciado_corpo"] = corpo

                q["figuras_todas"] = figuras_reais
                q["figura_path"] = figuras_reais[0] if figuras_reais else None
                alterou_arquivo = True
                total_modificadas += 1

                # Atualiza no Supabase em tempo real
                q_id_externo = q.get("id_externo")
                num = q.get("numero", 1)
                slug_militar = f"militar_enem_{ano}_mat_q{num:02d}"
                
                try:
                    supabase.table("questoes").update({
                        "enunciado": q["enunciado"],
                        "figura_path": q["figura_path"],
                    }).eq("mathnet_id", slug_militar).execute()
                except Exception as e:
                    # Tenta pelo id_externo original caso tenha sido esse
                    try:
                        supabase.table("questoes").update({
                            "enunciado": q["enunciado"],
                            "figura_path": q["figura_path"],
                        }).eq("mathnet_id", q_id_externo).execute()
                    except Exception as e2:
                        print(f"  [!] Erro ao atualizar Supabase para {q_id_externo}: {e2}")

                print(f"[✓] {q_id_externo} limpa: {len(substituicoes)} fórmulas transcritas | figura_path={q['figura_path']}")
                time.sleep(0.3)  # Rate limiting defensivo no Gemini

        if alterou_arquivo:
            with open(arq, "w", encoding="utf-8") as f:
                json.dump(questoes, f, indent=2, ensure_ascii=False)

    print(f"\n=======================================================")
    print(f" [✓] LIMPEZA CONCLUÍDA: {total_modificadas} questões aprimoradas!")
    print(f"=======================================================")

if __name__ == "__main__":
    processar_limpeza_enem()
