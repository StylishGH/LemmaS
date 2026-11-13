"use client";

import { useEffect, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { resolveFigureUrl, getFallbackFigureUrl } from "@/lib/image-url";
import { KATEX_MACROS, cleanLatexForKatex, renderMathText } from "@/lib/math-sanitize";
export { KATEX_MACROS, cleanLatexForKatex, sanitizeMathText, renderMathText, TOKEN_REAL } from "@/lib/math-sanitize";

interface MathDisplayProps {
  children: string;
  displayMode?: boolean;
  className?: string;
  errorColor?: string;
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
        macros: KATEX_MACROS,
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
          const rawUrl = imgMatch[2]?.trim();
          if (!rawUrl || rawUrl === "null" || rawUrl === "undefined" || rawUrl.includes("[asy]") || rawUrl.startsWith("asy:")) {
            return null;
          }
          return (
            <span key={`img-${imgIdx}`} className="my-3 block text-center clear-both">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveFigureUrl(rawUrl)}
                alt={alt || "Figura matemática da questão"}
                className="question-diagram-invertible max-h-80 max-w-full mx-auto rounded-xl object-contain p-2 bg-white dark:bg-transparent border border-slate-200 dark:border-white/10 shadow-xs"
                loading="lazy"
                onError={(e) => {
                  const target = e.currentTarget;
                  const fallbackUrl = getFallbackFigureUrl(rawUrl);
                  if (!target.dataset.fallback && fallbackUrl && fallbackUrl !== target.src) {
                    target.dataset.fallback = "1";
                    target.src = fallbackUrl;
                  } else {
                    target.style.display = "none";
                    if (target.parentElement) {
                      target.parentElement.style.display = "none";
                    }
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