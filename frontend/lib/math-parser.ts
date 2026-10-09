/**
 * Utilitários de parsing de questões e LaTeX para o LEMMAS.
 */

export interface ParsedQuestion {
  corpo: string;
  alternativas: Record<string, string>;
}

export function extrairEnunciadoEAlternativas(texto: string): ParsedQuestion {
  if (!texto) return { corpo: "", alternativas: {} };

  // Busca linhas ou padrões do tipo (A) texto, (B) texto, etc.
  const regex = /\(([A-E])\)\s*([^\n\r]+)/g;
  const matches = [...texto.matchAll(regex)];

  if (matches.length >= 2) {
    const primeiroIndex = matches[0].index ?? texto.length;
    const corpo = texto.slice(0, primeiroIndex).trim();
    const alternativas: Record<string, string> = {};

    for (const match of matches) {
      const letra = match[1];
      let conteudo = match[2].trim();

      // Enhanced LaTeX detection and wrapping
      // Only wrap if it looks like LaTeX and doesn't already have $ delimiters
      if (!conteudo.includes("$")) {
        // Check for common LaTeX patterns (\command, {}, ^, _, \(, \))
        const hasLatexPatterns = /\\[a-zA-Z]+|[{}^_]|\\[()]/.test(conteudo);
        
        // Also check for mathematical expressions that should be in math mode
        const hasMathExpr = /[0-9]+\s*[/+*=-]\s*[0-9]+|\^\s*[0-9]+|_\s*[0-9]+|\\frac|\\sqrt|\\sum|\\int/.test(conteudo);
        
        if (hasLatexPatterns || hasMathExpr) {
          conteudo = `$${conteudo}$`;
        }
      }

      alternativas[letra] = conteudo;
    }

    return { corpo, alternativas };
  }

  return { corpo: texto.trim(), alternativas: {} };
}

export function corrigirLatex(texto: string): string {
  if (!texto) return "";
  // Corrige '8imes8' -> '8\\times 8'
  let res = texto.replace(/(\w)imes(\w)/g, "$1\\times $2");
  return res;
}
