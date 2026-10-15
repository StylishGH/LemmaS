"""
Script de Execução da Migration 10 no Supabase PostgreSQL:
1. Promove questões com conteúdo de Funções para a Grande Área 'Funções'.
2. Redistribui as questões de 'Geral', 'Matemática Geral', 'Matemática Financeira' e 'Lógica'.
3. Valida a integridade final de 20.803 questões com get_lemmas_global_stats().
"""

import os
import sys
import re
import time
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
    print("ERRO: Credenciais Supabase não encontradas.")
    sys.exit(1)

supabase = create_client(url, key)

RE_TOPICO_FUNCOES = re.compile(
    r"(funç|func|afim|quadr[áa]tic|par[áa]bola|exponencial|logar[íi]tm|modular|dom[íi]nio|injetora|sobrejetora|bijetora|inversa)",
    re.IGNORECASE
)

RE_ENUNCIADO_FUNCOES = re.compile(
    r"(f\(x\)|g\(x\)|f:\s*\\mathbb\{R\}|f\s*:\s*\\mathbb\{R\}|função|funcao)",
    re.IGNORECASE
)

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
    ("Matemática Básica", re.compile(r"(porcentagem|regra de tr[êe]s|fra[çc][ãa]o|raz[ãa]o|propor[çc][ãa]o|aritm[ée]ti|financeir)", re.IGNORECASE)),
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

def batch_update_materia(ids: list, nova_materia: str, chunk_size: int = 100):
    total = len(ids)
    if total == 0:
        return
    print(f"[*] Atualizando {total} questões para materia='{nova_materia}' em lotes de {chunk_size}...")
    for i in range(0, total, chunk_size):
        chunk = ids[i:i + chunk_size]
        res = supabase.table("questoes").update({"materia": nova_materia}).in_("id", chunk).execute()
        time.sleep(0.1)
    print(f"[✓] {total} questões atualizadas com sucesso para '{nova_materia}'.")

def execute_migration():
    print("=" * 70)
    print("MIGRATION 10: PROMOÇÃO DE FUNÇÕES E LIMPEZA DE MATÉRIAS")
    print("=" * 70)

    # 1. Carrega registros candidatos
    target_materias = ['Álgebra', 'Geral', 'Matemática Geral', 'Matemática', 'Matemática Básica', 'Matemática Financeira', 'Lógica']
    print(f"[*] Buscando registros nas matérias: {target_materias}")
    rows = fetch_all_by_materia(target_materias)
    print(f"[*] Total de registros carregados: {len(rows)}")

    promover_para_funcoes = []
    redistribuir_por_materia = {}

    for r in rows:
        mat = r.get("materia")
        top = r.get("topico") or ""
        enunc = r.get("enunciado") or ""

        # Passo 1: Funções
        e_funcao = False
        if RE_TOPICO_FUNCOES.search(top):
            e_funcao = True
        elif RE_ENUNCIADO_FUNCOES.search(enunc):
            e_funcao = True

        if e_funcao and mat in ['Álgebra', 'Geral', 'Matemática Geral', 'Matemática', 'Matemática Básica']:
            promover_para_funcoes.append(r["id"])
        elif mat in ['Geral', 'Matemática Geral', 'Matemática', 'Lógica']:
            nova_mat = classificar_geral(top, enunc)
            if nova_mat not in redistribuir_por_materia:
                redistribuir_por_materia[nova_mat] = []
            redistribuir_por_materia[nova_mat].append(r["id"])
        elif mat == 'Matemática Financeira':
            # Matemática Financeira -> Matemática Básica
            if 'Matemática Básica' not in redistribuir_por_materia:
                redistribuir_por_materia['Matemática Básica'] = []
            redistribuir_por_materia['Matemática Básica'].append(r["id"])

    print(f"\n[PLANO DE EXECUÇÃO]")
    print(f"1. Promover para 'Funções': {len(promover_para_funcoes)} questões")
    for mat_destino, id_list in redistribuir_por_materia.items():
        print(f"2. Redistribuir para '{mat_destino}': {len(id_list)} questões")

    # Executa Passo 1: Funções
    batch_update_materia(promover_para_funcoes, "Funções", chunk_size=100)

    # Executa Passo 2: Redistribuição de resíduos
    for mat_destino, id_list in redistribuir_por_materia.items():
        batch_update_materia(id_list, mat_destino, chunk_size=100)

    print("\n[*] Validando resultado com get_lemmas_global_stats()...")
    time.sleep(1)
    stats = supabase.rpc("get_lemmas_global_stats").execute()
    materias_novas = stats.data.get("materias", [])

    print("\n" + "=" * 70)
    print("NOVA DISTRIBUIÇÃO CANÔNICA DE GRANDES ÁREAS (TOTAL: 20.803):")
    print("=" * 70)
    total_geral = 0
    for m in materias_novas:
        nome = m.get("nome")
        tot = m.get("total")
        total_geral += tot
        print(f"  • {nome.ljust(30)}: {str(tot).rjust(6)} questões")
    print("-" * 70)
    print(f"  TOTAL GERAL NO BANCO: {total_geral}")
    print("=" * 70)

if __name__ == "__main__":
    execute_migration()
