"""Rotas da MathAI Engine: Tutor Socrático, Avaliador Cognitivo e OCR Multimodal."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.api.routes.exercises import _EXERCISES_STORE
from app.schemas.ai_evaluation import AiEvaluationRequest, AiEvaluationResponse
from app.services.mathai.evaluator import cognitive_evaluator
from app.services.mathai.recommender import cognitive_recommender
from app.services.mathai.tutor import socratic_tutor
from app.services.mathai.vision import vision_processor

router = APIRouter(prefix="/tutor", tags=["MathAI Engine (Tutor & Avaliador)"])


class SocraticHintRequest(BaseModel):
    """Payload para solicitação de dica socrática."""

    exercise_id: Optional[str] = Field(None, description="ID do exercício cadastrado")
    enunciado: Optional[str] = Field(None, description="Enunciado da questão caso avulsa")
    topico: Optional[str] = Field("Matemática", description="Tópico da questão")
    gabarito: Optional[str] = Field("", description="Gabarito oficial")
    estrategias_esperadas: List[str] = Field(default_factory=list)
    level: int = Field(default=1, ge=1, le=5, description="Nível de 1 a 5 da dica socrática")


class SocraticHintResponse(BaseModel):
    """Resposta contendo a dica socrática pedagógica formatada em LaTeX."""

    level: int
    hint_text: str
    exercise_id: Optional[str] = None
    model_used: str
    provider: str
    latency_ms: float
    input_hash: str


class VisionOcrRequest(BaseModel):
    """Payload de imagem para OCR de caderno ou tablet."""

    image_base64: str = Field(..., description="Imagem codificada em base64")
    mime_type: str = Field(default="image/png", description="MIME type (image/png, image/jpeg)")


class VisionOcrResponse(BaseModel):
    """Resposta com as equações manuscritas transcritas em LaTeX."""

    transcricao_latex: str
    passos_detectados: List[str]
    legibilidade: str
    latency_ms: float
    model_used: str
    provider: str


class ReviewScheduleRequest(BaseModel):
    """Requisição de cálculo de repetição espaçada SM-2."""

    student_id: str
    exercise_id: str
    quality: int = Field(..., ge=0, le=5, description="Nota de 0 a 5 do desempenho")
    current_sm2_state: Optional[Dict[str, Any]] = None


@router.post("/hint", response_model=SocraticHintResponse)
def get_socratic_hint(payload: SocraticHintRequest):
    """Gera dica socrática em 5 níveis (dados -> lema -> primeiro passo -> cálculo -> resolução)."""
    exercise_dict: Dict[str, Any] = {}

    if payload.exercise_id and payload.exercise_id in _EXERCISES_STORE:
        ex = _EXERCISES_STORE[payload.exercise_id]
        exercise_dict = {
            "id": ex.id,
            "enunciado": ex.enunciado,
            "topico": ex.topico,
            "gabarito": ex.gabarito,
            "estrategias_esperadas": ex.estrategias_esperadas,
            "lemas_associados": ex.lemas_associados,
        }
    else:
        exercise_dict = {
            "id": payload.exercise_id or "adhoc-exercise",
            "enunciado": payload.enunciado or "Problema matemático geral",
            "topico": payload.topico,
            "gabarito": payload.gabarito,
            "estrategias_esperadas": payload.estrategias_esperadas,
        }

    hint_result = socratic_tutor.generate_hint(exercise_dict, level=payload.level)

    return SocraticHintResponse(
        level=hint_result["level"],
        hint_text=hint_result["hint_text"],
        exercise_id=hint_result.get("exercise_id"),
        model_used=hint_result.get("model_used", "socratic-engine"),
        provider=hint_result.get("provider", "fallback"),
        latency_ms=hint_result.get("latency_ms", 0.0),
        input_hash=hint_result.get("input_hash", ""),
    )


@router.post("/evaluate", response_model=AiEvaluationResponse)
def evaluate_resolution(payload: AiEvaluationRequest):
    """
    Avalia a resolução do estudante a partir de evidências reais (texto e/ou imagem OCR).
    Garante o princípio de 'Evidência antes de Inferência', identificando erros e estratégias.
    """
    # 1. Recupera contexto da questão se ID fornecido
    exercise_dict: Dict[str, Any] = {}
    if payload.exercise_id and payload.exercise_id in _EXERCISES_STORE:
        ex = _EXERCISES_STORE[payload.exercise_id]
        exercise_dict = {
            "id": ex.id,
            "enunciado": ex.enunciado,
            "topico": ex.topico,
            "subtopico": ex.subtopico,
            "banca": ex.banca,
            "ano": ex.ano,
            "dificuldade": ex.dificuldade,
            "gabarito": ex.gabarito,
            "estrategias_esperadas": ex.estrategias_esperadas,
        }
    else:
        exercise_dict = {
            "id": payload.exercise_id or "adhoc",
            "enunciado": payload.enunciado,
            "topico": payload.topico or "Matemática",
            "subtopico": payload.subtopico,
            "banca": payload.banca,
            "ano": payload.ano,
            "dificuldade": payload.dificuldade or 3,
            "gabarito": payload.gabarito or "",
            "estrategias_esperadas": payload.estrategias_esperadas or [],
        }

    # 2. Se houver imagem anexada, processa OCR primeiro
    ocr_transcription = None
    if payload.imagem_base64:
        ocr_res = vision_processor.process_image(
            image_data=payload.imagem_base64,
            mime_type=payload.mime_type,
        )
        ocr_transcription = ocr_res.get("transcricao_latex", "")

    # 3. Executa a avaliação cognitiva
    student_text = payload.justificativa_texto or "Nenhuma justificativa em texto fornecida."
    eval_result = cognitive_evaluator.evaluate_attempt(
        exercise=exercise_dict,
        student_input=student_text,
        input_type="multimodal" if payload.imagem_base64 else "text",
        transcription_latex=ocr_transcription,
    )

    return AiEvaluationResponse(
        id=eval_result["id"],
        attempt_id=payload.attempt_id,
        model_name=eval_result["model_name"],
        model_provider=eval_result["model_provider"],
        latency_ms=eval_result["latency_ms"],
        input_hash=eval_result["input_hash"],
        prompt_hash=eval_result.get("prompt_hash"),
        transcricao_latex=eval_result.get("transcricao_latex", ""),
        passos=eval_result.get("passos", []),
        estrategia_identificada=eval_result.get("estrategia_identificada", "Geral"),
        status_resolucao=eval_result.get("status_resolucao", "incompleto"),
        diagnostico=eval_result.get("diagnostico", ""),
        metodo_alternativo=eval_result.get("metodo_alternativo"),
        linha_do_erro=eval_result.get("linha_do_erro"),
        dica_proximo_passo=eval_result.get("dica_proximo_passo"),
        confianca_diagnostico=eval_result.get("confianca_diagnostico", "media"),
        created_at=datetime.now(timezone.utc),
    )


@router.post("/ocr", response_model=VisionOcrResponse)
def transcribe_notebook_image(payload: VisionOcrRequest):
    """Executa o OCR multimodal especializado em caligrafia de cadernos e tablets."""
    ocr_res = vision_processor.process_image(
        image_data=payload.image_base64,
        mime_type=payload.mime_type,
    )

    return VisionOcrResponse(
        transcricao_latex=ocr_res.get("transcricao_latex", ""),
        passos_detectados=ocr_res.get("passos_detectados", []),
        legibilidade=ocr_res.get("legibilidade", "media"),
        latency_ms=ocr_res.get("latency_ms", 0.0),
        model_used=ocr_res.get("model_used", "vision-engine"),
        provider=ocr_res.get("provider", "fallback"),
    )


@router.post("/review-schedule")
def calculate_next_review(payload: ReviewScheduleRequest):
    """Calcula o ciclo de repetição espaçada SM-2 e sugere lemas de reforço."""
    sm2_res = cognitive_recommender.process_review_cycle(
        student_id=payload.student_id,
        exercise_id=payload.exercise_id,
        quality=payload.quality,
        current_sm2_state=payload.current_sm2_state,
    )

    # Se a nota foi baixa (< 3), prescreve lemas de reforço
    suggested_lemmas = []
    if payload.quality < 3:
        suggested_lemmas = cognitive_recommender.recommend_lemmas(
            error_type="erro_conceitual"
        )

    return {
        "student_id": payload.student_id,
        "exercise_id": payload.exercise_id,
        "sm2_updated": sm2_res["sm2_updated"],
        "suggested_lemmas": suggested_lemmas,
    }
