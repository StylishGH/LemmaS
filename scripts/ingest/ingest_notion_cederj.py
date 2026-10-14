import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import os
import glob
import time
import json
import sqlite3
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
client = genai.Client()
MODEL_ID = "gemini-3.5-flash-lite"
DB_PATH = Path("C:/Users/Guilherme/Documents/MathAI/data/mathai.db")

PROMPT_NOTION = """
Você é um professor de matemática especialista no material do CEDERJ.
Aqui está o conteúdo de uma ou mais páginas do meu Notion.
A sua tarefa é encontrar exercícios/questões e extraí-los.
ATENÇÃO: Extraia APENAS as questões puramente de MATEMÁTICA (Cálculo, Álgebra Linear, Geometria, Matemática Discreta, etc). Ignore textos teóricos ou pessoais.

Regras:
1. ATENÇÃO MÁXIMA AO LATEX: Todas as equações, frações, matrizes e símbolos matemáticos DEVEM obrigatoriamente estar envolvidos por $$ ... $$ (para blocos) ou $ ... $ (para linha). Converta qualquer notação estranha para LaTeX.
2. Tente deduzir a matéria (ex: Cálculo 3, Álgebra Linear) pelo contexto.
3. Responda ESTRITAMENTE num array JSON com este formato:
[
  {
    "enunciado": "Texto da questão...",
    "alternativas": {"A": "...", "B": "..."}, // Se houver, se for discursiva deixe vazio
    "gabarito": "Letra correta OU resolução passo a passo/resposta final",
    "materia": "Cálculo 1",
    "topico": "Geral",
    "banca": "CEDERJ",
    "ano": 2024
  }
]
Se não encontrar questões, retorne [].
"""

def salvar_no_banco(questoes):
    if not questoes:
        return
        
    import sys, os
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
    from src.database.db import pegar_conexao
    
    con = pegar_conexao()
    inseridas = 0
    
    for q in questoes:
        enunciado = q.get("enunciado", "")
        
        # Concatena as alternativas no final do enunciado, se existirem
        alts = q.get("alternativas", {})
        if isinstance(alts, dict) and alts:
            alt_lines = []
            for k, v in alts.items():
                letra = k[-1].upper()  # Pega "A" de "alternativa_a" ou "A"
                alt_lines.append(f"({letra}) {v}")
            if alt_lines:
                enunciado += "\n\n" + "\n".join(alt_lines)
                
        gabarito = str(q.get("gabarito", ""))
        
        try:
            con.execute("""
                INSERT INTO questoes (banca, ano, materia, topico, enunciado, gabarito)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                q.get("banca", "CEDERJ"),
                q.get("ano", 2024),
                q.get("materia", "Matemática"),
                q.get("topico", "Geral"),
                enunciado,
                gabarito
            ))
            inseridas += 1
        except Exception as e:
            print(f"Erro ao inserir questao: {e}")
            
    con.commit()
    print(f"{inseridas} questoes do Notion salvas diretamente no banco de dados!")


def processar_arquivos(md_files):
    chunks = []
    current_chunk = ""
    for f in md_files:
        try:
            with open(f, 'r', encoding='utf-8') as file:
                texto = file.read()
                if len(texto) < 50: continue
                current_chunk += f"\n\n--- ARQUIVO: {os.path.basename(f)} ---\n\n" + texto
                if len(current_chunk) > 20000:
                    chunks.append(current_chunk)
                    current_chunk = ""
        except Exception:
            pass
    if current_chunk:
        chunks.append(current_chunk)

    print(f"Total de blocos de texto gerados: {len(chunks)}")
    total_extraidas = 0

    for idx, chunk in enumerate(chunks):
        print(f"Enviando bloco {idx+1}/{len(chunks)} para o Gemini...")
        try:
            response = client.models.generate_content(
                model=MODEL_ID,
                contents=[PROMPT_NOTION, chunk],
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    response_mime_type="application/json"
                )
            )
            # Prevenir erro de parsing por slashes escapadas
            text_json = response.text.replace('\\\\', '\\\\\\\\')
            questoes = json.loads(text_json, strict=False)
            print(f"{len(questoes)} questoes extraidas deste bloco.")
            salvar_no_banco(questoes)
            total_extraidas += len(questoes)
        except Exception as e:
            print(f"Erro no bloco {idx+1}: {e}")
        
        if idx < len(chunks) - 1:
            print("Pausa de 5s para respeitar limites do Free Tier...")
            time.sleep(5)

    print(f"\nIngestao Notion concluida! Total salvas: {total_extraidas}")

if __name__ == "__main__":
    notion_dir = r"D:\Downloads\Notion"
    md_files = glob.glob(os.path.join(notion_dir, "**", "*.md"), recursive=True)
    processar_arquivos(md_files)
