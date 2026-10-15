import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = (process.env.LEMMAS_BACKEND_URL || "https://mathai-7i7r.onrender.com").replace(/\/$/, "");

export async function POST(req: NextRequest) {
  try {
    const authorization = req.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return NextResponse.json({ error: "Sessão ausente. Entre novamente no Lemmas." }, { status: 401 });
    const body = await req.json();
    const { enunciado, nivel = 1, pedagogicalPreference, pedagogical_preference, foco_concurso, motivacoes } = body;
    if (!enunciado || typeof enunciado !== "string") return NextResponse.json({ error: "Enunciado é obrigatório." }, { status: 400 });

    const pref = pedagogical_preference || pedagogicalPreference || "conceitual";

    const response = await fetch(BACKEND_URL + "/api/tutor/hint", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authorization },
      body: JSON.stringify({
        enunciado,
        level: Math.min(5, Math.max(1, Number(nivel) || 1)),
        topico: "Matemática",
        estrategias_esperadas: [],
        pedagogical_preference: pref,
        pedagogicalPreference: pref,
        foco_concurso: foco_concurso || null,
        motivacoes: Array.isArray(motivacoes) ? motivacoes : [],
      }),
      signal: AbortSignal.timeout(35000),
      cache: "no-store",
    });
    const raw = await response.text();
    let data: Record<string, any>;
    try { data = JSON.parse(raw); } catch { data = { detail: raw.slice(0, 500) }; }
    if (!response.ok) return NextResponse.json({ error: data.detail || data.error || ("Backend MathAI respondeu HTTP " + response.status) }, { status: response.status });
    return NextResponse.json({ nivel: data.level, dica: data.hint_text, modelo: data.model_used, provedor: data.provider, confianca: data.provider === "fallback" ? 0.5 : 0.9 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro desconhecido" }, { status: 502 });
  }
}
