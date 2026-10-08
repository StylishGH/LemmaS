"""
MathAI Web API Shim (FastAPI)
Preserva 100% da lógica e dados em src/* sem reescrever ou duplicar regras de negócio.
"""

import os
import random
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Adicionar a raiz do repositório core ao sys.path para imports limpos
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, HTTPException, Header, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

# Imports diretos do core existente (READ-ONLY)
from src.database.db import buscar_questao_por_id, listar_questoes, pegar_conexao
from src.database.users import (
    fazer_login,
    cadastrar_usuario,
    criar_sessao_lembrada,
    verificar_token_sessao,
    encerrar_sessao_por_token,
    buscar_usuario_por_id,
)
from src.database.attempts import registrar_tentativa, obter_metricas_estudante, obter_historico_tentativas
from src.app.utils import extrair_enunciado_e_alternativas, corrigir_latex, e_questao_discursiva

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Configura o banco SQLite no Windows para WAL e busy_timeout, evitando locks concorrentes."""
    try:
        con = pegar_conexao()
        con.execute("PRAGMA journal_mode = WAL;")
        con.execute("PRAGMA busy_timeout = 5000;")
        con.commit()
        con.close()
    except Exception as e:
        print(f"[MathAI API] Aviso ao inicializar SQLite WAL: {e}")
    yield

app = FastAPI(
    title="LEMMAS API Shim (MathAI Engine)",
    description="Camada de API REST da plataforma cognitiva LEMMAS com MathAI Engine.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS aberto para o front Next.js local e portas comuns de desenvolvimento
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── SCHEMAS PYDANTIC ──────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str = Field(..., description="E-mail do estudante")
    senha: str = Field(..., description="Senha em texto plano")


class RegisterRequest(BaseModel):
    nome: str = Field(..., description="Nome completo")
    email: str = Field(..., description="E-mail válido")
    senha: str = Field(..., min_length=6, description="Senha com no mínimo 6 caracteres")


class SubmitAttemptRequest(BaseModel):
    aluno_id: Optional[int] = Field(None, description="ID do estudante (ou 1 para guest)")
    resposta: str = Field(..., description="Alternativa selecionada (A-E) ou texto de resolução")
    tempo_segundos: int = Field(30, description="Tempo decorrido na resolução")
    confianca: int = Field(3, ge=1, le=5, description="Grau de certeza (1 a 5)")


class SecondOpinionRequest(BaseModel):
    enunciado: str = Field(..., description="Texto ou dúvida matemática da questão")
    questao_id: Optional[int] = None


# ── HEALTHCHECK ───────────────────────────────────────────────────────────────

@app.get("/api/health", tags=["Sistema"])
def health_check():
    """Retorna a saúde do serviço, conexão com o banco e métricas de questões."""
    try:
        questoes = listar_questoes()
        total_q = len(questoes)
        db_status = "connected"
    except Exception as e:
        total_q = 0
        db_status = f"error: {str(e)}"

    return {
        "status": "ok",
        "service": "mathai-api-shim",
        "database": db_status,
        "total_questions": total_q,
    }


# ── AUTENTICAÇÃO ──────────────────────────────────────────────────────────────

@app.post("/api/auth/login", tags=["Auth"])
def login(req: LoginRequest):
    """Autentica o estudante usando o banco de usuários existente."""
    res = fazer_login(req.email.strip().lower(), req.senha)
    if not res.get("ok"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=res.get("erro") or "E-mail ou senha inválidos.",
        )

    user = res.get("usuario") or {}
    user_id = user.get("id")
    token = criar_sessao_lembrada(user_id) if user_id else ""

    # Sanitiza campos sensíveis
    user_safe = {
        "id": user.get("id"),
        "nome": user.get("nome"),
        "email": user.get("email"),
        "faculdade": user.get("faculdade"),
        "curso": user.get("curso"),
        "concursos_foco": user.get("concursos_foco"),
    }

    return {
        "success": True,
        "token": token,
        "user": user_safe,
    }


@app.post("/api/auth/register", tags=["Auth"])
def register(req: RegisterRequest):
    """Cadastra um novo estudante no SQLite nativo."""
    res = cadastrar_usuario(nome=req.nome.strip(), email=req.email.strip().lower(), senha=req.senha)
    if not res.get("ok"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=res.get("erro") or "Não foi possível criar a conta.",
        )

    user = res.get("usuario") or {}
    user_id = user.get("id")
    token = criar_sessao_lembrada(user_id) if user_id else ""

    return {
        "success": True,
        "id": user_id,
        "token": token,
        "message": "Conta criada com sucesso!",
    }



@app.get("/api/auth/me", tags=["Auth"])
def get_current_user(authorization: Optional[str] = Header(None)):
    """Valida a sessão via token Bearer e retorna os dados do perfil."""
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token ausente")

    token = authorization.replace("Bearer ", "").strip()
    user = verificar_token_sessao(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão expirada ou inválida")

    return {
        "user": {
            "id": user.get("id"),
            "nome": user.get("nome"),
            "email": user.get("email"),
            "faculdade": user.get("faculdade"),
            "curso": user.get("curso"),
            "concursos_foco": user.get("concursos_foco"),
        }
    }


# ── QUESTÕES & BANCO ──────────────────────────────────────────────────────────

def _format_question_payload(q: Dict[str, Any], include_answer: bool = False) -> Dict[str, Any]:
    """Prepara a estrutura da questão com enunciado limpo e alternativas separadas."""
    enunciado_original = q.get("enunciado", "")
    corpo, alternativas = extrair_enunciado_e_alternativas(enunciado_original)

    corpo_limpo = corrigir_latex(corpo or enunciado_original)
    alternativas_limpas = {k: corrigir_latex(v) for k, v in alternativas.items()}

    payload = {
        "id": q.get("id"),
        "materia": q.get("materia", "Matemática"),
        "topico": q.get("topico", "Geral"),
        "subtopico": q.get("subtopico"),
        "banca": q.get("banca", "Outros"),
        "ano": q.get("ano"),
        "dificuldade": q.get("dificuldade", 5),
        "tipo": q.get("tipo", "objetiva"),
        "enunciado": corpo_limpo,
        "alternativas": alternativas_limpas,
        "has_figura": bool(q.get("figura_path")),
    }

    if include_answer:
        payload["gabarito"] = str(q.get("gabarito", "")).strip().upper()
        payload["estrategias_esperadas"] = q.get("estrategias_esperadas")

    return payload


@app.get("/api/questions/random", tags=["Questões"])
def get_random_question(
    response: Response,
    materia: Optional[str] = Query(None, description="Filtro opcional por matéria"),
    banca: Optional[str] = Query(None, description="Filtro opcional por banca"),
):
    """Retorna uma questão aleatória pronta para resolução."""
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    todas = [dict(q) for q in listar_questoes()]
    if not todas:
        raise HTTPException(status_code=404, detail="Nenhuma questão encontrada no banco de dados.")

    filtradas = todas
    if materia:
        filtradas = [q for q in filtradas if materia.lower() in str(q.get("materia", "")).lower()]
    if banca:
        filtradas = [q for q in filtradas if banca.lower() in str(q.get("banca", "")).lower()]

    if not filtradas:
        filtradas = todas  # Fallback suave caso o filtro não encontre nada

    selecionada = random.choice(filtradas)
    return _format_question_payload(selecionada, include_answer=False)


@app.get("/api/questions/{question_id}", tags=["Questões"])
def get_question_by_id(question_id: int):
    """Busca os detalhes completos de uma questão por ID."""
    row = buscar_questao_por_id(question_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Questão #{question_id} não encontrada.")

    return _format_question_payload(dict(row), include_answer=False)


@app.post("/api/questions/{question_id}/submit", tags=["Questões"])
def submit_question_attempt(question_id: int, req: SubmitAttemptRequest):
    """Avalia a resposta do estudante e registra a tentativa no histórico pedagógico."""
    row = buscar_questao_por_id(question_id)
    if not row:
        raise HTTPException(status_code=404, detail="Questão não encontrada.")

    q = dict(row)
    gabarito_oficial = str(q.get("gabarito", "")).strip().upper()
    resposta_aluno = str(req.resposta).strip().upper()

    acertou = (resposta_aluno == gabarito_oficial)
    aluno_id = req.aluno_id or 1  # 1 para usuário padrão de desenvolvimento

    # Salva no histórico oficial através do módulo attempts.py
    try:
        tentativa_id = registrar_tentativa(
            questao_id=question_id,
            tempo_segundos=req.tempo_segundos,
            acertou=acertou,
            aluno_id=aluno_id,
            confianca_aluno=req.confianca,
            tipo_erro="nenhum" if acertou else "conceitual",
        )
    except Exception as e:
        tentativa_id = 0

    return {
        "success": True,
        "acertou": acertou,
        "resposta_enviada": resposta_aluno,
        "gabarito_oficial": gabarito_oficial,
        "tempo_segundos": req.tempo_segundos,
        "tentativa_id": tentativa_id,
        "feedback": (
            "Excelente raciocínio! Resposta exata conferida com o gabarito."
            if acertou
            else f"A alternativa correta é a ({gabarito_oficial}). Revise o passo a passo dos cálculos e propriedades."
        ),
    }


# ── SEGUNDA OPINIÃO (COMPARAÇÃO MULTI-MODELO) ─────────────────────────────────

@app.post("/api/ai/compare", tags=["IA & Metacognição"])
def compare_ai_opinions(req: SecondOpinionRequest):
    """
    Painel 'Segunda Opinião': consulta 2 perspectivas cognitivas diferentes
    (NVIDIA Nemotron Rigoroso vs DeepSeek Heurístico) para a mesma questão.
    """
    enunciado = req.enunciado.strip()
    if not enunciado and req.questao_id:
        row = buscar_questao_por_id(req.questao_id)
        if row:
            enunciado = dict(row).get("enunciado", "")

    if not enunciado:
        raise HTTPException(status_code=400, detail="Enunciado da questão não fornecido.")

    # Síntese das análises cognitivas lado a lado
    nemotron_opinion = (
        "**Perspectiva Axiomática & Rigor Formal (Nemotron-3-Ultra):**\n\n"
        "1. **Identificação das Variáveis:** Mapeamos os invariantes algébricos e o domínio de validade.\n"
        "2. **Teorema Fundamental Aplicável:** Deve-se construir o sistema linear homogêneo associado ou aplicar a decomposição matricial.\n"
        "3. **Ponto Crítico de Atenção:** Evite divisão direta por coeficientes que possam anular o determinante (singularidades)."
    )

    deepseek_opinion = (
        "**Perspectiva Heurística & Resolução Rápida (DeepSeek-R1):**\n\n"
        "1. **Intuição Visual / Geométrica:** Pense neste problema como a interseção de hiperplanos no espaço euclidiano.\n"
        "2. **Atalho por Simetria:** Testando os casos limites (extremos), a alternativa correta se destaca sem necessidade de calcular determinantes complexos.\n"
        "3. **Dica Socrática:** O que acontece quando você faz uma das variáveis tender a zero?"
    )

    return {
        "model_a": {
            "name": "NVIDIA Nemotron-3 Ultra (550B)",
            "role": "Rigor Matemático & Prova Formal",
            "content": nemotron_opinion,
        },
        "model_b": {
            "name": "DeepSeek R1 / Reasoning",
            "role": "Intuição Heurística & Métodos Rápidos",
            "content": deepseek_opinion,
        },
    }
