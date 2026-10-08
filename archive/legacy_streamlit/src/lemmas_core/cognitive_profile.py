"""
Lógica de perfil cognitivo, taxa de domínio e diagnóstico de erros.
LEMMAS Core - Motor agnóstico de domínio.
"""

from typing import Optional, List, Dict, Any
from src.lemmas_core.models import MetricasPerfilTopico, TipoErro


def atualizar_metricas_topico(
    total_tentativas_atual: int,
    total_acertos_atual: int,
    tempo_medio_atual: float,
    acertou: bool,
    tempo_segundos: int,
    estrategia_usada: Optional[str] = None,
    estrategia_anterior: Optional[str] = None
) -> MetricasPerfilTopico:
    """
    Calcula a média móvel de tempo e a taxa cumulativa de acertos após uma nova tentativa.
    """
    novo_total = total_tentativas_atual + 1
    novo_acertos = total_acertos_atual + (1 if acertou else 0)
    
    novo_tempo_medio = (
        (tempo_medio_atual * total_tentativas_atual) + float(tempo_segundos)
    ) / novo_total

    estrategia_final = estrategia_usada or estrategia_anterior

    return MetricasPerfilTopico(
        total_tentativas=novo_total,
        total_acertos=novo_acertos,
        tempo_medio_segundos=round(novo_tempo_medio, 2),
        estrategia_favorita=estrategia_final
    )


def calcular_taxa_dominio(
    total_tentativas: int,
    total_acertos: int,
    tempo_medio_segundos: float,
    tempo_esperado_segundos: float = 180.0
) -> float:
    """
    Retorna uma taxa de domínio cognitivo de 0.0 a 100.0%.
    Pondera a precisão (acurácia) com a eficiência de tempo de resolução.
    """
    if total_tentativas <= 0:
        return 0.0

    acuracia = (total_acertos / total_tentativas) * 100.0

    # Fator de tempo: se resolver dentro ou abaixo do tempo esperado, ganha bônus de eficiência
    if tempo_medio_segundos <= 0:
        fator_tempo = 1.0
    elif tempo_medio_segundos <= tempo_esperado_segundos:
        fator_tempo = 1.0
    else:
        # Penalização suave para resoluções excessivamente lentas
        fator_tempo = max(0.6, 1.0 - ((tempo_medio_segundos - tempo_esperado_segundos) / (tempo_esperado_segundos * 2)))

    dominio = (acuracia * 0.8) + (fator_tempo * 20.0)
    return round(min(100.0, max(0.0, dominio)), 1)


def classificar_distribuicao_erros(tentativas: List[Dict[str, Any]]) -> Dict[str, int]:
    """
    Conta e categoriza os erros registrados no histórico.
    """
    distribuicao = {
        "conta_sinal": 0,
        "conceitual": 0,
        "interpretacao": 0,
        "lacuna_repertorio": 0,
        "tempo_pressao": 0,
        "outros": 0
    }

    for t in tentativas:
        if not t.get("acertou", True):
            tipo = t.get("tipo_erro", "nenhum")
            if tipo in distribuicao:
                distribuicao[tipo] += 1
            else:
                distribuicao["outros"] += 1

    return distribuicao
