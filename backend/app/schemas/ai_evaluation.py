"""Esquemas Pydantic para Requisições e Respostas de Avaliação de IA."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class AiEvaluationRequest(BaseModel):
    """Requisição para submeter uma resolução ao Avaliador Cognitivo."""

    exercise_id: Optional[str] = Field(None, description="ID do exercício no banco")
    attempt_id: Optional[str] = Field(None, description="ID da tentativa imutável, se já gravada")
    enunciado: str = Field(..., description="Enunciado completo da questão")
    gabarito: Optional[str] = Field(None, description="Gabarito oficial ou valor correto")
    materia: Optional[str] = Field("Matemática", description="Disciplina")
    topico: Optional[str] = Field(None, description="Tópico matemático")
    subtopico: Optional[str] = Field(None, description="Subtópico específico")
    banca: Optional[str] = Field(None, description="Banca ou concurso")
    ano: Optional[int] = Field(None, description="Ano do exame")
    dificuldade: Optional[int] = Field(3, ge=1, le=5, description="Nível de dificuldade de 1 a 5")
    estrategias_esperadas: List[str] = Field(
        default_factory=list, description="Métodos esperados"
    )

    # Entradas do estudante
    justificativa_texto: Optional[str] = Field(
        None, description="Explicação ou passo a passo digitado pelo estudante"
    )
    imagem_base64: Optional[str] = Field(
        None,
        max_length=7_000_000,
        description="Foto de caderno ou print de tablet codificado em Base64 (limite de segurança ~5MB binário)",
    )
    mime_type: str = Field(default="image/png", description="MIME type da imagem (image/png, image/jpeg, application/pdf)")


class AiEvaluationResponse(BaseModel):
    """Resposta estruturada da avaliação cognitiva com linhagem e latência."""

    id: str
    attempt_id: Optional[str] = None
    model_name: str
    model_provider: str
    latency_ms: float
    input_hash: str
    prompt_hash: Optional[str] = None

    transcricao_latex: str = Field(
        default="", description="Transcrição precisa da caligrafia para LaTeX"
    )
    passos: List[str] = Field(
        default_factory=list, description="Lista ordenada de passos identificados"
    )
    estrategia_identificada: str = Field(
        ..., description="Estratégia observada nas evidências"
    )
    status_resolucao: Literal[
        "correto",
        "erro_conta_sinal",
        "erro_algebraico",
        "erro_conceitual",
        "erro_interpretacao",
        "incompleto",
    ] = Field(..., description="Classificação do procedimento")
    diagnostico: str = Field(
        ..., description="Parecer pedagógico socrático sem inferências infundadas"
    )
    metodo_alternativo: Optional[str] = Field(
        None, description="Método alternativo de valor didático"
    )
    linha_do_erro: Optional[str] = Field(
        None, description="Primeiro ponto exato de desvio ou falha"
    )
    dica_proximo_passo: Optional[str] = Field(
        None, description="Intervenção socrática para o estudante avançar"
    )
    confianca_diagnostico: Literal["alta", "media", "baixa"] = Field(
        default="media", description="Grau de certeza da IA baseado nas evidências visíveis"
    )
    # Contrato Estruturado de Avaliação Discursiva (4 vereditos de negócio)
    veredito: Literal["aprovado", "parcial", "sem_desenvolvimento", "incorreto"] = Field(
        default="incorreto",
        description="Veredito categorial de negócio para questões discursivas"
    )
    desenvolvimento_presente: bool = Field(
        default=False,
        description="Se o aluno apresentou passos matemáticos e raciocínio verificável"
    )
    resultado_final_correto: bool = Field(
        default=False,
        description="Se o resultado final ou conclusão obtida coincide com a verdade matemática"
    )
    etapas_corretas: List[str] = Field(
        default_factory=list,
        description="Etapas e passagens intermediárias corretas identificadas"
    )
    erros_identificados: List[str] = Field(
        default_factory=list,
        description="Erros específicos de cálculo, álgebra ou lógica encontrados"
    )
    feedback_latex: str = Field(
        default="",
        description="Feedback pedagógico detalhado com equações e fórmulas em LaTeX"
    )
    precisa_revisao_humana: bool = Field(
        default=False,
        description="Sinaliza avaliação inconclusiva, imagem ilegível ou falha de OCR"
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Data e hora da avaliação cognitiva"
    )
