"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  Minus,
  Maximize2,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Loader2,
  Eye,
  EyeOff,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { OcrReview } from "@/components/avaliacao/OcrReview";
import { MathText } from "@/components/math/MathDisplay";
import { extrairEnunciadoEAlternativas } from "@/lib/math-parser";
import { resolveFigureUrl } from "@/lib/image-url";
import { useTheme } from "@/components/theme-provider";

const QuestionMath = React.memo(MathText);

export interface QuestionData {
  id: number;
  enunciado: string;
  tipo?: string;
  gabarito?: string;
  banca?: string;
  ano?: number;
  materia?: string;
  topico?: string;
  figura_path?: string | null;
}

export interface DiscursiveEvaluationData {
  veredito: "aprovado" | "parcial" | "sem_desenvolvimento" | "incorreto";
  desenvolvimento_presente: boolean;
  resultado_final_correto: boolean;
  precisa_revisao_humana?: boolean;
  ocr_review_required?: boolean;
  transcricao_latex?: string;
  feedback_latex?: string;
  diagnostico?: string;
  etapas_corretas?: string[];
  erros_identificados?: string[];
  dica_proximo_passo?: string;
}

export interface FloatingQuestionHUDProps {
  question: QuestionData;
  currentIndex: number;
  totalQuestions: number;
  selectedAnswer?: string;
  onSelectAnswer?: (answer: string) => void;
  onNext?: () => void;
  onPrev?: () => void;
  onEvaluate?: () => void;
  isEvaluating?: boolean;
  evaluationResult?: DiscursiveEvaluationData;
  onConfirmOcr?: (text: string) => Promise<void>;
  onCloseFocusMode?: () => void;
}

export default function FloatingQuestionHUD({
  question,
  currentIndex,
  totalQuestions,
  selectedAnswer,
  onSelectAnswer,
  onNext,
  onPrev,
  onEvaluate,
  isEvaluating = false,
  evaluationResult,
  onConfirmOcr,
}: FloatingQuestionHUDProps) {
  const { isLight } = useTheme();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isTranslucent, setIsTranslucent] = useState(false);

  // ── Drag ──────────────────────────────────────────────────────────────────
  const [position, setPos] = useState<{ x: number; y: number; index: number } | null>(null);
  const pos = position?.index === currentIndex ? position : null;
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const hudRef = useRef<HTMLDivElement>(null);

  // Mantém a alça acessível após rotação da tela e expansão do painel.
  useEffect(() => {
    const hud = hudRef.current, parent = hud?.offsetParent;
    if (!hud || !parent) return;
    const observer = new ResizeObserver(() => setPos(previous => {
      if (!previous) return previous;
      const x = Math.max(0, Math.min(parent.clientWidth - hud.offsetWidth, previous.x));
      const y = Math.max(0, Math.min(parent.clientHeight - Math.min(hud.offsetHeight, 60), previous.y));
      return x === previous.x && y === previous.y ? previous : { ...previous, x, y };
    }));
    observer.observe(parent);
    observer.observe(hud);
    return () => observer.disconnect();
  }, []);

  const onDragStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Não inicia drag quando o clique é num botão
    if (e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = hudRef.current?.getBoundingClientRect();
    const parent = hudRef.current?.offsetParent?.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: (rect?.left ?? 0) - (parent?.left ?? 0),
      origY: (rect?.top ?? 0) - (parent?.top ?? 0),
    };
  }, []);

  const onDragMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const hud = hudRef.current;
    const parent = hud?.offsetParent;
    if (!hud || !parent) return;
    setPos({
      index: currentIndex,
      x: Math.max(0, Math.min(parent.clientWidth - hud.offsetWidth, dragRef.current.origX + dx)),
      y: Math.max(0, Math.min(parent.clientHeight - Math.min(hud.offsetHeight, 60), dragRef.current.origY + dy)),
    });
  }, [currentIndex]);

  const onDragEnd = useCallback(() => { dragRef.current = null; }, []);

  // Quando arrastado usa left/top; caso contrário cai no posicionamento padrão do CSS (top-0 right-4)
  const posStyle: React.CSSProperties = pos
    ? { position: "absolute", left: pos.x, top: pos.y, right: "auto", maxHeight: `calc(100% - ${pos.y}px)` }
    : {};
  // ──────────────────────────────────────────────────────────────────────────

  const isQuestionDiscursiva = Boolean(
    question?.tipo?.toLowerCase() === "discursiva" ||
    question?.gabarito?.toLowerCase().includes("discursiv")
  );

  const { corpo, alternativas } = useMemo(() => extrairEnunciadoEAlternativas(
    question.enunciado, isQuestionDiscursiva
  ), [question.enunciado, isQuestionDiscursiva]);

  const hasAlternativas = Object.keys(alternativas).length > 0;
  const figuraUrl = resolveFigureUrl(question.figura_path);

  // ── Elemento raiz único — posição e drag persistem em minimizado/expandido ──
  return (
    <div
      ref={hudRef}
      style={posStyle}
      className="absolute top-0 right-4 z-50 pointer-events-auto animate-fadeIn flex max-h-full flex-col"
    >
      {isMinimized ? (
        /* ── PÍLULA MINIMIZADA ── */
        <div
          className={`flex items-center gap-0 rounded-2xl border shadow-2xl backdrop-blur-md transition-colors font-sans text-xs select-none overflow-hidden ${
            isLight
              ? "bg-white/95 text-slate-900 border-amber-700/30 hover:border-amber-700"
              : "bg-[#141224]/95 text-[#f5f0df] border-amber-500/35 hover:border-amber-400"
          }`}
        >
          {/* ALÇA DE DRAG */}
          <div
            className={`flex items-center justify-center w-8 h-full px-1.5 py-2 cursor-grab active:cursor-grabbing touch-none border-r transition-colors shrink-0 ${
              isLight
                ? "bg-amber-500/10 border-amber-700/20 hover:bg-amber-500/20"
                : "bg-amber-500/10 border-amber-500/25 hover:bg-amber-500/20"
            }`}
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
            title="Arrastar"
          >
            <svg width="10" height="16" viewBox="0 0 10 16" fill="none" className={isLight ? "text-amber-700/70" : "text-amber-400/70"}>
              <circle cx="2" cy="2" r="1.5" fill="currentColor"/>
              <circle cx="8" cy="2" r="1.5" fill="currentColor"/>
              <circle cx="2" cy="8" r="1.5" fill="currentColor"/>
              <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
              <circle cx="2" cy="14" r="1.5" fill="currentColor"/>
              <circle cx="8" cy="14" r="1.5" fill="currentColor"/>
            </svg>
          </div>

          {/* CONTEÚDO DA PÍLULA */}
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span className={`font-serif-math font-semibold ${isLight ? "text-amber-800" : "text-[#d9b452]"}`}>
              Q. {currentIndex + 1}
            </span>
            {question.banca && (
              <span className={`font-mono text-[11px] ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
                • {question.banca} {question.ano ? `(${question.ano})` : ""}
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className={`p-1 rounded-lg transition cursor-pointer ${isLight ? "text-slate-500 hover:text-amber-800" : "text-zinc-400 hover:text-amber-400"}`}
              title="Expandir"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* ── PAINEL EXPANDIDO ── */
        <div
          className={`w-[92vw] sm:w-[480px] md:w-[520px] max-w-[94vw] min-h-0 rounded-2xl border flex flex-col overflow-hidden backdrop-blur-xl transition-shadow ${
            isLight
              ? isTranslucent
                ? "bg-white/85 text-slate-900 border-amber-700/25 shadow-[0_12px_36px_rgba(15,23,42,0.16)]"
                : "bg-white text-slate-900 border-slate-300 shadow-[0_12px_36px_rgba(15,23,42,0.16)]"
              : isTranslucent
                ? "bg-[#110f1e]/75 text-[#f5f0df] border-amber-500/20 shadow-[0_20px_60px_rgba(0,0,0,0.85)]"
                : "bg-[#110f1e]/98 text-[#f5f0df] border-amber-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.85)]"
          }`}
        >
          {/* BARRA SUPERIOR — alça de drag separada do conteúdo */}
          <div
            className={`flex items-center gap-0 border-b select-none ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-[#17142b]/95 border-amber-500/20"
            }`}
          >
            {/* ALÇA DE DRAG — quadradinho com grip à esquerda */}
            <div
              className={`flex items-center justify-center w-9 self-stretch px-2 cursor-grab active:cursor-grabbing touch-none border-r transition-colors shrink-0 ${
                isLight
                  ? "bg-amber-500/10 border-amber-700/20 hover:bg-amber-500/20"
                  : "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20"
              }`}
              onPointerDown={onDragStart}
              onPointerMove={onDragMove}
              onPointerUp={onDragEnd}
              onPointerCancel={onDragEnd}
              title="Arrastar"
            >
              <svg width="10" height="16" viewBox="0 0 10 16" fill="none" className={isLight ? "text-amber-700/70" : "text-amber-400/60"}>
                <circle cx="2" cy="2" r="1.5" fill="currentColor"/>
                <circle cx="8" cy="2" r="1.5" fill="currentColor"/>
                <circle cx="2" cy="8" r="1.5" fill="currentColor"/>
                <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
                <circle cx="2" cy="14" r="1.5" fill="currentColor"/>
                <circle cx="8" cy="14" r="1.5" fill="currentColor"/>
              </svg>
            </div>

            {/* CONTEÚDO DO HEADER */}
            <div className="flex flex-1 items-center justify-between gap-2 px-3 py-2.5 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`px-2 py-0.5 rounded-md border font-serif-math font-bold text-xs shrink-0 ${
                  isLight
                    ? "bg-amber-100 border-amber-300 text-amber-900"
                    : "bg-amber-500/15 border-amber-500/30 text-[#d9b452]"
                }`}>
                  Q. {currentIndex + 1} / {totalQuestions}
                </span>
                {/* Navegação ◀ ▶ */}
                <button
                  type="button"
                  onClick={onPrev}
                  disabled={!onPrev || currentIndex === 0}
                  className={`p-1 rounded-lg disabled:opacity-25 disabled:cursor-not-allowed transition cursor-pointer shrink-0 ${isLight ? "text-slate-500 hover:text-slate-900 hover:bg-slate-200" : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"}`}
                  title="Questão anterior (←)"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  disabled={!onNext || currentIndex >= totalQuestions - 1}
                  className={`p-1 rounded-lg disabled:opacity-25 disabled:cursor-not-allowed transition cursor-pointer shrink-0 ${isLight ? "text-slate-500 hover:text-slate-900 hover:bg-slate-200" : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"}`}
                  title="Próxima questão (→)"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <div className={`truncate text-xs font-mono ${isLight ? "text-slate-600" : "text-zinc-300"}`}>
                  {question.banca && (
                    <span className={`font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>{question.banca} </span>
                  )}
                  {question.ano && (
                    <span className={isLight ? "text-slate-500" : "text-zinc-400"}>({question.ano})</span>
                  )}
                </div>
              </div>

              {/* CONTROLES DO HUD */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsTranslucent(!isTranslucent)}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${isLight ? "text-slate-500 hover:text-slate-900 hover:bg-slate-200" : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"}`}
                  title={isTranslucent ? "Opacidade 100%" : "Modo Translúcido"}
                >
                  {isTranslucent ? (
                    <Eye className={`w-3.5 h-3.5 ${isLight ? "text-amber-700" : "text-amber-400"}`} />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${isLight ? "text-slate-500 hover:text-slate-900 hover:bg-slate-200" : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"}`}
                  title="Minimizar"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* CORPO DA QUESTÃO COM SCROLL INTERNO */}
          <div className={`p-4 max-h-[52vh] sm:max-h-[58vh] overflow-y-auto space-y-3.5 text-xs leading-relaxed font-sans ${isLight ? "text-slate-900" : "text-zinc-200"}`}>
            {/* Enunciado */}
            <div className="space-y-2 select-text">
              <QuestionMath text={corpo} />
            </div>

            {/* Figura de Apoio */}
            {figuraUrl && (
              <div className={`my-2 p-2 rounded-xl border flex items-center justify-center ${isLight ? "bg-slate-100 border-slate-200" : "bg-black/40 border-white/10"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={figuraUrl}
                  alt="Figura de Apoio da Questão"
                  className="max-h-48 max-w-full object-contain rounded-lg shadow-md"
                />
              </div>
            )}

            {/* Alternativas Clicáveis (se objetiva) */}
            {hasAlternativas && (
              <div className={`space-y-1.5 pt-2 border-t ${isLight ? "border-slate-200" : "border-white/10"}`}>
                <span className={`text-[10px] font-mono uppercase tracking-wider block ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
                  Alternativas (Clique para marcar):
                </span>
                <div className="space-y-1.5">
                  {Object.entries(alternativas).map(([letra, textoAlt]) => {
                    const isSelected = selectedAnswer === letra;
                    return (
                      <button
                        key={letra}
                        type="button"
                        onClick={() => onSelectAnswer && onSelectAnswer(letra)}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                          isSelected
                            ? isLight
                              ? "bg-amber-100 border-amber-700 text-slate-900 shadow-xs font-semibold"
                              : "bg-amber-500/20 border-amber-500 text-[#f5f0df] shadow-xs font-semibold"
                            : isLight
                              ? "bg-white border-slate-300 hover:border-slate-500 text-slate-800"
                              : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-300"
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSelected
                              ? isLight
                                ? "bg-amber-200 text-amber-950 shadow-xs"
                                : "bg-amber-400 text-black shadow-xs"
                              : isLight
                                ? "bg-slate-100 text-slate-600"
                                : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {isSelected ? (
                            <Check className="w-3 h-3 stroke-[3]" />
                          ) : (
                            letra
                          )}
                        </span>
                        <div className="flex-1 text-xs pt-0.5">
                          <QuestionMath text={textoAlt} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CARD DE VEREDITO / FEEDBACK SOCRÁTICO DA IA */}
            {evaluationResult?.ocr_review_required && onConfirmOcr && <OcrReview key={`${question.id}:${evaluationResult.transcricao_latex}`} transcription={evaluationResult.transcricao_latex || ""} pending={isEvaluating} onConfirm={onConfirmOcr} />}
            {evaluationResult?.precisa_revisao_humana && !evaluationResult.ocr_review_required && <p className="rounded-xl border border-amber-400 p-3 text-sm">Avaliação pendente de revisão. Seu rascunho foi preservado.</p>}
            {evaluationResult && !evaluationResult.precisa_revisao_humana && (
              <div
                className={`p-3 rounded-xl border space-y-2 animate-fadeIn ${
                  evaluationResult.veredito === "aprovado"
                    ? isLight ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
                    : evaluationResult.veredito === "parcial"
                    ? isLight ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-amber-950/40 border-amber-500/40 text-amber-200"
                    : evaluationResult.veredito === "sem_desenvolvimento"
                    ? isLight ? "bg-sky-50 border-sky-200 text-sky-900" : "bg-sky-950/40 border-sky-500/40 text-sky-200"
                    : isLight ? "bg-rose-50 border-rose-200 text-rose-900" : "bg-rose-950/40 border-rose-500/40 text-rose-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  {evaluationResult.veredito === "aprovado" && (
                    <CheckCircle2 className={`w-4 h-4 shrink-0 ${isLight ? "text-emerald-700" : "text-emerald-400"}`} />
                  )}
                  {evaluationResult.veredito === "parcial" && (
                    <AlertCircle className={`w-4 h-4 shrink-0 ${isLight ? "text-amber-700" : "text-amber-400"}`} />
                  )}
                  {evaluationResult.veredito === "sem_desenvolvimento" && (
                    <HelpCircle className={`w-4 h-4 shrink-0 ${isLight ? "text-sky-700" : "text-sky-400"}`} />
                  )}
                  {evaluationResult.veredito === "incorreto" && (
                    <XCircle className={`w-4 h-4 shrink-0 ${isLight ? "text-rose-700" : "text-rose-400"}`} />
                  )}
                  <span className="font-bold uppercase tracking-wider text-xs">
                    Veredito: {evaluationResult.veredito.replace("_", " ")}
                  </span>
                </div>

                {(evaluationResult.feedback_latex ||
                  evaluationResult.diagnostico) && (
                  <div className={`text-xs leading-relaxed pl-6 border-l-2 ${isLight ? "text-slate-800 border-slate-300" : "text-zinc-200 border-white/20"}`}>
                    <QuestionMath
                      text={
                        evaluationResult.feedback_latex ||
                        evaluationResult.diagnostico ||
                        ""
                      }
                    />
                  </div>
                )}

                {evaluationResult.dica_proximo_passo && (
                  <div className={`text-[11px] pl-6 italic ${isLight ? "text-amber-800" : "text-amber-300/90"}`}>
                    💡 Dica: {evaluationResult.dica_proximo_passo}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RODAPÉ: AVALIAR COM MATHAI ENGINE */}
          {onEvaluate && (
            <div className={`p-3 border-t flex items-center justify-between gap-2 ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#17142b]/95 border-amber-500/20"}`}>
              <span className={`text-[10px] font-mono ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
                Validação instantânea via MathAI
              </span>
              <button
                type="button"
                onClick={onEvaluate}
                disabled={isEvaluating}
                className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-40 cursor-pointer shadow-xs shrink-0"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Avaliando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 fill-black" />
                    <span>Avaliar com MathAI</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
