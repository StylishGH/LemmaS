import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY não configurada no servidor." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { enunciado, gabarito, justificativa, imagem_base64 } = body;

    if (!enunciado) {
      return NextResponse.json({ error: "Enunciado é obrigatório." }, { status: 400 });
    }

    const systemPrompt = `Você é o Avaliador Cognitivo do LEMMAS (MathAI Engine), especialista em Matemática e Pedagogia Socrática.
Sua função é analisar o raciocínio do estudante (texto ou imagem de caderno/tablet), transcrever expressões em LaTeX e diagnosticar:
1. Status da resolução: "correto", "erro_conta_sinal", "erro_algebra", "erro_conceitual", "erro_interpretacao" ou "incompleto".
2. Parecer pedagógico detalhado explicando o raciocínio sem dar a resposta direta de bandeja.
3. A linha ou etapa exata do erro, se houver.
4. Uma provocação reflexiva (dica socrática) para destravar o aluno.

Retorne SEMPRE um JSON válido com o schema:
{
  "status_resolucao": string,
  "transcricao_latex": string,
  "diagnostico": string,
  "linha_do_erro": string,
  "dica_proximo_passo": string,
  "estrategia_identificada": string,
  "nivel_confianca": number
}`;

    const parts: any[] = [
      { text: `Enunciado da questão:\n${enunciado}\nGabarito esperado: ${gabarito || "Não informado"}\n\nJustificativa/Resolução do aluno:\n${justificativa || "Análise via rascunho/imagem em anexo."}` }
    ];

    if (imagem_base64) {
      // Remove prefix data:image/...;base64, se existir
      const cleanBase64 = imagem_base64.replace(/^data:image\/\w+;base64,/, "");
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: cleanBase64,
        },
      });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `Erro na API do Gemini: ${errText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const parsed = JSON.parse(rawContent);

    return NextResponse.json({
      ...parsed,
      modelo: "Gemini Flash Lite",
      confianca: typeof parsed.nivel_confianca === "number" ? parsed.nivel_confianca : 0.94,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
