from fastapi import APIRouter
import sys
from pathlib import Path

# Ensure src is on path
sys.path.append(str(Path(__file__).resolve().parent.parent.parent / "src"))

# Lazy import do ai.evaluator transferido para dentro da rota /avaliar para acelerar boot

router = APIRouter()

@router.post("/avaliar")
def avaliar_resolucao(dados: dict):
    # Expected dados: {enunciado: str, imagem_base64: str | None, justificativa: str | None}
    enunciado = dados.get("enunciado", "")
    justificativa = dados.get("justificativa", None)
    imagem_b64 = dados.get("imagem_base64", None)
    imagem_bytes = None
    if imagem_b64:
        import base64
        try:
            imagem_bytes = base64.b64decode(imagem_b64)
        except Exception:
            imagem_bytes = None
    # Lazy import do avaliador Gemini
    # Lazy import do ai.evaluator transferido para dentro da rota /avaliar para acelerar boot
    resultado = analisar_resolucao(
        enunciado=enunciado,
        justificativa_texto=justificativa,
        imagem_bytes=imagem_bytes
    )
    return resultado
