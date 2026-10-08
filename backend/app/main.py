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

app = FastAPI(
    title="LEMMAS API (Powered by MathAI Engine)",
    description=(
        "Ecossistema modular da plataforma LEMMAS para estudantes de alto rendimento. "
        "Impulsionado pela MathAI Engine para avaliação cognitiva passo a passo, "
        "OCR multimodal de cadernos e repetição espaçada SM-2."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configuração de CORS para permitir integração perfeita com o frontend Next.js
origins = settings.CORS_ORIGINS if settings.CORS_ORIGINS else ["*"]
if "*" not in origins:
    origins.extend(["http://localhost:3000", "http://127.0.0.1:3000"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if "*" in origins else list(set(origins)),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
