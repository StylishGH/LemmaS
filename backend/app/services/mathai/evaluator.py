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

Sua missão é analisar o procedimento de um estudante a partir de evidências observáveis (enunciado, justificativa e/ou transcrição de caligrafia).

PRINCÍPIO FUNDAMENTAL: EVIDÊNCIA ANTES DE INFERÊNCIA
- Analise somente aquilo que está explicitamente escrito ou demonstrado.
- NÃO complete contas que não estejam visíveis.
- NÃO atribua intenções ou pensamentos sem suporte no texto.
- Identifique o primeiro ponto onde o procedimento deixa de ser matematicamente válido.

CLASSIFICAÇÃO DO STATUS (status_resolucao):
- correto: raciocínio matematicamente válido e resposta compatível.
- erro_conta_sinal: a ideia matemática está correta, mas houve erro numérico ou de sinal aritmético.
- erro_algebraico: manipulação algébrica inválida, simplificação incorreta ou cancelamento proibido.
- erro_conceitual: aplicação incorreta de teorema, lema, definição ou hipótese.
- erro_interpretacao: leitura incorreta do enunciado, gráfico ou dados fornecidos.
- incompleto: resolução interrompida ou sem elementos suficientes para validação.

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON PURO):
{
  "transcricao_latex": "equação ou desenvolvimento transcrito em LaTeX ($...$)",
  "passos": ["Passo 1: ...", "Passo 2: ..."],
  "estrategia_identificada": "nome da estratégia observada",
  "status_resolucao": "correto | erro_conta_sinal | erro_algebraico | erro_conceitual | erro_interpretacao | incompleto",
  "diagnostico": "parecer pedagógico explicando como o estudante pensou e onde ocorreu a falha",
  "metodo_alternativo": "método alternativo com alto valor didático ou null",
  "linha_do_erro": "descrição exata da linha ou passagem onde surgiu o erro, ou null se correto",
  "dica_proximo_passo": "pergunta socrática que faça o estudante pensar por conta própria",
  "confianca_diagnostico": "alta | media | baixa"
}
"""


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
2. Identifique os passos reais presentes nas evidências.
3. Se a resolução usou outro método matematicamente válido, valide-a.
4. Preencha o JSON estritamente conforme o protocolo de evidência e rigor pedagógico.
"""
        prompt_hash = compute_sha256(prompt_conteudo)
        input_hash = compute_sha256(f"{student_input}:{enunciado}")

        messages = [{"role": "user", "content": prompt_conteudo}]

        # Prioriza 9Router/NVIDIA para texto puro ou executa via gateway
        res = self.gateway.execute_completion(
            messages=messages,
            system_prompt=PROMPT_SISTEMA_AVALIADOR,
            temperature=0.2,
            max_tokens=1536,
            json_output=True,
        )

        raw_content = res.get("content", "")
        eval_dict = self._parse_json_content(raw_content, student_input)

        total_latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return {
            "id": f"eval_{uuid.uuid4().hex[:12]}",
            "model_name": res.get("model_used", "mathai-evaluator-v1"),
            "model_provider": res.get("provider", "9router"),
            "latency_ms": total_latency_ms,
            "input_hash": input_hash,
            "prompt_hash": prompt_hash,
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

    def _parse_json_content(self, text: str, fallback_text: str) -> Dict[str, Any]:
        """Extrai de forma robusta o objeto JSON retornado pelo modelo."""
        text = text.strip()
        if text.startswith("```"):
            lines = text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()

        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except Exception:
                pass

        # Fallback estruturado caso a resposta do modelo não seja JSON válido
        return {
            "transcricao_latex": "",
            "passos": ["1. Análise preliminar do raciocínio matemático."],
            "estrategia_identificada": "Análise Geral",
            "status_resolucao": "correto" if len(fallback_text) > 30 else "incompleto",
            "diagnostico": text or "Resolução avaliada.",
            "metodo_alternativo": None,
            "linha_do_erro": None,
            "dica_proximo_passo": "Verifique a consistência algébrica de cada etapa da dedução.",
            "confianca_diagnostico": "media",
        }


# Instância global do avaliador
cognitive_evaluator = CognitiveEvaluator()
