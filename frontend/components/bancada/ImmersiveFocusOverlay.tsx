"use client";

import { createPortal } from "react-dom";
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  X,
  Maximize2,
  Minimize2,
  Sparkles,
  Compass,
  Lightbulb,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/ThemeToggle";

// Bloqueia scroll da página enquanto o modo foco estiver ativo
function useLockBodyScroll() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
}
import FloatingQuestionHUD, {
  QuestionData,
  DiscursiveEvaluationData,
} from "./FloatingQuestionHUD";
import type { CanvasDocument } from "@/lib/canvas-document";
import SpenSmartCanvas, { Stroke } from "@/components/lousa/SpenSmartCanvas";
import GeometricCompassBoard from "@/components/math/GeometricCompassBoard";

export type BancadaEngine = "spen-dual" | "geometria";

export interface ImmersiveFocusOverlayProps {
  question: QuestionData;
  currentIndex: number;
  totalQuestions: number;
  selectedAnswer?: string;
  onSelectAnswer?: (answer: string) => void;
  // Motor Ativo
  activeEngine: BancadaEngine;
  onChangeEngine: (engine: BancadaEngine) => void;
  // Navegação entre questões
  onNext?: () => void;
  onPrev?: () => void;
  // Lousa State
  lousaDocument: CanvasDocument;
  onLousaStrokesChange: (strokes: Stroke[]) => void;
  // Geometria State
  geometricCommands: string[];
  onGeometricCommandsChange: (cmds: string[]) => void;
  // Avaliação MathAI
  onEvaluateDiscursive: (tipo: "lousa" | "geometria", payload: { imagemBase64?: string; texto?: string }) => Promise<void>;
  isEvaluating: boolean;
  evaluationResult?: DiscursiveEvaluationData;
  onConfirmOcr?: (text: string) => Promise<void>;
  socraticTutor: React.ReactNode;
  hint5Confirmation?: React.ReactNode;
  authPrompt?: React.ReactNode;
  hasBlockingModal?: boolean;
  onDismissModal?: () => void;
  isQuestionLocked?: boolean;
  // Ação de Sair
  onClose: () => void;
}

export default function ImmersiveFocusOverlay({
  question,
  currentIndex,
  totalQuestions,
  selectedAnswer,
  onSelectAnswer,
  activeEngine,
  onChangeEngine,
  onNext,
  onPrev,
  lousaDocument,
  onLousaStrokesChange,
  geometricCommands,
  onGeometricCommandsChange,
  onEvaluateDiscursive,
  isEvaluating,
  evaluationResult,
  onConfirmOcr,
  socraticTutor,
  hint5Confirmation,
  authPrompt,
  hasBlockingModal = false,
  onDismissModal,
  isQuestionLocked = false,
  onClose,
}: ImmersiveFocusOverlayProps) {
  const { isLight } = useTheme();
  const [showTutor, setShowTutor] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [isMobileWidth, setIsMobileWidth] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const [hudTop, setHudTop] = useState(12);
  const spenExportRef = useRef<(() => string | null) | null>(null);

  // Bug fix: bloqueia scroll da página por baixo do overlay
  useLockBodyScroll();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobileWidth(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Fecha o modo imersivo via tecla Escape; navega com ← →
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey ||
          target?.closest("input, textarea, select, [contenteditable='true'], [role='textbox']")) return;
      if (e.key === "Escape") {
        if (hasBlockingModal) {
          e.preventDefault();
          onDismissModal?.();
        } else if (!document.fullscreenElement) {
          onClose();
        }
      } else if (e.key === "ArrowRight" && onNext && !hasBlockingModal) {
        e.preventDefault();
        onNext();
      } else if (e.key === "ArrowLeft" && onPrev && !hasBlockingModal) {
        e.preventDefault();
        onPrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onNext, onPrev, hasBlockingModal, onDismissModal]);

  useEffect(() => {
    const updateFullscreen = () => setIsNativeFullscreen(Boolean(document.fullscreenElement));
    updateFullscreen();
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);

  // O painel começa abaixo das ferramentas, inclusive quando elas quebram linha.
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const viewport = main.querySelector("canvas")?.parentElement?.parentElement;
    const toolbar = viewport?.previousElementSibling as HTMLElement | null;
    const updateTop = () => {
      const top = activeEngine === "spen-dual" && viewport
        ? Math.max(12, Math.round(viewport.getBoundingClientRect().top - main.getBoundingClientRect().top + 8))
        : 12;
      setHudTop(top);
    };
    updateTop();
    const observer = new ResizeObserver(updateTop);
    observer.observe(main);
    if (viewport) observer.observe(viewport);
    if (toolbar) observer.observe(toolbar);
    return () => observer.disconnect();
  }, [activeEngine, currentIndex]);

  // Alterna tela cheia nativa do browser para tablets/iPads
  const toggleNativeFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, []);

  // Handler unificado de avaliação no HUD
  const handleEvaluateFromHUD = async () => {
    if (activeEngine === "spen-dual") {
      const b64 = spenExportRef.current ? spenExportRef.current() : null;
      await onEvaluateDiscursive("lousa", { imagemBase64: b64 || "" });
    } else if (activeEngine === "geometria") {
      const desc = geometricCommands.length > 0
        ? `Construção Euclidiana executada:\n${geometricCommands.join("\n")}`
        : "Construção Euclidiana vazia.";
      await onEvaluateDiscursive("geometria", { texto: desc });
    }
  };

  return createPortal(
    <div
      ref={containerRef}
      className={`fixed inset-0 z-[200] flex flex-col select-none animate-fadeIn transition-colors ${
        isLight
          ? "bg-[#f8f7f2] text-slate-900"
          : "bg-[#07060f] text-[#f5f0df]"
      }`}
    >
      {/* BARRA SUPERIOR DO MODO FOCO IMERSIVO */}
      <header className={`flex flex-wrap items-center justify-between gap-1.5 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-2 border-b shrink-0 z-40 shadow-lg transition-colors ${
        isLight
          ? "bg-white border-slate-200"
          : "bg-[#0e0c1b] border-amber-500/25"
      }`}>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-serif-math font-bold tracking-wider ${
            isLight
              ? "bg-amber-500/10 border-amber-500/25 text-amber-700"
              : "bg-amber-500/15 border-amber-500/30 text-[#d9b452]"
          }`}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>Modo Foco Imersivo</span>
          </div>

          {/* SELETOR DE MOTOR DE BANCADA */}
          <div className={`flex items-center gap-1 p-1 rounded-xl border text-xs ${
            isLight ? "bg-slate-100 border-slate-200" : "bg-black/40 border-white/10"
          }`}>
            <button
              type="button"
              onClick={() => onChangeEngine("spen-dual")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeEngine === "spen-dual"
                  ? "bg-amber-400 text-black shadow-xs font-bold"
                  : isLight ? "text-slate-500 hover:text-slate-900" : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>⚡ Lousa Digital</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeEngine("geometria")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeEngine === "geometria"
                  ? "bg-amber-400 text-black shadow-xs font-bold"
                  : isLight ? "text-slate-500 hover:text-slate-900" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>GeoGebra</span>
            </button>
          </div>
        </div>

        {/* CONTROLES DE FECHAMENTO E TELA CHEIA */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTutor(value => !value)}
            aria-expanded={showTutor}
            aria-controls="focus-socratic-tutor"
            className="px-3 py-2 rounded-xl border border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10 text-xs font-semibold flex items-center gap-2"
          >
            <Lightbulb className="w-4 h-4" />
            <span className="sm:hidden">Dicas</span><span className="hidden sm:inline">Dicas socráticas</span>
          </button>
          {/* Toggle de Tema dentro do modo foco */}
          <ThemeToggle compact />

          <button
            type="button"
            onClick={toggleNativeFullscreen}
            className={`p-2 rounded-xl border text-xs transition cursor-pointer hidden sm:flex items-center gap-1.5 ${
              isLight
                ? "bg-slate-100 border-slate-300 text-slate-600 hover:text-slate-900 hover:border-slate-400"
                : "bg-zinc-900 border-zinc-700/80 text-zinc-300 hover:text-white hover:border-zinc-500"
            }`}
            title={isNativeFullscreen ? "Sair da Tela Cheia Nativa" : "Tela Cheia Total (Ocultar Abas)"}
          >
            {isNativeFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="font-mono text-[11px]">{isNativeFullscreen ? "Restaurar" : "Expandir"}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-500 font-sans font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
            title="Sair do Modo Foco (Esc)"
          >
            <X className="w-3.5 h-3.5" />
            <span className="sm:hidden">Sair</span><span className="hidden sm:inline">Sair do Modo Foco</span>
          </button>
        </div>
      </header>

      {/* ÁREA CENTRAL EXPANDIDA COM BANCADA E HUD SOBREPOSTO */}
      <main ref={mainRef} className={`relative flex-1 w-full overflow-hidden transition-colors ${
        isLight ? "bg-[#f8f7f2]" : "bg-[#07060f]"
      }`}>
        {/* BANCADA ATIVA — ocupa todo o espaço restante abaixo do header */}
        <div className="absolute inset-0 p-2 sm:p-3 overflow-hidden">
          {activeEngine === "spen-dual" && (
            <div className="w-full h-full flex flex-col">
              <SpenSmartCanvas
                key={`spen-focus-q${currentIndex}-${question.id}`}
                documentState={lousaDocument}
                onStrokesChange={onLousaStrokesChange}
                onEvaluateOcr={async (b64) => {
                  await onEvaluateDiscursive("lousa", { imagemBase64: b64 });
                }}
                isEvaluating={isEvaluating}
                canvasHeightClass="flex-1 min-h-0"
                hideFooterEvaluate={true}
                showZoomControls={true}
                initialPages={2}
                exportCanvasRef={spenExportRef}
              />
            </div>
          )}

          {activeEngine === "geometria" && (
            <div className="w-full h-full flex flex-col">
              <GeometricCompassBoard
                key={`geo-focus-q${currentIndex}-${question.id}`}
                initialCommands={geometricCommands}
                onCommandsChange={onGeometricCommandsChange}
                className="w-full h-full"
                isFocusMode={true}
              />
            </div>
          )}
        </div>

        {showTutor && (
          <aside
            id="focus-socratic-tutor"
            aria-label="Dicas socráticas no Modo Foco"
            style={{ top: isMobileWidth ? hudTop + 48 : hudTop }}
            className="absolute inset-x-2 md:left-auto md:right-3 bottom-2 sm:bottom-3 z-[60] w-auto md:w-[400px] lg:w-[440px] xl:w-[500px] max-w-[calc(100%-16px)] overflow-x-hidden overflow-y-auto rounded-2xl border border-amber-500/30 bg-white dark:bg-[#141222] shadow-2xl select-text"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-amber-500/20 bg-white dark:bg-[#141222] px-4 py-3">
              <strong className="text-sm truncate">Dicas socráticas · Questão {currentIndex + 1}</strong>
              <button type="button" onClick={() => setShowTutor(false)} aria-label="Fechar dicas socráticas" className="p-2 rounded-lg hover:bg-amber-500/10 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="min-w-0 max-w-full overflow-x-hidden p-2.5 sm:p-3">{socraticTutor}</div>
          </aside>
        )}

        {/* HUD FLUTUANTE DA QUESTÃO */}
        <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ top: hudTop }}>
          <FloatingQuestionHUD
            question={question}
            currentIndex={currentIndex}
            totalQuestions={totalQuestions}
            selectedAnswer={selectedAnswer}
            onSelectAnswer={onSelectAnswer}
            onNext={onNext}
            onPrev={onPrev}
            onEvaluate={handleEvaluateFromHUD}
            isEvaluating={isEvaluating}
            evaluationResult={evaluationResult}
            onConfirmOcr={onConfirmOcr}
            onCloseFocusMode={onClose}
            dockSide={showTutor ? "left" : "right"}
            compact={showTutor}
            isLocked={isQuestionLocked}
          />
        </div>
      </main>

      {/* MODAIS BLOQUEANTES DENTRO DO CONTAINER (COMPATÍVEL COM TELA CHEIA NATIVA TOP-LAYER) */}
      {hint5Confirmation}
      {authPrompt}
    </div>,
    document.body
  );
}
