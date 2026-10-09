import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { extrairEnunciadoEAlternativas, corrigirLatex } from "@/lib/math-parser";

export async function GET() {
  const supabase = await createClient();
  try {
    // Busca uma questão aleatória do Supabase
    const { data, error } = await supabase
      .from("questoes")
      .select("*")
      .limit(50);

    if (error || !data || data.length === 0) {
      return NextResponse.json(
        { error: error?.message || "Nenhuma questão encontrada" },
        { status: 404 }
      );
    }

    const randomIndex = Math.floor(Math.random() * data.length);
    const q = data[randomIndex];
    const parsed = extrairEnunciadoEAlternativas(q.enunciado);

    return NextResponse.json({
      ...q,
      enunciado_limpo: corrigirLatex(parsed.corpo),
      alternativas: parsed.alternativas,
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
