"""
Testes dedicados para a Ortogonalidade Metodológica e Não-Canibalização
do painel 'Segunda Opinião' (/api/tutor/compare):
1. Verificação de que o prompt de sistema impõe estrita separação entre Rigor Axiomático e Intuição Heurística.
2. Garantia de que a Perspectiva A é formalmente instruída a NÃO canibalizar o macete da Perspectiva B.
3. Tratamento de indisponibilidade HTTP 503 quando os provedores cognitivos falham.
"""
import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException

from app.api.routes.tutor import compare_pedagogical_models, SecondOpinionRequest


def test_compare_pedagogical_models_system_prompt_enforces_orthogonality():
    """Garante que a instrução de sistema enviada ao MathAI Gateway proíbe que
    ambos os modelos ensinem o mesmo macete ou usem o mesmo método."""
    payload = SecondOpinionRequest(
        enunciado="Dado um triângulo retângulo ABC com catetos 6 e 8, determine o raio da circunferência inscrita."
    )

    mock_gateway_response = {
        "content": {
            "model_a": {
                "name": "Rigor Axiomático e Prova Formal",
                "role": "Demonstração Analítica & Invariantes",
                "content": "Prova dedutiva por partição de áreas $S = p \\cdot r$."
            },
            "model_b": {
                "name": "Heurística & Atalhos Cognitivos",
                "role": "Intuição Heurística & Atalhos Cognitivos",
                "content": "Atalho por semelhança do triângulo 3-4-5 e tangentes no ângulo reto."
            },
            "sintese": "Contraste didático entre universalidade axiomática e velocidade heurística."
        },
        "provider": "nvidia-nim",
        "latency_ms": 120.0,
        "model_used": "nemotron-3-nano-omni-30b-a3b-reasoning",
        "status": "completed"
    }

    with patch("app.api.routes.tutor.mathai_gateway.execute_completion") as mock_exec:
        mock_exec.return_value = mock_gateway_response

        res = compare_pedagogical_models(payload)

        # 1. Verifica se execute_completion foi invocado com json_output
        assert mock_exec.called
        call_kwargs = mock_exec.call_args.kwargs
        system_prompt = call_kwargs.get("system_prompt", "")

        # 2. Verifica a presença das regras mandatórias de ortogonalidade e não-canibalização
        assert "ORTOGONALIDADE & NÃO-CANIBALIZAÇÃO" in system_prompt
        assert "NUNCA devem convergir para o mesmo método" in system_prompt
        assert "PROIBIÇÃO ESTRITA: NUNCA utilize fórmulas mnemônicas ad-hoc de concurso" in system_prompt
        assert "PERSPECTIVA A" in system_prompt
        assert "PERSPECTIVA B" in system_prompt

        # 3. Verifica a integridade da resposta retornada
        assert res.model_a.name == "Rigor Axiomático e Prova Formal"
        assert "partição de áreas" in res.model_a.content
        assert res.model_b.name == "Heurística & Atalhos Cognitivos"
        assert "triângulo 3-4-5" in res.model_b.content
        assert "Contraste didático" in res.sintese


def test_compare_pedagogical_models_raises_503_on_unavailable():
    """Garante retorno HTTP 503 quando os provedores cognitivos estão indisponíveis."""
    payload = SecondOpinionRequest(
        enunciado="Problema matemático para teste de resiliência de rede."
    )

    mock_fail_response = {
        "status": "unavailable",
        "provider": "fallback",
        "content": "{}"
    }

    with patch("app.api.routes.tutor.mathai_gateway.execute_completion", return_value=mock_fail_response):
        with pytest.raises(HTTPException) as exc_info:
            compare_pedagogical_models(payload)
        
        assert exc_info.value.status_code == 503
        assert "temporariamente indisponível" in exc_info.value.detail
