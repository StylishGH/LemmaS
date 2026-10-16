"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Clock, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Bookmark, 
  ArrowRight, 
  ArrowLeft, 
  Camera, 
  Zap, 
  BrainCircuit, 
  Upload,
  Sparkles, 
  Lightbulb, 
  Loader2, 
  HelpCircle,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Check,
  Send,
  MessageSquare,
  Lock,
  LogIn,
  X,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Award,
  Compass,
  PenTool,
  Flag,
} from "lucide-react";
import { extrairEnunciadoEAlternativas, hasImageAlternatives } from "@/lib/math-parser";
import { MathText } from "@/components/math/MathDisplay";
import { useUserProfile } from "@/lib/use-user";
import { createClient } from "@/lib/supabase";
import { resolveFigureUrl, getFallbackFigureUrl } from "@/lib/image-url";
import MathScratchpad from "@/components/math/MathScratchpad";
import SpenSmartCanvas from "@/components/lousa/SpenSmartCanvas";
import GeometricCompassBoard from "@/components/math/GeometricCompassBoard";
import ReportarQuestaoModal from "@/components/ReportarQuestaoModal";
import ThoughtLine from "@/components/ui/thought-line";
import LemaBadge from "@/components/math/LemaBadge";

interface Question {
  id: number;
  materia: string;
  topico: string;
  subtopico?: string;
  enunciado: string;
  enunciado_limpo?: string;
  alternativas?: Record<string, string>;
  gabarito: string;
  banca?: string;
  ano?: number;
  tipo?: string;
  figura_path?: string | null;
  edicao?: string;
  etapa?: string;
  tipo_material?: string;
  pais?: string;
  solucao?: string;
  estrategias_esperadas?: string | string[] | null;
  lema_id?: number | null;
  lema_codigo?: string | null;
}

interface SubmitResult {
  acertou: boolean;
  gabarito: string;
  resposta_enviada: string;
  sm2: {
    repeticoes: number;
    fator_facilidade: number;
    intervalo_dias: number;
    proxima_revisao_data: string;
  };
}

interface FeedbackState {
  util: boolean | null;
  concorda: boolean | null;
  comentario: string;
  submitting: boolean;
  submitted: boolean;
  error: string | null;
}

interface DiagnosticoIaResult {
  status_resolucao: string;
  transcricao_latex?: string;
  diagnostico: string;
  linha_do_erro?: string;
  dica_proximo_passo?: string;
  estrategia_identificada?: string;
  modelo?: string;
  confianca?: number | string;
}

interface DiscursiveEvaluationResult {
  veredito: "aprovado" | "parcial" | "sem_desenvolvimento" | "incorreto";
  desenvolvimento_presente: boolean;
  resultado_final_correto: boolean;
  etapas_corretas: string[];
  erros_identificados: string[];
  feedback_latex: string;
  precisa_revisao_humana: boolean;
  diagnostico?: string;
  modelo?: string;
  confianca?: number | string;
  transcricao_latex?: string;
  linha_do_erro?: string;
  dica_proximo_passo?: string;
}

/**
 * Detecta se o campo gabarito contém resíduos numéricos, hashes ou decimais espúrios
 * originados de importações de datasets (ex: 1.062887, hashes hexadecimais ou floats em questões discursivas).
 */
function isSpuriousGabarito(gabarito?: string | null, isDiscursiva: boolean = false): boolean {
  if (!gabarito || typeof gabarito !== "string") return true;
  const trimmed = gabarito.trim();
  if (!trimmed) return true;
  // Decimal puro com 3 ou mais casas decimais (artefatos de importação AoPS/Kaggle ex: 1.062887)
  if (/^\s*-?\d+\.\d{3,}\s*$/.test(trimmed)) return true;
  // Hashes hexadecimais ou IDs de dataset
  if (/^[a-fA-F0-9]{8,}$/.test(trimmed)) return true;
  // Em questões discursivas de demonstração geométrica, números decimais isolados sem texto explicativo
  if (isDiscursiva && /^\s*-?\d+(?:\.\d+)?\s*$/.test(trimmed)) return true;
  return false;
}

// Modal de Login
function AuthPromptModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="max-w-md w-full rounded-2xl bg-white dark:bg-[#151324] border border-amber-500/40 p-6 shadow-2xl relative text-slate-900 dark:text-[#f5f0df] space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-[#d9b452] flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h3 className="font-serif-math text-xl font-bold tracking-tight">
            Logar para responder
          </h3>
          <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed font-sans">
            Para assinalar alternativas, registrar suas deduções e receber os diagnósticos metacognitivos da <strong>MathAI Engine</strong>, você precisa entrar na sua conta ou se cadastrar gratuitamente.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <Link
            href={`/login?redirectTo=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/resolver")}`}
            className="w-full py-2.5 rounded-xl font-bold text-xs lemmas-gold-cta flex items-center justify-center gap-2 shadow-sm"
          >
            <LogIn className="w-4 h-4" />
            <span>Fazer Login</span>
          </Link>
          <Link
            href={`/login?tab=signup&redirectTo=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/resolver")}`}
            className="w-full py-2.5 rounded-xl font-semibold text-xs border border-amber-500/40 hover:bg-amber-500/10 text-slate-800 dark:text-[#f5f0df] flex items-center justify-center gap-2 transition"
          >
            <span>Criar Conta Gratuita</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs text-slate-500 dark:text-zinc-400 hover:underline"
          >
            Continuar apenas explorando
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal de Confirmação para Entregar Simulado
function ConfirmarEntregaModal({
  open,
  onClose,
  onConfirm,
  totalQuestoes,
  respondidasCount,
  emBrancoCount,
  submitting = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  totalQuestoes: number;
  respondidasCount: number;
  emBrancoCount: number;
  submitting?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="max-w-md w-full rounded-2xl bg-white dark:bg-[#151324] border border-amber-500/40 p-6 shadow-2xl relative text-slate-900 dark:text-[#f5f0df] space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-[#d9b452] flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h3 className="font-serif-math text-xl font-bold tracking-tight">
            Finalizar e Entregar Simulado?
          </h3>
          <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed font-sans">
            Você respondeu <strong>{respondidasCount}</strong> de <strong>{totalQuestoes}</strong> questões.
          </p>
          {emBrancoCount > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-[#d9b452] text-xs">
              Atenção: <strong>{emBrancoCount} questão{emBrancoCount > 1 ? "ões" : ""}</strong> continuam em branco. Em concursos reais, questões não respondidas conferem 0 pontos.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition disabled:opacity-50"
          >
            Continuar Resolvendo
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="lemmas-gold-cta px-5 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Gravando resultados...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Entrega</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResolverContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id");
  const sessionQuery = searchParams.get("session"); // "simulado" ou "treino"
  const modeQuery = searchParams.get("mode"); // "treino"

  const { profile, isAuthenticated, loading: userLoading } = useUserProfile();
  const supabase = useMemo(() => createClient(), []);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modos de Sessão
  const [sessionType, setSessionType] = useState<"simulado" | "treino">("simulado");
  const [sessionMode, setSessionMode] = useState<"standby" | "active" | "result">("standby");
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitResults, setSubmitResults] = useState<Record<number, SubmitResult>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set());
  const [jumpValue, setJumpValue] = useState("");

  // Paginação sob demanda de 100 em 100 no Modo Treino Livre
  const [totalCount, setTotalCount] = useState<number>(0);
  const [treinoFilters, setTreinoFilters] = useState<any>(null);
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set());
  const [loadingChunk, setLoadingChunk] = useState<boolean>(false);
  const [answeredIndices, setAnsweredIndices] = useState<Set<number>>(new Set());
  const [windowSize, setWindowSize] = useState<number>(20);

  useEffect(() => {
    const updateSize = () => {
      if (typeof window !== "undefined") {
        if (window.innerWidth >= 1280) setWindowSize(22);
        else if (window.innerWidth >= 1024) setWindowSize(20);
        else if (window.innerWidth >= 768) setWindowSize(14);
        else setWindowSize(8);
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Cronômetro
  const [totalTimeInitial, setTotalTimeInitial] = useState(45 * 60);
  const [timeLeft, setTimeLeft] = useState(45 * 60);

  // Metacognição, Dedução digitada & Rascunho (Modo Treino)
  const [estrategias, setEstrategias] = useState<Record<number, string>>({});
  const [confianca, setConfianca] = useState<Record<number, number>>({});
  const [justificativas, setJustificativas] = useState<Record<number, string>>({});
  const [showRascunho, setShowRascunho] = useState(false);
  const [bancadaModo, setBancadaModo] = useState<"lousa" | "geometria" | "texto" | null>(null);
  
  // Dicas Socráticas (Modo Treino com 5 Níveis Pedagógicos por Questão)
  const [hintLevels, setHintLevels] = useState<Record<number, number>>({});
  const [hint5Used, setHint5Used] = useState<Record<number, boolean>>({});
  const [showHint5ConfirmModal, setShowHint5ConfirmModal] = useState<boolean>(false);
  const [hints, setHints] = useState<Record<number, string>>({});
  const [hintsHistory, setHintsHistory] = useState<Record<number, Array<{ nivel: number; dica: string; modelo?: string; confianca?: number }>>>({});
  const [hintMeta, setHintMeta] = useState<Record<number, { modelo?: string; confianca?: number }>>({});
  const [loadingHint, setLoadingHint] = useState<boolean>(false);
  const [hintError, setHintError] = useState<string | null>(null);

  // Motor ativo da Lousa de Rascunho (S-Pen 120Hz Dual-Canvas vs Lousa Giz)
  const [lousaEngine, setLousaEngine] = useState<"spen-dual" | "classic">("spen-dual");

  // Diagnóstico Multimodal & MathAI Engine
  const [imageFiles, setImageFiles] = useState<Record<number, string>>({});
  const [diagnosticosIa, setDiagnosticosIa] = useState<Record<number, DiagnosticoIaResult>>({});
  const [loadingIa, setLoadingIa] = useState<boolean>(false);

  // Feedback do Aluno (calibração por questão)
  const [feedbacks, setFeedbacks] = useState<Record<number, FeedbackState>>({});

  // Pós-Simulado: Revisão Detalhada com IA
  const [reviewFilter, setReviewFilter] = useState<"todas" | "acertos" | "erros" | "em_branco">("todas");
  const [expandedReviewId, setExpandedReviewId] = useState<number | null>(null);
  const [resolucoesIa, setResolucoesIa] = useState<Record<number, DiagnosticoIaResult>>({});
  const [loadingResolucaoIa, setLoadingResolucaoIa] = useState<Record<number, boolean>>({});

  // Avaliação Discursiva da MathAI Engine & Ativação de Bancada
  const [discursiveEvaluations, setDiscursiveEvaluations] = useState<Record<number, DiscursiveEvaluationResult>>({});
  const [loadingDiscursive, setLoadingDiscursive] = useState<boolean>(false);
  const [geometricCommands, setGeometricCommands] = useState<Record<number, string[]>>({});
  const [lousaHasStrokes, setLousaHasStrokes] = useState<Record<number, boolean>>({});
  const bancadaRef = React.useRef<HTMLDivElement>(null);

  // Ativação e Rolagem Suave até a Bancada de Resolução (desktop e celular)
  const ativarEIrParaBancada = (modo: "lousa" | "geometria" | "texto") => {
    setBancadaModo(modo);
    setTimeout(() => {
      if (bancadaRef.current) {
        bancadaRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 120);
  };

  // Carregamento de Questões baseado em queryId ou sessão
  useEffect(() => {
    let ignore = false;
    setLoading(true);

    const carregarSessao = async () => {
      try {
        // CASO 1: Questão Avulsa por ID (?id=123)
        if (queryId) {
          const res = await fetch(`/api/questions/${queryId}`);
          const data = await res.json();
          if (!ignore && data && !data.error) {
            const { corpo, alternativas } = extrairEnunciadoEAlternativas(data.enunciado);
            setQuestions([{ ...data, enunciado_limpo: corpo, alternativas }]);
            setTotalCount(1);
            setSessionType(modeQuery === "treino" ? "treino" : "simulado");
            setSessionMode("active");
            setTotalTimeInitial(30 * 60);
            setTimeLeft(30 * 60);
          }
          return;
        }

        // CASO 2: Sessão de Simulado Customizado (?session=simulado)
        if (sessionQuery === "simulado" && typeof window !== "undefined") {
          const stored = sessionStorage.getItem("lemmas_active_simulado");
          if (stored) {
            const config = JSON.parse(stored);
            if (config.ids && config.ids.length > 0) {
              const res = await fetch("/api/questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: config.ids }),
              });
              const data = await res.json();
              if (!ignore && data.questoes && data.questoes.length > 0) {
                const parsedList = data.questoes.map((q: any) => {
                  const { corpo, alternativas } = extrairEnunciadoEAlternativas(q.enunciado);
                  return { ...q, enunciado_limpo: corpo, alternativas };
                });
                setQuestions(parsedList);
                setTotalCount(parsedList.length);
                setSessionType("simulado");
                setSessionMode("active");
                const totalSec = config.tempoTotalSegundos || 60 * 60;
                setTotalTimeInitial(totalSec);
                setTimeLeft(totalSec);
                return;
              }
            }
          }
        }

        // CASO 3: Sessão de Treino Livre (?session=treino)
        if (sessionQuery === "treino") {
          let config: any = null;
          if (typeof window !== "undefined") {
            const stored = sessionStorage.getItem("lemmas_active_treino");
            if (stored) {
              try { config = JSON.parse(stored); } catch (e) {}
            }
          }

          // Se forem IDs específicos selecionados manualmente
          if (config && config.ids && config.ids.length > 0) {
            const res = await fetch("/api/questions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids: config.ids }),
            });
            const data = await res.json();
            if (!ignore && data.questoes && data.questoes.length > 0) {
              const parsedList = data.questoes.map((q: any) => {
                const { corpo, alternativas } = extrairEnunciadoEAlternativas(q.enunciado);
                return { ...q, enunciado_limpo: corpo, alternativas };
              });
              setQuestions(parsedList);
              setTotalCount(parsedList.length);
              setSessionType("treino");
              setSessionMode("active");
              setTotalTimeInitial(0);
              setTimeLeft(0);
              return;
            }
          }

          // Treino Livre com filtros ou acervo completo (sob demanda de 100 em 100)
          const targetFilters = config?.filters || {};
          const urlTotal = typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("total")
            : null;
          const parsedUrlTotal = urlTotal ? parseInt(urlTotal, 10) : 0;
          const targetTotal = config?.totalQuestoes || (parsedUrlTotal > 0 ? parsedUrlTotal : 20803);

          setTreinoFilters(targetFilters);
          setTotalCount(targetTotal);
          setSessionType("treino");
          setSessionMode("active");
          setTotalTimeInitial(0);
          setTimeLeft(0);

          // Carrega o primeiro lote (página 1, 100 questões)
          const res = await fetch("/api/questions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filters: targetFilters, limit: 100, page: 1 }),
          });
          const data = await res.json();
          if (!ignore && data.questoes && data.questoes.length > 0) {
            const realTotal = data.total || targetTotal;
            setTotalCount(realTotal);
            const parsedList = data.questoes.map((q: any) => {
              const { corpo, alternativas } = extrairEnunciadoEAlternativas(q.enunciado);
              return { ...q, enunciado_limpo: corpo, alternativas };
            });
            const initialArr = new Array(realTotal);
            parsedList.forEach((q: any, i: number) => {
              initialArr[i] = q;
            });
            setQuestions(initialArr);
            setLoadedPages(new Set([1]));
            return;
          }
        }

        // CASO 4: Fallback Padrão (Standby com 5 questões)
        const res = await fetch(`/api/questions?limit=5`);
        const data = await res.json();
        if (!ignore && data && data.questoes && data.questoes.length > 0) {
          const parsedList = data.questoes.map((q: any) => {
            const { corpo, alternativas } = extrairEnunciadoEAlternativas(q.enunciado);
            return { ...q, enunciado_limpo: corpo, alternativas };
          });
          setQuestions(parsedList);
          setSessionMode("standby");
        }
      } catch (err) {
        console.error("Erro ao carregar sessão:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    carregarSessao();
    return () => {
      ignore = true;
    };
  }, [queryId, sessionQuery, modeQuery]);

  // Carregamento paginado sob demanda (em lotes de 100) quando o aluno avança ou salta
  useEffect(() => {
    if (sessionType !== "treino" || !treinoFilters || totalCount <= 0) return;
    const pageNeeded = Math.floor(currentIndex / 100) + 1;
    if (loadedPages.has(pageNeeded)) return;

    let ignore = false;
    setLoadingChunk(true);

    fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filters: treinoFilters,
        limit: 100,
        page: pageNeeded,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return;
        if (data && data.questoes && Array.isArray(data.questoes)) {
          const parsedBatch = data.questoes.map((q: any) => {
            const { corpo, alternativas } = extrairEnunciadoEAlternativas(q.enunciado);
            return { ...q, enunciado_limpo: corpo, alternativas };
          });
          const start = (pageNeeded - 1) * 100;
          setQuestions((prev) => {
            const next = [...prev];
            if (next.length < totalCount) next.length = totalCount;
            parsedBatch.forEach((q: any, i: number) => {
              next[start + i] = q;
            });
            return next;
          });
          setLoadedPages((prev) => new Set(prev).add(pageNeeded));
        }
      })
      .catch((err) => console.error("Erro ao carregar lote de questões:", err))
      .finally(() => {
        if (!ignore) setLoadingChunk(false);
      });

    return () => {
      ignore = true;
    };
  }, [currentIndex, sessionType, treinoFilters, totalCount, loadedPages]);

  // Cronômetro
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (sessionMode === "active") {
      if (sessionType === "simulado") {
        if (timeLeft > 0) {
          timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
        } else if (timeLeft === 0) {
          setSessionMode("result");
        }
      } else {
        // Treino Livre: cronômetro progressivo
        timer = setInterval(() => setTimeLeft((prev) => prev + 1), 1000);
      }
    }
    return () => clearInterval(timer);
  }, [sessionMode, sessionType, timeLeft]);

  // Iniciar Simulado Rápido do Standby
  const startWorkoutSimulado = () => {
    if (!isAuthenticated && !userLoading) {
      setShowAuthModal(true);
      return;
    }
    setSessionType("simulado");
    setSessionMode("active");
    setCurrentIndex(0);
    setAnswers({});
    setSubmitResults({});
    setFeedbacks({});
    setJustificativas({});
    setBookmarks(new Set());
    setTotalTimeInitial(45 * 60);
    setTimeLeft(45 * 60);
  };

  // Iniciar Treino Livre do Standby
  const startWorkoutTreino = () => {
    if (!isAuthenticated && !userLoading) {
      setShowAuthModal(true);
      return;
    }
    setSessionType("treino");
    setSessionMode("active");
    setCurrentIndex(0);
    setAnswers({});
    setSubmitResults({});
    setFeedbacks({});
    setJustificativas({});
    setBookmarks(new Set());
    setTotalTimeInitial(0);
    setTimeLeft(0);
  };

  const handleSelectOption = (key: string) => {
    // Bloqueia alteração/tentativa de acerto caso a questão já tenha sido rendida no Nível 5
    if (hint5Used[currentIndex]) return;
    if (!isAuthenticated && !userLoading) {
      setShowAuthModal(true);
      return;
    }
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: key }));
    setAnsweredIndices((prev) => new Set(prev).add(currentIndex));
  };

  const toggleBookmark = (idx: number) => {
    const next = new Set(bookmarks);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setBookmarks(next);
  };

  // Submissão da questão atual (apenas no Modo Treino)
  const handleSubmitCurrent = async () => {
    const q = questions[currentIndex];
    const userAns = q ? answers[q.id] : undefined;
    if (!q || !userAns || hint5Used[currentIndex]) return;

    // Rastreamento telemetria de dicas socráticas utilizadas para responder
    const qHints = hintsHistory[currentIndex] || [];
    const usedHints = qHints.length > 0;
    const maxHintLevel = usedHints ? Math.max(...qHints.map((h) => h.nivel)) : 0;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/questions/${q.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resposta: userAns,
          aluno_id: profile.isGuest ? 9999 : (profile.id || 9999),
          tempo_segundos: timeLeft,
          confianca: confianca[currentIndex] || 4,
          estrategia_usada: usedHints
            ? (estrategias[currentIndex]
                ? `${estrategias[currentIndex]} [Dica Socrática Nível ${maxHintLevel}]`
                : `Dica Socrática Nível ${maxHintLevel}`)
            : (estrategias[currentIndex] || null),
          anotacoes: justificativas[currentIndex] || null,
          dica_socratica_usada: usedHints,
          nivel_max_dica: maxHintLevel,
          total_dicas_solicitadas: qHints.length,
        }),
      });
      const data = await res.json();
      if (!data.error) {
        setSubmitResults((prev) => ({ ...prev, [currentIndex]: data }));
      }
    } catch (err) {
      console.error("Erro na submissão:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const currentHintLevel = hintLevels[currentIndex] || 1;

  // Solicitar Dica Socrática (Modo Treino com 5 Níveis Pedagógicos Progressivos)
  const pedirDicaSocratica = async () => {
    const q = questions[currentIndex];
    if (!q) return;

    // Se a 5ª dica já foi revelada nesta questão, nada mais a solicitar
    if (hint5Used[currentIndex]) return;

    // Se o próximo nível for o Nível 5 (Gabarito Oficial), exige confirmação explícita
    if (currentHintLevel === 5) {
      setShowHint5ConfirmModal(true);
      return;
    }

    await executarRequisicaoDica(currentHintLevel, false);
  };

  const confirmarEDesbloquearDica5 = async () => {
    setShowHint5ConfirmModal(false);
    await executarRequisicaoDica(5, true);
  };

  const executarRequisicaoDica = async (targetLevel: number, isLevel5Penalty: boolean) => {
    const q = questions[currentIndex];
    if (!q) return;

    setLoadingHint(true);
    setHintError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sua sessão expirou. Entre novamente.");

      let prefPedagogica = profile?.pedagogicalPreference || "conceitual";
      const motivacoes = profile?.motivacoesSelecionadas || [];
      const foco = (profile?.focoConcurso || "").toUpperCase();

      if (motivacoes.includes("superior_docencia")) {
        prefPedagogica = "rigor_formal";
      } else if (motivacoes.includes("data_science_ml")) {
        prefPedagogica = "aplicado_ml";
      } else if (
        motivacoes.includes("concursos_militares") ||
        ["ITA", "IME", "AFA", "EFOMM", "ESCOLA NAVAL"].some((b) => foco.includes(b))
      ) {
        prefPedagogica = "competitivo";
      }

      const res = await fetch("/api/ai/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({
          enunciado: q.enunciado,
          materia: q.materia || "Matemática",
          topico: q.topico || "Matemática",
          subtopico: q.subtopico || null,
          gabarito: q.gabarito || null,
          solucao: q.solucao || null,
          nivel: targetLevel,
          tentativas_anteriores: justificativas[currentIndex] || answers[currentIndex] || null,
          pedagogical_preference: prefPedagogica,
          pedagogicalPreference: prefPedagogica,
          foco_concurso: profile?.focoConcurso || null,
          motivacoes: motivacoes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Erro ${res.status} ao conectar com MathAI Engine`);
      }

      if (data.dica) {
        const novaDica = {
          nivel: targetLevel,
          dica: data.dica,
          modelo: data.modelo || (data.provedor === "nvidia" ? "NVIDIA Nemotron" : data.provedor === "openrouter" ? "OpenRouter" : "MathAI Engine"),
          confianca: typeof data.confianca === "number" ? data.confianca : 0.95,
        };

        setHints((prev) => ({ ...prev, [currentIndex]: data.dica }));
        setHintMeta((prev) => ({
          ...prev,
          [currentIndex]: {
            modelo: novaDica.modelo,
            confianca: novaDica.confianca,
          },
        }));

        setHintsHistory((prev) => {
          const list = prev[currentIndex] || [];
          const filtered = list.filter((h) => h.nivel !== targetLevel);
          return { ...prev, [currentIndex]: [...filtered, novaDica].sort((a, b) => a.nivel - b.nivel) };
        });

        if (targetLevel < 5) {
          setHintLevels((prev) => ({ ...prev, [currentIndex]: Math.min(5, targetLevel + 1) }));
        } else {
          setHintLevels((prev) => ({ ...prev, [currentIndex]: 5 }));
        }

        // Se a Dica 5 foi solicitada: penalidade pedagógica imediata (computa como incorreta no SM-2)
        if (isLevel5Penalty || targetLevel === 5) {
          setHint5Used((prev) => ({ ...prev, [currentIndex]: true }));
          setAnsweredIndices((prev) => new Set(prev).add(currentIndex));
          setAnswers((prev) => ({ ...prev, [q.id]: "DICA_5_REVELADA" }));

          const resOficial = q.solucao || q.gabarito || "Gabarito Oficial";

          // 1. Marca tentativa como incorreta no estado da sessão com nota zero no SM-2
          setSubmitResults((prev) => ({
            ...prev,
            [currentIndex]: {
              acertou: false,
              gabarito: resOficial,
              resposta_enviada: "Resolução Revelada (Dica 5 - Rendição)",
              sm2: {
                repeticoes: 0,
                fator_facilidade: 1.3,
                intervalo_dias: 1,
                proxima_revisao_data: new Date(Date.now() + 86400000).toISOString().split("T")[0],
              },
            },
          }));

          // 2. Registra veredito incorreto no estado discursivo
          const evalIncorreto: DiscursiveEvaluationResult = {
            veredito: "incorreto",
            desenvolvimento_presente: false,
            resultado_final_correto: false,
            etapas_corretas: [],
            erros_identificados: ["Resolução oficial revelada via 5ª Dica Socrática (Rendição Pedagógica)."],
            feedback_latex: "Questão encerrada por consulta à Resolução Completa (Nível 5). A resolução comentada passo a passo está disponível no card do Tutor Socrático abaixo.",
            diagnostico: "Resolução oficial revelada via 5ª Dica Socrática. Tentativa computada como incorreta (Nota 0 / SM-2) para fixação pedagógica.",
            precisa_revisao_humana: false,
          };
          setDiscursiveEvaluations((prev) => ({
            ...prev,
            [q.id]: evalIncorreto,
            [currentIndex]: evalIncorreto,
          }));

          // 3. Persistência assíncrona da submissão no Postgres com qualidade de revisão zero e telemetria
          fetch(`/api/questions/${q.id}/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              resposta: "DICA_5_REVELADA",
              aluno_id: profile.isGuest ? 9999 : (profile.id || 9999),
              tempo_segundos: timeLeft,
              confianca: 1,
              tipo_erro: "conceitual",
              estrategia_usada: "Dica Socrática Nível 5 (Resolução Revelada / Rendição)",
              anotacoes: "Gabarito revelado via 5ª Dica Socrática. Tentativa zerada no SM-2.",
              dica_socratica_usada: true,
              nivel_max_dica: 5,
              total_dicas_solicitadas: (hintsHistory[currentIndex]?.length || 0) + 1,
              rendicao_nivel_5: true,
            }),
          }).catch((e) => console.warn("Erro ao registrar submissão de Dica 5:", e));
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar dica";
      console.error("Erro ao pedir dica:", err);
      setHintError(msg);
    } finally {
      setLoadingHint(false);
    }
  };

  // Upload e OCR de Caderno (Modo Treino)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageFiles((prev) => ({ ...prev, [currentIndex]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Avaliação Discursiva com MathAI Engine (Lousa, Geometria e Dedução & OCR)
  const submeterResolucaoDiscursiva = async (
    origem: "lousa" | "geometria" | "texto",
    overrideContent?: { texto?: string; imagemBase64?: string }
  ) => {
    const q = questions[currentIndex];
    if (!q) return;

    if (hint5Used[currentIndex]) {
      alert("A resolução oficial desta questão já foi revelada (Nível 5). A questão já foi computada como incorreta.");
      return;
    }

    const geoCmds = geometricCommands[currentIndex] || [];
    let textoDeducao = overrideContent?.texto !== undefined ? overrideContent.texto : (justificativas[currentIndex] || "");
    const imageBase64 = overrideContent?.imagemBase64 !== undefined ? overrideContent.imagemBase64 : (imageFiles[currentIndex] || null);

    if (origem === "geometria" && geoCmds.length > 0 && !overrideContent?.texto) {
      textoDeducao = `Construção Euclidiana executada:\n${geoCmds.join("\n")}${justificativas[currentIndex] ? `\n\nNotas do aluno: ${justificativas[currentIndex]}` : ""}`;
    }

    if (origem === "lousa" && !imageBase64 && !textoDeducao.trim()) {
      alert("Por favor, desenhe seu raciocínio na Lousa de Rascunho antes de avaliar.");
      return;
    }

    if (origem === "geometria" && !textoDeducao.trim() && geoCmds.length === 0) {
      alert("Por favor, execute comandos ou selecione uma construção na Bancada Euclidiana antes de submeter para avaliação.");
      return;
    }

    if (!imageBase64 && !textoDeducao.trim()) {
      alert("Por favor, desenvolva seu raciocínio na Lousa, Geometria Euclidiana ou Dedução & OCR antes de submeter para avaliação.");
      return;
    }

    setLoadingDiscursive(true);
    setLoadingIa(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = "Bearer " + session.access_token;
      }

      const res = await fetch("/api/ai/solve", {
        method: "POST",
        headers,
        body: JSON.stringify({
          enunciado: q.enunciado,
          gabarito: q.gabarito || "",
          justificativa: textoDeducao || (origem === "lousa" ? "Resolução manuscrita desenhada na Lousa de Rascunho." : "Construção geométrica desenvolvida na Bancada Euclidiana."),
          imagem_base64: imageBase64 || null,
        }),
      });

      const data = await res.json();
      const rawVeredito: "aprovado" | "parcial" | "sem_desenvolvimento" | "incorreto" =
        data.veredito || (data.status_resolucao === "correto" ? "aprovado" : data.status_resolucao === "erro_conta_sinal" ? "parcial" : "incorreto");

      const evalResult: DiscursiveEvaluationResult = {
        veredito: rawVeredito,
        desenvolvimento_presente: Boolean(data.desenvolvimento_presente),
        resultado_final_correto: Boolean(data.resultado_final_correto),
        etapas_corretas: data.etapas_corretas || data.passos || [],
        erros_identificados: data.erros_identificados || (data.linha_do_erro ? [data.linha_do_erro] : []),
        feedback_latex: data.feedback_latex || data.diagnostico || "Avaliação realizada.",
        precisa_revisao_humana: Boolean(data.precisa_revisao_humana),
        diagnostico: data.diagnostico,
        modelo: data.modelo,
        confianca: data.confianca,
        transcricao_latex: data.transcricao_latex,
        linha_do_erro: data.linha_do_erro,
        dica_proximo_passo: data.dica_proximo_passo,
      };

      setDiscursiveEvaluations((prev) => ({ ...prev, [q.id]: evalResult }));
      setDiagnosticosIa((prev) => ({ ...prev, [currentIndex]: data }));

      // REGRA DE OURO PARA sem_desenvolvimento e avaliação inconclusiva:
      // Não marca como respondida, não incrementa respondidasCount, não persiste definitivo
      if (evalResult.precisa_revisao_humana) {
        return;
      }
      if (rawVeredito === "sem_desenvolvimento") {
        return;
      }

      // Tentativa Válida (aprovado, parcial, incorreto):
      setAnsweredIndices((prev) => new Set(prev).add(currentIndex));

      // Telemetria das dicas socráticas utilizadas até a submissão discursiva
      const qHints = hintsHistory[currentIndex] || [];
      const usedHints = qHints.length > 0;
      const maxHintLevel = usedHints ? Math.max(...qHints.map((h) => h.nivel)) : 0;

      // Persistência em public.tentativas e revisao_espacada via API submit
      try {
        const submitRes = await fetch(`/api/questions/${q.id}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo_questao: "discursiva",
            veredito: rawVeredito,
            resposta: rawVeredito,
            aluno_id: profile.isGuest ? 9999 : (profile.id || 9999),
            tempo_segundos: timeLeft,
            confianca: confianca[currentIndex] || 4,
            estrategia_usada: `Discursiva (${origem})`,
            anotacoes: evalResult.feedback_latex,
            dica_socratica_usada: usedHints,
            nivel_max_dica: maxHintLevel,
            total_dicas_solicitadas: qHints.length,
          }),
        });
        const submitData = await submitRes.json();
        if (!submitData.error) {
          setSubmitResults((prev) => ({ ...prev, [currentIndex]: submitData }));
        }
      } catch (saveErr) {
        console.warn("Aviso ao persistir tentativa discursiva:", saveErr);
      }
    } catch (err) {
      console.error("Erro ao avaliar com MathAI Engine:", err);
    } finally {
      setLoadingDiscursive(false);
      setLoadingIa(false);
    }
  };

  const enviarParaMathAiEngine = async () => {
    await submeterResolucaoDiscursiva("texto");
  };

  // Solicitar Explicação Pós-Simulado da MathAI Engine para uma questão
  const pedirExplicacaoPosSimulado = async (q: Question) => {
    if (resolucoesIa[q.id]) return;

    setLoadingResolucaoIa((prev) => ({ ...prev, [q.id]: true }));
    try {
      const respostaAluno = answers[q.id] || "Não respondeu (em branco)";
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = "Bearer " + session.access_token;
      }
      const res = await fetch("/api/ai/solve", {
        method: "POST",
        headers,
        body: JSON.stringify({
          enunciado: q.enunciado,
          gabarito: q.gabarito,
          justificativa: `O estudante assinalou a alternativa: (${respostaAluno}). Explique o passo a passo completo da questão e diagnostique a pegadinha ou raciocínio por trás da alternativa assinalada.`,
          modo: "explicar",
        }),
      });
      const data = await res.json();
      setResolucoesIa((prev) => ({ ...prev, [q.id]: data }));
    } catch (err) {
      console.error("Erro ao carregar explicação da IA pós-simulado:", err);
    } finally {
      setLoadingResolucaoIa((prev) => ({ ...prev, [q.id]: false }));
    }
  };

  // Solicitar Explicação Imediata no Modo Treino Livre
  const pedirExplicacaoTreino = async (q: Question, respostaAlunoParam?: string) => {
    if (resolucoesIa[q.id]) return;

    setLoadingResolucaoIa((prev) => ({ ...prev, [q.id]: true }));
    try {
      const respostaAluno = respostaAlunoParam || answers[q.id] || "Dúvida do aluno";
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = "Bearer " + session.access_token;
      }
      const res = await fetch("/api/ai/solve", {
        method: "POST",
        headers,
        body: JSON.stringify({
          enunciado: q.enunciado,
          gabarito: q.gabarito,
          justificativa: `O estudante assinalou a alternativa: (${respostaAluno}). Gabarito oficial: (${q.gabarito}). Apresente a resolução axiomática passo a passo, evidencie o lema ou princípio teórico determinante e aponte a pegadinha ou distrator da alternativa assinalada.`,
          modo: "explicar",
        }),
      });
      const data = await res.json();
      setResolucoesIa((prev) => ({ ...prev, [q.id]: data }));
    } catch (err) {
      console.error("Erro ao carregar resolução da IA no modo treino:", err);
    } finally {
      setLoadingResolucaoIa((prev) => ({ ...prev, [q.id]: false }));
    }
  };

  // Feedback do Aluno
  const updateFeedbackState = (idx: number, patch: Partial<FeedbackState>) => {
    setFeedbacks((prev) => {
      const current = prev[idx] || {
        util: null,
        concorda: null,
        comentario: "",
        submitting: false,
        submitted: false,
        error: null,
      };
      return {
        ...prev,
        [idx]: { ...current, ...patch },
      };
    });
  };

  const handleSendFeedback = async (
    qId: number,
    idx: number,
    tipo: "diagnostico_ia" | "dica",
    modelo: string,
    confiancaStr: string
  ) => {
    const fb = feedbacks[idx] || {
      util: null,
      concorda: null,
      comentario: "",
      submitting: false,
      submitted: false,
      error: null,
    };

    if (fb.util === null && fb.concorda === null) return;
    updateFeedbackState(idx, { submitting: true, error: null });

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questao_id: qId,
          aluno_id: profile.isGuest ? 9999 : (profile.id || 9999),
          tipo,
          util: fb.util,
          concorda_diagnostico: fb.concorda,
          modelo_ia: modelo,
          confianca_ia: confiancaStr,
          comentario: fb.comentario || null,
          metadados: {
            questao_index: idx,
            questao_id: qId,
            resposta_estudante: answers[qId] || answers[idx] || null,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        updateFeedbackState(idx, { submitting: false, submitted: true });
      } else {
        updateFeedbackState(idx, {
          submitting: false,
          error: data.error || "Erro ao registrar feedback no Supabase.",
        });
      }
    } catch (err) {
      updateFeedbackState(idx, {
        submitting: false,
        error: "Falha de conexão ao enviar feedback.",
      });
    }
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
  // Contagens para o Simulado & Treino: objetivas respondidas + discursivas com veredito válido + rendição dica 5
  const respondidasCount = useMemo(() => {
    const answeredIds = new Set<number>();
    Object.keys(answers).forEach((idStr) => {
      const qId = parseInt(idStr, 10);
      if (answers[qId] !== undefined) answeredIds.add(qId);
    });
    Object.entries(discursiveEvaluations).forEach(([idStr, evalObj]) => {
      const qId = parseInt(idStr, 10);
      if (evalObj && evalObj.veredito !== "sem_desenvolvimento" && !evalObj.precisa_revisao_humana) {
        answeredIds.add(qId);
      }
    });
    Object.entries(hint5Used).forEach(([idxStr, used]) => {
      if (used) {
        const idx = parseInt(idxStr, 10);
        const q = questions[idx];
        if (q) answeredIds.add(q.id);
      }
    });
    return answeredIds.size;
  }, [answers, discursiveEvaluations, hint5Used, questions]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <span className="text-sm font-medium">Carregando ambiente de resolução e simulador...</span>
      </div>
    );
  }

  const currentQ = questions[currentIndex] || questions[0];
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const currentResult = submitResults[currentIndex];
  const currentDiagnostico = diagnosticosIa[currentIndex];
  const currentImage = imageFiles[currentIndex];
  const currentFeedback = feedbacks[currentIndex] || {
    util: null,
    concorda: null,
    comentario: "",
    submitting: false,
    submitted: false,
    error: null,
  };

  const emBrancoCount = Math.max(0, (totalCount > 0 ? totalCount : questions.length) - respondidasCount);

  // Banner dinâmico da sessão
  let sessionBannerText = sessionType === "simulado" ? "Modo Simulado Oficial" : "Modo Treino Livre";
  if (questions.length > 0) {
    const firstQ = questions[0];
    const sameBanca = questions.every((q) => q.banca === firstQ.banca);
    const sameAno = questions.every((q) => q.ano === firstQ.ano);
    const sameMateria = questions.every((q) => q.materia === firstQ.materia);

    if (sessionType === "simulado") {
      if (sameBanca && firstQ.banca) {
        const anoPart = (sameAno && firstQ.ano) ? (" " + firstQ.ano) : "";
        sessionBannerText += " · " + firstQ.banca + anoPart;
      }
    } else {
      if (sameBanca && firstQ.banca) {
        const anoPart = (sameAno && firstQ.ano) ? (" " + firstQ.ano) : "";
        sessionBannerText = "Modo Treino · " + firstQ.banca + anoPart;
      } else if (sameMateria && firstQ.materia) {
        sessionBannerText += " · " + firstQ.materia;
      }
    }
  }

  // ==========================================
  // TELA DE STANDBY
  // ==========================================
  if (sessionMode === "standby") {
    return (
      <div className="space-y-8 max-w-4xl mx-auto py-6 animate-fadeIn text-slate-800 dark:text-[#f5f0df]">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-xs font-semibold text-amber-700 dark:text-[#d9b452]">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Simulador & Treino Interativo · LEMMAS Core & MathAI Engine</span>
          </div>
          <h1 className="font-serif-math text-3xl md:text-4xl font-normal text-slate-900 dark:text-[#f5f0df] tracking-tight">
            Ambiente de Resolução & Diagnóstico.
          </h1>
          <p className="text-slate-600 dark:text-zinc-400 text-sm leading-relaxed max-w-2xl font-sans">
            Escolha como prefere praticar: crie um simulado cronometrado com regras oficiais de concurso ou estude sem pressão com o auxílio em tempo real da MathAI Engine.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {/* CARD 1: MODO ESTUDO LIVRE (swapped with simulado) */}
          <div className="bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-amber-500/35 transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
                💡
              </div>
              <h3 className="font-serif-math font-semibold text-slate-900 dark:text-[#f5f0df] text-base">Modo Estudo Livre</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed font-sans">
                Sem pressão de tempo. Tutor Socrático ativado, envio de foto do caderno, dicas progressivas e atualização SM-2 imediata.
              </p>
            </div>
            <button
              onClick={startWorkoutTreino}
              className="mt-6 w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1b172e] dark:hover:bg-[#25203d] text-slate-800 dark:text-[#f5f0df] border border-slate-200 dark:border-amber-500/20 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
              <span>Treinar Livremente</span>
            </button>
          </div>

          {/* CARD 2: SIMULADO CRONOMETRADO (swapped with treino livre) */}
          <div className="bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-amber-500/35 transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-[#d9b452] flex items-center justify-center font-bold text-lg">
                ⏱️
              </div>
              <h3 className="font-serif-math font-semibold text-slate-900 dark:text-[#f5f0df] text-base">Simulado com Tempo</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed font-sans">
                Cronômetro oficial, gabarito oculto e sem auxílio de IA durante a prova. Relatório completo de acertos e erros ao entregar.
              </p>
            </div>
            <button
              onClick={startWorkoutSimulado}
              className="lemmas-gold-cta mt-6 w-full py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Iniciar Simulado Rápido</span>
            </button>
          </div>

          {/* CARD 3: NAVEGAR NO BANCO */}
          <div className="bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-amber-500/35 transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-[#d9b452] flex items-center justify-center font-bold text-lg">
                📚
              </div>
              <h3 className="font-serif-math font-semibold text-slate-900 dark:text-[#f5f0df] text-base">Montar Simulado no Banco</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed font-sans">
                Filtre por EFOMM, CEDERJ, ESA, tópicos ou anos e escolha exatamente quais questões você quer no simulado.
              </p>
            </div>
            <Link
              href="/questoes"
              className="mt-6 w-full py-2.5 rounded-xl border border-slate-300 dark:border-amber-500/20 text-slate-700 dark:text-[#dedbd0] hover:bg-slate-50 dark:hover:bg-[#1b172e] font-semibold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <span>Ir ao Banco de Questões</span>
            </Link>
          </div>
        </div>

        <AuthPromptModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    );
  }

  // ==========================================
  // TELA DE RESULTADOS DO SIMULADO (PÓS-PROVA)
  // ==========================================
  if (sessionMode === "result") {
    let acertos = 0;
    let erros = 0;
    let emBranco = 0;

    questions.forEach((q) => {
              const resp = answers[q.id];
              const gabarito = (q.gabarito || "").trim().toUpperCase();
              if (!resp) {
                emBranco++;
              } else if (!gabarito) {
                // Gabarito ausente: não conta como acerto nem erro, preserva distinção
                emBranco++;
              } else if (resp.toUpperCase() === gabarito) {
                acertos++;
              } else {
                erros++;
              }
            });

    const taxa = Math.round((acertos / (questions.length || 1)) * 100);
    const tempoGastoSegundos = sessionType === "simulado" 
      ? Math.max(0, totalTimeInitial - timeLeft)
      : timeLeft;
    const tempoMin = Math.floor(tempoGastoSegundos / 60);
    const tempoSeg = tempoGastoSegundos % 60;

    // Filtra questões para exibição na lista de revisão
    const questoesRevisao = questions.filter((q) => {
          const resp = answers[q.id];
          const gabarito = (q.gabarito || "").trim().toUpperCase();
          if (reviewFilter === "acertos") return resp && gabarito && resp.toUpperCase() === gabarito;
          if (reviewFilter === "erros") return resp && gabarito && resp.toUpperCase() !== gabarito;
          if (reviewFilter === "em_branco") return !resp || !gabarito;
          return true;
        });

    return (
      <div className="max-w-4xl mx-auto py-8 space-y-8 animate-fadeIn text-slate-800 dark:text-[#f5f0df]">
        {/* CABEÇALHO DE RESULTADOS */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-[#d9b452] flex items-center justify-center text-3xl mx-auto shadow-sm">
            🏆
          </div>
          <h2 className="font-serif-math text-3xl font-semibold text-slate-900 dark:text-[#f5f0df]">
            Simulado Finalizado!
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-zinc-400 max-w-xl mx-auto">
            Confira o seu aproveitamento, a distribuição de acertos e analise agora cada questão com a <strong>MathAI Engine</strong> para entender as pegadinhas e os lemas teóricos.
          </p>
        </div>

        {/* MÉTRICAS PRINCIPAIS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* ACERTOS */}
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-center space-y-1">
            <div className="text-2xl md:text-3xl font-bold font-serif-math text-emerald-700 dark:text-emerald-400">
              {acertos}
            </div>
            <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              Acertos ({taxa}%)
            </div>
            <div className="text-[10px] text-emerald-600/80">Respostas Corretas</div>
          </div>

          {/* ERROS */}
          <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-center space-y-1">
            <div className="text-2xl md:text-3xl font-bold font-serif-math text-rose-700 dark:text-rose-400">
              {erros}
            </div>
            <div className="text-xs font-semibold text-rose-800 dark:text-rose-300">
              Erros ({Math.round((erros / questions.length) * 100)}%)
            </div>
            <div className="text-[10px] text-rose-600/80">Divergências do Gabarito</div>
          </div>

          {/* EM BRANCO */}
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-center space-y-1">
            <div className="text-2xl md:text-3xl font-bold font-serif-math text-amber-700 dark:text-[#d9b452]">
              {emBranco}
            </div>
            <div className="text-xs font-semibold text-amber-800 dark:text-[#d9b452]">
              Em Branco ({Math.round((emBranco / questions.length) * 100)}%)
            </div>
            <div className="text-[10px] text-amber-600/80">Não respondidas</div>
          </div>

          {/* TEMPO TOTAL */}
          <div className="p-5 rounded-2xl bg-slate-100 dark:bg-[#141222] border border-slate-200 dark:border-zinc-800 text-center space-y-1">
            <div className="text-2xl md:text-3xl font-bold font-serif-math text-slate-900 dark:text-[#f5f0df]">
              {tempoMin}m {tempoSeg}s
            </div>
            <div className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Tempo Gasto
            </div>
            <div className="text-[10px] text-slate-400">Duração da prova</div>
          </div>
        </div>

        {/* NOTA PEDAGÓGICA SOBRE QUESTÕES EM BRANCO */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 text-xs leading-relaxed">
          <HelpCircle className="w-5 h-5 text-amber-600 dark:text-[#d9b452] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-amber-900 dark:text-[#f5f0df] block">
              Como questões em branco são contabilizadas?
            </strong>
            <p className="text-slate-700 dark:text-zinc-300">
              Em concursos militares (EFOMM, ESA) e vestibulares convencionais, questões deixadas em branco conferem <strong>0 pontos</strong> (não somam no aproveitamento final). Mostramos as questões em branco separadas dos erros propositais para que você possa avaliar sua estratégia de gestão de tempo e saber quando vale a pena pular ou arriscar.
            </p>
          </div>
        </div>

        {/* REVISÃO QUESTÃO A QUESTÃO COM A MATHAI ENGINE */}
        <div className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-zinc-800 pb-3">
            <div>
              <h3 className="font-serif-math text-xl font-bold text-slate-900 dark:text-[#f5f0df]">
                Revisão e Diagnóstico Pedagógico
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Clique nas questões para ver a resolução e acionar o diagnóstico da MathAI Engine.
              </p>
            </div>

            {/* ABAS DE FILTRO */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#18152a] text-xs font-semibold">
              <button
                type="button"
                onClick={() => setReviewFilter("todas")}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  reviewFilter === "todas" ? "bg-white dark:bg-[#231f38] text-amber-700 dark:text-[#d9b452] shadow-xs" : "text-slate-500"
                }`}
              >
                Todas {(() => { const t = parseInt(searchParams.get("total") || "0", 10); return t || questions.length; })()}
              </button>
              <button
                type="button"
                onClick={() => setReviewFilter("erros")}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  reviewFilter === "erros" ? "bg-rose-500/20 text-rose-700 dark:text-rose-400 shadow-xs" : "text-slate-500"
                }`}
              >
                Erros ({erros})
              </button>
              <button
                type="button"
                onClick={() => setReviewFilter("em_branco")}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  reviewFilter === "em_branco" ? "bg-amber-500/20 text-amber-700 dark:text-[#d9b452] shadow-xs" : "text-slate-500"
                }`}
              >
                Em Branco ({emBranco})
              </button>
              <button
                type="button"
                onClick={() => setReviewFilter("acertos")}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  reviewFilter === "acertos" ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 shadow-xs" : "text-slate-500"
                }`}
              >
                Acertos ({acertos})
              </button>
            </div>
          </div>

          {/* LISTA DAS QUESTÕES REVISADAS */}
          <div className="space-y-4">
            {questoesRevisao.map((q) => {
                          const originalIndex = questions.findIndex((item) => item.id === q.id);
                          const alunoResp = answers[q.id];
                          const gabarito = (q.gabarito || "").trim().toUpperCase();
                          const acertou = alunoResp && gabarito && alunoResp.toUpperCase() === gabarito;
                          const isEmBranco = !alunoResp;
              const isExpanded = expandedReviewId === q.id;
              const iaResult = resolucoesIa[q.id];
              const isCarregandoIa = loadingResolucaoIa[q.id];

              return (
                <div
                  key={q.id}
                  className={`p-5 rounded-2xl bg-white dark:bg-[#141222] border transition-all space-y-4 ${
                    acertou
                      ? "border-emerald-500/30"
                      : isEmBranco
                      ? "border-amber-500/30"
                      : "border-rose-500/30"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 font-bold">
                        Questão #{originalIndex + 1}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">
                        {q.banca} {q.ano} · {q.materia} ({q.topico})
                      </span>
                      {(q.lema_codigo || q.lema_id) && (
                        <LemaBadge lemaCodigo={q.lema_codigo} lemaId={q.lema_id} variant="compact" />
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {acertou ? (
                                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Acertou ({alunoResp})
                                              </span>
                                            ) : isEmBranco ? (
                                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-[#d9b452] border border-amber-500/30 text-xs font-bold">
                                                <HelpCircle className="w-3.5 h-3.5" /> Em Branco {gabarito ? `(Correta: ${gabarito})` : `(Sem gabarito)`}
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30 text-xs font-bold">
                                                <XCircle className="w-3.5 h-3.5" /> Errou: Marcou ({alunoResp}) {gabarito ? `· Correta (${gabarito})` : `· Sem gabarito`}
                                              </span>
                                            )}

                      <button
                        type="button"
                        onClick={() => setExpandedReviewId(isExpanded ? null : q.id)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-500"
                        title={isExpanded ? "Recolher detalhes" : "Expandir questão"}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* ENUNCIADO RESUMIDO OU EXPANDIDO */}
                  <div className="text-sm font-medium text-slate-800 dark:text-[#f5f0df] leading-relaxed whitespace-pre-line">
                    <MathText text={q.enunciado_limpo || q.enunciado} />
                  </div>

                  {/* ÁREA EXPANDIDA COM IA */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 space-y-4 animate-fadeIn">
                      {/* ALTERNATIVAS */}
                      {q.alternativas && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                          {Object.entries(q.alternativas).map(([letra, valor]) => {
                            const isAluno = alunoResp === letra;
                            const gabarito = (q.gabarito || "").trim().toUpperCase();
                            const isGabarito = gabarito && gabarito === letra.toUpperCase();

                            return (
                              <div
                                key={letra}
                                className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                                  isGabarito
                                    ? "bg-emerald-500/15 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold"
                                    : isAluno
                                    ? "bg-rose-500/15 border-rose-500 text-rose-900 dark:text-rose-200 font-semibold"
                                    : "bg-slate-50/50 dark:bg-zinc-900/40 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400"
                                }`}
                              >
                                <span className="font-bold">({letra})</span>
                                <MathText text={valor} />
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* BOTÃO PARA PEDIR EXPLICAÇÃO À IA */}
                      {!iaResult && (
                        <div className="pt-2 space-y-2">
                          <button
                            type="button"
                            onClick={() => pedirExplicacaoPosSimulado(q)}
                            disabled={isCarregandoIa}
                            className="lemmas-gold-cta px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition hover:scale-[1.02]"
                          >
                            {isCarregandoIa ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <BrainCircuit className="w-3.5 h-3.5" />
                            )}
                            <span>
                              {isCarregandoIa ? "MathAI Engine Analisando..." : "Explicar Resolução com MathAI Engine"}
                            </span>
                          </button>

                          {isCarregandoIa && (
                            <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 text-xs shadow-xs animate-fadeIn">
                              <ThoughtLine
                                working={true}
                                label="MathAI Engine estruturando demonstração…"
                                steps={[
                                  "Recuperando teoremas e lemas fundamentais da questão",
                                  "Construindo encadeamento dedutivo passo a passo",
                                  "Formatando fórmulas matemáticas e equações em KaTeX",
                                ]}
                                color="#9333ea"
                                glyphColor="#9333ea"
                                fontSize={12}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* RESULTADO DA IA */}
                      {iaResult && (
                        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/25 space-y-3 text-xs leading-relaxed animate-fadeIn">
                          <div className="flex items-center justify-between pb-2 border-b border-purple-500/20">
                            <span className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" />
                              Parecer da MathAI Engine:
                            </span>
                            <span className="text-[11px] font-mono text-purple-600 dark:text-purple-300">
                              Status: {iaResult.status_resolucao}
                            </span>
                          </div>
                          <div className="text-slate-800 dark:text-zinc-200">
                            <MathText text={iaResult.diagnostico} />
                          </div>
                          {iaResult.dica_proximo_passo && (
                            <div className="p-2.5 rounded-lg bg-white/70 dark:bg-[#18152a] border border-purple-500/20 text-slate-700 dark:text-zinc-300">
                              <span className="font-bold text-purple-700 dark:text-purple-300 block mb-1">Lema / Passo-chave:</span>
                              <MathText text={iaResult.dica_proximo_passo} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTÕES DE VOLTAR */}
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={() => setSessionMode("standby")}
            className="lemmas-gold-cta px-6 py-2.5 rounded-xl font-bold text-xs shadow-md"
          >
            Voltar ao Hub de Treino
          </button>
          <Link
            href="/questoes"
            className="px-6 py-2.5 rounded-xl border border-slate-300 dark:border-amber-500/20 text-slate-700 dark:text-[#dedbd0] text-xs font-semibold hover:bg-slate-50 dark:hover:bg-[#1b172e] transition-colors"
          >
            Navegar no Banco de Questões
          </Link>
        </div>
      </div>
    );
  }

  // ==========================================
  // TELA DE RESOLUÇÃO ATIVA (SIMULADO OU TREINO)
  // ==========================================
  const effectiveTotal = totalCount > 0 ? totalCount : (questions.length || 1);

  if (loadingChunk && !currentQ) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
        <p className="text-slate-600 dark:text-zinc-400 text-sm font-medium">
          Carregando questão #{currentIndex + 1} da MathAI Engine...
        </p>
      </div>
    );
  }

  if (!currentQ || questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <p className="text-slate-600 dark:text-zinc-400 text-sm">Nenhuma questão encontrada ou carregada no momento.</p>
        <button
          onClick={() => setSessionMode("standby")}
          className="lemmas-gold-cta px-4 py-2 rounded-xl text-xs font-semibold"
        >
          Voltar ao Hub de Treino
        </button>
      </div>
    );
  }

  const isQuestionDiscursiva = Boolean(
    currentQ?.tipo === "discursiva" ||
    currentQ?.gabarito?.toLowerCase().includes("discursiv")
  );
  const { corpo, alternativas } = extrairEnunciadoEAlternativas(currentQ.enunciado, isQuestionDiscursiva);
  const isSimuladoAtivo = sessionType === "simulado";
  const isDiscursiva = Boolean(
    isQuestionDiscursiva ||
    !currentQ?.alternativas ||
    Object.keys(alternativas).length === 0
  );
  const discursiveEval = currentQ ? discursiveEvaluations[currentQ.id] : undefined;

  // Navegação de Janela Deslizante (20/22 botões com questão ativa centralizada no desktop)
  const maxStart = Math.max(0, effectiveTotal - windowSize);
  const windowStart = Math.max(0, Math.min(currentIndex - Math.floor(windowSize / 2), maxStart));
  const endIndex = Math.min(windowStart + windowSize, effectiveTotal);
  const visibleQuestionIndices = Array.from(
    { length: Math.max(0, endIndex - windowStart) },
    (_, i) => windowStart + i
  );

  const handleJumpToQuestion = (target?: number) => {
    const val = target !== undefined ? target : parseInt(jumpValue, 10);
    if (!isNaN(val) && val >= 1 && val <= effectiveTotal) {
      setCurrentIndex(val - 1);
    }
    setJumpValue("");
  };

  // Renderizador Unificado da Bancada de Resolução (Lousa, Geometria & OCR)
  const renderBancadaResolucao = () => (
    <div
      ref={bancadaRef}
      id="bancada-resolucao"
      className="bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 scroll-mt-6 animate-fadeIn"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {isDiscursiva ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-amber-600 text-white shadow-xs">
              <Sparkles className="w-3 h-3" />
              QUESTÃO DISCURSIVA
            </span>
          ) : (
            <PenTool className="w-4 h-4 text-amber-600 dark:text-[#d9b452]" />
          )}
          <h4 className="font-serif-math text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-[#dedbd0]">
            {isDiscursiva ? "Bancada de Resolução do Estudante" : "Bancada de Rascunho & Ferramentas"}
          </h4>
        </div>

        {/* ABAS RÁPIDAS DA BANCADA */}
        <div className="flex items-center gap-1.5 overflow-x-auto select-none">
          <button
            type="button"
            onClick={() => {
              if (bancadaModo === "lousa") {
                setBancadaModo(null);
              } else {
                ativarEIrParaBancada("lousa");
              }
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              bancadaModo === "lousa"
                ? "lemmas-gold-cta font-bold shadow-xs scale-105"
                : "bg-slate-100 dark:bg-[#18152a] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-amber-500/15 hover:border-amber-500/35"
            }`}
            title="Lousa com Pointer Events e rejeição de palma para rascunhos"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Lousa de Rascunho</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (bancadaModo === "geometria") {
                setBancadaModo(null);
              } else {
                ativarEIrParaBancada("geometria");
              }
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              bancadaModo === "geometria"
                ? "bg-sky-500 text-white font-bold shadow-xs scale-105"
                : "bg-slate-100 dark:bg-[#18152a] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-amber-500/15 hover:border-sky-500/35"
            }`}
            title="Quadro Euclidiano com régua, compasso e script de lemas"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Geometria Euclidiana</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (bancadaModo === "texto") {
                setBancadaModo(null);
              } else {
                ativarEIrParaBancada("texto");
              }
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              bancadaModo === "texto"
                ? "bg-purple-600 text-white font-bold shadow-xs scale-105"
                : "bg-slate-100 dark:bg-[#18152a] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-amber-500/15 hover:border-purple-500/35"
            }`}
            title="Dedução digitada em texto ou envio de foto para OCR"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Dedução & OCR</span>
          </button>
        </div>
      </div>

      {/* DICA QUANDO NENHUM MODO DA BANCADA ESTÁ ATIVO */}
      {!bancadaModo && isDiscursiva && (
        <div className="p-3.5 rounded-xl border border-amber-500/25 bg-amber-500/5 text-xs text-slate-700 dark:text-zinc-300 leading-relaxed font-sans">
          Esta questão exige desenvolvimento. Escolha acima uma ferramenta: use a <strong>Lousa</strong> para desenhar ou calcular à mão com a caneta/S-Pen, a <strong>Geometria</strong> para traçados com régua e compasso, ou <strong>Dedução & OCR</strong> para digitar ou fotografar seu caderno.
        </div>
      )}

      {!bancadaModo && !isDiscursiva && (
        <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-sans italic pt-0.5">
          Selecione uma das ferramentas acima para abrir a Lousa de Rascunho, a Bancada de Geometria ou enviar sua Dedução/OCR para a MathAI Engine.
        </p>
      )}

      {/* CONTEÚDO ATIVO DA BANCADA */}
      {bancadaModo === "lousa" && (
        <div className="space-y-3 animate-fadeIn">
          {/* Seletor de Motor da Lousa: S-Pen 120Hz (Dual-Canvas) vs Lousa Giz LemmaS */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
            <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">Motor de Escrita Digital:</span>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-900/80 p-0.5 rounded-lg border border-amber-500/20 text-[10px]">
              <button
                type="button"
                onClick={() => setLousaEngine("spen-dual")}
                className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                  lousaEngine === "spen-dual"
                    ? "bg-amber-500 text-black shadow-xs font-bold"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                }`}
              >
                ⚡ S-Pen 120Hz (Dual-Canvas)
              </button>
              <button
                type="button"
                onClick={() => setLousaEngine("classic")}
                className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                  lousaEngine === "classic"
                    ? "bg-amber-500 text-black shadow-xs font-bold"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                }`}
              >
                🎨 Lousa Giz LemmaS
              </button>
            </div>
          </div>

          {lousaEngine === "spen-dual" ? (
            <SpenSmartCanvas
              onEvaluateOcr={async (b64) => {
                setLousaHasStrokes((prev) => ({ ...prev, [currentIndex]: true }));
                setImageFiles((prev) => ({ ...prev, [currentIndex]: b64 }));
                await submeterResolucaoDiscursiva("lousa", { imagemBase64: b64 });
              }}
              isEvaluating={loadingDiscursive}
            />
          ) : (
            <>
              <MathScratchpad
                onExportBase64={(b64, hasStrokes) => {
                  setLousaHasStrokes((prev) => ({ ...prev, [currentIndex]: !!hasStrokes }));
                  setImageFiles((prev) => ({ ...prev, [currentIndex]: b64 }));
                }}
                onEvaluate={(b64) => {
                  setLousaHasStrokes((prev) => ({ ...prev, [currentIndex]: true }));
                  setImageFiles((prev) => ({ ...prev, [currentIndex]: b64 }));
                  submeterResolucaoDiscursiva("lousa", { imagemBase64: b64 });
                }}
                isEvaluating={loadingDiscursive}
                onClose={() => setBancadaModo(null)}
              />
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5">
                <div className="text-xs text-slate-700 dark:text-zinc-300">
                  <strong className="text-amber-700 dark:text-[#d9b452] block">Avaliação do Rascunho da Lousa:</strong>
                  <span>Você pode clicar diretamente em &quot;Avaliar Rascunho&quot; na barra superior da Lousa para processar sua caligrafia com a MathAI Engine.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const img = imageFiles[currentIndex];
                    if (img) {
                      submeterResolucaoDiscursiva("lousa", { imagemBase64: img });
                    } else {
                      alert("Por favor, clique em 'Avaliar Rascunho' na barra de ferramentas da Lousa para capturar seu rascunho com o digitalizador.");
                    }
                  }}
                  disabled={loadingDiscursive}
                  className="lemmas-gold-cta px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition disabled:opacity-40 shrink-0 cursor-pointer shadow-xs"
                >
                  {loadingDiscursive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />}
                  <span>Avaliar Rascunho da Lousa com MathAI Engine</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {bancadaModo === "geometria" && (
        <div className="space-y-3 animate-fadeIn">
          <GeometricCompassBoard
            onCommandsChange={(cmds) => setGeometricCommands((prev) => ({ ...prev, [currentIndex]: cmds }))}
            onClose={() => setBancadaModo(null)}
          />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border border-sky-500/30 bg-sky-500/5">
            <div className="text-xs text-slate-700 dark:text-zinc-300">
              <strong className="text-sky-600 dark:text-sky-400 block">Validação da Construção Euclidiana:</strong>
              <span>Envie os passos e propriedades da sua construção com régua, compasso e lemas para avaliação da MathAI Engine.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const geoCmds = geometricCommands[currentIndex] || [];
                const desc = geoCmds.length > 0
                  ? `Construção Euclidiana executada:\n${geoCmds.join("\n")}${justificativas[currentIndex] ? `\n\nNotas do aluno: ${justificativas[currentIndex]}` : ""}`
                  : (justificativas[currentIndex] || "");
                submeterResolucaoDiscursiva("geometria", { texto: desc });
              }}
              disabled={loadingDiscursive}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center gap-2 transition disabled:opacity-40 shrink-0 cursor-pointer shadow-xs"
            >
              {loadingDiscursive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Compass className="w-3.5 h-3.5" />}
              <span>Avaliar Geometria com MathAI Engine</span>
            </button>
          </div>
        </div>
      )}

      {bancadaModo === "texto" && (
        <div className="space-y-4 animate-fadeIn">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-amber-500/20 bg-slate-50/50 dark:bg-[#18152a] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-emerald-600 text-white shadow-xs">
                  <Eye className="w-3 h-3" />
                  [DADO OBSERVADO]
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Raciocínio / Dedução digitada pelo estudante
                </span>
              </div>
            </div>
            <textarea
              value={justificativas[currentIndex] || ""}
              onChange={(e) => setJustificativas({ ...justificativas, [currentIndex]: e.target.value })}
              placeholder="Descreva seu desenvolvimento matemático passo a passo..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-amber-500/20 bg-white dark:bg-[#141222] text-slate-800 dark:text-[#f5f0df] focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono leading-relaxed resize-y"
              rows={3}
            />
          </div>

          <div className="p-4 rounded-xl border-2 border-dashed border-amber-500/35 bg-amber-500/5 text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-700 dark:text-zinc-300">
              <Upload className="w-4 h-4 text-amber-500" />
              <span>Upload de Foto do Caderno / Rascunho da Lousa</span>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="text-xs mx-auto block text-slate-600 dark:text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-slate-900 hover:file:bg-amber-600 cursor-pointer"
            />
            {currentImage && (
              <p className="text-xs text-emerald-600 font-semibold">Imagem do rascunho anexada e pronta para OCR!</p>
            )}

            <button
              onClick={() => submeterResolucaoDiscursiva("texto")}
              disabled={loadingDiscursive || loadingIa || (!currentImage && !justificativas[currentIndex]?.trim())}
              className="lemmas-gold-cta px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 mx-auto disabled:opacity-40 cursor-pointer shadow-xs"
            >
              {loadingDiscursive || loadingIa ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />}
              <span>Avaliar Raciocínio com MathAI Engine</span>
            </button>
          </div>
        </div>
      )}

      {(loadingDiscursive || loadingIa) && (
        <div className="p-5 rounded-xl bg-purple-500/5 border border-purple-500/25 text-xs shadow-xs animate-fadeIn">
          <ThoughtLine
            working={true}
            label="MathAI Engine avaliando desenvolvimento…"
            steps={[
              "Transcrevendo caligrafia e equações para LaTeX (OCR Multimodal)",
              "Verificando encadeamento dedutivo e propriedades invariantes",
              "Confrontando hipóteses e cálculos com o gabarito oficial",
              "Elaborando diagnóstico pedagógico e lemas recomendados",
            ]}
            color="#9333ea"
            glyphColor="#9333ea"
            fontSize={13}
          />
        </div>
      )}

      {currentDiagnostico && (
        <div className="text-left p-5 rounded-xl bg-white dark:bg-[#141222] border-2 border-purple-500/30 text-xs space-y-4 shadow-sm animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-purple-500/20">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-purple-600 text-white shadow-xs">
                <BrainCircuit className="w-3 h-3" />
                [INFERÊNCIA DA IA]
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-[#1e1935] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-purple-500/20">
                Modelo: <strong>{currentDiagnostico.modelo || "MathAI Engine"}</strong>
              </span>
            </div>
            {currentDiagnostico.confianca !== undefined && (
              <div className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                Confiança: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{typeof currentDiagnostico.confianca === "number" ? `${Math.round(currentDiagnostico.confianca * 100)}%` : currentDiagnostico.confianca}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="font-bold text-amber-600 dark:text-[#d9b452] flex items-center gap-2 text-sm">
              <span>Diagnóstico: {currentDiagnostico.status_resolucao}</span>
            </div>
            <div className="text-slate-700 dark:text-zinc-300 leading-relaxed text-xs">
              <MathText text={currentDiagnostico.diagnostico} />
            </div>
          </div>

          {currentDiagnostico.transcricao_latex && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#18152a] border border-slate-200 dark:border-purple-500/20 space-y-1">
              <span className="font-bold text-[11px] text-slate-600 dark:text-zinc-400 uppercase tracking-wider block">Transcrição Matemática (OCR):</span>
              <div className="text-slate-800 dark:text-zinc-200">
                <MathText text={currentDiagnostico.transcricao_latex} />
              </div>
            </div>
          )}

          {currentDiagnostico.linha_do_erro && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-300 space-y-1">
              <span className="font-bold text-[11px] uppercase tracking-wider block">Ponto de Desvio / Erro:</span>
              <div>
                <MathText text={currentDiagnostico.linha_do_erro} />
              </div>
            </div>
          )}

          {currentDiagnostico.dica_proximo_passo && (
            <div className="p-3 rounded-lg bg-purple-50/50 dark:bg-[#1c1730] border border-purple-500/20 space-y-1">
              <span className="font-bold text-[11px] text-purple-700 dark:text-purple-300 uppercase tracking-wider block">Lema / Próximo Passo:</span>
              <div className="text-slate-800 dark:text-zinc-200">
                <MathText text={currentDiagnostico.dica_proximo_passo} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6 animate-fadeIn text-slate-800 dark:text-[#f5f0df]">
      {/* BARRA SUPERIOR DO SIMULADOR / TREINO */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 shadow-sm space-y-4">
        {/* LINHA 1: STATUS DA SESSÃO, CRONÔMETRO E AÇÃO PRINCIPAL */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-amber-500/10">
          {/* Lado Esquerdo: Modo e Progresso */}
          <div className="flex flex-wrap items-center gap-3">
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${
              isSimuladoAtivo
                ? "bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-[#d9b452]"
                : "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-400"
            }`}>
              {sessionBannerText}
            </span>
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-300">
              <span>Questão <strong className="text-slate-900 dark:text-amber-300 font-bold">{currentIndex + 1}</strong> de {effectiveTotal.toLocaleString("pt-BR")}</span>
              <span className="text-slate-300 dark:text-zinc-600">•</span>
              <span className="text-slate-500 dark:text-zinc-400 font-medium">
                {respondidasCount} respondida{respondidasCount === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {/* Lado Direito: Cronômetro & Botão de Entrega */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono text-xs font-bold shadow-xs ${
              isSimuladoAtivo && timeLeft < 300
                ? "bg-rose-500/10 border-rose-500/40 text-rose-600 animate-pulse"
                : "bg-slate-50 dark:bg-[#1b172e] border-slate-200 dark:border-amber-500/20 text-slate-700 dark:text-[#dedbd0]"
            }`}>
              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>{minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}</span>
            </div>

            {isSimuladoAtivo ? (
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs shadow-sm hover:opacity-95 active:scale-95 transition-all"
              >
                Entregar Simulado
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSessionMode("result")}
                className="px-4 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-xs hover:bg-emerald-500/20 active:scale-95 transition-all"
              >
                Concluir Treino
              </button>
            )}
          </div>
        </div>

        {/* LINHA 2: NAVEGAÇÃO DE QUESTÕES (JUMPER DE 20 & IR PARA) */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 pt-1 overflow-x-auto flex-nowrap pb-1 sm:pb-0">
          {/* Faixa com os números da janela de 20/22 questões */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap shrink-0">
            {/* Botão para voltar 20 questões */}
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 20))}
              disabled={currentIndex === 0}
              className={`h-7 sm:h-8 px-2 sm:px-2.5 flex items-center gap-1 rounded-lg border border-slate-200 dark:border-amber-500/20 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-[#1b172e] transition-colors shrink-0 ${
                currentIndex === 0 ? "opacity-40 cursor-not-allowed" : "active:scale-95"
              }`}
              title="20 questões anteriores"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>-20</span>
            </button>

            {/* Números das questões na janela ativa de 20/22 */}
            {visibleQuestionIndices.map((qIndex) => {
              const isCurrent = qIndex === currentIndex;
              const qObj = questions[qIndex];
              const isHint5 = !!hint5Used[qIndex];
              const discursiveEval = qObj ? discursiveEvaluations[qObj.id] : undefined;
              const hasDiscursiveValida = discursiveEval && discursiveEval.veredito !== "sem_desenvolvimento" && !discursiveEval.precisa_revisao_humana;
              const isObjAnswered = qObj && answers[qObj.id] !== undefined;
              const isAnswered = isHint5 || hasDiscursiveValida || isObjAnswered || answeredIndices.has(qIndex);
              const isBookmarked = qObj && bookmarks.has(qObj.id);

              let buttonColorClass = "bg-slate-100 dark:bg-[#1b172e] text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-[#25203d]";
              let dotColorClass = "bg-emerald-500";

              if (isHint5) {
                // Rendição pedagógica no Nível 5: pinta o número da questão na barra de Vermelho
                buttonColorClass = isCurrent
                  ? "bg-rose-600 border-2 border-rose-400 text-white font-extrabold shadow-md scale-105 z-10"
                  : "bg-rose-500/20 border border-rose-500/60 text-rose-800 dark:text-rose-300 hover:bg-rose-500/30 font-extrabold";
                dotColorClass = "bg-rose-500";
              } else if (isCurrent) {
                buttonColorClass = "lemmas-gold-cta shadow-md scale-105 z-10";
              } else if (discursiveEval && !discursiveEval.precisa_revisao_humana) {
                if (discursiveEval.veredito === "aprovado") {
                  buttonColorClass = "bg-emerald-500/20 border border-emerald-500/50 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/30 font-extrabold";
                  dotColorClass = "bg-emerald-500";
                } else if (discursiveEval.veredito === "parcial") {
                  buttonColorClass = "bg-amber-500/20 border border-amber-500/50 text-amber-800 dark:text-amber-300 hover:bg-amber-500/30 font-extrabold";
                  dotColorClass = "bg-amber-500";
                } else if (discursiveEval.veredito === "incorreto") {
                  buttonColorClass = "bg-rose-500/20 border border-rose-500/50 text-rose-800 dark:text-rose-300 hover:bg-rose-500/30 font-extrabold";
                  dotColorClass = "bg-rose-500";
                } else {
                  // sem_desenvolvimento: Regra de Ouro (não pinta como tentativa avaliada)
                  buttonColorClass = "bg-slate-100 dark:bg-[#1b172e] text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-[#25203d]";
                }
              } else if (isAnswered) {
                buttonColorClass = "bg-emerald-500/20 border border-emerald-500/50 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/30 font-extrabold";
              }

              const statusTitle = isHint5
                ? " (Errou / Rendição no Nível 5)"
                : discursiveEval
                ? ` (Discursiva: ${discursiveEval.veredito})`
                : isAnswered
                ? " (Respondida)"
                : "";

              return (
                <button
                  key={qIndex}
                  onClick={() => setCurrentIndex(qIndex)}
                  className={`w-7 sm:w-8 h-7 sm:h-8 rounded-lg text-xs font-bold transition-all relative flex items-center justify-center shrink-0 ${buttonColorClass}`}
                  title={`Questão ${qIndex + 1}${statusTitle}${isBookmarked ? " [Marcada]" : ""}`}
                >
                  {qIndex + 1}
                  {isHint5 && (
                    <span className="absolute -bottom-0.5 w-1.5 h-1.5 rounded-full bg-rose-500 shadow-xs" />
                  )}
                  {!isHint5 && isAnswered && !isCurrent && hasDiscursiveValida && (
                    <span className={`absolute -bottom-0.5 w-1.5 h-1.5 rounded-full ${dotColorClass} shadow-xs`} />
                  )}
                  {!isHint5 && isAnswered && !isCurrent && !discursiveEval && (
                    <span className="absolute -bottom-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-xs" />
                  )}
                  {isBookmarked && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-[#141222]" />
                  )}
                </button>
              );
            })}

            {/* Botão para avançar 20 questões */}
            <button
              onClick={() => setCurrentIndex((prev) => Math.min(effectiveTotal - 1, prev + 20))}
              disabled={currentIndex >= effectiveTotal - 1}
              className={`h-7 sm:h-8 px-2 sm:px-2.5 flex items-center gap-1 rounded-lg border border-slate-200 dark:border-amber-500/20 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-[#1b172e] transition-colors shrink-0 ${
                currentIndex >= effectiveTotal - 1 ? "opacity-40 cursor-not-allowed" : "active:scale-95"
              }`}
              title="Próximas 20 questões"
            >
              <span>+20</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Jump input com divisor vertical */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 border-l border-slate-200 dark:border-stone-700 pl-2.5 sm:pl-3.5">
            <label className="text-xs font-medium text-slate-500 dark:text-zinc-400 whitespace-nowrap" htmlFor="jump-input">
              Ir para:
            </label>
            <input
              id="jump-input"
              type="number"
              min={1}
              max={effectiveTotal}
              placeholder="Nº"
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              onBlur={() => {
                if (jumpValue.trim() !== "") handleJumpToQuestion();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleJumpToQuestion();
              }}
              className="w-12 sm:w-14 h-7 sm:h-8 px-1.5 py-1 rounded-lg border border-slate-200 dark:border-amber-500/25 bg-slate-50/50 dark:bg-[#1b172e] text-xs font-semibold text-center focus:outline-none focus:border-amber-500 text-slate-800 dark:text-[#f5f0df]"
            />
            <button
              type="button"
              onClick={() => handleJumpToQuestion()}
              className="h-7 sm:h-8 px-2.5 sm:px-3 rounded-lg text-xs font-semibold lemmas-gold-cta active:scale-95 transition-transform flex items-center justify-center"
            >
              Ir
            </button>
          </div>
        </div>
      </div>

      {/* CARD DO ENUNCIADO */}
      <div className="bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-xs font-semibold text-slate-400 dark:text-zinc-500">
              {currentQ?.materia} • <span className="text-slate-700 dark:text-[#dedbd0]">{currentQ?.topico}</span>
            </div>
            {(currentQ?.lema_codigo || currentQ?.lema_id) && (
              <LemaBadge lemaCodigo={currentQ?.lema_codigo} lemaId={currentQ?.lema_id} />
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 hover:text-amber-600 dark:hover:text-[#d9b452] hover:bg-amber-500/10 hover:border-amber-500/25 transition-colors"
              title="Reportar inconsistência (digitação, LaTeX, imagem ou gabarito)"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Reportar</span>
            </button>
            <button
              onClick={() => toggleBookmark(currentIndex)}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${
                bookmarks.has(currentIndex)
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-[#d9b452]"
                  : "border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 hover:border-amber-500/30"
              }`}
              title={bookmarks.has(currentIndex) ? "Remover dos marcados" : "Marcar questão para revisar depois"}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{bookmarks.has(currentIndex) ? "Marcada" : "Marcar"}</span>
            </button>
          </div>
        </div>

        <div className="font-serif-math text-base md:text-lg font-normal text-slate-900 dark:text-[#f5f0df] leading-relaxed whitespace-pre-line">
          <MathText text={corpo} />
        </div>

        {/* FIGURA / GRÁFICO DA QUESTÃO SE HOUVER (OCULTA SE AS ALTERNATIVAS JÁ FOREM AS IMAGENS OU SE JÁ ESTIVER NO CORPO) */}
        {currentQ?.figura_path && !corpo.includes("![") && !hasImageAlternatives(alternativas) && (
          <div className="my-4 flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 dark:bg-stone-900/60 border border-slate-200 dark:border-stone-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveFigureUrl(currentQ.figura_path)}
              alt={`Figura da Questão ${currentQ.id}`}
              className="max-h-96 max-w-full rounded-lg object-contain shadow-xs bg-white dark:bg-stone-900 p-2 border border-slate-200 dark:border-stone-800"
              loading="lazy"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.dataset.fallback) {
                  target.dataset.fallback = "1";
                  target.src = getFallbackFigureUrl(currentQ.figura_path);
                }
              }}
            />
            <span className="text-[11px] text-slate-400 dark:text-stone-500 mt-2 font-mono">
              Figura de referência da questão
            </span>
          </div>
        )}

        {/* BANCADA DE RESOLUÇÃO INTEGRADA (PARA QUESTÕES DISCURSIVAS) */}
        {isDiscursiva && renderBancadaResolucao()}

        {/* FEEDBACK ESTRUTURADO DA AVALIAÇÃO DISCURSIVA (MATHAI ENGINE) */}
        {isDiscursiva && discursiveEval && (
          <div className="space-y-3 animate-fadeIn">
            {/* CASO INCONCLUSIVO: PRECISA REVISÃO OU SERVIÇO INDISPONÍVEL */}
            {discursiveEval.precisa_revisao_humana && (
              <div className="p-4 rounded-xl border-2 border-indigo-500/40 bg-indigo-500/10 text-slate-800 dark:text-zinc-200 text-xs space-y-2.5 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-sm text-indigo-700 dark:text-indigo-400">
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <span>Avaliação Inconclusiva — Rascunho Preservado</span>
                </div>
                <div className="leading-relaxed font-sans text-xs whitespace-pre-line">
                  <MathText text={discursiveEval.feedback_latex} />
                </div>
                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => ativarEIrParaBancada("texto")}
                    className="px-3 py-1.5 rounded-lg lemmas-gold-cta font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Voltar à Bancada / Reenviar Avaliação</span>
                  </button>
                </div>
              </div>
            )}

            {/* CASO 1: REGRA DE OURO PARA sem_desenvolvimento */}
            {!discursiveEval.precisa_revisao_humana && discursiveEval.veredito === "sem_desenvolvimento" && (
              <div className="p-4 rounded-xl border-2 border-amber-500/50 bg-amber-500/15 text-amber-950 dark:text-amber-200 text-xs space-y-2.5 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-800 dark:text-[#d9b452]">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Demonstração de Raciocínio Obrigatória</span>
                </div>
                <p className="leading-relaxed font-sans text-xs">
                  Você indicou o resultado final, mas em questões discursivas é obrigatório demonstrar o raciocínio (na Lousa, GeoGebra ou Foto/Dedução) para validar os pontos.
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => ativarEIrParaBancada("texto")}
                    className="px-3 py-1.5 rounded-lg lemmas-gold-cta font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Voltar à Bancada e Apresentar Desenvolvimento</span>
                  </button>
                </div>
              </div>
            )}

            {/* CASO 2: APROVADO */}
            {!discursiveEval.precisa_revisao_humana && discursiveEval.veredito === "aprovado" && (
              <div className="p-5 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 text-slate-800 dark:text-[#f5f0df] text-xs space-y-3.5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-emerald-600 text-white shadow-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      [DISCURSIVA VALIDADA]
                    </span>
                    <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400">
                      ✓ Discursiva Validada pela Banca
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {discursiveEval.modelo && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/80 dark:bg-[#1a162b] text-slate-700 dark:text-zinc-300 border border-emerald-500/20 font-mono">
                        {discursiveEval.modelo}
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
                      Demonstração Validada
                    </span>
                  </div>
                </div>

                <div className="leading-relaxed space-y-1">
                  <strong className="text-emerald-700 dark:text-emerald-400 block text-xs">Parecer da Banca:</strong>
                  <div className="text-slate-800 dark:text-[#dedbd0] whitespace-pre-line">
                    <MathText text={discursiveEval.feedback_latex} />
                  </div>
                </div>

                {discursiveEval.etapas_corretas.length > 0 && (
                  <div className="space-y-1 pt-1.5 border-t border-emerald-500/20">
                    <strong className="text-emerald-700 dark:text-emerald-400 block font-semibold text-[11px]">Passos Verificados pela Banca:</strong>
                    <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-zinc-300 text-[11px]">
                      {discursiveEval.etapas_corretas.map((etapa, idx) => (
                        <li key={idx}><MathText text={etapa} /></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* CASO 3: PARCIAL */}
            {!discursiveEval.precisa_revisao_humana && discursiveEval.veredito === "parcial" && (
              <div className="p-5 rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 text-slate-800 dark:text-[#f5f0df] text-xs space-y-3.5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-amber-500/20">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-amber-600 text-white shadow-xs">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      [CRÉDITO PARCIAL]
                    </span>
                    <span className="font-bold text-xs text-amber-700 dark:text-[#d9b452]">
                      ⚠ Crédito Parcial Atribuído
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-700 dark:text-amber-300">
                    Validação Parcial
                  </span>
                </div>

                <div className="leading-relaxed space-y-1">
                  <strong className="text-amber-700 dark:text-[#d9b452] block text-xs">Parecer da Banca:</strong>
                  <div className="text-slate-800 dark:text-[#dedbd0] whitespace-pre-line">
                    <MathText text={discursiveEval.feedback_latex} />
                  </div>
                </div>

                {discursiveEval.etapas_corretas.length > 0 && (
                  <div className="space-y-1 pt-1.5 border-t border-amber-500/20">
                    <strong className="text-emerald-700 dark:text-emerald-400 block font-semibold text-[11px]">Etapas Corretas Demonstradas:</strong>
                    <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-zinc-300 text-[11px]">
                      {discursiveEval.etapas_corretas.map((etapa, idx) => (
                        <li key={idx}><MathText text={etapa} /></li>
                      ))}
                    </ul>
                  </div>
                )}

                {discursiveEval.erros_identificados.length > 0 && (
                  <div className="space-y-1 pt-1.5 border-t border-amber-500/20">
                    <strong className="text-amber-700 dark:text-amber-400 block font-semibold text-[11px]">Pontos de Atenção / Ajustes Necessários:</strong>
                    <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-zinc-300 text-[11px]">
                      {discursiveEval.erros_identificados.map((erro, idx) => (
                        <li key={idx}><MathText text={erro} /></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* CASO 4: INCORRETO */}
            {!discursiveEval.precisa_revisao_humana && discursiveEval.veredito === "incorreto" && (
              hint5Used[currentIndex] ? (
                <div className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-300 text-xs flex flex-wrap items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span className="font-bold">
                      ❌ Questão encerrada por consulta à Resolução Completa (Nível 5)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-600 text-white shrink-0">
                    Nota 0 · Repetição Diária (SM-2)
                  </span>
                </div>
              ) : (
                <div className="p-5 rounded-2xl border-2 border-rose-500/40 bg-rose-500/10 text-slate-800 dark:text-[#f5f0df] text-xs space-y-3.5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-rose-500/20">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-rose-600 text-white shadow-xs">
                        <XCircle className="w-3.5 h-3.5" />
                        [DESENVOLVIMENTO INCORRETO]
                      </span>
                      <span className="font-bold text-xs text-rose-700 dark:text-rose-400">
                        ✗ Desenvolvimento Incorreto
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 border border-rose-500/40 text-rose-700 dark:text-rose-300">
                      Demonstração Não Validada
                    </span>
                  </div>

                  <div className="leading-relaxed space-y-1">
                    <strong className="text-rose-700 dark:text-rose-400 block text-xs">Parecer da Banca:</strong>
                    <div className="text-slate-800 dark:text-[#dedbd0] whitespace-pre-line">
                      <MathText text={discursiveEval.feedback_latex} />
                    </div>
                  </div>

                  {discursiveEval.erros_identificados.length > 0 && (
                    <div className="space-y-1 pt-1.5 border-t border-rose-500/20">
                      <strong className="text-rose-700 dark:text-rose-400 block font-semibold text-[11px]">Erros Identificados no Raciocínio:</strong>
                      <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-zinc-300 text-[11px]">
                        {discursiveEval.erros_identificados.map((erro, idx) => (
                          <li key={idx}><MathText text={erro} /></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )
            )}

            {/* GABARITO DE REFERÊNCIA & CRONOGRAMA SM-2 (UNIFICADO NO CONTAINER DISCURSIVO) */}
            <div className="p-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] space-y-2 text-xs">
              {currentQ.gabarito && !isSpuriousGabarito(currentQ.gabarito, isDiscursiva) && !hint5Used[currentIndex] && (
                <div className="space-y-1">
                  <span className="font-bold text-slate-700 dark:text-zinc-200 text-xs block">
                    Gabarito / Resolução de Referência Oficial:
                  </span>
                  <div className="text-slate-800 dark:text-zinc-300 leading-relaxed text-xs p-2.5 rounded-lg bg-black/5 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                    <MathText text={currentQ.gabarito} />
                  </div>
                </div>
              )}
              {currentResult?.sm2 && (
                <div className="text-xs text-slate-600 dark:text-zinc-400 pt-1.5 border-t border-slate-200/50 dark:border-white/10">
                  SM-2 Atualizado: Próxima revisão agendada para <strong>{currentResult.sm2.proxima_revisao_data}</strong> (Intervalo: {currentResult.sm2.intervalo_dias} dia{currentResult.sm2.intervalo_dias > 1 ? "s" : ""}, EF: {currentResult.sm2.fator_facilidade}).
                </div>
              )}
            </div>
          </div>
        )}

        {/* CAMADA 1: DADO OBSERVADO — RESPOSTA DO ESTUDANTE */}
        {currentQ && answers[currentQ.id] && (isSimuladoAtivo || !currentResult) && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-2 animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase bg-amber-600 text-white shadow-xs">
                        <Eye className="w-3.5 h-3.5" />
                        [DADO OBSERVADO]
                      </span>
                      <span className="text-xs font-medium text-slate-800 dark:text-[#f5f0df]">
                        Alternativa Assinalada: <strong className="font-mono text-amber-700 dark:text-[#d9b452] font-bold">({answers[currentQ.id]})</strong>
                      </span>
                    </div>
            {isSimuladoAtivo && (
              <span className="text-[11px] text-amber-800/80 dark:text-amber-300/80 font-medium">
                Gabarito oficial oculto até a entrega do simulado
              </span>
            )}
          </div>
        )}

        {/* AVISO DE AUTENTICAÇÃO PARA RESPONDER */}
        {!isAuthenticated && !userLoading && (
          <div className="p-3.5 rounded-xl border border-amber-500/35 bg-amber-500/10 text-amber-950 dark:text-[#f5f0df] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-amber-600 dark:text-[#d9b452] shrink-0" />
              <span>
                <strong>Logar para responder:</strong> Crie sua conta ou faça login para assinalar alternativas e calibrar suas revisões SM-2 no LEMMAS.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/login?redirectTo=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/resolver")}`}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs transition shadow-sm"
              >
                Entrar
              </Link>
              <Link
                href={`/login?tab=signup&redirectTo=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/resolver")}`}
                className="px-3.5 py-1.5 rounded-lg border border-amber-500/40 hover:bg-amber-500/20 text-slate-800 dark:text-[#f5f0df] font-semibold text-xs transition"
              >
                Criar Conta
              </Link>
            </div>
          </div>
        )}

        {/* ALTERNATIVAS (A-E) */}
        {Object.keys(alternativas).length > 0 && (
          hasImageAlternatives(alternativas) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
              {Object.entries(alternativas).map(([key, val]) => {
                const isSelected = currentQ && answers[currentQ.id] === key;

                return (
                  <button
                    key={key}
                    disabled={(!isSimuladoAtivo && currentResult !== undefined) || !!hint5Used[currentIndex]}
                    onClick={() => handleSelectOption(key)}
                    className={`w-full text-left p-4 rounded-2xl border flex flex-col gap-3 transition-all ${
                      isSelected
                        ? "bg-amber-500/15 dark:bg-amber-500/20 border-amber-500 dark:border-[#d9b452] shadow-sm text-slate-900 dark:text-[#f5f0df] ring-2 ring-amber-500/40"
                        : "bg-slate-50/50 dark:bg-[#18152a] border-slate-200/80 dark:border-amber-500/15 text-slate-700 dark:text-zinc-300 hover:border-amber-500/40"
                    } ${hint5Used[currentIndex] ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected
                            ? "lemmas-gold-cta font-bold shadow-sm"
                            : "bg-slate-200 dark:bg-[#231f38] text-slate-600 dark:text-zinc-400"
                        }`}
                      >
                        {key}
                      </div>
                      <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                        {hint5Used[currentIndex] ? "Bloqueada (Rendição Nível 5)" : isSelected ? "Selecionada" : "Clique para assinalar"}
                      </span>
                    </div>
                    <div className="w-full flex items-center justify-center p-2 rounded-xl bg-white dark:bg-stone-900 border border-slate-200/80 dark:border-stone-800">
                      <MathText text={val} />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {Object.entries(alternativas).map(([key, val]) => {
                const isSelected = currentQ && answers[currentQ.id] === key;

                return (
                  <button
                    key={key}
                    disabled={(!isSimuladoAtivo && currentResult !== undefined) || !!hint5Used[currentIndex]}
                    onClick={() => handleSelectOption(key)}
                    className={`w-full text-left p-4 rounded-xl border flex items-center gap-4 transition-all ${
                      isSelected
                        ? "bg-amber-500/15 dark:bg-amber-500/20 border-amber-500 dark:border-[#d9b452] shadow-sm text-slate-900 dark:text-[#f5f0df]"
                        : "bg-slate-50/50 dark:bg-[#18152a] border-slate-200/80 dark:border-amber-500/10 text-slate-700 dark:text-zinc-300 hover:border-amber-500/30"
                    } ${hint5Used[currentIndex] ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected
                          ? "lemmas-gold-cta font-bold shadow-sm"
                          : "bg-slate-200 dark:bg-[#231f38] text-slate-600 dark:text-zinc-400"
                      }`}
                    >
                      {key}
                    </div>
                    <span className="text-sm font-medium"><MathText text={val} /></span>
                  </button>
                );
              })}
            </div>
          )
        )}

        {/* MODO TREINO: FEEDBACK IMEDIATO DE SUBMISSÃO E GABARITO OFICIAL */}
        {!isSimuladoAtivo && currentResult && (
          <div className="space-y-3">
            {!isDiscursiva && (
              <div className={`p-4 rounded-xl border space-y-2 ${
                currentResult.acertou 
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-emerald-600 text-white">
                      <Eye className="w-3 h-3" />
                      [DADO OBSERVADO]
                    </span>
                    <span className="font-bold text-xs">
                      Sua resposta: ({currentResult.resposta_enviada})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    {currentResult.acertou ? (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" /> Dedução Correta!
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                        <XCircle className="w-4 h-4" /> Divergência: Gabarito Oficial é <span className="font-bold ml-1"><MathText text={currentResult.gabarito} /></span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-slate-600 dark:text-zinc-300 pt-1 border-t border-slate-200/50 dark:border-white/10">
                  SM-2 Atualizado: Próxima revisão agendada para <strong>{currentResult.sm2.proxima_revisao_data}</strong> (Intervalo: {currentResult.sm2.intervalo_dias} dia{currentResult.sm2.intervalo_dias > 1 ? "s" : ""}, EF: {currentResult.sm2.fator_facilidade}).
                </div>
              </div>
            )}

            {/* BOTÃO E PAINEL DE EXPLICAÇÃO DA MATHAI ENGINE (IMEDIATO PÓS-SUBMISSÃO) */}
            {!resolucoesIa[currentQ.id] ? (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => pedirExplicacaoTreino(currentQ, currentResult.resposta_enviada)}
                  disabled={loadingResolucaoIa[currentQ.id]}
                  className="lemmas-gold-cta px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition hover:scale-[1.01] disabled:opacity-50"
                >
                  {loadingResolucaoIa[currentQ.id] ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>MathAI Engine Analisando Dedução...</span>
                    </>
                  ) : (
                    <>
                      <BrainCircuit className="w-4 h-4" />
                      <span>Explicar Questão com MathAI Engine</span>
                    </>
                  )}
                </button>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Resolução axiomática passo a passo, lemas aplicados e análise do distrator.
                </span>

                {loadingResolucaoIa[currentQ.id] && (
                  <div className="w-full p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 text-xs shadow-xs animate-fadeIn">
                    <ThoughtLine
                      working={true}
                      label="MathAI Engine estruturando demonstração…"
                      steps={[
                        "Recuperando teoremas e lemas fundamentais da questão",
                        "Construindo encadeamento dedutivo passo a passo",
                        "Formatando fórmulas matemáticas e equações em KaTeX",
                      ]}
                      color="#9333ea"
                      glyphColor="#9333ea"
                      fontSize={12}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-4 text-xs leading-relaxed animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-purple-500/20">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-purple-600 text-white shadow-xs">
                      <Sparkles className="w-3 h-3" />
                      [MATHAI ENGINE]
                    </span>
                    <span className="font-bold text-xs text-purple-800 dark:text-purple-200">
                      Resolução Axiomática & Diagnóstico
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {resolucoesIa[currentQ.id].modelo && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/80 dark:bg-[#1a162b] text-slate-700 dark:text-zinc-300 border border-purple-500/20">
                        {resolucoesIa[currentQ.id].modelo}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                      Confiança Alta
                    </span>
                  </div>
                </div>

                {/* DIAGNÓSTICO / PASSO A PASSO COM KATEX */}
                <div className="text-slate-800 dark:text-[#f5f0df] leading-relaxed space-y-2">
                  <strong className="text-purple-700 dark:text-purple-300 block text-xs">
                    Demonstração Passo a Passo:
                  </strong>
                  <div className="text-xs leading-relaxed whitespace-pre-line">
                    <MathText text={resolucoesIa[currentQ.id].diagnostico || ""} />
                  </div>
                </div>

                {/* LEMA FUNDAMENTAL OU CONCEITO-CHAVE */}
                {resolucoesIa[currentQ.id].dica_proximo_passo && (
                  <div className="p-3.5 rounded-xl bg-white/80 dark:bg-[#161327] border border-amber-500/25 space-y-1">
                    <strong className="text-amber-700 dark:text-[#d9b452] flex items-center gap-1.5 text-xs">
                      <Zap className="w-3.5 h-3.5" />
                      Lema Fundamental & Princípio Determinante:
                    </strong>
                    <div className="text-slate-700 dark:text-zinc-300 leading-relaxed text-xs">
                      <MathText text={resolucoesIa[currentQ.id].dica_proximo_passo || ""} />
                    </div>
                  </div>
                )}

                {/* SÍNTESE DO APRENDIZADO (FIXAÇÃO NO SM-2 / ACTIVE RECALL) */}
                <div className="pt-2 border-t border-purple-500/20 space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <span>✍️</span>
                    <span>Síntese do Aprendizado (Opcional - anote a lição aprendida para fixação na memória):</span>
                  </label>
                  <input
                    type="text"
                    value={justificativas[currentIndex] || ""}
                    onChange={(e) => setJustificativas((prev) => ({ ...prev, [currentIndex]: e.target.value }))}
                    placeholder="Ex: Pegadinha na restrição do denominador; aplicar lema da média harmônica..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#1a162b] border border-slate-200 dark:border-purple-500/20 text-slate-800 dark:text-[#f5f0df] placeholder-slate-400 focus:outline-hidden focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODO TREINO: BOTÃO DE CONFIRMAR RESPOSTA */}
        {!isSimuladoAtivo && !currentResult && currentQ && answers[currentQ.id] && !hint5Used[currentIndex] && (
          <div className="pt-2">
            <button
              onClick={handleSubmitCurrent}
              disabled={submitting}
              className="lemmas-gold-cta px-6 py-2.5 rounded-xl font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Confirmar Dedução & Atualizar SM-2</span>
            </button>
          </div>
        )}
      </div>

      {/* BLOCO DE IA: DESATIVADO NO SIMULADO VS ATIVO NO TREINO */}
      {isSimuladoAtivo ? (
        <div className="p-4 rounded-2xl bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-zinc-800 text-xs flex items-center gap-3 text-slate-600 dark:text-zinc-400">
          <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="leading-relaxed">
            <strong>Ambiente Oficial de Simulado:</strong> Auxílios da MathAI Engine (dicas e diagnósticos) ficam desabilitados durante a realização da prova. Ao entregar o simulado, você poderá acionar a IA para cada questão individualmente.
          </p>
        </div>
      ) : (
        <>
          {/* TUTOR SOCRÁTICO E DICAS PROGRESSIVAS (MODO TREINO COM ESCADA PÓLYA DE 5 NÍVEIS) */}
          <div className="bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <h4 className="font-serif-math text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-[#dedbd0]">
                  Tutor Socrático Adaptativo (Método Pólya · MathAI Engine)
                </h4>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                5 Níveis Maiêuticos
              </span>
            </div>

            {/* ESCADA MAIÊUTICA DE 5 NÍVEIS (PÓLYA) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { nivel: 1, label: "Nível 1", sublabel: "Intuição", fullTitle: "Intuição & Hipóteses", icon: "🧠" },
                { nivel: 2, label: "Nível 2", sublabel: "Lema", fullTitle: "Lema & Teorema Chave", icon: "📐" },
                { nivel: 3, label: "Nível 3", sublabel: "Partida", fullTitle: "O Primeiro Passo", icon: "✏️" },
                { nivel: 4, label: "Nível 4", sublabel: "Destravamento", fullTitle: "Quase lá (Gargalo)", icon: "⚡" },
                { nivel: 5, label: "Nível 5", sublabel: "Resolução", fullTitle: "Resolução Completa", icon: "🔓" },
              ].map((step) => {
                const isUnlocked = hintsHistory[currentIndex]?.some((h) => h.nivel === step.nivel);
                const isCurrent = !hint5Used[currentIndex] && currentHintLevel === step.nivel;
                const isSurrendered = step.nivel === 5 && hint5Used[currentIndex];

                return (
                  <div
                    key={step.nivel}
                    className={`relative p-2.5 rounded-xl border text-center transition-all ${
                      isSurrendered
                        ? "bg-rose-500/15 border-rose-500/50 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/40"
                        : isUnlocked
                        ? "bg-purple-500/15 border-purple-500/35 text-purple-700 dark:text-purple-300 font-medium"
                        : isCurrent
                        ? "bg-amber-500/15 border-amber-500 text-amber-800 dark:text-amber-200 ring-2 ring-amber-500/30 font-bold"
                        : "bg-slate-50/50 dark:bg-[#18152a]/60 border-slate-200/60 dark:border-zinc-800/60 text-slate-400 dark:text-zinc-500"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {step.label}
                      </span>
                      <span className="text-xs">
                        {isSurrendered ? "❌" : isUnlocked ? "✅" : isCurrent ? "👉" : "🔒"}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold truncate" title={step.fullTitle}>
                      {step.sublabel}
                    </div>
                    {step.nivel === 5 && (
                      <div className="mt-1 text-[9px] font-extrabold text-rose-500 dark:text-rose-400 leading-none">
                        Penaliza SM-2
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* BOTÕES DE AÇÃO E DISPARO DE DICA */}
            <div className="pt-1">
              {hint5Used[currentIndex] ? (
                <div className="w-full p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>Resolução Oficial Revelada (Nível 5 — Questão computada como incorreta no SM-2)</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-600 text-white shrink-0">
                    Bloqueada
                  </span>
                </div>
              ) : currentHintLevel === 5 ? (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border-2 border-rose-500/40 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-rose-800 dark:text-rose-200 leading-tight">
                    <strong className="block text-rose-600 dark:text-rose-400 font-bold mb-0.5">Aviso Pedagógico:</strong>
                    Você concluiu as 4 dicas investigativas. O Nível 5 revelará a resolução oficial completa passo a passo e computará erro na questão.
                  </div>
                  <button
                    onClick={pedirDicaSocratica}
                    disabled={loadingHint}
                    className="w-full sm:w-auto shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition flex items-center justify-center gap-2 cursor-pointer animate-pulse"
                  >
                    {loadingHint ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                    <span>⚠️ Ver Resolução Completa (Nível 5 — Contabiliza Questão como Errada)</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <button
                    onClick={pedirDicaSocratica}
                    disabled={loadingHint}
                    className="flex items-center gap-2 text-xs font-bold rounded-xl px-4 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500 text-amber-700 dark:text-[#d9b452] shadow-xs transition cursor-pointer"
                  >
                    {loadingHint ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    )}
                    <span>
                      💡 Solicitar Dica Socrática (Nível {currentHintLevel}: {
                        currentHintLevel === 1 ? "Intuição" : currentHintLevel === 2 ? "Lema Chave" : currentHintLevel === 3 ? "Primeiro Passo" : "Destravamento"
                      })
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowHint5ConfirmModal(true)}
                    disabled={loadingHint}
                    className="text-xs text-slate-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 underline underline-offset-2 flex items-center gap-1.5 transition cursor-pointer py-1"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500/80" />
                    <span>Pular para Nível 5 (Desistir & Ver Resolução)</span>
                  </button>
                </div>
              )}
            </div>

            {hintError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-700 dark:text-rose-300">
                ⚠️ {hintError}
              </div>
            )}

            {loadingHint && (
              <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 text-xs shadow-xs animate-fadeIn">
                <ThoughtLine
                  working={true}
                  label="Tutor Socrático pensando…"
                  steps={[
                    "Analisando dados do enunciado e incógnitas",
                    "Mapeando invariantes matemáticos e lemas",
                    `Modulando intervenção pedagógica (Nível ${currentHintLevel})`,
                  ]}
                  color="#9333ea"
                  glyphColor="#9333ea"
                  fontSize={13}
                />
              </div>
            )}

            {/* AVISO DE PENALIDADE DA 5ª DICA QUANDO ACIONADA */}
            {hint5Used[currentIndex] && (
              <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/35 text-xs text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-2.5 shadow-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                <div>
                  <strong className="block font-bold mb-0.5">Tentativa computada como incorreta (Nota 0 / SM-2):</strong>
                  <span>
                    A resolução oficial completa e o gabarito foram revelados pela 5ª Dica Socrática. A questão foi agendada para repetição espaçada amanhã para fixação pedagógica do conteúdo.
                  </span>
                </div>
              </div>
            )}

            {/* HISTÓRICO DE DICAS ACUMULADAS DA QUESTÃO (PROGRESSÃO MAIÊUTICA) */}
            {hintsHistory[currentIndex] && hintsHistory[currentIndex].length > 0 ? (
              <div className="space-y-3">
                {hintsHistory[currentIndex].map((item, idx) => {
                  const nivelTitulos: Record<number, string> = {
                    1: "Nível 1: Intuição · Leitura de Hipóteses",
                    2: "Nível 2: Lema · Teorema Chave",
                    3: "Nível 3: Partida · O Primeiro Passo",
                    4: "Nível 4: Destravamento · Quase lá (Gargalo)",
                    5: "Nível 5: Resolução Completa · Rendição Pedagógica",
                  };
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border text-xs leading-relaxed space-y-2.5 animate-fadeIn ${
                        item.nivel === 5
                          ? "bg-rose-500/10 border-rose-500/30 text-slate-900 dark:text-[#f5f0df]"
                          : "bg-purple-500/10 border-purple-500/25 text-slate-800 dark:text-[#f5f0df]"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-purple-500/20 dark:border-purple-500/20">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase text-white shadow-xs ${
                              item.nivel === 5 ? "bg-rose-600 font-bold" : "bg-purple-600"
                            }`}
                          >
                            <Sparkles className="w-3 h-3" />
                            {item.nivel === 5 ? "[RESOLUÇÃO OFICIAL]" : "[INFERÊNCIA DA IA]"}
                          </span>
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-white/70 dark:bg-[#1e1935] text-slate-700 dark:text-zinc-300 border border-purple-500/20">
                            {nivelTitulos[item.nivel] || `Nível ${item.nivel}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600 dark:text-zinc-400">
                          <span>Modelo: <strong>{item.modelo || "MathAI Engine"}</strong></span>
                        </div>
                      </div>

                      <div className="leading-relaxed text-slate-800 dark:text-[#dedbd0]">
                        <MathText text={item.dica} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : hints[currentIndex] ? (
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/25 text-xs text-slate-800 dark:text-[#f5f0df] leading-relaxed space-y-3 animate-fadeIn">
                <div className="leading-relaxed text-slate-800 dark:text-[#dedbd0]">
                  <MathText text={hints[currentIndex]} />
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}

      {/* BANCADA DE RASCUNHO PARA QUESTÕES OBJETIVAS (QUESTÕES DISCURSIVAS RESOLVEM NA BANCADA INTEGRADA AO CARD) */}
      {!isDiscursiva && renderBancadaResolucao()}

      {/* NAVEGAÇÃO INFERIOR */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-amber-500/20 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-[#18152a] disabled:opacity-40 text-xs font-semibold flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Anterior</span>
        </button>

        {currentIndex < effectiveTotal - 1 ? (
          <button
            onClick={() => setCurrentIndex((prev) => Math.min(effectiveTotal - 1, prev + 1))}
            className="lemmas-gold-cta px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-transform shadow-sm hover:scale-[1.02]"
          >
            <span>Próxima Questão</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={() => {
              if (isSimuladoAtivo) setShowConfirmModal(true);
              else setSessionMode("result");
            }}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold flex items-center gap-2 shadow-md hover:opacity-95 transition-opacity"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSimuladoAtivo ? "Entregar Simulado" : "Finalizar Treino"}</span>
          </button>
        )}
      </div>

      {/* MODAL DE CONFIRMAÇÃO DA 5ª DICA SOCRÁTICA (REVELA GABARITO & MARCA INCORRETO) */}
      {showHint5ConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#151224] border-2 border-rose-500/50 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 ring-1 ring-rose-500/30">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-rose-500/15 text-rose-500 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100 font-serif-math">
                  Rendição Pedagógica · Revelar Nível 5?
                </h3>
                <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                  A <strong>Dica de Nível 5</strong> fornecerá a resolução oficial completa passo a passo, o lema determinante e o gabarito definitivo da questão.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2 text-xs text-rose-800 dark:text-rose-200 leading-relaxed">
              <strong className="block font-bold text-rose-600 dark:text-rose-400">
                ⚠️ Consequências Pedagógicas Imediatas da Rendição:
              </strong>
              <ul className="list-disc pl-4 space-y-1 text-[11px]">
                <li>A questão será computada imediatamente como <strong>ERRADA</strong> (marcada em vermelho no topo).</li>
                <li>O contador de questões respondidas será incrementado automaticamente.</li>
                <li>O envio de alternativas ou nova dedução será <strong>permanentemente bloqueado</strong> nesta questão.</li>
                <li>O algoritmo SM-2 registrará penalidade máxima (repetições zeradas, intervalo diário de revisão).</li>
              </ul>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
              <button
                type="button"
                onClick={() => setShowHint5ConfirmModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer text-center"
              >
                Cancelar (Continuar Tentando)
              </button>
              <button
                type="button"
                onClick={confirmarEDesbloquearDica5}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>⚠️ Confirmar Rendição & Ver Resolução</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE ENTREGA */}
            <ConfirmarEntregaModal
              open={showConfirmModal}
              onClose={() => setShowConfirmModal(false)}
              submitting={submitting}
              onConfirm={async () => {
                setSubmitting(true);

                let simuladoId: string | null = null;
                if (typeof window !== "undefined") {
                  const stored = sessionStorage.getItem("lemmas_active_simulado");
                  if (stored) {
                    try {
                      const config = JSON.parse(stored);
                      simuladoId = config.simuladoId || null;
                    } catch {}
                  }
                }

                const questionIds = questions.map((q) => q.id);
                const tempoGasto = sessionType === "simulado"
                  ? Math.max(0, totalTimeInitial - timeLeft)
                  : timeLeft;

                try {
                  const res = await fetch("/api/simulados/enviar", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      simuladoId,
                      questionIds,
                      respostasDoUsuario: answers,
                      tempoGastoSegundos: tempoGasto,
                    }),
                  });

                  const data = await res.json();
                  if (res.ok && data && data.resultado?.resultados) {
                    const newSubmitResults: Record<number, SubmitResult> = {};
                    data.resultado.resultados.forEach((r: any) => {
                      const qIndex = questions.findIndex((q) => q.id === r.questao_id);
                      if (qIndex >= 0) {
                        newSubmitResults[qIndex] = {
                          acertou: r.acertou,
                          gabarito: r.gabarito,
                          resposta_enviada: r.resposta_enviada,
                          sm2: r.sm2,
                        };
                      }
                    });
                    setSubmitResults(newSubmitResults);
                  } else {
                    throw new Error(data?.error || "Resposta inválida do backend de simulados");
                  }
                } catch (err) {
                  console.warn("Aviso ao enviar simulado para backend, usando cálculo e persistência local de contingência:", err);
                  // Popula submitResults localmente a partir de answers e q.gabarito para revisão perfeita
                  const fallbackResults: Record<number, SubmitResult> = {};
                  questions.forEach((q, idx) => {
                    const resp = answers[q.id];
                    const gabarito = (q.gabarito || "").trim().toUpperCase();
                    if (resp) {
                      const acertou = Boolean(gabarito && resp.toUpperCase() === gabarito);
                      fallbackResults[idx] = {
                        acertou,
                        gabarito: gabarito || "(Não informado)",
                        resposta_enviada: resp,
                        sm2: {
                          repeticoes: 1,
                          fator_facilidade: 2.5,
                          intervalo_dias: acertou ? 3 : 1,
                          proxima_revisao_data: new Date(Date.now() + (acertou ? 3 : 1) * 86400000).toISOString(),
                        },
                      };
                    }
                  });
                  setSubmitResults(fallbackResults);

                  // Salva no sessionStorage para histórico de contingência
                  if (typeof window !== "undefined") {
                    try {
                      sessionStorage.setItem("lemmas_last_simulado_backup", JSON.stringify({
                        simuladoId,
                        questionIds,
                        answers,
                        tempoGasto,
                        timestamp: Date.now(),
                      }));
                    } catch {}
                  }
                } finally {
                  setSubmitting(false);
                  setShowConfirmModal(false);
                  setSessionMode("result");
                }
              }}
              totalQuestoes={effectiveTotal}
              respondidasCount={respondidasCount}
              emBrancoCount={emBrancoCount}
            />

      {/* MODAL DE AVISO: LOGAR PARA RESPONDER */}
      <AuthPromptModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* MODAL DE REPORTAR INCONSISTÊNCIA NA QUESTÃO */}
      <ReportarQuestaoModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        questaoId={currentQ?.id || null}
        origem="resolver"
      />
    </div>
  );
}

export default function ResolverPage() {
  return (
    <Suspense fallback={
      <div className="py-24 flex items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    }>
      <ResolverContent />
    </Suspense>
  );
}
