"use client";

import { useState } from "react";
import { Sparkles, Cpu, Lightbulb, CheckCheck, RefreshCw, Send } from "lucide-react";

interface AIModelOpinion {
  name: string;
  role: string;
  content: string;
}

export default function OpinioesPage() {
  const [problemText, setProblemText] = useState<string>(
    "Dado um triângulo retângulo ABC com catetos de medidas 6 cm e 8 cm, determine o raio da circunferência inscrita (incentro)."
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [modelA, setModelA] = useState<AIModelOpinion>({
    name: "NVIDIA Nemotron-3 Ultra (550B)",
    role: "Rigor Axiomático & Prova Formal",
    content:
      "**1. Teorema Fundamental Aplicável:** Em qualquer triângulo retângulo de catetos $a$, $b$ e hipotenusa $c$, o raio $r$ do círculo inscrito satisfaz a relação exata $r = \\frac{a + b - c}{2}$.\n\n**2. Demonstração dos Invariantes:** Pelo Teorema de Pitágoras, $c = \\sqrt{6^2 + 8^2} = 10\\text{ cm}$. Os pontos de tangência dividem os catetos em segmentos de comprimento $r$, gerando um quadrado de lado $r$ junto ao vértice do ângulo reto.\n\n**3. Solução Axiomática:** Substituindo os valores: $r = \\frac{6 + 8 - 10}{2} = \\frac{4}{2} = 2\\text{ cm}$.\n\n**Atenção a Singularidades:** Esta relação é estritamente válida para triângulos retângulos euclidianos planos.",
  });

  const [modelB, setModelB] = useState<AIModelOpinion>({
    name: "DeepSeek R1 / Reasoning",
    role: "Intuição Heurística & Atalhos Geométricos",
    content:
      "**1. Intuição pela Área Total:** Lembre-se de que a área de qualquer triângulo pode ser expressa como $S = p \\cdot r$, onde $p$ é o semiperímetro ($p = \\frac{6 + 8 + 10}{2} = 12\\text{ cm}$).\n\n**2. Cálculo Direto da Área:** Como é um triângulo retângulo, a área é imediata: $S = \\frac{6 \\times 8}{2} = 24\\text{ cm}^2$.\n\n**3. Igualdade Heurística:** Igualando as duas fórmulas: $24 = 12 \\cdot r \\implies r = 2\\text{ cm}$.\n\n**Dica Socrática:** Note que o triângulo 6-8-10 é uma homotetia de razão 2 do triângulo primitivo 3-4-5 (cujo inraio é 1). Portanto, o novo raio é diretamente $1 \\times 2 = 2\\text{ cm}$ sem contas!",
  });

  async function handleCompare() {
    if (!problemText.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/ai/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enunciado: problemText }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.model_a) setModelA(data.model_a);
        if (data.model_b) setModelB(data.model_b);
      }
    } catch {
      // Mantém respostas didáticas de referência caso backend esteja offline
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2 animate-fadeIn text-slate-800 dark:text-[#f5f0df]">
      {/* HEADER DA PÁGINA EDITORIAL */}
      <div className="bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/20 p-6 md:p-8 rounded-3xl space-y-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl text-amber-500">
            ⚖️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif-math text-2xl md:text-3xl font-semibold text-slate-900 dark:text-[#f5f0df] tracking-tight">
                Segunda Opinião: Disputa de Lemas & Métodos.
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-[#d9b452] border border-amber-500/30">
                Metacognição
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-600 dark:text-zinc-400 mt-1 font-sans">
              Compare diferentes arquiteturas de raciocínio matemático lado a lado para expandir seu repertório pedagógico e heurístico.
            </p>
          </div>
        </div>

        {/* CAIXA DE ENTRADA DO PROBLEMA */}
        <div className="space-y-3 pt-2 font-sans">
          <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase tracking-wider block">
            Problema ou Teorema para Análise Comparativa:
          </label>
          <div className="relative">
            <textarea
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              rows={3}
              className="w-full bg-slate-50 dark:bg-[#18152a] border border-slate-200 dark:border-amber-500/20 rounded-xl p-4 text-sm text-slate-900 dark:text-[#dedbd0] focus:outline-none focus:border-amber-500 transition"
              placeholder="Digite o enunciado de uma questão matemática ou propriedade para ver a análise de dois modelos..."
            />
            <button
              onClick={handleCompare}
              disabled={loading}
              className="lemmas-gold-cta absolute right-3 bottom-4 flex items-center gap-1.5 px-4 py-2 font-bold disabled:opacity-50 rounded-lg text-xs shadow-md transition-transform hover:scale-[1.02]"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Consultando...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Comparar Abordagens</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* CARDS COMPARATIVOS LADO A LADO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* MODELO A: NEMOTRON (RIGOR) */}
        <div className="bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 rounded-2xl p-6 shadow-sm space-y-4 hover:border-amber-500/35 transition">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif-math font-bold text-sm text-slate-900 dark:text-[#f5f0df]">{modelA.name}</h3>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">{modelA.role}</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-[#18152a] text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-amber-500/15">
              NVIDIA NIM
            </span>
          </div>

          <div className="text-slate-700 dark:text-zinc-300 text-xs md:text-sm leading-relaxed whitespace-pre-line font-sans select-text">
            {modelA.content}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400">
            <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Foco: demonstração analítica e precisão de definições.</span>
          </div>
        </div>

        {/* MODELO B: DEEPSEEK (HEURÍSTICA) */}
        <div className="bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 rounded-2xl p-6 shadow-sm space-y-4 hover:border-amber-500/35 transition">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif-math font-bold text-sm text-slate-900 dark:text-[#f5f0df]">{modelB.name}</h3>
                <p className="text-[11px] text-amber-600 dark:text-[#d9b452] font-medium">{modelB.role}</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-[#18152a] text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-amber-500/15">
              Heuristic
            </span>
          </div>

          <div className="text-slate-700 dark:text-zinc-300 text-xs md:text-sm leading-relaxed whitespace-pre-line font-sans select-text">
            {modelB.content}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Foco: analogias visuais, atalhos de prova e intuição socrática.</span>
          </div>
        </div>
      </div>

      {/* SÍNTESE METACOGNITIVA */}
      <div className="bg-slate-50 dark:bg-[#18152a] border border-slate-200/80 dark:border-amber-500/20 rounded-2xl p-6 text-xs text-slate-700 dark:text-zinc-300 space-y-2">
        <h4 className="font-serif-math font-semibold text-sm text-slate-900 dark:text-[#f5f0df] flex items-center gap-2">
          <span>🧠</span> Síntese Pedagógica para o Licenciando em Matemática
        </h4>
        <p className="text-slate-600 dark:text-zinc-400 leading-relaxed font-sans">
          O confronto entre as duas resoluções evidencia que o primeiro modelo ancorou a resposta na geometria analítica/algébrica dos invariantes do círculo inscrito ($r = (a + b - c) / 2$), enquanto o segundo mobilizou a relação global de área ($S = p \cdot r$) e o conceito de semelhança/homotetia. Dominar ambas as linguagens é o segredo tanto para concursos de alto rendimento quanto para a prática docente em sala de aula.
        </p>
      </div>
    </div>
  );
}
