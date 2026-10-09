import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { extrairEnunciadoEAlternativas, corrigirLatex } from "@/lib/math-parser";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  try {
    const { id } = await params;
    const qId = parseInt(id, 10);

    if (isNaN(qId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("questoes")
      .select("*")
      .eq("id", qId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Questão não encontrada" }, { status: 404 });
    }

    const parsed = extrairEnunciadoEAlternativas(data.enunciado);

    return NextResponse.json({
      ...data,
      enunciado_limpo: corrigirLatex(parsed.corpo),
      alternativas: parsed.alternativas,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
