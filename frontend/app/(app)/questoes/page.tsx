"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
  AlertTriangle,
  Flag,
} from "lucide-react";
import { extrairEnunciadoEAlternativas, hasImageAlternatives } from "@/lib/math-parser";
import { MathText } from "@/components/math/MathDisplay";
import { CriarSimuladoModal } from "@/components/CriarSimuladoModal";
import ReportarQuestaoModal from "@/components/ReportarQuestaoModal";
import { resolveFigureUrl, getFallbackFigureUrl } from "@/lib/image-url";
import { useTheme } from "@/components/theme-provider";

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
  figura_path?: string | null;
  edicao?: string;
  etapa?: string;
  tipo_material?: string;
  pais?: string;
  categoria_banca?: string;
  tipo_prova?: string;
  fase_nivel?: string;
  solucao?: string | null;
  estrategias_esperadas?: string | string[] | null;
  lema_id?: number | null;
  lema_codigo?: string | null;
}


const PRIORITIZED_BANCAS = [
  "ITA", "IME", "AFA", "EFOMM", "Escola Naval", "EsPCEx", "Colégio Naval",
  "EPCAR", "ESA", "EEAR", "OBM", "FUVEST", "UNICAMP", "CEDERJ", "ENEM", "IMO", "HMMT"
];

// Prioritized bancas for initial display
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

// Badge de Dificuldade (Estética de Quadro de Giz / Quadro Branco)
function renderDificuldadeBadge(dificuldade?: number | null) {
  if (dificuldade === null || dificuldade === undefined) {
    return (
      <span className="lemma-badge text-[var(--ink-muted)]">
        <span className="lemma-badge-dot bg-[var(--ink-muted)]" />
        Não Classificada
      </span>
    );
  }
  if (dificuldade <= 2) {
    return (
      <span className="lemma-badge !text-[var(--marker-green)]">
        <span className="lemma-badge-dot bg-[var(--marker-green)]" />
        Fácil ({dificuldade}/5)
      </span>
    );
  }
  if (dificuldade === 3) {
    return (
      <span className="lemma-badge !text-[var(--marker-amber)]">
        <span className="lemma-badge-dot bg-[var(--marker-amber)]" />
        Média (3/5)
      </span>
    );
  }
  return (
    <span className="lemma-badge !text-[var(--marker-red)]">
      <span className="lemma-badge-dot bg-[var(--marker-red)]" />
      Difícil ({dificuldade}/5)
    </span>
  );
}

// Normaliza rótulos para comparação de tags (minúsculas, _ → espaço, espaços colapsados)
function normalizaRotulo(s: string) {
  return s.toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

// Evita tag duplicada quando o tipo_material genérico ("concurso_militar", "vestibular")
// já é representado por categoria_banca ("Concurso Militar", "Vestibular & Superior").
function tipoMaterialRedundante(q: Question) {
  if (!q.tipo_material) return true;
  const tm = normalizaRotulo(q.tipo_material);
  if (tm === "oficial" || tm === "geral" || tm === "questao") return true;
  if (!q.categoria_banca) return false;
  const cb = normalizaRotulo(q.categoria_banca);
  return (
    tm === cb ||
    tm.replace(/_/g, " ") === cb.replace(/_/g, " ") ||
    (cb.includes("militar") && tm.includes("militar")) ||
    (cb.includes("vestibular") && tm.includes("vestibular")) ||
    (cb.includes("olimp") && tm.includes("olimp"))
  );
}

export default function BancoQuestoesPage() {
  const router = useRouter();
  const { isLight } = useTheme();
  const isDarkMode = !isLight;

  // Estado dos filtros — todos multi-select (arrays)
  const [bancaFiltro, setBancaFiltro] = useState<string[]>([VAL_TODAS]);
  const [materiaFiltro, setMateriaFiltro] = useState<string[]>([VAL_TODAS]);
  const [topicoFiltro, setTopicoFiltro] = useState<string[]>([VAL_TODOS]);
  const [anoFiltro, setAnoFiltro] = useState<string[]>([VAL_TODOS]);
  const [tipoFiltro, setTipoFiltro] = useState<string[]>([VAL_TODOS]);
  const [dificuldadeFiltro, setDificuldadeFiltro] = useState<string[]>([VAL_TODAS]);
  const [busca, setBusca] = useState<string>("");
  const [lemaFiltro, setLemaFiltro] = useState<string | null>(null);

  // Lê parâmetro de URL inicial (?lema=LEMA-0042)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const urlLema = sp.get("lema") || sp.get("lema_codigo");
      if (urlLema) {
        setLemaFiltro(urlLema.trim().toUpperCase());
      }
    }
  }, []);

  const [gabaritosRevelados, setGabaritosRevelados] = useState<Set<number>>(new Set());

  // Estado de Seleção em Lote de Questões para Treino / Simulado
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [modalSimuladoAberto, setModalSimuladoAberto] = useState<boolean>(false);
  const [reportQuestaoId, setReportQuestaoId] = useState<number | null>(null);

  // Estado dos dados da página
  const [questoes, setQuestoes] = useState<Question[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  // Facets dinâmicos carregados da API — começam vazios, como as demais
  // facets da página, e são preenchidos pelo primeiro retorno da API.
  // Antes, um snapshot antigo (snapshot antigo) ficava visível antes do
  // carregamento e permanecia se a API falhasse.
  const [bancasDisponiveis, setBancasDisponiveis] = useState<{ name: string; count: number; categoria?: string }[]>([]);

  const [categoriasBancaDisponiveis, setCategoriasBancaDisponiveis] = useState<{ id: string; label: string; count: number }[]>([]);

  const [tiposProvaDisponiveis, setTiposProvaDisponiveis] = useState<{ id: string; label: string; count: number }[]>([]);

  const [fasesDisponiveis, setFasesDisponiveis] = useState<{ id: string; label: string; count: number }[]>([]);

  const [categoriaBancaFiltro, setCategoriaBancaFiltro] = useState<string>("Todas");
  const [tipoProvaFiltro, setTipoProvaFiltro] = useState<string[]>([VAL_TODOS]);
  const [faseNivelFiltro, setFaseNivelFiltro] = useState<string[]>([VAL_TODAS]);

  const [materiasDisponiveis, setMateriasDisponiveis] = useState<{ name: string; count: number }[]>([]);
  const [topicosDisponiveis, setTopicosDisponiveis] = useState<{ name: string; count: number }[]>([]);
  const [materiasComTopicos, setMateriasComTopicos] = useState<{
    name: string;
    count: number;
    topicos: { name: string; count: number }[];
  }[]>([]);
  const [expandedMaterias, setExpandedMaterias] = useState<Set<string>>(new Set());

  const [anosDisponiveis, setAnosDisponiveis] = useState<{ ano: number; label?: string; count: number }[]>([]);
  const [anoMin, setAnoMin] = useState<number>(1979);
  const [anoMax, setAnoMax] = useState<number>(2026);
  const [tiposDisponiveis, setTiposDisponiveis] = useState<{ id: string; label: string; count: number }[]>([]);
  const [dificuldadesDisponiveis, setDificuldadesDisponiveis] = useState<{ id: string; label: string; count: number }[]>([]);

  // Estados dos Popovers da Barra de Comando Horizontal
  const [activePopover, setActivePopover] = useState<"banca" | "materia" | "dificuldade" | "ano" | "formato" | null>(null);
  const [buscaBancaInterna, setBuscaBancaInterna] = useState<string>("");
  const [abaBancaPopover, setAbaBancaPopover] = useState<string>("Todas");
  const [buscaTopicoInterna, setBuscaTopicoInterna] = useState<string>("");
  const commandBarRef = useRef<HTMLDivElement>(null);

  // Fecha qualquer popover aberto ao clicar fora da Barra de Comando
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (commandBarRef.current && !commandBarRef.current.contains(event.target as Node)) {
        setActivePopover(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Ordenação de Relevância Mandatória das Bancas (ITA, IME, AFA... no topo)
  const bancasOrdenadas = useMemo(() => {
    const rawList = bancasDisponiveis.filter((b) => {
      if (b.name === VAL_TODAS) return false;
      const nomeLower = b.name.toLowerCase();
      if (nomeLower.includes("nível") || nomeLower.includes("nivel")) return false;
      if (abaBancaPopover === "Militares") return b.categoria === "Concurso Militar";
      if (abaBancaPopover === "Vestibulares") return b.categoria === "Vestibular & Superior";
      if (abaBancaPopover === "Olimpíadas") return b.categoria === "Olimpíadas";
      return true;
    });

    const filtradas = buscaBancaInterna.trim() === ""
      ? rawList
      : rawList.filter((b) => b.name.toLowerCase().includes(buscaBancaInterna.toLowerCase().trim()));

    return filtradas.sort((a, b) => {
      const idxA = PRIORITIZED_BANCAS.indexOf(a.name);
      const idxB = PRIORITIZED_BANCAS.indexOf(b.name);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return b.count - a.count;
    });
  }, [bancasDisponiveis, abaBancaPopover, buscaBancaInterna]);

  // Aplicar Trilhas Rápidas de 1 Clique
  const aplicarTrilhaRapida = (tipoTrilha: string) => {
    setPage(1);
    if (tipoTrilha === "todas") {
      limparFiltros();
    } else if (tipoTrilha === "militares") {
      limparFiltros();
      setCategoriaBancaFiltro("Concurso Militar");
    } else if (tipoTrilha === "geometria") {
      limparFiltros();
      setMateriaFiltro(["Geometria Plana"]);
    } else if (tipoTrilha === "calculo") {
      limparFiltros();
      setMateriaFiltro(["Cálculo"]);
    } else if (tipoTrilha === "olimpiadas") {
      limparFiltros();
      setCategoriaBancaFiltro("Olimpíadas");
    } else if (tipoTrilha === "vestibulares") {
      limparFiltros();
      setCategoriaBancaFiltro("Vestibular & Superior");
    }
  };

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
  const numTiposProva = numSelecionados(tipoProvaFiltro, VAL_TODOS);
  const numFases = numSelecionados(faseNivelFiltro, VAL_TODAS);
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
  const handleSelectTipoProva = (tp: string) => toggleFiltro(setTipoProvaFiltro, tp, VAL_TODOS);
  const handleSelectFaseNivel = (f: string) => toggleFiltro(setFaseNivelFiltro, f, VAL_TODAS);
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
    setCategoriaBancaFiltro("Todas");
    setTipoProvaFiltro([VAL_TODOS]);
    setFaseNivelFiltro([VAL_TODAS]);
    setMateriaFiltro([VAL_TODAS]);
    setTopicoFiltro([VAL_TODOS]);
    setAnoFiltro([VAL_TODOS]);
    setTipoFiltro([VAL_TODOS]);
    setDificuldadeFiltro([VAL_TODAS]);
    setBusca("");
    setLemaFiltro(null);
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

    if (categoriaBancaFiltro && categoriaBancaFiltro !== "Todas") {
      params.set("categoria_banca", categoriaBancaFiltro);
    }
    const tipoProvaParam = paramFromFiltro(tipoProvaFiltro);
    if (tipoProvaParam) params.set("tipo_prova", tipoProvaParam);
    const faseNivelParam = paramFromFiltro(faseNivelFiltro);
    if (faseNivelParam) params.set("fase_nivel", faseNivelParam);

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
    if (lemaFiltro) params.set("lema", lemaFiltro);

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
            if (data.categorias_banca && Array.isArray(data.categorias_banca)) {
              setCategoriasBancaDisponiveis(data.categorias_banca);
            }
            if (data.tipos_prova && Array.isArray(data.tipos_prova)) {
              setTiposProvaDisponiveis(data.tipos_prova);
            }
            if (data.fases && Array.isArray(data.fases)) {
              setFasesDisponiveis(data.fases);
            }
            if (data.materias && Array.isArray(data.materias)) {
              setMateriasDisponiveis(data.materias);
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
              const names = data.topicos.map((t: { name: string }) => t.name);
              const validos = topicoFiltro.filter((v) => v === VAL_TODOS || names.includes(v));
              if (validos.length === 0) setTopicoFiltro([VAL_TODOS]);
              else if (validos.length !== topicoFiltro.length) setTopicoFiltro(validos);
            }
            if (data.anos && Array.isArray(data.anos)) {
              setAnosDisponiveis(data.anos);
            }
            if (data.ano_min) setAnoMin(data.ano_min);
            if (data.ano_max) setAnoMax(data.ano_max);
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
  }, [
    categoriaBancaFiltro,
    tipoProvaFiltro,
    faseNivelFiltro,
    bancaFiltro,
    materiaFiltro,
    topicoFiltro,
    anoFiltro,
    tipoFiltro,
    dificuldadeFiltro,
    busca,
    lemaFiltro,
    page,
  ]);

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
            lema: lemaFiltro || undefined,
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
    if (selectedIds.size > 0) {
      const ids = Array.from(selectedIds);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("lemmas_active_treino", JSON.stringify({
          modo: "treino",
          ids,
          nome: `Lista de Treino (${ids.length} selecionadas)`,
          totalQuestoes: ids.length,
        }));
      }
      router.push(`/resolver?session=treino&total=${ids.length}`);
      return;
    }

    const activeFilters = {
      banca: paramFromFiltro(bancaFiltro),
      materia: paramFromFiltro(materiaFiltro),
      topico: paramFromFiltro(topicoFiltro),
      ano: paramFromFiltro(anoFiltro),
      tipo: paramFromFiltro(tipoFiltro),
      dificuldade: paramFromFiltro(dificuldadeFiltro),
      categoria_banca: categoriaBancaFiltro !== "Todas" ? categoriaBancaFiltro : null,
      tipo_prova: paramFromFiltro(tipoProvaFiltro),
      fase_nivel: paramFromFiltro(faseNivelFiltro),
      search: busca.trim() || null,
    };

    if (typeof window !== "undefined") {
      sessionStorage.setItem("lemmas_active_treino", JSON.stringify({
        modo: "treino",
        filters: activeFilters,
        nome: `Treino Livre (${total.toLocaleString("pt-BR")} questões)`,
        totalQuestoes: total,
      }));
    }
    router.push(`/resolver?session=treino&total=${total}`);
  };


  // Função para reportar uma questão
  const handleReport = async (questionId: number) => {
    const reason = window.prompt(
      "Motivo do relatório (formatação LaTeX, resposta errada, imagem incorreta, ilegível, outro):"
    );
    if (reason === null) return; // usuário cancelou
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: questionId,
          reason,
          description: "", // opcional
        }),
      });
      if (!res.ok) throw new Error("Falha ao enviar");
      alert("Relatório enviado com sucesso!");
    } catch (e: any) {
      alert("Erro ao enviar relatório: " + e.message);
    }
  };
  const filtrosAtivosCount = [
    numBancas > 0,
    numMaterias > 0,
    numTopicos > 0,
    numAnos > 0,
    numTipos > 0,
    numDificuldades > 0,
    busca.trim() !== "",
    lemaFiltro !== null,
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
    <div className="space-y-6 max-w-6xl mx-auto py-2 relative z-10">
      {/* 1. HEADER EDITORIAL NO ESTILO LEMMAS */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-700 dark:bg-amber-500/10 dark:border-amber-500/25 dark:text-[#d9b452] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{total > 0 ? total.toLocaleString("pt-BR") : "—"} Questões Auditadas · MathAI Engine</span>
          </div>
          <h1 className="font-serif-math text-2xl sm:text-3xl font-normal text-slate-900 dark:text-[#f5f0df] tracking-tight">
            Banco de <em className="italic text-blue-600 dark:text-[#d9b452] font-serif-math">Questões & Teoremas.</em>
          </h1>
        </div>
      </div>

      {/* LINHA 1: TRILHAS RÁPIDAS DE 1 CLIQUE */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          type="button"
          onClick={() => aplicarTrilhaRapida("todas")}
          className={`px-3 py-1.5 rounded-full font-semibold transition-all whitespace-nowrap shrink-0 border ${
            filtrosAtivosCount === 0 && categoriaBancaFiltro === "Todas"
              ? "bg-blue-500/10 border-blue-500/40 text-blue-700 dark:bg-amber-500/15 dark:border-amber-500/50 dark:text-[#d9b452] font-bold shadow-2xs"
              : "bg-slate-100 dark:bg-zinc-900/60 border-slate-200/80 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700"
          }`}
        >
          Todas as Questões
        </button>

        <button
          type="button"
          onClick={() => aplicarTrilhaRapida("militares")}
          className={`px-3 py-1.5 rounded-full font-semibold transition-all whitespace-nowrap shrink-0 border flex items-center gap-1.5 ${
            categoriaBancaFiltro === "Concurso Militar"
              ? "bg-blue-500/10 border-blue-500/40 text-blue-700 dark:bg-amber-500/15 dark:border-amber-500/50 dark:text-[#d9b452] font-bold shadow-2xs"
              : "bg-slate-100 dark:bg-zinc-900/60 border-slate-200/80 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700"
          }`}
        >
          <span>🎖️</span>
          <span>Militares de Elite (ITA · IME · AFA · EFOMM · EN)</span>
        </button>

        <button
          type="button"
          onClick={() => aplicarTrilhaRapida("geometria")}
          className={`px-3 py-1.5 rounded-full font-semibold transition-all whitespace-nowrap shrink-0 border flex items-center gap-1.5 ${
            materiaFiltro.includes("Geometria Plana")
              ? "bg-blue-500/10 border-blue-500/40 text-blue-700 dark:bg-amber-500/15 dark:border-amber-500/50 dark:text-[#d9b452] font-bold shadow-2xs"
              : "bg-slate-100 dark:bg-zinc-900/60 border-slate-200/80 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700"
          }`}
        >
          <span>📐</span>
          <span>Geometria & Construções</span>
        </button>

        <button
          type="button"
          onClick={() => aplicarTrilhaRapida("calculo")}
          className={`px-3 py-1.5 rounded-full font-semibold transition-all whitespace-nowrap shrink-0 border flex items-center gap-1.5 ${
            materiaFiltro.includes("Cálculo")
              ? "bg-blue-500/10 border-blue-500/40 text-blue-700 dark:bg-amber-500/15 dark:border-amber-500/50 dark:text-[#d9b452] font-bold shadow-2xs"
              : "bg-slate-100 dark:bg-zinc-900/60 border-slate-200/80 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700"
          }`}
        >
          <span>∫</span>
          <span>Cálculo & Álgebra Linear</span>
        </button>

        <button
          type="button"
          onClick={() => aplicarTrilhaRapida("olimpiadas")}
          className={`px-3 py-1.5 rounded-full font-semibold transition-all whitespace-nowrap shrink-0 border flex items-center gap-1.5 ${
            categoriaBancaFiltro === "Olimpíadas"
              ? "bg-blue-500/10 border-blue-500/40 text-blue-700 dark:bg-amber-500/15 dark:border-amber-500/50 dark:text-[#d9b452] font-bold shadow-2xs"
              : "bg-slate-100 dark:bg-zinc-900/60 border-slate-200/80 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700"
          }`}
        >
          <span>🏆</span>
          <span>Olimpíadas (OBM · IMO · HMMT)</span>
        </button>

        <button
          type="button"
          onClick={() => aplicarTrilhaRapida("vestibulares")}
          className={`px-3 py-1.5 rounded-full font-semibold transition-all whitespace-nowrap shrink-0 border flex items-center gap-1.5 ${
            categoriaBancaFiltro === "Vestibular & Superior"
              ? "bg-blue-500/10 border-blue-500/40 text-blue-700 dark:bg-amber-500/15 dark:border-amber-500/50 dark:text-[#d9b452] font-bold shadow-2xs"
              : "bg-slate-100 dark:bg-zinc-900/60 border-slate-200/80 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700"
          }`}
        >
          <span>🎓</span>
          <span>Vestibulares & CEDERJ</span>
        </button>
      </div>

      {/* LINHA 2: BARRA DE COMANDO HORIZONTAL ÚNICA (ESTILO LEETCODE / LINEAR) */}
      <div
        ref={commandBarRef}
        className="flex flex-wrap items-center gap-2 p-2 rounded-2xl border border-[var(--border-board)] bg-white dark:bg-[#161a1e] shadow-xs relative z-30"
      >
        {/* INPUT DE BUSCA COMPACTO */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar teorema, lema, matrizes, Stokes..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-board)] text-xs sm:text-sm text-[var(--ink-primary)] placeholder-[var(--ink-muted)] outline-none focus:border-[var(--marker-blue)] dark:focus:border-[var(--marker-amber)] transition-colors"
          />
          {busca && (
            <button
              onClick={() => {
                setBusca("");
                setPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* POPOVER 1: BANCA */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setActivePopover(activePopover === "banca" ? null : "banca")}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
              numBancas > 0
                ? "bg-[var(--bg-elevated)] border-[var(--border-badge)] text-[var(--marker-blue)] dark:text-[var(--marker-amber)] font-bold shadow-2xs"
                : "bg-[var(--bg-card)] border-[var(--border-board)] text-[var(--ink-secondary)] hover:border-[var(--border-badge)]"
            }`}
          >
            <Filter className={`w-3.5 h-3.5 shrink-0 ${numBancas > 0 ? "text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" : "text-slate-400"}`} />
            <span>{numBancas === 0 ? "Banca" : numBancas === 1 ? bancaFiltro.filter((v) => v !== VAL_TODAS)[0] : `${numBancas} Bancas`}</span>
            {numBancas > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--marker-blue)] dark:bg-[var(--marker-amber)] shrink-0" />
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform shrink-0 ${activePopover === "banca" ? "rotate-180" : ""}`} />
          </button>

          {activePopover === "banca" && (
            <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 z-50 w-80 sm:w-96 max-h-96 rounded-2xl bg-white dark:bg-[#18152b] border border-slate-200 dark:border-amber-500/30 shadow-2xl backdrop-blur-md p-3 flex flex-col space-y-2.5 animate-fadeIn">
              {/* Header do Popover */}
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-zinc-800">
                <span className="text-xs font-bold text-slate-800 dark:text-[#f5f0df]">
                  Filtrar por Banca
                </span>
                {numBancas > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSelectBanca(VAL_TODAS)}
                    className="text-[11px] text-blue-600 dark:text-[#d9b452] hover:underline font-semibold"
                  >
                    Limpar ({numBancas})
                  </button>
                )}
              </div>

              {/* Mini-input de busca interna */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={buscaBancaInterna}
                  onChange={(e) => setBuscaBancaInterna(e.target.value)}
                  placeholder="Filtrar banca (ex: ITA, OBM, Harvard)..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-[#dedbd0] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50 dark:focus:ring-amber-500/50"
                />
                {buscaBancaInterna && (
                  <button
                    type="button"
                    onClick={() => setBuscaBancaInterna("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Abas Rápidas */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 text-[11px]">
                {(["Todas", "Militares", "Vestibulares", "Olimpíadas"] as const).map((aba) => (
                  <button
                    key={aba}
                    type="button"
                    onClick={() => setAbaBancaPopover(aba)}
                    className={`flex-1 py-1 rounded-md font-semibold transition-all ${
                      abaBancaPopover === aba
                        ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-[#f5f0df] shadow-2xs font-bold"
                        : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
                    }`}
                  >
                    {aba}
                  </button>
                ))}
              </div>

              {/* Lista de Bancas Ordenadas */}
              <div className="overflow-y-auto max-h-56 pr-1 space-y-1">
                <button
                  type="button"
                  onClick={() => handleSelectBanca(VAL_TODAS)}
                  className={`w-full p-1.5 rounded-xl text-left text-xs transition-all flex items-center justify-between border ${
                    numBancas === 0
                      ? "bg-blue-500/10 border-blue-500/40 text-blue-700 dark:bg-amber-500/15 dark:border-amber-500/50 dark:text-[#d9b452] font-bold"
                      : "bg-slate-50/70 dark:bg-zinc-900/60 border-slate-200/70 dark:border-zinc-800/80 text-slate-700 dark:text-zinc-300 hover:border-slate-300"
                  }`}
                >
                  <span>Todas as Bancas</span>
                  <span className="text-[10px] font-mono text-slate-400">({total.toLocaleString("pt-BR")})</span>
                </button>

                {bancasOrdenadas.map((b) => {
                  const isSelected = bancaFiltro.includes(b.name);
                  const isPrioritaria = PRIORITIZED_BANCAS.includes(b.name);
                  return (
                    <button
                      key={b.name}
                      type="button"
                      onClick={() => handleSelectBanca(b.name)}
                      className={`w-full p-1.5 rounded-xl text-left text-xs transition-all flex items-center justify-between border ${
                        isSelected
                          ? "bg-blue-500/10 border-blue-500/40 text-blue-700 dark:bg-amber-500/15 dark:border-amber-500/50 dark:text-[#d9b452] font-bold"
                          : "bg-slate-50/70 dark:bg-zinc-900/60 border-slate-200/70 dark:border-zinc-800/80 text-slate-700 dark:text-zinc-300 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[10px] shrink-0 ${
                          isSelected ? "bg-blue-600 border-blue-600 text-white font-bold dark:bg-amber-500 dark:border-amber-500 dark:text-slate-950" : "border-slate-300 dark:border-zinc-600"
                        }`}>
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </span>
                        <span className="truncate">{b.name}</span>
                        {isPrioritaria && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/10 text-blue-700 dark:bg-amber-500/10 dark:text-[#d9b452] font-semibold">
                            BR
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        ({b.count})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Rodapé */}
              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-mono">
                  {numBancas === 0 ? "Todas ativas" : `${numBancas} marcada(s)`}
                </span>
                <button
                  type="button"
                  onClick={() => setActivePopover(null)}
                  className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-950 font-bold text-xs"
                >
                  Concluir
                </button>
              </div>
            </div>
          )}
        </div>

        {/* POPOVER 2: MATÉRIA & TÓPICO */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setActivePopover(activePopover === "materia" ? null : "materia")}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
              numMaterias > 0 || numTopicos > 0
                ? "bg-[var(--bg-elevated)] border-[var(--border-badge)] text-[var(--marker-blue)] dark:text-[var(--marker-amber)] font-bold shadow-2xs"
                : "bg-[var(--bg-card)] border-[var(--border-board)] text-[var(--ink-secondary)] hover:border-[var(--border-badge)]"
            }`}
          >
            <Layers className={`w-3.5 h-3.5 shrink-0 ${numMaterias > 0 || numTopicos > 0 ? "text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" : "text-slate-400"}`} />
            <span>
              {numMaterias === 0 && numTopicos === 0
                ? "Matéria & Tópico"
                : numMaterias > 0 && numTopicos === 0
                ? numMaterias === 1 ? materiaFiltro.filter((v) => v !== VAL_TODAS)[0] : `${numMaterias} Matérias`
                : `${numMaterias} Mat., ${numTopicos} Tóp.`}
            </span>
            {(numMaterias > 0 || numTopicos > 0) && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--marker-blue)] dark:bg-[var(--marker-amber)] shrink-0" />
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform shrink-0 ${activePopover === "materia" ? "rotate-180" : ""}`} />
          </button>

          {activePopover === "materia" && (
            <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 z-50 w-84 sm:w-[480px] max-h-96 rounded-2xl bg-white dark:bg-[#18152b] border border-slate-200 dark:border-amber-500/30 shadow-2xl backdrop-blur-md p-3 flex flex-col space-y-2.5 animate-fadeIn">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-zinc-800">
                <span className="text-xs font-bold text-slate-800 dark:text-[#f5f0df]">
                  Grandes Áreas & Tópicos
                </span>
                {(numMaterias > 0 || numTopicos > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setMateriaFiltro([VAL_TODAS]);
                      setTopicoFiltro([VAL_TODOS]);
                      setPage(1);
                    }}
                    className="text-[11px] text-blue-600 dark:text-[#d9b452] hover:underline font-semibold"
                  >
                    Limpar tudo
                  </button>
                )}
              </div>

              {/* Seletor de Matérias Canônicas */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Grandes Áreas:
                </span>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto pr-1">
                  {materiasDisponiveis.map((m) => {
                    const isSelected = materiaFiltro.includes(m.name);
                    return (
                      <button
                        key={m.name}
                        type="button"
                        onClick={() => handleSelectMateria(m.name)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                          isSelected
                            ? "bg-blue-500/10 border-blue-500/40 text-blue-700 dark:bg-amber-500/15 dark:border-amber-500/50 dark:text-[#d9b452] font-bold"
                            : "bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300"
                        }`}
                      >
                        <span>{m.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">({m.count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tópicos com mini-busca */}
              <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Tópicos Específicos:
                  </span>
                  {numTopicos > 0 && (
                    <button
                      type="button"
                      onClick={() => handleSelectTopico(VAL_TODOS)}
                      className="text-[10px] text-blue-600 dark:text-[#d9b452] hover:underline"
                    >
                      Limpar tópicos
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={buscaTopicoInterna}
                    onChange={(e) => setBuscaTopicoInterna(e.target.value)}
                    placeholder="Buscar tópico (ex: derivadas, matrizes, poliedros)..."
                    className="w-full pl-7 pr-7 py-1 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-[#dedbd0] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50 dark:focus:ring-amber-500/50"
                  />
                  {buscaTopicoInterna && (
                    <button
                      type="button"
                      onClick={() => setBuscaTopicoInterna("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1 max-h-36 overflow-y-auto pr-1">
                  {topicosFiltradosDropdown.map((topico) => {
                    const isSelected = topicoFiltro.includes(topico.name);
                    return (
                      <button
                        key={topico.name}
                        type="button"
                        onClick={() => handleSelectTopico(topico.name)}
                        className={`p-1.5 rounded-lg text-left text-xs transition-all flex items-center justify-between border ${
                          isSelected
                            ? "bg-blue-500/10 border-blue-500/40 text-blue-700 dark:bg-amber-500/15 dark:border-amber-500/50 dark:text-[#d9b452] font-bold"
                            : "bg-slate-50/70 dark:bg-zinc-900/60 border-slate-200/70 dark:border-zinc-800/80 text-slate-700 dark:text-zinc-300 hover:border-slate-300"
                        }`}
                      >
                        <span className="truncate">{topico.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">({topico.count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rodapé */}
              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setActivePopover(null)}
                  className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-950 font-bold text-xs"
                >
                  Concluir
                </button>
              </div>
            </div>
          )}
        </div>

        {/* POPOVER 3: DIFICULDADE */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setActivePopover(activePopover === "dificuldade" ? null : "dificuldade")}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
              numDificuldades > 0
                ? "bg-[var(--bg-elevated)] border-[var(--border-badge)] text-[var(--marker-blue)] dark:text-[var(--marker-amber)] font-bold shadow-2xs"
                : "bg-[var(--bg-card)] border-[var(--border-board)] text-[var(--ink-secondary)] hover:border-[var(--border-badge)]"
            }`}
          >
            <HelpCircle className={`w-3.5 h-3.5 shrink-0 ${numDificuldades > 0 ? "text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" : "text-slate-400"}`} />
            <span>{numDificuldades === 0 ? "Dificuldade" : `${numDificuldades} Níveis`}</span>
            {numDificuldades > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--marker-blue)] dark:bg-[var(--marker-amber)] shrink-0" />
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform shrink-0 ${activePopover === "dificuldade" ? "rotate-180" : ""}`} />
          </button>

          {activePopover === "dificuldade" && (
            <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 z-50 w-64 rounded-2xl bg-white dark:bg-[#18152b] border border-slate-200 dark:border-amber-500/30 shadow-2xl backdrop-blur-md p-3 space-y-1.5 animate-fadeIn">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-zinc-800">
                <span className="text-xs font-bold text-slate-800 dark:text-[#f5f0df]">
                  Nível de Dificuldade
                </span>
                {numDificuldades > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSelectDificuldade(VAL_TODAS)}
                    className="text-[11px] text-blue-600 dark:text-[#d9b452] hover:underline font-semibold"
                  >
                    Todas
                  </button>
                )}
              </div>

              {dificuldadesDisponiveis.map((d) => {
                const isSelected = dificuldadeFiltro.includes(d.id);
                const dotColor =
                  d.id === "facil" ? "bg-emerald-500" :
                  d.id === "media" ? "bg-amber-500" :
                  d.id === "dificil" ? "bg-rose-500" :
                  d.id === "nao_classificada" ? "bg-slate-400" : "bg-blue-500";

                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => handleSelectDificuldade(d.id)}
                    className={`w-full p-2 rounded-xl text-left text-xs transition-all flex items-center justify-between border ${
                      isSelected
                        ? "bg-blue-500/10 border-blue-500/40 text-blue-700 dark:bg-amber-500/15 dark:border-amber-500/50 dark:text-[#d9b452] font-bold"
                        : "bg-slate-50/70 dark:bg-zinc-900/60 border-slate-200/70 dark:border-zinc-800/80 text-slate-700 dark:text-zinc-300 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                      <span>{d.label}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">({d.count})</span>
                  </button>
                );
              })}

              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActivePopover(null)}
                  className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-950 font-bold text-xs"
                >
                  Concluir
                </button>
              </div>
            </div>
          )}
        </div>

        {/* POPOVER 4: ANO */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setActivePopover(activePopover === "ano" ? null : "ano")}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
              numAnos > 0
                ? "bg-[var(--bg-elevated)] border-[var(--border-badge)] text-[var(--marker-blue)] dark:text-[var(--marker-amber)] font-bold shadow-2xs"
                : "bg-[var(--bg-card)] border-[var(--border-board)] text-[var(--ink-secondary)] hover:border-[var(--border-badge)]"
            }`}
          >
            <Calendar className={`w-3.5 h-3.5 shrink-0 ${numAnos > 0 ? "text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" : "text-slate-400"}`} />
            <span>{numAnos === 0 ? "Ano" : numAnos === 1 ? anoFiltro.filter((v) => v !== VAL_TODOS)[0] : `${numAnos} Anos`}</span>
            {numAnos > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--marker-blue)] dark:bg-[var(--marker-amber)] shrink-0" />
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform shrink-0 ${activePopover === "ano" ? "rotate-180" : ""}`} />
          </button>

          {activePopover === "ano" && (
            <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 z-50 w-76 sm:w-84 max-h-96 rounded-2xl bg-white dark:bg-[#18152b] border border-slate-200 dark:border-amber-500/30 shadow-2xl backdrop-blur-md p-3 space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-zinc-800">
                <span className="text-xs font-bold text-slate-800 dark:text-[#f5f0df]">
                  Anos da Prova ({anoMin}–{anoMax})
                </span>
                {numAnos > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSelectAno(VAL_TODOS)}
                    className="text-[11px] text-blue-600 dark:text-[#d9b452] hover:underline font-semibold"
                  >
                    Todos
                  </button>
                )}
              </div>

              {/* Atalhos Rápidos */}
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleSelectAno(VAL_TODOS)}
                  className={`flex-1 py-1 rounded-md font-semibold transition-colors border ${
                    numAnos === 0
                      ? "bg-blue-500/10 border-blue-500/40 text-blue-700 dark:bg-amber-500/15 dark:border-amber-500/50 dark:text-[#d9b452] font-bold"
                      : "bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400"
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAnoFiltro(["2026", "2025", "2024"]);
                    setPage(1);
                  }}
                  className="flex-1 py-1 rounded-md bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 font-semibold hover:border-slate-300"
                >
                  2024–2026
                </button>
              </div>

              {/* Grade de Anos */}
              <div className="grid grid-cols-3 gap-1 max-h-52 overflow-y-auto pr-1">
                {anosDisponiveis
                  .filter((a) => a.ano > 0 && a.count > 0)
                  .map((a) => {
                    const anoStr = a.ano.toString();
                    const isSelected = anoFiltro.includes(anoStr);
                    return (
                      <button
                        key={a.ano}
                        type="button"
                        onClick={() => handleSelectAno(anoStr)}
                        className={`p-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between border ${
                          isSelected
                            ? "bg-blue-500/10 border-blue-500/40 text-blue-700 dark:bg-amber-500/15 dark:border-amber-500/50 dark:text-[#d9b452] font-bold"
                            : "bg-slate-50/70 dark:bg-zinc-900/60 border-slate-200/70 dark:border-zinc-800/80 text-slate-700 dark:text-zinc-300 hover:border-slate-300"
                        }`}
                      >
                        <span>{a.ano}</span>
                        <span className="text-[9px] font-mono text-slate-400">({a.count})</span>
                      </button>
                    );
                  })}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActivePopover(null)}
                  className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-950 font-bold text-xs"
                >
                  Concluir
                </button>
              </div>
            </div>
          )}
        </div>

        {/* POPOVER 5: FORMATO & FASE */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setActivePopover(activePopover === "formato" ? null : "formato")}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
              numTipos > 0 || numTiposProva > 0 || numFases > 0
                ? "bg-[var(--bg-elevated)] border-[var(--border-badge)] text-[var(--marker-blue)] dark:text-[var(--marker-amber)] font-bold shadow-2xs"
                : "bg-[var(--bg-card)] border-[var(--border-board)] text-[var(--ink-secondary)] hover:border-[var(--border-badge)]"
            }`}
          >
            <SlidersHorizontal className={`w-3.5 h-3.5 shrink-0 ${numTipos > 0 || numTiposProva > 0 || numFases > 0 ? "text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" : "text-slate-400"}`} />
            <span>Formato & Fase</span>
            {(numTipos > 0 || numTiposProva > 0 || numFases > 0) && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--marker-blue)] dark:bg-[var(--marker-amber)] shrink-0" />
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform shrink-0 ${activePopover === "formato" ? "rotate-180" : ""}`} />
          </button>

          {activePopover === "formato" && (
            <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 z-50 w-80 sm:w-88 rounded-2xl bg-white dark:bg-[#18152b] border border-slate-200 dark:border-amber-500/30 shadow-2xl backdrop-blur-md p-3.5 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-zinc-800">
                <span className="text-xs font-bold text-slate-800 dark:text-[#f5f0df]">
                  Formato, Prova & Fase
                </span>
                {(numTipos > 0 || numTiposProva > 0 || numFases > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setTipoFiltro([VAL_TODOS]);
                      setTipoProvaFiltro([VAL_TODOS]);
                      setFaseNivelFiltro([VAL_TODAS]);
                      setPage(1);
                    }}
                    className="text-[11px] text-blue-600 dark:text-[#d9b452] hover:underline font-semibold"
                  >
                    Resetar
                  </button>
                )}
              </div>

              {/* 1. Tipo de Resolução (Objetiva / Discursiva) */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Tipo de Resolução:
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {tiposDisponiveis.map((t) => {
                    const isSelected = tipoFiltro.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSelectTipo(t.id)}
                        className={`p-1.5 rounded-lg text-xs font-medium text-center border ${
                          isSelected
                            ? "bg-blue-500/10 border-blue-500/40 text-blue-700 dark:bg-amber-500/15 dark:border-amber-500/50 dark:text-[#d9b452] font-bold"
                            : "bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300"
                        }`}
                      >
                        <span className="block truncate">{t.label}</span>
                        <span className="text-[9px] font-mono text-slate-400">({t.count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Tipo de Prova (Oficial / Treinamento) */}
              <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-zinc-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Tipo de Prova:
                </span>
                <div className="flex flex-wrap gap-1">
                  {tiposProvaDisponiveis.map((tp) => {
                    const isSelected = tipoProvaFiltro.includes(tp.id);
                    return (
                      <button
                        key={tp.id}
                        type="button"
                        onClick={() => handleSelectTipoProva(tp.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                          isSelected
                            ? "bg-blue-500/10 border-blue-500/40 text-blue-700 dark:bg-amber-500/15 dark:border-amber-500/50 dark:text-[#d9b452] font-bold"
                            : "bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300"
                        }`}
                      >
                        <span>{tp.label}</span>
                        <span className="text-[10px] font-mono text-slate-400 ml-1">({tp.count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Fase / Nível Olímpico */}
              <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-zinc-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Fase / Nível Olímpico:
                </span>
                <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto pr-1">
                  {fasesDisponiveis.map((f) => {
                    const isSelected = faseNivelFiltro.includes(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleSelectFaseNivel(f.id)}
                        className={`px-2 py-1 rounded-lg text-xs font-medium border ${
                          isSelected
                            ? "bg-blue-500/10 border-blue-500/40 text-blue-700 dark:bg-amber-500/15 dark:border-amber-500/50 dark:text-[#d9b452] font-bold"
                            : "bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300"
                        }`}
                      >
                        <span>{f.label}</span>
                        <span className="text-[9px] font-mono text-slate-400 ml-1">({f.count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActivePopover(null)}
                  className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-950 font-bold text-xs"
                >
                  Concluir
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* LINHA 3: STATUS + CHIPS DE FILTROS ATIVOS + AÇÕES PRINCIPAIS */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-1.5 px-0.5 text-xs">
        {/* LADO ESQUERDO: CONTADOR & CHIPS DE FILTROS ATIVOS */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-slate-600 dark:text-[#a9aaa1]">
            Mostrando <strong className="text-slate-900 dark:text-[#f5f0df] font-mono">{questoes.length}</strong> de <strong className="text-slate-900 dark:text-[#f5f0df] font-mono">{total.toLocaleString("pt-BR")}</strong> questões
          </span>

          {/* Chips de Filtros Ativos */}
          {busca.trim() !== "" && (
            <button
              onClick={() => {
                setBusca("");
                setPage(1);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-700 hover:bg-blue-500/20 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-[#d9b452] dark:hover:bg-amber-500/20 transition-colors"
            >
              <span>Busca: "{busca.trim()}"</span>
              <X className="w-3 h-3" />
            </button>
          )}

          {numBancas > 0 && (
            <button
              onClick={() => handleSelectBanca(VAL_TODAS)}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-700 hover:bg-blue-500/20 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-[#d9b452] dark:hover:bg-amber-500/20 transition-colors"
            >
              <span>Banca: {joinSelecionados(bancaFiltro, VAL_TODAS)}</span>
              <X className="w-3 h-3" />
            </button>
          )}

          {categoriaBancaFiltro !== "Todas" && (
            <button
              onClick={() => {
                setCategoriaBancaFiltro("Todas");
                setPage(1);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-700 hover:bg-blue-500/20 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-[#d9b452] dark:hover:bg-amber-500/20 transition-colors"
            >
              <span>Trilha: {categoriaBancaFiltro}</span>
              <X className="w-3 h-3" />
            </button>
          )}

          {numMaterias > 0 && (
            <button
              onClick={() => handleSelectMateria(VAL_TODAS)}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-700 hover:bg-blue-500/20 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-[#d9b452] dark:hover:bg-amber-500/20 transition-colors"
            >
              <span>Matéria: {joinSelecionados(materiaFiltro, VAL_TODAS)}</span>
              <X className="w-3 h-3" />
            </button>
          )}

          {numTopicos > 0 && (
            <button
              onClick={() => handleSelectTopico(VAL_TODOS)}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-700 hover:bg-blue-500/20 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-[#d9b452] dark:hover:bg-amber-500/20 transition-colors"
            >
              <span>Tópico: {joinSelecionados(topicoFiltro, VAL_TODOS)}</span>
              <X className="w-3 h-3" />
            </button>
          )}

          {numAnos > 0 && (
            <button
              onClick={() => handleSelectAno(VAL_TODOS)}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-700 hover:bg-blue-500/20 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-[#d9b452] dark:hover:bg-amber-500/20 transition-colors"
            >
              <span>Ano: {joinSelecionados(anoFiltro, VAL_TODOS)}</span>
              <X className="w-3 h-3" />
            </button>
          )}

          {numDificuldades > 0 && (
            <button
              onClick={() => handleSelectDificuldade(VAL_TODAS)}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-700 hover:bg-blue-500/20 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-[#d9b452] dark:hover:bg-amber-500/20 transition-colors"
            >
              <span>Dificuldade: {joinSelecionados(dificuldadeFiltro, VAL_TODAS)}</span>
              <X className="w-3 h-3" />
            </button>
          )}

          {lemaFiltro && (
            <button
              onClick={() => setLemaFiltro(null)}
              className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 border border-blue-500/40 text-blue-800 hover:bg-blue-500/25 dark:bg-amber-500/15 dark:border-amber-500/40 dark:text-[#d9b452] dark:hover:bg-amber-500/25 transition-colors shadow-2xs"
              title="Remover filtro de lema"
            >
              <span>Lema: {lemaFiltro}</span>
              <X className="w-3 h-3" />
            </button>
          )}

          {filtrosAtivosCount > 0 && (
            <button
              onClick={limparFiltros}
              className="text-blue-600 hover:text-blue-700 dark:text-[#d9b452] dark:hover:text-[#d9b452] hover:underline flex items-center gap-1 font-semibold text-[11px] ml-1"
            >
              <RotateCcw className="w-3 h-3" /> Limpar filtros
            </button>
          )}
        </div>

        {/* LADO DIREITO: SELEÇÃO EM LOTE + AÇÕES PRINCIPAIS */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleSelectAllPage}
              className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-[#d9b452] transition-colors text-xs"
            >
              {questoes.length > 0 && questoes.every((q) => selectedIds.has(q.id)) ? (
                <CheckSquare className="w-4 h-4 text-blue-600 dark:text-amber-500" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span className="hidden sm:inline">Selecionar página</span>
            </button>
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="text-[11px] text-blue-600 dark:text-[#d9b452] hover:underline font-semibold ml-1"
                title="Limpar seleção"
              >
                ({selectedIds.size}) Limpar
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleTreinarListaEstudo}
            className="px-3.5 py-1.5 rounded-xl border border-[var(--border-badge)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] text-[var(--ink-primary)] font-semibold text-xs transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <BookOpen className="w-3.5 h-3.5 text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" />
            <span>Treinar Lista ({selectedIds.size > 0 ? selectedIds.size : total})</span>
          </button>

          <button
            type="button"
            onClick={() => setModalSimuladoAberto(true)}
            className="lemmas-gold-cta inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-bold text-xs shadow-md transition-all hover:scale-[1.02]"
          >
            <Timer className="w-3.5 h-3.5" />
            <span>Criar Simulado</span>
          </button>
        </div>
      </div>


      {/* 3. LISTA DE QUESTÕES */}
      <div className="space-y-4">
        {/* PAGINAÇÃO SUPERIOR COMPACTA */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#a9aaa1] font-medium px-1">
            <span>
              Página <strong className="text-slate-800 dark:text-[#f5f0df] font-mono">{page}</strong> de <strong className="text-slate-800 dark:text-[#f5f0df] font-mono">{totalPages}</strong>
            </span>
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
          </div>
        )}

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400 dark:text-zinc-500 bg-white dark:bg-[#141222] rounded-2xl border border-slate-200/80 dark:border-zinc-800">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-amber-500" />
            <span className="text-sm font-medium">Filtrando questões no Supabase...</span>
          </div>
        ) : questoes.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#141222] border border-slate-200 dark:border-zinc-800 text-slate-500 space-y-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-700 dark:bg-amber-500/10 dark:text-[#d9b452] flex items-center justify-center mx-auto">
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
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 dark:bg-amber-500/10 dark:text-[#d9b452] dark:hover:bg-amber-500/20 text-xs font-semibold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Ver todas as {total > 0 ? total.toLocaleString("pt-BR") : "—"} questões</span>
            </button>
          </div>
        ) : (
          questoes.map((q) => {
            const revelado = gabaritosRevelados.has(q.id);
            const isDiscursiva = q.tipo?.toLowerCase() === "discursiva" || q.gabarito?.toLowerCase().includes("discursiv");
            const { corpo, alternativas } = extrairEnunciadoEAlternativas(q.enunciado, isDiscursiva);

            const isComplexOrLongAlternative = Object.values(alternativas).some((val) => {
              if (!val) return false;
              const clean = val.trim();
              return (
                clean.length > 20 ||
                clean.includes("\frac") ||
                clean.includes("\sqrt") ||
                clean.includes("\displaystyle") ||
                clean.includes("\matrix") ||
                clean.includes("\begin") ||
                clean.includes("\sum") ||
                clean.includes("\int") ||
                clean.includes("\pmatrix") ||
                clean.includes("\bmatrix") ||
                clean.includes("\lim")
              );
            });

            const isVeryLongAlternative = Object.values(alternativas).some((val) => val && val.trim().length > 60);

            return (
              <article
                key={q.id}
                className="p-6 rounded-2xl bg-white dark:bg-[#161a1e] border border-[var(--border-board)] hover:border-[var(--border-badge)] shadow-xs transition-all space-y-4 relative z-10"
              >
                {/* CABEÇALHO DO CARD COM METADADOS LIMPOS (ESTÉTICA DE QUADRO) */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-[var(--border-board)]">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* CHECKBOX DE SELEÇÃO RÁPIDA */}
                    <button
                      type="button"
                      onClick={() => toggleSelectQuestion(q.id)}
                      className={`p-1.5 rounded-lg border transition-all ${
                        selectedIds.has(q.id)
                          ? "bg-[var(--bg-elevated)] border-[var(--marker-blue)] text-[var(--marker-blue)] dark:border-[var(--marker-amber)] dark:text-[var(--marker-amber)] shadow-xs"
                          : "border-[var(--border-badge)] bg-transparent hover:border-slate-400 dark:hover:border-white/30 text-[var(--ink-muted)]"
                      }`}
                      title={selectedIds.has(q.id) ? "Desmarcar questão" : "Adicionar questão à seleção de Treino/Simulado"}
                    >
                      {selectedIds.has(q.id) ? (
                        <CheckSquare className="w-4 h-4 text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    {/* BANCA + ANO (Destaque em Giz Amarelo / Piloto Ocre) */}
                    {q.banca && (
                      <span className="lemma-badge font-semibold !text-[var(--marker-amber)] dark:!text-[var(--marker-amber)] dark:!border-yellow-200/20">
                        {q.banca} {q.ano ? `· ${q.ano}` : ""}
                      </span>
                    )}

                    {/* CATEGORIA DA BANCA (Sem duplicata CONCURSO_MILITAR) */}
                    {q.categoria_banca && (
                      <span className="lemma-badge text-slate-600 dark:text-slate-400">
                        {q.categoria_banca}
                      </span>
                    )}

                    {/* TIPO: OBJETIVA OU DISCURSIVA */}
                    <span className="lemma-badge text-slate-600 dark:text-slate-400">
                      {q.tipo === "discursiva" ? "Discursiva" : "Objetiva"}
                    </span>

                    {/* DIFICULDADE COM DOT SEMÂNTICO (Sem fundo vermelho/vinho gritante) */}
                    {renderDificuldadeBadge(q.dificuldade)}

                    {/* TIPO DE PROVA SE HOUVER E NÃO FOR OFICIAL */}
                    {q.tipo_prova && q.tipo_prova !== "Oficial" && (
                      <span className="lemma-badge">
                        {q.tipo_prova}
                      </span>
                    )}

                    {/* FASE / NÍVEL OLÍMPICO */}
                    {q.fase_nivel && q.fase_nivel !== "Geral" && (
                      <span className="lemma-badge">
                        {q.fase_nivel}
                      </span>
                    )}

                    {/* TIPO DE MATERIAL NÃO-REDUNDANTE */}
                    {q.tipo_material && !tipoMaterialRedundante(q) && (
                      <span className="lemma-badge">
                        {q.tipo_material}
                      </span>
                    )}

                    {/* BREADCRUMB TIPOGRÁFICO LIMPO PARA MATÉRIA E TÓPICO */}
                    <span className="text-xs text-[var(--ink-secondary)] ml-1">
                      {q.materia || "Matemática"}
                      {q.topico && (
                        <>
                          {" "}<span className="opacity-40">›</span>{" "}
                          <strong className="font-medium text-[var(--ink-primary)]">{q.topico}</strong>
                        </>
                      )}
                      {q.subtopico && (
                        <span className="opacity-75"> ({q.subtopico})</span>
                      )}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setReportQuestaoId(q.id)}
                    className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink-primary)] flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-[var(--bg-elevated)]"
                    title="Reportar inconsistência (digitação, gabarito, imagem)"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Reportar</span>
                  </button>
                </div>

                {/* ENUNCIADO MATEMÁTICO COM KATEX */}
                <div className="text-sm md:text-base font-medium text-[var(--ink-primary)] leading-relaxed whitespace-pre-line">
                  <MathText text={corpo} />
                </div>

                {/* FIGURA / GRÁFICO DA QUESTÃO SE HOUVER (TRATAMENTO DE INVERSÃO NO DARK MODE) */}
                {q.figura_path && !corpo.includes("![") && !hasImageAlternatives(alternativas) && (
                  <div className="my-3 flex flex-col items-center justify-center p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-board)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveFigureUrl(q.figura_path)}
                      alt={`Figura da Questão ${q.id}`}
                      className="question-diagram-invertible max-h-64 max-w-full rounded-lg object-contain shadow-xs bg-white dark:bg-transparent p-2 border border-slate-200 dark:border-white/10"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.dataset.fallback) {
                          target.dataset.fallback = "1";
                          target.src = getFallbackFigureUrl(q.figura_path);
                        }
                      }}
                    />
                  </div>
                )}

                {/* PREVIEW DE ALTERNATIVAS (OBJETIVAS) */}
                {Object.keys(alternativas).length > 0 ? (
                  hasImageAlternatives(alternativas) ? (
                    <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${Object.keys(alternativas).length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-5"} gap-3 pt-2`}>
                      {Object.entries(alternativas).map(([letra, valor]) => (
                        <div
                          key={letra}
                          className="p-3 rounded-2xl bg-white dark:bg-[#18152a] border border-slate-200/90 dark:border-amber-500/20 shadow-xs flex flex-col items-center gap-2 group hover:border-blue-500/50 dark:hover:border-amber-500/50 transition-all"
                        >
                          <div className="w-full flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-stone-800/80">
                            <span className="font-bold text-xs px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-[#d9b452] border border-blue-500/20 dark:bg-amber-500/10 dark:border-amber-500/20">
                              Opção ({letra})
                            </span>
                          </div>
                          <div className="w-full flex items-center justify-center min-h-[110px] max-h-48 overflow-hidden rounded-lg bg-slate-50 dark:bg-stone-900/70 p-2 border border-slate-100 dark:border-stone-800">
                            <MathText text={valor} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`grid gap-2.5 pt-1 ${
                      isVeryLongAlternative
                        ? "grid-cols-1"
                        : isComplexOrLongAlternative
                        ? "grid-cols-1 sm:grid-cols-2"
                        : Object.keys(alternativas).length === 4
                        ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-4"
                        : Object.keys(alternativas).length <= 3
                        ? "grid-cols-1 sm:grid-cols-3"
                        : "grid-cols-1 sm:grid-cols-2 md:grid-cols-5"
                    }`}>
                      {Object.entries(alternativas).map(([letra, valor]) => (
                        <div
                          key={letra}
                          className={`px-3.5 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-board)] text-xs md:text-sm text-[var(--ink-primary)] flex items-center gap-2.5 transition-all hover:border-[var(--border-badge)] ${
                            isComplexOrLongAlternative ? "min-h-[52px]" : "min-h-[40px]"
                          }`}
                        >
                          <span className="font-bold text-[var(--marker-blue)] dark:text-[var(--marker-amber)] shrink-0 text-xs md:text-sm">
                            ({letra})
                          </span>
                          <div className="overflow-x-auto overflow-y-hidden w-full py-1 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            <MathText text={valor} className="font-mono" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : isDiscursiva ? (
                  <div className="px-3.5 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-board)] text-xs text-[var(--ink-secondary)] flex items-center gap-2">
                    <FileText className="w-4 h-4 shrink-0 text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" />
                    <span>Problema discursivo analítico. Escreva sua demonstração ou raciocínio no simulador para avaliação passo a passo com IA.</span>
                  </div>
                ) : null}

                {/* RODAPÉ DO CARD */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border-board)]">
                  <div className="flex items-center gap-3">
                    {isDiscursiva ? (
                      <span className="text-xs font-semibold text-[var(--marker-blue)] dark:text-[var(--marker-amber)] flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Demonstração Analítica</span>
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => toggleGabarito(q.id)}
                          className="text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors"
                        >
                          {revelado ? `Gabarito: [${q.gabarito}] (Ocultar)` : "Revelar Gabarito"}
                        </button>
                        {revelado && (
                          <span className="text-xs font-bold text-[var(--marker-green)] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Alternativa Oficial:
                            <MathText text={q.gabarito} className="font-mono" />
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSelectQuestion(q.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        selectedIds.has(q.id)
                          ? "bg-[var(--bg-elevated)] border-[var(--marker-blue)] text-[var(--marker-blue)] dark:border-[var(--marker-amber)] dark:text-[var(--marker-amber)]"
                          : "border-[var(--border-badge)] bg-transparent text-[var(--ink-secondary)] hover:border-slate-400 dark:hover:border-white/30"
                      }`}
                    >
                      {selectedIds.has(q.id) ? "✓ Na Seleção" : "+ Selecionar"}
                    </button>


                  </div>
                </div>
              </article>
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

      {/* MODAL DE REPORTAR INCONSISTÊNCIA NA QUESTÃO */}
      <ReportarQuestaoModal
        isOpen={reportQuestaoId !== null}
        onClose={() => setReportQuestaoId(null)}
        questaoId={reportQuestaoId}
        origem="questoes"
      />
    </div>
  );
}
