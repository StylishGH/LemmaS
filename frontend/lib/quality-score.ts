/**
 * Motor de Pontuação de Qualidade (Quality Score) para o LEMMAS.
 *
 * Prioriza itens ricos e de alto valor pedagógico para o estudante:
 * - Enunciado substancial e bem formatado
 * - Alternativas completas (A-E) para objetivas ou proposta robusta para discursivas
 * - Gabarito oficial presente e válido
 * - Resolução passo a passo / solução autoral
 * - Lema matemático / estratégias esperadas associadas
 * - Bancas principais e de alto prestígio (ITA, IME, AFA, EFOMM, OBM, ENEM)
 * - Provas recentes
 *
 * Penaliza severamente itens incompletos, testes preliminares ou registros corrompidos,
 * empurrando-os para o fim da listagem sem jamais ordenar por id ASC.
 */

export interface QuestionQualityInput {
  id?: number;
  enunciado?: string | null;
  alternativas?: Record<string, string> | null;
  gabarito?: string | null;
  solucao?: string | null;
  estrategias_esperadas?: string | string[] | null;
  banca?: string | null;
  ano?: number | null;
  tipo?: string | null;
  dificuldade?: number | null;
  figura_path?: string | null;
}

const TIER_1_BANCAS = new Set([
  "ITA",
  "IME",
  "AFA",
  "EFOMM",
  "OBM",
  "ENEM",
]);

const TIER_2_BANCAS = new Set([
  "FUVEST",
  "UNICAMP",
  "EEAR",
  "EPCAR",
  "ESPCEX",
  "COLÉGIO NAVAL",
  "COLEGIO NAVAL",
  "ESCOLA NAVAL",
  "ESFCEX",
]);

const TIER_3_BANCAS = new Set([
  "IMO",
  "HMMT",
  "USAMO",
  "BMO",
  "PUTNAM",
  "RMM",
]);

export function calculateQuestionQualityScore(q: QuestionQualityInput): number {
  let score = 0;

  const enunciado = (q.enunciado || "").trim();
  const gabarito = (q.gabarito || "").trim();
  const solucao = (q.solucao || "").trim();
  const banca = (q.banca || "").trim().toUpperCase();
  const tipo = (q.tipo || "").toLowerCase();
  const ano = typeof q.ano === "number" ? q.ano : null;

  // 1. Enunciado (integridade e extensão)
  if (enunciado.length >= 30) {
    score += 20;
    if (enunciado.length >= 80) score += 5;
    if (enunciado.length >= 150) score += 5;
  } else {
    // Enunciado vazio ou placeholder trivial
    score -= 60;
  }

  // 2. Alternativas (para objetivas)
  let altCount = 0;
  if (q.alternativas && typeof q.alternativas === "object") {
    altCount = Object.keys(q.alternativas).length;
  }
  if (altCount === 0) {
    const matches = enunciado.match(/\([A-E]\)/gi);
    altCount = matches ? matches.length : 0;
  }

  if (altCount >= 4) {
    score += 25;
  } else if (altCount >= 2) {
    score += 15;
  } else if (tipo === "discursiva" || gabarito.toLowerCase().includes("discursiva")) {
    // Questão discursiva legítima não deve ser punida por falta de alternativas
    score += 20;
  } else {
    // Objetiva declarada sem alternativas é incompleta
    score -= 30;
  }

  // 3. Gabarito Oficial
  if (gabarito && gabarito !== "null" && gabarito !== "undefined" && gabarito.length > 0) {
    score += 25;
  } else {
    // Sem gabarito oficial: penalidade severa
    score -= 50;
  }

  // 4. Resolução / Solução Detalhada
  if (solucao && solucao !== "null" && solucao.length >= 20) {
    score += 25;
    if (solucao.length >= 100) score += 10;
  }

  // 5. Lema Associado / Estratégias Esperadas
  let hasLema = false;
  if (Array.isArray(q.estrategias_esperadas)) {
    hasLema = q.estrategias_esperadas.length > 0;
  } else if (typeof q.estrategias_esperadas === "string") {
    const clean = q.estrategias_esperadas.trim();
    hasLema = clean.length > 2 && clean !== "[]" && clean !== "null";
  }
  if (hasLema) {
    score += 25;
  }

  // 6. Bancas Principais e Prestígio de Conteúdo
  let bancaMatched = false;
  for (const b of TIER_1_BANCAS) {
    if (banca === b || banca.includes(b)) {
      score += 30;
      bancaMatched = true;
      break;
    }
  }
  if (!bancaMatched) {
    for (const b of TIER_2_BANCAS) {
      if (banca === b || banca.includes(b)) {
        score += 15;
        bancaMatched = true;
        break;
      }
    }
  }
  if (!bancaMatched) {
    for (const b of TIER_3_BANCAS) {
      if (banca === b || banca.includes(b)) {
        score += 10;
        bancaMatched = true;
        break;
      }
    }
  }

  // 7. Atualidade (Ano)
  if (ano !== null) {
    if (ano >= 2020) {
      score += 10;
    } else if (ano >= 2010) {
      score += 7;
    } else if (ano >= 1990) {
      score += 4;
    }
  }

  // 8. Figuras e Recursos Visuais
  if (q.figura_path && q.figura_path.trim() && q.figura_path !== "null") {
    score += 5;
  }

  // 9. Penalidade para placeholders ou testes preliminares conhecidos
  if (
    enunciado.includes("Questão teste pipeline turbo") ||
    enunciado.includes("Questão teste") ||
    enunciado.includes("Indique qual item abaixo corresponde a $x") ||
    enunciado.includes("Seja $$x = \\frac{1}{2}")
  ) {
    score -= 100;
  }

  return score;
}

export function sortQuestionsByQuality<T extends QuestionQualityInput>(questions: T[]): T[] {
  return [...questions].sort((a, b) => {
    const scoreA = calculateQuestionQualityScore(a);
    const scoreB = calculateQuestionQualityScore(b);
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    // Desempate 1: Mais recente primeiro
    const anoA = typeof a.ano === "number" ? a.ano : 0;
    const anoB = typeof b.ano === "number" ? b.ano : 0;
    if (anoB !== anoA) {
      return anoB - anoA;
    }
    // Desempate 2: Id desc (nunca asc!)
    const idA = typeof a.id === "number" ? a.id : 0;
    const idB = typeof b.id === "number" ? b.id : 0;
    return idB - idA;
  });
}
