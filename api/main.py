from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import auth, questoes, dashboard, simulado

app = FastAPI(
    title="LEMMAS API (MathAI Engine)",
    description="Backend API da Plataforma Cognitiva LEMMAS impulsionada pela MathAI Engine",
    version="1.0.0"
)

# Configurar CORS para o Next.js (que roda na porta 3000 por padrão)
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar os roteadores
app.include_router(auth.router, prefix="/api/auth", tags=["Autenticação"])
app.include_router(questoes.router, prefix="/api/questoes", tags=["Banco de Questões"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard Cognitivo"])
app.include_router(simulado.router, prefix="/api/simulado", tags=["Treino e Simulado"])

@app.get("/api/health", tags=["Sistema"])
def health_check():
    total_q = 288
    try:
        from database.db import pegar_conexao
        con = pegar_conexao()
        cur = con.cursor()
        cur.execute("SELECT COUNT(*) as total FROM questoes")
        row = cur.fetchone()
        if row:
            if isinstance(row, dict) or hasattr(row, "keys"):
                total_q = row["total"] if "total" in row.keys() else list(row.values())[0]
            elif isinstance(row, (tuple, list)):
                total_q = row[0]
        con.close()
    except Exception:
        pass

    return {
        "status": "ok",
        "message": "LEMMAS API is running gracefully.",
        "platform": "LEMMAS",
        "engine": "MathAI Engine v1.0",
        "total_questions": total_q
    }
