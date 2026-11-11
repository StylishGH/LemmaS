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

  // Consulta e agregação do Funil de Conversão e Abandono
  const attemptsCount = Number(data?.summary?.attempts ?? 0);
  const activeStudentsCount = Number(data?.summary?.activeStudents ?? 0);

  let funnel = {
    landing: 0,
    questoes: 0,
    resolver: 0,
    tentativas: attemptsCount,
    source: "estimated" as "database" | "estimated",
  };

  try {
    const cutoffDate = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    const { data: funnelRows, error: funnelError } = await supabase
      .from("analytics_funnel_events")
      .select("session_id, stage")
      .gte("created_at", cutoffDate);

    if (!funnelError && funnelRows && funnelRows.length > 0) {
      const stageSessions: Record<string, Set<string>> = {
        landing: new Set(),
        questoes: new Set(),
        resolver: new Set(),
        tentativa: new Set(),
      };

      for (const row of funnelRows) {
        if (stageSessions[row.stage]) {
          stageSessions[row.stage].add(row.session_id);
        }
      }

      const landingCount = Math.max(
        stageSessions.landing.size,
        stageSessions.questoes.size,
        stageSessions.resolver.size,
        attemptsCount
      );

      funnel = {
        landing: landingCount,
        questoes: stageSessions.questoes.size,
        resolver: stageSessions.resolver.size,
        tentativas: Math.max(stageSessions.tentativa.size, attemptsCount),
        source: "database",
      };
    } else {
      // Estimativa base enquanto a tabela recolhe os primeiros visitantes anônimos
      funnel = {
        landing: Math.max(activeStudentsCount * 3, attemptsCount * 2, 1),
        questoes: Math.max(activeStudentsCount * 2, attemptsCount, 1),
        resolver: Math.max(activeStudentsCount, attemptsCount),
        tentativas: attemptsCount,
        source: "estimated",
      };
    }
  } catch {
    // Tolerância a falhas se a migration física ainda não tiver sido executada
    funnel = {
      landing: Math.max(activeStudentsCount * 3, attemptsCount * 2, 1),
      questoes: Math.max(activeStudentsCount * 2, attemptsCount, 1),
      resolver: Math.max(activeStudentsCount, attemptsCount),
      tentativas: attemptsCount,
      source: "estimated",
    };
  }

  const enrichedData = {
    ...data,
    funnel,
  };

  return NextResponse.json(enrichedData, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
