import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// Fonte única dos números da vitrine (landing, raiz e cabeçalho do banco).
// Conta direto no banco com head:true, sem nenhum número fixo de fallback:
// se o banco falhar, a resposta é 503 com null, para a vitrine mostrar "—"
// em vez de um número antigo apresentado como se fosse atual.
export async function GET() {
  const supabase = await createClient();
  try {
    const [{ count: totalQuestoes, error: questoesError }, { count: totalLemas, error: lemasError }] =
      await Promise.all([
        supabase.from("questoes").select("*", { count: "exact", head: true }),
        supabase.from("lemmas").select("*", { count: "exact", head: true }),
      ]);

    if (questoesError || lemasError) {
      const message = questoesError?.message || lemasError?.message || "Erro ao contar o acervo";
      console.error("Exceção no /api/stats:", message);
      return NextResponse.json(
        { error: message, total_questoes: null, total_lemas: null },
        { status: 503 }
      );
    }

    return NextResponse.json({
      total_questoes: totalQuestoes ?? 0,
      total_lemas: totalLemas ?? 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("Exceção no /api/stats:", message);
    return NextResponse.json(
      { error: message, total_questoes: null, total_lemas: null },
      { status: 503 }
    );
  }
}
