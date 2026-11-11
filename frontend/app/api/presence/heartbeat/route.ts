import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const allowedSections = new Set(["resolver", "questoes", "other"]);

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user?.email) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let requestedSection = "other";
  try {
    const body = await request.json();
    if (typeof body?.section === "string" && allowedSections.has(body.section)) {
      requestedSection = body.section;
    }
  } catch {
    // Um body inválido registra apenas a presença geral.
  }

  const { data: student, error: studentError } = await supabase
    .from("usuarios")
    .select("id")
    .eq("email", user.email)
    .maybeSingle();

  if (studentError || !student) {
    return NextResponse.json({ error: "Perfil de estudante não encontrado." }, { status: 404 });
  }

  const { error: presenceError } = await supabase
    .from("student_presence")
    .upsert({
      student_id: student.id,
      last_seen_at: new Date().toISOString(),
      current_section: requestedSection,
    }, { onConflict: "student_id" });

  if (presenceError) {
    console.error("Falha ao registrar presença do estudante:", presenceError.message);
    return NextResponse.json({ error: "Não foi possível registrar a presença." }, { status: 503 });
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
