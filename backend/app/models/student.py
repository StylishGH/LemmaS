"""Modelo de domínio do Estudante e seu Perfil Cognitivo."""

from datetime import datetime, timezone
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class Student(BaseModel):
    """Representação de dados do Estudante na plataforma LEMMAS."""

    id: str = Field(..., description="Identificador único (UUID)")
    email: str = Field(..., description="Endereço de e-mail do estudante")
    full_name: Optional[str] = Field(None, description="Nome completo")
    hashed_password: Optional[str] = Field(None, description="Hash da senha")
    role: str = Field("student", description="Papel: student, tutor ou admin")
    cognitive_profile: Dict[str, Any] = Field(
        default_factory=lambda: {
            "sm2_factors": {},
            "mastery_by_topic": {},
            "total_attempts": 0,
            "error_distribution": {},
        },
        description="Estado cognitivo evolutivo e parâmetros SM-2",
    )
    is_active: bool = Field(True, description="Indica se a conta está ativa")
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Data de cadastro",
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Última atualização de perfil",
    )
