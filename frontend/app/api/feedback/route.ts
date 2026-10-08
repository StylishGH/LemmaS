import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      questao_id,
      aluno_id,
      tipo = "diagnostico_ia",
      util,
      concorda_diagnostico,
      modelo_ia = "Gemini Flash Lite",
      confianca_ia,
      comentario,
      metadados = {},
    } = body;

    // Garante que pelo menos uma avaliação foi enviada
    if (util === undefined && concorda_diagnostico === undefined) {
      return NextResponse.json(
        { error: "É necessário informar ao menos um parâmetro de avaliação ('util' ou 'concorda_diagnostico')." },
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

    const mergedMetadados = {
      ...metadados,
      original_questao_id: questao_id,
      original_aluno_id: aluno_id,
    };

    const { data, error } = await supabase
      .from("feedbacks_aluno")
      .insert({
        questao_id: validQuestaoId,
        aluno_id: validAlunoId,
        tipo,
        util: typeof util === "boolean" ? util : null,
        concorda_diagnostico: typeof concorda_diagnostico === "boolean" ? concorda_diagnostico : null,
        modelo_ia,
        confianca_ia: confianca_ia ? String(confianca_ia) : null,
        comentario: comentario || null,
        metadados: mergedMetadados,
      })
      .select("id, criado_em")
      .single();

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
