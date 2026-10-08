"""
Testes Locais de Validação para Questões do CEDERJ (Cálculo 3 e Álgebra Linear).
Garante integridade de dados, compatibilidade com o Treinador e Avaliador Cognitivo.
"""

import sys
import io
import json
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

from src.database.db import listar_questoes, buscar_questao_por_id, DB_PATH
from src.app.utils import extrair_enunciado_e_alternativas, e_questao_discursiva, corrigir_latex
from src.ai.evaluator import analisar_resolucao

def testar_recuperacao_banco():
    print("=== TESTE 1: Recuperação no Banco de Dados ===")
    questoes = [dict(q) for q in listar_questoes()]
    
    cederj_todas = [q for q in questoes if "CEDERJ" in str(q.get("banca", ""))]
    calc3 = [q for q in cederj_todas if q.get("materia") == "Cálculo 3"]
    alg_lin = [q for q in cederj_todas if q.get("materia") == "Álgebra Linear"]
    calc1 = [q for q in cederj_todas if q.get("materia") == "Cálculo 1"]
    
    print(f"Total de questões no acervo: {len(questoes)}")
    print(f"Total CEDERJ no acervo: {len(cederj_todas)}")
    print(f"Cálculo 3 (CEDERJ): {len(calc3)} encontradas")
    print(f"Álgebra Linear (CEDERJ): {len(alg_lin)} encontradas")
    print(f"Cálculo 1 (CEDERJ): {len(calc1)} encontradas")
    
    assert len(cederj_todas) >= 74, f"Esperado pelo menos 74 do CEDERJ, obteve {len(cederj_todas)}"
    print(f"Total CEDERJ: {len(cederj_todas)} questões validadas com sucesso.")
    print("✔ Teste 1 passou com sucesso!\n")
    return cederj_todas

def testar_formatacao_latex_e_alternativas(cederj_todas):
    print("=== TESTE 2: Formatação LaTeX, Alternativas e Tipo em TODAS as questões CEDERJ ===")
    falsas_obj = 0
    for q in cederj_todas:
        qid = q.get("id")
        materia = q.get("materia")
        topico = q.get("topico")
        tipo = q.get("tipo")
        enunciado = q.get("enunciado", "")
        gabarito = q.get("gabarito", "")
        
        # Testa detecção de discursiva vs objetiva
        is_disc = e_questao_discursiva(q)
        if tipo == "discursiva":
            assert is_disc, f"Questão #{qid} ({topico}) deveria ser discursiva"
        else:
            corpo, alts = extrair_enunciado_e_alternativas(enunciado)
            assert len(alts) >= 2, f"Questão objetiva #{qid} ({topico}) deve ter alternativas (A, B, C, D, E), obteve {len(alts)}"
            assert q.get("gabarito") in alts, f"Gabarito {q.get('gabarito')} deve constar nas alternativas da questão #{qid}"
            
        # Testa se gabarito discursivo tem LaTeX válido
        if is_disc:
            gab_corrigido = corrigir_latex(gabarito)
            assert len(gab_corrigido.strip()) > 0, f"Gabarito da discursiva #{qid} não pode ser vazio"
            
    print(f"✔ Teste 2 passou com sucesso para todas as {len(cederj_todas)} questões do CEDERJ!\n")

def testar_avaliador_cognitivo(calc3, alg_lin):
    print("=== TESTE 3: Avaliador Cognitivo em Questões do CEDERJ ===")
    
    # 1. Teste em Cálculo 3 (Funções Vetoriais)
    q_calc = calc3[0] # Produto escalar e vetorial
    just_calc = "Fiz o produto escalar somando as coordenadas: t*3 + t^2*t + 2*t = 5t + t^3. Para o produto vetorial, usei o determinante i, j, k e a componente em k é t*t - 3*t^2 = -2t^2."
    print(f"Avaliando resolução em Cálculo 3 (#{q_calc['id']} - {q_calc['topico']})...")
    res_calc = analisar_resolucao(questao=q_calc, justificativa_texto=just_calc)
    print("  Status:", res_calc.get("status_resolucao"))
    print("  Estratégia:", res_calc.get("estrategia_identificada"))
    print("  Diagnóstico preview:", res_calc.get("diagnostico")[:160], "...")
    assert res_calc.get("status_resolucao") == "correto", "Esperado status 'correto' para raciocínio matematicamente válido"
    
    # 2. Teste em Álgebra Linear (Determinantes)
    q_al = [q for q in alg_lin if "Determinantes" in q.get("topico", "")][0]
    just_al = "det(3A) = 3*det(A) = 6." # Erro clássico de esquecer a ordem n=3 (3^3 = 27)
    print(f"\nAvaliando resolução com erro conceitual em Álgebra Linear (#{q_al['id']} - {q_al['topico']})...")
    res_al = analisar_resolucao(questao=q_al, justificativa_texto=just_al)
    print("  Status:", res_al.get("status_resolucao"))
    print("  Diagnóstico preview:", res_al.get("diagnostico")[:160], "...")
    assert res_al.get("status_resolucao") in ["erro_conceitual", "erro_algebraico", "incompleto"], f"Esperado diagnóstico de erro conceitual, obteve {res_al.get('status_resolucao')}"
    
    print("\n✔ Teste 3 passou com sucesso! Avaliador Cognitivo validou tanto Cálculo 3 quanto Álgebra Linear.")

if __name__ == "__main__":
    cederj_todas = testar_recuperacao_banco()
    testar_formatacao_latex_e_alternativas(cederj_todas)
    calc3 = [q for q in cederj_todas if q.get("materia") == "Cálculo 3"]
    alg_lin = [q for q in cederj_todas if q.get("materia") == "Álgebra Linear"]
    testar_avaliador_cognitivo(calc3, alg_lin)
    print("==================================================")
    print("🎉 TODOS OS TESTES LOCAIS FORAM CONCLUÍDOS COM SUCESSO!")
    print("==================================================")
