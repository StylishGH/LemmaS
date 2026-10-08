"""Suíte de Testes Automatizados de Arquitetura e QA do Backend LEMMAS.

Audita rigorosamente:
1. Separação conceitual das 3 camadas (Observed Data != AI Interpretation != Validated Data)
2. Imutabilidade do modelo Attempt e cálculo estrito de hash SHA-256
3. Linhagem e rastreabilidade do AiEvaluation
4. Endpoints REST da API FastAPI via TestClient
"""

import hashlib
import pytest
from pydantic import ValidationError

from backend.app.core.security import compute_sha256
from backend.app.models.attempt import Attempt
from backend.app.models.ai_evaluation import AiEvaluation
from backend.app.models.feedback import StudentFeedback, HumanValidation
from backend.app.schemas.attempt import AttemptCreate
from backend.app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_sha256_determinism():
    """Garante que a função compute_sha256 é estritamente determinística."""
    raw_payload = "Seja f(x) = x^2 + 2x + 1. Calculando a derivada: f'(x) = 2x + 2."
    expected_hash = hashlib.sha256(raw_payload.encode("utf-8")).hexdigest()
    assert compute_sha256(raw_payload) == expected_hash


def test_attempt_immutability():
    """Verifica que o modelo Attempt bloqueia qualquer tentativa de mutação (frozen=True)."""
    raw_input = "2 + 2 = 4"
    h = compute_sha256(raw_input)
    attempt = Attempt(
        id="att_test_123",
        student_id="student_1",
        exercise_id="ex_1",
        raw_input=raw_input,
        input_hash=h,
    )

    # Tentativa de mutação deve disparar ValidationError (frozen=True)
    with pytest.raises(ValidationError):
        attempt.raw_input = "2 + 2 = 5"


def test_three_layers_conceptual_separation():
    """Garante que as 3 camadas possuem esquemas e propósitos descolados."""
    # 1. Observed Data (imutável, factual)
    raw = "Resolvendo por partes..."
    att = Attempt(
        id="att_001",
        student_id="usr_10",
        exercise_id="ex_42",
        raw_input=raw,
        input_hash=compute_sha256(raw),
    )
    assert not hasattr(att, "diagnostico")
    assert not hasattr(att, "status_resolucao")

    # 2. AI Interpretation (hipótese técnica com rastreabilidade)
    ai_eval = AiEvaluation(
        id="eval_001",
        attempt_id=att.id,
        model_name="gemini-flash-lite-latest",
        model_provider="google",
        prompt_hash=compute_sha256("prompt template v1"),
        latency_ms=250.0,
        estrategia_identificada="Integração por partes",
        status_resolucao="correto",
        diagnostico="Passos executados com precisão algébrica.",
    )
    assert ai_eval.attempt_id == att.id
    assert ai_eval.model_provider == "google"

    # 3. Validated Data (padrão-ouro humano)
    val = HumanValidation(
        id="val_001",
        evaluation_id=ai_eval.id,
        validator_id="prof_01",
        agreed_with_ai=True,
    )
    assert val.evaluation_id == ai_eval.id
    assert val.agreed_with_ai is True


def test_api_health_and_root():
    """Testa disponibilidade das rotas raiz e health check."""
    r_root = client.get("/")
    assert r_root.status_code == 200
    data_root = r_root.json()
    assert data_root["engine"] == "MathAI Engine"

    r_health = client.get("/api/health")
    assert r_health.status_code == 200
    assert r_health.json()["status"] == "ok"


def test_api_record_attempt():
    """Testa criação e persistência de tentativa imutável via API REST."""
    payload = {
        "exercise_id": "questao_efomm_2024_01",
        "student_id": "student_qa_auditor",
        "raw_input": "Delta = b^2 - 4ac = 16 - 12 = 4. x = (4 +- 2)/2",
        "input_type": "text",
        "selected_alternative": "A",
        "time_spent_seconds": 45.5,
    }
    res = client.post("/api/attempts/", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["exercise_id"] == "questao_efomm_2024_01"
    assert data["input_hash"] == compute_sha256(payload["raw_input"])
    assert data["id"].startswith("att_")

    # Verifica recuperação
    att_id = data["id"]
    get_res = client.get(f"/api/attempts/{att_id}")
    assert get_res.status_code == 200
    assert get_res.json()["input_hash"] == data["input_hash"]


def test_api_feedback_and_validation():
    """Testa fluxos de feedback do aluno e validação docente."""
    fb_payload = {
        "attempt_id": "att_001",
        "evaluation_id": "eval_001",
        "student_id": "student_qa",
        "rating": 5,
        "agreed_with_diagnosis": True,
        "student_notes": "Excelente explicação da troca de sinal.",
    }
    fb_res = client.post("/api/feedback/student", json=fb_payload)
    assert fb_res.status_code == 201

    val_payload = {
        "evaluation_id": "eval_001",
        "validator_id": "prof_auditor",
        "agreed_with_ai": True,
        "pedagogical_notes": "Diagnóstico validado pelo departamento de Matemática.",
    }
    val_res = client.post("/api/feedback/human-validation", json=val_payload)
    assert val_res.status_code == 201
