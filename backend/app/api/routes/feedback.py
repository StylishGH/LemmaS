"""Rotas para Coleta de Feedback do Aluno e Validação Humana Especializada."""

from datetime import datetime, timezone
from typing import Dict, List, Optional
import uuid

from fastapi import APIRouter, HTTPException, Query, status

from app.models.feedback import HumanValidation, StudentFeedback
from app.schemas.feedback import (
    HumanValidationCreate,
    HumanValidationResponse,
    StudentFeedbackCreate,
    StudentFeedbackResponse,
)

router = APIRouter(prefix="/feedback", tags=["Feedback & Validação Humana"])

_STUDENT_FEEDBACKS_STORE: Dict[str, StudentFeedback] = {}
_HUMAN_VALIDATIONS_STORE: Dict[str, HumanValidation] = {}


@router.post(
    "/student",
    response_model=StudentFeedbackResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_student_feedback(
    payload: StudentFeedbackCreate,
    student_id: Optional[str] = Query("student-anonymous"),
):
    """Registra a percepção do estudante sobre o diagnóstico gerado pela IA."""
    feedback_id = f"fb_stud_{uuid.uuid4().hex[:10]}"

    feedback = StudentFeedback(
        id=feedback_id,
        attempt_id=payload.attempt_id,
        evaluation_id=payload.evaluation_id,
        student_id=student_id or "student-anonymous",
        rating=payload.rating,
        agreed_with_diagnosis=payload.agreed_with_diagnosis,
        student_notes=payload.student_notes,
    )

    _STUDENT_FEEDBACKS_STORE[feedback_id] = feedback

    return StudentFeedbackResponse(
        id=feedback.id,
        attempt_id=feedback.attempt_id,
        evaluation_id=feedback.evaluation_id,
        student_id=feedback.student_id,
        rating=feedback.rating,
        agreed_with_diagnosis=feedback.agreed_with_diagnosis,
        student_notes=feedback.student_notes,
        created_at=feedback.created_at,
    )


@router.post(
    "/human-validation",
    response_model=HumanValidationResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_human_validation(
    payload: HumanValidationCreate,
    validator_id: Optional[str] = Query("prof-auditor-01"),
):
    """Registra auditoria de especialista humano sobre a precisão matemática da IA (RLHF)."""
    val_id = f"val_hum_{uuid.uuid4().hex[:10]}"

    validation = HumanValidation(
        id=val_id,
        evaluation_id=payload.evaluation_id,
        validator_id=validator_id or "prof-auditor-01",
        validator_name=payload.validator_name or "Professor Especialista",
        agreed_with_ai=payload.agreed_with_ai,
        corrected_status=payload.corrected_status,
        corrected_error_line=payload.corrected_error_line,
        pedagogical_notes=payload.pedagogical_notes,
    )

    _HUMAN_VALIDATIONS_STORE[val_id] = validation

    return HumanValidationResponse(
        id=validation.id,
        evaluation_id=validation.evaluation_id,
        validator_id=validation.validator_id,
        validator_name=validation.validator_name,
        agreed_with_ai=validation.agreed_with_ai,
        corrected_status=validation.corrected_status,
        corrected_error_line=validation.corrected_error_line,
        pedagogical_notes=validation.pedagogical_notes,
        verified_at=validation.verified_at,
    )


@router.get("/evaluation/{evaluation_id}")
def get_evaluation_feedback(evaluation_id: str):
    """Retorna todo o feedback de estudante e validações humanas de uma avaliação."""
    student_fbs = [
        f for f in _STUDENT_FEEDBACKS_STORE.values() if f.evaluation_id == evaluation_id
    ]
    human_vals = [
        v for v in _HUMAN_VALIDATIONS_STORE.values() if v.evaluation_id == evaluation_id
    ]

    return {
        "evaluation_id": evaluation_id,
        "student_feedbacks": student_fbs,
        "human_validations": human_vals,
    }
