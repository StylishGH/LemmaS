from enum import Enum
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class CardType(str, Enum):
    formula = "formula"
    concept = "concept"
    recognition = "recognition"
    application = "application"
    error_recall = "error_recall"
    diagram = "diagram"

class CardSourceType(str, Enum):
    ai_generated = "ai_generated"
    student_created = "student_created"
    teacher_created = "teacher_created"
    imported_anki = "imported_anki"

class CardStatus(str, Enum):
    inbox_pending = "inbox_pending"
    approved = "approved"
    discarded = "discarded"

class ReviewRating(int, Enum):
    again = 1
    hard = 2
    good = 3
    easy = 4

class Flashcard(BaseModel):
    id: Optional[int] = None
    student_id: str
    card_type: CardType
    front: str = Field(..., description="Markdown/LaTeX content")
    back: str = Field(..., description="Markdown/LaTeX content")
    source_type: CardSourceType
    source_id: Optional[int] = None  # e.g., attempt_id
    concept_id: Optional[int] = None
    status: CardStatus = Field(
        default=CardStatus.inbox_pending,
        description="Default to inbox_pending for AI-generated, approved for student-created"
    )
    generator_model: Optional[str] = None
    generator_prompt_version: Optional[str] = None
    student_edited: bool = Field(default=False)
    fsrs_stability: float = Field(default=2.0)
    fsrs_difficulty: float = Field(default=5.0)
    fsrs_reps: int = Field(default=0)
    fsrs_lapses: int = Field(default=0)
    fsrs_state: str = Field(default="new")  # "new", "learning", "review"
    due_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CardReview(BaseModel):
    id: Optional[int] = None
    card_id: int
    student_id: str
    reviewed_at: datetime = Field(default_factory=datetime.utcnow)
    rating: ReviewRating
    response_time_ms: Optional[int] = None
    was_correct: bool
    scheduler: str = Field(default="FSRS-v4")
    scheduler_version: str = Field(default="1.0")
    previous_interval: int = Field(default=0)
    new_interval: int = Field(default=0)