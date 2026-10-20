"use client";

import React, { useState } from "react";
import { 
  PenTool, 
  Compass, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  FileQuestion, 
  XCircle, 
  Eye, 
  Sparkles,
  Download,
  Trash2,
  Maximize2
} from "lucide-react";
import { MathText } from "@/components/math/MathDisplay";

export function BancadaShowcase() {
  const [activeTab, setActiveTab] = useState<"lousa" | "geometria" | "ocr">("lousa");

  return (
    <div className="space-y-10 my-8">
      {/* SELETOR DAS 3 FERRAMENTAS DA BANCADA */}
      <div className="flex flex-wrap items-center justify-center gap-3 select-none">
        <button
          type="button"
          onClick={() => setActiveTab("lousa")}
          className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2.5 transition-all cursor-pointer shadow-xs ${
            activeTab === "lousa"
              ? "lemmas-gold-cta scale-105"
              : "bg-white/80 dark:bg-[var(--bg-elevated)] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-amber-500/15 hover:border-blue-500/35 dark:hover:border-amber-500/35"
          }`}
        >
          <PenTool className="w-4 h-4 text-blue-600 dark:text-amber-500" />
          <span>Lousa de Rascunho Digital</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("geometria")}
          className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2.5 transition-all cursor-pointer shadow-xs ${
            activeTab === "geometria"
              ? "bg-sky-500 text-white font-bold scale-105"
              : "bg-white/80 dark:bg-[var(--bg-elevated)] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-amber-500/15 hover:border-sky-500/35"
          }`}
        >
          <Compass className="w-4 h-4 text-sky-500" />
          <span>Geometria Euclidiana (Régua & Compasso)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ocr")}
          className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2.5 transition-all cursor-pointer shadow-xs ${
            activeTab === "ocr"
              ? "bg-sky-600 text-white font-bold scale-105"
              : "bg-white/80 dark:bg-[var(--bg-elevated)] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-amber-500/15 hover:border-sky-500/35"
          }`}
        >
          <Camera className="w-4 h-4 text-sky-500" />
          <span>Dedução & OCR de Caderno</span>
        </button>
      </div>

      {/* ÁREA VISUAL PRINCIPAL DA FERRAMENTA SELECIONADA */}
      <div className="rounded-3xl border border-slate-200/90 dark:border-amber-500/25 bg-white dark:bg-[var(--bg-card)] shadow-xl overflow-hidden transition-all">
        {/* ABA 1: LOUSA DE RASCUNHO */}
        {activeTab === "lousa" && (
          <div className="p-6 md:p-8 space-y-6 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-600 dark:bg-amber-500" />
                <span className="font-serif-math font-bold text-sm text-slate-900 dark:text-[#f5f0df]">
                  Lousa Digital com Rejeição de Palma & Alta Densidade
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
                <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-[var(--bg-elevated)] font-mono text-[11px] border border-slate-200 dark:border-amber-500/20">
                  Resolução com Pointer Events
                </span>
              </div>
            </div>

            {/* SIMULADOR VISUAL DA LOUSA */}
            <div className="relative rounded-2xl border border-amber-500/25 bg-[#0d0f13] p-6 md:p-8 min-h-[300px] flex flex-col justify-between overflow-hidden text-[#f5f0df] shadow-inner">
              {/* Barra de Ferramentas Superior da Lousa */}
              <div className="flex flex-wrap items-center justify-between gap-2 z-10 pb-4 border-b border-white/10 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Paleta:</span>
                  <span className="w-4 h-4 rounded-full bg-white border border-amber-400 cursor-pointer" title="Giz Branco" />
                  <span className="w-4 h-4 rounded-full bg-[#d9b452] border border-amber-400 cursor-pointer" title="Giz Dourado" />
                  <span className="w-4 h-4 rounded-full bg-cyan-400 border border-amber-400 cursor-pointer" title="Giz Ciano" />
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">Grade: 20px</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">Borracha</span>
                  <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 flex items-center gap-1">
                    <Download className="w-3 h-3" /> Exportar PNG
                  </span>
                </div>
              </div>

              {/* Conteúdo Desenvolvido na Lousa */}
              <div className="my-6 space-y-4 font-serif-math">
                <div className="text-amber-400 text-xs uppercase tracking-widest font-mono">
                  [Dedução Analítica na Lousa]
                </div>
                <div className="text-lg md:text-2xl text-[#f5f0df] leading-relaxed">
                  <MathText text="$$\int_{-\infty}^{+\infty} e^{-x^2} dx = \sqrt{\pi} \quad \implies \quad I^2 = \int_0^{2\pi} d\theta \int_0^\infty r e^{-r^2} dr = \pi$$" />
                </div>
                <div className="text-xs md:text-sm text-zinc-400 font-sans italic border-l-2 border-amber-400/50 pl-3">
                  <MathText text="Mudança de coordenadas cartesianas para coordenadas polares no plano $\mathbb{R}^2$. O Jacobiano introduz o fator $r$, permitindo integração direta por substituição $u = r^2$." />
                </div>
              </div>

              {/* Rodapé da Lousa */}
              <div className="flex items-center justify-between pt-3 border-t border-white/10 text-[11px] text-zinc-400 font-mono">
                <span>Traços capturados com precisão vetorial</span>
                <span className="text-emerald-400">Pronto para Envio à MathAI Engine</span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed font-sans pt-4 border-t border-slate-100 dark:border-zinc-800/80 mt-4">
              Desenvolva suas contas livremente no tablet ou mouse. A Lousa do LemmaS conta com rejeição de palma nativa, salvamento automático e exportação instantânea para o avaliador da MathAI Engine.
            </p>
          </div>
        )}

        {/* ABA 2: GEOMETRIA EUCLIDIANA */}
        {activeTab === "geometria" && (
          <div className="p-6 md:p-8 space-y-6 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-500" />
                <span className="font-serif-math font-bold text-sm text-slate-900 dark:text-[#f5f0df]">
                  Quadro Euclidiano Interativo (Régua, Compasso & Lemas)
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
                <span className="px-2.5 py-1 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono text-[11px] border border-sky-500/20">
                  Script de Lemas Geométricos
                </span>
              </div>
            </div>

            {/* SIMULADOR VISUAL DO QUADRO GEOMÉTRICO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Área Gráfica da Construção */}
              <div className="md:col-span-2 rounded-2xl border border-sky-500/25 bg-[#0e1626] p-6 min-h-[280px] flex flex-col justify-between text-[#f5f0df] shadow-inner relative overflow-hidden">
                <div className="flex items-center justify-between text-[11px] font-mono text-sky-400 border-b border-sky-500/20 pb-2">
                  <span>Plano Cartesiano Euclidiano</span>
                  <span>Eixos: X [-10, 10] · Y [-10, 10]</span>
                </div>

                {/* Gráfico Ilustrativo da Construção */}
                <div className="my-auto py-4 text-center space-y-2">
                  <div className="w-32 h-32 mx-auto rounded-full border-2 border-dashed border-sky-400 flex items-center justify-center relative">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute center" />
                    <span className="text-[10px] font-mono text-amber-300 absolute -top-4">Incírculo I(0,0)</span>
                    <div className="w-full h-0.5 bg-sky-400/40 absolute rotate-45" />
                  </div>
                  <div className="text-xs text-sky-200 font-sans">
                    Construção do Ponto de Fermat e Círculo Inscrito
                  </div>
                </div>

                <div className="text-[11px] text-zinc-400 font-mono flex justify-between pt-2 border-t border-sky-500/20">
                  <span>4 Elementos traçados</span>
                  <span className="text-emerald-400">Validação Analítica Pronta</span>
                </div>
              </div>

              {/* Painel de Comandos da Construção */}
              <div className="rounded-2xl border border-slate-200 dark:border-sky-500/20 bg-slate-50 dark:bg-[#121b2d] p-4 text-xs font-mono space-y-2.5">
                <span className="font-bold text-sky-600 dark:text-sky-400 block uppercase tracking-wider text-[11px]">
                  Comandos Executados:
                </span>
                <div className="space-y-1.5 text-slate-700 dark:text-zinc-300">
                  <div className="p-1.5 rounded bg-white dark:bg-[#182338] border border-sky-500/10">Point(A, 0, 0)</div>
                  <div className="p-1.5 rounded bg-white dark:bg-[#182338] border border-sky-500/10">Point(B, 6, 0)</div>
                  <div className="p-1.5 rounded bg-white dark:bg-[#182338] border border-sky-500/10">Point(C, 0, 8)</div>
                  <div className="p-1.5 rounded bg-white dark:bg-[#182338] border border-sky-500/10">Incenter(I, A, B, C)</div>
                  <div className="p-1.5 rounded bg-white dark:bg-[#182338] border border-sky-500/10 text-amber-500">Circle(I, 2) [r=2]</div>
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed font-sans pt-4 border-t border-slate-100 dark:border-zinc-800/80 mt-4">
              Chega de desenhar triângulos no ar. Construa figuras com rigor euclidiano e receba feedback se suas construções satisfazem os axiomas clássicos de Geometria Plana.
            </p>
          </div>
        )}

        {/* ABA 3: DEDUÇÃO & OCR MULTIMODAL */}
        {activeTab === "ocr" && (
          <div className="p-6 md:p-8 space-y-6 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-500" />
                <span className="font-serif-math font-bold text-sm text-slate-900 dark:text-[#f5f0df]">
                  OCR Multimodal de Caderno & Detecção de Erros
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
                <span className="px-2.5 py-1 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-300 font-mono text-[11px] border border-sky-500/20">
                  Visão Computacional + LaTeX
                </span>
              </div>
            </div>

            {/* SIMULADOR DO SCANNER DE OCR */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Foto do Caderno com Linha Laser de Scan */}
              <div className="relative rounded-2xl border border-sky-500/30 bg-[#0f1622] p-5 min-h-[240px] flex flex-col justify-between text-[#f5f0df] shadow-inner overflow-hidden">
                <div className="text-[11px] font-mono text-sky-300 pb-2 border-b border-sky-500/20 flex justify-between">
                  <span>Foto do Caderno (Manuscrito)</span>
                  <span className="text-emerald-400">Legibilidade Alta</span>
                </div>

                <div className="my-auto py-4 space-y-2 text-center">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 font-serif-math text-base text-zinc-300 italic">
                    f(x) = x³ - 3x + 1<br />
                    f'(x) = 3x² - 3 = 0<br />
                    3(x² - 1) = 0 =&gt; x = ±1
                  </div>
                  <div className="text-[11px] text-sky-300 font-mono">
                    ✦ Transcrição Matemática Automática
                  </div>
                </div>

                <div className="text-[11px] text-zinc-400 font-mono pt-2 border-t border-sky-500/20 flex justify-between">
                  <span>Varredura por Tokens</span>
                  <span>100% Auditável</span>
                </div>
              </div>

              {/* Parecer do Diagnóstico Socrático */}
              <div className="rounded-2xl border border-slate-200 dark:border-sky-500/25 bg-slate-50 dark:bg-[#111b2c] p-5 space-y-3 text-xs leading-relaxed">
                <div className="flex items-center justify-between pb-2 border-b border-sky-500/20">
                  <span className="font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider text-[11px]">
                    Diagnóstico MathAI
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold font-mono text-[10px]">
                    Status: Correto
                  </span>
                </div>

                <div className="space-y-2.5 text-slate-700 dark:text-zinc-300">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <strong className="text-slate-900 dark:text-[#f5f0df]">Transcrição LaTeX:</strong>
                    <MathText text="$f'(x) = 3(x-1)(x+1) = 0 \implies x = \pm 1$" />
                  </div>
                  <p>
                    <strong className="text-slate-900 dark:text-[#f5f0df]">Primeiro Ponto de Desvio:</strong> Nenhum erro detectado nas derivadas.
                  </p>
                  <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-900 dark:text-sky-200 font-medium">
                    💡 <strong>Dica Socrática:</strong> Para classificar os pontos críticos como máximo ou mínimo local, qual lema você pode aplicar agora? O teste da primeira ou da segunda derivada?
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed font-sans pt-4 border-t border-slate-100 dark:border-zinc-800/80 mt-4">
              Tirou foto do caderno? O LemmaS faz a transcrição das fórmulas para LaTeX, identifica exatamente em qual linha você cometeu um erro de conta ou sinal, e devolve uma reflexão socrática para você corrigir sozinho.
            </p>
          </div>
        )}
      </div>

      {/* O GUARDA-CORPO EPISTÊMICO: OS 4 VEREDITOS AUDITÁVEIS */}
      <div className="rounded-3xl border border-slate-200/90 dark:border-amber-500/20 bg-slate-50/60 dark:bg-[var(--bg-card)] p-6 md:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="lemmas-eyebrow">AUDITORIA & INTEGRIDADE</span>
            <h3 className="font-serif-math text-xl md:text-2xl font-bold text-slate-900 dark:text-[#f5f0df]">
              Os 4 Vereditos Auditáveis da MathAI Engine
            </h3>
          </div>
          <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-[#d9b452] font-mono text-xs font-bold">
            Dado Observado ≠ Interpretação da IA ≠ Dado Validado
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-white dark:bg-[var(--bg-elevated)] border border-emerald-500/30 space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" />
              <span>Aprovado</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
              O desenvolvimento matemático é válido e completo, com justificativa suficiente e resultado correto.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[var(--bg-elevated)] border border-amber-500/30 space-y-2">
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" />
              <span>Parcial</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
              Raciocínio essencialmente correto, mas com deslize pontual de cálculo aritmético ou erro de sinal.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[var(--bg-elevated)] border border-slate-300 dark:border-zinc-700 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-400 font-bold text-xs uppercase tracking-wider">
              <FileQuestion className="w-4 h-4" />
              <span>Sem Desenvolvimento</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
              O aluno apresentou apenas a resposta final ou rascunho em branco. Exige demonstração na Bancada.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[var(--bg-elevated)] border border-rose-500/30 space-y-2">
            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-wider">
              <XCircle className="w-4 h-4" />
              <span>Incorreto</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
              Tentativa que apresenta erro conceitual ou dedutivo invalidando a prova, com diagnóstico pedagógico.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

