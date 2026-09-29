import sys, os, glob, unicodedata, json, time
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from dotenv import load_dotenv
from google import genai
from google.genai import types
from src.database.db import pegar_conexao

load_dotenv()
client = genai.Client()
MODEL_ID = 'gemini-3.5-flash-lite'

def normalize(text):
    return unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('utf-8').lower()

notion_dir = r'D:\Downloads\Notion'
all_files = glob.glob(os.path.join(notion_dir, '**', '*.md'), recursive=True)
cg_files = [f for f in all_files if 'constru' in normalize(f) and 'geom' in normalize(f)]

text_blocks = []
curr = ''
for f in cg_files:
    try:
        with open(f, 'r', encoding='utf-8') as file:
            t = file.read()
            if len(t) < 50: continue
            curr += f'\n\n--- {os.path.basename(f)} ---\n\n' + t
            if len(curr) > 10000:
                text_blocks.append(curr)
                curr = ''
    except: pass
if curr: text_blocks.append(curr)

prompt = """Você é um professor de matemática especialista no material do CEDERJ.
Esta é a disciplina de Construções Geométricas. Extraia QUALQUER exercício, incluindo os discursivos de passo a passo de régua e compasso.
Regras:
1. LaTeX em blocos ($$ ... $$) e linha ($ ... $). Escape chaves.
2. Formato JSON exato:
[{"enunciado": "...", "alternativas": {}, "gabarito": "...", "materia": "Construções Geométricas", "topico": "Geral", "banca": "CEDERJ", "ano": 2024}]
Se não encontrar questões, retorne []."""

con = pegar_conexao()
total_saved = 0

for i, chunk in enumerate(text_blocks):
    success = False
    attempts = 0
    while not success and attempts < 5:
        try:
            print(f'Enviando bloco {i+1}/{len(text_blocks)} (Tentativa {attempts+1})')
            response = client.models.generate_content(
                model=MODEL_ID,
                contents=[prompt, chunk],
                config=types.GenerateContentConfig(temperature=0.1, response_mime_type='application/json')
            )
            text_json = response.text.replace('\\\\', '\\\\\\\\')
            questoes = json.loads(text_json, strict=False)
            
            for q in questoes:
                enunciado = q.get('enunciado', '')
                alts = q.get('alternativas', {})
                if isinstance(alts, dict) and alts:
                    alt_lines = []
                    for k, v in alts.items():
                        letra = k[-1].upper()
                        if letra in ['1','2','3','4','5']: letra = chr(ord('A') + int(letra) - 1)
                        alt_lines.append(f'({letra}) {v}')
                    if alt_lines: enunciado += '\n\n' + '\n'.join(alt_lines)
                
                # Consertando o LaTeX duplo gerado pelo JSON.loads + replace
                enunciado = enunciado.replace('\\\\', '\\')
                gabarito = str(q.get('gabarito', '')).replace('\\\\', '\\')
                
                con.execute('INSERT INTO questoes (banca, ano, materia, topico, enunciado, gabarito) VALUES (?, ?, ?, ?, ?, ?)', (
                    q.get('banca', 'CEDERJ'), q.get('ano', 2024), q.get('materia', 'Construções Geométricas'), q.get('topico', 'Geral'), enunciado, gabarito))
                total_saved += 1
            con.commit()
            success = True
            print(f'Salvas {len(questoes)} questoes deste bloco.')
        except Exception as e:
            if '429' in str(e) or 'Quota' in str(e) or 'quota' in str(e):
                print('Rate limit atingido. Dormindo 40s...')
                time.sleep(40)
                attempts += 1
            else:
                print(f'Erro de parsing: {e}')
                break
    time.sleep(10)

print(f'Total final Construções Geométricas salvas: {total_saved}')
