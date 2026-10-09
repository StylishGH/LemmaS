"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

interface RevisaoItem {
  questao_id: number;
  materia: string;
  topico: string;
  repeticoes: number;
  intervalo_dias: number;
  status: string;
  cor: string;
}

export default function DashboardPage() {
  const { profile, isAuthenticated } = useUserProfile();
  const [totalQuestions, setTotalQuestions] = useState<number>(288);
  const [metricas, setMetricas] = useState({
    total_resolvidas: 0,
    taxa_acerto: 0,
    tempo_medio: "0s",
    total_acertos: 0
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

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        if (data.total_questions) setTotalQuestions(data.total_questions);
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
    <div className="space-y-8 animate-fadeIn text-slate-800 dark:text-[#f5f0df]">
      {/* BANNER INFORMATIVO PARA VISITANTES (DESLOGADOS) */}
      {!isAuthenticated && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 dark:text-[#d9b452] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-[#f5f0df]">
                Modo de Exploração Livre (Visitante)
              </h4>
              <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">
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
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#18152b] border border-slate-300 dark:border-amber-500/25 text-slate-700 dark:text-[#dedbd0] hover:bg-slate-50 dark:hover:bg-[#201c38] text-xs font-semibold transition-colors"
            >
              Criar Conta
            </Link>
          </div>
        </div>
      )}

      {/* 1. HERO BANNER EDITORIAL LEMMAS */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200/80 dark:border-amber-500/20 bg-gradient-to-br from-white via-slate-50 to-amber-50/20 dark:from-[#141224] dark:via-[#110f1e] dark:to-[#0e0d18] p-8 md:p-10 shadow-sm dark:shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-xs font-semibold text-amber-700 dark:text-[#d9b452]">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Workspace Cognitivo · LEMMAS Core & MathAI</span>
            </div>
            <h1 className="font-serif-math text-3xl md:text-4xl font-normal text-slate-900 dark:text-[#f5f0df] tracking-tight">
              Painel de Desempenho & Metacognição.
            </h1>
            <p className="text-sm md:text-base text-slate-600 dark:text-zinc-400 leading-relaxed font-sans">
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
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white dark:bg-[#18152b] border border-slate-300 dark:border-amber-500/20 text-slate-700 dark:text-[#dedbd0] hover:bg-slate-50 dark:hover:bg-[#201c38] text-sm font-semibold transition-colors shadow-sm"
            >
              <span>Explorar Lemas ({totalQuestions})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. KPIS COM DESIGN EDITORIAL E DADOS REAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Aproveitamento */}
        <div className="bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 rounded-2xl p-5 shadow-sm hover:border-amber-500/35 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Aproveitamento</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif-math text-3xl font-bold text-slate-900 dark:text-[#f5f0df]">
            {metricas.total_resolvidas > 0 ? `${metricas.taxa_acerto}%` : "—"}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 mt-2 font-medium">
            {metricas.total_resolvidas > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {metricas.total_acertos} acerto(s) em {metricas.total_resolvidas} tentativa(s)
              </span>
            ) : (
              <span>Inicie seu primeiro treino para registrar métricas</span>
            )}
          </div>
        </div>

        {/* KPI 2: Total Resolvidas */}
        <div className="bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 rounded-2xl p-5 shadow-sm hover:border-amber-500/35 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Total Resolvidas</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-[#d9b452] flex items-center justify-center">
              <BookOpenCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif-math text-3xl font-bold text-slate-900 dark:text-[#f5f0df]">
            {metricas.total_resolvidas}
          </div>
          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            {metricas.total_resolvidas > 0 
              ? `${metricas.total_acertos} acertos confirmados` 
              : "Nenhuma questão resolvida ainda"}
          </div>
        </div>

        {/* KPI 3: Tempo Médio */}
        <div className="bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 rounded-2xl p-5 shadow-sm hover:border-amber-500/35 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Tempo Médio</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-[#d9b452] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif-math text-3xl font-bold text-amber-600 dark:text-[#d9b452]">
            {metricas.total_resolvidas > 0 ? metricas.tempo_medio : "—"}
          </div>
          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            {metricas.total_resolvidas > 0 ? "Média por resolução" : "Calculado após o primeiro treino"}
          </div>
        </div>

        {/* KPI 4: Acervo de Lemas */}
        <div className="bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 rounded-2xl p-5 shadow-sm hover:border-amber-500/35 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Acervo de Lemas</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-[#d9b452] flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif-math text-3xl font-bold text-slate-900 dark:text-[#f5f0df]">
            {totalQuestions}
          </div>
          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            Questões indexadas no LEMMAS Core
          </div>
        </div>
      </div>

      {/* 3. RADAR COGNITIVO VETORIAL DOURADO + DIAGNÓSTICO METACONCEITUAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* RADAR COGNITIVO SVG COM VIEWBOX AMPLO (460x300) - ZERO OVERFLOW */}
        <div className="lg:col-span-7 bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif-math text-base md:text-lg font-semibold text-slate-900 dark:text-[#f5f0df] flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-amber-600 dark:text-[#d9b452]" />
                Radar de Domínio Matemático
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Taxa de domínio calculada pelo LEMMAS Core por matéria
              </p>
            </div>
            <span className="text-xs font-semibold text-amber-700 dark:text-[#d9b452] bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-full">
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

              {/* Polígono de Desempenho do Aluno em Dourado/Âmbar */}
              <polygon 
                points={radarPointsString} 
                className={`${hasAnyData ? "fill-amber-500/20 stroke-[#d9b452] dark:stroke-[#e1bb55]" : "fill-amber-500/5 stroke-amber-500/30 stroke-dash-2"}`}
                strokeWidth="2.5" 
                strokeDasharray={hasAnyData ? undefined : "4 4"}
              />

              {/* Vértices em Ouro (se houver dados reais) */}
              {hasAnyData && (
                <>
                  <circle cx={getRadarPoint(pAlgebra, 0).x} cy={getRadarPoint(pAlgebra, 0).y} r="4" className="fill-[#d9b452]" />
                  <circle cx={getRadarPoint(pGeometria, 1).x} cy={getRadarPoint(pGeometria, 1).y} r="4" className="fill-[#d9b452]" />
                  <circle cx={getRadarPoint(pTrigonometria, 2).x} cy={getRadarPoint(pTrigonometria, 2).y} r="4" className="fill-[#d9b452]" />
                  <circle cx={getRadarPoint(pCalculo, 3).x} cy={getRadarPoint(pCalculo, 3).y} r="4" className="fill-[#d9b452]" />
                  <circle cx={getRadarPoint(pCombinatoria, 4).x} cy={getRadarPoint(pCombinatoria, 4).y} r="4" className="fill-[#d9b452]" />
                  <circle cx={getRadarPoint(pAritmetica, 5).x} cy={getRadarPoint(pAritmetica, 5).y} r="4" className="fill-[#d9b452]" />
                </>
              )}

              {/* Rótulos dos vértices posicionados com folga total (sem corte nas bordas) */}
              <text x="230" y="38" textAnchor="middle" className="text-[11px] font-semibold fill-slate-700 dark:fill-zinc-300">
                Álgebra ({pAlgebra}%)
              </text>
              <text x="322" y="105" textAnchor="start" dominantBaseline="middle" className="text-[11px] font-semibold fill-slate-700 dark:fill-zinc-300">
                Geometria ({pGeometria}%)
              </text>
              <text x="322" y="195" textAnchor="start" dominantBaseline="middle" className="text-[11px] font-semibold fill-slate-700 dark:fill-zinc-300">
                Trigonometria ({pTrigonometria}%)
              </text>
              <text x="230" y="265" textAnchor="middle" className="text-[11px] font-semibold fill-slate-700 dark:fill-zinc-300">
                Cálculo ({pCalculo}%)
              </text>
              <text x="138" y="195" textAnchor="end" dominantBaseline="middle" className="text-[11px] font-semibold fill-slate-700 dark:fill-zinc-300">
                Combinatória ({pCombinatoria}%)
              </text>
              <text x="138" y="105" textAnchor="end" dominantBaseline="middle" className="text-[11px] font-semibold fill-slate-700 dark:fill-zinc-300">
                Aritmética ({pAritmetica}%)
              </text>
            </svg>
          </div>

          {!hasAnyData && (
            <p className="text-center text-[11px] text-slate-500 dark:text-zinc-500 italic">
              Resolva questões para calibrar seu mapa de competências por matéria.
            </p>
          )}
        </div>

        {/* DIAGNÓSTICO METACONCEITUAL & ERROS */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="font-serif-math font-semibold text-slate-900 dark:text-[#f5f0df] text-base">
                Diagnóstico de Padrões de Erro
              </h3>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Classificação automatizada dos desvios nas resoluções passadas:
            </p>

            {diagnosticoErros.total_erros > 0 ? (
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700 dark:text-zinc-300">Conta, Álgebra & Sinal</span>
                    <span className="text-rose-500 font-bold">{diagnosticoErros.conta}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${diagnosticoErros.conta}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700 dark:text-zinc-300">Interpretação do Enunciado</span>
                    <span className="text-amber-500 font-bold">{diagnosticoErros.interpretacao}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${diagnosticoErros.interpretacao}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700 dark:text-zinc-300">Lacuna Conceitual / Teorema</span>
                    <span className="text-amber-600 dark:text-[#d9b452] font-bold">{diagnosticoErros.lacuna}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                    <div className="h-full bg-amber-500 dark:bg-[#d9b452] rounded-full" style={{ width: `${diagnosticoErros.lacuna}%` }} />
                  </div>
                </div>
              </div>
            ) : hasAnyData ? (
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center space-y-1.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">100% de Precisão!</p>
                <p className="text-[11px] text-slate-600 dark:text-zinc-400">
                  Nenhum desvio ou erro foi registrado nas suas resoluções até agora. A MathAI monitorará passagens mais complexas nos treinos avançados.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 text-center space-y-1.5">
                <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Sem erros registrados</p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-500">
                  A MathAI Engine analisará automaticamente seus padrões de resposta assim que você submeter suas primeiras soluções.
                </p>
              </div>
            )}

            {/* INSIGHT SOCRÁTICO DA MATHAI */}
            <div className="p-3.5 rounded-xl bg-amber-500/5 dark:bg-[#1a172c] border border-amber-500/20 text-xs space-y-1.5 mt-4">
              <div className="font-semibold text-amber-900 dark:text-[#e1bb55] flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                Conselho da MathAI Engine:
              </div>
              <p className="text-slate-600 dark:text-zinc-400 leading-relaxed text-[11px]">
                {hasAnyData
                  ? "Sua precisão atual está consolidada. Revise o passo a passo com rigor axiomático antes de assinalar alternativas para manter o streak ativo."
                  : "Comece seu treino com questões da EFOMM, CEDERJ ou ESA para calibrar seu nível inicial no LEMMAS Core."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. REPETIÇÃO ESPAÇADA (SM-2) & HISTÓRICO RECENTE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* REPETIÇÃO ESPAÇADA */}
        <div className="lg:col-span-5 bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-amber-600 dark:text-[#d9b452]" />
              <h3 className="font-serif-math font-semibold text-slate-900 dark:text-[#f5f0df] text-base">
                Fila de Revisão Espaçada (SM-2)
              </h3>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-[#d9b452]">
              {revisoes.length} Pendente{revisoes.length === 1 ? "" : "s"}
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Lemas e problemas reintroduzidos pelo algoritmo no limiar ideal da curva de retenção:
          </p>

          <div className="space-y-3 pt-1">
            {revisoes.length > 0 ? (
              revisoes.map((r, i) => (
                <div 
                  key={i}
                  className="p-3.5 rounded-xl border border-slate-200/80 dark:border-amber-500/15 bg-slate-50/50 dark:bg-[#161426] flex items-center justify-between gap-3 hover:border-amber-500/35 transition-colors"
                >
                  <div>
                    <div className="font-semibold text-xs text-slate-900 dark:text-[#f5f0df]">
                      Lema #{r.questao_id} · {r.materia}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                      {r.topico} (Ciclo #{r.repeticoes})
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-md border ${r.cor}`}>
                      {r.status}
                    </span>
                    <Link
                      href={`/resolver?id=${r.questao_id}`}
                      className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold hover:scale-105 transition-transform"
                      title="Resolver agora"
                    >
                      <Play className="w-3 h-3 fill-current" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 text-center space-y-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                <p className="text-xs font-semibold text-slate-800 dark:text-[#dedbd0]">Repertório em Dia</p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Nenhuma revisão prioritária pendente no momento. As questões resolvidas serão agendadas pelo algoritmo SM-2 na curva ideal de retenção.
                </p>
                <Link
                  href="/resolver"
                  className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-600 transition-colors"
                >
                  <Play className="w-3 h-3 fill-current" />
                  Resolver Novas Questões
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* HISTÓRICO DE RESOLUÇÕES */}
        <div className="lg:col-span-7 bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-600 dark:text-[#d9b452]" />
              <h3 className="font-serif-math font-semibold text-slate-900 dark:text-[#f5f0df] text-base">
                Histórico Recente de Resoluções
              </h3>
            </div>
            <Link href="/resolver" className="text-xs text-amber-600 dark:text-[#d9b452] hover:underline font-semibold">
              Ver todas →
            </Link>
          </div>

          <div className="overflow-x-auto">
            {historico.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 uppercase tracking-wider text-[10px]">
                    <th className="pb-2.5 font-semibold">Momento</th>
                    <th className="pb-2.5 font-semibold">Questão & Assunto</th>
                    <th className="pb-2.5 font-semibold">Resultado</th>
                    <th className="pb-2.5 font-semibold">Tempo</th>
                    <th className="pb-2.5 font-semibold">Estratégia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                  {historico.map((h, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-[#1a172c] transition-colors">
                      <td className="py-3 text-slate-400 dark:text-zinc-500 font-mono text-[11px]">{h.data}</td>
                      <td className="py-3 font-medium text-slate-800 dark:text-[#f5f0df]">{h.questao}</td>
                      <td className="py-3">
                        {h.resultado ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Acertou ({h.gabarito})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                            <XCircle className="w-3.5 h-3.5" /> Errou
                          </span>
                        )}
                      </td>
                      <td className="py-3 font-mono text-slate-600 dark:text-zinc-400">{h.tempo}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-[10px] font-medium border border-transparent dark:border-zinc-700">
                          {h.estrategia}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 text-center space-y-2">
                <BookOpenCheck className="w-6 h-6 text-amber-500 mx-auto" />
                <p className="text-xs font-semibold text-slate-800 dark:text-[#dedbd0]">
                  Nenhuma resolução recente registrada
                </p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-500">
                  Suas tentativas cronometradas e diagnósticos cognitivos da MathAI aparecerão aqui assim que você iniciar os treinos.
                </p>
                <Link
                  href="/resolver"
                  className="inline-flex items-center gap-1.5 mt-2 px-3.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-600 transition-colors"
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
