"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Compass,
  Play,
  RotateCcw,
  Sparkles,
  Maximize2,
  Minimize2,
  X,
  Code2,
  BookOpen
} from "lucide-react";

interface GeometricCompassBoardProps {
  onClose?: () => void;
  initialCommands?: string[];
  onCommandsChange?: (commands: string[]) => void;
  className?: string;
}

declare global {
  interface Window {
    GGBApplet?: any;
    [key: string]: any;
  }
}

const PRESET_CONSTRUCTIONS = [
  {
    nome: "Mediatriz Euclidiana (Régua & Compasso)",
    descricao: "Construção clássica da reta mediatriz perpendicular ao segmento AB.",
    comandos: [
      "A = (-3, 0)",
      "B = (3, 0)",
      "s = Segment(A, B)",
      "c1 = Circle(A, 4)",
      "c2 = Circle(B, 4)",
      "P = Intersect(c1, c2, 1)",
      "Q = Intersect(c1, c2, 2)",
      "mediatriz = Line(P, Q)",
      "M = Midpoint(A, B)",
    ],
  },
  {
    nome: "Triângulo Retângulo 6-8-10 & Altura",
    descricao: "Relações métricas no triângulo retângulo e projeções ortogonais.",
    comandos: [
      "A = (0, 0)",
      "B = (8, 0)",
      "C = (0, 6)",
      "t = Polygon(A, B, C)",
      "h = PerpendicularLine(A, Line(B, C))",
      "H = Intersect(h, Line(B, C))",
      "alt = Segment(A, H)",
    ],
  },
  {
    nome: "Incentro & Círculo Inscrito (Bissetrizes)",
    descricao: "Interseção das bissetrizes internas e circunferência inscrita.",
    comandos: [
      "A = (-4, -2)",
      "B = (4, -2)",
      "C = (0, 4)",
      "tri = Polygon(A, B, C)",
      "b1 = AngleBisector(B, A, C)",
      "b2 = AngleBisector(A, B, C)",
      "I = Intersect(b1, b2)",
      "r = PerpendicularLine(I, Line(A, B))",
      "T = Intersect(r, Line(A, B))",
      "inscribed = Circle(I, T)",
    ],
  },
  {
    nome: "Teorema do Ângulo Inscrito & Central",
    descricao: "O ângulo central é o dobro de qualquer ângulo inscrito que subtende o mesmo arco.",
    comandos: [
      "O = (0, 0)",
      "circ = Circle(O, 4)",
      "A = Point(circ, 0.1)",
      "B = Point(circ, 0.4)",
      "P = Point(circ, 0.8)",
      "segOA = Segment(O, A)",
      "segOB = Segment(O, B)",
      "segPA = Segment(P, A)",
      "segPB = Segment(P, B)",
      "angCentral = Angle(A, O, B)",
      "angInscrito = Angle(A, P, B)",
    ],
  },
];

export default function GeometricCompassBoard({
  onClose,
  initialCommands,
  onCommandsChange,
  className = "",
}: GeometricCompassBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appletId = useRef(`ggb-applet-${Math.random().toString(36).substring(2, 9)}`).current;
  const [appletLoaded, setAppletLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [customCommand, setCustomCommand] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<number>(0);
  const [scriptLog, setScriptLog] = useState<string[]>([]);
  const [useIframeFallback, setUseIframeFallback] = useState(false);

  // Executa comando no GeoGebra
  const runGGBCommand = useCallback((cmd: string) => {
    if (!cmd || !cmd.trim()) return;
    try {
      const ggbApplet = window[appletId];
      if (ggbApplet && typeof ggbApplet.evalCommand === "function") {
        ggbApplet.evalCommand(cmd.trim());
        setScriptLog((prev) => {
          const updated = [...prev.slice(-15), `✓ ${cmd.trim()}`];
          if (onCommandsChange) {
            onCommandsChange(updated.filter((c) => c.startsWith("✓ ")).map((c) => c.slice(2)));
          }
          return updated;
        });
      } else {
        console.warn("Applet GeoGebra ainda não inicializado para executar:", cmd);
      }
    } catch (err) {
      console.error("Erro ao executar comando GeoGebra:", err);
      setScriptLog((prev) => [...prev.slice(-15), `✗ Erro: ${cmd.trim()}`]);
    }
  }, [appletId, onCommandsChange]);

  // Executa lote de comandos
  const runBatchCommands = useCallback((commands: string[]) => {
    const ggbApplet = window[appletId];
    if (ggbApplet && typeof ggbApplet.reset === "function") {
      ggbApplet.reset();
    }
    commands.forEach((c) => {
      runGGBCommand(c);
    });
  }, [appletId, runGGBCommand]);

  // Inicialização do Script Oficial do GeoGebra com Timeout de Contingência Seguro
  useEffect(() => {
    let isMounted = true;

    // Timer de segurança: se a injeção do GeoGebra demorar mais de 12s (rede lenta/bloqueio), chaveia para iframe
    const fallbackTimer = setTimeout(() => {
      if (isMounted) {
        setUseIframeFallback((prev) => {
          if (!prev) {
            console.warn("Tempo limite de injeção GeoGebra atingido (12s). Ativando modo iframe.");
            return true;
          }
          return prev;
        });
        setAppletLoaded(true);
      }
    }, 12000);

    const initGeoGebra = () => {
      if (!isMounted) return;
      if (window.GGBApplet) {
        try {
          const params = {
            id: appletId,
            appName: "geometry",
            width: 800,
            height: 520,
            showToolBar: true,
            showAlgebraInput: true,
            showMenuBar: false,
            showResetIcon: true,
            enableLabelDrags: true,
            enableShiftDragZoom: true,
            enableRightClick: true,
            showToolBarHelp: false,
            errorDialogsActive: false,
            useBrowserForJS: true,
            appletOnLoad: () => {
              if (isMounted) {
                clearTimeout(fallbackTimer);
                setAppletLoaded(true);
                // Executa comandos iniciais se houver
                if (initialCommands && initialCommands.length > 0) {
                  initialCommands.forEach((c) => runGGBCommand(c));
                } else if (PRESET_CONSTRUCTIONS[0]) {
                  PRESET_CONSTRUCTIONS[0].comandos.forEach((c) => runGGBCommand(c));
                }
              }
            },
          };

          const applet = new window.GGBApplet(params, true);
          applet.inject(appletId);
        } catch (err) {
          console.warn("Falha na injeção do GeoGebra deployggb, usando iframe:", err);
          setUseIframeFallback(true);
          setAppletLoaded(true);
        }
      } else {
        setUseIframeFallback(true);
        setAppletLoaded(true);
      }
    };

    // Carrega o script deployggb.js de forma não-bloqueante
    if (!window.GGBApplet && !document.getElementById("ggb-script")) {
      const script = document.createElement("script");
      script.id = "ggb-script";
      script.src = "https://www.geogebra.org/apps/deployggb.js";
      script.async = true;
      script.onload = () => initGeoGebra();
      script.onerror = () => {
        console.warn("Falha ao baixar script GeoGebra CDN, ativando iframe embed seguro.");
        if (isMounted) {
          setUseIframeFallback(true);
          setAppletLoaded(true);
        }
      };
      document.body.appendChild(script);
    } else if (window.GGBApplet) {
      initGeoGebra();
    } else {
      // Se o script já está no DOM aguardando load
      const existing = document.getElementById("ggb-script");
      if (existing) {
        existing.addEventListener("load", () => initGeoGebra());
        existing.addEventListener("error", () => {
          if (isMounted) {
            setUseIframeFallback(true);
            setAppletLoaded(true);
          }
        });
      }
    }

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
    };
  }, [appletId, initialCommands, runGGBCommand]);

  const handleApplyPreset = (index: number) => {
    setSelectedPreset(index);
    const preset = PRESET_CONSTRUCTIONS[index];
    if (preset) {
      runBatchCommands(preset.comandos);
    }
  };

  const handleReset = () => {
    const ggbApplet = window[appletId];
    if (ggbApplet && typeof ggbApplet.reset === "function") {
      ggbApplet.reset();
      setScriptLog(["✓ Quadro Geométrico reiniciado"]);
      if (onCommandsChange) {
        onCommandsChange([]);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col rounded-2xl border border-slate-200/90 dark:border-amber-500/25 bg-[#0e0d16] text-[#f5f0df] shadow-xl overflow-hidden transition-all ${
        isFullscreen ? "fixed inset-3 z-50 rounded-2xl" : "h-[580px] md:h-[640px] w-full"
      } ${className}`}
    >
      {/* BARRA SUPERIOR EDITORIAL */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#141224] border-b border-amber-500/20 select-none">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-[#d9b452] flex items-center justify-center border border-amber-500/25">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif-math text-sm font-semibold text-[#f5f0df] flex items-center gap-1.5">
              <span>Bancada de Geometria Euclidiana</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/15 text-[#d9b452] font-mono">
                Régua & Compasso
              </span>
            </h3>
          </div>
        </div>

        {/* PRESETS GEOMÉTRICOS RÁPIDOS */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] text-zinc-400 font-sans hidden lg:inline">
            Construções Axiomáticas:
          </span>
          <select
            value={selectedPreset}
            onChange={(e) => handleApplyPreset(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-amber-500/20 text-xs text-[#d9b452] font-semibold outline-none hover:border-amber-500/40 transition cursor-pointer"
          >
            {PRESET_CONSTRUCTIONS.map((p, idx) => (
              <option key={p.nome} value={idx}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>

        {/* AÇÕES DE TELA */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setUseIframeFallback(!useIframeFallback);
              setAppletLoaded(true);
            }}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono border transition-all ${
              useIframeFallback
                ? "bg-amber-500/20 text-[#d9b452] border-amber-500/40"
                : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200"
            }`}
            title="Alternar entre motor GeoGebra Script e Iframe Oficial"
          >
            {useIframeFallback ? "Modo Iframe" : "Modo Script"}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors"
            title="Reiniciar Geometria"
          >
            <RotateCcw className="w-4 h-4" />
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
              title="Fechar Bancada"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ÁREA CENTRAL: GEOGEBRA EMBED + PAINEL DE SCRIPT LATERAL/INFERIOR */}
      <div className="relative flex-1 flex flex-col md:flex-row overflow-hidden bg-white">
        
        {/* CONTAINER DO GEOGEBRA */}
        <div className="relative flex-1 h-full min-h-[380px] bg-slate-50 flex items-center justify-center overflow-hidden">
          {useIframeFallback ? (
            <iframe
              src="https://www.geogebra.org/geometry?embed"
              title="GeoGebra Geometry Suite"
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={() => setAppletLoaded(true)}
            />
          ) : (
            <div id={appletId} className="w-full h-full flex items-center justify-center" />
          )}

          {!appletLoaded && !useIframeFallback && (
            <div className="absolute inset-0 bg-[#0e0d16]/90 flex flex-col items-center justify-center gap-3 z-10 text-[#d9b452] p-4 text-center">
              <Compass className="w-8 h-8 animate-spin" />
              <p className="text-xs font-mono">Calibrando Régua e Compasso Euclidiano...</p>
              <button
                type="button"
                onClick={() => {
                  setUseIframeFallback(true);
                  setAppletLoaded(true);
                }}
                className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-[11px] font-sans text-[#f5f0df] transition-all cursor-pointer shadow-xs"
              >
                Carregar no Modo Iframe (Direto)
              </button>
            </div>
          )}
        </div>

        {/* CONSOLE DE COMANDOS FORMAIS (SCRIPTING DE LEMAS) */}
        <div className="w-full md:w-72 bg-[#110f1e] border-t md:border-t-0 md:border-l border-amber-500/20 p-3 flex flex-col gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
            <Code2 className="w-3.5 h-3.5 text-amber-500" />
            <span>Execução de Lemas Geométricos</span>
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
            Digite comandos formais em sintaxe GeoGebra ou aplique construções axiomáticas.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              runGGBCommand(customCommand);
              setCustomCommand("");
            }}
            className="flex items-center gap-1.5"
          >
            <input
              type="text"
              value={customCommand}
              onChange={(e) => setCustomCommand(e.target.value)}
              placeholder="Ex: C = Circle((0,0), 5)"
              className="flex-1 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-amber-500/20 text-[#f5f0df] text-xs font-mono outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              className="p-2 rounded-xl lemmas-gold-cta font-bold shadow-xs shrink-0"
              title="Executar comando"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
          </form>

          {/* HISTÓRICO DE COMANDOS EXECUTADOS */}
          <div className="flex-1 min-h-[90px] max-h-[140px] md:max-h-none overflow-y-auto rounded-xl bg-zinc-950 p-2 font-mono text-[10px] space-y-1 text-zinc-400 border border-zinc-800">
            {scriptLog.length === 0 ? (
              <span className="text-zinc-600 italic">Nenhum comando executado ainda.</span>
            ) : (
              scriptLog.map((log, i) => (
                <div key={i} className={log.startsWith("✓") ? "text-emerald-400" : "text-rose-400"}>
                  {log}
                </div>
              ))
            )}
          </div>

          {/* GUIA RÁPIDO DE SINTAXE */}
          <div className="p-2 rounded-xl bg-amber-500/5 border border-amber-500/15 text-[10px] text-zinc-400 space-y-1">
            <span className="font-bold text-[#d9b452] block">Comandos Comuns:</span>
            <div className="space-y-0.5 font-mono text-zinc-300">
              <div>• Segment(A, B)</div>
              <div>• Midpoint(A, B)</div>
              <div>• PerpendicularLine(A, s)</div>
              <div>• AngleBisector(A, B, C)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
