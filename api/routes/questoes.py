from fastapi import APIRouter
from typing import Optional
import sys
from pathlib import Path

# Ensure src is on path
sys.path.append(str(Path(__file__).resolve().parent.parent.parent / "src"))

router = APIRouter()

@router.get("/")
def endpoint_listar_questoes(materia: Optional[str] = None, topico: Optional[str] = None):
    from database.db import listar_questoes
    questoes = listar_questoes()
    questoes_dict = [dict(zip(row.keys(), row.values())) for row in questoes]
    if materia:
        questoes_dict = [q for q in questoes_dict if q.get("materia") == materia]
    if topico:
        questoes_dict = [q for q in questoes_dict if q.get("topico") == topico]
    return questoes_dict

@router.get("/{questao_id}")
def endpoint_obter_questao(questao_id: int):
    from database.db import buscar_questao_por_id
    row = buscar_questao_por_id(questao_id)
    if row is None:
        return {"error": "Questão não encontrada"}
    return dict(zip(row.keys(), row.values()))
