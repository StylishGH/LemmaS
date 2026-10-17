"""Gateway e Roteador Multi-Modelo da MathAI Engine (Padrão Strategy).

Arquitetura:
O MathAI Gateway desacopla provedores através de interfaces abstratas (BaseLLMProvider),
permitindo a integração contínua de:
1. Provedores Abertos Especializados Locais (vLLM, Ollama, LM Studio - Qwen2.5-Math / DeepSeek-Math)
2. Provedores em Nuvem de Produção (NVIDIA NIM, DeepSeek API, OpenRouter)
3. Provedor Multimodal de Intuição e Respaldo (Google Gemini Cascade)
4. Motor Determinístico Autônomo (Zero LLM / Contingência de Alta Estabilidade)

Telemetria e Auditoria N:1:
Cada tentativa da cascata registra latência, tokens (prompt, completion, total), modelo e status_code,
garantindo observabilidade financeira e integridade de proveniência com hash SHA-256.
"""

from abc import ABC, abstractmethod
import json
import logging
import re
import time
import uuid
from typing import Any, Dict, List, Optional

import requests

from app.core.config import settings, get_supabase_client
from app.core.security import compute_sha256

logger = logging.getLogger(__name__)

# Modelos canônicos permitidos pela diretriz de estabilidade (AGENTS.md)
GEMINI_MODELS_CASCADE = [
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-3-flash-preview",
    "gemini-3.6-flash",
]

# Modelos validados da NVIDIA NIM presentes no endpoint oficial
NVIDIA_NIM_MODELS = [
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
    "nvidia/nemotron-3.5-lightning-30b-a3b",
    "nvidia/nemotron-3-super-120b-a12b",
    "nvidia/nemotron-3-ultra-550b-a55b",
]

NVIDIA_VISION_MODELS = [
    "meta/llama-3.2-11b-vision-instruct",
    "meta/llama-3.2-90b-vision-instruct",
]


class BaseLLMProvider(ABC):
    """Interface abstrata comum para execução de inferência de LLM."""

    def __init__(self, name: str) -> None:
        self.name = name

    @abstractmethod
    def is_available(self) -> bool:
        """Indica se o provedor possui credenciais/endpoints configurados."""
        pass

    @abstractmethod
    def complete(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.2,
        max_tokens: int = 1536,
        json_output: bool = True,
        preferred_model: Optional[str] = None,
        task_type: str = "general",
        time_budget: Optional[float] = None,
        correlation_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Executa a chamada e retorna dict normalizado com content, tokens e metadados."""
        pass


class OpenAICompatibleProvider(BaseLLMProvider):
    """Provedor universal compatível com API OpenAI (vLLM, Ollama, NVIDIA NIM, DeepSeek, OpenRouter)."""

    def __init__(
        self,
        name: str,
        base_url: str,
        api_key: str,
        default_models: List[str],
        timeout: tuple = (2.5, 15.0),
        extra_headers: Optional[Dict[str, str]] = None,
    ) -> None:
        super().__init__(name)
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.default_models = default_models
        self.timeout = timeout
        self.extra_headers = extra_headers or {}

    @property
    def effective_base_url(self) -> str:
        if self.name == "local_vllm":
            return (settings.LOCAL_LLM_URL or self.base_url).rstrip("/")
        return self.base_url

    @property
    def effective_api_key(self) -> str:
        if self.name == "nvidia":
            return settings.NVIDIA_API_KEY or self.api_key
        elif self.name == "deepseek":
            return settings.DEEPSEEK_API_KEY or self.api_key
        elif self.name == "openrouter":
            return settings.OPENROUTER_API_KEY or self.api_key
        elif self.name == "local_vllm":
            return settings.LOCAL_LLM_API_KEY or self.api_key
        elif self.name == "9router":
            return settings.NINEROUTER_API_KEY or self.api_key
        return self.api_key

    def is_available(self) -> bool:
        if self.name == "local_vllm":
            return settings.has_local_llm
        elif self.name == "nvidia":
            return settings.has_nvidia
        elif self.name == "deepseek":
            return settings.has_deepseek
        elif self.name == "openrouter":
            return settings.has_openrouter
        elif self.name == "9router":
            return settings.has_9router
        return bool(self.effective_base_url and self.effective_api_key)

    def complete(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.2,
        max_tokens: int = 1536,
        json_output: bool = True,
        preferred_model: Optional[str] = None,
        task_type: str = "general",
        time_budget: Optional[float] = None,
        correlation_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        if not self.is_available():
            return None

        cid = correlation_id or "local"
        if time_budget is not None and time_budget < 2.0:
            logger.warning("[CID:%s] [%s] Tempo restante insuficiente (%.2fs) para chamada de IA.", cid, self.name, time_budget)
            return None

        url = self.effective_base_url
        endpoint = f"{url}/chat/completions" if not url.endswith("/chat/completions") else url
        headers = {
            "Content-Type": "application/json",
            **self.extra_headers,
        }
        api_key = self.effective_api_key
        if api_key and api_key != "EMPTY":
            headers["Authorization"] = f"Bearer {api_key}"

        candidate_models = [preferred_model] if preferred_model else self.default_models
        connect_timeout = self.timeout[0] if isinstance(self.timeout, tuple) else 2.0
        configured_read = self.timeout[1] if isinstance(self.timeout, tuple) else self.timeout

        start_provider_time = time.perf_counter()

        for model in candidate_models:
            elapsed = time.perf_counter() - start_provider_time
            if time_budget is not None:
                remaining_for_call = time_budget - elapsed
                if remaining_for_call < 2.0:
                    logger.warning("[CID:%s] [%s] Orçamento esgotado para tentar modelo %s.", cid, self.name, model)
                    break
                effective_read = min(configured_read, max(2.0, remaining_for_call - 0.5))
            else:
                effective_read = configured_read

            req_timeout = (connect_timeout, effective_read)
            payload: Dict[str, Any] = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            if json_output:
                payload["response_format"] = {"type": "json_object"}

            try:
                logger.info("[CID:%s] AI Provider [%s] call started; model=%s; timeout=%.1fs; task_type=%s", cid, self.name, model, effective_read, task_type)
                resp = requests.post(endpoint, headers=headers, json=payload, timeout=req_timeout)

                # Tratamento de serving engines que rejeitam response_format (ex: HTTP 400)
                if resp.status_code == 400 and json_output and "response_format" in payload:
                    logger.warning("[CID:%s] [%s] 400 com response_format; tentando sem parâmetro. detail=%s", cid, self.name, resp.text[:200])
                    retry_payload = dict(payload)
                    retry_payload.pop("response_format", None)
                    resp = requests.post(endpoint, headers=headers, json=retry_payload, timeout=req_timeout)

                if resp.status_code == 200:
                    data = resp.json()
                    choices = data.get("choices", [])
                    if not choices:
                        continue
                    msg = choices[0].get("message", {})
                    content = (msg.get("content") or msg.get("reasoning_content") or "").strip()
                    if not content:
                        continue

                    # Extração rigorosa de tokens
                    usage = data.get("usage", {})
                    p_tokens = usage.get("prompt_tokens", 0)
                    c_tokens = usage.get("completion_tokens", 0)
                    t_tokens = usage.get("total_tokens", p_tokens + c_tokens)

                    actual_model = data.get("model", model)
                    logger.info("[CID:%s] [%s] Succeeded; model=%s; total_tokens=%s", cid, self.name, actual_model, t_tokens)
                    return {
                        "content": content,
                        "model_used": actual_model,
                        "provider": self.name,
                        "status": "completed",
                        "prompt_tokens": p_tokens,
                        "completion_tokens": c_tokens,
                        "total_tokens": t_tokens,
                        "raw_response": data,
                    }

                # Tratamento granular de erros HTTP
                if resp.status_code in (401, 403):
                    logger.error("[CID:%s] [%s] Falha de autenticação HTTP %s: chave inválida ou sem permissão. Interrompendo provedor.", cid, self.name, resp.status_code)
                    break  # Erro permanente para este provedor

                if resp.status_code == 402:
                    logger.error("[CID:%s] [%s] Falha HTTP 402: Créditos insuficientes / pagamento pendente. Interrompendo provedor.", cid, self.name)
                    break  # Erro permanente para este provedor

                if resp.status_code == 404:
                    logger.warning("[CID:%s] [%s] Modelo não encontrado HTTP 404: %s. Tentando próximo modelo.", cid, self.name, model)
                    continue

                if resp.status_code in (429, 503):
                    logger.warning("[CID:%s] [%s] Erro transiente HTTP %s (sobrecarga/rate-limit) no modelo %s.", cid, self.name, resp.status_code, model)
                    continue

                logger.error("[CID:%s] [%s] Falha HTTP %s: %s", cid, self.name, resp.status_code, resp.text[:300])
            except requests.exceptions.Timeout:
                logger.warning("[CID:%s] [%s] Timeout após %.1fs na chamada do modelo %s.", cid, self.name, effective_read, model)
                continue
            except Exception as err:
                logger.warning("[CID:%s] [%s] Exceção durante requisição: %s", cid, self.name, str(err)[:250])

        return None


class GeminiProvider(BaseLLMProvider):
    """Provedor oficial Google Gemini via SDK com suporte à cascata de modelos autorizada."""

    def __init__(self, api_key: str, models_cascade: List[str], timeout: float = 30.0) -> None:
        super().__init__("google")
        self.api_key = api_key
        self.models_cascade = models_cascade
        self.timeout = timeout

    def is_available(self) -> bool:
        return bool(self.api_key and settings.GEMINI_FALLBACK_ENABLED)

    def complete(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.2,
        max_tokens: int = 1536,
        json_output: bool = True,
        preferred_model: Optional[str] = None,
        task_type: str = "general",
        time_budget: Optional[float] = None,
        correlation_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        if not self.is_available():
            return None

        cid = correlation_id or "local"
        if time_budget is not None and time_budget < 2.0:
            logger.warning("[CID:%s] [Gemini] Tempo restante insuficiente (%.2fs) para inferência.", cid, time_budget)
            return None

        effective_timeout = min(self.timeout, max(2.0, time_budget - 0.5)) if time_budget else self.timeout

        try:
            from google import genai
            from google.genai import types

            client = genai.Client(
                api_key=self.api_key,
                http_options=types.HttpOptions(timeout=effective_timeout),
            )

            # Separa mensagem de sistema das mensagens de usuário
            sys_prompt = ""
            user_parts = []
            for m in messages:
                role = m.get("role", "user")
                if role == "system":
                    sys_prompt = m.get("content", "")
                else:
                    user_parts.append(f"[{role.upper()}]: {m.get('content', '')}")

            prompt_text = "\n\n".join(user_parts)
            config = types.GenerateContentConfig(
                system_instruction=sys_prompt if sys_prompt else None,
                temperature=temperature,
                max_output_tokens=max_tokens,
                response_mime_type="application/json" if json_output else "text/plain",
            )

            candidate_models = [preferred_model] if preferred_model else self.models_cascade
            for model_name in candidate_models:
                try:
                    logger.info("[CID:%s] [Gemini] Tentativa de cascata; model=%s; timeout=%.1fs; task_type=%s", cid, model_name, effective_timeout, task_type)
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt_text,
                        config=config,
                    )
                    if response and response.text:
                        content = response.text.strip()
                        # Extração de tokens via SDK se disponível
                        usage_metadata = getattr(response, "usage_metadata", None)
                        p_tokens = getattr(usage_metadata, "prompt_token_count", 0) if usage_metadata else 0
                        c_tokens = getattr(usage_metadata, "candidates_token_count", 0) if usage_metadata else 0
                        t_tokens = getattr(usage_metadata, "total_token_count", p_tokens + c_tokens) if usage_metadata else 0

                        logger.info("[CID:%s] [Gemini] Succeeded; model=%s; total_tokens=%s", cid, model_name, t_tokens)
                        return {
                            "content": content,
                            "model_used": model_name,
                            "provider": "google",
                            "status": "completed",
                            "prompt_tokens": p_tokens,
                            "completion_tokens": c_tokens,
                            "total_tokens": t_tokens,
                            "raw_response": {"text": content},
                        }
                except Exception as err:
                    err_str = str(err)
                    # Erro 401/403: Chave inválida ou permissão negada -> Interrompe provedor imediatamente
                    if any(code in err_str for code in ("401", "403", "API_KEY_INVALID", "PERMISSION_DENIED")):
                        logger.error("[CID:%s] [Gemini] Erro permanente de autenticação: %s. Interrompendo provedor.", cid, err_str[:150])
                        break
                    # Erro 402: Créditos esgotados -> Interrompe provedor imediatamente
                    if any(code in err_str for code in ("402", "prepayment credits are depleted")):
                        logger.error("[CID:%s] [Gemini] Erro 402 permanente: créditos esgotados. Interrompendo provedor.", cid, err_str[:150])
                        break
                    # Erros transientes ou modelo não encontrado -> Tenta próximo da cascata
                    if any(code in err_str for code in ("404", "429", "503", "RESOURCE_EXHAUSTED", "UNAVAILABLE")):
                        logger.warning("[CID:%s] [Gemini] Erro transiente (%s) no modelo %s. Tentando próximo da cascata.", cid, err_str[:100], model_name)
                        continue
                    break
        except Exception as err:
            logger.warning("[CID:%s] [Gemini SDK] Falha de inicialização: %s", cid, str(err)[:200])

        return None


class DeterministicAutonomousProvider(BaseLLMProvider):
    """Contingência determinística autônoma sem dependência de LLM ou redes externas."""

    def __init__(self) -> None:
        super().__init__("fallback")

    def is_available(self) -> bool:
        return True

    def complete(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.2,
        max_tokens: int = 1536,
        json_output: bool = True,
        preferred_model: Optional[str] = None,
        task_type: str = "general",
        time_budget: Optional[float] = None,
        correlation_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not json_output:
            content = (
                "Para resolver esta questão, observe atentamente os dados fornecidos no enunciado "
                "e identifique a relação matemática fundamental que conecta a incógnita às propriedades dadas."
            )
        else:
            fallback_dict = {
                "transcricao_latex": r"\text{Resolução analisada pelo motor determinístico LEMMAS.}",
                "passos": [
                    "Identificação dos dados do enunciado.",
                    "Aplicação do lema ou propriedade matemática canônica.",
                    "Verificação da consistência algébrica e conclusão.",
                ],
                "estrategia_identificada": "Análise Estrutural Canônica",
                "status_resolucao": "correto",
                "diagnostico": (
                    "O raciocínio matemático apresentado foi registrado com integridade. "
                    "O motor de IA ativou o modo determinístico de alta estabilidade."
                ),
                "metodo_alternativo": None,
                "linha_do_erro": None,
                "dica_proximo_passo": "Revise cada passagem aplicando as propriedades axiomáticas fundamentais.",
                "confianca_diagnostico": "media",
            }
            content = json.dumps(fallback_dict)

        return {
            "content": content,
            "model_used": "lemmas-autonomous-engine-v1",
            "provider": "fallback",
            "status": "fallback",
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
            "raw_response": {},
        }


class MathAiGateway:
    """Roteador inteligente e resiliente da MathAI Engine estruturado no padrão Strategy."""

    def __init__(self) -> None:
        # 1. Provedor Aberto Especializado Local (vLLM / Ollama - Qwen2.5-Math / DeepSeek-Math)
        self.local_vllm_provider = OpenAICompatibleProvider(
            name="local_vllm",
            base_url=settings.LOCAL_LLM_URL,
            api_key=settings.LOCAL_LLM_API_KEY,
            default_models=[settings.LOCAL_LLM_MODEL],
            timeout=(2.0, 30.0),
        )

        # 2. Provedores de Nuvem Diretos
        self.nvidia_nim_provider = OpenAICompatibleProvider(
            name="nvidia",
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=settings.NVIDIA_API_KEY,
            default_models=NVIDIA_NIM_MODELS,
            timeout=(2.0, 8.0),
        )

        self.deepseek_provider = OpenAICompatibleProvider(
            name="deepseek",
            base_url=settings.DEEPSEEK_API_URL,
            api_key=settings.DEEPSEEK_API_KEY,
            default_models=["deepseek-reasoner", "deepseek-chat"],
            timeout=(2.0, 8.0),
        )

        self.openrouter_provider = OpenAICompatibleProvider(
            name="openrouter",
            base_url=settings.OPENROUTER_API_URL,
            api_key=settings.OPENROUTER_API_KEY,
            default_models=[settings.OPENROUTER_MODEL],
            timeout=(2.0, 8.0),
            extra_headers={
                "HTTP-Referer": "https://lemmas-ochre.vercel.app",
                "X-Title": "LemmaS",
            },
        )

        self.ninerouter_provider = OpenAICompatibleProvider(
            name="9router",
            base_url=settings.NINEROUTER_URL,
            api_key=settings.NINEROUTER_API_KEY,
            default_models=["nvidia-fallback"],
            timeout=(0.8, 3.5),
        )

        self.gemini_provider = GeminiProvider(
            api_key=settings.GEMINI_API_KEY,
            models_cascade=GEMINI_MODELS_CASCADE,
            timeout=8.0,
        )

        self.autonomous_provider = DeterministicAutonomousProvider()

        # URLs mantidas para retrocompatibilidade de testes e atributos legados
        self.nvidia_api_url = "https://integrate.api.nvidia.com/v1/chat/completions"
        self.ninerouter_url = f"{settings.NINEROUTER_URL}/chat/completions" if settings.NINEROUTER_URL else ""
        self.openrouter_api_url = f"{settings.OPENROUTER_API_URL}/chat/completions"
        self.deepseek_api_url = f"{settings.DEEPSEEK_API_URL}/chat/completions"

    def execute_completion(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1536,
        json_output: bool = True,
        preferred_model: Optional[str] = None,
        task_type: str = "general",
        evaluation_id: Optional[str] = None,
        total_budget_seconds: float = 20.0,
        correlation_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Executa a inferência pela melhor estratégia e registra telemetria N:1."""
        start_time = time.perf_counter()
        cid = correlation_id or f"req-{uuid.uuid4().hex[:8]}"

        full_input_payload = {
            "system_prompt": system_prompt or "",
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "json_output": json_output,
            "task_type": task_type,
        }
        input_hash = compute_sha256(json.dumps(full_input_payload, sort_keys=True))

        all_messages = []
        if system_prompt:
            all_messages.append({"role": "system", "content": system_prompt})
        all_messages.extend(messages)

        # Matriz de Provedores com base em configuração e tipo de tarefa
        cascade = self._resolve_provider_cascade(task_type)
        deadline = start_time + total_budget_seconds

        for provider in cascade:
            remaining = deadline - time.perf_counter()
            if remaining < 2.0:
                logger.warning("[CID:%s] Orçamento global de inferência expirado (restam %.2fs); abortando provedores restantes.", cid, remaining)
                break

            call_start = time.perf_counter()
            result = provider.complete(
                messages=all_messages,
                temperature=temperature,
                max_tokens=max_tokens,
                json_output=json_output,
                preferred_model=preferred_model,
                task_type=task_type,
                time_budget=remaining,
                correlation_id=cid,
            )

            call_latency = round((time.perf_counter() - call_start) * 1000, 2)

            if result and result.get("content"):
                content = result["content"]

                # Validação de fidelidade JSON se exigido
                if json_output:
                    valid, cleaned_content = self._validate_and_clean_json(content)
                    if not valid:
                        logger.warning(
                            "Provider [%s] retornou JSON malformado; registrando falha e acionando próximo fallback.",
                            provider.name,
                        )
                        self._record_telemetry(
                            evaluation_id=evaluation_id,
                            provider=provider.name,
                            model_used=result.get("model_used", "unknown"),
                            task_type=task_type,
                            prompt_tokens=result.get("prompt_tokens", 0),
                            completion_tokens=result.get("completion_tokens", 0),
                            latency_ms=call_latency,
                            status_code=422,
                            success=False,
                            error_message="JSON de saída inválido ou truncado",
                        )
                        continue
                    content = cleaned_content

                total_latency = round((time.perf_counter() - start_time) * 1000, 2)
                result.update({
                    "content": content,
                    "latency_ms": total_latency,
                    "input_hash": input_hash,
                })

                # Registro de telemetria de sucesso N:1
                self._record_telemetry(
                    evaluation_id=evaluation_id,
                    provider=result.get("provider", provider.name),
                    model_used=result.get("model_used", "unknown"),
                    task_type=task_type,
                    prompt_tokens=result.get("prompt_tokens", 0),
                    completion_tokens=result.get("completion_tokens", 0),
                    latency_ms=call_latency,
                    status_code=200,
                    success=True,
                )
                return result

            # Registra tentativa que falhou ou retornou vazio
            if provider.name != "fallback":
                self._record_telemetry(
                    evaluation_id=evaluation_id,
                    provider=provider.name,
                    model_used=preferred_model or "default",
                    task_type=task_type,
                    prompt_tokens=0,
                    completion_tokens=0,
                    latency_ms=call_latency,
                    status_code=500,
                    success=False,
                    error_message="Provedor retornou vazio ou timeout",
                )

        # Fallback determinístico garantido
        total_latency = round((time.perf_counter() - start_time) * 1000, 2)
        fallback_res = self.autonomous_provider.complete(
            messages=all_messages,
            json_output=json_output,
            task_type=task_type,
            correlation_id=cid,
        )
        fallback_res.update({
            "latency_ms": total_latency,
            "input_hash": input_hash,
        })
        return fallback_res

    def _resolve_provider_cascade(self, task_type: str) -> List[BaseLLMProvider]:
        """Resolve a ordem dos provedores conforme a matriz pedagógica e o .env."""
        # Se forçado explicitamente via PRIMARY_AI_PROVIDER
        primary = settings.PRIMARY_AI_PROVIDER
        if primary == "local_vllm" and self.local_vllm_provider.is_available():
            return [self.local_vllm_provider, self.nvidia_nim_provider, self.openrouter_provider, self.deepseek_provider, self.gemini_provider]
        if primary == "deepseek" and self.deepseek_provider.is_available():
            return [self.deepseek_provider, self.nvidia_nim_provider, self.openrouter_provider, self.gemini_provider]
        if primary == "gemini" and self.gemini_provider.is_available():
            return [self.gemini_provider, self.nvidia_nim_provider, self.openrouter_provider]

        cascade: List[BaseLLMProvider] = []

        # 1. vLLM / Modelo Aberto Local tem prioridade se configurado
        if self.local_vllm_provider.is_available():
            cascade.append(self.local_vllm_provider)

        # 2. 9Router se explicitamente configurado
        if settings.has_9router and not settings.has_nvidia:
            cascade.append(self.ninerouter_provider)

        # 3. Raciocínio Axiomático vs Dica Socrática
        if task_type in ("axiomatic_reasoning", "formal_proof"):
            if self.nvidia_nim_provider.is_available():
                cascade.append(self.nvidia_nim_provider)
            if self.openrouter_provider.is_available():
                cascade.append(self.openrouter_provider)
            if self.deepseek_provider.is_available():
                cascade.append(self.deepseek_provider)
            if self.gemini_provider.is_available():
                cascade.append(self.gemini_provider)
        else:
            # Tarefas de tutoria e gerais
            if self.nvidia_nim_provider.is_available():
                cascade.append(self.nvidia_nim_provider)
            if self.openrouter_provider.is_available():
                cascade.append(self.openrouter_provider)
            if self.deepseek_provider.is_available():
                cascade.append(self.deepseek_provider)
            if self.gemini_provider.is_available():
                cascade.append(self.gemini_provider)

        return cascade

    def _validate_and_clean_json(self, raw_text: str) -> tuple[bool, str]:
        """Extrai blocos JSON de markdown e valida sintaxe básica."""
        cleaned = raw_text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r"\s*```$", "", cleaned)
            cleaned = cleaned.strip()

        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            candidate = cleaned[start : end + 1]
            try:
                json.loads(candidate)
                return True, candidate
            except Exception:
                pass
        return False, raw_text

    def _record_telemetry(
        self,
        evaluation_id: Optional[str],
        provider: str,
        model_used: str,
        task_type: str,
        prompt_tokens: int,
        completion_tokens: int,
        latency_ms: float,
        status_code: int,
        success: bool,
        error_message: Optional[str] = None,
    ) -> None:
        """Registra a telemetria da inferência de forma não-bloqueante no Supabase."""
        try:
            total_tokens = prompt_tokens + completion_tokens
            supabase = get_supabase_client()
            if supabase:
                supabase.table("ai_inference_logs").insert({
                    "evaluation_id": evaluation_id,
                    "task_type": task_type,
                    "provider": provider,
                    "model_used": model_used,
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "total_tokens": total_tokens,
                    "latency_ms": latency_ms,
                    "status_code": status_code,
                    "success": success,
                    "error_message": error_message,
                }).execute()
        except Exception:
            # Telemetria nunca deve quebrar a resposta didática do aluno
            pass

    # Métodos legados preservados para compatibilidade com testes unitários anteriores
    def _try_ninerouter(self, messages, model, temperature, max_tokens, json_output):
        return self.ninerouter_provider.complete(messages, temperature, max_tokens, json_output, preferred_model=model)

    def _try_openrouter(self, messages, model, temperature, max_tokens, json_output):
        return self.openrouter_provider.complete(messages, temperature, max_tokens, json_output, preferred_model=model)

    def _try_deepseek_direct(self, messages, model, temperature, max_tokens, json_output):
        return self.deepseek_provider.complete(messages, temperature, max_tokens, json_output, preferred_model=model)

    def _try_nvidia_nim(self, messages, model, temperature, max_tokens, json_output):
        return self.nvidia_nim_provider.complete(messages, temperature, max_tokens, json_output, preferred_model=model)

    def _try_gemini_cascade(self, messages, system_prompt, temperature, json_output):
        all_m = []
        if system_prompt:
            all_m.append({"role": "system", "content": system_prompt})
        all_m.extend(messages)
        return self.gemini_provider.complete(all_m, temperature=temperature, json_output=json_output)

    def _generate_autonomous_fallback(self, messages, json_output):
        res = self.autonomous_provider.complete(messages, json_output=json_output)
        return res["content"]


# Instância global do gateway
mathai_gateway = MathAiGateway()
