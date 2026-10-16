"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Compass, Sparkles, BookOpen, ExternalLink, X, HelpCircle, Layers } from "lucide-react";
import { MathText } from "@/components/math/MathDisplay";

export interface LemmaData {
  id: number;
  codigo: string;
  titulo: string;
  materia: string;
  topico: string;
  nivel: string;
  formula_latex: string;
  gatilho_reconhecimento: string;
  intuicao_prova?: string;
  questoes_vinculadas_count: number;
}

// Cache global no cliente para evitar requisições repetidas na mesma sessão
const globalLemmaCache = new Map<string, LemmaData>();
const pendingFetches = new Map<string, Promise<LemmaData | null>>();

async function fetchLemma(identifier: string): Promise<LemmaData | null> {
  const clean = identifier.trim().toUpperCase();
  if (globalLemmaCache.has(clean)) {
    return globalLemmaCache.get(clean) || null;
  }

  if (pendingFetches.has(clean)) {
    return pendingFetches.get(clean)!;
  }

  const promise = (async () => {
    try {
      const isNum = /^\d+$/.test(clean);
      const url = isNum ? `/api/lemmas?id=${clean}` : `/api/lemmas?codigo=${encodeURIComponent(clean)}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const json = await res.json();
      if (json && json.lema) {
        const lema: LemmaData = json.lema;
        globalLemmaCache.set(lema.codigo.toUpperCase(), lema);
        globalLemmaCache.set(String(lema.id), lema);
        const numOnly = lema.codigo.replace(/\D/g, "");
        if (numOnly) {
          globalLemmaCache.set(`LEMA-${numOnly}`, lema);
          globalLemmaCache.set(numOnly, lema);
          globalLemmaCache.set(String(parseInt(numOnly, 10)), lema);
        }
        return lema;
      }
    } catch (err) {
      console.warn("Erro ao buscar dados do lema:", err);
    } finally {
      pendingFetches.delete(clean);
    }
    return null;
  })();

  pendingFetches.set(clean, promise);
  return promise;
}

interface LemaBadgeProps {
  lemaCodigo?: string | null;
  lemaId?: number | null;
  initialData?: LemmaData | null;
  variant?: "default" | "compact" | "pill";
  className?: string;
}

export default function LemaBadge({
  lemaCodigo,
  lemaId,
  initialData,
  variant = "default",
  className = "",
}: LemaBadgeProps) {
  const [data, setData] = useState<LemmaData | null>(initialData || null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const identifier = lemaCodigo || (lemaId ? String(lemaId) : null);

  useEffect(() => {
    if (initialData) {
      setData(initialData);
      return;
    }
    if (!identifier) return;

    const cached = globalLemmaCache.get(identifier.trim().toUpperCase());
    if (cached) {
      setData(cached);
      return;
    }

    let isMounted = true;
    fetchLemma(identifier).then((res) => {
      if (isMounted && res) {
        setData(res);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [identifier, initialData]);

  // Fecha o popover ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!identifier && !data) {
    return null;
  }

  const displayCode = data?.codigo || (lemaCodigo ? lemaCodigo.toUpperCase() : `LEMA-${String(lemaId).padStart(4, "0")}`);
  const numOnly = displayCode.replace(/\D/g, "");
  const shortNum = numOnly ? `#${parseInt(numOnly, 10).toString().padStart(3, "0")}` : displayCode;

  // Renderização variante pill (ex: na fila SM-2)
  if (variant === "pill") {
    return (
      <div className={`relative inline-block ${className}`}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-800 dark:text-[#d9b452] border border-amber-500/25 hover:bg-amber-500/20 hover:border-amber-500/40 transition-all cursor-pointer shadow-2xs"
          title="Ver Teorema / Lema Canônico"
        >
          <Compass className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 group-hover:rotate-45 transition-transform" />
          <span className="font-mono font-bold">Lema {shortNum}</span>
          {data?.titulo && (
            <span className="text-slate-600 dark:text-zinc-400 font-normal truncate max-w-[180px]">
              · {data.titulo}
            </span>
          )}
        </button>
        {isOpen && renderPopover()}
      </div>
    );
  }

  // Renderização variante compact (apenas código)
  if (variant === "compact") {
    return (
      <div className={`relative inline-block ${className}`}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-amber-500/10 text-amber-800 dark:text-[#d9b452] border border-amber-500/25 hover:bg-amber-500/20 hover:border-amber-500/40 transition-all cursor-pointer"
          title="Ver Teorema / Lema Canônico"
        >
          <Compass className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Lema {shortNum}</span>
        </button>
        {isOpen && renderPopover()}
      </div>
    );
  }

  // Renderização default (badge completo com nome e hover/popover)
  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/10 text-slate-800 dark:text-[#dedbd0] border border-amber-500/25 hover:bg-amber-500/15 hover:border-amber-500/40 transition-all cursor-pointer shadow-2xs"
        title="Clique para ver KaTeX, gatilho de prova e intuição deste lema"
      >
        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
          <Compass className="w-2.5 h-2.5" />
        </span>
        <span className="font-mono font-bold text-amber-700 dark:text-[#d9b452]">
          Lema {shortNum}
        </span>
        {data?.titulo && (
          <span className="hidden sm:inline text-slate-600 dark:text-zinc-400 truncate max-w-[220px]">
            — {data.titulo}
          </span>
        )}
      </button>

      {isOpen && renderPopover()}
    </div>
  );

  function renderPopover() {
    return (
      <div
        ref={popoverRef}
        className="absolute z-50 left-0 sm:left-auto sm:right-0 top-full mt-2 w-80 sm:w-96 max-w-[90vw] p-4 rounded-2xl bg-white dark:bg-[#161426] border-2 border-amber-500/35 shadow-2xl space-y-3.5 text-left animate-fadeIn backdrop-blur-md"
        role="dialog"
        aria-modal="true"
      >
        {/* CABEÇALHO */}
        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-amber-500/15">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                {displayCode}
              </span>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                {data?.materia || "Matemática"}
              </span>
            </div>
            <h4 className="font-serif-math font-bold text-sm text-slate-900 dark:text-[#f5f0df] leading-snug">
              {data?.titulo || `Lema Canônico ${displayCode}`}
            </h4>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            title="Fechar detalhes"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* FÓRMULA EM KATEX */}
        {data?.formula_latex ? (
          <div className="p-3 rounded-xl bg-amber-500/5 dark:bg-[#1f1b33] border border-amber-500/20 overflow-x-auto text-center font-mono text-xs shadow-2xs">
            <MathText text={data.formula_latex} />
          </div>
        ) : (
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900/60 text-slate-500 text-[11px] italic">
            Fórmula analítica em compilação.
          </div>
        )}

        {/* GATILHO DE RECONHECIMENTO */}
        {data?.gatilho_reconhecimento && (
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-[#d9b452] text-[11px] uppercase tracking-wide">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Gatilho de Reconhecimento:</span>
            </div>
            <p className="text-slate-700 dark:text-zinc-300 leading-relaxed text-xs pl-4 border-l-2 border-amber-500/40 font-sans">
              {data.gatilho_reconhecimento}
            </p>
          </div>
        )}

        {/* INTUIÇÃO DA PROVA */}
        {data?.intuicao_prova && (
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-400 text-[11px] uppercase tracking-wide">
              <BookOpen className="w-3 h-3 text-purple-500" />
              <span>Intuição Axiomática:</span>
            </div>
            <p className="text-slate-600 dark:text-zinc-400 leading-relaxed text-[11px] pl-4 border-l-2 border-purple-500/40 font-sans">
              {data.intuicao_prova}
            </p>
          </div>
        )}

        {/* RODAPÉ COM CONTAGEM E LINK PARA O BANCO */}
        <div className="pt-2 border-t border-slate-100 dark:border-amber-500/15 flex items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 font-medium">
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span>
              <strong className="text-slate-800 dark:text-[#f5f0df]">
                {data?.questoes_vinculadas_count ?? 1}
              </strong>{" "}
              questões associadas
            </span>
          </div>

          <Link
            href={`/questoes?lema=${displayCode}`}
            onClick={() => setIsOpen(false)}
            className="inline-flex items-center gap-1 font-bold text-amber-700 dark:text-[#d9b452] hover:underline"
          >
            <span>Ver no Banco</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    );
  }
}
