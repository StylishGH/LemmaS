"""
Suíte de Testes da Arquitetura Strategy do MathAI Gateway.
Valida:
1. Provedor de Modelo Aberto Local (vLLM / Ollama - Qwen2.5-Math)
2. Extração e Preservação de Tokens (prompt, completion, total)
3. Validação de Schema JSON e KaTeX com Fallback Automático em caso de resposta corrompida
4. Contingência Determinística Autônoma
"""

import sys
import os
import json
from unittest.mock import patch, MagicMock, PropertyMock

if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, r"D:\dev\mathai-web\backend")

from app.services.mathai.gateway import (
    MathAiGateway,
    OpenAICompatibleProvider,
    GeminiProvider,
    DeterministicAutonomousProvider,
)
from app.core.config import settings

def test_gateway_strategy_suite():
    print("=" * 70)
    print("SUÍTE DE TESTES: MATHAI GATEWAY STRATEGY & MODELOS ABERTOS")
    print("=" * 70)

    gateway = MathAiGateway()
    messages = [{"role": "user", "content": "Calcule a integral de x * exp(x) dx."}]
    system_prompt = "Você é o MathAI Engine. Responda em JSON."

    # --------------------------------------------------------------------------
    # TESTE 1: Sucesso do Modelo Aberto Local (vLLM com Qwen2.5-Math)
    # --------------------------------------------------------------------------
    print("\n[TESTE 1] Cenário: vLLM Local (Qwen2.5-Math) ativo como provedor primário")
    with patch.object(settings, "LOCAL_LLM_URL", "http://localhost:8000/v1"), \
         patch.object(settings, "PRIMARY_AI_PROVIDER", "local_vllm"), \
         patch.object(gateway.local_vllm_provider, "complete") as mock_local:
        mock_local.return_value = {
            "content": json.dumps({
                "transcricao_latex": r"\int x e^x dx = (x - 1)e^x + C",
                "passos": ["1. Integração por partes: u = x, dv = e^x dx."],
                "estrategia_identificada": "Integração por Partes",
                "status_resolucao": "correto",
                "diagnostico": "Aplicação axiomática correta.",
            }),
            "model_used": "Qwen/Qwen2.5-Math-7B-Instruct",
            "provider": "local_vllm",
            "status": "completed",
            "prompt_tokens": 120,
            "completion_tokens": 85,
            "total_tokens": 205,
        }

        res = gateway.execute_completion(messages, system_prompt=system_prompt, json_output=True)
        assert res["provider"] == "local_vllm"
        assert res["model_used"] == "Qwen/Qwen2.5-Math-7B-Instruct"
        assert res["prompt_tokens"] == 120
        assert res["completion_tokens"] == 85
        assert res["total_tokens"] == 205
        assert "input_hash" in res and len(res["input_hash"]) == 64
        print(f"  -> Provedor: {res['provider']}")
        print(f"  -> Modelo: {res['model_used']}")
        print(f"  -> Telemetria de Tokens: {res['prompt_tokens']} prompt + {res['completion_tokens']} completion = {res['total_tokens']} total")
        print("  -> TESTE 1 PASSOU COM SUCESSO!")

    # --------------------------------------------------------------------------
    # TESTE 2: Fallback Local vLLM falha -> NVIDIA NIM assume com telemetria
    # --------------------------------------------------------------------------
    print("\n[TESTE 2] Cenário: vLLM falha (servidor local desligado) -> NVIDIA NIM assume")
    with patch.object(settings, "LOCAL_LLM_URL", "http://localhost:8000/v1"), \
         patch.object(type(settings), "has_nvidia", new_callable=PropertyMock(return_value=True)), \
         patch.object(gateway.local_vllm_provider, "complete", return_value=None), \
         patch.object(gateway.nvidia_nim_provider, "complete") as mock_nim:
        mock_nim.return_value = {
            "content": json.dumps({
                "transcricao_latex": r"\int x e^x dx",
                "passos": ["Usa partes"],
                "estrategia_identificada": "Por Partes",
                "status_resolucao": "correto",
                "diagnostico": "Resolução via Nemotron.",
            }),
            "model_used": "nvidia/nemotron-3.5-lightning-30b-a3b",
            "provider": "nvidia",
            "status": "completed",
            "prompt_tokens": 140,
            "completion_tokens": 90,
            "total_tokens": 230,
        }

        res = gateway.execute_completion(messages, system_prompt=system_prompt, json_output=True)
        assert res["provider"] == "nvidia"
        assert res["model_used"] == "nvidia/nemotron-3.5-lightning-30b-a3b"
        assert res["total_tokens"] == 230
        print(f"  -> Provedor que assumiu: {res['provider']}")
        print(f"  -> Tokens rastreados: {res['total_tokens']}")
        print("  -> TESTE 2 PASSOU COM SUCESSO!")

    # --------------------------------------------------------------------------
    # TESTE 3: Validação Estrita - Modelo cospe JSON corrompido -> Próximo provedor assume
    # --------------------------------------------------------------------------
    print("\n[TESTE 3] Cenário: Provedor 1 cospe JSON truncado/corrompido -> Gateway descarta e aciona Provedor 2")
    with patch.object(type(settings), "has_nvidia", new_callable=PropertyMock(return_value=True)), \
         patch.object(type(settings), "has_deepseek", new_callable=PropertyMock(return_value=True)), \
         patch.object(gateway.nvidia_nim_provider, "complete") as mock_bad_nim, \
         patch.object(gateway.openrouter_provider, "complete", return_value=None), \
         patch.object(gateway.deepseek_provider, "complete") as mock_good_ds:
        # NVIDIA retorna texto truncado com JSON quebrado
        mock_bad_nim.return_value = {
            "content": '{"status_resolucao": "correto", "diagnostico": "Texto truncado...', # sem fechar chave!
            "model_used": "nvidia/nemotron-3.5-lightning-30b-a3b",
            "provider": "nvidia",
            "prompt_tokens": 100,
            "completion_tokens": 50,
            "total_tokens": 150,
        }
        # DeepSeek retorna JSON limpo e válido
        mock_good_ds.return_value = {
            "content": json.dumps({
                "status_resolucao": "correto",
                "diagnostico": "Recuperação com sucesso e integridade.",
            }),
            "model_used": "deepseek-reasoner",
            "provider": "deepseek",
            "prompt_tokens": 110,
            "completion_tokens": 60,
            "total_tokens": 170,
        }

        res = gateway.execute_completion(messages, system_prompt=system_prompt, json_output=True, task_type="axiomatic_reasoning")
        assert res["provider"] == "deepseek"
        assert res["model_used"] == "deepseek-reasoner"
        print(f"  -> JSON corrompido foi descartado com segurança.")
        print(f"  -> Provedor que salvou a requisição: {res['provider']} ({res['model_used']})")
        print("  -> TESTE 3 PASSOU COM SUCESSO!")

    # --------------------------------------------------------------------------
    # TESTE 4: Contingência Totalmente Offline
    # --------------------------------------------------------------------------
    print("\n[TESTE 4] Cenário: Todos os provedores indisponíveis -> Contingência Autônoma")
    with patch.object(settings, "LOCAL_LLM_URL", ""), \
         patch.object(type(settings), "has_nvidia", new_callable=PropertyMock(return_value=False)), \
         patch.object(type(settings), "has_openrouter", new_callable=PropertyMock(return_value=False)), \
         patch.object(type(settings), "has_deepseek", new_callable=PropertyMock(return_value=False)), \
         patch.object(type(settings), "has_gemini", new_callable=PropertyMock(return_value=False)):
        res = gateway.execute_completion(messages, json_output=True)
        assert res["provider"] == "fallback"
        assert res["model_used"] == "lemmas-autonomous-engine-v1"
        assert res["status"] == "fallback"
        parsed = json.loads(res["content"])
        assert "estrategia_identificada" in parsed
        print(f"  -> Provedor: {res['provider']}")
        print(f"  -> Resposta determinística preservada: {parsed['estrategia_identificada']}")
        print("  -> TESTE 4 PASSOU COM SUCESSO!")

    print("\n" + "=" * 70)
    print("TODOS OS TESTES DA ARQUITETURA STRATEGY PASSARAM COM 100% DE SUCESSO!")
    print("=" * 70)

if __name__ == "__main__":
    test_gateway_strategy_suite()
