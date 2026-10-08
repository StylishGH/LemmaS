import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const banca = searchParams.get("banca");
    const materia = searchParams.get("materia");
    const topico = searchParams.get("topico");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);
    const offset = (page - 1) * limit;

    let query = supabase
      .from("questoes")
      .select("id, materia, topico, subtopico, dificuldade, banca, ano, enunciado, gabarito, tipo", { count: "exact" });

    if (banca && banca !== "Todas") {
      query = query.eq("banca", banca);
    }
    if (materia && materia !== "Todas") {
      query = query.eq("materia", materia);
    }
    if (topico && topico !== "Todos") {
      query = query.eq("topico", topico);
    }
    if (search && search.trim() !== "") {
      query = query.ilike("enunciado", `%${search.trim()}%`);
    }

    query = query.order("id", { ascending: true }).range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      questoes: data || [],
      total: count || 0,
      page,
      limit,
      total_pages: count ? Math.ceil(count / limit) : 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
