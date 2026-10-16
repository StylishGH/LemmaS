import { NextRequest, NextResponse } from "next/server";
import { generateGeminiContent } from "@/lib/gemini";

const BACKEND_URL = (process.env.LEMMAS_BACKEND_URL || "https://mathai-7i7r.onrender.com").replace(/\/$/, "");

const PROMPT_SISTEMA_SOCRATICO = `Você é o Tutor Socrático da plataforma LEMMAS (MathAI Engine), especializado no Método de Pólya para conduzir estudantes de matemática (nível superior e concursos militares) a raciocinar por conta própria.

GUARDRAIL ESTRITO DE RESTRIÇÃO NEGATIVA (NÍVEIS 1 A 4):
- É ESTRITAMENTE PROIBIDO revelar a alternativa correta (A, B, C, D, E) ou vazar o valor numérico/algébrico final do gabarito nos Níveis 1, 2, 3 e 4. O estudante deve construir a dedução ativamente.
- Nível 1: PROIBIDO citar fórmulas, nomes de teoremas ou fazer contas. Máximo de 2 a 3 frases, termina obrigatoriamente com pergunta.
- Nível 2: PROIBIDO substituir números na fórmula ou montar a equação pronta. Termina obrigatoriamente com pergunta.
- Nível 3: PROIBIDO resolver a equação ou passar da metade do problema. Apenas ensine a largada.
- Nível 4: PROIBIDO calcular o resultado final ou indicar a alternativa certa. Pare antes do arremate final.
- Nível 5 (Rendição Pedagógica): Apresente a resolução completa, rigorosa e passo a passo em LaTeX, destacando o Lema central e chegando na resposta final.

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
      materia,
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
          materia: materia || "Matemática",
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
      if (materia) contextoPartes.push(`Grande Área / Matéria: ${materia}`);
      if (topico) contextoPartes.push(`Tópico da Matéria: ${topico}${subtopico ? ` > ${subtopico}` : ""}`);
      if (foco_concurso) contextoPartes.push(`Foco do aluno / Banca: ${foco_concurso}`);
      if (Array.isArray(motivacoes) && motivacoes.length > 0) {
        contextoPartes.push(`Objetivos: ${motivacoes.join(", ")}`);
      }
      const contextoStr = contextoPartes.length > 0 ? `\nContexto:\n${contextoPartes.join("\n")}` : "";

      const gabaritoRef = solucao || gabarito ? `\nGABARITO / SOLUÇÃO DE REFERÊNCIA:\n${solucao || gabarito}` : "";

      const diretrizNivel =
        level === 1
          ? "NÍVEL 1 — Intuição & Leitura de Hipóteses:\n- Instrução: Faça o aluno perceber um detalhe crucial do enunciado (uma simetria, uma condição de existência, uma propriedade da figura) através de uma pergunta instigante sobre o significado dos dados. Máximo de 2 a 3 frases, terminando OBRIGATORIAMENTE com uma pergunta reflexiva.\n- Guardrail: É ESTRITAMENTE PROIBIDO citar fórmulas, nomes de teoremas, fazer qualquer conta ou vazar o gabarito."
          : level === 2
          ? "NÍVEL 2 — Identificação do Lema / Teorema Chave:\n- Instrução: Indique qual área/teorema ou lema matemático destrava esse tipo de problema e pergunte ao aluno como ele enunciaria essa relação para os elementos da questão. Termine OBRIGATORIAMENTE com uma pergunta reflexiva.\n- Guardrail: É ESTRITAMENTE PROIBIDO substituir os números do enunciado na fórmula, montar a equação pronta ou vazar o gabarito."
          : level === 3
          ? "NÍVEL 3 — O Primeiro Passo / Construção Auxiliar:\n- Instrução: Ensine apenas como dar a largada (qual traço auxiliar desenhar na geometria, qual substituição de variável fazer na álgebra ou como armar a primeira linha do raciocínio no rascunho) e peça para o aluno desenvolver a partir daí.\n- Guardrail: É ESTRITAMENTE PROIBIDO resolver a equação, passar da metade do problema ou vazar o gabarito."
          : level === 4
          ? "NÍVEL 4 — Destravamento do Gargalo (Quase lá, falta o arremate):\n- Instrução: Mostre a relação algébrica/geométrica intermediária que resolve o gargalo principal da questão, mas pare ANTES do cálculo final. Deixe o arremate numérico/algébrico exclusivamente para o aluno.\n- Guardrail: É ESTRITAMENTE PROIBIDO mencionar o resultado final (gabarito) ou dizer qual alternativa (A, B, C, D, E) está certa."
          : "NÍVEL 5 — Resolução Completa (Rendição Pedagógica):\n- Instrução: Como o aluno desistiu da tentativa e solicitou o Nível 5, apresente a resolução completa, rigorosa, didática e passo a passo em LaTeX impecável ($...$ e $$...$$), destacando o Lema central utilizado e chegando claramente na resposta final.";

      const userPrompt = `Você é o Tutor Socrático da plataforma LEMMAS (MathAI Engine).
Gere uma DICA SOCRÁTICA DE NÍVEL ${level} (de 1 a 5) focada estritamente na questão abaixo:

ENUNCIADO DA QUESTÃO:
${enunciado}
${gabaritoRef}

MODO PEDAGÓGICO: ${pref}${contextoStr}

DIRETRIZ ESPECÍFICA DO NÍVEL ${level}:
${diretrizNivel}

IMPORTANTE: Seja direto, encorajador, rigoroso e cite as variáveis e itens do enunciado. NUNCA dê uma resposta vazia ou genérica. Responda diretamente com o texto da dica em KaTeX.`;

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
        dica: `💡 **Nível 5 — Resolução Completa (Rendição Pedagógica):**\n\n${solucao || gabarito}`,
        modelo: "LEMMAS Gabarito Oficial",
        provedor: "lemmas-knowledge-base",
        confianca: 1.0,
      });
    }

    const fallbackHints: Record<number, string> = {
      1: `💡 **Nível 1 — Intuição & Leitura de Hipóteses:** Você identificou quais são os dados, simetrias e restrições essenciais desta questão de **${topico}**? Como cada grandeza se relaciona antes mesmo de começar qualquer conta?`,
      2: `💡 **Nível 2 — Identificação do Lema / Teorema Chave:** Qual lema ou teorema fundamental conecta os termos de **${topico}** presentes no enunciado? Como você enunciaria essa propriedade para os elementos desta questão?`,
      3: `💡 **Nível 3 — O Primeiro Passo / Construção Auxiliar:** Vamos começar no rascunho! Escreva a primeira proposição formal ou equação inicial traduzindo as hipóteses de **${topico}** (ex: comece definindo a variável ou relação inicial) e desenvolva a partir daí.`,
      4: `💡 **Nível 4 — Destravamento do Gargalo:** Atente para a relação algébrica/geométrica intermediária que resolve o gargalo principal em **${topico}**, deixando apenas a linha final de arremate para você fechar a conta.`,
      5: `💡 **Nível 5 — Resolução Completa (Rendição Pedagógica):**\n\n${solucao || gabarito || "A dedução formal demonstra rigorosamente o resultado pelo encadeamento direto das hipóteses."}`,
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
