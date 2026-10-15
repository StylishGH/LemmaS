"""
Script de Reclassificacao e Promocao de 'Funcoes' a Grande Area Real no Supabase.
Lida com a migracao dos dados em public.questoes conforme Migration 10.
"""

import os
import sys
import re
from pathlib import Path
from dotenv import load_dotenv

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / "backend" / ".env")
load_dotenv(PROJECT_ROOT / ".env")

from supabase import create_client

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

if not url or not key:
    print("ERRO: Credenciais Supabase nao encontradas.")
    sys.exit(1)

supabase = create_client(url, key)

# Regex 1: Funcoes
# topico: (funç|func|afim|quadrátic|quadratic|parábola|parabola|exponencial|logarítm|logaritm|modular|domínio|dominio|injetora|bijetora|inversa)
RE_TOPICO_FUNCOES = re.compile(
    r"(funç|func|afim|quadr[áa]tic|par[áa]bola|exponencial|logar[íi]tm|modular|dom[íi]nio|injetora|sobrejetora|bijetora|inversa)",
    re.IGNORECASE
)

RE_ENUNCIADO_FUNCOES = re.compile(
    r"(f\(x\)|g\(x\)|f:\s*\\mathbb\{R\}|f\s*:\s*\\mathbb\{R\}|função|funcao)",
    re.IGNORECASE
)

# Regex 2: Distribuicao de Geral e Matematica Geral
RULES_GERAL = [
    ("Geometria Plana", re.compile(r"(tri[âa]ngul|circunfer[êe]nci|c[íi]rculo|pol[íi]gon|[áa]rea|geometria plana|ceviana|bissetriz|ret[âa]ngul|quadril[áa]ter)", re.IGNORECASE)),
    ("Geometria Espacial", re.compile(r"(prisma|pir[âa]mide|esfera|cilindro|cone|poliedro|tetraedro|volume|espacial)", re.IGNORECASE)),
    ("Geometria Analítica", re.compile(r"(elipse|hip[ée]rbole|cartesiano|reta|c[ôo]nica|anal[íi]tica)", re.IGNORECASE)),
    ("Trigonometria", re.compile(r"(seno|cosseno|tangente|\\sin|\\cos|\\tan|trigonom)", re.IGNORECASE)),
    ("Álgebra Linear", re.compile(r"(matriz|determinante|sistema linear|autovalor|vetorial|linear)", re.IGNORECASE)),
    ("Cálculo", re.compile(r"(limite|derivada|integral|\\int|\\lim|edo|c[áa]lculo)", re.IGNORECASE)),
    ("Probabilidade e Combinatória", re.compile(r"(probabilidade|combinat[óo]ria|permuta|arranjo|escolh|sortei|dado|urna|baralho|contagem|l[óo]gica)", re.IGNORECASE)),
    ("Teoria dos Números", re.compile(r"(primo|divisibil|m[óo]dulo|congru[êe]nc|mdc|mmc|inteiro|diofantin)", re.IGNORECASE)),
    ("Polinômios e Complexos", re.compile(r"(polin[ôo]m|complexo|imagin[áa]ri|ra[íi]zes|girard|briot)", re.IGNORECASE)),
    ("Matemática Básica", re.compile(r"(porcentagem|regra de tr[êe]s|fra[çc][ãa]o|raz[ãa]o|propor[çc][ãa]o|aritm[ée]ti)", re.IGNORECASE)),
]

def classificar_geral(topico: str, enunciado: str) -> str:
    texto = f"{topico or ''} {(enunciado or '')[:300]}"
    for materia_alvo, regex in RULES_GERAL:
        if regex.search(texto):
            return materia_alvo
    return "Álgebra"

def fetch_all_by_materia(materias: list) -> list:
    all_rows = []
    page_size = 1000
    for mat in materias:
        offset = 0
        while True:
            res = supabase.table("questoes")\
                .select("id, materia, topico, enunciado")\
                .eq("materia", mat)\
                .range(offset, offset + page_size - 1)\
                .execute()
            rows = res.data or []
            all_rows.extend(rows)
            if len(rows) < page_size:
                break
            offset += page_size
    return all_rows

def run_dry_run():
    print("[*] Buscando questoes de Álgebra, Geral, Matemática Geral, Matemática, Matemática Básica, Lógica...")
    target_materias = ['Álgebra', 'Geral', 'Matemática Geral', 'Matemática', 'Matemática Básica', 'Lógica']
    rows = fetch_all_by_materia(target_materias)
    print(f"[*] Total de questoes carregadas para analise: {len(rows)}")

    promover_para_funcoes = []
    redistribuir_geral = []

    for r in rows:
        mat = r.get("materia")
        top = r.get("topico") or ""
        enunc = r.get("enunciado") or ""

        # Passo 1: Verificar se promove para Funcoes
        # (se topico ou enunciado contem padroes de funcao)
        e_funcao = False
        if RE_TOPICO_FUNCOES.search(top):
            e_funcao = True
        elif RE_ENUNCIADO_FUNCOES.search(enunc):
            e_funcao = True

        if e_funcao and mat in ['Álgebra', 'Geral', 'Matemática Geral', 'Matemática', 'Matemática Básica']:
            promover_para_funcoes.append(r["id"])
        elif mat in ['Geral', 'Matemática Geral', 'Matemática', 'Lógica']:
            nova_mat = classificar_geral(top, enunc)
            redistribuir_geral.append((r["id"], nova_mat))

    print(f"\n[DRY RUN - RESULTADOS]")
    print(f"-> Questoes a serem promovidas para 'Funções': {len(promover_para_funcoes)}")
    print(f"-> Questoes de 'Geral'/'Lógica' a redistribuir: {len(redistribuir_geral)}")

    dist_geral = {}
    for _, nm in redistribuir_geral:
        dist_geral[nm] = dist_geral.get(nm, 0) + 1
    print("-> Destino das questoes de Geral/Lógica:")
    for k, v in dist_geral.items():
        print(f"   {k}: {v}")

if __name__ == "__main__":
    run_dry_run()
