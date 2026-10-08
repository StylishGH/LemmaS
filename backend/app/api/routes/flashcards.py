"""Rotas para Gerenciamento de Flashcards e Revisão Espaçada (FSRS-v4).

Oferece Inbox de Aprovação Humana, Agendamento FSRS e Exportação Anki.
Segue a arquitetura modular da plataforma LEMMAS.
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
import uuid

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.models.flashcard import (
    CardReview,
    CardSourceType,
    CardStatus,
    CardType,
    Flashcard,
    ReviewRating,
)
from app.schemas.flashcard import (
    FlashcardCreateRequest,
    FlashcardInboxActionRequest,
    FlashcardInboxResponse,
    FlashcardResponse,
    FlashcardReviewRequest,
)
from app.services.mathai.flashcards import (
    calcular_proximo_intervalo_fsrs,
    exportar_deck_anki,
)

router = APIRouter(prefix="/flashcards", tags=["Flashcards & FSRS"])

# Repositório em memória para flashcards e avaliações
_FLASHCARDS_STORE: Dict[int, Flashcard] = {}
_REVIEWS_STORE: List[CardReview] = []
_ID_COUNTER: int = 1


def _next_id() -> int:
    global _ID_COUNTER
    current = _ID_COUNTER
    _ID_COUNTER += 1
    return current


@router.get("/inbox", response_model=List[FlashcardInboxResponse])
def get_inbox(student_id: Optional[str] = Query("student-anonymous")):
    """Retorna os flashcards gerados pela IA aguardando revisão e aprovação do estudante."""
    cards = [
        FlashcardInboxResponse(
            id=c.id,
            card_type=c.card_type,
            front=c.front,
            back=c.back,
            source_type=c.source_type,
            source_id=c.source_id,
            concept_id=c.concept_id,
            generator_model=c.generator_model,
            generator_prompt_version=c.generator_prompt_version,
            student_edited=c.student_edited,
            fsrs_stability=c.fsrs_stability,
            fsrs_difficulty=c.fsrs_difficulty,
            fsrs_reps=c.fsrs_reps,
            fsrs_lapses=c.fsrs_lapses,
            fsrs_state=c.fsrs_state,
            due_date=c.due_date,
            created_at=c.created_at,
        )
        for c in _FLASHCARDS_STORE.values()
        if c.student_id == student_id and c.status == CardStatus.inbox_pending
    ]
    return cards


@router.post("/inbox/{card_id}/action", response_model=FlashcardResponse)
def inbox_action(
    card_id: int,
    action_req: FlashcardInboxActionRequest,
    student_id: Optional[str] = Query("student-anonymous"),
):
    """Executa ação humana sobre o cartão sugerido (aprovar, editar ou descartar)."""
    card = _FLASHCARDS_STORE.get(card_id)
    if not card or card.student_id != student_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard não encontrado no Inbox",
        )

    if action_req.action == "discard":
        card.status = CardStatus.discarded
    elif action_req.action == "approve":
        card.status = CardStatus.approved
        if action_req.front is not None:
            card.front = action_req.front
            card.student_edited = True
        if action_req.back is not None:
            card.back = action_req.back
            card.student_edited = True
        if card.due_date is None:
            card.due_date = datetime.now(timezone.utc)
    elif action_req.action == "edit":
        if action_req.front is not None:
            card.front = action_req.front
        if action_req.back is not None:
            card.back = action_req.back
        card.student_edited = True
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ação inválida. Utilize: approve, edit ou discard",
        )

    return _to_response(card)


@router.post("/", response_model=FlashcardResponse, status_code=status.HTTP_201_CREATED)
def create_flashcard(
    payload: FlashcardCreateRequest,
    student_id: Optional[str] = Query("student-anonymous"),
):
    """Cria um flashcard manualmente ou via MathAI."""
    cid = _next_id()
    is_student_created = payload.source_type == CardSourceType.student_created
    now = datetime.now(timezone.utc)

    card = Flashcard(
        id=cid,
        student_id=student_id or "student-anonymous",
        card_type=payload.card_type,
        front=payload.front,
        back=payload.back,
        source_type=payload.source_type,
        source_id=payload.source_id,
        concept_id=payload.concept_id,
        status=CardStatus.approved if is_student_created else CardStatus.inbox_pending,
        generator_model=payload.generator_model,
        generator_prompt_version=payload.generator_prompt_version,
        student_edited=False,
        fsrs_stability=2.0,
        fsrs_difficulty=5.0,
        fsrs_reps=0,
        fsrs_lapses=0,
        fsrs_state="new",
        due_date=now if is_student_created else None,
        created_at=now,
    )

    _FLASHCARDS_STORE[cid] = card
    return _to_response(card)


@router.get("/due", response_model=List[FlashcardResponse])
def get_due_flashcards(student_id: Optional[str] = Query("student-anonymous")):
    """Retorna os flashcards agendados para revisão hoje pelo FSRS."""
    now = datetime.now(timezone.utc)
    cards = [
        _to_response(c)
        for c in _FLASHCARDS_STORE.values()
        if c.student_id == student_id
        and c.status == CardStatus.approved
        and c.due_date is not None
        and c.due_date <= now
    ]
    return cards


@router.post("/{card_id}/review", response_model=FlashcardResponse)
def review_flashcard(
    card_id: int,
    review_req: FlashcardReviewRequest,
    student_id: Optional[str] = Query("student-anonymous"),
):
    """Registra uma revisão do cartão e recalcula estabilidade e próximo intervalo via FSRS-v4."""
    card = _FLASHCARDS_STORE.get(card_id)
    if not card or card.student_id != student_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard não encontrado",
        )

    was_correct = review_req.rating.value >= 3  # Good ou Easy
    now = datetime.now(timezone.utc)

    # Cálculo determinístico FSRS-v4
    stability, difficulty, new_interval_days = calcular_proximo_intervalo_fsrs(
        stability=card.fsrs_stability,
        difficulty=card.fsrs_difficulty,
        reps=card.fsrs_reps,
        rating=review_req.rating,
        elapsed_days=0.0,
    )

    card.fsrs_stability = stability
    card.fsrs_difficulty = difficulty
    card.fsrs_reps += 1

    if review_req.rating == ReviewRating.again:
        card.fsrs_lapses += 1
        card.fsrs_state = "learning"
    else:
        if card.fsrs_state == "new":
            card.fsrs_state = "learning"
        elif card.fsrs_state == "learning":
            if review_req.rating.value >= 3:
                card.fsrs_state = "review"

    card.due_date = now + timedelta(days=new_interval_days)

    # Registra o histórico da revisão
    review = CardReview(
        card_id=card.id,
        student_id=student_id or "student-anonymous",
        rating=review_req.rating,
        response_time_ms=review_req.response_time_ms,
        was_correct=was_correct,
        previous_interval=0,
        new_interval=new_interval_days,
        scheduler="FSRS-v4",
        scheduler_version="1.0",
        reviewed_at=now,
    )
    _REVIEWS_STORE.append(review)

    return _to_response(card)


@router.get("/export/anki")
def export_anki(student_id: Optional[str] = Query("student-anonymous")):
    """Exporta os cartões aprovados do estudante para formato TSV compatível com Anki."""
    cards = [
        c
        for c in _FLASHCARDS_STORE.values()
        if c.student_id == student_id and c.status == CardStatus.approved
    ]
    tsv_content = exportar_deck_anki(cards)
    return Response(
        content=tsv_content,
        media_type="text/tab-separated-values",
        headers={"Content-Disposition": "attachment; filename=lemmas_deck.tsv"},
    )


def _to_response(card: Flashcard) -> FlashcardResponse:
    return FlashcardResponse(
        id=card.id,
        student_id=card.student_id,
        card_type=card.card_type,
        front=card.front,
        back=card.back,
        source_type=card.source_type,
        source_id=card.source_id,
        concept_id=card.concept_id,
        status=card.status,
        generator_model=card.generator_model,
        generator_prompt_version=card.generator_prompt_version,
        student_edited=card.student_edited,
        fsrs_stability=card.fsrs_stability,
        fsrs_difficulty=card.fsrs_difficulty,
        fsrs_reps=card.fsrs_reps,
        fsrs_lapses=card.fsrs_lapses,
        fsrs_state=card.fsrs_state,
        due_date=card.due_date,
        created_at=card.created_at,
    )