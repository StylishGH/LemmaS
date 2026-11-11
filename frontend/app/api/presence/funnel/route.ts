import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const allowedStages = new Set(["landing", "questoes", "resolver", "tentativa"]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const stage = body?.stage;
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId.slice(0, 64) : null;
    const isAnonymous = Boolean(body?.isAnonymous ?? true);
    const referrer = typeof body?.referrer === "string" ? body.referrer.slice(0, 255) : null;

    if (!stage || !allowedStages.has(stage) || !sessionId) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let alunoId: number | null = null;
    if (user?.email) {
      const { data: student } = await supabase
        .from("usuarios")
        .select("id")
        .eq("email", user.email)
        .maybeSingle();
      if (student?.id) {
        alunoId = student.id;
      }
    }

    const { error: insertError } = await supabase
      .from("analytics_funnel_events")
      .insert({
        session_id: sessionId,
        stage,
        aluno_id: alunoId,
        is_anonymous: isAnonymous && !alunoId,
        referrer,
      });

    if (insertError) {
      // Falha graciosa se a tabela ainda não tiver sido criada no Supabase
      return NextResponse.json({ ok: true, notice: "Tabela pendente de migração física." }, { status: 200 });
    }

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ ok: true, notice: "Telemetria silenciosa." }, { status: 200 });
  }
}
