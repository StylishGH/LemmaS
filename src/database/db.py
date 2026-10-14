"""
Camada de Banco de Dados Oficial do LEMMAS / MathAI (100% Supabase).
Compatível com DB-API 2.0 (con.cursor(), pd.read_sql, fetchall) e Supabase PostgreSQL nativo.
"""

import sys
import os
import json
import re
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import pandas as pd

SRC_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = SRC_DIR.parent
BACKEND_DIR = PROJECT_ROOT / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import get_supabase_client as _get_supabase_client, settings

_supabase_client = None
_cached_con = None

def get_supabase():
    """Retorna o cliente autenticado do Supabase."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    _supabase_client = _get_supabase_client()
    if _supabase_client is None:
        raise ValueError("Não foi possível conectar ao Supabase. Verifique backend/.env")
    return _supabase_client

def obter_status_banco() -> str:
    """Retorna o status e nome do banco ativo (Supabase oficial)."""
    return "Supabase PostgreSQL (Producao)"

def _classificar_tipo(enunciado: str, gabarito: Optional[str]) -> str:
    """Classifica se uma questão é objetiva ou discursiva com base nas alternativas."""
    tem_alternativas = bool(re.search(r'(?m)^\(([A-E])\)\s*(.+)$', enunciado or ""))
    gabarito_e_letra = str(gabarito or "").strip().upper() in ("A", "B", "C", "D", "E")
    return "objetiva" if (tem_alternativas or gabarito_e_letra) else "discursiva"

def pegar_conexao(forcar_reload: bool = False) -> sqlite3.Connection:
    """
    Retorna uma conexão DB-API 2.0 (compatível com sqlite3 e pandas.read_sql)
    populada com todos os dados mais recentes do Supabase.
    """
    global _cached_con
    if _cached_con is not None and not forcar_reload:
        return _cached_con

    supabase = get_supabase()
    con = sqlite3.connect(":memory:")
    con.row_factory = sqlite3.Row

    # 1. Carrega questoes
    try:
        res = supabase.table("questoes").select("*").execute()
        if res.data:
            df = pd.DataFrame(res.data)
            df.to_sql("questoes", con, index=False)
        else:
            con.execute("""
                CREATE TABLE questoes (
                    id INTEGER PRIMARY KEY,
                    materia TEXT,
                    topico TEXT,
                    subtopico TEXT,
                    dificuldade INTEGER,
                    banca TEXT,
                    ano INTEGER,
                    enunciado TEXT,
                    figura_path TEXT,
                    gabarito TEXT,
                    estrategias_esperadas TEXT,
                    tipo TEXT DEFAULT 'objetiva',
                    criado_em TEXT
                )
            """)
    except Exception as e:
        print(f"Aviso ao carregar questoes: {e}")

    # 2. Carrega usuarios
    try:
        res = supabase.table("usuarios").select("*").execute()
        if res.data:
            df = pd.DataFrame(res.data)
            df.to_sql("usuarios", con, index=False)
        else:
            con.execute("""
                CREATE TABLE usuarios (
                    id INTEGER PRIMARY KEY,
                    nome TEXT,
                    email TEXT,
                    senha_hash TEXT,
                    cpf TEXT,
                    idade INTEGER,
                    celular TEXT,
                    cep TEXT,
                    logradouro TEXT,
                    numero TEXT,
                    bairro TEXT,
                    cidade TEXT,
                    estado TEXT,
                    motivos TEXT,
                    escolaridade TEXT,
                    faculdade TEXT,
                    curso TEXT,
                    concursos_foco TEXT,
                    verificado INTEGER DEFAULT 0,
                    criado_em TEXT
                )
            """)
    except Exception as e:
        print(f"Aviso ao carregar usuarios: {e}")

    # 3. Carrega tentativas
    try:
        res = supabase.table("tentativas").select("*").execute()
        if res.data:
            df = pd.DataFrame(res.data)
            df.to_sql("tentativas", con, index=False)
        else:
            con.execute("""
                CREATE TABLE tentativas (
                    id INTEGER PRIMARY KEY,
                    aluno_id INTEGER,
                    questao_id INTEGER,
                    acertou INTEGER,
                    tempo_segundos INTEGER,
                    tipo_erro TEXT,
                    estrategia_usada TEXT,
                    resposta_submetida TEXT,
                    data_hora TEXT
                )
            """)
    except Exception:
        con.execute("CREATE TABLE IF NOT EXISTS tentativas (id INTEGER PRIMARY KEY, aluno_id INTEGER, questao_id INTEGER, acertou INTEGER, tempo_segundos INTEGER, tipo_erro TEXT, estrategia_usada TEXT, data_hora TEXT)")

    # 4. Carrega revisao_espacada
    try:
        res = supabase.table("revisao_espacada").select("*").execute()
        if res.data:
            df = pd.DataFrame(res.data)
            df.to_sql("revisao_espacada", con, index=False)
        else:
            con.execute("""
                CREATE TABLE revisao_espacada (
                    id INTEGER PRIMARY KEY,
                    aluno_id INTEGER,
                    item_tipo TEXT,
                    item_id INTEGER,
                    fator_facilidade REAL,
                    intervalo_dias INTEGER,
                    repeticoes INTEGER,
                    proxima_revisao TEXT
                )
            """)
    except Exception:
        con.execute("CREATE TABLE IF NOT EXISTS revisao_espacada (id INTEGER PRIMARY KEY, aluno_id INTEGER, item_tipo TEXT, item_id INTEGER, fator_facilidade REAL, intervalo_dias INTEGER, repeticoes INTEGER, proxima_revisao TEXT)")

    # 5. Tabelas auxiliares
    con.execute("CREATE TABLE IF NOT EXISTS sessoes_lembradas (id INTEGER PRIMARY KEY, usuario_id INTEGER, token TEXT, criado_em TEXT, expira_em TEXT)")
    con.execute("CREATE TABLE IF NOT EXISTS codigos_verificacao (id INTEGER PRIMARY KEY, usuario_id INTEGER, codigo TEXT, criado_em TEXT, expira_em TEXT)")
    con.execute("CREATE TABLE IF NOT EXISTS conceitos (id INTEGER PRIMARY KEY, materia TEXT, topico TEXT, nome TEXT, gatilho TEXT, acao_ou_teorema TEXT, formula_latex TEXT)")

    _cached_con = con
    return con

def inserir_questao(
    materia: str,
    topico: str,
    enunciado: str,
    gabarito: Optional[str] = None,
    subtopico: Optional[str] = None,
    dificuldade: Optional[int] = None,
    banca: Optional[str] = None,
    ano: Optional[int] = None,
    estrategias_esperadas: Optional[Any] = None,
    figura_path: Optional[str] = None,
    tipo: Optional[str] = None,
    mathnet_id: Optional[str] = None,
    edicao: Optional[str] = None,
    etapa: Optional[str] = None,
    tipo_material: Optional[str] = None,
    pais: Optional[str] = None,
    solucao: Optional[str] = None,
) -> int:
    """Insere no Supabase e espelha na memória local."""
    supabase = get_supabase()

    if isinstance(estrategias_esperadas, list):
        estrategias_esperadas = json.dumps(estrategias_esperadas, ensure_ascii=False)

    if tipo not in ("objetiva", "discursiva"):
        tipo = _classificar_tipo(enunciado, gabarito)

    if dificuldade is not None:
        try:
            dificuldade = int(dificuldade)
            if not (1 <= dificuldade <= 5):
                dificuldade = None
        except Exception:
            dificuldade = None

    if ano is not None:
        try:
            ano = int(ano)
        except Exception:
            ano = None

    payload = {
        "materia": materia,
        "topico": topico,
        "subtopico": subtopico,
        "dificuldade": dificuldade,
        "banca": banca,
        "ano": ano,
        "enunciado": enunciado,
        "figura_path": figura_path,
        "gabarito": gabarito,
        "estrategias_esperadas": estrategias_esperadas,
        "tipo": tipo or "objetiva",
        "edicao": edicao,
        "etapa": etapa,
        "tipo_material": tipo_material,
        "pais": pais,
        "solucao": solucao,
        "mathnet_id": mathnet_id,
    }

    resp = supabase.table("questoes").insert(payload).execute()
    if not resp.data or len(resp.data) == 0:
        raise RuntimeError(f"Falha ao inserir no Supabase: {resp}")

    novo_id = resp.data[0]["id"]

    # Atualiza espelho local em memória
    if _cached_con is not None:
        try:
            cur = _cached_con.cursor()
            cur.execute("""
                INSERT INTO questoes (id, materia, topico, subtopico, dificuldade, banca, ano, enunciado, figura_path, gabarito, estrategias_esperadas, tipo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                novo_id, materia, topico, subtopico, dificuldade, banca, ano, enunciado, figura_path, gabarito, estrategias_esperadas, tipo
            ))
            _cached_con.commit()
        except Exception:
            pass

    return novo_id

def inserir_questoes_lote(
    questoes: List[Dict[str, Any]],
    chunk_size: int = 50,
) -> int:
    """
    Insere lote de questões no Supabase com validação e paginação em blocos.
    Retorna o total de questões salvas com sucesso.
    """
    if not questoes:
        return 0

    supabase = get_supabase()
    total_inseridos = 0

    for i in range(0, len(questoes), chunk_size):
        chunk = questoes[i : i + chunk_size]
        payloads_formatados = []

        for q in chunk:
            enunciado = q.get("enunciado") or ""
            gabarito = q.get("gabarito")
            tipo = q.get("tipo")
            if tipo not in ("objetiva", "discursiva"):
                tipo = _classificar_tipo(enunciado, gabarito)

            dificuldade = q.get("dificuldade")
            if dificuldade is not None:
                try:
                    dificuldade = int(dificuldade)
                    if not (1 <= dificuldade <= 5):
                        dificuldade = None
                except Exception:
                    dificuldade = None

            ano = q.get("ano")
            if ano is not None:
                try:
                    ano = int(ano)
                except Exception:
                    ano = None

            estrategias = q.get("estrategias_esperadas")
            if isinstance(estrategias, list):
                estrategias = json.dumps(estrategias, ensure_ascii=False)

            payloads_formatados.append({
                "materia": q.get("materia", "Matemática"),
                "topico": q.get("topico", "Geral"),
                "subtopico": q.get("subtopico"),
                "dificuldade": dificuldade,
                "banca": q.get("banca"),
                "ano": ano,
                "enunciado": enunciado,
                "figura_path": q.get("figura_path"),
                "gabarito": gabarito,
                "estrategias_esperadas": estrategias,
                "tipo": tipo or "discursiva",
                "edicao": q.get("edicao"),
                "etapa": q.get("etapa"),
                "tipo_material": q.get("tipo_material"),
                "pais": q.get("pais"),
                "solucao": q.get("solucao"),
                "mathnet_id": q.get("mathnet_id"),
            })

        try:
            resp = supabase.table("questoes").upsert(
                payloads_formatados,
                on_conflict="mathnet_id"
            ).execute()
            if resp.data:
                total_inseridos += len(resp.data)
        except Exception as e:
            # Fallback se upsert falhar por falta de constraint direta
            resp = supabase.table("questoes").insert(payloads_formatados).execute()
            if resp.data:
                total_inseridos += len(resp.data)

    return total_inseridos


def listar_questoes(
    materia: Optional[str] = None,
    topico: Optional[str] = None,
    banca: Optional[str] = None,
    limit: Optional[int] = None
) -> List[Dict[str, Any]]:
    """Retorna todas as questões cadastradas no Supabase."""
    supabase = get_supabase()
    query = supabase.table("questoes").select("*")
    if materia: query = query.eq("materia", materia)
    if topico: query = query.eq("topico", topico)
    if banca: query = query.eq("banca", banca)
    if limit: query = query.limit(limit)
    res = query.execute()
    return res.data or []

def buscar_questao_por_id(questao_id: int) -> Optional[Dict[str, Any]]:
    """Busca uma questão pelo ID."""
    supabase = get_supabase()
    res = supabase.table("questoes").select("*").eq("id", questao_id).execute()
    return res.data[0] if (res.data and len(res.data) > 0) else None

def excluir_questao(questao_id: int, reordenar: bool = True) -> bool:
    """Exclui uma questão pelo ID no Supabase e na memória."""
    supabase = get_supabase()
    resp = supabase.table("questoes").delete().eq("id", questao_id).execute()
    if _cached_con is not None:
        try:
            _cached_con.execute("DELETE FROM questoes WHERE id = ?", (questao_id,))
            _cached_con.commit()
        except Exception:
            pass
    return bool(resp.data)

def limpar_questoes(confirmar: bool = False):
    """Zera a tabela de questoes no Supabase e no espelho local quando confirmar=True."""
    global _cached_con
    if not confirmar:
        print("⚠️ Para resetar todas as questões no Supabase, use: limpar_questoes(confirmar=True)")
        return False
    supabase = get_supabase()
    try:
        supabase.table("questoes").delete().gt("id", 0).execute()
        if _cached_con is not None:
            _cached_con.execute("DELETE FROM questoes")
            _cached_con.commit()
        print("✅ Tabela 'questoes' resetada com sucesso!")
        return True
    except Exception as e:
        print(f"❌ Erro ao limpar questoes: {e}")
        return False

def total_questoes() -> int:
    """Contagem exata de questões."""
    supabase = get_supabase()
    res = supabase.table("questoes").select("id", count="exact").execute()
    return res.count or 0

def reportar_questao(questao_id: int, motivo: str, descricao: str = "", aluno_id: Optional[int] = None) -> int:
    """Registra reporte de questão."""
    supabase = get_supabase()
    payload = {
        "questao_id": questao_id,
        "motivo": motivo,
        "descricao": descricao,
        "aluno_id": aluno_id
    }
    try:
        res = supabase.table("questoes_reportadas").insert(payload).execute()
        return res.data[0]["id"] if res.data else 0
    except Exception:
        return 0

# Alias de conveniência
get_supabase_client = get_supabase

__all__ = [
    "pegar_conexao",
    "obter_status_banco",
    "inserir_questao",
    "inserir_questoes_lote",
    "listar_questoes",
    "buscar_questao_por_id",
    "excluir_questao",
    "limpar_questoes",
    "reportar_questao",
    "total_questoes",
    "get_supabase",
    "get_supabase_client",
]
