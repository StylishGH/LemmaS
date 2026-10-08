"""
Módulo de registro e análise de tentativas de resolução do MathAI.
Fase 1 (V1) - Rastreamento Cognitivo e Métricas do Estudante.
"""

from datetime import datetime, timedelta
import json
from src.database.db import pegar_conexao
from src.lemmas_core.sm2 import calcular_proximo_intervalo_sm2
from src.lemmas_core.cognitive_profile import atualizar_metricas_topico


def registrar_tentativa(
    questao_id: int,
    tempo_segundos: int,
    acertou: bool,
    aluno_id: int,
    estrategia_usada: str | None = None,
    tipo_erro: str = "nenhum",
    confianca_aluno: int = 3,
    anotacoes: str | None = None,
    imagem_resolucao_path: str | None = None
) -> int:
    """
    Registra uma nova sessão de resolução na tabela 'tentativas'
    e atualiza as métricas agregadas do estudante (perfil_aluno_topico)
    e o agendamento de repetição espaçada (SM-2) utilizando o LEMMAS Core.
    """
    con = pegar_conexao()
    cur = con.cursor()

    acertou_int = 1 if acertou else 0

    # 1. Inserir na tabela tentativas
    sql_tentativa = """
        INSERT INTO tentativas (
            questao_id, aluno_id, tempo_segundos, acertou, estrategia_usada,
            tipo_erro, confianca_aluno, anotacoes, imagem_resolucao_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    cur.execute(sql_tentativa, (
        questao_id, aluno_id, tempo_segundos, acertou_int, estrategia_usada,
        tipo_erro, confianca_aluno, anotacoes, imagem_resolucao_path
    ))
    tentativa_id = int(cur.lastrowid or 0)

    # 2. Buscar metadados da questão para atualizar perfil
    cur.execute("SELECT materia, topico FROM questoes WHERE id = ?", (questao_id,))
    q_meta = cur.fetchone()
    if q_meta:
        materia, topico = q_meta["materia"], q_meta["topico"]

        # Busca perfil atual do tópico para este aluno
        cur.execute(
            "SELECT * FROM perfil_aluno_topico WHERE aluno_id = ? AND materia = ? AND topico = ?",
            (aluno_id, materia, topico)
        )
        perfil = cur.fetchone()

        if perfil:
            metricas = atualizar_metricas_topico(
                total_tentativas_atual=perfil["total_tentativas"],
                total_acertos_atual=perfil["total_acertos"],
                tempo_medio_atual=perfil["tempo_medio_segundos"],
                acertou=acertou,
                tempo_segundos=tempo_segundos,
                estrategia_usada=estrategia_usada,
                estrategia_anterior=perfil.get("estrategia_favorita")
            )

            cur.execute("""
                UPDATE perfil_aluno_topico 
                SET total_tentativas = ?, total_acertos = ?, tempo_medio_segundos = ?, atualizado_em = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (metricas.total_tentativas, metricas.total_acertos, metricas.tempo_medio_segundos, perfil["id"]))
        else:
            cur.execute("""
                INSERT INTO perfil_aluno_topico (
                    aluno_id, materia, topico, total_tentativas, total_acertos, tempo_medio_segundos, estrategia_favorita
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (aluno_id, materia, topico, 1, acertou_int, float(tempo_segundos), estrategia_usada))

    # 3. Atualizar Repetição Espaçada (SM-2 puro via LEMMAS Core)
    cur.execute(
        "SELECT * FROM revisao_espacada WHERE aluno_id = ? AND item_tipo = 'questao' AND item_id = ?",
        (aluno_id, questao_id)
    )
    rev = cur.fetchone()

    rep_ant = rev["repeticoes"] if rev else 0
    fator_ant = rev["fator_facilidade"] if rev and "fator_facilidade" in rev.keys() and rev["fator_facilidade"] else 2.5
    int_ant = rev["intervalo_dias"] if rev else 1

    sm2_res = calcular_proximo_intervalo_sm2(
        repeticoes_anteriores=rep_ant,
        fator_facilidade_anterior=fator_ant,
        intervalo_dias_anterior=int_ant,
        acertou=acertou,
        confianca_ou_nota=confianca_aluno
    )

    if rev:
        cur.execute("""
            UPDATE revisao_espacada
            SET intervalo_dias = ?, repeticoes = ?, proxima_revisao = ?, ultima_revisao = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (sm2_res.intervalo_dias, sm2_res.repeticoes, sm2_res.proxima_revisao_data, rev["id"]))
    else:
        cur.execute("""
            INSERT INTO revisao_espacada (
                aluno_id, item_tipo, item_id, intervalo_dias, repeticoes, proxima_revisao
            ) VALUES (?, 'questao', ?, ?, ?, ?)
        """, (aluno_id, questao_id, sm2_res.intervalo_dias, sm2_res.repeticoes, sm2_res.proxima_revisao_data))

    con.commit()
    con.close()
    return tentativa_id


def obter_historico_tentativas(aluno_id: int, limite: int = 50):
    """Retorna as últimas tentativas com informações da questão associada."""
    con = pegar_conexao()
    cur = con.cursor()
    cur.execute("""
        SELECT 
            t.id, t.data_hora, t.tempo_segundos, t.acertou, t.estrategia_usada, 
            t.tipo_erro, t.confianca_aluno, t.anotacoes, t.imagem_resolucao_path,
            q.materia, q.topico, q.banca, q.ano, q.enunciado, q.gabarito
        FROM tentativas t
        JOIN questoes q ON t.questao_id = q.id
        WHERE t.aluno_id = ?
        ORDER BY t.data_hora DESC
        LIMIT ?
    """, (aluno_id, limite))
    historico = cur.fetchall()
    con.close()
    return historico


def obter_metricas_estudante(aluno_id: int):
    """
    Agrega dados de tentativas para alimentar o Dashboard do Estudante:
    - Métricas gerais (total, acertos, taxa, tempo médio)
    - Desempenho por matéria (para gráfico radar)
    - Distribuição de estratégias usadas
    - Distribuição de erros
    """
    con = pegar_conexao()
    cur = con.cursor()

    # 1. Totais Gerais
    cur.execute("""
        SELECT 
            COUNT(*) as total_resolvidas,
            COALESCE(SUM(acertou), 0) as total_acertos,
            COALESCE(AVG(tempo_segundos), 0) as tempo_medio
        FROM tentativas
        WHERE aluno_id = ?
    """, (aluno_id,))
    geral = cur.fetchone()

    total_resolvidas = geral["total_resolvidas"] if geral else 0
    total_acertos = geral["total_acertos"] if geral else 0
    tempo_medio = round(geral["tempo_medio"], 1) if geral and geral["tempo_medio"] else 0.0
    taxa_acerto = round((total_acertos / total_resolvidas * 100), 1) if total_resolvidas > 0 else 0.0

    # 2. Desempenho por Matéria
    cur.execute("""
        SELECT 
            q.materia,
            COUNT(t.id) as tentativas,
            SUM(t.acertou) as acertos,
            ROUND(AVG(t.acertou) * 100, 1) as taxa_acerto,
            ROUND(AVG(t.tempo_segundos), 1) as tempo_medio
        FROM tentativas t
        JOIN questoes q ON t.questao_id = q.id
        WHERE t.aluno_id = ?
        GROUP BY q.materia
    """, (aluno_id,))
    materias = cur.fetchall()

    # 3. Distribuição de Estratégias
    cur.execute("""
        SELECT 
            estrategia_usada,
            COUNT(*) as quantidade,
            SUM(acertou) as acertos
        FROM tentativas
        WHERE aluno_id = ? AND estrategia_usada IS NOT NULL AND estrategia_usada != ''
        GROUP BY estrategia_usada
        ORDER BY quantidade DESC
    """, (aluno_id,))
    estrategias = cur.fetchall()

    # 4. Distribuição de Erros (quando errou)
    cur.execute("""
        SELECT 
            tipo_erro,
            COUNT(*) as quantidade
        FROM tentativas
        WHERE aluno_id = ? AND acertou = 0 AND tipo_erro != 'nenhum'
        GROUP BY tipo_erro
        ORDER BY quantidade DESC
    """, (aluno_id,))
    erros = cur.fetchall()

    con.close()

    return {
        "total_resolvidas": total_resolvidas,
        "total_acertos": total_acertos,
        "taxa_acerto": taxa_acerto,
        "tempo_medio": tempo_medio,
        "materias": [dict(m) for m in materias],
        "estrategias": [dict(e) for e in estrategias],
        "erros": [dict(err) for err in erros]
    }


def salvar_diagnostico_ia(
    questao_id: int,
    diagnostico_dict: dict,
    aluno_id: int,
    tentativa_id: int | None = None,
    imagem_path: str | None = None,
    justificativa_texto: str | None = None
) -> int:
    """
    Salva a análise de raciocínio gerada pelo Gemini na tabela 'diagnosticos_ia'.
    Isso constrói o dataset para o futuro modelo local em PyTorch.
    """
    con = pegar_conexao()
    cur = con.cursor()

    passos_json = json.dumps(diagnostico_dict.get("passos", []), ensure_ascii=False)

    sql = """
        INSERT INTO diagnosticos_ia (
            tentativa_id, questao_id, aluno_id, modelo_gemini,
            imagem_path, justificativa_texto,
            transcricao_latex, passos_json, estrategia_identificada,
            status_resolucao, diagnostico, linha_do_erro, dica_proximo_passo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    cur.execute(sql, (
        tentativa_id,
        questao_id,
        aluno_id,
        diagnostico_dict.get("modelo_utilizado"),
        imagem_path,
        justificativa_texto,
        diagnostico_dict.get("transcricao_latex"),
        passos_json,
        diagnostico_dict.get("estrategia_identificada"),
        diagnostico_dict.get("status_resolucao"),
        diagnostico_dict.get("diagnostico"),
        diagnostico_dict.get("linha_do_erro"),
        diagnostico_dict.get("dica_proximo_passo")
    ))
    diag_id = int(cur.lastrowid or 0)
    con.commit()
    con.close()
    return diag_id


def registrar_dica_socratica(
    questao_id: int,
    aluno_id: int,
    nivel_dica: int,
    texto_dica: str,
    modelo_gemini: str = ""
) -> None:
    """
    Registra cada pedido de dica socrática no banco.
    Gera dados sobre o padrão de dependência de ajuda do aluno.
    """
    con = pegar_conexao()
    cur = con.cursor()
    cur.execute(
        "INSERT INTO log_dicas_socraticas (questao_id, aluno_id, nivel_dica, texto_dica, modelo_gemini) VALUES (?,?,?,?,?)",
        (questao_id, aluno_id, nivel_dica, texto_dica, modelo_gemini)
    )
    con.commit()
    con.close()

