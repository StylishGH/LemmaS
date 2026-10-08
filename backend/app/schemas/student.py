"""Esquemas Pydantic para Autenticação e Perfil de Estudantes."""

from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class StudentRegister(BaseModel):
    """Payload de cadastro de novo estudante."""

    email: str = Field(
        ...,
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        description="E-mail válido do estudante",
    )
    password: str = Field(..., min_length=6, description="Senha com pelo menos 6 caracteres")
    full_name: Optional[str] = Field(None, description="Nome completo")
    consent_accepted: bool = Field(
        True,
        description="Confirmação de aceite dos termos de uso e processamento por IA",
    )


class StudentLogin(BaseModel):
    """Payload de login."""

    email: str = Field(
        ...,
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        description="E-mail cadastrado",
    )
    password: str = Field(..., description="Senha")


class StudentUpdate(BaseModel):
    """Atualização de dados cadastrais ou perfil."""

    full_name: Optional[str] = None
    cognitive_profile: Optional[Dict[str, Any]] = None


class StudentResponse(BaseModel):
    """Dados públicos do estudante retornados pela API."""

    id: str
    email: str
    full_name: Optional[str] = None
    role: str = "student"
    cognitive_profile: Dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True
    created_at: datetime


class TokenResponse(BaseModel):
    """Resposta de autenticação com token JWT."""

    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    student: StudentResponse


class TokenPayload(BaseModel):
    """Estrutura decodificada do token."""

    sub: str
    email: Optional[str] = None
    role: Optional[str] = None
    exp: Optional[int] = None
