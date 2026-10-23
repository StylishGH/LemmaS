import { NextRequest, NextResponse } from "next/server";
import { safeParseJsonWithLatex } from "@/lib/json-safe";
import { generateOmniRouteContent } from "@/lib/omniroute";

// Node.js process types for process.env
/// <reference types="node" />

const BACKEND_URL = (process.env.LEMMAS_BACKEND_URL || "https://mathai-7i7r.onrender.com").replace(/\/$/, "");

export const maxDuration = 30;

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
  const mathNotationRegex = /(\$.*?\$|\\(.*?\\)|\\[.*?\\]|\\frac|\\sqrt|\\sum|\\int|\^\{?\d+\}?|[∑∏∫∂∇√∞πθαβγδεζηλμσφω≤≥≠≈≡∈∉⊂⊃∪∩∅∀∃¬∧∨⇒⇔])/;
  if (mathNotationRegex.test(text)) return true;
  const basicMathRegex = /\d+\s*[\+\-\*\/\^=<>]\s*\d+|\d+\s*(?:cm|m|km|g|kg|L|s|min|h|°)\b/;
  return basicMathRegex.test(text);
}

export async function POST(req: NextRequest) {
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

    // 1. Backend FastAPI no Render (timeout 25s para caber no maxDuration=30s da Vercel)
    try {
      const backendResp = await fetch(`${BACKEND_URL}/api/tutor/compare`, {
        method: "POST",
        headers: backendHeaders,
        body: JSON.stringify({
          enunciado,
          contextoQuestao: contextoQuestao || undefined,
        }),
        signal: AbortSignal.timeout(25000),
        cache: "no-store",
      });

      if (backendResp.ok) {
        const backendData = await backendResp.json();
        if (backendData.model_a && backendData.model_b) {
          return NextResponse.json({
            model_a: backendData.model_a,
            model_b: backendData.model_b,
            sintese: backendData.sintese || "",
            provider: backendData.provider || "fastapi-backend",
            model_used: backendData.model_used || "mathai-gateway",
          });
        }
      }
      console.warn("[Segunda Opinião] Backend respondeu com erro:", backendResp.status);
    } catch (backendErr) {
      console.warn("[Segunda Opinião] Falha ou timeout na chamada ao backend (25s):", backendErr);
    }

    // 2. OmniRoute (Azure) — Segunda Opinião com DOIS modelos NVIDIA distintos (cérebros diferentes)
    if (process.env.OMNIROUTE_API_KEY) {
      try {
        // Chamada 1 — Resposta Principal (Modelo A — Rigor Axiomático)
        // Usa nvidia/nvidia/nemotron-3-ultra-550b-a55b (modelo gigante da NVIDIA, 550B parâmetros)
        const omniRes1 = await generateOmniRouteContent({
          prompt: `Você é o Sistema de Segunda Opinião do LEMMAS (MathAI Engine). Gere a RESPOSTA PRINCIPAL (Modelo A — Rigor Axiomático e Prova Formal) para a questão matemática abaixo. Desenvolva exclusivamente prova formal dedutiva universal, sem atalhos de concurso, sem fórmulas de memorização rápida.

ENUNCIADO: ${enunciado}
${contextoQuestao ? `CONTEXTO: ${contextoQuestao}` : ""}

Retorne EXCLUSIVAMENTE JSON válido com:
\{
  "modelo_a": "conteúdo completo do Modelo A com LaTeX em \\$\\$...\\$\\$"
\}`,
          systemInstruction: "Você é um tutor de matemática especializado em demonstração formal axiomática. Responda SOMENTE com JSON válido.",
          model: "nvidia/nvidia/nemotron-3-ultra-550b-a55b",
          temperature: 0.15,
          maxTokens: 2000,
          timeoutMs: 15000,
        });

        const parsed1 = safeParseJsonWithLatex(omniRes1.text);
        const modeloA = parsed1?.modelo_a || "";

        // Chamada 2 — Segunda Opinião (Modelo B — Intuição Heurística)
        // Usa nvidia/google/gemma-4-31b-it (modelo Google Gemma hospedado na NVIDIA NIM, 31B parâmetros)
        const omniRes2 = await generateOmniRouteContent({
          prompt: `Você é o Sistema de Segunda Opinião do LEMMAS (MathAI Engine). Gere a SEGUNDA OPINIÃO (Modelo B — Intuição Heurística) para a mesma questão abaixo. Explore homotetia de figuras primitivas, simetrias e macetes rápidos de tangência. Dê uma abordagem diferente da resposta principal.

ENUNCIADO: ${enunciado}
${contextoQuestao ? `CONTEXTO: ${contextoQuestao}` : ""}

Retorne EXCLUSIVAMENTE JSON válido com:
\{
  "modelo_b": "conteúdo completo do Modelo B com LaTeX em \\$\\$...\\$\\$",
  "sintese": "síntese pedagógica comparando as duas abordagens"
\}`,
          systemInstruction: "Você é um tutor de matemática especializado em heurística e atalhos cognitivos. Responda SOMENTE com JSON válido.",
          model: "nvidia/google/gemma-4-31b-it",
          temperature: 0.15,
          maxTokens: 2000,
          timeoutMs: 15000,
        });

        const parsed2 = safeParseJsonWithLatex(omniRes2.text);

        if ((parsed1?.modelo_a || parsed2?.modelo_b)) {
          return NextResponse.json({
            model_a: {
              name: "Rigor Axiomático e Prova Formal",
              role: "Demonstração Analítica & Invariantes",
              content: modeloA,
            },
            model_b: {
              name: "Heurística & Atalhos Cognitivos",
              role: "Intuição Heurística & Atalhos Cognitivos",
              content: parsed2?.modelo_b || "",
            },
            sintese: parsed2?.sintese || "Comparação gerada pelo OmniRoute (Azure) com dois modelos NVIDIA distintos.",
            provider: "omniroute-azure",
            ia_usada: "OmniRoute (Azure) - MathAI (Nemotron 550B + Gemma 31B)",
            model_used: `${omniRes1.model} + ${omniRes2.model}`,
          });
        }
      } catch (omniErr) {
        console.warn("[Segunda Opinião] Fallback OmniRoute falhou:", omniErr);
      }
    }

    // 3. Fallback Determinístico (Uptime 100% garantido) — sem keys no Vercel
    const fallbackSintese = "Resposta em modo contingência: Modelo A fornece a demonstração formal universal; Modelo B oferece o atalho visual de concurso. Em produção, a IA geraria pareceres específicos ao enunciado.";
    const fallbackModelA = `**Modelo A — Rigor Axiomático (Contingência)**

Análise rigorosa do enunciado proposto. Pela definição formal dos objetos matemáticos envolvidos, aplicamos a estrutura axiomática padrão.

Seja o problema enquadrado em seu domínio teórico. As hipóteses são explicitadas e o teorema fundamental aplicável é invocado.

**Demonstração:**
1. Identificação das condições necessárias e suficientes
2. Aplicação da propriedade canônica (ex: partição de áreas $S = p \\cdot r$ para triângulos)
3. Encadeamento dedutivo sem saltos lógicos
4. Conclusão pela validade universal do resultado

$\\therefore$ A solução decorre diretamente dos axiomas e definições.`;


const fallbackModelB = `**Modelo B — Intuição Heurística (Contingência)**

Visão rápida: reconheça o padrão clássico. Muitas questões dessa família reduzem-se a figuras notáveis.

**Macete direto:**
- Identifique o triângulo 3-4-5 ou homotetia de primitiva
- Use tangência e simetria: $r = \\frac{b+c-a}{2}$ (triângulo retângulo)
- Área pelo produto dos catetos ou $S = p \\cdot r$

**Resolução em 3 passos:**
1. Desenhe a figura e marque o que é igual
2. Aplique a relação métrica imediata
3. Confira no gabarito

O "pulo do gato" está na simetria da configuração.`;

    return NextResponse.json({
      model_a: {
        name: "Rigor Axiomático e Prova Formal",
        role: "Demonstração Analítica & Invariantes",
        content: fallbackModelA,
      },
      model_b: {
        name: "Heurística & Atalhos Cognitivos",
        role: "Intuição Heurística & Atalhos Cognitivos",
        content: fallbackModelB,
      },
      sintese: fallbackSintese,
      provider: "lemmas-contingency",
      model_used: "deterministic-fallback",
    });
  } catch {
    return NextResponse.json(
      { error: "Erro interno ao processar a comparação de modelos." },
      { status: 500 }
    );
  }
}
