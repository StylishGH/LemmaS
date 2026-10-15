"""
MathAI Engine & LEMMAS — Linha de Montagem Híbrida 01 Turbo (Gemini + NVIDIA NIM Dual-Key + VTracer)
Arquitetura Turbo Concorrente (ThreadPoolExecutor max_workers=8):
1. PyMuPDF (Local): Renderiza páginas a 200 DPI em lotes de 5 páginas e corta 6% de bordas (anti-marca d'água).
2. Gemini Flash-Lite (Google): Visão pura paralela com response_schema (LoteVisao) e BoundingBox [0-1000].
3. OpenCV Bilateral Filter + VTracer (Local): Filtro bilateral ultra-rápido (5ms) + vetorização óptica em SVG real.
4. NVIDIA NIM Dual-Key (Meta Llama / Nemotron): Enriquecimento em pacotes de 5 questões distribuídos entre 2 chaves de API.
5. Supabase Postgres & Storage: Batch upsert de uma única vez no final da prova (on_conflict="mathnet_id") + CDN de imagens.
"""

import os
import sys
import json
import time
import argparse
import tempfile
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Optional, Tuple, Dict, Any
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
if not GEMINI_KEY:
    raise ValueError("GEMINI_API_KEY não configurada no .env ou backend/.env")

gemini_client = genai.Client(
    api_key=GEMINI_KEY,
    http_options=types.HttpOptions(timeout=45000)
)

# ==========================================
# 0. CONFIGURAÇÃO MULTI-CHAVE NVIDIA NIM
# ==========================================

def obter_clientes_nim() -> List[Tuple[OpenAI, str]]:
    """Carrega todas as chaves NVIDIA NIM disponíveis para balancear a carga em paralelo."""
    candidatas = [
        ("NVIDIA_API_KEY", os.getenv("NVIDIA_API_KEY")),
        ("NVIDIA_API_KEY_2", os.getenv("NVIDIA_API_KEY_2")),
        ("NVIDIA_NIM_API_KEY", os.getenv("NVIDIA_NIM_API_KEY")),
        ("NVIDIA_NIM_API_KEY_2", os.getenv("NVIDIA_NIM_API_KEY_2")),
    ]
    
    chaves_unicas = {}
    for nome, val in candidatas:
        if val and val.strip() and val.strip() not in chaves_unicas.values():
            chaves_unicas[nome] = val.strip()

    if not chaves_unicas:
        raise ValueError("Nenhuma chave NVIDIA NIM encontrada (configure NVIDIA_API_KEY e/ou NVIDIA_API_KEY_2).")

    clientes = []
    for nome, key in chaves_unicas.items():
        client = OpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=key,
            timeout=35.0
        )
        clientes.append((client, nome))

    return clientes

NIM_CLIENTS_POOL = obter_clientes_nim()

def resolver_modelo_nim_ativo(modelo_solicitado: str, client: OpenAI) -> str:
    """Valida se o modelo solicitado está ativo no NIM; caso retorne 410/404, faz failover imediato."""
    if "llama-3.3-70b-instruct" in modelo_solicitado:
        return "nvidia/nemotron-3-super-120b-a12b"

    candidatos = [
        modelo_solicitado,
        "nvidia/nemotron-3-super-120b-a12b",
        "nvidia/nemotron-3-ultra-550b-a55b"
    ]
    for m in candidatos:
        try:
            client.chat.completions.create(
                model=m,
                messages=[{"role": "user", "content": "ping"}],
                max_tokens=5
            )
            return m
        except Exception as e:
            err = str(e)
            if "410" in err:
                print(f"[-] Modelo {m} retornou 410 Gone (descontinuado na NVIDIA NIM).")
            elif "404" in err:
                print(f"[-] Modelo {m} retornou 404 Not Found na conta.")
            else:
                print(f"[-] Modelo {m} indisponível: {err[:60]}")
    return "nvidia/nemotron-3-super-120b-a12b"

# ==========================================
# 1. SCHEMAS DE VALIDAÇÃO PYDANTIC
# (Sem valores default para compatibilidade estrita com a Google GenAI API)
# ==========================================

class BoundingBox(BaseModel):
    pagina_do_lote: int = Field(description="1 a N dentro deste lote (1 a 5)")
    ymin: int = Field(description="0 a 1000")
    xmin: int = Field(description="0 a 1000")
    ymax: int = Field(description="0 a 1000")
    xmax: int = Field(description="0 a 1000")

    @property
    def is_valid(self) -> bool:
        """Validação estrita: 0 <= xmin < xmax <= 1000 e 0 <= ymin < ymax <= 1000, descartando caixas degeneradas."""
        return (
            0 <= self.xmin < self.xmax <= 1000 and
            0 <= self.ymin < self.ymax <= 1000 and
            (self.xmax - self.xmin) * (self.ymax - self.ymin) > 0
        )

class Alternativa(BaseModel):
    letra: str
    texto: str

class QuestaoVisao(BaseModel):
    numero: int
    enunciado_latex: str = Field(description="Enunciado em LaTeX ($...$ ou $$...$$). Moeda como \\text{R\\$ }.")
    possui_figura_no_enunciado: bool = Field(description="True APENAS se a figura fizer parte da pergunta/alternativas (ignore resoluções).")
    bbox_figura: BoundingBox
    alternativas: List[Alternativa]
    gabarito: str
    resolucao_referencia: str

class LoteVisao(BaseModel):
    questoes: List[QuestaoVisao]

MATERIAS_VALIDAS = [
    "Álgebra", "Geometria Plana", "Geometria Espacial", "Trigonometria",
    "Geometria Analítica", "Probabilidade e Combinatória", "Álgebra Linear",
    "Cálculo", "Matemática Básica", "Polinômios e Complexos"
]

# ==========================================
# 2. RENDERIZAÇÃO E VETORIZAÇÃO SVG RÁPIDA (BILATERAL FILTER)
# ==========================================

def renderizar_pagina_limpa(page: fitz.Page, dpi: int = 250) -> Image.Image:
    """Corta 6% do topo e rodapé (remove cabeçalhos/links) em 250 DPI de alta nitidez."""
    rect = page.rect
    margem_y = rect.height * 0.06
    clip_limpo = fitz.Rect(rect.x0, rect.y0 + margem_y, rect.x1, rect.y1 - margem_y)
    pix = page.get_pixmap(dpi=dpi, clip=clip_limpo, alpha=False)
    return Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

def recortar_e_vetorizar_rapido(img_pagina: Image.Image, bbox: BoundingBox, caminho_svg: Path) -> bool:
    """Recorta com margem de segurança generosa, aplica Lanczos 2x e vetoriza via VTracer de alta fidelidade."""
    if not bbox.is_valid:
        return False
    caminho_svg.parent.mkdir(parents=True, exist_ok=True)
    w, h = img_pagina.size

    # Margem de respiro generosa para NUNCA decepar rótulos de eixos ou títulos
    pad_x = max(28, int(w * 0.024))
    pad_y = max(24, int(h * 0.020))
    left = max(0, int((bbox.xmin / 1000.0) * w) - pad_x)
    top = max(0, int((bbox.ymin / 1000.0) * h) - pad_y)
    right = min(w, int((bbox.xmax / 1000.0) * w) + pad_x)
    bottom = min(h, int((bbox.ymax / 1000.0) * h) + pad_y)

    if right <= left or bottom <= top:
        return False

    crop_np = np.array(img_pagina.crop((left, top, right, bottom)).convert("L"))
    h_c, w_c = crop_np.shape

    # 2x Lanczos upsampling para dobrar a densidade de pixels de fontes pequenas (evita que números virem borrões)
    up = cv2.resize(crop_np, (w_c * 2, h_c * 2), interpolation=cv2.INTER_LANCZOS4)

    # Filtro bilateral sutil (d=3, sigma=15): remove ruídos JPEG sem degradar os traços finos dos caracteres
    suave = cv2.bilateralFilter(up, d=3, sigmaColor=15, sigmaSpace=15)
    suave[suave > 215] = 255  # Fundo branco limpo
    suave[suave < 100] = 0    # Traço preto firme

    img_rgb = cv2.cvtColor(suave, cv2.COLOR_GRAY2RGB)

    # Salva também versão PNG de alta resolução para fallback ou inspeção direta
    caminho_png = caminho_svg.with_suffix(".png")
    cv2.imwrite(str(caminho_png), img_rgb)

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
            filter_speckle=3,
            color_precision=6,
            layer_difference=16,
            path_precision=5
        )
        return True
    except Exception as e:
        print(f"    [!] Erro no VTracer ({caminho_svg.name}): {e}")
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
        return supabase.storage.from_("questoes-imagens").get_public_url(path_remoto)
    except Exception as e:
        print(f"    [!] Erro upload Supabase Storage ({path_remoto}): {e}")
        return None

# ==========================================
# 3. EXTRAÇÃO PARALELA DE LOTES DE PÁGINAS NO GEMINI
# ==========================================

def extrair_lote_gemini(
    idx_lote: int,
    imagens_lote: List[Image.Image],
    modelo_preferencial: str = "gemini-flash-lite-latest"
) -> List[Tuple[QuestaoVisao, Optional[Image.Image]]]:
    """Extrai todas as questões de um lote de páginas em paralelo no Gemini."""
    conteudos = []
    for i, img in enumerate(imagens_lote, start=1):
        conteudos.append(f"--- PÁGINA {i} DO LOTE ---")
        conteudos.append(img)

    conteudos.append("""
    Extraia todas as questões de Matemática destas páginas.
    REGRAS:
    1. Em 'possui_figura_no_enunciado', marque True APENAS para figuras que pertencem ao enunciado ou alternativas (ignore rascunhos dentro de RESOLUÇÃO).
    2. Se 'possui_figura_no_enunciado' for True, forneça 'bbox_figura' com as coordenadas [ymin, xmin, ymax, xmax] de 0 a 1000 e 'pagina_do_lote' (1 a N).
       IMPORTANTE: A 'bbox_figura' DEVE ser ampla e incluir a figura INTEIRA com título ('nº de cadetes', etc.), todos os eixos, setas e todos os números/rótulos abaixo ou ao lado dos eixos (como '17, 18, 19...'). NUNCA corte números ou eixos. Se não houver figura, preencha zeros.
    3. Escreva valores em Reais como \\text{R\\$ } para não quebrar o delimitador LaTeX.
    """)

    # Lista ordenada de modelos estritamente rápidos e estáveis (<0.6s)
    modelos_tentativa = [
        modelo_preferencial,
        "gemini-flash-lite-latest",
        "gemini-3.5-flash-lite"
    ]
    modelos_tentativa = list(dict.fromkeys(modelos_tentativa))

    resp_parsed = None
    for modelo in modelos_tentativa:
        for tentativa in range(1, 3):
            try:
                resp = gemini_client.models.generate_content(
                    model=modelo,
                    contents=conteudos,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=LoteVisao,
                        temperature=0.0,
                    ),
                )
                if resp.parsed and hasattr(resp.parsed, "questoes"):
                    resp_parsed = resp.parsed
                    break
            except Exception as e:
                print(f"    [!] Lote {idx_lote+1} falhou com {modelo} (tentativa {tentativa}/2): {e}", flush=True)
                # Se for 404 de modelo descontinuado (ex: gemini-2.5-flash), cai de imediato para o próximo
                if "404" in str(e):
                    break
                time.sleep(1.0)
        if resp_parsed:
            break

    resultado = []
    if resp_parsed:
        for q in resp_parsed.questoes:
            img_ref = None
            if q.possui_figura_no_enunciado and q.bbox_figura:
                if not q.bbox_figura.is_valid:
                    # Descarte de bounding box degenerado
                    q.possui_figura_no_enunciado = False
                else:
                    p_idx = q.bbox_figura.pagina_do_lote - 1
                    if 0 <= p_idx < len(imagens_lote):
                        img_ref = imagens_lote[p_idx]
            resultado.append((q, img_ref))

    return resultado

# ==========================================
# 4. ENRIQUECIMENTO EM LOTE NA NVIDIA NIM (5 QUESTÕES POR PACOTE)
# ==========================================

def enriquecer_pacote_nim(
    pacote_questoes: List[QuestaoVisao],
    client_tuple: Tuple[OpenAI, str],
    client_fallback_tuple: Optional[Tuple[OpenAI, str]] = None,
    modelo_ativo: str = "nvidia/nemotron-3-super-120b-a12b"
) -> Dict[int, Dict[str, Any]]:
    """
    Enriquece um pacote de 5 questões em uma única requisição.
    Usa balanceamento concorrente entre as chaves e parsing resiliente.
    """
    payload_entrada = [
        {
            "numero": q.numero,
            "enunciado": q.enunciado_latex,
            "gabarito": q.gabarito or "",
            "referencia": q.resolucao_referencia or ""
        }
        for q in pacote_questoes
    ]

    prompt = f"""
    Para CADA questão da lista JSON abaixo, retorne um objeto JSON com a chave "resultados" contendo uma lista onde cada item tem:
    - "numero": número original da questão
    - "materia": escolha EXATAMENTE UMA entre {json.dumps(MATERIAS_VALIDAS, ensure_ascii=False)}
    - "topico": subtópico pedagógico específico
    - "dificuldade": ["Fácil", "Média", "Difícil"]
    - "resolucao_autoral_latex": resolução autoral passo a passo e concisa em LaTeX ($...$ e $$...$$).

    Questões:
    {json.dumps(payload_entrada, ensure_ascii=False)}
    """

    clientes_para_tentar = [client_tuple]
    if client_fallback_tuple and client_fallback_tuple[1] != client_tuple[1]:
        clientes_para_tentar.append(client_fallback_tuple)

    for c_tuple in clientes_para_tentar:
        client, nome_chave = c_tuple
        try:
            resp = client.chat.completions.create(
                model=modelo_ativo,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=2200,
                response_format={"type": "json_object"}
            )
            content = resp.choices[0].message.content
            if content:
                dados = json.loads(content)
                lista_itens = []
                if isinstance(dados, list):
                    lista_itens = dados
                elif isinstance(dados, dict):
                    lista_itens = dados.get("resultados") or dados.get("questoes") or dados.get("items")
                    if not isinstance(lista_itens, list):
                        lista_itens = [dados]

                mapa = {}
                for item in lista_itens:
                    if isinstance(item, dict):
                        raw_num = item.get("numero")
                        if raw_num is not None:
                            try:
                                digits = "".join(filter(str.isdigit, str(raw_num)))
                                if digits:
                                    val = int(digits)
                                    mapa[val] = item
                                    mapa[str(val)] = item
                            except Exception:
                                pass

                # Validação e integridade epistêmica: sem fallbacks silenciosos para Álgebra/Média
                for q in pacote_questoes:
                    item_existente = mapa.get(q.numero) or mapa.get(str(q.numero))
                    if not item_existente:
                        mapa[q.numero] = {
                            "numero": q.numero,
                            "materia": None,
                            "topico": None,
                            "dificuldade": None,
                            "resolucao_autoral_latex": None,
                            "enrichment_status": "pending_review"
                        }
                    else:
                        mat = item_existente.get("materia")
                        if mat not in MATERIAS_VALIDAS:
                            item_existente["materia"] = None
                            item_existente["enrichment_status"] = "pending_review"
                        else:
                            item_existente["enrichment_status"] = "enriched"
                return mapa
        except Exception:
            # Se a chave primária falhar por 429 ou timeout, tenta o fallback da 2ª chave
            continue

    # Falha em todas as chaves: NENHUM fallback silencioso para Álgebra/Média
    mapa_pendente = {}
    for q in pacote_questoes:
        mapa_pendente[q.numero] = {
            "numero": q.numero,
            "materia": None,
            "topico": None,
            "dificuldade": None,
            "resolucao_autoral_latex": None,
            "enrichment_status": "pending_review"
        }
    return mapa_pendente

# ==========================================
# 5. ORQUESTRADOR TURBO CONCORRENTE
# ==========================================

def processar_pdf_turbo(
    caminho_pdf: Path,
    banca: str,
    ano: int,
    max_workers: int = 8,
    limite_paginas: Optional[int] = None,
    sincronizar_db: bool = True,
    gemini_model: str = "gemini-flash-lite-latest",
    nim_model: str = "meta/llama-3.3-70b-instruct"
):
    t0 = time.time()
    banca_slug = banca.lower().replace(" ", "_")
    img_dir = PROJECT_ROOT / "data" / "imagens" / banca_slug / str(ano)
    out_json = PROJECT_ROOT / "data" / "sources" / banca_slug / "processed" / str(ano) / "questoes.json"

    print("\n" + "=" * 64)
    print(f"[*] LINHA DE MONTAGEM HÍBRIDA 01 TURBO (CONCORRENTE)")
    print(f"    Banca: {banca.upper()} | Ano: {ano}")
    print(f"    Workers: {max_workers} | Chaves NIM: {len(NIM_CLIENTS_POOL)}")
    print(f"    PDF: {caminho_pdf.name}")
    print("=" * 64 + "\n")

    # Resolução dinâmica e pre-flight do modelo NIM (evita timeouts se modelo estiver em EOL)
    client_teste = NIM_CLIENTS_POOL[0][0]
    modelo_nim_ativo = resolver_modelo_nim_ativo(nim_model, client_teste)
    print(f"[*] Modelo NIM selecionado para inferência: {modelo_nim_ativo}\n")

    doc = fitz.open(caminho_pdf)
    total_pags = len(doc) if not limite_paginas else min(len(doc), limite_paginas)
    doc.close()

    print(f"[*] Renderizando {total_pags} páginas a 250 DPI em paralelo...", flush=True)
    def _render_pag(i_pag: int) -> Tuple[int, Image.Image]:
        doc_th = fitz.open(caminho_pdf)
        img_th = renderizar_pagina_limpa(doc_th[i_pag], dpi=250)
        doc_th.close()
        return (i_pag, img_th)

    with ThreadPoolExecutor(max_workers=min(max_workers, 8)) as executor:
        paginas_img_map = dict(executor.map(lambda i: _render_pag(i), range(total_pags)))
    paginas_img = [paginas_img_map[i] for i in range(total_pags)]

    # -------------------------------------------------------------
    # ETAPA 1: DISPARO PARALELO DE LOTES DE 5 PÁGINAS NO GEMINI
    # -------------------------------------------------------------
    TAM_PAGINAS = 5
    lotes_paginas = [
        paginas_img[i : i + TAM_PAGINAS]
        for i in range(0, len(paginas_img), TAM_PAGINAS)
    ]
    
    print(f"[*] Disparando {len(lotes_paginas)} lotes de páginas simultâneos no Gemini ({max_workers} workers)...", flush=True)
    questoes_extraidas: List[Tuple[QuestaoVisao, Optional[Image.Image]]] = []

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures_gemini = {}
        for idx, lote in enumerate(lotes_paginas):
            fut = executor.submit(extrair_lote_gemini, idx, lote, gemini_model)
            futures_gemini[fut] = idx
            time.sleep(0.3)
        for fut in as_completed(futures_gemini):
            idx = futures_gemini[fut]
            try:
                res = fut.result()
                questoes_extraidas.extend(res)
                print(f"    [+] Lote {idx+1}/{len(lotes_paginas)} processado: {len(res)} questões encontradas.", flush=True)
            except Exception as e:
                print(f"    [!] Erro no lote {idx+1}: {e}", flush=True)

    # Deduplica questões extraídas por número, priorizando a versão mais completa (com resolução e/ou figura)
    questoes_unicas_dict: Dict[int, Tuple[QuestaoVisao, Optional[Image.Image]]] = {}
    for q, img_ref in questoes_extraidas:
        num = q.numero
        if num not in questoes_unicas_dict:
            questoes_unicas_dict[num] = (q, img_ref)
        else:
            q_antiga, img_antiga = questoes_unicas_dict[num]
            tem_fig_nova = 1 if (q.possui_figura_no_enunciado and q.bbox_figura and q.bbox_figura.xmax > q.bbox_figura.xmin) else 0
            tem_fig_antiga = 1 if (q_antiga.possui_figura_no_enunciado and q_antiga.bbox_figura and q_antiga.bbox_figura.xmax > q_antiga.bbox_figura.xmin) else 0
            
            score_nova = (
                tem_fig_nova * 4 +
                (2 if q.resolucao_referencia and len(q.resolucao_referencia.strip()) > 10 else 0) +
                (1 if len(q.enunciado_latex) > len(q_antiga.enunciado_latex) else 0)
            )
            score_antiga = (
                tem_fig_antiga * 4 +
                (2 if q_antiga.resolucao_referencia and len(q_antiga.resolucao_referencia.strip()) > 10 else 0)
            )
            if score_nova >= score_antiga:
                if tem_fig_nova == 0 and tem_fig_antiga == 1:
                    q.possui_figura_no_enunciado = True
                    q.bbox_figura = q_antiga.bbox_figura
                    img_ref = img_antiga
                questoes_unicas_dict[num] = (q, img_ref)
            else:
                if not q_antiga.resolucao_referencia and q.resolucao_referencia:
                    q_antiga.resolucao_referencia = q.resolucao_referencia
                if not q_antiga.alternativas and q.alternativas:
                    q_antiga.alternativas = q.alternativas

    questoes_extraidas_limpas = sorted(questoes_unicas_dict.values(), key=lambda x: x[0].numero)
    somente_questoes = [q for q, _ in questoes_extraidas_limpas]
    
    t_gemini = time.time() - t0
    print(f"\n[✓] {len(somente_questoes)} questões únicas consolidadas em {t_gemini:.1f}s!")
    print(f"[*] Iniciando enriquecimento NIM (5 questões/req) e vetorização SVG em paralelo...\n", flush=True)

    # -------------------------------------------------------------
    # ETAPA 2: ENRIQUECIMENTO NIM + VETORIZAÇÃO SVG SIMULTÂNEOS
    # -------------------------------------------------------------
    TAM_PACOTE_NIM = 5
    pacotes_nim = [
        somente_questoes[i : i + TAM_PACOTE_NIM]
        for i in range(0, len(somente_questoes), TAM_PACOTE_NIM)
    ]

    mapa_enriquecido: Dict[int, Dict[str, Any]] = {}
    mapa_svgs: Dict[int, List[str]] = {}
    mapa_storage_urls: Dict[int, str] = {}

    def _tarefa_vetorizar_e_upload(q_num: int, img_p: Image.Image, bbox: BoundingBox) -> Tuple[int, Optional[str], Optional[str]]:
        nome_svg = f"{banca_slug}_{ano}_q{q_num:02d}_fig1.svg"
        caminho_svg = img_dir / nome_svg
        sucesso = recortar_e_vetorizar_rapido(img_p, bbox, caminho_svg)
        if not sucesso:
            return (q_num, None, None)
        
        rel_path = f"/data/imagens/{banca_slug}/{ano}/{nome_svg}"
        url_remota = None
        if sincronizar_db:
            path_remoto = f"{banca_slug}/{ano}/{nome_svg}"
            url_remota = upload_para_supabase_storage(caminho_svg, path_remoto)
        
        return (q_num, rel_path, url_remota)

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Dispara pacotes NIM alternando entre as chaves disponíveis
        futures_nim = []
        for p_idx, pac in enumerate(pacotes_nim):
            client_principal = NIM_CLIENTS_POOL[p_idx % len(NIM_CLIENTS_POOL)]
            client_fallback = NIM_CLIENTS_POOL[(p_idx + 1) % len(NIM_CLIENTS_POOL)] if len(NIM_CLIENTS_POOL) > 1 else None
            fut_n = executor.submit(enriquecer_pacote_nim, pac, client_principal, client_fallback, modelo_nim_ativo)
            futures_nim.append(fut_n)

        # Dispara vetorização SVG para questões únicas com figura válida
        futures_svg = []
        for q, img_pag in questoes_extraidas_limpas:
            tem_bbox_valida = (
                q.possui_figura_no_enunciado and 
                q.bbox_figura and
                q.bbox_figura.is_valid and
                img_pag is not None
            )
            if tem_bbox_valida:
                fut_s = executor.submit(_tarefa_vetorizar_e_upload, q.numero, img_pag, q.bbox_figura)
                futures_svg.append(fut_s)

        # Coleta respostas do NIM
        for fut in as_completed(futures_nim):
            try:
                res_dict = fut.result()
                mapa_enriquecido.update(res_dict)
                print(f"    [+] Pacote NIM concluído ({len(res_dict)} questões enriquecidas).", flush=True)
            except Exception as e:
                print(f"    [!] Erro no pacote NIM: {e}", flush=True)

        # Coleta resultados do SVG
        for fut in as_completed(futures_svg):
            try:
                q_num, rel_p, url_remota = fut.result()
                if rel_p:
                    mapa_svgs[q_num] = [rel_p]
                if url_remota:
                    mapa_storage_urls[q_num] = url_remota
            except Exception as e:
                print(f"    [!] Erro no processamento SVG: {e}", flush=True)

    # -------------------------------------------------------------
    # ETAPA 3: CONSOLIDAÇÃO DO JSON E BATCH UPSERT NO SUPABASE
    # -------------------------------------------------------------
    questoes_finais = []
    payloads_supabase = []

    for q in somente_questoes:
        info_nim = mapa_enriquecido.get(q.numero) or mapa_enriquecido.get(str(q.numero)) or {}
        svgs = mapa_svgs.get(q.numero, [])
        url_storage = mapa_storage_urls.get(q.numero)
        figura_final = url_storage or (svgs[0] if svgs else None)

        # Concatena alternativas para o padrão canônico LEMMAS (desmembrado no frontend)
        texto_alternativas = ""
        if q.alternativas:
            texto_alternativas = "\n\n" + "\n".join([f"({a.letra.lower()}) {a.texto}" for a in q.alternativas])
        enunciado_completo = q.enunciado_latex + texto_alternativas

        mathnet_id = f"militar_{banca_slug}_{ano}_q{q.numero:02d}"
        
        materia_valida = info_nim.get("materia") if info_nim.get("materia") in MATERIAS_VALIDAS else None
        topico_valido = info_nim.get("topico")
        dif_str = info_nim.get("dificuldade")
        dif_int = 2 if dif_str == "Fácil" else (4 if dif_str == "Difícil" else (3 if dif_str == "Média" else None))
        status_enriquecimento = info_nim.get("enrichment_status", "enriched" if materia_valida else "pending_review")

        # Objeto rico para o JSON local
        item_json = {
            "id": f"{banca_slug}_{ano}_mat_q{q.numero:02d}",
            "mathnet_id": mathnet_id,
            "banca": banca.upper(),
            "categoria_banca": "Concurso Militar",
            "tipo_prova": "Oficial",
            "fase_nivel": "Geral",
            "ano": ano,
            "disciplina": "Matemática",
            "materia": materia_valida,
            "topico": topico_valido,
            "subtopico": topico_valido,
            "dificuldade": dif_str,
            "dificuldade_nivel": dif_int,
            "enrichment_status": status_enriquecimento,
            "numero": q.numero,
            "tipo": "multipla_escolha" if q.alternativas else "discursiva",
            "enunciado": enunciado_completo,
            "enunciado_corpo": q.enunciado_latex,
            "alternativas": [a.model_dump() for a in q.alternativas] if q.alternativas else None,
            "gabarito": q.gabarito.lower() if q.gabarito else None,
            "resolucao": info_nim.get("resolucao_autoral_latex"),
            "possui_imagem": len(svgs) > 0,
            "imagens": svgs,
            "figura_path": figura_final
        }
        questoes_finais.append(item_json)

        # Payload estrito para o Supabase (public.questoes)
        payloads_supabase.append({
            "mathnet_id": mathnet_id,
            "banca": banca.upper(),
            "ano": ano,
            "materia": materia_valida,
            "topico": topico_valido,
            "subtopico": topico_valido,
            "dificuldade": dif_int or 3,
            "tipo": "objetiva" if q.alternativas else "discursiva",
            "enunciado": enunciado_completo,
            "gabarito": item_json["gabarito"],
            "figura_path": figura_final,
            "solucao": item_json["resolucao"],
            "tipo_material": "Prova Oficial",
            "etapa": "1ª Fase",
            "tipo_prova": "Oficial",
            "fase_nivel": "Geral",
            "categoria_banca": "Concurso Militar"
        })

    # Salva o arquivo JSON local processado
    out_json.parent.mkdir(parents=True, exist_ok=True)
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(questoes_finais, f, ensure_ascii=False, indent=2)
    print(f"\n[✓] JSON local gravado: {out_json}")

    # -------------------------------------------------------------
    # ETAPA 4: BATCH UPSERT DE UMA ÚNICA VEZ NO SUPABASE (FAIL-FAST)
    # -------------------------------------------------------------
    if sincronizar_db and payloads_supabase:
        # Deduplica payloads por mathnet_id para evitar erro PostgreSQL 21000 (ON CONFLICT DO UPDATE cannot affect row a second time)
        payloads_unicos = {}
        for item in payloads_supabase:
            mid = item["mathnet_id"]
            if mid not in payloads_unicos:
                payloads_unicos[mid] = item
            else:
                # Prioriza o registro que contém figura ou enunciado mais extenso
                if item.get("figura_path") and not payloads_unicos[mid].get("figura_path"):
                    payloads_unicos[mid] = item
                elif len(item.get("enunciado", "")) > len(payloads_unicos[mid].get("enunciado", "")):
                    payloads_unicos[mid] = item

        payloads_para_enviar = list(payloads_unicos.values())
        print(f"[*] Disparando Batch Upsert de {len(payloads_para_enviar)} questões únicas no Supabase de uma única vez...", flush=True)
        try:
            supabase = get_supabase()
            resp = supabase.table("questoes").upsert(
                payloads_para_enviar,
                on_conflict="mathnet_id"
            ).execute()
            print(f"[✓] SUPABASE UPSERT BATCH CONCLUÍDO COM SUCESSO! ({len(payloads_para_enviar)} questões sincronizadas)")
        except Exception as e:
            print(f"  [!] Falha no upsert em 'questoes': {e}. Tentando fallback em 'questions'...")
            try:
                supabase = get_supabase()
                supabase.table("questions").upsert(payloads_para_enviar).execute()
                print(f"[✓] SUPABASE UPSERT BATCH EM 'questions' CONCLUÍDO!")
            except Exception as e2:
                print(f"  [CRITICAL] Falha fatal no Supabase Batch Upsert: {e2}")
                raise RuntimeError(
                    f"Interrupção de segurança epistêmica: Falha fatal no Supabase Batch Upsert ({e2}). "
                    "Operação abortada imediatamente para evitar corrupção de dados."
                ) from e2

    tempo_total = time.time() - t0
    print(f"\n=======================================================")
    print(f"[✓ PROCESSO CONCLUÍDO COM SUCESSO]")
    print(f"    Total de Questões: {len(questoes_finais)}")
    print(f"    Figuras SVG Vetorizadas: {len(mapa_svgs)}")
    print(f"    Tempo Total: {tempo_total:.1f} segundos")
    print(f"=======================================================\n")

def main():
    parser = argparse.ArgumentParser(description="Pipeline 01 Turbo: Linha de Montagem Híbrida Concorrente (Gemini + Dual NIM + VTracer)")
    parser.add_argument("--pdf", type=str, required=True, help="Caminho para o PDF da prova")
    parser.add_argument("--banca", type=str, required=True, help="Nome da banca (afa, ita, ime, etc.)")
    parser.add_argument("--ano", type=int, required=True, help="Ano da prova")
    parser.add_argument("--max-workers", type=int, default=8, help="Número de threads simultâneas (padrão: 8)")
    parser.add_argument("--limite-paginas", type=int, default=None, help="Limite de páginas para teste rápido")
    parser.add_argument("--no-db", action="store_true", help="Desativa o upsert no Supabase")
    parser.add_argument("--gemini-model", type=str, default="gemini-flash-lite-latest", help="Modelo de visão do Gemini")
    parser.add_argument("--nim-model", type=str, default="nvidia/nemotron-3-super-120b-a12b", help="Modelo de enriquecimento da NVIDIA NIM")
    args = parser.parse_args()

    caminho_pdf = Path(args.pdf)
    if not caminho_pdf.exists():
        caminho_pdf = PROJECT_ROOT / args.pdf
    if not caminho_pdf.exists():
        print(f"[!] PDF não encontrado: {args.pdf}")
        sys.exit(1)

    processar_pdf_turbo(
        caminho_pdf=caminho_pdf,
        banca=args.banca,
        ano=args.ano,
        max_workers=args.max_workers,
        limite_paginas=args.limite_paginas,
        sincronizar_db=not args.no_db,
        gemini_model=args.gemini_model,
        nim_model=args.nim_model
    )

if __name__ == "__main__":
    main()
