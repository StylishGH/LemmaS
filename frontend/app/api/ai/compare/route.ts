import { NextRequest, NextResponse } from "next/server";
import { safeParseJsonWithLatex } from "@/lib/json-safe";

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

    const fullPrompt = contextoQuestao 
      ? `Contexto da questão: ${contextoQuestao}\n\nDúvida do estudante: ${enunciado}`
      : enunciado;

    const authorization = req.headers.get("authorization") || "";
    const backendHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (authorization.startsWith("Bearer ")) {
      backendHeaders["Authorization"] = authorization;
    }

    // 1. Centralização: Requisição ao Backend FastAPI (MathAI Engine no Render)
    // Timeout coordenado de 8 segundos: permite resposta se aquecido, mas não sequestra o tempo total
    try {
      const backendResp = await fetch(`${BACKEND_URL}/api/tutor/compare`, {
        method: "POST",
        headers: backendHeaders,
        body: JSON.stringify({
          enunciado: fullPrompt,
          contextoQuestao: contextoQuestao || undefined,
        }),
        signal: AbortSignal.timeout(8000),
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
      } else {
        console.warn(`[Segunda Opinião] Backend respondeu status ${backendResp.status}. Ativando fallback resiliente do Next.js...`);
      }
    } catch (backendErr) {
      console.warn("[Segunda Opinião] Falha ou timeout na chamada ao backend:", backendErr);
    }

    // 2. Inferência Direta de Alta Performance via Gemini (Latência ~1s com KaTeX real)
    try {
      const { generateGeminiContent } = await import("@/lib/gemini");
      const systemInstruction = `Você é o motor de Segunda Opinião do LEMMAS (MathAI Engine), especializado em resolver problemas matemáticos comparando duas correntes pedagógicas consagradas:

REGRAS ESTRITAS DE LATEX E FORMATAÇÃO:
- TODA e qualquer expressão, equação ou símbolo matemático DEVE estar rigorosamente delimitado por $...$ (para inline, ex: $r = 2\\text{ cm}$, $a=6$) ou $$...$$ (para fórmulas em destaque em linha própria, ex: $$r = \\frac{a + b - c}{2}$$).
- NUNCA escreva comandos LaTeX como \\frac, \\sqrt, \\implies, \\text ou fórmulas soltas sem os delimitadores $ ou $$.
- NUNCA deixe delimitadores desbalanceados ou abertos (como $... sem fechar).
- Utilize cabeçalhos markdown ### limpos para cada etapa.

REGRA DE OURO: DIVERGÊNCIA METODOLÓGICA ESTRITA (ORTOGONALIDADE & NÃO-CANIBALIZAÇÃO):
O MODELO A e o MODELO B NUNCA devem convergir para o mesmo método, atalho ou fórmula intermediária. É TERMINANTEMENTE PROIBIDO que ambos ensinem o mesmo macete no final.

1. MODEL_A ("Rigor Axiomático e Prova Formal"):
- Foco exclusivo em demonstração formal, dedutiva e analítica a partir de primeiros princípios e teoremas universais (ex: decomposição axiomática em áreas $S = p \\cdot r$, geometria analítica, sistemas de equações fundamentais ou cálculo).
- PROIBIÇÃO EXPRESSA: NUNCA utilize fórmulas mnemônicas ad-hoc de concurso (como $r = \\frac{b+c-a}{2}$ no triângulo retângulo), atalhos locais de prova rápida e NUNCA inclua seções de 'demonstração alternativa' que roubem a heurística do Modelo B. Desenvolva UMA ÚNICA demonstração dedutiva pura, universal e rigorosa.
- Estrutura esperada:
  ### 1. Definições e Lemas Universais
  ### 2. Dedução Analítica Formal
  ### 3. Solução Axiomática Passo a Passo
  ### 4. Domínio de Validade e Invariantes

2. MODEL_B ("Heurística & Atalhos Cognitivos"):
- Foco na intuição geométrica/visual e velocidade de prova. É AQUI e APENAS AQUI que devem ser explorados: reconhecimento de padrões (ex: homotetia de ternas pitagóricas 3-4-5), simetria, análise de casos extremos e os macetes rápidos de concurso (como tangências no vértice reto gerando $r = \\frac{b+c-a}{2}$).
- Estrutura esperada:
  ### 1. Visualização Intuitiva & Padrões
  ### 2. O Atalho Tático (Pulo do Gato)
  ### 3. Resolução Rápida com Mínimo de Contas
  ### 4. Dica Socrática para Provas de Alto Rendimento

3. SINTESE:
- Contraste pedagógico cristalino mostrando como o rigor formal constrói a fundamentação axiomática universal para o ensino, enquanto a heurística tática fornece agilidade mental indispensável em vestibulares e concursos militares.

Retorne EXCLUSIVAMENTE um objeto JSON válido no seguinte formato:
{
  "model_a": {
    "name": "Rigor Axiomático e Prova Formal",
    "role": "Demonstração Analítica & Invariantes",
    "content": "texto em markdown com fórmulas LaTeX devidamente delimitadas ($...$ e $$...$$)"
  },
  "model_b": {
    "name": "Heurística & Atalhos Cognitivos",
    "role": "Intuição Heurística & Atalhos Cognitivos",
    "content": "texto em markdown com fórmulas LaTeX devidamente delimitadas ($...$ e $$...$$)"
  },
  "sintese": "reflexão metacognitiva sobre as duas abordagens com fórmulas em LaTeX delimitadas"
}`;

      const geminiRes = await generateGeminiContent({
        prompt: `Problema / Enunciado:\n${fullPrompt}`,
        systemInstruction,
        jsonOutput: true,
        temperature: 0.2,
        timeoutMs: 12000,
      });

      const parsed = safeParseJsonWithLatex(geminiRes.text);
      if (parsed.model_a && parsed.model_b) {
        return NextResponse.json({
          model_a: parsed.model_a,
          model_b: parsed.model_b,
          sintese: parsed.sintese || "",
          provider: "gemini-cascade",
          model_used: geminiRes.model,
        });
      }
    } catch (geminiErr) {
      console.warn("[Segunda Opinião] Fallback Gemini falhou:", geminiErr);
    }

    // 2.5. Inferência Terciária de Respaldo via NVIDIA NIM Direct
    try {
      const { generateNvidiaContent } = await import("@/lib/nvidia");
      const systemInstructionNvidia = `Você é o motor de Segunda Opinião do LEMMAS (MathAI Engine).
Retorne EXCLUSIVAMENTE um JSON válido com chaves:
{
  "model_a": { "name": "Rigor Axiomático e Prova Formal", "role": "Demonstração Analítica & Invariantes", "content": "..." },
  "model_b": { "name": "Heurística & Atalhos Cognitivos", "role": "Intuição Heurística & Atalhos Cognitivos", "content": "..." },
  "sintese": "..."
}`;
      const nvidiaRes = await generateNvidiaContent({
        prompt: `Problema / Enunciado:\n${fullPrompt}`,
        systemInstruction: systemInstructionNvidia,
        temperature: 0.2,
        timeoutMs: 8000,
      });

      const parsedNvidia = safeParseJsonWithLatex(nvidiaRes.text);
      if (parsedNvidia.model_a && parsedNvidia.model_b) {
        return NextResponse.json({
          model_a: parsedNvidia.model_a,
          model_b: parsedNvidia.model_b,
          sintese: parsedNvidia.sintese || "",
          provider: "nvidia-nim",
          model_used: nvidiaRes.model,
        });
      }
    } catch (nvidiaErr) {
      console.warn("[Segunda Opinião] Fallback NVIDIA NIM falhou:", nvidiaErr);
    }

    // 3. Quando todos os provedores falharem, retorna indisponibilidade real (HTTP 503) sem mascarar falha
    return NextResponse.json(
      {
        error: "O motor de Segunda Opinião está temporariamente indisponível. Todos os provedores cognitivos estão sobrecarregados ou sem resposta.",
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