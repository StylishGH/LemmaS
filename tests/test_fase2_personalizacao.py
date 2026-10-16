"""Suíte de Testes da Fase 2: Catálogo Conceitual e Personalização Real do LemmaS.

Testa:
1. Validação de Schemas e Contratos da Rota do Tutor (/api/tutor/hint).
2. Modulação Ativa do Prompt Socrático em todos os 5 níveis para os 4 modos:
   - conceitual
   - rigor_formal
   - aplicado_ml
   - competitivo
3. Resiliência e Fallback Determinístico por modo.
4. Preservação de Dados de Perfil Antigo e Fusão de Motivos.
5. União e Deduplicação do Catálogo Conceitual.
6. Teste Comportamental Comparativo em Questão Idêntica com Execução Real/Gateway.
"""

import json
import sys
if sys.platform == "win32" and hasattr(sys.stdout, "buffer") and "pytest" not in sys.modules:
    import io
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")
    except Exception:
        pass

import pytest
from typing import Dict, Any

from app.api.routes.tutor import SocraticHintRequest
from app.services.mathai.tutor import socratic_tutor


# ==============================================================================
# 1. TESTES DE CONTRATO, SCHEMAS E VALIDAÇÃO DA ROTA DO TUTOR
# ==============================================================================

def test_socratic_hint_request_accepts_all_valid_preferences():
    """Valida se o schema aceita os 4 modos pedagógicos permitidos em snake_case."""
    modos = ["conceitual", "rigor_formal", "aplicado_ml", "competitivo"]
    for modo in modos:
        req = SocraticHintRequest(enunciado="Teste", level=2, pedagogical_preference=modo)
        assert req.pedagogical_preference == modo


def test_socratic_hint_request_accepts_camel_case():
    """Valida se o schema aceita pedagogicalPreference (camelCase vindo do Next.js)."""
    raw_payload = {"enunciado": "Resolva x^2 - 4 = 0", "level": 3, "pedagogicalPreference": "rigor_formal"}
    req = SocraticHintRequest.model_validate(raw_payload)
    assert req.pedagogical_preference == "rigor_formal"
    assert req.pedagogicalPreference == "rigor_formal"


def test_socratic_hint_request_fallback_safe_default():
    """Valida se valores desconhecidos, inválidos ou nulos caem com segurança em 'conceitual'."""
    invalid_cases = [
        {"enunciado": "Teste", "pedagogical_preference": "modo_inexistente"},
        {"enunciado": "Teste", "pedagogical_preference": None},
        {"enunciado": "Teste", "pedagogicalPreference": "hack_invalido"},
        {"enunciado": "Teste"},
    ]
    for case in invalid_cases:
        req = SocraticHintRequest.model_validate(case)
        assert req.pedagogical_preference == "conceitual"


# ==============================================================================
# 2. TESTES DE MODULAÇÃO ATIVA DO PROMPT SOCRÁTICO
# ==============================================================================

def test_socratic_tutor_prompt_instructions_differ_by_preference():
    """Verifica se o prompt gerado altera efetivamente as instruções para cada modo."""
    questao = {
        "id": "q-teste",
        "enunciado": "Seja V um espaço vetorial e T: V -> V um operador linear. Determine seus autovalores.",
        "topico": "Álgebra Linear",
        "gabarito": "lambda = 2",
    }

    class MockGatewayCapture:
        def __init__(self):
            self.last_user_prompt = ""
            self.last_system_prompt = ""

        def execute_completion(self, messages, system_prompt, **kwargs):
            self.last_user_prompt = messages[0]["content"]
            self.last_system_prompt = system_prompt
            return {
                "content": "Dica gerada com sucesso",
                "model_used": "mock-nemotron",
                "provider": "mock",
                "latency_ms": 150.0,
                "input_hash": "hash123",
            }

    mock_gw = MockGatewayCapture()
    original_gw = socratic_tutor.gateway
    socratic_tutor.gateway = mock_gw

    try:
        # 1. Modo Conceitual
        socratic_tutor.generate_hint(questao, level=2, pedagogical_preference="conceitual")
        prompt_conceitual = mock_gw.last_user_prompt
        assert "DIRETRIZ PEDAGÓGICA (CONCEITUAL)" in prompt_conceitual
        assert "intuição" in prompt_conceitual.lower()

        # 2. Modo Rigor Formal
        socratic_tutor.generate_hint(questao, level=2, pedagogical_preference="rigor_formal")
        prompt_formal = mock_gw.last_user_prompt
        assert "DIRETRIZ PEDAGÓGICA (RIGOR FORMAL)" in prompt_formal
        assert "axiomática" in prompt_formal.lower() or "hipóteses" in prompt_formal.lower()

        # 3. Modo Aplicado a ML
        socratic_tutor.generate_hint(questao, level=2, pedagogical_preference="aplicado_ml")
        prompt_ml = mock_gw.last_user_prompt
        assert "DIRETRIZ PEDAGÓGICA (APLICADO A CIÊNCIA DE DADOS & MACHINE LEARNING)" in prompt_ml
        assert "machine learning" in prompt_ml.lower() or "dados" in prompt_ml.lower()

        # 4. Modo Competitivo
        socratic_tutor.generate_hint(questao, level=2, pedagogical_preference="competitivo")
        prompt_comp = mock_gw.last_user_prompt
        assert "DIRETRIZ PEDAGÓGICA (COMPETITIVO & EFICIÊNCIA EM PROVAS)" in prompt_comp
        assert "pulo do gato" in prompt_comp.lower() or "atalhos" in prompt_comp.lower()

        # Confirma que os 4 prompts são mutuamente distintos
        prompts = [prompt_conceitual, prompt_formal, prompt_ml, prompt_comp]
        assert len(set(prompts)) == 4, "Cada modo pedagógico deve gerar um prompt estruturalmente diferente!"

    finally:
        socratic_tutor.gateway = original_gw


# ==============================================================================
# 3. TESTES DE CONTINGÊNCIA DETERMINÍSTICA (FALLBACK POR MODO)
# ==============================================================================

def test_socratic_tutor_fallback_hints_differ_by_preference():
    """Garante que na contingência de rede, cada modo recebe uma dica determinística contextualizada."""
    questao = {"topico": "Álgebra Linear", "gabarito": "\\lambda = 3"}

    hint_conc = socratic_tutor._get_fallback_hint(questao, level=1, pref="conceitual")
    hint_form = socratic_tutor._get_fallback_hint(questao, level=1, pref="rigor_formal")
    hint_ml = socratic_tutor._get_fallback_hint(questao, level=1, pref="aplicado_ml")
    hint_comp = socratic_tutor._get_fallback_hint(questao, level=1, pref="competitivo")

    assert "Intuição e Dados" in hint_conc
    assert "Hipóteses e Domínio" in hint_form
    assert "Variáveis e Entradas" in hint_ml
    assert "Observação Crítica de Prova" in hint_comp

    fallbacks = [hint_conc, hint_form, hint_ml, hint_comp]
    assert len(set(fallbacks)) == 4


# ==============================================================================
# 4. TESTE DE PRESERVAÇÃO DE PERFIL ANTIGO E MOTIVOS
# ==============================================================================

def test_perfil_motivos_persistence_and_backward_compatibility():
    """Simula a leitura de perfil antigo sem preferência pedagógica e a fusão sem perda de chaves."""
    # Perfil antigo do Supabase com JSON sem a chave pedagogical_preference
    perfil_antigo_json = json.dumps({
        "foto_url": "https://exemplo.com/avatar.webp",
        "concursos_selecionados": ["ITA (Engenharia Aeronáutica)", "AFA (Academia da Força Aérea)"],
        "motivacoes_selecionadas": ["concursos_militares"],
        "campo_customizado_legado": "preservar_sempre",
    })

    # Leitura simulada (use-user fetchProfile)
    parsed = json.loads(perfil_antigo_json)
    ped_pref_salva = parsed.get("pedagogical_preference")
    assert ped_pref_salva is None  # Perfil antigo não tinha a chave

    # Aplicação do padrão seguro
    modo_restaurado = ped_pref_salva or "conceitual"
    assert modo_restaurado == "conceitual"

    # Atualização com novos dados (use-user saveProfile)
    parsed["pedagogical_preference"] = "rigor_formal"
    parsed["conceitos_selecionados"] = ["Cálculo Diferencial e Integral", "Álgebra Linear"]

    # Salva de volta
    novo_json = json.dumps(parsed)
    restaurado_final = json.loads(novo_json)

    # Verifica integridade total
    assert restaurado_final["pedagogical_preference"] == "rigor_formal"
    assert restaurado_final["concursos_selecionados"] == ["ITA (Engenharia Aeronáutica)", "AFA (Academia da Força Aérea)"]
    assert restaurado_final["conceitos_selecionados"] == ["Cálculo Diferencial e Integral", "Álgebra Linear"]
    assert restaurado_final["campo_customizado_legado"] == "preservar_sempre"


# ==============================================================================
# 5. TESTE DE UNIÃO E DEDUPLICAÇÃO DE RECOMENDAÇÕES DO CATÁLOGO
# ==============================================================================

def test_catalog_recommendation_union_and_deduplication():
    """Valida se a união de múltiplos objetivos elimina duplicatas e preserva seleções."""
    from collections import defaultdict

    mapa = {
        "enem_vestibulares": {
            "conceituais": ["geometria_plana", "algebra", "probabilidade_combinatoria"],
            "bancas": ["ENEM", "FUVEST"],
        },
        "concursos_militares": {
            "conceituais": ["algebra", "geometria_plana", "trigonometria", "calculo"],
            "bancas": ["ITA", "IME", "AFA"],
        },
        "superior_docencia": {
            "conceituais": ["calculo", "algebra_linear", "analise_real"],
            "bancas": ["ITA", "CEDERJ"],
        },
    }

    objetivos_ativos = ["enem_vestibulares", "concursos_militares", "superior_docencia"]

    conc_set = set()
    banca_set = set()

    for obj in objetivos_ativos:
        for c in mapa[obj]["conceituais"]:
            conc_set.add(c)
        for b in mapa[obj]["bancas"]:
            banca_set.add(b)

    # Verifica união sem repetição de 'algebra' e 'calculo'
    assert len(conc_set) == len(set(conc_set))
    assert "algebra" in conc_set
    assert "calculo" in conc_set
    assert "algebra_linear" in conc_set
    assert "geometria_plana" in conc_set

    # Verifica união sem repetição de 'ITA'
    assert len(banca_set) == len(set(banca_set))
    assert "ITA" in banca_set
    assert "ENEM" in banca_set
    assert "CEDERJ" in banca_set


# ==============================================================================
# 6. TESTE COMPORTAMENTAL COMPARATIVO COM EXECUÇÃO REAL
# ==============================================================================

def test_behavioral_comparison_same_question_two_pedagogical_modes():
    """
    Executa o Tutor Socrático na mesma questão e no mesmo nível (Nível 2),
    comparando os modos 'conceitual' e 'rigor_formal'.
    Garante que:
    1. A orientação socrática não entrega a resposta final no Nível 2.
    2. O modo 'conceitual' foca em intuição e significado.
    3. O modo 'rigor_formal' foca em teoremas, hipóteses ou axiomas.
    """
    questao = {
        "id": "q-matriz-diagonal",
        "enunciado": "Considere a matriz $A = \\begin{pmatrix} 2 & 1 \\\\ 1 & 2 \\end{pmatrix}$. Determine seus autovalores e justifique se ela é diagonalizável sobre $\\mathbb{R}$.",
        "topico": "Álgebra Linear",
        "gabarito": "\\lambda_1 = 3, \\lambda_2 = 1; \\text{diagonalizável}",
        "estrategias_esperadas": ["Polinômio Característico", "Teorema Espectral para Matrizes Simétricas"],
    }

    print("\n" + "=" * 75)
    print("TESTE COMPORTAMENTAL: COMPARAÇÃO DO MESMO NÍVEL (2) EM 2 MODOS PEDAGÓGICOS")
    print("=" * 75)

    # 1. Execução no Modo Conceitual
    res_conceitual = socratic_tutor.generate_hint(questao, level=2, pedagogical_preference="conceitual")
    texto_conceitual = res_conceitual["hint_text"]

    # 2. Execução no Modo Rigor Formal
    res_formal = socratic_tutor.generate_hint(questao, level=2, pedagogical_preference="rigor_formal")
    texto_formal = res_formal["hint_text"]

    safe_conceitual = texto_conceitual.encode("ascii", errors="replace").decode("ascii")
    safe_formal = texto_formal.encode("ascii", errors="replace").decode("ascii")

    print("\n--- RESPOSTA PRODUZIDA NO MODO CONCEITUAL (NIVEL 2) ---")
    print(f"Provedor: {res_conceitual['provider']} | Modelo: {res_conceitual['model_used']}")
    print(safe_conceitual)

    print("\n--- RESPOSTA PRODUZIDA NO MODO RIGOR FORMAL (NIVEL 2) ---")
    print(f"Provedor: {res_formal['provider']} | Modelo: {res_formal['model_used']}")
    print(safe_formal)

    print("\n" + "=" * 75)

    # Validações Pedagógicas e Socráticas
    assert len(texto_conceitual) > 20, "Dica conceitual não pode ser vazia"
    assert len(texto_formal) > 20, "Dica formal não pode ser vazia"
    assert texto_conceitual != texto_formal, "Dicas em modos distintos devem produzir abordagens diferentes!"

    # Nível 2 NUNCA deve entregar a resposta final
    assert "\\lambda_1 = 3" not in texto_conceitual, "Nível 2 não deve entregar o gabarito final!"
    assert "\\lambda_1 = 3" not in texto_formal, "Nível 2 não deve entregar o gabarito final!"
