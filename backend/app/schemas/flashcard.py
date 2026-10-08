from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime
from ..models.flashcard import CardType, CardSourceType, CardStatus, ReviewRating

class FlashcardCreateRequest(BaseModel):
    card_type: CardType
    front: str
    back: str
    source_type: CardSourceType = CardSourceType.student_created
    source_id: Optional[int] = None
    concept_id: Optional[int] = None
    generator_model: Optional[str] = None
    generator_prompt_version: Optional[str] = None

class FlashcardInboxActionRequest(BaseModel):
    action: str  # "approve" | "edit" | "discard"
    front: Optional[str] = None
    back: Optional[str] = None

class FlashcardReviewRequest(BaseModel):
    rating: ReviewRating
    response_time_ms: Optional[int] = None

class FlashcardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: str
    card_type: CardType
    front: str
    back: str
    source_type: CardSourceType
    source_id: Optional[int]
    concept_id: Optional[int]
    status: CardStatus
    generator_model: Optional[str]
    generator_prompt_version: Optional[str]
    student_edited: bool
    fsrs_stability: float
    fsrs_difficulty: float
    fsrs_reps: int
    fsrs_lapses: int
    fsrs_state: str
    due_date: Optional[datetime]
    created_at: datetime

class FlashcardInboxResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    card_type: CardType
    front: str
    back: str
    source_type: CardSourceType
    source_id: Optional[int]
    concept_id: Optional[int]
    generator_model: Optional[str]
    generator_prompt_version: Optional[str]
    student_edited: bool
    fsrs_stability: float
    fsrs_difficulty: float
    fsrs_reps: int
    fsrs_lapses: int
    fsrs_state: str
    due_date: Optional[datetime]
    created_at: datetime