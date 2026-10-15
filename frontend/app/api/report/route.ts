import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  try {
    const body = await req.json();
    const { question_id, reason, description, motivo, detalhes } = body;

    const finalQuestionId = question_id ? Number(question_id) : null;
    const finalReason = reason || motivo || "outro";
    const finalDesc = description || detalhes || "";

    if (!finalQuestionId) {
      return NextResponse.json(
        { error: "question_id é obrigatório." },
        { status: 400 }
      );
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const { data, error } = await supabase
      .from("feedbacks_aluno")
      .insert({
        questao_id: finalQuestionId,
        aluno_id: null,
        tipo: "report_erro",
        comentario: `[${finalReason.toUpperCase()}] ${finalDesc.trim() || "Relato de inconsistência enviado pelo aluno."}`,
        metadados: {
          motivo: finalReason,
          detalhes: finalDesc.trim(),
          auth_user_id: session?.user?.id ?? null,
        },
      })
      .select("id, criado_em")
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("Erro no endpoint /api/report:", err);
    return NextResponse.json(
      { error: err.message ?? "Erro interno ao registrar relato." },
      { status: 500 }
    );
  }
}