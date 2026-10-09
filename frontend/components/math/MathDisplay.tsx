"use client";

import { useEffect, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

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
    
    try {
      katex.render(children, ref.current, {
        displayMode,
        throwOnError: false,
        strict: "warn",
        trust: true,
        macros: {
          "\\RR": "\\mathbb{R}",
          "\\NN": "\\mathbb{N}",
          "\\ZZ": "\\mathbb{Z}",
          "\\QQ": "\\mathbb{Q}",
          "\\CC": "\\mathbb{C}",
        },
      });
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
 * Renderiza texto misto (markdown simples + LaTeX inline $...$ e blocos $$...$$)
 */
export function renderMathText(text: string) {
  if (!text) return [];

  // Protege a moeda brasileira "R$" e variações para não conflitar com delimitador matemático $
  // Exemplo: "R$ 150.000,00" não deve abrir nem fechar ambiente LaTeX!
  const TOKEN_REAL = "___LEMMAS_MOEDA_BRL___";
  const safeText = text.replace(/R\$/g, TOKEN_REAL);
  
  const parts: Array<{ type: "text" | "inline" | "block"; content: string }> = [];
  let remaining = safeText;
  
  // Primeiro, extrai blocos $$...$$
  const blockRegex = /\$\$([\s\S]+?)\$\$/g;
  let lastIndex = 0;
  let match;
  
  while ((match = blockRegex.exec(remaining)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: remaining.slice(lastIndex, match.index) });
    }
    parts.push({ type: "block", content: match[1] });
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < remaining.length) {
    parts.push({ type: "text", content: remaining.slice(lastIndex) });
  }
  
  // Agora processa inline $...$ nos trechos de texto
  const finalParts: Array<{ type: "text" | "inline" | "block"; content: string }> = [];
  
  for (const part of parts) {
    if (part.type === "block") {
      finalParts.push({
        type: "block",
        content: part.content.replaceAll(TOKEN_REAL, "R\\$"),
      });
      continue;
    }
    
    const inlineRegex = /\$([^\$]+)\$/g;
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

function FormattedTextChunk({ content }: { content: string }) {
  if (!content) return null;
  // Divide por negrito **...**
  const boldParts = content.split(/(\*\*[\s\S]*?\*\*)/g);
  return (
    <>
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
    <span className={className}>
      {parts.map((part, i) => {
        switch (part.type) {
          case "block":
            return <MathBlock key={`block-${i}`} latex={part.content.trim()} className="block my-2" />;
          case "inline":
            return <MathInline key={`inline-${i}`} latex={part.content} className="px-0.5" />;
          case "text":
            return <FormattedTextChunk key={`text-${i}`} content={part.content} />;
        }
      })}
    </span>
  );
}