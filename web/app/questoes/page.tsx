"use client";

import { useEffect, useState } from "react";
import { 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  RotateCcw, 
  Clock, 
  Tag, 
  Award, 
  AlertCircle,
  HelpCircle,
  Pause,
  Play
} from "lucide-react";

interface Question {
  id: number;
  materia: string;
  topico: string;
  subtopico?: string | null;
  banca: string;
  ano?: number | null;
  dificuldade: number;
  tipo: string;
  enunciado: string;
  alternativas: Record<string, string>;
  has_figura?: boolean;
}

interface SubmitResult {
  success: boolean;
  acertou: boolean;
  resposta_enviada: string;
  gabarito_oficial: string;
  tempo_segundos: number;
  feedback: string;
}

export default function QuestoesPage() {
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlt, setSelectedAlt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  // Cronômetro
  const [seconds, setSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);

  // Carregar questão aleatória do backend FastAPI
  async function fetchRandomQuestion() {
    setLoading(true);
    setError(null);
    setSelectedAlt(null);
    setResult(null);
    setSeconds(0);
    setIsTimerRunning(true);

    try {
      const res = await fetch("http://localhost:8000/api/questions/random", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Erro ${res.status}: não foi possível buscar questão.`);
      }
      const data: Question = await res.json();
      setQuestion(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao conectar com o backend Python.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRandomQuestion();
  }, []);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && !result) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, result]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Submissão da resposta
  async function handleSubmit() {
    if (!selectedAlt || !question) return;

    setSubmitting(true);
    setIsTimerRunning(false);

    try {
      const res = await fetch(`http://localhost:8000/api/questions/${question.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resposta: selectedAlt,
          tempo_segundos: seconds,
          confianca: 4,
        }),
      });

      if (!res.ok) {
        throw new Error("Erro ao validar resposta.");
      }

      const data: SubmitResult = await res.json();
      setResult(data);
    } catch (err: unknown) {
      alert("Erro ao enviar tentativa: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* HEADER DA SESSÃO DE TREINO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#13111f] border border-violet-900/40 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-lg">
            🎯
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Treino Livre de Questões</h1>
            <p className="text-xs text-zinc-400">Banco de questões oficiais do MathAI</p>
          </div>
        </div>

        {/* CONTADOR DE TEMPO */}
        <div className="flex items-center gap-3 bg-[#181528] border border-violet-900/40 px-4 py-2 rounded-xl">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isTimerRunning ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            <span className="font-mono text-sm font-bold text-zinc-200">{formatTimer(seconds)}</span>
          </div>
          <button
            onClick={() => setIsTimerRunning(!isTimerRunning)}
            className="text-xs text-zinc-400 hover:text-white p-1 rounded transition"
            title={isTimerRunning ? "Pausar cronômetro" : "Continuar cronômetro"}
          >
            {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ESTADO DE ERRO */}
      {error && (
        <div className="p-6 bg-rose-950/20 border border-rose-800/40 rounded-2xl text-rose-300 space-y-3">
          <div className="flex items-center gap-2 font-bold text-base">
            <AlertCircle className="w-5 h-5 text-rose-400" />
            Backend Python Inacessível
          </div>
          <p className="text-sm text-zinc-400">
            {error}. Certifique-se de que a API FastAPI está em execução na porta 8000 (`uvicorn web.api.main:app --reload`).
          </p>
          <button
            onClick={fetchRandomQuestion}
            className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-500 transition"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* ESTADO DE LOADING */}
      {loading && !error && (
        <div className="p-16 bg-[#13111f] border border-violet-900/30 rounded-2xl flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-sm text-zinc-400">Buscando questão real no banco SQLite do MathAI...</p>
        </div>
      )}

      {/* CARD DA QUESTÃO */}
      {!loading && !error && question && (
        <div className="space-y-6">
          <div className="bg-[#13111f] border border-violet-900/40 rounded-2xl p-6 md:p-8 shadow-xl space-y-6">
            {/* TAGS E METADADOS */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-violet-900/30">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold px-3 py-1 rounded-md bg-violet-600/20 text-violet-300 border border-violet-500/30">
                  {question.materia}
                </span>
                <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300">
                  {question.topico}
                </span>
                {question.banca && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Banca: {question.banca}
                  </span>
                )}
                {question.ano && (
                  <span className="text-xs text-zinc-400 px-2 py-0.5">
                    Ano: {question.ano}
                  </span>
                )}
              </div>
              <span className="text-xs font-mono text-zinc-500">
                Questão #{question.id}
              </span>
            </div>

            {/* ENUNCIADO */}
            <div className="text-zinc-200 text-base md:text-lg leading-relaxed whitespace-pre-line select-text font-serif">
              {question.enunciado}
            </div>

            {/* ALTERNATIVAS */}
            {Object.keys(question.alternativas).length > 0 ? (
              <div className="space-y-3 pt-2">
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Selecione a Alternativa Correta:
                </div>
                {Object.entries(question.alternativas).map(([letra, texto]) => {
                  const isSelected = selectedAlt === letra;
                  const isCorrect = result && result.gabarito_oficial === letra;
                  const isWrong = result && isSelected && !result.acertou;

                  let borderStyle = "border-violet-900/40 hover:border-violet-500/50 hover:bg-[#1c1830]";
                  let bgStyle = "bg-[#181528]";

                  if (isSelected) {
                    borderStyle = "border-amber-400 bg-violet-950/40 shadow-sm shadow-amber-400/20";
                  }
                  if (result) {
                    if (isCorrect) {
                      borderStyle = "border-emerald-500 bg-emerald-950/30 text-emerald-200";
                    } else if (isWrong) {
                      borderStyle = "border-rose-500 bg-rose-950/30 text-rose-200";
                    }
                  }

                  return (
                    <button
                      key={letra}
                      disabled={!!result}
                      onClick={() => setSelectedAlt(letra)}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-4 ${bgStyle} ${borderStyle}`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected
                            ? "bg-amber-400 text-zinc-950"
                            : "bg-zinc-800 text-zinc-300"
                        }`}
                      >
                        {letra}
                      </div>
                      <span className="text-sm md:text-base text-zinc-200 pt-0.5">{texto}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-amber-950/20 border border-amber-800/40 rounded-xl text-xs text-amber-300">
                Esta questão é discursiva ou tem formato aberto.
              </div>
            )}

            {/* FEEDBACK DO RESULTADO */}
            {result && (
              <div
                className={`p-6 rounded-2xl border transition-all ${
                  result.acertou
                    ? "bg-emerald-950/25 border-emerald-500/40 text-emerald-200"
                    : "bg-amber-950/25 border-amber-500/40 text-amber-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  {result.acertou ? (
                    <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <h3 className="font-extrabold text-base text-white">
                      {result.acertou ? "Resposta Correta! 🎯" : "Resposta Incorreta!"}
                    </h3>
                    <p className="text-xs text-zinc-300 mt-1">
                      {result.feedback}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
                  <span>Gabarito Oficial: <strong className="text-amber-400 font-bold font-mono">({result.gabarito_oficial || "A definir"})</strong></span>
                  <span>Tempo decorrido: {formatTimer(result.tempo_segundos)}</span>
                </div>
              </div>
            )}

            {/* BOTÕES DE AÇÃO */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-violet-900/30">
              <button
                onClick={fetchRandomQuestion}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-700/60 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Pular / Nova Questão
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {!result ? (
                  <button
                    disabled={!selectedAlt || submitting}
                    onClick={handleSubmit}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition shadow-lg shadow-violet-600/30"
                  >
                    {submitting ? "Verificando..." : "Conferir Resposta"}
                  </button>
                ) : (
                  <button
                    onClick={fetchRandomQuestion}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition shadow-lg shadow-emerald-600/30"
                  >
                    <span>Próxima Questão</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
