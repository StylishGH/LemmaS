"""Modelo de domínio para Feedback do Estudante e Validação Humana.

Permite que tanto o estudante forneça sua percepção quanto professores/avaliadores
humanos auditem e validem a interpretação gerada pela IA (Human-in-the-loop).
"""

from datetime import datetime, timezone
from typing import Literal, Optional
from pydantic import BaseModel, Field


class StudentFeedback(BaseModel):
    """Feedback fornecido pelo estudante sobre o diagnóstico recebido."""

    id: str = Field(..., description="Identificador único do feedback")
    attempt_id: str = Field(..., description="ID da tentativa avaliada")
    evaluation_id: str = Field(..., description="ID da avaliação de IA avaliada")
    student_id: str = Field(..., description="ID do estudante autor do feedback")
    rating: int = Field(..., ge=1, le=5, description="Avaliação de 1 a 5 estrelas")
    agreed_with_diagnosis: bool = Field(
        True,
        description="Indica se o estudante concordou com o diagnóstico de seu erro",
    )
    student_notes: Optional[str] = Field(
        None,
        description="Comentário livre do estudante sobre a utilidade da dica",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Data de registro do feedback",
    )


class HumanValidation(BaseModel):
    """Validação pedagógica por professor ou especialista humano (RLHF/Auditoria)."""

    id: str = Field(..., description="Identificador único da auditoria humana")
    evaluation_id: str = Field(..., description="ID da avaliação de IA auditada")
    validator_id: str = Field(..., description="ID do professor/auditor humano")
    validator_name: Optional[str] = Field(None, description="Nome do auditor")
    agreed_with_ai: bool = Field(
        ...,
        description="Se o especialista humano concorda com o parecer da IA",
    )
    corrected_status: Optional[
        Literal[
            "correto",
            "erro_conta_sinal",
            "erro_algebraico",
            "erro_conceitual",
            "erro_interpretacao",
            "incompleto",
        ]
    ] = Field(
        None,
        description="Status corrigido pelo especialista se a IA errou a classificação",
    )
    corrected_error_line: Optional[str] = Field(
        None,
        description="Linha exata do erro ajustada pelo especialista",
    )
    pedagogical_notes: Optional[str] = Field(
        None,
        description="Notas qualitativas do professor para aprimoramento contínuo",
    )
    verified_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Data da validação humana",
    )
