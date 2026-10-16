"use client";

import { useEffect, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { resolveFigureUrl, getFallbackFigureUrl } from "@/lib/image-url";
import { normalizarMatematica, autoWrapLatexExpressions } from "@/lib/math-parser";

interface MathDisplayProps {
  children: string;
  displayMode?: boolean;
  className?: string;
  errorColor?: string;
}

/**
 * Sanitiza expressões LaTeX antes de enviar ao KaTeX:
 * Remove delimitadores $ externos indevidos, pipes de cursor |, literais \undefined e caracteres estranhos.
 */
export function cleanLatexForKatex(latex: string): string {
  if (!latex || typeof latex !== "string") return "";
  let clean = latex.trim();
  // Remove $ ou $$ externos se por acaso foram passados como filhos diretos
  clean = clean.replace(/^\${1,2}/, "").replace(/\${1,2}$/, "").trim();
  // Remove $ soltos internos que quebram o parser do KaTeX
  clean = clean.replace(/\\?\$/g, "");
  // Remove artefatos de \undefined ou undefined gerados por templates ou alucinações
  clean = clean.replace(/\\?undefined\b/gi, "");
  // Remove cursor pipe | residual comum no final de expressões geradas por LLM
  clean = clean.replace(/(?:\\text\{[^\}]*\}|\d+|\})\s*\|\s*$/g, "$1");
  // Converte barras invertidas duplas desnecessárias
  clean = clean.replace(/\\\\(?=[a-zA-Z])/g, "\\");
  return clean;
}

export function MathDisplay({ 
  children, 
  displayMode = false, 
  className = "",
  errorColor = "text-red-500"
}: MathDisplayProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    
    const sanitizedInput = cleanLatexForKatex(children);
    if (!sanitizedInput) {
      ref.current.innerHTML = "";
      setRenderError(null);
      return;
    }

    try {
      katex.render(sanitizedInput, ref.current, {
        displayMode,
        throwOnError: false,
        strict: "warn",
        trust: true,
        macros: {
          "\\undefined": "",
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
        },
      });

      // Se o KaTeX gerou span de erro interno (.katex-error), tenta uma limpeza agressiva de fallback
      const errorNode = ref.current.querySelector(".katex-error");
      if (errorNode) {
        // Tenta remover comandos desconhecidos ou balancear chaves
        const fallback = sanitizedInput
          .replace(/\\[a-zA-Z]+\b(?![{a-zA-Z])/g, "")
          .replace(/[{}]/g, "")
          .trim();
        if (fallback) {
          try {
            katex.render(fallback, ref.current, { displayMode, throwOnError: false });
          } catch {
            // Mantém renderização do KaTeX
          }
        }
      }

      setRenderError(null);
    } catch (err) {
      setRenderError(err instanceof Error ? err.message : "Erro ao renderizar LaTeX");
    }
  }, [children, displayMode]);

  if (renderError) {
    return (
      <span className={`${className} ${errorColor} text-xs font-mono`} title={renderError}>
        [LaTeX: {children}]
      </span>
    );
  }

  return <span ref={ref} className={className} />;
}

interface MathInlineProps {
  latex: string;
  className?: string;
}

export function MathInline({ latex, className = "" }: MathInlineProps) {
  return <MathDisplay displayMode={false} className={className}>{latex}</MathDisplay>;
}

interface MathBlockProps {
  latex: string;
  className?: string;
}

export function MathBlock({ latex, className = "" }: MathBlockProps) {
  return <MathDisplay displayMode={true} className={className}>{latex}</MathDisplay>;
}

/**
 * Sanitizador profundo de markdown matemático para evitar desbalanceamento de delimitadores $
 * e isolar fórmulas soltas que modelos LLM escrevem sem delimitação explícita.
 */
export function sanitizeMathText(raw: string): string {
  if (!raw || typeof raw !== "string") return "";

  let text = raw.replace(/\r\n/g, "\n");
  // Remove artefatos de \undefined ou undefined gerados por modelos
  text = text.replace(/\\?undefined\s*/gi, "");
  // Normaliza blocos de código markdown com math/latex
  text = text.replace(/```(?:latex|math)\s*([\s\S]+?)\s*```/gi, (_, math) => `$$${math.trim()}$$`);
  // Converte delimitadores canônicos \[ \] e \( \)
  text = text.replace(/(?:\\\[|\\\\\[)([\s\S]+?)(?:\\\]|\\\\\])/g, (_, math) => `$$${math.trim()}$$`);
  text = text.replace(/(?:\\\(|\\\\\()([\s\S]+?)(?:\\\)|\\\\\))/g, (_, math) => `$${math.trim()}$`);

  // Processa linha a linha identificando fórmulas isoladas sem delimitadores
  const lines = text.split("\n");
  const processedLines = lines.map((line) => {
    const l = line.trim();
    if (!l) return line;

    // Pula títulos markdown, blockquotes ou marcadores de lista
    if (/^(?:#{1,6}\s+|>\s+|\*\s+|-\s+|\+\s+|\d+\.\s+)/.test(l)) {
      return line;
    }

    const hasLatexCmd = /\\(?:frac|sqrt|sum|int|lim|cdot|times|div|pm|le|ge|neq|implies|iff|text|alpha|beta|theta|pi|partial|in|to)\b/.test(l);
    const hasEquation = /[a-zA-Z0-9]\s*=\s*[^=]+/.test(l);

    if (hasLatexCmd || hasEquation) {
      if (l.startsWith("$$") && l.endsWith("$$")) return line;
      if (l.startsWith("$") && l.endsWith("$") && l.indexOf("$", 1) === l.length - 1) return line;

      // Caso 1: Fórmula terminando com $ sem abrir $ (ex: `r = \frac{a+b-c}{2}$`)
      if (!l.startsWith("$") && l.endsWith("$")) {
        const clean = l.slice(0, -1).trim();
        return `$$${clean}$$`;
      }

      // Caso 2: Fórmula abrindo com $ sem fechar $
      if (l.startsWith("$") && !l.endsWith("$")) {
        const clean = l.slice(1).trim();
        return `$$${clean}$$`;
      }

      // Caso 3: Linha que é puramente uma fórmula (sem palavras em português longas)
      const words = l.replace(/\\[a-zA-Z]+(?:\{[^}]*\})?/g, "").match(/[a-zA-ZÀ-ÿ]{4,}/g) || [];
      if (words.length === 0 && (hasLatexCmd || l.includes("="))) {
        return `$$${l}$$`;
      }
    }
    return line;
  });

  text = processedLines.join("\n");

  // Corrige linhas onde a fórmula termina com $ e emenda imediatamente em texto: `... 2 \text{ cm}$ (pois...`
  text = text.replace(/(\b\d+\s*\\text\{[a-zA-Z]+\})\$\s*(\(?\s*[a-zA-ZÀ-ÿ])/g, "$1$$ $2");

  // Balanceia $ ímpares soltos em trechos fora de blocos $$...$$
  const parts = text.split(/(\$\$[\s\S]+?\$\$)/g);
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].startsWith("$$") && parts[i].endsWith("$$")) continue;
    const dollarMatches = parts[i].match(/\$/g);
    if (dollarMatches && dollarMatches.length % 2 !== 0) {
      parts[i] = parts[i].replace(/([^$\n]+)\$\s*(?=\n|$)/, (m, p1) => {
        if (/\\(?:frac|sqrt|cdot|times|text|implies)\b/.test(p1)) {
          return `$$${p1.trim()}$$`;
        }
        return p1;
      });
    }
  }

  return parts.join("");
}

/**
 * Renderiza texto misto (markdown editorial + LaTeX inline $...$ e blocos $$...$$)
 */
export function renderMathText(text: string) {
  if (!text || typeof text !== "string") return [];

  // Protege a moeda brasileira "R$" e variações para não conflitar com delimitador matemático $
  const TOKEN_REAL = "___LEMMAS_MOEDA_BRL___";
  
  // 1. Sanitização profunda de delimitadores e caracteres matemáticos
  let preprocessed = sanitizeMathText(text);
  preprocessed = normalizarMatematica(preprocessed).replace(/R\$/g, TOKEN_REAL);

  // Se o texto não possui nenhum delimitador matemático, aplica autoWrap em expressões óbvias
  if (!preprocessed.includes("$")) {
    preprocessed = autoWrapLatexExpressions(preprocessed);
  }

  // 2. Extrai blocos explícitos $$...$$ primeiro (preserva ambientes como \begin{cases} intactos dentro de $$)
  const stage1Parts: Array<{ type: "text" | "block"; content: string }> = [];
  const blockRegex = /\$\$([\s\S]+?)\$\$/g;
  let lastIndex = 0;
  let match;
  
  while ((match = blockRegex.exec(preprocessed)) !== null) {
    if (match.index > lastIndex) {
      stage1Parts.push({ type: "text", content: preprocessed.slice(lastIndex, match.index) });
    }
    stage1Parts.push({ type: "block", content: match[1] });
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < preprocessed.length) {
    stage1Parts.push({ type: "text", content: preprocessed.slice(lastIndex) });
  }
  
  // 3. Nos trechos de texto que estão fora de $$, extrai ambientes matemáticos isolados (\begin{...}...\end{...})
  const envRegex = /(\\begin\{(?:aligned|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|cases|equation\*?|align\*?)\}[\s\S]+?\\end\{(?:aligned|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|cases|equation\*?|align\*?)\})/g;
  const stage2Parts: Array<{ type: "text" | "block"; content: string }> = [];

  for (const part of stage1Parts) {
    if (part.type === "block") {
      stage2Parts.push(part);
      continue;
    }

    let textRemaining = part.content;
    let envLastIndex = 0;
    let envMatch;

    while ((envMatch = envRegex.exec(textRemaining)) !== null) {
      if (envMatch.index > envLastIndex) {
        stage2Parts.push({ type: "text", content: textRemaining.slice(envLastIndex, envMatch.index) });
      }
      stage2Parts.push({ type: "block", content: envMatch[1] });
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
    
    let textRemaining = part.content;
    let textLastIndex = 0;
    let inlineMatch;
    
    while ((inlineMatch = inlineRegex.exec(textRemaining)) !== null) {
      if (inlineMatch.index > textLastIndex) {
        finalParts.push({ 
          type: "text", 
          content: textRemaining.slice(textLastIndex, inlineMatch.index).replaceAll(TOKEN_REAL, "R$") 
        });
      }
      finalParts.push({ 
        type: "inline", 
        content: inlineMatch[1].replaceAll(TOKEN_REAL, "R\\$") 
      });
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

function FormattedInlineLine({ content }: { content: string }) {
  if (!content) return null;

  // Headings markdown: ### H3, ## H2, # H1
  const h3Match = content.match(/^###\s+(.+)$/);
  if (h3Match) {
    return (
      <span className="block font-serif-math font-bold text-amber-900 dark:text-[#f5f0df] text-sm mt-3.5 mb-1 tracking-tight border-b border-amber-500/15 pb-1">
        {h3Match[1]}
      </span>
    );
  }

  const h2Match = content.match(/^##\s+(.+)$/);
  if (h2Match) {
    return (
      <span className="block font-serif-math font-bold text-slate-900 dark:text-[#f5f0df] text-base mt-4 mb-1.5 tracking-tight">
        {h2Match[1]}
      </span>
    );
  }

  const h1Match = content.match(/^#\s+(.+)$/);
  if (h1Match) {
    return (
      <span className="block font-serif-math font-bold text-slate-900 dark:text-[#f5f0df] text-lg mt-5 mb-2 tracking-tight">
        {h1Match[1]}
      </span>
    );
  }

  // Divide por blocos de código inline `...`
  const codeParts = content.split(/(`[^`]+?`)/g);
  return (
    <span>
      {codeParts.map((part, i) => {
        if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
          return (
            <code
              key={`c-${i}`}
              className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-100 dark:bg-[#1a172c] text-amber-800 dark:text-amber-300 font-mono text-[11px] border border-slate-200 dark:border-amber-500/20"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        // Divide por negrito **...**
        const boldParts = part.split(/(\*\*[\s\S]*?\*\*)/g);
        return (
          <span key={`cp-${i}`}>
            {boldParts.map((sub, j) => {
              if (sub.startsWith("**") && sub.endsWith("**") && sub.length >= 4) {
                return (
                  <strong key={`b-${j}`} className="font-bold text-slate-900 dark:text-[#f5f0df]">
                    {sub.slice(2, -2)}
                  </strong>
                );
              }
              // Divide por itálico *...* (asterisco simples)
              const italicParts = sub.split(/(\*[^\*]+?\*)/g);
              return (
                <span key={`nb-${j}`}>
                  {italicParts.map((it, k) => {
                    if (it.startsWith("*") && it.endsWith("*") && it.length >= 2 && !it.startsWith("**")) {
                      return (
                        <em key={`i-${k}`} className="italic text-slate-800 dark:text-zinc-200">
                          {it.slice(1, -1)}
                        </em>
                      );
                    }
                    return it;
                  })}
                </span>
              );
            })}
          </span>
        );
      })}
    </span>
  );
}

function FormattedTextChunk({ content }: { content: string }) {
  if (!content) return null;

  // 1. Extrai blocos de imagem markdown ![alt](url)
  const imageParts = content.split(/(!\[[^\]]*\]\([^)]+\))/g);

  return (
    <>
      {imageParts.map((imgPart, imgIdx) => {
        const imgMatch = imgPart.match(/^!\[(.*?)\]\((.*?)\)$/);
        if (imgMatch) {
          const alt = imgMatch[1];
          const rawUrl = imgMatch[2];
          return (
            <span key={`img-${imgIdx}`} className="my-3 block text-center clear-both">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveFigureUrl(rawUrl)}
                alt={alt || "Figura matemática da questão"}
                className="max-h-80 max-w-full mx-auto rounded-xl object-contain p-2 bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-800 shadow-xs"
                loading="lazy"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.fallback) {
                    target.dataset.fallback = "1";
                    target.src = getFallbackFigureUrl(rawUrl);
                  }
                }}
              />
              {alt && !alt.toLowerCase().startsWith("figura") && (
                <span className="block text-xs text-slate-500 dark:text-zinc-400 mt-1 italic font-sans">
                  {alt}
                </span>
              )}
            </span>
          );
        }

        // Divide por linhas para processar cabeçalhos markdown sem colidir com LaTeX
        const lines = imgPart.split("\n");
        return (
          <span key={`txt-${imgIdx}`}>
            {lines.map((l, lIdx) => (
              <span key={`line-${lIdx}`}>
                {lIdx > 0 && "\n"}
                <FormattedInlineLine content={l} />
              </span>
            ))}
          </span>
        );
      })}
    </>
  );
}

/**
 * Componente para renderizar texto com LaTeX misto e markdown simples
 */
interface MathTextProps {
  text: string;
  className?: string;
}

export function MathText({ text, className = "" }: MathTextProps) {
  const parts = renderMathText(text);
  
  return (
    <span className={`inline-block whitespace-pre-line leading-relaxed ${className}`}>
      {parts.map((part, i) => {
        switch (part.type) {
          case "block":
            return <MathBlock key={`block-${i}`} latex={part.content.trim()} className="block my-2" />;
          case "inline":
            return <MathInline key={`inline-${i}`} latex={part.content.trim()} className="px-0.5" />;
          case "text":
            return <FormattedTextChunk key={`text-${i}`} content={part.content} />;
        }
      })}
    </span>
  );
}