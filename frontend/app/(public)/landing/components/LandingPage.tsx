"use client";

import React, { useState, useEffect } from "react";
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
  X
} from "lucide-react";
import AppBackground from "@/components/AppBackground";
import { BoardFrame } from "./BoardFrame";
import { Logo } from "./Logo";
import { AboutTeacher } from "./AboutTeacher";
import { ContactLoop } from "./ContactLoop";
import { BancadaShowcase } from "./BancadaShowcase";
import { SegundaOpiniaoShowcase } from "./SegundaOpiniaoShowcase";
import { TechCard } from "./TechCard";
import { useTheme } from "@/components/theme-provider";
import Link from "next/link";
import "./BackgroundAnimation.css"; 
import "./BoardFrame.css"; 
import "./Logo.css"; 
import "./AboutTeacher.css"; 
import "./LandingPage.css";

// Amostra real e factual do banco de questões do Supabase
const AMOSTRA_QUESTOES = [
  {
    id: 1234,
    banca: "ESA",
    ano: 2026,
    materia: "Álgebra",
    topico: "Funções & Trajetória Parabólica",
    enunciado: "Um robô em exercício da ESA deve caminhar da origem em linha reta até A(1,1) e depois ajustar sua trajetória sobre um arco parabólico f(x) = ax² + bx + c (para x > 1) passando por B(2,0) e C(4,4).",
    alternativas: ["(A) 32", "(B) 34", "(C) 36", "(D) 38", "(E) 40"],
    gabarito: "B"
  },
  {
    id: 1253,
    banca: "EFOMM",
    ano: 2025,
    materia: "Álgebra Linear",
    topico: "Operadores & Matrizes Identidade",
    enunciado: "Sejam alfa e lambda pertencentes aos reais, I a matriz identidade de ordem n e J a matriz com todas entradas iguais a 1. Qual o resultado do produto das matrizes B e x, tal que A + B = alfa * I + J com A*x = lambda*x e soma de xi = 0?",
    alternativas: ["(A) (α + 1 - λ) x", "(B) (α + λ) x", "(C) (α - λ) x", "(D) α x", "(E) λ x"],
    gabarito: "C"
  },
  {
    id: 1526,
    banca: "CEDERJ",
    ano: 2021,
    materia: "Álgebra Linear",
    topico: "Diagonalização de Operadores",
    enunciado: "Uma matriz A de ordem n x n é dita diagonalizável se, e somente se, admite n autovetores linearmente independentes. Analise a matriz B = [[1, 1], [0, 1]]. É correto afirmar sobre sua diagonalização:",
    alternativas: [
      "(A) B é diagonalizável com autovalor duplo λ = 1.",
      "(B) B NÃO é diagonalizável: mult. algébrica 2 e mult. geométrica 1.",
      "(C) B é diagonalizável pois det(B) = 1.",
      "(D) B NÃO é diagonalizável pois não tem autovalores reais."
    ],
    gabarito: "B"
  }
];

export function LandingPage() {
  const { isLight, toggleTheme } = useTheme();
  // Vitrine: sem número inicial fixo. Enquanto /api/stats não responder,
  // exibe "—"; se o banco falhar, continua "—" em vez de um número antigo.
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [totalLemmas, setTotalLemmas] = useState<number>(0);
  // Menu móvel da landing: abaixo de 1040px os links do topo somem no CSS
  // e não havia nenhum substituto — o visitante de celular perdia a
  // navegação por seção. O botão só aparece nessa faixa (ver CSS).
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileNavLinks = [
    { href: "#metodo", label: "Método" },
    { href: "#bancada", label: "Bancada" },
    { href: "#segunda-opiniao", label: "Segunda Opinião" },
    { href: "#arquitetura", label: "Arquitetura" },
    { href: "#questoes-amostra", label: "Acervo" },
    { href: "#roadmap", label: "Roadmap" },
    { href: "#contato", label: "Vamos Conversar" },
  ];

  // Buscar contagens reais do banco na fonte única (/api/stats)
  useEffect(() => {
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
  }, []);

  const questionsLabel =
    totalQuestions > 0 ? totalQuestions.toLocaleString("pt-BR") : "—";
  const lemmasLabel = totalLemmas > 0 ? totalLemmas.toLocaleString("pt-BR") : "—";

  // Função para navegação suave e animada sem "teletransporte"
  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const elem = document.getElementById(targetId);
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <BoardFrame>
      <div className="lemmas-page">
        {/* Malha de coordenadas técnica global (caderno de engenharia) */}
        <AppBackground />
        
        {/* NAVEGAÇÃO SUPERIOR */}
        <nav className="lemmas-nav">
          <Logo compact />
          <div className="lemmas-nav-links">
            <a href="#metodo" onClick={(e) => scrollToSection(e, "metodo")}>
              Método
            </a>
            <a href="#bancada" onClick={(e) => scrollToSection(e, "bancada")}>
              Bancada
            </a>
            <a href="#segunda-opiniao" onClick={(e) => scrollToSection(e, "segunda-opiniao")}>
              Segunda Opinião
            </a>
            <a href="#arquitetura" onClick={(e) => scrollToSection(e, "arquitetura")}>
              Arquitetura
            </a>
            <a href="#questoes-amostra" onClick={(e) => scrollToSection(e, "questoes-amostra")}>
              Acervo
            </a>
            <a href="#roadmap" onClick={(e) => scrollToSection(e, "roadmap")}>
              Roadmap
            </a>
            <a href="#contato" onClick={(e) => scrollToSection(e, "contato")}>
              Vamos Conversar
            </a>
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

        {mobileMenuOpen && (
          <div className="lemmas-nav-mobile-menu">
            {mobileNavLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => scrollToSection(e, link.href.slice(1))}
              >
                {link.label}
              </a>
            ))}
            <Link href="/questoes" onClick={() => setMobileMenuOpen(false)} className="lemmas-nav-mobile-cta">
              Explorar Questões →
            </Link>
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="lemmas-nav-mobile-cta lemmas-nav-mobile-cta-primary">
              Começar Gratuitamente →
            </Link>
          </div>
        )}
        
        {/* HERO SECTION EDITORIAL LIMPO & ALINHADO */}
        <section className="lemmas-section lemmas-hero">
          <div className="lemmas-hero-copy">
            <span className="lemmas-eyebrow">PLATAFORMA COGNITIVA · POWERED BY MATHAI ENGINE · V1 OFICIAL</span>
            <h1>Aprenda como<br /><em>você pensa.</em></h1>
            <p className="lemmas-hero-lede">
              Diferente dos bancos de questões convencionais que apenas conferem alternativas, a plataforma <strong>LEMMAS</strong> investiga o seu <strong>desenvolvimento matemático passo a passo</strong> na nova <strong>Bancada Discursiva</strong>, personaliza a tutoria para sua meta real (Licenciatura, Concursos Militares ou Ciência de Dados) e cataloga <strong>{questionsLabel} questões</strong> com estética minimalista e rigor conceitual.
            </p>
            <div className="lemmas-hero-actions">
              <Link className="lemmas-cta lemmas-cta-primary" href="/login">
                Começar Gratuitamente <ArrowRight size={17} />
              </Link>
              <Link className="lemmas-cta lemmas-cta-secondary" href="/questoes">
                Explorar Questões
              </Link>
            </div>
            <div className="lemmas-hero-note">
              <span /> {questionsLabel} questões auditadas · {lemmasLabel} lemas matemáticos · Avaliação analítica com 4 vereditos.
            </div>
          </div>
        </section>
        
        {/* SEÇÃO 1: A FILOSOFIA & DIAGNÓSTICO */}
        <section id="metodo" className="lemmas-section">
          <div className="lemmas-section-heading">
            <span className="lemmas-eyebrow">A FILOSOFIA</span>
            <h2>Por que o LEMMAS é diferente?</h2>
            <p>A maioria dos estudantes de matemática não falha por falta de fórmulas, mas pela ausência de diagnóstico metacognitivo e reflexão guiada.</p>
          </div>
          
          <div className="lemmas-principles">
            <TechCard
              meta="SYS.CORE // MATHAI ENGINE"
              title="Bancada Discursiva Multimodal"
              accent="math"
              icon={<PenTool size={20} />}
              footer={["OCR Multimodal", "Rejeição de Palma", "4 Vereditos"]}
            >
              <p>Rascunhe na Lousa Digital, construa com o Compasso Euclidiano ou envie foto do caderno/tablet via OCR. A MathAI Engine valida o raciocínio sem penalizar demonstrações curtas válidas.</p>
            </TechCard>

            <TechCard
              meta="MODEL: NEMOTRON · DEEPSEEK · GEMINI"
              title="Tutor Socrático por Perfil"
              accent="data"
              icon={<Target size={20} />}
              footer={["Strategy Pattern", "Multi-LLM", "FSRS-v4"]}
            >
              <p>Se você busca Licenciatura (didática e primeiros princípios), ITA/IME (rigor axiomático puro) ou Ciência de Dados (matrizes e probabilidade), a IA calibra o tom e as dicas para sua meta.</p>
            </TechCard>

            <TechCard
              meta="UI.SYS // LEETCODE-GRADE COMMANDBAR"
              title="Barra LeetCode / Linear"
              accent="system"
              icon={<Layers size={20} />}
              footer={["≤ 140px", "5 Trilhas Rápidas", "Busca Instantânea"]}
            >
              <p>Navegação horizontal minimalista (≤ 140px) com 5 Trilhas Rápidas de 1 clique, popovers com busca interna instantânea e bancas de elite brasileiras fixadas no topo.</p>
            </TechCard>

            <TechCard
              meta="PIPELINE: FSRS-v4 · SM-2"
              title="Repetição Espaçada FSRS-v4 & SM-2"
              accent="data"
              icon={<LineChart size={20} />}
              footer={["SM-2", "FSRS-v4", "Curva do Esquecimento"]}
            >
              <p>Algoritmos determinísticos agendam revisões no momento exato em que a curva do esquecimento começa a decair, agnóstico a qualquer disciplina futura.</p>
            </TechCard>
          </div>
        </section>

        {/* SEÇÃO: A BANCADA DISCURSIVA (DEMONSTRAÇÃO VISUAL & VEREDITOS) */}
        <section id="bancada" className="lemmas-section lemmas-magic-section">
          <div className="lemmas-section-heading">
            <span className="lemmas-eyebrow">NOVIDADE V1 · O CORAÇÃO DO MATHAI ENGINE</span>
            <h2>A Nova Bancada Discursiva</h2>
            <p>Três ferramentas integradas para você expressar seu raciocínio como um verdadeiro matemático com salvaguarda epistêmica.</p>
          </div>
          <BancadaShowcase />
        </section>

        {/* SEÇÃO: SEGUNDA OPINIÃO DO MATHAI (COGNIÇÃO MULTI-MODELO) */}
        <SegundaOpiniaoShowcase />

        {/* SEÇÃO 2: ARQUITETURA EM 2 CAMADAS (MANIFESTO) */}
        <section id="arquitetura" className="lemmas-section">
          <div className="lemmas-section-heading">
            <span className="lemmas-eyebrow">SEPARAÇÃO ARQUITETURAL · PLATAFORMA VS ENGINE</span>
            <h2>Construído sobre Engenharia Rigorosa</h2>
            <p>
              Uma decisão central da nossa arquitetura: separamos tarefas determinísticas de inferências interpretativas de IA para garantir dados observados inquestionáveis: <strong>Dado Observado ≠ Interpretação da IA ≠ Dado Validado</strong>.
            </p>
          </div>

          <div className="lemmas-architecture-grid">
            <TechCard
              meta="LAYER.01 // PLATFORM LEMMAS + CORE"
              title="Plataforma LEMMAS & LEMMAS Core"
              accent="system"
              icon={<Layers size={20} />}
              footer={["Next.js 16 · Turbopack", "Supabase + RLS", "SHA-256 Provenance"]}
            >
              <p>
                Gerencia o ecossistema web, sessões dos estudantes, cronometragem precisa, histórico de tentativas e o motor determinístico de repetição espaçada SM-2 e FSRS-v4. Agnóstica e escalável para qualquer disciplina futura.
              </p>
              <ul>
                <li>Next.js 16 (App Router, Turbopack) & TypeScript</li>
                <li>Design System Editorial com Estética Lousa de Prestígio</li>
                <li>Barra de Comando LeetCode/Linear minimalista (≤ 140px)</li>
                <li>Supabase Postgres com Hash SHA-256 de Autoria & RLS</li>
              </ul>
            </TechCard>

            <TechCard
              meta="LAYER.02 // COGNITION ENGINE"
              title="MathAI Engine (Núcleo de Inteligência)"
              accent="data"
              icon={<Cpu size={20} />}
              footer={["Padrão Strategy", "Roteamento Multi-Modelo", "Telemetria N:1"]}
            >
              <p>
                O motor cognitivo especializado em Matemática superior e militar. Avalia desenvolvimento discursivo, conduz tutoria socrática personalizada e orquestra múltiplos modelos via Padrão Strategy.
              </p>
              <ul>
                <li>Bancada Discursiva com 4 Vereditos de Ponta a Ponta</li>
                <li>Roteamento Inteligente: NVIDIA Nemotron, DeepSeek, Gemini e SLMs Locais</li>
                <li>Telemetria N:1 com rastreabilidade de tokens e latência</li>
                <li>Acervo indexado com {questionsLabel} questões e {lemmasLabel} lemas</li>
              </ul>
            </TechCard>
          </div>
        </section>

        {/* SEÇÃO: VITRINE DE QUESTÕES REAIS DO SUPABASE */}
        <section id="questoes-amostra" className="lemmas-section">
          <div className="lemmas-section-heading">
            <span className="lemmas-eyebrow">ACERVO VIVO · {questionsLabel} ITENS NO SUPABASE</span>
            <h2>Amostra do Banco de Questões & Lemas</h2>
            <p>
              Problemas matemáticos reais de concursos de elite e graduação com fórmulas em alta definição e diagnósticos passo a passo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
            {AMOSTRA_QUESTOES.map((q) => (
              <div 
                key={q.id}
                className="relative bg-[var(--bg-card)] border-2 border-[var(--border-board)] shadow-[0_16px_36px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,220,163,0.18)] rounded-2xl p-6 flex flex-col justify-between hover:border-sky-400/40 dark:hover:border-amber-400/40 transition-all hover:scale-[1.01]"
              >
                {/* Chanfro interno sutil da moldura de madeira */}
                <div className="absolute inset-0 rounded-2xl border border-[var(--border-wood-edge)] pointer-events-none opacity-80" />

                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-[#d9b452] font-mono text-xs font-bold">
                      {q.banca} {q.ano}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                      {q.materia}
                    </span>
                  </div>

                  <h3 className="font-serif-math text-base font-semibold text-slate-900 dark:text-[#f5f0df]">
                    {q.topico}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed font-sans line-clamp-4">
                    {q.enunciado}
                  </p>

                  <div className="pt-2 space-y-1">
                    {q.alternativas.slice(0, 3).map((alt, i) => (
                      <div key={i} className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                        {alt}
                      </div>
                    ))}
                    {q.alternativas.length > 3 && (
                      <div className="text-[10px] text-amber-600 dark:text-[#d9b452] font-semibold italic">
                        + outras alternativas disponíveis
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-5 mt-4 border-t border-[var(--border-board)] flex items-center justify-between relative z-10">
                  <Link
                    href={`/resolver?id=${q.id}`}
                    className="lemmas-gold-cta inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm transition hover:scale-105"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Resolver no Simulador</span>
                  </Link>

                  <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono">
                    ID #{q.id}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-2">
            <Link 
              href="/questoes"
              className="lemmas-cta lemmas-cta-primary inline-flex items-center gap-2"
            >
              <BookOpen size={17} />
              <span>Explorar Todas as {questionsLabel} Questões no Acervo Completo</span>
              <ArrowRight size={17} />
            </Link>
          </div>
        </section>
        
        {/* SEÇÃO 4: O QUE VEM POR AÍ (ROADMAP TÉCNICO & PRÓXIMAS FRONTEIRAS) */}
        <section id="roadmap" className="lemmas-section">
          <div className="lemmas-section-heading">
            <span className="lemmas-eyebrow">O QUE VEM POR AÍ · ROADMAP TÉCNICO V1.X / V2</span>
            <h2>As Próximas Fronteiras da Plataforma</h2>
            <p>
              Com a V1 no ar e a Bancada Discursiva em pleno funcionamento, conheça as 3 inovações psicométricas, preditivas e de IA prioritárias que estamos desenvolvendo para os próximos ciclos.
            </p>
          </div>

          <div className="lemmas-roadmap-grid">
            {/* CARD 1: TRI 3PL */}
            <div className="lemmas-roadmap-card">
              <div className="lemmas-roadmap-header">
                <div className="lemmas-roadmap-icon">
                  <LineChart size={22} />
                </div>
                <span className="lemmas-roadmap-tag tag-progress">Próxima Etapa</span>
              </div>
              <h3>Teoria de Resposta ao Item (TRI) Multidimensional</h3>
              <p>
                Calibração estatística dos parâmetros psicométricos das questões: discriminação (a), dificuldade real (b) e chance de acerto casual (c). Seu score no simulado passa a refletir sua proficiência latente (θ) com rigor de concurso público.
              </p>
              <div className="lemmas-roadmap-tech">Item Response Theory (IRT) · Modelo Logístico 3PL · Calibração Estatística</div>
            </div>

            {/* CARD 2: SIMULADOS EM PDF */}
            <div className="lemmas-roadmap-card">
              <div className="lemmas-roadmap-header">
                <div className="lemmas-roadmap-icon">
                  <FileText size={22} />
                </div>
                <span className="lemmas-roadmap-tag tag-upcoming">Próxima Etapa</span>
              </div>
              <h3>Simulados Diagramados em PDF para Impressão</h3>
              <p>
                Geração automática de provas completas em formato A4 diagramadas em duas colunas com padrão visual dos cadernos oficiais militares e vestibulares, incluindo folha de respostas e gabarito comentado.
              </p>
              <div className="lemmas-roadmap-tech">Layout Editorial · Tipografia KaTeX · PDF Vetorial em 2 Colunas</div>
            </div>

            {/* CARD 3: KNOWLEDGE TRACING */}
            <div className="lemmas-roadmap-card">
              <div className="lemmas-roadmap-header">
                <div className="lemmas-roadmap-icon">
                  <BrainCircuit size={22} />
                </div>
                <span className="lemmas-roadmap-tag tag-future">Machine Learning</span>
              </div>
              <h3>Knowledge Tracing & Previsão com Scikit-Learn</h3>
              <p>
                Modelagem da evolução de domínio do aluno através de séries temporais de tentativas, prevendo pontos cegos conceituais e recomendando a questão ideal na Zona de Desenvolvimento Proximal.
              </p>
              <div className="lemmas-roadmap-tech">Knowledge Tracing · Logistic Regression / XGBoost · Scikit-Learn</div>
            </div>
          </div>
        </section>
        
        {/* SEÇÃO 5: SOBRE O CRIADOR & UFF (RODAPÉ INFORMATIVO) */}
        <AboutTeacher />

        {/* SEÇÃO 6: CONTATO & PORTFÓLIO (LOGO LOOP) */}
        <ContactLoop />

        {/* RODAPÉ */}
        <footer className="lemmas-footer">
          <Logo compact />
          <span>© {new Date().getFullYear()} LEMMAS · Plataforma Cognitiva de Aprendizagem | Powered by MathAI Engine</span>
        </footer>
      </div>
    </BoardFrame>
  );
}

