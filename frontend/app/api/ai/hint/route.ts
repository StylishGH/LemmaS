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
    const { enunciado, nivel = 1, tentativas_anteriores } = body;

    if (!enunciado) {
      return NextResponse.json({ error: "Enunciado é obrigatório." }, { status: 400 });
    }

    const niveisGuia: Record<number, string> = {
      1: "Nível 1 (Intuição Pura): Apenas aponte qual área da matemática ou teorema geral pode ser útil, sem entregar contas nem fórmulas.",
      2: "Nível 2 (Gatilho Heurístico): Indique qual propriedade matemática ou lema fundamental conecta os dados do problema.",
      3: "Nível 3 (Primeiro Passo): Sugira a montagem da equação inicial ou desenho geométrico a ser traçado.",
      4: "Nível 4 (Desenvolvimento): Mostre a simplificação algébrica intermediária sem calcular o resultado final.",
      5: "Nível 5 (Quase Solução): Explique o passo decisivo que leva diretamente à resposta final.",
    };

    const instrucaoNivel = niveisGuia[nivel] || niveisGuia[1];

    const systemPrompt = `Você é o Tutor Socrático do LEMMAS (MathAI Engine).
Sua missão é dar uma dica reflexiva e estimulante para o estudante avançar no problema sem estragar o aprendizado (sem spoiler além do nível solicitado).
${instrucaoNivel}

Use KaTeX ($...$) para expressões matemáticas. Seja conciso, encorajador e rigoroso.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Questão:\n${enunciado}\n\nNível de dica solicitado: ${nivel}\nHistórico: ${tentativas_anteriores || "Início da resolução"}`,
              },
            ],
          },
        ],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500,
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
    const dicaTexto = data.candidates?.[0]?.content?.parts?.[0]?.text || "Pense nos axiomas fundamentais da questão.";

    return NextResponse.json({
      nivel,
      dica: dicaTexto,
      modelo: "Gemini Flash Lite",
      confianca: 0.98,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
