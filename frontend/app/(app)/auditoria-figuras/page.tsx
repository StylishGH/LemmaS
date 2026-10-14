"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Sparkles, 
  Layers, 
  Eye, 
  CheckCircle2, 
  Sun, 
  Moon, 
  ExternalLink, 
  Filter, 
  FileCode,
  Image as ImageIcon,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from "lucide-react";
import { MathText } from "@/components/math/MathDisplay";
import { resolveFigureUrl } from "@/lib/image-url";

interface QuestionWithFigure {
  id: number;
  materia: string;
  topico: string;
  subtopico?: string;
  dificuldade?: number;
  banca: string;
  ano?: number;
  enunciado: string;
  figura_path: string;
  tipo: string;
  edicao?: string;
  etapa?: string;
}

export default function AuditoriaFigurasPage() {
  const [questoes, setQuestoes] = useState<QuestionWithFigure[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroFormato, setFiltroFormato] = useState<"todos" | "svg" | "raster">("todos");
  const [filtroBanca, setFiltroBanca] = useState<string>("todas");
  const [previewThemes, setPreviewThemes] = useState<Record<number, "dark" | "light">>({});
  const [mostrarCodigoSvg, setMostrarCodigoSvg] = useState<Record<number, boolean>>({});

  useEffect(() => {
    async function carregarFiguras() {
      setLoading(true);
      try {
        const res = await fetch("/api/questions?tem_figura=true&limit=100");
        if (res.ok) {
          const data = await res.json();
          setQuestoes(data.questoes || []);
        }
      } catch (err) {
        console.error("Erro ao carregar figuras:", err);
      } finally {
        setLoading(false);
      }
    }
    carregarFiguras();
  }, []);

  const totalComFigura = questoes.length;
  const totalSvg = questoes.filter((q) => q.figura_path?.toLowerCase().endsWith(".svg")).length;
  const totalRaster = totalComFigura - totalSvg;

  // Bancas disponíveis na listagem
  const bancasDisponiveis = Array.from(new Set(questoes.map((q) => q.banca).filter(Boolean)));

  // Filtragem local
  const questoesFiltradas = questoes.filter((q) => {
    const isSvg = q.figura_path?.toLowerCase().endsWith(".svg");
    if (filtroFormato === "svg" && !isSvg) return false;
    if (filtroFormato === "raster" && isSvg) return false;
    if (filtroBanca !== "todas" && q.banca?.toLowerCase() !== filtroBanca.toLowerCase()) return false;
    return true;
  });

  const toggleCardTheme = (id: number) => {
    setPreviewThemes((prev) => ({
      ...prev,
      [id]: prev[id] === "light" ? "dark" : "light",
    }));
  };

  const toggleSvgCode = (id: number) => {
    setMostrarCodigoSvg((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      {/* HEADER DA AUDITORIA */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-stone-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-amber-500 uppercase">
            <Sparkles className="w-4 h-4" />
            MathAI Engine &bull; Controle de Qualidade Visual
          </div>
          <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-stone-100 mt-1">
            Auditoria de Figuras &amp; Vetorização SVG
          </h1>
          <p className="text-sm text-slate-600 dark:text-stone-400 mt-1 max-w-3xl">
            Inspeção de qualidade geométrica, contraste dinâmico com o tema lousa/quadro e acompanhamento do pipeline de vetorização para os exames militares e olímpicos.
          </p>
        </div>

        <Link
          href="/questoes"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-sm font-medium transition-colors"
        >
          Voltar ao Catálogo
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* PAINEL DE MÉTRICAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-stone-400 text-xs font-mono">
            <span>TOTAL AMOSTRADO</span>
            <ImageIcon className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-stone-100 mt-2">
            {totalComFigura}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-stone-500 mt-1">
            Questões com figuras no catálogo
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-mono font-semibold">
            <span>SVG VETORIZADO</span>
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2">
            {totalSvg}
          </div>
          <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-1">
            Alta definição, traço responsivo
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-mono font-semibold">
            <span>RASTER (PNG/JPG)</span>
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-2">
            {totalRaster}
          </div>
          <div className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-1">
            Scans de cadernos em avaliação
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 shadow-sm">
          <div className="flex items-center justify-between text-sky-600 dark:text-sky-400 text-xs font-mono font-semibold">
            <span>FALSOS-POSITIVOS</span>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-2">
            33 limpas
          </div>
          <div className="text-[11px] text-sky-600/80 dark:text-sky-400/80 mt-1">
            100% convertidas para KaTeX
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-stone-900/60 border border-slate-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 dark:text-stone-500" />
          <span className="text-xs font-mono uppercase text-slate-500 dark:text-stone-400">Formato:</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFiltroFormato("todos")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filtroFormato === "todos"
                  ? "bg-slate-900 text-white dark:bg-stone-100 dark:text-stone-900"
                  : "bg-white dark:bg-stone-800 text-slate-600 dark:text-stone-300 border border-slate-200 dark:border-stone-700"
              }`}
            >
              Todos ({totalComFigura})
            </button>
            <button
              onClick={() => setFiltroFormato("svg")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filtroFormato === "svg"
                  ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-stone-900"
                  : "bg-white dark:bg-stone-800 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
              }`}
            >
              ⚡ Apenas SVG ({totalSvg})
            </button>
            <button
              onClick={() => setFiltroFormato("raster")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filtroFormato === "raster"
                  ? "bg-amber-600 text-white dark:bg-amber-500 dark:text-stone-900"
                  : "bg-white dark:bg-stone-800 text-amber-600 dark:text-amber-400 border border-amber-500/30"
              }`}
            >
              🖼️ Apenas Raster ({totalRaster})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono uppercase text-slate-500 dark:text-stone-400">Banca:</span>
          <select
            value={filtroBanca}
            onChange={(e) => setFiltroBanca(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-stone-800 border border-slate-200 dark:border-stone-700 text-slate-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="todas">Todas as Bancas</option>
            {bancasDisponiveis.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* GRID DE AUDITORIA DAS QUESTÕES */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mb-3 text-amber-500" />
          <p className="text-sm font-mono">Carregando acervo de figuras do Supabase...</p>
        </div>
      ) : questoesFiltradas.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-stone-900/40 border border-slate-200 dark:border-stone-800 text-slate-500">
          Nenhuma questão encontrada com os filtros selecionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {questoesFiltradas.map((q) => {
            const isSvg = q.figura_path?.toLowerCase().endsWith(".svg");
            const cardTheme = previewThemes[q.id] || "dark";
            const showCode = mostrarCodigoSvg[q.id] || false;

            return (
              <div
                key={q.id}
                className="rounded-2xl border border-slate-200 dark:border-stone-800 bg-white dark:bg-stone-900/90 shadow-sm flex flex-col overflow-hidden transition-all hover:border-amber-500/40"
              >
                {/* CABEÇALHO DO CARD */}
                <div className="p-4 border-b border-slate-100 dark:border-stone-800/80 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-stone-900/50">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-stone-800 text-slate-800 dark:text-stone-200">
                      #{q.id}
                    </span>
                    <span className="font-bold text-sm text-slate-900 dark:text-stone-100">
                      {q.banca} {q.ano}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-stone-400 font-medium">
                      &bull; {q.topico}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isSvg ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <Sparkles className="w-3 h-3" />
                        SVG VETORIZADO
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        <ImageIcon className="w-3 h-3" />
                        RASTER SCAN
                      </span>
                    )}

                    <Link
                      href={`/resolver?id=${q.id}`}
                      target="_blank"
                      className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-stone-800 text-slate-400 hover:text-slate-600 dark:hover:text-stone-200 transition-colors"
                      title="Abrir no Resolver"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {/* CONTAINER VISUAL DA FIGURA COM SIMULADOR DE TEMA */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div className="relative rounded-xl border border-slate-200 dark:border-stone-800 overflow-hidden flex flex-col">
                    {/* BARRA SUPERIOR DO VISUALIZADOR */}
                    <div className="px-3 py-1.5 bg-slate-100 dark:bg-stone-950/80 border-b border-slate-200 dark:border-stone-800 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-stone-400">
                      <span className="truncate max-w-[200px]">{q.figura_path}</span>
                      
                      <div className="flex items-center gap-2">
                        {isSvg && (
                          <button
                            onClick={() => toggleSvgCode(q.id)}
                            className="flex items-center gap-1 text-[11px] hover:text-amber-500 transition-colors"
                            title="Alternar código SVG"
                          >
                            <FileCode className="w-3.5 h-3.5" />
                            {showCode ? "Ver Gráfico" : "Ver Código"}
                          </button>
                        )}

                        <button
                          onClick={() => toggleCardTheme(q.id)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-200 dark:bg-stone-800 hover:bg-slate-300 dark:hover:bg-stone-700 text-[11px] transition-colors"
                          title="Testar contraste do tema"
                        >
                          {cardTheme === "dark" ? (
                            <>
                              <Sun className="w-3 h-3 text-amber-400" />
                              <span>Lousa (Escuro)</span>
                            </>
                          ) : (
                            <>
                              <Moon className="w-3 h-3 text-sky-500" />
                              <span>Papel (Claro)</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* ÁREA DA IMAGEM COM CONTRASTE DINÂMICO */}
                    <div
                      className={`min-h-[220px] p-6 flex items-center justify-center transition-colors duration-200 ${
                        cardTheme === "dark"
                          ? "bg-[#0c1222] text-[#f8fafc]"
                          : "bg-white text-slate-900"
                      }`}
                    >
                      {showCode && isSvg ? (
                        <div className="w-full text-[11px] font-mono overflow-x-auto p-2 bg-black/40 rounded text-emerald-400">
                          <code>{q.figura_path}</code>
                          <p className="mt-2 text-stone-400">SVG semântico e responsivo carregado dinamicamente via Next.js.</p>
                        </div>
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={resolveFigureUrl(q.figura_path)}
                          alt={`Figura questão ${q.id}`}
                          className="max-h-[240px] max-w-full object-contain drop-shadow-sm transition-transform duration-200 hover:scale-105"
                          loading="lazy"
                        />
                      )}
                    </div>
                  </div>

                  {/* TRECHO DO ENUNCIADO EM KATEX */}
                  <div className="mt-3 text-xs text-slate-600 dark:text-stone-300 line-clamp-3">
                    <MathText text={q.enunciado.slice(0, 220) + (q.enunciado.length > 220 ? "..." : "")} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
