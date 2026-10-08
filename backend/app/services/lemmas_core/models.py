"""
Modelos e estruturas de dados do LEMMAS Core.
Desacoplado de domínios específicos (Matemática, Física, Biologia, etc.).
"""

from dataclasses import dataclass
from enum import Enum
from typing import Optional


class TipoErro(str, Enum):
    NENHUM = "nenhum"
    ARITMETICA_CONTA = "conta_sinal"
    CONCEITUAL = "conceitual"
    INTERPRETACAO = "interpretacao"
    HEURISTICA_REPERTORIO = "lacuna_repertorio"
    TEMPO_PRESSAO = "tempo_pressao"


@dataclass
class ResultadoSM2:
    repeticoes: int
    fator_facilidade: float
    intervalo_dias: int
    proxima_revisao_data: str


@dataclass
class TentativaCognitiva:
    aluno_id: int
    questao_id: int
    tempo_segundos: int
    acertou: bool
    confianca: int = 3
    tipo_erro: str = "nenhum"
    estrategia: Optional[str] = None
    anotacoes: Optional[str] = None


@dataclass
class MetricasPerfilTopico:
    total_tentativas: int
    total_acertos: int
    tempo_medio_segundos: float
    estrategia_favorita: Optional[str] = None
