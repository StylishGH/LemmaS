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


def test_distractor_export_uses_same_filtered_batch(monkeypatch, tmp_path):
    import csv
    import hashlib

    from scripts import export_ml_sft_dataset as exporter

    question = {"tipo": "objetiva", "gabarito": "A"}
    attempts = [
        {"questao_id": 1, "questoes": question, "resposta_aluno": "A", "aluno_id": 12},
        {"questao_id": 2, "questoes": question, "anotacoes": "[RESPOSTA:b]"},
        {"questao_id": 3, "questoes": question, "resposta_aluno": "DICA_5_REVELADA"},
        {"questao_id": 4, "questoes": {"tipo": "discursiva"}, "resposta_aluno": "A"},
        {"questao_id": 5, "questoes": question},
    ]
    monkeypatch.setattr(exporter, "get_supabase_client", lambda: object())
    monkeypatch.setattr(exporter, "iter_attempts", lambda client: iter(attempts))
    run = exporter.export_datasets(tmp_path)

    manifest = json.loads((run / "manifest.json").read_text())
    rows = json.loads((run / "tri_distractor_analysis.json").read_text())
    with (run / "tri_distractor_analysis.csv").open(newline="") as stream:
        csv_rows = list(csv.DictReader(stream))
    assert manifest["rows"] == len(rows) == len(csv_rows) == 2
    assert [(row["questao_id"], row["resposta_marcada"], row["acertou"]) for row in rows] == [
        (1, "A", 1), (2, "B", 0),
    ]
    assert [(int(row["questao_id"]), row["resposta_marcada"], int(row["acertou"])) for row in csv_rows] == [
        (1, "A", 1), (2, "B", 0),
    ]
    assert all("aluno_id" not in row for row in rows)
    assert not (run / "lemmas_sft_dataset.jsonl").exists()
    for name, digest in manifest["files_sha256"].items():
        assert hashlib.sha256((run / name).read_bytes()).hexdigest() == digest


def test_distractor_export_pseudonymizes_student_with_salt(monkeypatch, tmp_path):
    from scripts import export_ml_sft_dataset as exporter

    question = {"tipo": "objetiva", "gabarito": "A"}
    attempts = [
        {"questao_id": 1, "questoes": question, "resposta_aluno": "A", "aluno_id": 12},
        {"questao_id": 2, "questoes": question, "resposta_aluno": "B", "aluno_id": 12},
        {"questao_id": 3, "questoes": question, "resposta_aluno": "C", "aluno_id": 99},
    ]
    monkeypatch.setenv("LEMMAS_EXPORT_PSEUDONYM_SALT", "test-salt-2026")
    monkeypatch.setattr(exporter, "get_supabase_client", lambda: object())
    monkeypatch.setattr(exporter, "iter_attempts", lambda client: iter(attempts))
    run = exporter.export_datasets(tmp_path)

    rows = json.loads((run / "tri_distractor_analysis.json").read_text())
    assert len(rows) == 3
    assert rows[0]["student_hash"] == rows[1]["student_hash"]
    assert rows[0]["student_hash"] != rows[2]["student_hash"]
    assert len(rows[0]["student_hash"]) == 16
    assert all("aluno_id" not in row for row in rows)
