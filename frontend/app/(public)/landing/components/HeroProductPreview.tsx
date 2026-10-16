"use client";

import React, { useState } from "react";
import { Sparkles, CheckCircle2, Cpu, Lightbulb, Eye, ShieldCheck, ChevronRight } from "lucide-react";
import { MathText } from "@/components/math/MathDisplay";

export function HeroProductPreview() {
  const [activeTab, setActiveTab] = useState<"axiom" | "heuristic">("axiom");

  return (
    <div className="w-full rounded-2xl md:rounded-3xl border border-slate-200/90 dark:border-amber-500/25 bg-white/95 dark:bg-[#141222]/95 shadow-2xl backdrop-blur-md overflow-hidden text-slate-800 dark:text-[#dedbd0] font-sans transition-all">
      {/* BARRA SUPERIOR MAC/LINUX COM STATUS */}
      <div className="px-4 py-3 bg-slate-100/90 dark:bg-[#18152a] border-b border-slate-200/80 dark:border-amber-500/15 flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          <span className="ml-2 font-mono text-[11px] text-slate-500 dark:text-zinc-400 truncate max-w-[210px] sm:max-w-none">
            Bancada Discursiva · ITA 2024 · Geometria Plana
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Avaliação Concluída</span>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* ENUNCIADO REAL EM KATEX */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1a172e] border border-slate-200/80 dark:border-amber-500/15 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
            <span className="font-mono text-amber-700 dark:text-[#d9b452] font-bold">QUESTÃO #1428</span>
            <span>Geometria Euclidiana & Invariantes</span>
          </div>
          <div className="text-xs sm:text-sm text-slate-900 dark:text-[#f5f0df] leading-relaxed">
            <MathText text="Em um triângulo retângulo de catetos $a = 6\text{ cm}$ e $b = 8\text{ cm}$, determine o raio $r$ da circunferência inscrita (incírculo)." />
          </div>
        </div>

        {/* DADO OBSERVADO DO ALUNO (RESOLUÇÃO DISCURSIVA) */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#18152a] border border-slate-200/80 dark:border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-emerald-600 text-white flex items-center gap-1">
                <Eye className="w-3 h-3" />
                DADO OBSERVADO
              </span>
              <span className="text-[11px] font-mono text-slate-400 dark:text-zinc-500 hidden sm:inline">
                sha256:7f3a...b891
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-zinc-400 italic">
              Lousa de Rascunho & Dedução
            </span>
          </div>

          <div className="text-xs font-mono text-slate-700 dark:text-zinc-300 leading-relaxed space-y-1 pl-2 border-l-2 border-amber-500/40">
            <div><MathText text="1. Pitágoras: $c = \sqrt{6^2 + 8^2} = 10\text{ cm}$" /></div>
            <div><MathText text="2. Invariante: $r = \frac{a + b - c}{2} = \frac{6 + 8 - 10}{2} = 2\text{ cm}$" /></div>
          </div>
        </div>

        {/* VEREDITO DA MATHAI ENGINE (4 VEREDITOS AUDITÁVEIS) */}
        <div className="p-3.5 rounded-xl bg-purple-500/5 dark:bg-purple-950/20 border border-purple-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                APROVADO
              </span>
              <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300">
                MathAI Engine
              </span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
              Confiança: 98%
            </span>
          </div>

          <div className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed font-sans">
            <MathText text="Demonstração consistente. O teorema dos segmentos tangentes valida $r = \frac{a+b-c}{2}$. O semiperímetro $p = 12$ confirma a conservação de área $S = p \cdot r = 24\text{ cm}^2$." />
          </div>
        </div>

        {/* PREVIEW INTERATIVO DA SEGUNDA OPINIÃO */}
        <div className="pt-1">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-zinc-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Segunda Opinião: Disputa Pedagógica</span>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#1a172e] p-0.5 rounded-lg border border-slate-200 dark:border-amber-500/20 text-[11px]">
              <button
                type="button"
                onClick={() => setActiveTab("axiom")}
                className={`px-2 py-0.5 rounded-md font-semibold transition ${
                  activeTab === "axiom"
                    ? "bg-amber-500 text-slate-950 shadow-xs"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                }`}
              >
                Axiomático
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("heuristic")}
                className={`px-2 py-0.5 rounded-md font-semibold transition ${
                  activeTab === "heuristic"
                    ? "bg-amber-500 text-slate-950 shadow-xs"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                }`}
              >
                Heurístico
              </button>
            </div>
          </div>

          <div className="pt-2 text-xs text-slate-600 dark:text-zinc-300 leading-relaxed font-sans animate-fadeIn">
            {activeTab === "axiom" ? (
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
                  Rigor Axiomático & Demonstração Formal (Nemotron):
                </span>
                <div className="text-xs text-slate-600 dark:text-zinc-300">
                  <MathText text="Isole os pontos de tangência $T_1, T_2, T_3$. A igualdade dos segmentos de tangentes exteriores conduz estritamente a $r = \frac{a+b-c}{2} = 2\text{ cm}$." />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-amber-600 dark:text-[#d9b452] block">
                  Intuição Heurística & Atalhos de Gauss:
                </span>
                <div className="text-xs text-slate-600 dark:text-zinc-300">
                  <MathText text="O triângulo 6-8-10 é uma homotetia de razão 2 do triângulo primitivo 3-4-5 (inraio primitivo $1$). Logo, o novo inraio é $1 \times 2 = 2\text{ cm}$ sem contas!" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
