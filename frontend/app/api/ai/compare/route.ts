import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = (process.env.LEMMAS_BACKEND_URL || "https://mathai-7i7r.onrender.com").replace(/\/$/, "");

// Guardrail: palavras-chave que indicam conteúdo NÃO matemático ou spam/bate-papo
const NON_MATH_KEYWORDS = [
  // Conversa casual, cumprimentos, piadas e off-topic
  "olá", "ola", "oi", "tudo bem", "como vai", "bom dia", "boa tarde", "boa noite", "tchau", "adeus",
  "obrigado", "obrigada", "por favor", "desculpa", "desculpe", "legal", "show", "top", "daora",
  "piada", "charada", "quem é você", "quem e voce", "quem você é", "quem voce e", "qual seu nome",
  "conte uma história", "conte uma historia", "poema", "poesia", "letra de música",

  // Receitas, culinária
  "receita", "cozinhar", "ingrediente", "tempero", "forno", "fogão", "fogao", "panela", "bolo", "pão", "pao",
  "carne", "frango", "peixe", "salada", "sobremesa", "lanche", "jantar", "almoço", "almoco", "café", "cafe",
  "como fazer bolo", "como cozinhar",

  // Política, ideologia
  "política", "politica", "eleição", "eleicao", "partido", "governo", "presidente", "deputado", "senador",
  "esquerda", "direita", "centro", "ideologia", "comunismo", "capitalismo", "fascismo", "anarquismo",
  
  // Programação geral de software (não matemática)
  "javascript", "typescript", "react", "vue", "angular", "node",
  "html", "css", "docker", "kubernetes", "aws", "azure",
  "git", "github", "gitlab", "ci/cd", "deploy", "frontend", "backend", "fullstack",
  
  // Redação, textos
  "redação", "redacao", "dissertação", "dissertacao", "ensaio", "texto argumentativo",
  
  // Saúde, medicina
  "doença", "doenca", "sintoma", "tratamento", "remédio", "remedio", "médico", "medico", "hospital",
  
  // Esportes e entretenimento
  "futebol", "basquete", "vôlei", "volei", "campeonato", "time", "jogador", "gol",
  "filme", "série", "serie", "netflix", "youtube", "streamer", "jogo", "game", "playstation", "xbox",
  "música", "musica", "banda", "cantor",
];

const MATH_KEYWORDS = [
  // Matemática básica e avançada
  "matemática", "matematica", "matemático", "matematico", "álgebra", "algebra", "geometria", "trigonometria",
  "cálculo", "calculo", "derivada", "integral", "limite", "função", "funcao", "equação", "equacao",
  "inequação", "inequacao", "sistema", "matriz", "determinante", "autovalor", "autovetor", "espaço vetorial",
  "probabilidade", "estatística", "estatistica", "combinatória", "combinatoria", "aritmética", "aritmetica",
  "número", "numero", "inteiro", "racional", "irracional", "real", "complexo", "primo", "divisibilidade",
  "congruência", "congruencia", "módulo", "modulo", "logaritmo", "exponencial", "potência", "potencia", "raiz",
  "polinômio", "polinomio", "função quadrática", "função quadratica", "parábola", "parabola", "elipse", "elipse",
  "hipérbole", "hiperbole", "circunferência", "circunferencia", "retângulo", "retangulo", "triângulo", "triangulo",
  "círculo", "circulo", "esfera", "cilindro", "cone", "pirâmide", "piramide", "prisma", "poliedro",
  "teorema", "prova", "demonstração", "demonstracao", "axioma", "postulado", "lema", "corolário", "corolario",
  "hipótese", "hipotese", "tese", "conjectura", "definição", "definicao", "propriedade", "identidade",
  
  // Verbos e operações matemáticas comuns
  "calcular", "calcule", "determinar", "determine", "resolver", "resolva", "encontrar", "encontre", "demonstrar", "demonstre",
  "simplificar", "simplifique", "fatorar", "fatore", "fatoração", "fatoracao", "fatorial",
  "soma", "somatório", "somatorio", "produto", "produtório", "produtorio", "fração", "fracao",
  "razão", "razao", "proporção", "proporcao", "porcentagem", "média", "media", "mediana", "variância", "variancia",
  "seno", "cosseno", "tangente", "cossecante", "secante", "cotangente", "hipotenusa", "cateto", "catetos", "arco", "graus", "radianos",
  "vetor", "vetores", "escalar", "base", "dimensão", "dimensao", "posto", "núcleo", "nucleo", "imagem",
  "sucessão", "sucessao", "sequência", "sequencia", "progressão", "progressao", "pa", "pg", "indução", "inducao",
  "invariante", "invariantes", "isometria", "homotetia", "área", "area", "perímetro", "perimetro", "volume",

  // Notação matemática comum
  "∑", "∏", "∫", "∂", "∇", "√", "∞", "π", "θ", "α", "β", "γ", "δ", "ε", "ζ", "η", "λ", "μ", "σ", "φ", "ω",
  "≤", "≥", "≠", "≈", "≡", "∈", "∉", "⊂", "⊃", "∪", "∩", "∅", "∀", "∃", "¬", "∧", "∨", "⇒", "⇔",
];

function isMathRelated(text: string): boolean {
  const lower = text.toLowerCase().trim();
  
  // Bloqueio imediato de queries de bate-papo puro ou piadas
  for (const keyword of NON_MATH_KEYWORDS) {
    if (lower.includes(keyword.toLowerCase())) {
      const regex = new RegExp(`(^|\\s|[.,!?;])${keyword.toLowerCase()}($|\\s|[.,!?;])`, "i");
      if (regex.test(lower)) {
        return false;
      }
    }
  }
  
  // Permissão por palavras-chave matemáticas
  for (const keyword of MATH_KEYWORDS) {
    if (lower.includes(keyword.toLowerCase())) {
      return true;
    }
  }
  
  // Permissão por notação matemática (LaTeX, potências, raízes, chaves, operadores)
  const mathNotationRegex = /(\$.*?\$|\\\(.*?\\\)|\\\[.*?\\\]|\\frac|\\sqrt|\\sum|\\int|\^\{?\d+\}?|[∑∏∫∂∇√∞πθαβγδεζηλμσφω≤≥≠≈≡∈∉⊂⊃∪∩∅∀∃¬∧∨⇒⇔])/;
  if (mathNotationRegex.test(text)) {
    return true;
  }
  
  // Permissão por números e operadores matemáticos básicos
  const basicMathRegex = /\d+\s*[\+\-\*\/\^=<>]\s*\d+|\d+\s*(?:cm|m|km|g|kg|L|s|min|h|°)\b/;
  if (basicMathRegex.test(text)) {
    return true;
  }
  
  return false;
}

// System instruction para garantir escopo matemático e formato estruturado
const SYSTEM_PROMPT = `Sou o Tutor Matemático do LemmaS. Meu escopo é estritamente limitado à matemática, física-matemática, deduções lógicas e resolução de problemas. Se a entrada não for um problema matemático ou lógico, recuso a resposta e solicito um problema matemático válido.

Você é o motor de Metacognição e Comparação de Lemas do LemmaS.
Sua função é analisar o problema matemático fornecido sob DUAS perspectivas cognitivas complementares e sintetizar o aprendizado pedagógico:

1. PERSPECTIVA A (Rigor Axiomático e Prova Formal):
- Demonstração rigorosa, definições formais, propriedades e invariantes algébricos.
- Notação matemática estrita em LaTeX: inline com $ ... $ e display com $$ ... $$.

2. PERSPECTIVA B (Intuição Heurística & Atalhos Cognitivos):
- Intuição visual, simetrias, casos extremos, análise dimensional, atalhos de prova ou raciocínio socrático.
- Foco em elegância e rapidez conceitual. Notação em LaTeX com $ ... $.

3. SÍNTESE PEDAGÓGICA (Para o Licenciando em Matemática):
- Comparativo conciso explicando a riqueza de contrastar as duas visões pedagógicas.

IMPORTANTE: Responda EXCLUSIVAMENTE em formato JSON válido com as seguintes chaves:
{
  "model_a": {
    "name": "Rigor Axiomático e Prova Formal",
    "role": "Demonstração Analítica & Invariantes",
    "content": "...texto explicativo com LaTeX..."
  },
  "model_b": {
    "name": "Heurística & Atalhos Cognitivos",
    "role": "Intuição Heurística & Atalhos Cognitivos",
    "content": "...texto explicativo com LaTeX..."
  },
  "sintese": "...texto explicativo da síntese pedagógica com LaTeX..."
}
NÃO inclua texto ou blocos markdown fora do JSON.`;

function extractJsonPayload(rawText: string): any {
  let cleaned = rawText.trim();
  // Remove blocos de código markdown se o modelo envolver em ```json ... ```
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { enunciado, contextoQuestao } = body;

    // Validação básica e guardrail anti-abuso
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

    // GUARDRAIL: Verifica se o conteúdo é estritamente matemático
    const isMath = isMathRelated(enunciado);
    if (!isMath) {
      return NextResponse.json(
        { 
          error: "O LEMMAS é uma plataforma exclusiva para problemas, teoremas, demonstrações e deduções matemáticas ou físico-matemáticas. Não é permitido o uso para bate-papo casual, piadas ou assuntos fora do escopo das ciências matemáticas.",
          blocked: true,
          reason: "conteudo_nao_matematico"
        },
        { status: 400 }
      );
    }

    // Se há contexto da questão, anexa ao enunciado
    const fullPrompt = contextoQuestao 
      ? `Contexto da questão: ${contextoQuestao}\n\nDúvida do estudante: ${enunciado}`
      : enunciado;

    // Tentativa 1: NVIDIA NIM (Server-Side — chave nunca exposta ao cliente)
    const nvidiaKey = process.env.NVIDIA_API_KEY;
    if (nvidiaKey && nvidiaKey.trim()) {
      try {
        const nimResp = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${nvidiaKey.trim()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "nvidia/nemotron-3-super-120b-a12b",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: fullPrompt }
            ],
            max_tokens: 1600,
            temperature: 0.2,
          }),
          signal: AbortSignal.timeout(28000),
          cache: "no-store",
        });

        if (nimResp.ok) {
          const nimData = await nimResp.json();
          const content = nimData?.choices?.[0]?.message?.content;
          if (content) {
            const parsed = extractJsonPayload(content);
            if (parsed.model_a && parsed.model_b) {
              return NextResponse.json({
                model_a: {
                  name: parsed.model_a.name || "Rigor Axiomático e Prova Formal",
                  role: parsed.model_a.role || "Demonstração Analítica & Invariantes",
                  content: parsed.model_a.content || "",
                },
                model_b: {
                  name: parsed.model_b.name || "Heurística & Atalhos Cognitivos",
                  role: parsed.model_b.role || "Intuição Heurística & Atalhos Cognitivos",
                  content: parsed.model_b.content || "",
                },
                sintese: parsed.sintese || "",
                provider: "nvidia-nim",
              });
            }
          }
        }
      } catch (nimErr) {
        // Fallback resiliente e seguro para Gemini
        console.warn("[Segunda Opinião] NVIDIA NIM falhou ou timeout, acionando fallback Gemini.");
      }
    }

    // Tentativa 2: Gemini Flash Lite (Server-Side Fallback)
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && geminiKey.trim()) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${geminiKey.trim()}`;
        const geminiResp = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${SYSTEM_PROMPT}\n\nProblema do estudante:\n${fullPrompt}` }]
              }
            ],
            generationConfig: {
              response_mime_type: "application/json",
              temperature: 0.2,
              max_output_tokens: 1600,
            }
          }),
          signal: AbortSignal.timeout(15000),
          cache: "no-store",
        });

        if (geminiResp.ok) {
          const geminiData = await geminiResp.json();
          const content = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (content) {
            const parsed = extractJsonPayload(content);
            if (parsed.model_a && parsed.model_b) {
              return NextResponse.json({
                model_a: {
                  name: parsed.model_a.name || "Rigor Axiomático e Prova Formal",
                  role: parsed.model_a.role || "Demonstração Analítica & Invariantes",
                  content: parsed.model_a.content || "",
                },
                model_b: {
                  name: parsed.model_b.name || "Heurística & Atalhos Cognitivos",
                  role: parsed.model_b.role || "Intuição Heurística & Atalhos Cognitivos",
                  content: parsed.model_b.content || "",
                },
                sintese: parsed.sintese || "",
                provider: "gemini-fallback",
              });
            }
          }
        }
      } catch (geminiErr) {
        console.warn("[Segunda Opinião] Gemini fallback também falhou.");
      }
    }

    return NextResponse.json(
      { error: "Os serviços de cognição estão temporariamente indisponíveis. Tente novamente em instantes." },
      { status: 503 }
    );
    
  } catch {
    // Sanitização estrita: NUNCA vaza detalhes de exceção ou headers no JSON público
    return NextResponse.json(
      { error: "Erro interno ao processar a comparação de modelos." },
      { status: 500 }
    );
  }
}