"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Sparkles,
  CheckCircle2,
  Play,
  RotateCcw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Check,
  BookOpen,
  Filter,
  Layers,
  Calendar,
  SlidersHorizontal,
  X,
  HelpCircle,
  FileText,
  CheckSquare,
  Square,
  Timer,
} from "lucide-react";
import { extrairEnunciadoEAlternativas } from "@/lib/math-parser";
import { MathText } from "@/components/math/MathDisplay";
import { CriarSimuladoModal } from "@/components/CriarSimuladoModal";

interface Question {
  id: number;
  materia: string;
  topico: string;
  subtopico?: string;
  banca?: string;
  ano?: number;
  dificuldade?: number | null;
  tipo: string;
  enunciado: string;
  gabarito: string;
}

// ============================================================
// HELPERS DE FILTRO MULTI-SELECT
// Todos os filtros são string[] contendo os valores selecionados.
// O valor coringa ("Todas"/"Todos") sozinho significa "sem filtro".
// ============================================================

const VAL_TODAS = "Todas";
const VAL_TODOS = "Todos";

// Quantos valores reais (não-coringa) estão selecionados
const numSelecionados = (arr: string[], valorCoringa: string) =>
  arr.filter((v) => v !== valorCoringa).length;

// Lista legível dos valores selecionados: "EFOMM, CEDERJ"
const joinSelecionados = (arr: string[], valorCoringa: string) =>
  arr.filter((v) => v !== valorCoringa).join(", ");

// Converte o estado string[] em parâmetro de query (?banca=EFOMM,CEDERJ) ou null
const paramFromFiltro = (arr: string[]) => {
  const vals = arr.filter((v) => v !== VAL_TODAS && v !== VAL_TODOS);
  return vals.length > 0 ? vals.join(",") : null;
};

// Cores semânticas por grande área matemática para visualização editorial limpa
function getMateriaBadgeColor(materia?: string) {
  const m = (materia || "").toLowerCase();
  if (m.includes("cálculo")) {
    return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25";
  }
  if (m.includes("álgebra linear")) {
    return "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/25";
  }
  if (m.includes("analítica") || m.includes("espacial") || m.includes("plana") || m.includes("geometria")) {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25";
  }
  if (m.includes("trigonometria")) {
    return "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25";
  }
  if (m.includes("probabilidade") || m.includes("estatística") || m.includes("combinatória")) {
    return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25";
  }
  if (m.includes("física")) {
    return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/25";
  }
  if (m.includes("polinôm") || m.includes("complex")) {
    return "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/25";
  }
  return "bg-amber-500/10 text-amber-800 dark:text-[#d9b452] border-amber-500/25";
}

// Badge de Dificuldade
function renderDificuldadeBadge(dificuldade?: number | null) {
  if (dificuldade === null || dificuldade === undefined) {
    return (
      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/60 text-slate-500 dark:text-zinc-400 font-medium">
        Não Classificada
      </span>
    );
  }
  if (dificuldade <= 2) {
    return (
      <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 font-semibold">
        Fácil ({dificuldade}/5)
      </span>
    );
  }
  if (dificuldade === 3) {
    return (
      <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-[#d9b452] font-semibold">
        Média (3/5)
      </span>
    );
  }
  return (
    <span className="text-[11px] px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-400 font-semibold">
      Difícil ({dificuldade}/5)
    </span>
  );
}

export default function BancoQuestoesPage() {
  const router = useRouter();

  // Estado dos filtros — todos multi-select (arrays)
  const [bancaFiltro, setBancaFiltro] = useState<string[]>([VAL_TODAS]);
  const [materiaFiltro, setMateriaFiltro] = useState<string[]>([VAL_TODAS]);
  const [topicoFiltro, setTopicoFiltro] = useState<string[]>([VAL_TODOS]);
  const [anoFiltro, setAnoFiltro] = useState<string[]>([VAL_TODOS]);
  const [tipoFiltro, setTipoFiltro] = useState<string[]>([VAL_TODOS]);
  const [dificuldadeFiltro, setDificuldadeFiltro] = useState<string[]>([VAL_TODAS]);
  const [busca, setBusca] = useState<string>("");

  const [mostrarFiltrosAvancados, setMostrarFiltrosAvancados] = useState<boolean>(true);
  const [gabaritosRevelados, setGabaritosRevelados] = useState<Set<number>>(new Set());

  // Estado de Seleção em Lote de Questões para Treino / Simulado
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [modalSimuladoAberto, setModalSimuladoAberto] = useState<boolean>(false);

  // Estado dos dados da página
  const [questoes, setQuestoes] = useState<Question[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  // Facets dinâmicos carregados da API
  const [bancasDisponiveis, setBancasDisponiveis] = useState<{ name: string; count: number }[]>([
    { name: VAL_TODAS, count: 288 },
    { name: "EFOMM", count: 202 },
    { name: "CEDERJ", count: 74 },
    { name: "ESA", count: 12 },
  ]);

  const [materiasDisponiveis, setMateriasDisponiveis] = useState<{ name: string; count: number }[]>([]);
  const [topicosDisponiveis, setTopicosDisponiveis] = useState<{ name: string; count: number }[]>([]);
  const [materiasComTopicos, setMateriasComTopicos] = useState<{
    name: string;
    count: number;
    topicos: { name: string; count: number }[];
  }[]>([]);
  const [expandedMaterias, setExpandedMaterias] = useState<Set<string>>(new Set());

  const [anosDisponiveis, setAnosDisponiveis] = useState<{ ano: number; label?: string; count: number }[]>([]);
  const [anoDropdownOpen, setAnoDropdownOpen] = useState<boolean>(false);
  const anoDropdownRef = useRef<HTMLDivElement>(null);

  const [topicoDropdownOpen, setTopicoDropdownOpen] = useState<boolean>(false);
  const [buscaTopicoInterna, setBuscaTopicoInterna] = useState<string>("");
  const topicoDropdownRef = useRef<HTMLDivElement>(null);

  const [tiposDisponiveis, setTiposDisponiveis] = useState<{ id: string; label: string; count: number }[]>([]);
  const [dificuldadesDisponiveis, setDificuldadesDisponiveis] = useState<{ id: string; label: string; count: number }[]>([]);

  // Fecha os dropdowns de ano e tópicos ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (anoDropdownRef.current && !anoDropdownRef.current.contains(event.target as Node)) {
        setAnoDropdownOpen(false);
      }
      if (topicoDropdownRef.current && !topicoDropdownRef.current.contains(event.target as Node)) {
        setTopicoDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleExpandMateria = (nome: string) => {
    setExpandedMaterias((prev) => {
      const next = new Set(prev);
      if (next.has(nome)) next.delete(nome);
      else next.add(nome);
      return next;
    });
  };

  // Contadores derivados dos filtros
  const numBancas = numSelecionados(bancaFiltro, VAL_TODAS);
  const numMaterias = numSelecionados(materiaFiltro, VAL_TODAS);
  const numTopicos = numSelecionados(topicoFiltro, VAL_TODOS);
  const numAnos = numSelecionados(anoFiltro, VAL_TODOS);
  const numTipos = numSelecionados(tipoFiltro, VAL_TODOS);
  const numDificuldades = numSelecionados(dificuldadeFiltro, VAL_TODAS);

  // ============================================================
  // TOGGLE MULTI-SELECT COMPARTILHADO
  // - clicar no coringa ("Todas"/"Todos") → reseta a dimensão
  // - clicar num valor já selecionado → remove (volta ao coringa se esvaziar)
  // - clicar num valor novo → adiciona e remove o coringa
  // ============================================================
  const toggleFiltro = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    valor: string,
    valorCoringa: string
  ) => {
    setter((prev) => {
      if (valor === valorCoringa) return [valorCoringa];
      const semCoringa = prev.filter((v) => v !== valorCoringa);
      if (semCoringa.includes(valor)) {
        const next = semCoringa.filter((v) => v !== valor);
        return next.length > 0 ? next : [valorCoringa];
      }
      return [...semCoringa, valor];
    });
    setPage(1);
  };

  const handleSelectBanca = (b: string) => toggleFiltro(setBancaFiltro, b, VAL_TODAS);
  const handleSelectMateria = (m: string) => {
    toggleFiltro(setMateriaFiltro, m, VAL_TODAS);
    if (m !== VAL_TODAS) {
      setExpandedMaterias((prev) => new Set([...prev, m]));
    }
  };
  const handleSelectTopico = (t: string) => toggleFiltro(setTopicoFiltro, t, VAL_TODOS);
  const handleSelectAno = (a: string) => toggleFiltro(setAnoFiltro, a, VAL_TODOS);
  const handleSelectTipo = (t: string) => toggleFiltro(setTipoFiltro, t, VAL_TODOS);
  const handleSelectDificuldade = (d: string) => toggleFiltro(setDificuldadeFiltro, d, VAL_TODAS);

  const limparFiltros = () => {
    setBancaFiltro([VAL_TODAS]);
    setMateriaFiltro([VAL_TODAS]);
    setTopicoFiltro([VAL_TODOS]);
    setAnoFiltro([VAL_TODOS]);
    setTipoFiltro([VAL_TODOS]);
    setDificuldadeFiltro([VAL_TODAS]);
    setBusca("");
    setPage(1);
  };

  // Carregamento de questões com parâmetros sincronizados
  useEffect(() => {
    let ignore = false;
    setLoading(true);

    const params = new URLSearchParams({
      page: page.toString(),
      limit: "15",
    });

    const bancaParam = paramFromFiltro(bancaFiltro);
    if (bancaParam) params.set("banca", bancaParam);
    const materiaParam = paramFromFiltro(materiaFiltro);
    if (materiaParam) params.set("materia", materiaParam);
    const topicoParam = paramFromFiltro(topicoFiltro);
    if (topicoParam) params.set("topico", topicoParam);
    const anoParam = paramFromFiltro(anoFiltro);
    if (anoParam) params.set("ano", anoParam);
    const tipoParam = paramFromFiltro(tipoFiltro);
    if (tipoParam) params.set("tipo", tipoParam);
    const dificuldadeParam = paramFromFiltro(dificuldadeFiltro);
    if (dificuldadeParam) params.set("dificuldade", dificuldadeParam);
    if (busca.trim()) params.set("search", busca.trim());

    fetch(`/api/questions?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) {
          if (data && data.questoes) {
            setQuestoes(data.questoes);
            setTotal(data.total || 0);
            setTotalPages(data.total_pages || 1);

            if (data.bancas && Array.isArray(data.bancas)) {
              setBancasDisponiveis(data.bancas);
            }
            if (data.materias && Array.isArray(data.materias)) {
              setMateriasDisponiveis(data.materias);
              // Descarta matérias selecionadas que não existem mais nos facets
              const names = data.materias.map((m: { name: string }) => m.name);
              const validas = materiaFiltro.filter((v) => v === VAL_TODAS || names.includes(v));
              if (validas.length === 0) setMateriaFiltro([VAL_TODAS]);
              else if (validas.length !== materiaFiltro.length) setMateriaFiltro(validas);
            }
            if (data.materias_com_topicos && Array.isArray(data.materias_com_topicos)) {
              setMateriasComTopicos(data.materias_com_topicos);
            }
            if (data.topicos && Array.isArray(data.topicos)) {
              setTopicosDisponiveis(data.topicos);
              // Descarta tópicos selecionados que não existem mais nos facets
              const names = data.topicos.map((t: { name: string }) => t.name);
              const validos = topicoFiltro.filter((v) => v === VAL_TODOS || names.includes(v));
              if (validos.length === 0) setTopicoFiltro([VAL_TODOS]);
              else if (validos.length !== topicoFiltro.length) setTopicoFiltro(validos);
            }
            if (data.anos && Array.isArray(data.anos)) {
              setAnosDisponiveis(data.anos);
            }
            if (data.tipos && Array.isArray(data.tipos)) {
              setTiposDisponiveis(data.tipos);
            }
            if (data.dificuldades && Array.isArray(data.dificuldades)) {
              setDificuldadesDisponiveis(data.dificuldades);
            }
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
  }, [bancaFiltro, materiaFiltro, topicoFiltro, anoFiltro, tipoFiltro, dificuldadeFiltro, busca, page]);

  const toggleGabarito = (id: number) => {
    const next = new Set(gabaritosRevelados);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setGabaritosRevelados(next);
  };

  // Funções de Seleção de Questões
  const toggleSelectQuestion = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllPage = () => {
    const pageIds = questoes.map((q) => q.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Carrega IDs completos de acordo com os filtros atuais
  const fetchFilteredIds = async (): Promise<number[]> => {
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters: {
            banca: paramFromFiltro(bancaFiltro) || VAL_TODAS,
            materia: paramFromFiltro(materiaFiltro) || VAL_TODAS,
            topico: paramFromFiltro(topicoFiltro) || VAL_TODOS,
            ano: paramFromFiltro(anoFiltro) || VAL_TODOS,
            tipo: paramFromFiltro(tipoFiltro) || VAL_TODOS,
            dificuldade: paramFromFiltro(dificuldadeFiltro) || VAL_TODAS,
          },
          limit: 100,
        }),
      });
      const data = await res.json();
      if (data.questoes && Array.isArray(data.questoes)) {
        return data.questoes.map((q: any) => q.id);
      }
    } catch (e) {
      console.error("Erro ao buscar ids filtrados:", e);
    }
    return questoes.map((q) => q.id);
  };

  // Iniciar Modo Treino Livre (sem timer rígido, com IA e gabarito imediato)
  const handleTreinarListaEstudo = async () => {
    let ids: number[] = [];
    if (selectedIds.size > 0) {
      ids = Array.from(selectedIds);
    } else {
      ids = await fetchFilteredIds();
    }
    if (ids.length === 0) return;

    if (typeof window !== "undefined") {
      sessionStorage.setItem("lemmas_active_treino", JSON.stringify({
        modo: "treino",
        ids,
        nome: `Lista de Treino (${ids.length} questões)`,
        totalQuestoes: ids.length,
      }));
    }
    router.push(`/resolver?session=treino&total=${ids.length}`);
  };

  const filtrosAtivosCount = [
    numBancas > 0,
    numMaterias > 0,
    numTopicos > 0,
    numAnos > 0,
    numTipos > 0,
    numDificuldades > 0,
    busca.trim() !== "",
  ].filter(Boolean).length;

  const resumoFiltrosTexto = `${numBancas > 0 ? `Bancas: ${joinSelecionados(bancaFiltro, VAL_TODAS)}` : "Todas as bancas"}${
    numMaterias > 0 ? ` · ${joinSelecionados(materiaFiltro, VAL_TODAS)}` : ""
  }${numTopicos > 0 ? ` · ${joinSelecionados(topicoFiltro, VAL_TODOS)}` : ""}`;

  // Tópicos disponíveis no dropdown suspenso
  const topicosBaseDropdown = (() => {
    if (numMaterias > 0 && materiasComTopicos.length > 0) {
      const topicosDasMaterias = materiasComTopicos
        .filter((m) => materiaFiltro.includes(m.name))
        .flatMap((m) => m.topicos);
      if (topicosDasMaterias.length > 0) {
        const vistos = new Set<string>();
        return topicosDasMaterias.filter((t) => {
          if (vistos.has(t.name)) return false;
          vistos.add(t.name);
          return true;
        });
      }
    }
    return topicosDisponiveis.filter((t) => t.name !== VAL_TODOS);
  })();

  const topicosFiltradosDropdown = topicosBaseDropdown.filter((t) =>
    buscaTopicoInterna.trim() === ""
      ? true
      : t.name.toLowerCase().includes(buscaTopicoInterna.toLowerCase().trim())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* 1. HEADER EDITORIAL NO ESTILO LEMMAS */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-2">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-[#d9b452] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>288 Questões & Lemas no Supabase · MathAI Engine</span>
          </div>
          <h1 className="font-serif-math text-3xl md:text-4xl font-normal text-slate-900 dark:text-[#f5f0df] tracking-tight">
            Banco de <em className="italic text-amber-600 dark:text-[#d9b452] font-serif-math">Questões & Teoremas.</em>
          </h1>
          <p className="text-xs md:text-sm text-slate-600 dark:text-[#a9aaa1] max-w-2xl leading-relaxed">
            Consulte o acervo de problemas militares e acadêmicos com filtros por banca, tópicos, subtópicos, ano, tipo (objetiva/discursiva) e dificuldade auditada.
          </p>
        </div>

        <div className="flex flex-nowrap items-center gap-3">
          <button
            type="button"
            onClick={handleTreinarListaEstudo}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-amber-500/25 hover:bg-slate-100 dark:hover:bg-[#1a172c] text-slate-800 dark:text-[#f5f0df] font-semibold text-xs transition-all flex items-center gap-2 shadow-xs"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
            <span>Treinar Lista Livre ({selectedIds.size > 0 ? `${selectedIds.size} selecionadas` : `${total} filtradas`})</span>
          </button>

          <button
            type="button"
            onClick={() => setModalSimuladoAberto(true)}
            className="lemmas-gold-cta inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all hover:scale-[1.02]"
          >
            <Timer className="w-3.5 h-3.5" />
            <span>Criar Simulado ({selectedIds.size > 0 ? `${selectedIds.size} questões` : `${total} questões`})</span>
          </button>
        </div>
      </div>

      {/* 2. PAINEL DE CONTROLE DE FILTROS (TODAS AS DIMENSÕES MULTI-SELECT) */}
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
            placeholder="Buscar por termo, fórmula, Teorema de Stokes, matrizes, etc..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-[#f5f0df] outline-none focus:border-amber-500/50 dark:focus:border-[#d9b452] transition-colors"
          />
          {busca && (
            <button
              onClick={() => {
                setBusca("");
                setPage(1);
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* DIMENSÃO 1: BANCA / CONCURSO (MULTI-SELECT) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 dark:text-[#d9b452] uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-amber-500" />
              Banca / Concurso Militar Alvo{numBancas > 0 ? ` (${numBancas} selecionada${numBancas > 1 ? "s" : ""})` : ""}:
            </span>
            {numBancas > 0 && (
              <button
                onClick={() => handleSelectBanca(VAL_TODAS)}
                className="text-[11px] text-amber-600 dark:text-[#d9b452] hover:underline font-semibold"
              >
                Todas as bancas
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {bancasDisponiveis.map((b) => {
              const isSelected = bancaFiltro.includes(b.name);
              return (
                <button
                  key={b.name}
                  onClick={() => handleSelectBanca(b.name)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-amber-500 dark:bg-[#d9b452] text-slate-900 font-bold shadow-sm"
                      : "bg-slate-100 dark:bg-zinc-900/60 text-slate-600 dark:text-[#dedbd0] hover:bg-slate-200 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span>{b.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected
                      ? "bg-slate-900/20 text-slate-950 font-bold"
                      : "bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400"
                  }`}>
                    {b.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* DIMENSÃO 2: GRANDE ÁREA / MATÉRIA (PÍLULAS COMPACTAS LADO A LADO) */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800/60">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-violet-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-[#d9b452] uppercase tracking-wider">
                Grande Área / Matéria:
              </span>
              {numMaterias > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-300 font-bold">
                  {numMaterias} {numMaterias === 1 ? "selecionada" : "selecionadas"}
                </span>
              )}
            </div>

            {numMaterias > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMateriaFiltro([VAL_TODAS]);
                  setPage(1);
                }}
                className="text-xs text-amber-600 dark:text-[#d9b452] hover:underline font-semibold"
              >
                Limpar matérias
              </button>
            )}
          </div>

          {/* Botões / Pílulas lado a lado */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {materiasDisponiveis.map((m) => {
              const isSelected = materiaFiltro.includes(m.name);
              return (
                <button
                  key={m.name}
                  type="button"
                  onClick={() => handleSelectMateria(m.name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-violet-600 text-white font-bold shadow-sm"
                      : "bg-slate-100 dark:bg-zinc-900/60 text-slate-600 dark:text-[#dedbd0] hover:bg-slate-200 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span>{m.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected
                        ? "bg-white/20 text-white font-bold"
                        : "bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400"
                    }`}
                  >
                    {m.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* DIMENSÃO 3: TÓPICOS ESPECÍFICOS (DROPDOWN SUSPENSO COM SELEÇÃO MÚLTIPLA) */}
        <div className="relative pt-2" ref={topicoDropdownRef}>
          <div className="flex items-center justify-between pb-1.5">
            <div className="flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">
                Tópicos Específicos:
              </span>
              {numTopicos > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 font-bold">
                  {numTopicos} ativo(s)
                </span>
              )}
            </div>

            {numTopicos > 0 && (
              <button
                type="button"
                onClick={() => handleSelectTopico(VAL_TODOS)}
                className="text-[11px] text-amber-600 dark:text-[#d9b452] hover:underline font-semibold"
              >
                Limpar tópicos ({numTopicos})
              </button>
            )}
          </div>

          {/* Trigger do Dropdown de Tópicos */}
          <button
            type="button"
            onClick={() => setTopicoDropdownOpen(!topicoDropdownOpen)}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-between gap-2 border ${
              numTopicos > 0
                ? "bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs"
                : "bg-white dark:bg-zinc-900/90 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 hover:border-amber-500/40"
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {numTopicos === 0
                  ? numMaterias > 0
                    ? `Todos os Tópicos das Matérias Selecionadas (${topicosBaseDropdown.length} disponíveis)`
                    : `Todos os Tópicos Específicos (${topicosDisponiveis.filter((t) => t.name !== VAL_TODOS).length} disponíveis)`
                  : numTopicos === 1
                  ? `Tópico: ${joinSelecionados(topicoFiltro, VAL_TODOS)}`
                  : `${numTopicos} tópicos selecionados (${joinSelecionados(topicoFiltro, VAL_TODOS)})`}
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 shrink-0 ${
                topicoDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Popover Flutuante do Dropdown de Tópicos */}
          {topicoDropdownOpen && (
            <div className="absolute top-full left-0 mt-1.5 z-50 w-full sm:w-[500px] md:w-[620px] p-4 rounded-2xl bg-white dark:bg-[#18152b] border border-slate-200 dark:border-amber-500/30 shadow-2xl backdrop-blur-md animate-fadeIn space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                <div>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-[#f5f0df] block">
                    Filtrar por Tópicos Específicos
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {numMaterias > 0
                      ? `Exibindo tópicos das matérias: ${joinSelecionados(materiaFiltro, VAL_TODAS)}`
                      : "Marque múltiplos tópicos ou busque pelo nome"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setTopicoDropdownOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Campo de Busca Rápida de Tópicos */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={buscaTopicoInterna}
                  onChange={(e) => setBuscaTopicoInterna(e.target.value)}
                  placeholder="Buscar tópico (ex: derivadas, matrizes, poliedros, limites)..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-[#dedbd0] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                />
                {buscaTopicoInterna && (
                  <button
                    type="button"
                    onClick={() => setBuscaTopicoInterna("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Atalhos Rápidos */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleSelectTopico(VAL_TODOS)}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                    numTopicos === 0
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
                  }`}
                >
                  Todos os Tópicos
                </button>
                {numTopicos > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSelectTopico(VAL_TODOS)}
                    className="px-2 py-0.5 rounded-md text-amber-600 dark:text-[#d9b452] hover:underline font-semibold ml-auto"
                  >
                    Limpar Seleção ({numTopicos})
                  </button>
                )}
              </div>

              {/* Grade de Checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-60 overflow-y-auto pr-1">
                {topicosFiltradosDropdown.map((topico) => {
                  const isSelected = topicoFiltro.includes(topico.name);
                  return (
                    <button
                      key={topico.name}
                      type="button"
                      onClick={() => handleSelectTopico(topico.name)}
                      className={`p-2 rounded-xl text-left text-xs transition-all flex items-center justify-between gap-2 border ${
                        isSelected
                          ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-800 dark:text-emerald-300 font-bold"
                          : "bg-slate-50/70 dark:bg-zinc-900/60 border-slate-200/70 dark:border-zinc-800/80 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors shrink-0 ${
                            isSelected
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-slate-300 dark:border-zinc-600"
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </span>
                        <span className="truncate">{topico.name}</span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono shrink-0 ${
                          isSelected
                            ? "bg-emerald-600/20 text-emerald-900 dark:text-emerald-200 font-bold"
                            : "bg-slate-200/80 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400"
                        }`}
                      >
                        {topico.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Rodapé */}
              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">
                  {numTopicos > 0 ? `${numTopicos} selecionado(s)` : "Nenhum tópico selecionado"}
                </span>
                <button
                  type="button"
                  onClick={() => setTopicoDropdownOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 dark:bg-[#d9b452] text-slate-900 font-bold text-xs hover:opacity-90 transition-opacity"
                >
                  Concluir
                </button>
              </div>
            </div>
          )}
        </div>

        {/* DIMENSÕES 4, 5, 6: ANO (DROPDOWN), TIPO (COMPACTO) E DIFICULDADE (CENTRALIZADO) */}
        <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/60">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[11px] font-bold text-slate-600 dark:text-[#d9b452] uppercase tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" />
              Refinamento Adicional (Ano · Tipo · Dificuldade):
            </span>
            <button
              type="button"
              onClick={() => setMostrarFiltrosAvancados(!mostrarFiltrosAvancados)}
              className="text-xs text-amber-600 dark:text-[#d9b452] font-semibold hover:underline"
            >
              {mostrarFiltrosAvancados ? "Ocultar detalhes" : "Expandir opções"}
            </button>
          </div>

          {mostrarFiltrosAvancados && (
            <div className="space-y-4 pt-1">
              {/* LINHA 1: DROPDOWN DE ANO DA PROVA + TIPO DE RESOLUÇÃO COMPACTO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {/* 2. SELEÇÃO DE ANO DA PROVA (DROPDOWN SUSPENSO COM SELEÇÃO MÚLTIPLA) */}
                <div className="relative p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 space-y-2" ref={anoDropdownRef}>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      Ano da Prova:
                    </label>
                    {numAnos > 0 && (
                      <button
                        type="button"
                        onClick={() => handleSelectAno(VAL_TODOS)}
                        className="text-[11px] text-amber-600 dark:text-[#d9b452] hover:underline font-semibold"
                      >
                        Limpar anos ({numAnos})
                      </button>
                    )}
                  </div>

                  {/* Trigger do Dropdown */}
                  <button
                    type="button"
                    onClick={() => setAnoDropdownOpen(!anoDropdownOpen)}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-between gap-2 border ${
                      numAnos > 0
                        ? "bg-blue-600 text-white border-blue-600 font-bold shadow-xs"
                        : "bg-white dark:bg-zinc-900/90 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 hover:border-amber-500/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Calendar className="w-4 h-4 shrink-0" />
                      <span className="truncate">
                        {numAnos === 0
                          ? "Todos os Anos da Prova (2009–2026)"
                          : numAnos === 1
                          ? `Ano: ${joinSelecionados(anoFiltro, VAL_TODOS)}`
                          : `${numAnos} anos selecionados (${joinSelecionados(anoFiltro, VAL_TODOS)})`}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 shrink-0 ${
                        anoDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Popover Flutuante do Dropdown de Anos */}
                  {anoDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1.5 z-40 w-full sm:w-88 p-3.5 rounded-2xl bg-white dark:bg-[#18152b] border border-slate-200 dark:border-amber-500/30 shadow-xl backdrop-blur-md animate-fadeIn space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                        <div>
                          <span className="text-xs font-bold text-slate-800 dark:text-[#f5f0df] block">
                            Filtrar por Anos da Prova
                          </span>
                          <span className="text-[10px] text-slate-400">Marque múltiplos anos</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAnoDropdownOpen(false)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Atalhos Rápidos */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleSelectAno(VAL_TODOS)}
                          className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                            numAnos === 0
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
                          }`}
                        >
                          Todos os Anos
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAnoFiltro(["2026", "2025", "2024"]);
                            setPage(1);
                          }}
                          className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 font-semibold"
                        >
                          Recentes (24–26)
                        </button>
                        {numAnos > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSelectAno(VAL_TODOS)}
                            className="px-2 py-0.5 rounded-md text-amber-600 dark:text-[#d9b452] hover:underline font-semibold ml-auto"
                          >
                            Limpar
                          </button>
                        )}
                      </div>

                      {/* Grade de Botões com Checkbox */}
                      <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
                        {anosDisponiveis
                          .filter((a) => a.ano > 0)
                          .map((a) => {
                            const anoStr = a.ano.toString();
                            const isSelected = anoFiltro.includes(anoStr);
                            return (
                              <button
                                key={a.ano}
                                type="button"
                                onClick={() => handleSelectAno(anoStr)}
                                className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between gap-1 border ${
                                  isSelected
                                    ? "bg-blue-600 text-white border-blue-600 font-bold shadow-xs"
                                    : "bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200/80 dark:border-zinc-800 hover:bg-slate-100"
                                }`}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                                    isSelected ? "bg-white text-blue-600 font-bold" : "border border-slate-300 dark:border-zinc-600"
                                  }`}>
                                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                  </span>
                                  <span>{a.ano}</span>
                                </div>
                                <span
                                  className={`text-[9px] px-1 rounded-full font-mono ${
                                    isSelected
                                      ? "bg-white/20 text-white font-bold"
                                      : "bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400"
                                  }`}
                                >
                                  {a.count}
                                </span>
                              </button>
                            );
                          })}
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 font-mono">
                          {numAnos === 0 ? "Exibindo todos" : `${numAnos} ano(s) marcado(s)`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAnoDropdownOpen(false)}
                          className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs"
                        >
                          Concluir
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. TIPO DE RESOLUÇÃO (LARGURA REDUZIDA E CENTRALIZADO) */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 space-y-2 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-500" />
                      Tipo de Resolução:
                    </label>
                    {numTipos > 0 && (
                      <button
                        type="button"
                        onClick={() => handleSelectTipo(VAL_TODOS)}
                        className="text-[11px] text-amber-600 dark:text-[#d9b452] hover:underline font-semibold"
                      >
                        Todos
                      </button>
                    )}
                  </div>

                  {/* Contêiner de largura reduzida, comportando exatamente as 3 opções proporcionais */}
                  <div className="grid grid-cols-3 gap-1.5 w-full max-w-sm mx-auto">
                    {tiposDisponiveis.map((t) => {
                      const isSelected = tipoFiltro.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelectTipo(t.id)}
                          className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
                            isSelected
                              ? "bg-blue-600 text-white font-bold shadow-xs"
                              : "bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100"
                          }`}
                        >
                          <span className="truncate">{t.label}</span>
                          <span className="text-[10px] opacity-75 font-mono">({t.count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* LINHA 2: NÍVEL DE DIFICULDADE (DISTRIBUIÇÃO CENTRALIZADA E CORRIGIDA) */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                    Nível de Dificuldade{numDificuldades > 0 ? ` (${numDificuldades} selecionada${numDificuldades > 1 ? "s" : ""})` : ""}:
                  </label>
                  {numDificuldades > 0 && (
                    <button
                      type="button"
                      onClick={() => handleSelectDificuldade(VAL_TODAS)}
                      className="text-[11px] text-amber-600 dark:text-[#d9b452] hover:underline font-semibold"
                    >
                      Todas as dificuldades
                    </button>
                  )}
                </div>

                {/* Grade centralizada de 5 itens simétricos — Não Classificada não fica mais deslocada */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 max-w-4xl mx-auto w-full">
                  {dificuldadesDisponiveis.map((d) => {
                    const isSelected = dificuldadeFiltro.includes(d.id);
                    const isNaoClassificada = d.id === "nao_classificada";
                    const dotColor = 
                      d.id === "facil" ? "bg-emerald-500" :
                      d.id === "media" ? "bg-amber-500" :
                      d.id === "dificil" ? "bg-rose-500" :
                      d.id === "nao_classificada" ? "bg-slate-400" :
                      "bg-blue-500";

                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleSelectDificuldade(d.id)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-semibold transition-all text-center flex flex-col items-center justify-center gap-1 min-h-[56px] ${
                          isNaoClassificada ? "col-span-2 sm:col-span-1" : ""
                        } ${
                          isSelected
                            ? "bg-amber-500 dark:bg-[#d9b452] text-slate-900 font-bold shadow-xs border border-amber-500 dark:border-[#d9b452]"
                            : "bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border border-slate-200/90 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 justify-center max-w-full">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? "bg-slate-900" : dotColor}`} />
                          <span className="truncate">{d.label}</span>
                        </div>
                        <span className={`text-[10px] font-mono ${isSelected ? "text-slate-950 font-bold opacity-90" : "text-slate-500 dark:text-zinc-400"}`}>
                          ({d.count})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. LISTA DE QUESTÕES */}
      <div className="space-y-4">
        {/* BARRA DE STATUS DOS FILTROS & PAGINAÇÃO SUPERIOR */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-[#a9aaa1] font-medium px-1 gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              Mostrando página <strong className="text-slate-800 dark:text-[#f5f0df] font-mono">{page}</strong> de <strong className="text-slate-800 dark:text-[#f5f0df] font-mono">{totalPages || 1}</strong> ({total} questões encontradas)
            </span>

            {filtrosAtivosCount > 0 && (
              <div className="flex items-center gap-2 ml-1">
                <span className="text-[11px] bg-amber-500/10 text-amber-700 dark:text-[#d9b452] px-2 py-0.5 rounded-full font-bold">
                  {filtrosAtivosCount} {filtrosAtivosCount === 1 ? "filtro ativo" : "filtros ativos"}
                </span>
                <button
                  onClick={limparFiltros}
                  className="text-amber-600 dark:text-[#d9b452] hover:underline flex items-center gap-1 font-semibold"
                >
                  <RotateCcw className="w-3 h-3" /> Limpar filtros
                </button>
              </div>
            )}
          </div>

          {/* CONTROLE DE PAGINAÇÃO SUPERIOR (ANTERIOR / PRÓXIMA) */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded-xl bg-white dark:bg-[#141222] border border-slate-200 dark:border-zinc-800 text-xs text-slate-700 dark:text-[#dedbd0] disabled:opacity-40 flex items-center gap-1 transition-colors hover:bg-slate-50 dark:hover:bg-zinc-900 shadow-2xs"
                title="Página Anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
              <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono px-1">
                {page} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded-xl bg-white dark:bg-[#141222] border border-slate-200 dark:border-zinc-800 text-xs text-slate-700 dark:text-[#dedbd0] disabled:opacity-40 flex items-center gap-1 transition-colors hover:bg-slate-50 dark:hover:bg-zinc-900 shadow-2xs"
                title="Próxima Página"
              >
                <span>Próxima</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* BARRA DE AÇÃO EM LOTE E SELEÇÃO */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-[#141222] border border-slate-200/90 dark:border-amber-500/20 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSelectAllPage}
              className="flex items-center gap-2 font-semibold text-slate-700 dark:text-zinc-300 hover:text-amber-600 dark:hover:text-[#d9b452] transition-colors"
            >
              {questoes.length > 0 && questoes.every((q) => selectedIds.has(q.id)) ? (
                <CheckSquare className="w-4 h-4 text-amber-500" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>Selecionar todas desta página</span>
            </button>

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-[#d9b452] font-bold font-mono">
                  {selectedIds.size} selecionada{selectedIds.size > 1 ? "s" : ""}
                </span>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 underline text-[11px]"
                >
                  Limpar
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTreinarListaEstudo}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-semibold text-[11px] flex items-center gap-1.5 transition-colors"
            >
              <BookOpen className="w-3 h-3 text-amber-500" />
              <span>Treinar Lista Livre ({selectedIds.size > 0 ? selectedIds.size : total})</span>
            </button>

            <button
              type="button"
              onClick={() => setModalSimuladoAberto(true)}
              className="lemmas-gold-cta px-3.5 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1.5 shadow-xs transition-transform hover:scale-105"
            >
              <Timer className="w-3 h-3" />
              <span>Simulado com Tempo</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400 dark:text-zinc-500 bg-white dark:bg-[#141222] rounded-2xl border border-slate-200/80 dark:border-zinc-800">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <span className="text-sm font-medium">Filtrando questões no Supabase...</span>
          </div>
        ) : questoes.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#141222] border border-slate-200 dark:border-zinc-800 text-slate-500 space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-[#d9b452] flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-[#f5f0df]">
                Nenhuma questão encontrada para a combinação de filtros.
              </p>
              <p className="text-xs text-slate-500 dark:text-[#a9aaa1] max-w-md mx-auto">
                Tente relaxar alguns filtros como a dificuldade, tipo ou ano para visualizar mais questões desta banca.
              </p>
            </div>
            <button
              onClick={limparFiltros}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-[#d9b452] text-xs font-semibold hover:bg-amber-500/20 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Ver todas as 288 questões</span>
            </button>
          </div>
        ) : (
          questoes.map((q) => {
            const revelado = gabaritosRevelados.has(q.id);
            const { corpo, alternativas } = extrairEnunciadoEAlternativas(q.enunciado);
            const badgeColor = getMateriaBadgeColor(q.materia);

            return (
              <div
                key={q.id}
                className="p-6 rounded-2xl bg-white dark:bg-[#141222] border border-slate-200/90 dark:border-amber-500/15 hover:border-amber-500/35 dark:hover:border-[#d9b452]/40 shadow-sm transition-all space-y-4"
              >
                {/* CABEÇALHO DO CARD COM METADADOS COMPLETOS */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800/60">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* CHECKBOX DE SELEÇÃO RÁPIDA */}
                    <button
                      type="button"
                      onClick={() => toggleSelectQuestion(q.id)}
                      className={`p-1.5 rounded-lg border transition-all ${
                        selectedIds.has(q.id)
                          ? "bg-amber-500/20 border-amber-500 text-amber-700 dark:text-[#d9b452] shadow-xs"
                          : "border-slate-200 dark:border-zinc-700 hover:border-amber-500/40 text-slate-400"
                      }`}
                      title={selectedIds.has(q.id) ? "Desmarcar questão" : "Adicionar questão à seleção de Treino/Simulado"}
                    >
                      {selectedIds.has(q.id) ? (
                        <CheckSquare className="w-4 h-4 text-amber-600 dark:text-[#d9b452]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    {/* BANCA & ANO */}
                    {q.banca && (
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-[#d9b452] text-xs font-bold">
                        {q.banca} {q.ano ? `· ${q.ano}` : ""}
                      </span>
                    )}

                    {/* TIPO: OBJETIVA OU DISCURSIVA */}
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                      q.tipo === "discursiva"
                        ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25"
                        : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25"
                    }`}>
                      {q.tipo === "discursiva" ? "Discursiva" : "Objetiva"}
                    </span>

                    {/* DIFICULDADE */}
                    {renderDificuldadeBadge(q.dificuldade)}

                    {/* MATÉRIA / GRANDE ÁREA */}
                    <span className={`px-2.5 py-0.5 rounded-lg border text-xs font-semibold ${badgeColor}`}>
                      {q.materia}
                    </span>

                    {/* TÓPICO & SUBTÓPICO */}
                    {q.topico && (
                      <span className="text-xs text-slate-500 dark:text-[#a9aaa1] font-medium flex items-center gap-1">
                        <span>•</span>
                        <span className="font-semibold text-slate-700 dark:text-zinc-200">{q.topico}</span>
                        {q.subtopico && (
                          <span className="text-slate-400 dark:text-zinc-400 hidden sm:inline">
                            ({q.subtopico})
                          </span>
                        )}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs text-slate-400 dark:text-zinc-500 font-semibold">
                      Lema #{q.id.toString().padStart(3, "0")}
                    </span>
                  </div>
                </div>

                {/* ENUNCIADO MATEMÁTICO COM KATEX */}
                <div className="text-sm md:text-base font-medium text-slate-900 dark:text-[#f5f0df] leading-relaxed whitespace-pre-line">
                  <MathText text={corpo} />
                </div>

                {/* PREVIEW DE ALTERNATIVAS (OBJETIVAS) */}
                {Object.keys(alternativas).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 pt-1">
                    {Object.entries(alternativas).map(([letra, valor]) => (
                      <div
                        key={letra}
                        className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 text-xs text-slate-700 dark:text-zinc-300 flex items-start gap-2"
                      >
                        <span className="font-bold text-amber-600 dark:text-[#d9b452] mt-0.5 shrink-0">
                          ({letra})
                        </span>
                        <div className="overflow-x-auto">
                          <MathText text={valor} className="font-mono" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : q.tipo === "discursiva" ? (
                  <div className="px-3 py-2 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 text-xs text-purple-700 dark:text-purple-300 flex items-center gap-2">
                    <FileText className="w-4 h-4 shrink-0 text-purple-500" />
                    <span>Problema discursivo analítico. Escreva sua demonstração ou raciocínio no simulador para avaliação passo a passo.</span>
                  </div>
                ) : null}

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
                        <CheckCircle2 className="w-3.5 h-3.5" /> Alternativa Oficial:
                        <MathText text={q.gabarito} className="font-mono" />
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSelectQuestion(q.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        selectedIds.has(q.id)
                          ? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-[#d9b452]"
                          : "border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-amber-500/30"
                      }`}
                    >
                      {selectedIds.has(q.id) ? "✓ Na Seleção" : "+ Selecionar"}
                    </button>

                    <Link
                      href={`/resolver?id=${q.id}&mode=treino`}
                      className="lemmas-gold-cta px-4 py-2 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all hover:scale-[1.02]"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Estudar Questão</span>
                    </Link>
                  </div>
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
              className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#141222] border border-slate-200 dark:border-zinc-800 text-xs text-slate-700 dark:text-[#dedbd0] disabled:opacity-40 flex items-center gap-1 transition-colors hover:bg-slate-50 dark:hover:bg-zinc-900"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Anterior
            </button>
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#141222] border border-slate-200 dark:border-zinc-800 text-xs text-slate-700 dark:text-[#dedbd0] disabled:opacity-40 flex items-center gap-1 transition-colors hover:bg-slate-50 dark:hover:bg-zinc-900"
            >
              Próxima <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* MODAL DE CRIAÇÃO DO SIMULADO */}
      <CriarSimuladoModal
        isOpen={modalSimuladoAberto}
        onClose={() => setModalSimuladoAberto(false)}
        selectedIds={Array.from(selectedIds)}
        totalFiltradas={total}
        filtrosAtivosResumo={resumoFiltrosTexto}
        onFetchFilteredIds={fetchFilteredIds}
      />
    </div>
  );
}
