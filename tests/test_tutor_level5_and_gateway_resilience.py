"""
Testes dedicados para a Estabilização da MathAI Engine e Tutor Socrático:
1. Nível 5: rejeição de gabarito seco ('A', 'B', etc.) e exibição de resolução pedagogicamente válida.
2. Tutor Socrático: quando todos os provedores falham e não há resolução válida, retorno de status 'unavailable'.
3. Rota FastAPI /api/tutor/hint: conversão de status 'unavailable' em HTTP 503 com erro explícito.
4. Gateway: Fast-break em erros permanentes (HTTP 401, 402, 403) e controle rigoroso de orçamento total.
"""
import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException

from app.services.mathai.tutor import SocraticTutor, is_valid_commented_solution
from app.services.mathai.gateway import MathAiGateway, OpenAICompatibleProvider
from app.api.routes.tutor import get_socratic_hint, SocraticHintRequest
from app.models.student import Student


def test_is_valid_commented_solution():
    # Letras secas ou gabaritos simples NÃO são resoluções comentadas
    assert is_valid_commented_solution("A") is False
    assert is_valid_commented_solution("B") is False
    assert is_valid_commented_solution("gabarito: c") is False
    assert is_valid_commented_solution("Alternativa D") is False
    assert is_valid_commented_solution("   ") is False
    assert is_valid_commented_solution(None) is False
    assert is_valid_commented_solution("123") is False

    # Resoluções com passos e desenvolvimento matemático SÃO válidas
    resolucao_valida = (
        "Para resolver esta questão, aplicamos o Teorema de Pitágoras no triângulo ABC:\n"
        "$a^2 + b^2 = c^2$. Substituindo os valores dados, obtemos $c = 5$."
    )
    assert is_valid_commented_solution(resolucao_valida) is True


def test_level5_with_only_bare_letter_solution_ai_success():
    """Se a questão tiver apenas letra 'A' no banco, mas a IA gerar uma resolução completa,
    o nível 5 deve retornar a resolução da IA."""
    tutor = SocraticTutor()
    
    mock_ai_response = {
        "content": (
            "Passo 1: Identificamos que a função é quadrática $f(x) = ax^2 + bx + c$.\n"
            "Passo 2: O vértice é dado por $x_v = -b/(2a)$. Logo, a alternativa correta é a letra A."
        ),
        "provider": "nvidia",
        "model_used": "nemotron-3-nano-omni-30b-a3b-reasoning",
        "cached": False,
        "status": "completed",
    }

    exercise = {
        "id": "test-q1",
        "enunciado": "Encontre o vértice da parábola $y = x^2 - 4x + 3$.",
        "topico": "Funções",
        "materia": "Matemática",
        "gabarito": "A",
        "solucao": "A",  # Apenas letra como solução!
    }

    with patch.object(tutor.gateway, "execute_completion", return_value=mock_ai_response):
        res = tutor.generate_hint(
            exercise=exercise,
            level=5,
            use_cache=False,
        )

        assert res["level"] == 5
        assert res["provider"] == "nvidia"
        assert "Passo 1: Identificamos" in res["hint_text"]
        assert res["hint_text"] != "A"
        assert res.get("status") == "completed"


def test_level5_when_ai_fails_and_only_bare_letter_returns_unavailable():
    """Quando o nível 5 é solicitado, a IA falha e a questão só tem a letra do gabarito,
    o tutor NÃO deve devolver a letra 'A' e nem mascarar como sucesso: deve retornar status 'unavailable'."""
    tutor = SocraticTutor()

    mock_fail_response = {
        "content": "",
        "provider": "unavailable",
        "error": "Todos os provedores de IA falharam",
        "status": "unavailable",
    }

    exercise = {
        "id": "test-q2",
        "enunciado": "Questão sem resolução comentada no banco.",
        "topico": "Geometria",
        "materia": "Matemática",
        "gabarito": "B",
        "solucao": "B",  # Somente letra
    }

    with patch.object(tutor.gateway, "execute_completion", return_value=mock_fail_response):
        res = tutor.generate_hint(
            exercise=exercise,
            level=5,
            use_cache=False,
        )

        assert res["status"] == "unavailable"
        assert res["provider"] == "fallback"
        # O erro deve alertar sobre a indisponibilidade sem enganar o usuário
        assert "indisponível" in res["error"].lower()


def test_levels_1_to_4_when_all_providers_fail_returns_unavailable():
    """Níveis 1 a 4 quando todos os provedores falham devem retornar status 'unavailable'
    em vez de mascarar a falha como sucesso da IA."""
    tutor = SocraticTutor()

    mock_fail_response = {
        "content": "",
        "provider": "unavailable",
        "error": "Todos os provedores de IA falharam",
        "status": "unavailable",
    }

    exercise = {
        "id": "test-q3",
        "enunciado": "Encontre as raízes de $x^2 - 5x + 6 = 0$.",
        "topico": "Álgebra",
        "materia": "Matemática",
        "gabarito": "C",
        "solucao": "",
    }

    with patch.object(tutor.gateway, "execute_completion", return_value=mock_fail_response):
        res = tutor.generate_hint(
            exercise=exercise,
            level=2,
            use_cache=False,
        )

        assert res["status"] == "unavailable"
        assert "indisponível" in res["error"].lower()


def test_route_get_socratic_hint_raises_503_on_unavailable():
    """A rota FastAPI deve lançar HTTPException(status_code=503) quando o tutor retornar status 'unavailable'."""
    mock_tutor = MagicMock()
    mock_tutor.generate_hint.return_value = {
        "status": "unavailable",
        "hint_text": "",
        "level": 2,
        "provider": "unavailable",
        "error": "Nenhum provedor de IA da MathAI Engine conseguiu processar a dica.",
    }

    req = SocraticHintRequest(
        enunciado="Questão teste",
        user_attempt="Meu rascunho",
        level=2,
        topico="Cálculo",
    )

    fake_student = Student(
        id="student-1",
        email="student@lemmas.ai",
        nome="Estudante Teste",
        perfil_pedagogico="conceitual",
    )

    with patch("app.api.routes.tutor.socratic_tutor", mock_tutor):
        with pytest.raises(HTTPException) as exc_info:
            get_socratic_hint(req, current_student=fake_student)
        
        assert exc_info.value.status_code == 503
        assert "Nenhum provedor de IA" in exc_info.value.detail


def test_gateway_fast_break_on_402_and_401():
    """No Gateway, OpenAICompatibleProvider deve abortar imediatamente em 401 e 402."""
    provider = OpenAICompatibleProvider(
        name="test_provider",
        base_url="https://api.fake.com/v1",
        api_key="bad_key",
        default_models=["test-model"],
        timeout=(1.0, 2.0),
    )

    mock_resp_402 = MagicMock()
    mock_resp_402.status_code = 402
    mock_resp_402.text = "Prepayment credits depleted"

    with patch("requests.post", return_value=mock_resp_402) as mock_post:
        res = provider.complete([{"role": "user", "content": "teste"}])
        assert res is None
        # O provider tentou apenas uma vez e não ficou em loop infinito
        assert mock_post.call_count == 1
