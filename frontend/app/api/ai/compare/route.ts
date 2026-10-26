import { NextRequest, NextResponse } from "next/server";
import { generateGeminiContent } from "@/lib/gemini";
import { generateNvidiaContent } from "@/lib/nvidia";
import { safeParseJsonWithLatex } from "@/lib/json-safe";

// Node.js process types for process.env
/// <reference types="node" />

const BACKEND_URL = (process.env.LEMMAS_BACKEND_URL || "https://mathai-7i7r.onrender.com").replace(/\/$/, "");

export const maxDuration = 30;

// Orçamento global da rota: os fallbacks em sequência (backend 8s +
// Gemini 3 modelos + NVIDIA 3 modelos) somavam mais de 70s e estouravam
// o maxDuration da Vercel, então o cliente nunca recebia o 503 JSON e
// a página caía no catch genérico ("Falha de conexão"). Cada etapa
// abaixo corre dentro do orçamento restante, e a rota sempre responde
// JSON antes de 28s.
const ROUTE_BUDGET_MS = 28000;

function withDeadline<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Deadline excedido: ${label}`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

// Guardrail: palavras-chave que indicam conteúdo NÃO matemático ou spam/bate-papo
const NON_MATH_KEYWORDS = [
  "olá", "ola", "oi", "tudo bem", "como vai", "bom dia", "boa tarde", "boa noite", "tchau", "adeus",
  "obrigado", "obrigada", "por favor", "desculpa", "desculpe", "legal", "show", "top", "daora",
  "piada", "charada", "quem é você", "quem e voce", "quem você é", "quem voce e", "qual seu nome",
  "conte uma história", "conte uma historia", "poema", "poesia", "letra de música",
  "receita", "cozinhar", "ingrediente", "tempero", "forno", "fogão", "fogao", "panela", "bolo", "pão", "pao",
  "carne", "frango", "peixe", "salada", "sobremesa", "lanche", "jantar", "almoço", "almoco", "café", "cafe",
  "política", "politica", "eleição", "eleicao", "partido", "governo", "presidente", "deputado", "senador",
  "esquerda", "direita", "centro", "ideologia", "comunismo", "capitalismo", "fascismo", "anarquismo",
  "javascript", "typescript", "react", "vue", "angular", "node",
  "html", "css", "docker", "kubernetes", "aws", "azure", "git", "github", "ci/cd", "deploy", "frontend", "backend",
  "redação", "redacao", "dissertação", "dissertacao", "ensaio", "texto argumentativo",
  "doença", "doenca", "sintoma", "tratamento", "remédio", "remedio", "médico", "medico", "hospital",
  "futebol", "basquete", "vôlei", "volei", "campeonato", "time", "jogador", "gol",
  "filme", "série", "serie", "netflix", "youtube", "streamer", "jogo", "game", "playstation", "xbox", "música", "musica"
];

const MATH_KEYWORDS = [
  "matemática", "matematica", "matemático", "matematico", "álgebra", "algebra", "geometria", "trigonometria",
  "cálculo", "calculo", "derivada", "integral", "limite", "função", "funcao", "equação", "equacao",
  "inequação", "inequacao", "sistema", "matriz", "determinante", "autovalor", "autovetor", "espaço vetorial",
  "probabilidade", "estatística", "estatistica", "combinatória", "combinatoria", "aritmética", "aritmetica",
  "número", "numero", "inteiro", "racional", "irracional", "real", "complexo", "primo", "divisibilidade",
  "congruência", "congruencia", "módulo", "modulo", "logaritmo", "exponencial", "potência", "potencia", "raiz",
  "polinômio", "polinomio", "função quadrática", "função quadratica", "parábola", "parabola", "elipse",
  "hipérbole", "hiperbole", "circunferência", "circunferencia", "retângulo", "retangulo", "triângulo", "triangulo",
  "círculo", "circulo", "esfera", "cilindro", "cone", "pirâmide", "piramide", "prisma", "poliedro",
  "teorema", "prova", "demonstração", "demonstracao", "axioma", "postulado", "lema", "corolário", "corolario",
  "hipótese", "hipotese", "tese", "conjectura", "definição", "definicao", "propriedade", "identidade",
  "calcular", "calcule", "determinar", "determine", "resolver", "resolva", "encontrar", "encontre", "demonstrar", "demonstre",
  "simplificar", "simplifique", "fatorar", "fatore", "fatoração", "fatoracao", "fatorial",
  "soma", "somatório", "somatorio", "produto", "produtório", "produtorio", "fração", "fracao",
  "razão", "razao", "proporção", "proporcao", "porcentagem", "média", "media", "mediana", "variância", "variancia",
  "seno", "cosseno", "tangente", "cossecante", "secante", "cotangente", "hipotenusa", "cateto", "catetos", "arco", "graus", "radianos",
  "vetor", "vetores", "escalar", "base", "dimensão", "dimensao", "posto", "núcleo", "nucleo", "imagem",
  "sucessão", "sucessao", "sequência", "sequencia", "progressão", "progressao", "pa", "pg", "indução", "inducao",
  "invariante", "invariantes", "isometria", "homotetia", "área", "area", "perímetro", "perimetro", "volume"
];

function isMathRelated(text: string): boolean {
  const lower = text.toLowerCase().trim();
  for (const keyword of NON_MATH_KEYWORDS) {
    if (lower.includes(keyword)) {
      const regex = new RegExp(`(^|\\s|[.,!?;])${keyword}($|\\s|[.,!?;])`, "i");
      if (regex.test(lower)) return false;
    }
  }
  for (const keyword of MATH_KEYWORDS) {
    if (lower.includes(keyword)) return true;
  }
  const mathNotationRegex = /(\$.*?\$|\\\(.*?\\\)|\\\[.*?\\\]|\\frac|\\sqrt|\\sum|\\int|\^\{?\d+\}?|[∑∏∫∂∇√∞πθαβγδεζηλμσφω≤≥≠≈≡∈∉⊂⊃∪∩∅∀∃¬∧∨⇒⇔])/;
  if (mathNotationRegex.test(text)) return true;
  const basicMathRegex = /\d+\s*[\+\-\*\/\^=<>]\s*\d+|\d+\s*(?:cm|m|km|g|kg|L|s|min|h|°)\b/;
  return basicMathRegex.test(text);
}

export async function POST(req: NextRequest) {
  const routeStartedAt = Date.now();
  const remainingMs = () => ROUTE_BUDGET_MS - (Date.now() - routeStartedAt);
  try {
    const body = await req.json();
    const { enunciado, contextoQuestao } = body;

    if (!enunciado || typeof enunciado !== "string" || enunciado.trim().length < 10) {
      return NextResponse.json(
        { 
          error: "Envie uma dúvida ou problema matemático com no mínimo 10 caracteres. O LEMMAS é exclusivo para problemas, teoremas, demonstrações e deduções matemáticas ou físico-matemáticas.",
          blocked: true,
          reason: "query_muito_curta"
        },
        { status: 400 }
      );
    }

    if (enunciado.length > 2500) {
      return NextResponse.json(
        { error: "O texto do problema excede o limite máximo permitido de 2500 caracteres." },
        { status: 400 }
      );
    }

    if (!isMathRelated(enunciado)) {
      return NextResponse.json(
        { 
          error: "O LEMMAS é uma plataforma exclusiva para problemas, teoremas, demonstrações e deduções matemáticas ou físico-matemáticas. Não é permitido o uso para bate-papo casual, piadas ou assuntos fora do escopo das ciências matemáticas.",
          blocked: true,
          reason: "conteudo_nao_matematico"
        },
        { status: 400 }
      );
    }

    const authorization = req.headers.get("authorization") || "";
    const backendHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (authorization.startsWith("Bearer ")) {
      backendHeaders["Authorization"] = authorization;
    }

    // 1. Backend FastAPI (timeout curto 8s para evitar sequestro do maxDuration da Vercel)
    try {
      const backendResp = await fetch(`${BACKEND_URL}/api/tutor/compare`, {
        method: "POST",
        headers: backendHeaders,
        body: JSON.stringify({
          enunciado,
          contextoQuestao: contextoQuestao || undefined,
        }),
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      });

      if (backendResp.ok) {
        const backendData = await backendResp.json();
        if (backendData.model_a && backendData.model_b) {
          // Backend já retorna no formato correto (objetos com name/role/content)
          return NextResponse.json({
            model_a: backendData.model_a,
            model_b: backendData.model_b,
            sintese: backendData.sintese || "",
            provider: backendData.provider || "fastapi-backend",
            model_used: backendData.model_used || "mathai-gateway",
          });
        }
      }
      // Se backend falhou (não ok), cai para fallback direto
      console.warn("[Segunda Opinião] Backend falhou ou timeout, acionando fallback Gemini direto");
    } catch (backendErr) {
      console.warn("[Segunda Opinião] Falha ou timeout na chamada ao backend (8s), acionando fallback:", backendErr);
    }

    // 2. Fallback Primário: Gemini REST API (Segunda Opinião - dois modelos ortogonais)
    const PROMPT_SISTEMA_COMPARE = `Você é o comparador de modelos do LEMMAS (MathAI Engine).
Sua tarefa é gerar DOIS pareceres ORTOGONAIS sobre a mesma questão matemática.

MODELO A — RIGOR AXIOMÁTICO:
- Desenvolva EXCLUSIVAMENTE prova formal dedutiva universal
- Use partição canônica de áreas, teoremas fundamentais, definições rigorosas
- PROIBIDO: citar atalhos ad-hoc de concurso, fórmulas de memorização rápida (ex: r = (b+c-a)/2), "demonstração alternativa" que roube heurística
- Estilo: demonstração matemática pura, passo a passo, axiomática

MODELO B — INTUIÇÃO HEURÍSTICA:
- Explore homotetia de figuras primitivas (3-4-5), simetrias, macetes rápidos de tangência
- Atalhos de concurso, visualização geométrica, reconhecimento de padrões
- ÚNICO autorizado a usar heurísticas e "pulo do gato"
- Estilo: resolução rápida, insight visual, truques de banca

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON PURO):
{
  "model_a": "parecer rigoroso axiomático completo com LaTeX em $...$ e $$...$$",
  "model_b": "parecer heurístico intuitivo completo com LaTeX em $...$ e $$...$$",
  "sintese": "síntese comparativa breve destacando onde cada abordagem brilha"
}`;

    const comparePrompt = `Questão para Segunda Opinião:
${enunciado}
${contextoQuestao ? `\nContexto adicional: ${contextoQuestao}` : ""}

INSTRUÇÕES:
1. Gere DOIS pareceres ortogonais conforme as definições acima
2. Use LaTeX delimitado por $...$ (inline) ou $$...$$ (bloco) para TODAS as expressões matemáticas
3. NUNCA coloque texto explicativo em português dentro de $...$
4. Retorne EXCLUSIVAMENTE o objeto JSON especificado`;

    // 2.1 Gemini (primário - rápido, <1.5s)
    try {
      const geminiRes = await withDeadline(
        generateGeminiContent({
          prompt: comparePrompt,
          systemInstruction: PROMPT_SISTEMA_COMPARE,
          jsonOutput: true,
          temperature: 0.2,
          maxTokens: 3072,
          timeoutMs: 10000,
        }),
        Math.max(2000, Math.min(12000, remainingMs())),
        "gemini"
      );

      const parsed = safeParseJsonWithLatex(geminiRes.text);
      const rawA = parsed?.model_a ?? parsed?.modelo_a ?? parsed?.modelA;
      const rawB = parsed?.model_b ?? parsed?.modelo_b ?? parsed?.modelB;
      const contentA = typeof rawA === "string" ? rawA : (rawA?.content || rawA?.texto || "");
      const contentB = typeof rawB === "string" ? rawB : (rawB?.content || rawB?.texto || "");

      if (contentA && contentB) {
        return NextResponse.json({
          model_a: {
            name: (typeof rawA === "object" && rawA?.name) || "Rigor Axiomático e Prova Formal",
            role: (typeof rawA === "object" && rawA?.role) || "Demonstração Analítica & Invariantes",
            content: contentA,
          },
          model_b: {
            name: (typeof rawB === "object" && rawB?.name) || "Heurística & Atalhos Cognitivos",
            role: (typeof rawB === "object" && rawB?.role) || "Intuição Heurística & Atalhos Cognitivos",
            content: contentB,
          },
          sintese: parsed.sintese || parsed.synthesis || "",
          provider: "gemini-flash-lite",
          model_used: geminiRes.model,
        });
      }
    } catch (geminiErr) {
      console.warn("[Segunda Opinião] Gemini indisponível, acionando NVIDIA NIM:", geminiErr);
    }

    // 2.2 NVIDIA NIM (secundário - Nemotron Reasoning)
    // Só tenta se ainda houver orçamento na rota; senão vai direto ao 503.
    if (process.env.NVIDIA_API_KEY && remainingMs() > 4000) {
      try {
        const nvidiaRes = await withDeadline(
          generateNvidiaContent({
            prompt: `${comparePrompt}\n\nIMPORTANTE: Retorne EXCLUSIVAMENTE o objeto JSON válido, sem texto introdutório ou blocos markdown.`,
            systemInstruction: PROMPT_SISTEMA_COMPARE,
            temperature: 0.2,
            maxTokens: 3072,
            timeoutMs: 10000,
          }),
          Math.max(2000, remainingMs()),
          "nvidia"
        );

        const parsed = safeParseJsonWithLatex(nvidiaRes.text);
        const rawA = parsed?.model_a ?? parsed?.modelo_a ?? parsed?.modelA;
        const rawB = parsed?.model_b ?? parsed?.modelo_b ?? parsed?.modelB;
        const contentA = typeof rawA === "string" ? rawA : (rawA?.content || rawA?.texto || "");
        const contentB = typeof rawB === "string" ? rawB : (rawB?.content || rawB?.texto || "");

        if (contentA && contentB) {
          return NextResponse.json({
            model_a: {
              name: (typeof rawA === "object" && rawA?.name) || "Rigor Axiomático e Prova Formal",
              role: (typeof rawA === "object" && rawA?.role) || "Demonstração Analítica & Invariantes",
              content: contentA,
            },
            model_b: {
              name: (typeof rawB === "object" && rawB?.name) || "Heurística & Atalhos Cognitivos",
              role: (typeof rawB === "object" && rawB?.role) || "Intuição Heurística & Atalhos Cognitivos",
              content: contentB,
            },
            sintese: parsed.sintese || parsed.synthesis || "",
            provider: "nvidia-nemotron",
            model_used: nvidiaRes.model,
          });
        }
      } catch (nvidiaErr) {
        console.warn("[Segunda Opinião] Fallback NVIDIA NIM falhou:", nvidiaErr);
      }
    }

    // 3. Falha real de todos os provedores cognitivos (HTTP 503 sem mascarar com texto estático)
    return NextResponse.json(
      {
        error: "O serviço de Segunda Opinião está temporariamente indisponível. Todos os provedores de cognição estão sobrecarregados.",
        status: "unavailable",
      },
      { status: 503 }
    );
  } catch {
    return NextResponse.json(
      { error: "Erro interno ao processar a comparação de modelos." },
      { status: 500 }
    );
  }
}