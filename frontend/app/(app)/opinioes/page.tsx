"use client";

import { useState } from "react";
import { Sparkles, Cpu, Lightbulb, CheckCheck, RefreshCw, Send } from "lucide-react";
import { MathText } from "@/components/math/MathDisplay";
import ThoughtLine from "@/components/ui/thought-line";

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [providerUsed, setProviderUsed] = useState<string>("nvidia-nim");

  const [modelA, setModelA] = useState<AIModelOpinion>({
    name: "Rigor Axiomático e Prova Formal",
    role: "Demonstração Analítica & Invariantes",
    content:
      "### 1. Lema Fundamental da Decomposição de Áreas\nEm qualquer triângulo euclidiano de lados $a, b, c$, semiperímetro $p = \\frac{a+b+c}{2}$ e inraio $r$, a conexão do incentro $I$ aos três vértices decompõe a área total $S$ em três triângulos disjuntos: $\\triangle AIB$, $\\triangle BIC$ e $\\triangle CIA$:\n$$S = \\frac{a \\cdot r}{2} + \\frac{b \\cdot r}{2} + \\frac{c \\cdot r}{2} = \\frac{(a+b+c)}{2} \\cdot r = p \\cdot r$$\nIsso estabelece universalmente a identidade $r = \\frac{S}{p}$.\n\n### 2. Dedução Euclidiana e Parâmetros Métricos\nNo triângulo retângulo de catetos $b = 6\\text{ cm}$ e $c = 8\\text{ cm}$:\n- Hipotenusa (Teorema de Pitágoras): $a = \\sqrt{6^2 + 8^2} = \\sqrt{36 + 64} = 10\\text{ cm}$.\n- Área direta: $S = \\frac{b \\cdot c}{2} = \\frac{6 \\times 8}{2} = 24\\text{ cm}^2$.\n- Semiperímetro: $p = \\frac{10 + 6 + 8}{2} = \\frac{24}{2} = 12\\text{ cm}$.\n\n### 3. Solução Axiomática Rigorosa\nSubstituindo $S$ e $p$ no Lema Fundamental:\n$$r = \\frac{S}{p} = \\frac{24\\text{ cm}^2}{12\\text{ cm}} = 2\\text{ cm}$$\n\n### 4. Domínio de Validade e Invariantes\nA demonstração independe de propriedades locais ad-hoc do ângulo reto, sendo estritamente válida para todo polígono convexo circunscritível no plano euclidiano.",
  });

  const [modelB, setModelB] = useState<AIModelOpinion>({
    name: "Heurística & Atalhos Cognitivos",
    role: "Intuição Heurística & Atalhos Cognitivos",
    content:
      "### 1. Atalho por Homotetia (Terna Primitiva 3-4-5)\nReconheça a escala visual: um triângulo de catetos $6$ e $8$ é uma ampliação linear de razão $k = 2$ do famoso triângulo egípcio primitivo $3-4-5$. No triângulo $3-4-5$, o raio inscrito é elementar: $r_0 = 1$. Pela proporcionalidade direta:\n$$r = k \\cdot r_0 = 2 \\times 1 = 2\\text{ cm}$$\n*Resultado em 5 segundos, sem escrever equações!*\n\n### 2. O Macete Tático de Tangências no Vértice Reto\nNo ângulo reto, os raios perpendiculares aos catetos formam um quadrado $r \\times r$.\nOs segmentos de tangência restantes nos catetos medem $(b-r)$ e $(c-r)$, os quais se projetam sobre a hipotenusa $a$:\n$$(b - r) + (c - r) = a \\implies b + c - 2r = a$$\nIsso gera o atalho clássico de vestibulares e concursos militares:\n$$r = \\frac{b + c - a}{2} = \\frac{6 + 8 - 10}{2} = \\frac{4}{2} = 2\\text{ cm}$$\n\n### 3. Dica Socrática para Provas de Alto Rendimento\nEm exames de tempo escasso (AFA, EFOMM, EsPCEx, ENEM), não perca tempo calculando área e semiperímetro quando a figura for múltiplo de uma terna pitagórica. Use semelhança imediata ou o atalho da soma dos catetos menos a hipotenusa.",
  });

  const [sintese, setSintese] = useState<string>(
    "O confronto entre as duas resoluções evidencia uma separação pedagógica nítida: o Modelo A constrói a fundamentação axiomática universal via Decomposição de Áreas ($S = p \\cdot r$), indispensável para o ensino formal e para polígonos genéricos; o Modelo B mobiliza a inteligência tática com homotetia e o macete de tangências ($r = \\frac{b+c-a}{2}$), otimizado para velocidade em provas. O papel do professor de matemática é ensinar o rigor da dedução formal sem privar o estudante dos atalhos heurísticos de alta performance."
  );

  async function handleCompare() {
    if (!problemText.trim()) return;
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enunciado: problemText }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.model_a) setModelA(data.model_a);
        if (data.model_b) setModelB(data.model_b);
        if (data.sintese) setSintese(data.sintese);
        if (data.provider) setProviderUsed(data.provider);
      } else {
        setErrorMsg(data.error || "Não foi possível comparar as abordagens no momento.");
      }
    } catch {
      setErrorMsg("Falha de conexão com o serviço cognitivo. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2 animate-fadeIn text-slate-800 dark:text-[#f5f0df]">
      {/* HEADER DA PÁGINA EDITORIAL */}
      <div className="bg-white dark:bg-[#161a1e] border border border-[var(--border-board)] p-6 md:p-8 rounded-3xl space-y-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-500 flex items-center justify-center text-2xl">
            ⚖️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif-math text-2xl md:text-3xl font-semibold text-slate-900 dark:text-[#f5f0df] tracking-tight">
                Segunda Opinião: Disputa de Lemas & Métodos.
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 border border-blue-500/30 dark:bg-amber-500/10 dark:text-[#d9b452] dark:border-amber-500/30">
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
              className="w-full bg-slate-50 dark:bg-[#1e2329] border border-slate-200 dark:border-amber-500/20 rounded-xl p-4 text-sm text-slate-900 dark:text-[#dedbd0] focus:outline-none focus:border-blue-500 dark:focus:border-amber-500 transition"
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
                  <span>Consultando Modelos...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Comparar Abordagens</span>
                </>
              )}
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 animate-fadeIn">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {loading && (
            <div className="p-4 md:p-5 rounded-2xl bg-blue-500/5 border border-blue-500/25 dark:bg-amber-500/5 dark:border-amber-500/25 text-xs shadow-xs animate-fadeIn">
              <ThoughtLine
                working={true}
                label="MathAI Engine orquestrando Segunda Opinião…"
                steps={[
                  "Modelo A: deduzindo invariantes e demonstração axiomática formal",
                  "Modelo B: investigando intuição heurística e atalhos de Gauss",
                  "Síntese: consolidando conexão metacognitiva e valor didático",
                ]}
                color="#2563eb"
                glyphColor="#2563eb"
                fontSize={13}
              />
            </div>
          )}
        </div>
      </div>

      {/* CARDS COMPARATIVOS LADO A LADO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* MODELO A: NEMOTRON (RIGOR) */}
        <div className="bg-white dark:bg-[#161a1e] border border border-[var(--border-board)] rounded-2xl p-6 shadow-sm space-y-4 hover:border-blue-500/35 dark:hover:border-amber-500/35 transition">
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
          </div>

          <div className="text-slate-700 dark:text-zinc-300 text-xs md:text-sm leading-relaxed whitespace-pre-line font-sans select-text">
            <MathText text={modelA.content} />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400">
            <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Foco: demonstração analítica e precisão de definições.</span>
          </div>
        </div>

        {/* MODELO B: HEURÍSTICA & ATALHOS */}
        <div className="bg-white dark:bg-[#161a1e] border border border-[var(--border-board)] rounded-2xl p-6 shadow-sm space-y-4 hover:border-blue-500/35 dark:hover:border-amber-500/35 transition">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-500 flex items-center justify-center">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif-math font-bold text-sm text-slate-900 dark:text-[#f5f0df]">{modelB.name}</h3>
                <p className="text-[11px] text-blue-600 dark:text-[#d9b452] font-medium">{modelB.role}</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-[#1e2329] text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-amber-500/15">
              Heuristic
            </span>
          </div>

          <div className="text-slate-700 dark:text-zinc-300 text-xs md:text-sm leading-relaxed whitespace-pre-line font-sans select-text">
            <MathText text={modelB.content} />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-amber-500" />
            <span>Foco: analogias visuais, atalhos de prova e intuição socrática.</span>
          </div>
        </div>
      </div>

      {/* SÍNTESE METACOGNITIVA */}
      <div className="bg-slate-50 dark:bg-[#1e2329] border border border-[var(--border-board)] rounded-2xl p-6 text-xs text-slate-700 dark:text-zinc-300 space-y-2">
        <h4 className="font-serif-math font-semibold text-sm text-slate-900 dark:text-[#f5f0df] flex items-center gap-2">
          <span>🧠</span> Síntese Pedagógica para o Licenciando em Matemática
        </h4>
        <div className="text-slate-600 dark:text-zinc-400 leading-relaxed font-sans">
          <MathText text={sintese} />
        </div>
      </div>
    </div>
  );
}
