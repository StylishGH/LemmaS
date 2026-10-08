import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
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

    return NextResponse.json(q, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
