import { NextRequest, NextResponse } from "next/server";
import { generateGeminiContent } from "@/lib/gemini";

const BACKEND_URL = (process.env.LEMMAS_BACKEND_URL || "https://mathai-7i7r.onrender.com").replace(/\/$/, "");

const PROMPT_SISTEMA_SOCRATICO = `Você é o Tutor Socrático da plataforma LEMMAS (MathAI Engine), especializado em conduzir estudantes de matemática pelo método maiêutico (reflexão socrática progressiva) sem entregar respostas prontas.

DIRETRIZES FUNDAMENTAIS:
- NUNCA entregue a resposta final nem conclua os cálculos nos níveis 1 a 4.
- Nível 1 (Dados & Foco): Chame a atenção para as grandezas do problema, o que representam intuitivamente e as hipóteses do enunciado, sem fórmulas prontas.
- Nível 2 (Conceito & Lema): Sugira o teorema, lema ou propriedade matemática chave que conecta as informações (ex: Teorema de Pitágoras, Relações de Girard, Semelhança, Invariantes).
- Nível 3 (Primeiro Passo): Oriente a montagem da primeira equação ou representação visual estruturada a ser escrita no papel.
- Nível 4 (Passos Intermediários): Desenvolva manipulações intermediárias do cálculo, deixando estritamente o passo conclusivo para o estudante deduzir.
- Nível 5 (Resolução & Síntese): Demonstre a resolução completa passo a passo até o gabarito oficial, sintetizando o aprendizado.

DIRETRIZES DE FORMATAÇÃO E LATEX (MANDATÓRIO):
- Toda e qualquer expressão, incógnita, número algébrico ou fórmula DEVE estar rigorosamente delimitada por $...$ (para matemática em linha) ou $$...$$ (para equações destacadas em bloco).
- NUNCA use delimitadores \\( ou \\[. Use sempre $ e $$.
- NUNCA escreva fórmulas matemáticas ou variáveis isoladas em texto puro sem os delimitadores $...$.
- Em português brasileiro, use \\sen para seno e \\tg para tangente.
- Seja encorajador, rigoroso e profundamente didático.`;

export async function POST(req: NextRequest) {
  try {
    const authorization = req.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Sessão ausente. Entre novamente no Lemmas." }, { status: 401 });
    }

    const body = await req.json();
    const { enunciado, nivel = 1, pedagogicalPreference, pedagogical_preference, foco_concurso, motivacoes } = body;
    if (!enunciado || typeof enunciado !== "string") {
      return NextResponse.json({ error: "Enunciado é obrigatório." }, { status: 400 });
    }

    const level = Math.min(5, Math.max(1, Number(nivel) || 1));
    const pref = pedagogical_preference || pedagogicalPreference || "conceitual";

    // 1. Tenta o Backend FastAPI (tolerância ágil de 3.5s para evitar congelamento por cold-start)
    try {
      const response = await fetch(BACKEND_URL + "/api/tutor/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authorization },
        body: JSON.stringify({
          enunciado,
          level,
          topico: "Matemática",
          estrategias_esperadas: [],
          pedagogical_preference: pref,
          pedagogicalPreference: pref,
          foco_concurso: foco_concurso || null,
          motivacoes: Array.isArray(motivacoes) ? motivacoes : [],
        }),
        signal: AbortSignal.timeout(3500),
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
        if (data.hint_text) {
          return NextResponse.json({
            nivel: data.level || level,
            dica: data.hint_text,
            modelo: data.model_used || "fastapi-tutor",
            provedor: data.provider || "backend",
            confianca: data.provider === "fallback" ? 0.75 : 0.95,
          });
        }
      }
    } catch {
      // Backend em cold-start ou indisponível; aciona fallback de alta velocidade via Gemini
    }

    // 2. Inferência Direta de Alta Performance via Gemini REST API (Latência ~1s com KaTeX real)
    try {
      const contextoPartes: string[] = [];
      if (foco_concurso) contextoPartes.push(`Foco do aluno / Banca: ${foco_concurso}`);
      if (Array.isArray(motivacoes) && motivacoes.length > 0) {
        contextoPartes.push(`Objetivos: ${motivacoes.join(", ")}`);
      }
      const contextoStr = contextoPartes.length > 0 ? `\nContexto do Aluno:\n${contextoPartes.join("\n")}` : "";

      const userPrompt = `Gere uma DICA SOCRÁTICA DE NÍVEL ${level} (de 1 a 5) para a seguinte questão:

ENUNCIADO DA QUESTÃO:
${enunciado}

MODO PEDAGÓGICO: ${pref}${contextoStr}

Diretriz específica para o Nível ${level}:
${
  level === 1
    ? "Faça perguntas que ajudem o aluno a identificar os dados e o que cada grandeza representa intuitivamente. NÃO apresente equações prontas."
    : level === 2
    ? "Aponte o lema, teorema ou propriedade geométrica/algébrica que rege este tipo de problema com notação LaTeX ($...$), sem montar a conta final."
    : level === 3
    ? "Escreva a primeira igualdade ou representação algébrica estruturada a ser anotada no papel para iniciar o desenvolvimento."
    : level === 4
    ? "Apresente as manipulações e simplificações algébricas intermediárias em LaTeX ($...$), deixando o arremate final para o aluno concluir."
    : "Apresente a demonstração matemática completa passo a passo em LaTeX ($...$ e $$...$$), sintetizando o método de resolução."
}

Responda diretamente com o texto da dica socrática, usando KaTeX com $...$ e $$...$$ rigorosamente.`;

      const geminiRes = await generateGeminiContent({
        prompt: userPrompt,
        systemInstruction: PROMPT_SISTEMA_SOCRATICO,
        temperature: 0.25,
        maxTokens: 1024,
        timeoutMs: 12000,
      });

      if (geminiRes.text) {
        return NextResponse.json({
          nivel: level,
          dica: geminiRes.text,
          modelo: geminiRes.model,
          provedor: "gemini-flash-lite",
          confianca: 0.95,
        });
      }
    } catch (geminiErr) {
      console.warn("[Tutor Socrático] Fallback Gemini falhou:", geminiErr);
    }

    // 3. Fallback Determinístico Pedagógico Estruturado (Uptime 100% garantido sem erro de timeout)
    const fallbackHints: Record<number, string> = {
      1: "💡 **Nível 1 (Intuição e Dados):** Releia com atenção o enunciado. Isole quais são as hipóteses e dados conhecidos e qual é a tese ou incógnita pedida. O que cada termo ou símbolo representa antes de tentar aplicar regras prontas?",
      2: "💡 **Nível 2 (Conceito & Lema):** Pense em qual teorema, lema ou equivalência fundamental rege as propriedades do problema. Existe alguma equivalência lógica, simetria geométrica ou invariante aplicável a este caso?",
      3: "💡 **Nível 3 (Primeiro Passo):** Escreva no papel a primeira relação estruturada (algébrica, lógica com conectivos ou geométrica) que traduz diretamente as hipóteses do problema.",
      4: "💡 **Nível 4 (Passos Intermediários):** Desenvolva as etapas intermediárias simplificando os termos comuns e aplicando as propriedades operatórias cabíveis, deixando a estrutura pronta para a conclusão.",
      5: "💡 **Nível 5 (Resolução Completa):** Conclua a dedução formal justificando cada passagem lógica e confirmando se o resultado satisfaz todas as condições e restrições iniciais do problema.",
    };

    return NextResponse.json({
      nivel: level,
      dica: fallbackHints[level] || fallbackHints[1],
      modelo: "LEMMAS Determinístico",
      provedor: "lemmas-contingency",
      confianca: 0.8,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno no Tutor Socrático" },
      { status: 500 }
    );
  }
}
