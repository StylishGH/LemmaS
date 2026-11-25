"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
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
import { obterFiltrosApiPerfil } from "@/lib/pedagogical-engine";
import { createClient } from "@/lib/supabase";
import { resolveFigureUrl, getFallbackFigureUrl } from "@/lib/image-url";
import { createCanvasDocument, type CanvasDocument } from "@/lib/canvas-document";
import SpenSmartCanvas, { type Stroke } from "@/components/lousa/SpenSmartCanvas";
import GeometricCompassBoard from "@/components/math/GeometricCompassBoard";
import ImmersiveFocusOverlay from "@/components/bancada/ImmersiveFocusOverlay";
import ReportarQuestaoModal from "@/components/ReportarQuestaoModal";
import { OcrReview } from "@/components/avaliacao/OcrReview";
import ThoughtLine from "@/components/ui/thought-line";
import QuestionDiscussion from "@/components/community/QuestionDiscussion";
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
  dificuldade?: number | null;
  categoria_banca?: string | null;
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
  id?: number | string | null;
  acertou: boolean;
  gabarito: string;
  resposta_enviada: string;
  sm2: {
    repeticoes: number;
    fator_facilidade: number;
    intervalo_dias: number;
    proxima_revisao_data: string;
  };
  imagem_resolucao_path?: string | null;
  estrategias_esperadas?: string | null;
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
  id?: number | string | null;
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
  ocr_review_required?: boolean;
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
function AuthPromptModal({ open, onClose, inline = false }: { open: boolean; onClose: () => void; inline?: boolean }) {
  if (!open) return null;
  const content = (
    <div className={`${inline ? "absolute inset-0 z-[90]" : "fixed inset-0 z-[300]"} bg-black/75 flex items-center justify-center p-4 animate-fadeIn`}>
      <div className="max-w-md w-full rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 shadow-xl relative text-[var(--ink-primary)] space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-11 h-11 rounded-lg bg-[var(--marker-amber-dim)] border border-[var(--marker-amber-border)] text-[var(--marker-amber)] flex items-center justify-center">
          <Lock className="w-5 h-5" />
        </div>

        <div className="space-y-2">
          <h3 className="font-serif-math text-xl font-semibold tracking-tight text-[var(--ink-primary)]">
            Logar para responder
          </h3>
          <p className="text-xs text-[var(--ink-secondary)] leading-relaxed font-sans">
            Para assinalar alternativas, registrar suas deduções e receber os diagnósticos metacognitivos da <strong>MathAI Engine</strong>, você precisa entrar na sua conta ou se cadastrar gratuitamente.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <Link
            href={`/login?redirectTo=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/resolver")}`}
            className="w-full py-2.5 rounded-lg font-bold text-xs lemmas-gold-cta flex items-center justify-center gap-2 shadow-xs"
          >
            <LogIn className="w-4 h-4" />
            <span>Fazer Login</span>
          </Link>
          <Link
            href={`/login?tab=signup&redirectTo=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/resolver")}`}
            className="w-full py-2.5 rounded-lg font-semibold text-xs border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--ink-primary)] flex items-center justify-center gap-2 transition-colors"
          >
            <span>Criar Conta Gratuita</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs text-[var(--ink-muted)] hover:underline"
          >
            Continuar apenas explorando
          </button>
        </div>
      </div>
    </div>
  );
  return inline ? content : createPortal(content, document.body);
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
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 animate-fadeIn">
      <div className="max-w-md w-full rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 shadow-xl relative text-[var(--ink-primary)] space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-11 h-11 rounded-lg bg-[var(--marker-amber-dim)] border border-[var(--marker-amber-border)] text-[var(--marker-amber)] flex items-center justify-center">
          <AlertTriangle className="w-5 h-5" />
        </div>

        <div className="space-y-2">
          <h3 className="font-serif-math text-xl font-semibold tracking-tight text-[var(--ink-primary)]">
            Finalizar e Entregar Simulado?
          </h3>
          <p className="text-xs text-[var(--ink-secondary)] leading-relaxed font-sans tabular-nums">
            Você respondeu <strong>{respondidasCount}</strong> de <strong>{totalQuestoes}</strong> questões.
          </p>
          {emBrancoCount > 0 && (
            <div className="p-3 rounded-lg bg-[var(--marker-amber-dim)] border border-[var(--marker-amber-border)] text-[var(--marker-amber)] text-xs tabular-nums">
              Atenção: <strong>{emBrancoCount} questão{emBrancoCount > 1 ? "ões" : ""}</strong> continuam em branco. Em concursos reais, questões não respondidas conferem 0 pontos.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-[var(--ink-secondary)] hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-50"
          >
            Continuar Resolvendo
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="lemmas-gold-cta px-5 py-2 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
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


function renderDificuldadeBadge(dificuldade?: number | null) {
  if (!dificuldade) {
    return (
      <span className="lemma-badge text-[var(--ink-muted)]">
        <span className="lemma-badge-dot bg-[var(--ink-muted)]" />
        Nível Não Calibrado
      </span>
    );
  }
  if (dificuldade <= 2) {
    return (
      <span className="lemma-badge !text-[var(--marker-green)]">
        <span className="lemma-badge-dot bg-[var(--marker-green)]" />
        Fácil
      </span>
    );
  }
  if (dificuldade === 3) {
    return (
      <span className="lemma-badge !text-[var(--marker-amber)]">
        <span className="lemma-badge-dot bg-[var(--marker-amber)]" />
        Média
      </span>
    );
  }
  return (
    <span className="lemma-badge !text-[var(--marker-red)]">
      <span className="lemma-badge-dot bg-[var(--marker-red)]" />
      Difícil
    </span>
  );
}

function resumirVereditoAprovado(feedback: string | null | undefined, temPassos: boolean): string {
  const clean = (feedback || "").trim();
  if (!clean || !temPassos) return clean;
  // Corta narrativas redundantes que repetem o passo a passo já listado em Passos Verificados
  const stepIntroRegex = /\s+(?:Primeiro,|Primeiramente,|Inicialmente,|No primeiro passo|Para isso,|Você partiu|Ele partiu|Ao expandir|Como a expressão)/i;
  const match = clean.match(stepIntroRegex);
  if (match && match.index && match.index >= 20) {
    const candidate = clean.slice(0, match.index).trim();
    const dollarCount = (candidate.match(/\$/g) || []).length;
    if (dollarCount % 2 === 0) {
      return candidate;
    }
  }
  return clean;
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
  const windowSize = 20;
  const sessionGenerationRef = useRef(0);

  const profileStandbyDescricao = useMemo(
    () => (profile ? obterFiltrosApiPerfil(profile).origemDescricao : null),
    [profile]
  );

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

  // Armazenamento em Ref para ZERO re-renders do componente pai (3600+ linhas) durante a escrita ativa
  const lousaDocumentsRef = useRef<Record<number, CanvasDocument>>({});
  const getLousaDocument = (index: number) =>
    lousaDocumentsRef.current[index] ??= createCanvasDocument();

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
  const ocrEvidence = useRef<Record<number, { origem: "lousa" | "geometria" | "texto"; texto: string; imagemBase64?: string }>>({});
  const [loadingDiscursive, setLoadingDiscursive] = useState<boolean>(false);
  const [geometricCommands, setGeometricCommands] = useState<Record<number, string[]>>({});
  const [lousaHasStrokes, setLousaHasStrokes] = useState<Record<number, boolean>>({});
  const [modoFocoAtivo, setModoFocoAtivo] = useState<boolean>(false);
  const bancadaRef = React.useRef<HTMLDivElement>(null);

  const handleLousaStrokesChange = useCallback((strokes: Stroke[]) => {
    const hasStrokes = strokes.length > 0;
    setLousaHasStrokes((prev) =>
      prev[currentIndex] === hasStrokes
        ? prev
        : { ...prev, [currentIndex]: hasStrokes }
    );
  }, [currentIndex]);

  const handleGeometricCommandsChange = useCallback((cmds: string[]) => {
    setGeometricCommands((prev) => {
      const currentCmds = prev[currentIndex] || [];
      if (
        currentCmds.length === cmds.length &&
        currentCmds.every((c, i) => c === cmds[i])
      ) {
        return prev;
      }
      return { ...prev, [currentIndex]: cmds };
    });
  }, [currentIndex]);

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
    sessionGenerationRef.current += 1;
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
            const nextSessionType =
              modeQuery === "simulado" || sessionQuery === "simulado" ? "simulado" : "treino";
            setSessionType(nextSessionType);
            setSessionMode("active");
            setTotalTimeInitial(nextSessionType === "simulado" ? 30 * 60 : 0);
            setTimeLeft(nextSessionType === "simulado" ? 30 * 60 : 0);
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
            const selectedSessionGeneration = ++sessionGenerationRef.current;
            setTreinoFilters(null);
            setLoadedPages(new Set());
            setCurrentIndex(0);

            const res = await fetch("/api/questions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids: config.ids }),
            });
            const data = await res.json();
            if (
              !ignore &&
              selectedSessionGeneration === sessionGenerationRef.current &&
              data.questoes &&
              data.questoes.length > 0
            ) {
              sessionGenerationRef.current += 1;
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

            if (!ignore && selectedSessionGeneration === sessionGenerationRef.current) {
              sessionGenerationRef.current += 1;
              console.error("Nenhuma questão encontrada para os IDs selecionados:", config.ids);
              setQuestions([]);
              setTotalCount(0);
              setSessionType("treino");
              setSessionMode("active");
              return;
            }
            return;
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

        // CASO 4: Fallback Padrão (Standby com 5 questões personalizadas para o perfil)
        const profileFilters = obterFiltrosApiPerfil(profile);
        const hasCustomFilters = !!(
          (profileFilters.materia && profileFilters.materia.length > 0) ||
          (profileFilters.banca && profileFilters.banca.length > 0) ||
          profileFilters.categoria_banca
        );

        let data: any = null;
        if (hasCustomFilters) {
          try {
            const resCustom = await fetch("/api/questions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                filters: profileFilters,
                limit: 5,
                shuffle: true,
              }),
            });
            if (resCustom.ok) {
              data = await resCustom.json();
            }
          } catch {
            data = null;
          }
        }

        // Se não houver filtros ou a busca customizada vier vazia, fallback para as 5 padrão
        if (!data || !data.questoes || data.questoes.length === 0) {
          const res = await fetch(`/api/questions?limit=5`);
          data = await res.json();
        }

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
  }, [
    queryId,
    sessionQuery,
    modeQuery,
    // Apenas standby consome preferências do perfil; sessões explícitas não devem reiniciar com a hidratação do perfil.
    !queryId && sessionQuery !== "simulado" && sessionQuery !== "treino" ? profile?.id : undefined,
    !queryId && sessionQuery !== "simulado" && sessionQuery !== "treino" ? profile?.objetivoPrincipal : undefined,
  ]);

  // Carregamento paginado sob demanda (em lotes de 100) quando o aluno avança ou salta
  useEffect(() => {
    if (sessionType !== "treino" || !treinoFilters || totalCount <= 0) return;
    const pageNeeded = Math.floor(currentIndex / 100) + 1;
    if (loadedPages.has(pageNeeded)) return;

    let ignore = false;
    const generation = sessionGenerationRef.current;
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
        if (ignore || generation !== sessionGenerationRef.current) return;
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
        if (!ignore && generation === sessionGenerationRef.current) setLoadingChunk(false);
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
  const startWorkoutSimulado = async () => {
    if (!isAuthenticated && !userLoading) {
      setShowAuthModal(true);
      return;
    }
    setLoading(true);
    try {
      const profileFilters = obterFiltrosApiPerfil(profile);
      const hasCustomFilters = !!(
        (profileFilters.materia && profileFilters.materia.length > 0) ||
        (profileFilters.banca && profileFilters.banca.length > 0) ||
        profileFilters.categoria_banca
      );

      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(hasCustomFilters ? { filters: profileFilters } : {}),
          limit: 15,
          shuffle: true,
        }),
      });
      const data = await res.json();
      if (data.questoes && data.questoes.length > 0) {
        const parsedList = data.questoes.map((q: any) => {
          const { corpo, alternativas } = extrairEnunciadoEAlternativas(q.enunciado);
          return { ...q, enunciado_limpo: corpo, alternativas };
        });
        setQuestions(parsedList);
        setTotalCount(parsedList.length);
      }
    } catch (err) {
      console.error("Erro ao carregar simulado rápido:", err);
    } finally {
      setLoading(false);
    }
    setSessionType("simulado");
    setSessionMode("active");
    setCurrentIndex(0);
    setAnswers({});
    setSubmitResults({});
    setFeedbacks({});
    setJustificativas({});
    setBookmarks(new Set());
    lousaDocumentsRef.current = {};
    setTotalTimeInitial(45 * 60);
    setTimeLeft(45 * 60);
  };

  // Iniciar Treino Livre do Standby
  const startWorkoutTreino = () => {
    if (!isAuthenticated && !userLoading) {
      setShowAuthModal(true);
      return;
    }
    // Estudo Livre vai direto para o Banco de Questões com filtros
    router.push("/questoes");
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
  const handleSubmitCurrent = async (answerOverride?: string, strategyOverride?: string) => {
    const q = questions[currentIndex];
    const userAns = typeof answerOverride === "string" ? answerOverride : (q ? answers[q.id] : undefined);
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
          estrategia_usada: strategyOverride || (usedHints
            ? (estrategias[currentIndex]
                ? `${estrategias[currentIndex]} [Dica Socrática Nível ${maxHintLevel}]`
                : `Dica Socrática Nível ${maxHintLevel}`)
            : (estrategias[currentIndex] || null)),
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
      let accessToken: string | null = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        accessToken = session?.access_token || null;
        if (!accessToken) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          accessToken = refreshed?.session?.access_token || null;
        }
      } catch {
        // Prossegue se autenticado via perfil/cookie local
      }
      if (!accessToken && !isAuthenticated && profile?.isGuest) {
        setShowAuthModal(true);
        throw new Error("Faça login para consultar o Tutor Socrático.");
      }

      // P1: A preferência pedagógica explícita do estudante PREVALECE soberanamente.
      // Heurísticas de motivação só são acionadas como sugestão inicial se a preferência não estiver definida.
      const motivacoes = profile?.motivacoesSelecionadas || [];
      const foco = (profile?.focoConcurso || "").toUpperCase();
      const validPreferences = ["conceitual", "rigor_formal", "aplicado_ml", "competitivo"];
      let prefPedagogica = profile?.pedagogicalPreference && validPreferences.includes(profile.pedagogicalPreference)
        ? profile.pedagogicalPreference
        : null;

      if (!prefPedagogica) {
        if (motivacoes.includes("superior_docencia")) {
          prefPedagogica = "rigor_formal";
        } else if (motivacoes.includes("data_science_ml")) {
          prefPedagogica = "aplicado_ml";
        } else if (
          motivacoes.includes("concursos_militares") ||
          ["ITA", "IME", "AFA", "EFOMM", "ESCOLA NAVAL"].some((b) => foco.includes(b))
        ) {
          prefPedagogica = "competitivo";
        } else {
          prefPedagogica = "conceitual";
        }
      }

      const hintHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) hintHeaders["Authorization"] = "Bearer " + accessToken;

      const res = await fetch("/api/ai/hint", {
        method: "POST",
        headers: hintHeaders,
        body: JSON.stringify({
          exercise_id: q.id,
          id: q.id,
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
      } else {
        throw new Error("A MathAI Engine não retornou o conteúdo da dica. Tente novamente.");
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
    overrideContent?: { texto?: string; imagemBase64?: string; transcricaoConfirmada?: string }
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

    const justificativaRequest =
      textoDeducao ||
      (imageBase64
        ? ""
        : origem === "lousa"
          ? "Resolução manuscrita desenhada na Lousa de Rascunho."
          : "Construção geométrica desenvolvida na Bancada Euclidiana.");

    if (!overrideContent?.transcricaoConfirmada) {
      ocrEvidence.current[q.id] = { origem, texto: textoDeducao, imagemBase64: imageBase64 || undefined };
    }
    setLoadingDiscursive(true);
    setLoadingIa(true);
    try {
      let accessToken: string | null = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        accessToken = session?.access_token || null;
        if (!accessToken) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          accessToken = refreshed?.session?.access_token || null;
        }
      } catch {
        // Prossegue se autenticado via perfil/cookie local
      }
      if (!accessToken && !isAuthenticated && profile?.isGuest) {
        setShowAuthModal(true);
        return;
      }

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) {
        headers["Authorization"] = "Bearer " + accessToken;
      }

      const res = await fetch("/api/ai/solve", {
        method: "POST",
        headers,
        body: JSON.stringify({
          enunciado: q.enunciado,
          gabarito: q.gabarito || "",
          justificativa: justificativaRequest,
          imagem_base64: imageBase64 || null,
          transcricao_confirmada: overrideContent?.transcricaoConfirmada,
        }),
      });

      const data = await res.json();
      if (res.status === 401) {
        setShowAuthModal(true);
        return;
      }
      if (!res.ok) {
        throw new Error(data.error || data.diagnostico || `Falha ao avaliar a resolução (HTTP ${res.status}).`);
      }

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
        ocr_review_required: data.ocr_review_required === true,
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

      // Identificação e auto-marcação da alternativa (se a questão possuir alternativas)
      const alts =
        q.alternativas && Object.keys(q.alternativas).length > 0
          ? q.alternativas
          : extrairEnunciadoEAlternativas(q.enunciado).alternativas;
      const altKeys = Object.keys(alts || {});
      const hasAlternativas = altKeys.length > 0;

      const rawGab = (q.gabarito || "").trim();
      const cleanGabMatch = rawGab.match(/(?:^|[([{\s]|\b(?:LETRA|OPÇÃO|OPCAO)\s*)([A-E])(?:\b|[)\]}\s.,;]|$)/i);
      const cleanGab = cleanGabMatch ? cleanGabMatch[1].toUpperCase() : rawGab.toUpperCase();

      const matchedGabaritoOption =
        altKeys.find((key) => key.trim().toUpperCase() === cleanGab) ||
        (["A", "B", "C", "D", "E"].includes(cleanGab) ? cleanGab : undefined);

      const isResolutionCorrect = Boolean(
        evalResult.resultado_final_correto ||
        rawVeredito === "aprovado" ||
        data.status_resolucao === "correto"
      );

      const rawAltIdentificada = typeof data.alternativa_identificada === "string" 
        ? data.alternativa_identificada.trim().toUpperCase()
        : typeof data.alternativa === "string" 
        ? data.alternativa.trim().toUpperCase() 
        : null;
      const cleanIdentifiedMatch = rawAltIdentificada?.match(/([A-E])/i);
      const identifiedFromAi = cleanIdentifiedMatch ? cleanIdentifiedMatch[1].toUpperCase() : undefined;

      const optionToSelect = (isResolutionCorrect ? matchedGabaritoOption : identifiedFromAi) || (isResolutionCorrect ? cleanGab : undefined);

      let alreadySubmittedInTreino = false;
      if (hasAlternativas && optionToSelect) {
        // Auto-marca a alternativa identificada tanto em Simulado quanto em Treino
        setAnswers((prev) => ({ ...prev, [q.id]: optionToSelect }));
        setAnsweredIndices((prev) => new Set(prev).add(currentIndex));

        if (sessionType === "treino" && isResolutionCorrect) {
          await handleSubmitCurrent(
            optionToSelect,
            `Resposta identificada na resolução manuscrita (${origem})`
          );
          alreadySubmittedInTreino = true;
        }
      } else {
        // Questão puramente discursiva ou sem alternativa identificada
        setAnsweredIndices((prev) => new Set(prev).add(currentIndex));
      }

      // Telemetria das dicas socráticas utilizadas até a submissão discursiva
      const qHints = hintsHistory[currentIndex] || [];
      const usedHints = qHints.length > 0;
      const maxHintLevel = usedHints ? Math.max(...qHints.map((h) => h.nivel)) : 0;

      // Persistência em public.tentativas e revisao_espacada via API submit
      if (!alreadySubmittedInTreino) {
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
              avaliacao_ia: data,
              precisa_revisao_humana: data.precisa_revisao_humana === true,
              transcricao_confirmada: overrideContent?.transcricaoConfirmada || null,
              justificativa_texto: justificativaRequest || null,
              imagem_base64: imageBase64 || null,
              origem: origem || "bancada",
            }),
          });
          const submitData = await submitRes.json();
          if (!submitData.error) {
            setSubmitResults((prev) => ({ ...prev, [currentIndex]: submitData }));
          }
        } catch (saveErr) {
          console.warn("Aviso ao persistir tentativa discursiva:", saveErr);
        }
      }
    } catch (err) {
      console.error("Erro ao avaliar com MathAI Engine:", err);
      window.alert(err instanceof Error ? err.message : "Não foi possível avaliar sua resolução. Tente novamente.");
    } finally {
      setLoadingDiscursive(false);
      setLoadingIa(false);
    }
  };

  const confirmarLeituraOcr = async (text: string) => {
    if (!currentQ) return;
    const evidence = ocrEvidence.current[currentQ.id];
    if (!evidence) return;
    await submeterResolucaoDiscursiva(evidence.origem, { ...evidence, transcricaoConfirmada: text });
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
          tentativa_id: submitResults[idx]?.id || null,
          avaliacao_ia_id: diagnosticosIa[idx]?.id || null,
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
            tentativa_id: submitResults[idx]?.id || null,
            avaliacao_ia_id: diagnosticosIa[idx]?.id || null,
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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-amber-500" />
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
      <div className="space-y-8 max-w-4xl mx-auto py-6 animate-fadeIn text-[var(--ink-primary)]">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[var(--marker-blue-dim)] dark:bg-[var(--marker-amber-dim)] border border-[var(--marker-blue-border)] dark:border-[var(--marker-amber-border)] text-xs font-semibold text-[var(--marker-blue)] dark:text-[var(--marker-amber)]">
            <Zap className="w-3.5 h-3.5 text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" />
            <span>Simulador & Treino Interativo · LEMMAS Core & MathAI Engine</span>
          </div>
          <h1 className="font-serif-math text-3xl md:text-4xl font-semibold text-[var(--ink-primary)] tracking-tight">
            Ambiente de Resolução & Diagnóstico.
          </h1>
          <p className="text-[var(--ink-secondary)] text-sm leading-relaxed max-w-2xl font-sans">
            Escolha como prefere praticar: crie um simulado cronometrado com regras oficiais de concurso ou estude sem pressão com o auxílio em tempo real da MathAI Engine.
          </p>
          {profileStandbyDescricao && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[var(--marker-blue-dim)] dark:bg-[var(--marker-amber-dim)] border border-[var(--marker-blue-border)] dark:border-[var(--marker-amber-border)] text-xs text-[var(--ink-primary)]">
              <Sparkles className="w-3.5 h-3.5 text-[var(--marker-blue)] dark:text-[var(--marker-amber)] shrink-0" />
              <span>
                Foco ativo do seu perfil: <strong className="font-semibold text-[var(--marker-blue)] dark:text-[var(--marker-amber)]">{profileStandbyDescricao}</strong> (questões e simulado calibrados)
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* CARD 1: MODO ESTUDO LIVRE */}
          <div className="rounded-xl bg-[var(--bg-card)] p-6 border border-[var(--border-subtle)] flex flex-col justify-between hover:border-[var(--border-default)] transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Lightbulb className="w-5 h-5" />
              </div>
              <h3 className="font-serif-math font-semibold text-[var(--ink-primary)] text-base tracking-tight">Modo Estudo Livre</h3>
              <p className="text-xs text-[var(--ink-muted)] leading-relaxed font-sans">
                Sem pressão de tempo. Tutor Socrático ativado, envio de foto do caderno, dicas progressivas e atualização SM-2 imediata.
              </p>
            </div>
            <button
              onClick={startWorkoutTreino}
              className="mt-6 w-full py-2.5 rounded-lg bg-[var(--bg-board)] hover:bg-[var(--bg-subtle)] text-[var(--ink-primary)] border border-[var(--border-subtle)] font-semibold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
              <span>Treinar Livremente</span>
            </button>
          </div>

          {/* CARD 2: SIMULADO CRONOMETRADO */}
          <div className="rounded-xl bg-[var(--bg-card)] p-6 border border-[var(--border-subtle)] flex flex-col justify-between hover:border-[var(--border-default)] transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--marker-amber-dim)] border border-[var(--marker-amber-border)] text-[var(--marker-amber)] flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-serif-math font-semibold text-[var(--ink-primary)] text-base tracking-tight">Simulado com Tempo</h3>
              <p className="text-xs text-[var(--ink-muted)] leading-relaxed font-sans">
                Cronômetro oficial, gabarito oculto e sem auxílio de IA durante a prova. Relatório completo de acertos e erros ao entregar.
              </p>
            </div>
            <button
              onClick={startWorkoutSimulado}
              className="lemmas-gold-cta mt-6 w-full py-2.5 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Iniciar Simulado Rápido</span>
            </button>
          </div>

          {/* CARD 3: NAVEGAR NO BANCO */}
          <div className="rounded-xl bg-[var(--bg-card)] p-6 border border-[var(--border-subtle)] flex flex-col justify-between hover:border-[var(--border-default)] transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--marker-blue-dim)] dark:bg-[var(--marker-amber-dim)] border border-[var(--marker-blue-border)] dark:border-[var(--marker-amber-border)] text-[var(--marker-blue)] dark:text-[var(--marker-amber)] flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-serif-math font-semibold text-[var(--ink-primary)] text-base tracking-tight">Montar Simulado no Banco</h3>
              <p className="text-xs text-[var(--ink-muted)] leading-relaxed font-sans">
                Filtre por EFOMM, CEDERJ, ESA, tópicos ou anos e escolha exatamente quais questões você quer no simulado.
              </p>
            </div>
            <Link
              href="/questoes"
              className="mt-6 w-full py-2.5 rounded-lg border border-[var(--border-subtle)] text-[var(--ink-secondary)] bg-[var(--bg-board)] hover:bg-[var(--bg-subtle)] font-semibold text-xs transition-colors flex items-center justify-center gap-2"
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
    const getQuestionOutcome = (q: Question, idx: number): "acerto" | "erro" | "em_branco" => {
      const resp = answers[q.id];
      if (hint5Used[idx] || resp === "DICA_5_REVELADA") {
        return "erro";
      }
      const discEval = discursiveEvaluations[q.id];
      if (discEval && !discEval.precisa_revisao_humana && discEval.veredito !== "sem_desenvolvimento") {
        return discEval.veredito === "aprovado" || discEval.resultado_final_correto ? "acerto" : "erro";
      }
      const subRes = submitResults[idx];
      if (subRes) {
        return subRes.acertou ? "acerto" : "erro";
      }
      const rawGab = (q.gabarito || "").trim();
      if (!resp || !rawGab) {
        return "em_branco";
      }
      return resp.trim().toUpperCase() === rawGab.toUpperCase() ? "acerto" : "erro";
    };

    let acertos = 0;
    let erros = 0;
    let emBranco = 0;

    questions.forEach((q, idx) => {
      const outcome = getQuestionOutcome(q, idx);
      if (outcome === "acerto") acertos++;
      else if (outcome === "erro") erros++;
      else emBranco++;
    });

    const totalQuestoesResultado = questions.length || 1;
    const taxa = Math.round((acertos / totalQuestoesResultado) * 100);
    const tempoGastoSegundos = sessionType === "simulado" 
      ? Math.max(0, totalTimeInitial - timeLeft)
      : timeLeft;
    const tempoMin = Math.floor(tempoGastoSegundos / 60);
    const tempoSeg = tempoGastoSegundos % 60;

    // Filtra questões para exibição na lista de revisão
    const questoesRevisao = questions.filter((q, idx) => {
      const outcome = getQuestionOutcome(q, idx);
      if (reviewFilter === "acertos") return outcome === "acerto";
      if (reviewFilter === "erros") return outcome === "erro";
      if (reviewFilter === "em_branco") return outcome === "em_branco";
      return true;
    });

    return (
      <div className="max-w-4xl mx-auto py-8 space-y-8 animate-fadeIn text-[var(--ink-primary)]">
        {/* CABEÇALHO DE RESULTADOS */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-xl bg-[var(--marker-amber-dim)] border border-[var(--marker-amber-border)] text-[var(--marker-amber)] flex items-center justify-center mx-auto">
            <Award className="w-6 h-6" />
          </div>
          <h2 className="font-serif-math text-3xl font-semibold text-[var(--ink-primary)] tracking-tight">
            {sessionType === "treino" ? "Treino Finalizado!" : "Simulado Finalizado!"}
          </h2>
          <p className="text-xs md:text-sm text-[var(--ink-secondary)] max-w-xl mx-auto leading-relaxed">
            Confira o seu aproveitamento, a distribuição de acertos e analise agora cada questão com a <strong>MathAI Engine</strong> para entender as pegadinhas e os lemas teóricos.
          </p>
        </div>

        {/* MÉTRICAS PRINCIPAIS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* ACERTOS */}
          <div className="p-5 rounded-xl bg-[var(--marker-green-dim)] border border-[var(--marker-green-border)] text-center space-y-1">
            <div className="text-2xl md:text-3xl font-bold font-serif-math tabular-nums text-[var(--marker-green)]">
              {acertos}
            </div>
            <div className="text-xs font-semibold tabular-nums text-[var(--ink-primary)]">
              Acertos ({taxa}%)
            </div>
            <div className="text-[10px] text-[var(--ink-muted)]">Respostas Corretas</div>
          </div>

          {/* ERROS */}
          <div className="p-5 rounded-xl bg-[var(--marker-red-dim)] border border-[var(--marker-red-border)] text-center space-y-1">
            <div className="text-2xl md:text-3xl font-bold font-serif-math tabular-nums text-[var(--marker-red)]">
              {erros}
            </div>
            <div className="text-xs font-semibold tabular-nums text-[var(--ink-primary)]">
              Erros ({Math.round((erros / totalQuestoesResultado) * 100)}%)
            </div>
            <div className="text-[10px] text-[var(--ink-muted)]">Divergências do Gabarito</div>
          </div>

          {/* EM BRANCO */}
          <div className="p-5 rounded-xl bg-[var(--marker-amber-dim)] border border-[var(--marker-amber-border)] text-center space-y-1">
            <div className="text-2xl md:text-3xl font-bold font-serif-math tabular-nums text-[var(--marker-amber)]">
              {emBranco}
            </div>
            <div className="text-xs font-semibold tabular-nums text-[var(--ink-primary)]">
              Em Branco ({Math.round((emBranco / totalQuestoesResultado) * 100)}%)
            </div>
            <div className="text-[10px] text-[var(--ink-muted)]">Não respondidas</div>
          </div>

          {/* TEMPO TOTAL */}
          <div className="p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-center space-y-1">
            <div className="text-2xl md:text-3xl font-bold font-serif-math tabular-nums text-[var(--ink-primary)]">
              {tempoMin}m {tempoSeg}s
            </div>
            <div className="text-xs font-semibold text-[var(--ink-secondary)]">
              Tempo Gasto
            </div>
            <div className="text-[10px] text-[var(--ink-muted)]">
              {sessionType === "treino" ? "Duração do treino" : "Duração da prova"}
            </div>
          </div>
        </div>

        {/* NOTA PEDAGÓGICA SOBRE QUESTÕES EM BRANCO */}
        <div className="p-4 rounded-xl bg-[var(--marker-blue-dim)] border border-[var(--marker-blue-border)] dark:bg-[var(--marker-amber-dim)] dark:border-[var(--marker-amber-border)] flex items-start gap-3 text-xs leading-relaxed">
          <HelpCircle className="w-5 h-5 text-[var(--marker-blue)] dark:text-[var(--marker-amber)] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-[var(--ink-primary)] block">
              Como questões em branco são contabilizadas?
            </strong>
            <p className="text-[var(--ink-secondary)]">
              Em concursos militares (EFOMM, ESA) e vestibulares convencionais, questões deixadas em branco conferem <strong>0 pontos</strong> (não somam no aproveitamento final). Mostramos as questões em branco separadas dos erros propositais para que você possa avaliar sua estratégia de gestão de tempo e saber quando vale a pena pular ou arriscar.
            </p>
          </div>
        </div>

        {/* REVISÃO QUESTÃO A QUESTÃO COM A MATHAI ENGINE */}
        <div className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
            <div>
              <h3 className="font-serif-math text-xl font-semibold text-[var(--ink-primary)] tracking-tight">
                Revisão e Diagnóstico Pedagógico
              </h3>
              <p className="text-xs text-[var(--ink-muted)]">
                Clique nas questões para ver a resolução e acionar o diagnóstico da MathAI Engine.
              </p>
            </div>

            {/* ABAS DE FILTRO */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs font-semibold tabular-nums">
              <button
                type="button"
                onClick={() => setReviewFilter("todas")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  reviewFilter === "todas" ? "bg-[var(--bg-card)] text-[var(--marker-blue)] dark:text-[var(--marker-amber)] border border-[var(--border-subtle)]" : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                }`}
              >
                Todas {(() => { const t = parseInt(searchParams.get("total") || "0", 10); return t || questions.length; })()}
              </button>
              <button
                type="button"
                onClick={() => setReviewFilter("erros")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  reviewFilter === "erros" ? "bg-[var(--marker-red-dim)] text-[var(--marker-red)]" : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                }`}
              >
                Erros ({erros})
              </button>
              <button
                type="button"
                onClick={() => setReviewFilter("em_branco")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  reviewFilter === "em_branco" ? "bg-[var(--marker-amber-dim)] text-[var(--marker-amber)]" : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                }`}
              >
                Em Branco ({emBranco})
              </button>
              <button
                type="button"
                onClick={() => setReviewFilter("acertos")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  reviewFilter === "acertos" ? "bg-[var(--marker-green-dim)] text-[var(--marker-green)]" : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
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
              const idx = originalIndex >= 0 ? originalIndex : 0;
              const outcome = getQuestionOutcome(q, idx);
              const acertou = outcome === "acerto";
              const isEmBranco = outcome === "em_branco";
              const discEval = discursiveEvaluations[q.id];
              const isHint5 = Boolean(hint5Used[idx] || answers[q.id] === "DICA_5_REVELADA");
              const rawAlunoResp = answers[q.id];
              const alunoResp = rawAlunoResp && rawAlunoResp !== "DICA_5_REVELADA" ? rawAlunoResp : undefined;
              const rawGabarito = (q.gabarito || "").trim();
              const isSingleLetterGab = /^[A-E]$/i.test(rawGabarito);
              const gabaritoUpper = isSingleLetterGab ? rawGabarito.toUpperCase() : rawGabarito;
              const isExpanded = expandedReviewId === q.id;
              const iaResult = resolucoesIa[q.id];
              const isCarregandoIa = loadingResolucaoIa[q.id];

              return (
                <div
                  key={q.id}
                  className={`p-5 rounded-xl bg-[var(--bg-card)] border transition-colors space-y-4 ${
                    acertou
                      ? "border-[var(--marker-green-border)]"
                      : isEmBranco
                      ? "border-[var(--marker-amber-border)]"
                      : "border-[var(--marker-red-border)]"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono tabular-nums text-xs px-2.5 py-1 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--ink-primary)] font-semibold">
                        Questão #{idx + 1}
                      </span>
                      <span className="text-xs text-[var(--ink-muted)] font-semibold tabular-nums">
                        {q.banca} {q.ano} · {q.materia} ({q.topico})
                      </span>
                      {(q.lema_codigo || q.lema_id) && (
                        <LemaBadge lemaCodigo={q.lema_codigo} lemaId={q.lema_id} variant="compact" />
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {acertou ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--marker-green-dim)] text-[var(--marker-green)] border border-[var(--marker-green-border)] text-xs font-semibold tabular-nums">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{alunoResp ? `Acertou (${alunoResp})` : "Acertou (Discursiva Validada)"}</span>
                        </span>
                      ) : isEmBranco ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--marker-amber-dim)] text-[var(--marker-amber)] border border-[var(--marker-amber-border)] text-xs font-semibold tabular-nums">
                          <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {isSingleLetterGab
                              ? `Em Branco (Correta: ${gabaritoUpper})`
                              : rawGabarito
                              ? "Em Branco"
                              : "Em Branco (Sem gabarito)"}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--marker-red-dim)] text-[var(--marker-red)] border border-[var(--marker-red-border)] text-xs font-semibold tabular-nums">
                          <XCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {isSingleLetterGab && alunoResp
                              ? `Errou: Marcou (${alunoResp}) · Correta (${gabaritoUpper})`
                              : isHint5
                              ? "Errou (Consulta Nível 5)"
                              : discEval?.veredito === "parcial"
                              ? "Crédito Parcial"
                              : "Desenvolvimento Incorreto"}
                          </span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setExpandedReviewId(isExpanded ? null : q.id)}
                        className="p-1.5 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors"
                        title={isExpanded ? "Recolher detalhes" : "Expandir questão"}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* ENUNCIADO RESUMIDO OU EXPANDIDO */}
                  <div className="font-serif-math text-[15px] font-normal text-[var(--ink-primary)] leading-relaxed whitespace-pre-line overflow-x-auto">
                    <MathText text={q.enunciado_limpo || q.enunciado} />
                  </div>

                  {/* GABARITO KATEX PARA QUESTÕES DISCURSIVAS OU COM EXPRESSÃO MATEMÁTICA */}
                  {!isSingleLetterGab && rawGabarito && (
                    <div
                      className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                        isEmBranco
                          ? "bg-[var(--marker-amber-dim)] text-[var(--ink-primary)] border-[var(--marker-amber-border)]"
                          : acertou
                          ? "bg-[var(--marker-green-dim)] text-[var(--ink-primary)] border-[var(--marker-green-border)]"
                          : "bg-[var(--marker-red-dim)] text-[var(--ink-primary)] border-[var(--marker-red-border)]"
                      }`}
                    >
                      <span
                        className={`font-semibold block text-[11px] uppercase tracking-wider ${
                          isEmBranco
                            ? "text-[var(--marker-amber)]"
                            : acertou
                            ? "text-[var(--marker-green)]"
                            : "text-[var(--marker-red)]"
                        }`}
                      >
                        {isEmBranco ? "Correta / Gabarito Oficial:" : "Gabarito / Resolução de Referência Oficial:"}
                      </span>
                      <div className="text-[var(--ink-secondary)] leading-relaxed whitespace-pre-line overflow-x-auto">
                        <MathText text={rawGabarito} />
                      </div>
                    </div>
                  )}

                  {/* ÁREA EXPANDIDA COM IA */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-[var(--border-subtle)] space-y-4 animate-fadeIn">
                      {/* ALTERNATIVAS */}
                      {q.alternativas && (() => {
                        const isComplex = Object.values(q.alternativas).some((v) => 
                          v && (v.length > 20 || v.includes("\\frac") || v.includes("\\sqrt") || v.includes("\\matrix"))
                        );
                        return (
                          <div className={`grid gap-2 text-xs ${isComplex ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-5"}`}>
                            {Object.entries(q.alternativas).map(([letra, valor]) => {
                              const isAluno = alunoResp === letra;
                              const gabarito = (q.gabarito || "").trim().toUpperCase();
                              const isGabarito = gabarito && gabarito === letra.toUpperCase();

                              return (
                                <div
                                  key={letra}
                                  className={`px-3 py-2.5 rounded-lg border flex items-center gap-2.5 min-h-[48px] ${
                                    isGabarito
                                      ? "bg-[var(--marker-green-dim)] border-[var(--marker-green)] text-[var(--ink-primary)] font-semibold"
                                      : isAluno
                                      ? "bg-[var(--marker-red-dim)] border-[var(--marker-red)] text-[var(--ink-primary)] font-semibold"
                                      : "bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--ink-secondary)]"
                                  }`}
                                >
                                  <span className="font-semibold font-mono shrink-0">({letra})</span>
                                  <div className="overflow-x-auto w-full py-0.5 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                    <MathText text={valor} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {/* BOTÃO PARA PEDIR EXPLICAÇÃO À IA */}
                      {!iaResult && (
                        <div className="pt-2 space-y-2">
                          <button
                            type="button"
                            onClick={() => pedirExplicacaoPosSimulado(q)}
                            disabled={isCarregandoIa}
                            className="lemmas-gold-cta px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
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
                            <div className="p-4 rounded-xl bg-[var(--marker-blue-dim)] border border-[var(--marker-blue-border)] text-xs animate-fadeIn">
                              <ThoughtLine
                                working={true}
                                label="MathAI Engine estruturando demonstração…"
                                steps={[
                                  "Recuperando teoremas e lemas fundamentais da questão",
                                  "Construindo encadeamento dedutivo passo a passo",
                                  "Formatando fórmulas matemáticas e equações em KaTeX",
                                ]}
                                color="var(--marker-blue)"
                                glyphColor="var(--marker-blue)"
                                fontSize={12}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* RESULTADO DA IA */}
                      {iaResult && (
                        <div className="p-4 rounded-xl bg-[var(--marker-blue-dim)] border border-[var(--marker-blue-border)] space-y-3 text-xs leading-relaxed animate-fadeIn">
                          <div className="flex items-center justify-between pb-2 border-b border-[var(--marker-blue-border)]">
                            <span className="font-semibold text-[var(--marker-blue)] flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" />
                              Parecer da MathAI Engine:
                            </span>
                            <span className="text-[11px] font-mono text-[var(--marker-blue)]">
                              Status: {iaResult.status_resolucao}
                            </span>
                          </div>
                          <div className="text-[var(--ink-primary)] overflow-x-auto">
                            <MathText text={iaResult.diagnostico} />
                          </div>
                          {iaResult.dica_proximo_passo && (
                            <div className="p-2.5 rounded-lg bg-[var(--bg-board)] border border-[var(--marker-blue-border)] text-[var(--ink-secondary)] overflow-x-auto">
                              <span className="font-semibold text-[var(--marker-blue)] block mb-1">Lema / Passo-chave:</span>
                              <MathText text={iaResult.dica_proximo_passo} />
                            </div>
                          )}
                        </div>
                      )}
                      <QuestionDiscussion key={`simulado-disc-${q.id}`} questionId={q.id} variant="inline" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTÕES DE VOLTAR */}
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            onClick={() => setSessionMode("standby")}
            className="lemmas-gold-cta px-5 py-2.5 rounded-lg font-bold text-xs shadow-xs"
          >
            Voltar ao Hub de Treino
          </button>
          <Link
            href="/questoes"
            className="px-5 py-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--ink-secondary)] text-xs font-semibold hover:bg-[var(--bg-elevated)] hover:text-[var(--ink-primary)] transition-colors"
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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-amber-500 mx-auto" />
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
    currentQ?.tipo?.toLowerCase() === "discursiva" ||
    currentQ?.gabarito?.toLowerCase().includes("discursiv")
  );
  const { corpo, alternativas } = extrairEnunciadoEAlternativas(currentQ.enunciado, isQuestionDiscursiva);
  const isSimuladoAtivo = sessionType === "simulado";
  const isDiscursiva = Boolean(
    isQuestionDiscursiva ||
    (currentQ?.tipo?.toLowerCase() !== "objetiva" && Object.keys(alternativas).length === 0)
  );
  const discursiveEval = currentQ ? discursiveEvaluations[currentQ.id] : undefined;

  // Fixed blocks of 20; jump controls stay visible without horizontal scrolling.
  const windowStart = Math.floor(currentIndex / windowSize) * windowSize;
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
      className="relative z-10 rounded-xl bg-[var(--bg-card)] p-4 sm:p-6 border border-[var(--border-subtle)] space-y-4 scroll-mt-6 animate-fadeIn"
    >
      <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 max-w-full">
          {isDiscursiva ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-[var(--marker-blue)] dark:bg-[var(--marker-amber)] text-white dark:text-[#101316] shrink-0">
              <Sparkles className="w-3 h-3" />
              DISCURSIVA
            </span>
          ) : (
            <PenTool className="w-4 h-4 text-[var(--marker-blue)] dark:text-[var(--marker-amber)] shrink-0" />
          )}
          <h4 className="font-serif-math text-xs sm:text-sm font-semibold uppercase tracking-wider text-[var(--ink-primary)] break-words">
            {isDiscursiva ? (
              <>Bancada de Resolução<span className="hidden xl:inline"> do Estudante</span></>
            ) : (
              <>Bancada de Rascunho<span className="hidden xl:inline"> & Ferramentas</span></>
            )}
          </h4>
        </div>

        {/* ABAS RÁPIDAS DA BANCADA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 w-full min-w-0 select-none">
          <button
            type="button"
            onClick={() => {
              if (bancadaModo === "lousa") {
                setBancadaModo(null);
              } else {
                ativarEIrParaBancada("lousa");
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 border ${
              bancadaModo === "lousa"
                ? "lemmas-gold-cta font-bold border-transparent"
                : "bg-[var(--bg-board)] text-[var(--ink-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-default)]"
            }`}
            title="Lousa com Pointer Events e rejeição de palma para rascunhos"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Lousa <span className="hidden md:inline">de Rascunho</span></span>
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
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 border ${
              bancadaModo === "geometria"
                ? "bg-sky-600 text-white border-sky-600 font-bold"
                : "bg-[var(--bg-board)] text-[var(--ink-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-default)]"
            }`}
            title="Quadro Euclidiano com régua, compasso e script de lemas"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Geometria <span className="hidden md:inline">Euclidiana</span></span>
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
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 border ${
              bancadaModo === "texto"
                ? "bg-[var(--marker-blue)] text-white dark:text-[#101316] border-[var(--marker-blue)] font-bold"
                : "bg-[var(--bg-board)] text-[var(--ink-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-default)]"
            }`}
            title="Dedução digitada em texto ou envio de foto para OCR"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Dedução & OCR</span>
          </button>

          {/* MODO FOCO IMERSIVO (MESA DE PROVA OPT-IN) */}
          <button
            type="button"
            onClick={() => {
              if (!bancadaModo) {
                setBancadaModo("lousa");
              }
              setModoFocoAtivo(true);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-[var(--marker-amber-dim)] hover:opacity-90 text-[var(--marker-amber)] border border-[var(--marker-amber-border)] whitespace-nowrap shrink-0"
            title="Abrir a Lousa ou GeoGebra em tela cheia com card flutuante da questão"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--marker-amber)]" />
            <span className="font-semibold">Modo Foco <span className="hidden lg:inline">Imersivo</span></span>
          </button>
        </div>
      </div>

      {/* DICA QUANDO NENHUM MODO DA BANCADA ESTÁ ATIVO */}
      {!bancadaModo && isDiscursiva && (
        <div className="p-3.5 rounded-xl border border-[var(--marker-blue-border)] bg-[var(--marker-blue-dim)] dark:border-[var(--marker-amber-border)] dark:bg-[var(--marker-amber-dim)] text-xs text-[var(--ink-secondary)] leading-relaxed font-sans">
          Esta questão exige desenvolvimento. Escolha acima uma ferramenta: use a <strong>Lousa</strong> para desenhar ou calcular à mão com a caneta/S-Pen, a <strong>Geometria</strong> para traçados com régua e compasso, ou <strong>Dedução & OCR</strong> para digitar ou fotografar seu caderno.
        </div>
      )}

      {!bancadaModo && !isDiscursiva && (
        <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-sans italic pt-0.5">
          Selecione uma das ferramentas acima para abrir a Lousa de Rascunho, a Bancada de Geometria ou enviar sua Dedução/OCR para a MathAI Engine.
        </p>
      )}

      {/* CONTEÚDO ATIVO DA BANCADA */}
      {bancadaModo === "lousa" && !modoFocoAtivo && (
        <div className="space-y-3 animate-fadeIn">
          <SpenSmartCanvas
            key={`spen-canvas-q${currentIndex}-${currentQ?.id ?? 'none'}`}
            documentState={getLousaDocument(currentIndex)}
            onStrokesChange={handleLousaStrokesChange}
            onEvaluateOcr={async (b64) => {
              setLousaHasStrokes((prev) => ({ ...prev, [currentIndex]: true }));
              setImageFiles((prev) => ({ ...prev, [currentIndex]: b64 }));
              await submeterResolucaoDiscursiva("lousa", { imagemBase64: b64 });
            }}
            isEvaluating={loadingDiscursive}
          />
        </div>
      )}

      {bancadaModo === "geometria" && !modoFocoAtivo && (
        <div className="space-y-3 animate-fadeIn">
          <GeometricCompassBoard
            key={`geo-board-q${currentIndex}-${currentQ?.id ?? 'none'}`}
            initialCommands={geometricCommands[currentIndex]}
            onCommandsChange={handleGeometricCommandsChange}
            onClose={() => setBancadaModo(null)}
          />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border border-sky-500/25 bg-sky-500/[0.06]">
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
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-40 shrink-0 cursor-pointer"
            >
              {loadingDiscursive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Compass className="w-3.5 h-3.5" />}
              <span>Avaliar Geometria com MathAI Engine</span>
            </button>
          </div>
        </div>
      )}

      {bancadaModo === "texto" && (
        <div className="space-y-4 animate-fadeIn">
          <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-[#101316] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-emerald-600 text-white">
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
              className="w-full text-xs p-3 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#14171c] text-slate-800 dark:text-[#f5f0df] focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-amber-500/20 font-mono leading-relaxed resize-y"
              rows={3}
            />
          </div>

          <div className="p-4 rounded-xl border border-dashed border-blue-500/35 dark:border-amber-500/35 bg-blue-500/[0.04] dark:bg-amber-500/[0.04] text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-700 dark:text-zinc-300">
              <Upload className="w-4 h-4 text-blue-600 dark:text-amber-500" />
              <span>Upload de Foto do Caderno / Rascunho da Lousa</span>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="text-xs mx-auto block text-slate-600 dark:text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 dark:file:bg-amber-500 dark:file:text-slate-900 dark:hover:file:bg-amber-600 cursor-pointer"
            />
            {currentImage && (
              <p className="text-xs text-emerald-600 font-semibold">Imagem do rascunho anexada e pronta para OCR!</p>
            )}

            <button
              onClick={() => submeterResolucaoDiscursiva("texto")}
              disabled={loadingDiscursive || loadingIa || (!currentImage && !justificativas[currentIndex]?.trim())}
              className="lemmas-gold-cta px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 mx-auto disabled:opacity-40 cursor-pointer shadow-xs"
            >
              {loadingDiscursive || loadingIa ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />}
              <span>Avaliar Raciocínio com MathAI Engine</span>
            </button>
          </div>
        </div>
      )}

      {(loadingDiscursive || loadingIa) && (
        <div className="p-5 rounded-xl bg-[var(--marker-blue-dim)] border border-[var(--marker-blue-border)] text-xs animate-fadeIn">
          <ThoughtLine
            working={true}
            label="MathAI Engine avaliando desenvolvimento…"
            steps={[
              "Transcrevendo caligrafia e equações para LaTeX (OCR Multimodal)",
              "Verificando encadeamento dedutivo e propriedades invariantes",
              "Confrontando hipóteses e cálculos com o gabarito oficial",
              "Elaborando diagnóstico pedagógico e lemas recomendados",
            ]}
            color="var(--marker-blue)"
            glyphColor="var(--marker-blue)"
            fontSize={13}
          />
        </div>
      )}

      {currentDiagnostico && !isDiscursiva && (
        <div className="text-left p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--marker-blue-border)] text-xs space-y-4 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-[var(--marker-blue)] text-white dark:text-[#101316]">
                <BrainCircuit className="w-3 h-3" />
                [INFERÊNCIA DA IA]
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[var(--bg-board)] text-[var(--ink-secondary)] border border-[var(--border-subtle)]">
                Modelo: <strong>{currentDiagnostico.modelo || "MathAI Engine"}</strong>
              </span>
            </div>
            {currentDiagnostico.confianca !== undefined && (
              <div className="text-[11px] font-semibold text-[var(--ink-muted)] tabular-nums">
                Confiança: <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">{typeof currentDiagnostico.confianca === "number" ? `${Math.round(currentDiagnostico.confianca * 100)}%` : currentDiagnostico.confianca}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-[var(--marker-amber)] flex items-center gap-2 text-sm">
              <span>Diagnóstico: {currentDiagnostico.status_resolucao}</span>
            </div>
            <div className="text-[var(--ink-secondary)] leading-relaxed text-[13px] md:text-sm overflow-x-auto">
              <MathText text={currentDiagnostico.diagnostico} />
            </div>
          </div>

          {currentDiagnostico.transcricao_latex && (
            <div className="p-3 rounded-lg bg-[var(--bg-board)] border border-[var(--border-subtle)] space-y-1">
              <span className="font-bold text-[11px] text-[var(--ink-muted)] uppercase tracking-wider block">Transcrição Matemática (OCR):</span>
              <div className="text-[var(--ink-primary)] overflow-x-auto">
                <MathText text={currentDiagnostico.transcricao_latex.replace(/^\\+\s*/gm, "")} />
              </div>
            </div>
          )}

          {currentDiagnostico.linha_do_erro && (
            <div className="p-2.5 rounded-lg bg-rose-500/[0.08] border border-rose-500/25 text-rose-700 dark:text-rose-300 space-y-1">
              <span className="font-bold text-[11px] uppercase tracking-wider block">Ponto de Desvio / Erro:</span>
              <div className="overflow-x-auto">
                <MathText text={currentDiagnostico.linha_do_erro} />
              </div>
            </div>
          )}

          {currentDiagnostico.dica_proximo_passo && (
            <div className="p-3 rounded-lg bg-[var(--marker-blue-dim)] border border-[var(--marker-blue-border)] space-y-1">
              <span className="font-bold text-[11px] text-[var(--marker-blue)] uppercase tracking-wider block">Lema / Próximo Passo:</span>
              <div className="text-[var(--ink-primary)] overflow-x-auto">
                <MathText text={currentDiagnostico.dica_proximo_passo} />
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );

  const renderSocraticTutor = (compact: boolean = false) => {
    const hasOfficialGabarito = Boolean(
      currentQ?.gabarito && !isSpuriousGabarito(currentQ.gabarito, isDiscursiva)
    );

    return isSimuladoAtivo ? (
        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs flex items-center gap-3 text-[var(--ink-secondary)]">
          <ShieldAlert className="w-5 h-5 text-[var(--marker-amber)] shrink-0" />
          <p className="leading-relaxed">
            <strong>Ambiente Oficial de Simulado:</strong> Auxílios da MathAI Engine (dicas e diagnósticos) ficam desabilitados durante a realização da prova. Ao entregar o simulado, você poderá acionar a IA para cada questão individualmente.
          </p>
        </div>
      ) : (
        <>
          {/* TUTOR SOCRÁTICO E DICAS PROGRESSIVAS (MODO TREINO COM ESCADA PÓLYA DE 5 NÍVEIS) */}
          <div className={`min-w-0 max-w-full overflow-x-hidden bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl ${compact ? "p-3.5 space-y-3" : "p-5 space-y-4"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 min-w-0">
                <Lightbulb className="w-4 h-4 shrink-0 text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" />
                <h4 className="font-serif-math text-xs font-semibold uppercase tracking-wider text-[var(--ink-primary)] break-words">
                  Tutor Socrático Adaptativo (Método Pólya · MathAI Engine)
                </h4>
              </div>
              <span className="text-[10px] font-semibold tabular-nums px-2 py-0.5 rounded-md bg-[var(--marker-blue-dim)] text-[var(--marker-blue)] border border-[var(--marker-blue-border)] dark:bg-[var(--marker-amber-dim)] dark:text-[var(--marker-amber)] dark:border-[var(--marker-amber-border)] shrink-0">
                5 Níveis Maiêuticos
              </span>
            </div>

            {/* ESCADA MAIÊUTICA DE 5 NÍVEIS (PÓLYA) */}
            <div className={`grid gap-2 ${compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-5"}`}>
              {[
                { nivel: 1, label: "Nível 1", sublabel: "Intuição", fullTitle: "Intuição & Hipóteses" },
                { nivel: 2, label: "Nível 2", sublabel: "Lema", fullTitle: "Lema & Teorema Chave" },
                { nivel: 3, label: "Nível 3", sublabel: "Partida", fullTitle: "O Primeiro Passo" },
                { nivel: 4, label: "Nível 4", sublabel: "Destravamento", fullTitle: "Quase lá (Gargalo)" },
                { nivel: 5, label: "Nível 5", sublabel: "Resolução", fullTitle: "Resolução Completa" },
              ].map((step) => {
                const isUnlocked = hintsHistory[currentIndex]?.some((h) => h.nivel === step.nivel);
                const isCurrent = !hint5Used[currentIndex] && currentHintLevel === step.nivel;
                const isSurrendered = step.nivel === 5 && hint5Used[currentIndex];

                return (
                  <div
                    key={step.nivel}
                    className={`relative min-w-0 p-2.5 rounded-lg border text-left transition-colors ${
                      step.nivel === 5 ? (compact ? "col-span-2" : "col-span-2 sm:col-span-1") : ""
                    } ${
                      isSurrendered
                        ? "bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-300"
                        : isUnlocked
                        ? "bg-[var(--marker-blue-dim)] border-[var(--marker-blue-border)] text-[var(--marker-blue)] font-medium"
                        : isCurrent
                        ? "bg-[var(--marker-blue-dim)] border-[var(--marker-blue)] text-[var(--marker-blue)] dark:bg-[var(--marker-amber-dim)] dark:border-[var(--marker-amber)] dark:text-[var(--marker-amber)] font-semibold"
                        : "bg-[var(--bg-board)] border-[var(--border-subtle)] text-[var(--ink-muted)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider tabular-nums whitespace-nowrap">
                        {step.label}
                      </span>
                      <span className="shrink-0">
                        {isSurrendered ? (
                          <XCircle className="w-3.5 h-3.5 text-rose-500" />
                        ) : isUnlocked ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        ) : isCurrent ? (
                          <ArrowRight className="w-3.5 h-3.5" />
                        ) : (
                          <Lock className="w-3 h-3 opacity-60" />
                        )}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold truncate" title={step.fullTitle}>
                      {step.sublabel}
                    </div>
                    {step.nivel === 5 && (
                      <div className="mt-1 text-[9px] font-bold tabular-nums text-rose-500 dark:text-rose-400 leading-tight whitespace-nowrap">
                        Penaliza SM-2
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* BOTÕES DE AÇÃO E DISPARO DE DICA */}
            <div className="pt-1 min-w-0 max-w-full">
              {hint5Used[currentIndex] ? (
                <div className="w-full min-w-0 p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-800 dark:text-rose-300 text-xs flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <XCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                    <span className="font-semibold leading-snug break-words">
                      Resolução Oficial Revelada (Nível 5 · Nota 0 / <span className="whitespace-nowrap">SM-2</span> — revisão amanhã)
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-rose-600 text-white shrink-0">
                    Bloqueada
                  </span>
                </div>
              ) : currentHintLevel === 5 ? (
                <div className={`min-w-0 max-w-full p-3.5 rounded-lg bg-rose-500/[0.06] border border-rose-500/30 flex flex-col ${compact ? "items-stretch gap-2.5" : "lg:flex-row lg:items-center justify-between gap-3"}`}>
                  <div className="min-w-0 text-xs text-rose-800 dark:text-rose-200 leading-relaxed break-words">
                    <strong className="block text-rose-600 dark:text-rose-400 font-semibold mb-0.5">Aviso Pedagógico:</strong>
                    Você concluiu as 4 dicas investigativas. O Nível 5 revelará a resolução oficial completa passo a passo e computará erro na questão.
                  </div>
                  <button
                    type="button"
                    onClick={pedirDicaSocratica}
                    disabled={loadingHint}
                    className={`w-full ${compact ? "" : "lg:w-auto lg:max-w-md"} min-w-0 px-3.5 py-2.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors flex items-center justify-center gap-2 text-center whitespace-normal leading-snug cursor-pointer`}
                  >
                    {loadingHint ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                    <span className="min-w-0 break-words">Ver Resolução Completa (Nível 5 — Contabiliza Questão como Errada)</span>
                  </button>
                </div>
              ) : (
                <div className={`flex flex-wrap items-center justify-between gap-2.5 min-w-0 max-w-full ${compact ? "flex-col items-stretch" : ""}`}>
                  <button
                    type="button"
                    onClick={pedirDicaSocratica}
                    disabled={loadingHint}
                    className={`${compact ? "w-full justify-center" : "max-w-full"} min-w-0 flex items-center gap-2 text-xs font-bold rounded-lg px-4 py-2 bg-[var(--marker-blue-dim)] hover:opacity-90 border border-[var(--marker-blue-border)] text-[var(--marker-blue)] dark:bg-[var(--marker-amber-dim)] dark:border-[var(--marker-amber-border)] dark:text-[var(--marker-amber)] transition-colors cursor-pointer tabular-nums whitespace-normal text-left`}
                  >
                    {loadingHint ? (
                      <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                    ) : (
                      <Lightbulb className="w-3.5 h-3.5 shrink-0 text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" />
                    )}
                    <span className="min-w-0 break-words">
                      Solicitar Dica Socrática (Nível {currentHintLevel}: {
                        currentHintLevel === 1 ? "Intuição" : currentHintLevel === 2 ? "Lema Chave" : currentHintLevel === 3 ? "Primeiro Passo" : "Destravamento"
                      })
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowHint5ConfirmModal(true)}
                    disabled={loadingHint}
                    className={`${compact ? "self-start" : ""} max-w-full text-xs text-[var(--ink-muted)] hover:text-rose-600 dark:hover:text-rose-400 underline underline-offset-2 flex items-center gap-1.5 transition-colors cursor-pointer py-1 whitespace-normal text-left`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500/80" />
                    <span className="min-w-0 break-words">Pular para Nível 5 (Desistir & Ver Resolução)</span>
                  </button>
                </div>
              )}
            </div>

            {hintError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2 min-w-0">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span className="min-w-0 break-words">{hintError}</span>
              </div>
            )}

            {loadingHint && (
              <div className="p-4 rounded-xl bg-[var(--marker-blue-dim)] border border-[var(--marker-blue-border)] text-xs animate-fadeIn">
                <ThoughtLine
                  working={true}
                  label="Tutor Socrático pensando…"
                  steps={[
                    "Analisando dados do enunciado e incógnitas",
                    "Mapeando invariantes matemáticos e lemas",
                    `Modulando intervenção pedagógica (Nível ${currentHintLevel})`,
                  ]}
                  color="var(--marker-blue)"
                  glyphColor="var(--marker-blue)"
                  fontSize={13}
                />
              </div>
            )}

            {/* AVISO DE PENALIDADE DETALHADO (APENAS FORA DO MODO COMPACTO PARA NÃO EMPURRAR A RESOLUÇÃO) */}
            {hint5Used[currentIndex] && !compact && (
              <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-xs text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                <div>
                  <strong className="block font-semibold mb-0.5">Tentativa computada como incorreta (Nota 0 / <span className="whitespace-nowrap">SM-2</span>):</strong>
                  <span>
                    A resolução oficial completa e o gabarito foram revelados pela 5ª Dica Socrática. A questão foi agendada para repetição espaçada amanhã para fixação pedagógica do conteúdo.
                  </span>
                </div>
              </div>
            )}

            {/* HISTÓRICO DE DICAS ACUMULADAS DA QUESTÃO (PROGRESSÃO MAIÊUTICA - DICA NOVA NO TOPO) */}
            {hintsHistory[currentIndex] && hintsHistory[currentIndex].length > 0 ? (
              <div className="space-y-3 min-w-0 max-w-full">
                {hintsHistory[currentIndex].slice().sort((a, b) => b.nivel - a.nivel).map((item, idx) => {
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
                      data-hint-level={item.nivel}
                      className={`min-w-0 max-w-full p-3.5 sm:p-4 rounded-xl border text-xs leading-relaxed space-y-2.5 animate-fadeIn ${
                        item.nivel === 5
                          ? "bg-rose-500/[0.06] border-rose-500/25 text-[var(--ink-primary)]"
                          : "bg-[var(--marker-blue-dim)] border-[var(--marker-blue-border)] text-[var(--ink-primary)]"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)] min-w-0">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase shrink-0 ${
                              item.nivel === 5
                                ? "bg-rose-600 text-white"
                                : "bg-[var(--marker-blue)] text-white dark:text-[#101316]"
                            }`}
                          >
                            <Sparkles className="w-3 h-3" />
                            {item.nivel === 5 ? "[RESOLUÇÃO OFICIAL]" : "[INFERÊNCIA DA IA]"}
                          </span>
                          <span className="text-[11px] font-medium tabular-nums px-2 py-0.5 rounded-md bg-[var(--bg-board)] text-[var(--ink-secondary)] border border-[var(--border-subtle)] break-words">
                            {nivelTitulos[item.nivel] || `Nível ${item.nivel}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--ink-muted)] min-w-0">
                          <span className="truncate">Modelo: <strong>{item.modelo || "MathAI Engine"}</strong></span>
                        </div>
                      </div>

                      {item.nivel === 5 && hasOfficialGabarito && currentQ?.gabarito && (
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 space-y-1 min-w-0 max-w-full">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
                            Gabarito Oficial
                          </span>
                          <div className="text-xs font-semibold min-w-0 max-w-full overflow-x-auto break-words">
                            <MathText text={currentQ.gabarito} />
                          </div>
                        </div>
                      )}

                      <div className="min-w-0 max-w-full text-[13px] md:text-sm leading-relaxed text-[var(--ink-secondary)] overflow-x-auto break-words">
                        <MathText text={item.dica} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : hints[currentIndex] ? (
              <div className="min-w-0 max-w-full p-4 rounded-xl bg-[var(--marker-blue-dim)] border border-[var(--marker-blue-border)] text-xs text-[var(--ink-primary)] leading-relaxed space-y-3 animate-fadeIn">
                <div className="min-w-0 max-w-full text-[13px] md:text-sm leading-relaxed text-[var(--ink-secondary)] overflow-x-auto break-words">
                  <MathText text={hints[currentIndex]} />
                </div>
              </div>
            ) : null}
          </div>
        </>
      );
  };

  const renderHint5ConfirmModal = (inFocusMode: boolean) => (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirmação da Rendição Pedagógica Nível 5"
      className={`${inFocusMode ? "absolute inset-0 z-[90]" : "fixed inset-0 z-[300]"} flex items-center justify-center overflow-y-auto p-3 sm:p-4 bg-black/80 animate-fadeIn`}
    >
      <div className="my-auto bg-[var(--bg-card)] border border-[var(--marker-red-border)] rounded-xl p-4 sm:p-6 max-w-lg w-full max-h-[90dvh] overflow-y-auto shadow-xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-[var(--marker-red-dim)] border border-[var(--marker-red-border)] text-[var(--marker-red)] shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <h3 className="text-base font-semibold text-[var(--ink-primary)] font-serif-math tracking-tight">
              Rendição Pedagógica · Revelar Nível 5?
            </h3>
            <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
              A <strong>Dica de Nível 5</strong> fornecerá a resolução oficial completa passo a passo, o lema determinante e o gabarito definitivo da questão.
            </p>
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-[var(--marker-red-dim)] border border-[var(--marker-red-border)] space-y-2 text-xs text-[var(--ink-primary)] leading-relaxed">
          <strong className="block font-semibold text-[var(--marker-red)]">
            Consequências Pedagógicas Imediatas da Rendição:
          </strong>
          <ul className="list-disc pl-4 space-y-1 text-[11px] text-[var(--ink-secondary)]">
            <li>A questão será computada imediatamente como <strong>ERRADA</strong> (marcada em vermelho no topo).</li>
            <li>O contador de questões respondidas será incrementado automaticamente.</li>
            <li>O envio de alternativas ou nova dedução será <strong>permanentemente bloqueado</strong> nesta questão.</li>
            <li>O algoritmo <span className="whitespace-nowrap">SM-2</span> registrará penalidade máxima (repetições zeradas, intervalo diário de revisão).</li>
          </ul>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => setShowHint5ConfirmModal(false)}
            className="w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-semibold text-[var(--ink-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer text-center"
          >
            Cancelar (Continuar Tentando)
          </button>
          <button
            type="button"
            onClick={confirmarEDesbloquearDica5}
            className="w-full sm:w-auto px-5 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-normal text-center"
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Confirmar Rendição & Ver Resolução</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6 animate-fadeIn text-[var(--ink-primary)]">
      {/* BARRA SUPERIOR DO SIMULADOR / TREINO */}
      <div className="relative z-20 rounded-xl bg-[var(--bg-card)] p-4 sm:p-5 border border-[var(--border-subtle)] space-y-4">
        <div className="space-y-4">
        {/* LINHA 1: STATUS DA SESSÃO, CRONÔMETRO E AÇÃO PRINCIPAL */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-[var(--border-subtle)]">
          {/* Lado Esquerdo: Modo e Progresso */}
          <div className="flex flex-wrap items-center gap-3">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${
              isSimuladoAtivo
                ? "bg-[var(--marker-blue-dim)] border-[var(--marker-blue-border)] text-[var(--marker-blue)] dark:bg-[var(--marker-amber-dim)] dark:border-[var(--marker-amber-border)] dark:text-[var(--marker-amber)]"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
            }`}>
              {sessionBannerText}
            </span>
            <div className="flex items-center gap-2 text-xs text-[var(--ink-secondary)] tabular-nums">
              <span>Questão <strong className="text-[var(--ink-primary)] dark:text-[var(--marker-amber)] font-bold tabular-nums">{currentIndex + 1}</strong> de {effectiveTotal.toLocaleString("pt-BR")}</span>
              <span className="text-[var(--ink-muted)] opacity-50">•</span>
              <span className="text-[var(--ink-muted)] font-medium tabular-nums">
                {respondidasCount} respondida{respondidasCount === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {/* Lado Direito: Cronômetro & Botão de Entrega */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono tabular-nums text-xs font-bold ${
              isSimuladoAtivo && timeLeft < 300
                ? "bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400"
                : "bg-[var(--bg-board)] border-[var(--border-subtle)] text-[var(--ink-secondary)]"
            }`}>
              <Clock className="w-3.5 h-3.5 text-[var(--marker-blue)] dark:text-[var(--marker-amber)] shrink-0" />
              <span>{minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}</span>
            </div>

            {isSimuladoAtivo ? (
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="px-4 py-2 rounded-lg bg-[var(--marker-blue)] dark:bg-[var(--marker-amber)] text-white dark:text-[#101316] hover:opacity-90 font-bold text-xs transition-colors"
              >
                Entregar Simulado
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSessionMode("result")}
                className="px-4 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-xs hover:bg-emerald-500/15 transition-colors"
              >
                Concluir Treino
              </button>
            )}
          </div>
        </div>

        {/* LINHA 2: NAVEGAÇÃO DE QUESTÕES (JUMPER DE 20 & IR PARA) */}
        <div aria-label="Navegação de questões" className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto] items-center gap-3 pt-1">
          {/* Faixa com os números do bloco de 20 questões */}
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Botão para voltar 20 questões */}
            <button
              onClick={() => setCurrentIndex(Math.max(0, windowStart - windowSize))}
              disabled={windowStart === 0}
              className={`h-7 sm:h-8 px-2 sm:px-2.5 flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] text-xs font-semibold tabular-nums text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] transition-colors shrink-0 ${
                windowStart === 0 ? "opacity-40 cursor-not-allowed" : ""
              }`}
              title="20 questões anteriores"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>-20</span>
            </button>

            {/* Até 20 números, distribuídos em linhas conforme a largura. */}
            <div className="grid grid-cols-5 sm:grid-cols-10 xl:grid-cols-20 gap-1 min-w-0 flex-1">
            {visibleQuestionIndices.map((qIndex) => {
              const isCurrent = qIndex === currentIndex;
              const qObj = questions[qIndex];
              const isHint5 = !!hint5Used[qIndex];
              const discursiveEval = qObj ? discursiveEvaluations[qObj.id] : undefined;
              const hasDiscursiveValida = discursiveEval && discursiveEval.veredito !== "sem_desenvolvimento" && !discursiveEval.precisa_revisao_humana;
              const isObjAnswered = qObj && answers[qObj.id] !== undefined;
              const isAnswered = isHint5 || hasDiscursiveValida || isObjAnswered || answeredIndices.has(qIndex);
              const isBookmarked = qObj && bookmarks.has(qObj.id);

              let buttonColorClass = "bg-[var(--bg-board)] border border-[var(--border-subtle)] text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)]";
              let dotColorClass = "bg-emerald-500";

              if (isHint5) {
                // Rendição pedagógica no Nível 5: pinta o número da questão na barra de Vermelho
                buttonColorClass = isCurrent
                  ? "bg-rose-600 border border-rose-500 text-white font-bold z-10"
                  : "bg-rose-500/15 border border-rose-500/45 text-rose-800 dark:text-rose-300 hover:bg-rose-500/25 font-semibold";
                dotColorClass = "bg-rose-500";
              } else if (isCurrent) {
                buttonColorClass = "lemmas-gold-cta z-10 font-bold";
              } else if (discursiveEval && !discursiveEval.precisa_revisao_humana) {
                if (discursiveEval.veredito === "aprovado") {
                  buttonColorClass = "bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/25 font-semibold";
                  dotColorClass = "bg-emerald-500";
                } else if (discursiveEval.veredito === "parcial") {
                  buttonColorClass = "bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-500/25 font-semibold";
                  dotColorClass = "bg-amber-500";
                } else if (discursiveEval.veredito === "incorreto") {
                  buttonColorClass = "bg-rose-500/15 border border-rose-500/40 text-rose-800 dark:text-rose-300 hover:bg-rose-500/25 font-semibold";
                  dotColorClass = "bg-rose-500";
                } else {
                  // sem_desenvolvimento: Regra de Ouro (não pinta como tentativa avaliada)
                  buttonColorClass = "bg-[var(--bg-board)] border border-[var(--border-subtle)] text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)]";
                }
              } else if (isAnswered) {
                buttonColorClass = "bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/25 font-semibold";
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
                  className={`min-w-0 w-full h-8 rounded-lg text-[10px] font-mono tabular-nums font-bold transition-colors relative flex items-center justify-center ${buttonColorClass}`}
                  title={`Questão ${qIndex + 1}${statusTitle}${isBookmarked ? " [Marcada]" : ""}`}
                >
                  {qIndex + 1}
                  {isHint5 && (
                    <span className="absolute -bottom-0.5 w-1.5 h-1.5 rounded-full bg-rose-500" />
                  )}
                  {!isHint5 && isAnswered && !isCurrent && hasDiscursiveValida && (
                    <span className={`absolute -bottom-0.5 w-1.5 h-1.5 rounded-full ${dotColorClass}`} />
                  )}
                  {!isHint5 && isAnswered && !isCurrent && !discursiveEval && (
                    <span className="absolute -bottom-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                  {isBookmarked && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--marker-blue)] dark:bg-[var(--marker-amber)] ring-2 ring-[var(--bg-card)]" />
                  )}
                </button>
              );
            })}

            </div>

            {/* Botão para avançar 20 questões */}
            <button
              onClick={() => setCurrentIndex(windowStart + windowSize)}
              disabled={windowStart + windowSize >= effectiveTotal}
              className={`h-7 sm:h-8 px-2 sm:px-2.5 flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] text-xs font-semibold tabular-nums text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] transition-colors shrink-0 ${
                windowStart + windowSize >= effectiveTotal ? "opacity-40 cursor-not-allowed" : ""
              }`}
              title="Próximas 20 questões"
            >
              <span>+20</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Jump input com divisor vertical */}
          <div className="flex items-center justify-end gap-2 xl:border-l border-[var(--border-subtle)] xl:pl-3">
            <label className="text-xs font-medium text-[var(--ink-muted)] whitespace-nowrap" htmlFor="jump-input">
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
              className="w-12 sm:w-14 h-7 sm:h-8 px-1.5 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-board)] text-xs font-mono tabular-nums font-semibold text-center focus:outline-none focus:border-[var(--marker-blue)] dark:focus:border-[var(--marker-amber)] text-[var(--ink-primary)]"
            />
            <button
              type="button"
              onClick={() => handleJumpToQuestion()}
              className="h-7 sm:h-8 px-2.5 sm:px-3 rounded-lg text-xs font-semibold lemmas-gold-cta transition-colors flex items-center justify-center"
            >
              Ir
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* CARD DO ENUNCIADO */}
      <div className="relative z-10 rounded-xl bg-[var(--bg-card)] p-6 md:p-8 border border-[var(--border-subtle)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[var(--border-subtle)]">
          <div className="flex flex-wrap items-center gap-2">
            {/* BREADCRUMB EDITORIAL */}
            <div className="text-xs font-semibold text-[var(--ink-muted)] flex items-center gap-1.5 mr-1">
              <span>Matemática</span>
              <span className="opacity-40">›</span>
              <span>{currentQ?.materia}</span>
              {currentQ?.topico && (
                <>
                  <span className="opacity-40">›</span>
                  <span className="text-[var(--ink-secondary)]">{currentQ?.topico}</span>
                </>
              )}
            </div>

            {/* BADGES METADADOS UNIFICADOS (QUADRO DE GIZ / BRANCO) */}
            {currentQ?.banca && (
              <span className="lemma-badge font-semibold text-[var(--ink-primary)] dark:text-[var(--marker-amber)] tabular-nums">
                {currentQ.banca} {currentQ.ano ? `· ${currentQ.ano}` : ""}
              </span>
            )}
            {currentQ?.categoria_banca && (
              <span className="lemma-badge text-[var(--ink-secondary)]">
                {currentQ.categoria_banca}
              </span>
            )}
            {renderDificuldadeBadge(currentQ?.dificuldade)}
            {currentQ?.tipo && (
              <span className="lemma-badge">
                {currentQ.tipo === "discursiva" ? "Discursiva" : "Múltipla Escolha"}
              </span>
            )}
            {(currentQ?.lema_codigo || currentQ?.lema_id) && (
              <LemaBadge lemaCodigo={currentQ?.lema_codigo} lemaId={currentQ?.lema_id} />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="font-mono text-[11px] tabular-nums text-[var(--ink-muted)] mr-1">
              #{currentQ?.id}
            </span>
            {!isSimuladoAtivo && currentQ && (
              <QuestionDiscussion
                key={`q-disc-${currentQ.id}`}
                questionId={currentQ.id}
                variant="header"
                showEdgeTab={!modoFocoAtivo}
              />
            )}
            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] text-[var(--ink-muted)] hover:text-[var(--marker-blue)] dark:hover:text-[var(--marker-amber)] hover:bg-[var(--marker-blue-dim)] dark:hover:bg-[var(--marker-amber-dim)] hover:border-[var(--marker-blue-border)] dark:hover:border-[var(--marker-amber-border)] transition-colors"
              title="Reportar inconsistência (digitação, LaTeX, imagem ou gabarito)"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Reportar</span>
            </button>
            <button
              onClick={() => toggleBookmark(currentIndex)}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${
                bookmarks.has(currentIndex)
                  ? "bg-[var(--marker-blue-dim)] border-[var(--marker-blue-border)] text-[var(--marker-blue)] dark:bg-[var(--marker-amber-dim)] dark:border-[var(--marker-amber-border)] dark:text-[var(--marker-amber)]"
                  : "border-[var(--border-subtle)] text-[var(--ink-muted)] hover:border-[var(--marker-blue-border)] dark:hover:border-[var(--marker-amber-border)]"
              }`}
              title={bookmarks.has(currentIndex) ? "Remover dos marcados" : "Marcar questão para revisar depois"}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{bookmarks.has(currentIndex) ? "Marcada" : "Marcar"}</span>
            </button>
          </div>
        </div>

        <div className="font-serif-math text-[16px] md:text-[17px] font-normal text-[var(--ink-primary)] leading-relaxed whitespace-pre-line overflow-x-auto">
          <MathText text={corpo} />
        </div>

        {/* FIGURA / GRÁFICO DA QUESTÃO SE HOUVER (OCULTA SE AS ALTERNATIVAS JÁ FOREM AS IMAGENS OU SE JÁ ESTIVER NO CORPO) */}
        {currentQ?.figura_path && !corpo.includes("![") && !hasImageAlternatives(alternativas) && (
          <div className="my-4 flex flex-col items-center justify-center p-3 rounded-xl bg-[var(--bg-board)] border border-[var(--border-subtle)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveFigureUrl(currentQ.figura_path)}
              alt={`Figura da Questão ${currentQ.id}`}
              className="question-diagram-invertible max-h-96 max-w-full rounded-lg object-contain bg-[var(--bg-card)] p-2 border border-[var(--border-subtle)]"
              loading="lazy"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.dataset.fallback) {
                  target.dataset.fallback = "1";
                  target.src = getFallbackFigureUrl(currentQ.figura_path);
                }
              }}
            />
            <span className="text-[11px] text-[var(--ink-muted)] mt-2 font-mono">
              Figura de referência da questão
            </span>
          </div>
        )}

        {/* BANCADA DE RESOLUÇÃO INTEGRADA (PARA QUESTÕES DISCURSIVAS) */}
        {isDiscursiva && renderBancadaResolucao()}

        {discursiveEval?.ocr_review_required && (
          <OcrReview key={`${currentQ.id}:${discursiveEval.transcricao_latex}`} transcription={discursiveEval.transcricao_latex || ""} pending={loadingDiscursive} onConfirm={confirmarLeituraOcr} />
        )}

        {/* FEEDBACK ESTRUTURADO DA AVALIAÇÃO DISCURSIVA (MATHAI ENGINE) */}
        {isDiscursiva && discursiveEval && (
          <div className="space-y-3 animate-fadeIn">
            {/* CASO INCONCLUSIVO: PRECISA REVISÃO OU SERVIÇO INDISPONÍVEL */}
            {discursiveEval.precisa_revisao_humana && (
              <div className="p-4 rounded-xl border border-[var(--marker-blue-border)] bg-[var(--marker-blue-dim)] text-[var(--ink-primary)] text-xs space-y-2.5">
                <div className="flex items-center gap-2 font-semibold text-sm text-[var(--marker-blue)]">
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <span>Avaliação Inconclusiva — Rascunho Preservado</span>
                </div>
                <div className="leading-relaxed font-sans text-xs whitespace-pre-line overflow-x-auto">
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
              <div className="p-4 rounded-xl border border-amber-500/35 bg-amber-500/[0.08] text-amber-950 dark:text-amber-200 text-xs space-y-2.5">
                <div className="flex items-center gap-2 font-semibold text-sm text-amber-800 dark:text-[#d9b452]">
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
              <div className="p-5 rounded-xl border border-[var(--marker-green-border)] bg-[var(--marker-green-dim)] text-[var(--ink-primary)] text-xs space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--marker-green-border)]">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-emerald-600 text-white">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Demonstração Validada
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {discursiveEval.modelo && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--bg-elevated)] text-[var(--ink-secondary)] border border-[var(--border-subtle)] font-mono">
                        {discursiveEval.modelo}
                      </span>
                    )}
                    {discursiveEval.confianca !== undefined && (
                      <span className="text-[10px] font-semibold font-mono tabular-nums text-[var(--marker-green)]">
                        Confiança: {typeof discursiveEval.confianca === "number" ? `${Math.round(discursiveEval.confianca * 100)}%` : discursiveEval.confianca}
                      </span>
                    )}
                  </div>
                </div>

                <div className="leading-relaxed space-y-1">
                  <strong className="text-[var(--marker-green)] block text-xs">Veredito da Banca:</strong>
                  <div className="text-[var(--ink-secondary)] whitespace-pre-line overflow-x-auto">
                    <MathText text={resumirVereditoAprovado(discursiveEval.feedback_latex, discursiveEval.etapas_corretas.length > 0)} />
                  </div>
                </div>

                {discursiveEval.transcricao_latex && (
                  <div className="p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1">
                    <span className="font-bold text-[10px] text-[var(--marker-green)] uppercase tracking-wider block">Transcrição Matemática (OCR):</span>
                    <div className="text-[var(--ink-primary)] overflow-x-auto">
                      <MathText text={discursiveEval.transcricao_latex.replace(/^\\+\s*/gm, "")} />
                    </div>
                  </div>
                )}

                {discursiveEval.etapas_corretas.length > 0 && (
                  <div className="space-y-1 pt-1.5 border-t border-[var(--marker-green-border)]">
                    <strong className="text-[var(--marker-green)] block font-semibold text-[11px]">Passos Verificados:</strong>
                    <ul className="list-disc list-inside space-y-1 text-[var(--ink-secondary)] text-[11px]">
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
              <div className="p-5 rounded-xl border border-[var(--marker-amber-border)] bg-[var(--marker-amber-dim)] text-[var(--ink-primary)] text-xs space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--marker-amber-border)]">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-amber-600 text-white">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Validação Parcial
                    </span>
                  </div>
                  {discursiveEval.modelo && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--bg-elevated)] text-[var(--ink-secondary)] border border-[var(--border-subtle)] font-mono">
                      {discursiveEval.modelo}
                    </span>
                  )}
                </div>

                <div className="leading-relaxed space-y-1">
                  <strong className="text-[var(--marker-amber)] block text-xs">Parecer da Banca:</strong>
                  <div className="text-[var(--ink-secondary)] whitespace-pre-line overflow-x-auto">
                    <MathText text={discursiveEval.feedback_latex} />
                  </div>
                </div>

                {discursiveEval.etapas_corretas.length > 0 && (
                  <div className="space-y-1 pt-1.5 border-t border-[var(--marker-amber-border)]">
                    <strong className="text-[var(--marker-green)] block font-semibold text-[11px]">Etapas Corretas Demonstradas:</strong>
                    <ul className="list-disc list-inside space-y-1 text-[var(--ink-secondary)] text-[11px]">
                      {discursiveEval.etapas_corretas.map((etapa, idx) => (
                        <li key={idx}><MathText text={etapa} /></li>
                      ))}
                    </ul>
                  </div>
                )}

                {discursiveEval.erros_identificados.length > 0 && (
                  <div className="space-y-1 pt-1.5 border-t border-[var(--marker-amber-border)]">
                    <strong className="text-[var(--marker-amber)] block font-semibold text-[11px]">Pontos de Atenção / Ajustes Necessários:</strong>
                    <ul className="list-disc list-inside space-y-1 text-[var(--ink-secondary)] text-[11px]">
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
                <div className="p-3.5 rounded-xl border border-[var(--marker-red-border)] bg-[var(--marker-red-dim)] text-[var(--marker-red)] text-xs flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 shrink-0 text-[var(--marker-red)]" />
                    <span className="font-semibold">
                      Questão encerrada por consulta à Resolução Completa (Nível 5)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-rose-600 text-white shrink-0 font-mono tabular-nums">
                    Nota 0 · Repetição Diária (SM-2)
                  </span>
                </div>
              ) : (
                <div className="p-5 rounded-xl border border-[var(--marker-red-border)] bg-[var(--marker-red-dim)] text-[var(--ink-primary)] text-xs space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--marker-red-border)]">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-rose-600 text-white">
                        <XCircle className="w-3.5 h-3.5" />
                        Demonstração Não Validada
                      </span>
                    </div>
                    {discursiveEval.modelo && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--bg-elevated)] text-[var(--ink-secondary)] border border-[var(--border-subtle)] font-mono">
                        {discursiveEval.modelo}
                      </span>
                    )}
                  </div>

                  <div className="leading-relaxed space-y-1">
                    <strong className="text-[var(--marker-red)] block text-xs">Parecer da Banca:</strong>
                    <div className="text-[var(--ink-secondary)] whitespace-pre-line overflow-x-auto">
                      <MathText text={discursiveEval.feedback_latex} />
                    </div>
                  </div>

                  {discursiveEval.erros_identificados.length > 0 && (
                    <div className="space-y-1 pt-1.5 border-t border-[var(--marker-red-border)]">
                      <strong className="text-[var(--marker-red)] block font-semibold text-[11px]">Erros Identificados no Raciocínio:</strong>
                      <ul className="list-disc list-inside space-y-1 text-[var(--ink-secondary)] text-[11px]">
                        {discursiveEval.erros_identificados.map((erro, idx) => (
                          <li key={idx}><MathText text={erro} /></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )
            )}

            {/* GABARITO DE REFERÊNCIA & CRONOGRAMA SM-2 (EXIBIDO 1X SÓ) */}
            {((currentQ.gabarito && !isSpuriousGabarito(currentQ.gabarito, isDiscursiva) && !hint5Used[currentIndex]) || currentResult?.sm2) && (
              <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] space-y-2 text-xs">
                {currentQ.gabarito && !isSpuriousGabarito(currentQ.gabarito, isDiscursiva) && !hint5Used[currentIndex] && (
                  <div className="space-y-1">
                    <span className="font-semibold text-[var(--ink-primary)] text-xs block">
                      Gabarito / Resolução de Referência Oficial:
                    </span>
                    <div className="text-[var(--ink-secondary)] leading-relaxed text-xs p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] overflow-x-auto">
                      <MathText text={currentQ.gabarito} />
                    </div>
                  </div>
                )}
                {currentResult?.sm2 && (
                  <div className="text-xs text-[var(--ink-secondary)] pt-1.5 border-t border-[var(--border-subtle)] font-mono tabular-nums">
                    SM-2 Atualizado: Próxima revisão agendada para <strong>{currentResult.sm2.proxima_revisao_data}</strong> (Intervalo: {currentResult.sm2.intervalo_dias} dia{currentResult.sm2.intervalo_dias > 1 ? "s" : ""}, EF: {currentResult.sm2.fator_facilidade}).
                  </div>
                )}
              </div>
            )}

            {/* LEMA / PRÓXIMO PASSO EM BOX SEPARADO */}
            {discursiveEval.dica_proximo_passo && !hint5Used[currentIndex] && (
              <div className="p-4 rounded-xl border border-[var(--marker-blue-border)] dark:border-[var(--marker-amber-border)] bg-[var(--marker-blue-dim)] dark:bg-[var(--marker-amber-dim)] space-y-1.5 text-xs">
                <span className="font-bold text-[var(--marker-blue)] dark:text-[var(--marker-amber)] uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Lema / Próximo Passo:
                </span>
                <div className="text-[var(--ink-secondary)] leading-relaxed text-xs overflow-x-auto">
                  <MathText text={discursiveEval.dica_proximo_passo} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* CAMADA 1: DADO OBSERVADO — RESPOSTA DO ESTUDANTE */}
        {currentQ && answers[currentQ.id] && (isSimuladoAtivo || !currentResult) && (
          <div className="p-3.5 rounded-xl bg-[var(--marker-blue-dim)] border border-[var(--marker-blue-border)] dark:bg-[var(--marker-amber-dim)] dark:border-[var(--marker-amber-border)] flex flex-wrap items-center justify-between gap-2 animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase bg-[var(--marker-blue)] dark:bg-[var(--marker-amber)] text-white dark:text-[#101316]">
                <Eye className="w-3.5 h-3.5" />
                [DADO OBSERVADO]
              </span>
              <span className="text-xs font-medium text-[var(--ink-primary)]">
                Alternativa Assinalada: <strong className="font-mono text-[var(--marker-blue)] dark:text-[var(--marker-amber)] font-bold">({answers[currentQ.id]})</strong>
              </span>
            </div>
            {isSimuladoAtivo && (
              <span className="text-[11px] text-[var(--marker-blue)] dark:text-[var(--marker-amber)] font-medium">
                Gabarito oficial oculto até a entrega do simulado
              </span>
            )}
          </div>
        )}

        {/* AVISO DE AUTENTICAÇÃO PARA RESPONDER */}
        {!isAuthenticated && !userLoading && (
          <div className="p-3.5 rounded-xl border border-[var(--marker-blue-border)] bg-[var(--marker-blue-dim)] dark:border-[var(--marker-amber-border)] dark:bg-[var(--marker-amber-dim)] text-[var(--ink-primary)] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-[var(--marker-blue)] dark:text-[var(--marker-amber)] shrink-0" />
              <span>
                <strong>Logar para responder:</strong> Crie sua conta ou faça login para assinalar alternativas e calibrar suas revisões SM-2 no LEMMAS.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/login?redirectTo=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/resolver")}`}
                className="px-3.5 py-1.5 rounded-lg bg-[var(--marker-blue)] dark:bg-[var(--marker-amber)] text-white dark:text-[#101316] hover:opacity-90 font-bold text-xs transition-colors"
              >
                Entrar
              </Link>
              <Link
                href={`/login?tab=signup&redirectTo=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/resolver")}`}
                className="px-3.5 py-1.5 rounded-lg border border-[var(--marker-blue-border)] hover:bg-[var(--marker-blue-dim)] text-[var(--ink-primary)] dark:border-[var(--marker-amber-border)] dark:hover:bg-[var(--marker-amber-dim)] font-semibold text-xs transition-colors"
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
                    className={`w-full text-left p-4 rounded-xl border flex flex-col gap-3 transition-colors ${
                      isSelected
                        ? "bg-[var(--marker-blue-dim)] border-[var(--marker-blue)] text-[var(--ink-primary)] dark:bg-[var(--marker-amber-dim)] dark:border-[var(--marker-amber)]"
                        : "bg-[var(--bg-board)] border-[var(--border-subtle)] text-[var(--ink-secondary)] hover:border-[var(--border-default)]"
                    } ${hint5Used[currentIndex] ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                          isSelected
                            ? "lemmas-gold-cta font-bold"
                            : "bg-[var(--bg-subtle)] text-[var(--ink-muted)]"
                        }`}
                      >
                        {key}
                      </div>
                      <span className="text-xs font-semibold text-[var(--ink-muted)]">
                        {hint5Used[currentIndex] ? "Bloqueada (Rendição Nível 5)" : isSelected ? "Selecionada" : "Clique para assinalar"}
                      </span>
                    </div>
                    <div className="w-full flex items-center justify-center p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] overflow-x-auto">
                      <MathText text={val} />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2.5 pt-2">
              {Object.entries(alternativas).map(([key, val]) => {
                const isSelected = currentQ && answers[currentQ.id] === key;

                return (
                  <button
                    key={key}
                    disabled={(!isSimuladoAtivo && currentResult !== undefined) || !!hint5Used[currentIndex]}
                    onClick={() => handleSelectOption(key)}
                    className={`w-full text-left p-3.5 rounded-lg border flex items-center gap-3.5 transition-colors ${
                      isSelected
                        ? "bg-[var(--marker-blue-dim)] border-[var(--marker-blue)] text-[var(--ink-primary)] dark:bg-[var(--marker-amber-dim)] dark:border-[var(--marker-amber)]"
                        : "bg-[var(--bg-board)] border-[var(--border-subtle)] text-[var(--ink-secondary)] hover:border-[var(--border-default)]"
                    } ${hint5Used[currentIndex] ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-md flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                        isSelected
                          ? "lemmas-gold-cta font-bold"
                          : "bg-[var(--bg-subtle)] text-[var(--ink-muted)]"
                      }`}
                    >
                      {key}
                    </div>
                    <div className="text-sm font-normal overflow-x-auto w-full">
                      <MathText text={val} />
                    </div>
                  </button>
                );
              })}
            </div>
          )
        )}

        {/* MODO TREINO: FEEDBACK IMEDIATO DE SUBMISSÃO E GABARITO OFICIAL (APENAS OBJETIVAS) */}
        {!isSimuladoAtivo && currentResult && !isDiscursiva && (
          <div className="space-y-3">
            {!isDiscursiva && (
              <div className={`p-4 rounded-xl border space-y-2 ${
                currentResult.acertou 
                  ? "bg-emerald-500/[0.06] border-emerald-500/25 text-emerald-800 dark:text-emerald-300"
                  : "bg-rose-500/[0.06] border-rose-500/25 text-rose-800 dark:text-rose-300"
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-emerald-600 text-white">
                      <Eye className="w-3 h-3" />
                      [DADO OBSERVADO]
                    </span>
                    <span className="font-semibold text-xs">
                      Sua resposta: ({currentResult.resposta_enviada})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold text-xs">
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
                <div className="text-xs text-slate-600 dark:text-zinc-300 pt-1.5 border-t border-zinc-200/80 dark:border-zinc-800/80 tabular-nums">
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
                  className="lemmas-gold-cta px-4 py-2 rounded-lg text-xs font-bold shadow-xs flex items-center gap-2 transition-colors disabled:opacity-50"
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
                  <div className="w-full p-4 rounded-xl bg-[var(--marker-blue-dim)] border border-[var(--marker-blue-border)] text-xs animate-fadeIn">
                    <ThoughtLine
                      working={true}
                      label="MathAI Engine estruturando demonstração…"
                      steps={[
                        "Recuperando teoremas e lemas fundamentais da questão",
                        "Construindo encadeamento dedutivo passo a passo",
                        "Formatando fórmulas matemáticas e equações em KaTeX",
                      ]}
                      color="var(--marker-blue)"
                      glyphColor="var(--marker-blue)"
                      fontSize={12}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-[var(--marker-blue-dim)] border border-[var(--marker-blue-border)] space-y-4 text-xs leading-relaxed animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--marker-blue-border)]">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-[var(--marker-blue)] text-white dark:text-[#101316]">
                      <Sparkles className="w-3 h-3" />
                      [MATHAI ENGINE]
                    </span>
                    <span className="font-semibold text-xs text-[var(--marker-blue)]">
                      Resolução Axiomática & Diagnóstico
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {resolucoesIa[currentQ.id].modelo && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--bg-board)] text-[var(--ink-secondary)] border border-[var(--marker-blue-border)] font-mono">
                        {resolucoesIa[currentQ.id].modelo}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400">
                      Confiança Alta
                    </span>
                  </div>
                </div>

                {/* DIAGNÓSTICO / PASSO A PASSO COM KATEX */}
                <div className="text-[var(--ink-primary)] leading-relaxed space-y-2">
                  <strong className="text-[var(--marker-blue)] block text-xs">
                    Demonstração Passo a Passo:
                  </strong>
                  <div className="text-[13px] md:text-sm leading-relaxed whitespace-pre-line overflow-x-auto">
                    <MathText text={resolucoesIa[currentQ.id].diagnostico || ""} />
                  </div>
                </div>

                {/* LEMA FUNDAMENTAL OU CONCEITO-CHAVE */}
                {resolucoesIa[currentQ.id].dica_proximo_passo && (
                  <div className="p-3.5 rounded-xl bg-[var(--bg-board)] border border-[var(--marker-blue-border)] dark:border-[var(--marker-amber-border)] space-y-1">
                    <strong className="text-[var(--marker-blue)] dark:text-[var(--marker-amber)] flex items-center gap-1.5 text-xs">
                      <Zap className="w-3.5 h-3.5" />
                      Lema Fundamental & Princípio Determinante:
                    </strong>
                    <div className="text-[var(--ink-secondary)] leading-relaxed text-xs overflow-x-auto">
                      <MathText text={resolucoesIa[currentQ.id].dica_proximo_passo || ""} />
                    </div>
                  </div>
                )}

                {/* SÍNTESE DO APRENDIZADO (FIXAÇÃO NO SM-2 / ACTIVE RECALL) */}
                <div className="pt-2 border-t border-[var(--marker-blue-border)] space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--ink-secondary)] flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
                    <span>Síntese do Aprendizado (Opcional - anote a lição aprendida para fixação na memória):</span>
                  </label>
                  <input
                    type="text"
                    value={justificativas[currentIndex] || ""}
                    onChange={(e) => setJustificativas((prev) => ({ ...prev, [currentIndex]: e.target.value }))}
                    placeholder="Ex: Pegadinha na restrição do denominador; aplicar lema da média harmônica..."
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-board)] border border-[var(--border-subtle)] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-hidden focus:border-[var(--marker-blue)] dark:focus:border-[var(--marker-amber)] transition-colors"
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
              onClick={() => handleSubmitCurrent()}
              disabled={submitting}
              className="lemmas-gold-cta px-5 py-2.5 rounded-lg font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Confirmar Dedução & Atualizar SM-2</span>
            </button>
          </div>
        )}
      </div>

      {!modoFocoAtivo && renderSocraticTutor()}

      {/* BANCADA DE RASCUNHO PARA QUESTÕES OBJETIVAS (QUESTÕES DISCURSIVAS RESOLVEM NA BANCADA INTEGRADA AO CARD) */}
      {!isDiscursiva && renderBancadaResolucao()}

      {/* NAVEGAÇÃO INFERIOR */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="px-4 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--ink-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--ink-primary)] disabled:opacity-40 text-xs font-semibold flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Anterior</span>
        </button>

        {currentIndex < effectiveTotal - 1 ? (
          <button
            onClick={() => setCurrentIndex((prev) => Math.min(effectiveTotal - 1, prev + 1))}
            className="lemmas-gold-cta px-5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-colors shadow-xs"
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
            className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSimuladoAtivo ? "Entregar Simulado" : "Finalizar Treino"}</span>
          </button>
        )}
      </div>

      {/* MODAL DE CONFIRMAÇÃO DA 5ª DICA SOCRÁTICA (FORA DO MODO FOCO; NO FOCO RENDERIZA DENTRO DO OVERLAY) */}
      {showHint5ConfirmModal && !modoFocoAtivo && createPortal(renderHint5ConfirmModal(false), document.body)}

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

      {/* MODAL DE AVISO: LOGAR PARA RESPONDER (FORA DO MODO FOCO; NO FOCO RENDERIZA DENTRO DO OVERLAY) */}
      {!modoFocoAtivo && <AuthPromptModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />}

      {/* MODAL DE REPORTAR INCONSISTÊNCIA NA QUESTÃO */}
      <ReportarQuestaoModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        questaoId={currentQ?.id || null}
        origem="resolver"
      />

      {/* OVERLAY DO MODO FOCO IMERSIVO (MESA DE PROVA OPT-IN) */}
      {modoFocoAtivo && currentQ && (
        <ImmersiveFocusOverlay
          question={currentQ}
          currentIndex={currentIndex}
          totalQuestions={effectiveTotal}
          selectedAnswer={answers[currentQ.id]}
          onSelectAnswer={(letra) => {
            handleSelectOption(letra);
          }}
          onNext={currentIndex < effectiveTotal - 1 ? () => setCurrentIndex((i) => i + 1) : undefined}
          onPrev={currentIndex > 0 ? () => setCurrentIndex((i) => i - 1) : undefined}
          activeEngine={
            bancadaModo === "geometria"
              ? "geometria"
              : "spen-dual"
          }
          onChangeEngine={(engine) => {
            if (engine === "geometria") {
              setBancadaModo("geometria");
            } else {
              setBancadaModo("lousa");
            }
          }}
          lousaDocument={getLousaDocument(currentIndex)}
          onLousaStrokesChange={handleLousaStrokesChange}
          geometricCommands={geometricCommands[currentIndex] || []}
          onGeometricCommandsChange={handleGeometricCommandsChange}
          onEvaluateDiscursive={async (tipo, payload) => {
            await submeterResolucaoDiscursiva(tipo, payload);
          }}
          isEvaluating={loadingDiscursive}
          evaluationResult={discursiveEvaluations[currentQ.id]}
          onConfirmOcr={confirmarLeituraOcr}
          socraticTutor={renderSocraticTutor(true)}
          hint5Confirmation={showHint5ConfirmModal ? renderHint5ConfirmModal(true) : null}
          authPrompt={<AuthPromptModal open={showAuthModal} onClose={() => setShowAuthModal(false)} inline />}
          hasBlockingModal={showHint5ConfirmModal || showAuthModal}
          onDismissModal={() => {
            if (showHint5ConfirmModal) setShowHint5ConfirmModal(false);
            if (showAuthModal) setShowAuthModal(false);
          }}
          isQuestionLocked={Boolean(hint5Used[currentIndex])}
          onClose={() => setModoFocoAtivo(false)}
        />
      )}
    </div>
  );
}

export default function ResolverPage() {
  return (
    <Suspense fallback={
      <div className="py-24 flex items-center justify-center text-[var(--ink-muted)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" />
      </div>
    }>
      <ResolverContent />
    </Suspense>
  );
}
