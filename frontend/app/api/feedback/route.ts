import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  try {
    const body = await req.json();
    const {
      questao_id,
      aluno_id,
      tentativa_id,
      avaliacao_ia_id,
      tipo = "diagnostico_ia",
      util,
      concorda_diagnostico,
      modelo_ia = "Gemini Flash Lite",
      confianca_ia,
      comentario,
      metadados = {},
    } = body;

    // Garante que pelo menos uma avaliação ou relato foi enviado
    const isReportOrComment =
      tipo === "report_erro" ||
      tipo === "inconsistencia" ||
      tipo === "sugestao" ||
      Boolean(comentario && String(comentario).trim().length > 0) ||
      tipo !== "diagnostico_ia";

    if (!isReportOrComment && util === undefined && concorda_diagnostico === undefined) {
      return NextResponse.json(
        { error: "É necessário informar ao menos um parâmetro de avaliação ('util' ou 'concorda_diagnostico') ou um relato/comentário." },
        { status: 400 }
      );
    }

    const questaoIdNum = questao_id ? parseInt(String(questao_id), 10) : null;
    const alunoIdNum = aluno_id ? parseInt(String(aluno_id), 10) : null;

    let validQuestaoId: number | null = null;
    if (questaoIdNum) {
      const { data: q } = await supabase
        .from("questoes")
        .select("id")
        .eq("id", questaoIdNum)
        .maybeSingle();
      if (q) {
        validQuestaoId = q.id;
      }
    }

    let validAlunoId: number | null = null;
    if (alunoIdNum) {
      const { data: u } = await supabase
        .from("usuarios")
        .select("id")
        .eq("id", alunoIdNum)
        .maybeSingle();
      if (u) {
        validAlunoId = u.id;
      }
    }

    const tentativaIdNum = tentativa_id ? parseInt(String(tentativa_id), 10) : null;
    const avaliacaoIaIdNum = avaliacao_ia_id ? parseInt(String(avaliacao_ia_id), 10) : null;

    const mergedMetadados = {
      ...metadados,
      original_questao_id: questao_id,
      original_aluno_id: aluno_id,
      tentativa_id: tentativaIdNum,
      avaliacao_ia_id: avaliacaoIaIdNum,
    };

    const feedbackPayload: Record<string, any> = {
      questao_id: validQuestaoId,
      aluno_id: validAlunoId,
      tipo,
      util: typeof util === "boolean" ? util : null,
      concorda_diagnostico: typeof concorda_diagnostico === "boolean" ? concorda_diagnostico : null,
      modelo_ia,
      confianca_ia: confianca_ia ? String(confianca_ia) : null,
      comentario: comentario || null,
      metadados: mergedMetadados,
    };

    let data: any = null;
    let error: any = null;

    // 1ª Tentativa: insere com tentativa_id e avaliacao_ia_id
    try {
      const res = await supabase
        .from("feedbacks_aluno")
        .insert({
          ...feedbackPayload,
          tentativa_id: tentativaIdNum,
          avaliacao_ia_id: avaliacaoIaIdNum,
        })
        .select("id, criado_em")
        .single();
      data = res.data;
      error = res.error;
    } catch (insertErr) {
      error = insertErr;
    }

    // Fallback resiliente caso as colunas ainda não existam no schema remoto
    if (error && (error.message?.includes("tentativa_id") || error.code === "PGRST204")) {
      const fallbackRes = await supabase
        .from("feedbacks_aluno")
        .insert(feedbackPayload)
        .select("id, criado_em")
        .single();
      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    // Sincroniza também na tabela canônica feedback_tentativa se tentativa_id for válido
    if (tentativaIdNum && !error) {
      try {
        await supabase.from("feedback_tentativa").insert({
          tentativa_id: tentativaIdNum,
          avaliacao_ia_id: avaliacaoIaIdNum,
          util: Boolean(util),
          concorda_diagnostico: Boolean(concorda_diagnostico),
          comentario_aluno: comentario || null,
        });
      } catch {
        // Silencioso se feedback_tentativa tiver RLS restrito
      }
    }

    if (error) {
      console.error("Erro ao inserir feedback no Supabase:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Feedback registrado com sucesso no Supabase.",
      id: data?.id,
      criado_em: data?.criado_em,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno ao processar feedback.";
    console.error("Erro no endpoint /api/feedback:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
