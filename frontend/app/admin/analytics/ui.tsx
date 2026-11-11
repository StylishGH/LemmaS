"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, CheckCircle2, Clock3, RefreshCw, Users } from "lucide-react";

type OnlineStudent = {
  studentId: number;
  name: string;
  email: string;
  lastSeenAt: string;
  section: "resolver" | "questoes" | "other";
};

type RecentAttempt = {
  attemptId: number;
  studentName: string;
  studentEmail: string;
  questionId: number;
  subject: string;
  topic: string;
  correct: boolean;
  occurredAt: string;
};

type AnalyticsData = {
  onlineStudents: OnlineStudent[];
  summary: { attempts: number; activeStudents: number; correctAnswers: number };
  recentAttempts: RecentAttempt[];
};

const windows = [
  { hours: 24, label: "24 horas" },
  { hours: 168, label: "7 dias" },
  { hours: 720, label: "30 dias" },
];

const dateTime = (value: string) => new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
}).format(new Date(value));

const sectionLabel = (section: OnlineStudent["section"]) => {
  if (section === "resolver") return "No resolvedor";
  if (section === "questoes") return "Explorando questões";
  return "Navegando no LemmaS";
};

export default function AdminAnalyticsDashboard() {
  const [hours, setHours] = useState(24);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/analytics?hours=${hours}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Não foi possível carregar o painel.");
        setData(null);
        return;
      }
      setData(result);
      setError(null);
    } catch {
      setError("Falha de conexão. Tente atualizar o painel.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [hours]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [refresh]);

  return (
    <main className="min-h-screen bg-[#f7f6f2] px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">LEMMAS · equipe</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Atividade dos estudantes</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              Presença atualizada enquanto a página está aberta e tentativas registradas no período selecionado.
            </p>
          </div>
          <button onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
            <RefreshCw size={16} aria-hidden="true" /> Atualizar
          </button>
        </header>

        <nav aria-label="Período das métricas" className="flex flex-wrap gap-2">
          {windows.map((item) => (
            <button key={item.hours} onClick={() => setHours(item.hours)} aria-pressed={hours === item.hours}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${hours === item.hours ? "bg-emerald-700 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"}`}>
              {item.label}
            </button>
          ))}
        </nav>

        {error ? (
          <section role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            <h2 className="font-semibold">{error.includes("administradora") ? "Acesso administrativo necessário" : "Painel indisponível"}</h2>
            <p className="mt-1 text-sm">{error}</p>
          </section>
        ) : null}

        <section aria-label="Resumo do período" className="grid gap-3 sm:grid-cols-3">
          <Metric icon={<Users size={19} />} label="Estudantes ativos" value={data?.summary.activeStudents} loading={loading} />
          <Metric icon={<Activity size={19} />} label="Questões respondidas" value={data?.summary.attempts} loading={loading} />
          <Metric icon={<CheckCircle2 size={19} />} label="Acertos" value={data?.summary.correctAnswers} loading={loading} />
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.4fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Online agora</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Atividade nos últimos 2 minutos</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{data?.onlineStudents.length ?? 0}</span>
            </div>
            {loading ? <p className="text-sm text-slate-500">Carregando…</p> : null}
            {!loading && !error && data && data.onlineStudents.length === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">Ninguém online neste momento.</p> : null}
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {data?.onlineStudents.map((student) => (
                <li key={student.studentId} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" aria-label="Online" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{student.name}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{student.email}</p>
                      <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">{sectionLabel(student.section)}</p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-500">{dateTime(student.lastSeenAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Resoluções recentes</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Submissões registradas no período</p>
            </div>
            {loading ? <p className="text-sm text-slate-500">Carregando…</p> : null}
            {!loading && !error && data && data.recentAttempts.length === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">Nenhuma resolução encontrada neste período.</p> : null}
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {data?.recentAttempts.map((attempt) => (
                <li key={attempt.attemptId} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{attempt.studentName}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{attempt.studentEmail}</p>
                    <p className="mt-1 text-sm">Questão #{attempt.questionId} · {attempt.subject} · {attempt.topic}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`rounded-full px-2 py-1 font-medium ${attempt.correct ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"}`}>
                      {attempt.correct ? "Acertou" : "Errou"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-500"><Clock3 size={13} />{dateTime(attempt.occurredAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <p className="text-xs text-slate-500 dark:text-slate-400">A presença começa a ser registrada após a publicação da atualização. Visitantes de demonstração ficam fora das métricas.</p>
      </div>
    </main>
  );
}

function Metric({ icon, label, value, loading }: { icon: React.ReactNode; label: string; value?: number; loading: boolean }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">{icon}{label}</div>
      <p className="mt-3 text-3xl font-bold tabular-nums">{loading ? "—" : (value ?? 0).toLocaleString("pt-BR")}</p>
    </article>
  );
}
