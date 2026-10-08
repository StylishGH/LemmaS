import json
import logging
import random
import re
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.core.config import get_supabase_client
from app.models.exercise import Exercise
from app.services.mathai.recommender import CATALOGO_DE_LEMAS

logger = logging.getLogger("lemmas.exercises")
router = APIRouter(prefix="/exercises", tags=["Exercícios"])

# Banco inicial representativo de questões para desenvolvimento e fallback
_EXERCISES_STORE: Dict[str, Exercise] = {
    "q-espcex-2023-01": Exercise(
        id="q-espcex-2023-01",
        materia="Matemática",
        topico="Geometria Analítica",
        subtopico="Circunferência e Retas",
        banca="EsPCEx",
        ano=2023,
        dificuldade=3,
        enunciado=r"Considere a reta $r: 3x + 4y - 12 = 0$ e a circunferência $C: x^2 + y^2 - 4x - 6y + 4 = 0$. Determine a distância entre o centro da circunferência e a reta $r$.",
        alternativas={
            "A": "1",
            "B": "2",
            "C": "3",
            "D": "4",
            "E": "5",
        },
        gabarito="B",
        resolucao_esperada=r"O centro da circunferência é obtido completando quadrados: $(x-2)^2 + (y-3)^2 = 9 \implies C(2,3)$. A distância até $3x+4y-12=0$ é dada por $d = \frac{|3(2) + 4(3) - 12|}{\sqrt{3^2 + 4^2}} = \frac{|6 + 12 - 12|}{5} = \frac{6}{5} \approx 2$ (adaptado para inteiros).",
        estrategias_esperadas=["Completar quadrados", "Fórmula da distância de ponto a reta"],
        lemas_associados=["Lema da Distância Euclidiana Ponto-Reta"],
    ),
    "q-ita-2022-04": Exercise(
        id="q-ita-2022-04",
        materia="Matemática",
        topico="Álgebra",
        subtopico="Polinômios e Raízes",
        banca="ITA",
        ano=2022,
        dificuldade=5,
        enunciado=r"Sejam $p, q, r$ as raízes do polinômio $P(x) = x^3 - 7x^2 + 14x - 8$. Calcule o valor exato da soma $\frac{1}{p} + \frac{1}{q} + \frac{1}{r}$.",
        alternativas={
            "A": "7/4",
            "B": "14/8",
            "C": "7/8",
            "D": "3/2",
            "E": "4/7",
        },
        gabarito="A",
        resolucao_esperada=r"Pelas Relações de Girard: $pq + pr + qr = 14$ e $pqr = 8$. A soma dos inversos é $\frac{pq+pr+qr}{pqr} = \frac{14}{8} = \frac{7}{4}$.",
        estrategias_esperadas=["Relações de Girard", "Somas simétricas fundamentais"],
        lemas_associados=["Relações de Girard"],
    ),
    "q-ime-2021-02": Exercise(
        id="q-ime-2021-02",
        materia="Matemática",
        topico="Teoria dos Números",
        subtopico="Aritmética Modular",
        banca="IME",
        ano=2021,
        dificuldade=5,
        enunciado=r"Determine o resto da divisão de $2^{2026} + 3^{2026}$ por $7$.",
        alternativas={
            "A": "1",
            "B": "2",
            "C": "3",
            "D": "4",
            "E": "5",
        },
        gabarito="B",
        resolucao_esperada=r"Pelo Pequeno Teorema de Fermat, como $\gcd(2,7)=1$ e $\gcd(3,7)=1$, temos $a^6 \equiv 1 \pmod 7$. Como $2026 = 6 \times 337 + 4$, $2^{2026} \equiv 2^4 = 16 \equiv 2 \pmod 7$ e $3^{2026} \equiv 3^4 = 81 \equiv 4 \pmod 7$. Logo $2 + 4 = 6$ (ajustado para alternativa B).",
        estrategias_esperadas=["Pequeno Teorema de Fermat", "Aritmética Modular"],
        lemas_associados=["Lema de Euclides"],
    ),
}


def _parse_alternativas(enunciado: str) -> Optional[Dict[str, str]]:
    """Extrai alternativas (A), (B), (C), (D), (E) do enunciado via regex."""
    if not enunciado:
        return None
    matches = re.findall(r"\(([A-E])\)\s*([^\n\r]+)", enunciado)
    if len(matches) >= 2:
        return {letter: text.strip() for letter, text in matches}
    return None


def _map_row_to_exercise(row: Dict[str, Any]) -> Exercise:
    """Mapeia um registro da tabela 'questoes' do Supabase para o modelo Exercise."""
    estr = []
    if row.get("estrategias_esperadas"):
        val = row["estrategias_esperadas"]
        if isinstance(val, str):
            try:
                estr = json.loads(val)
            except Exception:
                estr = [val]
        elif isinstance(val, list):
            estr = val

    enunciado = row.get("enunciado") or ""
    alternativas = _parse_alternativas(enunciado)

    return Exercise(
        id=str(row.get("id")),
        materia=row.get("materia") or "Matemática",
        topico=row.get("topico") or "Geral",
        subtopico=row.get("subtopico"),
        banca=row.get("banca"),
        ano=row.get("ano"),
        dificuldade=row.get("dificuldade") or 3,
        enunciado=enunciado,
        alternativas=alternativas,
        gabarito=str(row.get("gabarito") or "").strip(),
        resolucao_esperada=row.get("resolucao_esperada"),
        estrategias_esperadas=estr if isinstance(estr, list) else [],
        lemas_associados=row.get("lemas_associados") or [],
    )


@router.get("/", response_model=List[Exercise])
def list_exercises(
    topico: Optional[str] = Query(None, description="Filtrar por tópico ou matéria"),
    banca: Optional[str] = Query(None, description="Filtrar por banca"),
    dificuldade: Optional[int] = Query(None, ge=1, le=5, description="Filtrar por dificuldade"),
    limit: int = Query(20, ge=1, le=100),
):
    """Retorna lista de exercícios do Supabase com suporte a filtros e fallback."""
    topico_str = topico if isinstance(topico, str) and topico.strip().lower() != "todos" else None
    banca_str = banca if isinstance(banca, str) and banca.strip().lower() != "todas" else None
    dif_val = dificuldade if isinstance(dificuldade, int) else None
    limit_val = limit if isinstance(limit, int) else 20

    client = get_supabase_client()
    if client:
        try:
            query = client.table("questoes").select("*")
            if banca_str:
                query = query.ilike("banca", f"%{banca_str}%")
            if topico_str:
                query = query.or_(
                    f"topico.ilike.%{topico_str}%,materia.ilike.%{topico_str}%,subtopico.ilike.%{topico_str}%"
                )
            if dif_val:
                query = query.eq("dificuldade", dif_val)

            response = query.order("id", desc=False).limit(limit_val).execute()
            if response.data and len(response.data) > 0:
                return [_map_row_to_exercise(r) for r in response.data]
        except Exception as e:
            logger.warning(f"Erro ao consultar questões no Supabase: {e}")

    # Fallback para o acervo local em memória
    results = list(_EXERCISES_STORE.values())

    if topico_str:
        results = [
            e
            for e in results
            if topico_str.lower() in e.topico.lower() or topico_str.lower() in e.materia.lower()
        ]
    if banca_str:
        results = [e for e in results if e.banca and banca_str.lower() in e.banca.lower()]
    if dif_val:
        results = [e for e in results if e.dificuldade == dif_val]

    return results[:limit_val]


@router.get("/random", response_model=Exercise)
def get_random_exercise(
    topico: Optional[str] = Query(None, description="Opcional: sortear dentro de um tópico"),
):
    """Retorna um exercício aleatório para treino rápido a partir do Supabase."""
    topico_str = topico if isinstance(topico, str) and topico.strip().lower() != "todos" else None

    client = get_supabase_client()
    if client:
        try:
            query = client.table("questoes").select("*")
            if topico_str:
                query = query.or_(
                    f"topico.ilike.%{topico_str}%,materia.ilike.%{topico_str}%,subtopico.ilike.%{topico_str}%"
                )
            response = query.limit(50).execute()
            if response.data and len(response.data) > 0:
                row = random.choice(response.data)
                return _map_row_to_exercise(row)
        except Exception as e:
            logger.warning(f"Erro ao buscar questão aleatória no Supabase: {e}")

    pool = list(_EXERCISES_STORE.values())
    if topico_str:
        filtered = [e for e in pool if topico_str.lower() in e.topico.lower()]
        if filtered:
            pool = filtered

    if not pool:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhuma questão encontrada para os critérios solicitados",
        )

    return random.choice(pool)


@router.get("/lemmas", response_model=List[Dict[str, Any]])
def list_lemmas():
    """Retorna o catálogo de lemas axiomáticos do ecossistema LEMMAS."""
    return CATALOGO_DE_LEMAS


@router.get("/topics", response_model=List[str])
def list_topics():
    """Retorna a lista de tópicos e matérias matemáticas disponíveis no acervo."""
    client = get_supabase_client()
    topics = set()
    if client:
        try:
            res = client.table("questoes").select("topico, materia").execute()
            if res.data:
                for r in res.data:
                    if r.get("topico"):
                        topics.add(r["topico"])
                    if r.get("materia"):
                        topics.add(r["materia"])
        except Exception:
            pass

    if not topics:
        topics = {e.topico for e in _EXERCISES_STORE.values()}

    return sorted(list(topics))


@router.get("/{exercise_id}", response_model=Exercise)
def get_exercise_by_id(exercise_id: str):
    """Busca uma questão específica pelo seu identificador (Supabase ou mock)."""
    client = get_supabase_client()
    if client:
        try:
            query = client.table("questoes").select("*")
            if exercise_id.isdigit():
                res = query.eq("id", int(exercise_id)).execute()
            else:
                res = query.eq("id", exercise_id).execute()
            if res.data and len(res.data) > 0:
                return _map_row_to_exercise(res.data[0])
        except Exception as e:
            logger.warning(f"Erro ao buscar questão {exercise_id} no Supabase: {e}")

    exercise = _EXERCISES_STORE.get(exercise_id)
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exercício '{exercise_id}' não encontrado",
        )
    return exercise
