import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = (process.env.LEMMAS_BACKEND_URL || "https://mathai-7i7r.onrender.com").replace(/\/$/, "");
const GEMINI_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
  "gemini-3-flash-preview",
];

async function callGeminiDirect({
  enunciado,
  gabarito,
  justificativa,
  cleanImage,
  mimeType,
}: {
  enunciado: string;
  gabarito?: string;
  justificativa?: string;
  cleanImage?: string;
  mimeType?: string;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Chave GEMINI_API_KEY não configurada no servidor.");

  const promptText = `Você é o MathAI Engine, o motor cognitivo e tutor de matemática do ecossistema LEMMAS (voltado para preparação em alto nível para vestibulares e concursos militares como EFOMM, AFA, IME, ITA, CEDERJ, ESA).

QUESTÃO:
${enunciado}

GABARITO OFICIAL:
${gabarito ? `Alternativa (${gabarito})` : "Gabarito não especificado"}

CONTEXTO DO ESTUDANTE:
${justificativa || "O estudante solicitou a explicação detalhada e a resolução passo a passo da questão."}

DIRETRIZES DIDÁTICAS E PEDAGÓGICAS OBRIGATÓRIAS:
1. Apresente a resolução axiomática passo a passo completa, detalhando cada manipulação algébrica, geométrica ou lógica.
2. Utilize SEMPRE LaTeX válido formatado com $ para equações inline e $$ para blocos destacados (KaTeX).
3. Se o estudante assinalou uma alternativa incorreta, aponte a pegadinha clássica (distrator), o erro de interpretação ou a armadilha conceitual.
4. Destaque obrigatoriamente um LEMA FUNDAMENTAL, fórmula ou princípio teórico determinante (ex: Relações de Girard, Teorema de Menelaus, Desigualdade das Médias, Bhaskara, etc.).
5. Retorne EXCLUSIVAMENTE um objeto JSON válido (sem blocos markdown em volta) com os campos:
{
  "status_resolucao": "correto" | "incorreto" | "incompleto",
  "diagnostico": "Resolução passo a passo completa explicada com LaTeX...",
  "dica_proximo_passo": "Lema fundamental ou conceito-chave determinante com fórmulas em LaTeX...",
  "estrategia_identificada": "Nome da técnica ou estratégia matemática principal",
  "confianca_diagnostico": "alta"
}`;

  const parts: Array<Record<string, any>> = [{ text: promptText }];
  if (cleanImage) {
    parts.push({
      inlineData: {
        mimeType: mimeType || "image/png",
        data: cleanImage,
      },
    });
  }

  let lastError: any = null;
  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
        signal: AbortSignal.timeout(18000),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini ${model} HTTP ${res.status}: ${errText.slice(0, 300)}`);
      }

      const data = await res.json();
      const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawJson) throw new Error(`Gemini ${model} não retornou conteúdo`);

      const parsed = JSON.parse(rawJson);
      return {
        status_resolucao: parsed.status_resolucao || "correto",
        diagnostico: parsed.diagnostico || "Resolução passo a passo indisponível.",
        dica_proximo_passo: parsed.dica_proximo_passo || "",
        estrategia_identificada: parsed.estrategia_identificada || "Dedução Axiomática",
        modelo: `${model} (MathAI Engine)`,
        provedor: "google",
        confianca: parsed.confianca_diagnostico || "alta",
      };
    } catch (err) {
      lastError = err;
      console.warn(`[MathAI] Tentativa com ${model} falhou:`, err);
    }
  }

  throw lastError || new Error("Todos os modelos da cascata Gemini falharam.");
}

export async function POST(req: NextRequest) {
  try {
    const authorization = req.headers.get("authorization");
    const body = await req.json();
    const { enunciado, gabarito, justificativa, imagem_base64 } = body;
    if (!enunciado || typeof enunciado !== "string") {
      return NextResponse.json({ error: "Enunciado é obrigatório." }, { status: 400 });
    }

    let mimeType = "image/png";
    let cleanImage = imagem_base64 || undefined;
    if (typeof imagem_base64 === "string" && imagem_base64.startsWith("data:")) {
      const match = imagem_base64.match(/^data:([^;]+);base64,(.*)$/);
      if (match) {
        mimeType = match[1];
        cleanImage = match[2];
      }
    }

    // 1. Tentar primeiro o backend FastAPI (Render) se houver autorização
    if (authorization?.startsWith("Bearer ")) {
      try {
        const response = await fetch(BACKEND_URL + "/api/tutor/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: authorization },
          body: JSON.stringify({
            enunciado,
            gabarito: gabarito || "",
            justificativa_texto: justificativa || "",
            imagem_base64: cleanImage,
            mime_type: mimeType,
          }),
          signal: AbortSignal.timeout(8000), // 8s timeout para evitar cold-start freeze
          cache: "no-store",
        });

        if (response.ok) {
          const raw = await response.text();
          let data: Record<string, any>;
          try {
            data = JSON.parse(raw);
          } catch {
            data = { detail: raw.slice(0, 500) };
          }
          return NextResponse.json({
            ...data,
            status_resolucao: data.status_resolucao || "incompleto",
            diagnostico: data.diagnostico || "Não foi possível produzir um diagnóstico detalhado.",
            modelo: data.model_name || "MathAI Backend",
            provedor: data.model_provider || "lemmas",
            confianca: data.confianca_diagnostico || "alta",
          });
        }
      } catch (backendErr) {
        console.warn("[MathAI] Backend Render indisponível/lento, ativando fallback Gemini Flash-Lite:", backendErr);
      }
    }

    // 2. Fallback resiliente direto para Gemini Flash-Lite (sub-segundo)
    try {
      const geminiResult = await callGeminiDirect({
        enunciado,
        gabarito,
        justificativa,
        cleanImage,
        mimeType,
      });
      return NextResponse.json(geminiResult);
    } catch (geminiErr: any) {
      console.error("[MathAI] Erro no fallback Gemini:", geminiErr);
      return NextResponse.json(
        { error: "Não foi possível gerar a explicação no momento. Tente novamente em instantes." },
        { status: 502 }
      );
    }
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro desconhecido no MathAI Engine" },
      { status: 500 }
    );
  }
}

