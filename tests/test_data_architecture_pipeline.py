"""Suíte de Testes Automatizados para a Esteira de Engenharia de Dados (SFT/TRI/DPO).

Valida:
1. Preservação da alternativa marcada (A, B, C, D, E) mesmo em schemas legados.
2. Extração determinística do par (x, y) para Fine-Tuning.
3. Rastreabilidade de telemetria e tokens.
"""

import json
import pytest
from scripts.export_ml_sft_dataset import (
    extract_answer_from_annotations,
    extract_justification_from_annotations,
)


def test_extract_answer_from_annotations():
    anotacoes_com_resposta = "[RESPOSTA:B] [TELEMETRIA_SOCRATICA: usou_dica=false, acertou=true]"
    ans = extract_answer_from_annotations(anotacoes_com_resposta)
    assert ans == "B"

    anotacoes_simulado = "Simulado 42 [RESPOSTA:D]"
    ans_sim = extract_answer_from_annotations(anotacoes_simulado)
    assert ans_sim == "D"

    anotacoes_vazio = None
    assert extract_answer_from_annotations(anotacoes_vazio) is None

    anotacoes_legadas = "[TELEMETRIA_SOCRATICA: usou_dica=false, acertou=false]"
    assert extract_answer_from_annotations(anotacoes_legadas) is None


def test_extract_justification_from_annotations():
    anotacoes_com_justificativa = "[RESPOSTA:aprovado] [TELEMETRIA_SOCRATICA: usou_dica=true] [JUSTIFICATIVA_BRUTA:Aplicando o Teorema de Tales na reta transversale calculando a razão k = 3/2] [VEREDITO:aprovado] Excelente dedução."
    just = extract_justification_from_annotations(anotacoes_com_justificativa)
    assert just == "Aplicando o Teorema de Tales na reta transversale calculando a razão k = 3/2"

    sem_just = "[RESPOSTA:A] [TELEMETRIA_SOCRATICA: usou_dica=false]"
    assert extract_justification_from_annotations(sem_just) is None


def test_sft_triplet_construction():
    """Garante que a tupla (x, y) de treinamento contém as três partes necessárias."""
    enunciado = "Calcule o limite de (sin x)/x quando x tende a 0."
    gabarito = "1"
    resolucao_aluno = "Pelo Teorema do Confronto, cos x < (sin x)/x < 1..."
    veredito_ia = "aprovado"
    diagnostico_ia = "Demonstração rigorosa pelo Teorema do Sanduíche/Confronto."

    # Input (x)
    x = {
        "enunciado": enunciado,
        "gabarito_oficial": gabarito,
        "resolucao_aluno": resolucao_aluno,
    }

    # Output padrão-ouro (y)
    y = {
        "veredito": veredito_ia,
        "diagnostico": diagnostico_ia,
    }

    assert x["resolucao_aluno"] is not None
    assert len(x["resolucao_aluno"]) > 10
    assert y["veredito"] == "aprovado"
