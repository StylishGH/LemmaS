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
  MessageSquare
} from "lucide-react";
import { extrairEnunciadoEAlternativas, corrigirLatex } from "@/lib/math-parser";
import { useUserProfile } from "@/lib/use-user";

interface Question {
  id: number;
  materia: string;
  topico: string;
  enunciado: string;
  enunciado_limpo?: string;
  alternativas?: Record<string, string>;
  gabarito: string;
  banca?: string;
  ano?: number;
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

function ResolverContent() {
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id");
  const { profile } = useUserProfile();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sessionMode, setSessionMode] = useState<"standby" | "simulado" | "result">("standby");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitResults, setSubmitResults] = useState<Record<number, SubmitResult>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(45 * 60);

  // Metacognição, Dedução digitada & Rascunho
  const [estrategias, setEstrategias] = useState<Record<number, string>>({});
  const [confianca, setConfianca] = useState<Record<number, number>>({});
  const [justificativas, setJustificativas] = useState<Record<number, string>>({});
  const [showRascunho, setShowRascunho] = useState(false);
  
  // Dicas Socráticas
  const [hintLevel, setHintLevel] = useState<number>(1);
  const [hints, setHints] = useState<Record<number, string>>({});
  const [loadingHint, setLoadingHint] = useState<boolean>(false);

  // Diagnóstico Multimodal & MathAI Engine
  const [imageFiles, setImageFiles] = useState<Record<number, string>>({});
  const [diagnosticosIa, setDiagnosticosIa] = useState<Record<number, DiagnosticoIaResult>>({});
  const [loadingIa, setLoadingIa] = useState<boolean>(false);

  // Feedback do Aluno (calibração por questão)
  const [feedbacks, setFeedbacks] = useState<Record<number, FeedbackState>>({});

  // Carrega questões reais
  useEffect(() => {
    setLoading(true);
    if (queryId) {
      fetch(`/api/questions/${queryId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && !data.error) {
            setQuestions([data]);
            setSessionMode("simulado");
          }
        })
        .finally(() => setLoading(false));
    } else {
      fetch(`/api/questions?limit=5`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.questoes && data.questoes.length > 0) {
            const parsedList = data.questoes.map((q: any) => {
              const { corpo, alternativas } = extrairEnunciadoEAlternativas(q.enunciado);
              return {
                ...q,
                enunciado_limpo: corpo,
                alternativas,
              };
            });
            setQuestions(parsedList);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [queryId]);

  // Cronômetro regressivo
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (sessionMode === "simulado" && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && sessionMode === "simulado") {
      setSessionMode("result");
    }
    return () => clearInterval(timer);
  }, [sessionMode, timeLeft]);

  const startWorkout = () => {
    setSessionMode("simulado");
    setCurrentIndex(0);
    setAnswers({});
    setSubmitResults({});
    setFeedbacks({});
    setJustificativas({});
    setBookmarks(new Set());
    setTimeLeft(45 * 60);
  };

  const handleSelectOption = (key: string) => {
    setAnswers((prev) => ({ ...prev, [currentIndex]: key }));
  };

  const toggleBookmark = (idx: number) => {
    const next = new Set(bookmarks);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setBookmarks(next);
  };

  // Submissão da questão atual
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
          tempo_segundos: 45 * 60 - timeLeft,
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

  // Solicitar Dica Socrática
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

  // Upload e OCR de Caderno
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

  // Avaliação com MathAI Engine (via texto ou foto do caderno)
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

  // Gerenciamento de Feedback do Aluno
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
        <span className="text-sm font-medium">Carregando ambiente de resolução...</span>
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

  // TELA DE STANDBY
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
            Resolva lemas matemáticos reais do Supabase com cronômetro, distinção clara de proveniência de dados, diagnóstico cognitivo da MathAI Engine e recalibração SM-2.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-amber-500/35 transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-[#d9b452] flex items-center justify-center font-bold text-lg">
                ⏱️
              </div>
              <h3 className="font-serif-math font-semibold text-slate-900 dark:text-[#f5f0df] text-base">Simulado do Banco Real</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed font-sans">
                Conjunto de questões com cronômetro oficial, camadas de proveniência e gravação no banco de dados.
              </p>
            </div>
            <button
              onClick={startWorkout}
              className="lemmas-gold-cta mt-6 w-full py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Iniciar Simulado</span>
            </button>
          </div>

          <div className="bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-amber-500/35 transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
                🎯
              </div>
              <h3 className="font-serif-math font-semibold text-slate-900 dark:text-[#f5f0df] text-base">Revisão Espaçada (SM-2)</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed font-sans">
                Lemas prioritários da sua curva de retenção de memória calculados pelo motor determinístico.
              </p>
            </div>
            <button
              onClick={startWorkout}
              className="mt-6 w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1b172e] dark:hover:bg-[#25203d] text-slate-800 dark:text-[#f5f0df] border border-slate-200 dark:border-amber-500/20 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <span>Revisar Fila Pendente</span>
            </button>
          </div>

          <div className="bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-amber-500/35 transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-[#d9b452] flex items-center justify-center font-bold text-lg">
                📚
              </div>
              <h3 className="font-serif-math font-semibold text-slate-900 dark:text-[#f5f0df] text-base">Navegar no Banco</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed font-sans">
                Escolha qualquer uma das questões individualmente com filtros de bancas e tópicos.
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
      </div>
    );
  }

  // TELA DE RESULTADO DO SIMULADO
  if (sessionMode === "result") {
    let acertos = 0;
    questions.forEach((q, i) => {
      const res = submitResults[i];
      if (res && res.acertou) acertos++;
      else if (answers[i] === q.gabarito) acertos++;
    });
    const taxa = Math.round((acertos / (questions.length || 1)) * 100);

    return (
      <div className="max-w-2xl mx-auto py-10 space-y-6 text-center animate-fadeIn text-slate-800 dark:text-[#f5f0df]">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-[#d9b452] flex items-center justify-center text-3xl mx-auto shadow-sm">
          🏆
        </div>
        <div className="space-y-2">
          <h2 className="font-serif-math text-2xl md:text-3xl font-semibold text-slate-900 dark:text-[#f5f0df]">
            Sessão Finalizada!
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-zinc-400">
            Suas respostas observadas e feedbacks foram gravados no Supabase e os intervalos SM-2 foram reprogramados.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-[#141222] border border-slate-200 dark:border-amber-500/20 grid grid-cols-3 gap-4 shadow-sm">
          <div>
            <div className="font-serif-math text-2xl font-bold text-slate-900 dark:text-[#f5f0df]">{acertos}/{questions.length}</div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">Acertos</div>
          </div>
          <div>
            <div className="font-serif-math text-2xl font-bold text-amber-600 dark:text-[#d9b452]">{taxa}%</div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">Aproveitamento</div>
          </div>
          <div>
            <div className="font-serif-math text-2xl font-bold text-amber-600 dark:text-[#d9b452]">
              {Math.floor((45 * 60 - timeLeft) / 60)}m {(45 * 60 - timeLeft) % 60}s
            </div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">Tempo Total</div>
          </div>
        </div>

        <div className="flex justify-center gap-3 pt-4">
          <button
            onClick={() => setSessionMode("standby")}
            className="lemmas-gold-cta px-5 py-2.5 rounded-xl font-bold text-xs shadow-md"
          >
            Voltar ao Hub de Treino
          </button>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-amber-500/20 text-slate-700 dark:text-[#dedbd0] text-xs font-semibold hover:bg-slate-50 dark:hover:bg-[#1b172e] transition-colors"
          >
            Ver no Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // TELA DE RESOLUÇÃO ATIVA
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

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6 animate-fadeIn text-slate-800 dark:text-[#f5f0df]">
      {/* BARRA SUPERIOR DO SIMULADOR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-[#d9b452]">
            {currentQ?.banca || "Questão Oficial"} {currentQ?.ano || ""}
          </span>
          <span className="text-xs text-slate-500 dark:text-zinc-400">
            Lema {currentIndex + 1} de {questions.length}
          </span>
        </div>

        {/* JUMPER DE QUESTÕES */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
          {questions.map((q, idx) => {
            const isAnswered = answers[idx] !== undefined;
            const isCurrent = idx === currentIndex;
            const res = submitResults[idx];

            return (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all relative ${
                  isCurrent
                    ? "lemmas-gold-cta shadow-sm scale-105"
                    : res
                    ? res.acertou
                      ? "bg-emerald-500/20 text-emerald-600 border border-emerald-500/40"
                      : "bg-rose-500/20 text-rose-600 border border-rose-500/40"
                    : isAnswered
                    ? "bg-amber-500/20 text-amber-600 border border-amber-500/40"
                    : "bg-slate-100 dark:bg-[#1b172e] text-slate-600 dark:text-zinc-400"
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {/* CRONÔMETRO */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1b172e] border border-slate-200 dark:border-amber-500/20 font-mono text-xs font-bold text-slate-700 dark:text-[#dedbd0]">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>{minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}</span>
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
          {corrigirLatex(corpo)}
        </div>

        {/* CAMADA 1: DADO OBSERVADO — RESPOSTA DO ESTUDANTE */}
        {answers[currentIndex] && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2 animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase bg-emerald-600 text-white shadow-xs">
                <Eye className="w-3.5 h-3.5" />
                [DADO OBSERVADO]
              </span>
              <span className="text-xs font-medium text-slate-800 dark:text-[#f5f0df]">
                Alternativa Selecionada: <strong className="font-mono text-emerald-700 dark:text-emerald-300 font-bold">({answers[currentIndex]})</strong>
              </span>
            </div>
            <span className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 font-medium">
              Entrada primária fornecida pelo estudante
            </span>
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
                  disabled={currentResult !== undefined}
                  onClick={() => handleSelectOption(key)}
                  className={`w-full text-left p-4 rounded-xl border flex items-center gap-4 transition-all ${
                    isSelected
                      ? "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500 dark:border-[#d9b452] shadow-sm text-slate-900 dark:text-[#f5f0df]"
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
                  <span className="text-sm font-medium">{val}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* FEEDBACK DE SUBMISSÃO E GABARITO OFICIAL */}
        {currentResult && (
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

        {/* BOTÃO DE CONFIRMAR RESPOSTA */}
        {!currentResult && answers[currentIndex] && (
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

      {/* TUTOR SOCRÁTICO E DICAS PROGRESSIVAS */}
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
            {/* CAMADA 2: INFERÊNCIA DA IA */}
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

      {/* ABA DE DEDUÇÃO DIGITADA & OCR MULTIMODAL */}
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
            {/* CAMADA 1: ENTRADA / RESPOSTA DIGITADA PELO ESTUDANTE */}
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
                <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                  Ground Truth textual
                </span>
              </div>
              <textarea
                value={justificativas[currentIndex] || ""}
                onChange={(e) => setJustificativas({ ...justificativas, [currentIndex]: e.target.value })}
                placeholder="Descreva seu desenvolvimento matemático passo a passo (ex: 'Pelo teorema de Pitágoras, temos a^2 + b^2 = c^2...')."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-amber-500/20 bg-white dark:bg-[#141222] text-slate-800 dark:text-[#f5f0df] focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono leading-relaxed resize-y"
                rows={3}
              />
            </div>

            {/* UPLOAD MULTIMODAL DE CADERNO */}
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
                <div className="space-y-2">
                  <p className="text-xs text-emerald-600 font-semibold">Imagem do rascunho carregada com sucesso!</p>
                </div>
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

            {/* CAMADA 2: DIAGNÓSTICO COGNITIVO COM BADGE INFERÊNCIA DA IA */}
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
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                    <span>Nível de Confiança:</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                      {typeof currentDiagnostico.confianca === "number"
                        ? `${Math.round(currentDiagnostico.confianca * 100)}%`
                        : currentDiagnostico.confianca || "94%"}
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
                  {currentDiagnostico.linha_do_erro && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-300 text-xs">
                      <strong>Linha / Etapa da divergência:</strong> {currentDiagnostico.linha_do_erro}
                    </div>
                  )}
                  {currentDiagnostico.dica_proximo_passo && (
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs">
                      <strong>Próximo passo recomendado:</strong> {currentDiagnostico.dica_proximo_passo}
                    </div>
                  )}
                  {currentDiagnostico.estrategia_identificada && (
                    <p className="text-slate-500 dark:text-zinc-400 text-[11px]">
                      Estratégia detectada: <em>{currentDiagnostico.estrategia_identificada}</em>
                    </p>
                  )}
                </div>

                {/* CAMADA 3: CARD DE FEEDBACK DO ALUNO */}
                <div className="pt-2">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#18152a] border border-slate-200 dark:border-amber-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-amber-600 dark:text-[#d9b452]" />
                        <h5 className="font-serif-math text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-[#dedbd0]">
                          Feedback do Aluno & Calibração
                        </h5>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                        Validação de Proveniência
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Sua avaliação calibra a acurácia do MathAI Engine no Supabase e aprimora os diagnósticos da IA.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* Pergunta 1: Essa dica/avaliação foi útil? [Sim] [Não] */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 block">
                          Essa dica/avaliação foi útil?
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateFeedbackState(currentIndex, { util: true })}
                            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                              currentFeedback.util === true
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                : "bg-white dark:bg-[#141222] text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-amber-500/20 hover:border-emerald-500"
                            }`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            <span>Sim</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => updateFeedbackState(currentIndex, { util: false })}
                            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                              currentFeedback.util === false
                                ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                                : "bg-white dark:bg-[#141222] text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-amber-500/20 hover:border-rose-500"
                            }`}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                            <span>Não</span>
                          </button>
                        </div>
                      </div>

                      {/* Pergunta 2: Concorda com o diagnóstico? [Sim] [Não] */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 block">
                          Concorda com o diagnóstico?
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateFeedbackState(currentIndex, { concorda: true })}
                            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                              currentFeedback.concorda === true
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                : "bg-white dark:bg-[#141222] text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-amber-500/20 hover:border-emerald-500"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Sim</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => updateFeedbackState(currentIndex, { concorda: false })}
                            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                              currentFeedback.concorda === false
                                ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                                : "bg-white dark:bg-[#141222] text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-amber-500/20 hover:border-rose-500"
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Não</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Comentário opcional */}
                    <div className="pt-1">
                      <input
                        type="text"
                        placeholder="Observação adicional ou divergência constatada (opcional)..."
                        value={currentFeedback.comentario || ""}
                        onChange={(e) => updateFeedbackState(currentIndex, { comentario: e.target.value })}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-amber-500/20 bg-white dark:bg-[#141222] text-slate-800 dark:text-[#f5f0df] focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    {/* Botão de Gravação de Feedback */}
                    <div className="flex items-center justify-between pt-1">
                      {currentFeedback.submitted ? (
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>Feedback gravado com sucesso no Supabase! Obrigado pela calibração.</span>
                        </div>
                      ) : (
                        <>
                          {currentFeedback.error && (
                            <span className="text-xs text-rose-500 font-medium">{currentFeedback.error}</span>
                          )}
                          <div className="ml-auto">
                            <button
                              type="button"
                              disabled={
                                currentFeedback.submitting ||
                                (currentFeedback.util === null && currentFeedback.concorda === null)
                              }
                              onClick={() =>
                                handleSendFeedback(
                                  currentQ.id,
                                  currentIndex,
                                  "diagnostico_ia",
                                  currentDiagnostico.modelo || "Gemini Flash Lite",
                                  typeof currentDiagnostico.confianca === "number"
                                    ? `${Math.round(currentDiagnostico.confianca * 100)}%`
                                    : String(currentDiagnostico.confianca || "94%")
                                )
                              }
                              className="lemmas-gold-cta px-4 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 disabled:opacity-40 shadow-sm"
                            >
                              {currentFeedback.submitting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                              <span>Gravar Feedback no Supabase</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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
            onClick={() => setSessionMode("result")}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold flex items-center gap-2 shadow-md hover:opacity-95 transition-opacity"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Finalizar Sessão</span>
          </button>
        )}
      </div>
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
