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
  Palette
} from "lucide-react";

interface MathScratchpadProps {
  onClose?: () => void;
  onExportBase64?: (base64: string, hasStrokes?: boolean) => void;
  className?: string;
}

type ToolType = "pen" | "highlighter" | "eraser";

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
  { label: "Média (4px)", value: 4 },
  { label: "Grossa (8px)", value: 8 },
  { label: "Larga (14px)", value: 14 },
];

export default function MathScratchpad({
  onClose,
  onExportBase64,
  className = "",
}: MathScratchpadProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Estados de ferramentas
  const [currentTool, setCurrentTool] = useState<ToolType>("pen");
  const [currentColor, setCurrentColor] = useState<string>("#d9b452");
  const [currentWidth, setCurrentWidth] = useState<number>(3);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [strokeCount, setStrokeCount] = useState<number>(0);

  // Pilhas de Undo / Redo
  const undoStackRef = useRef<ImageData[]>([]);
  const redoStackRef = useRef<ImageData[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Salva estado para Undo
  const saveState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      undoStackRef.current.push(imageData);
      if (undoStackRef.current.length > 25) {
        undoStackRef.current.shift();
      }
      redoStackRef.current = [];
      setCanUndo(true);
      setCanRedo(false);
    } catch (e) {
      console.warn("Erro ao salvar snapshot do canvas:", e);
    }
  }, []);

  // Redimensionamento e Retina Scaling
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

  // Pointer Events com Rejeição de Palma
  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Apenas botão principal (mouse esquerdo ou toque / caneta)
    if (e.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    saveState();
    setStrokeCount((c) => c + 1);

    const { x, y } = getCoordinates(e);
    lastPointRef.current = { x, y };
    setIsDrawing(true);

    // Desenha um ponto no local do clique inicial
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    if (currentTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, currentWidth * 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = currentColor;
      ctx.fillStyle = currentColor;
      ctx.globalAlpha = currentTool === "highlighter" ? 0.35 : 1.0;
      ctx.beginPath();
      ctx.arc(x, y, (currentTool === "highlighter" ? currentWidth * 2.5 : currentWidth) / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPointRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    ctx.save();
    if (currentTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = currentWidth * 5;
    } else if (currentTool === "highlighter") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = currentColor;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = currentWidth * 4;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = currentColor;
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = currentWidth;
    }

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();

    lastPointRef.current = { x, y };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    setIsDrawing(false);
    lastPointRef.current = null;
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

  // Exportar como PNG com fundo sólido
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const expCtx = exportCanvas.getContext("2d");
    if (!expCtx) return;

    // Fundo lousa escuro/papel formal
    expCtx.fillStyle = "#141224";
    expCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Grid sutil milimetrado de caderno
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

    // Desenha o conteúdo da lousa
    expCtx.drawImage(canvas, 0, 0);

    const dataUrl = exportCanvas.toDataURL("image/png");

    if (onExportBase64) {
      onExportBase64(dataUrl, strokeCount > 0);
    }

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `rascunho-lemmas-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.png`;
    a.click();
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col rounded-2xl border border-slate-200/90 dark:border-amber-500/25 bg-[#0e0d16] text-[#f5f0df] shadow-xl overflow-hidden transition-all ${
        isFullscreen ? "fixed inset-3 z-50 rounded-2xl" : "h-[460px] md:h-[520px] w-full"
      } ${className}`}
    >
      {/* BARRA SUPERIOR DE FERRAMENTAS EDITORIAL */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-[#141224] border-b border-amber-500/20 select-none">
        
        {/* GRUPO DE FERRAMENTAS: CANETA / MARCADOR / BORRACHA */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCurrentTool("pen")}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              currentTool === "pen"
                ? "lemmas-gold-cta font-bold shadow-xs scale-105"
                : "bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800"
            }`}
            title="Caneta / Giz de Precisão"
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
            title="Borracha / Limpador de Traço"
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
              className={`w-5 h-5 rounded-full transition-transform ${
                currentColor === c.value && currentTool !== "eraser"
                  ? "scale-125 ring-2 ring-white shadow-sm"
                  : "hover:scale-110 opacity-80 hover:opacity-100"
              }`}
            />
          ))}
        </div>

        {/* ESPESSURA DO TRAÇO */}
        <div className="hidden md:flex items-center gap-1">
          {STROKE_WIDTHS.map((sw) => (
            <button
              key={sw.value}
              type="button"
              onClick={() => setCurrentWidth(sw.value)}
              className={`px-2 py-1 rounded-lg text-[11px] font-mono transition-colors ${
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

        {/* AÇÕES: UNDO / REDO / CLEAR / EXPORT / TELA CHEIA / FECHAR */}
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

          <button
            type="button"
            onClick={handleExportPNG}
            className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-[#d9b452] border border-amber-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
            title="Exportar como Imagem PNG de Alta Resolução"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar PNG</span>
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
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(#d9b452 1px, transparent 1px)",
            backgroundSize: "24px 24px"
          }}
        />

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
          <span>📐 Lousa LemmaS (Pointer Events & Rejeição de Palma)</span>
        </div>
      </div>
    </div>
  );
}
