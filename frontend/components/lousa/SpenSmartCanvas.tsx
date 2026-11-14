// components/lousa/SpenSmartCanvas.tsx
"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Undo2, Redo2, Trash2, ZoomIn, ZoomOut, LocateFixed, Shapes } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

import {
  createCanvasDocument, commitCanvas, undoCanvas, redoCanvas,
  remapCanvasColors, strokeIntersectsEraser, canvasContentSize,
  type CanvasDocument, type Point, type Stroke, type ToolType,
} from "@/lib/canvas-document";
import { buildSnappedLine, recognizeAndSnapShape, type RecognizedShapeKind } from "@/lib/canvas-shapes";
export type { Point, Stroke, ToolType } from "@/lib/canvas-document";

export interface SpenSmartCanvasProps {
  onEvaluateOcr: (imageBase64: string) => Promise<void>;
  isEvaluating?: boolean;
  initialStrokes?: Stroke[];
  documentState?: CanvasDocument;
  onStrokesChange?: (strokes: Stroke[]) => void;
  canvasHeightClass?: string;
  hideFooterEvaluate?: boolean;
  exportCanvasRef?: React.MutableRefObject<(() => string | null) | null>;
  showZoomControls?: boolean;
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

interface InkPresenter {
  updateInkTrailStartPoint(event: PointerEvent, style: { color: string; diameter: number }): void;
}
type InkNavigator = Navigator & {
  ink?: { requestPresenter(options: { presentationArea: HTMLCanvasElement }): Promise<InkPresenter> };
};

interface ActiveStrokeState {
  stroke: Stroke;
  lastMidX: number;
  lastMidY: number;
}

export const SpenSmartCanvas: React.FC<SpenSmartCanvasProps> = ({
  onEvaluateOcr,
  isEvaluating = false,
  initialStrokes,
  documentState,
  onStrokesChange,
  canvasHeightClass = "h-[420px]",
  hideFooterEvaluate = false,
  exportCanvasRef,
  showZoomControls = false,
}) => {
  const { isLight } = useTheme();
  const COLORS = isLight ? COLORS_LIGHT : COLORS_DARK;

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Camada 1: Traços consolidados (estática durante a escrita ativa)
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // Camada 2: Apenas o traço atual em movimento (incremental O(1) com curva Bézier)
  const inkCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Contextos 2D cacheados em Ref para evitar overhead de getContext() em 120Hz/240Hz
  const baseCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const inkCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Delegated Ink Trails API (Chromium / Android SurfaceFlinger bypass)
  const inkPresenterRef = useRef<InkPresenter | null>(null);

  // Histórico mantido em Refs para ZERO re-renders do React durante a escrita
  const documentRef = useRef(documentState ?? createCanvasDocument(initialStrokes));
  const strokesRef = useRef(documentState?.strokes ?? initialStrokes ?? []);
  const eraserStartRef = useRef<Stroke[] | null>(null);
  const eraserPointRef = useRef<Point | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const activePointerIdRef = useRef<number | null>(null);
  const activeStrokeStateRef = useRef<ActiveStrokeState | null>(null);
  const dprRef = useRef<number>(1);
  const resizeCanvasRef = useRef<(() => void) | null>(null);
  const onStrokesChangeRef = useRef(onStrokesChange);
  useEffect(() => { onStrokesChangeRef.current = onStrokesChange; }, [onStrokesChange]);

  // Estados leves apenas para a barra de ferramentas
  const [activeTool, setActiveTool] = useState<ToolType>(documentState?.settings.tool ?? "pen");
  const [colorIndex, setColorIndex] = useState(documentState?.settings.colorIndex ?? 0);
  const activeColor = COLORS[colorIndex].hex;
  const [activeWidth, setActiveWidth] = useState<number>(documentState?.settings.width ?? 2);
  const [stylusMode, setStylusMode] = useState<boolean>(documentState?.settings.stylusMode ?? false);
  const [autoShape, setAutoShape] = useState<boolean>(true);
  const [shapeBadge, setShapeBadge] = useState<string | null>(null);
  const [zoom, setZoom] = useState(documentState?.settings.zoom ?? 1);
  const [baseSize, setBaseSize] = useState({ width: 0, height: 0 });
  const [strokeCount, setStrokeCount] = useState(documentState?.strokes.length ?? initialStrokes?.length ?? 0);

  const [historyState, setHistoryState] = useState({
    undo: (documentState?.past.length ?? 0) > 0, redo: (documentState?.future.length ?? 0) > 0,
  });

  useEffect(() => {
    documentRef.current.settings = { ...documentRef.current.settings, tool: activeTool, colorIndex, width: activeWidth, stylusMode, zoom };
  }, [activeTool, colorIndex, activeWidth, stylusMode, zoom]);

  // Refs sincronizadas para leitura instantânea nos listeners nativos
  const toolRef = useRef<ToolType>(activeTool);
  const colorRef = useRef<string>(activeColor);
  const widthRef = useRef<number>(activeWidth);
  const stylusModeRef = useRef<boolean>(stylusMode);
  const autoShapeRef = useRef<boolean>(autoShape);
  const holdTimerRef = useRef<number | null>(null);
  const badgeTimerRef = useRef<number | null>(null);
  const holdAnchorRef = useRef<Point | null>(null);
  const snappedLineAnchorRef = useRef<Point | null>(null);
  const shapeSnappedRef = useRef<boolean>(false);

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
  useEffect(() => {
    autoShapeRef.current = autoShape;
  }, [autoShape]);

  // Inicializa a Ink API de traço delegado (hardware compositor) do navegador
  useEffect(() => {
    const ink = (navigator as InkNavigator).ink;
    const inkCanvas = inkCanvasRef.current;
    let cancelled = false;
    if (ink && inkCanvas) {
      ink.requestPresenter({ presentationArea: inkCanvas }).then(presenter => {
        if (!cancelled) inkPresenterRef.current = presenter;
      }).catch(() => {});
    }
    return () => { cancelled = true; inkPresenterRef.current = null; };
  }, []);

  // Publica somente operações concluídas. O pai guarda os pontos em ref, sem
  // renderizar a página a cada movimento. Abrir o Foco já recebe o último traço.
  const publishStrokes = useCallback((strokes: Stroke[]) => {
    documentRef.current.strokes = strokes;
    setStrokeCount(strokes.length);
    setHistoryState({ undo: documentRef.current.past.length > 0, redo: documentRef.current.future.length > 0 });
    onStrokesChangeRef.current?.(strokes);
  }, []);

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

    if (pts.length === 1) {
      ctx.beginPath();
      const r = stroke.baseWidth * (stroke.tool === "highlighter" ? 1 : Math.max(0.6, Math.min(1.4, pts[0].pressure * 1.2))) / 2;
      ctx.arc(pts[0].x, pts[0].y, Math.max(0.75, r), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    if (stroke.tool === "highlighter") {
      ctx.beginPath();
      ctx.lineWidth = stroke.baseWidth;
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        ctx.quadraticCurveTo(pts[i].x, pts[i].y,
          (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, Math.max(0.75,
        stroke.baseWidth * Math.max(0.6, Math.min(1.4, pts[0].pressure * 1.2)) / 2), 0, Math.PI * 2);
      ctx.fill();
      let mid = pts[0];
      for (let i = 1; i < pts.length; i++) {
        const previous = pts[i - 1];
        const point = pts[i];
        const nextMid = { x: (previous.x + point.x) / 2, y: (previous.y + point.y) / 2 };
        ctx.lineWidth = stroke.baseWidth * Math.max(0.6, Math.min(1.4, point.pressure * 1.2));
        ctx.beginPath();
        ctx.moveTo(mid.x, mid.y);
        ctx.quadraticCurveTo(previous.x, previous.y, nextMid.x, nextMid.y);
        ctx.stroke();
        mid = { ...point, ...nextMid };
      }
      ctx.beginPath();
      ctx.moveTo(mid.x, mid.y);
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
    }
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

  // Ao mudar o tema, mantém a escolha da paleta e remapeia desenho e histórico.
  useEffect(() => {
    const fromColors = isLight ? COLORS_DARK : COLORS_LIGHT;
    const toColors = isLight ? COLORS_LIGHT : COLORS_DARK;

    const colorMap = new Map<string, string>();
    fromColors.forEach((c, i) => {
      if (toColors[i]) colorMap.set(c.hex.toUpperCase(), toColors[i].hex);
    });

    remapCanvasColors(documentRef.current, colorMap);
    strokesRef.current = documentRef.current.strokes;
    const active = activeStrokeStateRef.current?.stroke;
    if (active) active.color = colorMap.get(active.color.toUpperCase()) ?? active.color;
    redrawBaseCanvas();
    const inkCanvas = inkCanvasRef.current, inkCtx = inkCtxRef.current;
    if (inkCanvas && inkCtx && active) {
      inkCtx.clearRect(0, 0, inkCanvas.width / dprRef.current, inkCanvas.height / dprRef.current);
      drawFullStroke(inkCtx, active);
      inkCtx.strokeStyle = active.color;
      inkCtx.fillStyle = active.color;
    }
    onStrokesChangeRef.current?.(strokesRef.current);
  }, [isLight, redrawBaseCanvas, drawFullStroke]);

  // Inicializa o tamanho do Canvas apenas quando as dimensões físicas mudam
  useEffect(() => {
    const viewport = viewportRef.current;
    const container = containerRef.current;
    const baseCanvas = baseCanvasRef.current;
    const inkCanvas = inkCanvasRef.current;
    if (!viewport || !container || !baseCanvas || !inkCanvas) return;

    const setupDimensions = () => {
      if (viewport.clientWidth <= 0 || viewport.clientHeight <= 0) return;
      const content = canvasContentSize(strokesRef.current);
      const width = Math.max(viewport.clientWidth / zoom, content.width);
      const height = Math.max(viewport.clientHeight / zoom, content.height);
      container.style.width = `${width}px`;
      container.style.height = `${height}px`;
      setBaseSize(previous => previous.width === width && previous.height === height ? previous : { width, height });

      // Limita DPR em 2.0 no máximo para não sobrecarregar a GPU de tablets 3x/4x
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const dprChanged = dpr !== dprRef.current;
      const targetW = Math.round(width * dpr);
      const targetH = Math.round(height * dpr);

      const widthChanged = baseCanvas.width !== targetW;
      const heightChanged = baseCanvas.height !== targetH;

      if (widthChanged || heightChanged || dprChanged) {
        dprRef.current = dpr;
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
        const active = activeStrokeStateRef.current?.stroke;
        if (inkCtx && active) {
          drawFullStroke(inkCtx, active);
          inkCtx.strokeStyle = active.color;
          inkCtx.fillStyle = active.color;
          inkCtx.globalAlpha = active.tool === "highlighter" ? 0.35 : 1;
        }
      }
    };

    resizeCanvasRef.current = setupDimensions;
    setupDimensions();
    const observer = new ResizeObserver(setupDimensions);
    observer.observe(viewport);
    window.addEventListener("resize", setupDimensions);
    return () => {
      observer.disconnect();
      resizeCanvasRef.current = null;
      window.removeEventListener("resize", setupDimensions);
    };
  }, [redrawBaseCanvas, drawFullStroke, zoom]);

  // Um gesto da borracha é uma única operação de histórico.
  const eraseStrokeAtPoints = useCallback((points: Point[]) => {
    const segments = points.map(point => {
      const previous = eraserPointRef.current ?? point;
      eraserPointRef.current = point;
      return { previous, point };
    });
    const remaining = strokesRef.current.filter(stroke =>
      !segments.some(({ previous, point }) => strokeIntersectsEraser(stroke, previous, point)));
    if (remaining.length !== strokesRef.current.length) {
      strokesRef.current = remaining;
      redrawBaseCanvas();
    }
  }, [redrawBaseCanvas]);

  // Listeners Nativos de Baixa Latência anexados diretamente ao elemento DOM
  useEffect(() => {
    const inkCanvas = inkCanvasRef.current;
    const baseCanvas = baseCanvasRef.current;
    if (!inkCanvas || !baseCanvas) return;
    const drawingDocument = documentRef.current;

    const SHAPE_LABELS: Record<RecognizedShapeKind, string> = {
      line: "Linha reta",
      circle: "Círculo",
      ellipse: "Elipse",
      triangle: "Triângulo",
      rectangle: "Retângulo",
      square: "Quadrado",
    };

    const clearHoldTimer = () => {
      if (holdTimerRef.current !== null) {
        window.clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
    };

    const showShapeBadge = (kind: RecognizedShapeKind) => {
      setShapeBadge(SHAPE_LABELS[kind]);
      if (badgeTimerRef.current !== null) window.clearTimeout(badgeTimerRef.current);
      badgeTimerRef.current = window.setTimeout(() => {
        setShapeBadge(null);
        badgeTimerRef.current = null;
      }, 1400);
    };

    const scheduleHoldCheck = () => {
      clearHoldTimer();
      if (!autoShapeRef.current) return;
      holdTimerRef.current = window.setTimeout(() => {
        holdTimerRef.current = null;
        if (!isDrawingRef.current || shapeSnappedRef.current) return;
        const state = activeStrokeStateRef.current;
        if (!state) return;
        const recognized = recognizeAndSnapShape(state.stroke.points);
        if (!recognized) return;

        state.stroke.points = recognized.points;
        shapeSnappedRef.current = true;
        if (recognized.kind === "line" && recognized.anchorStart) {
          snappedLineAnchorRef.current = recognized.anchorStart;
        }
        const inkCtx = inkCtxRef.current;
        if (inkCtx) {
          const dpr = dprRef.current;
          inkCtx.clearRect(0, 0, inkCanvas.width / dpr, inkCanvas.height / dpr);
          drawFullStroke(inkCtx, state.stroke);
        }
        showShapeBadge(recognized.kind);
      }, 480);
    };

    const getPoint = (e: PointerEvent, rect: DOMRect): Point => ({
      x: Math.max(0, Math.min(rect.width / zoom, (e.clientX - rect.left) / zoom)),
      y: Math.max(0, Math.min(rect.height / zoom, (e.clientY - rect.top) / zoom)),
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
      if (activePointerIdRef.current !== null || (e.pointerType === "mouse" && e.button !== 0)) return;
      e.preventDefault();

      activePointerIdRef.current = e.pointerId;
      try {
        inkCanvas.setPointerCapture(e.pointerId);
      } catch {}

      const pt = getPoint(e, inkCanvas.getBoundingClientRect());
      const isSpenEraser = e.button === 5 || (e.buttons & 32) !== 0;
      const effectiveTool: ToolType = isSpenEraser ? "stroke-eraser" : toolRef.current;
      isDrawingRef.current = true;

      if (effectiveTool === "stroke-eraser") {
        eraserStartRef.current = strokesRef.current;
        eraserPointRef.current = null;
        eraseStrokeAtPoints([pt]);
        return;
      }

      const inkCtx = inkCtxRef.current;
      const pressure = pt.pressure || 0.7;
      const baseWidth =
        effectiveTool === "highlighter"
          ? Math.max(14, widthRef.current * 3)
          : widthRef.current;
      const pressureFactor = effectiveTool === "highlighter" ? 1 : Math.max(0.6, Math.min(1.4, pressure * 1.2));

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
      snappedLineAnchorRef.current = null;
      shapeSnappedRef.current = false;
      holdAnchorRef.current = pt;
      scheduleHoldCheck();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDrawingRef.current || e.pointerId !== activePointerIdRef.current) return;
      if (e.pointerType === "touch" && stylusModeRef.current) return;
      e.preventDefault();

      const rect = inkCanvas.getBoundingClientRect();

      const samples = e.getCoalescedEvents?.();
      const coalesced = samples?.length ? samples : [e];

      if (eraserStartRef.current) {
        eraseStrokeAtPoints(coalesced.map(sample => getPoint(sample, rect)));
        return;
      }

      const state = activeStrokeStateRef.current;
      if (!state) return;
      const stroke = state.stroke;

      // Samsung Notes style: after snapping a straight line, dragging rotates/resizes it live.
      if (snappedLineAnchorRef.current) {
        const latest = getPoint(coalesced[coalesced.length - 1], rect);
        stroke.points = buildSnappedLine(snappedLineAnchorRef.current, latest);
        const inkCtx = inkCtxRef.current;
        if (inkCtx) {
          const dpr = dprRef.current;
          inkCtx.clearRect(0, 0, inkCanvas.width / dpr, inkCanvas.height / dpr);
          drawFullStroke(inkCtx, stroke);
        }
        return;
      }

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
          const anchor = holdAnchorRef.current;
          if (!anchor || Math.hypot(pt.x - anchor.x, pt.y - anchor.y) > 5) {
            holdAnchorRef.current = pt;
            scheduleHoldCheck();
          }

          if (stroke.tool === "highlighter") {
            // Renderizado uma vez após incorporar todas as amostras do evento.
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

      if (stroke.tool === "highlighter" && inkCtx) {
        inkCtx.clearRect(0, 0, inkCanvas.width / dprRef.current, inkCanvas.height / dprRef.current);
        drawFullStroke(inkCtx, stroke);
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
      if (e.pointerId !== activePointerIdRef.current) return;
      clearHoldTimer();
      holdAnchorRef.current = null;
      const wasSnapped = shapeSnappedRef.current;
      snappedLineAnchorRef.current = null;
      shapeSnappedRef.current = false;

      const state = activeStrokeStateRef.current;
      if (state && e.type === "pointerup" && !wasSnapped) {
        const endpoint = getPoint(e, inkCanvas.getBoundingClientRect());
        const last = state.stroke.points[state.stroke.points.length - 1];
        // pointerup pode trazer uma posição que não chegou em pointermove.
        if (endpoint.x !== last.x || endpoint.y !== last.y) {
          state.stroke.points.push({ ...endpoint, pressure: last.pressure });
        }
      }
      activeStrokeStateRef.current = null;
      isDrawingRef.current = false;
      activePointerIdRef.current = null;
      const eraserStart = eraserStartRef.current;
      if (eraserStart) {
        if (e.type === "pointerup") eraseStrokeAtPoints([getPoint(e, inkCanvas.getBoundingClientRect())]);
        if (strokesRef.current !== eraserStart) {
          commitCanvas(documentRef.current, strokesRef.current);
          publishStrokes(strokesRef.current);
        }
        eraserStartRef.current = null;
        eraserPointRef.current = null;
      }

      try {
        if (inkCanvas.hasPointerCapture(e.pointerId)) {
          inkCanvas.releasePointerCapture(e.pointerId);
        }
      } catch {}

      if (state && state.stroke.points.length > 0) {
        const finishedStroke = state.stroke;
        const inkCtx = inkCtxRef.current;
        const baseCtx = baseCtxRef.current || baseCanvas.getContext("2d");

        // Consolida no canvas base permanente e limpa o buffer volátil
        const dpr = dprRef.current;
        if (inkCtx) {
          inkCtx.clearRect(0, 0, inkCanvas.width / dpr, inkCanvas.height / dpr);
        }
        if (baseCtx) {
          drawFullStroke(baseCtx, finishedStroke);
        }

        commitCanvas(documentRef.current, [...strokesRef.current, finishedStroke]);
        strokesRef.current = documentRef.current.strokes;
        publishStrokes(strokesRef.current);
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
      const active = activeStrokeStateRef.current?.stroke;
      if (active) commitCanvas(drawingDocument, [...strokesRef.current, active]);
      else if (eraserStartRef.current && strokesRef.current !== eraserStartRef.current) {
        commitCanvas(drawingDocument, strokesRef.current);
      }
      activeStrokeStateRef.current = null;
      eraserStartRef.current = null;
      isDrawingRef.current = false;
      activePointerIdRef.current = null;
      clearHoldTimer();
      if (badgeTimerRef.current !== null) {
        window.clearTimeout(badgeTimerRef.current);
        badgeTimerRef.current = null;
      }
      holdAnchorRef.current = null;
      snappedLineAnchorRef.current = null;
      shapeSnappedRef.current = false;
    };
  }, [drawFullStroke, eraseStrokeAtPoints, publishStrokes, zoom]);

  const handleUndo = useCallback(() => {
    if (isDrawingRef.current || !undoCanvas(documentRef.current)) return;
    strokesRef.current = documentRef.current.strokes;
    resizeCanvasRef.current?.();
    redrawBaseCanvas();
    publishStrokes(strokesRef.current);
  }, [redrawBaseCanvas, publishStrokes]);

  const handleRedo = useCallback(() => {
    if (isDrawingRef.current || !redoCanvas(documentRef.current)) return;
    strokesRef.current = documentRef.current.strokes;
    resizeCanvasRef.current?.();
    redrawBaseCanvas();
    publishStrokes(strokesRef.current);
  }, [redrawBaseCanvas, publishStrokes]);

  const handleClear = () => {
    if (isDrawingRef.current || strokesRef.current.length === 0) return;
    commitCanvas(documentRef.current, []);
    strokesRef.current = documentRef.current.strokes;
    resizeCanvasRef.current?.();
    redrawBaseCanvas();
    publishStrokes(strokesRef.current);
  };

  const getCanvasBase64 = useCallback((): string | null => {
    const baseCanvas = baseCanvasRef.current;
    if (!baseCanvas) return null;
    const exportCanvas = document.createElement("canvas");
    const content = canvasContentSize(strokesRef.current);
    const width = Math.max(baseCanvas.width / dprRef.current, content.width);
    const height = Math.max(baseCanvas.height / dprRef.current, content.height);
    // Mantém todo o desenho, limitando o bitmap enviado ao OCR a 4096px por lado.
    const scale = Math.min(dprRef.current, 4096 / Math.max(width, height));
    exportCanvas.width = Math.ceil(width * scale);
    exportCanvas.height = Math.ceil(height * scale);
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = isLight ? "#FFFFFF" : "#0B0914";
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.scale(scale, scale);
    for (const stroke of strokesRef.current) drawFullStroke(ctx, stroke);
    return exportCanvas.toDataURL("image/png");
  }, [isLight, drawFullStroke]);

  useEffect(() => {
    if (exportCanvasRef) {
      exportCanvasRef.current = getCanvasBase64;
      return () => { if (exportCanvasRef.current === getCanvasBase64) exportCanvasRef.current = null; };
    }
  }, [exportCanvasRef, getCanvasBase64]);

  const handleExportAndEvaluate = async () => {
    publishStrokes([...strokesRef.current]);
    const b64 = getCanvasBase64();
    if (b64) {
      await onEvaluateOcr(b64);
    }
  };

  return (
    <div
      tabIndex={0}
      aria-label="Lousa de rascunho"
      onKeyDown={e => {
        if (e.target instanceof HTMLElement && e.target.closest("input, textarea, [contenteditable='true']")) return;
        if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
        if (e.key.toLowerCase() === "z") {
          e.preventDefault();
          if (e.shiftKey) handleRedo(); else handleUndo();
        } else if (e.key.toLowerCase() === "y") {
          e.preventDefault();
          handleRedo();
        }
      }}
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
            {COLORS.map((c, index) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setColorIndex(index)}
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
          {showZoomControls && (
            <div className={`flex items-center gap-1 rounded-lg border px-1 ${isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-white/5"}`} aria-label="Controles de zoom da lousa">
              <button type="button" onClick={() => setZoom(value => Math.max(0.5, Math.round((value - 0.1) * 10) / 10))} disabled={zoom <= 0.5} className="rounded p-1.5 disabled:opacity-30" title="Diminuir zoom"><ZoomOut className="h-4 w-4" /></button>
              <span className="min-w-12 text-center text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => setZoom(value => Math.min(2, Math.round((value + 0.1) * 10) / 10))} disabled={zoom >= 2} className="rounded p-1.5 disabled:opacity-30" title="Aumentar zoom"><ZoomIn className="h-4 w-4" /></button>
              <button type="button" onClick={() => { setZoom(1); if (viewportRef.current) { viewportRef.current.scrollLeft = 0; viewportRef.current.scrollTop = 0; } }} className="rounded p-1.5" title="Centralizar lousa"><LocateFixed className="h-4 w-4" /></button>
            </div>
          )}
          {shapeBadge && (
            <span
              role="status"
              aria-live="polite"
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                isLight
                  ? "border-amber-400/50 bg-amber-50 text-amber-800"
                  : "border-amber-400/40 bg-amber-500/15 text-amber-300"
              }`}
            >
              <Shapes className="h-3 w-3" />
              <span>{shapeBadge}</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => setAutoShape((prev) => !prev)}
            title="Completar figuras geométricas ao segurar a ponta no final do traço"
            aria-pressed={autoShape}
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium transition cursor-pointer ${
              autoShape
                ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold"
                : isLight
                ? "border-slate-300 bg-slate-100 text-slate-500 hover:text-slate-900"
                : "border-white/10 bg-white/5 text-gray-400 hover:text-white"
            }`}
          >
            <Shapes className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Formas</span>
          </button>

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
            disabled={!historyState.undo}
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
            disabled={!historyState.redo}
            className={`rounded p-1.5 disabled:opacity-30 transition cursor-pointer ${
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
        ref={viewportRef}
        style={{
          touchAction: "none",
          contain: "paint layout",
          isolation: "isolate",
        }}
        className={`relative w-full overflow-auto rounded-lg border transition-colors select-none ${
          isLight
            ? "border-slate-200 bg-white bg-[radial-gradient(#00000018_1px,transparent_1px)] [background-size:20px_20px]"
            : "border-white/10 bg-[#08070F] bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:20px_20px]"
        } ${canvasHeightClass}`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden select-none"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/lemmas-watermark.png"
            alt=""
            draggable={false}
            className={`h-auto w-[min(65%,400px)] rounded-2xl object-contain transition-opacity ${
              isLight ? "opacity-[0.14]" : "opacity-[0.12]"
            }`}
          />
        </div>
        <div style={{ width: baseSize.width * zoom || "100%", height: baseSize.height * zoom || "100%" }} aria-hidden="true" />
        <div
          ref={containerRef}
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            width: baseSize.width || "100%",
            height: baseSize.height || "100%",
          }}
          className="absolute left-0 top-0 z-10 min-h-full min-w-full"
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
          aria-label="Área de desenho"
          onPointerDown={() => viewportRef.current?.parentElement?.focus({ preventScroll: true })}
          className="absolute inset-0 h-full w-full cursor-crosshair"
        />
        </div>
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
