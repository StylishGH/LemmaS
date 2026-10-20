"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, Cpu, Lightbulb, CheckCheck, ArrowRight, Brain } from "lucide-react";
import { MathText } from "@/components/math/MathDisplay";

export function SegundaOpiniaoShowcase() {
  const [selectedExample, setSelectedExample] = useState<number>(0);

  const EXEMPLOS = [
    {
      problema: "Calcule o inraio r de um triângulo retângulo com catetos de 6 cm e 8 cm.",
      topico: "Geometria Plana & Invariantes",
      modelA: {
        titulo: "Rigor Axiomático & Prova Formal",
        modelo: "NVIDIA Nemotron · Demonstração Analítica",
        conteudo:
          "**1. Lema Fundamental da Decomposição de Áreas:** A conexão do incentro aos vértices particiona a área total em três subtriângulos: $S = \\frac{a \\cdot r}{2} + \\frac{b \\cdot r}{2} + \\frac{c \\cdot r}{2} = p \\cdot r$, gerando a identidade universal $r = \\frac{S}{p}$.\n\n**2. Cálculo Euclidiano Rigoroso:** Hipotenusa por Pitágoras: $a = \\sqrt{6^2 + 8^2} = 10\\text{ cm}$. Área direta: $S = \\frac{6 \\times 8}{2} = 24\\text{ cm}^2$. Semiperímetro: $p = \\frac{10 + 6 + 8}{2} = 12\\text{ cm}$.\n\n**3. Solução Axiomática:** $r = \\frac{S}{p} = \\frac{24}{12} = 2\\text{ cm}$.\n\n**Domínio de Validade:** Válido para qualquer polígono circunscritível no plano euclidiano.",
      },
      modelB: {
        titulo: "Intuição Heurística & Atalhos Cognitivos",
        modelo: "Métodos de Gauss & Simetrias Globais",
        conteudo:
          "**1. Atalho 1 — Homotetia da Terna 3-4-5:** O triângulo 6-8-10 é uma dilatação de razão 2 do triângulo primitivo 3-4-5 (inraio 1). Logo: $r = 2 \\times 1 = 2\\text{ cm}$ sem contas!\n\n**2. Atalho 2 — Macete das Tangentes:** No vértice reto forma-se um quadrado $r \\times r$. As tangentes somam a hipotenusa: $(6-r) + (8-r) = 10 \\implies r = \\frac{6 + 8 - 10}{2} = 2\\text{ cm}$.\n\n**Dica Socrática:** Reconhecer ternas pitagóricas e atalhos tangenciais poupa minutos preciosos em exames militares.",
      },
      sintese:
        "O Modelo A constrói a fundamentação axiomática universal pela decomposição de áreas ($S = p \\cdot r$), enquanto o Modelo B mobiliza a economia cognitiva da homotetia e o macete das tangentes ($r = \\frac{a+b-c}{2}$). Dominar ambos os caminhos é o segredo do sucesso pedagógico e competitivo.",
    },
    {
      problema: "Determine a soma dos primeiros n números naturais: S = 1 + 2 + 3 + ... + n.",
      topico: "Progressões & Séries Finitas",
      modelA: {
        titulo: "Rigor Axiomático & Prova Formal",
        modelo: "NVIDIA Nemotron · Indução & Invariantes",
        conteudo:
          "**1. Hipótese Axiomática:** Seja $S_n = \\sum_{k=1}^n k$.\n\n**2. Simetria Dedutiva:** Escrevendo a soma em ordem direta e reversa:\n$$S_n = 1 + 2 + \\dots + n$$\n$$S_n = n + (n-1) + \\dots + 1$$\nSomando membro a membro, cada um dos $n$ pares resulta em $(n+1)$:\n$$2S_n = n(n+1) \\implies S_n = \\frac{n(n+1)}{2}$$\n\n**Atenção:** Prova formalizável por Indução Matemática Finita sobre $\\mathbb{N}^*$.",
      },
      modelB: {
        titulo: "Intuição Heurística & Atalhos Cognitivos",
        modelo: "Método Visual de Gauss & Áreas",
        conteudo:
          "**1. Visão Geométrica:** Imagine $S_n$ como uma escada triangular de blocos unitários de base e altura $n$.\n\n**2. O Atalho do Retângulo:** Junte duas escadas idênticas viradas uma contra a outra. Elas se encaixam perfeitamente formando um retângulo de dimensões $n \\times (n+1)$.\n\n**3. Conclusão Direta:** A área total do retângulo é $n(n+1)$. Como usamos duas escadas, cada uma tem metade da área: $\\frac{n(n+1)}{2}$.\n\n**Dica Socrática:** Sempre procure dobrar a figura quando houver simetria aritmética!",
      },
      sintese:
        "A visão formal de pares complementares e a intuição geométrica do encaixe de escadas expressam exatamente a mesma verdade matemática sob duas linguagens cognitivas complementares.",
    },
  ];

  const ex = EXEMPLOS[selectedExample];

  return (
    <section id="segunda-opiniao" className="lemmas-section">
      <div className="lemmas-section-heading">
        <span className="lemmas-eyebrow">DIFERENCIAL MATHAI · COGNIÇÃO MULTI-MODELO</span>
        <h2>Uma segunda perspectiva para o seu raciocínio.</h2>
        <p>
          Nem sempre basta chegar a uma resposta. Explore outra análise do raciocínio matemático, confira etapas importantes e identifique pontos que merecem revisão.
        </p>
      </div>

      {/* SELETOR DE CASOS REAIS */}
      <div className="flex items-center gap-2 mt-8 mb-6 overflow-x-auto select-none">
        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider shrink-0">
          Problema de Amostra:
        </span>
        {EXEMPLOS.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setSelectedExample(idx)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
              selectedExample === idx
                ? "lemmas-gold-cta font-bold shadow-xs"
                : "bg-white/80 dark:bg-[var(--bg-elevated)] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-amber-500/15 hover:border-blue-500/35 dark:hover:border-amber-500/35"
            }`}
          >
            {item.topico}
          </button>
        ))}
      </div>

      {/* PAINEL COMPARATIVO LADO A LADO */}
      <div className="space-y-6">
        {/* ENUNCIADO EM DESTAQUE */}
        <div className="relative rounded-2xl bg-[var(--bg-card)] p-5 border-2 border-[var(--border-board)] shadow-[0_16px_36px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,220,163,0.18)] space-y-1">
          {/* Chanfro interno sutil da moldura de madeira */}
          <div className="absolute inset-0 rounded-2xl border border-[var(--border-wood-edge)] pointer-events-none opacity-80" />
          <span className="text-[11px] font-mono font-bold text-blue-700 dark:text-[#d9b452] uppercase tracking-wider block">
            Problema Sob Análise Comparativa:
          </span>
          <div className="text-sm font-serif-math text-slate-900 dark:text-[#f5f0df]">
            <MathText text={ex.problema} />
          </div>
        </div>

        {/* OS DOIS MODELOS LADO A LADO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* MODELO A: NEMOTRON (RIGOR) */}
          <div className="relative rounded-2xl bg-[var(--bg-card)] p-6 border-2 border-[var(--border-board)] shadow-[0_16px_36px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,220,163,0.18)] space-y-4 hover:border-amber-500/35 transition flex flex-col justify-between">
            {/* Chanfro interno sutil da moldura de madeira */}
            <div className="absolute inset-0 rounded-2xl border border-[var(--border-wood-edge)] pointer-events-none opacity-80" />
            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif-math font-bold text-sm text-slate-900 dark:text-[#f5f0df]">
                      {ex.modelA.titulo}
                    </h3>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      {ex.modelA.modelo}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                  Axiomático
                </span>
              </div>

              <div className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed font-sans whitespace-pre-line select-text">
                <MathText text={ex.modelA.conteudo} />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400 relative z-10">
              <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Foco: demonstração analítica e precisão de definições formais.</span>
            </div>
          </div>

          {/* MODELO B: HEURÍSTICA & GAUSS */}
          <div className="relative rounded-2xl bg-[var(--bg-card)] p-6 border-2 border-[var(--border-board)] shadow-[0_16px_36px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,220,163,0.18)] space-y-4 hover:border-blue-500/35 dark:hover:border-amber-500/35 transition flex flex-col justify-between">
            {/* Chanfro interno sutil da moldura de madeira */}
            <div className="absolute inset-0 rounded-2xl border border-[var(--border-wood-edge)] pointer-events-none opacity-80" />
            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-amber-500/10 border border-blue-500/30 dark:border-amber-500/30 flex items-center justify-center text-blue-600 dark:text-amber-500">
                    <Lightbulb className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif-math font-bold text-sm text-slate-900 dark:text-[#f5f0df]">
                      {ex.modelB.titulo}
                    </h3>
                    <p className="text-[11px] text-blue-600 dark:text-[#d9b452] font-medium">
                      {ex.modelB.modelo}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 dark:bg-amber-500/10 text-blue-600 dark:text-[#d9b452] border border-blue-500/25 dark:border-amber-500/25">
                  Heurística
                </span>
              </div>

              <div className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed font-sans whitespace-pre-line select-text">
                <MathText text={ex.modelB.conteudo} />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400 relative z-10">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-amber-500" />
              <span>Foco: analogias visuais, atalhos de prova e intuição socrática.</span>
            </div>
          </div>
        </div>

        {/* SÍNTESE METACOGNITIVA */}
        <div className="relative rounded-2xl bg-[var(--bg-card)] p-5 sm:p-6 border-2 border-[var(--border-board)] shadow-[0_16px_36px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,220,163,0.18)] space-y-2 text-xs sm:text-sm">
          {/* Chanfro interno sutil da moldura de madeira */}
          <div className="absolute inset-0 rounded-2xl border border-[var(--border-wood-edge)] pointer-events-none opacity-80" />
          <div className="flex items-center gap-2 font-serif-math font-bold text-slate-900 dark:text-[#f5f0df] relative z-10">
            <Brain className="w-4 h-4 text-blue-600 dark:text-amber-500" />
            <span>Síntese Pedagógica para o Estudante:</span>
          </div>
          <p className="text-slate-600 dark:text-zinc-300 leading-relaxed font-sans relative z-10">
            {ex.sintese}
          </p>
        </div>

        {/* BOTÃO CONTEXTUAL DISCRETO PARA O EXPERIMENTO AO VIVO */}
        <div className="text-center pt-2">
          <Link
            href="/opinioes"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-blue-700 dark:text-[#d9b452] hover:underline"
          >
            <span>Experimentar a Segunda Opinião com sua própria questão no Simulador</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

