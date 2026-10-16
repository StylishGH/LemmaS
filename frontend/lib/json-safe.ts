/**
 * Utilitário para parsing tolerante e resiliente de JSON gerado por LLMs contendo expressões matemáticas em LaTeX.
 * LLMs frequentemente geram contrabarras não escapadas (ex: \forall, \in, \frac, \to) dentro de strings JSON,
 * o que viola a especificação RFC 8259 e faz o JSON.parse nativo lançar SyntaxError.
 */
export function safeParseJsonWithLatex<T = any>(raw: string): T {
  if (!raw || typeof raw !== "string") {
    throw new Error("Input inválido para safeParseJsonWithLatex.");
  }

  let clean = raw.trim();

  // Remove markdown code fences se presentes (```json ... ``` ou ``` ... ```)
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }

  // Tenta o parsing nativo direto primeiro (caso o LLM já tenha escapado corretamente)
  try {
    return JSON.parse(clean);
  } catch {
    // Se falhar com SyntaxError, aplica a sanitização de contrabarras LaTeX e caracteres de controle
  }

  // Sanitizador de strings JSON:
  // Percorre a string respeitando se estamos dentro de uma string delimitada por aspas duplas ("...")
  let sanitized = "";
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];

    if (!inString) {
      if (char === '"') {
        inString = true;
      }
      sanitized += char;
    } else {
      if (isEscaped) {
        // O caractere anterior foi uma barra invertida mantida propositalmente
        isEscaped = false;
        sanitized += char;
      } else if (char === "\\") {
        const next = clean[i + 1];

        // 1. Aspas escapadas \" -> manter como escape válido
        if (next === '"') {
          sanitized += "\\";
          isEscaped = true;
        }
        // 2. Barra invertida já escapada \\ -> manter ambas
        else if (next === "\\") {
          sanitized += "\\";
          isEscaped = true;
        }
        // 3. Barra diagonal \/ -> manter
        else if (next === "/") {
          sanitized += "\\";
          isEscaped = true;
        }
        // 4. Unicode escape \uXXXX -> manter se forem 4 dígitos hexadecimais
        else if (next === "u" && /^[0-9a-fA-F]{4}$/.test(clean.slice(i + 2, i + 6))) {
          sanitized += "\\";
          isEscaped = true;
        }
        // 5. LaTeX vs Newline/Tab/Carriage Return/Backspace/FormFeed:
        // Se \n, \t, \r, \b, \f for seguido de letra (ex: \neg, \neq, \to, \times, \rho, \beta, \forall, \frac),
        // é um comando LaTeX, e NÃO um caractere de controle! Deve ser escapado como \\!
        else if (
          (next === "n" || next === "t" || next === "r" || next === "b" || next === "f") &&
          /^[a-zA-Z]/.test(clean[i + 2] || "")
        ) {
          sanitized += "\\\\";
        }
        // 6. Controles reais legítimos \n, \r, \t (não seguidos de letra)
        else if (next === "n" || next === "r" || next === "t") {
          sanitized += "\\";
          isEscaped = true;
        }
        // 7. Qualquer outro caractere após barra invertida (ex: \alpha, \in, \subset, \sum, \int, \{, \}, \$, \_):
        // É comando LaTeX ou caractere não escapável em JSON padrão -> transforma em \\
        else {
          sanitized += "\\\\";
        }
      } else if (char === '"') {
        inString = false;
        sanitized += char;
      } else if (char === "\n") {
        // Quebra de linha literal dentro de string JSON é inválida -> transforma em \n
        sanitized += "\\n";
      } else if (char === "\r") {
        sanitized += "\\r";
      } else if (char === "\t") {
        sanitized += "\\t";
      } else {
        sanitized += char;
      }
    }
  }

  try {
    return JSON.parse(sanitized);
  } catch {
    // Se ainda falhar, tenta remover trailing commas antes de fechamento de objeto/array
    const fixedTrailing = sanitized.replace(/,\s*([}\]])/g, "$1");
    return JSON.parse(fixedTrailing);
  }
}
