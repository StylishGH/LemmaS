import { normalizarMatematica, autoWrapLatexExpressions } from "./math-parser";

export const TOKEN_REAL = "\uE00001\uE001";

const LATEX_N_COMMANDS = new Set([
  "not", "ne", "neq", "neg", "nexists", "newline", "notin", "ni", "nu", "nabla",
  "natural", "ncong", "nmid", "nleq", "ngeq", "nless", "ngtr", "nsubset",
  "nsubseteq", "nsupset", "nsupseteq", "nparallel", "nrightarrow", "nleftarrow",
  "nRightarrow", "nLeftarrow", "nshortmid", "nshortparallel", "nsim", "nvDash",
  "nvdash", "nVDash", "nolimits", "normalsize", "noindent", "nonumber", "notag",
  "nobreakspace",
]);

const LATEX_ENV_NAMES = "(?:aligned|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|cases|equation\\*?|align\\*?)";
const MULTILINE_INLINE_MATH_SOURCE = `\\$[^\\$\\n]*?\\\\begin\\{${LATEX_ENV_NAMES}\\}(?:[^\\$\\n]|\\n(?![ \\t]*\\n))*?\\\\end\\{${LATEX_ENV_NAMES}\\}[^\\$\\n]*\\$`;
// Match single-line $...$ before multiline env so closing $ of an earlier $...$ can never open a multiline match.
const INLINE_MATH_SOURCE = `(?:\\$[^\\$\\n]+?\\$|${MULTILINE_INLINE_MATH_SOURCE})`;
const TEXT_COMMAND_OPEN_RE = /^\\(?:text(?:bf|it|rm|sf|tt)?|mbox)\s*\{/;
const BRL_PRECEDED_BLOCK_RE = /[a-zA-Z0-9_\\$]/;
const BRL_FOLLOWED_DIGIT_RE = /^\s*\d/;

type MathDelimiterMode = null | "inline-dollar" | "block-dollar" | "inline-paren" | "block-bracket";

interface TextRegionFrame {
  depth: number;
  prevInInnerMath: boolean;
}

function stripTrailingUnescapedDollars(text: string): string {
  const match = text.match(/(\\*)(\$+)$/);
  if (!match) return text;
  const [, slashes, dollars] = match;
  const escapedLeadingDollar = slashes.length % 2 === 1 ? 1 : 0;
  const unescapedCount = dollars.length - escapedLeadingDollar;
  const stripCount = Math.min(unescapedCount, 2);
  return stripCount > 0 ? text.slice(0, -stripCount) : text;
}

function canShieldBrlAt(text: string, index: number, requireDigitsAfter: boolean): boolean {
  if (text[index] !== "R" || text[index + 1] !== "$" || text[index + 2] === "$") {
    return false;
  }
  if (index > 0 && BRL_PRECEDED_BLOCK_RE.test(text[index - 1])) {
    return false;
  }
  if (requireDigitsAfter && !BRL_FOLLOWED_DIGIT_RE.test(text.slice(index + 2))) {
    return false;
  }
  return true;
}

/**
 * Protege ocorrências de moeda "R$" com TOKEN_REAL apenas fora de modo matemático
 * (ou dentro de \text{...} seguido de dígitos), evitando corromper variáveis como $R$ ou $$x = R$$.
 */
export function shieldBrlCurrency(text: string): string {
  if (!text || typeof text !== "string" || !text.includes("R$")) return text || "";

  let out = "";
  let i = 0;
  let mode: MathDelimiterMode = null;
  let braceDepth = 0;
  let inInnerMath = false;
  const textStack: TextRegionFrame[] = [];

  const resetMathState = () => {
    mode = null;
    braceDepth = 0;
    inInnerMath = false;
    textStack.length = 0;
  };

  while (i < text.length) {
    if (text[i] === "\\") {
      const next = text[i + 1];
      if (next === "\\") {
        out += "\\\\";
        i += 2;
        continue;
      }
      if (mode === null && next === "(") {
        mode = "inline-paren";
        out += "\\(";
        i += 2;
        continue;
      }
      if (mode === null && next === "[") {
        mode = "block-bracket";
        out += "\\[";
        i += 2;
        continue;
      }
      if (mode === "inline-paren" && next === ")") {
        resetMathState();
        out += "\\)";
        i += 2;
        continue;
      }
      if (mode === "block-bracket" && next === "]") {
        resetMathState();
        out += "\\]";
        i += 2;
        continue;
      }
      if (next === "$") {
        out += "\\$";
        i += 2;
        continue;
      }
      if (mode !== null && (next === "{" || next === "}")) {
        out += `\\${next}`;
        i += 2;
        continue;
      }
      if (mode !== null) {
        const textOpen = TEXT_COMMAND_OPEN_RE.exec(text.slice(i));
        if (textOpen) {
          out += textOpen[0];
          braceDepth++;
          textStack.push({ depth: braceDepth, prevInInnerMath: inInnerMath });
          inInnerMath = false;
          i += textOpen[0].length;
          continue;
        }
      }
      out += "\\";
      i += 1;
      continue;
    }

    if (mode !== null) {
      if (mode === "inline-dollar" && text[i] === "\n" && /^\n[ \t]*\n/.test(text.slice(i))) {
        resetMathState();
        out += "\n";
        i += 1;
        continue;
      }
      if (text[i] === "{") {
        braceDepth++;
        out += "{";
        i += 1;
        continue;
      }
      if (text[i] === "}") {
        if (textStack.length > 0 && textStack[textStack.length - 1].depth === braceDepth) {
          const popped = textStack.pop();
          if (popped) {
            inInnerMath = popped.prevInInnerMath;
          }
        }
        if (braceDepth > 0) {
          braceDepth--;
        }
        out += "}";
        i += 1;
        continue;
      }
      if (textStack.length > 0 && !inInnerMath && canShieldBrlAt(text, i, true)) {
        out += TOKEN_REAL;
        i += 2;
        continue;
      }
      if (text[i] === "$") {
        if (textStack.length > 0) {
          if (inInnerMath) {
            inInnerMath = false;
            out += "$";
            i += 1;
            continue;
          }
          if (text[i + 1] !== "$") {
            inInnerMath = true;
            out += "$";
            i += 1;
            continue;
          }
        }
        if (mode === "block-dollar" && text[i + 1] === "$") {
          resetMathState();
          out += "$$";
          i += 2;
          continue;
        }
        if (mode === "inline-dollar") {
          resetMathState();
          out += "$";
          i += 1;
          continue;
        }
      }
      out += text[i];
      i += 1;
      continue;
    }

    if (canShieldBrlAt(text, i, false)) {
      out += TOKEN_REAL;
      i += 2;
      continue;
    }

    if (text[i] === "$") {
      braceDepth = 0;
      inInnerMath = false;
      textStack.length = 0;
      if (text[i + 1] === "$") {
        mode = "block-dollar";
        out += "$$";
        i += 2;
        continue;
      }
      mode = "inline-dollar";
      out += "$";
      i += 1;
      continue;
    }

    out += text[i];
    i += 1;
  }

  return out;
}

export function isLikelyProseMistakenlyWrappedInMath(inner: string, minWords: number): boolean {
  // Argumentos de comandos são rótulos matemáticos, não palavras da prosa envolvente.
  const withoutLatex = inner
    .replace(/\\(?:text|textbf|textit|textrm|operatorname|begin|end|mathrm|mathbf|mathit|mathcal|mathbb|mathsf|mathtt|boldsymbol|color|textcolor|phantom|hspace|vspace)\*?\{[^}]*\}/g, "")
    .replace(/\\[a-zA-Z]+/g, "");
  const words = withoutLatex.match(/[a-zA-ZÀ-ÿ]{3,}|\b(?:de|em|se|da|do|na|no|um|uma|os|as|ao|aos|com|por|para|onde|que)\b/gi) || [];
  const hasMathStructure = /\\(?:begin|frac|dfrac|tfrac|sqrt|sum|int|lim|prod|operatorname|binom|overparen)\b/.test(inner);
  return words.length >= (hasMathStructure ? Math.max(minWords + 2, 4) : minWords);
}

export const KATEX_MACROS: Record<string, string> = {
  "\\undefined": "",
  "\\or": "\\lor",
  "\\and": "\\land",
  "\\xor": "\\oplus",
  "\\implies": "\\Longrightarrow",
  "\\iff": "\\Longleftrightarrow",
  "\\RR": "\\mathbb{R}",
  "\\NN": "\\mathbb{N}",
  "\\ZZ": "\\mathbb{Z}",
  "\\QQ": "\\mathbb{Q}",
  "\\CC": "\\mathbb{C}",
  "\\sen": "\\operatorname{sen}",
  "\\tg": "\\operatorname{tg}",
  "\\cossec": "\\operatorname{cossec}",
  "\\cosec": "\\operatorname{cosec}",
  "\\cotg": "\\operatorname{cotg}",
  "\\sec": "\\operatorname{sec}",
  "\\arcsen": "\\operatorname{arcsen}",
  "\\arctg": "\\operatorname{arctg}",
  "\\senh": "\\operatorname{senh}",
  "\\tgh": "\\operatorname{tgh}",
  "\\cossech": "\\operatorname{cossech}",
  "\\cotgh": "\\operatorname{cotgh}",
  "\\overparen": "\\widehat{#1}",
};

/**
 * Sanitiza expressões LaTeX antes de enviar ao KaTeX:
 * Remove delimitadores $ externos indevidos, pipes de cursor |, literais \undefined e caracteres estranhos.
 */
export function cleanLatexForKatex(latex: string): string {
  if (!latex || typeof latex !== "string") return "";
  let clean = latex.trim();
  // Remove $ ou $$ externos não escapados se por acaso foram passados como filhos diretos
  clean = stripTrailingUnescapedDollars(clean.replace(/^\${1,2}/, "")).trim();
  // Remove $ soltos internos não escapados que quebram o parser do KaTeX (preserva \$ com número ímpar de barras)
  clean = clean
    .replace(/(\\*)\$/g, (match, slashes: string) => (slashes.length % 2 === 1 ? match : slashes))
    .trim();
  // Remove artefatos de \undefined ou undefined gerados por templates ou alucinações
  clean = clean.replace(/\\?undefined\b/gi, "");
  // Converte macros comuns de lógica matemática que quebram o KaTeX
  clean = clean.replace(/\\or\b/g, "\\lor");
  clean = clean.replace(/\\and\b/g, "\\land");
  clean = clean.replace(/\\xor\b/g, "\\oplus");
  // Converte ambientes align para aligned (compatível com KaTeX inline/math-mode)
  clean = clean.replace(/\\begin\{align\*?\}/g, "\\begin{aligned}");
  clean = clean.replace(/\\end\{align\*?\}/g, "\\end{aligned}");
  // Remove cursor pipe | residual comum no final de expressões geradas por LLM
  clean = clean.replace(/(?:\\text\{[^\}]*\}|\d+|\})\s*\|\s*$/g, "$1");
  // Corrige parênteses angulares desbalanceados (\right\rangle sem \left\langle ou vice-versa)
  if (clean.includes("\\right\\rangle") && !clean.includes("\\left\\langle")) {
    clean = clean.replace(/\\right\\rangle/g, "\\rangle");
  }
  if (clean.includes("\\left\\langle") && !clean.includes("\\right\\rangle")) {
    clean = clean.replace(/\\left\\langle/g, "\\langle");
  }
  // Converte \vec com múltiplos caracteres (ex: \vec{AB}, \vec {AB}) para \overrightarrow{AB} (KaTeX restringe \vec a 1 caractere)
  clean = clean.replace(/\\vec\s*\{([A-Za-z0-9]{2,})\}/g, "\\overrightarrow{$1}");
  clean = clean.replace(/\\vec\s+([A-Za-z]{2,})/g, "\\overrightarrow{$1}");
  clean = clean.replace(/\\vec\s*\{([A-Za-z0-9])\}/g, "\\vec{$1}");
  // Corrige subscrito sem base (ex: _{ \triangle ABC } -> {}_{ \triangle ABC })
  clean = clean.replace(/(?:^|[\s=+\-*/])_\s*\{/g, " {}_{");
  // Corrige barras verticais duplas com espaçamento indevido (| | -> \|)
  clean = clean.replace(/\|\s*\|/g, "\\|");
  // Converte barras invertidas duplas desnecessárias
  clean = clean.replace(/\\\\(?=[a-zA-Z])/g, "\\");
  return clean;
}

function shieldMultilineInlineEnvs(
  text: string,
  tokenPrefix: string,
  tokenMap: Map<string, string>,
  nextIndex: () => number,
): string {
  // Consume $$...$$ and single-line $...$ left-to-right so closing $ never pairs with a later standalone \begin{...}.
  const regex = new RegExp(
    `(\\$\\$[\\s\\S]+?\\$\\$|(?<!\\$)\\$(?!\\$)[^\\$\\n]+?(?<!\\$)\\$(?!\\$))|((?<!\\$)${MULTILINE_INLINE_MATH_SOURCE}(?!\\$))`,
    "g",
  );
  return text.replace(regex, (fullMatch, passthrough?: string, multiline?: string) => {
    if (passthrough || !multiline) return fullMatch;
    const token = `___${tokenPrefix}_${nextIndex()}___`;
    tokenMap.set(token, multiline);
    return token;
  });
}

/**
 * Sanitizador profundo de markdown matemático para evitar desbalanceamento de delimitadores $
 * e isolar fórmulas soltas que modelos LLM escrevem sem delimitação explícita.
 */
export function sanitizeMathText(raw: string, opts?: { preserveCurrencyToken?: boolean }): string {
  if (!raw || typeof raw !== "string") return "";

  // 1. Normaliza quebras de linha literais (\n, \r\n) preservando comandos LaTeX que começam com \n (\neq, \notin, \nu, \nabla, etc)
  let text = raw
    .replace(/\\r\\n/g, "\n")
    .replace(/(\\+)(n[a-zA-Z]*)/g, (match, slashes: string, cmd: string) => {
      if (slashes.length % 2 === 0 || LATEX_N_COMMANDS.has(cmd)) return match;
      return slashes.slice(0, -1) + "\n" + cmd.slice(1);
    })
    .replace(/\r\n/g, "\n");

  // Remove tags <img> HTML com src vazio, nulo ou inválido
  text = text.replace(/<img[^>]*src=["']\s*(?:null|undefined)?\s*["'][^>]*>/gi, "");
  text = text.replace(/<img[^>]*src=["']\s*["'][^>]*>/gi, "");
  // Remove blocos de código Asymptote crus ([asy]...[/asy]) importados de bancos AoPS
  text = text.replace(/\[asy\][\s\S]*?\[\/asy\]/gi, "");
  text = text.replace(/\\\[asy\\\][\s\S]*?\\\[\/asy\\\]/gi, "");
  // Remove placeholders markdown de imagem com url vazia/inválida
  text = text.replace(/!\[(.*?)\]\(\s*(?:null|undefined)?\s*\)/gi, "");
  // Remove artefatos de \undefined ou undefined gerados por modelos
  text = text.replace(/\\?undefined\s*/gi, "");
  // Protege moeda R$ fora de delimitadores matemáticos (e dentro de \text{...} seguido de dígito)
  text = shieldBrlCurrency(text);
  // Normaliza blocos de código markdown com math/latex
  text = text.replace(/```(?:latex|math)\s*([\s\S]+?)\s*```/gi, (_, math) => `$$${math.trim()}$$`);
  // Converte delimitadores canônicos \[ \] e \( \)
  text = text.replace(/(?:\\\[|\\\\\[)([\s\S]+?)(?:\\\]|\\\\\])/g, (_, math) => `$$${math.trim()}$$`);
  text = text.replace(/(?:\\\(|\\\\\()([\s\S]+?)(?:\\\)|\\\\\))/g, (_, math) => `$${math.trim()}$`);

  // --- PROTEÇÃO DE BLOCOS $$...$$ ---
  // Extrai blocos $$...$$ existentes para nunca serem rompidos ou violados por regexes de inline math ($...$)
  const blockMap = new Map<string, string>();
  let blockCounter = 0;
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, inner) => {
    // Desembrulha blocos $$...$$ que modelos LLM erroneamente colocam ao redor de frases inteiras em português (texto puro)
    if (isLikelyProseMistakenlyWrappedInMath(inner, 3)) {
      return "\n" + autoWrapLatexExpressions(inner.trim()) + "\n";
    }
    const token = `___LEMMAS_MATH_BLOCK_${blockCounter++}___`;
    blockMap.set(token, `$$${inner.trim()}$$`);
    return `\n${token}\n`;
  });

  // Extrai também ambientes $...\begin{...}...\end{...}...$ multilinha para não serem corrompidos por autoWrap nem pelo loop por linha
  text = shieldMultilineInlineEnvs(text, "LEMMAS_MATH_BLOCK", blockMap, () => blockCounter++);

  // Desembrulha inline $...$ que contém frases em português (apenas com delimitadores estritos de inline)
  text = text.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)(?<!\$)\$(?!\$)/g, (fullMatch, inner) => {
    if (isLikelyProseMistakenlyWrappedInMath(inner, 2)) {
      return autoWrapLatexExpressions(inner);
    }
    return fullMatch;
  });

  // Corrige $ não fechado em variáveis pontuais seguido de palavra em português (ex: "$QS intersectando-se" -> "$QS$ intersectando-se")
  text = text.replace(/(^|[^\\$])\$([A-Za-z]{1,2}(?:_[0-9a-zA-Z]+)?|\d+(?:\.\d+)?)\s+([a-zA-ZÀ-ÿ]{2,})/g, '$1$$$2$$ $3');

  // Envolve expressões matemáticas e comandos soltos usando o autoWrapLatexExpressions nos trechos fora de blocos protegidos
  text = autoWrapLatexExpressions(text);

  // Processa linha a linha identificando fórmulas isoladas sem delimitadores
  const lines = text.split("\n");
  const processedLines = lines.map((line) => {
    const l = line.trim();
    if (!l) return line;
    if (l.startsWith("___LEMMAS_MATH_BLOCK_")) return line;

    // Pula títulos markdown, blockquotes ou marcadores de lista (incluindo bullets unicode)
    if (/^(?:#{1,6}\s+|>\s+|\*\s+|-\s+|\+\s+|\d+\.\s+|[•·-]\s*)/.test(l)) {
      return line;
    }

    const hasLatexCmd = /\\(?:triangle|overrightarrow|overline|vec|hat|angle|sim|perp|parallel|cong|circ|frac|sqrt|sum|int|lim|cdot|times|div|pm|mp|le|ge|neq|approx|equiv|implies|iff|text|alpha|beta|gamma|theta|pi|partial|in|to)\b/.test(l);
    const hasEquation = /[a-zA-Z0-9]\s*=\s*[^=]+/.test(l);

    if (hasLatexCmd || hasEquation) {
      if (l.startsWith("$$") && l.endsWith("$$")) return line;
      if (l.startsWith("$") && l.endsWith("$") && l.indexOf("$", 1) === l.length - 1) return line;

      // Palavras de texto em linguagem natural (excluindo comandos LaTeX)
      const words = l.replace(/\\[a-zA-Z]+(?:\{[^}]*\})?/g, "").match(/[a-zA-ZÀ-ÿ]{3,}/g) || [];

      // Se a linha contém palavras de texto (não é uma equação isolada), NUNCA envelopa a linha inteira em $$!
      if (words.length > 0) {
        return line;
      }

      const dollarCount = (l.match(/\$/g) || []).length;
      if (dollarCount % 2 === 0 && dollarCount > 0) {
        return line;
      }

      if (!l.startsWith("$") && l.endsWith("$")) {
        const clean = l.slice(0, -1).trim();
        return `$$${clean}$$`;
      }

      if (l.startsWith("$") && !l.endsWith("$")) {
        const clean = l.slice(1).trim();
        return `$$${clean}$$`;
      }

      if (dollarCount === 0 && (hasLatexCmd || l.includes("="))) {
        return `$$${l}$$`;
      }
    }
    return line;
  });

  text = processedLines.join("\n");

  // Corrige linhas onde a fórmula termina com $ e emenda imediatamente em texto
  text = text.replace(/(\b\d+\s*\\text\{[a-zA-Z]+\})\$\s*(\(?\s*[a-zA-ZÀ-ÿ])/g, "$1$$ $2");

  // RESTAURAÇÃO DOS BLOCOS $$...$$
  for (const [token, block] of blockMap.entries()) {
    text = text.replace(token, () => block);
  }

  return opts?.preserveCurrencyToken === true ? text : text.replaceAll(TOKEN_REAL, "R$");
}

export function renderMathText(text: string) {
  if (!text || typeof text !== "string") return [];

  // 1. Sanitização profunda de delimitadores e caracteres matemáticos
  let preprocessed = sanitizeMathText(text, { preserveCurrencyToken: true });
  preprocessed = normalizarMatematica(preprocessed);

  // Protege expressões $...\begin{...}...\end{...}...$ multilinha antes de autoWrapLatexExpressions (que só divide $...$ em linha única)
  const protectedMultilineInline = new Map<string, string>();
  let multilineCounter = 0;
  preprocessed = shieldMultilineInlineEnvs(preprocessed, "LEMMAS_INLINE_ENV", protectedMultilineInline, () => multilineCounter++);

  // Aplica autoWrap nos trechos fora de $...$ e $$...$$ para envolver equações, funções trigonométricas e letras gregas
  preprocessed = autoWrapLatexExpressions(preprocessed);

  for (const [token, inlineEnv] of protectedMultilineInline.entries()) {
    preprocessed = preprocessed.replace(token, () => inlineEnv);
  }

  // Auto-envolve expressões matemáticas com comandos LaTeX soltos que vieram sem delimitadores $ (ex: \triangle OXM \sim \triangle OYN, \frac{XM}{YN} = \frac{OM}{ON})
  const looseMathRegex = /(?:\\(?:triangle|angle|overrightarrow|overline|vec|hat)\s+[A-Za-z0-9]+(?:\s*(?:=|\+|-|\*|\/|<|>|\\le|\\ge|\\to|\\sim|\\approx|\\perp|\\parallel|\\cong)\s*(?:\\(?:triangle|angle|overrightarrow|overline|vec|hat)\s+)?[A-Za-z0-9]+)*|\\frac\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}(?:\s*(?:=|\+|-|\*|\/|<|>|\\le|\\ge|\\to)\s*(?:\\frac\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|[a-zA-Z0-9_{}^]+))*|\\(?:sqrt|sum|int|lim)\b(?:\{[^{}]*\}|\[[^\]]*\])*(?:[a-zA-Z0-9_{}^+\-*\/=<>]+)*|\b[a-zA-Z0-9]+\s*\\sim\s*[a-zA-Z0-9]+|\\overrightarrow\{[^{}]+\}(?:\s*[+\-*=]\s*\\overrightarrow\{[^{}]+\})*)+/g;

  const inlineAndBlockSplitRegex = new RegExp(`(\\$\\$[\\s\\S]+?\\$\\$|${INLINE_MATH_SOURCE})`, "g");
  const tempParts = preprocessed.split(inlineAndBlockSplitRegex);
  for (let i = 0; i < tempParts.length; i += 2) {
    if (tempParts[i]) {
      tempParts[i] = tempParts[i].replace(looseMathRegex, (m) => `$${m.trim()}$`);
    }
  }
  preprocessed = tempParts.join("");

  // 2. Extrai blocos explícitos $$...$$ primeiro (preserva ambientes como \begin{cases} intactos dentro de $$)
  const stage1Parts: Array<{ type: "text" | "block"; content: string }> = [];
  const blockRegex = /\$\$([\s\S]+?)\$\$/g;
  let lastIndex = 0;
  let match;

  while ((match = blockRegex.exec(preprocessed)) !== null) {
    if (match.index > lastIndex) {
      const textChunk = preprocessed.slice(lastIndex, match.index).replace(/\n+$/, "");
      if (textChunk) {
        stage1Parts.push({ type: "text", content: textChunk });
      }
    }
    stage1Parts.push({ type: "block", content: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < preprocessed.length) {
    const textChunk = preprocessed.slice(lastIndex).replace(/^\n+/, "");
    if (textChunk) {
      stage1Parts.push({ type: "text", content: textChunk });
    }
  }
  
  // 3. Extrai ambientes isolados, preservando primeiro as expressões inline completas.
  const envRegex = new RegExp(
    `(${INLINE_MATH_SOURCE})|(\\\\begin\\{${LATEX_ENV_NAMES}\\}[\\s\\S]+?\\\\end\\{${LATEX_ENV_NAMES}\\})`,
    "g",
  );
  const stage2Parts: Array<{ type: "text" | "block"; content: string }> = [];

  for (const part of stage1Parts) {
    if (part.type === "block") {
      stage2Parts.push(part);
      continue;
    }

    const textRemaining = part.content;
    let envLastIndex = 0;
    let envMatch;

    while ((envMatch = envRegex.exec(textRemaining)) !== null) {
      if (envMatch.index > envLastIndex) {
        stage2Parts.push({ type: "text", content: textRemaining.slice(envLastIndex, envMatch.index) });
      }
      stage2Parts.push({
        type: envMatch[1] ? "text" : "block",
        content: envMatch[1] || envMatch[2],
      });
      envLastIndex = envMatch.index + envMatch[0].length;
    }

    if (envLastIndex < textRemaining.length) {
      stage2Parts.push({ type: "text", content: textRemaining.slice(envLastIndex) });
    }
  }

  // 4. Processa matemática em linha $...$ nos trechos de texto restantes
  const finalParts: Array<{ type: "text" | "inline" | "block"; content: string }> = [];
  const inlineRegex = /\$([^\$]+)\$/g;

  for (const part of stage2Parts) {
    if (part.type === "block") {
      finalParts.push({
        type: "block",
        content: part.content.replaceAll(TOKEN_REAL, "R\\$"),
      });
      continue;
    }
    
    const textRemaining = part.content;
    let textLastIndex = 0;
    let inlineMatch;
    
    while ((inlineMatch = inlineRegex.exec(textRemaining)) !== null) {
      if (inlineMatch.index > textLastIndex) {
        finalParts.push({ 
          type: "text", 
          content: textRemaining.slice(textLastIndex, inlineMatch.index).replaceAll(TOKEN_REAL, "R$") 
        });
      }
      const innerContent = inlineMatch[1];
      if (isLikelyProseMistakenlyWrappedInMath(innerContent, 2)) {
        // Frase em linguagem natural erroneamente envolvida em $...$: renderiza como texto normal para preservar espaços!
        finalParts.push({
          type: "text",
          content: innerContent.replaceAll(TOKEN_REAL, "R$"),
        });
      } else {
        finalParts.push({ 
          type: "inline", 
          content: innerContent.replaceAll(TOKEN_REAL, "R\\$") 
        });
      }
      textLastIndex = inlineMatch.index + inlineMatch[0].length;
    }
    
    if (textLastIndex < textRemaining.length) {
      finalParts.push({ 
        type: "text", 
        content: textRemaining.slice(textLastIndex).replaceAll(TOKEN_REAL, "R$") 
      });
    }
  }
  
  return finalParts;
}

