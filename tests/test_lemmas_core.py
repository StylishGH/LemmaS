import pytest
from datetime import datetime
try:
    from app.services.lemmas_core.sm2 import calcular_proximo_intervalo_sm2
    from app.services.lemmas_core.cognitive_profile import (
        atualizar_metricas_topico,
        calcular_taxa_dominio,
        classificar_distribuicao_erros,
    )
    from app.services.lemmas_core.models import TipoErro
except ImportError:
    from backend.app.services.lemmas_core.sm2 import calcular_proximo_intervalo_sm2
    from backend.app.services.lemmas_core.cognitive_profile import (
        atualizar_metricas_topico,
        calcular_taxa_dominio,
        classificar_distribuicao_erros,
    )
    from backend.app.services.lemmas_core.models import TipoErro


def test_sm2_primeiro_acerto():
    res = calcular_proximo_intervalo_sm2(
        repeticoes_anteriores=0,
        fator_facilidade_anterior=2.5,
        intervalo_dias_anterior=1,
        acertou=True,
        confianca_ou_nota=4,
        data_referencia=datetime(2026, 10, 7)
    )
    assert res.repeticoes == 1
    assert res.intervalo_dias == 1
    assert res.proxima_revisao_data == "2026-10-08"
    assert res.fator_facilidade >= 2.5


def test_sm2_segundo_acerto():
    res = calcular_proximo_intervalo_sm2(
        repeticoes_anteriores=1,
        fator_facilidade_anterior=2.5,
        intervalo_dias_anterior=1,
        acertou=True,
        confianca_ou_nota=5,
        data_referencia=datetime(2026, 10, 7)
    )
    assert res.repeticoes == 2
    assert res.intervalo_dias == 3
    assert res.proxima_revisao_data == "2026-10-10"


def test_sm2_terceiro_acerto_exponencial():
    res = calcular_proximo_intervalo_sm2(
        repeticoes_anteriores=2,
        fator_facilidade_anterior=2.5,
        intervalo_dias_anterior=3,
        acertou=True,
        confianca_ou_nota=5,
        data_referencia=datetime(2026, 10, 7)
    )
    assert res.repeticoes == 3
    # 3 * 2.5 = 7.5 -> 8 dias
    assert res.intervalo_dias >= 7


def test_sm2_erro_reseta_intervalo():
    res = calcular_proximo_intervalo_sm2(
        repeticoes_anteriores=4,
        fator_facilidade_anterior=2.6,
        intervalo_dias_anterior=18,
        acertou=False,
        data_referencia=datetime(2026, 10, 7)
    )
    assert res.repeticoes == 0
    assert res.intervalo_dias == 1
    assert res.proxima_revisao_data == "2026-10-08"
    assert res.fator_facilidade == 2.4  # Redução de 0.2


def test_sm2_ef_minimo_limite():
    # EF nunca deve cair abaixo de 1.3
    res = calcular_proximo_intervalo_sm2(
        repeticoes_anteriores=0,
        fator_facilidade_anterior=1.35,
        intervalo_dias_anterior=1,
        acertou=False,
        data_referencia=datetime(2026, 10, 7)
    )
    assert res.fator_facilidade == 1.3


def test_atualizar_metricas_topico():
    m = atualizar_metricas_topico(
        total_tentativas_atual=2,
        total_acertos_atual=1,
        tempo_medio_atual=120.0,
        acertou=True,
        tempo_segundos=60,
        estrategia_usada="Substituição"
    )
    assert m.total_tentativas == 3
    assert m.total_acertos == 2
    # (120*2 + 60)/3 = 300/3 = 100.0
    assert m.tempo_medio_segundos == 100.0
    assert m.estrategia_favorita == "Substituição"


def test_calcular_taxa_dominio():
    # 10 tentativas, 8 acertos (80% acurácia) dentro do tempo esperado
    taxa = calcular_taxa_dominio(total_tentativas=10, total_acertos=8, tempo_medio_segundos=150.0)
    assert 80.0 <= taxa <= 85.0

    # 0 tentativas deve retornar 0.0
    assert calcular_taxa_dominio(0, 0, 0) == 0.0


def test_classificar_distribuicao_erros():
    tentativas = [
        {"acertou": True, "tipo_erro": "nenhum"},
        {"acertou": False, "tipo_erro": "conta_sinal"},
        {"acertou": False, "tipo_erro": "conta_sinal"},
        {"acertou": False, "tipo_erro": "conceitual"},
        {"acertou": False, "tipo_erro": "desconhecido"},
    ]
    dist = classificar_distribuicao_erros(tentativas)
    assert dist["conta_sinal"] == 2
    assert dist["conceitual"] == 1
    assert dist["outros"] == 1
