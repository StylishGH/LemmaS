"""Avaliador Cognitivo de Resolução e Raciocínio Matemático da MathAI Engine.

Aplica o protocolo estrito de "Evidência antes de Inferência", identificando:
- Fidelidade da transcrição da caligrafia para LaTeX
- Estratégia real mobilizada
- Primeiro ponto de desvio/falha e classificação taxonômica do erro
- Diagnóstico socrático sem suposições infundadas
"""

import json
import time
from typing import Any, Dict, List, Optional
import uuid

from app.core.security import compute_sha256
from app.services.mathai.gateway import mathai_gateway

PROMPT_SISTEMA_AVALIADOR = r"""Você é o Avaliador Cognitivo do MathAI (plataforma LEMMAS), especializado em Matemática avançada e concursos de alta exigência (IME, ITA, EsPCEx, AFA, EFOMM, ENEM).

Sua missão é analisar o procedimento de um estudante a partir de evidências observáveis (enunciado, justificativa, desenvolvimento e/ou transcrição de caligrafia).

PRINCÍPIO FUNDAMENTAL: EVIDÊNCIA ANTES DE INFERÊNCIA
- Avalie o desenvolvimento matemático passo a passo, e não apenas a resposta final.
- Analise somente aquilo que está explicitamente escrito, construído ou demonstrado.
- NÃO complete contas que não estejam visíveis.
- NÃO atribua intenções ou pensamentos sem suporte no texto.
- Identifique o primeiro ponto onde o procedimento deixa de ser matematicamente válido.

VEREDITO CATEGORIAL DE NEGÓCIO OBRIGATÓRIO (veredito):
Deve ser EXATAMENTE um dos quatro valores a seguir:
1. "aprovado": O desenvolvimento matemático é válido e completo, com justificativa suficiente e resultado correto. Em demonstrações, os passos sustentam a conclusão.
2. "parcial": Existe desenvolvimento matemático relevante e essencialmente correto, mas com deslize localizado de cálculo aritmético, erro de sinal ou etapa incompleta justificando crédito parcial.
3. "sem_desenvolvimento": O aluno apresentou SOMENTE o resultado final (ex: "42", "x=5", "(B)"), rascunho em branco ou texto genérico sem etapas matemáticas e manipulações verificáveis.
4. "incorreto": Existe uma tentativa real de desenvolvimento, mas o raciocínio apresenta erro conceitual, algébrico ou lógico que invalida a prova ou resolução.

CLASSIFICAÇÃO DO STATUS (status_resolucao):
- correto: raciocínio matematicamente válido e resposta compatível.
- erro_conta_sinal: a ideia matemática está correta, mas houve erro numérico ou de sinal aritmético.
- erro_algebraico: manipulação algébrica inválida, simplificação incorreta ou cancelamento proibido.
- erro_conceitual: aplicação incorreta de teorema, lema, definição ou hipótese.
- erro_interpretacao: leitura incorreta do enunciado, gráfico ou dados fornecidos.
- incompleto: resolução interrompida ou sem elementos suficientes para validação.

REGRAS MANDATÓRIAS DE FORMATAÇÃO MATEMÁTICA E LATEX:
- Em TODOS os campos de texto do JSON ("feedback_latex", "diagnostico", "dica_proximo_passo", "transcricao_latex", "passos", "linha_do_erro"), toda e qualquer expressão, equação, símbolo ou variável matemática DEVE estar rigorosamente delimitada por $...$ (inline) ou $$...$$ (bloco destacado).
- NUNCA use delimitadores \( ou \[. Use SEMPRE $ e $$.
- NUNCA deixe variáveis ou equações em texto puro sem os delimitadores $...$.
- Em português brasileiro, use \sen para seno e \tg para tangente.

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON PURO):
{
  "veredito": "aprovado | parcial | sem_desenvolvimento | incorreto",
  "desenvolvimento_presente": true,
  "resultado_final_correto": true,
  "etapas_corretas": ["Passo 1: ... em $...$", "Passo 2: ..."],
  "erros_identificados": ["Erro identificado: ... em $...$"],
  "feedback_latex": "Feedback pedagógico estruturado para o estudante com equações em $...$ e $$...$$",
  "precisa_revisao_humana": false,
  "transcricao_latex": "equação ou desenvolvimento transcrito em LaTeX delimitado por $...$ ou $$...$$",
  "passos": ["Passo 1: ...", "Passo 2: ..."],
  "estrategia_identificada": "nome da estratégia observada",
  "status_resolucao": "correto | erro_conta_sinal | erro_algebraico | erro_conceitual | erro_interpretacao | incompleto",
  "diagnostico": "parecer pedagógico explicando como o estudante pensou e onde ocorreu a falha, com equações em $...$",
  "metodo_alternativo": "método alternativo com alto valor didático ou null",
  "linha_do_erro": "descrição exata da linha ou passagem onde surgiu o erro com expressões em $...$, ou null se correto",
  "dica_proximo_passo": "pergunta socrática que faça o estudante pensar por conta própria, com equações em $...$",
  "confianca_diagnostico": "alta | media | baixa"
}
"""


import re
from typing import Tuple

def detect_mathematical_development(
    text: str,
    has_image: bool = False,
    transcription_latex: Optional[str] = None,
    ocr_legibility: Optional[str] = None,
) -> Tuple[bool, bool, str]:
    """
    Avalia se há desenvolvimento matemático verificável (passos, deduções, relações)
    ou se o estudante forneceu apenas o resultado final / rascunho em branco / evidência ilegível.

    Retorna (has_development: bool, is_inconclusive: bool, reason: str).
    """
    clean = (text or "").strip()

    # 1. Tratamento de evidência multimodal / OCR
    if has_image:
        if ocr_legibility == "baixa" or (not transcription_latex and not clean):
            return False, True, "imagem_ilegivel_ou_ocr_indisponivel"
        if transcription_latex:
            clean = f"{transcription_latex} {clean}".strip()

    if not clean:
        return False, False, "vazio"

    # 2. Padrões de 'Apenas Resultado Final' (sem desenvolvimento)
    # Ex: '42', 'x = 5', '(B)', 'Letra C', 'acho que é 10', 'divisível por 8'
    single_answer_patterns = [
        r"^\s*\(?[a-eA-E]\)?\s*$",
        r"^\s*(?:resposta|gabarito|letra|opção|opcao)?\s*(?:é|e|:)?\s*\(?[a-eA-E]\)?\s*$",
        r"^\s*-?\d+(?:[.,]\d+)?\s*$",
        r"^\s*(?:resposta|gabarito|resultado)?\s*(?:é|e|:)?\s*-?\d+(?:[.,]\d+)?\s*$",
        r"^\s*[a-zA-Z]\s*=\s*-?\d+(?:[.,]\d+)?\s*$",
        r"^\s*(?:acho que é|deu|resultado final:?|afirmo que)\s*.*$",
    ]
    for p in single_answer_patterns:
        if re.match(p, clean, re.IGNORECASE):
            return False, False, "apenas_resposta_final"

    # 3. Indicadores positivos de dedução e inferência matemática
    deduction_markers = [
        "=>", "->", r"\implies", r"\iff", r"\therefore", r"\because",
        "logo", "portanto", "como", "seja", "temos", "onde", "donde", "segue que"
    ]
    clean_lower = clean.lower()
    has_deduction_keyword = any(k in clean_lower for k in deduction_markers)

    # Funções e símbolos matemáticos avançados
    math_symbols = [
        r"\sqrt", r"\frac", r"\sum", r"\int", r"\lim", r"\det", r"\log",
        r"\sen", r"\cos", r"\tg", r"\equiv", r"\pmod", r"\binom", r"\le", r"\ge", r"\neq",
        "det(", "sen(", "cos(", "tg(", "log(", "sqrt("
    ]
    has_math_symbol = any(s in clean for s in math_symbols)

    # Comandos de construção geométrica da Bancada Euclidiana
    geom_keywords = [
        "segment", "circle", "line", "point", "midpoint", "polygon",
        "perpendicular", "bisector", "intersect", "tangent"
    ]
    has_geom = any(g in clean_lower for g in geom_keywords)

    op_matches = re.findall(r"[=+\-*/\\^<>]", clean)
    op_count = len(op_matches)
    has_equations = clean.count("=") >= 1 and any(c in clean for c in ["x", "y", "z", "n", "k", "a", "b", "c", "f", "P"])
    lines = [l.strip() for l in clean.splitlines() if l.strip()]

    # Resoluções concisas válidas (ex: 'x = 2 => x^2 = 4', 'n=2k+1 => n^2-1=4k(k+1)')
    if has_deduction_keyword or has_math_symbol or has_geom:
        return True, False, "deducao_ou_construcao_valida"

    # Múltiplas etapas com operadores matemáticos
    if len(lines) >= 2 and op_count >= 2:
        return True, False, "multiplas_etapas"

    if has_equations and op_count >= 2:
        return True, False, "equacao_com_desenvolvimento"

    words = re.findall(r"\b[a-zA-ZáéíóúãõçÁÉÍÓÚÃÕÇ]+\b", clean)
    if len(words) > 0 and op_count == 0 and not has_geom and not has_math_symbol:
        return False, False, "texto_sem_matematica"

    if op_count >= 1 and len(clean) >= 10 and has_equations:
        return True, False, "etapa_algebrica"

    return False, False, "insuficiente"


class CognitiveEvaluator:
    """Motor de avaliação cognitiva e pedagógica passo a passo."""

    def __init__(self) -> None:
        self.gateway = mathai_gateway

    def evaluate_attempt(
        self,
        exercise: Dict[str, Any],
        student_input: str,
        input_type: str = "text",
        transcription_latex: Optional[str] = None,
        ocr_legibility: Optional[str] = None,
        has_image: bool = False,
    ) -> Dict[str, Any]:
        """Avalia a resolução do estudante e retorna diagnóstico completo com metadados."""
        start_time = time.perf_counter()

        enunciado = exercise.get("enunciado", "").strip()
        gabarito = exercise.get("gabarito", "")
        topico = exercise.get("topico", "")
        materia = exercise.get("materia", "Matemática")
        banca = exercise.get("banca", "")
        ano = exercise.get("ano", "")
        dificuldade = exercise.get("dificuldade", 3)
        estrategias = exercise.get("estrategias_esperadas", [])

        # Se houver transcrição vinda do módulo de visão, incorpora ao prompt
        resolucao_aluno = student_input
        if transcription_latex:
            resolucao_aluno = f"TRANSCRIÇÃO OCR:\n{transcription_latex}\n\nJUSTIFICATIVA TEXTUAL:\n{student_input}"

        prompt_conteudo = f"""Analise a seguinte resolução do estudante:

DISCIPLINA: {materia}
TÓPICO: {topico}
BANCA/ANO: {banca} {ano}
DIFICULDADE: {dificuldade}/5
GABARITO OFICIAL: {gabarito}
ESTRATÉGIAS ESPERADAS: {estrategias}

ENUNCIADO DA QUESTÃO:
{enunciado}

DADOS DA RESOLUÇÃO DO ESTUDANTE:
{resolucao_aluno}

Instruções:
1. Obtenha a dedução matemática independente antes de julgar o estudante.
2. Identifique os passos reais presentes nas evidências (desenvolvimento matemático).
3. Avalie se há desenvolvimento observável ou se o estudante apenas forneceu o resultado final / rascunho em branco.
4. Emita o veredito obrigatório: "aprovado", "parcial", "sem_desenvolvimento" ou "incorreto".
5. Preencha o JSON estritamente conforme o protocolo de evidência, rigor pedagógico e fórmulas em LaTeX.
"""
        prompt_hash = compute_sha256(prompt_conteudo)
        input_hash = compute_sha256(f"{student_input}:{enunciado}")

        messages = [{"role": "user", "content": prompt_conteudo}]

        # Executa inferência via gateway com fallback
        res = self.gateway.execute_completion(
            messages=messages,
            system_prompt=PROMPT_SISTEMA_AVALIADOR,
            temperature=0.2,
            max_tokens=1536,
            json_output=True,
        )

        raw_content = res.get("content", "")
        eval_dict = self._parse_json_content(
            text=raw_content,
            fallback_text=student_input,
            has_image=has_image,
            transcription_latex=transcription_latex,
            ocr_legibility=ocr_legibility,
        )

        total_latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return {
            "id": f"eval_{uuid.uuid4().hex[:12]}",
            "model_name": res.get("model_used", "mathai-evaluator-v1"),
            "model_provider": res.get("provider", "9router"),
            "latency_ms": total_latency_ms,
            "input_hash": input_hash,
            "prompt_hash": prompt_hash,
            "veredito": eval_dict.get("veredito", "incorreto"),
            "desenvolvimento_presente": bool(eval_dict.get("desenvolvimento_presente", False)),
            "resultado_final_correto": bool(eval_dict.get("resultado_final_correto", False)),
            "etapas_corretas": eval_dict.get("etapas_corretas", []),
            "erros_identificados": eval_dict.get("erros_identificados", []),
            "feedback_latex": eval_dict.get("feedback_latex") or eval_dict.get("diagnostico") or "Desenvolvimento analisado.",
            "precisa_revisao_humana": bool(eval_dict.get("precisa_revisao_humana", False)),
            "transcricao_latex": eval_dict.get("transcricao_latex") or transcription_latex or "",
            "passos": eval_dict.get("passos", []),
            "estrategia_identificada": eval_dict.get(
                "estrategia_identificada", "Raciocínio Analítico"
            ),
            "status_resolucao": eval_dict.get("status_resolucao", "incompleto"),
            "diagnostico": eval_dict.get(
                "diagnostico", "Procedimento analisado pelo motor cognitivo."
            ),
            "metodo_alternativo": eval_dict.get("metodo_alternativo"),
            "linha_do_erro": eval_dict.get("linha_do_erro"),
            "dica_proximo_passo": eval_dict.get("dica_proximo_passo"),
            "confianca_diagnostico": eval_dict.get("confianca_diagnostico", "media"),
            "raw_response": res.get("raw_response", {}),
        }

    def _parse_json_content(
        self,
        text: str,
        fallback_text: str,
        has_image: bool = False,
        transcription_latex: Optional[str] = None,
        ocr_legibility: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Extrai e valida de forma robusta o objeto JSON retornado pelo modelo."""
        text = text.strip()
        if text.startswith("```"):
            lines = text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()

        parsed: Optional[Dict[str, Any]] = None
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                parsed = json.loads(text[start : end + 1])
            except Exception:
                parsed = None

        clean_input = fallback_text.strip()
        has_verifiable_development, is_inconclusive, reason = detect_mathematical_development(
            text=clean_input,
            has_image=has_image,
            transcription_latex=transcription_latex,
            ocr_legibility=ocr_legibility,
        )

        if not parsed:
            # Fallback estruturado determinístico caso o modelo não retorne JSON
            if is_inconclusive:
                veredito_fallback = "sem_desenvolvimento"
                desenvolvimento_presente = False
                resultado_final_correto = False
                feedback = "A imagem enviada apresentou baixa legibilidade ou falha na transcrição de OCR. Por favor, envie uma imagem com maior nitidez ou desenvolva seu raciocínio na Bancada."
                precisa_revisao = True
            elif not has_verifiable_development:
                veredito_fallback = "sem_desenvolvimento"
                desenvolvimento_presente = False
                resultado_final_correto = False
                feedback = "Você indicou o resultado final ou enviou um texto curto. Em questões discursivas é obrigatório demonstrar o raciocínio matemático passo a passo para validar os pontos."
                precisa_revisao = len(clean_input) > 0
            elif len(clean_input) > 40 or has_verifiable_development:
                veredito_fallback = "parcial"
                desenvolvimento_presente = True
                resultado_final_correto = False
                feedback = "Desenvolvimento matemático identificado. Revise as passagens intermediárias e a conclusão formal em LaTeX."
                precisa_revisao = False
            else:
                veredito_fallback = "incorreto"
                desenvolvimento_presente = True
                resultado_final_correto = False
                feedback = "A resolução fornecida não sustenta a conclusão matemática esperada."
                precisa_revisao = False

            return {
                "veredito": veredito_fallback,
                "desenvolvimento_presente": desenvolvimento_presente,
                "resultado_final_correto": resultado_final_correto,
                "etapas_corretas": ["1. Análise preliminar do raciocínio matemático."] if desenvolvimento_presente else [],
                "erros_identificados": [] if veredito_fallback == "aprovado" else ["Necessidade de maior detalhamento dedutivo."],
                "feedback_latex": feedback,
                "precisa_revisao_humana": precisa_revisao,
                "transcricao_latex": transcription_latex or "",
                "passos": ["1. Análise do raciocínio matemático."],
                "estrategia_identificada": "Análise Geral",
                "status_resolucao": "correto" if veredito_fallback == "aprovado" else "incompleto",
                "diagnostico": feedback,
                "metodo_alternativo": None,
                "linha_do_erro": None,
                "dica_proximo_passo": "Verifique a consistência algébrica de cada etapa da dedução.",
                "confianca_diagnostico": "baixa" if is_inconclusive else "media",
            }

        # Validação estrita do veredito de negócio recebido da IA
        valid_verdict_set = {"aprovado", "parcial", "sem_desenvolvimento", "incorreto"}
        raw_veredito = str(parsed.get("veredito", "")).strip().lower()

        if raw_veredito in valid_verdict_set:
            veredito = raw_veredito
        else:
            # Calibração determinística caso o campo venha ausente ou com valor inválido
            if not has_verifiable_development:
                veredito = "sem_desenvolvimento"
            elif parsed.get("status_resolucao") == "correto":
                veredito = "aprovado"
            elif parsed.get("status_resolucao") in ["erro_conta_sinal", "incompleto"]:
                veredito = "parcial"
            else:
                veredito = "incorreto"

        desenvolvimento_presente = parsed.get("desenvolvimento_presente")
        if desenvolvimento_presente is None:
            desenvolvimento_presente = veredito != "sem_desenvolvimento"
        else:
            desenvolvimento_presente = bool(desenvolvimento_presente)

        if veredito == "sem_desenvolvimento":
            desenvolvimento_presente = False

        feedback_latex = parsed.get("feedback_latex") or parsed.get("diagnostico") or "Análise pedagógica da resolução concluída."

        return {
            "veredito": veredito,
            "desenvolvimento_presente": desenvolvimento_presente,
            "resultado_final_correto": bool(parsed.get("resultado_final_correto", veredito == "aprovado")),
            "etapas_corretas": parsed.get("etapas_corretas") or parsed.get("passos") or [],
            "erros_identificados": parsed.get("erros_identificados") or ([parsed.get("linha_do_erro")] if parsed.get("linha_do_erro") else []),
            "feedback_latex": feedback_latex,
            "precisa_revisao_humana": bool(parsed.get("precisa_revisao_humana", False)),
            "transcricao_latex": parsed.get("transcricao_latex", ""),
            "passos": parsed.get("passos", []),
            "estrategia_identificada": parsed.get("estrategia_identificada", "Raciocínio Analítico"),
            "status_resolucao": parsed.get("status_resolucao", "incompleto"),
            "diagnostico": parsed.get("diagnostico", feedback_latex),
            "metodo_alternativo": parsed.get("metodo_alternativo"),
            "linha_do_erro": parsed.get("linha_do_erro"),
            "dica_proximo_passo": parsed.get("dica_proximo_passo"),
            "confianca_diagnostico": parsed.get("confianca_diagnostico", "media"),
        }


# Instância global do avaliador
cognitive_evaluator = CognitiveEvaluator()
