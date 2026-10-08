"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Search, 
  Sparkles,
  CheckCircle2,
  Play,
  RotateCcw,
  Loader2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { extrairEnunciadoEAlternativas, corrigirLatex } from "@/lib/math-parser";

interface Question {
  id: number;
  materia: string;
  topico: string;
  subtopico?: string;
  banca?: string;
  ano?: number;
  dificuldade?: string;
  tipo: string;
  enunciado: string;
  gabarito: string;
}

export default function BancoQuestoesPage() {
  const [bancaFiltro, setBancaFiltro] = useState<string>("Todas");
  const [topicoFiltro, setTopicoFiltro] = useState<string>("Todos");
  const [busca, setBusca] = useState<string>("");
  const [gabaritosRevelados, setGabaritosRevelados] = useState<Set<number>>(new Set());
  
  const [questoes, setQuestoes] = useState<Question[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  const bancas = ["Todas", "EFOMM", "CEDERJ", "ESA"];
  const topicos = ["Todos", "Cálculo", "Álgebra Linear", "Álgebra", "Funções", "Geometria Espacial", "Trigonometria", "Matemática Básica"];

  useEffect(() => {
    let ignore = false;
    setLoading(true);

    const params = new URLSearchParams({
      page: page.toString(),
      limit: "15",
    });

    if (bancaFiltro !== "Todas") params.set("banca", bancaFiltro);
    if (topicoFiltro !== "Todos") params.set("topico", topicoFiltro);
    if (busca.trim()) params.set("search", busca.trim());

    fetch(`/api/questions?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) {
          if (data && data.questoes) {
            setQuestoes(data.questoes);
            setTotal(data.total || 0);
            setTotalPages(data.total_pages || 1);
          } else {
            setQuestoes([]);
            setTotal(0);
            setTotalPages(1);
          }
        }
      })
      .catch((err) => {
        console.error("Erro ao carregar questões:", err);
        if (!ignore) {
          setQuestoes([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [bancaFiltro, topicoFiltro, busca, page]);

  const toggleGabarito = (id: number) => {
    const next = new Set(gabaritosRevelados);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setGabaritosRevelados(next);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      {/* 1. HEADER EDITORIAL NO ESTILO LEMMAS */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-2">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-[#d9b452] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{total} Questões & Lemas no Supabase · MathAI Engine</span>
          </div>
          <h1 className="font-serif-math text-3xl md:text-4xl font-normal text-slate-900 dark:text-[#f5f0df] tracking-tight">
            Banco de <em className="italic text-amber-600 dark:text-[#d9b452] font-serif-math">Questões & Teoremas.</em>
          </h1>
          <p className="text-xs md:text-sm text-slate-600 dark:text-[#a9aaa1] max-w-2xl leading-relaxed">
            Consulte problemas com LaTeX de alta precisão, filtre por banca ou assunto e investigue seu raciocínio.
          </p>
        </div>

        <Link
          href="/resolver"
          className="lemmas-gold-cta inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs shadow-md transition-all hover:scale-[1.02]"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Iniciar Simulado Rápido</span>
        </Link>
      </div>

      {/* 2. FILTROS E PESQUISA NO PADRÃO LEMMAS */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#141222] border border-slate-200/90 dark:border-amber-500/20 shadow-sm space-y-5">
        {/* BUSCA DE PROBLEMAS */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 dark:text-[#a9aaa1] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por termo ou enunciado da questão..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-[#f5f0df] outline-none focus:border-amber-500/50 dark:focus:border-[#d9b452] transition-colors"
          />
        </div>

        {/* PÍLULAS DE BANCA */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-slate-600 dark:text-[#d9b452] uppercase tracking-wider">
            Banca / Concurso Militar Alvo:
          </div>
          <div className="flex flex-wrap gap-2">
            {bancas.map((b) => {
              const isSelected = bancaFiltro === b;
              return (
                <button
                  key={b}
                  onClick={() => {
                    setBancaFiltro(b);
                    setPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-amber-500 dark:bg-[#d9b452] text-slate-900 font-bold shadow-sm"
                      : "bg-slate-100 dark:bg-zinc-900/60 text-slate-600 dark:text-[#dedbd0] hover:bg-slate-200 dark:hover:bg-zinc-800"
                  }`}
                >
                  {b}
                </button>
              );
            })}
          </div>
        </div>

        {/* PÍLULAS DE TÓPICO */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-slate-600 dark:text-[#d9b452] uppercase tracking-wider">
            Tópico Matemático:
          </div>
          <div className="flex flex-wrap gap-2">
            {topicos.map((t) => {
              const isSelected = topicoFiltro === t;
              return (
                <button
                  key={t}
                  onClick={() => {
                    setTopicoFiltro(t);
                    setPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-violet-600 text-white font-bold shadow-sm"
                      : "bg-slate-100 dark:bg-zinc-900/60 text-slate-600 dark:text-[#dedbd0] hover:bg-slate-200 dark:hover:bg-zinc-800"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. LISTA DE QUESTÕES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#a9aaa1] font-medium px-1">
          <span>Mostrando página {page} de {totalPages || 1} ({total} questões totais)</span>
          {(bancaFiltro !== "Todas" || topicoFiltro !== "Todos" || busca !== "") && (
            <button
              onClick={() => {
                setBancaFiltro("Todas");
                setTopicoFiltro("Todos");
                setBusca("");
                setPage(1);
              }}
              className="text-amber-600 dark:text-[#d9b452] hover:underline flex items-center gap-1 font-semibold"
            >
              <RotateCcw className="w-3 h-3" /> Limpar filtros
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400 dark:text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <span className="text-sm">Carregando questões do Supabase...</span>
          </div>
        ) : questoes.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#141222] border border-slate-200 dark:border-zinc-800 text-slate-500 space-y-3">
            <p className="text-sm">Nenhuma questão encontrada para os filtros selecionados.</p>
            <button
              onClick={() => {
                setBancaFiltro("Todas");
                setTopicoFiltro("Todos");
                setBusca("");
                setPage(1);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-[#d9b452] text-xs font-semibold hover:bg-amber-500/20 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Ver todas as 288 questões</span>
            </button>
          </div>
        ) : (
          questoes.map((q) => {
            const revelado = gabaritosRevelados.has(q.id);
            const { corpo, alternativas } = extrairEnunciadoEAlternativas(q.enunciado);

            return (
              <div
                key={q.id}
                className="p-6 rounded-2xl bg-white dark:bg-[#141222] border border-slate-200/90 dark:border-amber-500/15 hover:border-amber-500/35 dark:hover:border-[#d9b452]/40 shadow-sm transition-all space-y-4"
              >
                {/* TOPO DO CARD */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-zinc-800/60">
                  <div className="flex items-center gap-2.5">
                    {q.banca && (
                      <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-[#d9b452] text-xs font-bold">
                        {q.banca} {q.ano || ""}
                      </span>
                    )}
                    <span className="text-xs text-slate-300 dark:text-zinc-700">•</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-[#dedbd0]">{q.materia} · {q.topico}</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs text-slate-400 dark:text-zinc-500 font-semibold">
                      Lema #{q.id.toString().padStart(2, "0")}
                    </span>
                  </div>
                </div>

                {/* ENUNCIADO MATEMÁTICO */}
                <div className="text-sm md:text-base font-medium text-slate-900 dark:text-[#f5f0df] leading-relaxed whitespace-pre-line">
                  {corrigirLatex(corpo)}
                </div>

                {/* PREVIEW DE ALTERNATIVAS */}
                {Object.keys(alternativas).length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                    {Object.entries(alternativas).map(([letra, valor]) => (
                      <div
                        key={letra}
                        className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 text-xs text-slate-700 dark:text-zinc-300 flex items-center gap-2"
                      >
                        <span className="font-bold text-amber-600 dark:text-[#d9b452]">{letra})</span>
                        <span className="font-mono">{valor}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* RODAPÉ DO CARD */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800/60">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleGabarito(q.id)}
                      className="text-xs font-semibold text-slate-600 dark:text-[#a9aaa1] hover:text-amber-600 dark:hover:text-[#d9b452] transition-colors"
                    >
                      {revelado ? `Gabarito: [${q.gabarito}] (Ocultar)` : "Revelar Gabarito"}
                    </button>
                    {revelado && (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Alternativa Oficial: {q.gabarito}
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/resolver?id=${q.id}`}
                    className="lemmas-gold-cta px-4 py-2 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all hover:scale-[1.02]"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Treinar no Simulador</span>
                  </Link>
                </div>
              </div>
            );
          })
        )}

        {/* PAGINAÇÃO */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#141222] border border-slate-200 dark:border-zinc-800 text-xs disabled:opacity-40 flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Anterior
            </button>
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#141222] border border-slate-200 dark:border-zinc-800 text-xs disabled:opacity-40 flex items-center gap-1"
            >
              Próxima <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
