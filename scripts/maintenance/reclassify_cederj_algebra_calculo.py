#!/usr/bin/env python3
"""
Script para reclassificar questões CEDERJ no Supabase:
- Álgebra Linear I: Matrizes, Determinantes, Sistemas Lineares, Espaços Vetoriais,
  Subespaços, Base e Dimensão, Transformações Lineares, Vetores, Combinação Linear
- Cálculo 3: Funções Vetoriais, Curvas no Espaço, Limites de Várias Variáveis,
  Derivadas Parciais, Regra da Cadeia Multivariada, Vetor Gradiente, Plano Tangente,
  Otimização e Lagrange, Derivada Direcional, Diferenciabilidade, Funções de Várias Variáveis,
  Continuidade de Funções Vetoriais, Limites de Funções Vetoriais, Parametrização
"""

import os
import sys
import re
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / "backend" / ".env")
load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(PROJECT_ROOT / "frontend" / ".env.local")

from supabase import create_client

# Carregar credenciais
url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not url or not key:
    print("ERRO: Credenciais Supabase não encontradas.")
    print("Configure SUPABASE_URL e SUPABASE_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY) no ambiente.")
    sys.exit(1)

supabase = create_client(url, key)

# ============================================================================
# REGRAS DE CLASSIFICAÇÃO PARA ÁLGEBRA LINEAR I
# ============================================================================
# Tópicos que pertencem a Álgebra Linear I (Matrizes, Determinantes, Sistemas Lineares,
# Espaços Vetoriais, Subespaços, Base e Dimensão, Transformações Lineares, Vetores)
RE_ALGEBRA_LINEAR_I = re.compile(
    r"""
    (matriz|determinante|sistema\s+linear|espa[çc]o\s+vetorial|subespa[çc]o|
     base\s+e\s+dimens[ãa]o|transforma[çc][ãa]o\s+linear|vetores?\b|
     combina[çc][ãa]o\s+linear|espa[çc]os?\s+e\s+subespa[çc]os?|
     invertibilidade|escalonamento|produto\s+interno\b|ortogonalidade\b|
     base\b|dimens[ãa]o\b|dependência\s+linear|independência\s+linear|
     gerad[oô]r|subespa[çc]o\s+gerado)
    """,
    re.IGNORECASE | re.VERBOSE
)

# Tópicos que NÃO pertencem a Álgebra Linear I (são Álgebra Linear II / Avançado)
RE_ALGEBRA_LINEAR_II = re.compile(
    r"""
    (autovalor|autovetor|diagonaliza[çc][ãa]o|operador\s+ortogonal|
     teorema\s+espectral|forma\s+quadr[áa]tica|cayley.hamilton|
     espa[çc]o\s+dual|funcional\s+linear|produto\s+interno\s+avancado|
     operador\s+linear\s+auto.adjunto|espectral)
    """,
    re.IGNORECASE | re.VERBOSE
)

# ============================================================================
# REGRAS DE CLASSIFICAÇÃO PARA CÁLCULO 3
# ============================================================================
# Tópicos que pertencem a Cálculo 3 (Cálculo Multivariado / Vetorial)
RE_CALCULO_3 = re.compile(
    r"""
    (fun[çc][ãa]o\s+vetorial|curva\s+no\s+espa[çc]o|parametriza[çc][ãa]o|
     limite\s+de\s+fun[çc][ão]?\s+de\s+v[áa]rias\s+vari[áa]veis|
     limite\s+de\s+fun[çc][ão]?\s+vetorial|derivada\s+parcial|
     diferenciabilidade\s+multivariada|regra\s+da\s+cadeia\s+multivariada|
     vetor\s+gradiente|gradiente\b|plano\s+tangente|otimiza[çc][ãa]o\s+e\s+lagrange|
     multiplicadores?\s+de\s+lagrange|derivada\s+direcional|
     fun[çc][ão]?\s+de\s+v[áa]rias\s+vari[áa]veis|continuidade\s+de\s+fun[çc][ão]?\s+vetorial|
     c[áa]lculo\s+vetorial|integrais?\s+m[úu]ltiplas|integrais?\s+de\s+linha|
     campo\s+vetorial|teorema\s+de\s+green|stokes|gauss|diverg[êe]ncia|rotacional|
     fun[çc][õo]es\s+de\s+v[áa]rias\s+vari[áa]veis|fun[çc][õo]es\s+vetoriais?)
    """,
    re.IGNORECASE | re.VERBOSE
)

# Tópicos que são Cálculo 1 (uma variável) - NÃO reclassificar
RE_CALCULO_1 = re.compile(
    r"""
    (limite\s+(?!de\s+fun[çc][ão]?\s+de\s+v[áa]rias\s+vari[áa]veis|de\s+fun[çc][ão]?\s+vetorial)
       (b[áa]sico|propriedade|indetermina[çc][ãa]o|infinito|continuidade)\b|
     derivada\s+(?!parcial|direcional|multivariada|vetorial)(b[áa]sica|regra|cadeia|impl[íi]cita)\b|
     integral\s+(?!m[úu]ltipla|linha|dupla|tripla)(definida|indefinida|b[áa]sica)\b|
     s[ée]rie|sequ[eê]ncia|fun[çc][ão]\s+real\s+de\s+uma\s+vari[áa]vel)
    """,
    re.IGNORECASE | re.VERBOSE
)

def fetch_cederj_by_materia(materia: str):
    """Busca todas as questões CEDERJ de uma matéria específica."""
    all_rows = []
    page_size = 1000
    offset = 0
    while True:
        res = supabase.table("questoes")\
            .select("id, materia, topico, enunciado, ano")\
            .eq("banca", "CEDERJ")\
            .eq("materia", materia)\
            .range(offset, offset + page_size - 1)\
            .execute()
        rows = res.data or []
        all_rows.extend(rows)
        if len(rows) < page_size:
            break
        offset += page_size
    return all_rows

from typing import Optional

def classificar_algebra_linear(topico: str, enunciado: str) -> Optional[str]:
    """
    Classifica se a questão de Álgebra Linear pertence a Álgebra Linear I ou II.
    Retorna 'Álgebra Linear I', 'Álgebra Linear II' ou None (manter como está).
    """
    texto = f"{topico or ''} {(enunciado or '')[:500]}"
    
    # Verifica se é explicitamente Álgebra Linear II
    if RE_ALGEBRA_LINEAR_II.search(texto):
        return "Álgebra Linear II"
    
    # Verifica se é Álgebra Linear I
    if RE_ALGEBRA_LINEAR_I.search(texto):
        return "Álgebra Linear I"
    
    return None

def classificar_calculo(topico: str, enunciado: str) -> str:
    """
    Classifica se a questão de Cálculo pertence a Cálculo 3 ou deve permanecer como Cálculo (1/2).
    Retorna 'Cálculo 3' ou 'Cálculo'.
    """
    texto = f"{topico or ''} {(enunciado or '')[:500]}"
    
    # Verifica se é explicitamente Cálculo 3
    if RE_CALCULO_3.search(texto):
        return "Cálculo 3"
    
    # Verifica se é Cálculo 1 (não reclassificar)
    if RE_CALCULO_1.search(texto):
        return "Cálculo"
    
    # Para questões de Cálculo sem tópico claro, assumir Cálculo 1/2 (manter como Cálculo)
    return "Cálculo"

def run_dry_run():
    print("=" * 70)
    print("DRY RUN - Reclassificação CEDERJ: Álgebra Linear I & Cálculo 3")
    print("=" * 70)
    
    # 1. Álgebra Linear
    print("\n[1] Buscando questões CEDERJ com materia = 'Álgebra Linear'...")
    algebra_rows = fetch_cederj_by_materia("Álgebra Linear")
    print(f"    Total encontradas: {len(algebra_rows)}")
    
    algebra_i = []
    algebra_ii = []
    algebra_unchanged = []
    
    for r in algebra_rows:
        nova = classificar_algebra_linear(r.get("topico"), r.get("enunciado"))
        if nova == "Álgebra Linear I":
            algebra_i.append((r["id"], r["topico"], nova))
        elif nova == "Álgebra Linear II":
            algebra_ii.append((r["id"], r["topico"], nova))
        else:
            algebra_unchanged.append((r["id"], r["topico"], r["materia"]))
    
    print(f"    -> Para 'Álgebra Linear I': {len(algebra_i)}")
    for id_, topico, _ in algebra_i:
        print(f"       ID {id_}: {topico}")
    print(f"    -> Para 'Álgebra Linear II': {len(algebra_ii)}")
    for id_, topico, _ in algebra_ii:
        print(f"       ID {id_}: {topico}")
    print(f"    -> Sem alteração: {len(algebra_unchanged)}")
    
    # 2. Cálculo
    print("\n[2] Buscando questões CEDERJ com materia = 'Cálculo'...")
    calculo_rows = fetch_cederj_by_materia("Cálculo")
    print(f"    Total encontradas: {len(calculo_rows)}")
    
    calculo_3 = []
    calculo_unchanged = []
    
    for r in calculo_rows:
        nova = classificar_calculo(r.get("topico"), r.get("enunciado"))
        if nova == "Cálculo 3":
            calculo_3.append((r["id"], r["topico"], nova))
        else:
            calculo_unchanged.append((r["id"], r["topico"], r["materia"]))
    
    print(f"    -> Para 'Cálculo 3': {len(calculo_3)}")
    for id_, topico, _ in calculo_3:
        print(f"       ID {id_}: {topico}")
    print(f"    -> Manter como 'Cálculo': {len(calculo_unchanged)}")
    for id_, topico, _ in calculo_unchanged[:10]:
        print(f"       ID {id_}: {topico}")
    if len(calculo_unchanged) > 10:
        print(f"       ... e mais {len(calculo_unchanged) - 10}")
    
    # Resumo
    print("\n" + "=" * 70)
    print("RESUMO DO DRY RUN")
    print("=" * 70)
    print(f"Álgebra Linear I:     {len(algebra_i)} questões")
    print(f"Álgebra Linear II:    {len(algebra_ii)} questões")
    print(f"Álgebra Linear (mantém): {len(algebra_unchanged)} questões")
    print(f"Cálculo 3:            {len(calculo_3)} questões")
    print(f"Cálculo (mantém):     {len(calculo_unchanged)} questões")
    
    return {
        "algebra_i": algebra_i,
        "algebra_ii": algebra_ii,
        "calculo_3": calculo_3,
    }

def run_update(dry_run_results: dict):
    """Executa as atualizações no banco de dados."""
    print("\n" + "=" * 70)
    print("EXECUTANDO ATUALIZAÇÕES NO SUPABASE")
    print("=" * 70)
    
    updates = []
    
    # Preparar updates para Álgebra Linear I
    for id_, topico, nova in dry_run_results["algebra_i"]:
        updates.append((id_, "Álgebra Linear I"))
    
    # Preparar updates para Álgebra Linear II
    for id_, topico, nova in dry_run_results["algebra_ii"]:
        updates.append((id_, "Álgebra Linear II"))
    
    # Preparar updates para Cálculo 3
    for id_, topico, nova in dry_run_results["calculo_3"]:
        updates.append((id_, "Cálculo 3"))
    
    if not updates:
        print("Nenhuma atualização a realizar.")
        return
    
    print(f"Total de updates a executar: {len(updates)}")
    
    # Executar em lotes
    batch_size = 50
    success = 0
    failed = 0
    
    for i in range(0, len(updates), batch_size):
        batch = updates[i:i+batch_size]
        for qid, nova_materia in batch:
            try:
                res = supabase.table("questoes")\
                    .update({"materia": nova_materia})\
                    .eq("id", qid)\
                    .execute()
                if res.data:
                    success += 1
                    if success % 10 == 0:
                        print(f"  Atualizados: {success}/{len(updates)}")
                else:
                    failed += 1
                    print(f"  FALHA ID {qid}: Nenhum dado retornado")
            except Exception as e:
                failed += 1
                print(f"  ERRO ID {qid}: {e}")
    
    print(f"\nConcluído! Sucesso: {success}, Falhas: {failed}")

def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--apply":
        dry_run_results = run_dry_run()
        
        # Confirmação
        total_changes = (len(dry_run_results["algebra_i"]) + 
                        len(dry_run_results["algebra_ii"]) + 
                        len(dry_run_results["calculo_3"]))
        
        if total_changes == 0:
            print("\nNenhuma alteração necessária.")
            return
        
        print(f"\nTotal de questões a reclassificar: {total_changes}")
        confirm = input("Confirmar execução? (sim/não): ").strip().lower()
        if confirm in ("sim", "s", "yes", "y"):
            run_update(dry_run_results)
        else:
            print("Operação cancelada.")
    else:
        run_dry_run()
        print("\nPara aplicar as mudanças, execute com: python reclassify_cederj_algebra_calculo.py --apply")

if __name__ == "__main__":
    main()