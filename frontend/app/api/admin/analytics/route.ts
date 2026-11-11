import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const allowedWindows = new Set([24, 168, 720]);

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Faça login para acessar este painel." }, { status: 401 });
  }

  const hours = Number(request.nextUrl.searchParams.get("hours") || "24");
  if (!allowedWindows.has(hours)) {
    return NextResponse.json({ error: "Período inválido." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("admin_get_analytics", { p_hours: hours });
  if (error) {
    if (error.code === "42501") {
      return NextResponse.json({ error: "Acesso restrito à equipe administradora." }, { status: 403 });
    }

    console.error("Falha ao carregar analytics administrativo:", error.message);
    return NextResponse.json({ error: "Não foi possível carregar as métricas." }, { status: 503 });
  }

  return NextResponse.json(data, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
