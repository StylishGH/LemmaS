"""
MathAI Engine: Vectorizador de Diagramas e Geometrias (PNG -> SVG Responsivo)
Reconstrói figuras geométricas e esquemas físicos de exames militares (ITA, IME, etc.)
em SVG limpo, semântico e responsivo (stroke="currentColor"), adaptado a temas dark/light.
"""

import os
import sys
import re
import json
import argparse
import xml.etree.ElementTree as ET
from pathlib import Path
from PIL import Image
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

PROMPT_VETORIZACAO = """Você é o motor de vetorização matemática MathAI Vectorizer.
Sua tarefa é reconstruir o diagrama matemático/físico desta imagem como um código SVG puro, limpo, geométrico e matematicamente preciso.

REGRAS OBRIGATÓRIAS DE SVG:
1. Retorne APENAS o código SVG (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="auto">...</svg>).
2. O SVG DEVE ser 100% responsivo a temas Claro e Escuro:
   - Use SEMPRE `stroke="currentColor"` para traçados, eixos e contornos (nunca preto #000 fixo).
   - Use `fill="none"` para fundos e polígonos abertos.
   - Para regiões hachuradas ou sombreadas, use `fill="currentColor" fill-opacity="0.12"`.
   - Para rótulos de texto e pontos de vértices, use `fill="currentColor"`.
3. Geometria e Proporções:
   - Use o enunciado da questão para garantir que as proporções geométricas (triângulos, círculos, raios, ângulos retos, tangências) sejam matematicamente exatas.
   - Utilize elementos semânticos: <line>, <circle>, <polygon>, <path>, <polyline>, <rect>.
   - Para eixos cartesianos ou vetores, inclua marcadores de seta (<marker id="arrow" ...>).
   - Centralize o desenho dentro do viewBox 0 0 500 500 com margem de segurança (40px).
4. Tipografia dos Vértices e Rótulos:
   - Use <text font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" text-anchor="middle" fill="currentColor">
   - Posicione letras de vértices (A, B, C, O, etc.) com offset claro para não sobrepor os traços.
5. Proibido:
   - NUNCA inclua tags <script>, estilos inline com cores fixas incompatíveis com dark mode, ou imagens raster incorporadas.
   - NUNCA inclua markdown com crases (```xml ou ```svg). Retorne texto puro começando com <svg e terminando com </svg>.
"""

def extrair_codigo_svg(texto_gerado: str) -> str:
    """Extrai e sanitiza o bloco SVG puro da resposta do modelo."""
    texto = texto_gerado.strip()
    texto = re.sub(r"^```(?:xml|svg)?\s*", "", texto)
    texto = re.sub(r"\s*```$", "", texto)
    match = re.search(r"(<svg[\s\S]*?</svg>)", texto, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return texto

def validar_svg(codigo_svg: str) -> bool:
    """Valida se o SVG gerado é um XML bem-formado e seguro."""
    try:
        root = ET.fromstring(codigo_svg)
        if not root.tag.endswith("svg"):
            return False
        # Verifica se não há tags script
        for elem in root.iter():
            if elem.tag.endswith("script"):
                return False
        return True
    except Exception as e:
        print(f"  [!] SVG XML inválido: {e}")
        return False

def vetorizar_questao(questao_dict: dict, salvar_db: bool = True) -> bool:
    """Processa a vetorização da figura de uma questão."""
    figura_path_rel = questao_dict.get("figura_path")
    if not figura_path_rel:
        return False

    p_limpo = figura_path_rel.lstrip("/")
    caminho_img = PROJECT_ROOT / p_limpo
    if not caminho_img.exists():
        caminho_img = PROJECT_ROOT / "frontend" / "public" / p_limpo

    if not caminho_img.exists():
        print(f"  [!] Imagem não encontrada no disco: {figura_path_rel}")
        return False

    # Se já for SVG, pula
    if caminho_img.suffix.lower() == ".svg":
        print(f"  [-] Já está em SVG: {figura_path_rel}")
        return False

    try:
        img_original = Image.open(caminho_img)
    except Exception as e:
        print(f"  [!] Erro ao abrir imagem: {e}")
        return False

    enunciado = questao_dict.get("enunciado_corpo") or questao_dict.get("enunciado", "")
    id_ext = questao_dict.get("id_externo", "questao")
    print(f"[*] Vetorizando {id_ext} ({caminho_img.name})...")

    prompt_contexto = f"{PROMPT_VETORIZACAO}\n\nENUNCIADO DA QUESTÃO:\n{enunciado}"

    try:
        resp = client.models.generate_content(
            model="gemini-flash-lite-latest",
            contents=[img_original, prompt_contexto]
        )
        codigo_svg = extrair_codigo_svg(resp.text)
    except Exception as e:
        print(f"  [!] Erro na chamada do Gemini: {e}")
        return False

    if not validar_svg(codigo_svg):
        print(f"  [!] Falha na validação do SVG para {id_ext}.")
        return False

    # Grava o SVG no disco ao lado do PNG original
    caminho_svg = caminho_img.with_name(f"{caminho_img.stem}_vector.svg")
    with open(caminho_svg, "w", encoding="utf-8") as f:
        f.write(codigo_svg)

    # Caminho público relativo
    figura_svg_rel = f"/data/imagens/{caminho_img.parts[-3]}/{caminho_img.parts[-2]}/{caminho_svg.name}"
    questao_dict["figura_path"] = figura_svg_rel

    if salvar_db:
        supabase = get_supabase()
        mathnet_id = questao_dict.get("mathnet_id") or id_ext
        try:
            supabase.table("questoes").update({
                "figura_path": figura_svg_rel
            }).eq("mathnet_id", mathnet_id).execute()
        except Exception as e:
            print(f"  [!] Erro ao atualizar Supabase: {e}")

    print(f"  [✓] Vetorizado com sucesso: {figura_svg_rel}")
    return True

def main():
    parser = argparse.ArgumentParser(description="MathAI Vectorizer (PNG -> SVG Responsivo)")
    parser.add_argument("--banca", type=str, default="ita", help="Banca alvo (ita, ime, etc.)")
    parser.add_argument("--ano", type=str, default=None, help="Ano específico")
    parser.add_argument("--numero", type=int, default=None, help="Número da questão específica")
    parser.add_argument("--limit", type=int, default=5, help="Quantidade máxima a processar (default: 5)")
    args = parser.parse_args()

    sources_dir = PROJECT_ROOT / "data" / "sources" / args.banca.lower() / "processed"
    if not sources_dir.exists():
        print(f"[!] Diretório não encontrado: {sources_dir}")
        return

    padrao = f"{args.ano}/questoes.json" if args.ano else "*/questoes.json"
    arquivos = sorted(sources_dir.glob(padrao))

    processadas = 0
    for arq in arquivos:
        if processadas >= args.limit:
            break

        with open(arq, "r", encoding="utf-8") as f:
            questoes = json.load(f)

        alterou = False
        for q in questoes:
            if processadas >= args.limit:
                break

            if args.numero and q.get("numero") != args.numero:
                continue

            fp = q.get("figura_path")
            if not fp or fp.endswith(".svg"):
                continue

            # Prioriza questões de Geometria/Física
            topico = q.get("topico", "").lower()
            if any(t in topico for t in ["geometria", "trigonometria", "plana", "espacial", "óptica", "eletricidade"]):
                sucesso = vetorizar_questao(q, salvar_db=True)
                if sucesso:
                    alterou = True
                    processadas += 1

        if alterou:
            with open(arq, "w", encoding="utf-8") as f:
                json.dump(questoes, f, indent=2, ensure_ascii=False)

    print(f"\n=======================================================")
    print(f" [✓] VETORIZAÇÃO FINALIZADA: {processadas} figuras convertidas para SVG!")
    print(f"=======================================================")

if __name__ == "__main__":
    main()
