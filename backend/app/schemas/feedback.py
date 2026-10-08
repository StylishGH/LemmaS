"""Esquemas Pydantic para Feedback do Estudante e Validação de Especialistas."""

from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field


class StudentFeedbackCreate(BaseModel):
    """Payload de avaliação do estudante sobre o diagnóstico da IA."""

    attempt_id: str = Field(..., description="ID da tentativa imutável")
    evaluation_id: str = Field(..., description="ID da avaliação gerada pela IA")
    rating: int = Field(..., ge=1, le=5, description="Avaliação de 1 a 5 estrelas")
    agreed_with_diagnosis: bool = Field(
        True, description="Se concordou com a identificação do erro"
    )
    student_notes: Optional[str] = Field(
        None, description="Observações livres sobre a qualidade da ajuda"
    )


class StudentFeedbackResponse(BaseModel):
    """Confirmação de recebimento do feedback do estudante."""

    id: str
    attempt_id: str
    evaluation_id: str
    student_id: str
    rating: int
    agreed_with_diagnosis: bool
    student_notes: Optional[str] = None
    created_at: datetime


class HumanValidationCreate(BaseModel):
    """Submissão de auditoria pedagógica por professor ou especialista humano."""

    evaluation_id: str = Field(..., description="ID da avaliação de IA a ser auditada")
    validator_name: Optional[str] = Field(None, description="Nome ou credencial do auditor")
    agreed_with_ai: bool = Field(..., description="Se a IA acertou o diagnóstico")
    corrected_status: Optional[
        Literal[
            "correto",
            "erro_conta_sinal",
            "erro_algebraico",
            "erro_conceitual",
            "erro_interpretacao",
            "incompleto",
        ]
    ] = Field(None, description="Status corrigido em caso de discordância")
    corrected_error_line: Optional[str] = Field(
        None, description="Linha ou etapa correta da falha"
    )
    pedagogical_notes: Optional[str] = Field(
        None, description="Justificativa pedagógica da correção"
    )


class HumanValidationResponse(BaseModel):
    """Confirmação de auditoria pedagógica registrada."""

    id: str
    evaluation_id: str
    validator_id: str
    validator_name: Optional[str] = None
    agreed_with_ai: bool
    corrected_status: Optional[str] = None
    corrected_error_line: Optional[str] = None
    pedagogical_notes: Optional[str] = None
    verified_at: datetime
