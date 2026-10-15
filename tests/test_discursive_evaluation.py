"""
Suíte de Testes Automatizados para Avaliação de Questões Discursivas e MathAI Engine.

Cobre:
1. Validação do schema Pydantic AiEvaluationResponse (contrato dos 4 vereditos).
2. Validação dos 4 vereditos de negócio:
   - 'aprovado' (desenvolvimento válido + resultado correto)
   - 'parcial' (desenvolvimento relevante com deslize localizado)
   - 'sem_desenvolvimento' (apenas resultado final / rascunho sem prova)
   - 'incorreto' (erro conceitual que invalida o raciocínio)
3. Regra de Ouro para 'sem_desenvolvimento': desenvolvimento_presente = False.
4. Resiliência do parser _parse_json_content a markdown, JSON quebrado e texto bruto.
5. Inconclusividade técnica e flag precisa_revisao_humana sem inventar 5º veredito.
6. Avaliação ponta-a-ponta via CognitiveEvaluator com mock do MathAiGateway.
"""

import sys
import json
from pathlib import Path
from unittest.mock import patch, MagicMock

# Ajusta sys.path e encoding no Windows
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
for path in [str(ROOT_DIR), str(BACKEND_DIR)]:
    if path not in sys.path:
        sys.path.insert(0, path)

if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import pytest
from app.schemas.ai_evaluation import AiEvaluationResponse
from app.services.mathai.evaluator import CognitiveEvaluator, PROMPT_SISTEMA_AVALIADOR


class TestDiscursiveEvaluationSchema:
    """Valida o schema Pydantic e compatibilidade com consumidores legados."""

    def test_schema_valid_verdicts(self):
        verdicts = ["aprovado", "parcial", "sem_desenvolvimento", "incorreto"]
        for verd in verdicts:
            resp = AiEvaluationResponse(
                id="eval_test_1",
                model_name="test-model",
                model_provider="mock",
                latency_ms=120.5,
                input_hash="hash_input",
                prompt_hash="hash_prompt",
                veredito=verd,
                desenvolvimento_presente=(verd != "sem_desenvolvimento"),
                resultado_final_correto=(verd == "aprovado"),
                etapas_corretas=["Passo 1: Enunciar hipótese"] if verd != "sem_desenvolvimento" else [],
                erros_identificados=["Erro aritmético"] if verd in ["parcial", "incorreto"] else [],
                feedback_latex="Análise em LaTeX: $x = \\sqrt{2}$",
                precisa_revisao_humana=False,
                passos=["Passo 1"],
                estrategia_identificada="Dedução Direta",
                status_resolucao="correto" if verd == "aprovado" else "incompleto",
                diagnostico="Diagnóstico detalhado",
            )
            assert resp.veredito == verd
            assert resp.feedback_latex == "Análise em LaTeX: $x = \\sqrt{2}$"
            if verd == "sem_desenvolvimento":
                assert resp.desenvolvimento_presente is False

    def test_schema_backward_compatibility_defaults(self):
        """Verifica se campos novos possuem valores default seguros ao omiti-los."""
        resp = AiEvaluationResponse(
            id="eval_legacy",
            model_name="test-model",
            model_provider="mock",
            latency_ms=85.0,
            input_hash="hash_in",
            prompt_hash="hash_pr",
            passos=["1. Cálculo"],
            estrategia_identificada="Algébrica",
            status_resolucao="correto",
            diagnostico="Tudo certo",
        )
        assert resp.veredito == "incorreto"  # default seguro que fecha sem aprovar indevidamente
        assert resp.desenvolvimento_presente is False
        assert resp.resultado_final_correto is False
        assert resp.etapas_corretas == []
        assert resp.erros_identificados == []
        assert resp.precisa_revisao_humana is False


class TestCognitiveEvaluatorParser:
    """Testa o extrator e normalizador _parse_json_content."""

    def setup_method(self):
        self.evaluator = CognitiveEvaluator()

    def test_parse_json_aprovado(self):
        json_str = """```json
        {
            "veredito": "aprovado",
            "desenvolvimento_presente": true,
            "resultado_final_correto": true,
            "etapas_corretas": [
                "1. Fatoração correta do polinômio: $P(x) = (x-1)(x^2+x+1)$",
                "2. Cálculo das raízes complexas via fórmula quadrática",
                "3. Conclusão válida do módulo $|z| = 1$"
            ],
            "erros_identificados": [],
            "feedback_latex": "Demonstração impecável e rigorosa.",
            "precisa_revisao_humana": false,
            "estrategia_identificada": "Fatoração e Análise Complexa",
            "status_resolucao": "correto"
        }
        ```"""
        result = self.evaluator._parse_json_content(json_str, "P(x) = (x-1)(x^2+x+1) => |z|=1")
        assert result["veredito"] == "aprovado"
        assert result["desenvolvimento_presente"] is True
        assert result["resultado_final_correto"] is True
        assert len(result["etapas_corretas"]) == 3
        assert len(result["erros_identificados"]) == 0
        assert result["precisa_revisao_humana"] is False

    def test_parse_json_parcial(self):
        json_str = """
        {
            "veredito": "parcial",
            "desenvolvimento_presente": true,
            "resultado_final_correto": false,
            "etapas_corretas": [
                "Isolamento adequado da incógnita x"
            ],
            "erros_identificados": [
                "Deslize aritmético na divisão final por 4"
            ],
            "feedback_latex": "O raciocínio dedutivo está correto. Revise a divisão: $\\\\frac{12}{4} = 3$, não 4.",
            "precisa_revisao_humana": false
        }
        """
        result = self.evaluator._parse_json_content(json_str, "4x = 12 => x = 4 (deslize)")
        assert result["veredito"] == "parcial"
        assert result["desenvolvimento_presente"] is True
        assert result["resultado_final_correto"] is False
        assert len(result["erros_identificados"]) == 1
        assert "divisão" in result["feedback_latex"].lower()

    def test_parse_json_sem_desenvolvimento_golden_rule(self):
        """Regra de Ouro: veredito sem_desenvolvimento deve forçar desenvolvimento_presente = False."""
        json_str = """
        {
            "veredito": "sem_desenvolvimento",
            "desenvolvimento_presente": true,
            "resultado_final_correto": true,
            "etapas_corretas": [],
            "erros_identificados": ["Ausência de cálculos intermediários ou justificativa axiomática."],
            "feedback_latex": "Você indicou apenas o resultado final. É obrigatório demonstrar o passo a passo.",
            "precisa_revisao_humana": false
        }
        """
        result = self.evaluator._parse_json_content(json_str, "42")
        assert result["veredito"] == "sem_desenvolvimento"
        # Deve sobrescrever desenvolvimento_presente para False
        assert result["desenvolvimento_presente"] is False

    def test_parse_json_incorreto(self):
        json_str = """
        {
            "veredito": "incorreto",
            "desenvolvimento_presente": true,
            "resultado_final_correto": false,
            "etapas_corretas": [],
            "erros_identificados": ["Aplicação inválida de linearidade em função logarítmica: log(a+b) != log a + log b"],
            "feedback_latex": "A propriedade $\\\\log(a+b) = \\\\log a + \\\\log b$ é falsa.",
            "precisa_revisao_humana": false
        }
        """
        result = self.evaluator._parse_json_content(json_str, "log(a+b) = log a + log b...")
        assert result["veredito"] == "incorreto"
        assert result["desenvolvimento_presente"] is True
        assert result["resultado_final_correto"] is False
        assert len(result["erros_identificados"]) >= 1

    def test_fallback_when_model_output_is_empty_or_broken(self):
        """Quando o modelo falha ou cospe texto não-JSON, aciona a contingência determinística."""
        # Aluno enviou apenas número '5' -> sem_desenvolvimento
        res1 = self.evaluator._parse_json_content("Desculpe, não entendi.", "x = 5")
        assert res1["veredito"] == "sem_desenvolvimento"
        assert res1["desenvolvimento_presente"] is False
        assert res1["resultado_final_correto"] is False
        assert res1["precisa_revisao_humana"] is True

        # Aluno enviou desenvolvimento algébrico extenso mas o modelo não retornou JSON
        resolucao_extensa = "Seja f(x) = x^2 - 4x + 3 = 0. Temos delta = 16 - 12 = 4. Logo x = (4 +- 2)/2, x1 = 3 e x2 = 1."
        res2 = self.evaluator._parse_json_content("Erro interno 500 do upstream", resolucao_extensa)
        assert res2["veredito"] in ["parcial", "incorreto"]
        assert res2["desenvolvimento_presente"] is True
        assert "LaTeX" in res2["feedback_latex"] or "desenvolvimento" in res2["feedback_latex"].lower()


class TestCognitiveEvaluatorEndToEnd:
    """Testa o fluxo completo de evaluate_attempt com mock do gateway."""

    def setup_method(self):
        self.evaluator = CognitiveEvaluator()
        self.mock_exercise = {
            "enunciado": "Demonstre que se $n$ é ímpar, então $n^2 - 1$ é divisível por 8.",
            "gabarito": "n = 2k + 1 => n^2 - 1 = 4k(k+1). Como k ou k+1 é par, 4k(k+1) é múltiplo de 8.",
            "topico": "Teoria dos Números",
            "materia": "Matemática",
            "banca": "OBMEP",
            "ano": 2024,
            "dificuldade": 4,
            "estrategias_esperadas": ["Indução", "Paridade"],
        }

    def test_evaluate_attempt_aprovado(self):
        payload_ia = {
            "veredito": "aprovado",
            "desenvolvimento_presente": True,
            "resultado_final_correto": True,
            "etapas_corretas": [
                "1. Representação de $n$ como $2k+1$, com $k \\in \\mathbb{Z}$",
                "2. Expansão algébrica $(2k+1)^2 - 1 = 4k(k+1)$",
                "3. Argumento de paridade: $k(k+1)$ é produto de dois inteiros consecutivos, portanto par",
                "4. Conclusão: $4 \\times 2m = 8m$, divisível por 8"
            ],
            "erros_identificados": [],
            "feedback_latex": "Demonstração límpida e rigorosa.",
            "precisa_revisao_humana": False,
            "estrategia_identificada": "Aritmética Modular e Paridade",
            "status_resolucao": "correto",
        }

        with patch.object(self.evaluator.gateway, "execute_completion") as mock_exec:
            mock_exec.return_value = {
                "content": json.dumps(payload_ia),
                "model_used": "nvidia/nemotron-3.5-lightning-30b-a3b",
                "provider": "nvidia_nim",
                "status": "completed",
            }

            resp = self.evaluator.evaluate_attempt(
                exercise=self.mock_exercise,
                student_input="Como n é ímpar, n = 2k+1. Logo n^2 - 1 = 4k(k+1). Como k(k+1) é produto de consecutivos, é par. Logo 4 * par = múltiplo de 8.",
                input_type="text",
            )

            assert resp["veredito"] == "aprovado"
            assert resp["desenvolvimento_presente"] is True
            assert resp["resultado_final_correto"] is True
            assert len(resp["etapas_corretas"]) == 4
            assert resp["precisa_revisao_humana"] is False
            assert "Demonstração límpida" in resp["feedback_latex"]

    def test_evaluate_attempt_sem_desenvolvimento(self):
        payload_ia = {
            "veredito": "sem_desenvolvimento",
            "desenvolvimento_presente": False,
            "resultado_final_correto": True,
            "etapas_corretas": [],
            "erros_identificados": ["Nenhum desenvolvimento ou justificativa fornecida."],
            "feedback_latex": "Você apenas afirmou que é divisível por 8 sem demonstrar.",
            "precisa_revisao_humana": False,
            "estrategia_identificada": "Afirmação Direta",
            "status_resolucao": "incompleto",
        }

        with patch.object(self.evaluator.gateway, "execute_completion") as mock_exec:
            mock_exec.return_value = {
                "content": json.dumps(payload_ia),
                "model_used": "gemini-flash-lite-latest",
                "provider": "google_gemini",
                "status": "completed",
            }

            resp = self.evaluator.evaluate_attempt(
                exercise=self.mock_exercise,
                student_input="É divisível por 8 sim.",
                input_type="text",
            )

            assert resp["veredito"] == "sem_desenvolvimento"
            assert resp["desenvolvimento_presente"] is False
            assert resp["precisa_revisao_humana"] is False

    def test_evaluate_attempt_parcial(self):
        payload_ia = {
            "veredito": "parcial",
            "desenvolvimento_presente": True,
            "resultado_final_correto": False,
            "etapas_corretas": [
                "1. Escrita de $n = 2k+1$",
                "2. Expansão $(2k+1)^2 - 1 = 4k^2 + 4k$"
            ],
            "erros_identificados": [
                "Faltou demonstrar formalmente que $k^2+k$ é sempre par."
            ],
            "feedback_latex": "Bom avanço na fatoração $4(k^2+k)$. Conclua justificando que $k(k+1)$ é par.",
            "precisa_revisao_humana": False,
            "estrategia_identificada": "Fatoração",
            "status_resolucao": "incompleto",
        }

        with patch.object(self.evaluator.gateway, "execute_completion") as mock_exec:
            mock_exec.return_value = {
                "content": json.dumps(payload_ia),
                "model_used": "nvidia/nemotron-3.5-lightning-30b-a3b",
                "provider": "nvidia_nim",
                "status": "completed",
            }

            resp = self.evaluator.evaluate_attempt(
                exercise=self.mock_exercise,
                student_input="n = 2k+1 => n^2 - 1 = 4k^2 + 4k = 4(k^2+k). Como tem o 4 na frente, é divisível por 4 e por 8.",
                input_type="text",
            )

            assert resp["veredito"] == "parcial"
            assert resp["desenvolvimento_presente"] is True
            assert resp["resultado_final_correto"] is False
            assert len(resp["etapas_corretas"]) == 2
            assert len(resp["erros_identificados"]) == 1

    def test_evaluate_attempt_inconclusive_flag(self):
        """Avaliação com texto ilegível ou ruído marca precisa_revisao_humana sem quebrar."""
        payload_ia = {
            "veredito": "incorreto",
            "desenvolvimento_presente": False,
            "resultado_final_correto": False,
            "etapas_corretas": [],
            "erros_identificados": ["Evidência ilegível no OCR"],
            "feedback_latex": "A imagem ou texto submetido não pôde ser interpretado com precisão.",
            "precisa_revisao_humana": True,
        }

        with patch.object(self.evaluator.gateway, "execute_completion") as mock_exec:
            mock_exec.return_value = {
                "content": json.dumps(payload_ia),
                "model_used": "gemini-flash-lite-latest",
                "provider": "google_gemini",
                "status": "completed",
            }

            resp = self.evaluator.evaluate_attempt(
                exercise=self.mock_exercise,
                student_input="---???***",
                input_type="ocr",
            )

            assert resp["veredito"] == "incorreto"
            assert resp["precisa_revisao_humana"] is True
