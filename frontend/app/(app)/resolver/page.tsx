"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  Award
} from "lucide-react";
import { extrairEnunciadoEAlternativas } from "@/lib/math-parser";
import { MathText } from "@/components/math/MathDisplay";
import { useUserProfile } from "@/lib/use-user";

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
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  totalQuestoes: number;
  respondidasCount: number;
  emBrancoCount: number;
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
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
          >
            Continuar Resolvendo
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="lemmas-gold-cta px-5 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirmar Entrega</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ResolverContent() {
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id");
  const sessionQuery = searchParams.get("session"); // "simulado" ou "treino"
  const modeQuery = searchParams.get("mode"); // "treino"

  const { profile, isAuthenticated, loading: userLoading } = useUserProfile();
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

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

  // Cronômetro
  const [totalTimeInitial, setTotalTimeInitial] = useState(45 * 60);
  const [timeLeft, setTimeLeft] = useState(45 * 60);

  // Metacognição, Dedução digitada & Rascunho (Modo Treino)
  const [estrategias, setEstrategias] = useState<Record<number, string>>({});
  const [confianca, setConfianca] = useState<Record<number, number>>({});
  const [justificativas, setJustificativas] = useState<Record<number, string>>({});
  const [showRascunho, setShowRascunho] = useState(false);
  
  // Dicas Socráticas (Modo Treino)
  const [hintLevel, setHintLevel] = useState<number>(1);
  const [hints, setHints] = useState<Record<number, string>>({});
  const [loadingHint, setLoadingHint] = useState<boolean>(false);

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
        if (sessionQuery === "treino" && typeof window !== "undefined") {
          const stored = sessionStorage.getItem("lemmas_active_treino");
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
                setSessionType("treino");
                setSessionMode("active");
                setTotalTimeInitial(0);
                setTimeLeft(0);
                return;
              }
            }
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
    if (!isAuthenticated && !userLoading) {
      setShowAuthModal(true);
      return;
    }
    setAnswers((prev) => ({ ...prev, [currentIndex]: key }));
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
    const userAns = answers[currentIndex];
    if (!q || !userAns) return;

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
          estrategia_usada: estrategias[currentIndex] || null,
          anotacoes: justificativas[currentIndex] || null,
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

  // Solicitar Dica Socrática (Modo Treino)
  const pedirDicaSocratica = async () => {
    const q = questions[currentIndex];
    if (!q) return;

    setLoadingHint(true);
    try {
      const res = await fetch("/api/ai/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enunciado: q.enunciado,
          nivel: hintLevel,
          tentativas_anteriores: justificativas[currentIndex] || answers[currentIndex] || null,
        }),
      });
      const data = await res.json();
      if (data.dica) {
        setHints((prev) => ({ ...prev, [currentIndex]: data.dica }));
        setHintLevel((prev) => Math.min(5, prev + 1));
      }
    } catch (err) {
      console.error("Erro ao pedir dica:", err);
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

  // Avaliação com MathAI Engine (via texto ou foto do caderno no treino)
  const enviarParaMathAiEngine = async () => {
    const q = questions[currentIndex];
    const imageBase64 = imageFiles[currentIndex];
    const textoDeducao = justificativas[currentIndex];

    if (!q || (!imageBase64 && !textoDeducao)) return;

    setLoadingIa(true);
    try {
      const res = await fetch("/api/ai/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enunciado: q.enunciado,
          gabarito: q.gabarito,
          justificativa: textoDeducao || "Análise via rascunho/imagem em anexo.",
          imagem_base64: imageBase64 || null,
        }),
      });
      const data = await res.json();
      setDiagnosticosIa((prev) => ({ ...prev, [currentIndex]: data }));
    } catch (err) {
      console.error("Erro ao avaliar com MathAI Engine:", err);
    } finally {
      setLoadingIa(false);
    }
  };

  // Solicitar Explicação Pós-Simulado da MathAI Engine para uma questão
  const pedirExplicacaoPosSimulado = async (q: Question) => {
    if (resolucoesIa[q.id]) return;

    setLoadingResolucaoIa((prev) => ({ ...prev, [q.id]: true }));
    try {
      const respostaAluno = answers[questions.findIndex((item) => item.id === q.id)] || "Não respondeu (em branco)";
      const res = await fetch("/api/ai/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enunciado: q.enunciado,
          gabarito: q.gabarito,
          justificativa: `O estudante assinalou a alternativa: (${respostaAluno}). Explique o passo a passo completo da questão e diagnostique a pegadinha ou raciocínio por trás da alternativa assinalada.`,
        }),
      });
      const data = await res.json();
      setResolucoesIa((prev) => ({ ...prev, [q.id]: data }));
    } catch (err) {
      console.error("Erro ao carregar explicação da IA:", err);
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
            resposta_estudante: answers[idx] || null,
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

  // Contagens para o Simulado
  const respondidasCount = Object.keys(answers).length;
  const emBrancoCount = Math.max(0, questions.length - respondidasCount);

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

    questions.forEach((q, i) => {
      const resp = answers[i];
      if (!resp) {
        emBranco++;
      } else if (resp.toUpperCase() === q.gabarito.toUpperCase()) {
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
    const questoesRevisao = questions.filter((q, i) => {
      const resp = answers[i];
      if (reviewFilter === "acertos") return resp && resp.toUpperCase() === q.gabarito.toUpperCase();
      if (reviewFilter === "erros") return resp && resp.toUpperCase() !== q.gabarito.toUpperCase();
      if (reviewFilter === "em_branco") return !resp;
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
                Todas ({questions.length})
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
              const alunoResp = answers[originalIndex];
              const acertou = alunoResp && alunoResp.toUpperCase() === q.gabarito.toUpperCase();
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
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 font-bold">
                        Questão #{originalIndex + 1}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">
                        {q.banca} {q.ano} · {q.materia} ({q.topico})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {acertou ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Acertou ({alunoResp})
                        </span>
                      ) : isEmBranco ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-[#d9b452] border border-amber-500/30 text-xs font-bold">
                          <HelpCircle className="w-3.5 h-3.5" /> Em Branco (Correta: {q.gabarito})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30 text-xs font-bold">
                          <XCircle className="w-3.5 h-3.5" /> Errou: Marcou ({alunoResp}) · Correta ({q.gabarito})
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
                            const isGabarito = q.gabarito.toUpperCase() === letra.toUpperCase();

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
                        <div className="pt-2">
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
                          <p className="text-slate-800 dark:text-zinc-200 whitespace-pre-line">
                            {iaResult.diagnostico}
                          </p>
                          {iaResult.dica_proximo_passo && (
                            <div className="p-2 rounded-lg bg-white/70 dark:bg-[#18152a] border border-purple-500/20 text-slate-700 dark:text-zinc-300">
                              <strong>Lema / Passo-chave:</strong> {iaResult.dica_proximo_passo}
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

  const { corpo, alternativas } = extrairEnunciadoEAlternativas(currentQ.enunciado);
  const isSimuladoAtivo = sessionType === "simulado";

  // Navegação de Janela Deslizante (10 botões com questão ativa centralizada)
  const windowSize = 10;
  const maxStart = Math.max(0, questions.length - windowSize);
  const windowStart = Math.max(0, Math.min(currentIndex - 4, maxStart));
  const endIndex = Math.min(windowStart + windowSize, questions.length);
  const visibleQuestionIndices = Array.from(
    { length: Math.max(0, endIndex - windowStart) },
    (_, i) => windowStart + i
  );

  const handleJumpToQuestion = (target?: number) => {
    const val = target !== undefined ? target : parseInt(jumpValue, 10);
    if (!isNaN(val) && val >= 1 && val <= questions.length) {
      setCurrentIndex(val - 1);
    }
    setJumpValue("");
  };

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
              <span>Questão <strong className="text-slate-900 dark:text-amber-300 font-bold">{currentIndex + 1}</strong> de {questions.length}</span>
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

        {/* LINHA 2: NAVEGAÇÃO DE QUESTÕES (JUMPER DE 10 & IR PARA) */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 pt-1 overflow-x-auto flex-nowrap pb-1 sm:pb-0">
          {/* Faixa com os números da janela de 10 questões */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap shrink-0">
            {/* Botão para voltar 10 questões */}
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - windowSize))}
              disabled={currentIndex === 0}
              className={`h-7 sm:h-8 px-2 sm:px-2.5 flex items-center gap-1 rounded-lg border border-slate-200 dark:border-amber-500/20 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-[#1b172e] transition-colors shrink-0 ${
                currentIndex === 0 ? "opacity-40 cursor-not-allowed" : "active:scale-95"
              }`}
              title="10 questões anteriores"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>-10</span>
            </button>

            {/* Números das questões na janela ativa de 10 */}
            {visibleQuestionIndices.map((qIndex) => {
              const isCurrent = qIndex === currentIndex;
              const qObj = questions[qIndex];
              const isAnswered = qObj && answers[qObj.id] !== undefined;
              const isBookmarked = qObj && bookmarks.has(qObj.id);
              return (
                <button
                  key={qIndex}
                  onClick={() => setCurrentIndex(qIndex)}
                  className={`w-7 sm:w-8 h-7 sm:h-8 rounded-lg text-xs font-bold transition-all relative flex items-center justify-center shrink-0 ${
                    isCurrent
                      ? "lemmas-gold-cta shadow-md scale-105 z-10"
                      : isAnswered
                      ? "bg-emerald-500/15 border border-emerald-500/35 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25"
                      : "bg-slate-100 dark:bg-[#1b172e] text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-[#25203d]"
                  }`}
                  title={`Questão ${qIndex + 1}${isAnswered ? " (Respondida)" : ""}${isBookmarked ? " [Marcada]" : ""}`}
                >
                  {qIndex + 1}
                  {isBookmarked && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-[#141222]" />
                  )}
                </button>
              );
            })}

            {/* Botão para avançar 10 questões */}
            <button
              onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + windowSize))}
              disabled={currentIndex >= questions.length - 1}
              className={`h-7 sm:h-8 px-2 sm:px-2.5 flex items-center gap-1 rounded-lg border border-slate-200 dark:border-amber-500/20 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-[#1b172e] transition-colors shrink-0 ${
                currentIndex >= questions.length - 1 ? "opacity-40 cursor-not-allowed" : "active:scale-95"
              }`}
              title="Próximas 10 questões"
            >
              <span>+10</span>
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
              max={questions.length}
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
          <div className="text-xs font-semibold text-slate-400 dark:text-zinc-500">
            {currentQ?.materia} • <span className="text-slate-700 dark:text-[#dedbd0]">{currentQ?.topico}</span>
          </div>
          <button
            onClick={() => toggleBookmark(currentIndex)}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${
              bookmarks.has(currentIndex)
                ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-[#d9b452]"
                : "border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>{bookmarks.has(currentIndex) ? "Marcada" : "Marcar"}</span>
          </button>
        </div>

        <div className="font-serif-math text-base md:text-lg font-normal text-slate-900 dark:text-[#f5f0df] leading-relaxed whitespace-pre-line">
          <MathText text={corpo} />
        </div>

        {/* CAMADA 1: DADO OBSERVADO — RESPOSTA DO ESTUDANTE */}
        {answers[currentIndex] && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-2 animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase bg-amber-600 text-white shadow-xs">
                <Eye className="w-3.5 h-3.5" />
                [DADO OBSERVADO]
              </span>
              <span className="text-xs font-medium text-slate-800 dark:text-[#f5f0df]">
                Alternativa Assinalada: <strong className="font-mono text-amber-700 dark:text-[#d9b452] font-bold">({answers[currentIndex]})</strong>
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
          <div className="space-y-3 pt-2">
            {Object.entries(alternativas).map(([key, val]) => {
              const isSelected = answers[currentIndex] === key;

              return (
                <button
                  key={key}
                  disabled={!isSimuladoAtivo && currentResult !== undefined}
                  onClick={() => handleSelectOption(key)}
                  className={`w-full text-left p-4 rounded-xl border flex items-center gap-4 transition-all ${
                    isSelected
                      ? "bg-amber-500/15 dark:bg-amber-500/20 border-amber-500 dark:border-[#d9b452] shadow-sm text-slate-900 dark:text-[#f5f0df]"
                      : "bg-slate-50/50 dark:bg-[#18152a] border-slate-200/80 dark:border-amber-500/10 text-slate-700 dark:text-zinc-300 hover:border-amber-500/30"
                  }`}
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
        )}

        {/* MODO TREINO: FEEDBACK IMEDIATO DE SUBMISSÃO E GABARITO OFICIAL */}
        {!isSimuladoAtivo && currentResult && (
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
                    <XCircle className="w-4 h-4" /> Divergência: Gabarito Oficial é ({currentResult.gabarito})
                  </span>
                )}
              </div>
            </div>
            <div className="text-xs text-slate-600 dark:text-zinc-300 pt-1 border-t border-slate-200/50 dark:border-white/10">
              SM-2 Atualizado: Próxima revisão agendada para <strong>{currentResult.sm2.proxima_revisao_data}</strong> (Intervalo: {currentResult.sm2.intervalo_dias} dia{currentResult.sm2.intervalo_dias > 1 ? "s" : ""}, EF: {currentResult.sm2.fator_facilidade}).
            </div>
          </div>
        )}

        {/* MODO TREINO: BOTÃO DE CONFIRMAR RESPOSTA */}
        {!isSimuladoAtivo && !currentResult && answers[currentIndex] && (
          <div className="pt-2">
            <button
              onClick={handleSubmitCurrent}
              disabled={submitting}
              className="lemmas-gold-cta px-6 py-2.5 rounded-xl font-bold text-xs shadow-md flex items-center gap-2"
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
          {/* TUTOR SOCRÁTICO E DICAS PROGRESSIVAS (MODO TREINO) */}
          <div className="bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <h4 className="font-serif-math text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-[#dedbd0]">
                  Tutor Socrático Adaptativo (MathAI Engine)
                </h4>
              </div>
              <button
                onClick={pedirDicaSocratica}
                disabled={loadingHint}
                className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-[#d9b452] font-semibold hover:underline disabled:opacity-50"
              >
                {loadingHint ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Solicitar Dica Socrática (Nível {hintLevel})</span>
              </button>
            </div>

            {hints[currentIndex] && (
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/25 text-xs text-slate-800 dark:text-[#f5f0df] leading-relaxed space-y-3 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-purple-500/20">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-purple-600 text-white shadow-xs">
                      <Sparkles className="w-3 h-3" />
                      [INFERÊNCIA DA IA]
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-white/70 dark:bg-[#1e1935] text-slate-700 dark:text-zinc-300 border border-purple-500/20">
                      Modelo: <strong>Gemini Flash Lite</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                    <span>Nível de Confiança:</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                      98%
                    </span>
                  </div>
                </div>

                <div>
                  <strong className="text-purple-700 dark:text-purple-300 block mb-1">Dica Reflexiva Socrática:</strong>
                  <p className="leading-relaxed text-slate-800 dark:text-[#dedbd0]">{hints[currentIndex]}</p>
                </div>
              </div>
            )}
          </div>

          {/* ABA DE DEDUÇÃO DIGITADA & OCR MULTIMODAL (MODO TREINO) */}
          <div className="bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-600 dark:text-[#d9b452]" />
                <h4 className="font-serif-math text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-[#dedbd0]">
                  Dedução Passo a Passo & Caderno (OCR Multimodal)
                </h4>
              </div>
              <button
                onClick={() => setShowRascunho(!showRascunho)}
                className="text-xs text-amber-600 dark:text-[#d9b452] font-semibold hover:underline"
              >
                {showRascunho ? "Ocultar Área de Dedução" : "Abrir Rascunho / Enviar foto do caderno"}
              </button>
            </div>

            {showRascunho && (
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
                    <span>Upload de Foto do Caderno / Print do Tablet</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="text-xs mx-auto block text-slate-600 dark:text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-slate-900 hover:file:bg-amber-600 cursor-pointer"
                  />
                  {currentImage && (
                    <p className="text-xs text-emerald-600 font-semibold">Imagem do rascunho carregada com sucesso!</p>
                  )}

                  <button
                    onClick={enviarParaMathAiEngine}
                    disabled={loadingIa || (!currentImage && !justificativas[currentIndex])}
                    className="lemmas-gold-cta px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 mx-auto disabled:opacity-40"
                  >
                    {loadingIa ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />}
                    <span>Avaliar Raciocínio com MathAI Engine</span>
                  </button>
                </div>

                {currentDiagnostico && (
                  <div className="text-left p-5 rounded-xl bg-white dark:bg-[#141222] border-2 border-purple-500/30 text-xs space-y-4 shadow-sm animate-fadeIn">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-purple-500/20">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-purple-600 text-white shadow-xs">
                          <BrainCircuit className="w-3 h-3" />
                          [INFERÊNCIA DA IA]
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-[#1e1935] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-purple-500/20">
                          Modelo: <strong>{currentDiagnostico.modelo || "Gemini Flash Lite"}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="font-bold text-amber-600 dark:text-[#d9b452] flex items-center gap-2 text-sm">
                        <span>Diagnóstico: {currentDiagnostico.status_resolucao}</span>
                      </div>
                      <p className="text-slate-700 dark:text-zinc-300 leading-relaxed text-xs">
                        {currentDiagnostico.diagnostico}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

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

        {currentIndex < questions.length - 1 ? (
          <button
            onClick={() => setCurrentIndex((prev) => prev + 1)}
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

      {/* MODAL DE CONFIRMAÇÃO DE ENTREGA */}
      <ConfirmarEntregaModal
        open={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={() => {
          setShowConfirmModal(false);
          setSessionMode("result");
        }}
        totalQuestoes={questions.length}
        respondidasCount={respondidasCount}
        emBrancoCount={emBrancoCount}
      />

      {/* MODAL DE AVISO: LOGAR PARA RESPONDER */}
      <AuthPromptModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
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
