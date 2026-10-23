"""Rotas da MathAI Engine: Tutor Socrático, Avaliador Cognitivo e OCR Multimodal."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, model_validator

from app.api.routes.auth import get_current_student
from app.api.routes.exercises import _EXERCISES_STORE
from app.schemas.ai_evaluation import AiEvaluationRequest, AiEvaluationResponse
from app.services.mathai.evaluator import cognitive_evaluator
from app.services.mathai.recommender import cognitive_recommender
from app.services.mathai.tutor import socratic_tutor
from app.services.mathai.vision import vision_processor
from app.services.mathai.gateway import mathai_gateway
from app.models.student import Student

router = APIRouter(prefix="/tutor", tags=["MathAI Engine (Tutor & Avaliador)"])


class SocraticHintRequest(BaseModel):
    """Payload para solicitação de dica socrática."""

    exercise_id: Optional[str] = Field(None, description="ID do exercício cadastrado")
    enunciado: Optional[str] = Field(None, description="Enunciado da questão caso avulsa")
    materia: Optional[str] = Field("Matemática", description="Grande área ou matéria da questão")
    topico: Optional[str] = Field("Matemática", description="Tópico da questão")
    gabarito: Optional[str] = Field("", description="Gabarito oficial")
    solucao: Optional[str] = Field("", description="Solução ou resolução oficial comentada")
    estrategias_esperadas: List[str] = Field(default_factory=list)
    level: int = Field(default=1, ge=1, le=5, description="Nível de 1 a 5 da dica socrática")
    pedagogical_preference: Optional[str] = Field(
        default="conceitual",
        description="Preferência pedagógica: conceitual, rigor_formal, aplicado_ml, competitivo"
    )
    pedagogicalPreference: Optional[str] = None
    foco_concurso: Optional[str] = Field(None, description="Banca ou concurso alvo do aluno, ex: ITA, IME, ESA")
    motivacoes: Optional[List[str]] = Field(default_factory=list, description="Motivações do aluno, ex: superior_docencia, data_science_ml")
    use_cache: bool = Field(default=True, description="Se deve consultar e gravar no cache persistente")
    tentativas_anteriores: Optional[Any] = Field(default=None, description="Tentativas ou respostas anteriores do estudante")
    justificativa_texto: Optional[str] = Field(default=None, description="Rascunho individual ou desenvolvimento do estudante")

    @model_validator(mode="before")
    @classmethod
    def normalize_preference(cls, data: Any) -> Any:
        if isinstance(data, dict):
            raw = data.get("pedagogical_preference") or data.get("pedagogicalPreference")
            allowed = {"conceitual", "rigor_formal", "aplicado_ml", "competitivo"}
            if raw and str(raw).strip().lower() in allowed:
                val = str(raw).strip().lower()
            else:
                val = "conceitual"
            data["pedagogical_preference"] = val
            data["pedagogicalPreference"] = val
        return data


class SocraticHintResponse(BaseModel):
    """Resposta contendo a dica socrática pedagógica formatada em LaTeX."""

    level: int
    hint_text: str
    exercise_id: Optional[str] = None
    model_used: str
    provider: str
    latency_ms: float
    input_hash: str
    cached: bool = Field(default=False, description="Indica se a resposta foi obtida a partir do cache persistente")
    cache_key: Optional[str] = Field(default=None, description="Chave lógica determinística de indexação do cache")


class VisionOcrRequest(BaseModel):
    """Payload de imagem para OCR de caderno ou tablet."""

    image_base64: str = Field(
        ...,
        max_length=7_000_000,
        description="Imagem codificada em base64 (limite de segurança ~5MB binário)",
    )
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

    exercise_id: str
    quality: int = Field(..., ge=0, le=5, description="Nota de 0 a 5 do desempenho")
    current_sm2_state: Optional[Dict[str, Any]] = None


@router.post("/hint", response_model=SocraticHintResponse)
def get_socratic_hint(
    payload: SocraticHintRequest,
    current_student: Student = Depends(get_current_student)
):
    """Gera dica socrática em 5 níveis (dados -> lema -> primeiro passo -> cálculo -> resolução)."""
    exercise_dict: Dict[str, Any] = {}

    if payload.exercise_id and payload.exercise_id in _EXERCISES_STORE:
        ex = _EXERCISES_STORE[payload.exercise_id]
        exercise_dict = {
            "id": ex.id,
            "enunciado": ex.enunciado,
            "materia": getattr(ex, "materia", payload.materia or "Matemática"),
            "topico": ex.topico,
            "gabarito": ex.gabarito,
            "solucao": getattr(ex, "solucao", payload.solucao or ""),
            "estrategias_esperadas": ex.estrategias_esperadas,
            "lemas_associados": ex.lemas_associados,
        }
    else:
        exercise_dict = {
            "id": payload.exercise_id or "adhoc-exercise",
            "enunciado": payload.enunciado or "Problema matemático geral",
            "materia": payload.materia or "Matemática",
            "topico": payload.topico,
            "gabarito": payload.gabarito,
            "solucao": payload.solucao or "",
            "estrategias_esperadas": payload.estrategias_esperadas,
        }

    hint_result = socratic_tutor.generate_hint(
        exercise_dict,
        level=payload.level,
        pedagogical_preference=payload.pedagogical_preference,
        foco_concurso=payload.foco_concurso,
        motivacoes=payload.motivacoes,
        use_cache=payload.use_cache,
        tentativas_anteriores=payload.tentativas_anteriores,
        student_draft=payload.justificativa_texto,
    )

    if hint_result.get("status") == "unavailable":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=hint_result.get("error") or "O Tutor Socrático está temporariamente indisponível. Todos os provedores de IA falharam.",
        )

    return SocraticHintResponse(
        level=hint_result["level"],
        hint_text=hint_result["hint_text"],
        exercise_id=hint_result.get("exercise_id"),
        model_used=hint_result.get("model_used", "socratic-engine"),
        provider=hint_result.get("provider", "fallback"),
        latency_ms=hint_result.get("latency_ms", 0.0),
        input_hash=hint_result.get("input_hash", ""),
        cached=hint_result.get("cached", False),
        cache_key=hint_result.get("cache_key"),
    )


@router.post("/evaluate", response_model=AiEvaluationResponse)
def evaluate_resolution(
    payload: AiEvaluationRequest,
    current_student: Student = Depends(get_current_student)
):
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
    ocr_legibility = None
    if payload.imagem_base64:
        ocr_res = vision_processor.process_image(
            image_data=payload.imagem_base64,
            mime_type=payload.mime_type,
        )
        ocr_transcription = ocr_res.get("transcricao_latex", "")
        ocr_legibility = ocr_res.get("legibilidade")

    # 3. Executa a avaliação cognitiva
    student_text = payload.justificativa_texto or ""
    eval_result = cognitive_evaluator.evaluate_attempt(
        exercise=exercise_dict,
        student_input=student_text,
        input_type="multimodal" if payload.imagem_base64 else "text",
        transcription_latex=ocr_transcription,
        ocr_legibility=ocr_legibility,
        has_image=bool(payload.imagem_base64),
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
        veredito=eval_result.get("veredito", "incorreto"),
        desenvolvimento_presente=eval_result.get("desenvolvimento_presente", False),
        resultado_final_correto=eval_result.get("resultado_final_correto", False),
        etapas_corretas=eval_result.get("etapas_corretas", []),
        erros_identificados=eval_result.get("erros_identificados", []),
        feedback_latex=eval_result.get("feedback_latex", ""),
        precisa_revisao_humana=eval_result.get("precisa_revisao_humana", False),
        created_at=datetime.now(timezone.utc),
    )


@router.post("/ocr", response_model=VisionOcrResponse)
def transcribe_notebook_image(
    payload: VisionOcrRequest,
    current_student: Student = Depends(get_current_student)
):
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
def calculate_next_review(
    payload: ReviewScheduleRequest,
    current_student: Student = Depends(get_current_student)
):
    """Calcula o ciclo de repetição espaçada SM-2 e sugere lemas de reforço."""
    sm2_res = cognitive_recommender.process_review_cycle(
        student_id=current_student.id,
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
        "student_id": current_student.id,
        "exercise_id": payload.exercise_id,
        "sm2_updated": sm2_res["sm2_updated"],
        "suggested_lemmas": suggested_lemmas,
    }


class SecondOpinionModelItem(BaseModel):
    name: str
    role: str
    content: str


class SecondOpinionResponse(BaseModel):
    model_a: SecondOpinionModelItem
    model_b: SecondOpinionModelItem
    sintese: str
    provider: str
    latency_ms: float
    model_used: str


class SecondOpinionRequest(BaseModel):
    enunciado: str = Field(..., min_length=5, max_length=2500, description="Dúvida ou problema matemático")
    contextoQuestao: Optional[str] = Field(None, description="Contexto adicional da questão")


@router.post("/compare", response_model=SecondOpinionResponse)
def compare_pedagogical_models(payload: SecondOpinionRequest):
    """
    Painel 'Segunda Opinião': compara duas abordagens cognitivas complementares
    (Rigor Axiomático Nemotron vs Intuição Heurística) com síntese metacognitiva.
    """
    import json
    prompt = payload.enunciado
    if payload.contextoQuestao:
        prompt = f"Contexto: {payload.contextoQuestao}\nProblema: {prompt}"

    system_instruction = (
        "Você é o motor de Metacognição e Comparação de Lemas do LemmaS (MathAI Engine).\n"
        "REGRAS ESTRITAS DE LATEX E FORMATAÇÃO:\n"
        "- TODA e qualquer expressão, equação ou símbolo matemático DEVE estar rigorosamente delimitado por $...$ (para inline, ex: $r = 2\\text{ cm}$, $a=6$) ou $$...$$ (para fórmulas em destaque em linha própria, ex: $$r = \\frac{a + b - c}{2}$$).\n"
        "- NUNCA escreva comandos LaTeX como \\frac, \\sqrt, \\implies, \\text ou fórmulas soltas sem os delimitadores $ ou $$.\n"
        "- NUNCA deixe delimitadores desbalanceados ou abertos (como $... sem fechar).\n"
        "- Utilize cabeçalhos markdown ### limpos para estruturar as etapas.\n\n"
        "REGRA CRÍTICA DE OURO: DIVERGÊNCIA METODOLÓGICA ESTRITA (ORTOGONALIDADE & NÃO-CANIBALIZAÇÃO):\n"
        "O Modelo A e o Modelo B NUNCA devem convergir para o mesmo método, atalho ou fórmula intermediária. É TERMINANTEMENTE PROIBIDO que ambos ensinem o mesmo macete no final.\n\n"
        "1. PERSPECTIVA A (Rigor Axiomático & Prova Formal):\n"
        "- Foco exclusivo em demonstração formal, dedutiva e analítica a partir de primeiros princípios e teoremas universais (ex: decomposição axiomática em áreas $S = p \\cdot r$, geometria analítica com equações e distâncias, sistemas de equações fundamentais ou cálculo).\n"
        "- PROIBIÇÃO ESTRITA: NUNCA utilize fórmulas mnemônicas ad-hoc de concurso (como $r = \\frac{b+c-a}{2}$ no triângulo retângulo), atalhos locais de prova rápida e NUNCA inclua etapas de 'demonstração alternativa' que roubem a heurística do Modelo B. Desenvolva UMA ÚNICA linha dedutiva formal, universal e pura do início ao fim.\n"
        "- Estrutura:\n"
        "  ### 1. Definições e Lemas Fundamentais\n"
        "  ### 2. Dedução Analítica por Primeiros Princípios\n"
        "  ### 3. Solução Axiomática Formal\n"
        "  ### 4. Domínio de Validade e Invariantes\n\n"
        "2. PERSPECTIVA B (Intuição Heurística & Atalhos Cognitivos):\n"
        "- Foco em visão tática de concurso e intuição geométrica de alta velocidade. É AQUI e APENAS AQUI que devem ser explorados: reconhecimento de padrões visuais, semelhança/homotetia de figuras primitivas (ex: ternas pitagóricas 3-4-5), simetrias, casos extremos e os macetes rápidos de concurso (como tangências no ângulo reto gerando $r = \\frac{b+c-a}{2}$).\n"
        "- Estrutura:\n"
        "  ### 1. Visualização Intuitiva & Reconhecimento de Padrões\n"
        "  ### 2. O Atalho Tático (Pulo do Gato)\n"
        "  ### 3. Resolução Rápida com Mínimo de Contas\n"
        "  ### 4. Dica Socrática para Provas de Alto Rendimento\n\n"
        "3. SÍNTESE PEDAGÓGICA (Para o Licenciando em Matemática):\n"
        "- Contraste didático entre a universalidade da prova formal do Modelo A (essencial para fundamentar o ensino e polígonos genéricos) e a economia cognitiva do atalho do Modelo B (essencial para agilidade em provas de alto rendimento).\n\n"
        "- Seja objetivo: cada seção deve conter apenas os passos indispensáveis; a resposta inteira deve caber em cerca de 1.100 tokens.\n\n"
        "Responda EXCLUSIVAMENTE em formato JSON com chaves: model_a (name, role, content), model_b (name, role, content), sintese."
    )

    res = mathai_gateway.execute_completion(
        messages=[{"role": "user", "content": prompt}],
        system_prompt=system_instruction,
        temperature=0.2,
        max_tokens=2048,
        json_output=True,
        preferred_model="nvidia/nemotron-3.5-lightning-30b-a3b",
        task_type="second_opinion",
        total_budget_seconds=18.0,
    )

    content_raw = res.get("content", "{}")
    data = {}
    if isinstance(content_raw, dict):
        data = content_raw
    else:
        try:
            from app.core.json_safe import safe_parse_json_with_latex
            data = safe_parse_json_with_latex(content_raw)
        except Exception:
            try:
                cleaned = content_raw.strip()
                if cleaned.startswith("```"):
                    import re
                    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
                    cleaned = re.sub(r"\s*```$", "", cleaned)
                first_b = cleaned.find("{")
                last_b = cleaned.rfind("}")
                if first_b != -1 and last_b != -1:
                    cleaned = cleaned[first_b:last_b + 1]
                data = json.loads(cleaned)
            except Exception:
                data = {}

    model_a_data = data.get("model_a", {})
    model_b_data = data.get("model_b", {})

    if res.get("status") == "unavailable" or (res.get("provider") == "fallback" and not model_a_data and not model_b_data):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="MathAI Segunda Opinião temporariamente indisponível. Todos os provedores de cognição estão sobrecarregados.",
        )

    return SecondOpinionResponse(
        model_a=SecondOpinionModelItem(
            name=model_a_data.get("name", "Rigor Axiomático e Prova Formal"),
            role=model_a_data.get("role", "Demonstração Analítica & Invariantes"),
            content=model_a_data.get("content", content_raw if not model_a_data else ""),
        ),
        model_b=SecondOpinionModelItem(
            name=model_b_data.get("name", "Heurística & Atalhos Cognitivos"),
            role=model_b_data.get("role", "Intuição Heurística & Atalhos Cognitivos"),
            content=model_b_data.get("content", "Atalho cognitivo baseado em propriedades invariantes e simetrias."),
        ),
        sintese=data.get("sintese", "O contraste entre o rigor analítico formal e a intuição geométrica desenvolve a verdadeira maturidade matemática."),
        provider=res.get("provider", "gateway"),
        latency_ms=res.get("latency_ms", 0.0),
        model_used=res.get("model_used", "nemotron"),
    )
