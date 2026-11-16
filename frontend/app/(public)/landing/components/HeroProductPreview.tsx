"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SUPABASE_STORAGE_URL } from "@/lib/image-url";
import { Lightbulb, Sparkles, ArrowRight, BookOpen, CheckCircle2, ChevronDown, ChevronUp, Calendar, Compass, ShieldCheck } from "lucide-react";
import { MathInline } from "@/components/math/MathDisplay";
import { LandingMathText as MathText } from "./LandingMathText";

interface LemmaInfo {
  number: string;
  name: string;
  formula: string;
  trigger: string;
  action: string;
}

interface Alternative {
  letter: string;
  text: string;
}

interface QuestionItem {
  id: number;
  origin: string;
  banca: string;
  ano: number;
  category: string;
  type: string;
  level: string;
  materia: string;
  topico: string;
  question: string;
  figuraUrl?: string;
  options: Alternative[];
  correctLetter: string;
  explain: string;
  socraticHint: {
    level1: string;
    level2: string;
    level3: string;
  };
  lemma: LemmaInfo;
}

const QUESTIONS: QuestionItem[] = [
  {
    id: 22960,
    origin: "ESCOLA NAVAL · 2026",
    banca: "Escola Naval",
    ano: 2026,
    category: "Concurso Militar",
    type: "Objetiva",
    level: "Fácil (2/5)",
    materia: "Matemática",
    topico: "Geometria Plana",
    question: "Considere a figura abaixo.\n\nSabendo que o octógono é regular de lado 8, tal que a reta que contém o segmento $IH$ intersecta o ponto $C$ e os pontos $B$, $I$ e $E$ são colineares, calcule a razão entre a área do triângulo $IEG$ e a área do octógono regular $ABCDEFGH$ e assinale a opção correta.",
    figuraUrl: `${SUPABASE_STORAGE_URL}/escola_naval/2026/escola_naval_2026_q07_fig1.png`,
    options: [
      { letter: "A", text: "\\frac{1 + \\sqrt{2}}{4}" },
      { letter: "B", text: "\\frac{1 + \\sqrt{2}}{6}" },
      { letter: "C", text: "\\frac{1 + \\sqrt{2}}{12}" },
      { letter: "D", text: "\\frac{1 + \\sqrt{2}}{8}" },
      { letter: "E", text: "\\frac{1 + \\sqrt{2}}{14}" }
    ],
    correctLetter: "D",
    explain: "No triângulo retângulo isósceles $ABC$, temos $BI = CI = 8 \\cdot \\frac{\\sqrt{2}}{2} = 4\\sqrt{2}$.\nSe $AJ \\perp CH$, então $JH = 4\\sqrt{2}$ e $IJ = 8$.\nNote que a base e a altura do triângulo $IEG$ medem $EI = HI = 8 + 4\\sqrt{2} = 4\\sqrt{2}(\\sqrt{2} + 1)$.\nA área do triângulo é $S_{IEG} = \\frac{IE \\cdot HI}{2} = 16(\\sqrt{2} + 1)^2$.\nA área total do octógono regular é $S_{octo} = 128(\\sqrt{2} + 1)$.\nDividindo as áreas: $\\frac{S_{IEG}}{S_{octo}} = \\frac{16(\\sqrt{2} + 1)^2}{128(\\sqrt{2} + 1)} = \\frac{1 + \\sqrt{2}}{8}$.\nGabarito oficial: Alternativa (D).",
    socraticHint: {
      level1: "Identifique os triângulos retângulos isósceles formados nas quinas do octógono regular.",
      level2: "Como a reta IH passa por C, a simetria fornece $BI = CI = 4\\sqrt{2}$. Veja que $EI$ e $HI$ são congruentes.",
      level3: "Calcule a área do triângulo IEG como $\\frac{1}{2} \\cdot EI \\cdot HI$ e compare com a área decomposta do octógono."
    },
    lemma: {
      number: "1916",
      name: "Princípio de Cavalieri e Decomposição de Polígonos",
      formula: "\\frac{S_{IEG}}{S_{octo}} = \\frac{1 + \\sqrt{2}}{8}",
      trigger: "Quando a questão envolve polígono regular com decomposição simétrica em triângulos e trapézios notáveis",
      action: "Projete as diagonais perpendiculares para decompor o polígono em retângulos centrais e triângulos retângulos isósceles congruentes nas quinas."
    }
  },
  {
    id: 1108,
    origin: "COLÉGIO NAVAL / EPCAR · 2024",
    banca: "Colégio Naval",
    ano: 2024,
    category: "Concurso Militar",
    type: "Objetiva",
    level: "Média (3/5)",
    materia: "Matemática",
    topico: "Geometria Plana",
    question: "Um triângulo retângulo possui catetos de comprimentos 6 cm e 8 cm. O raio da circunferência inscrita (inraio) a esse triângulo é igual a:",
    figuraUrl: "/assets/poncelet_6_8_10.svg",
    options: [
      { letter: "A", text: "1\\text{ cm}" },
      { letter: "B", text: "2\\text{ cm}" },
      { letter: "C", text: "3\\text{ cm}" },
      { letter: "D", text: "4\\text{ cm}" },
      { letter: "E", text: "5\\text{ cm}" }
    ],
    correctLetter: "B",
    explain: "Pelo Lema de Poncelet direto: em triângulos retângulos com catetos $a = 6$, $b = 8$ e hipotenusa $c = \\sqrt{6^2 + 8^2} = 10\\text{ cm}$, o inraio é $r = \\frac{a+b-c}{2} = \\frac{6+8-10}{2} = 2\\text{ cm}$. Pelo método tradicional da conservação de área: $S = \\frac{6 \\times 8}{2} = 24\\text{ cm}^2$ e $p = \\frac{6+8+10}{2} = 12\\text{ cm}$. Como $S = p \\cdot r$, resulta $r = \\frac{24}{12} = 2\\text{ cm}$. Gabarito oficial: Alternativa (B).",
    socraticHint: {
      level1: "Calcule a hipotenusa usando o Teorema de Pitágoras clássico (triângulo pitagórico 6-8-10).",
      level2: "Use a relação de conservação da área: a área total é o semiperímetro multiplicado pelo inraio ($S = p \\cdot r$).",
      level3: "Ou aplique o Teorema de Poncelet direto para triângulos retângulos: $r = \\frac{a+b-c}{2}$."
    },
    lemma: {
      number: "42",
      name: "Teorema de Poncelet & Inraio",
      formula: "r = \\frac{a + b - c}{2} \\quad \\iff \\quad S = p \\cdot r",
      trigger: "Quando o problema envolve o raio da circunferência inscrita em um triângulo retângulo ou relação entre catetos e perímetro",
      action: "A soma dos catetos excede a hipotenusa pelo diâmetro inscrito: a + b = c + 2r. Calcule diretamente sem calcular áreas intermediárias."
    }
  }
];

export function HeroProductPreview() {
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [socraticLevel, setSocraticLevel] = useState<number | null>(null);
  const [forceShowExplain, setForceShowExplain] = useState<boolean>(false);

  const q = QUESTIONS[currentIdx];
  const isAnswered = selectedLetter !== null;
  const isCorrect = selectedLetter === q.correctLetter;
  const shouldShowExplain = isAnswered || forceShowExplain;

  const handleSelect = (letter: string) => {
    setSelectedLetter(letter);
  };

  const handleNext = () => {
    setCurrentIdx((prev) => (prev + 1) % QUESTIONS.length);
    setSelectedLetter(null);
    setSocraticLevel(null);
    setForceShowExplain(false);
  };

  return (
    <div className="relative w-full max-w-[560px] mx-auto">
      {/* Painel da questão estilo autêntico LemmaS */}
      <div className="relative rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-md dark:shadow-none overflow-hidden transition-colors">

        {/* CABEÇALHO COM BADGES REAIS DO LEMMAS */}
        <div className="px-5 py-3.5 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold font-mono tabular-nums bg-[var(--marker-amber-dim)] border border-[var(--marker-amber-border)] text-[var(--marker-amber)]">
              {q.origin}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[var(--bg-elevated)] text-[var(--ink-secondary)]">
              {q.category}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[var(--bg-elevated)] text-[var(--ink-secondary)]">
              {q.type}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium tabular-nums text-[var(--marker-green)] bg-[var(--marker-green-dim)] border border-[var(--marker-green-border)] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--marker-green)]" />
              {q.level}
            </span>
          </div>

          <Link
            href={`/resolver?id=${q.id}`}
            className="text-[11px] font-semibold text-[var(--marker-amber)] hover:underline flex items-center gap-1 transition-colors"
            title="Abrir esta questão no Modo Foco em tela cheia"
          >
            <Sparkles size={12} />
            <span>Modo Foco ↗</span>
          </Link>
        </div>

        {/* CORPO DA QUESTÃO */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Breadcrumb da Matéria */}
          <div className="text-[11px] font-mono text-[var(--ink-muted)] flex flex-wrap items-center justify-between gap-2">
            <div>
              <span>{q.materia}</span>
              <span className="mx-1.5 opacity-40">›</span>
              <strong className="text-[var(--ink-primary)] font-semibold">{q.topico}</strong>
            </div>
            <span className="text-[10px] tabular-nums text-[var(--ink-muted)]">
              ID #{q.id}
            </span>
          </div>

          {/* Enunciado formatado com KaTeX */}
          <div className="font-serif-math text-[16px] w-full font-normal text-[var(--ink-primary)] leading-relaxed whitespace-pre-line">
            <MathText text={q.question} />
          </div>

          {/* Figura da Questão (se houver) */}
          {q.figuraUrl && (
            <div className="my-2 flex flex-col items-center justify-center p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={q.figuraUrl}
                alt="Figura geométrica da questão"
                className="question-diagram-invertible max-h-44 max-w-full rounded-lg object-contain bg-white dark:bg-transparent p-2 border border-[var(--border-subtle)]"
                loading="lazy"
              />
              <span className="text-[10px] font-mono text-[var(--ink-muted)] mt-2">
                Diagrama geométrico da questão
              </span>
            </div>
          )}

          {/* Alternativas Reais do LemmaS */}
          <div className="space-y-2 pt-1">
            <div className="text-[10px] font-mono font-semibold tracking-wider uppercase text-[var(--ink-muted)]">
              Alternativas (clique para responder):
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {q.options.map((opt) => {
                const isSelected = selectedLetter === opt.letter;
                const isOptionCorrect = opt.letter === q.correctLetter;

                let btnClass = "border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--ink-primary)] hover:border-[var(--marker-amber-border)]";

                if (isSelected) {
                  if (isOptionCorrect) {
                    btnClass = "border border-[var(--marker-green-border)] bg-[var(--marker-green-dim)] text-[var(--marker-green)] font-semibold";
                  } else {
                    btnClass = "border border-[var(--marker-amber-border)] bg-[var(--marker-amber-dim)] text-[var(--marker-amber)] font-semibold";
                  }
                } else if (shouldShowExplain && isOptionCorrect) {
                  btnClass = "border border-[var(--marker-green-border)] bg-[var(--marker-green-dim)] text-[var(--marker-green)] font-semibold";
                }

                return (
                  <button
                    key={opt.letter}
                    type="button"
                    onClick={() => handleSelect(opt.letter)}
                    className={`py-2.5 px-3 rounded-lg text-left text-xs transition-colors cursor-pointer flex items-center gap-2 ${btnClass}`}
                  >
                    <span className="font-mono font-semibold px-1.5 py-0.5 rounded-md bg-[var(--marker-amber-dim)] text-[var(--marker-amber)] shrink-0">
                      ({opt.letter})
                    </span>
                    <span className="overflow-x-auto scrollbar-none font-medium">
                      <MathInline latex={opt.text} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* FEEDBACK REAL: STATUS + REPETIÇÃO ESPAÇADA SM-2 + LEMA ASSOCIADO */}
          {shouldShowExplain && (
            <div className={`p-4 rounded-xl text-xs leading-relaxed animate-fadeIn border space-y-3 text-[var(--ink-primary)] ${
              isAnswered && !isCorrect
                ? "bg-[var(--marker-amber-dim)] border-[var(--marker-amber-border)]"
                : "bg-[var(--marker-green-dim)] border-[var(--marker-green-border)]"
            }`}>
              {/* Status do acerto */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
                <span className={`font-semibold flex items-center gap-1.5 ${
                  isAnswered && !isCorrect ? "text-[var(--marker-amber)]" : "text-[var(--marker-green)]"
                }`}>
                  <CheckCircle2 size={14} />
                  <span>
                    {isAnswered
                      ? (isCorrect
                          ? `Correto! Alternativa Oficial (${q.correctLetter}) confirmada.`
                          : `Você marcou (${selectedLetter}) · Gabarito: (${q.correctLetter})`)
                      : `Gabarito Oficial: Alternativa (${q.correctLetter})`}
                  </span>
                </span>
                <span className="font-mono text-[10px] font-semibold text-[var(--marker-amber)] bg-[var(--marker-amber-dim)] border border-[var(--marker-amber-border)] px-2 py-0.5 rounded-md">
                  Gabarito: ({q.correctLetter})
                </span>
              </div>

              {/* CARD DE LEMA MATEMÁTICO DO LEMMAS */}
              <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold font-mono tabular-nums text-[var(--marker-amber)]">
                    <BookOpen size={12} />
                    <span>Lema #{q.lemma.number} · {q.lemma.name}</span>
                  </span>
                  <span className="text-[9px] font-mono text-[var(--ink-muted)] uppercase">
                    Catálogo de Lemas
                  </span>
                </div>

                {/* Fórmula em destaque com KaTeX */}
                <div className="py-1.5 px-3 rounded-md bg-[var(--marker-amber-dim)] border border-[var(--marker-amber-border)] text-center font-serif text-[var(--ink-primary)] overflow-x-auto">
                  <MathText text={`$${q.lemma.formula}$`} />
                </div>

                <p className="text-[11px] text-[var(--ink-secondary)] leading-relaxed">
                  <strong className="text-[var(--marker-amber)]">Gatilho Cognitivo: </strong>
                  {q.lemma.trigger}
                </p>

                <p className="text-[11px] text-[var(--ink-secondary)] leading-relaxed">
                  <strong className="text-[var(--marker-amber)]">Ação / Teorema: </strong>
                  {q.lemma.action}
                </p>
              </div>

              {/* Agendamento da repetição espaçada SM-2 */}
              <div className="p-2.5 rounded-lg bg-[var(--bg-board)] border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-[var(--ink-secondary)]">
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-[var(--marker-amber)]" />
                  <span>Repetição Espaçada SM-2:</span>
                </span>
                <span className="font-semibold text-[var(--marker-amber)]">
                  {isCorrect ? "Próxima revisão em 3 dias (EF: 2.50)" : "Revisão prioritária hoje (EF: 2.36)"}
                </span>
              </div>

              {/* Explicação Passo a Passo */}
              <div className="space-y-1 text-[var(--ink-secondary)]">
                <strong className="text-[11px] font-semibold text-[var(--ink-primary)] block">
                  Resolução passo a passo guiada pelo Lema:
                </strong>
                <div className="text-xs leading-relaxed whitespace-pre-line overflow-x-auto">
                  <MathText text={q.explain} />
                </div>
              </div>
            </div>
          )}

          {/* TUTOR SOCRÁTICO ADAPTATIVO (MÉTODO PÓLYA) */}
          {socraticLevel !== null && !shouldShowExplain && (
            <div className="p-3.5 rounded-xl bg-[var(--marker-blue-dim)] border border-[var(--marker-blue-border)] text-xs text-[var(--ink-primary)] leading-relaxed animate-fadeIn space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-[var(--marker-blue-border)]">
                <strong className="text-[var(--marker-blue)] flex items-center gap-1.5 font-mono text-[10px] uppercase tabular-nums">
                  <Lightbulb size={12} />
                  <span>Tutor Socrático · Método Pólya (Nível {socraticLevel})</span>
                </strong>
                <span className="text-[9px] font-mono text-[var(--ink-muted)]">sem spoiler</span>
              </div>
              <div className="text-xs overflow-x-auto">
                {socraticLevel === 1 && <MathText text={q.socraticHint.level1} />}
                {socraticLevel === 2 && <MathText text={q.socraticHint.level2} />}
                {socraticLevel === 3 && <MathText text={q.socraticHint.level3} />}
              </div>
            </div>
          )}

          {/* CONTROLES DO RODAPÉ */}
          <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-3">
              {!shouldShowExplain && (
                <button
                  type="button"
                  onClick={() => setSocraticLevel((prev) => (prev === null ? 1 : prev < 3 ? prev + 1 : null))}
                  className="text-[var(--marker-blue)] font-semibold hover:underline flex items-center gap-1 cursor-pointer tabular-nums"
                >
                  <Lightbulb size={12} />
                  <span>
                    {socraticLevel === null
                      ? "Dica Socrática"
                      : socraticLevel < 3
                        ? `Dica Nível ${socraticLevel + 1} ↗`
                        : "Ocultar dicas"}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setForceShowExplain(!shouldShowExplain)}
                className="text-[var(--ink-secondary)] hover:text-[var(--marker-amber)] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                {shouldShowExplain ? (
                  <>
                    <ChevronUp size={12} />
                    <span>Ocultar lema</span>
                  </>
                ) : (
                  <>
                    <BookOpen size={12} />
                    <span>Ver lema & gabarito</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/resolver?id=${q.id}`}
                className="px-2.5 py-1 rounded-lg bg-[var(--marker-amber-dim)] border border-[var(--marker-amber-border)] text-[var(--marker-amber)] font-semibold hover:opacity-90 transition-opacity flex items-center gap-1"
                title="Praticar esta questão com S-Pen e Régua/Compasso na Bancada"
              >
                <Compass size={11} />
                <span>Praticar na Lousa ↗</span>
              </Link>

              <button
                type="button"
                onClick={handleNext}
                className="px-2.5 py-1 rounded-lg border border-[var(--border-default)] text-[var(--ink-primary)] font-semibold hover:border-[var(--border-strong)] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Outra questão</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-mono text-[var(--ink-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-[var(--marker-green)]" />
              <span>Aprender com os erros.</span>
            </span>
            <span className="tabular-nums">Exemplo {currentIdx + 1} de {QUESTIONS.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
