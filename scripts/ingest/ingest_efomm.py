import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import json
import glob
import time
import re
from pathlib import Path
from google import genai
from google.genai import types
from dotenv import load_dotenv

from scripts.ingest.parser_efomm import extract_text_and_images, split_into_questions, parse_alternatives

PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / "backend" / ".env")
client = genai.Client()
MODEL_ID = "gemini-3.5-flash-lite"

PROMPT_NORMALIZACAO = """
Você é um especialista em estruturação de dados.
Sua tarefa é reconstruir um lote de questões de matemática extraídas por OCR de um PDF. 
Algumas palavras, acentos e FÓRMULAS MATEMÁTICAS podem estar corrompidas.

Obrigatório:
- Reconstrua QUALQUER matemática presente em LaTeX puro sem os símbolos de $ ou $$. 
- O campo "enunciado" deve conter apenas o texto. 
- O campo "latex" deve conter APENAS as equações principais do enunciado formatadas em LaTeX (ex: x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}).
- Mantenha a pontuação e gramática perfeitas.
- Retorne EXATAMENTE as opções formatadas em alternativa_a até alternativa_e.
- O JSON deve ser um array onde cada elemento corresponde a uma questão do lote original.

Retorne SOMENTE o JSON:
[
  {
    "numero": 1,
    "enunciado": "Texto arrumado...",
    "latex": "fórmulas em latex extraídas do enunciado",
    "alternativa_a": "texto a",
    "alternativa_b": "texto b",
    "alternativa_c": "texto c",
    "alternativa_d": "texto d",
    "alternativa_e": "texto e",
    "gabarito": "A"
  }
]
"""

def normalizar_questoes(batch):
    texto_batch = ""
    for q in batch:
        texto_batch += f"QUESTÃO {q['numero']}:\n{q['enunciado']}\n"
        for k, v in q['alternativas'].items():
            texto_batch += f"({k[-1].upper()}) {v}\n"
        texto_batch += "\n---\n"
        
    try:
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=[PROMPT_NORMALIZACAO, texto_batch],
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        return json.loads(response.text.replace("\\\\", "\\\\\\\\"), strict=False)
    except Exception as e:
        print(f"Erro na API do Gemini: {e}")
        return []

def processar_pdf_efomm(pdf_path, ano):
    basename = os.path.basename(pdf_path)
    stem = basename.replace('.pdf', '')
    img_dir = PROJECT_ROOT / "data" / "sources" / "efomm" / "raw" / "images" / stem
    ext_path = PROJECT_ROOT / "data" / "sources" / "efomm" / "raw" / f"{stem}.json"
    proc_path = PROJECT_ROOT / "data" / "sources" / "efomm" / "processed" / f"{stem}.json"
    img_dir.mkdir(parents=True, exist_ok=True)
    
    if os.path.exists(proc_path):
        print(f"Arquivo {basename} já processado. Pulando...")
        return
        
    print(f"\n[1] Extraindo {basename}...")
    pages = extract_text_and_images(pdf_path, img_dir)
    qs_brutas = split_into_questions(pages)
    qs_parsed = parse_alternatives(qs_brutas)
    
    with open(ext_path, "w", encoding="utf-8") as f:
        json.dump(qs_parsed, f, ensure_ascii=False, indent=2)
        
    print(f"[2] Normalizando {len(qs_parsed)} questões com Gemini...")
    questoes_finais = []
    
    batch_size = 5
    for i in range(0, len(qs_parsed), batch_size):
        batch = qs_parsed[i:i+batch_size]
        print(f"    Batch {i+1} a {i+len(batch)}...")
        
        normalizadas = normalizar_questoes(batch)
        if normalizadas:
            questoes_finais.extend(normalizadas)
        
        time.sleep(5)
        
    with open(proc_path, "w", encoding="utf-8") as f:
        json.dump(questoes_finais, f, ensure_ascii=False, indent=2)
    print(f"[3] JSON processado salvo em {proc_path}")

if __name__ == "__main__":
    efomm_dir = r"C:\Users\Guilherme\Downloads\EFOMM"
    pdfs = glob.glob(os.path.join(efomm_dir, "*.pdf"))
    
    for pdf in pdfs:
        if "GABARITO" in os.path.basename(pdf).upper():
            continue
            
        ano = 2026
        match = re.search(r'(20\d{2})', os.path.basename(pdf))
        if match:
            ano = int(match.group(1))
            
        processar_pdf_efomm(pdf, ano)
