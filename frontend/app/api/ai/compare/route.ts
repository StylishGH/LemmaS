import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = (process.env.LEMMAS_BACKEND_URL || "https://mathai-7i7r.onrender.com").replace(/\/$/, "");

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

    // 1. Autoridade Única: Backend FastAPI (/api/tutor/compare) com tolerância a cold start (45s)
    try {
      const backendResp = await fetch(`${BACKEND_URL}/api/tutor/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enunciado: fullPrompt,
          contextoQuestao: contextoQuestao || undefined,
        }),
        signal: AbortSignal.timeout(45000), // Tolerância a cold-start
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
    } catch (backendErr) {
      console.warn("[Segunda Opinião Proxy] Backend FastAPI indisponível ou timeout, acionando contingência determinística:", backendErr);
    }

    // 2. Contingência Autônoma Determinística LEMMAS (Zero chamadas diretas a APIs externas)
    return NextResponse.json({
      model_a: {
        name: "Rigor Axiomático e Prova Formal (LEMMAS Core)",
        role: "Demonstração Analítica & Invariantes Fundamentais",
        content: `**1. Identificação Estrutural:** Para o problema apresentado, isole as grandezas invariantes e aplique as definições axiomáticas canônicas.\n\n**2. Encadeamento Lógico:** Todo passo dedutivo deve derivar estritamente das hipóteses iniciais via teoremas fundamentais em LaTeX, garantindo consistência formal.\n\n**3. Conclusão:** A demonstração analítica estabelece a verdade irrefutável sob as condições do sistema formal.`,
      },
      model_b: {
        name: "Intuição Heurística & Atalhos de Gauss (LEMMAS Core)",
        role: "Heurística Visual & Raciocínio Socrático",
        content: `**1. Análise Heurística:** Investigue casos extremos, verifique simetrias bilaterais e avalie o comportamento assintótico.\n\n**2. Atalho Cognitivo:** Muitas vezes, uma mudança de referencial ou a consideração de propriedades invariantes permite deduzir o resultado em poucas etapas.\n\n**3. Insight Socrático:** Pergunte-se qual propriedade global o problema conserva ao ser perturbado.`,
      },
      sintese: "O confronto entre o rigor analítico formal e a intuição geométrica heurística consolida a verdadeira maturidade matemática necessária para exames de alto nível e formação sólida.",
      provider: "lemmas-autonomous-contingency",
      model_used: "lemmas-deterministic-v1",
    });
    
  } catch {
    return NextResponse.json(
      { error: "Erro interno ao processar a comparação de modelos." },
      { status: 500 }
    );
  }
}