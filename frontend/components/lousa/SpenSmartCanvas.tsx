// components/lousa/SpenSmartCanvas.tsx
"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Undo2, Redo2, Trash2 } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export type ToolType = "pen" | "highlighter" | "stroke-eraser";

export interface Point {
  x: number;
  y: number;
  pressure: number;
}

export interface Stroke {
  id: string;
  tool: ToolType;
  color: string;
  baseWidth: number;
  points: Point[];
}

export interface SpenSmartCanvasProps {
  onEvaluateOcr: (imageBase64: string) => Promise<void>;
  isEvaluating?: boolean;
  initialStrokes?: Stroke[];
  onStrokesChange?: (strokes: Stroke[]) => void;
  canvasHeightClass?: string;
  hideFooterEvaluate?: boolean;
  exportCanvasRef?: React.MutableRefObject<(() => string | null) | null>;
}

const COLORS_DARK = [
  { name: "Amarelo Ouro", hex: "#EAB308" },
  { name: "Branco Giz", hex: "#F8FAFC" },
  { name: "Azul Ciano", hex: "#38BDF8" },
  { name: "Rosa Coral", hex: "#F43F5E" },
  { name: "Verde Esmeralda", hex: "#10B981" },
];

const COLORS_LIGHT = [
  { name: "Preto Carvão", hex: "#1A1A1A" },
  { name: "Azul Escuro", hex: "#1D4ED8" },
  { name: "Vermelho", hex: "#DC2626" },
  { name: "Verde", hex: "#16A34A" },
  { name: "Roxo", hex: "#7C3AED" },
];

const WIDTHS = [2, 4, 8, 14];

interface ActiveStrokeState {
  stroke: Stroke;
  lastMidX: number;
  lastMidY: number;
}

export const SpenSmartCanvas: React.FC<SpenSmartCanvasProps> = ({
  onEvaluateOcr,
  isEvaluating = false,
  initialStrokes,
  onStrokesChange,
  canvasHeightClass = "h-[420px]",
  hideFooterEvaluate = false,
  exportCanvasRef,
}) => {
  const { isLight } = useTheme();
  const COLORS = isLight ? COLORS_LIGHT : COLORS_DARK;

  const containerRef = useRef<HTMLDivElement | null>(null);
  // Camada 1: Traços consolidados (estática durante a escrita ativa)
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // Camada 2: Apenas o traço atual em movimento (incremental O(1) com curva Bézier)
  const inkCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Contextos 2D cacheados em Ref para evitar overhead de getContext() em 120Hz/240Hz
  const baseCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const inkCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Delegated Ink Trails API (Chromium / Android SurfaceFlinger bypass)
  const inkPresenterRef = useRef<any>(null);

  // Histórico mantido em Refs para ZERO re-renders do React durante a escrita
  const strokesRef = useRef<Stroke[]>(initialStrokes ? [...initialStrokes] : []);
  const redoStackRef = useRef<Stroke[]>([]);
  const isDrawingRef = useRef<boolean>(false);
  const activePointerIdRef = useRef<number | null>(null);
  const activeStrokeStateRef = useRef<ActiveStrokeState | null>(null);
  const dprRef = useRef<number>(1);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Estados leves apenas para a barra de ferramentas
  const [activeTool, setActiveTool] = useState<ToolType>("pen");
  const [activeColor, setActiveColor] = useState<string>(COLORS[0].hex);
  const [activeWidth, setActiveWidth] = useState<number>(2);
  const [stylusMode, setStylusMode] = useState<boolean>(false);
  const [strokeCount, setStrokeCount] = useState<number>(initialStrokes ? initialStrokes.length : 0);

  // Refs sincronizadas para leitura instantânea nos listeners nativos
  const toolRef = useRef<ToolType>(activeTool);
  const colorRef = useRef<string>(activeColor);
  const widthRef = useRef<number>(activeWidth);
  const stylusModeRef = useRef<boolean>(stylusMode);

  useEffect(() => {
    toolRef.current = activeTool;
  }, [activeTool]);
  useEffect(() => {
    colorRef.current = activeColor;
  }, [activeColor]);
  useEffect(() => {
    widthRef.current = activeWidth;
  }, [activeWidth]);
  useEffect(() => {
    stylusModeRef.current = stylusMode;
  }, [stylusMode]);

  // Inicializa a Ink API de traço delegado (hardware compositor) do navegador
  useEffect(() => {
    if (typeof window !== "undefined" && (navigator as any).ink?.requestPresenter) {
      const inkCanvas = inkCanvasRef.current;
      if (inkCanvas) {
        (navigator as any).ink
          .requestPresenter({ presentationArea: inkCanvas })
          .then((presenter: any) => {
            inkPresenterRef.current = presenter;
          })
          .catch(() => {});
      }
    }
  }, []);

  // Debounced sync de traços para a página pai (1s idle evita travar o React durante a escrita contínua)
  const scheduleSync = useCallback(
    (strokes: Stroke[]) => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        onStrokesChange?.(strokes);
      }, 1000);
    },
    [onStrokesChange]
  );

  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        onStrokesChange?.([...strokesRef.current]);
      }
    };
  }, [onStrokesChange]);

  // Desenha um traço completo (usado APENAS ao finalizar o traço, na troca de tema ou no Undo/Redo)
  const drawFullStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    const pts = stroke.points;
    if (pts.length === 0) return;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.globalAlpha = stroke.tool === "highlighter" ? 0.35 : 1.0;

    if (pts.length < 3) {
      ctx.beginPath();
      const r = (stroke.baseWidth * (pts[0].pressure || 0.7)) / 2;
      ctx.arc(pts[0].x, pts[0].y, Math.max(1, r), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.beginPath();
    ctx.lineWidth = stroke.baseWidth;
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const midX = (p1.x + p2.x) * 0.5;
      const midY = (p1.y + p2.y) * 0.5;
      ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
    ctx.restore();
  }, []);

  // Redesenha o canvas base (SÓ roda em Undo, Redo, Clear ou quando a borracha apaga algo)
  const redrawBaseCanvas = useCallback(() => {
    const canvas = baseCanvasRef.current;
    if (!canvas) return;
    const ctx = baseCtxRef.current || canvas.getContext("2d");
    if (!ctx) return;
    const dpr = dprRef.current;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    for (const stroke of strokesRef.current) {
      drawFullStroke(ctx, stroke);
    }
  }, [drawFullStroke]);

  // Quando o tema muda: reseta cor ativa, remapeia traços e redesenha
  useEffect(() => {
    const fromColors = isLight ? COLORS_DARK : COLORS_LIGHT;
    const toColors = isLight ? COLORS_LIGHT : COLORS_DARK;

    const colorMap = new Map<string, string>();
    fromColors.forEach((c, i) => {
      if (toColors[i]) colorMap.set(c.hex.toUpperCase(), toColors[i].hex);
    });

    strokesRef.current = strokesRef.current.map((stroke) => {
      const mapped = colorMap.get(stroke.color.toUpperCase());
      return mapped ? { ...stroke, color: mapped } : stroke;
    });

    setActiveColor(toColors[0].hex);
    colorRef.current = toColors[0].hex;

    setTimeout(() => {
      redrawBaseCanvas();
    }, 0);
  }, [isLight, redrawBaseCanvas]);

  // Inicializa o tamanho do Canvas apenas quando as dimensões físicas mudam
  useEffect(() => {
    const container = containerRef.current;
    const baseCanvas = baseCanvasRef.current;
    const inkCanvas = inkCanvasRef.current;
    if (!container || !baseCanvas || !inkCanvas) return;

    const setupDimensions = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      // Limita DPR em 2.0 no máximo para não sobrecarregar a GPU de tablets 3x/4x
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      dprRef.current = dpr;

      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);

      const widthChanged = Math.abs(baseCanvas.width - targetW) > 2;
      const heightChanged = Math.abs(baseCanvas.height - targetH) > 2;

      if (widthChanged || heightChanged) {
        baseCanvas.width = targetW;
        baseCanvas.height = targetH;
        inkCanvas.width = targetW;
        inkCanvas.height = targetH;

        const baseCtx = baseCanvas.getContext("2d");
        if (baseCtx) {
          baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
          baseCtx.lineCap = "round";
          baseCtx.lineJoin = "round";
          baseCtxRef.current = baseCtx;
        }

        // No Android / Samsung One UI, 'desynchronized: true' em canvas transparente sobre DOM
        // entra em conflito com o SurfaceFlinger e causa stutter/drop de frames severo no navegador.
        // Em desktop, usamos desynchronized; no Android mobile/tablet, usamos sincronização com VSync estável.
        const isMobileOrSamsung =
          typeof navigator !== "undefined" &&
          (/Android/i.test(navigator.userAgent) ||
            /SamsungBrowser/i.test(navigator.userAgent));

        const inkCtx =
          inkCanvas.getContext("2d", {
            desynchronized: !isMobileOrSamsung,
            alpha: true,
          }) || inkCanvas.getContext("2d");

        if (inkCtx) {
          inkCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
          inkCtx.lineCap = "round";
          inkCtx.lineJoin = "round";
          inkCtxRef.current = inkCtx;
        }

        redrawBaseCanvas();
      }
    };

    setupDimensions();
    const observer = new ResizeObserver(setupDimensions);
    observer.observe(container);
    return () => observer.disconnect();
  }, [redrawBaseCanvas]);

  // Borracha de Traço Otimizada
  const eraseStrokeAtPoint = useCallback(
    (x: number, y: number, radius = 16) => {
      const beforeCount = strokesRef.current.length;
      if (beforeCount === 0) return;
      const rSq = radius * radius;
      strokesRef.current = strokesRef.current.filter((stroke) => {
        for (let i = 0; i < stroke.points.length; i++) {
          const pt = stroke.points[i];
          const dx = pt.x - x;
          const dy = pt.y - y;
          if (dx * dx + dy * dy <= rSq) {
            return false;
          }
        }
        return true;
      });
      if (strokesRef.current.length !== beforeCount) {
        redrawBaseCanvas();
        setStrokeCount(strokesRef.current.length);
        scheduleSync([...strokesRef.current]);
      }
    },
    [redrawBaseCanvas, scheduleSync]
  );

  // Listeners Nativos de Baixa Latência anexados diretamente ao elemento DOM
  useEffect(() => {
    const inkCanvas = inkCanvasRef.current;
    const baseCanvas = baseCanvasRef.current;
    if (!inkCanvas || !baseCanvas) return;
    let cachedRect: DOMRect | null = null;

    const getPoint = (e: PointerEvent, rect: DOMRect): Point => ({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pointerType === "pen" ? e.pressure || 0.7 : 0.7,
    });

    const onPointerDown = (e: PointerEvent) => {
      // Rejeição estrita de palma: se a caneta já estiver ativa na tela, ignora toque simultâneo
      if (e.pointerType === "touch" && isDrawingRef.current) {
        e.preventDefault();
        return;
      }
      // Se o usuário travou o modo stylus exclusivo pelo botão da UI, bloqueia toque
      if (e.pointerType === "touch" && stylusModeRef.current) {
        e.preventDefault();
        return;
      }
      if (activePointerIdRef.current !== null) return;
      e.preventDefault();

      activePointerIdRef.current = e.pointerId;
      try {
        inkCanvas.setPointerCapture(e.pointerId);
      } catch {}

      cachedRect = inkCanvas.getBoundingClientRect();
      const pt = getPoint(e, cachedRect);
      const isSpenEraser = e.button === 5 || (e.buttons & 32) !== 0;
      const effectiveTool: ToolType = isSpenEraser ? "stroke-eraser" : toolRef.current;
      isDrawingRef.current = true;

      if (effectiveTool === "stroke-eraser") {
        eraseStrokeAtPoint(pt.x, pt.y);
        return;
      }

      const inkCtx = inkCtxRef.current;
      const pressure = pt.pressure || 0.7;
      const baseWidth =
        effectiveTool === "highlighter"
          ? Math.max(14, widthRef.current * 3)
          : widthRef.current;
      const pressureFactor = Math.max(0.6, Math.min(1.4, pressure * 1.2));

      if (inkCtx) {
        inkCtx.strokeStyle = colorRef.current;
        inkCtx.fillStyle = colorRef.current;
        inkCtx.globalAlpha = effectiveTool === "highlighter" ? 0.35 : 1.0;
        inkCtx.lineWidth = baseWidth * pressureFactor;
        inkCtx.beginPath();
        inkCtx.arc(pt.x, pt.y, Math.max(0.75, (baseWidth * pressureFactor) * 0.5), 0, Math.PI * 2);
        inkCtx.fill();
      }

      const newStroke: Stroke = {
        id: Math.random().toString(36).slice(2),
        tool: effectiveTool,
        color: colorRef.current,
        baseWidth,
        points: [pt],
      };

      activeStrokeStateRef.current = {
        stroke: newStroke,
        lastMidX: pt.x,
        lastMidY: pt.y,
      };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDrawingRef.current || e.pointerId !== activePointerIdRef.current) return;
      if (e.pointerType === "touch" && stylusModeRef.current) return;
      e.preventDefault();

      const rect = cachedRect || inkCanvas.getBoundingClientRect();
      const isSpenEraser = (e.buttons & 32) !== 0;
      const effectiveTool: ToolType = isSpenEraser ? "stroke-eraser" : toolRef.current;

      const coalesced =
        e.getCoalescedEvents && e.getCoalescedEvents().length > 0
          ? e.getCoalescedEvents()
          : [e];

      if (effectiveTool === "stroke-eraser") {
        const lastEv = coalesced[coalesced.length - 1];
        const pt = getPoint(lastEv, rect);
        eraseStrokeAtPoint(pt.x, pt.y);
        return;
      }

      const state = activeStrokeStateRef.current;
      if (!state) return;
      const stroke = state.stroke;
      const pts = stroke.points;
      const inkCtx = inkCtxRef.current;

      for (let i = 0; i < coalesced.length; i++) {
        const pt = getPoint(coalesced[i], rect);
        const lastPt = pts[pts.length - 1];
        const dx = pt.x - lastPt.x;
        const dy = pt.y - lastPt.y;

        // Limiar sutil (0.5px) para capturar curvas precisas sem ruído
        if (dx * dx + dy * dy >= 0.25) {
          pts.push(pt);

          if (stroke.tool === "highlighter") {
            const inkCanvas = inkCanvasRef.current;
            if (inkCanvas && inkCtx) {
              const dpr = dprRef.current;
              inkCtx.clearRect(0, 0, inkCanvas.width / dpr, inkCanvas.height / dpr);
              drawFullStroke(inkCtx, stroke);
            }
          } else if (inkCtx) {
            const pressure = pt.pressure || 0.7;
            const pressureFactor = Math.max(0.6, Math.min(1.4, pressure * 1.2));
            inkCtx.lineWidth = stroke.baseWidth * pressureFactor;

            if (pts.length === 2) {
              const midX = (lastPt.x + pt.x) * 0.5;
              const midY = (lastPt.y + pt.y) * 0.5;
              inkCtx.beginPath();
              inkCtx.moveTo(lastPt.x, lastPt.y);
              inkCtx.lineTo(midX, midY);
              inkCtx.stroke();
              state.lastMidX = midX;
              state.lastMidY = midY;
            } else {
              const midX = (lastPt.x + pt.x) * 0.5;
              const midY = (lastPt.y + pt.y) * 0.5;
              inkCtx.beginPath();
              inkCtx.moveTo(state.lastMidX, state.lastMidY);
              inkCtx.quadraticCurveTo(lastPt.x, lastPt.y, midX, midY);
              inkCtx.stroke();
              state.lastMidX = midX;
              state.lastMidY = midY;
            }
          }
        }
      }

      // Delegated Ink Trail para o compositor nativo do Android / Windows
      if (inkPresenterRef.current) {
        try {
          const lastPoint = pts[pts.length - 1];
          inkPresenterRef.current.updateInkTrailStartPoint(e, {
            color: stroke.color,
            diameter: Math.max(2, stroke.baseWidth * (lastPoint.pressure || 0.7)),
          });
        } catch {}
      }
    };

    const onPointerUpOrCancel = (e: PointerEvent) => {
      if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;
      const state = activeStrokeStateRef.current;
      activeStrokeStateRef.current = null;
      isDrawingRef.current = false;
      activePointerIdRef.current = null;
      cachedRect = null;

      try {
        if (inkCanvas.hasPointerCapture(e.pointerId)) {
          inkCanvas.releasePointerCapture(e.pointerId);
        }
      } catch {}

      if (state && state.stroke.points.length > 0) {
        const finishedStroke = state.stroke;
        const pts = finishedStroke.points;
        const inkCtx = inkCtxRef.current;
        const baseCtx = baseCtxRef.current || baseCanvas.getContext("2d");

        // Conecta o último segmento até a ponta final
        if (inkCtx && pts.length >= 2 && finishedStroke.tool !== "highlighter") {
          const lastPt = pts[pts.length - 1];
          inkCtx.beginPath();
          inkCtx.lineWidth = finishedStroke.baseWidth * (lastPt.pressure || 0.7);
          inkCtx.moveTo(state.lastMidX, state.lastMidY);
          inkCtx.lineTo(lastPt.x, lastPt.y);
          inkCtx.stroke();
        }

        // Consolida no canvas base permanente e limpa o buffer volátil
        const dpr = dprRef.current;
        if (inkCtx) {
          inkCtx.clearRect(0, 0, inkCanvas.width / dpr, inkCanvas.height / dpr);
        }
        if (baseCtx) {
          drawFullStroke(baseCtx, finishedStroke);
        }

        strokesRef.current.push(finishedStroke);
        redoStackRef.current = [];
        setStrokeCount(strokesRef.current.length);
        scheduleSync([...strokesRef.current]);
      }
    };

    inkCanvas.addEventListener("pointerdown", onPointerDown, { passive: false });
    inkCanvas.addEventListener("pointermove", onPointerMove, { passive: false });
    inkCanvas.addEventListener("pointerup", onPointerUpOrCancel, { passive: false });
    inkCanvas.addEventListener("pointercancel", onPointerUpOrCancel, { passive: false });
    inkCanvas.addEventListener("lostpointercapture", onPointerUpOrCancel, { passive: false });

    // Proteção de segurança caso o ponteiro saia da tela
    const onWindowPointerUp = (e: PointerEvent) => {
      if (isDrawingRef.current && activePointerIdRef.current === e.pointerId) {
        onPointerUpOrCancel(e);
      }
    };
    window.addEventListener("pointerup", onWindowPointerUp);
    window.addEventListener("pointercancel", onWindowPointerUp);

    return () => {
      inkCanvas.removeEventListener("pointerdown", onPointerDown);
      inkCanvas.removeEventListener("pointermove", onPointerMove);
      inkCanvas.removeEventListener("pointerup", onPointerUpOrCancel);
      inkCanvas.removeEventListener("pointercancel", onPointerUpOrCancel);
      inkCanvas.removeEventListener("lostpointercapture", onPointerUpOrCancel);
      window.removeEventListener("pointerup", onWindowPointerUp);
      window.removeEventListener("pointercancel", onWindowPointerUp);
    };
  }, [drawFullStroke, eraseStrokeAtPoint, scheduleSync]);

  const handleUndo = () => {
    if (strokesRef.current.length === 0) return;
    const popped = strokesRef.current.pop()!;
    redoStackRef.current.push(popped);
    redrawBaseCanvas();
    setStrokeCount(strokesRef.current.length);
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    onStrokesChange?.([...strokesRef.current]);
  };

  const handleRedo = () => {
    if (redoStackRef.current.length === 0) return;
    const restored = redoStackRef.current.pop()!;
    strokesRef.current.push(restored);
    const baseCtx = baseCtxRef.current || baseCanvasRef.current?.getContext("2d");
    if (baseCtx) drawFullStroke(baseCtx, restored);
    setStrokeCount(strokesRef.current.length);
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    onStrokesChange?.([...strokesRef.current]);
  };

  const handleClear = () => {
    strokesRef.current = [];
    redoStackRef.current = [];
    redrawBaseCanvas();
    setStrokeCount(0);
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    onStrokesChange?.([]);
  };

  const getCanvasBase64 = useCallback((): string | null => {
    const baseCanvas = baseCanvasRef.current;
    if (!baseCanvas) return null;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = baseCanvas.width;
    exportCanvas.height = baseCanvas.height;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = isLight ? "#FFFFFF" : "#0B0914";
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.drawImage(baseCanvas, 0, 0);
    return exportCanvas.toDataURL("image/png");
  }, [isLight]);

  useEffect(() => {
    if (exportCanvasRef) {
      exportCanvasRef.current = getCanvasBase64;
    }
  }, [exportCanvasRef, getCanvasBase64]);

  const handleExportAndEvaluate = async () => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      onStrokesChange?.([...strokesRef.current]);
    }
    const b64 = getCanvasBase64();
    if (b64) {
      await onEvaluateOcr(b64);
    }
  };

  return (
    <div
      className={`rounded-xl border p-4 shadow-xl flex flex-col h-full min-h-0 transition-colors ${
        isLight
          ? "border-slate-300 bg-white"
          : "border-amber-500/20 bg-[#0D0B18]"
      }`}
    >
      {/* Barra de Ferramentas */}
      <div
        className={`mb-3 flex flex-wrap items-center justify-between gap-3 border-b pb-3 select-none ${
          isLight ? "border-slate-200" : "border-white/10"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTool("pen")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition cursor-pointer ${
              activeTool === "pen"
                ? "bg-amber-400 text-black font-bold"
                : isLight
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                : "bg-white/5 text-gray-300 hover:bg-white/10"
            }`}
          >
            Caneta
          </button>
          <button
            type="button"
            onClick={() => setActiveTool("highlighter")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition cursor-pointer ${
              activeTool === "highlighter"
                ? "bg-amber-400 text-black font-bold"
                : isLight
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                : "bg-white/5 text-gray-300 hover:bg-white/10"
            }`}
          >
            Marcador
          </button>
          <button
            type="button"
            onClick={() => setActiveTool("stroke-eraser")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition cursor-pointer ${
              activeTool === "stroke-eraser"
                ? "bg-amber-400 text-black font-bold"
                : isLight
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                : "bg-white/5 text-gray-300 hover:bg-white/10"
            }`}
          >
            Borracha
          </button>

          <div
            className={`ml-2 flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
              isLight ? "bg-slate-100" : "bg-white/5"
            }`}
          >
            {COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setActiveColor(c.hex)}
                className={`h-5 w-5 rounded-full transition-transform cursor-pointer ${
                  activeColor === c.hex
                    ? `scale-125 ${isLight ? "ring-2 ring-slate-400" : "ring-2 ring-white"}`
                    : "opacity-75 hover:opacity-100"
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
          </div>

          <div className="ml-2 flex items-center gap-1 text-xs">
            {WIDTHS.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setActiveWidth(w)}
                className={`rounded px-2 py-1 cursor-pointer transition ${
                  activeWidth === w
                    ? "bg-amber-500/20 font-bold text-amber-600 dark:text-amber-300"
                    : isLight
                    ? "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {w}px
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStylusMode((prev) => !prev)}
            className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
              stylusMode
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold"
                : isLight
                ? "border-slate-300 bg-slate-100 text-slate-500 hover:text-slate-900"
                : "border-white/10 bg-white/5 text-gray-400 hover:text-white"
            }`}
          >
            {stylusMode ? "✏️ S-Pen: Rejeição de Palma ATIVA" : "👆 Toque + Caneta"}
          </button>

          <button
            type="button"
            onClick={handleUndo}
            disabled={strokeCount === 0}
            className={`rounded p-1.5 disabled:opacity-30 transition cursor-pointer ${
              isLight
                ? "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                : "text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
            title="Desfazer"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleRedo}
            className={`rounded p-1.5 transition cursor-pointer ${
              isLight
                ? "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                : "text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
            title="Refazer"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={strokeCount === 0}
            className="rounded p-1.5 text-rose-500 hover:bg-rose-500/10 disabled:opacity-30 transition cursor-pointer"
            title="Limpar Lousa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Container Dual-Canvas com touch-action: none estrito e isolamento de camada GPU */}
      <div
        ref={containerRef}
        style={{
          touchAction: "none",
          contain: "paint layout",
          isolation: "isolate",
        }}
        className={`relative w-full overflow-hidden rounded-lg border transition-colors select-none ${
          isLight
            ? "border-slate-200 bg-white bg-[radial-gradient(#00000018_1px,transparent_1px)] [background-size:20px_20px]"
            : "border-white/10 bg-[#08070F] bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:20px_20px]"
        } ${canvasHeightClass}`}
      >
        <canvas
          ref={baseCanvasRef}
          style={{
            touchAction: "none",
            willChange: "transform",
            transform: "translateZ(0)",
          }}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
        <canvas
          ref={inkCanvasRef}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            touchAction: "none",
            willChange: "transform",
            transform: "translateZ(0)",
            WebkitUserSelect: "none",
            userSelect: "none",
          }}
          className="absolute inset-0 h-full w-full cursor-crosshair"
        />
      </div>

      {!hideFooterEvaluate && (
        <div
          className={`mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${
            isLight
              ? "border-amber-500/30 bg-amber-50 text-slate-700"
              : "border-amber-500/20 bg-amber-500/5 text-gray-300"
          }`}
        >
          <div className="text-xs">
            <strong className={isLight ? "text-amber-700" : "text-amber-300"}>
              Avaliação do Rascunho da Lousa:
            </strong>{" "}
            Submete o desenvolvimento manuscrito para transcrição LaTeX e validação passo a passo.
          </div>
          <button
            type="button"
            disabled={isEvaluating || strokeCount === 0}
            onClick={handleExportAndEvaluate}
            className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-black transition hover:bg-amber-300 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {isEvaluating
              ? "Analisando Manuscrito..."
              : "⚡ Avaliar Rascunho da Lousa com MathAI Engine"}
          </button>
        </div>
      )}
    </div>
  );
};

export default SpenSmartCanvas;
