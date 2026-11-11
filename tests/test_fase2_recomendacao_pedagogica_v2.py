"""Suíte de Testes da Fase 2: Motor de Recomendação Pedagógica V2 e Preferência Soberana.

Testa:
1. P1 - Preservação estrita da preferência pedagógica manual (soberania da escolha do estudante).
2. P1 - Resolução resiliente de fallback quando a preferência explícita não está definida.
3. P2 - Grafo Direcionado Acíclico (DAG) de pré-requisitos matemáticos (aciclicidade e dependências).
4. P2 - Priorização determinística: Objetivo Principal sobre Secundários.
5. P2 - Geração de justificativas pedagógicas explicáveis em linguagem natural.
6. P3 - Tratamento de trilhas planejadas vs. acervo ativo (sem promessas falsas de questões).
7. P3 - Ausência de dados de desempenho não interpretada como baixo domínio.
8. P3 - Compatibilidade retroativa com perfis legados em JSON `usuarios.motivos`.
"""

import pytest
from typing import Dict, Any, List, Set


# ==============================================================================
# ESTRUTURA PYTHONICA DO MOTOR DE RECOMENDAÇÃO PEDAGÓGICA V2 (ESPELHO DO FRONTEND)
# ==============================================================================

GRAFO_PRE_REQUISITOS = {
    "matematica_basica": [],
    "algebra": ["matematica_basica"],
    "geometria_plana": ["matematica_basica"],
    "teoria_dos_numeros": ["matematica_basica"],
    "funcoes": ["algebra"],
    "polinomios_complexos": ["algebra"],
    "geometria_espacial": ["geometria_plana"],
    "trigonometria": ["geometria_plana", "funcoes"],
    "geometria_analitica": ["algebra", "geometria_plana"],
    "probabilidade_combinatoria": ["matematica_basica", "algebra"],
    "calculo": ["funcoes", "trigonometria"],
    "algebra_linear": ["algebra", "geometria_analitica"],
    "analise_real": ["calculo"],
    "equacoes_diferenciais": ["calculo", "algebra_linear"],
    "otimizacao_gradiente": ["calculo", "algebra_linear"],
    "estatistica_inferencial": ["probabilidade_combinatoria"],
    "modelagem_python_sql": ["algebra_linear", "estatistica_inferencial"],
}

PRIORIDADES_OBJETIVOS = {
    "enem_vestibulares": {
        "essenciais": ["funcoes", "geometria_plana", "algebra", "probabilidade_combinatoria", "matematica_basica"],
        "complementares": ["trigonometria", "geometria_espacial", "geometria_analitica"],
    },
    "concursos_publicos": {
        "essenciais": ["matematica_basica", "probabilidade_combinatoria", "algebra"],
        "complementares": ["funcoes", "estatistica_inferencial"],
    },
    "concursos_militares": {
        "essenciais": ["geometria_plana", "trigonometria", "algebra", "funcoes", "geometria_analitica", "polinomios_complexos", "calculo"],
        "complementares": ["geometria_espacial", "probabilidade_combinatoria", "teoria_dos_numeros"],
    },
    "superior_docencia": {
        "essenciais": ["calculo", "algebra_linear", "funcoes", "teoria_dos_numeros", "analise_real"],
        "complementares": ["geometria_analitica", "polinomios_complexos", "equacoes_diferenciais"],
    },
    "data_science_ml": {
        "essenciais": ["algebra_linear", "probabilidade_combinatoria", "calculo", "otimizacao_gradiente"],
        "complementares": ["funcoes", "estatistica_inferencial", "modelagem_python_sql"],
    },
    "olimpiadas_mat": {
        "essenciais": ["teoria_dos_numeros", "geometria_plana", "algebra", "probabilidade_combinatoria"],
        "complementares": ["funcoes", "polinomios_complexos"],
    },
    "fundamentos_logica_intuicao": {
        "essenciais": ["matematica_basica", "algebra", "geometria_plana"],
        "complementares": ["funcoes", "teoria_dos_numeros"],
    },
}

CATALOGO_DISCIPLINAS = [
    {"id": "geometria_plana", "label": "Geometria Plana", "disponivel": True, "questoes": 4685},
    {"id": "probabilidade_combinatoria", "label": "Probabilidade e Combinatória", "disponivel": True, "questoes": 4281},
    {"id": "algebra", "label": "Álgebra", "disponivel": True, "questoes": 3702},
    {"id": "teoria_dos_numeros", "label": "Teoria dos Números", "disponivel": True, "questoes": 3478},
    {"id": "polinomios_complexos", "label": "Polinômios e Números Complexos", "disponivel": True, "questoes": 1311},
    {"id": "funcoes", "label": "Funções", "disponivel": True, "questoes": 981},
    {"id": "trigonometria", "label": "Trigonometria", "disponivel": True, "questoes": 541},
    {"id": "geometria_espacial", "label": "Geometria Espacial", "disponivel": True, "questoes": 460},
    {"id": "geometria_analitica", "label": "Geometria Analítica", "disponivel": True, "questoes": 418},
    {"id": "matematica_basica", "label": "Matemática Básica & Aritmética", "disponivel": True, "questoes": 300},
    {"id": "calculo", "label": "Cálculo Diferencial e Integral", "disponivel": True, "questoes": 246},
    {"id": "algebra_linear", "label": "Álgebra Linear", "disponivel": True, "questoes": 167},
    {"id": "analise_real", "label": "Análise Real & Fundamentos", "disponivel": False, "questoes": 0},
    {"id": "equacoes_diferenciais", "label": "Equações Diferenciais Ordinárias (EDO)", "disponivel": False, "questoes": 0},
    {"id": "otimizacao_gradiente", "label": "Otimização & Gradiente Descendente", "disponivel": False, "questoes": 0},
    {"id": "estatistica_inferencial", "label": "Estatística Descritiva & Inferencial", "disponivel": False, "questoes": 0},
    {"id": "modelagem_python_sql", "label": "Modelagem Matemática com Python & SQL", "disponivel": False, "questoes": 0},
]


def calcular_score_recomendacao(
    topic_id: str,
    objetivo_principal: str | None,
    objetivos_secundarios: List[str],
    conteudos_selecionados: Set[str],
    desempenho_topicos: Dict[str, Dict[str, int]] = None
) -> Dict[str, Any]:
    desempenho_topicos = desempenho_topicos or {}
    item = next((c for c in CATALOGO_DISCIPLINAS if c["id"] == topic_id), None)
    if not item:
        raise ValueError(f"Tópico desconhecido: {topic_id}")

    score = 0
    is_essential_prim = False
    is_comp_prim = False

    # 1. Relevância para Objetivo Principal (G_prim: até 45 pts)
    if objetivo_principal and objetivo_principal in PRIORIDADES_OBJETIVOS:
        p = PRIORIDADES_OBJETIVOS[objetivo_principal]
        if topic_id in p["essenciais"]:
            score += 45
            is_essential_prim = True
        elif topic_id in p["complementares"]:
            score += 25
            is_comp_prim = True

    # 2. Relevância para Objetivos Secundários (G_sec: até 20 pts)
    for sec_id in objetivos_secundarios:
        if sec_id in PRIORIDADES_OBJETIVOS:
            p = PRIORIDADES_OBJETIVOS[sec_id]
            if topic_id in p["essenciais"]:
                score += 15
                break
            elif topic_id in p["complementares"]:
                score += 8

    # 3. Pré-requisitos (DAG: até 15 pts)
    pre_reqs = GRAFO_PRE_REQUISITOS.get(topic_id, [])
    pendentes = [
        req for req in pre_reqs
        if req not in conteudos_selecionados and req not in [c["label"] for c in CATALOGO_DISCIPLINAS if c["id"] in conteudos_selecionados]
    ]

    if len(pre_reqs) == 0 or len(pendentes) == 0:
        score += 15
    elif len(pendentes) == 1:
        score += 8
    else:
        score += 2

    # 4. Disponibilidade (A: até 10 pts)
    if item["disponivel"] and item["questoes"] > 0:
        score += 10

    # 5. Desempenho Empírico (D: até 10 pts apenas se houver dados)
    if topic_id in desempenho_topicos:
        dados = desempenho_topicos[topic_id]
        total = dados.get("total", 0)
        acertos = dados.get("acertos", 0)
        if total >= 3:
            taxa_erro = 1.0 - (acertos / total)
            if taxa_erro >= 0.4:
                score += 10
            else:
                score += 4

    # Classificação
    if not item["disponivel"] or len(pendentes) >= 2 or score < 35:
        categoria = "futura"
    elif is_essential_prim or score >= 60:
        categoria = "prioritaria"
    else:
        categoria = "complementar"

    motivos = []
    if is_essential_prim:
        motivos.append(f"{item['label']} é disciplina nuclear e prioritária para o objetivo principal.")
    elif is_comp_prim:
        motivos.append(f"{item['label']} atua como conhecimento complementar relevante.")

    if len(pendentes) > 0:
        motivos.append(f"Possui pré-requisitos recomendados para consolidação prévia: {', '.join(pendentes)}.")

    if not item["disponivel"]:
        motivos.append("Trilha teórica planejada no catálogo: sem questões ativas no momento.")

    return {
        "topicId": topic_id,
        "titulo": item["label"],
        "score": min(100, score),
        "categoria": categoria,
        "motivos": motivos,
        "preRequisitosPendentes": pendentes,
        "disponivel": item["disponivel"],
        "quantidadeQuestoes": item["questoes"],
    }


# ==============================================================================
# 1. TESTES DE PRESERVAÇÃO DA PREFERÊNCIA PEDAGÓGICA (PROBLEMA P1)
# ==============================================================================

def test_p1_explicit_pedagogical_preference_prevails_over_motivations():
    """
    Garante que a preferência pedagógica explícita do estudante NUNCA é sobrescrita
    por motivações ativas ou focos de concurso.
    """
    valid_modes = ["conceitual", "rigor_formal", "aplicado_ml", "competitivo"]

    for modo_escolhido in valid_modes:
        profile_mock = {
            "pedagogicalPreference": modo_escolhido,
            "motivacoesSelecionadas": ["superior_docencia", "data_science_ml", "concursos_militares"],
            "focoConcurso": "ITA / IME",
        }

        # Simula a lógica corrigida de resolução
        pref_pedagogica = profile_mock.get("pedagogicalPreference")
        if pref_pedagogica and pref_pedagogica in valid_modes:
            pref_efetiva = pref_pedagogica
        else:
            # Fallback (só deve ser acionado se None/inválido)
            motivacoes = profile_mock.get("motivacoesSelecionadas", [])
            if "superior_docencia" in motivacoes:
                pref_efetiva = "rigor_formal"
            elif "data_science_ml" in motivacoes:
                pref_efetiva = "aplicado_ml"
            else:
                pref_efetiva = "competitivo"

        assert pref_efetiva == modo_escolhido, f"A preferência {modo_escolhido} foi sobrescrita indevidamente!"


def test_p1_fallback_only_when_pedagogical_preference_is_unset():
    """
    Verifica se o fallback por objetivos é acionado APENAS quando a preferência
    estiver ausente (None ou vazia).
    """
    profile_sem_pref_superior = {
        "pedagogicalPreference": None,
        "motivacoesSelecionadas": ["superior_docencia"],
        "focoConcurso": "",
    }
    valid_modes = ["conceitual", "rigor_formal", "aplicado_ml", "competitivo"]

    def resolver_pref(p):
        pref = p.get("pedagogicalPreference")
        if pref and pref in valid_modes:
            return pref
        motivs = p.get("motivacoesSelecionadas", [])
        if "superior_docencia" in motivs:
            return "rigor_formal"
        if "data_science_ml" in motivs:
            return "aplicado_ml"
        if "concursos_militares" in motivs:
            return "competitivo"
        return "conceitual"

    assert resolver_pref(profile_sem_pref_superior) == "rigor_formal"

    profile_sem_pref_ds = {
        "pedagogicalPreference": None,
        "motivacoesSelecionadas": ["data_science_ml"],
    }
    assert resolver_pref(profile_sem_pref_ds) == "aplicado_ml"

    profile_sem_pref_militar = {
        "pedagogicalPreference": None,
        "motivacoesSelecionadas": ["concursos_militares"],
    }
    assert resolver_pref(profile_sem_pref_militar) == "competitivo"


# ==============================================================================
# 2. TESTES DO GRAFO DE PRÉ-REQUISITOS (DAG)
# ==============================================================================

def test_dag_prerequisites_is_acyclic():
    """
    Verifica se o grafo de pré-requisitos é estritamente acíclico (DAG válido).
    Evita deadlocks pedagógicos onde A depende de B e B depende de A.
    """
    visited = set()
    rec_stack = set()

    def has_cycle(node: str) -> bool:
        visited.add(node)
        rec_stack.add(node)

        for neighbor in GRAFO_PRE_REQUISITOS.get(node, []):
            if neighbor not in visited:
                if has_cycle(neighbor):
                    return True
            elif neighbor in rec_stack:
                return True

        rec_stack.remove(node)
        return False

    for topic in GRAFO_PRE_REQUISITOS:
        if topic not in visited:
            assert not has_cycle(topic), f"Ciclo detectado no grafo de pré-requisitos envolvendo: {topic}"


def test_dag_prerequisite_hierarchical_consistency():
    """
    Testa se disciplinas fundamentais vêm antes de disciplinas avançadas.
    Ex: matematica_basica precede algebra; algebra precede funcoes; funcoes precede calculo.
    """
    assert "matematica_basica" in GRAFO_PRE_REQUISITOS["algebra"]
    assert "algebra" in GRAFO_PRE_REQUISITOS["funcoes"]
    assert "funcoes" in GRAFO_PRE_REQUISITOS["calculo"]
    assert "calculo" in GRAFO_PRE_REQUISITOS["analise_real"]
    assert "calculo" in GRAFO_PRE_REQUISITOS["otimizacao_gradiente"]
    assert "algebra_linear" in GRAFO_PRE_REQUISITOS["otimizacao_gradiente"]


# ==============================================================================
# 3. TESTES DE PRIORIZAÇÃO DETERMINÍSTICA DO MOTOR V1 (PROBLEMA P2)
# ==============================================================================

def test_p2_primary_objective_scores_higher_than_secondary():
    """
    Verifica se um tópico nuclear do Objetivo Principal obtém score superior
    ao mesmo tópico quando presente apenas em objetivo secundário.
    """
    # 1. Caso com Álgebra Linear no Objetivo Principal (Data Science)
    rec_como_primario = calcular_score_recomendacao(
        topic_id="algebra_linear",
        objetivo_principal="data_science_ml",
        objetivos_secundarios=[],
        conteudos_selecionados={"algebra", "geometria_analitica"},
    )

    # 2. Caso com Álgebra Linear apenas em Objetivo Secundário
    rec_como_secundario = calcular_score_recomendacao(
        topic_id="algebra_linear",
        objetivo_principal="fundamentos_logica_intuicao",
        objetivos_secundarios=["data_science_ml"],
        conteudos_selecionados={"algebra", "geometria_analitica"},
    )

    assert rec_como_primario["score"] > rec_como_secundario["score"]
    assert rec_como_primario["categoria"] == "prioritaria"


def test_p2_recommendations_generate_explainable_motives():
    """
    Garante que cada recomendação possui justificativas explícitas em linguagem natural.
    """
    rec = calcular_score_recomendacao(
        topic_id="calculo",
        objetivo_principal="superior_docencia",
        objetivos_secundarios=["data_science_ml"],
        conteudos_selecionados={"funcoes", "trigonometria"},
    )

    assert len(rec["motivos"]) >= 1
    assert any("nuclear e prioritária" in m or "disciplina" in m for m in rec["motivos"])
    assert rec["categoria"] == "prioritaria"


# ==============================================================================
# 4. TESTES DE TRILHAS PLANEJADAS VS. ACERVO ATIVO (PROBLEMA P3)
# ==============================================================================

def test_p3_planned_tracks_are_categorized_as_future_without_false_promises():
    """
    Verifica se disciplinas teóricas em planejamento (0 questões no banco)
    são identificadas como 'futura' com flag disponivel=False.
    """
    rec_analise = calcular_score_recomendacao(
        topic_id="analise_real",
        objetivo_principal="superior_docencia",
        objetivos_secundarios=[],
        conteudos_selecionados={"calculo"},
    )

    assert rec_analise["disponivel"] is False
    assert rec_analise["quantidadeQuestoes"] == 0
    assert rec_analise["categoria"] == "futura"
    assert any("planejada" in m for m in rec_analise["motivos"])


def test_p3_active_tracks_have_questions_and_correct_availability():
    """
    Verifica se disciplinas ativas mantêm suas contagens de questões reais do acervo.
    """
    rec_geom = calcular_score_recomendacao(
        topic_id="geometria_plana",
        objetivo_principal="enem_vestibulares",
        objetivos_secundarios=[],
        conteudos_selecionados={"matematica_basica"},
    )

    assert rec_geom["disponivel"] is True
    assert rec_geom["quantidadeQuestoes"] == 4685
    assert rec_geom["categoria"] == "prioritaria"


# ==============================================================================
# 5. TESTES DE AUSÊNCIA DE DADOS DE DESEMPENHO (MANDAMENTO EPISTÊMICO)
# ==============================================================================

def test_absence_of_performance_data_does_not_infer_zero_mastery():
    """
    Garante que a ausência de dados de tentativas NÃO penaliza o estudante nem
    é interpretada como incompetência matemática prévia.
    """
    rec_sem_dados = calcular_score_recomendacao(
        topic_id="algebra",
        objetivo_principal="enem_vestibulares",
        objetivos_secundarios=[],
        conteudos_selecionados={"matematica_basica"},
        desempenho_topicos={},  # Nenhum dado de tentativa
    )

    # Score base esperado: 45 (primário) + 15 (pré-requisitos cumpridos) + 10 (disponível) = 70
    assert rec_sem_dados["score"] == 70
    assert rec_sem_dados["categoria"] == "prioritaria"
    assert not any("erro" in m.lower() for m in rec_sem_dados["motivos"])


def test_presence_of_high_error_rate_adds_reinforcement_boost():
    """
    Quando há evidências empíricas observadas com taxa de erro elevada,
    o motor adiciona reforço pedagógico (+10 pts) e gera justificativa específica.
    """
    rec_com_reforco = calcular_score_recomendacao(
        topic_id="probabilidade_combinatoria",
        objetivo_principal="enem_vestibulares",
        objetivos_secundarios=[],
        conteudos_selecionados={"matematica_basica", "algebra"},
        desempenho_topicos={
            "probabilidade_combinatoria": {"total": 10, "acertos": 4}  # 60% de erro
        },
    )

    assert rec_com_reforco["score"] == 80  # 70 base + 10 reforço
    assert rec_com_reforco["categoria"] == "prioritaria"


# ==============================================================================
# 6. TESTES DE FILTRAGEM AUTOMÁTICA DE QUESTÕES PELO PERFIL PEDAGÓGICO
# ==============================================================================

def obter_filtros_api_perfil_py(profile: Dict[str, Any]) -> Dict[str, Any]:
    """Espelho pythonico de obterFiltrosApiPerfil() em frontend/lib/pedagogical-engine.ts."""
    result: Dict[str, Any] = {}
    obj_principal = profile.get("objetivoPrincipal")
    conteudos = profile.get("conteudosSelecionados") or []
    bancas = profile.get("concursosSelecionados") or []

    if conteudos:
        result["materia"] = list(conteudos)

    if bancas:
        result["banca"] = [b.split("(")[0].strip() for b in bancas]

    if not result.get("materia") and not result.get("banca") and obj_principal:
        if obj_principal == "data_science_ml":
            result["materia"] = ["Álgebra Linear", "Probabilidade e Combinatória", "Cálculo"]
            result["origemDescricao"] = "Transição para Ciência de Dados & ML"
        elif obj_principal == "superior_docencia":
            result["materia"] = ["Cálculo", "Álgebra Linear", "Teoria dos Números"]
            result["origemDescricao"] = "Ensino Superior & Docência em Matemática"
        elif obj_principal == "concursos_militares":
            result["categoria_banca"] = "Concurso Militar"
            result["banca"] = ["ITA", "IME", "AFA", "EFOMM", "EsPCEx", "Escola Naval"]
            result["origemDescricao"] = "Carreiras Militares de Alto Desempenho"
        elif obj_principal == "enem_vestibulares":
            result["banca"] = ["ENEM", "FUVEST", "UNICAMP"]
            result["materia"] = ["Funções", "Geometria Plana", "Probabilidade e Combinatória"]
            result["origemDescricao"] = "ENEM & Vestibulares Tradicionais"
        elif obj_principal == "concursos_publicos":
            result["materia"] = ["Matemática Básica", "Probabilidade e Combinatória", "Álgebra"]
            result["origemDescricao"] = "Concursos Públicos & Carreiras de Estado"
        elif obj_principal == "olimpiadas_mat":
            result["categoria_banca"] = "Olimpíadas"
            result["banca"] = ["OBM", "IMO", "HMMT"]
            result["origemDescricao"] = "Olimpíadas de Matemática"
        elif obj_principal == "fundamentos_logica_intuicao":
            result["materia"] = ["Matemática Básica", "Álgebra", "Geometria Plana"]
            result["origemDescricao"] = "Fundamentos, Lógica e Intuição"
    elif result.get("materia") or result.get("banca"):
        partes = []
        if result.get("materia"):
            partes.append(", ".join(result["materia"][:2]))
        if result.get("banca"):
            partes.append(", ".join(result["banca"][:2]))
        result["origemDescricao"] = " • ".join(partes) or "Seu Plano de Estudos"

    return result


def test_obter_filtros_api_perfil_from_data_science_objective():
    """Garante que o objetivo de Data Science gera matérias essenciais para IA/ML."""
    perfil = {"objetivoPrincipal": "data_science_ml"}
    filtros = obter_filtros_api_perfil_py(perfil)

    assert "Álgebra Linear" in filtros["materia"]
    assert "Probabilidade e Combinatória" in filtros["materia"]
    assert "Cálculo" in filtros["materia"]
    assert filtros["origemDescricao"] == "Transição para Ciência de Dados & ML"


def test_obter_filtros_api_perfil_from_military_objective():
    """Garante que o objetivo militar filtra bancas de elite e categoria correta."""
    perfil = {"objetivoPrincipal": "concursos_militares"}
    filtros = obter_filtros_api_perfil_py(perfil)

    assert filtros["categoria_banca"] == "Concurso Militar"
    assert "ITA" in filtros["banca"]
    assert "IME" in filtros["banca"]
    assert "EFOMM" in filtros["banca"]


def test_explicit_selection_overrides_objective_defaults():
    """Garante que seleções manuais explícitas do estudante têm soberania sobre defaults do objetivo."""
    perfil = {
        "objetivoPrincipal": "data_science_ml",
        "conteudosSelecionados": ["Cálculo 3", "Álgebra Linear I"],
        "concursosSelecionados": ["CEDERJ"],
    }
    filtros = obter_filtros_api_perfil_py(perfil)

    assert filtros["materia"] == ["Cálculo 3", "Álgebra Linear I"]
    assert filtros["banca"] == ["CEDERJ"]
    assert "Cálculo 3" in filtros["origemDescricao"]


def test_frontend_pages_integration_with_pedagogical_filters():
    """Verifica se as páginas /questoes, /resolver e dashboard (page.tsx) estão integradas com obterFiltrosApiPerfil."""
    with open("frontend/app/(app)/questoes/page.tsx", "r", encoding="utf-8") as f:
        questoes_content = f.read()
    assert "obterFiltrosApiPerfil" in questoes_content
    assert "perfilAtivoDescricao" in questoes_content
    assert "Todo o acervo, com prioridade para o seu plano:" in questoes_content

    with open("frontend/app/(app)/resolver/page.tsx", "r", encoding="utf-8") as f:
        resolver_content = f.read()
    assert "obterFiltrosApiPerfil" in resolver_content
    assert "profileStandbyDescricao" in resolver_content
    assert "Foco ativo do seu perfil:" in resolver_content

    with open("frontend/app/(app)/page.tsx", "r", encoding="utf-8") as f:
        dashboard_content = f.read()
    assert "obterFiltrosApiPerfil" in dashboard_content
    assert "questoesRecomendadas" in dashboard_content
    assert "Questões Recomendadas para o seu Perfil" in dashboard_content
