"""Modelo de domínio para Consentimento Versionado do Estudante (LGPD/Ética em IA).

Registra explicitamente o consentimento auditável para análise de caligrafia por IA,
telemetria cognitiva e termos de uso.
"""

from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field


class StudentConsent(BaseModel):
    """Termo de consentimento informado e versionado."""

    id: str = Field(..., description="Identificador único do registro de consentimento")
    student_id: str = Field(..., description="ID do estudante")
    consent_version: str = Field(
        default="v1.0-2026",
        description="Versão do termo de consentimento pedagógico",
    )
    terms_version: str = Field(
        default="terms-2026.1",
        description="Versão dos termos de serviço da plataforma LEMMAS",
    )
    accepted: bool = Field(True, description="Indica se o termo foi aceito")
    scopes: List[str] = Field(
        default_factory=lambda: [
            "ai_multimodal_evaluation",
            "handwriting_ocr",
            "sm2_spaced_repetition",
            "cognitive_profile_tracking",
        ],
        description="Escopos de autorização concedidos pelo estudante",
    )
    ip_hash: Optional[str] = Field(
        None,
        description="Hash anônimo do endereço IP no momento do aceite para auditoria",
    )
    user_agent: Optional[str] = Field(
        None,
        description="Identificação simplificada do navegador/dispositivo",
    )
    accepted_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Data e hora do aceite",
    )
    revoked_at: Optional[datetime] = Field(
        None,
        description="Data e hora de eventual revogação de consentimento",
    )
