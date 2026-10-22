import { NextRequest, NextResponse } from "next/server";
import { generateGeminiContent } from "@/lib/gemini";
import { generateNvidiaContent } from "@/lib/nvidia";
import { safeParseJsonWithLatex } from "@/lib/json-safe";

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
  const mathNotationRegex = /(\$.*?\$|\\\(.*?\\\)|\\\[.*?\\\]|\\frac|\\sqrt|\\sum|\\int|\^\{?\d+\}?|[∑∏∫∂∇√∞πθαβγδεζηλμσφω≤≥≠≈≡∈∉⊂⊃∪∩∅∀∃¬∧∨⇒⇔])/;
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
      const geminiRes = await generateGeminiContent({
        prompt: comparePrompt,
        systemInstruction: PROMPT_SISTEMA_COMPARE,
        jsonOutput: true,
        temperature: 0.2,
        maxTokens: 3072,
        timeoutMs: 14000,
      });

      const parsed = safeParseJsonWithLatex(geminiRes.text);
      if (parsed && parsed.model_a && parsed.model_b) {
        return NextResponse.json({
          model_a: {
            name: "Rigor Axiomático e Prova Formal",
            role: "Demonstração Analítica & Invariantes",
            content: parsed.model_a,
          },
          model_b: {
            name: "Heurística & Atalhos Cognitivos",
            role: "Intuição Heurística & Atalhos Cognitivos",
            content: parsed.model_b,
          },
          sintese: parsed.sintese || "",
          provider: "gemini-flash-lite",
          model_used: geminiRes.model,
        });
      }
    } catch (geminiErr) {
      console.warn("[Segunda Opinião] Gemini indisponível, acionando NVIDIA NIM:", geminiErr);
    }

    // 2.2 NVIDIA NIM (secundário - Nemotron Reasoning)
    if (process.env.NVIDIA_API_KEY) {
      try {
        const nvidiaRes = await generateNvidiaContent({
          prompt: `${comparePrompt}\n\nIMPORTANTE: Retorne EXCLUSIVAMENTE o objeto JSON válido, sem texto introdutório ou blocos markdown.`,
          systemInstruction: PROMPT_SISTEMA_COMPARE,
          temperature: 0.2,
          maxTokens: 3072,
          timeoutMs: 14000,
        });

        const parsed = safeParseJsonWithLatex(nvidiaRes.text);
        if (parsed && parsed.model_a && parsed.model_b) {
          return NextResponse.json({
            model_a: {
              name: "Rigor Axiomático e Prova Formal",
              role: "Demonstração Analítica & Invariantes",
              content: parsed.model_a,
            },
            model_b: {
              name: "Heurística & Atalhos Cognitivos",
              role: "Intuição Heurística & Atalhos Cognitivos",
              content: parsed.model_b,
            },
            sintese: parsed.sintese || "",
            provider: "nvidia-nemotron",
            model_used: nvidiaRes.model,
          });
        }
      } catch (nvidiaErr) {
        console.warn("[Segunda Opinião] Fallback NVIDIA NIM falhou:", nvidiaErr);
      }
    }

    // 3. Fallback Determinístico (Uptime 100% garantido)
    const fallbackSintese = "Resposta em modo contingência: Modelo A fornece a demonstração formal universal; Modelo B oferece o atalho visual de concurso. Em produção, a IA geraria pareceres específicos ao enunciado.";
    const fallbackModelA = `**Modelo A — Rigor Axiomático (Contingência)**

Análise rigorosa do enunciado proposto. Pela definição formal dos objetos matemáticos envolvidos, aplicamos a estrutura axiomática padrão.

Seja o problema enquadrado em seu domínio teórico. As hipóteses são explicitadas e o teorema fundamental aplicável é invocado.

**Demonstração:**
1. Identificação das condições necessárias e suficientes
2. Aplicação da propriedade canônica (ex: partição de áreas $S = p \\\\cdot r$ para triângulos)
3. Encadeamento dedutivo sem saltos lógicos
4. Conclusão pela validade universal do resultado

$\\\\therefore$ A solução decorre diretamente dos axiomas e definições.`;

    const fallbackModelB = `**Modelo B — Intuição Heurística (Contingência)**

Visão rápida: reconheça o padrão clássico. Muitas questões dessa família reduzem-se a figuras notáveis.

**Macete direto:**
- Identifique o triângulo 3-4-5 ou homotetia de primitiva
- Use tangência e simetria: $r = \\\\frac{b+c-a}{2}$ (triângulo retângulo)
- Área pelo produto dos catetos ou $S = p \\\\cdot r$

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