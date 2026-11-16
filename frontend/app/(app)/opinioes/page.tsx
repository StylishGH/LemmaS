"use client";

import { useState } from "react";
import { Sparkles, Cpu, Lightbulb, CheckCheck, RefreshCw, Send, Scale, AlertTriangle, BrainCircuit } from "lucide-react";
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

    // Timeout próprio: sem ele, um serviço cognitivo lento deixa a página
    // esperando até a função da Vercel morrer sem resposta, e o usuário só
    // via o erro genérico de conexão. Com 40s, o erro passa a ser explícito.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000);

    try {
      const res = await fetch("/api/ai/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enunciado: problemText }),
        signal: controller.signal,
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }
      if (res.ok && data) {
        if (data.model_a) setModelA(data.model_a);
        if (data.model_b) setModelB(data.model_b);
        if (data.sintese) setSintese(data.sintese);
        if (data.provider) setProviderUsed(data.provider);
      } else if (res.status === 503) {
        setErrorMsg(
          data?.error ||
            "O serviço de Segunda Opinião está temporariamente indisponível. Tente novamente em alguns minutos — o exemplo abaixo continua disponível."
        );
      } else {
        setErrorMsg(data?.error || "Não foi possível comparar as abordagens no momento.");
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setErrorMsg(
          "O serviço de Segunda Opinião demorou mais que o esperado e a comparação foi interrompida. Tente novamente — o exemplo abaixo continua disponível."
        );
      } else {
        setErrorMsg("Falha de conexão com o serviço cognitivo. Tente novamente.");
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2 animate-fadeIn text-[var(--ink-primary)]">
      {/* HEADER DA PÁGINA EDITORIAL */}
      <div className="lemmas-surface-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 md:p-8 rounded-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-[var(--marker-blue-dim)] border border-[var(--marker-blue-border)] text-[var(--marker-blue)] dark:bg-[var(--marker-amber-dim)] dark:border-[var(--marker-amber-border)] dark:text-[var(--marker-amber)] flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-serif-math text-2xl md:text-3xl font-semibold text-[var(--ink-primary)] tracking-tight">
                Segunda Opinião: Disputa de Lemas & Métodos.
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--marker-blue-dim)] text-[var(--marker-blue)] border border-[var(--marker-blue-border)] dark:bg-[var(--marker-amber-dim)] dark:text-[var(--marker-amber)] dark:border-[var(--marker-amber-border)]">
                Metacognição
              </span>
            </div>
            <p className="text-xs md:text-sm text-[var(--ink-secondary)] mt-1 font-sans">
              Compare diferentes arquiteturas de raciocínio matemático lado a lado para expandir seu repertório pedagógico e heurístico.
            </p>
          </div>
        </div>

        {/* CAIXA DE ENTRADA DO PROBLEMA */}
        <div className="space-y-3 pt-2 font-sans">
          <label className="text-xs font-semibold text-[var(--ink-secondary)] uppercase tracking-wider block">
            Problema ou Teorema para Análise Comparativa:
          </label>
          <div>
            <textarea
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              rows={3}
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg p-4 text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--marker-blue)] dark:focus:border-[var(--marker-amber)] transition-colors"
              placeholder="Digite o enunciado de uma questão matemática ou propriedade para ver a análise de dois modelos..."
            />
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleCompare}
              disabled={loading}
              className="lemmas-gold-cta flex items-center gap-1.5 px-4 py-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs shadow-xs transition-colors"
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
            <div className="p-3 rounded-lg bg-[var(--marker-red-dim)] border border-[var(--marker-red-border)] text-[var(--marker-red)] text-xs flex items-center gap-2 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {loading && (
            <div className="p-4 md:p-5 rounded-xl bg-[var(--marker-blue-dim)] border border-[var(--marker-blue-border)] text-xs animate-fadeIn">
              <ThoughtLine
                working={true}
                label="MathAI Engine orquestrando Segunda Opinião…"
                steps={[
                  "Modelo A: deduzindo invariantes e demonstração axiomática formal",
                  "Modelo B: investigando intuição heurística e atalhos de Gauss",
                  "Síntese: consolidando conexão metacognitiva e valor didático",
                ]}
                color="var(--marker-blue)"
                glyphColor="var(--marker-blue)"
                fontSize={13}
              />
            </div>
          )}
        </div>
      </div>

      {/* CARDS COMPARATIVOS LADO A LADO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* MODELO A: NEMOTRON (RIGOR) */}
        <div className="lemmas-surface-card bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-4 hover:border-[var(--border-default)] transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[var(--marker-green-dim)] border border-[var(--marker-green-border)] flex items-center justify-center text-[var(--marker-green)]">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif-math font-bold text-sm text-[var(--ink-primary)]">{modelA.name}</h3>
                <p className="text-[11px] text-[var(--marker-green)] font-medium">{modelA.role}</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto text-[var(--ink-secondary)] text-xs md:text-sm leading-relaxed whitespace-pre-line font-sans select-text">
            <MathText text={modelA.content} />
          </div>

          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center gap-2 text-[11px] text-[var(--ink-muted)]">
            <CheckCheck className="w-3.5 h-3.5 text-[var(--marker-green)]" />
            <span>Foco: demonstração analítica e precisão de definições.</span>
          </div>
        </div>

        {/* MODELO B: HEURÍSTICA & ATALHOS */}
        <div className="lemmas-surface-card bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-4 hover:border-[var(--border-default)] transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[var(--marker-blue-dim)] border border-[var(--marker-blue-border)] text-[var(--marker-blue)] dark:bg-[var(--marker-amber-dim)] dark:border-[var(--marker-amber-border)] dark:text-[var(--marker-amber)] flex items-center justify-center">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif-math font-bold text-sm text-[var(--ink-primary)]">{modelB.name}</h3>
                <p className="text-[11px] text-[var(--marker-blue)] dark:text-[var(--marker-amber)] font-medium">{modelB.role}</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--bg-elevated)] text-[var(--ink-muted)] border border-[var(--border-subtle)]">
              Heuristic
            </span>
          </div>

          <div className="overflow-x-auto text-[var(--ink-secondary)] text-xs md:text-sm leading-relaxed whitespace-pre-line font-sans select-text">
            <MathText text={modelB.content} />
          </div>

          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center gap-2 text-[11px] text-[var(--ink-muted)]">
            <Sparkles className="w-3.5 h-3.5 text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" />
            <span>Foco: analogias visuais, atalhos de prova e intuição socrática.</span>
          </div>
        </div>
      </div>

      {/* SÍNTESE METACOGNITIVA */}
      <div className="lemmas-surface-card bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-6 text-xs text-[var(--ink-secondary)] space-y-2">
        <h4 className="font-serif-math font-semibold text-sm text-[var(--ink-primary)] flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-[var(--marker-blue)] dark:text-[var(--marker-amber)] shrink-0" /> Síntese Pedagógica para o Licenciando em Matemática
        </h4>
        <div className="overflow-x-auto text-[var(--ink-secondary)] leading-relaxed font-sans">
          <MathText text={sintese} />
        </div>
      </div>
    </div>
  );
}
