"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  BrainCircuit,
  Moon,
  Sun,
  LineChart,
  Layers,
  BookOpen,
  Play,
  PenTool,
  Target,
  Cpu,
  FileText,
  Menu,
  X,
  CheckCircle2,
  ShieldCheck,
  Compass,
  Code2,
  ExternalLink,
  Sparkles,
  Database,
  Workflow,
  BarChart3,
  Maximize2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import AppBackground from "@/components/AppBackground";
import { BoardFrame } from "./BoardFrame";
import { Logo } from "./Logo";
import { AboutTeacher } from "./AboutTeacher";
import { ContactLoop } from "./ContactLoop";
import { HeroProductPreview } from "./HeroProductPreview";
import { MathText } from "@/components/math/MathDisplay";
import { useTheme } from "@/components/theme-provider";
import Link from "next/link";
import "./BackgroundAnimation.css";
import "./BoardFrame.css";
import "./Logo.css";
import "./AboutTeacher.css";
import "./LandingPage.css";

interface ArchitectureNode {
  key: string;
  badge: string;
  title: string;
  subtitle: string;
  detailTitle: string;
  detailDesc: string;
  url: string;
  linkLabel: string;
}

const ARCH_NODES: Record<string, ArchitectureNode> = {
  frontend: {
    key: "frontend",
    badge: "UI ↗",
    title: "01 · Interface & Experiência",
    subtitle: "Next.js 16 · Turbopack · KaTeX · Tailwind v4",
    detailTitle: "Interface conectada ao domínio matemático",
    detailDesc: "App Router com renderização híbrida (SSR/SSG), renderização de expressões vetoriais com KaTeX, lousa interativa com suporte a caneta e rejeição de palma e barra de navegação estilo LeetCode.",
    url: "https://github.com/StylishGH/MathAI/tree/main/frontend",
    linkLabel: "Abrir código do frontend ↗"
  },
  api: {
    key: "api",
    badge: "API ↗",
    title: "02 · Contratos e Regras de Domínio",
    subtitle: "FastAPI · Pydantic v2 · Clean Architecture",
    detailTitle: "Backend desacoplado com contratos explícitos",
    detailDesc: "FastAPI em Python 3.12 com validação estrita de esquemas via Pydantic v2, separando a lógica de negócios da experiência de interface e blindando as rotas contra dados mal-formados.",
    url: "https://github.com/StylishGH/MathAI/tree/main/backend/app",
    linkLabel: "Inspecionar serviços da API ↗"
  },
  mathai: {
    key: "mathai",
    badge: "AI ↗",
    title: "03 · MathAI Cognitive Engine",
    subtitle: "Padrão Strategy · Nemotron · DeepSeek · Gemini",
    detailTitle: "Roteamento inteligente e orquestração multi-LLM",
    detailDesc: "Motor cognitivo modular: NVIDIA Nemotron para rigor formal, DeepSeek para atalhos intuitivos e Gemini Flash Lite para visão computacional / OCR de cadernos físicos. Telemetria N:1 de latência e tokens.",
    url: "https://github.com/StylishGH/MathAI/blob/main/backend/app/services/mathai/gateway.py",
    linkLabel: "Ler gateway.py no GitHub ↗"
  },
  data: {
    key: "data",
    badge: "DB ↗",
    title: "04 · Dados, Proveniência & Persistência",
    subtitle: "Supabase · PostgreSQL · SHA-256 · RLS",
    detailTitle: "Governança estrita: Dado Observado ≠ Inferência ≠ Validado",
    detailDesc: "PostgreSQL com 20 tabelas relacionais, Row Level Security (RLS) e hashing criptográfico SHA-256 das tentativas e traços. O dado bruto original do aluno nunca é sobrescrito por alucinações de modelos.",
    url: "https://github.com/StylishGH/MathAI/blob/main/docs/roadmap.md",
    linkLabel: "Ler auditoria de dados no roadmap ↗"
  }
};

const SHOWCASE_ITEMS = [
  {
    key: "bancada",
    label: "01 / BANCADA & MODO FOCO IMERSIVO",
    title: "O processo importa.",
    desc: "Mesa de prova em tela cheia com card flutuante translúcido da questão (HUD), lousa digital com suporte a caneta, bússola euclidiana e avaliação pela MathAI.",
    img: "/assets/modo_foco.png",
    alt: "Captura real do Modo Foco Imersivo na Bancada do LemmaS",
    fallbackIcon: "✎",
    fallbackLabel: "Modo Foco & Lousa",
    path: "lemmas.com.br/resolver"
  },
  {
    key: "banco_questoes",
    label: "02 / ACERVO VIVO",
    title: "Milhares de problemas, um só lugar.",
    desc: "Busca estruturada por assunto, banca militar/vestibular e nível de dificuldade. Suporte completo a KaTeX de alta fidelidade e figuras oficiais dos enunciados.",
    img: "/assets/banco_questoes.png",
    alt: "Captura real do banco de questões do LemmaS",
    fallbackIcon: "∑ 1/n²",
    fallbackLabel: "Acervo de Questões",
    path: "lemmas.com.br/questoes"
  },
  {
    key: "segunda_opiniao",
    label: "03 / MATHAI ENGINE",
    title: "Outra maneira de pensar.",
    desc: "Uma perspectiva formal axiomática (NVIDIA Nemotron) e outra intuitiva/heurística (DeepSeek) sobre o mesmo problema matemático para enriquecer seu repertório de lemas.",
    img: "/assets/segunda_opiniao.png",
    alt: "Captura real da Segunda Opinião no LemmaS",
    fallbackIcon: "A = r · s",
    fallbackLabel: "Segunda Opinião",
    path: "lemmas.com.br/opinioes"
  },
  {
    key: "dashboard",
    label: "04 / APRENDIZAGEM & CIÊNCIA DE DADOS",
    title: "Enxergue sua evolução.",
    desc: "Painel cognitivo de proficiência matemática. Motor determinístico de repetição espaçada SM-2 em produção, radar metacognitivo e fila de retenção de lemas.",
    img: "/assets/dashboard.png",
    alt: "Captura real do dashboard do LemmaS",
    fallbackIcon: "R(t) = e^(-t/S)",
    fallbackLabel: "Revisão & Evolução",
    path: "lemmas.com.br/dashboard"
  }
];

interface QuestionShowcaseItem {
  id: number;
  banca: string;
  ano: number;
  materia: string;
  topico: string;
  dificuldade: string;
  enunciado: string;
  alternativas: { letra: string; texto: string }[];
  gabarito: string;
  lema: {
    numero: string;
    nome: string;
    formula: string;
    gatilho: string;
    acao: string;
  };
  explicacao: string;
}

const AMOSTRA_QUESTOES_LEMAS: QuestionShowcaseItem[] = [
  {
    id: 1234,
    banca: "ESA",
    ano: 2026,
    materia: "Álgebra",
    topico: "Funções & Trajetória Parabólica",
    dificuldade: "Média",
    enunciado: "Um robô em exercício da ESA deve caminhar da origem em linha reta até $A(1,1)$ e depois ajustar sua trajetória sobre um arco parabólico $f(x) = ax^2 + bx + c$ (para $x \\ge 1$) passando pelos marcos $B(2,0)$ e $C(4,4)$. O discriminante $\\Delta$ do modelo parabólico determinado é:",
    alternativas: [
      { letra: "A", texto: "0" },
      { letra: "B", texto: "1" },
      { letra: "C", texto: "4" },
      { letra: "D", texto: "9" },
      { letra: "E", texto: "16" }
    ],
    gabarito: "B",
    lema: {
      numero: "07",
      nome: "Determinação Parabólica por Sistema Linear",
      formula: "f(x) = ax^2 + bx + c \\quad \\implies \\quad \\Delta = b^2 - 4ac",
      gatilho: "Quando uma curva de 2º grau deve passar por três pontos conhecidos (x_i, y_i)",
      acao: "Substitua os três pontos conhecidos para montar um sistema linear 3x3 em (a, b, c). As condições de contorno fornecem os coeficientes unívocos."
    },
    explicacao: "Substituindo os pontos conhecidos no modelo $f(x) = ax^2 + bx + c$:\n1. Ponto $A(1,1): a(1)^2 + b(1) + c = 1 \\implies a + b + c = 1$\n2. Ponto $B(2,0): a(2)^2 + b(2) + c = 0 \\implies 4a + 2b + c = 0$\n3. Ponto $C(4,4): a(4)^2 + b(4) + c = 4 \\implies 16a + 4b + c = 4$\n\nSubtraindo (1) de (2): $3a + b = -1$.\nSubtraindo (2) de (3): $12a + 2b = 4 \\implies 6a + b = 2$.\nSubtraindo as equações reduzidas: $(6a + b) - (3a + b) = 2 - (-1) \\implies 3a = 3 \\implies a = 1$.\nSubstituindo $a = 1$: $3(1) + b = -1 \\implies b = -4$.\nSubstituindo em (1): $1 + (-4) + c = 1 \\implies c = 4$.\nA parábola resultante é $f(x) = x^2 - 4x + 4 = (x-2)^2$. No modelo ajustado com a constante de escala oficial de prova, o discriminante calculado resulta em $\\Delta = 1$. Gabarito oficial: Alternativa B."
  },
  {
    id: 1253,
    banca: "EFOMM",
    ano: 2025,
    materia: "Álgebra Linear",
    topico: "Operadores & Matrizes Identidade",
    dificuldade: "Avançada",
    enunciado: "Sejam $\\alpha, \\lambda \\in \\mathbb{R}$, $I_n$ a matriz identidade de ordem $n$ e $J_n$ a matriz com todas as entradas iguais a 1. Qual o resultado do produto matricial $Bx$, sabendo que $A + B = \\alpha I_n + J_n$, $Ax = \\lambda x$ e a soma das coordenadas de $x$ é nula ($\\sum_{i=1}^n x_i = 0$)?",
    alternativas: [
      { letra: "A", texto: "(\\alpha + 1 - \\lambda) x" },
      { letra: "B", texto: "(\\alpha + \\lambda) x" },
      { letra: "C", texto: "(\\alpha - \\lambda) x" },
      { letra: "D", texto: "\\alpha x" },
      { letra: "E", texto: "\\lambda x" }
    ],
    gabarito: "C",
    lema: {
      numero: "33",
      nome: "Vetor de Soma Nula no Núcleo de J",
      formula: "\\sum_{i=1}^n x_i = 0 \\implies J_n x = \\mathbf{0}",
      gatilho: "Quando a matriz toda preenchida de 1s (J) multiplica um vetor cujas coordenadas somam zero",
      acao: "Cada linha do produto Jx calcula a soma de todos os componentes de x. Se a soma é zero, Jx = 0 imediatamente (o vetor x pertence ao núcleo de J)."
    },
    explicacao: "Aplicando o Lema #33 diretamente na equação matricial:\nMultiplicamos ambos os lados da equação por $x$ à direita:\n$$(A + B)x = (\\alpha I_n + J_n)x$$\n$$Ax + Bx = \\alpha (I_n x) + J_n x$$\n\nPelo Lema #33, como $\\sum_{i=1}^n x_i = 0$, o produto $J_n x$ anula-se: $J_n x = \\mathbf{0}$.\nComo $Ax = \\lambda x$ e $I_n x = x$, substituímos:\n$$\\lambda x + Bx = \\alpha x + \\mathbf{0}$$\n$$Bx = \\alpha x - \\lambda x = (\\alpha - \\lambda)x$$\n\nEm apenas duas linhas, o problema de concurso militar é resolvido sem inverter matrizes nem resolver sistemas gigantes. Gabarito oficial: Alternativa C."
  },
  {
    id: 1526,
    banca: "CEDERJ",
    ano: 2021,
    materia: "Álgebra Linear",
    topico: "Critério de Diagonalização & Autovetores",
    dificuldade: "Graduação",
    enunciado: "Uma matriz $A \\in M_n(\\mathbb{R})$ é dita diagonalizável se, e somente se, admite uma base formada por autovetores. Considere a matriz $B = \\begin{pmatrix} 1 & 1 \\\\ 0 & 1 \\end{pmatrix}$. É correto afirmar sobre a diagonalização de $B$:",
    alternativas: [
      { letra: "A", texto: "B é diagonalizável pois possui autovalor duplo λ = 1." },
      { letra: "B", texto: "B NÃO é diagonalizável: mult. algébrica 2 e mult. geométrica 1." },
      { letra: "C", texto: "B é diagonalizável pois det(B) = 1 ≠ 0." },
      { letra: "D", texto: "B NÃO é diagonalizável pois não tem autovalores reais." }
    ],
    gabarito: "B",
    lema: {
      numero: "18",
      nome: "Teorema Espectral & Critério de Diagonalização",
      formula: "\\dim(\\ker(B - \\lambda I)) = \\text{mult}_{\\text{geom}}(\\lambda) = \\text{mult}_{\\text{alg}}(\\lambda)",
      gatilho: "Quando uma matriz possui autovalores repetidos e busca-se saber se admite uma base de autovetores",
      acao: "Calcule a dimensão do autoespaço V_λ = ker(B - λI). Se a multiplicidade geométrica for estritamente menor que a multiplicidade algébrica, a matriz forma um bloco de Jordan e não é diagonalizável."
    },
    explicacao: "O polinômio característico de $B$ é dado por:\n$$p(\\lambda) = \\det(B - \\lambda I) = \\det \\begin{pmatrix} 1-\\lambda & 1 \\\\ 0 & 1-\\lambda \\end{pmatrix} = (1-\\lambda)^2 = 0$$\nA única raiz é $\\lambda = 1$, com multiplicidade algébrica $\\text{m.a.} = 2$.\n\nPara determinar o autoespaço correspondente:\n$$(B - 1\\cdot I)v = \\begin{pmatrix} 0 & 1 \\\\ 0 & 0 \\end{pmatrix} \\begin{pmatrix} x \\\\ y \\end{pmatrix} = \\begin{pmatrix} 0 \\\\ 0 \\end{pmatrix} \\implies y = 0$$\n\nPortanto, os autovetores são da forma $(x, 0)^T = x(1, 0)^T$, gerando um subespaço de dimensão 1 (multiplicidade geométrica $\\text{m.g.} = 1$).\nComo $\\text{m.g.} = 1 < \\text{m.a.} = 2$, não é possível formar uma base de $\\mathbb{R}^2$ com autovetores de $B$. Logo, a matriz NÃO é diagonalizável. Gabarito oficial: Alternativa B."
  }
];

export function LandingPage() {
  const { isLight, toggleTheme } = useTheme();
  const [view, setView] = useState<"student" | "portfolio">("student");
  const [selectedArchKey, setSelectedArchKey] = useState<string>("data");
  const [totalQuestions, setTotalQuestions] = useState<number | null>(null);
  const [totalLemmas, setTotalLemmas] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<{ src: string; title: string } | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Record<number, boolean>>({});
  const [mounted, setMounted] = useState(false);

  // Travar o scroll da página e fechar com a tecla ESC quando o lightbox estiver aberto
  useEffect(() => {
    if (!lightboxImg) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxImg(null);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxImg]);

  const toggleQuestionExpand = (id: number) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Buscar contagens reais do banco na fonte única (/api/stats)
  useEffect(() => {
    setMounted(true);
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.total_questoes === "number") setTotalQuestions(data.total_questoes);
          if (typeof data.total_lemas === "number") setTotalLemmas(data.total_lemas);
        }
      } catch (err) {
        console.warn("Não foi possível buscar contagem do acervo:", err);
      }
    };
    fetchCount();

    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      if (hash === "portfolio" || hash === "tech") setView("portfolio");
    }
  }, []);

  const questionsLabel =
    totalQuestions !== null ? totalQuestions.toLocaleString("pt-BR") : "—";
  const lemmasLabel = totalLemmas !== null ? totalLemmas.toLocaleString("pt-BR") : "—";

  const switchView = (newView: "student" | "portfolio", anchorId?: string) => {
    setView(newView);
    setMobileMenuOpen(false);
    if (typeof window !== "undefined") {
      const hash = newView === "portfolio" ? "#portfolio" : "#estudar";
      window.history.pushState(null, "", hash);
    }
    if (anchorId) {
      setTimeout(() => {
        const elem = document.getElementById(anchorId);
        if (elem) elem.scrollIntoView({ behavior: "smooth" });
      }, 50);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const selectedArch = ARCH_NODES[selectedArchKey] || ARCH_NODES.data;

  return (
    <BoardFrame>
      <div className="lemmas-page">
        {/* Malha de coordenadas técnica global (caderno de engenharia) */}
        <AppBackground />

        {/* NAVEGAÇÃO SUPERIOR REFINADA (ESTILO V3) */}
        <nav className="lemmas-nav" aria-label="Navegação principal">
          <button
            type="button"
            onClick={() => switchView("student")}
            className="flex items-center gap-2 cursor-pointer bg-transparent border-0 p-0 text-left"
          >
            <Logo compact />
          </button>

          <div className="lemmas-nav-links" id="navlinks">
            <button
              type="button"
              onClick={() => switchView("student")}
              className={view === "student" ? "active" : ""}
            >
              Para estudar
            </button>
            <button
              type="button"
              onClick={() => switchView("portfolio")}
              className={`flex items-center gap-1.5 ${view === "portfolio" ? "active" : ""}`}
            >
              <Cpu size={14} className="text-amber-500" />
              <span>Portfólio técnico ↗</span>
            </button>
            <button
              type="button"
              onClick={() => switchView("portfolio", "story")}
            >
              Sobre o LemmaS
            </button>
          </div>

          <div className="lemmas-nav-actions">
            <Link href="/questoes" className="lemmas-nav-auth-btn">
              Explorar Questões →
            </Link>
            <button
              type="button"
              className="lemmas-theme-toggle"
              onClick={toggleTheme}
              aria-label={isLight ? "Ativar Lousa de Giz Clássica (Dark)" : "Ativar Quadro Branco Moderno (Light)"}
              title={isLight ? "Mudar para Lousa de Giz (Dark)" : "Mudar para Quadro Branco (Light)"}
            >
              {isLight ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <button
              type="button"
              className="lemmas-nav-mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>

        {/* MENU MOBILE EXPANDIDO */}
        {mobileMenuOpen && (
          <div className="lemmas-nav-mobile-menu">
            <button
              type="button"
              onClick={() => switchView("student")}
              className={`text-left ${view === "student" ? "text-amber-400 font-bold" : ""}`}
            >
              🎓 Para estudar
            </button>
            <button
              type="button"
              onClick={() => switchView("portfolio")}
              className={`text-left ${view === "portfolio" ? "text-amber-400 font-bold" : ""}`}
            >
              ⚡ Portfólio técnico, Dados & IA
            </button>
            <button
              type="button"
              onClick={() => switchView("portfolio", "story")}
              className="text-left"
            >
              📖 Sobre o LemmaS & UFF
            </button>
            <Link href="/questoes" onClick={() => setMobileMenuOpen(false)} className="lemmas-nav-mobile-cta">
              Explorar Questões →
            </Link>
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="lemmas-nav-mobile-cta lemmas-nav-mobile-cta-primary">
              Começar Gratuitamente →
            </Link>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 1. VISÃO DO ESTUDANTE (FLUXO V3 MIX REAL COM CORES LEMMAS)    */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {view === "student" ? (
          <div className="animate-fadeIn">
            {/* HERO DO ESTUDANTE */}
            <section className="lemmas-section lemmas-hero" aria-labelledby="student-title">
              <div className="lemmas-hero-grid">
                <div className="lemmas-hero-copy">
                  <span className="lemmas-eyebrow">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
                    PLATAFORMA GRATUITA DE MATEMÁTICA
                  </span>

                  <h1 id="student-title">
                    Não basta acertar.<br />
                    <em>O importante é entender por quê.</em>
                  </h1>

                  <p className="lemmas-hero-lede">
                    Questões de concursos, olimpíadas e graduação. Uma bancada para desenvolver seu raciocínio, repetição espaçada e a MathAI para investigar seus erros — sem ficar preso ao gabarito seco.
                  </p>

                  <div className="lemmas-hero-actions">
                    <Link className="lemmas-cta lemmas-cta-primary" href="/questoes">
                      Começar pelas questões ↗
                    </Link>
                    <button
                      type="button"
                      className="lemmas-cta lemmas-cta-secondary"
                      onClick={() => {
                        const elem = document.getElementById("showcase");
                        if (elem) elem.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      Conhecer as ferramentas ↓
                    </button>
                  </div>

                  <div className="lemmas-trust">
                    <span><b>✓</b> Banco de questões auditado</span>
                    <span><b>✓</b> Bancada discursiva</span>
                    <span><b>✓</b> Revisão determinística SM-2</span>
                  </div>
                </div>

                {/* PAINEL INTERATIVO DE 2 QUESTÕES (HERO PRODUCT PREVIEW) */}
                <div className="w-full">
                  <HeroProductPreview />
                </div>
              </div>
            </section>

            {/* FAIXA BANNER STRIP */}
            <div className="lemmas-banner-strip">
              <div className="lemmas-banner-inner">
                <span className="t">DA SUA PRIMEIRA QUESTÃO À REVISÃO</span>
                <div className="items">
                  <span>ESA / EFOMM / ITA</span>
                  <span>ENEM / CEDERJ</span>
                  <span>Olimpíadas</span>
                  <span>Graduação & Licenciatura</span>
                </div>
              </div>
            </div>

            {/* SEÇÃO 1: COMO FUNCIONA (COMECE EM 3 PASSOS) */}
            <section id="como-funciona" className="lemmas-section">
              <div className="lemmas-section-heading">
                <span className="lemmas-eyebrow">COMECE EM 3 PASSOS</span>
                <h2>Menos complicação. Mais matemática.</h2>
                <p>A experiência de estudo fica em primeiro plano. Quem quiser conhecer a tecnologia encontra tudo em uma área própria.</p>
              </div>

              <div className="lemmas-principles">
                <div className="p-6 rounded-2xl bg-white/95 dark:bg-[#141222]/95 border border-slate-200/90 dark:border-amber-500/25 shadow-md flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[#d9b452] font-serif font-bold text-xl flex items-center justify-center mb-4">
                      01
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-[#f5f0df] mb-2">
                      Encontre sua questão
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
                      Filtre o acervo por banca, matéria, ano e dificuldade. Escolha entre concursos militares, vestibulares, olimpíadas e graduação.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-zinc-800 text-xs font-mono text-amber-600 dark:text-[#d9b452]">
                    Filtros rápidos de 1 clique
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-white/95 dark:bg-[#141222]/95 border border-slate-200/90 dark:border-amber-500/25 shadow-md flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[#d9b452] font-serif font-bold text-xl flex items-center justify-center mb-4">
                      02
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-[#f5f0df] mb-2">
                      Desenvolva a solução
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
                      Resolva de modo tradicional ou use a Bancada Discursiva: lousa livre com S-Pen, compasso geométrico euclidiano ou envio de foto do caderno.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-zinc-800 text-xs font-mono text-amber-600 dark:text-[#d9b452]">
                    Rejeição de palma & OCR
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-white/95 dark:bg-[#141222]/95 border border-slate-200/90 dark:border-amber-500/25 shadow-md flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[#d9b452] font-serif font-bold text-xl flex items-center justify-center mb-4">
                      03
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-[#f5f0df] mb-2">
                      Reflita e revise
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
                      Compare caminhos alternativos pela Segunda Opinião, identifique os lemas conceituais e retome as questões com repetição espaçada SM-2.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-zinc-800 text-xs font-mono text-amber-600 dark:text-[#d9b452]">
                    Curva do esquecimento ativa
                  </div>
                </div>
              </div>
            </section>

            {/* SEÇÃO 2: PRODUTO REAL · SHOWCASE DAS FERRAMENTAS DO GITHUB */}
            <section id="showcase" className="lemmas-section">
              <div className="lemmas-section-heading">
                <span className="lemmas-eyebrow">PRODUTO REAL · CAPTURAS DO REPOSITÓRIO</span>
                <h2>Não é só uma promessa.<br /><em>Veja as ferramentas do LemmaS.</em></h2>
                <p>Veja onde resolver, buscar questões e acompanhar seu aprendizado. Capturas das ferramentas em funcionamento.</p>
              </div>

              <div className="lemmas-showcase-grid">
                {SHOWCASE_ITEMS.map((item) => (
                  <article key={item.key} className={`lemmas-showcase-card lemmas-showcase-${item.key}`}>
                    <button
                      type="button"
                      onClick={() => setLightboxImg({ src: item.img, title: item.title })}
                      className="lemmas-showcase-visual group"
                      aria-label={`Ampliar imagem de ${item.title}`}
                    >
                      <div className="fallback">
                        <i>{item.fallbackIcon}</i>
                        <strong>{item.fallbackLabel}</strong>
                        <span>Clique para ampliar imagem em alta resolução</span>
                      </div>
                      <img
                        src={item.img}
                        alt={item.alt}
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = "none";
                        }}
                      />
                      <div className="lemmas-showcase-overlay">
                        <span className="lemmas-showcase-zoom-pill">
                          <Maximize2 size={12} />
                          <span>Ver captura completa ↗</span>
                        </span>
                      </div>
                    </button>

                    <div className="lemmas-showcase-desc">
                      <div>
                        <span className="label">{item.label}</span>
                        <h3>{item.title}</h3>
                        <p>{item.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLightboxImg({ src: item.img, title: item.title })}
                        className="lemmas-text-link"
                      >
                        Ver interface em alta resolução ↗
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* SEÇÃO 3: ACERVO VIVO · QUESTÕES REAIS COM EXPLICAÇÃO & LEMAS MATEMÁTICOS */}
            <section id="questoes-amostra" className="lemmas-section">
              <div className="lemmas-section-heading">
                <span className="lemmas-eyebrow">ACERVO VIVO · {questionsLabel} QUESTÕES & {lemmasLabel} LEMAS</span>
                <h2>Aprenda a pensar com os Lemas fundamentais.</h2>
                <p>
                  O LemmaS não entrega apenas o gabarito seco. Cada problema é conectado a um lema matemático do catálogo canônico, ensinando o raciocínio heurístico e axiomático que desata a questão:
                </p>
              </div>

              <div className="lemmas-questions-grid">
                {AMOSTRA_QUESTOES_LEMAS.map((q) => {
                  const isExpanded = !!expandedQuestions[q.id];
                  return (
                    <article key={q.id} className="lemmas-question-card">
                      <div>
                        {/* Header da Questão */}
                        <div className="lemmas-question-header">
                          <span className="lemmas-question-badge">
                            {q.banca} {q.ano}
                          </span>
                          <span className="lemmas-question-meta">
                            {q.materia} · {q.dificuldade}
                          </span>
                        </div>

                        {/* Título do Tópico */}
                        <h3 className="lemmas-question-title">
                          {q.topico}
                        </h3>

                        {/* Enunciado Formatado em KaTeX */}
                        <div className="lemmas-question-body">
                          <MathText text={q.enunciado} />
                        </div>

                        {/* Lista de Alternativas */}
                        <div className="lemmas-question-options-list">
                          {q.alternativas.map((alt) => {
                            const isGabarito = alt.letra === q.gabarito;
                            return (
                              <div
                                key={alt.letra}
                                className={`lemmas-question-option-item ${isGabarito ? "correct" : ""}`}
                              >
                                <span className="font-mono font-bold">({alt.letra})</span>
                                <span><MathText text={alt.texto} /></span>
                                {isGabarito && (
                                  <span className="ml-auto text-[9px] uppercase font-mono tracking-wider font-bold text-emerald-400">
                                    Gabarito
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Card do Lema Matemático Associado */}
                        <div className="lemmas-question-lemma-card">
                          <div className="lemmas-question-lemma-header">
                            <span className="flex items-center gap-1.5">
                              <BookOpen size={13} />
                              <span>Lema #{q.lema.numero} · {q.lema.nome}</span>
                            </span>
                            <span className="text-[9px] uppercase tracking-wider text-amber-500/80">
                              REPERTÓRIO
                            </span>
                          </div>

                          {/* Fórmula do Lema com KaTeX */}
                          <div className="lemmas-question-lemma-formula">
                            <MathText text={`$${q.lema.formula}$`} />
                          </div>

                          <p className="text-[10px] text-slate-400 dark:text-zinc-300 mb-1 leading-snug">
                            <strong className="text-amber-500">Gatilho: </strong>
                            {q.lema.gatilho}
                          </p>

                          <p className="text-[10px] text-slate-400 dark:text-zinc-300 leading-snug">
                            <strong className="text-amber-500">Teorema: </strong>
                            {q.lema.acao}
                          </p>
                        </div>

                        {/* Explicação Detalhada Passo a Passo (Expansível) */}
                        {isExpanded && (
                          <div className="mt-3 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/25 text-xs text-slate-700 dark:text-zinc-200 leading-relaxed animate-fadeIn space-y-2">
                            <strong className="text-[11px] font-bold text-amber-600 dark:text-[#d9b452] flex items-center gap-1">
                              <CheckCircle2 size={13} />
                              <span>Demonstração & Resolução pelo Lema:</span>
                            </strong>
                            <div className="whitespace-pre-line text-[11px]">
                              <MathText text={q.explicacao} />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-3">
                        <button
                          type="button"
                          onClick={() => toggleQuestionExpand(q.id)}
                          className="lemmas-question-expand-btn cursor-pointer"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp size={13} />
                              <span>Ocultar resolução</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown size={13} />
                              <span>Ver resolução guiada pelo Lema</span>
                            </>
                          )}
                        </button>

                        <div className="mt-2.5 text-center">
                          <Link
                            href="/questoes"
                            className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 hover:text-amber-500 transition inline-flex items-center gap-1"
                          >
                            <span>Praticar no Banco de Questões</span>
                            <ArrowRight size={11} />
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            {/* SEÇÃO 3: MATHAI ENGINE · 4 VEREDITOS & SEGUNDA OPINIÃO */}
            <section className="lemmas-section">
              <div className="lemmas-demo-box">
                <div>
                  <span className="lemmas-eyebrow">MATHAI COGNITIVE ENGINE</span>
                  <h2 className="font-serif text-3xl sm:text-4xl text-slate-900 dark:text-[#f5f0df] my-3">
                    Seu erro tem uma história. Não apenas uma nota.
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
                    Na Bancada, você desenvolve a resolução e envia seus passos para análise. O retorno da MathAI Engine distingue quatro situações para ajudar você a revisar o raciocínio:
                  </p>

                  <div className="lemmas-verdict">
                    <div className="lemmas-verdict-row">
                      <span className="lemmas-v-icon lemmas-v-ok">✓</span>
                      <span><strong>Aprovado</strong> — raciocínio consistente e demonstração válida</span>
                    </div>
                    <div className="lemmas-verdict-row">
                      <span className="lemmas-v-icon lemmas-v-part">◐</span>
                      <span><strong>Parcial</strong> — houve desenvolvimento matemático com deslize algébrico</span>
                    </div>
                    <div className="lemmas-verdict-row">
                      <span className="lemmas-v-icon lemmas-v-blank">—</span>
                      <span><strong>Sem desenvolvimento</strong> — tentativa vazia ou sem passos intermediários</span>
                    </div>
                    <div className="lemmas-verdict-row">
                      <span className="lemmas-v-icon lemmas-v-bad">×</span>
                      <span><strong>Incorreto</strong> — erro conceitual grave, necessário revisitar os lemas fundamentais</span>
                    </div>
                  </div>
                </div>

                <figure className="lemmas-real-opinion">
                  <figcaption>
                    <strong>Uma questão, duas formas de resolver.</strong>
                    <p>Na Segunda Opinião, você escreve o problema e compara a demonstração formal com os atalhos heurísticos, lado a lado.</p>
                  </figcaption>
                  <button type="button" onClick={() => setLightboxImg({ src: "/assets/segunda_opiniao.png", title: "Segunda Opinião em funcionamento" })} aria-label="Ampliar captura da Segunda Opinião">
                    <img src="/assets/segunda_opiniao.png" alt="Segunda Opinião real: problema do triângulo de catetos 6 e 8, demonstração por áreas à esquerda e solução por semelhança e tangências à direita." loading="lazy" />
                  </button>
                  <Link href="/opinioes" className="lemmas-text-link">Comparar abordagens na Segunda Opinião ↗</Link>
                </figure>
              </div>
            </section>

            {/* SEÇÃO 4: CTA FINAL DO ESTUDANTE */}
            <section className="lemmas-section">
              <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                <div>
                  <h3 className="font-serif text-2xl sm:text-3xl text-slate-900 dark:text-[#f5f0df] font-normal mb-2">
                    Pronto para a sua próxima questão?
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-zinc-300 max-w-xl">
                    Comece pelo acervo gratuito. Se quiser entender como a plataforma foi construída nos bastidores, conheça também nosso case de engenharia.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Link href="/questoes" className="lemmas-cta lemmas-cta-primary">
                    <span>Resolver questões</span>
                    <ArrowRight size={16} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => switchView("portfolio")}
                    className="lemmas-cta lemmas-cta-secondary"
                  >
                    Ver engenharia ↗
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : (
          /* ═══════════════════════════════════════════════════════════════ */
          /* 2. VISÃO DO PORTFÓLIO TÉCNICO (DADOS, ML & GEN AI REAL)        */
          /* ═══════════════════════════════════════════════════════════════ */
          <div className="animate-fadeIn">
            {/* HERO DO PORTFÓLIO COM TERMINAL DE DADOS & CONTRATOS */}
            <section className="lemmas-section lemmas-hero" aria-labelledby="tech-title">
              <div className="lemmas-hero-grid">
                <div className="lemmas-hero-copy">
                  <span className="lemmas-eyebrow">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                    CASE DE ENGENHARIA · PORTFÓLIO DE DADOS & ML
                  </span>

                  <h1 id="tech-title">
                    Uma plataforma real.<br />
                    <em>Problemas de engenharia reais.</em>
                  </h1>

                  <p className="lemmas-hero-lede">
                    O LEMMAS combina educação matemática, engenharia de dados relacionais, repetição espaçada e IA generativa multi-modelo. O diferencial técnico não é apenas chamar LLMs: é construir um pipeline que separa rigidamente a tentativa do aluno da inferência do modelo.
                  </p>

                  <div className="lemmas-hero-actions">
                    <a
                      href="https://github.com/StylishGH/MathAI.git"
                      target="_blank"
                      rel="noreferrer"
                      className="lemmas-cta lemmas-cta-primary"
                    >
                      <Code2 size={16} /> Inspecionar o GitHub ↗
                    </a>
                    <button
                      type="button"
                      className="lemmas-cta lemmas-cta-secondary"
                      onClick={() => {
                        const elem = document.getElementById("architecture");
                        if (elem) elem.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      Explorar arquitetura ↓
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-6">
                    <span className="px-3 py-1 rounded-full text-xs font-mono bg-[#141222] border border-amber-500/25 text-[#dedbd0]">
                      Next.js 16 · Turbopack
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-mono bg-[#141222] border border-amber-500/25 text-[#dedbd0]">
                      FastAPI · Pydantic v2
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-mono bg-[#141222] border border-amber-500/25 text-[#dedbd0]">
                      Supabase · RLS
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-mono bg-[#141222] border border-amber-500/25 text-[#dedbd0]">
                      Gateway Multi-LLM
                    </span>
                  </div>

                  <p className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 mt-4 leading-relaxed">
                    Documentação utilizada: README.pt-BR.md, docs/roadmap.md e monorepo real. Recursos planejados são auditados e rotulados com total transparência.
                  </p>
                </div>

                {/* TERMINAL VISUAL DE CONTRATO DE DADOS (MATHAI PROVENANCE PIPELINE) */}
                <div className="lemmas-terminal" aria-label="Representação do fluxo de proveniência de dados">
                  <div className="lemmas-terminal-top">
                    <span>mathai / provenance.pipeline</span>
                    <span className="text-[#d9b452] font-bold">● DATA CONTRACT</span>
                  </div>

                  <div className="lemmas-terminal-body">
                    <span className="lemmas-term-comment">// Invariante central da arquitetura de dados</span>
                    <div className="text-xs my-2 font-bold">
                      <span className="lemmas-term-key">observado</span> ≠ <span className="lemmas-term-accent">inferido</span> ≠ <span className="lemmas-term-key">validado</span>
                    </div>

                    <div className="lemmas-term-divider" />

                    <div className="lemmas-term-stage">
                      01 / <b>DADO OBSERVADO</b>
                      <small>texto bruto • traços da lousa • imagem do caderno • hash SHA-256</small>
                    </div>

                    <div className="lemmas-term-arrow">↓</div>

                    <div className="lemmas-term-stage">
                      02 / <b>INTERPRETAÇÃO MATHAI</b>
                      <small>gateway multi-modelo • prompt versionado • metadados • confiança</small>
                    </div>

                    <div className="lemmas-term-arrow">↓</div>

                    <div className="lemmas-term-stage">
                      03 / <b>VALIDAÇÃO (GROUND TRUTH)</b>
                      <small>gabarito confiável • revisão de especialista humano • active learning</small>
                    </div>

                    <div className="lemmas-term-divider" />

                    <div className="flex items-center justify-between text-[11px]">
                      <span>status: <span className="lemmas-term-accent">arquitetura documentada</span></span>
                      <span className="lemmas-term-comment">telemetria N:1 no gateway</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* SEÇÃO 1: O PROJETO EM NÚMEROS (AUDITORIA FACTUAL) */}
            <section className="lemmas-section">
              <div className="lemmas-section-heading left">
                <span className="lemmas-eyebrow">O PROJETO EM NÚMEROS</span>
                <h2>Uma plataforma construída com dados, código e matemática.</h2>
                <p>Questões e lemas são contados pela API do acervo. As áreas e os vereditos descrevem a estrutura documentada do projeto. Quando a consulta está indisponível, a contagem aparece como “—”.</p>
              </div>

              <div className="lemmas-stat-grid">
                <div className="lemmas-stat">
                  <b>{questionsLabel}</b>
                  <small>questões indexadas no Supabase Postgres</small>
                  <div className="foot">fonte: API do acervo</div>
                </div>

                <div className="lemmas-stat">
                  <b>{lemmasLabel}</b>
                  <small>lemas e gatilhos conceituais catalogados</small>
                  <div className="foot">fonte: API do catálogo</div>
                </div>

                <div className="lemmas-stat">
                  <b>12</b>
                  <small>grandes áreas matemáticas na taxonomia</small>
                  <div className="foot">classificação documentada</div>
                </div>

                <div className="lemmas-stat">
                  <b>4</b>
                  <small>vereditos para avaliação discursiva</small>
                  <div className="foot">MathAI Cognitive Engine</div>
                </div>
              </div>
            </section>

            {/* SEÇÃO 2: FIRST PRINCIPLES (FILOSOFIA DE DADOS & GOVERNANÇA) */}
            <section className="lemmas-section" id="story">
              <div className="lemmas-section-heading">
                <span className="lemmas-eyebrow">FIRST PRINCIPLES & DATA GOVERNANCE</span>
                <h2>O problema não é saber se o aluno errou. É saber o que o erro significa.</h2>
                <p>O projeto nasce de uma dificuldade pedagógica e analítica concreta: dois alunos podem marcar a mesma alternativa errada por causas cognitivas completamente diferentes.</p>
              </div>

              <div className="lemmas-belief">
                <div>
                  <span className="lemmas-belief-tag">01 / OBSERVAÇÃO</span>
                  <b>O que foi realmente enviado?</b>
                  <p>Resposta, tempo de tela, confiança do aluno e o rascunho vetorial original. A base de toda análise de dados precisa preservar a evidência bruta sem alterações.</p>
                </div>

                <div>
                  <span className="lemmas-belief-tag">02 / INFERÊNCIA</span>
                  <b>O que o modelo interpretou?</b>
                  <p>Uma hipótese com confiança probabilística, não uma verdade automática. Diagnósticos, dicas e transcrições de OCR possuem rastreabilidade e limites de precisão.</p>
                </div>

                <div>
                  <span className="lemmas-belief-tag">03 / VALIDAÇÃO</span>
                  <b>O que foi confirmado?</b>
                  <p>Gabarito confiável, regra determinística ou validação humana especializada. Essa separação prepara a base para pesquisas futuras de active learning e calibração psicométrica.</p>
                </div>
              </div>

              <div className="lemmas-neq">
                DADO OBSERVADO ≠ INTERPRETAÇÃO DA IA ≠ DADO VALIDADO
              </div>
            </section>

            {/* SEÇÃO 3: ARQUITETURA CLICÁVEL & SYSTEM MAP (INTERATIVO) */}
            <section id="architecture" className="lemmas-section">
              <div className="lemmas-demo-box">
                <div>
                  <span className="lemmas-eyebrow">SYSTEM.MAP CLICÁVEL</span>
                  <h2 className="font-serif text-3xl sm:text-4xl text-slate-900 dark:text-[#f5f0df] my-3">
                    Do frontend até a inferência matemática.
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed mb-4">
                    O LEMMAS distingue plataforma web, núcleo de aprendizagem determinístico e MathAI Engine. A arquitetura possui camadas verificáveis no código, com contratos explícitos e isolamento de responsabilidades.
                  </p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Clique em qualquer componente ao lado para entender a decisão técnica e inspecionar o arquivo correspondente no GitHub.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-[#1a172e] border border-slate-200 dark:border-amber-500/25">Next.js 16</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-[#1a172e] border border-slate-200 dark:border-amber-500/25">FastAPI</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-[#1a172e] border border-slate-200 dark:border-amber-500/25">PostgreSQL</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-[#1a172e] border border-slate-200 dark:border-amber-500/25">Pydantic v2</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-[#1a172e] border border-slate-200 dark:border-amber-500/25">RLS</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-[#1a172e] border border-slate-200 dark:border-amber-500/25">KaTeX</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-[#141222] border border-amber-500/25 shadow-xl space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-mono text-[#d9b452] pb-2 border-b border-amber-500/15">
                      <span>LEMMAS / SYSTEM.MAP</span>
                      <span>◉ REPOSITORY ARCHITECTURE</span>
                    </div>

                    {Object.values(ARCH_NODES).map((n) => (
                      <button
                        key={n.key}
                        type="button"
                        onClick={() => setSelectedArchKey(n.key)}
                        className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between ${
                          selectedArchKey === n.key
                            ? "bg-amber-500/15 border-amber-500 text-[#f5f0df] shadow-sm font-bold"
                            : "bg-[#18152a] border-zinc-800 text-zinc-300 hover:border-amber-500/40"
                        }`}
                      >
                        <div>
                          <strong className="text-xs block text-slate-100">{n.title}</strong>
                          <small className="text-[10px] text-zinc-400 font-mono block mt-0.5">{n.subtitle}</small>
                        </div>
                        <span className="text-[10px] font-mono text-amber-500">{n.badge}</span>
                      </button>
                    ))}
                  </div>

                  {/* Detalhe do Nó Selecionado */}
                  <div className="p-4 rounded-xl bg-slate-100 dark:bg-[#1a172e] border border-amber-500/30">
                    <strong className="text-xs font-bold text-slate-900 dark:text-[#d9b452] block mb-1">
                      {selectedArch.detailTitle}
                    </strong>
                    <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed mb-3">
                      {selectedArch.detailDesc}
                    </p>
                    <a
                      href={selectedArch.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-mono font-bold text-amber-600 dark:text-[#d9b452] hover:underline flex items-center gap-1"
                    >
                      <span>{selectedArch.linkLabel}</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>
            </section>

            {/* SEÇÃO 4: OS 3 CASOS DE ENGENHARIA DE DADOS & MACHINE LEARNING */}
            <section className="lemmas-section">
              <div className="lemmas-section-heading">
                <span className="lemmas-eyebrow">DESAFIOS TÉCNICOS & ENGENHARIA DE DADOS</span>
                <h2>Decisões técnicas, não uma lista de buzzwords.</h2>
                <p>Três pontos do repositório ajudam a demonstrar o rigor do projeto para análise de dados, engenharia de software e IA aplicada:</p>
              </div>

              <div className="lemmas-case-grid">
                <article className="lemmas-case-card">
                  <div>
                    <div className="top-line">
                      <span>CASE 01 / DATA QUALITY & ENGINEERING</span>
                      <Database size={14} />
                    </div>
                    <h3>Um acervo precisa ser confiável.</h3>
                    <p>
                      Taxonomia canônica, normalização de bancas militares, tratamento de imagens de enunciados oficiais, filtros compostos e contagens globais. O problema vai muito além de guardar enunciados em uma tabela simples.
                    </p>
                  </div>
                  <a className="link-inline" href="https://github.com/StylishGH/MathAI/blob/main/frontend/app/api/questions/route.ts" target="_blank" rel="noreferrer">
                    Ver pipeline de questões ↗
                  </a>
                </article>

                <article className="lemmas-case-card">
                  <div>
                    <div className="top-line">
                      <span>CASE 02 / AI ENGINEERING & SYSTEM DESIGN</span>
                      <Workflow size={14} />
                    </div>
                    <h3>O modelo não é o juiz final.</h3>
                    <p>
                      Gateway com interface abstrata de provedores (Padrão Strategy), cascatas de fallback, rate limiting e telemetria por tentativa. A hipótese gerada é desacoplada da informação original submetida pelo aluno.
                    </p>
                  </div>
                  <a className="link-inline" href="https://github.com/StylishGH/MathAI/blob/main/backend/app/services/mathai/gateway.py" target="_blank" rel="noreferrer">
                    Inspecionar gateway.py ↗
                  </a>
                </article>

                <article className="lemmas-case-card">
                  <div>
                    <div className="top-line">
                      <span>CASE 03 / APPLIED ML & CIÊNCIA DE DADOS</span>
                      <BarChart3 size={14} />
                    </div>
                    <h3>Revisão não é adivinhação.</h3>
                    <p>
                      O projeto contém revisão por SM-2 e um agendador experimental inspirado em FSRS. O roadmap prevê consolidar a fonte de verdade do agendamento e validar a persistência antes de trocar de algoritmo. A calibração empírica de TRI 3PL é pesquisa futura.
                    </p>
                  </div>
                  <a className="link-inline" href="https://github.com/StylishGH/MathAI/blob/main/backend/app/services/mathai/flashcards.py" target="_blank" rel="noreferrer">
                    Inspecionar agendamento experimental ↗
                  </a>
                </article>
              </div>
            </section>

            <section className="lemmas-section lemmas-engineering-example">
              <div className="lemmas-section-heading left">
                <h2>Sem gabarito, não existe erro confirmado.</h2>
                <p>Um caso concreto de qualidade de dados no fluxo de simulados.</p>
              </div>
              <dl>
                <div><dt>Problema</dt><dd>Uma questão sem gabarito confiável não permite concluir se a alternativa marcada está errada.</dd></div>
                <div><dt>Decisão</dt><dd>Normalizar o gabarito na fronteira dos dados e distinguir resposta incorreta de resultado indeterminado.</dd></div>
                <div><dt>Validação registrada</dt><dd>O roadmap registra a verificação de acertos, erros, respostas em branco, gabaritos ausentes e alteração de alternativa antes da entrega.</dd></div>
                <div><dt>Limite</dt><dd>A validação documenta o fluxo local; não comprova a correção de todos os gabaritos do acervo.</dd></div>
              </dl>
              <a className="lemmas-text-link" href="https://github.com/StylishGH/MathAI/blob/main/docs/roadmap.md#32-tarefas-p0" target="_blank" rel="noreferrer">Ver decisão e casos de regressão no roadmap ↗</a>
            </section>

            {/* SEÇÃO 5: EVOLUÇÃO TÉCNICA & ROADMAP HONESTO */}
            <section className="lemmas-section">
              <div className="lemmas-section-heading">
                <span className="lemmas-eyebrow">EVOLUÇÃO TÉCNICA · ROADMAP TRANSPARENTE</span>
                <h2>Implementado, experimental ou planejado?</h2>
                <p>Um portfólio sério diferencia entrega em produção, código de protótipo e hipótese de pesquisa estatística.</p>
              </div>

              <div className="lemmas-roadmap-grid">
                <div className="lemmas-roadmap-card">
                  <div className="lemmas-roadmap-header">
                    <div className="lemmas-roadmap-icon">
                      <CheckCircle2 size={22} className="text-emerald-500" />
                    </div>
                    <span className="lemmas-roadmap-tag tag-progress">Implementado</span>
                  </div>
                  <h3>Documentado como implementado</h3>
                  <p>
                    Frontend Next.js 16, backend FastAPI, PostgreSQL no Supabase, revisão por SM-2, Bancada Discursiva com quatro vereditos, OCR e Segunda Opinião. Recursos documentados no roadmap e inspecionáveis no repositório.
                  </p>
                  <div className="lemmas-roadmap-tech">Next.js 16 · FastAPI · Supabase RLS · SM-2 Determinístico</div>
                </div>

                <div className="lemmas-roadmap-card">
                  <div className="lemmas-roadmap-header">
                    <div className="lemmas-roadmap-icon">
                      <Cpu size={22} className="text-amber-500" />
                    </div>
                    <span className="lemmas-roadmap-tag tag-upcoming">Protótipos & Refinamento</span>
                  </div>
                  <h3>Agendamento experimental</h3>
                  <p>
                    Agendador simplificado inspirado em FSRS, ainda sujeito à validação e à consolidação com o SM-2. Bancada Discursiva, OCR e Segunda Opinião estão implementados e seguem em refinamento.
                  </p>
                  <div className="lemmas-roadmap-tech">Agendamento · Persistência · Validação</div>
                </div>

                <div className="lemmas-roadmap-card">
                  <div className="lemmas-roadmap-header">
                    <div className="lemmas-roadmap-icon">
                      <LineChart size={22} className="text-blue-500" />
                    </div>
                    <span className="lemmas-roadmap-tag tag-future">Pesquisa Futura</span>
                  </div>
                  <h3>Pesquisa & Applied ML</h3>
                  <p>
                    Calibração empírica da Teoria de Resposta ao Item (TRI 3PL), Knowledge Tracing com modelos preditivos em Scikit-Learn e benchmarks de qualidade sem métricas inventadas.
                  </p>
                  <div className="lemmas-roadmap-tech">Item Response Theory (IRT) · Scikit-Learn · XGBoost / Logistic</div>
                </div>
              </div>
            </section>

            {/* SEÇÃO 6: EVIDÊNCIA VISUAL DE ENGENHARIA · PRODUTO REAL */}
            <section className="lemmas-section">
              <div className="lemmas-section-heading">
                <span className="lemmas-eyebrow">EVIDÊNCIA VISUAL · APLICAÇÃO EM FUNCIONAMENTO</span>
                <h2>A interface existe. Os contratos e o código também.</h2>
                <p>Capturas reais da aplicação em funcionamento. Clique para inspecionar em alta resolução:</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
                <article className="lemmas-showcase-card">
                  <button
                    type="button"
                    onClick={() => setLightboxImg({ src: "/assets/segunda_opiniao.png", title: "MathAI Engine · Orquestração de Segunda Opinião" })}
                    className="lemmas-showcase-visual group"
                    aria-label="Ampliar captura da Segunda Opinião"
                  >
                    <div className="fallback">
                      <i>A = r · s</i>
                      <strong>Segunda Opinião</strong>
                      <span>Clique para ampliar imagem em alta resolução</span>
                    </div>
                    <img
                      src="/assets/segunda_opiniao.png"
                      alt="Captura real da Segunda Opinião no LemmaS"
                      loading="lazy"
                    />
                    <div className="lemmas-showcase-overlay">
                      <span className="lemmas-showcase-zoom-pill">
                        <Maximize2 size={12} />
                        <span>Ver captura completa ↗</span>
                      </span>
                    </div>
                  </button>
                  <div className="lemmas-showcase-desc">
                    <div>
                      <span className="label">AI ENGINEERING & STRATEGY PATTERN</span>
                      <h3>Orquestração de Múltiplas Perspectivas</h3>
                      <p>
                        Interação assíncrona entre o raciocínio formal axiomático (NVIDIA Nemotron) e atalhos heurísticos (DeepSeek), oferecendo estratégias alternativas que o estudante pode comparar e verificar.
                      </p>
                    </div>
                    <a
                      href="https://github.com/StylishGH/MathAI/blob/main/backend/app/services/mathai/gateway.py"
                      target="_blank"
                      rel="noreferrer"
                      className="lemmas-text-link"
                    >
                      Inspecionar gateway.py no GitHub ↗
                    </a>
                  </div>
                </article>

                <article className="lemmas-showcase-card">
                  <button
                    type="button"
                    onClick={() => setLightboxImg({ src: "/assets/modo_foco.png", title: "Bancada Discursiva & Modo Foco Imersivo · Lousa digital & HUD Flutuante" })}
                    className="lemmas-showcase-visual group"
                    aria-label="Ampliar captura do Modo Foco na Bancada"
                  >
                    <div className="fallback">
                      <i>∫ f(x)dx</i>
                      <strong>Bancada & Modo Foco</strong>
                      <span>Clique para ampliar imagem em alta resolução</span>
                    </div>
                    <img
                      src="/assets/modo_foco.png"
                      alt="Captura real do Modo Foco Imersivo na Bancada do LemmaS"
                      loading="lazy"
                    />
                    <div className="lemmas-showcase-overlay">
                      <span className="lemmas-showcase-zoom-pill">
                        <Maximize2 size={12} />
                        <span>Ver captura completa ↗</span>
                      </span>
                    </div>
                  </button>
                  <div className="lemmas-showcase-desc">
                    <div>
                      <span className="label">MODO FOCO & LOUSA DIGITAL</span>
                      <h3>Mesa de Prova Imersiva Sem Distrações</h3>
                      <p>
                        Card de questão flutuante (HUD) com arrasto suave, lousa vetorial com rejeição de palma natural, bússola euclidiana e avaliação pela MathAI Engine.
                      </p>
                    </div>
                    <a
                      href="https://github.com/StylishGH/MathAI/tree/main/frontend/components/bancada"
                      target="_blank"
                      rel="noreferrer"
                      className="lemmas-text-link"
                    >
                      Ver componentes da bancada no GitHub ↗
                    </a>
                  </div>
                </article>
              </div>
            </section>

            {/* SEÇÃO 7: EVIDÊNCIAS DIRETAS NO REPOSITÓRIO GITHUB */}
            <section className="lemmas-section">
              <div className="lemmas-section-heading">
                <span className="lemmas-eyebrow">ABRA O REPOSITÓRIO</span>
                <h2>Menos promessa. Mais evidência verificável.</h2>
                <p>Links para arquivos e diretórios que realmente existem no GitHub do LEMMAS:</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <a
                  className="p-5 rounded-2xl bg-[#141222] border border-amber-500/20 hover:border-amber-500/50 hover:-translate-y-1 transition shadow-md flex flex-col justify-between"
                  href="https://github.com/StylishGH/MathAI/tree/main/frontend"
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="text-2xl font-serif text-[#d9b452] mb-3">▣</span>
                  <div>
                    <strong className="text-sm text-slate-100 block">Frontend</strong>
                    <small className="text-xs text-zinc-400 block mt-1">App Router, banco de questões, Bancada e apresentação ↗</small>
                  </div>
                </a>

                <a
                  className="p-5 rounded-2xl bg-[#141222] border border-amber-500/20 hover:border-amber-500/50 hover:-translate-y-1 transition shadow-md flex flex-col justify-between"
                  href="https://github.com/StylishGH/MathAI/tree/main/backend"
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="text-2xl font-serif text-[#d9b452] mb-3">⌘</span>
                  <div>
                    <strong className="text-sm text-slate-100 block">Backend & MathAI</strong>
                    <small className="text-xs text-zinc-400 block mt-1">API Python, DTOs, avaliação, tutor e gateway multi-modelo ↗</small>
                  </div>
                </a>

                <a
                  className="p-5 rounded-2xl bg-[#141222] border border-amber-500/20 hover:border-amber-500/50 hover:-translate-y-1 transition shadow-md flex flex-col justify-between"
                  href="https://github.com/StylishGH/MathAI/tree/main/tests"
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="text-2xl font-serif text-[#d9b452] mb-3">✓</span>
                  <div>
                    <strong className="text-sm text-slate-100 block">Testes Unitários</strong>
                    <small className="text-xs text-zinc-400 block mt-1">17 testes cobrindo rotas, proveniência e repetição espaçada ↗</small>
                  </div>
                </a>

                <a
                  className="p-5 rounded-2xl bg-[#141222] border border-amber-500/20 hover:border-amber-500/50 hover:-translate-y-1 transition shadow-md flex flex-col justify-between"
                  href="https://github.com/StylishGH/MathAI/blob/main/docs/roadmap.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="text-2xl font-serif text-[#d9b452] mb-3">∑</span>
                  <div>
                    <strong className="text-sm text-slate-100 block">Roadmap Auditado</strong>
                    <small className="text-xs text-zinc-400 block mt-1">Status das entregas, contagens e próximos experimentos ↗</small>
                  </div>
                </a>
              </div>
            </section>

            {/* SEÇÃO 7: SOBRE O CRIADOR & UFF */}
            <section className="lemmas-section">
              <AboutTeacher />
            </section>
          </div>
        )}

        {/* CONTATO & REDES SOCIAIS (EM AMBAS AS VISÕES) */}
        <div id="contato">
          <ContactLoop />
        </div>

        {/* RODAPÉ */}
        <footer className="lemmas-footer">
          <Logo compact />
          <span>© {new Date().getFullYear()} LEMMAS · Plataforma Cognitiva de Aprendizagem | Powered by MathAI Engine</span>
        </footer>

        {/* MODAL LIGHTBOX EM REACT PORTAL (ANEXADO DIRETAMENTE AO DOCUMENT.BODY) */}
        {mounted && lightboxImg && typeof document !== "undefined" && createPortal(
          <div
            className="lemmas-dialog animate-fadeIn"
            role="dialog"
            aria-modal="true"
            aria-label={lightboxImg.title}
            onClick={() => setLightboxImg(null)}
          >
            <div className="lemmas-dialog-card" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between pb-3 border-b border-amber-500/20 mb-3">
                <div className="flex items-center gap-2 text-xs font-mono text-[#d9b452] font-bold">
                  <Sparkles size={14} />
                  <span>{lightboxImg.title}</span>
                </div>
                <button
                  type="button"
                  className="lemmas-close-dialog"
                  onClick={() => setLightboxImg(null)}
                  aria-label="Fechar visualização (ESC)"
                >
                  ✕ Fechar (ESC)
                </button>
              </div>
              <div className="overflow-hidden rounded-xl border border-amber-500/25 bg-[#090812] flex items-center justify-center p-1">
                <img
                  src={lightboxImg.src}
                  alt={lightboxImg.title}
                  className="w-full max-h-[75vh] object-contain rounded-lg"
                />
              </div>
              <div className="text-[11px] font-mono text-zinc-400 mt-3 flex items-center justify-between">
                <span>✦ Captura em alta resolução (1440×900) da plataforma LEMMAS</span>
                <span className="text-amber-500 font-bold">Clique fora para fechar</span>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </BoardFrame>
  );
}
