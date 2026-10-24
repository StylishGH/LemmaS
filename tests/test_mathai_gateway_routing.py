import json
from unittest.mock import Mock, patch

import pytest

from app.core.config import settings
from app.services.mathai.gateway import (
    MathAiGateway,
    OpenAICompatibleProvider,
    SlidingWindowRateLimiter,
    NVIDIA_NIM_MODELS,
)


def test_openai_compatible_provider_sends_configured_bearer_token():
    response = Mock()
    response.status_code = 200
    response.json.return_value = {
        "choices": [{"message": {"content": "ok"}}],
        "usage": {},
    }
    provider = OpenAICompatibleProvider(
        name="openrouter",
        base_url="https://openrouter.example/v1",
        api_key="configured-test-key",
        default_models=["mistralai/mistral-nemo"],
    )

    with (
        patch.object(settings, "OPENROUTER_API_KEY", "configured-test-key"),
        patch("app.services.mathai.gateway.requests.post", return_value=response) as post,
    ):
        result = provider.complete(
            messages=[{"role": "user", "content": "test"}],
            json_output=False,
        )

    assert result is not None
    assert result["content"] == "ok"
    assert post.call_args.kwargs["headers"]["Authorization"] == "Bearer configured-test-key"


def test_cognitive_tasks_use_nvidia_groq_openrouter_order():
    gateway = MathAiGateway()
    with (
        patch.object(gateway.nvidia_nim_provider, "is_available", return_value=True),
        patch.object(gateway.groq_provider, "is_available", return_value=True),
        patch.object(gateway.openrouter_provider, "is_available", return_value=True),
        patch.object(gateway.river_provider, "is_available", return_value=False),
        patch.object(gateway.gemini_provider, "is_available", return_value=True),
        patch.object(gateway.deepseek_provider, "is_available", return_value=True),
        patch.object(gateway.local_vllm_provider, "is_available", return_value=True),
        patch.object(gateway.ninerouter_provider, "is_available", return_value=True),
    ):
        for task_type in ("socratic_hint", "second_opinion"):
            cascade = gateway._resolve_provider_cascade(task_type)
            assert cascade == [
                gateway.nvidia_nim_provider,
                gateway.groq_provider,
                gateway.openrouter_provider,
                gateway.gemini_provider,
            ]


def test_groq_provider_uses_configured_model_and_endpoint():
    with (
        patch.object(settings, "GROQ_API_KEY", "test-key"),
        patch.object(settings, "GROQ_MODEL", "openai/gpt-oss-20b"),
        patch.object(settings, "RIVER_API_KEY", "test-key"),
        patch.object(settings, "RIVER_MODEL", "deepseek-ai/DeepSeek-V4.1-Flash"),
        patch.object(settings, "RIVER_API_URL", "https://api.river.ai/v1"),
    ):
        gateway = MathAiGateway()
        assert gateway.groq_provider.is_available()
        assert gateway.river_provider.is_available()

    assert gateway.groq_provider.base_url == "https://api.groq.com/openai/v1"
    assert gateway.groq_provider.default_models == ["openai/gpt-oss-20b"]
    assert gateway.river_provider.base_url == "https://api.river.ai/v1"
    assert gateway.river_provider.default_models == ["deepseek-ai/DeepSeek-V4.1-Flash"]


def test_river_is_optional_fallback_after_openrouter():
    gateway = MathAiGateway()
    with (
        patch.object(gateway.nvidia_nim_provider, "is_available", return_value=True),
        patch.object(gateway.groq_provider, "is_available", return_value=True),
        patch.object(gateway.openrouter_provider, "is_available", return_value=True),
        patch.object(gateway.river_provider, "is_available", return_value=True),
        patch.object(gateway.gemini_provider, "is_available", return_value=True),
    ):
        cascade = gateway._resolve_provider_cascade("second_opinion")

    assert cascade == [
        gateway.nvidia_nim_provider,
        gateway.groq_provider,
        gateway.openrouter_provider,
        gateway.river_provider,
        gateway.gemini_provider,
    ]


def test_sliding_window_rate_limiter_enforces_limit():
    limiter = SlidingWindowRateLimiter(limit=2, window_seconds=60)

    assert limiter.allow()
    assert limiter.allow()
    assert not limiter.allow()


@pytest.mark.parametrize("auth_status", [401, 403])
def test_nvidia_uses_secondary_key_after_primary_auth_failure(auth_status):
    primary_error = Mock(status_code=auth_status)
    success = Mock(status_code=200)
    success.json.return_value = {
        "choices": [{"message": {"content": "ok"}}],
        "usage": {},
    }
    auth_headers = []

    def respond_with_primary_auth_failure_then_backup_success(_url, **kwargs):
        auth_headers.append(kwargs["headers"]["Authorization"])
        return primary_error if len(auth_headers) == 1 else success

    provider = OpenAICompatibleProvider(
        name="nvidia",
        base_url="https://nvidia.example/v1",
        api_key="primary-test-key",
        default_models=[NVIDIA_NIM_MODELS[0]],
    )

    with (
        patch.object(settings, "NVIDIA_API_KEY", "primary-test-key"),
        patch.object(settings, "NVIDIA_API_KEY_2", "secondary-test-key"),
        patch(
            "app.services.mathai.gateway._NVIDIA_REQUEST_LIMITER.allow",
            return_value=True,
        ),
        patch(
            "app.services.mathai.gateway.requests.post",
            side_effect=respond_with_primary_auth_failure_then_backup_success,
        ) as post,
    ):
        result = provider.complete(
            messages=[{"role": "user", "content": "test"}],
            json_output=False,
            task_type="socratic_hint",
            time_budget=5,
        )

    assert result is not None
    assert result["content"] == "ok"
    assert post.call_count == 2
    assert auth_headers == [
        "Bearer primary-test-key",
        "Bearer secondary-test-key",
    ]


def test_nvidia_does_not_use_secondary_key_after_rate_limit():
    rate_limit = Mock(status_code=429)
    provider = OpenAICompatibleProvider(
        name="nvidia",
        base_url="https://nvidia.example/v1",
        api_key="primary-test-key",
        default_models=[NVIDIA_NIM_MODELS[0]],
    )

    with (
        patch.object(settings, "NVIDIA_API_KEY", "primary-test-key"),
        patch.object(settings, "NVIDIA_API_KEY_2", "secondary-test-key"),
        patch(
            "app.services.mathai.gateway._NVIDIA_REQUEST_LIMITER.allow",
            return_value=True,
        ),
        patch(
            "app.services.mathai.gateway.requests.post",
            return_value=rate_limit,
        ) as post,
    ):
        result = provider.complete(
            messages=[{"role": "user", "content": "test"}],
            json_output=False,
            task_type="socratic_hint",
            time_budget=5,
        )

    assert result is None
    assert post.call_count == 1


def test_cognitive_fallback_uses_per_provider_time_budgets():
    gateway = MathAiGateway()
    comparison = {
        "model_a": {"name": "Formal", "role": "Proof", "content": "Passo A"},
        "model_b": {"name": "Heurística", "role": "Tática", "content": "Passo B"},
        "sintese": "Síntese didática",
    }
    with (
        patch.object(gateway.nvidia_nim_provider, "is_available", return_value=True),
        patch.object(gateway.groq_provider, "is_available", return_value=True),
        patch.object(gateway.openrouter_provider, "is_available", return_value=True),
        patch.object(gateway.nvidia_nim_provider, "complete", return_value=None) as nvidia,
        patch.object(gateway.groq_provider, "complete", return_value=None) as groq,
        patch.object(
            gateway.openrouter_provider,
            "complete",
            return_value={
                "content": json.dumps(comparison),
                "provider": "openrouter",
                "model_used": "mistralai/mistral-nemo",
            },
        ),
        patch.object(gateway, "_record_telemetry"),
    ):
        result = gateway.execute_completion(
            messages=[{"role": "user", "content": "Compare these methods."}],
            task_type="second_opinion",
            max_tokens=2048,
            total_budget_seconds=18,
        )

    assert result["provider"] == "openrouter"
    assert nvidia.call_args.kwargs["time_budget"] == 5.0
    assert groq.call_args.kwargs["time_budget"] == 5.0
