"""Ponto de Entrada Principal da Plataforma LEMMAS API (Powered by MathAI Engine).

Expõe a API RESTful de alta performance sob o prefixo `/api`,
com CORS liberado para o frontend Next.js, documentação OpenAPI automática,
rotas de autenticação, exercícios, tentativas imutáveis, feedback e motor cognitivo socrático.
"""

from datetime import datetime, timezone
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes.attempts import router as attempts_router
from app.api.routes.auth import router as auth_router
from app.api.routes.exercises import router as exercises_router
from app.api.routes.feedback import router as feedback_router
from app.api.routes.tutor import router as tutor_router
from app.api.routes.flashcards import router as flashcards_router
from app.core.config import settings

# Fail-fast: SECRET_KEY obrigatória em produção
if not settings.SECRET_KEY:
    raise RuntimeError("SECRET_KEY não configurada — recusando iniciar")

# Rate limiting (slowapi)
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.requests import Request

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="LEMMAS API (Powered by MathAI Engine)",
    description=(
        "Ecossistema modular da plataforma LEMMAS para estudantes de alto rendimento. "
        "Impulsionado pela MathAI Engine para avaliação cognitiva passo a passo, "
        "OCR multimodal de cadernos e repetição espaçada SM-2."
    ),
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)

app.state.limiter = limiter
app.add_exception_handler(
    RateLimitExceeded,
    lambda req, exc: JSONResponse(
        {"detail": "Muitas requisições"}, status_code=429
    ),
)

# Configuração estrita de CORS para integração segura com o frontend Next.js
cors_origins = [o.strip() for o in settings.CORS_ORIGINS if o.strip() and o.strip() != "*"]
if not cors_origins:
    cors_origins = [
        "https://lemmas-ochre.vercel.app",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
elif settings.DEBUG:
    cors_origins.extend(["http://localhost:3000", "http://127.0.0.1:3000"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(cors_origins)),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept"],
)


@app.get("/", tags=["Geral"])
def root():
    """Rota raiz com informações do serviço."""
    return {
        "message": "Bem-vindo à API do LEMMAS!",
        "engine": "MathAI Engine",
        "docs": "/docs",
        "health": f"{settings.API_V1_PREFIX}/health",
    }


@app.get(f"{settings.API_V1_PREFIX}/health", tags=["Saúde"])
def health_check():
    """Rota de verificação de integridade operacional do backend."""
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "status": "ok",
            "platform": "LEMMAS",
            "engine": "MathAI Engine",
            "version": "1.0.0",
            "environment": settings.ENVIRONMENT,
            "supabase_connected": settings.has_supabase,
            "gemini_configured": settings.has_gemini,
            "ninerouter_endpoint": settings.NINEROUTER_URL,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


# Inclusão dos roteadores modulares com prefixo /api
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(exercises_router, prefix=settings.API_V1_PREFIX)
app.include_router(attempts_router, prefix=settings.API_V1_PREFIX)
app.include_router(feedback_router, prefix=settings.API_V1_PREFIX)
app.include_router(tutor_router, prefix=settings.API_V1_PREFIX)
app.include_router(flashcards_router, prefix=settings.API_V1_PREFIX)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
