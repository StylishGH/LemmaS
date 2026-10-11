import { NextRequest, NextResponse } from "next/server";

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_TEXT_MODEL = "nvidia/nemotron-3.5-lightning-30b-a3b";
const NVIDIA_VISION_MODEL = "nvidia/llama-3.1-nemotron-nano-vl-8b-v1";

function parseJsonResponse(raw: string): Record<string, unknown> {
  const cleaned = raw.trim().replace(/^\x60{3}(?:json)?\s*/i, "").replace(/\s*\x60{3}$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("O modelo não retornou um objeto JSON válido.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { enunciado, gabarito, justificativa, imagem_base64 } = body;

    if (!enunciado || typeof enunciado !== "string") {
      return NextResponse.json({ error: "Enunciado é obrigatório." }, { status: 400 });
    }

    const systemPrompt = `Você é o Avaliador Cognitivo do LEMMAS (MathAI Engine), especialista em Matemática e Pedagogia Socrática.
Analise o raciocínio do estudante (texto ou imagem de caderno/tablet), transcreva expressões em LaTeX e diagnostique:
1. Status: "correto", "erro_conta_sinal", "erro_algebra", "erro_conceitual", "erro_interpretacao" ou "incompleto".
2. Parecer pedagógico detalhado sem entregar a resposta de bandeja.
3. A linha ou etapa exata do erro, se houver.
4. Uma provocação reflexiva para destravar o aluno.

Retorne SOMENTE um JSON válido com as chaves:
{
  "status_resolucao": string,
  "transcricao_latex": string,
  "diagnostico": string,
  "linha_do_erro": string,
  "dica_proximo_passo": string,
  "estrategia_identificada": string,
  "nivel_confianca": number
}`;

    const textoUsuario = `Enunciado da questão:\n${enunciado}\nGabarito esperado: ${gabarito || "Não informado"}\n\nJustificativa/Resolução do aluno:\n${justificativa || "Análise via rascunho/imagem em anexo."}`;
    const errors: string[] = [];
    const geminiKey = process.env.GEMINI_API_KEY;
    const imageMatch = typeof imagem_base64 === "string"
      ? imagem_base64.match(/^data:(image\/[\w.+-]+);base64,([\s\S]*)$/)
      : null;
    const imageData = typeof imagem_base64 === "string"
      ? (imageMatch ? imageMatch[2] : imagem_base64)
      : null;
    const imageMimeType = imageMatch?.[1] || "image/jpeg";

    // Gemini tem prioridade para imagens; NVIDIA é contingência para texto e visão.
    if (geminiKey) {
      try {
        const parts: Array<Record<string, unknown>> = [{ text: textoUsuario }];
        if (imageData) parts.push({ inlineData: { mimeType: imageMimeType, data: imageData } });

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts }],
              systemInstruction: { parts: [{ text: systemPrompt }] },
              generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
            }),
            signal: AbortSignal.timeout(30000),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const raw = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("").trim();
          if (raw) {
            const parsed = parseJsonResponse(raw);
            return NextResponse.json({
              ...parsed,
              modelo: "Gemini Flash Lite",
              provedor: "gemini",
              confianca: typeof parsed.nivel_confianca === "number" ? parsed.nivel_confianca : 0.94,
            });
          }
          errors.push("Gemini retornou uma resposta vazia.");
        } else {
          errors.push(`Gemini HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`);
        }
      } catch (error) {
        errors.push(`Gemini: ${error instanceof Error ? error.message : "falha de conexão ou JSON inválido"}`);
      }
    }

    const nvidiaKey = process.env.NVIDIA_API_KEY;
    if (nvidiaKey) {
      try {
        const userContent: Array<Record<string, unknown>> = [{ type: "text", text: textoUsuario }];
        if (imageData) {
          userContent.push({
            type: "image_url",
            image_url: { url: `data:${imageMimeType};base64,${imageData}` },
          });
        }

        const model = imageData ? NVIDIA_VISION_MODEL : NVIDIA_TEXT_MODEL;
        const response = await fetch(NVIDIA_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${nvidiaKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: imageData ? userContent : textoUsuario },
            ],
            temperature: 0.2,
            max_tokens: 1536,
            response_format: { type: "json_object" },
          }),
          signal: AbortSignal.timeout(35000),
        });

        if (response.ok) {
          const data = await response.json();
          const raw = data.choices?.[0]?.message?.content;
          if (typeof raw === "string" && raw.trim()) {
            const parsed = parseJsonResponse(raw);
            return NextResponse.json({
              ...parsed,
              modelo: data.model || model,
              provedor: "nvidia",
              confianca: typeof parsed.nivel_confianca === "number" ? parsed.nivel_confianca : 0.9,
            });
          }
          errors.push("NVIDIA retornou uma resposta vazia.");
        } else {
          errors.push(`NVIDIA HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`);
        }
      } catch (error) {
        errors.push(`NVIDIA: ${error instanceof Error ? error.message : "falha de conexão ou JSON inválido"}`);
      }
    }

    if (!geminiKey && !nvidiaKey) {
      return NextResponse.json(
        { error: "Nenhum provedor de IA configurado. Adicione GEMINI_API_KEY ou NVIDIA_API_KEY nas variáveis de ambiente da Vercel." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Não foi possível analisar a resolução com os provedores configurados.", details: errors },
      { status: 502 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
