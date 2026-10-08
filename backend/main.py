"""Ponto de Entrada Canônico do Backend LEMMAS (Powered by MathAI Engine).

Permite inicialização direta com:
    uvicorn backend.main:app --reload --port 8000
"""

from app.main import app

__all__ = ["app"]
