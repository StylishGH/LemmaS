"""
MathAI Engine & LEMMAS — Linha de Montagem Híbrida 01 Local (Gemini + NVIDIA NIM + VTracer)
Arquitetura Híbrida de Alta Precisão:
1. PyMuPDF (Local): Renderiza páginas a 250-300 DPI e corta 6% de bordas (anti-marca d'água).
2. Gemini Flash Lite (Google): Visão pura, OCR com delimitadores LaTeX e BoundingBox [0-1000] das figuras.
3. OpenCV + VTracer (Local): Denoising Lanczos4, binarização adaptativa e vetorização óptica em SVG real.
4. NVIDIA NIM (DeepSeek / Nemotron): Classificação estrita nas 10 matérias do frontend e resolução autoral didática.
5. Supabase Storage: Upload e entrega global via CDN para prevenir 404 em produção na Vercel.
"""

import os
import sys
import json
import argparse
import tempfile
from pathlib import Path
from typing import List, Optional, Literal
import fitz  # PyMuPDF
import cv2
import numpy as np
from PIL import Image
import vtracer
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from google import genai
from google.genai import types
from openai import OpenAI

# Garante suporte a UTF-8 no Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.database.db import get_supabase

# Carrega credenciais do backend ou raiz
load_dotenv(PROJECT_ROOT / "backend" / ".env")
load_dotenv(PROJECT_ROOT / ".env")

GEMINI_KEY = os.getenv("GEMINI_API_KEY")
NVIDIA_KEY = os.getenv("NVIDIA_API_KEY") or os.getenv("NVIDIA_NIM_API_KEY")

if not GEMINI_KEY:
    raise ValueError("GEMINI_API_KEY não configurada em backend/.env")
if not NVIDIA_KEY:
    raise ValueError("NVIDIA_API_KEY não configurada em backend/.env")

# Clientes
gemini_client = genai.Client(api_key=GEMINI_KEY)
nim_client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=NVIDIA_KEY,
    timeout=15.0
)

# ==========================================
# 1. SCHEMAS DE VALIDAÇÃO PYDANTIC
# (Sem valores default para compatibilidade estrita com a Google GenAI API)
# ==========================================

class BoundingBox(BaseModel):
    pagina: int = Field(description="Página do lote (1, 2 ou 3)")
    ymin: int = Field(description="0 a 1000")
    xmin: int = Field(description="0 a 1000")
    ymax: int = Field(description="0 a 1000")
    xmax: int = Field(description="0 a 1000")

class Alternativa(BaseModel):
    letra: str
    texto: str

class QuestaoBrutaVisao(BaseModel):
    numero: int
    enunciado_latex: str = Field(description="Enunciado fiel em LaTeX ($...$ ou $$...$$). Moeda sempre como \\text{R\\$ }.")
    possui_figura_no_enunciado: bool = Field(description="True APENAS se houver figura que pertence ao enunciado/alternativas originais.")
    bbox_figura_enunciado: BoundingBox
    alternativas: List[Alternativa]
    gabarito: str
    resolucao_referencia: str = Field(description="Rascunho de resolução presente no documento, se houver.")

class LoteVisao(BaseModel):
    questoes: List[QuestaoBrutaVisao]

MATERIAS_VALIDAS = [
    "Álgebra", "Geometria Plana", "Geometria Espacial", "Trigonometria",
    "Geometria Analítica", "Probabilidade e Combinatória", "Álgebra Linear",
    "Cálculo", "Matemática Básica", "Polinômios e Complexos"
]

# ==========================================
# 2. PRÉ-PROCESSAMENTO, CORTE E VETORIZAÇÃO SVG
# ==========================================

def renderizar_pagina_sem_marca_dagua(page: fitz.Page, dpi: int = 250) -> Image.Image:
    """Corta 6% do topo e rodapé para eliminar cabeçalhos/links de terceiros."""
    rect = page.rect
    margem_y = rect.height * 0.06
    clip_limpo = fitz.Rect(rect.x0, rect.y0 + margem_y, rect.x1, rect.y1 - margem_y)
    pix = page.get_pixmap(dpi=dpi, clip=clip_limpo, alpha=False)
    return Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

def recortar_e_converter_svg_limpo(
    img_pagina: Image.Image,
    bbox: BoundingBox,
    caminho_svg: Path
) -> bool:
    """Recorta a figura em alta definição, binariza com OpenCV e vetoriza via VTracer."""
    caminho_svg.parent.mkdir(parents=True, exist_ok=True)
    largura, altura = img_pagina.size

    left = max(0, int((bbox.xmin / 1000.0) * largura) - 8)
    top = max(0, int((bbox.ymin / 1000.0) * altura) - 8)
    right = min(largura, int((bbox.xmax / 1000.0) * largura) + 8)
    bottom = min(altura, int((bbox.ymax / 1000.0) * altura) + 8)

    if right <= left or bottom <= top:
        return False

    crop_pil = img_pagina.crop((left, top, right, bottom))

    # Restauração OpenCV: Lanczos4 2x + Denoising preservando áreas sombreadas
    img_np = np.array(crop_pil.convert("L"))
    h, w = img_np.shape
    upscaled = cv2.resize(img_np, (w * 2, h * 2), interpolation=cv2.INTER_LANCZOS4)
    denoised = cv2.fastNlMeansDenoising(upscaled, None, h=14, templateWindowSize=7, searchWindowSize=21)

    restaurada = denoised.copy()
    restaurada[denoised > 225] = 255  # Fundo branco puro
    restaurada[denoised < 85] = 0     # Traços e textos pretos firmes

    img_rgb = cv2.cvtColor(restaurada, cv2.COLOR_GRAY2RGB)
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp_png = tmp.name
        cv2.imwrite(tmp_png, img_rgb)

    try:
        vtracer.convert_image_to_svg_py(
            tmp_png,
            str(caminho_svg),
            colormode="color",
            hierarchical="stacked",
            mode="spline",
            filter_speckle=6,
            color_precision=6,
            layer_difference=32,
            path_precision=3
        )
        return True
    except Exception as e:
        print(f"  [!] Falha no VTracer: {e}")
        return False
    finally:
        if os.path.exists(tmp_png):
            os.remove(tmp_png)

def upload_para_supabase_storage(caminho_arquivo: Path, path_remoto: str) -> Optional[str]:
    """Faz upload para o bucket público 'questoes-imagens' do Supabase Storage."""
    try:
        supabase = get_supabase()
        with open(caminho_arquivo, "rb") as f:
            conteudo = f.read()

        content_type = "image/svg+xml" if caminho_arquivo.suffix.lower() == ".svg" else "image/png"
        supabase.storage.from_("questoes-imagens").upload(
            path_remoto,
            conteudo,
            file_options={"content-type": content_type, "upsert": "true"}
        )
        public_url = supabase.storage.from_("questoes-imagens").get_public_url(path_remoto)
        return public_url
    except Exception as e:
        print(f"  [!] Erro no upload Supabase Storage: {e}")
        return None

# ==========================================
# 3. ESTÁGIO NVIDIA NIM: CLASSIFICAÇÃO + RESOLUÇÃO AUTORAL
# ==========================================

def enriquecer_questao_via_nim(questao: QuestaoBrutaVisao) -> dict:
    """Usa o Nemotron-3 Super / DeepSeek no NVIDIA NIM para classificação e resolução."""
    prompt_nim = f"""Você é o tutor especialista do LEMMAS.
Analise a questão e retorne EXATAMENTE um objeto JSON válido:
{{
  "materia": (escolha EXATAMENTE UMA entre {json.dumps(MATERIAS_VALIDAS, ensure_ascii=False)}),
  "topico": "Nome pedagógico do assunto específico",
  "dificuldade": "Fácil" | "Média" | "Difícil",
  "resolucao_autoral_latex": "Resolução passo a passo detalhada e autoral em LaTeX ($...$ e $$...$$)"
}}

Enunciado: {questao.enunciado_latex}
Gabarito: {questao.gabarito}
Rascunho de referência lógica: {questao.resolucao_referencia or "Resolva passo a passo."}
"""

    modelos_nim = [
        "nvidia/nemotron-3-super-120b-a12b",
        "nvidia/nemotron-4-340b-instruct"
    ]

    for model_name in modelos_nim:
        try:
            resp = nim_client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": prompt_nim}],
                temperature=0.1,
                max_tokens=2500,
                response_format={"type": "json_object"}
            )
            raw_content = resp.choices[0].message.content
            if raw_content:
                return json.loads(raw_content)
        except Exception as e:
            print(f"  [!] NIM ({model_name}) falhou: {e}. Tentando fallback...")
            continue

    # Fallback seguro caso todos os modelos NIM sofram indisponibilidade pontual
    return {
        "materia": "Álgebra",
        "topico": "Geral",
        "dificuldade": "Média",
        "resolucao_autoral_latex": None
    }

# ==========================================
# 4. ORQUESTRADOR DO PIPELINE POR PROVA
# ==========================================

def processar_pdf_hibrido(
    caminho_pdf: Path,
    banca: str,
    ano: int,
    limite_paginas: Optional[int] = None,
    sincronizar_db: bool = True
):
    banca_slug = banca.lower().replace(" ", "_")
    out_json = PROJECT_ROOT / "data" / "sources" / banca_slug / "processed" / str(ano) / "questoes.json"
    img_dir = PROJECT_ROOT / "data" / "imagens" / banca_slug / str(ano)

    print(f"\n=======================================================")
    print(f"[*] INICIANDO LINHA DE MONTAGEM HÍBRIDA 01 (LOCAL)")
    print(f"    Banca: {banca.upper()} | Ano: {ano}")
    print(f"    PDF: {caminho_pdf.name}")
    print(f"=======================================================\n")

    doc = fitz.open(caminho_pdf)
    total_pags = len(doc) if not limite_paginas else min(len(doc), limite_paginas)
    print(f"[*] Renderizando {total_pags} páginas sem marca d'água a 250 DPI...")
    paginas_img = [renderizar_pagina_sem_marca_dagua(doc[i], dpi=250) for i in range(total_pags)]
    doc.close()

    questoes_finais = []
    TAM_LOTE = 3

    for i in range(0, len(paginas_img), TAM_LOTE):
        lote = paginas_img[i : i + TAM_LOTE]
        conteudos = []
        for idx_local, img in enumerate(lote, start=1):
            conteudos.append(f"--- PÁGINA {idx_local} DO LOTE ---")
            conteudos.append(img)

        conteudos.append("""
        Extraia todas as questões de Matemática destas páginas.
        REGRAS:
        1. Em 'possui_figura_no_enunciado', marque True APENAS se a figura pertencer ao enunciado/alternativas originais (NUNCA marque gráficos que estejam dentro da RESOLUÇÃO).
        2. Se 'possui_figura_no_enunciado' for True, informe em 'bbox_figura_enunciado' as coordenadas exatas da figura [ymin, xmin, ymax, xmax] de 0 a 1000 e a 'pagina' (1, 2 ou 3 do lote). Se não houver figura, preencha zeros.
        3. Use \\text{R\\$ } para valores monetários para preservar delimitadores KaTeX.
        """)

        print(f"[*] [Gemini Flash Lite] Extraindo páginas {i+1} a {min(i+TAM_LOTE, len(paginas_img))}...")
        try:
            resp_visao = gemini_client.models.generate_content(
                model="gemini-flash-lite-latest",
                contents=conteudos,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=LoteVisao,
                    temperature=0.0,
                ),
            )
        except Exception as e:
            print(f"  [!] Erro no Gemini Flash Lite: {e}")
            continue

        if not resp_visao.parsed:
            print("  [!] Resposta vazia ou não parseada pelo Gemini.")
            continue

        for q in resp_visao.parsed.questoes:
            caminhos_svg = []
            url_storage = None

            # Estágio 2: Recorte e Vetorização Óptica (VTracer)
            tem_bbox_valida = (
                q.possui_figura_no_enunciado and 
                q.bbox_figura_enunciado.xmax > q.bbox_figura_enunciado.xmin and 
                q.bbox_figura_enunciado.ymax > q.bbox_figura_enunciado.ymin
            )

            if tem_bbox_valida:
                pag_idx = q.bbox_figura_enunciado.pagina - 1
                if 0 <= pag_idx < len(lote):
                    nome_svg = f"{banca_slug}_{ano}_q{q.numero:02d}_fig1.svg"
                    caminho_svg = img_dir / nome_svg
                    print(f"  [>] Vetorizando figura Q{q.numero:02d} com VTracer...")
                    if recortar_e_converter_svg_limpo(lote[pag_idx], q.bbox_figura_enunciado, caminho_svg):
                        rel_path = f"/data/imagens/{banca_slug}/{ano}/{nome_svg}"
                        caminhos_svg.append(rel_path)
                        # Upload para o Supabase Storage CDN
                        path_remoto = f"{banca_slug}/{ano}/{nome_svg}"
                        url_storage = upload_para_supabase_storage(caminho_svg, path_remoto)

            # Estágio 3: Enriquecimento via NVIDIA NIM
            print(f"  [>] Enriquecendo Q{q.numero:02d} via NVIDIA NIM...")
            metadados_nim = enriquecer_questao_via_nim(q)

            # Formata enunciado completo com alternativas para o padrão canônico LEMMAS
            texto_alternativas = ""
            if q.alternativas:
                texto_alternativas = "\n\n" + "\n".join([f"({a.letra.lower()}) {a.texto}" for a in q.alternativas])
            enunciado_completo = q.enunciado_latex + texto_alternativas

            figura_final = url_storage or (caminhos_svg[0] if caminhos_svg else None)
            mathnet_id = f"militar_{banca_slug}_{ano}_q{q.numero:02d}"

            item_dict = {
                "mathnet_id": mathnet_id,
                "id_externo": mathnet_id,
                "banca": banca.upper(),
                "ano": ano,
                "numero": q.numero,
                "materia": metadados_nim.get("materia", "Álgebra"),
                "topico": metadados_nim.get("topico", "Geral"),
                "subtopico": metadados_nim.get("topico", "Geral"),
                "dificuldade": 2 if metadados_nim.get("dificuldade") == "Fácil" else (4 if metadados_nim.get("dificuldade") == "Difícil" else 3),
                "tipo": "objetiva" if q.alternativas else "discursiva",
                "enunciado": enunciado_completo,
                "enunciado_corpo": q.enunciado_latex,
                "alternativas": [a.model_dump() for a in q.alternativas] if q.alternativas else None,
                "gabarito": q.gabarito.lower() if q.gabarito else None,
                "solucao": metadados_nim.get("resolucao_autoral_latex"),
                "figura_path": figura_final,
                "figuras_todas": [figura_final] if figura_final else [],
                "tipo_material": "Prova Oficial",
                "etapa": "1ª Fase"
            }
            questoes_finais.append(item_dict)

            # Upsert idempotente no Supabase
            if sincronizar_db:
                try:
                    supabase = get_supabase()
                    supabase.table("questoes").upsert({
                        "mathnet_id": mathnet_id,
                        "banca": banca.upper(),
                        "ano": ano,
                        "materia": item_dict["materia"],
                        "topico": item_dict["topico"],
                        "subtopico": item_dict["subtopico"],
                        "dificuldade": item_dict["dificuldade"],
                        "tipo": item_dict["tipo"],
                        "enunciado": enunciado_completo,
                        "gabarito": item_dict["gabarito"],
                        "figura_path": figura_final,
                        "solucao": item_dict["solucao"],
                        "tipo_material": "Prova Oficial",
                        "etapa": "1ª Fase"
                    }, on_conflict="mathnet_id").execute()
                except Exception as e:
                    print(f"  [!] Erro ao sincronizar questão com o Supabase: {e}")

            print(f"  [✓] {banca.upper()} {ano} - Q{q.numero:02d} ({item_dict['materia']} &bull; {item_dict['topico']}) salva!")

    out_json.parent.mkdir(parents=True, exist_ok=True)
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(questoes_finais, f, ensure_ascii=False, indent=2)

    print(f"\n[✓] PROVA CONCLUÍDA: {len(questoes_finais)} questões processadas e salvas em {out_json}!")

def main():
    parser = argparse.ArgumentParser(description="Pipeline 01: Linha de Montagem Híbrida Local (Gemini + NIM + VTracer)")
    parser.add_argument("--pdf", type=str, required=True, help="Caminho para o PDF da prova")
    parser.add_argument("--banca", type=str, required=True, help="Nome da banca (afa, ita, ime, etc.)")
    parser.add_argument("--ano", type=int, required=True, help="Ano da prova")
    parser.add_argument("--limite-paginas", type=int, default=None, help="Limite de páginas para teste rápido")
    args = parser.parse_args()

    caminho_pdf = Path(args.pdf)
    if not caminho_pdf.exists():
        caminho_pdf = PROJECT_ROOT / args.pdf
    if not caminho_pdf.exists():
        print(f"[!] PDF não encontrado: {args.pdf}")
        sys.exit(1)

    processar_pdf_hibrido(
        caminho_pdf=caminho_pdf,
        banca=args.banca,
        ano=args.ano,
        limite_paginas=args.limite_paginas,
        sincronizar_db=True
    )

if __name__ == "__main__":
    main()
