import { NextRequest, NextResponse } from "next/server";
import { generateGeminiContent } from "@/lib/gemini";
import { generateNvidiaContent } from "@/lib/nvidia";

const BACKEND_URL = (process.env.LEMMAS_BACKEND_URL || "https://mathai-7i7r.onrender.com").replace(/\/$/, "");

const PROMPT_SISTEMA_SOCRATICO = `Você é o Tutor Socrático da plataforma LEMMAS (MathAI Engine), especializado no Método de Pólya para conduzir estudantes de matemática (nível superior e concursos militares) a raciocinar por conta própria.

DIRETRIZES DE LINGUAGEM E ESPECIFICIDADE (MANDATÓRIO):
- Responda SEMPRE EM PORTUGUÊS BRASILEIRO.
- TODA dica dos Níveis 1 a 4 DEVE SER 100% ESPECÍFICA sobre os elementos matemáticos concretos desta questão (cite pontos $P, Q, R, S$, áreas $[AXY]$, triângulos $\\triangle$, segmentos, equações, variáveis e hipóteses reais do enunciado).
- É ESTRITAMENTE PROIBIDO usar frases prontas genéricas ou templates vazios (ex: "Identifique os dados centrais...", "Como representar algebricamente ou geometricamente a primeira relação...").
- É ESTRITAMENTE PROIBIDO tratar nomes de autores, competições ou países (como "Denis Sidorov, Moldávia") como se fossem tópicos ou teoremas matemáticos. Ignore nomes próprios e de países.

GUARDRAIL ESTRITO DE RESTRIÇÃO NEGATIVA (NÍVEIS 1 A 4):
- É ESTRITAMENTE PROIBIDO revelar a alternativa correta (A, B, C, D, E) ou vazar o valor numérico/algébrico final do gabarito nos Níveis 1, 2, 3 e 4. O estudante deve construir a dedução ativamente.
- Nível 1: PROIBIDO citar fórmulas prontas, nomes de teoremas ou fazer contas. Máximo de 2 a 3 frases, termina obrigatoriamente com pergunta reflexiva sobre os elementos reais da questão.
- Nível 2: PROIBIDO substituir números na fórmula ou montar a equação pronta. Identifique o lema/teorema chave para este problema específico e termine com pergunta.
- Nível 3: PROIBIDO resolver a equação ou passar da metade do problema. Ensine o primeiro passo concreto ou traço auxiliar de rascunho com os objetos do enunciado.
- Nível 4: PROIBIDO calcular o resultado final ou indicar a alternativa certa. Mostre a relação intermediária que destrava o gargalo da questão, parando antes da conclusão.
- Nível 5 (Rendição Pedagógica): Apresente a resolução comentada completa, estruturada e passo a passo em Português brasileiro claro com LaTeX 100% válido ($...$ e $$...$$). Se a referência estiver em inglês ou com artefatos de código, TRADUZA e adapte didaticamente em passos (Passo 1, Passo 2, Conclusão).

DIRETRIZES DE FORMATAÇÃO E LATEX (MANDATÓRIO):
- Toda e qualquer expressão, incógnita, número algébrico ou fórmula DEVE estar rigorosamente delimitada por $...$ (para matemática em linha) ou $$...$$ (para equações destacadas em bloco).
- NUNCA use delimitadores \\( ou \\[. Use sempre $ e $$.
- NUNCA escreva fórmulas matemáticas ou variáveis isoladas em texto puro sem os delimitadores $...$.
- Em português brasileiro, use \\sen para seno e \\tg para tangente.
- Seja encorajador, rigoroso e profundamente didático.`;

function sanitizeAuthorOrTopic(topico: string, materia?: string): string {
  if (!topico) return materia || "Matemática";
  const isAuthorOrCountry = /mold[aá]via|denis|sidorov|olympiad|author|contest|[a-z]+,\s*[a-z]+/i.test(topico);
  return isAuthorOrCountry ? (materia || "Matemática") : topico;
}

function cleanRawSolution(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/\[asy\][\s\S]*?\[\/asy\]/gi, "")
    .replace(/<img[^>]*>/gi, "")
    .replace(/!\[.*?\]\(.*?\)/gi, "")
    .trim();
}

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
    const cleanTopico = sanitizeAuthorOrTopic(topico, materia);
    const cleanedSolucao = cleanRawSolution(solucao || "");
    const cleanedGabarito = cleanRawSolution(gabarito || "");

    const contextoPartes: string[] = [];
    if (materia) contextoPartes.push(`Grande Área / Matéria: ${materia}`);
    if (cleanTopico) contextoPartes.push(`Tópico da Matéria: ${cleanTopico}${subtopico ? ` > ${subtopico}` : ""}`);
    if (foco_concurso) contextoPartes.push(`Foco do aluno / Banca: ${foco_concurso}`);
    if (Array.isArray(motivacoes) && motivacoes.length > 0) {
      contextoPartes.push(`Objetivos: ${motivacoes.join(", ")}`);
    }
    const contextoStr = contextoPartes.length > 0 ? `\nContexto:\n${contextoPartes.join("\n")}` : "";

    const refSolucao = cleanedSolucao || cleanedGabarito;
    const gabaritoRef = refSolucao
      ? `\nSOLUÇÃO OFICIAL DE REFERÊNCIA (CONTEXTO OCULTO PARA A IA SABER COMO A QUESTÃO É RESOLVIDA):\n${refSolucao}\n(Use este contexto para guiar a dica socrática sem vazar a resposta nos Níveis 1 a 4. No Nível 5, traduza para Português se estiver em inglês e estruture em passos didáticos.)`
      : "";

    const diretrizNivel =
      level === 1
        ? "NÍVEL 1 — Intuição & Leitura de Hipóteses:\n- Instrução: Faça o aluno perceber um detalhe crucial do enunciado (uma relação entre os pontos, segmentos, triângulos ou propriedades do problema) através de uma pergunta instigante sobre o significado dos dados reais da questão. Máximo de 2 a 3 frases, terminando OBRIGATORIAMENTE com uma pergunta reflexiva.\n- PROIBIDO: Usar frases genéricas de template. PROIBIDO tratar nomes de autores ou países como matemática. PROIBIDO citar fórmulas ou vazar o gabarito."
        : level === 2
        ? "NÍVEL 2 — Identificação do Lema / Teorema Chave:\n- Instrução: Indique qual lema ou teorema matemático destrava esse problema específico (ex: Teorema de Menelaus, Potência de Ponto, Semelhança de Triângulos, etc.) e pergunte ao aluno como ele enunciaria essa propriedade para os elementos desta questão. Termine OBRIGATORIAMENTE com uma pergunta reflexiva.\n- PROIBIDO: Usar frases prontas genéricas. PROIBIDO substituir números na fórmula ou vazar o gabarito."
        : level === 3
        ? "NÍVEL 3 — O Primeiro Passo / Construção Auxiliar:\n- Instrução: Ensine como dar a largada concreta no rascunho (qual traço auxiliar desenhar na geometria, qual substituição de variável fazer na álgebra ou como armar a primeira equação) usando estritamente os objetos do enunciado.\n- PROIBIDO: Usar frases genéricas. PROIBIDO resolver a equação ou passar da metade do problema."
        : level === 4
        ? "NÍVEL 4 — Destravamento do Gargalo (Quase lá, falta o arremate):\n- Instrução: Mostre a relação algébrica/geométrica intermediária que resolve o gargalo principal da questão, mas pare ANTES do cálculo final. Deixe o arremate exclusivamente para o aluno.\n- PROIBIDO: Mencionar o resultado final (gabarito) ou dizer qual alternativa está certa."
        : "NÍVEL 5 — Resolução Completa Comentada (Rendição Pedagógica):\n- Instrução: Como o aluno solicitou o Nível 5, apresente a resolução completa, comentada, rigorosa e passo a passo em Português brasileiro claro com LaTeX 100% válido ($...$ e $$...$$).\n- ADAPTAÇÃO E TRADUÇÃO OBRIGATÓRIA: Se a solução de referência estiver em inglês, com código Asymptote ou comandos LaTeX soltos, TRADUZA TODO O RACIOCÍNIO PARA O PORTUGUÊS, organize em passos didáticos numerados (Passo 1, Passo 2, Passo 3, Conclusão), remova artefatos de código e entregue uma resolução exemplar e límpida.";

    const userPrompt = `Você é o Tutor Socrático da plataforma LEMMAS (MathAI Engine).
Gere uma DICA SOCRÁTICA DE NÍVEL ${level} (de 1 a 5) focada estritamente na questão abaixo:

ENUNCIADO DA QUESTÃO:
${enunciado}
${gabaritoRef}

MODO PEDAGÓGICO: ${pref}${contextoStr}

DIRETRIZ ESPECÍFICA DO NÍVEL ${level}:
${diretrizNivel}

IMPORTANTE: Responda SEMPRE EM PORTUGUÊS. Seja direto, encorajador, rigoroso e cite as variáveis e objetos matemáticos do enunciado. NUNCA dê uma resposta genérica ou vazia. Responda diretamente com o texto da dica em KaTeX ($...$ e $$...$$).`;

    // 1. Inferência Primária de Alta Performance via Gemini REST API (Latência < 0.6s com KaTeX real)
    try {
      const geminiRes = await generateGeminiContent({
        prompt: userPrompt,
        systemInstruction: PROMPT_SISTEMA_SOCRATICO,
        temperature: level === 5 ? 0.2 : 0.25,
        maxTokens: level === 5 ? 2048 : 1024,
        timeoutMs: 12000,
      });

      if (geminiRes.text) {
        return NextResponse.json({
          nivel: level,
          dica: geminiRes.text,
          modelo: geminiRes.model,
          provedor: "gemini-flash-lite",
          confianca: 0.98,
        });
      }
    } catch (geminiErr) {
      console.warn("[Tutor Socrático] Gemini indisponível ou sem cota, acionando NVIDIA NIM:", geminiErr);
    }

    // 2. Inferência de Resiliência via NVIDIA NIM (Nemotron 3 Reasoning / Llama 3.1 Nemotron)
    try {
      if (process.env.NVIDIA_API_KEY) {
        const nvidiaRes = await generateNvidiaContent({
          prompt: userPrompt,
          systemInstruction: PROMPT_SISTEMA_SOCRATICO,
          temperature: level === 5 ? 0.2 : 0.25,
          maxTokens: level === 5 ? 2048 : 1024,
          timeoutMs: 14000,
        });

        if (nvidiaRes.text) {
          return NextResponse.json({
            nivel: level,
            dica: nvidiaRes.text,
            modelo: nvidiaRes.model,
            provedor: "nvidia-nemotron",
            confianca: 0.97,
          });
        }
      }
    } catch (nvidiaErr) {
      console.warn("[Tutor Socrático] NVIDIA NIM falhou, tentando Backend FastAPI:", nvidiaErr);
    }

    // 3. Se Gemini e NVIDIA falharem, tenta o Backend FastAPI como contingência
    try {
      const response = await fetch(BACKEND_URL + "/api/tutor/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authorization },
        body: JSON.stringify({
          enunciado,
          level,
          materia: materia || "Matemática",
          topico: cleanTopico,
          gabarito: cleanedGabarito,
          solucao: cleanedSolucao,
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
        // Apenas aceita a resposta do backend se NÃO for fallback determinístico genérico
        if (data.hint_text && data.provider !== "fallback" && !data.hint_text.includes("Identifique os dados")) {
          return NextResponse.json({
            nivel: data.level || level,
            dica: data.hint_text,
            modelo: data.model_used || "fastapi-tutor",
            provedor: data.provider || "backend",
            confianca: 0.95,
          });
        }
      }
    } catch {
      // Backend offline ou timeout
    }

    // 3. Contingência final estruturada (sem strings genéricas com ${topico})
    if (level === 5) {
      const resTexto = cleanedSolucao || cleanedGabarito || "A demonstração formal completa decorre do encadeamento dedutivo das hipóteses do enunciado.";
      return NextResponse.json({
        nivel: 5,
        dica: `💡 **Nível 5 — Resolução Completa (Rendição Pedagógica):**\n\n${resTexto}`,
        modelo: "LEMMAS Gabarito Oficial",
        provedor: "lemmas-knowledge-base",
        confianca: 0.9,
      });
    }

    // Para Níveis 1 a 4 em contingência: resposta sincera orientando olhar os objetos do enunciado sem templates falsos
    const contingencyHints: Record<number, string> = {
      1: "💡 **Nível 1 — Intuição & Leitura de Hipóteses:** Examine com atenção as condições iniciais e grandezas dadas no enunciado. Que simetrias ou invariantes se conservam na configuração do problema antes de iniciar qualquer conta?",
      2: "💡 **Nível 2 — Identificação do Lema / Teorema Chave:** Qual teorema ou propriedade fundamental conecta diretamente as incógnitas aos dados apresentados nesta questão? Como formular essa relação para os elementos do problema?",
      3: "💡 **Nível 3 — O Primeiro Passo / Construção Auxiliar:** Comece no rascunho estruturando a primeira equação ou traçado auxiliar que traduz as hipóteses da questão, definindo claramente as incógnitas principais.",
      4: "💡 **Nível 4 — Destravamento do Gargalo:** Isole a relação intermediária essencial que resolve o gargalo do problema, deixando apenas as simplificações finais de cálculo para a conclusão.",
    };

    return NextResponse.json({
      nivel: level,
      dica: contingencyHints[level] || contingencyHints[1],
      modelo: "LEMMAS Contingência",
      provedor: "lemmas-emergency",
      confianca: 0.8,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno no Tutor Socrático" },
      { status: 500 }
    );
  }
}
