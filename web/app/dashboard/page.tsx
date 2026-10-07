"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { 
  Trophy, 
  Target, 
  Flame, 
  BrainCircuit, 
  ArrowRight, 
  Clock, 
  Sparkles,
  TrendingUp,
  BookOpenCheck
} from "lucide-react";

export default function DashboardPage() {
  const [totalQuestions, setTotalQuestions] = useState<number>(288);

  useEffect(() => {
    fetch("http://localhost:8000/api/health")
      .then((res) => res.json())
      .then((data) => {
        if (data.total_questions) setTotalQuestions(data.total_questions);
      })
      .catch(() => {});
  }, []);

  const topicosDesempenho = [
    { materia: "Álgebra & Polinômios", acertos: 84, total: 100, pct: 84, cor: "bg-emerald-500" },
    { materia: "Geometria Euclidiana & Espacial", acertos: 45, total: 60, pct: 75, cor: "bg-violet-500" },
    { materia: "Trigonometria & Funções Circulares", acertos: 28, total: 40, pct: 70, cor: "bg-amber-500" },
    { materia: "Análise Combinatória & Probabilidade", acertos: 18, total: 30, pct: 60, cor: "bg-indigo-500" },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* HEADER DE BOAS-VINDAS */}
      <div className="bg-gradient-to-r from-[#17142b] via-[#131122] to-[#120f20] border border-violet-800/40 rounded-2xl p-6 md:p-8 shadow-xl shadow-violet-950/20 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">👋</span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                Olá, Guilherme Mendes!
              </h1>
            </div>
            <p className="text-sm text-zinc-400 mt-1 max-w-xl">
              Seu perfil cognitivo está ativo. O algoritmo SM-2 identificou 12 questões prioritárias para revisão de espaçamento temporal hoje.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/questoes"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all shadow-lg shadow-violet-600/30 hover:scale-[1.02]"
            >
              <span>Resolver Questão</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* CARDS DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#13111f] border border-violet-900/40 rounded-2xl p-5 shadow-sm hover:border-violet-700/50 transition-colors">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Aproveitamento</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">76.8%</div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-2 font-medium">
            <span>+4.2% em relação à semana anterior</span>
          </div>
        </div>

        <div className="bg-[#13111f] border border-violet-900/40 rounded-2xl p-5 shadow-sm hover:border-violet-700/50 transition-colors">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Questões do Banco</span>
            <div className="w-8 h-8 rounded-lg bg-violet-500/15 text-violet-400 flex items-center justify-center">
              <BookOpenCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">{totalQuestions}</div>
          <div className="text-xs text-zinc-400 mt-2">
            Disponíveis para treino imediato
          </div>
        </div>

        <div className="bg-[#13111f] border border-violet-900/40 rounded-2xl p-5 shadow-sm hover:border-violet-700/50 transition-colors">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Sequência Ativa</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-400">7 Dias</div>
          <div className="text-xs text-zinc-400 mt-2">
            Ritmo constante de estudo diário 🔥
          </div>
        </div>

        <div className="bg-[#13111f] border border-violet-900/40 rounded-2xl p-5 shadow-sm hover:border-violet-700/50 transition-colors">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Foco Alvo</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white truncate">ESA / IME</div>
          <div className="text-xs text-zinc-400 mt-2">
            Concursos Militares & Graduação UFF
          </div>
        </div>
      </div>

      {/* SEÇÃO PRINCIPAL: DESEMPENHO POR TÓPICO & ACELERADORES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* RADAR DE DOMÍNIO COGNITIVO */}
        <div className="lg:col-span-7 bg-[#13111f] border border-violet-900/40 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-violet-400" />
                Domínio por Tópico Matemático
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Mapeamento das áreas com base no histórico de acertos e tempo médio
              </p>
            </div>
            <span className="text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-full">
              Tempo Real
            </span>
          </div>

          <div className="space-y-4 pt-2">
            {topicosDesempenho.map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-zinc-300">{item.materia}</span>
                  <span className="text-zinc-400 font-semibold">
                    {item.acertos}/{item.total} ({item.pct}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-zinc-800/80 rounded-full overflow-hidden border border-zinc-700/30">
                  <div
                    className={`h-full ${item.cor} rounded-full transition-all duration-700`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MÓDULOS DE AÇÃO RÁPIDA */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#13111f] border border-violet-900/40 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Recursos de IA em Destaque
            </h3>

            <div className="space-y-3">
              <Link
                href="/questoes"
                className="block p-4 rounded-xl bg-[#181528] border border-violet-900/40 hover:border-violet-500/50 hover:bg-[#1d1933] transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm text-zinc-200 group-hover:text-white">
                    🎯 Treino de Questões com Feedback
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-amber-400 transition-colors" />
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Enunciados limpos do seu banco local com gabarito imediato e registro de tempo.
                </p>
              </Link>

              <Link
                href="/opinioes"
                className="block p-4 rounded-xl bg-[#181528] border border-violet-900/40 hover:border-violet-500/50 hover:bg-[#1d1933] transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm text-zinc-200 group-hover:text-white">
                    ⚖️ Painel &ldquo;Segunda Opinião&rdquo;
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-amber-400 transition-colors" />
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Compare o rigor formal do Nemotron com a heurística intuitiva do DeepSeek lado a lado.
                </p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
