/**
 * Utilitários de parsing de questões, normalização matemática e LaTeX para o LEMMAS.
 */

export interface ParsedQuestion {
  corpo: string;
  alternativas: Record<string, string>;
}

/**
 * Detecta se uma string representa ou contém uma imagem markdown, tag img ou caminho de arquivo de imagem.
 */
export function isImageContent(conteudo: string): boolean {
  if (!conteudo || typeof conteudo !== "string") return false;
  const c = conteudo.trim();
  if (c.includes("![") || c.includes("<img")) return true;
  if (/^\/?data\/imagens\//i.test(c)) return true;
  if (/^\/?uploads\//i.test(c)) return true;
  if (/\.(png|jpe?g|svg|webp|gif)(\?[^)]*)?$/i.test(c)) return true;
  return false;
}

/**
 * Verifica se um dicionário de alternativas possui itens que são imagens.
 */
export function hasImageAlternatives(alternativas: Record<string, string>): boolean {
  if (!alternativas || typeof alternativas !== "object") return false;
  return Object.values(alternativas).some((val) => isImageContent(val));
}

/**
 * Extrai o trecho interno entre parênteses balanceados a partir de startIndex.
 */
function extrairParentesesBalanceados(str: string, startIndex: number): { conteudo: string; fimIndex: number } | null {
  if (str[startIndex] !== "(") return null;
  let profundidade = 0;
  for (let i = startIndex; i < str.length; i++) {
    if (str[i] === "(") profundidade++;
    else if (str[i] === ")") {
      profundidade--;
      if (profundidade === 0) {
        return {
          conteudo: str.slice(startIndex + 1, i),
          fimIndex: i,
        };
      }
    }
  }
  return null;
}

/**
 * Normaliza radicais Unicode e com parênteses balanceados:
 * ex: ³√(x^2) -> \sqrt[3]{x^2}, √((x^3)/2) -> \sqrt{(x^3)/2}, ∜2 -> \sqrt[4]{2}, √(26) -> \sqrt{26}
 */
export function normalizarRadicais(texto: string): string {
  if (!texto) return "";
  let res = "";
  let i = 0;

  while (i < texto.length) {
    let indice: string | null = null;
    let radicalLen = 0;

    if (texto.startsWith("∜", i) || texto.startsWith("⁴√", i)) {
      indice = "4";
      radicalLen = texto.startsWith("⁴√", i) ? 2 : 1;
    } else if (texto.startsWith("³√", i)) {
      indice = "3";
      radicalLen = 2;
    } else if (texto[i] === "√" && (i === 0 || texto[i - 1] !== "\\")) {
      indice = null;
      radicalLen = 1;
    }

    if (radicalLen > 0) {
      const nextIdx = i + radicalLen;
      if (nextIdx < texto.length && texto[nextIdx] === "(") {
        const bal = extrairParentesesBalanceados(texto, nextIdx);
        if (bal) {
          const prefixo = indice ? `\\sqrt[${indice}]{` : `\\sqrt{`;
          res += prefixo + normalizarRadicais(bal.conteudo) + "}";
          i = bal.fimIndex + 1;
          continue;
        }
      } else {
        const matchToken = texto.slice(nextIdx).match(/^[a-zA-Z0-9]+/);
        if (matchToken) {
          const tok = matchToken[0];
          const prefixo = indice ? `\\sqrt[${indice}]{` : `\\sqrt{`;
          res += prefixo + tok + "}";
          i = nextIdx + tok.length;
          continue;
        }
      }

      res += indice ? `\\sqrt[${indice}]` : `\\sqrt`;
      i += radicalLen;
      continue;
    }

    res += texto[i];
    i++;
  }

  // Converte \sqrt(...) ou \sqrt[n](...) remanescentes
  res = res.replace(/\\sqrt\(([^)]+)\)/g, "\\sqrt{$1}");
  res = res.replace(/\\sqrt\[([^\]]+)\]\(([^)]+)\)/g, "\\sqrt[$1]{$2}");

  return res;
}

/**
 * Converte caracteres matemáticos Unicode e operadores informais para LaTeX canônico KaTeX.
 */
export function normalizarMatematica(texto: string): string {
  if (!texto) return "";
  let res = texto;

  // Caracteres tipográficos que quebram KaTeX
  res = res.replace(/[\u2013\u2014]/g, "-"); // en-dash e em-dash
  res = res.replace(/\u0192/g, "f"); // florin ƒ
  res = res.replace(/[\u2219\u22c5]/g, " \\cdot "); // bullet ∙ e ponto ⋅
  res = res.replace(/\u00d7/g, " \\times "); // ×
  res = res.replace(/\u00f7/g, " \\div "); // ÷
  res = res.replace(/\u2264/g, " \\le "); // ≤
  res = res.replace(/\u2265/g, " \\ge "); // ≥
  res = res.replace(/\u2260/g, " \\neq "); // ≠
  res = res.replace(/\u2208/g, " \\in "); // ∈
  res = res.replace(/\u2209/g, " \\notin "); // ∉
  res = res.replace(/\u2192/g, " \\to "); // →
  res = res.replace(/\u00b1/g, " \\pm "); // ±

  // Conjuntos numéricos
  res = res.replace(/\u211d/g, "\\mathbb{R}"); // ℝ
  res = res.replace(/\u2115/g, "\\mathbb{N}"); // ℕ
  res = res.replace(/\u2124/g, "\\mathbb{Z}"); // ℤ
  res = res.replace(/\u211a/g, "\\mathbb{Q}"); // ℚ
  res = res.replace(/\u2102/g, "\\mathbb{C}"); // ℂ

  // Logaritmos Unicode
  res = res.replace(/log₂/g, "\\log_2 ");
  res = res.replace(/log₃/g, "\\log_3 ");
  res = res.replace(/log₅/g, "\\log_5 ");
  res = res.replace(/log₁₀/g, "\\log_{10} ");

  // Normalização de Radicais
  res = normalizarRadicais(res);

  return res;
}

/**
 * Detecta expressões matemáticas óbvias em enunciados sem delimitadores e as envolve em $...$
 */
export function autoWrapLatexExpressions(text: string): string {
  if (!text) return "";
  let res = text;

  // 1. Mapeamentos de funções: f: \mathbb{R} \to \mathbb{R}
  res = res.replace(/([a-zA-Z]\s*:\s*\\mathbb\{[A-Z]\}\s*\\to\s*\\mathbb\{[A-Z]\})/g, "$$$1$$");

  // 2. Pertencimento a conjuntos: a,b,c \in \mathbb{R} ou x \in \mathbb{Z}
  res = res.replace(/([a-zA-Z](?:\s*,\s*[a-zA-Z])*\s*\\in\s*\\mathbb\{[A-Z]\})/g, "$$$1$$");

  // 3. Desigualdades e negações com símbolos: a \neq 0, x \le y, a \ge b
  res = res.replace(/([a-zA-Z0-9]+\s*\\(?:neq|le|ge)\s*-?[a-zA-Z0-9]+)/g, "$$$1$$");

  // 4. Definições de função com potências: f(x) = ax^2 + bx + c ou g(x) = ...
  res = res.replace(/([a-zA-Z]\([a-zA-Z]\)\s*=\s*[^,\n.]+)/g, "$$$1$$");

  // 5. Logaritmos com base: \log_2 y = (-1/2)+(2/3)*\log_2 x
  res = res.replace(/(\\log_[0-9]+\s*[a-zA-Z0-9]+(?:\s*[+\-*\/=]\s*[^,\n.]+)?)/g, "$$$1$$");

  // 6. Equações lineares simples: y = 2, x = 0, a = 3
  res = res.replace(/\b([a-zA-Z]\s*=\s*-?[0-9]+(?:\.[0-9]+)?)\b/g, "$$$1$$");

  // 7. Expressões algébricas: a+b+c, a + b, x - y
  res = res.replace(/\b([a-zA-Z](?:\s*[+\-*\/]\s*[a-zA-Z])+)\b/g, "$$$1$$");

  // 8. Radicais soltos: \sqrt{...}, \sqrt[3]{...}
  res = res.replace(/(?<!\$)(\\sqrt(?:\[[0-9]+\])?\{[^}]+\})(?!\$)/g, "$$$1$$");

  return res;
}

/**
 * Extrai o corpo do enunciado e as alternativas (A)-(E), garantindo normalização matemática
 * e blindagem contra encapsulamento de imagens markdown em delimitadores LaTeX $...$.
 */
export function extrairEnunciadoEAlternativas(texto: string): ParsedQuestion {
  if (!texto) return { corpo: "", alternativas: {} };

  // Busca linhas ou padrões do tipo (A) texto, (B) texto, etc.
  const regex = /\(([A-E])\)\s*([^\n\r]+)/g;
  const matches = [...texto.matchAll(regex)];

  if (matches.length >= 2) {
    const primeiroIndex = matches[0].index ?? texto.length;
    let corpo = texto.slice(0, primeiroIndex).trim();

    // Normaliza caracteres Unicode no corpo e aplica autoWrap se não tiver delimitador $
    corpo = normalizarMatematica(corpo);
    if (!corpo.includes("$")) {
      corpo = autoWrapLatexExpressions(corpo);
    }

    const alternativas: Record<string, string> = {};

    for (const match of matches) {
      const letra = match[1];
      let conteudo = match[2].trim();

      // Se for imagem markdown ou caminho de imagem, NUNCA encapsula em $...$
      if (isImageContent(conteudo)) {
        // Limpa possíveis $ que possam ter sido injetados
        conteudo = conteudo.replace(/^\$+|\$+$/g, "").trim();
        alternativas[letra] = conteudo;
        continue;
      }

      // Normaliza símbolos matemáticos na alternativa
      conteudo = normalizarMatematica(conteudo);

      // Enhanced LaTeX detection and wrapping
      // Only wrap if it looks like LaTeX and doesn't already have $ delimiters
      if (!conteudo.includes("$")) {
        // Check for common LaTeX patterns (\command, {}, ^, _, \(, \))
        const hasLatexPatterns = /\\[a-zA-Z]+|[{}^_]|\\[()]/.test(conteudo);

        // Also check for mathematical expressions that should be in math mode
        const hasMathExpr = /[0-9]+\s*[/+*=-]\s*[0-9]+|\^\s*[0-9]+|_\s*[0-9]+|\\frac|\\sqrt|\\sum|\\int|\\log|\\pm|\\le|\\ge|\\neq|\\in|\\to|\\cdot|\\mathbb|\b[a-zA-Z]\s*=\s*/.test(
          conteudo
        );

        if (hasLatexPatterns || hasMathExpr) {
          conteudo = `$${conteudo}$`;
        }
      }

      alternativas[letra] = conteudo;
    }

    return { corpo, alternativas };
  }

  let corpoFinal = normalizarMatematica(texto.trim());
  if (!corpoFinal.includes("$")) {
    corpoFinal = autoWrapLatexExpressions(corpoFinal);
  }

  return { corpo: corpoFinal, alternativas: {} };
}

export function corrigirLatex(texto: string): string {
  if (!texto) return "";
  let res = texto.replace(/(\w)imes(\w)/g, "$1\\times $2");
  return normalizarMatematica(res);
}
