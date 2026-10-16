import { NextRequest, NextResponse } from "next/server";
import { generateGeminiContent } from "@/lib/gemini";

const BACKEND_URL = (process.env.LEMMAS_BACKEND_URL || "https://mathai-7i7r.onrender.com").replace(/\/$/, "");

const PROMPT_SISTEMA_SOCRATICO = `Você é o Tutor Socrático da plataforma LEMMAS (MathAI Engine), especializado em conduzir estudantes de matemática pelo método maiêutico progressivo, prático e rigoroso.

DIRETRIZES FUNDAMENTAIS DOS 5 NÍVEIS PEDAGÓGICOS:
- NUNCA entregue a resposta final nos níveis 1 a 4.
- Nível 1 (Identificação de Notação & Simbologia): Chame a atenção para os símbolos, notações e conectivos específicos desta questão (ex: quantificadores $\\forall, \\exists$, pertinência $\\in$, inclusão $\\subseteq$, conectivos $\\implies, \\iff, \\land, \\lor$, notações de funções, matrizes, cálculo, etc.). Pergunte socraticamente se o estudante conhece essas simbologias e o que significam no problema.
- Nível 2 (Primeiro Passo Prático no Papel): Ajude o estudante a COMEÇAR A ESCREVER de fato! Diga com clareza como ele deve iniciar a primeira linha de dedução, hipótese ou equação no rascunho (ex: "No seu rascunho, comece escrevendo a primeira linha: 'Seja $n \\in \\mathbb{N}$ tal que...'").
- Nível 3 (Encadeamento Dedutivo Intermediário): Indique a próxima conexão lógica ou manipulação intermediária (ex: expansão, negação, substituição ou simetria), relacionando a hipótese inicial ao próximo termo em LaTeX ($...$).
- Nível 4 (O Pulo do Gato & Alerta de Pegadinha): Aponte a sacada decisiva, o lema chave ou a armadilha de prova da banca que destrava a questão, deixando apenas a última linha de arremate para o estudante concluir.
- Nível 5 (Resolução Oficial Completa & Gabarito): Apresente a resolução passo a passo integral e rigorosa até o gabarito oficial definitivo em KaTeX ($...$ e $$...$$), demonstrando a solução completa da questão.

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
    const {
      enunciado,
      topico = "Matemática",
      subtopico,
      gabarito,
      solucao,
      nivel = 1,
      pedagogicalPreference,
      pedagogical_preference,
      foco_concurso,
      motivacoes,
    } = body;
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
          topico: topico || "Matemática",
          gabarito: gabarito || "",
          solucao: solucao || "",
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
      if (topico) contextoPartes.push(`Tópico da Matéria: ${topico}${subtopico ? ` > ${subtopico}` : ""}`);
      if (foco_concurso) contextoPartes.push(`Foco do aluno / Banca: ${foco_concurso}`);
      if (Array.isArray(motivacoes) && motivacoes.length > 0) {
        contextoPartes.push(`Objetivos: ${motivacoes.join(", ")}`);
      }
      const contextoStr = contextoPartes.length > 0 ? `\nContexto:\n${contextoPartes.join("\n")}` : "";

      const gabaritoRef = solucao || gabarito ? `\nGABARITO / SOLUÇÃO DE REFERÊNCIA:\n${solucao || gabarito}` : "";

      const userPrompt = `Você é o Tutor Socrático da plataforma LEMMAS (MathAI Engine).
Gere uma DICA SOCRÁTICA DE NÍVEL ${level} (de 1 a 5) focada estritamente na questão abaixo:

ENUNCIADO DA QUESTÃO:
${enunciado}
${gabaritoRef}

MODO PEDAGÓGICO: ${pref}${contextoStr}

Diretriz específica para o Nível ${level}:
${
  level === 1
    ? "Identifique a simbologia, notação matemática e conectivos específicos desta questão (ex: quantificadores como $\\forall$ e $\\exists$, pertinência $\\in$, implicação $\\implies$, funções ou conjuntos). Pergunte socraticamente se o aluno conhece essas simbologias e o que cada uma exige para iniciar."
    : level === 2
    ? "Instrua o aluno a COMEÇAR A ESCREVER de fato no papel! Indique com precisão qual é a primeira linha, hipótese ou relação formal que ele deve anotar no rascunho para dar o primeiro passo prático."
    : level === 3
    ? "Apresente o encadeamento dedutivo intermediário em LaTeX ($...$), mostrando como manipular a relação do Nível 2 e avançar para o próximo passo lógico."
    : level === 4
    ? "Aponte o pulo do gato / lema crucial e alerte sobre pegadinhas típicas da banca, deixando estritamente a última linha de arremate para o estudante concluir."
    : "Apresente a RESOLUÇÃO OFICIAL COMPLETA passo a passo de ponta a ponta com rigor formal em KaTeX ($...$ e $$...$$), demonstrando a dedução integral e concluindo com o gabarito oficial definitivo."
}

IMPORTANTE: Seja direto, rigoroso e cite as variáveis e itens do enunciado. NUNCA dê uma resposta vazia ou genérica. Responda diretamente com o texto da dica em KaTeX.`;

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
    if (level === 5 && (solucao || gabarito)) {
      return NextResponse.json({
        nivel: 5,
        dica: `💡 **Nível 5 (Resolução Oficial Definitiva):**\n\n${solucao || gabarito}`,
        modelo: "LEMMAS Gabarito Oficial",
        provedor: "lemmas-knowledge-base",
        confianca: 1.0,
      });
    }

    const fallbackHints: Record<number, string> = {
      1: `💡 **Nível 1 (Simbologia & Notação):** Você identificou quais são as simbologias e conectivos essenciais desta questão de **${topico}**? (Ex: quantificadores como $\\forall$ e $\\exists$, pertinência $\\in$, ou conectivos lógicos como $\\implies$). O que cada um deles exige antes de começar a calcular?`,
      2: `💡 **Nível 2 (Primeiro Passo no Papel):** Vamos começar a escrever no rascunho! Escreva a primeira proposição formal ou equação inicial traduzindo as hipóteses de **${topico}** (ex: comece com 'Seja $x \\in ...$' ou defina a variável principal).`,
      3: `💡 **Nível 3 (Encadeamento Intermediário):** Agora relacione a primeira hipótese ao próximo passo dedutivo. Que propriedade ou manipulação operatória de **${topico}** conecta o ponto de partida à tese pedida?`,
      4: `💡 **Nível 4 (Pulo do Gato & Pegadinha):** Atente para a simplificação crítica ou lema decisivo de **${topico}** que destrava a conclusão, cuidando para não cair em divisões por zero ou casos particulares.`,
      5: `💡 **Nível 5 (Resolução Oficial Definitiva):**\n\n${solucao || gabarito || "A dedução formal demonstra rigorosamente o resultado pelo encadeamento direto das hipóteses."}`,
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
