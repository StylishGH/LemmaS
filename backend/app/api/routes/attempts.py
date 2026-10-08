"""Rotas para Ingestão e Consulta de Tentativas (RAW DATA IMUTÁVEL).

Garante a gravação estrita e auditável dos dados brutos submetidos pelo estudante,
com hash SHA-256 determinístico, antes de qualquer inferência de IA.
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional
import uuid

from fastapi import APIRouter, HTTPException, Query, status

from app.core.security import compute_sha256
from app.models.attempt import Attempt
from app.schemas.attempt import AttemptCreate, AttemptResponse

router = APIRouter(prefix="/attempts", tags=["Tentativas (Raw Data)"])

# Repositório em memória para persistência de tentativas (complementado por Supabase)
_ATTEMPTS_STORE: Dict[str, Attempt] = {}


@router.post("/", response_model=AttemptResponse, status_code=status.HTTP_201_CREATED)
def record_raw_attempt(payload: AttemptCreate):
    """
    Grava a tentativa bruta do estudante com integridade garantida por SHA-256.
    Este registro é estritamente imutável (RAW DATA).
    """
    # Calcula o hash criptográfico determinístico da entrada bruta
    input_hash = compute_sha256(payload.raw_input)

    attempt_id = f"att_{uuid.uuid4().hex[:12]}"
    student_id = payload.student_id or "anonymous-student"

    attempt = Attempt(
        id=attempt_id,
        student_id=student_id,
        exercise_id=payload.exercise_id,
        timestamp=datetime.now(timezone.utc),
        raw_input=payload.raw_input,
        input_type=payload.input_type,
        input_hash=input_hash,
        selected_alternative=payload.selected_alternative,
        time_spent_seconds=payload.time_spent_seconds,
        metadata=payload.metadata,
    )

    _ATTEMPTS_STORE[attempt_id] = attempt

    return AttemptResponse(
        id=attempt.id,
        student_id=attempt.student_id,
        exercise_id=attempt.exercise_id,
        timestamp=attempt.timestamp,
        input_type=attempt.input_type,
        input_hash=attempt.input_hash,
        selected_alternative=attempt.selected_alternative,
        time_spent_seconds=attempt.time_spent_seconds,
        metadata=attempt.metadata,
    )


@router.get("/", response_model=List[AttemptResponse])
def list_student_attempts(
    student_id: Optional[str] = Query(None, description="Filtrar por estudante"),
    exercise_id: Optional[str] = Query(None, description="Filtrar por exercício"),
    limit: int = Query(50, ge=1, le=100),
):
    """Retorna histórico de tentativas gravadas."""
    attempts = list(_ATTEMPTS_STORE.values())

    if student_id:
        attempts = [a for a in attempts if a.student_id == student_id]
    if exercise_id:
        attempts = [a for a in attempts if a.exercise_id == exercise_id]

    # Ordena por timestamp descendente
    attempts.sort(key=lambda a: a.timestamp, reverse=True)

    return [
        AttemptResponse(
            id=a.id,
            student_id=a.student_id,
            exercise_id=a.exercise_id,
            timestamp=a.timestamp,
            input_type=a.input_type,
            input_hash=a.input_hash,
            selected_alternative=a.selected_alternative,
            time_spent_seconds=a.time_spent_seconds,
            metadata=a.metadata,
        )
        for a in attempts[:limit]
    ]


@router.get("/{attempt_id}", response_model=AttemptResponse)
def get_attempt_by_id(attempt_id: str):
    """Recupera uma tentativa específica pelo ID para auditoria de integridade."""
    attempt = _ATTEMPTS_STORE.get(attempt_id)
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tentativa '{attempt_id}' não encontrada",
        )

    return AttemptResponse(
        id=attempt.id,
        student_id=attempt.student_id,
        exercise_id=attempt.exercise_id,
        timestamp=attempt.timestamp,
        input_type=attempt.input_type,
        input_hash=attempt.input_hash,
        selected_alternative=attempt.selected_alternative,
        time_spent_seconds=attempt.time_spent_seconds,
        metadata=attempt.metadata,
    )
