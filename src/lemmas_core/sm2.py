"""
Algoritmo SuperMemo-2 (SM-2) puro para repetição espaçada adaptativa.
LEMMAS Core - Motor agnóstico de domínio.
"""

from datetime import datetime, timedelta
from typing import Optional
from src.lemmas_core.models import ResultadoSM2


def calcular_proximo_intervalo_sm2(
    repeticoes_anteriores: int,
    fator_facilidade_anterior: float = 2.5,
    intervalo_dias_anterior: int = 1,
    acertou: bool = True,
    confianca_ou_nota: Optional[int] = None,
    data_referencia: Optional[datetime] = None
) -> ResultadoSM2:
    """
    Calcula a próxima revisão com base no algoritmo SuperMemo-2.

    Parâmetros:
        repeticoes_anteriores: número de vezes consecutivas que o estudante acertou o item
        fator_facilidade_anterior: EF (Easiness Factor), padrão inicial 2.5, mínimo 1.3
        intervalo_dias_anterior: quantos dias de intervalo no ciclo anterior
        acertou: booleano indicando acerto ou erro
        confianca_ou_nota: escala de 1 a 5 (qualidade da recordação)
        data_referencia: data base para calcular o próximo dia (default: datetime.now())

    Retorna:
        ResultadoSM2 com novo número de repetições, EF, intervalo em dias e data formatada.
    """
    if data_referencia is None:
        data_referencia = datetime.now()

    # Validação do fator de facilidade mínimo
    ef = max(1.3, fator_facilidade_anterior or 2.5)

    if acertou:
        novas_repeticoes = repeticoes_anteriores + 1
        
        # Atribuir nota de qualidade padrão (3 a 5 para acertos)
        if confianca_ou_nota is not None:
            nota = max(3, min(5, confianca_ou_nota))
        else:
            nota = 4

        # Regra de intervalos do SM-2
        if novas_repeticoes == 1:
            novo_intervalo = 1
        elif novas_repeticoes == 2:
            novo_intervalo = 3
        else:
            novo_intervalo = max(1, int(round(intervalo_dias_anterior * ef)))

        # Ajuste do Fator de Facilidade (Easiness Factor)
        # EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        delta_q = 5 - nota
        novo_ef = ef + (0.1 - delta_q * (0.08 + delta_q * 0.02))
        novo_ef = max(1.3, round(novo_ef, 2))

    else:
        # Se errou, reinicia as repetições consecutivas e agenda para revisão no dia seguinte
        novas_repeticoes = 0
        novo_intervalo = 1
        # Redução suave de EF no erro
        novo_ef = max(1.3, round(ef - 0.2, 2))

    proxima_data = (data_referencia + timedelta(days=novo_intervalo)).strftime("%Y-%m-%d")

    return ResultadoSM2(
        repeticoes=novas_repeticoes,
        fator_facilidade=novo_ef,
        intervalo_dias=novo_intervalo,
        proxima_revisao_data=proxima_data
    )
