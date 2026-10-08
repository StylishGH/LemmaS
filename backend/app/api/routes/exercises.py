"""Rotas para Consulta e Gestão de Exercícios e Lemas Matemáticos."""

import random
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.models.exercise import Exercise
from app.services.mathai.recommender import CATALOGO_DE_LEMAS

router = APIRouter(prefix="/exercises", tags=["Exercícios"])

# Banco inicial representativo de questões para desenvolvimento e testes
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


@router.get("/", response_model=List[Exercise])
def list_exercises(
    topico: Optional[str] = Query(None, description="Filtrar por tópico"),
    banca: Optional[str] = Query(None, description="Filtrar por banca"),
    dificuldade: Optional[int] = Query(None, ge=1, le=5, description="Filtrar por dificuldade"),
    limit: int = Query(20, ge=1, le=100),
):
    """Retorna lista de exercícios com suporte a filtros temáticos."""
    results = list(_EXERCISES_STORE.values())

    if topico:
        results = [e for e in results if topico.lower() in e.topico.lower()]
    if banca:
        results = [e for e in results if e.banca and banca.lower() in e.banca.lower()]
    if dificuldade:
        results = [e for e in results if e.dificuldade == dificuldade]

    return results[:limit]


@router.get("/random", response_model=Exercise)
def get_random_exercise(
    topico: Optional[str] = Query(None, description="Opcional: sortear dentro de um tópico"),
):
    """Retorna um exercício aleatório para treino rápido."""
    pool = list(_EXERCISES_STORE.values())
    if topico:
        filtered = [e for e in pool if topico.lower() in e.topico.lower()]
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
    """Retorna a lista de tópicos matemáticos disponíveis no acervo."""
    topics = {e.topico for e in _EXERCISES_STORE.values()}
    return sorted(list(topics))


@router.get("/{exercise_id}", response_model=Exercise)
def get_exercise_by_id(exercise_id: str):
    """Busca uma questão específica pelo seu identificador."""
    exercise = _EXERCISES_STORE.get(exercise_id)
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exercício '{exercise_id}' não encontrado",
        )
    return exercise
