"""Modelo de domínio da Tentativa de Resolução (RAW DATA IMUTÁVEL).

Garante que os dados brutos enviados pelo estudante (texto digitado, foto de caderno,
tempo gasto, timestamps) sejam preservados sem nenhuma alteração ou interpretação de IA.
"""

from datetime import datetime, timezone
from typing import Any, Dict, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


class Attempt(BaseModel):
    """Registro imutável de uma tentativa de resolução matemática."""

    # Bloqueia mutações após instanciação (Imutabilidade Pydantic)
    model_config = ConfigDict(frozen=True)

    id: str = Field(..., description="Identificador único da tentativa")
    student_id: str = Field(..., description="ID do estudante autor da tentativa")
    exercise_id: str = Field(..., description="ID do exercício associado")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Carimbo de data/hora do envio",
    )
    raw_input: str = Field(
        ...,
        description="Conteúdo bruto enviado (texto de justificativa ou payload base64)",
    )
    input_type: Literal["text", "image", "multimodal"] = Field(
        default="text",
        description="Modalidade de entrada bruta",
    )
    input_hash: str = Field(
        ...,
        description="Hash SHA-256 criptográfico para verificação de integridade imutável",
    )
    selected_alternative: Optional[str] = Field(
        None,
        description="Alternativa marcada pelo estudante (ex: 'A', 'B', 'C')",
    )
    time_spent_seconds: Optional[float] = Field(
        None,
        ge=0,
        description="Tempo total em segundos despendido na tela de resolução",
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Metadados do dispositivo, cliente HTTP e resolução de tela",
    )
