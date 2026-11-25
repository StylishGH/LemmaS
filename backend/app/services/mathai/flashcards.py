from typing import Tuple, Optional
from app.models.flashcard import Flashcard, CardReview, ReviewRating, CardType, CardSourceType, CardStatus

def calcular_proximo_intervalo_fsrs(
    stability: float,
    difficulty: float,
    reps: int,
    rating: ReviewRating,
    elapsed_days: float = 0.0
) -> Tuple[float, float, int]:
    """
    Experimental FSRS-inspired DSR scheduler (uncalibrated prototype).
    Uses the FSRS power-law forgetting curve R(t) = (1 + (19/81) * t / S)^(-0.5)
    so interval matches 90% target retention (I ≈ S) while incorporating D and R(t).
    Returns (new_stability, new_difficulty, new_interval_days).
    """
    safe_s = max(0.1, min(float(stability), 1000.0))
    safe_d = max(1.0, min(float(difficulty), 10.0))
    t = max(0.0, float(elapsed_days))

    # FSRS power-law retrievability (at t = S, R(S) = 0.9)
    retrievability = (1.0 + (19.0 / 81.0) * (t / safe_s)) ** -0.5

    # Mean-reverted difficulty update (1..10): Again/Hard raise D, Good/Easy lower D
    next_d = safe_d - 0.5 * (rating.value - 2.5)
    next_d = max(1.0, min(10.0, 0.9 * next_d + 0.1 * 5.0))

    if rating.value == 1:  # Again (lapse)
        next_s = max(0.5, safe_s * (0.4 + 0.2 * (1.0 - retrievability)))
        interval_days = 1
    elif rating.value == 2:  # Hard
        growth = 1.0 + 0.15 * (11.0 - next_d) * 0.1 * (2.0 - retrievability)
        next_s = safe_s * growth
        interval_days = max(1, round(next_s * 0.85))
    else:  # Good (3) or Easy (4)
        easy_bonus = 1.3 if rating.value == 4 else 1.0
        gain = (11.0 - next_d) * (safe_s ** -0.2) * (2.0 - retrievability) * 0.18 * easy_bonus
        next_s = safe_s * (1.0 + max(0.1, gain))
        interval_days = max(1, round(next_s))

    next_s = max(0.1, min(round(next_s, 4), 1000.0))
    next_d = round(next_d, 4)
    return next_s, next_d, interval_days

def sugerir_cartao_de_tentativa(tentativa, diagnostico_ia):
    """
    Cria um flashcard de error_recall ou concept na caixa de entrada pendente.
    Placeholder implementation.
    """
    # In a real implementation, we would analyze the attempt and diagnostic
    # to generate a flashcard.
    # For now, we return a dummy flashcard object (not saved).
    flashcard = Flashcard(
        student_id=getattr(tentativa, "student_id", "student_default"),
        card_type=CardType.error_recall,
        front="Erro recall placeholder",
        back="Explicação placeholder",
        source_type=CardSourceType.ai_generated,
        source_id=getattr(tentativa, "id", None),
        status=CardStatus.inbox_pending,
    )
    return flashcard

def exportar_deck_anki(cards):
    """
    Gera formato de exportação Anki (TSV compatível com campos Front, Back, Tags, Type, Source).
    Returns a string in TSV format.
    """
    lines = []
    for card in cards:
        # Determine tags
        tags = f"{card.card_type.value},{card.source_type.value}"
        # Determine type field (maybe the card type)
        type_field = card.card_type.value
        # Source field: maybe source type and source id
        source = f"{card.source_type.value}:{card.source_id or ''}"
        line = f"{card.front}\t{card.back}\t{tags}\t{type_field}\t{source}"
        lines.append(line)
    return "\n".join(lines)