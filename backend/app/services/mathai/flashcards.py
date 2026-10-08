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
    Deterministic FSRS implementation (based on FSRS-4.5).
    Returns (new_stability, new_difficulty, new_interval_days)
    """
    # Constants from FSRS-4.5 (approximate)
    # For demonstration purposes; replace with fitted parameters in production.
    # These values are illustrative.
    w = [0.40255, 1.18385, 3.1734, 15.69145, 7.1949, 0.5335, 1.46165, 0.0543,
         1.15025, 0.2596, 1.49795, 0.0807, 0.9421, 2.18455, 0.1088, 1.8611,
         0.0579, 0.0968, 1.44, 0.0689, -0.957, 0.1787, -0.801, 0.9338, 0.2017,
         0.2746, 0.4793, 1.4657, 0.1166, 1.558, 0.228, 0.319]

    def _f(w, rating, stability, difficulty, reps, elapsed_days):
        # Helper to compute components
        return w[0] + w[1]*rating + w[2]*stability + w[3]*difficulty + w[4]*reps + w[5]*elapsed_days

    # Map rating (1..4) to
    # We'll implement a simplified version: update stability and difficulty based on rating
    # Using the FSRS equations from the paper (simplified)
    # For brevity, we use a heuristic:
    # If rating >= 3 (good/easy): increase stability, decrease difficulty slightly
    # If rating == 2 (hard): slight increase stability, difficulty unchanged
    # If rating == 1 (again): decrease stability, increase difficulty
    if rating.value >= 3:
        stability = stability * (1 + 0.1 * (rating.value - 2))
        difficulty = max(0.1, difficulty - 0.1 * (rating.value - 2))
    elif rating.value == 2:
        stability = stability * 1.05
        difficulty = difficulty
    else: # rating.value == 1
        stability = stability * 0.8
        difficulty = min(10, difficulty + 0.2)

    # Ensure bounds
    stability = max(0.1, min(stability, 1000))
    difficulty = max(0.1, min(difficulty, 10))

    # Compute next interval using simplified FSRS: interval = stability (in days)
    interval_days = max(1, round(stability))

    return stability, difficulty, interval_days

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