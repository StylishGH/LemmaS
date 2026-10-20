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
 * Aplica uma função transformadora APENAS nos trechos fora de blocos matemáticos $...$ e $$...$$
 */
export function applyOutsideMath(text: string, fn: (plainText: string) => string): string {
  if (!text || typeof text !== "string") return "";
  const tokens = text.split(/(\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$)/g);
  return tokens.map((token) => {
    if (token.startsWith("$")) return token;
    return fn(token);
  }).join("");
}

/**
 * Detecta expressões matemáticas óbvias em enunciados, dicas e explicações sem delimitadores e as envolve em $...$
 */
export function autoWrapLatexExpressions(text: string): string {
  if (!text) return "";

  let res = text;
  const trigPattern = /\b(tg|sen|cossec|cosec|cotg|arcsen|arctg)\b/g;

  // 1. Equações completas com funções trigonométricas, letras gregas ou comandos LaTeX
  // Ex: tg(\theta ) = tg(\alpha - \beta ) ou \theta =\alpha -\beta ou y = \alpha + \beta
  const equationRegex = /(?<!\$)(?:(?<=^|[\s([{:;])|^)((?:\\?(?:tg|sen|tan|sin|cos|sec|cossec|cosec|cotg|arcsen|arccos|arctg|arctan)\s*\([^)]*\)|\\(?:[a-zA-Z]+)|[a-zA-Z0-9_{}^]+)(?:\s*[-+*/]\s*(?:\\?(?:tg|sen|tan|sin|cos|sec|cossec|cosec|cotg|arcsen|arccos|arctg|arctan)\s*\([^)]*\)|\\(?:[a-zA-Z]+)|[a-zA-Z0-9_{}^]+))*\s*=\s*(?:\\?(?:tg|sen|tan|sin|cos|sec|cossec|cosec|cotg|arcsen|arccos|arctg|arctan)\s*\([^)]*\)|\\(?:[a-zA-Z]+)|[a-zA-Z0-9_{}^]+)(?:\s*[-+*/]\s*(?:\\?(?:tg|sen|tan|sin|cos|sec|cossec|cosec|cotg|arcsen|arccos|arctg|arctan)\s*\([^)]*\)|\\(?:[a-zA-Z]+)|[a-zA-Z0-9_{}^]+))*)(?!\$)/g;
  res = applyOutsideMath(res, (chunk) => {
    return chunk.replace(equationRegex, (match) => {
      if (/\\|[()]|\b(?:tg|sen|cos|tan|sin|sec|cotg)\b/.test(match)) {
        let clean = match.replace(trigPattern, "\\operatorname{$1}");
        clean = clean.replace(/\\?\$/g, "");
        return `$${clean.trim()}$`;
      }
      return match;
    });
  });

  // 2. Funções trigonométricas isoladas com argumento entre parênteses:
  // Ex: tg(\alpha ), tg(\beta ), sen(x), cos(\theta)
  const trigCallRegex = /(?<!\$)(?:(?<=^|[\s([{:;])|^)((?:tg|sen|cossec|cosec|cotg|arcsen|arctg|tan|sin|cos|sec|cot|arccos|arctan)\s*\([^)]+\))(?!\$)/g;
  res = applyOutsideMath(res, (chunk) => {
    return chunk.replace(trigCallRegex, (match) => {
      let clean = match.replace(trigPattern, "\\operatorname{$1}");
      clean = clean.replace(/\\?\$/g, "");
      return `$${clean.trim()}$`;
    });
  });

  // 3. Mapeamentos de funções: f: \mathbb{R} \to \mathbb{R}
  res = applyOutsideMath(res, (chunk) => {
    return chunk.replace(/([a-zA-Z]\s*:\s*\\mathbb\{[A-Z]\}\s*\\to\s*\\mathbb\{[A-Z]\})/g, (_, m) => `$${m}$`);
  });

  // 4. Pertencimento a conjuntos: a,b,c \in \mathbb{R} ou x \in \mathbb{Z}
  res = applyOutsideMath(res, (chunk) => {
    return chunk.replace(/([a-zA-Z](?:\s*,\s*[a-zA-Z])*\s*\\in\s*\\mathbb\{[A-Z]\})/g, (_, m) => `$${m}$`);
  });

  // 5. Desigualdades e negações com símbolos: a \neq 0, x \le y, a \ge b
  res = applyOutsideMath(res, (chunk) => {
    return chunk.replace(/([a-zA-Z0-9]+\s*\\(?:neq|le|ge)\s*-?[a-zA-Z0-9]+)/g, (_, m) => `$${m}$`);
  });

  // 6. Definições de função com potências: f(x) = ax^2 + bx + c ou g(x) = ...
  res = applyOutsideMath(res, (chunk) => {
    return chunk.replace(/([a-zA-Z]\([a-zA-Z]\)\s*=\s*[^,\n.$]+)/g, (_, m) => `$${m}$`);
  });

  // 7. Logaritmos com base: \log_2 y = (-1/2)+(2/3)*\log_2 x
  res = applyOutsideMath(res, (chunk) => {
    return chunk.replace(/(\\log_[0-9]+\s*[a-zA-Z0-9]+(?:\s*[+\-*\/=]\s*[^,\n.$]+)?)/g, (_, m) => `$${m}$`);
  });

  // 8. Equações com comandos com contrabarra soltos e operadores (+, -, =, /)
  // Ex: \theta =\alpha -\beta (caso com espaços ou caracteres especiais)
  const looseCmdEqRegex = /(?<!\$)(?:(?<=^|[\s([{:;])|^)((\\[a-zA-Z]+|[a-zA-Z0-9])\s*=\s*(\\[a-zA-Z]+|[a-zA-Z0-9])(?:\s*[-+*/]\s*(\\[a-zA-Z]+|[a-zA-Z0-9]))*)(?!\$)/g;
  res = applyOutsideMath(res, (chunk) => {
    return chunk.replace(looseCmdEqRegex, (match) => {
      if (match.includes("\\")) {
        return `$${match.trim()}$`;
      }
      return match;
    });
  });

  // 9. Equações lineares simples: y = 2, x = 0, a = 3
  res = applyOutsideMath(res, (chunk) => {
    return chunk.replace(/\b([a-zA-Z]\s*=\s*-?[0-9]+(?:\.[0-9]+)?)\b/g, (_, m) => `$${m}$`);
  });

  // 10. Expressões algébricas: a+b+c, a + b, x - y
  res = applyOutsideMath(res, (chunk) => {
    return chunk.replace(/\b([a-zA-Z](?:\s*[+\-*\/]\s*[a-zA-Z])+)\b/g, (_, m) => `$${m}$`);
  });

  // 11. Radicais soltos: \sqrt{...}, \sqrt[3]{...}
  res = applyOutsideMath(res, (chunk) => {
    return chunk.replace(/(?<!\$)(\\sqrt(?:\[[0-9]+\])?\{[^}]+\})(?!\$)/g, (_, m) => `$${m}$`);
  });

  // 12. Comandos geométricos soltos: \triangle ABC \sim \triangle DEF, \angle ABC
  res = applyOutsideMath(res, (chunk) => {
    let c = chunk.replace(/(?<!\$)(\\triangle\s+[A-Za-z0-9]+(?:\s*\\sim\s*\\triangle\s+[A-Za-z0-9]+)?)(?!\$)/g, (_, m) => `$${m}$`);
    c = c.replace(/(?<!\$)(\\angle\s+[A-Za-z0-9]+(?:\s*=\s*[^,\n.$]+)?)(?!\$)/g, (_, m) => `$${m}$`);
    return c;
  });

  // 13. Frações e vetores soltos: \frac{a}{b} = \frac{c}{d}, \overrightarrow{AB} + \overrightarrow{CD}
  res = applyOutsideMath(res, (chunk) => {
    let c = chunk.replace(/(?<!\$)(\\frac\{[^{}]*\}\{[^{}]*\}(?:\s*=\s*\\frac\{[^{}]*\}\{[^{}]*\})*)(?!\$)/g, (_, m) => `$${m}$`);
    c = c.replace(/(?<!\$)(\\overrightarrow\{[^{}]+\}(?:\s*[+\-*=]\s*\\overrightarrow\{[^{}]+\})*)(?!\$)/g, (_, m) => `$${m}$`);
    return c;
  });

  // 14. Semelhança solta: A \sim B
  res = applyOutsideMath(res, (chunk) => {
    return chunk.replace(/(?<!\$)\b([a-zA-Z0-9]+\s*\\sim\s*[a-zA-Z0-9]+)(?!\$)/g, (_, m) => `$${m}$`);
  });

  // 15. Letras gregas e operadores de conjuntos soltos no texto puro (fora de $)
  // Usa função para evitar conflitos de escaping em replacements
  const greekRegex = /(?<!\$)\\((?:omega|alpha|beta|gamma|delta|theta|pi|lambda|sigma|mu|phi|tau|rho|Gamma|Delta|Theta|Lambda|Sigma|Omega|Psi|Phi|cap|cup|notin|subset|subseteq))\b(?!\$)/g;
  res = applyOutsideMath(res, (chunk) => {
    return chunk.replace(greekRegex, (_, greekName) => `$\\${greekName}$`);
  });

  return res;
}

/**
 * Normaliza quebras de linha e hifenizações espúrias oriundas de PDFs em duas colunas.
 * Une quebras de linha suaves de parágrafos em espaço simples e restaura palavras
 * partidas por divisão silábica (ex: "su-\ncos" -> "sucos"), preservando parágrafos reais,
 * imagens markdown, equações em bloco e listas.
 */
export function normalizarQuebrasPdf(texto: string): string {
  if (!texto) return "";
  // 1. Des-hifenização de fim de linha: 'su-\ncos' -> 'sucos'
  let res = texto.replace(/([a-zA-ZÀ-ÿ])-[\t ]*[\r\n]+[\t ]*([a-zA-ZÀ-ÿ])/g, "$1$2");

  // 2. Normaliza quebras para \n
  res = res.replace(/\r\n/g, "\n");

  // 3. Divide em linhas
  const linhas = res.split("\n");
  const resultado: string[] = [];

  const isStandalone = (l: string) => {
    if (!l) return true;
    if (l.startsWith("![") || l.startsWith("$$") || l.startsWith("\\begin{")) return true;
    // Títulos markdown, blockquotes, listas, alternativas, números romanos e marcadores de item (I., II., 1., (A), a))
    if (/^(?:#{1,6}\s+|>\s+|\*\s+|-\s+|\+\s+|\d+[.)]\s*|\([a-eA-E]\)\s*|[a-eA-E][.)]\s*|[IVXLCDM]+[.)]\s*|[•·-]\s*)/i.test(l)) return true;
    return false;
  };

  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i].trim();
    if (!l) {
      if (resultado.length > 0 && resultado[resultado.length - 1] !== "") {
        resultado.push("");
      }
      continue;
    }

    if (isStandalone(l)) {
      resultado.push(l);
    } else {
      if (
        resultado.length > 0 &&
        resultado[resultado.length - 1] !== "" &&
        !isStandalone(resultado[resultado.length - 1])
      ) {
        resultado[resultado.length - 1] = resultado[resultado.length - 1] + " " + l;
      } else {
        resultado.push(l);
      }
    }
  }

  // Junta linhas preservando quebras de bloco
  let output = "";
  for (let i = 0; i < resultado.length; i++) {
    const item = resultado[i];
    if (item === "") {
      if (!output.endsWith("\n\n")) {
        output += "\n\n";
      }
    } else {
      if (output === "") {
        output = item;
      } else if (output.endsWith("\n\n")) {
        output += item;
      } else {
        output += "\n\n" + item;
      }
    }
  }

  return output.trim();
}

/**
 * Extrai o corpo do enunciado e as alternativas (A)-(E), garantindo normalização matemática
 * e blindagem contra encapsulamento de imagens markdown em delimitadores LaTeX $...$.
 */
export function extrairEnunciadoEAlternativas(texto: string, isDiscursiva: boolean = false): ParsedQuestion {
  if (!texto) return { corpo: "", alternativas: {} };

  // Se for declaradamente discursiva, nunca tenta extrair alternativas de múltipla escolha
  if (isDiscursiva) {
    let corpoDiscursiva = normalizarMatematica(texto.trim());
    corpoDiscursiva = normalizarQuebrasPdf(corpoDiscursiva);
    if (!corpoDiscursiva.includes("$")) {
      corpoDiscursiva = autoWrapLatexExpressions(corpoDiscursiva);
    }
    return { corpo: corpoDiscursiva, alternativas: {} };
  }

  // Busca linhas ou padrões do tipo (A) texto, (a) texto, etc.
  // Rigor matemático: Alternativas reais NÃO devem ser precedidas por caracteres de função (ex: \max(A), f(A), P(A), $m(B)$)
  // Devem estar precedidas por início de linha, quebra de linha ou pontuação/espaço claro.
  const regexComParenteses = /(?:^|[\n\r]|\s{2,}|(?<=[.;:\n]))\s*\(([A-Ea-e])\)\s+([^\n\r]+)/g;
  let matches = [...texto.matchAll(regexComParenteses)];

  // Fallback: padrões sem parêntese de abertura: A) texto ou a) texto
  if (matches.length < 2 || matches[0][1].toUpperCase() !== "A") {
    const regexSemAbertura = /(?:^|[\n\r]|\s{2,}|(?<=[.;:\n]))\s*([A-Ea-e])\)\s+([^\n\r]+)/g;
    const matchesSemAbertura = [...texto.matchAll(regexSemAbertura)];
    if (matchesSemAbertura.length >= 2 && matchesSemAbertura[0][1].toUpperCase() === "A") {
      matches = matchesSemAbertura;
    }
  }

  // Alternativas legítimas de vestibular/concurso devem ter ao menos 2 opções e começar em (A) ou (a)
  if (matches.length >= 2 && matches[0][1].toUpperCase() === "A") {
    const primeiroIndex = matches[0].index ?? texto.length;
    let corpo = texto.slice(0, primeiroIndex).trim();

    // Normaliza caracteres Unicode no corpo e aplica des-hifenização e união de quebras do PDF
    corpo = normalizarMatematica(corpo);
    corpo = normalizarQuebrasPdf(corpo);
    if (!corpo.includes("$")) {
      corpo = autoWrapLatexExpressions(corpo);
    }

    const alternativas: Record<string, string> = {};

    for (const match of matches) {
      // Sempre normaliza a chave da alternativa para MAIÚSCULA ('A', 'B', 'C', 'D', 'E') para alinhar com o gabarito oficial
      const letra = match[1].toUpperCase();
      let conteudo = match[2].trim();

      // Des-hifeniza e limpa quebras residuais no texto da alternativa
      conteudo = conteudo.replace(/([a-zA-ZÀ-ÿ])-[\t ]*[\r\n]+[\t ]*([a-zA-ZÀ-ÿ])/g, "$1$2");
      conteudo = conteudo.replace(/[\r\n]+/g, " ").trim();

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
  corpoFinal = normalizarQuebrasPdf(corpoFinal);
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
