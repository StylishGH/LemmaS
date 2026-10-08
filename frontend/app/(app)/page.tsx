"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { 
  Target, 
  Flame, 
  BrainCircuit, 
  ArrowRight, 
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
  RotateCcw
} from "lucide-react";

export default function DashboardPage() {
  const [totalQuestions, setTotalQuestions] = useState<number>(288);
  const [metricas, setMetricas] = useState({
    total_resolvidas: 342,
    taxa_acerto: 76.8,
    tempo_medio: "2m 15s",
    total_acertos: 262
  });

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        if (data.total_questions) setTotalQuestions(data.total_questions);
      })
      .catch(() => {});

    fetch("/api/dashboard/metrics")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.total_resolvidas !== undefined) {
          setMetricas({
            total_resolvidas: data.total_resolvidas,
            taxa_acerto: data.taxa_acerto,
            tempo_medio: data.tempo_medio,
            total_acertos: data.total_acertos ?? 262,
          });
        }
      })
      .catch(() => {});
  }, []);

  const revisoes = [
    { questao_id: 142, materia: "Álgebra", topico: "Equações de 2º Grau", repeticoes: 3, intervalo_dias: 7, status: "Hoje", cor: "text-rose-500 bg-rose-500/10 border-rose-500/20" },
    { questao_id: 89, materia: "Geometria", topico: "Áreas de Polígonos", repeticoes: 2, intervalo_dias: 3, status: "Amanhã", cor: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
    { questao_id: 215, materia: "Trigonometria", topico: "Lei dos Senos", repeticoes: 1, intervalo_dias: 1, status: "Em 3 dias", cor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  ];

  const historico = [
    { data: "Hoje 14:30", questao: "Lema #14 · Álgebra • Polinômios e Raízes", gabarito: "C", resultado: true, tempo: "1m 45s", estrategia: "Substituição", confianca: "4/5" },
    { data: "Hoje 14:15", questao: "Lema #09 · Geometria • Volume de Cilindro", gabarito: "A", resultado: false, tempo: "3m 10s", estrategia: "Fórmula Direta", confianca: "3/5" },
    { data: "Ontem 18:20", questao: "Lema #33 · Combinatória • Permutação", gabarito: "E", resultado: true, tempo: "2m 05s", estrategia: "Casos e Subcasos", confianca: "5/5" },
  ];

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800 dark:text-[#f5f0df]">
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
              O algoritmo SuperMemo-2 do <strong>LEMMAS Core</strong> mapeou 3 revisões prioritárias hoje para calibrar seu repertório axiomático e analítico.
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

      {/* 2. KPIS COM DESIGN EDITORIAL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 rounded-2xl p-5 shadow-sm hover:border-amber-500/35 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Aproveitamento</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif-math text-3xl font-bold text-slate-900 dark:text-[#f5f0df]">{metricas.taxa_acerto}%</div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
            <span>+4.2% em relação à semana anterior</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 rounded-2xl p-5 shadow-sm hover:border-amber-500/35 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Total Resolvidas</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-[#d9b452] flex items-center justify-center">
              <BookOpenCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif-math text-3xl font-bold text-slate-900 dark:text-[#f5f0df]">{metricas.total_resolvidas}</div>
          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            {metricas.total_acertos} acertos confirmados
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 rounded-2xl p-5 shadow-sm hover:border-amber-500/35 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Tempo Médio</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-[#d9b452] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif-math text-3xl font-bold text-amber-600 dark:text-[#d9b452]">{metricas.tempo_medio}</div>
          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            Tempo padrão oficial de prova
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 rounded-2xl p-5 shadow-sm hover:border-amber-500/35 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Acervo de Lemas</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-[#d9b452] flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif-math text-3xl font-bold text-slate-900 dark:text-[#f5f0df]">{totalQuestions}</div>
          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            Questões indexadas no LEMMAS Core
          </div>
        </div>
      </div>

      {/* 3. RADAR COGNITIVO VETORIAL DOURADO + DIAGNÓSTICO METACONCEITUAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* RADAR COGNITIVO SVG */}
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

          {/* GRÁFICO RADAR SVG VETORIAL DOURADO/ÂMBAR */}
          <div className="w-full flex items-center justify-center py-4">
            <svg viewBox="0 0 320 280" className="w-full max-w-md h-auto">
              {/* Eixos e Polígonos de Fundo */}
              <polygon points="160,30 270,95 270,225 160,270 50,225 50,95" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
              <polygon points="160,65 235,115 235,200 160,235 85,200 85,115" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" />
              <polygon points="160,105 200,135 200,180 160,200 120,180 120,135" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
              
              {/* Linhas radiais */}
              <line x1="160" y1="150" x2="160" y2="30" stroke="currentColor" strokeOpacity="0.12" strokeDasharray="3 3" />
              <line x1="160" y1="150" x2="270" y2="95" stroke="currentColor" strokeOpacity="0.12" strokeDasharray="3 3" />
              <line x1="160" y1="150" x2="270" y2="225" stroke="currentColor" strokeOpacity="0.12" strokeDasharray="3 3" />
              <line x1="160" y1="150" x2="160" y2="270" stroke="currentColor" strokeOpacity="0.12" strokeDasharray="3 3" />
              <line x1="160" y1="150" x2="50" y2="225" stroke="currentColor" strokeOpacity="0.12" strokeDasharray="3 3" />
              <line x1="160" y1="150" x2="50" y2="95" stroke="currentColor" strokeOpacity="0.12" strokeDasharray="3 3" />

              {/* Polígono de Desempenho do Aluno em Dourado/Âmbar */}
              <polygon 
                points="160,50 250,105 235,205 160,225 95,195 65,100" 
                className="fill-amber-500/20 stroke-[#d9b452] dark:stroke-[#e1bb55]" 
                strokeWidth="2.5" 
              />

              {/* Vértices em Ouro */}
              <circle cx="160" cy="50" r="4.5" className="fill-[#d9b452]" />
              <circle cx="250" cy="105" r="4.5" className="fill-[#d9b452]" />
              <circle cx="235" cy="205" r="4.5" className="fill-[#d9b452]" />
              <circle cx="160" cy="225" r="4.5" className="fill-[#d9b452]" />
              <circle cx="95" cy="195" r="4.5" className="fill-[#d9b452]" />
              <circle cx="65" cy="100" r="4.5" className="fill-[#d9b452]" />

              {/* Rótulos dos vértices */}
              <text x="160" y="20" textAnchor="middle" className="text-[11px] font-semibold fill-slate-700 dark:fill-zinc-300">Álgebra (84%)</text>
              <text x="280" y="95" textAnchor="start" className="text-[11px] font-semibold fill-slate-700 dark:fill-zinc-300">Geometria (75%)</text>
              <text x="280" y="235" textAnchor="start" className="text-[11px] font-semibold fill-slate-700 dark:fill-zinc-300">Trigonometria (70%)</text>
              <text x="160" y="285" textAnchor="middle" className="text-[11px] font-semibold fill-slate-700 dark:fill-zinc-300">Cálculo (62%)</text>
              <text x="40" y="235" textAnchor="end" className="text-[11px] font-semibold fill-slate-700 dark:fill-zinc-300">Combinatória (60%)</text>
              <text x="40" y="95" textAnchor="end" className="text-[11px] font-semibold fill-slate-700 dark:fill-zinc-300">Aritmética (88%)</text>
            </svg>
          </div>
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

            <div className="space-y-3 pt-1">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700 dark:text-zinc-300">Conta, Álgebra & Sinal</span>
                  <span className="text-rose-500 font-bold">42%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: "42%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700 dark:text-zinc-300">Interpretação do Enunciado</span>
                  <span className="text-amber-500 font-bold">28%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: "28%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700 dark:text-zinc-300">Lacuna Conceitual / Teorema</span>
                  <span className="text-amber-600 dark:text-[#d9b452] font-bold">30%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-amber-500 dark:bg-[#d9b452] rounded-full" style={{ width: "30%" }} />
                </div>
              </div>
            </div>

            {/* INSIGHT SOCRÁTICO DA MATHAI */}
            <div className="p-3.5 rounded-xl bg-amber-500/5 dark:bg-[#1a172c] border border-amber-500/20 text-xs space-y-1.5 mt-4">
              <div className="font-semibold text-amber-900 dark:text-[#e1bb55] flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                Conselho da MathAI Engine:
              </div>
              <p className="text-slate-600 dark:text-zinc-400 leading-relaxed text-[11px]">
                Sua intuição geométrica é afiada, mas perdas pontuais ocorrem por distração aritmética nas passagens finais de álgebra. Revise o passo a passo antes de assinalar a alternativa.
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
              3 Pendentes
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Lemas e problemas reintroduzidos pelo algoritmo no limiar ideal da curva de retenção:
          </p>

          <div className="space-y-3 pt-1">
            {revisoes.map((r, i) => (
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
            ))}
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
          </div>
        </div>
      </div>
    </div>
  );
}
