"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { 
  Target, 
  BrainCircuit, 
  Clock, 
  Sparkles, 
  TrendingUp, 
  BookOpenCheck,
  CalendarClock,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  ShieldAlert,
  ArrowRight
} from "lucide-react";
import { useUserProfile } from "@/lib/use-user";
import LemaBadge from "@/components/math/LemaBadge";
import { MathPreview } from "@/components/math/MathPreview";
import { obterFiltrosApiPerfil } from "@/lib/pedagogical-engine";

interface HistoricoItem {
  id: number;
  data: string;
  questao: string;
  gabarito: string;
  resultado: boolean;
  tempo: string;
  estrategia: string;
  confianca: string;
}

// Objective answers are a single option letter (A–E). Discursive items carry the
// full model resolution (raw LaTeX) in `gabarito`, which must not be shown inline.
function formatGabarito(gabarito: string | null | undefined): string | null {
  const g = (gabarito ?? "").trim();
  return /^[A-Ea-e]$/.test(g) ? g.toUpperCase() : null;
}

// Strips internal tags such as "[veredito=aprovado]" and, when the label is long,
// the trailing parenthetical detail. The full text stays available as a tooltip.
function formatEstrategia(estrategia: string | null | undefined): { label: string; full: string } {
  const full = (estrategia ?? "").trim();
  let label = full.replace(/\s*\[[^\]]*\]\s*/g, " ").trim();
  if (label.length > 22) {
    label = label.replace(/\s*\([^)]*\)\s*$/, "").trim();
  }
  return { label: label || "—", full };
}

interface RevisaoItem {
  questao_id: number;
  materia: string;
  topico: string;
  repeticoes: number;
  intervalo_dias: number;
  status: string;
  cor: string;
  lema_id?: number | null;
  lema_codigo?: string | null;
}

export default function DashboardPage() {
  const { profile, isAuthenticated, loading: userLoading } = useUserProfile();
  // Vitrine: sem número inicial fixo; vem de /api/stats (banco).
  // Enquanto não carregar, exibe "—" — nunca um total antigo.
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [metricas, setMetricas] = useState({
    total_resolvidas: 0,
    taxa_acerto: 0,
    tempo_medio: "0s",
    total_acertos: 0,
    conselho_ia: "",
  });

  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [revisoes, setRevisoes] = useState<RevisaoItem[]>([]);
  const [diagnosticoErros, setDiagnosticoErros] = useState({
    total_erros: 0,
    conta: 0,
    interpretacao: 0,
    lacuna: 0,
  });
  const [radar, setRadar] = useState<Record<string, number>>({
    "Álgebra": 0,
    "Geometria": 0,
    "Trigonometria": 0,
    "Cálculo": 0,
    "Combinatória": 0,
    "Aritmética": 0,
  });

  const [questoesRecomendadas, setQuestoesRecomendadas] = useState<any[]>([]);
  const [loadingRecomendadas, setLoadingRecomendadas] = useState<boolean>(true);

  const origemDescricaoPerfil = useMemo(() => {
    return profile ? obterFiltrosApiPerfil(profile).origemDescricao : null;
  }, [profile]);

  useEffect(() => {
    let ignore = false;
    const profileFilters = obterFiltrosApiPerfil(profile);
    const hasFilters = !!(
      (profileFilters.materia && profileFilters.materia.length > 0) ||
      (profileFilters.banca && profileFilters.banca.length > 0) ||
      profileFilters.categoria_banca
    );

    setLoadingRecomendadas(true);
    fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(hasFilters ? { filters: profileFilters } : {}),
        limit: 3,
        shuffle: true,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!ignore && data?.questoes) {
          setQuestoesRecomendadas(data.questoes);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setLoadingRecomendadas(false);
      });

    return () => {
      ignore = true;
    };
  }, [profile?.id, profile?.objetivoPrincipal, profile?.conteudosSelecionados, profile?.concursosSelecionados]);

  useEffect(() => {
    fetch("/api/stats", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.total_questoes === "number") {
          setTotalQuestions(data.total_questoes);
        }
      })
      .catch(() => {});

    // Se estiver autenticado, usa profile.id. Se visitante, usa 9999 (ou padrão)
    const alunoIdQuery = profile.id ? `?aluno_id=${profile.id}` : "?aluno_id=9999";

    fetch(`/api/dashboard/metrics${alunoIdQuery}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.total_resolvidas !== undefined) {
          setMetricas({
            total_resolvidas: data.total_resolvidas,
            taxa_acerto: data.taxa_acerto,
            tempo_medio: data.tempo_medio,
            total_acertos: data.total_acertos ?? 0,
            conselho_ia: data.conselho_ia || "",
          });

          if (Array.isArray(data.historico)) {
            setHistorico(data.historico);
          }
          if (Array.isArray(data.revisoes)) {
            setRevisoes(data.revisoes);
          }
          if (data.diagnostico_erros) {
            setDiagnosticoErros(data.diagnostico_erros);
          }
          if (data.radar) {
            setRadar(data.radar);
          }
        }
      })
      .catch(() => {});
  }, [profile.id]);

  // Cálculos geométricos do Radar SVG (viewBox="0 0 460 300")
  const cx = 230;
  const cy = 150;
  const maxR = 90;

  // Função auxiliar para calcular coordenadas de um percentual (0 a 100) em cada vértice
  const getRadarPoint = (percent: number, index: number) => {
    // Para visualização clara, se o aluno ainda não resolveu, mantém um valor base de calibração sutil
    const r = (Math.max(0, Math.min(100, percent)) / 100) * maxR;
    switch (index) {
      case 0: // Álgebra (Top)
        return { x: cx, y: cy - r };
      case 1: // Geometria (Top-Right: 30° acima do eixo horizontal)
        return { x: cx + r * 0.866, y: cy - r * 0.5 };
      case 2: // Trigonometria (Bottom-Right: 30° abaixo do eixo horizontal)
        return { x: cx + r * 0.866, y: cy + r * 0.5 };
      case 3: // Cálculo (Bottom)
        return { x: cx, y: cy + r };
      case 4: // Combinatória (Bottom-Left: 30° abaixo do eixo horizontal)
        return { x: cx - r * 0.866, y: cy + r * 0.5 };
      case 5: // Aritmética (Top-Left: 30° acima do eixo horizontal)
        return { x: cx - r * 0.866, y: cy - r * 0.5 };
      default:
        return { x: cx, y: cy };
    }
  };

  const pAlgebra = radar["Álgebra"] || 0;
  const pGeometria = radar["Geometria"] || 0;
  const pTrigonometria = radar["Trigonometria"] || 0;
  const pCalculo = radar["Cálculo"] || 0;
  const pCombinatoria = radar["Combinatória"] || 0;
  const pAritmetica = radar["Aritmética"] || 0;

  const hasAnyData = metricas.total_resolvidas > 0;
  // Se não houver dados, plota um hexágono base sutil de 25% com tracejado para guiar o estudante
  const radarPointsString = hasAnyData
    ? [
        getRadarPoint(pAlgebra, 0),
        getRadarPoint(pGeometria, 1),
        getRadarPoint(pTrigonometria, 2),
        getRadarPoint(pCalculo, 3),
        getRadarPoint(pCombinatoria, 4),
        getRadarPoint(pAritmetica, 5),
      ]
        .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
        .join(" ")
    : [
        getRadarPoint(25, 0),
        getRadarPoint(25, 1),
        getRadarPoint(25, 2),
        getRadarPoint(25, 3),
        getRadarPoint(25, 4),
        getRadarPoint(25, 5),
      ]
        .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
        .join(" ");

  return (
    <div className="space-y-8 animate-fadeIn lemmas-dashboard-root lemmas-stagger-group text-[var(--ink-primary)]">
      {/* BANNER INFORMATIVO PARA VISITANTES (DESLOGADOS) */}
      {!isAuthenticated && !userLoading && (
        <div className="rounded-2xl border border-[var(--marker-amber-border)] bg-[var(--marker-amber-dim)] p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--marker-amber-dim)] border border-[var(--marker-amber-border)] text-[var(--marker-amber)] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-[var(--ink-primary)]">
                Modo de Exploração Livre (Visitante)
              </h4>
              <p className="text-xs text-[var(--ink-secondary)] mt-0.5">
                Faça login ou crie sua conta para registrar suas resoluções, calcular métricas e ativar a repetição espaçada personalizada.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl lemmas-gold-cta font-bold text-xs shadow-sm hover:scale-[1.02] transition-transform"
            >
              Fazer Login
            </Link>
            <Link
              href="/login?tab=signup"
              className="px-3.5 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] text-xs font-semibold transition-colors"
            >
              Criar Conta
            </Link>
          </div>
        </div>
      )}

      {/* 1. HERO BANNER EDITORIAL LEMMAS */}
      <div className="lemmas-hero-banner relative rounded-3xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 md:p-10 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--marker-blue-dim)] dark:bg-[var(--marker-amber-dim)] border border-[var(--marker-blue-border)] dark:border-[var(--marker-amber-border)] text-xs font-semibold text-[var(--marker-blue)] dark:text-[var(--marker-amber)]">
              <Sparkles className="w-3.5 h-3.5 text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" />
              <span>Workspace Cognitivo · LEMMAS Core & MathAI</span>
            </div>
            <h1 className="font-serif-math text-3xl md:text-4xl font-normal text-[var(--ink-primary)] tracking-tight">
              Painel de Desempenho & Metacognição.
            </h1>
            <p className="text-sm md:text-base text-[var(--ink-secondary)] leading-relaxed font-sans">
              <span className="font-semibold text-[var(--ink-primary)]">Domínio progressivo de lemas e padrões de prova por repetição espaçada.</span>{" "}
              {revisoes.length > 0
                ? `O algoritmo SuperMemo-2 do LEMMAS Core mapeou ${revisoes.length} revisão(ões) prioritária(s) hoje para calibrar seu repertório axiomático e analítico.`
                : "Seu repertório está calibrado e em dia. Resolva novas questões no Iniciar Treino para alimentar seus ciclos de revisão espaçada SM-2."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/resolver"
              className="lemmas-gold-cta inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm shadow-md hover:scale-[1.02] transition-transform"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Iniciar Treino</span>
            </Link>
            <Link
              href="/questoes"
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] text-sm font-semibold transition-colors shadow-sm"
            >
              <span>Explorar Questões ({totalQuestions > 0 ? totalQuestions.toLocaleString("pt-BR") : "—"})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. KPIS COM DESIGN EDITORIAL E DADOS REAIS */}
      <div className="lemmas-kpi-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Aproveitamento */}
        <div className="lemmas-kpi-card bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-sm relative z-10 hover:border-[var(--border-default)] transition-colors">
          <div className="flex items-center justify-between text-[var(--ink-secondary)] mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-secondary)]">Aproveitamento</span>
            <div className="w-8 h-8 rounded-lg bg-[var(--marker-green-dim)] text-[var(--marker-green)] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono tabular-nums text-3xl font-bold text-[var(--ink-primary)]">
            {metricas.total_resolvidas > 0 ? `${metricas.taxa_acerto}%` : "—"}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)] mt-2 font-medium">
            {metricas.total_resolvidas > 0 ? (
              <span className="text-[var(--marker-green)] font-semibold">
                {metricas.total_acertos} acerto(s) em {metricas.total_resolvidas} tentativa(s)
              </span>
            ) : (
              <span>Inicie seu primeiro treino para registrar métricas</span>
            )}
          </div>
        </div>

        {/* KPI 2: Total Resolvidas */}
        <div className="lemmas-kpi-card bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-sm relative z-10 hover:border-[var(--border-default)] transition-colors">
          <div className="flex items-center justify-between text-[var(--ink-secondary)] mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-secondary)]">Total Resolvidas</span>
            <div className="w-8 h-8 rounded-lg bg-[var(--marker-blue-dim)] text-[var(--marker-blue)] dark:bg-[var(--marker-amber-dim)] dark:text-[var(--marker-amber)] flex items-center justify-center">
              <BookOpenCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono tabular-nums text-3xl font-bold text-[var(--ink-primary)]">
            {metricas.total_resolvidas}
          </div>
          <div className="text-xs text-[var(--ink-muted)] mt-2">
            {metricas.total_resolvidas > 0 
              ? `${metricas.total_acertos} acertos confirmados` 
              : "Nenhuma questão resolvida ainda"}
          </div>
        </div>

        {/* KPI 3: Tempo Médio */}
        <div className="lemmas-kpi-card bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-sm relative z-10 hover:border-[var(--border-default)] transition-colors">
          <div className="flex items-center justify-between text-[var(--ink-secondary)] mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-secondary)]">Tempo Médio</span>
            <div className="w-8 h-8 rounded-lg bg-[var(--marker-blue-dim)] text-[var(--marker-blue)] dark:bg-[var(--marker-amber-dim)] dark:text-[var(--marker-amber)] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono tabular-nums text-3xl font-bold text-[var(--marker-blue)] dark:text-[var(--marker-amber)]">
            {metricas.total_resolvidas > 0 ? metricas.tempo_medio : "—"}
          </div>
          <div className="text-xs text-[var(--ink-muted)] mt-2">
            {metricas.total_resolvidas > 0 ? "Média por resolução" : "Calculado após o primeiro treino"}
          </div>
        </div>

        {/* KPI 4: Acervo de Questões */}
        <div className="lemmas-kpi-card bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-sm relative z-10 hover:border-[var(--border-default)] transition-colors">
          <div className="flex items-center justify-between text-[var(--ink-secondary)] mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-secondary)]">Acervo de Questões</span>
            <div className="w-8 h-8 rounded-lg bg-[var(--marker-blue-dim)] text-[var(--marker-blue)] dark:bg-[var(--marker-amber-dim)] dark:text-[var(--marker-amber)] flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono tabular-nums text-3xl font-bold text-[var(--ink-primary)]">
            {totalQuestions > 0 ? totalQuestions.toLocaleString("pt-BR") : "—"}
          </div>
          <div className="text-xs text-[var(--ink-muted)] mt-2">
            Questões indexadas no LEMMAS Core
          </div>
        </div>
      </div>

      {/* 2.5. QUESTÕES RECOMENDADAS PARA O SEU PERFIL */}
      <div className="lemmas-surface-card bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm relative z-10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-serif-math text-base md:text-lg font-semibold text-[var(--ink-primary)] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" />
              Questões Recomendadas para o seu Perfil
            </h2>
            <p className="text-xs text-[var(--ink-secondary)]">
              {origemDescricaoPerfil
                ? `Selecionadas a partir do seu foco em ${origemDescricaoPerfil}`
                : "Sugestões de treino calibradas para o seu objetivo matemático"}
            </p>
          </div>
          <Link
            href="/questoes"
            className="text-xs text-[var(--marker-blue)] dark:text-[var(--marker-amber)] hover:underline font-semibold flex items-center gap-1 self-start sm:self-auto"
          >
            Explorar todo o acervo →
          </Link>
        </div>

        {loadingRecomendadas ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] animate-pulse h-36 flex flex-col justify-between"
              >
                <div className="h-4 bg-[var(--bg-subtle)] rounded w-1/3" />
                <div className="space-y-2">
                  <div className="h-3 bg-[var(--bg-subtle)] rounded w-full" />
                  <div className="h-3 bg-[var(--bg-subtle)] rounded w-2/3" />
                </div>
                <div className="h-6 bg-[var(--bg-subtle)] rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : questoesRecomendadas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {questoesRecomendadas.map((q) => {
              return (
                <div
                  key={q.id}
                  className="lemmas-question-item p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex flex-col justify-between hover:border-[var(--border-default)] transition-colors group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-[var(--marker-blue)] dark:text-[var(--marker-amber)] truncate">
                        {q.banca ? `${q.banca}${q.ano ? ` ${q.ano}` : ""}` : (q.materia || "Matemática")}
                      </span>
                      {q.dificuldade ? (
                        <span className="text-[10px] font-mono tabular-nums font-medium px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--ink-secondary)] shrink-0">
                          Nível {q.dificuldade}/5
                        </span>
                      ) : null}
                    </div>

                    <div className="text-[11px] font-semibold text-[var(--ink-primary)]">
                      {q.topico || q.materia}
                    </div>

                    <div className="text-xs text-[var(--ink-secondary)] max-h-28 overflow-hidden leading-relaxed">
                      <MathPreview text={q.enunciado || ""} />
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
                    <span className="text-[10px] text-[var(--ink-muted)] font-mono tabular-nums">
                      #{q.id}
                    </span>
                    <Link
                      href={`/resolver?id=${q.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--marker-blue)] dark:text-[var(--marker-amber)] hover:underline group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>Resolver agora</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-xl border border-dashed border-[var(--border-default)] text-center space-y-2">
            <p className="text-xs font-semibold text-[var(--ink-primary)]">
              Personalize seu perfil para receber recomendações exclusivas
            </p>
            <p className="text-[11px] text-[var(--ink-secondary)]">
              Defina seu objetivo e matérias prioritárias no seu perfil pedagógico.
            </p>
            <Link
              href="/perfil"
              className="lemmas-gold-cta inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors"
            >
              Configurar Perfil
            </Link>
          </div>
        )}
      </div>

      {/* 3. RADAR COGNITIVO VETORIAL DOURADO + DIAGNÓSTICO METACONCEITUAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* RADAR COGNITIVO SVG COM VIEWBOX AMPLO (460x300) - ZERO OVERFLOW */}
        <div className="lg:col-span-7 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif-math text-base md:text-lg font-semibold text-[var(--ink-primary)] flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" />
                Radar de Domínio Matemático
              </h2>
              <p className="text-xs text-[var(--ink-secondary)]">
                Taxa de domínio calculada pelo LEMMAS Core por matéria
              </p>
            </div>
            <span className="text-xs font-semibold text-[var(--marker-blue)] dark:text-[var(--marker-amber)] bg-[var(--marker-blue-dim)] border border-[var(--marker-blue-border)] dark:bg-[var(--marker-amber-dim)] dark:border-[var(--marker-amber-border)] px-2.5 py-1 rounded-full">
              Tempo Real
            </span>
          </div>

          {/* GRÁFICO RADAR SVG VETORIAL DOURADO/ÂMBAR RECALIBRADO */}
          <div className="w-full flex items-center justify-center py-2 overflow-hidden">
            <svg viewBox="0 0 460 300" className="w-full max-w-lg h-auto select-none">
              {/* Eixos e Polígonos de Fundo (Hexágonos a 100%, 66% e 33%) */}
              <polygon 
                points="230,60 308,105 308,195 230,240 152,195 152,105" 
                fill="none" 
                stroke="currentColor" 
                strokeOpacity="0.08" 
                strokeWidth="1" 
              />
              <polygon 
                points="230,90 282,120 282,180 230,210 178,180 178,120" 
                fill="none" 
                stroke="currentColor" 
                strokeOpacity="0.12" 
                strokeWidth="1" 
              />
              <polygon 
                points="230,120 256,135 256,165 230,180 204,165 204,135" 
                fill="none" 
                stroke="currentColor" 
                strokeOpacity="0.15" 
                strokeWidth="1" 
              />
              
              {/* Linhas radiais do centro aos vértices */}
              <line x1="230" y1="150" x2="230" y2="60" stroke="currentColor" strokeOpacity="0.12" strokeDasharray="3 3" />
              <line x1="230" y1="150" x2="308" y2="105" stroke="currentColor" strokeOpacity="0.12" strokeDasharray="3 3" />
              <line x1="230" y1="150" x2="308" y2="195" stroke="currentColor" strokeOpacity="0.12" strokeDasharray="3 3" />
              <line x1="230" y1="150" x2="230" y2="240" stroke="currentColor" strokeOpacity="0.12" strokeDasharray="3 3" />
              <line x1="230" y1="150" x2="152" y2="195" stroke="currentColor" strokeOpacity="0.12" strokeDasharray="3 3" />
              <line x1="230" y1="150" x2="152" y2="105" stroke="currentColor" strokeOpacity="0.12" strokeDasharray="3 3" />

              {/* Polígono de Desempenho do Aluno em Azul no Light e Dourado no Dark */}
              <polygon 
                points={radarPointsString} 
                className={`${hasAnyData ? "fill-[var(--marker-blue-dim)] stroke-[var(--marker-blue)] dark:fill-[var(--marker-amber-dim)] dark:stroke-[var(--marker-amber)]" : "fill-[var(--marker-blue)]/5 stroke-[var(--marker-blue)]/30 dark:fill-[var(--marker-amber)]/5 dark:stroke-[var(--marker-amber)]/30 stroke-dash-2"}`}
                strokeWidth="2.5" 
                strokeDasharray={hasAnyData ? undefined : "4 4"}
              />

              {/* Vértices em Ouro (se houver dados reais) */}
              {hasAnyData && (
                <>
                  <circle cx={getRadarPoint(pAlgebra, 0).x} cy={getRadarPoint(pAlgebra, 0).y} r="4" className="fill-[var(--marker-blue)] dark:fill-[var(--marker-amber)]" />
                  <circle cx={getRadarPoint(pGeometria, 1).x} cy={getRadarPoint(pGeometria, 1).y} r="4" className="fill-[var(--marker-blue)] dark:fill-[var(--marker-amber)]" />
                  <circle cx={getRadarPoint(pTrigonometria, 2).x} cy={getRadarPoint(pTrigonometria, 2).y} r="4" className="fill-[var(--marker-blue)] dark:fill-[var(--marker-amber)]" />
                  <circle cx={getRadarPoint(pCalculo, 3).x} cy={getRadarPoint(pCalculo, 3).y} r="4" className="fill-[var(--marker-blue)] dark:fill-[var(--marker-amber)]" />
                  <circle cx={getRadarPoint(pCombinatoria, 4).x} cy={getRadarPoint(pCombinatoria, 4).y} r="4" className="fill-[var(--marker-blue)] dark:fill-[var(--marker-amber)]" />
                  <circle cx={getRadarPoint(pAritmetica, 5).x} cy={getRadarPoint(pAritmetica, 5).y} r="4" className="fill-[var(--marker-blue)] dark:fill-[var(--marker-amber)]" />
                </>
              )}

              {/* Rótulos dos vértices posicionados com folga total (sem corte nas bordas) */}
              <text x="230" y="38" textAnchor="middle" className="text-[11px] font-semibold fill-[var(--ink-secondary)]">
                Álgebra ({pAlgebra}%)
              </text>
              <text x="322" y="105" textAnchor="start" dominantBaseline="middle" className="text-[11px] font-semibold fill-[var(--ink-secondary)]">
                Geometria ({pGeometria}%)
              </text>
              <text x="322" y="195" textAnchor="start" dominantBaseline="middle" className="text-[11px] font-semibold fill-[var(--ink-secondary)]">
                Trigonometria ({pTrigonometria}%)
              </text>
              <text x="230" y="265" textAnchor="middle" className="text-[11px] font-semibold fill-[var(--ink-secondary)]">
                Cálculo ({pCalculo}%)
              </text>
              <text x="138" y="195" textAnchor="end" dominantBaseline="middle" className="text-[11px] font-semibold fill-[var(--ink-secondary)]">
                Combinatória ({pCombinatoria}%)
              </text>
              <text x="138" y="105" textAnchor="end" dominantBaseline="middle" className="text-[11px] font-semibold fill-[var(--ink-secondary)]">
                Aritmética ({pAritmetica}%)
              </text>
            </svg>
          </div>

          {!hasAnyData && (
            <p className="text-center text-[11px] text-[var(--ink-muted)] italic">
              Resolva questões para calibrar seu mapa de competências por matéria.
            </p>
          )}
        </div>

        {/* DIAGNÓSTICO METACONCEITUAL & ERROS */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm relative z-10 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[var(--marker-amber)]" />
              <h3 className="font-serif-math font-semibold text-[var(--ink-primary)] text-base">
                Diagnóstico de Padrões de Erro
              </h3>
            </div>
            
            <p className="text-xs text-[var(--ink-secondary)]">
              Classificação automatizada dos desvios nas resoluções passadas:
            </p>

            {diagnosticoErros.total_erros > 0 ? (
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-[var(--ink-secondary)]">Conta, Álgebra & Sinal</span>
                    <span className="text-[var(--marker-red)] font-mono tabular-nums font-bold">{diagnosticoErros.conta}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                    <div className="h-full bg-[var(--marker-red)] rounded-full" style={{ width: `${diagnosticoErros.conta}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-[var(--ink-secondary)]">Interpretação do Enunciado</span>
                    <span className="text-[var(--marker-amber)] font-mono tabular-nums font-bold">{diagnosticoErros.interpretacao}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                    <div className="h-full bg-[var(--marker-amber)] rounded-full" style={{ width: `${diagnosticoErros.interpretacao}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-[var(--ink-secondary)]">Lacuna Conceitual / Teorema</span>
                    <span className="text-[var(--marker-blue)] dark:text-[var(--marker-amber)] font-mono tabular-nums font-bold">{diagnosticoErros.lacuna}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                    <div className="h-full bg-[var(--marker-blue)] dark:bg-[var(--marker-amber)] rounded-full" style={{ width: `${diagnosticoErros.lacuna}%` }} />
                  </div>
                </div>
              </div>
            ) : hasAnyData ? (
              <div className="p-4 rounded-xl border border-[var(--marker-green-border)] bg-[var(--marker-green-dim)] text-center space-y-1.5">
                <CheckCircle2 className="w-5 h-5 text-[var(--marker-green)] mx-auto" />
                <p className="text-xs font-bold text-[var(--marker-green)]">100% de Precisão!</p>
                <p className="text-[11px] text-[var(--ink-secondary)]">
                  Nenhum desvio ou erro foi registrado nas suas resoluções até agora. A MathAI monitorará passagens mais complexas nos treinos avançados.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-[var(--border-default)] text-center space-y-1.5">
                <p className="text-xs font-semibold text-[var(--ink-primary)]">Sem erros registrados</p>
                <p className="text-[11px] text-[var(--ink-muted)]">
                  A MathAI Engine analisará automaticamente seus padrões de resposta assim que você submeter suas primeiras soluções.
                </p>
              </div>
            )}

            {/* INSIGHT SOCRÁTICO DA MATHAI */}
            <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs space-y-1.5 mt-4">
              <div className="font-semibold text-[var(--marker-blue)] dark:text-[var(--marker-amber)] flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" />
                Conselho da MathAI Engine:
              </div>
              <p className="text-[var(--ink-secondary)] leading-relaxed text-[11px]">
                {metricas.conselho_ia || (hasAnyData
                  ? (metricas.taxa_acerto <= 60
                      ? `Aproveitamento em fase de calibração (${metricas.taxa_acerto}%). Recomendamos revisar com calma o passo a passo na Lousa de Rascunho antes de assinalar as alternativas.`
                      : "Sua precisão atual está consolidada. Revise o passo a passo com rigor axiomático antes de assinalar alternativas para manter o streak ativo.")
                  : "Comece seu treino com questões da EFOMM, CEDERJ ou ESA para calibrar seu nível inicial no LEMMAS Core.")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. REPETIÇÃO ESPAÇADA (SM-2) & HISTÓRICO RECENTE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* REPETIÇÃO ESPAÇADA */}
        <div className="lg:col-span-5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" />
              <h3 className="font-serif-math font-semibold text-[var(--ink-primary)] text-base">
                Fila de Revisão Espaçada (SM-2)
              </h3>
            </div>
            <span className="text-xs font-mono tabular-nums font-semibold px-2 py-0.5 rounded bg-[var(--marker-blue-dim)] text-[var(--marker-blue)] dark:bg-[var(--marker-amber-dim)] dark:text-[var(--marker-amber)]">
              {revisoes.length} Pendente{revisoes.length === 1 ? "" : "s"}
            </span>
          </div>

          <p className="text-xs text-[var(--ink-secondary)]">
            Lemas e problemas reintroduzidos pelo algoritmo no limiar ideal da curva de retenção:
          </p>

          <div className="space-y-3 pt-1">
            {revisoes.length > 0 ? (
              revisoes.map((r, i) => (
                <div 
                  key={i}
                  className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex items-center justify-between gap-3 hover:border-[var(--border-default)] transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <LemaBadge lemaCodigo={r.lema_codigo} lemaId={r.lema_id || r.questao_id} variant="pill" />
                    </div>
                    <div className="text-[11px] text-[var(--ink-secondary)] pl-1">
                      {r.materia === "Matemática" || r.materia === "Geral" ? "Matemática Básica" : r.materia} • {r.topico === "Geral" || !r.topico ? "Conceitos Fundamentais" : r.topico} (Ciclo #{r.repeticoes})
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-md border ${r.cor}`}>
                      {r.status}
                    </span>
                    <Link
                      href={`/resolver?id=${r.questao_id}`}
                      className="lemmas-gold-cta p-1.5 rounded-lg font-bold hover:scale-105 transition-transform"
                      title="Resolver agora"
                    >
                      <Play className="w-3 h-3 fill-current" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 rounded-xl border border-dashed border-[var(--border-default)] text-center space-y-2">
                <CheckCircle2 className="w-6 h-6 text-[var(--marker-green)] mx-auto" />
                <p className="text-xs font-semibold text-[var(--ink-primary)]">Repertório em Dia</p>
                <p className="text-[11px] text-[var(--ink-secondary)]">
                  Nenhuma revisão prioritária pendente no momento. As questões resolvidas serão agendadas pelo algoritmo SM-2 na curva ideal de retenção.
                </p>
                <Link
                  href="/resolver"
                  className="lemmas-gold-cta inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors"
                >
                  <Play className="w-3 h-3 fill-current" />
                  Resolver Novas Questões
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* HISTÓRICO DE RESOLUÇÕES */}
        <div className="lg:col-span-7 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" />
              <h3 className="font-serif-math font-semibold text-[var(--ink-primary)] text-base">
                Histórico Recente de Resoluções
              </h3>
            </div>
            <Link href="/resolver" className="text-xs text-[var(--marker-blue)] dark:text-[var(--marker-amber)] hover:underline font-semibold">
              Ver todas →
            </Link>
          </div>

          <div className="overflow-x-auto">
            {historico.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--ink-muted)] uppercase tracking-wider text-[10px]">
                    <th className="pb-2.5 pr-4 font-semibold whitespace-nowrap">Momento</th>
                    <th className="pb-2.5 pr-4 font-semibold">Questão & Assunto</th>
                    <th className="pb-2.5 pr-4 font-semibold whitespace-nowrap">Resultado</th>
                    <th className="pb-2.5 pr-4 font-semibold whitespace-nowrap">Tempo</th>
                    <th className="pb-2.5 font-semibold whitespace-nowrap">Estratégia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {historico.map((h, i) => {
                    const letra = formatGabarito(h.gabarito);
                    const estrategia = formatEstrategia(h.estrategia);
                    return (
                      <tr key={h.id ?? i} className="hover:bg-[var(--bg-elevated)] transition-colors">
                        <td className="py-3 pr-4 align-middle whitespace-nowrap text-[var(--ink-muted)] font-mono tabular-nums text-[11px]">{h.data}</td>
                        <td className="py-3 pr-4 align-middle font-medium text-[var(--ink-primary)]">{h.questao}</td>
                        <td className="py-3 pr-4 align-middle whitespace-nowrap">
                          {h.resultado ? (
                            <span className="inline-flex items-center gap-1 text-[var(--marker-green)] font-semibold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Acertou{letra ? ` (${letra})` : ""}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[var(--marker-red)] font-semibold text-[11px]">
                              <XCircle className="w-3.5 h-3.5 shrink-0" /> Errou
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4 align-middle whitespace-nowrap font-mono tabular-nums text-[var(--ink-secondary)]">{h.tempo}</td>
                        <td className="py-3 align-middle">
                          <span
                            title={estrategia.full}
                            className="inline-block whitespace-nowrap px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--ink-secondary)] text-[10px] font-medium border border-[var(--border-subtle)]"
                          >
                            {estrategia.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-8 rounded-xl border border-dashed border-[var(--border-default)] text-center space-y-2">
                <BookOpenCheck className="w-6 h-6 text-[var(--marker-blue)] dark:text-[var(--marker-amber)] mx-auto" />
                <p className="text-xs font-semibold text-[var(--ink-primary)]">
                  Nenhuma resolução recente registrada
                </p>
                <p className="text-[11px] text-[var(--ink-muted)]">
                  Suas tentativas cronometradas e diagnósticos cognitivos da MathAI aparecerão aqui assim que você iniciar os treinos.
                </p>
                <Link
                  href="/resolver"
                  className="lemmas-gold-cta inline-flex items-center gap-1.5 mt-2 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-colors"
                >
                  <Play className="w-3 h-3 fill-current" />
                  Iniciar Treino Agora
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
