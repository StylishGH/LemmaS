import { NextRequest, NextResponse } from "next/server";

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_TEXT_MODEL = "nvidia/nemotron-3.5-lightning-30b-a3b";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { enunciado, nivel = 1, tentativas_anteriores } = body;

    if (!enunciado || typeof enunciado !== "string") {
      return NextResponse.json({ error: "Enunciado é obrigatório." }, { status: 400 });
    }

    const niveisGuia: Record<number, string> = {
      1: "Nível 1 (Intuição Pura): Apenas aponte qual área da matemática ou teorema geral pode ser útil, sem entregar contas nem fórmulas.",
      2: "Nível 2 (Gatilho Heurístico): Indique qual propriedade matemática ou lema fundamental conecta os dados do problema.",
      3: "Nível 3 (Primeiro Passo): Sugira a montagem da equação inicial ou desenho geométrico a ser traçado.",
      4: "Nível 4 (Desenvolvimento): Mostre a simplificação algébrica intermediária sem calcular o resultado final.",
      5: "Nível 5 (Quase Solução): Explique o passo decisivo que leva diretamente à resposta final.",
    };

    const nivelSeguro = Math.min(5, Math.max(1, Number(nivel) || 1));
    const instrucaoNivel = niveisGuia[nivelSeguro] || niveisGuia[1];
    const systemPrompt = `Você é o Tutor Socrático do LEMMAS (MathAI Engine).
Sua missão é dar uma dica reflexiva e estimulante para o estudante avançar no problema sem estragar o aprendizado (sem spoiler além do nível solicitado).
${instrucaoNivel}

Use KaTeX ($...$) para expressões matemáticas. Seja conciso, encorajador e rigoroso.`;
    const userPrompt = `Questão:\n${enunciado}\n\nNível de dica solicitado: ${nivelSeguro}\nHistórico: ${tentativas_anteriores || "Início da resolução"}`;

    const errors: string[] = [];
    const geminiKey = process.env.GEMINI_API_KEY;

    // Gemini é a primeira opção; falhas passam para NVIDIA NIM.
    if (geminiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: userPrompt }] }],
              systemInstruction: { parts: [{ text: systemPrompt }] },
              generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
            }),
            signal: AbortSignal.timeout(25000),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const dica = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("").trim();
          if (dica) {
            return NextResponse.json({ nivel: nivelSeguro, dica, modelo: "Gemini Flash Lite", provedor: "gemini", confianca: 0.98 });
          }
          errors.push("Gemini retornou uma resposta vazia.");
        } else {
          errors.push(`Gemini HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`);
        }
      } catch (error) {
        errors.push(`Gemini: ${error instanceof Error ? error.message : "falha de conexão"}`);
      }
    }

    const nvidiaKey = process.env.NVIDIA_API_KEY;
    if (nvidiaKey) {
      try {
        const response = await fetch(NVIDIA_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${nvidiaKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: NVIDIA_TEXT_MODEL,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.3,
            max_tokens: 500,
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (response.ok) {
          const data = await response.json();
          const dica = data.choices?.[0]?.message?.content;
          if (typeof dica === "string" && dica.trim()) {
            return NextResponse.json({ nivel: nivelSeguro, dica: dica.trim(), modelo: data.model || NVIDIA_TEXT_MODEL, provedor: "nvidia", confianca: 0.9 });
          }
          errors.push("NVIDIA retornou uma resposta vazia.");
        } else {
          errors.push(`NVIDIA HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`);
        }
      } catch (error) {
        errors.push(`NVIDIA: ${error instanceof Error ? error.message : "falha de conexão"}`);
      }
    }

    if (!geminiKey && !nvidiaKey) {
      return NextResponse.json(
        { error: "Nenhum provedor de IA configurado. Adicione GEMINI_API_KEY ou NVIDIA_API_KEY nas variáveis de ambiente da Vercel." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Não foi possível gerar a dica com os provedores configurados.", details: errors },
      { status: 502 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
