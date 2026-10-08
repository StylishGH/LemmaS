"""Modelo de domínio do Exercício/Questão Matemática e Banco de Lemas."""

from datetime import datetime, timezone
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class Exercise(BaseModel):
    """Representação de uma questão matemática no acervo LEMMAS."""

    id: str = Field(..., description="Identificador da questão")
    materia: str = Field(default="Matemática", description="Disciplina (ex: Matemática, Física)")
    topico: str = Field(..., description="Tópico conceitual (ex: Álgebra, Geometria, Cálculo)")
    subtopico: Optional[str] = Field(None, description="Subtópico específico")
    banca: Optional[str] = Field(None, description="Banca ou vestibular (ex: ITA, IME, EsPCEx, ENEM)")
    ano: Optional[int] = Field(None, description="Ano de aplicação")
    dificuldade: int = Field(default=3, ge=1, le=5, description="Nível de dificuldade de 1 a 5")
    enunciado: str = Field(..., description="Enunciado em texto ou LaTeX")
    alternativas: Optional[Dict[str, str]] = Field(
        default=None, description="Alternativas A, B, C, D, E quando questão de múltipla escolha"
    )
    gabarito: str = Field(..., description="Gabarito oficial ou valor esperado")
    resolucao_esperada: Optional[str] = Field(
        None, description="Resolução formal esperada em LaTeX"
    )
    estrategias_esperadas: List[str] = Field(
        default_factory=list, description="Lista de métodos canônicos esperados"
    )
    lemas_associados: List[str] = Field(
        default_factory=list, description="Lemas matemáticos mobilizados nesta questão"
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Data de registro no acervo",
    )
