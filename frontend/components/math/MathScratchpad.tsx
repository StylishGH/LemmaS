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
} from "lucide-react";

export interface MathScratchpadProps {
  onClose?: () => void;
  onExportBase64?: (base64: string, hasStrokes?: boolean) => void;
  onEvaluate?: (base64: string) => void;
  isEvaluating?: boolean;
  className?: string;
}

export type ToolType = "pen" | "highlighter" | "eraser";

export type GridStyle = "quadriculado" | "milimetrado" | "pontilhado" | "liso";

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

  // Estados de ferramentas
  const [currentTool, setCurrentTool] = useState<ToolType>("pen");
  const [currentColor, setCurrentColor] = useState<string>("#d9b452");
  const [currentWidth, setCurrentWidth] = useState<number>(3.5);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [strokeCount, setStrokeCount] = useState<number>(0);
  const [gridStyle, setGridStyle] = useState<GridStyle>("quadriculado");
  const [palmRejection, setPalmRejection] = useState<boolean>(true);
  const [stylusDetected, setStylusDetected] = useState<boolean>(false);

  // Pilhas de Undo / Redo
  const undoStackRef = useRef<ImageData[]>([]);
  const redoStackRef = useRef<ImageData[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Pontos para interpolação Bézier quadrática
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastMidPointRef = useRef<{ x: number; y: number } | null>(null);
  const isPenSideButtonPressedRef = useRef<boolean>(false);

  // Salva estado para Undo
  const saveState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      undoStackRef.current.push(imageData);
      if (undoStackRef.current.length > 30) {
        undoStackRef.current.shift();
      }
      redoStackRef.current = [];
      setCanUndo(true);
      setCanRedo(false);
    } catch (e) {
      console.warn("Erro ao salvar snapshot do canvas:", e);
    }
  }, []);

  // Redimensionamento e Retina Scaling (preserva desenho intacto)
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Salva o desenho atual antes de redimensionar
    const ctx = canvas.getContext("2d");
    let prevData: ImageData | null = null;
    if (ctx && canvas.width > 0 && canvas.height > 0) {
      try {
        prevData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch {}
    }

    const width = Math.max(300, Math.floor(rect.width));
    const height = Math.max(250, Math.floor(rect.height));

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Restaura o desenho
      if (prevData) {
        ctx.putImageData(prevData, 0, 0);
      }
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas, isFullscreen]);

  // Função auxiliar para extrair coordenadas relativas
  const getCoordinates = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  // Traçado com interpolação Bézier e sensibilidade à pressão
  const drawBézierSegment = (
    ctx: CanvasRenderingContext2D,
    p0: { x: number; y: number },
    p1: { x: number; y: number },
    tool: ToolType,
    color: string,
    width: number,
    pressure: number
  ) => {
    const midX = (p0.x + p1.x) / 2;
    const midY = (p0.y + p1.y) / 2;

    ctx.save();
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
      // Sensibilidade à pressão: S-Pen fornece pressure de 0 a 1
      const pressureFactor = pressure > 0 ? 0.45 + pressure * 0.85 : 1.0;
      ctx.lineWidth = Math.max(1, width * pressureFactor);
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
    ctx.stroke();
    ctx.restore();

    return { x: midX, y: midY };
  };

  // POINTER DOWN
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Rejeição de Palma: se o stylus foi detectado e o evento é de toque acidental com a mão, ignora
    if (e.pointerType === "pen") {
      setStylusDetected(true);
    } else if (palmRejection && stylusDetected && e.pointerType === "touch") {
      return;
    }

    // Botão do S-Pen (código 32 no buttons) ou botão direito ativa borracha instantaneamente
    const isPenButton = (e.buttons & 32) !== 0 || e.button === 5 || e.button === 2;
    isPenSideButtonPressedRef.current = isPenButton;

    // Apenas botão principal ou botão S-Pen
    if (e.button !== 0 && !isPenButton) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    saveState();
    setStrokeCount((c) => c + 1);

    const { x, y } = getCoordinates(e.clientX, e.clientY);
    lastPointRef.current = { x, y };
    lastMidPointRef.current = { x, y };
    setIsDrawing(true);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const effectiveTool = isPenButton ? "eraser" : currentTool;
    const pressure = e.pointerType === "pen" && typeof e.pressure === "number" && e.pressure > 0 ? e.pressure : 0.5;

    ctx.save();
    if (effectiveTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, currentWidth * 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = currentColor;
      ctx.globalAlpha = effectiveTool === "highlighter" ? 0.35 : 1.0;
      const dotRadius = Math.max(1, (effectiveTool === "highlighter" ? currentWidth * 1.8 : currentWidth * (0.45 + pressure * 0.85)) / 2);
      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  // POINTER MOVE (com coalesced events para taxa de 120Hz/240Hz sem serrilhado)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPointRef.current) return;

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

    // Coalesced Events: recupera todos os micro-pontos capturados pelo digitalizador entre frames
    const rawNative = e.nativeEvent as any;
    const coalescedEvents: Array<{ clientX: number; clientY: number; pressure?: number }> =
      typeof rawNative?.getCoalescedEvents === "function"
        ? rawNative.getCoalescedEvents()
        : [e];

    for (const subEvent of coalescedEvents) {
      const { x, y } = getCoordinates(subEvent.clientX, subEvent.clientY);
      const pressure =
        e.pointerType === "pen" && typeof subEvent.pressure === "number" && subEvent.pressure > 0
          ? subEvent.pressure
          : 0.5;

      const p0 = lastMidPointRef.current || lastPointRef.current;
      const nextMid = drawBézierSegment(
        ctx,
        p0,
        { x, y },
        effectiveTool,
        currentColor,
        currentWidth,
        pressure
      );

      lastPointRef.current = { x, y };
      lastMidPointRef.current = nextMid;
    }
  };

  // POINTER UP
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }

    // Arremate final do traço
    if (lastPointRef.current && lastMidPointRef.current) {
      const ctx = canvas?.getContext("2d");
      if (ctx) {
        ctx.save();
        const isPenButton = isPenSideButtonPressedRef.current;
        const effectiveTool = isPenButton ? "eraser" : currentTool;

        if (effectiveTool === "eraser") {
          ctx.globalCompositeOperation = "destination-out";
          ctx.lineWidth = currentWidth * 5.5;
        } else if (effectiveTool === "highlighter") {
          ctx.globalCompositeOperation = "source-over";
          ctx.strokeStyle = currentColor;
          ctx.globalAlpha = 0.35;
          ctx.lineWidth = currentWidth * 3.5;
        } else {
          ctx.globalCompositeOperation = "source-over";
          ctx.strokeStyle = currentColor;
          ctx.globalAlpha = 1.0;
          ctx.lineWidth = currentWidth;
        }
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(lastMidPointRef.current.x, lastMidPointRef.current.y);
        ctx.lineTo(lastPointRef.current.x, lastPointRef.current.y);
        ctx.stroke();
        ctx.restore();
      }
    }

    setIsDrawing(false);
    lastPointRef.current = null;
    lastMidPointRef.current = null;
    isPenSideButtonPressedRef.current = false;
  };

  // Undo / Redo
  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || undoStackRef.current.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const currentImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
    redoStackRef.current.push(currentImage);

    const prevImage = undoStackRef.current.pop();
    if (prevImage) {
      ctx.putImageData(prevImage, 0, 0);
    }

    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
  };

  const handleRedo = () => {
    const canvas = canvasRef.current;
    if (!canvas || redoStackRef.current.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const currentImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
    undoStackRef.current.push(currentImage);

    const nextImage = redoStackRef.current.pop();
    if (nextImage) {
      ctx.putImageData(nextImage, 0, 0);
    }

    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    saveState();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setStrokeCount(0);
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
        isFullscreen ? "fixed inset-3 z-50 rounded-2xl" : "h-[480px] md:h-[540px] w-full"
      } ${className}`}
    >
      {/* BARRA SUPERIOR DE FERRAMENTAS EDITORIAL */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#141224] border-b border-amber-500/20 select-none">
        
        {/* GRUPO DE FERRAMENTAS: CANETA / MARCADOR / BORRACHA */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentTool("pen")}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
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
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
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
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
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
              className={`w-4.5 h-4.5 rounded-full transition-transform ${
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
              className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition-colors ${
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
            className={`px-1.5 py-0.5 rounded flex items-center gap-1 transition ${
              gridStyle === "quadriculado" ? "text-amber-400 font-bold" : "text-zinc-400"
            }`}
            title="Alternar Papel Quadriculado / Liso"
          >
            <Grid className="w-3 h-3" />
            <span>{gridStyle === "quadriculado" ? "Grid" : "Liso"}</span>
          </button>
        </div>

        {/* BADGE DE S-PEN & REJEIÇÃO DE PALMA */}
        <button
          type="button"
          onClick={() => setPalmRejection(!palmRejection)}
          className={`hidden md:flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-medium border transition ${
            palmRejection
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
              : "bg-zinc-900 border-zinc-700 text-zinc-500"
          }`}
          title={palmRejection ? "Rejeição de palma ativa (ignora toque da mão)" : "Rejeição de palma desativada"}
        >
          <ShieldCheck className="w-3 h-3" />
          <span>{stylusDetected ? "S-Pen Ativa" : palmRejection ? "Palma Rejeitada" : "Toque Livre"}</span>
        </button>

        {/* AÇÕES: UNDO / REDO / CLEAR / AVALIAR IA / EXPORT / TELA CHEIA / FECHAR */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-lg text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Desfazer traço (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-lg text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Refazer traço (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
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
              className="lemmas-gold-cta px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all hover:scale-[1.02] disabled:opacity-50 cursor-pointer"
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
            className="p-1.5 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors"
            title="Exportar como Imagem PNG"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors"
            title={isFullscreen ? "Sair da Tela Cheia" : "Modo Tela Cheia"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Fechar Lousa"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ÁREA DA LOUSA / CANVAS COM TEXTURA DE PAPEL QUADRICULADO DISCRETO */}
      <div className="relative flex-1 w-full h-full bg-[#0e0d16] overflow-hidden cursor-crosshair">
        {/* Grid de fundo matemático suave */}
        {gridStyle === "quadriculado" && (
          <div 
            className="absolute inset-0 pointer-events-none opacity-[0.05]"
            style={{
              backgroundImage: "radial-gradient(#d9b452 1px, transparent 1px)",
              backgroundSize: "28px 28px"
            }}
          />
        )}

        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ touchAction: "none" }}
          className="absolute inset-0 w-full h-full block"
        />

        {/* Indicador de ferramenta ativa no canto inferior */}
        <div className="absolute bottom-2 right-3 pointer-events-none text-[10px] text-zinc-600 font-mono flex items-center gap-2 select-none">
          {stylusDetected && (
            <span className="text-emerald-500 font-sans font-bold flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> S-Pen Suave (Bézier 120Hz)
            </span>
          )}
          <span>📐 Lousa LemmaS</span>
        </div>
      </div>
    </div>
  );
}
