"""
Pipeline de Extração e Ingestão de Provas para a Plataforma LEMMAS (MathAI Engine)
Lê cadernos em data/sources/<banca>/raw/<ano>, extrai via Gemini (gemini-flash-lite-latest)
com Structured Outputs, recorta figuras vetoriais/geométricas em alta resolução via PyMuPDF
e salva os JSONs limpos em data/sources/<banca>/processed/<ano>/questoes.json.
"""

import os
import sys
import re
import json
import time
from pathlib import Path
from typing import List, Optional, Tuple

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

import pymupdf as fitz  # PyMuPDF
from PIL import Image
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from google.genai.errors import APIError
from dotenv import load_dotenv

load_dotenv()

# ==============================================================================
# 1. CONTRATO DE DADOS CANÔNICO (PYDANTIC SCHEMA)
# ==============================================================================

class BoundingBox(BaseModel):
    pagina: int = Field(description="Número da página (1-indexed) onde a figura está localizada")
    ymin: int = Field(description="Coordenada Y superior normalizada (0 a 1000)")
    xmin: int = Field(description="Coordenada X esquerda normalizada (0 a 1000)")
    ymax: int = Field(description="Coordenada Y inferior normalizada (0 a 1000)")
    xmax: int = Field(description="Coordenada X direita normalizada (0 a 1000)")

class Alternativa(BaseModel):
    letra: str = Field(description="Letra da alternativa: A, B, C, D ou E")
    texto: str = Field(description="Texto da alternativa com matemática em LaTeX ($...$)")

class QuestaoExtraida(BaseModel):
    numero: int = Field(description="Número original da questão na prova")
    disciplina: str = Field(description="Ex: Matemática, Física")
    topico: str = Field(description="Tópico canônico: Cálculo, Álgebra, Geometria Plana, Geometria Espacial, Geometria Analítica, Trigonometria, Polinômios e Complexos, Probabilidade e Combinatória, Mecânica, Eletromagnetismo, etc.")
    subtopico: Optional[str] = Field(description="Subtópico específico detalhado")
    enunciado_corpo: str = Field(description="Enunciado completo com equações em LaTeX ($inline$ ou $$display$$), sem as alternativas")
    tipo: str = Field(description="'objetiva' ou 'discursiva'")
    alternativas: List[Alternativa] = Field(description="Lista de alternativas (lista vazia se discursiva)")
    gabarito: Optional[str] = Field(description="Letra oficial correta (A, B, C, D, E), 'ANULADA' ou resposta resumida")
    possui_imagem: bool = Field(description="True se a questão depender de gráfico, figura geométrica, circuito ou tabela visual")
    figuras_bbox: List[BoundingBox] = Field(
        description="Bounding boxes [ymin, xmin, ymax, xmax] (0 a 1000) de cada figura ou diagrama da questão (lista vazia se não houver)"
    )
    estrategias_esperadas: List[str] = Field(
        description="Lemas, teoremas ou técnicas-chave mobilizados na resolução"
    )

class CadernoProva(BaseModel):
    questoes: List[QuestaoExtraida]

# ==============================================================================
# 2. SELEÇÃO E CLASSIFICAÇÃO INTELIGENTE DE ARQUIVOS
# ==============================================================================

def classificar_pdfs_do_ano(ano_raw_dir: Path) -> Tuple[List[Path], List[Path]]:
    """
    Varre recursivamente o diretório raw/<ano> e separa os PDFs entre provas e gabaritos,
    independentemente de haver subpastas (provas/, gabarito/) ou arquivos soltos.
    """
    pdfs = sorted(list(ano_raw_dir.rglob("*.pdf")))
    provas, gabaritos = [], []
    
    termos_gabarito = ["gabarito", "gab", "resposta", "chave"]
    materias_ignorar = ["portugues", "lingua-portuguesa", "ingles", "historia", "geografia", "redacao", "humanas"]

    for pdf in pdfs:
        nome_lower = pdf.name.lower()
        caminho_lower = str(pdf.parent).lower()

        # Classificação de Gabarito
        if any(t in nome_lower for t in termos_gabarito) or any(t in caminho_lower for t in termos_gabarito):
            gabaritos.append(pdf)
            continue

        # Filtro de provas: foca em Matemática e Física ou provas gerais
        # Se for prova específica de Português/Humanas/Redação sem menção a Matemática/Física, ignora
        if any(m in nome_lower for m in materias_ignorar) and not any(ok in nome_lower for ok in ["mat", "fis", "ciencias"]):
            continue

        provas.append(pdf)

    return provas, gabaritos

# ==============================================================================
# 3. RECORTE DE IMAGENS E VETORES VIA PYMUPDF (ALTA RESOLUÇÃO)
# ==============================================================================

def recortar_e_salvar_figura(
    doc: fitz.Document,
    bbox: BoundingBox,
    img_out_dir: Path,
    banca: str,
    ano: str,
    num_questao: int,
    idx_fig: int
) -> str:
    """
    Renderiza a página indicada a 250 DPI e recorta a Bounding Box calculada pelo Gemini.
    Retorna o caminho relativo da imagem gerada.
    """
    img_out_dir.mkdir(parents=True, exist_ok=True)
    page_idx = bbox.pagina - 1
    
    if page_idx < 0 or page_idx >= len(doc):
        print(f"  [!] Página inválida para recorte: {bbox.pagina} (Total: {len(doc)})")
        return ""

    page = doc[page_idx]
    # 250 DPI garante nitidez editorial em figuras e diagramas vetoriais
    pix = page.get_pixmap(dpi=250)
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

    largura, altura = img.size
    left = int((bbox.xmin / 1000.0) * largura)
    top = int((bbox.ymin / 1000.0) * altura)
    right = int((bbox.xmax / 1000.0) * largura)
    bottom = int((bbox.ymax / 1000.0) * altura)

    # Padding de segurança de 10px
    left = max(0, left - 10)
    top = max(0, top - 10)
    right = min(largura, right + 10)
    bottom = min(altura, bottom + 10)

    if right <= left or bottom <= top:
        return ""

    crop = img.crop((left, top, right, bottom))
    banca_slug = banca.lower().replace(" ", "_")
    nome_arquivo = f"{banca_slug}_{ano}_q{num_questao:02d}_fig{idx_fig}.png"
    caminho_fisico = img_out_dir / nome_arquivo
    
    crop.save(caminho_fisico, "PNG", optimize=True)
    return f"/data/imagens/{banca_slug}/{ano}/{nome_arquivo}"

# ==============================================================================
# 4. EXTRAÇÃO RESILIENTE COM EXPONENTIAL BACKOFF (GEMINI-FLASH-LITE)
# ==============================================================================

def extrair_caderno_com_retry(
    client: genai.Client,
    prova_upload,
    gabaritos_uploads: list,
    banca: str,
    ano: str,
    max_retries: int = 3
) -> Optional[CadernoProva]:
    """
    Executa a chamada multimodal com gemini-flash-lite-latest com retry automático
    em caso de Rate Limit (429) ou instabilidade temporária (503).
    """
    prompt = f"""
    Você é o avaliador e extrator oficial de exames da MathAI Engine para o LEMMAS.
    Banca: {banca.upper()} | Ano: {ano}

    Sua missão é extrair com precisão matemática ABSOLUTA todas as questões de Matemática e Física deste caderno,
    cruzando com os gabaritos oficiais anexados.

    Regras Epistêmicas de Extração:
    1. RIGOR NO LATEX: Toda variável, expoente, índice, matriz, fração ou equação DEVE usar LaTeX ($...$ para inline e $$...$$ para display math).
       Nunca utilize caracteres soltos como x^2, utilize $x^2$. Para funções brasileiras, use \\sen, \\tg, \\cos, etc.
    2. ENUNCIADO LIMPO: No campo 'enunciado_corpo', extraia exclusivamente o texto e comandos da questão, SEM as letras das alternativas.
    3. ALTERNATIVAS: Preencha cada item da lista 'alternativas' com a letra e o texto correspondente.
    4. DETECÇÃO DE FIGURAS: Se a questão contiver qualquer gráfico, triângulo, circunferência, diagrama de blocos, circuito ou tabela essencial,
       marque 'possui_imagem=true' e forneça em 'figuras_bbox' a bounding box [ymin, xmin, ymax, xmax] normalizada (0 a 1000) e o número da página exata.
    5. GABARITO E LEMAS: Forneça a letra correta confirmada no gabarito anexo e liste 2 a 3 lemas/teoremas esperados em 'estrategias_esperadas'.
    """

    model_name = "gemini-flash-lite-latest"
    contents = [prova_upload, *gabaritos_uploads, prompt]
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=CadernoProva,
        temperature=0.0,
    )

    for tentativa in range(1, max_retries + 1):
        try:
            print(f"  [>] Enviando requisição para {model_name} (tentativa {tentativa}/{max_retries})...")
            response = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=config,
            )
            return response.parsed
        except APIError as e:
            print(f"  [!] Erro na API do Gemini ({e.code}): {e.message}")
            if e.code in (429, 503) and tentativa < max_retries:
                espera = tentativa * 10
                print(f"  [!] Aguardando {espera}s antes de tentar novamente (Backoff)...")
                time.sleep(espera)
            else:
                return None
        except Exception as ex:
            print(f"  [!] Exceção inesperada: {ex}")
            if tentativa < max_retries:
                time.sleep(5)
            else:
                return None

    return None

# ==============================================================================
# 5. PIPELINE PRINCIPAL POR BANCA E ANO
# ==============================================================================

def processar_banca_ano(root_dir: Path, banca: str, ano: str, delay_entre_provas: int = 4):
    banca_slug = banca.lower().replace(" ", "_")
    raw_dir = root_dir / "data" / "sources" / banca_slug / "raw" / ano
    processed_dir = root_dir / "data" / "sources" / banca_slug / "processed" / ano
    img_dir = root_dir / "data" / "imagens" / banca_slug / ano

    if not raw_dir.exists():
        print(f"[!] Diretório não encontrado: {raw_dir}")
        return

    provas_pdfs, gabaritos_pdfs = classificar_pdfs_do_ano(raw_dir)
    if not provas_pdfs:
        print(f"[!] Nenhuma prova relevante encontrada em {banca_slug}/{ano}")
        return

    print(f"\n=======================================================")
    print(f"[*] Instando processamento: {banca.upper()} - {ano}")
    print(f"[*] Provas encontradas: {[p.name for p in provas_pdfs]}")
    print(f"[*] Gabaritos encontrados: {[g.name for g in gabaritos_pdfs]}")
    print(f"=======================================================")

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("[!] GEMINI_API_KEY não configurada no .env")
        return

    client = genai.Client(api_key=api_key)
    
    # 1. Upload dos gabaritos para o Gemini File API
    gabs_uploads = []
    for g_pdf in gabaritos_pdfs:
        print(f"  [+] Subindo gabarito de apoio: {g_pdf.name}...")
        try:
            up = client.files.upload(file=str(g_pdf))
            gabs_uploads.append(up)
        except Exception as e:
            print(f"  [!] Falha no upload do gabarito: {e}")

    questoes_ano = []

    # 2. Processa cada caderno de prova
    for p_pdf in provas_pdfs:
        print(f"\n[*] Processando caderno: {p_pdf.name}...")
        try:
            up_prova = client.files.upload(file=str(p_pdf))
        except Exception as e:
            print(f"  [!] Falha no upload da prova: {e}")
            continue

        caderno: Optional[CadernoProva] = extrair_caderno_com_retry(
            client=client,
            prova_upload=up_prova,
            gabaritos_uploads=gabs_uploads,
            banca=banca_slug,
            ano=ano
        )

        if not caderno or not caderno.questoes:
            print(f"  [!] Nenhuma questão extraída de {p_pdf.name}")
            continue

        print(f"  [✓] {len(caderno.questoes)} questões estruturadas extraídas da prova.")

        # Abre o PDF para recortar figuras caso existam
        doc_fitz = fitz.open(p_pdf)

        for q in caderno.questoes:
            caminhos_figuras = []
            if q.possui_imagem and q.figuras_bbox:
                for idx_fig, bbox in enumerate(q.figuras_bbox, start=1):
                    rel_img = recortar_e_salvar_figura(
                        doc=doc_fitz,
                        bbox=bbox,
                        img_out_dir=img_dir,
                        banca=banca_slug,
                        ano=ano,
                        num_questao=q.numero,
                        idx_fig=idx_fig
                    )
                    if rel_img:
                        caminhos_figuras.append(rel_img)

            # Monta o enunciado completo compilado no padrão LEMMAS (corpo + alternativas)
            enunciado_completo = q.enunciado_corpo.strip()
            if q.tipo == "objetiva" and q.alternativas:
                enunciado_completo += "\n\n"
                for alt in q.alternativas:
                    enunciado_completo += f"({alt.letra}) {alt.texto.strip()}\n"
                enunciado_completo = enunciado_completo.strip()

            caminho_figura_principal = caminhos_figuras[0] if caminhos_figuras else None

            # Registro padronizado compatível tanto com Staging quanto com public.questoes
            registro = {
                "id_externo": f"{banca_slug}_{ano}_q{q.numero:02d}",
                "banca": banca.upper(),
                "ano": int(ano),
                "numero": q.numero,
                "materia": q.disciplina,
                "topico": q.topico,
                "subtopico": q.subtopico,
                "tipo": q.tipo,
                "enunciado": enunciado_completo,
                "enunciado_corpo": q.enunciado_corpo,
                "alternativas": [alt.model_dump() for alt in q.alternativas] if q.alternativas else [],
                "figura_path": caminho_figura_principal,
                "figuras_todas": caminhos_figuras,
                "gabarito": q.gabarito,
                "estrategias_esperadas": json.dumps(q.estrategias_esperadas or [], ensure_ascii=False),
                "arquivo_origem": p_pdf.name
            }
            questoes_ano.append(registro)

        doc_fitz.close()
        # Cortesia de Rate Limit entre requisições grandes
        time.sleep(delay_entre_provas)

    # 3. Salva os resultados no Staging Area: processed/<ano>/questoes.json
    if questoes_ano:
        processed_dir.mkdir(parents=True, exist_ok=True)
        out_file = processed_dir / "questoes.json"
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(questoes_ano, f, ensure_ascii=False, indent=2)
        print(f"\n[✓] Sucesso: {len(questoes_ano)} questões salvas em {out_file}")
    else:
        print(f"\n[!] Nenhuma questão gerada para {banca_slug}/{ano}")

if __name__ == "__main__":
    ROOT = Path(__file__).resolve().parents[2]
    # Teste rápido de sanidade na AFA 2024
    processar_banca_ano(ROOT, banca="afa", ano="2024")
