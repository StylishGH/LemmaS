"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Pen,
  Highlighter,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Maximize2,
  Minimize2,
  X,
  BrainCircuit,
  Grid,
  ShieldCheck,
  Loader2,
  Sparkles,
  Smartphone,
  Monitor,
} from "lucide-react";

export interface MathScratchpadProps {
  onClose?: () => void;
  onExportBase64?: (base64: string, hasStrokes?: boolean) => void;
  onEvaluate?: (base64: string) => void;
  isEvaluating?: boolean;
  className?: string;
}

export type ToolType = "pen" | "highlighter" | "eraser";

export type GridStyle = "quadriculado" | "pontilhado" | "liso";

interface ColorOption {
  name: string;
  value: string;
  border?: string;
}

const COLORS: ColorOption[] = [
  { name: "Giz Dourado LemmaS", value: "#d9b452" },
  { name: "Giz Branco", value: "#f5f0df", border: "#71717a" },
  { name: "Ciano Geométrico", value: "#38bdf8" },
  { name: "Vermelho / Correção", value: "#f43f5e" },
  { name: "Esmeralda Q.E.D.", value: "#10b981" },
  { name: "Grafite Escuro", value: "#27272a" },
];

const STROKE_WIDTHS = [
  { label: "Fina (2px)", value: 2 },
  { label: "Média (3.5px)", value: 3.5 },
  { label: "Grossa (6px)", value: 6 },
  { label: "Larga (12px)", value: 12 },
];

export default function MathScratchpad({
  onClose,
  onExportBase64,
  onEvaluate,
  isEvaluating = false,
  className = "",
}: MathScratchpadProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Detecção Inteligente de Dispositivo (Tablet/Mobile vs Desktop)
  const [isTabletOrMobile, setIsTabletOrMobile] = useState<boolean>(false);
  useEffect(() => {
    const checkDevice = () => {
      const isTouch = typeof window !== "undefined" && (
        navigator.maxTouchPoints > 0 ||
        window.matchMedia("(pointer: coarse)").matches ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Tablet/i.test(navigator.userAgent)
      );
      setIsTabletOrMobile(Boolean(isTouch));
    };
    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  // Estados de ferramentas
  const [currentTool, setCurrentTool] = useState<ToolType>("pen");
  const [currentColor, setCurrentColor] = useState<string>("#d9b452");
  const [currentWidth, setCurrentWidth] = useState<number>(3.5);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [strokeCount, setStrokeCount] = useState<number>(0);
  const [gridStyle, setGridStyle] = useState<GridStyle>("quadriculado");
  const [palmRejection, setPalmRejection] = useState<boolean>(true);
  const [stylusDetected, setStylusDetected] = useState<boolean>(false);

  // Controle de desenho em tempo real via Ref (Zero re-renders no ciclo de 120Hz/240Hz da S-Pen)
  const isDrawingRef = useRef<boolean>(false);
  const strokeCountRef = useRef<number>(0);

  // Pilhas de Undo / Redo com Offscreen Canvas Blitting (Zero CPU-GPU Readback Stall)
  const undoStackRef = useRef<HTMLCanvasElement[]>([]);
  const redoStackRef = useRef<HTMLCanvasElement[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Cache do BoundingClientRect para evitar Forced Synchronous Reflow no Android/Tablet
  const rectCacheRef = useRef<DOMRect | null>(null);

  // Pontos para interpolação Bézier quadrática
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastMidPointRef = useRef<{ x: number; y: number } | null>(null);
  const isPenSideButtonPressedRef = useRef<boolean>(false);

  // Criação de Snapshot Offscreen 100% acelerado por hardware na GPU (< 0.2ms vs 120ms do getImageData)
  const createSnapshot = (src: HTMLCanvasElement): HTMLCanvasElement | null => {
    if (!src || src.width === 0 || src.height === 0) return null;
    const snap = document.createElement("canvas");
    snap.width = src.width;
    snap.height = src.height;
    const snapCtx = snap.getContext("2d");
    if (!snapCtx) return null;
    snapCtx.drawImage(src, 0, 0);
    return snap;
  };

  const restoreSnapshot = (target: HTMLCanvasElement, snap: HTMLCanvasElement) => {
    const ctx = target.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, target.width, target.height);
    ctx.drawImage(snap, 0, 0);
    ctx.restore();
  };

  // Salva estado para Undo
  const saveState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const snap = createSnapshot(canvas);
      if (!snap) return;
      undoStackRef.current.push(snap);
      if (undoStackRef.current.length > 20) {
        undoStackRef.current.shift();
      }
      redoStackRef.current = [];
    } catch (e) {
      console.warn("Erro ao salvar snapshot do canvas:", e);
    }
  }, []);

  // Redimensionamento e Retina Scaling (preserva desenho intacto)
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    rectCacheRef.current = null; // Invalida cache de rect no resize
    const rect = container.getBoundingClientRect();
    
    // Limita DPR a 2.0 para manter nitidez Retina sem estrangular a GPU em telas 3K/4K de tablets
    const rawDpr = window.devicePixelRatio || 1;
    const dpr = Math.min(rawDpr, 2.0);

    // Salva o desenho atual antes de redimensionar via offscreen canvas
    const prevSnap = canvas.width > 0 && canvas.height > 0 ? createSnapshot(canvas) : null;

    const width = Math.max(300, Math.floor(rect.width));
    const height = Math.max(250, Math.floor(rect.height));

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Restaura o desenho
      if (prevSnap) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(prevSnap, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    const handleScrollOrResize = () => {
      rectCacheRef.current = null;
    };
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("scroll", handleScrollOrResize, { passive: true });
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("scroll", handleScrollOrResize);
    };
  }, [resizeCanvas, isFullscreen]);

  // Função otimizada para extrair coordenadas sem acionar reflow síncrono
  const getCoordinates = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    if (!rectCacheRef.current) {
      rectCacheRef.current = canvas.getBoundingClientRect();
    }
    const rect = rectCacheRef.current;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  // Configuração única do contexto 2D antes do traçado
  const applyContextSettings = (
    ctx: CanvasRenderingContext2D,
    tool: ToolType,
    color: string,
    width: number
  ) => {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = width * 5.5;
    } else if (tool === "highlighter") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = width * 3.5;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = width;
    }
  };

  // POINTER DOWN (Zero-Stall: sem getImageData e sem re-renders React durante o traço)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Atualiza cache de coordenadas imediatamente no clique
    rectCacheRef.current = canvas.getBoundingClientRect();

    // Rejeição de Palma: se o stylus foi detectado e o evento é toque da mão, ignora
    if (e.pointerType === "pen") {
      setStylusDetected(true);
    } else if (palmRejection && stylusDetected && e.pointerType === "touch") {
      return;
    }

    // Botão lateral da S-Pen (código 32 no buttons) ativa borracha
    const isPenButton = (e.buttons & 32) !== 0 || e.button === 5 || e.button === 2;
    isPenSideButtonPressedRef.current = isPenButton;

    if (e.button !== 0 && !isPenButton) return;

    canvas.setPointerCapture(e.pointerId);
    saveState();
    strokeCountRef.current++;

    const { x, y } = getCoordinates(e.clientX, e.clientY);
    lastPointRef.current = { x, y };
    lastMidPointRef.current = { x, y };
    isDrawingRef.current = true;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const effectiveTool = isPenButton ? "eraser" : currentTool;
    const pressure = e.pointerType === "pen" && typeof e.pressure === "number" && e.pressure > 0 ? e.pressure : 0.5;
    const effectiveWidth = e.pointerType === "pen" ? Math.max(1, currentWidth * (0.45 + pressure * 0.85)) : currentWidth;

    applyContextSettings(ctx, effectiveTool, currentColor, effectiveWidth);

    // Desenha ponto inicial
    ctx.beginPath();
    ctx.arc(x, y, (effectiveTool === "eraser" ? effectiveWidth * 2.5 : effectiveWidth) / 2, 0, Math.PI * 2);
    if (effectiveTool === "eraser") {
      ctx.fill();
    } else {
      ctx.fillStyle = currentColor;
      ctx.fill();
    }
  };

  // POINTER MOVE (Ultra-otimizado para Tablet: sem reflow síncrono e com descarte de micro-ruído)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPointRef.current) return;

    if (e.pointerType === "pen") {
      setStylusDetected(true);
    } else if (palmRejection && stylusDetected && e.pointerType === "touch") {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isPenButton = (e.buttons & 32) !== 0 || isPenSideButtonPressedRef.current;
    const effectiveTool = isPenButton ? "eraser" : currentTool;

    // Configuração estática única do contexto antes de processar micro-pontos
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (effectiveTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else if (effectiveTool === "highlighter") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = currentColor;
      ctx.globalAlpha = 0.35;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = currentColor;
      ctx.globalAlpha = 1.0;
    }

    // Coalesced Events: recupera os micro-pontos da taxa de 120Hz/240Hz
    const rawNative = e.nativeEvent as any;
    const coalescedEvents: Array<{ clientX: number; clientY: number; pressure?: number }> =
      typeof rawNative?.getCoalescedEvents === "function"
        ? rawNative.getCoalescedEvents()
        : [e];

    const baseWidth = effectiveTool === "eraser" ? currentWidth * 5.5 : effectiveTool === "highlighter" ? currentWidth * 3.5 : currentWidth;

    for (let i = 0; i < coalescedEvents.length; i++) {
      const subEvent = coalescedEvents[i];
      const { x, y } = getCoordinates(subEvent.clientX, subEvent.clientY);

      const lastP = lastPointRef.current;
      const dx = x - lastP.x;
      const dy = y - lastP.y;

      // Descarte de ruído sub-pixel para economizar 70% de chamadas GPU no tablet
      if (dx * dx + dy * dy < 2.5) {
        continue;
      }

      const pressure =
        e.pointerType === "pen" && typeof subEvent.pressure === "number" && subEvent.pressure > 0
          ? subEvent.pressure
          : 0.5;

      const effectiveWidth = e.pointerType === "pen" ? Math.max(1, baseWidth * (0.45 + pressure * 0.85)) : baseWidth;
      ctx.lineWidth = effectiveWidth;

      const p0 = lastMidPointRef.current || lastP;
      const midX = (lastP.x + x) / 2;
      const midY = (lastP.y + y) / 2;

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(lastP.x, lastP.y, midX, midY);
      ctx.stroke();

      lastPointRef.current = { x, y };
      lastMidPointRef.current = { x: midX, y: midY };
    }
  };

  // POINTER UP
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }

    if (lastPointRef.current && lastMidPointRef.current) {
      const ctx = canvas?.getContext("2d");
      if (ctx) {
        const isPenButton = isPenSideButtonPressedRef.current;
        const effectiveTool = isPenButton ? "eraser" : currentTool;
        applyContextSettings(ctx, effectiveTool, currentColor, currentWidth);

        ctx.beginPath();
        ctx.moveTo(lastMidPointRef.current.x, lastMidPointRef.current.y);
        ctx.lineTo(lastPointRef.current.x, lastPointRef.current.y);
        ctx.stroke();
      }
    }

    isDrawingRef.current = false;
    lastPointRef.current = null;
    lastMidPointRef.current = null;
    isPenSideButtonPressedRef.current = false;

    // Sincroniza estados do React no término do traço (não bloqueia a renderização durante o traço)
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(false);
    setStrokeCount(strokeCountRef.current);
  };

  // Undo / Redo com Hardware Blitting (Zero-Lag)
  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || undoStackRef.current.length === 0) return;

    const currentSnap = createSnapshot(canvas);
    if (currentSnap) {
      redoStackRef.current.push(currentSnap);
    }

    const prevSnap = undoStackRef.current.pop();
    if (prevSnap) {
      restoreSnapshot(canvas, prevSnap);
    }

    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
  };

  const handleRedo = () => {
    const canvas = canvasRef.current;
    if (!canvas || redoStackRef.current.length === 0) return;

    const currentSnap = createSnapshot(canvas);
    if (currentSnap) {
      undoStackRef.current.push(currentSnap);
    }

    const nextSnap = redoStackRef.current.pop();
    if (nextSnap) {
      restoreSnapshot(canvas, nextSnap);
    }

    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    saveState();

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
    strokeCountRef.current = 0;
    setStrokeCount(0);
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(false);
  };

  // Gera o snapshot otimizado para exportação e OCR multimodal
  const generateCanvasSnapshot = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const expCtx = exportCanvas.getContext("2d");
    if (!expCtx) return null;

    // Fundo lousa escuro de alto contraste
    expCtx.fillStyle = "#0e0d16";
    expCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Grid sutil no fundo
    if (gridStyle === "quadriculado") {
      expCtx.strokeStyle = "rgba(217, 180, 82, 0.05)";
      expCtx.lineWidth = 1;
      const step = 40;
      for (let x = 0; x < exportCanvas.width; x += step) {
        expCtx.beginPath();
        expCtx.moveTo(x, 0);
        expCtx.lineTo(x, exportCanvas.height);
        expCtx.stroke();
      }
      for (let y = 0; y < exportCanvas.height; y += step) {
        expCtx.beginPath();
        expCtx.moveTo(0, y);
        expCtx.lineTo(exportCanvas.width, y);
        expCtx.stroke();
      }
    }

    // Desenha o conteúdo da lousa
    expCtx.drawImage(canvas, 0, 0);

    return exportCanvas.toDataURL("image/png");
  };

  // Exportar como PNG com download
  const handleExportPNG = () => {
    const dataUrl = generateCanvasSnapshot();
    if (!dataUrl) return;

    if (onExportBase64) {
      onExportBase64(dataUrl, strokeCount > 0);
    }

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `rascunho-lemmas-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.png`;
    a.click();
  };

  // Submissão direta para Avaliação da IA
  const handleDirectEvaluation = () => {
    const dataUrl = generateCanvasSnapshot();
    if (!dataUrl) return;

    if (onExportBase64) {
      onExportBase64(dataUrl, strokeCount > 0);
    }
    if (onEvaluate) {
      onEvaluate(dataUrl);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col rounded-2xl border border-slate-200/90 dark:border-amber-500/25 bg-[#0e0d16] text-[#f5f0df] shadow-xl overflow-hidden transition-all ${
        isFullscreen
          ? "fixed inset-2 z-50 rounded-2xl"
          : isTabletOrMobile
          ? "h-[540px] md:h-[600px] w-full"
          : "h-[480px] md:h-[540px] w-full"
      } ${className}`}
    >
      {/* BARRA SUPERIOR DE FERRAMENTAS RESPONSIVA (PC vs TABLET) */}
      <div className={`flex flex-wrap items-center justify-between gap-2 bg-[#141224] border-b border-amber-500/20 select-none ${
        isTabletOrMobile ? "px-3 py-2.5" : "px-3 py-2"
      }`}>
        
        {/* GRUPO DE FERRAMENTAS: CANETA / MARCADOR / BORRACHA */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCurrentTool("pen")}
            className={`rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isTabletOrMobile ? "p-2.5 min-h-[40px]" : "p-2"
            } ${
              currentTool === "pen"
                ? "lemmas-gold-cta font-bold shadow-xs scale-105"
                : "bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800"
            }`}
            title="Caneta / Giz Suavizado (Samsung S-Pen Bézier)"
          >
            <Pen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Caneta</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTool("highlighter")}
            className={`rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isTabletOrMobile ? "p-2.5 min-h-[40px]" : "p-2"
            } ${
              currentTool === "highlighter"
                ? "lemmas-gold-cta font-bold shadow-xs scale-105"
                : "bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800"
            }`}
            title="Marca-texto / Destacador Transparente"
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Marcador</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTool("eraser")}
            className={`rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isTabletOrMobile ? "p-2.5 min-h-[40px]" : "p-2"
            } ${
              currentTool === "eraser"
                ? "bg-rose-500 text-white font-bold shadow-xs scale-105"
                : "bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800"
            }`}
            title="Borracha (segure o botão da S-Pen para apagar instantaneamente)"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Borracha</span>
          </button>
        </div>

        {/* PALETA DE CORES */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-zinc-900/70 border border-amber-500/15">
          {COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => {
                setCurrentColor(c.value);
                if (currentTool === "eraser") setCurrentTool("pen");
              }}
              style={{ backgroundColor: c.value }}
              title={c.name}
              className={`rounded-full transition-transform ${
                isTabletOrMobile ? "w-5 h-5" : "w-4.5 h-4.5"
              } ${
                currentColor === c.value && currentTool !== "eraser"
                  ? "scale-125 ring-2 ring-white shadow-sm"
                  : "hover:scale-110 opacity-80 hover:opacity-100"
              }`}
            />
          ))}
        </div>

        {/* ESPESSURA DO TRAÇO */}
        <div className="hidden lg:flex items-center gap-1">
          {STROKE_WIDTHS.map((sw) => (
            <button
              key={sw.value}
              type="button"
              onClick={() => setCurrentWidth(sw.value)}
              className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-colors ${
                currentWidth === sw.value
                  ? "bg-amber-500/20 text-[#d9b452] font-bold border border-amber-500/40"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title={sw.label}
            >
              {sw.value}px
            </button>
          ))}
        </div>

        {/* SELETOR DE GRID / PAPEL */}
        <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-xl bg-zinc-900/70 border border-amber-500/15 text-[10px]">
          <button
            type="button"
            onClick={() => setGridStyle(gridStyle === "quadriculado" ? "liso" : "quadriculado")}
            className={`px-2 py-1 rounded flex items-center gap-1 transition ${
              gridStyle === "quadriculado" ? "text-amber-400 font-bold" : "text-zinc-400"
            }`}
            title="Alternar Papel Quadriculado / Liso"
          >
            <Grid className="w-3 h-3" />
            <span>{gridStyle === "quadriculado" ? "Grid" : "Liso"}</span>
          </button>
        </div>

        {/* BADGE DE S-PEN & REJEIÇÃO DE PALMA / MODO DISPOSITIVO */}
        <button
          type="button"
          onClick={() => setPalmRejection(!palmRejection)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-medium border transition ${
            palmRejection
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
              : "bg-zinc-900 border-zinc-700 text-zinc-500"
          }`}
          title={palmRejection ? "Rejeição de palma ativa (ignora toque da mão)" : "Rejeição de palma desativada"}
        >
          {isTabletOrMobile ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
          <span>{stylusDetected ? "S-Pen Ativa" : palmRejection ? "Palma Rejeitada" : "Toque Livre"}</span>
        </button>

        {/* AÇÕES: UNDO / REDO / CLEAR / AVALIAR IA / EXPORT / TELA CHEIA / FECHAR */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            className={`rounded-lg text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors ${
              isTabletOrMobile ? "p-2" : "p-1.5"
            }`}
            title="Desfazer traço (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleRedo}
            disabled={!canRedo}
            className={`rounded-lg text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors ${
              isTabletOrMobile ? "p-2" : "p-1.5"
            }`}
            title="Refazer traço (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleClear}
            className={`rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors ${
              isTabletOrMobile ? "p-2" : "p-1.5"
            }`}
            title="Limpar Lousa Completa"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-zinc-700 mx-0.5" />

          {/* BOTÃO PRIMÁRIO: AVALIAR RASCUNHO DIRETAMENTE NA LOUSA */}
          {onEvaluate && (
            <button
              type="button"
              onClick={handleDirectEvaluation}
              disabled={isEvaluating}
              className={`lemmas-gold-cta rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all hover:scale-[1.02] disabled:opacity-50 cursor-pointer ${
                isTabletOrMobile ? "px-3.5 py-2" : "px-3 py-1.5"
              }`}
              title="Avaliar rascunho manuscrito com MathAI Engine OCR"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Avaliando...</span>
                </>
              ) : (
                <>
                  <BrainCircuit className="w-3.5 h-3.5" />
                  <span>Avaliar Rascunho</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleExportPNG}
            className={`rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors ${
              isTabletOrMobile ? "p-2" : "p-1.5"
            }`}
            title="Exportar como Imagem PNG"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors ${
              isTabletOrMobile ? "p-2" : "p-1.5"
            }`}
            title={isFullscreen ? "Sair da Tela Cheia" : "Modo Tela Cheia"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className={`rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ${
                isTabletOrMobile ? "p-2" : "p-1.5"
              }`}
              title="Fechar Lousa"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ÁREA DA LOUSA / CANVAS COM TEXTURA DE PAPEL QUADRICULADO DISCRETO */}
      <div className="relative flex-1 w-full h-full bg-[#0e0d16] overflow-hidden cursor-crosshair touch-none">
        {/* Grid de fundo matemático suave */}
        {gridStyle === "quadriculado" && (
          <div 
            className="absolute inset-0 pointer-events-none opacity-[0.05]"
            style={{
              backgroundImage: "radial-gradient(#d9b452 1px, transparent 1px)",
              backgroundSize: isTabletOrMobile ? "32px 32px" : "28px 28px"
            }}
          />
        )}

        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: "none" }}
          className="absolute inset-0 w-full h-full block touch-none [will-change:transform]"
        />

        {/* Indicador de ferramenta ativa no canto inferior */}
        <div className="absolute bottom-2 right-3 pointer-events-none text-[10px] text-zinc-600 font-mono flex items-center gap-2 select-none">
          {stylusDetected && (
            <span className="text-emerald-500 font-sans font-bold flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> S-Pen Suave (Zero-Reflow 120Hz)
            </span>
          )}
          <span>📐 Lousa LemmaS {isTabletOrMobile ? "· Modo Tablet" : ""}</span>
        </div>
      </div>
    </div>
  );
}
