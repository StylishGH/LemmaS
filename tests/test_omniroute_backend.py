from unittest.mock import patch

from app.core.config import settings
from app.services.mathai.gateway import MathAiGateway


def test_second_opinion_uses_https_omniroute_combo_first():
    with (
        patch.object(settings, "OMNIROUTE_URL", "https://omni.example/v1"),
        patch.object(settings, "OMNIROUTE_API_KEY", "test-key"),
    ):
        gateway = MathAiGateway()

        assert gateway.omniroute_provider.base_url == (
            "https://omni.example/v1/chat/completions"
        )
        assert gateway._resolve_provider_cascade("second_opinion")[0] is (
            gateway.omniroute_provider
        )


def test_second_opinion_does_not_enable_omniroute_over_http():
    with (
        patch.object(settings, "OMNIROUTE_URL", "http://omni.example/v1"),
        patch.object(settings, "OMNIROUTE_API_KEY", "test-key"),
    ):
        gateway = MathAiGateway()

        assert not gateway.omniroute_provider.is_available()
        assert gateway.omniroute_provider not in gateway._resolve_provider_cascade(
            "second_opinion"
        )


def test_socratic_hints_use_omniroute_combo_first():
    with (
        patch.object(settings, "OMNIROUTE_URL", "https://omni.example/v1"),
        patch.object(settings, "OMNIROUTE_API_KEY", "test-key"),
    ):
        gateway = MathAiGateway()
        with (
            patch.object(gateway.omniroute_provider, "is_available", return_value=True),
            patch.object(gateway.gemini_provider, "is_available", return_value=True),
            patch.object(gateway.nvidia_nim_provider, "is_available", return_value=True),
            patch.object(gateway.openrouter_provider, "is_available", return_value=True),
            patch.object(gateway.deepseek_provider, "is_available", return_value=True),
        ):
            cascade = gateway._resolve_provider_cascade("socratic_hint")

        assert cascade[0] is gateway.omniroute_provider
