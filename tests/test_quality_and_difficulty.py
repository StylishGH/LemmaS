"""
Suíte de Testes Automatizados para:
1. Ordenação por Quality Score (questão completa sobe, incompleta desce, nunca id ASC).
2. Contagem e Classificação de Dificuldade (null ou fora de 1..5 cai em Não Classificada, soma das fatias == total).

Atende estritamente às diretrizes do LEMMAS:
- RAW DATA != AI INTERPRETATION != VALIDATED LABEL
- Sem recalibração automática de dificuldade
- Sem alteração de parâmetros theta/beta
"""

import sys
import os
import re

if sys.platform == "win32" and hasattr(sys.stdout, "buffer"):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# ==============================================================================
# 1. ESPELHO DA LÓGICA DE QUALITY SCORE (frontend/lib/quality-score.ts)
# ==============================================================================

TIER_1_BANCAS = {"ITA", "IME", "AFA", "EFOMM", "OBM", "ENEM"}
TIER_2_BANCAS = {"FUVEST", "UNICAMP", "EEAR", "EPCAR", "ESPCEX", "COLÉGIO NAVAL", "COLEGIO NAVAL", "ESCOLA NAVAL", "ESFCEX"}
TIER_3_BANCAS = {"IMO", "HMMT", "USAMO", "BMO", "PUTNAM", "RMM"}

def calculate_quality_score(q):
    score = 0
    enunciado = (q.get("enunciado") or "").strip()
    gabarito = (q.get("gabarito") or "").strip()
    solucao = (q.get("solucao") or "").strip()
    banca = (q.get("banca") or "").strip().upper()
    tipo = (q.get("tipo") or "").lower()
    ano = q.get("ano") if isinstance(q.get("ano"), int) else None

    # 1. Enunciado (integridade e extensão)
    if len(enunciado) >= 30:
        score += 20
        if len(enunciado) >= 80:
            score += 5
        if len(enunciado) >= 150:
            score += 5
    else:
        score -= 60

    # 2. Alternativas
    alt_count = 0
    if q.get("alternativas") and isinstance(q.get("alternativas"), dict):
        alt_count = len(q["alternativas"])
    if alt_count == 0:
        matches = re.findall(r"\([A-E]\)", enunciado, re.IGNORECASE)
        alt_count = len(matches)

    if alt_count >= 4:
        score += 25
    elif alt_count >= 2:
        score += 15
    elif tipo == "discursiva" or "discursiva" in gabarito.lower():
        score += 20
    else:
        score -= 30

    # 3. Gabarito Oficial
    if gabarito and gabarito != "null" and gabarito != "undefined" and len(gabarito) > 0:
        score += 25
    else:
        score -= 50

    # 4. Resolução / Solução Detalhada
    if solucao and solucao != "null" and len(solucao) >= 20:
        score += 25
        if len(solucao) >= 100:
            score += 10

    # 5. Lema Associado / Estratégias Esperadas
    estrategias = q.get("estrategias_esperadas")
    has_lema = False
    if isinstance(estrategias, list):
        has_lema = len(estrategias) > 0
    elif isinstance(estrategias, str):
        c = estrategias.strip()
        has_lema = len(c) > 2 and c != "[]" and c != "null"
    if has_lema:
        score += 25

    # 6. Bancas Principais
    banca_matched = False
    for b in TIER_1_BANCAS:
        if banca == b or b in banca:
            score += 30
            banca_matched = True
            break
    if not banca_matched:
        for b in TIER_2_BANCAS:
            if banca == b or b in banca:
                score += 15
                banca_matched = True
                break
    if not banca_matched:
        for b in TIER_3_BANCAS:
            if banca == b or b in banca:
                score += 10
                banca_matched = True
                break

    # 7. Atualidade (Ano)
    if ano is not None:
        if ano >= 2020:
            score += 10
        elif ano >= 2010:
            score += 7
        elif ano >= 1990:
            score += 4

    # 8. Figuras
    if q.get("figura_path") and str(q["figura_path"]).strip() and q["figura_path"] != "null":
        score += 5

    # 9. Penalidade para placeholders ou testes preliminares
    if (
        "Questão teste pipeline turbo" in enunciado
        or "Questão teste" in enunciado
        or "Indique qual item abaixo corresponde a $x" in enunciado
        or "Seja $$x = \\frac{1}{2}" in enunciado
    ):
        score -= 100

    return score


def sort_questions_by_quality(questions):
    return sorted(
        questions,
        key=lambda q: (
            calculate_quality_score(q),
            q.get("ano") if isinstance(q.get("ano"), int) else 0,
            q.get("id") if isinstance(q.get("id"), int) else 0,
        ),
        reverse=True,
    )


# ==============================================================================
# 2. ESPELHO DA LÓGICA DE DIFICULDADE (frontend/app/api/questions/route.ts)
# ==============================================================================

def classify_dificuldade(d):
    """
    Classifica cada registro estritamente:
    1 ou 2 -> Fácil
    3 -> Média
    4 ou 5 -> Difícil
    NULL, NaN, < 1, > 5 ou não-numérico -> Não Classificada
    """
    if d is None:
        return "nao_classificada"
    if not isinstance(d, (int, float)):
        return "nao_classificada"
    if d < 1 or d > 5:
        return "nao_classificada"
    if d in (1, 2) or (1.0 <= d <= 2.0):
        return "facil"
    if d == 3 or d == 3.0:
        return "media"
    if d in (4, 5) or (4.0 <= d <= 5.0):
        return "dificil"
    return "nao_classificada"


def aggregate_difficulty_facets(rows, global_stats=None, total_questoes=None):
    """
    Agrega as fatias de dificuldade garantindo que a soma bata 100% com o total.
    """
    if global_stats and global_stats.get("dificuldades"):
        gd = global_stats["dificuldades"]
        total = total_questoes or global_stats.get("total_questoes", len(rows))
        
        c1 = int(gd.get("1", 0) or 0)
        c2 = int(gd.get("2", 0) or 0)
        c3 = int(gd.get("3", 0) or 0)
        c4 = int(gd.get("4", 0) or 0)
        c5 = int(gd.get("5", 0) or 0)

        facil = c1 + c2
        media = c3
        dificil = c4 + c5
        nao_classificada = max(0, total - (facil + media + dificil))
        return {
            "Todas": total,
            "facil": facil,
            "media": media,
            "dificil": dificil,
            "nao_classificada": nao_classificada,
        }
    else:
        total = len(rows)
        counts = {"facil": 0, "media": 0, "dificil": 0, "nao_classificada": 0}
        for r in rows:
            cat = classify_dificuldade(r.get("dificuldade"))
            counts[cat] += 1
        counts["Todas"] = total
        return counts


# ==============================================================================
# 3. TESTES UNITÁRIOS E DE INTEGRAÇÃO
# ==============================================================================

def test_quality_score_complete_rises_incomplete_sinks():
    print("\n--- [TESTE 1] Ordenação: Questão Completa Sobe, Incompleta Desce ---")

    q_completa_ita = {
        "id": 3514,
        "banca": "ITA",
        "ano": 2026,
        "enunciado": "Considere a reta $r : 3x + 4y = -15$ e a parábola $P : y = x^2 + 6$. Qual a distância mínima?\n(A) 1\n(B) 2\n(C) 3\n(D) 4\n(E) 5",
        "gabarito": "D",
        "solucao": "Calculando a derivada da parábola temos y' = 2x. Igualando ao coeficiente angular da reta m = -3/4...",
        "estrategias_esperadas": ["Derivadas / coeficiente angular", "Geometria Analítica"],
        "tipo": "objetiva",
    }

    q_completa_obm = {
        "id": 6198,
        "banca": "OBM",
        "ano": 2024,
        "enunciado": "Determine todos os inteiros positivos n tais que a soma dos divisores de n seja uma potência de dois.",
        "gabarito": "Discursiva",
        "solucao": "Seja n = p1^a1 ... pk^ak. Pela multiplicatividade da função sigma...",
        "estrategias_esperadas": ["Teoria dos Números", "Função Sigma de Divisores"],
        "tipo": "discursiva",
    }

    q_sem_gabarito = {
        "id": 8888,
        "banca": "ITA",
        "ano": 2023,
        "enunciado": "Considere um polinômio P(x) de grau 5. Calcule o valor de P(2).",
        "gabarito": None,  # FALTANDO GABARITO
        "solucao": None,
        "estrategias_esperadas": None,
        "tipo": "objetiva",
    }

    q_sem_alternativas = {
        "id": 9999,
        "banca": "EFOMM",
        "ano": 2022,
        "enunciado": "Em uma urna há 10 bolas brancas e 5 pretas.",
        "gabarito": "A",
        "solucao": None,
        "estrategias_esperadas": None,
        "tipo": "objetiva",  # Objetiva sem alternativas (A)-(E)
    }

    q_toy_cederj = {
        "id": 1,
        "banca": "CEDERJ",
        "ano": 2024,
        "enunciado": "Seja $$x = \\frac{1}{2} + \\frac{1}{2}$$ Indique qual item abaixo corresponde a $x",
        "gabarito": "D",
        "solucao": None,
        "estrategias_esperadas": None,
        "tipo": "objetiva",
    }

    q_dummy_turbo = {
        "id": 22386,
        "banca": "AFA",
        "ano": 2024,
        "enunciado": "Questão teste pipeline turbo",
        "gabarito": "a",
        "solucao": "Solucao placeholder",
        "estrategias_esperadas": None,
        "tipo": "objetiva",
    }

    score_ita = calculate_quality_score(q_completa_ita)
    score_obm = calculate_quality_score(q_completa_obm)
    score_sem_gab = calculate_quality_score(q_sem_gabarito)
    score_sem_alt = calculate_quality_score(q_sem_alternativas)
    score_toy = calculate_quality_score(q_toy_cederj)
    score_dummy = calculate_quality_score(q_dummy_turbo)

    print(f"Score ITA Completa: {score_ita}")
    print(f"Score OBM Completa: {score_obm}")
    print(f"Score Sem Gabarito: {score_sem_gab}")
    print(f"Score Sem Alternativas: {score_sem_alt}")
    print(f"Score Toy CEDERJ: {score_toy}")
    print(f"Score Dummy Turbo: {score_dummy}")

    # Asserções de ordenação
    assert score_ita > score_sem_gab, "Questão completa deve pontuar muito mais que sem gabarito"
    assert score_obm > score_sem_alt, "Questão completa OBM deve pontuar mais que objetiva incompleta"
    assert score_sem_gab < 0, "Questão sem gabarito deve ter score penalizado"
    assert score_toy < score_ita, "Toy question deve pontuar muito abaixo de questão de vestibular real"
    assert score_dummy < 0, "Dummy question deve ter penalidade extrema negativa"

    pool = [q_toy_cederj, q_dummy_turbo, q_sem_gabarito, q_sem_alternativas, q_completa_obm, q_completa_ita]
    sorted_pool = sort_questions_by_quality(pool)
    sorted_ids = [q["id"] for q in sorted_pool]

    print(f"Ordem resultante dos IDs: {sorted_ids}")
    # As questões completas devem ser os 2 primeiros itens
    assert sorted_ids[0] in (3514, 6198) and sorted_ids[1] in (3514, 6198), "As completas devem estar no topo!"
    # As incompletas e toys devem estar no final
    assert sorted_ids[-1] in (1, 22386, 8888), "Incompletas/toys devem cair para o final!"
    print("✓ TESTE 1 PASSOU: Questão completa sobe, incompleta desce com 100% de precisão!")


def test_difficulty_classification_and_slices_sum():
    print("\n--- [TESTE 2] Classificação de Dificuldade e Soma das Fatias ---")

    # Amostra sintética contendo todos os casos de borda:
    sample = [
        {"id": 101, "dificuldade": 1},      # Fácil
        {"id": 102, "dificuldade": 2},      # Fácil
        {"id": 103, "dificuldade": 3},      # Média
        {"id": 104, "dificuldade": 4},      # Difícil
        {"id": 105, "dificuldade": 5},      # Difícil
        {"id": 106, "dificuldade": None},   # Não Classificada (null)
        {"id": 107, "dificuldade": 0},      # Não Classificada (< 1)
        {"id": 108, "dificuldade": -5},     # Não Classificada (< 1)
        {"id": 109, "dificuldade": 6},      # Não Classificada (> 5)
        {"id": 110, "dificuldade": 99},     # Não Classificada (> 5)
        {"id": 111, "dificuldade": "inv"},  # Não Classificada (não-numérico)
    ]

    facets = aggregate_difficulty_facets(sample)
    print(f"Facets obtidos na amostra sintética: {facets}")

    assert facets["facil"] == 2, f"Esperado 2 fáceis (1 e 2), obtido {facets['facil']}"
    assert facets["media"] == 1, f"Esperado 1 média (3), obtido {facets['media']}"
    assert facets["dificil"] == 2, f"Esperado 2 difíceis (4 e 5), obtido {facets['dificil']}"
    assert facets["nao_classificada"] == 6, f"Esperado 6 não classificadas (None, 0, -5, 6, 99, 'inv'), obtido {facets['nao_classificada']}"

    soma_fatias = facets["facil"] + facets["media"] + facets["dificil"] + facets["nao_classificada"]
    assert soma_fatias == facets["Todas"] == len(sample), "Soma das fatias deve bater exatamente com total de itens!"
    print(f"Soma das fatias: {soma_fatias} == Total: {facets['Todas']}")
    print("✓ TESTE 2 PASSOU: Casos de borda (NULL, <1, >5, string) caem em Não Classificada!")


def test_real_database_difficulty_distribution():
    print("\n--- [TESTE 3] Distribuição Real do Banco de Dados LEMMAS ---")

    # Distribuição oficial retornada pela RPC get_lemmas_global_stats
    global_stats_real = {
        "total_questoes": 20803,
        "dificuldades": {
            "1": 7,
            "2": 747,
            "3": 381,
            "4": 554,
            "5": 19102,
            "Não Classificada": 12,
        }
    }

    facets = aggregate_difficulty_facets([], global_stats=global_stats_real)
    print(f"Facets agregados para o acervo completo:")
    print(f"  Todas: {facets['Todas']}")
    print(f"  Fácil (1 e 2): {facets['facil']} (7 + 747 = 754)")
    print(f"  Média (3): {facets['media']} (381)")
    print(f"  Difícil (4 e 5): {facets['dificil']} (554 + 19102 = 19656)")
    print(f"  Não Classificada: {facets['nao_classificada']} (12)")

    soma = facets["facil"] + facets["media"] + facets["dificil"] + facets["nao_classificada"]
    print(f"\nSoma matemática: {facets['facil']} + {facets['media']} + {facets['dificil']} + {facets['nao_classificada']} = {soma}")
    print(f"Total esperado: {global_stats_real['total_questoes']}")

    assert facets["facil"] == 754
    assert facets["media"] == 381
    assert facets["dificil"] == 19656
    assert facets["nao_classificada"] == 12
    assert soma == global_stats_real["total_questoes"] == 20803

    print("✓ TESTE 3 PASSOU: A soma das 4 fatias fecha 100% em 20.803!")


def test_never_order_by_id_asc():
    print("\n--- [TESTE 4] Verificação Estrita: 'Nunca ordene por id ASC' ---")
    
    # Simula lista com IDs de 1 a 10
    questions = [
        {"id": 1, "banca": "CEDERJ", "ano": 2024, "enunciado": "Seja x = 1/2 + 1/2", "gabarito": "D"},
        {"id": 2, "banca": "CEDERJ", "ano": 2024, "enunciado": "Seja x = 1/2 + 1/3", "gabarito": "A"},
        {"id": 3514, "banca": "ITA", "ano": 2026, "enunciado": "Considere a reta r e a parábola P...\n(A) 1\n(B) 2\n(C) 3\n(D) 4\n(E) 5", "gabarito": "D", "solucao": "Derivada...", "estrategias_esperadas": ["Derivadas"]},
        {"id": 1253, "banca": "EFOMM", "ano": 2025, "enunciado": "Sejam alfa e lambda...\n(A) 1\n(B) 2\n(C) 3\n(D) 4\n(E) 5", "gabarito": "C", "solucao": "Matrizes...", "estrategias_esperadas": ["Álgebra Linear"]},
    ]

    sorted_qs = sort_questions_by_quality(questions)
    ids_result = [q["id"] for q in sorted_qs]
    print(f"Ordem de IDs gerada: {ids_result}")

    # Não pode ser id ASC [1, 2, 1253, 3514]
    assert ids_result != [1, 2, 1253, 3514], "ERRO: O resultado foi ordenado por id ASC!"
    # As de bancas de ponta com solução devem vir primeiro
    assert ids_result[0] in (3514, 1253) and ids_result[1] in (3514, 1253)
    # IDs 1 e 2 devem vir por último
    assert ids_result[2] in (1, 2) and ids_result[3] in (1, 2)

    print("✓ TESTE 4 PASSOU: NUNCA ordena por id ASC, prioridade estrita por qualidade!")


if __name__ == "__main__":
    test_quality_score_complete_rises_incomplete_sinks()
    test_difficulty_classification_and_slices_sum()
    test_real_database_difficulty_distribution()
    test_never_order_by_id_asc()
    print("\n=======================================================")
    print("✓ TODOS OS 4 TESTES PASSARAM COM 100% DE SUCESSO!")
    print("=======================================================")
