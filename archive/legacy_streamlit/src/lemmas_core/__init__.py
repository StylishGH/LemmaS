"""
LEMMAS Core - Motor cognitivo de aprendizagem adaptativa e metacognição.
Isolado de conhecimento matemático específico para suportar múltiplos domínios futuros.
"""

from src.lemmas_core.models import (
    TipoErro,
    ResultadoSM2,
    TentativaCognitiva,
    MetricasPerfilTopico,
)
from src.lemmas_core.sm2 import calcular_proximo_intervalo_sm2
from src.lemmas_core.cognitive_profile import (
    atualizar_metricas_topico,
    calcular_taxa_dominio,
    classificar_distribuicao_erros,
)

__all__ = [
    "TipoErro",
    "ResultadoSM2",
    "TentativaCognitiva",
    "MetricasPerfilTopico",
    "calcular_proximo_intervalo_sm2",
    "atualizar_metricas_topico",
    "calcular_taxa_dominio",
    "classificar_distribuicao_erros",
]
