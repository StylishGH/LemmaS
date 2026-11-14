"""Regression for the original OCR evidence, confirmation, and no extra model call."""
import json
from unittest.mock import patch
from app.api.routes.tutor import ArithmeticCheckRequest, evaluate_resolution, verify_arithmetic
from app.schemas.ai_evaluation import AiEvaluationRequest
from app.services.mathai.evaluator import cognitive_evaluator


def model_result():
    return {'content': json.dumps({'veredito': 'aprovado', 'desenvolvimento_presente': True,
        'resultado_final_correto': True, 'transcricao_latex': '5*7/2=17.5',
        'status_resolucao': 'correto', 'feedback_latex': 'Cálculo correto.'}),
        'model_used': 'fixture', 'provider': 'fixture'}


def test_original_ocr_cannot_be_silently_rewritten_by_evaluator():
    payload = AiEvaluationRequest(enunciado='Diagonais 5 e 7', imagem_base64='fixture')
    with patch('app.api.routes.tutor.vision_processor.process_image', return_value={
        'transcricao_latex': '8*7/2=17.5', 'legibilidade': 'alta'}), patch.object(
        cognitive_evaluator.gateway, 'execute_completion', return_value=model_result()) as model:
        result = evaluate_resolution(payload, current_student=object())
    assert model.call_count == 1
    assert result.ocr_review_required
    assert result.precisa_revisao_humana
    assert result.transcricao_latex == '8*7/2=17.5'
    assert result.arithmetic_check['status'] == 'conflict'


def test_confirmation_skips_new_ocr_but_still_evaluates_reasoning():
    payload = AiEvaluationRequest(enunciado='Diagonais 5 e 7', imagem_base64='original', transcricao_confirmada='5*7/2=17.5')
    with patch('app.api.routes.tutor.vision_processor.process_image') as vision, patch.object(
        cognitive_evaluator.gateway, 'execute_completion', return_value=model_result()) as model:
        result = evaluate_resolution(payload, current_student=object())
    vision.assert_not_called()
    assert model.call_count == 1
    assert not result.ocr_review_required
    assert not result.precisa_revisao_humana
    assert result.veredito == 'aprovado'


def test_arithmetic_endpoint_does_not_call_model():
    with patch.object(cognitive_evaluator.gateway, 'execute_completion') as model:
        result = verify_arithmetic(ArithmeticCheckRequest(transcription='8*7/2=17.5'), current_student=object())
    model.assert_not_called()
    assert result['status'] == 'conflict'
