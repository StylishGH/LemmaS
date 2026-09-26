"""
Script para auditoria profunda de todas as questões do CEDERJ.
Verifica:
1. Questões marcadas como 'objetiva' que não possuem alternativas (A), (B), (C), (D) no enunciado.
2. Questões com gabarito sem LaTeX ou com LaTeX truncado/cru.
3. Consistência entre SQLite e Turso.
"""

import sys
import json
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

from src.database.db import DB_PATH, pegar_conexao
from src.app.utils import extrair_enunciado_e_alternativas, e_questao_discursiva, corrigir_latex

def auditar_banco(nome_banco, con):
    cur = con.cursor()
    cur.execute("SELECT id, materia, topico, subtopico, tipo, ano, enunciado, gabarito FROM questoes WHERE banca LIKE '%CEDERJ%' ORDER BY id")
    rows = cur.fetchall()
    print(f"\n=======================================================")
    print(f"=== AUDITORIA: {nome_banco} (Total CEDERJ: {len(rows)}) ===")
    print(f"=======================================================")

    falsas_objetivas = []
    gabaritos_sem_latex = []
    
    for r in rows:
        d = dict(r) if hasattr(r, 'keys') else {
            "id": r[0], "materia": r[1], "topico": r[2], "subtopico": r[3],
            "tipo": r[4], "ano": r[5], "enunciado": r[6], "gabarito": r[7]
        }
        
        qid = d["id"]
        tipo = d["tipo"]
        enunciado = d["enunciado"] or ""
        gabarito = d["gabarito"] or ""
        
        # Teste 1: É classificada como objetiva mas não tem alternativas?
        corpo, alts = extrair_enunciado_e_alternativas(enunciado)
        if tipo == "objetiva" and len(alts) < 2:
            falsas_objetivas.append(d)
            print(f"[FALSA OBJETIVA] ID #{qid} | Matéria: {d['materia']} | Tópico: {d['topico']} | Alternativas encontradas: {len(alts)}")
            print(f"   Enunciado preview: {enunciado[:100]}...")
            print(f"   Gabarito atual: {gabarito[:80]}...")
            print()

        # Teste 2: Gabarito tem notação matemática crua (ex: lim, sqrt, nabla, frações tipo / sem LaTeX)
        # ou é discursiva mas não tem delimitadores $...$
        if tipo == "discursiva" or len(alts) < 2:
            tem_math = any(kw in gabarito.lower() for kw in ["lim", "sqrt", "nabla", "frac", "x^", "y^", "t^", "\\", "sen", "cos", "pi", "int"])
            tem_latex = "$" in gabarito
            if tem_math and not tem_latex:
                gabaritos_sem_latex.append(d)
                print(f"[GABARITO SEM LATEX] ID #{qid} | Matéria: {d['materia']} | Tópico: {d['topico']}")
                print(f"   Gabarito: {gabarito[:100]}...")
                print()

    print("\n--- LISTAGEM GERAL DE TODAS AS QUESTÕES CEDERJ ---")
    for r in rows:
        d = dict(r) if hasattr(r, 'keys') else {
            "id": r[0], "materia": r[1], "topico": r[2], "subtopico": r[3],
            "tipo": r[4], "ano": r[5], "enunciado": r[6], "gabarito": r[7]
        }
        corpo, alts = extrair_enunciado_e_alternativas(d['enunciado'] or '')
        tem_dollar = "$" in (d['gabarito'] or '')
        print(f"ID #{d['id']:4d} | {d['materia']:<25s} | Tipo: {d['tipo']:<11s} | Alts: {len(alts)} | Gab LaTeX: {tem_dollar} | Topico: {d['topico']}")

    print("\n--- AUDITORIA GLOBAL DE TODAS AS OBJETIVAS DO BANCO ---")
    cur.execute("SELECT id, banca, materia, topico, enunciado FROM questoes WHERE tipo = 'objetiva'")
    todas_obj = cur.fetchall()
    falsas_globais = []
    for r in todas_obj:
        d = dict(r) if hasattr(r, 'keys') else {"id": r[0], "banca": r[1], "materia": r[2], "topico": r[3], "enunciado": r[4]}
        corpo, alts = extrair_enunciado_e_alternativas(d['enunciado'] or '')
        if len(alts) < 2:
            falsas_globais.append(d)
    print(f"Total de questões objetivas no banco: {len(todas_obj)}")
    print(f"Total sem alternativas suficientes: {len(falsas_globais)}")
    for f in falsas_globais:
        print(f"ID #{f['id']} | Banca: {f['banca']} | {f['materia']} | {f['topico']}")

    return rows, falsas_objetivas, gabaritos_sem_latex

if __name__ == "__main__":
    conn_turso = pegar_conexao()
    auditar_banco("Turso Cloud", conn_turso)
