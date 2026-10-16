// components/lousa/SpenSmartCanvas.tsx
"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Undo2, Redo2, Trash2 } from "lucide-react";

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
}

const COLORS = [
  { name: "Amarelo Ouro", hex: "#EAB308" },
  { name: "Branco Giz", hex: "#F8FAFC" },
  { name: "Azul Ciano", hex: "#38BDF8" },
  { name: "Rosa Coral", hex: "#F43F5E" },
  { name: "Verde Esmeralda", hex: "#10B981" },
];

const WIDTHS = [2, 4, 8, 14];

export const SpenSmartCanvas: React.FC<SpenSmartCanvasProps> = ({
  onEvaluateOcr,
  isEvaluating = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Camada 1: Traços já finalizados (estática durante a escrita)
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // Camada 2: Apenas o traço atual em movimento (incremental O(1))
  const inkCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // Histórico mantido em Refs para ZERO re-renders do React durante a escrita
  const strokesRef = useRef<Stroke[]>([]);
  const redoStackRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const activePointerIdRef = useRef<number | null>(null);
  const dprRef = useRef<number>(1);

  // Estados leves apenas para a barra de ferramentas
  const [activeTool, setActiveTool] = useState<ToolType>("pen");
  const [activeColor, setActiveColor] = useState<string>(COLORS[0].hex);
  const [activeWidth, setActiveWidth] = useState<number>(2);
  const [stylusMode, setStylusMode] = useState<boolean>(false);
  const [strokeCount, setStrokeCount] = useState<number>(0);

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

  // Desenha um traço completo (usado APENAS ao finalizar o traço ou no Undo/Redo)
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
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = dprRef.current;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    for (const stroke of strokesRef.current) {
      drawFullStroke(ctx, stroke);
    }
  }, [drawFullStroke]);

  // Inicializa o tamanho do Canvas APENAS quando o container muda de tamanho físico
  useEffect(() => {
    const container = containerRef.current;
    const baseCanvas = baseCanvasRef.current;
    const inkCanvas = inkCanvasRef.current;
    if (!container || !baseCanvas || !inkCanvas) return;

    const setupDimensions = () => {
      const rect = container.getBoundingClientRect();
      // Limita DPR em 2.0 no máximo para não sobrecarregar a GPU de tablets 3x/4x
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      dprRef.current = dpr;
      [baseCanvas, inkCanvas].forEach((c) => {
        c.width = rect.width * dpr;
        c.height = rect.height * dpr;
      });
      const baseCtx = baseCanvas.getContext("2d");
      if (baseCtx) baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Contexto com desynchronized: true reduz drasticamente o input lag no tablet
      const inkCtx =
        inkCanvas.getContext("2d", { desynchronized: true }) ||
        inkCanvas.getContext("2d");
      if (inkCtx) inkCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      redrawBaseCanvas();
    };

    setupDimensions();
    const observer = new ResizeObserver(setupDimensions);
    observer.observe(container);
    return () => observer.disconnect();
  }, [redrawBaseCanvas]);

  // DESENHO INCREMENTAL O(1): Desenha SOMENTE os últimos 3 pontos adicionados!
  const drawIncrementalSegment = (stroke: Stroke) => {
    const inkCanvas = inkCanvasRef.current;
    if (!inkCanvas) return;
    const ctx =
      inkCanvas.getContext("2d", { desynchronized: true }) ||
      inkCanvas.getContext("2d");
    if (!ctx) return;
    const pts = stroke.points;
    const len = pts.length;
    if (len === 0) return;

    // Para o marcador (transparente), limpamos apenas a camada ink para não somar opacidade
    if (stroke.tool === "highlighter") {
      const dpr = dprRef.current;
      ctx.clearRect(0, 0, inkCanvas.width / dpr, inkCanvas.height / dpr);
      drawFullStroke(ctx, stroke);
      return;
    }

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;

    if (len === 1) {
      const p0 = pts[0];
      const w = stroke.baseWidth * (p0.pressure || 0.7);
      ctx.beginPath();
      ctx.arc(p0.x, p0.y, Math.max(1, w * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    if (len === 2) {
      const p0 = pts[0];
      const p1 = pts[1];
      ctx.beginPath();
      ctx.lineWidth = stroke.baseWidth * (p1.pressure || 0.7);
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo((p0.x + p1.x) * 0.5, (p0.y + p1.y) * 0.5);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Pega exclusivamente os últimos 3 pontos (Custo O(1) = microssegundos!)
    const p0 = pts[len - 3];
    const p1 = pts[len - 2];
    const p2 = pts[len - 1];
    const mid1X = (p0.x + p1.x) * 0.5;
    const mid1Y = (p0.y + p1.y) * 0.5;
    const mid2X = (p1.x + p2.x) * 0.5;
    const mid2Y = (p1.y + p2.y) * 0.5;
    const pressureFactor = Math.max(0.5, Math.min(1.4, p1.pressure * 1.3));

    ctx.beginPath();
    ctx.lineWidth = stroke.baseWidth * pressureFactor;
    ctx.moveTo(mid1X, mid1Y);
    ctx.quadraticCurveTo(p1.x, p1.y, mid2X, mid2Y);
    ctx.stroke();
    ctx.restore();
  };

  // Borracha de Traço Otimizada (Checa Bounding Box antes de calcular distância)
  const eraseStrokeAtPoint = useCallback(
    (x: number, y: number, radius = 14) => {
      const beforeCount = strokesRef.current.length;
      if (beforeCount === 0) return;
      const rSq = radius * radius;
      strokesRef.current = strokesRef.current.filter((stroke) => {
        for (let i = 0; i < stroke.points.length; i++) {
          const pt = stroke.points[i];
          const dx = pt.x - x;
          const dy = pt.y - y;
          if (dx * dx + dy * dy <= rSq) {
            return false; // Apaga o traço inteiro
          }
        }
        return true;
      });
      if (strokesRef.current.length !== beforeCount) {
        redrawBaseCanvas();
        setStrokeCount(strokesRef.current.length);
      }
    },
    [redrawBaseCanvas]
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
      if (e.pointerType === "pen" && !stylusModeRef.current) {
        stylusModeRef.current = true;
        setStylusMode(true);
      }
      // Bloqueia palma da mão imediatamente
      if (e.pointerType === "touch" && stylusModeRef.current) {
        e.preventDefault();
        return;
      }
      if (activePointerIdRef.current !== null) return;
      e.preventDefault();
      activePointerIdRef.current = e.pointerId;
      inkCanvas.setPointerCapture(e.pointerId);

      // Faz cache do BoundingClientRect apenas no pointerdown (evita Layout Thrashing no move!)
      cachedRect = inkCanvas.getBoundingClientRect();
      const pt = getPoint(e, cachedRect);
      const isSpenEraser = e.button === 5 || (e.buttons & 32) !== 0;
      const effectiveTool: ToolType = isSpenEraser ? "stroke-eraser" : toolRef.current;
      isDrawingRef.current = true;

      if (effectiveTool === "stroke-eraser") {
        eraseStrokeAtPoint(pt.x, pt.y);
        return;
      }

      const newStroke: Stroke = {
        id: Math.random().toString(36).slice(2),
        tool: effectiveTool,
        color: colorRef.current,
        baseWidth:
          effectiveTool === "highlighter"
            ? Math.max(14, widthRef.current * 3)
            : widthRef.current,
        points: [pt],
      };
      currentStrokeRef.current = newStroke;
      drawIncrementalSegment(newStroke);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDrawingRef.current || e.pointerId !== activePointerIdRef.current) return;
      if (e.pointerType === "touch" && stylusModeRef.current) return;
      e.preventDefault();
      const rect = cachedRect || inkCanvas.getBoundingClientRect();
      const isSpenEraser = (e.buttons & 32) !== 0;
      const effectiveTool: ToolType = isSpenEraser ? "stroke-eraser" : toolRef.current;
      const coalesced = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];

      if (effectiveTool === "stroke-eraser") {
        const lastEv = coalesced[coalesced.length - 1];
        const pt = getPoint(lastEv, rect);
        eraseStrokeAtPoint(pt.x, pt.y);
        return;
      }

      const stroke = currentStrokeRef.current;
      if (!stroke) return;

      for (let i = 0; i < coalesced.length; i++) {
        const pt = getPoint(coalesced[i], rect);
        const pts = stroke.points;
        const lastPt = pts[pts.length - 1];
        // Distância mínima ao quadrado >= 2.25px (1.5px) para cortar eventos redundantes
        const dx = pt.x - lastPt.x;
        const dy = pt.y - lastPt.y;
        if (dx * dx + dy * dy >= 2.25) {
          pts.push(pt);
          drawIncrementalSegment(stroke);
        }
      }
    };

    const onPointerUpOrCancel = (e: PointerEvent) => {
      if (e.pointerId !== activePointerIdRef.current) return;
      isDrawingRef.current = false;
      activePointerIdRef.current = null;
      cachedRect = null;
      const finishedStroke = currentStrokeRef.current;
      currentStrokeRef.current = null;

      if (finishedStroke && finishedStroke.points.length > 0) {
        // 1. Limpa a camada temporária de tinta rápida
        const dpr = dprRef.current;
        const inkCtx =
          inkCanvas.getContext("2d", { desynchronized: true }) ||
          inkCanvas.getContext("2d");
        if (inkCtx) {
          inkCtx.clearRect(0, 0, inkCanvas.width / dpr, inkCanvas.height / dpr);
        }

        // 2. Consolida o traço finalizado direto no baseCanvas (sem redesenhar os antigos!)
        const baseCtx = baseCanvas.getContext("2d");
        if (baseCtx) {
          drawFullStroke(baseCtx, finishedStroke);
        }
        strokesRef.current.push(finishedStroke);
        redoStackRef.current = [];
        setStrokeCount(strokesRef.current.length);
      }
    };

    inkCanvas.addEventListener("pointerdown", onPointerDown, { passive: false });
    inkCanvas.addEventListener("pointermove", onPointerMove, { passive: false });
    inkCanvas.addEventListener("pointerup", onPointerUpOrCancel, { passive: false });
    inkCanvas.addEventListener("pointercancel", onPointerUpOrCancel, { passive: false });

    return () => {
      inkCanvas.removeEventListener("pointerdown", onPointerDown);
      inkCanvas.removeEventListener("pointermove", onPointerMove);
      inkCanvas.removeEventListener("pointerup", onPointerUpOrCancel);
      inkCanvas.removeEventListener("pointercancel", onPointerUpOrCancel);
    };
  }, [drawFullStroke, eraseStrokeAtPoint]);

  const handleUndo = () => {
    if (strokesRef.current.length === 0) return;
    const popped = strokesRef.current.pop()!;
    redoStackRef.current.push(popped);
    redrawBaseCanvas();
    setStrokeCount(strokesRef.current.length);
  };

  const handleRedo = () => {
    if (redoStackRef.current.length === 0) return;
    const restored = redoStackRef.current.pop()!;
    strokesRef.current.push(restored);
    const baseCtx = baseCanvasRef.current?.getContext("2d");
    if (baseCtx) drawFullStroke(baseCtx, restored);
    setStrokeCount(strokesRef.current.length);
  };

  const handleClear = () => {
    strokesRef.current = [];
    redoStackRef.current = [];
    redrawBaseCanvas();
    setStrokeCount(0);
  };

  const handleExportAndEvaluate = async () => {
    const baseCanvas = baseCanvasRef.current;
    if (!baseCanvas) return;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = baseCanvas.width;
    exportCanvas.height = baseCanvas.height;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0B0914";
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.drawImage(baseCanvas, 0, 0);
    await onEvaluateOcr(exportCanvas.toDataURL("image/png"));
  };

  return (
    <div className="rounded-xl border border-amber-500/20 bg-[#0D0B18] p-4 shadow-xl">
      {/* Barra de Ferramentas */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTool("pen")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              activeTool === "pen"
                ? "bg-amber-400 text-black font-bold"
                : "bg-white/5 text-gray-300 hover:bg-white/10"
            }`}
          >
            Caneta
          </button>
          <button
            type="button"
            onClick={() => setActiveTool("highlighter")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              activeTool === "highlighter"
                ? "bg-amber-400 text-black font-bold"
                : "bg-white/5 text-gray-300 hover:bg-white/10"
            }`}
          >
            Marcador
          </button>
          <button
            type="button"
            onClick={() => setActiveTool("stroke-eraser")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              activeTool === "stroke-eraser"
                ? "bg-amber-400 text-black font-bold"
                : "bg-white/5 text-gray-300 hover:bg-white/10"
            }`}
          >
            Borracha
          </button>

          <div className="ml-2 flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1">
            {COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setActiveColor(c.hex)}
                className={`h-5 w-5 rounded-full transition-transform ${
                  activeColor === c.hex ? "scale-125 ring-2 ring-white" : "opacity-75"
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
                className={`rounded px-2 py-1 ${
                  activeWidth === w
                    ? "bg-amber-500/20 font-bold text-amber-300"
                    : "text-gray-400 hover:text-white"
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
            className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
              stylusMode
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-bold"
                : "border-white/10 bg-white/5 text-gray-400"
            }`}
          >
            {stylusMode ? "✏️ S-Pen: Rejeição de Palma ATIVA" : "👆 Toque + Caneta"}
          </button>

          <button
            type="button"
            onClick={handleUndo}
            disabled={strokeCount === 0}
            className="rounded p-1.5 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30 transition"
            title="Desfazer"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleRedo}
            className="rounded p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition"
            title="Refazer"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={strokeCount === 0}
            className="rounded p-1.5 text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 transition"
            title="Limpar Lousa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Container Dual-Canvas (Camada Base + Camada de Tinta Rápida) */}
      <div
        ref={containerRef}
        className="relative h-[420px] w-full overflow-hidden rounded-lg border border-white/10 bg-[#08070F] bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:20px_20px]"
      >
        <canvas
          ref={baseCanvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
        <canvas
          ref={inkCanvasRef}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            touchAction: "none",
            WebkitUserSelect: "none",
            userSelect: "none",
          }}
          className="absolute inset-0 h-full w-full cursor-crosshair [will-change:transform]"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
        <div className="text-xs text-gray-300">
          <strong className="text-amber-300">Avaliação do Rascunho da Lousa:</strong> Submete o
          desenvolvimento manuscrito para transcrição LaTeX e validação passo a passo.
        </div>
        <button
          type="button"
          disabled={isEvaluating || strokeCount === 0}
          onClick={handleExportAndEvaluate}
          className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-black transition hover:bg-amber-300 disabled:opacity-50 cursor-pointer"
        >
          {isEvaluating
            ? "Analisando Manuscrito..."
            : "⚡ Avaliar Rascunho da Lousa com MathAI Engine"}
        </button>
      </div>
    </div>
  );
};

export default SpenSmartCanvas;
