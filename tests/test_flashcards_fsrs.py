"""Testes unitários para Flashcards e Agendamento FSRS-v4."""

import pytest
from app.models.flashcard import CardType, CardSourceType, CardStatus, ReviewRating
from app.services.mathai.flashcards import calcular_proximo_intervalo_fsrs, exportar_deck_anki
from app.models.flashcard import Flashcard


def test_fsrs_rating_again_decreases_stability():
    stability = 2.0
    difficulty = 5.0
    reps = 1
    new_s, new_d, interval = calcular_proximo_intervalo_fsrs(
        stability=stability,
        difficulty=difficulty,
        reps=reps,
        rating=ReviewRating.again,
        elapsed_days=1.0,
    )
    assert new_s < stability
    assert new_d > difficulty
    assert interval >= 1


def test_fsrs_rating_good_increases_stability():
    stability = 2.0
    difficulty = 5.0
    reps = 1
    new_s, new_d, interval = calcular_proximo_intervalo_fsrs(
        stability=stability,
        difficulty=difficulty,
        reps=reps,
        rating=ReviewRating.good,
        elapsed_days=1.0,
    )
    assert new_s > stability
    assert new_d < difficulty
    assert interval >= 2


def test_exportar_deck_anki_tsv():
    card = Flashcard(
        id=1,
        student_id="student_test",
        card_type=CardType.formula,
        front="Qual é a fórmula de Bhaskara?",
        back="x = (-b +- sqrt(delta)) / (2a)",
        source_type=CardSourceType.student_created,
        status=CardStatus.approved,
    )
    tsv = exportar_deck_anki([card])
    assert "Qual é a fórmula de Bhaskara?" in tsv
    assert "x = (-b +- sqrt(delta)) / (2a)" in tsv
    assert "formula" in tsv
