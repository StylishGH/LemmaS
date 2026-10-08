"""Esquemas Pydantic para Registro e Consulta de Tentativas Imutáveis."""

from datetime import datetime
from typing import Any, Dict, Literal, Optional
from pydantic import BaseModel, Field


class AttemptCreate(BaseModel):
    """Payload para envio de uma nova tentativa pelo estudante."""

    exercise_id: str = Field(..., description="ID da questão que está sendo resolvida")
    student_id: Optional[str] = Field(
        None,
        description="ID do estudante (preenchido automaticamente se autenticado)",
    )
    raw_input: str = Field(
        ...,
        max_length=7_000_000,
        description="Conteúdo bruto enviado: texto da justificativa ou imagem em base64 (máx 7MB)",
    )
    input_type: Literal["text", "image", "multimodal"] = Field(
        default="text",
        description="Tipo da entrada bruta",
    )
    selected_alternative: Optional[str] = Field(
        None,
        description="Alternativa marcada pelo estudante (ex: 'A')",
    )
    time_spent_seconds: Optional[float] = Field(
        None,
        ge=0,
        description="Tempo de dedicação à questão em segundos",
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Metadados do cliente HTTP (navegador, tela, etc.)",
    )


class AttemptResponse(BaseModel):
    """Resposta com o registro imutável confirmado e seu hash SHA-256."""

    id: str
    student_id: str
    exercise_id: str
    timestamp: datetime
    input_type: Literal["text", "image", "multimodal"]
    input_hash: str
    selected_alternative: Optional[str] = None
    is_correct_alternative: Optional[bool] = None
    time_spent_seconds: Optional[float] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
