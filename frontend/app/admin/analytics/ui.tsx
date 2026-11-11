"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Filter,
  Flame,
  HelpCircle,
  Layers,
  MousePointerClick,
  RefreshCw,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

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

type FunnelData = {
  landing: number;
  questoes: number;
  resolver: number;
  tentativas: number;
  source: "database" | "estimated";
};

type AnalyticsData = {
  onlineStudents: OnlineStudent[];
  summary: { attempts: number; activeStudents: number; correctAnswers: number };
  recentAttempts: RecentAttempt[];
  funnel?: FunnelData;
};

const windows = [
  { hours: 24, label: "24 horas" },
  { hours: 168, label: "7 dias" },
  { hours: 720, label: "30 dias" },
];

const dateTime = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

const sectionLabel = (section: OnlineStudent["section"]) => {
  if (section === "resolver") return "No Resolvedor";
  if (section === "questoes") return "No Banco de Questões";
  return "Navegando";
};

// Mascara e-mails para permitir capturas de tela públicas sem violar a LGPD
const maskEmail = (email: string, isMasked: boolean) => {
  if (!isMasked || !email) return email;
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const maskedUser = user.length > 2 ? `${user[0]}***${user[user.length - 1]}` : `${user[0]}***`;
  const [dName, ...dExt] = domain.split(".");
  const maskedDomain = `${dName[0]}***.${dExt.join(".")}`;
  return `${maskedUser}@${maskedDomain}`;
};

export default function AdminAnalyticsDashboard() {
  const [hours, setHours] = useState(24);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [maskPii, setMaskPii] = useState(true);

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

  // Cálculos do Funil
  const funnel = data?.funnel || {
    landing: 1,
    questoes: 1,
    resolver: 0,
    tentativas: data?.summary?.attempts ?? 0,
    source: "estimated" as const,
  };

  const landingCount = Math.max(funnel.landing, 1);
  const convQuestoes = Math.min(100, Math.round((funnel.questoes / landingCount) * 100));
  const convResolver = Math.min(100, Math.round((funnel.resolver / landingCount) * 100));
  const convTentativas = Math.min(100, Math.round((funnel.tentativas / landingCount) * 100));

  // Diagnóstico do Funil
  let funnelDiagnostic = {
    title: "Coletando Dados Iniciais",
    desc: "Aguardando volume de acessos para diagnóstico probabilístico.",
    color: "text-slate-600 dark:text-slate-400",
    badge: "Aguardando",
  };

  if (funnel.landing > 5) {
    if (convTentativas >= 15) {
      funnelDiagnostic = {
        title: "Ativação Alta (Product-Market Fit Forte)",
        desc: "Mais de 15% dos visitantes concluem resoluções. A proposta de valor está clara e sem atrito.",
        color: "text-emerald-700 dark:text-emerald-400",
        badge: "Excelente",
      };
    } else if (convQuestoes < 30) {
      funnelDiagnostic = {
        title: "Gargalo no Topo do Funil (Landing Page)",
        desc: "Muitos visitantes saem na primeira página sem explorar o acervo. Recomenda-se simplificar a promessa da landing ou direcionar campanhas direto para o Simulado da ESA.",
        color: "text-amber-700 dark:text-amber-400",
        badge: "Atrito na Entrada",
      };
    } else if (convResolver > convTentativas * 3) {
      funnelDiagnostic = {
        title: "Gargalo no Resolvedor / Lousa",
        desc: "Estudantes abrem as questões mas desistem antes de submeter a resposta. Verificar atrito no envio de gabarito ou carregamento em telas mobile.",
        color: "text-rose-700 dark:text-rose-400",
        badge: "Atrito na Resolução",
      };
    } else {
      funnelDiagnostic = {
        title: "Gargalo de Aquisição (Pouco Tráfego)",
        desc: "A taxa de conversão interna está equilibrada, mas o volume total precisa crescer. Divulgue o Simulado da ESA nos grupos-alvo.",
        color: "text-sky-700 dark:text-sky-400",
        badge: "Foco em Aquisição",
      };
    }
  }

  const accuracyRate =
    data?.summary?.attempts && data.summary.attempts > 0
      ? Math.round((data.summary.correctAnswers / data.summary.attempts) * 100)
      : null;

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900 transition-colors duration-200 dark:bg-[#101316] dark:text-[#eceff4] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* NAVEGAÇÃO SUPERIOR E CONTEXTO LEMMAS */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-6 dark:border-white/10">
          <div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300/80 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-[#14171c] dark:text-slate-300 dark:hover:bg-white/5"
              >
                <ArrowLeft size={13} /> Voltar à Plataforma
              </Link>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Telemetria Ativa
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl font-serif">
              Painel de Operações & Funil de Conversão
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
              Monitoramento analítico de visitantes, presença em tempo real e taxas de abandono do LemmaS (MathAI Engine).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setMaskPii(!maskPii)}
              title={maskPii ? "E-mails ofuscados para prints públicos" : "E-mails visíveis"}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm transition ${
                maskPii
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-[#14171c] dark:text-slate-300"
              }`}
            >
              {maskPii ? <EyeOff size={14} /> : <Eye size={14} />}
              {maskPii ? "Privacidade Ativa (Prints)" : "E-mails Visíveis"}
            </button>

            <button
              onClick={() => void refresh()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-[#14171c] dark:text-slate-300 dark:hover:bg-white/5"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Atualizar
            </button>
          </div>
        </header>

        {/* SELETOR DE PERÍODO */}
        <nav aria-label="Período das métricas" className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 bg-slate-200/50 p-1 rounded-xl dark:bg-white/5">
            {windows.map((item) => (
              <button
                key={item.hours}
                onClick={() => setHours(item.hours)}
                aria-pressed={hours === item.hours}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                  hours === item.hours
                    ? "bg-white text-slate-900 shadow-sm dark:bg-[#14171c] dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Filter size={12} />
            <span>Filtro de integridade: Contas de teste (ID 9999) excluídas automaticamente.</span>
          </div>
        </nav>

        {error ? (
          <section role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            <h2 className="font-semibold text-sm">{error.includes("administradora") ? "Acesso administrativo necessário" : "Painel indisponível"}</h2>
            <p className="mt-1 text-xs">{error}</p>
          </section>
        ) : null}

        {/* SEÇÃO PRINCIPAL: FUNIL DE CONVERSÃO E TAXA DE ABANDONO */}
        <section aria-label="Funil de Ativação e Abandono" className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#14171c]">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-amber-600 dark:text-amber-400 font-bold text-sm">📐 FUNIL DE ATIVAÇÃO</span>
                <span className="rounded-full bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                  {funnel.source === "database" ? "Dados Reais da Sessão" : "Base Inicial"}
                </span>
              </div>
              <h2 className="text-lg font-bold font-serif tracking-tight mt-0.5">Jornada do Visitante ao Estudante Ativo</h2>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-1.5 dark:border-white/10 dark:bg-white/5 text-right">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 block">Diagnóstico</span>
              <span className={`text-xs font-bold ${funnelDiagnostic.color}`}>{funnelDiagnostic.badge}</span>
            </div>
          </div>

          {/* AS 4 ETAPAS DO FUNIL */}
          <div className="grid gap-3 sm:grid-cols-4">
            <FunnelStep
              stepNumber="1"
              title="Acessaram o Site"
              subtitle="Visitantes únicos"
              count={funnel.landing}
              percentage={100}
              icon={<Users size={16} />}
              isFirst
            />
            <FunnelStep
              stepNumber="2"
              title="Abriram o Banco"
              subtitle="Interesse no acervo"
              count={funnel.questoes}
              percentage={convQuestoes}
              icon={<Layers size={16} />}
            />
            <FunnelStep
              stepNumber="3"
              title="Abriram Questão"
              subtitle="Iniciaram o estudo"
              count={funnel.resolver}
              percentage={convResolver}
              icon={<MousePointerClick size={16} />}
            />
            <FunnelStep
              stepNumber="4"
              title="Concluíram Tentativa"
              subtitle="Estudo concluído"
              count={funnel.tentativas}
              percentage={convTentativas}
              icon={<CheckCircle2 size={16} />}
              isLast
              isHighlight
            />
          </div>

          {/* DIAGNÓSTICO METODOLÓGICO */}
          <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-white/5 dark:bg-white/[0.02] flex items-start gap-3">
            <Sparkles size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold text-slate-900 dark:text-slate-100">{funnelDiagnostic.title}: </span>
              <span className="text-slate-600 dark:text-slate-400">{funnelDiagnostic.desc}</span>
            </div>
          </div>
        </section>

        {/* MÉTRICAS DE RESUMO */}
        <section aria-label="Resumo do período" className="grid gap-4 sm:grid-cols-3">
          <MetricCard
            icon={<UserCheck size={18} className="text-blue-600 dark:text-blue-400" />}
            label="Estudantes Reais Ativos"
            subtext="Contas únicas com tentativas no período"
            value={data?.summary.activeStudents}
            loading={loading}
          />
          <MetricCard
            icon={<Activity size={18} className="text-emerald-600 dark:text-emerald-400" />}
            label="Resoluções Concluídas"
            subtext="Submissões registradas em banco"
            value={data?.summary.attempts}
            loading={loading}
          />
          <MetricCard
            icon={<TrendingUp size={18} className="text-amber-600 dark:text-amber-400" />}
            label="Taxa de Precisão Global"
            subtext={data?.summary.correctAnswers ? `${data.summary.correctAnswers} acertos de ${data.summary.attempts} questões` : "Sem submissões no período"}
            value={accuracyRate !== null ? `${accuracyRate}%` : "—"}
            loading={loading}
          />
        </section>

        {/* DETALHE: ONLINE AGORA & FEED DE RESOLUÇÕES */}
        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
          {/* ONLINE AGORA (PRESENÇA EM TEMPO REAL) */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#14171c]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold font-serif">Online agora</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Presença detectada nos últimos 2 minutos</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {data?.onlineStudents.length ?? 0}
              </span>
            </div>

            {loading ? <p className="text-xs text-slate-500">Carregando telemetria…</p> : null}
            {!loading && !error && data && data.onlineStudents.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
                Nenhum estudante logado online neste momento.
              </p>
            ) : null}

            <ul className="divide-y divide-slate-100 dark:divide-white/5">
              {data?.onlineStudents.map((student) => (
                <li key={student.studentId} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" aria-label="Online" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">{student.name}</p>
                      <p className="truncate text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {maskEmail(student.email, maskPii)}
                      </p>
                      <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-white/10 dark:text-slate-300">
                        {sectionLabel(student.section)}
                      </span>
                    </div>
                    <span className="shrink-0 text-[11px] text-slate-400">{dateTime(student.lastSeenAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* RESOLUÇÕES RECENTES */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#14171c]">
            <div className="mb-4">
              <h2 className="text-base font-bold font-serif">Resoluções recentes</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Histórico de respostas enviadas no período</p>
            </div>

            {loading ? <p className="text-xs text-slate-500">Carregando resoluções…</p> : null}
            {!loading && !error && data && data.recentAttempts.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
                Nenhuma resolução registrada neste período.
              </p>
            ) : null}

            <ul className="divide-y divide-slate-100 dark:divide-white/5">
              {data?.recentAttempts.map((attempt) => (
                <li key={attempt.attemptId} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{attempt.studentName}</p>
                    <p className="truncate text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      {maskEmail(attempt.studentEmail, maskPii)}
                    </p>
                    <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-medium">Questão #{attempt.questionId}</span> · {attempt.subject} · {attempt.topic}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        attempt.correct
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300"
                      }`}
                    >
                      {attempt.correct ? "Acertou" : "Errou"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock3 size={11} />
                      {dateTime(attempt.occurredAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* NOTA DE GOVERNANÇA */}
        <footer className="text-center text-[11px] text-slate-500 dark:text-slate-500 border-t border-slate-200/60 pt-4 dark:border-white/5">
          LEMMAS Platform Analytics · Desenvolvido com foco em Privacidade (LGPD) e Integridade Epistêmica · MathAI Engine
        </footer>
      </div>
    </main>
  );
}

function FunnelStep({
  stepNumber,
  title,
  subtitle,
  count,
  percentage,
  icon,
  isHighlight = false,
}: {
  stepNumber: string;
  title: string;
  subtitle: string;
  count: number;
  percentage: number;
  icon: React.ReactNode;
  isFirst?: boolean;
  isLast?: boolean;
  isHighlight?: boolean;
}) {
  return (
    <div
      className={`relative rounded-xl border p-4 transition ${
        isHighlight
          ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-950/20"
          : "border-slate-200/80 bg-slate-50/50 dark:border-white/5 dark:bg-white/[0.02]"
      }`}
    >
      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider">Etapa {stepNumber}</span>
        {icon}
      </div>

      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{title}</p>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2">{subtitle}</p>

      <div className="flex items-baseline justify-between mt-3">
        <span className="text-xl font-bold font-mono">{count}</span>
        <span className={`text-xs font-semibold ${percentage >= 50 ? "text-emerald-700 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400"}`}>
          {percentage}%
        </span>
      </div>

      {/* Barra de Progresso Relativo */}
      <div className="mt-2 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden dark:bg-white/10">
        <div
          className={`h-full transition-all duration-500 ${isHighlight ? "bg-emerald-500" : "bg-slate-500 dark:bg-slate-400"}`}
          style={{ width: `${Math.max(percentage, 4)}%` }}
        />
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  subtext,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  subtext: string;
  value?: number | string;
  loading: boolean;
}) {
  return (
    <article className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#14171c]">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-3xl font-bold font-mono tracking-tight">{loading ? "—" : value}</p>
      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{subtext}</p>
    </article>
  );
}
