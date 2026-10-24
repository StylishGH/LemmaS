"""Módulo de Visão Multimodal e OCR de Cadernos e Tablets (MathAI Engine).

Processa fotos de cadernos, anotações de caneta stylus em tablets e rascunhos manuscritos,
convertendo a caligrafia em notação matemática LaTeX padronizada e segmentada em passos.
"""

import base64
import time
from typing import Any, Dict, Optional, Tuple

from app.core.config import settings
from app.core.security import compute_sha256
from app.services.mathai.gateway import NVIDIA_VISION_MODELS

PROMPT_SISTEMA_OCR_MATEMATICO = r"""Você é o Especialista em Visão Multimodal e OCR Matemático do MathAI.
Sua única tarefa é ler e transcrever fielmente as resoluções e equações manuscritas na imagem para LaTeX limpo.

REGRAS:
1. Transcreva cada linha e símbolo visível para LaTeX.
2. Use $...$ para matemática inline e $$...$$ para blocos destacados de equações.
3. Se houver rasuras ou termos riscados, ignore-os ou marque como [termo cancelado].
4. Se uma passagem estiver ilegível ou borrada, escreva: [expressão ilegível].
5. NÃO invente números ou sinais que não estejam visíveis.
6. Retorne um JSON com:
   - "transcricao_latex": string completa da transcrição em LaTeX.
   - "passos_detectados": lista de strings com cada etapa identificada.
   - "legibilidade": "alta" | "media" | "baixa".
"""


class MultimodalVisionProcessor:
    """Processador de imagens e caligrafia matemática via modelos de visão."""

    def __init__(self) -> None:
        self.gemini_key = settings.GEMINI_API_KEY

    def process_image(
        self,
        image_data: str | bytes,
        mime_type: str = "image/png",
    ) -> Dict[str, Any]:
        """
        Processa imagem de caderno/tablet e retorna transcrição matemática LaTeX.
        Aceita base64 (string) ou bytes brutos.
        """
        start_time = time.perf_counter()

        image_bytes, mime_type = self._normalize_image_input(image_data, mime_type)
        input_hash = compute_sha256(image_bytes)

        # 1. Google Gemini Multimodal Vision (primário - velocidade < 0.8s e alta acurácia em LaTeX)
        if settings.has_gemini and settings.GEMINI_FALLBACK_ENABLED:
            ocr_result = self._call_gemini_vision(image_bytes, mime_type)
            if ocr_result:
                latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
                ocr_result.update(
                    {
                        "latency_ms": latency_ms,
                        "input_hash": input_hash,
                        "model_used": "gemini-flash-lite-latest",
                        "provider": "google",
                    }
                )
                return ocr_result

        # 2. NVIDIA NIM Vision (secundário)
        if settings.has_nvidia:
            for model in NVIDIA_VISION_MODELS:
                ocr_result = self._call_nvidia_vision(image_bytes, mime_type, model)
                if ocr_result:
                    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
                    ocr_result.update(
                        {
                            "latency_ms": latency_ms,
                            "input_hash": input_hash,
                            "model_used": model,
                            "provider": "nvidia",
                        }
                    )
                    return ocr_result

        # Fallback honesto: se nenhum provedor multimodal estiver disponível ou funcional,
        # reporta indisponibilidade sem jamais fabricar dados ou equações fictícias (P0-02).
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "transcricao_latex": "",
            "passos_detectados": [],
            "legibilidade": "baixa",
            "error": "Serviço de OCR multimodal indisponível ou nenhum provedor configurado.",
            "status": "unavailable",
            "latency_ms": latency_ms,
            "input_hash": input_hash,
            "model_used": None,
            "provider": "none",
        }

    def _normalize_image_input(
        self, image_data: str | bytes, mime_type: str
    ) -> Tuple[bytes, str]:
        """Normaliza entrada de imagem em bytes limpos e detecta mime type."""
        if isinstance(image_data, bytes):
            return image_data, mime_type

        # Se for string base64 com data URI (ex: data:image/png;base64,...)
        if "data:" in image_data and ";base64," in image_data:
            header, b64_str = image_data.split(";base64,", 1)
            detected_mime = header.replace("data:", "").strip()
            return base64.b64decode(b64_str), detected_mime or mime_type

        # String base64 pura
        return base64.b64decode(image_data), mime_type

    def _call_nvidia_vision(
        self, image_bytes: bytes, mime_type: str, model: str
    ) -> Optional[Dict[str, Any]]:
        """Executa a transcrição OCR via NVIDIA NIM (Llama 3.2 Vision)."""
        try:
            import json
            import requests

            b64 = base64.b64encode(image_bytes).decode("ascii")
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": PROMPT_SISTEMA_OCR_MATEMATICO},
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Transcreva fielmente para LaTeX toda a caligrafia e equações desta folha. Responda SOMENTE com o JSON.",
                            },
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:{mime_type};base64,{b64}"},
                            },
                        ],
                    },
                ],
                "temperature": 0.1,
                "max_tokens": 1536,
            }
            resp = requests.post(
                "https://integrate.api.nvidia.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.NVIDIA_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=(3.0, 25.0),
            )
            if resp.status_code != 200:
                return None
            text = (resp.json()["choices"][0]["message"].get("content") or "").strip()
            start, end = text.find("{"), text.rfind("}")
            if start != -1 and end > start:
                data = json.loads(text[start : end + 1])
                return {
                    "transcricao_latex": data.get("transcricao_latex", ""),
                    "passos_detectados": data.get("passos_detectados", []),
                    "legibilidade": data.get("legibilidade", "media"),
                }
        except Exception:
            pass
        return None

    def _call_gemini_vision(
        self, image_bytes: bytes, mime_type: str
    ) -> Optional[Dict[str, Any]]:
        """Executa a transcrição OCR via SDK oficial do Google Gemini."""
        try:
            from google import genai
            from google.genai import types
            import json

            client = genai.Client(
                api_key=self.gemini_key,
                http_options=types.HttpOptions(timeout=15000),
            )
            config = types.GenerateContentConfig(
                system_instruction=PROMPT_SISTEMA_OCR_MATEMATICO,
                response_mime_type="application/json",
                temperature=0.1,  # Máxima fidelidade na transcrição
            )

            part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
            prompt = "Transcreva fielmente para LaTeX toda a caligrafia e equações desta folha de caderno ou tablet."

            # Prioriza gemini-flash-lite-latest conforme regra AGENTS.md
            response = client.models.generate_content(
                model="gemini-flash-lite-latest",
                contents=[part, prompt],
                config=config,
            )

            if response and response.text:
                text = response.text.strip()
                start = text.find("{")
                end = text.rfind("}")
                if start != -1 and end != -1 and end > start:
                    data = json.loads(text[start : end + 1])
                    return {
                        "transcricao_latex": data.get("transcricao_latex", ""),
                        "passos_detectados": data.get("passos_detectados", []),
                        "legibilidade": data.get("legibilidade", "media"),
                    }
        except Exception:
            pass
        return None


# Instância global do módulo de visão
vision_processor = MultimodalVisionProcessor()
