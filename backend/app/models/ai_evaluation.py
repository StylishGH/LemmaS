"""Modelo de domínio da Avaliação de IA (AI INTERPRETATION).

Armazena a interpretação pedagógica gerada pela MathAI Engine, registrando
estritamente a linhagem do modelo (nome, versão, provedor), hash do prompt e latência em ms.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class AiEvaluation(BaseModel):
    """Interpretação e diagnóstico cognitivo gerado por modelo de IA."""

    id: str = Field(..., description="Identificador único da avaliação de IA")
    attempt_id: str = Field(..., description="ID da tentativa imutável associada")

    # Metadados de Linhagem e Execução do Modelo
    model_name: str = Field(
        ...,
        description="Identificador exato do modelo (ex: gemini-flash-lite-latest, nemotron-3.5)",
    )
    model_version: str = Field(default="1.0.0", description="Versão do modelo ou checkpoint")
    model_provider: Literal["google", "nvidia", "9router", "mock", "fallback"] = Field(
        ...,
        description="Provedor de inferência que serviu a resposta",
    )
    prompt_template_version: str = Field(
        default="2026.1",
        description="Versão do template do prompt pedagógico",
    )
    prompt_hash: str = Field(
        ...,
        description="Hash SHA-256 do prompt completo enviado ao modelo",
    )
    latency_ms: float = Field(
        ...,
        ge=0,
        description="Latência total da chamada ao modelo em milissegundos",
    )
    evaluation_status: Literal["completed", "fallback", "failed"] = Field(
        default="completed",
        description="Status operacional da inferência",
    )

    # Interpretação Pedagógica Estruturada
    transcricao_latex: str = Field(
        default="",
        description="Expressões matemáticas manuscritas convertidas para notação LaTeX",
    )
    passos: List[str] = Field(
        default_factory=list,
        description="Sequência de passos de raciocínio identificados",
    )
    estrategia_identificada: str = Field(
        ...,
        description="Estratégia real de resolução utilizada pelo estudante",
    )
    status_resolucao: Literal[
        "correto",
        "erro_conta_sinal",
        "erro_algebraico",
        "erro_conceitual",
        "erro_interpretacao",
        "incompleto",
    ] = Field(
        ...,
        description="Classificação pedagógica do primeiro erro ou sucesso",
    )
    diagnostico: str = Field(
        ...,
        description="Parecer pedagógico socrático explicando o raciocínio e a causa-raiz",
    )
    metodo_alternativo: Optional[str] = Field(
        None,
        description="Estratégia alternativa com alto valor didático, se aplicável",
    )
    linha_do_erro: Optional[str] = Field(
        None,
        description="Indicação precisa da etapa/linha matemática em que surgiu a falha",
    )
    dica_proximo_passo: Optional[str] = Field(
        None,
        description="Dica socrática de intervenção pedagógica progressiva",
    )
    confianca_diagnostico: Literal["alta", "media", "baixa"] = Field(
        default="media",
        description="Nível de certeza da IA baseado na nitidez da evidência",
    )
    raw_response: Dict[str, Any] = Field(
        default_factory=dict,
        description="Payload JSON bruto retornado pelo provedor de inferência",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Carimbo de data/hora da avaliação",
    )
