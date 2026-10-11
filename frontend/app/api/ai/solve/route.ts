import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = (process.env.LEMMAS_BACKEND_URL || "https://mathai-7i7r.onrender.com").replace(/\/$/, "");

export async function POST(req: NextRequest) {
  try {
    const authorization = req.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return NextResponse.json({ error: "Sessão ausente. Entre novamente no Lemmas." }, { status: 401 });
    const body = await req.json();
    const { enunciado, gabarito, justificativa, imagem_base64 } = body;
    if (!enunciado || typeof enunciado !== "string") return NextResponse.json({ error: "Enunciado é obrigatório." }, { status: 400 });

    let mimeType = "image/png";
    let cleanImage = imagem_base64 || undefined;
    if (typeof imagem_base64 === "string" && imagem_base64.startsWith("data:")) {
      const match = imagem_base64.match(/^data:([^;]+);base64,(.*)$/s);
      if (match) { mimeType = match[1]; cleanImage = match[2]; }
    }
    const response = await fetch(BACKEND_URL + "/api/tutor/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authorization },
      body: JSON.stringify({ enunciado, gabarito: gabarito || "", justificativa_texto: justificativa || "", imagem_base64: cleanImage, mime_type: mimeType }),
      signal: AbortSignal.timeout(60000),
      cache: "no-store",
    });
    const raw = await response.text();
    let data: Record<string, any>;
    try { data = JSON.parse(raw); } catch { data = { detail: raw.slice(0, 500) }; }
    if (!response.ok) return NextResponse.json({ error: data.detail || data.error || ("Backend MathAI respondeu HTTP " + response.status) }, { status: response.status });
    return NextResponse.json({ ...data, status_resolucao: data.status_resolucao || "incompleto", diagnostico: data.diagnostico || "Não foi possível produzir um diagnóstico detalhado.", modelo: data.model_name, provedor: data.model_provider, confianca: data.confianca_diagnostico || "media" });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro desconhecido" }, { status: 502 });
  }
}
