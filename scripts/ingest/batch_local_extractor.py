"""
Extrator em Lote Local para o Ecossistema LEMMAS (MathAI Engine)
Varre todas as bancas militares em data/sources/<banca>/raw/<ano>,
extrai com rigor matemático via gemini-flash-lite-latest, recorta figuras em 250 DPI
com PyMuPDF e salva em data/sources/<banca>/processed/<ano>/questoes.json.

Blindagens Inclusas:
1. Checkpoint por Ano: Se o JSON já existir, pula automaticamente.
2. Limpeza da File API: Remove PDFs temporários da nuvem após cada prova.
3. Tratamento de Quota (429/503): Exponential backoff automático.
4. Schema Válido: Pydantic v2 estrito para a API do Gemini (sem defaults/anyOf).
5. Descarte de Modelos/Cores Duplicadas: Ignora subpastas '_outros_modelos'.
"""

import os
import sys
import time
import json
import unicodedata
from pathlib import Path
from typing import List, Optional, Tuple
from tqdm import tqdm

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

import pymupdf as fitz  # PyMuPDF
from PIL import Image
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from google import genai
from google.genai import types
from google.genai.errors import APIError

load_dotenv()

# ==============================================================================
# 1. CONTRATO PYDANTIC CANÔNICO PARA O GEMINI STRUCTURED OUTPUTS
# ==============================================================================

class BoundingBox(BaseModel):
    pagina: int = Field(description="Número da página (1-indexed) onde a figura está localizada")
    ymin: int = Field(description="Coordenada Y superior normalizada (0 a 1000)")
    xmin: int = Field(description="Coordenada X esquerda normalizada (0 a 1000)")
    ymax: int = Field(description="Coordenada Y inferior normalizada (0 a 1000)")
    xmax: int = Field(description="Coordenada X direita normalizada (0 a 1000)")

class Alternativa(BaseModel):
    letra: str = Field(description="Letra da alternativa: A, B, C, D ou E")
    texto: str = Field(description="Texto com fórmulas em LaTeX ($...$)")

class QuestaoExtraida(BaseModel):
    numero: int = Field(description="Número original da questão na prova")
    disciplina: str = Field(description="'Matemática' ou 'Física'")
    topico: str = Field(description="Tópico: Cálculo, Álgebra, Geometria Plana, Geometria Espacial, Geometria Analítica, Trigonometria, Polinômios e Complexos, Probabilidade e Combinatória, Mecânica, Eletromagnetismo, etc.")
    subtopico: Optional[str] = Field(description="Subtópico específico detalhado")
    enunciado_corpo: str = Field(description="Texto do enunciado com equações em LaTeX ($inline$ ou $$display$$), SEM as alternativas")
    tipo: str = Field(description="'objetiva' ou 'discursiva'")
    alternativas: List[Alternativa] = Field(description="Lista de alternativas (vazia se discursiva)")
    gabarito: Optional[str] = Field(description="Letra oficial (A-E), 'ANULADA' ou resposta resumida")
    possui_imagem: bool = Field(description="True se a questão depender de gráfico, figura geométrica, circuito ou tabela visual")
    figuras_bbox: List[BoundingBox] = Field(
        description="Bounding boxes [ymin, xmin, ymax, xmax] (0 a 1000) de cada figura (lista vazia se não houver)"
    )
    estrategias_esperadas: List[str] = Field(
        description="Lemas ou teoremas matemáticos mobilizados na resolução"
    )

class CadernoExtraido(BaseModel):
    questoes: List[QuestaoExtraida]

# ==============================================================================
# 2. UTILITÁRIOS DE ARQUIVO E IMAGEM
# ==============================================================================

def normalizar_slug(texto: str) -> str:
    """Converte 'Colégio Naval' para 'colegio_naval'."""
    sem_acento = "".join(
        c for c in unicodedata.normalize("NFD", texto)
        if unicodedata.category(c) != "Mn"
    )
    return sem_acento.lower().strip().replace(" ", "_").replace("-", "_")

def classificar_pdfs_do_ano(ano_dir: Path) -> Tuple[List[Path], List[Path]]:
    """Varre o diretório raw/<ano>, ignorando _outros_modelos e cadernos exclusivos de humanas."""
    todos_pdfs = sorted(list(ano_dir.rglob("*.pdf")))
    provas, gabaritos = [], []

    termos_ignorar = [
        "quimica", "química", "redacao", "redação", "humanas",
        "historia", "história", "geografia", "2-dia-portugues",
        "linguas", "línguas", "portugues_ingles", "portugues-20"
    ]

    for pdf in todos_pdfs:
        caminho_str = str(pdf).lower()
        nome_low = pdf.name.lower()
        pasta_low = pdf.parent.name.lower()

        # 0. Ignora modelos/cores secundárias isoladas
        if "_outros_modelos" in caminho_str:
            continue

        # 1. Identifica se é Gabarito
        if "gabarito" in nome_low or "gab" in nome_low or "gabarito" in pasta_low:
            if any(x in nome_low for x in ["humanas", "historia", "geografia"]) and "mat" not in nome_low:
                continue
            gabaritos.append(pdf)
            continue

        # 2. Ignora subpastas explícitas de matérias não relevantes
        if pasta_low in ["portugues", "geografia e historia", "historia-geografia"]:
            continue

        # 3. Ignora PDFs avulsos exclusivos de outras matérias
        if any(termo in nome_low for termo in termos_ignorar) and "mat" not in nome_low and "fis" not in nome_low:
            continue

        provas.append(pdf)

    return provas, gabaritos

def recortar_figura(
    doc: fitz.Document,
    bbox: BoundingBox,
    img_out_dir: Path,
    banca_slug: str,
    ano: str,
    num_questao: int,
    idx_fig: int
) -> Optional[str]:
    """Renderiza a página a 250 DPI e recorta a Bounding Box com margem de segurança."""
    page_idx = bbox.pagina - 1
    if page_idx < 0 or page_idx >= len(doc):
        return None

    img_out_dir.mkdir(parents=True, exist_ok=True)
    page = doc[page_idx]
    pix = page.get_pixmap(dpi=250)
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

    largura, altura = img.size
    left = max(0, int((bbox.xmin / 1000.0) * largura) - 10)
    top = max(0, int((bbox.ymin / 1000.0) * altura) - 10)
    right = min(largura, int((bbox.xmax / 1000.0) * largura) + 10)
    bottom = min(altura, int((bbox.ymax / 1000.0) * altura) + 10)

    if right <= left or bottom <= top:
        return None

    crop = img.crop((left, top, right, bottom))
    nome_img = f"{banca_slug}_{ano}_q{num_questao:02d}_fig{idx_fig}.png"
    caminho_salvar = img_out_dir / nome_img
    crop.save(caminho_salvar, "PNG", optimize=True)

    return f"/data/imagens/{banca_slug}/{ano}/{nome_img}"

# ==============================================================================
# 3. MOTOR DE EXTRAÇÃO COM RETRY E LIMPEZA
# ==============================================================================

def chamar_gemini_com_retry(client: genai.Client, contents: list, max_tentativas=3):
    """Invoca gemini-flash-lite-latest com retry automático em 429 ou 503."""
    for tentativa in range(1, max_tentativas + 1):
        try:
            return client.models.generate_content(
                model="gemini-flash-lite-latest",
                contents=contents,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=CadernoExtraido,
                    temperature=0.0,
                ),
            )
        except APIError as e:
            if e.code in [429, 500, 503] and tentativa < max_tentativas:
                espera = 20 * tentativa
                print(f"    [!] API ocupada (HTTP {e.code}). Aguardando {espera}s (tentativa {tentativa}/{max_tentativas})...")
                time.sleep(espera)
            else:
                raise e

def processar_ano(client: genai.Client, root_dir: Path, banca_dir: Path, ano_dir: Path):
    banca_slug = normalizar_slug(banca_dir.name)
    ano = ano_dir.name

    processed_file = root_dir / "data" / "sources" / banca_slug / "processed" / ano / "questoes.json"
    img_out_dir = root_dir / "data" / "imagens" / banca_slug / ano

    # CHECKPOINT: Se já foi processado antes, pula!
    if processed_file.exists() and processed_file.stat().st_size > 50:
        print(f"[-] Pulando {banca_slug.upper()} {ano} (já processado em processed/{ano}/questoes.json)")
        return

    provas_pdfs, gabaritos_pdfs = classificar_pdfs_do_ano(ano_dir)
    if not provas_pdfs:
        print(f"[!] Nenhum PDF de prova encontrado em {banca_slug}/{ano}")
        return

    print(f"\n=======================================================")
    print(f"[*] Iniciando: {banca_slug.upper()} - Ano {ano}")
    print(f"    Provas: {[p.name for p in provas_pdfs]}")
    print(f"    Gabaritos: {[g.name for g in gabaritos_pdfs]}")
    print(f"=======================================================")

    uploaded_gabs = []
    questoes_do_ano = []

    try:
        # 1. Upload dos gabaritos para a File API
        for gab in gabaritos_pdfs:
            up_gab = client.files.upload(file=str(gab))
            uploaded_gabs.append(up_gab)

        # 2. Processa cada caderno de prova
        for prova_pdf in provas_pdfs:
            print(f"    -> Subindo e extraindo prova: {prova_pdf.name}...")
            up_prova = client.files.upload(file=str(prova_pdf))

            prompt = f"""
            Você é um extrator rigoroso de provas do ecossistema LEMMAS ({banca_slug.upper()} {ano}).
            Analise o caderno e os gabaritos anexos e extraia TODAS as questões de MATEMÁTICA e FÍSICA.
            Ignore questões de Português, Inglês, História, Geografia ou Química.

            Regras Epistêmicas:
            1. Formate toda expressão matemática, variável, fração, matriz ou fórmula em LaTeX ($inline$ ou $$display$$).
            2. No campo 'enunciado_corpo', extraia exclusivamente o enunciado SEM as alternativas.
            3. No campo 'alternativas', forneça cada opção com letra e texto.
            4. Se houver gabarito anexo, preencha a letra oficial correspondente.
            5. Se a questão contiver figura geométrica, gráfico, circuito ou tabela visual, marque possui_imagem=True e forneça a bounding box (0 a 1000) cercando APENAS a figura.
            """

            try:
                resposta = chamar_gemini_com_retry(client, [up_prova, *uploaded_gabs, prompt])
                caderno: CadernoExtraido = resposta.parsed
            finally:
                # Limpa o arquivo da prova da nuvem imediatamente
                try:
                    client.files.delete(name=up_prova.name)
                except Exception:
                    pass

            if not caderno or not caderno.questoes:
                print(f"    [!] Nenhuma questão retornada para {prova_pdf.name}")
                continue

            print(f"    [✓] {len(caderno.questoes)} questões extraídas de {prova_pdf.name}.")

            # 3. Abre o PDF local para recorte de figuras
            doc_fitz = fitz.open(prova_pdf)
            for q in caderno.questoes:
                caminhos_imgs = []
                if q.possui_imagem and q.figuras_bbox:
                    for idx, bbox in enumerate(q.figuras_bbox, start=1):
                        caminho_rel = recortar_figura(
                            doc=doc_fitz,
                            bbox=bbox,
                            img_out_dir=img_out_dir,
                            banca_slug=banca_slug,
                            ano=ano,
                            num_questao=q.numero,
                            idx_fig=idx
                        )
                        if caminho_rel:
                            caminhos_imgs.append(caminho_rel)

                # Compila o enunciado no formato canônico do LEMMAS (corpo + alternativas)
                enunciado_compilado = q.enunciado_corpo.strip()
                if q.tipo == "objetiva" and q.alternativas:
                    enunciado_compilado += "\n\n"
                    for alt in q.alternativas:
                        enunciado_compilado += f"({alt.letra}) {alt.texto.strip()}\n"
                    enunciado_compilado = enunciado_compilado.strip()

                disc_slug = normalizar_slug(q.disciplina)[:3]
                q_dict = {
                    "id_externo": f"{banca_slug}_{ano}_{disc_slug}_q{q.numero:02d}",
                    "banca": banca_slug.upper(),
                    "ano": int(ano),
                    "numero": q.numero,
                    "materia": q.disciplina,
                    "topico": q.topico,
                    "subtopico": q.subtopico,
                    "tipo": q.tipo,
                    "enunciado": enunciado_compilado,
                    "enunciado_corpo": q.enunciado_corpo,
                    "alternativas": [alt.model_dump() for alt in q.alternativas],
                    "figura_path": caminhos_imgs[0] if caminhos_imgs else None,
                    "figuras_todas": caminhos_imgs,
                    "gabarito": q.gabarito,
                    "estrategias_esperadas": json.dumps(q.estrategias_esperadas, ensure_ascii=False),
                    "arquivo_origem": prova_pdf.name
                }
                questoes_do_ano.append(q_dict)

            doc_fitz.close()
            # Pausa de cortesia para respeitar limite de RPM
            time.sleep(4)

        # 4. Salva o JSON consolidado do ano em processed/<ano>/questoes.json
        if questoes_do_ano:
            processed_file.parent.mkdir(parents=True, exist_ok=True)
            with open(processed_file, "w", encoding="utf-8") as f:
                json.dump(questoes_do_ano, f, ensure_ascii=False, indent=2)
            print(f"    [✓] Sucesso: {len(questoes_do_ano)} questões salvas em {processed_file.relative_to(root_dir)}")

    except Exception as e:
        print(f"    [X] Erro ao processar {banca_slug} {ano}: {e}")

    finally:
        # Limpa os gabaritos da nuvem do Google
        for up_gab in uploaded_gabs:
            try:
                client.files.delete(name=up_gab.name)
            except Exception:
                pass

# ==============================================================================
# 4. EXECUÇÃO EM LOTE PRINCIPAL
# ==============================================================================

def main():
    root_dir = Path(__file__).resolve().parents[2]
    sources_dir = root_dir / "data" / "sources"

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("Configure GEMINI_API_KEY no seu arquivo .env na raiz do projeto!")

    client = genai.Client(api_key=api_key)

    # Bancas já processadas ou legadas para ignorar na varredura geral
    bancas_ignorar = {"_legacy", "cederj", "enem", "fuvest", "unicamp"}

    bancas = sorted([d for d in sources_dir.iterdir() if d.is_dir() and d.name not in bancas_ignorar])
    
    tarefas = []
    for banca_dir in bancas:
        raw_dir = banca_dir / "raw"
        if not raw_dir.exists():
            continue
        anos = sorted([a for a in raw_dir.iterdir() if a.is_dir() and a.name.isdigit()])
        for ano_dir in anos:
            tarefas.append((banca_dir, ano_dir))

    print(f"\n=======================================================")
    print(f"[*] LEMMAS — Extrator em Lote de Exames Militares")
    print(f"[*] Total de {len(tarefas)} cadernos anuais mapeados em {len(bancas)} bancas:")
    for b in bancas:
        print(f"    - {b.name}")
    print(f"=======================================================\n")

    with tqdm(tarefas, desc="Extração Militar", unit="caderno") as pbar:
        for banca_dir, ano_dir in pbar:
            pbar.set_postfix_str(f"{banca_dir.name.upper()} {ano_dir.name}")
            processar_ano(client, root_dir, banca_dir, ano_dir)

if __name__ == "__main__":
    main()
