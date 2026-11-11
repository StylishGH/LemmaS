#!/usr/bin/env python3
"""Script de Engenharia e Extração de Datasets para ML / Fine-Tuning e Ciência de Dados.

Plataforma LEMMAS (Powered by MathAI Engine)

Exporta com integridade matemática e epistemológica:
1. SFT Dataset (JSONL): Tuplas (Instrução, Resolução do Aluno, Diagnóstico Padrão-Ouro da IA).
2. TRI & Análise de Distratores (CSV/Parquet): Matriz (Aluno x Item x Alternativa Marcada x Acerto).
3. Telemetria de Inferência (JSONL): Auditoria de latência, tokens consumidos e vereditos.

Uso:
    python scripts/export_ml_sft_dataset.py
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import dotenv_values


def get_supabase_client():
    from supabase import create_client

    env_paths = [
        Path("frontend/.env.local"),
        Path("backend/.env"),
        Path(".env"),
    ]
    cfg = {}
    for p in env_paths:
        if p.exists():
            cfg.update(dotenv_values(str(p)))

    url = cfg.get("NEXT_PUBLIC_SUPABASE_URL") or cfg.get("SUPABASE_URL")
    key = cfg.get("SUPABASE_SERVICE_ROLE_KEY") or cfg.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") or cfg.get("SUPABASE_KEY")

    if not url or not key:
        raise RuntimeError("Variáveis de ambiente do Supabase não encontradas.")

    return create_client(url, key)


def extract_answer_from_annotations(anotacoes: Optional[str]) -> Optional[str]:
    """Extrai a alternativa marcada caso a coluna resposta_aluno não esteja populada."""
    if not anotacoes:
        return None
    match = re.search(r"\[RESPOSTA:([^\]]+)\]", anotacoes)
    if match:
        return match.group(1).strip()
    return None


def extract_justification_from_annotations(anotacoes: Optional[str]) -> Optional[str]:
    """Extrai o texto bruto digitado pelo aluno a partir das anotações estruturadas."""
    if not anotacoes:
        return None
    match = re.search(r"\[JUSTIFICATIVA_BRUTA:(.*?)\](?:\s*\[|$)", anotacoes)
    if match:
        return match.group(1).strip()
    return None


def export_datasets(output_dir: Path = Path("data/exports")):
    output_dir.mkdir(parents=True, exist_ok=True)
    sb = get_supabase_client()

    print("\n🔍 [LEMMAS Data Engineering] Extraindo tentativas e avaliações do Supabase...")

    # 1. Tenta carregar diretamente da view analítica canonical vw_sft_dataset_export
    view_rows = []
    try:
        view_res = sb.table("vw_sft_dataset_export").select("*").order("data_tentativa", desc=True).limit(5000).execute()
        view_rows = view_res.data or []
    except Exception as e:
        print(f"ℹ️ View analítica não disponível ({e}), utilizando tabelas base...")

    if view_rows:
        print(f"✓ {len(view_rows)} registros carregados via view analítica canônica (vw_sft_dataset_export).")
        sft_rows: List[Dict[str, Any]] = []
        tri_rows: List[Dict[str, Any]] = []

        for row in view_rows:
            # Linha para TRI / Psicometria
            tri_rows.append({
                "tentativa_id": row["tentativa_id"],
                "questao_id": row["questao_id"],
                "materia": row.get("materia"),
                "banca": row.get("banca"),
                "ano": row.get("ano"),
                "gabarito_oficial": (row.get("gabarito_oficial") or "").strip().upper(),
                "resposta_marcada": (row.get("resposta_aluno") or "").strip().upper(),
                "acertou": row["acertou"],
                "tempo_segundos": row.get("tempo_segundos"),
                "data_hora": row.get("data_tentativa"),
            })

            # Linha para SFT se houver avaliação da IA
            if row.get("avaliacao_id") and row.get("output_estruturado"):
                out = row["output_estruturado"]
                veredito = out.get("veredito") or "inconclusivo"
                diagnostico = out.get("diagnostico") or out.get("feedback_latex") or ""
                erros = out.get("erros_identificados") or []

                user_content = f"QUESTÃO:\n{row.get('enunciado', '')}\n\nGABARITO OFICIAL:\n{row.get('gabarito_oficial', '')}\n\n"
                if row.get("texto_resolucao"):
                    user_content += f"RESOLUÇÃO DO ALUNO (TEXTO):\n{row['texto_resolucao']}\n\n"
                if row.get("imagem_resolucao_path"):
                    user_content += f"RESOLUÇÃO DO ALUNO (IMAGEM/LOUSA):\n{row['imagem_resolucao_path']}\n\n"
                if row.get("resposta_aluno"):
                    user_content += f"RESPOSTA INDICADA:\n{row['resposta_aluno']}\n\n"

                assistant_content = json.dumps({
                    "veredito": veredito,
                    "diagnostico": diagnostico,
                    "erros_identificados": erros,
                    "etapas_corretas": out.get("etapas_corretas", []),
                }, ensure_ascii=False)

                sft_rows.append({
                    "tentativa_id": row["tentativa_id"],
                    "questao_id": row["questao_id"],
                    "messages": [
                        {
                            "role": "system",
                            "content": "Você é o Avaliador Cognitivo de Matemática do LEMMAS (MathAI Engine). Avalie a resolução do estudante com rigor axiomático.",
                        },
                        {"role": "user", "content": user_content.strip()},
                        {"role": "assistant", "content": assistant_content},
                    ],
                    "metadata": {
                        "model_evaluator": row.get("nome_modelo"),
                        "acertou": row["acertou"],
                        "data_hora": row.get("data_tentativa"),
                    },
                })

        # Gravação
        sft_path = output_dir / "lemmas_sft_dataset.jsonl"
        with open(sft_path, "w", encoding="utf-8") as f:
            for r in sft_rows:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")

        tri_path = output_dir / "tri_distractor_analysis.json"
        with open(tri_path, "w", encoding="utf-8") as f:
            json.dump(tri_rows, f, ensure_ascii=False, indent=2)

        try:
            import pandas as pd
            df_tri = pd.DataFrame(tri_rows)
            csv_path = output_dir / "tri_distractor_analysis.csv"
            df_tri.to_csv(csv_path, index=False)
            parquet_path = output_dir / "tri_distractor_analysis.parquet"
            df_tri.to_parquet(parquet_path, index=False)
            print(f"✓ Pandas export: {csv_path} e {parquet_path}")
        except ImportError:
            pass

        print(f"\n🚀 [Exportação Concluída com Sucesso via View Canônica!]")
        print(f"  • SFT Dataset: {sft_path} ({len(sft_rows)} instâncias)")
        print(f"  • TRI / Distratores: {tri_path} ({len(tri_rows)} tentativas)")
        return

    # Fallback para tabelas individuais caso a view não exista
    tentativas_res = (
        sb.table("tentativas")
        .select("*")
        .order("data_hora", desc=True)
        .limit(2000)
        .execute()
    )
    tentativas = tentativas_res.data or []
    print(f"✓ {len(tentativas)} tentativas carregadas.")

    if not tentativas:
        print("Nenhuma tentativa encontrada no banco.")
        return

    # 2. Carrega questões relacionadas
    q_ids = list({t["questao_id"] for t in tentativas if t.get("questao_id")})
    questoes_map: Dict[int, Dict[str, Any]] = {}
    for i in range(0, len(q_ids), 100):
        chunk = q_ids[i : i + 100]
        q_res = sb.table("questoes").select("id, materia, topico, subtopico, banca, ano, dificuldade, tipo, enunciado, gabarito").in_("id", chunk).execute()
        for q in q_res.data or []:
            questoes_map[q["id"]] = q

    print(f"✓ {len(questoes_map)} questões associadas mapeadas.")

    # 3. Carrega avaliações de IA
    tentativa_ids = [t["id"] for t in tentativas]
    avaliacoes_map: Dict[int, Dict[str, Any]] = {}
    for i in range(0, len(tentativa_ids), 100):
        chunk = tentativa_ids[i : i + 100]
        eval_res = sb.table("avaliacoes_ia").select("id, tentativa_id, provedor_modelo, nome_modelo, versao_prompt, latencia_ms, output_raw, output_estruturado, confianca").in_("tentativa_id", chunk).execute()
        for a in eval_res.data or []:
            avaliacoes_map[a["tentativa_id"]] = a

    print(f"✓ {len(avaliacoes_map)} avaliações de IA associadas mapeadas.")

    # 4. Gera Dataset para SFT (Supervised Fine-Tuning)
    sft_rows: List[Dict[str, Any]] = []
    tri_rows: List[Dict[str, Any]] = []

    for t in tentativas:
        q = questoes_map.get(t["questao_id"], {})
        a = avaliacoes_map.get(t["id"])

        # Resposta do aluno (coluna dedicada ou extração de anotações)
        resposta_aluno = t.get("resposta_aluno") or extract_answer_from_annotations(t.get("anotacoes"))
        justificativa_aluno = t.get("texto_resolucao") or extract_justification_from_annotations(t.get("anotacoes"))
        imagem_path = t.get("imagem_resolucao_path")

        # 4.1 Linha para Psicometria / TRI
        tri_rows.append({
            "tentativa_id": t["id"],
            "aluno_id": t["aluno_id"],
            "questao_id": t["questao_id"],
            "materia": q.get("materia"),
            "topico": q.get("topico"),
            "banca": q.get("banca"),
            "ano": q.get("ano"),
            "dificuldade": q.get("dificuldade"),
            "gabarito_oficial": (q.get("gabarito") or "").strip().upper(),
            "resposta_marcada": (resposta_aluno or "").strip().upper(),
            "acertou": t["acertou"],
            "tempo_segundos": t["tempo_segundos"],
            "confianca_aluno": t["confianca_aluno"],
            "tipo_erro": t["tipo_erro"],
            "data_hora": t["data_hora"],
        })

        # 4.2 Linha para SFT se houver avaliação da IA
        if a and a.get("output_estruturado"):
            out = a["output_estruturado"]
            veredito = out.get("veredito") or "inconclusivo"
            diagnostico = out.get("diagnostico") or out.get("feedback_latex") or ""
            erros = out.get("erros_identificados") or []

            user_content = f"QUESTÃO:\n{q.get('enunciado', '')}\n\nGABARITO OFICIAL:\n{q.get('gabarito', '')}\n\n"
            if justificativa_aluno:
                user_content += f"RESOLUÇÃO DO ALUNO (TEXTO):\n{justificativa_aluno}\n\n"
            if imagem_path:
                user_content += f"RESOLUÇÃO DO ALUNO (IMAGEM/LOUSA):\n{imagem_path}\n\n"
            if resposta_aluno:
                user_content += f"RESPOSTA INDICADA:\n{resposta_aluno}\n\n"

            assistant_content = json.dumps({
                "veredito": veredito,
                "diagnostico": diagnostico,
                "erros_identificados": erros,
                "etapas_corretas": out.get("etapas_corretas", []),
            }, ensure_ascii=False)

            sft_rows.append({
                "tentativa_id": t["id"],
                "questao_id": t["questao_id"],
                "messages": [
                    {
                        "role": "system",
                        "content": "Você é o Avaliador Cognitivo de Matemática do LEMMAS (MathAI Engine). Avalie a resolução do estudante com rigor axiomático.",
                    },
                    {"role": "user", "content": user_content.strip()},
                    {"role": "assistant", "content": assistant_content},
                ],
                "metadata": {
                    "model_evaluator": a.get("nome_modelo"),
                    "latencia_ms": a.get("latencia_ms"),
                    "acertou": t["acertou"],
                    "data_hora": t["data_hora"],
                },
            })

    # Gravação dos arquivos
    sft_path = output_dir / "lemmas_sft_dataset.jsonl"
    with open(sft_path, "w", encoding="utf-8") as f:
        for r in sft_rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    tri_path = output_dir / "tri_distractor_analysis.json"
    with open(tri_path, "w", encoding="utf-8") as f:
        json.dump(tri_rows, f, ensure_ascii=False, indent=2)

    # Tenta exportar CSV / Parquet se Pandas estiver disponível
    try:
        import pandas as pd

        df_tri = pd.DataFrame(tri_rows)
        csv_path = output_dir / "tri_distractor_analysis.csv"
        df_tri.to_csv(csv_path, index=False)

        parquet_path = output_dir / "tri_distractor_analysis.parquet"
        df_tri.to_parquet(parquet_path, index=False)
        print(f"✓ Pandas export: {csv_path} e {parquet_path}")
    except ImportError:
        pass

    print(f"\n🚀 [Exportação Concluída com Sucesso!]")
    print(f"  • SFT Dataset: {sft_path} ({len(sft_rows)} instâncias)")
    print(f"  • TRI / Distratores: {tri_path} ({len(tri_rows)} tentativas)")


if __name__ == "__main__":
    export_datasets()
