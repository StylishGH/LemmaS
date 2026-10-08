"use client";

import React from "react";
import { 
  ArrowRight, 
  BrainCircuit, 
  Moon, 
  Sun, 
  Camera, 
  Timer, 
  LineChart, 
  Sparkles, 
  Compass, 
  Lightbulb, 
  ShieldCheck, 
  Layers,
  BookOpen,
  Play,
  GraduationCap
} from "lucide-react";
import { BackgroundAnimation } from "./BackgroundAnimation";
import { BoardFrame } from "./BoardFrame";
import { Logo } from "./Logo";
import { AboutTeacher } from "./AboutTeacher";
import { useTheme } from "@/components/theme-provider";
import Link from "next/link";
import PixelCard from "@/components/PixelCard";
import "./BackgroundAnimation.css"; 
import "./BoardFrame.css"; 
import "./Logo.css"; 
import "./AboutTeacher.css"; 
import "./LandingPage.css";

// Amostra real e factual do banco de 288 questões do Supabase
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

  // Função para navegação suave e animada sem "teletransporte"
  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const elem = document.getElementById(targetId);
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <BoardFrame>
      <div className="lemmas-page">
        <BackgroundAnimation />
        
        {/* NAVEGAÇÃO SUPERIOR (SEM A OPÇÃO 'SOBRE NÓS', COM SCROLL SUAVE) */}
        <nav className="lemmas-nav">
          <Logo compact />
          <div className="lemmas-nav-links">
            <a href="#metodo" onClick={(e) => scrollToSection(e, "metodo")}>
              O Método
            </a>
            <a href="#processo" onClick={(e) => scrollToSection(e, "processo")}>
              Como Funciona
            </a>
            <a href="#arquitetura" onClick={(e) => scrollToSection(e, "arquitetura")}>
              Arquitetura
            </a>
            <a href="#questoes-amostra" onClick={(e) => scrollToSection(e, "questoes-amostra")}>
              Banco de Lemas
            </a>
            <a href="#roadmap" onClick={(e) => scrollToSection(e, "roadmap")}>
              O Que Vem Por Aí
            </a>
          </div>
          <div className="lemmas-nav-actions">
            <Link href="/" className="lemmas-nav-auth-btn">
              Área do Aluno →
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
          </div>
        </nav>
        
        {/* HERO SECTION EDITORIAL */}
        <section className="lemmas-hero">
          <div className="lemmas-hero-copy">
            <span className="lemmas-eyebrow">PLATAFORMA COGNITIVA · POWERED BY MATHAI ENGINE</span>
            <h1>Aprenda como<br /><em>você pensa.</em></h1>
            <p className="lemmas-hero-lede">
              Diferente dos bancos de questões convencionais que apenas conferem alternativas, a plataforma <strong>LEMMAS</strong> investiga o seu <strong>processo metacognitivo</strong>, identifica <strong>vícios de cálculo</strong> e mapeia <strong>estratégias de resolução</strong> através da inteligência especializada da <strong>MathAI Engine</strong>.
            </p>
            <div className="lemmas-hero-actions">
              <Link className="lemmas-cta lemmas-cta-primary" href="/">
                Acessar a Plataforma <ArrowRight size={17} />
              </Link>
              <a className="lemmas-cta lemmas-cta-secondary" href="#metodo" onClick={(e) => scrollToSection(e, "metodo")}>
                Conhecer o Método
              </a>
              <a className="lemmas-cta lemmas-cta-secondary" href="#questoes-amostra" onClick={(e) => scrollToSection(e, "questoes-amostra")}>
                Ver Questões em Ação
              </a>
            </div>
            <div className="lemmas-hero-note">
              <span /> A plataforma cognitiva que aprende com seu raciocínio.
            </div>
          </div>
        </section>
        
        {/* SEÇÃO 1: A FILOSOFIA & DIAGNÓSTICO */}
        <section id="metodo" className="lemmas-section">
          <div className="lemmas-section-heading">
            <span className="lemmas-eyebrow">A FILOSOFIA</span>
            <h2>Por que o LEMMAS é diferente?</h2>
            <p>A maioria dos estudantes de matemática não falha por falta de fórmulas, mas pela ausência de diagnóstico metacognitivo.</p>
          </div>
          
          <div className="lemmas-principles">
            <PixelCard variant={isLight ? "blue" : "gold"} className="lemmas-principle">
              <div style={{ padding: "24px 26px", width: "100%" }}>
                <BrainCircuit size={26} color={isLight ? "#2d6da1" : "#d9b452"} style={{ marginBottom: 12 }} />
                <strong>Diagnóstico Metacognitivo</strong>
                <p>Mapeamos se a sua dúvida decorre de álgebra básica, interpretação de texto, falha de axioma ou falta de repertório heurístico.</p>
              </div>
            </PixelCard>
            <PixelCard variant={isLight ? "blue" : "violet"} className="lemmas-principle">
              <div style={{ padding: "24px 26px", width: "100%" }}>
                <Camera size={26} color={isLight ? "#2d6da1" : "#a855f7"} style={{ marginBottom: 12 }} />
                <strong>Caderno & Tablet</strong>
                <p>Envie foto do seu rascunho manuscrito. A MathAI Engine analisa seus passos intermediários e aponta a exata linha do desvio.</p>
              </div>
            </PixelCard>
            <PixelCard variant={isLight ? "blue" : "gold"} className="lemmas-principle">
              <div style={{ padding: "24px 26px", width: "100%" }}>
                <Timer size={26} color={isLight ? "#2d6da1" : "#d9b452"} style={{ marginBottom: 12 }} />
                <strong>Simulados Reais</strong>
                <p>Treine sob pressão com cronômetro regressivo com tempo oficial de prova e receba relatórios analíticos de rendimento.</p>
              </div>
            </PixelCard>
            <PixelCard variant={isLight ? "blue" : "violet"} className="lemmas-principle">
              <div style={{ padding: "24px 26px", width: "100%" }}>
                <LineChart size={26} color={isLight ? "#2d6da1" : "#a855f7"} style={{ marginBottom: 12 }} />
                <strong>Repetição Espaçada (SM-2)</strong>
                <p>O algoritmo SuperMemo-2 puro gerencia revisões no momento ideal da curva de retenção de memória, agnóstico a qualquer disciplina.</p>
              </div>
            </PixelCard>
          </div>
        </section>

        {/* SEÇÃO 2: ARQUITETURA EM 2 CAMADAS (MANIFESTO) */}
        <section id="arquitetura" className="lemmas-section">
          <div className="lemmas-section-heading">
            <span className="lemmas-eyebrow">SEPARAÇÃO ARQUITETURAL · PLATAFORMA VS ENGINE</span>
            <h2>Construído sobre Engenharia Rigorosa</h2>
            <p>
              Uma decisão central da nossa arquitetura: separamos tarefas determinísticas de inferências interpretativas de IA para garantir dados observados inquestionáveis.
            </p>
          </div>

          <div className="lemmas-architecture-grid">
            <div className="lemmas-architecture-card">
              <div className="lemmas-arch-badge">🌐 CAMADA 1</div>
              <h3>Plataforma LEMMAS & LEMMAS Core</h3>
              <p>
                Gerencia o ecossistema web, sessões dos estudantes, cronometragem precisa, histórico de tentativas e o motor determinístico de repetição espaçada SM-2. Agnóstica e escalável para qualquer disciplina futura.
              </p>
              <ul className="lemmas-arch-list">
                <li>Next.js 16 (App Router) & TypeScript</li>
                <li>Design System Quanta com Estética Lousa de Prestígio</li>
                <li>Algoritmo SuperMemo-2 (SM-2) puro</li>
                <li>Supabase Postgres com Prova de Autoria & RLS</li>
              </ul>
            </div>

            <div className="lemmas-architecture-card">
              <div className="lemmas-arch-badge arch-badge-gold">⚡ CAMADA 2</div>
              <h3>MathAI Engine (Núcleo de Inteligência)</h3>
              <p>
                O motor cognitivo especializado em Matemática superior e militar. Conduz diagnósticos de erro em 4 quadrantes, gera dicas heurísticas e orquestra múltiplos modelos em tempo real.
              </p>
              <ul className="lemmas-arch-list">
                <li>Taxonomia de Erros: Sinal, Álgebra, Interpretação e Axioma</li>
                <li>Roteamento Inteligente: NVIDIA Nemotron (Rigor) e DeepSeek (Heurística)</li>
                <li>Processamento cirúrgico de fórmulas em KaTeX/LaTeX</li>
                <li>Acervo indexado com 288+ lemas classificados</li>
              </ul>
            </div>
          </div>
        </section>

        {/* SEÇÃO 3: O PROCESSO EM 4 ETAPAS */}
        <section id="processo" className="lemmas-section lemmas-magic-section">
          <div className="lemmas-section-heading">
            <span className="lemmas-eyebrow">O PROCESSO</span>
            <h2>Como a mágica acontece?</h2>
            <p>O ciclo de resolução e aprendizagem adaptativa em 4 etapas estruturadas.</p>
          </div>
          <div className="lemmas-magic-steps">
             <div className="lemmas-magic-step">
                <div className="lemmas-magic-number">1</div>
                <div>
                  <strong>Resolução Focada & Cronometrada</strong>
                  <p>Você resolve a questão visualizando diagramas e fórmulas nítidas. O tempo exato gasto é monitorado de forma invisível.</p>
                </div>
             </div>
             <div className="lemmas-magic-step">
                <div className="lemmas-magic-number">2</div>
                <div>
                  <strong>Metacognição Ativa & Justificativa</strong>
                  <p>Antes de marcar a alternativa, você indica qual teorema tentou utilizar e justifica sucintamente seu raciocínio.</p>
                </div>
             </div>
             <div className="lemmas-magic-step">
                <div className="lemmas-magic-number" style={{ background: isLight ? '#2d6da1' : '#d9b452', color: isLight ? '#fff' : '#18150f' }}>3</div>
                <div>
                  <strong>Diagnóstico e Dica Socrática com MathAI</strong>
                  <p>A MathAI Engine compara seu rascunho com as resoluções esperadas, indicando o desvio exato no seu desenvolvimento sem dar spoiler.</p>
                </div>
             </div>
             <div className="lemmas-magic-step">
                <div className="lemmas-magic-number" style={{ background: isLight ? '#2d6da1' : '#d9b452', color: isLight ? '#fff' : '#18150f' }}>4</div>
                <div>
                  <strong>Perfil Cognitivo & Agendamento SM-2</strong>
                  <p>O radar de habilidades mapeia seus pontos fortes e fracos, e o SM-2 agenda a próxima revisão no momento ótimo da retenção.</p>
                </div>
             </div>
          </div>
        </section>

        {/* SEÇÃO NOVA: VITRINE DE QUESTÕES REAIS DO SUPABASE (CARREGAMENTO REAL) */}
        <section id="questoes-amostra" className="lemmas-section">
          <div className="lemmas-section-heading">
            <span className="lemmas-eyebrow">ACERVO VIVO · 288 ITENS NO SUPABASE</span>
            <h2>Amostra do Banco de Questões & Lemas</h2>
            <p>
              Problemas matemáticos reais de concursos de elite e graduação com fórmulas em alta definição e diagnósticos passo a passo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
            {AMOSTRA_QUESTOES.map((q) => (
              <div 
                key={q.id}
                className="bg-white/80 dark:bg-[#141222]/90 border border-slate-200/90 dark:border-amber-500/20 rounded-2xl p-6 flex flex-col justify-between shadow-sm hover:border-amber-500/40 transition-all hover:scale-[1.01]"
              >
                <div className="space-y-3">
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

                <div className="pt-5 mt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
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
              <span>Explorar Todas as 288 Questões no Banco Completo</span>
              <ArrowRight size={17} />
            </Link>
          </div>
        </section>
        
        {/* SEÇÃO 4: O QUE VEM POR AÍ (ROADMAP TÉCNICO & FUTURAS COISAS) */}
        <section id="roadmap" className="lemmas-section">
          <div className="lemmas-section-heading">
            <span className="lemmas-eyebrow">O QUE VEM POR AÍ · ROADMAP TÉCNICO</span>
            <h2>As Próximas Fronteiras da Plataforma</h2>
            <p>
              O LEMMAS foi construído com uma base sólida de engenharia e dados. Conheça as inovações cognitivas, preditivas e didáticas que estamos construindo nos próximos ciclos.
            </p>
          </div>

          <div className="lemmas-roadmap-grid">
            {/* CARD 1 */}
            <div className="lemmas-roadmap-card">
              <div className="lemmas-roadmap-header">
                <div className="lemmas-roadmap-icon">
                  <Camera size={22} />
                </div>
                <span className="lemmas-roadmap-tag tag-progress">Em Desenvolvimento</span>
              </div>
              <h3>OCR Multimodal de Caderno & Tablet</h3>
              <p>
                Resolução à mão livre como você sempre fez. Tire foto do rascunho no papel ou envie o PDF do tablet: a MathAI Engine transcreve os passos em KaTeX e detecta a linha exata em que o cálculo divergiu do gabarito.
              </p>
              <div className="lemmas-roadmap-tech">Visão Computacional · Gemini Multimodal · KaTeX AST</div>
            </div>

            {/* CARD 2 */}
            <div className="lemmas-roadmap-card">
              <div className="lemmas-roadmap-header">
                <div className="lemmas-roadmap-icon">
                  <Sparkles size={22} />
                </div>
                <span className="lemmas-roadmap-tag tag-upcoming">Próxima Etapa</span>
              </div>
              <h3>Machine Learning & Knowledge Tracing</h3>
              <p>
                Modelagem estocástica contínua da curva de domínio matemático do estudante. Algoritmos preditivos calculam a probabilidade real de acerto e antecipam pontos cegos em teoremas antes da prova.
              </p>
              <div className="lemmas-roadmap-tech">Knowledge Tracing · Logistic Regression / XGBoost · Scikit-Learn</div>
            </div>

            {/* CARD 3 */}
            <div className="lemmas-roadmap-card">
              <div className="lemmas-roadmap-header">
                <div className="lemmas-roadmap-icon">
                  <Compass size={22} />
                </div>
                <span className="lemmas-roadmap-tag tag-upcoming">Próxima Etapa</span>
              </div>
              <h3>Recomendação Adaptativa (Contextual Bandits)</h3>
              <p>
                Adeus listas estáticas repetitivas. Um motor de recomendação inteligente que seleciona a próxima questão na fronteira do conhecimento (Zona de Desenvolvimento Proximal), equilibrando reforço e novidade heurística.
              </p>
              <div className="lemmas-roadmap-tech">Contextual Bandits · Exploração vs Aproveitamento · Grafo de Conceitos</div>
            </div>

            {/* CARD 4 */}
            <div className="lemmas-roadmap-card">
              <div className="lemmas-roadmap-header">
                <div className="lemmas-roadmap-icon">
                  <Lightbulb size={22} />
                </div>
                <span className="lemmas-roadmap-tag tag-research">Pesquisa Ativa</span>
              </div>
              <h3>Tutor Socrático Adaptativo</h3>
              <p>
                Um tutor que nunca entrega a resposta de bandeja. Através de perguntas reflexivas, contra-exemplos direcionados e ancoragem axiomática, ele guia o estudante até a dedução autônoma da solução.
              </p>
              <div className="lemmas-roadmap-tech">Intervenções Graduais · Roteamento Multi-Modelo · Rigor Axiomático</div>
            </div>

            {/* CARD 5 */}
            <div className="lemmas-roadmap-card">
              <div className="lemmas-roadmap-header">
                <div className="lemmas-roadmap-icon">
                  <ShieldCheck size={22} />
                </div>
                <span className="lemmas-roadmap-tag tag-continuous">Ingestão Contínua</span>
              </div>
              <h3>Expansão de Bancas Militares e de Elite</h3>
              <p>
                Mineração e curadoria contínua de questões com alta densidade conceitual: ESA, EsPCEx, IME, ITA, AFA, EFOMM, CEDERJ, UERJ, Fuvest e ENEM, classificadas por estratégias de resolução.
              </p>
              <div className="lemmas-roadmap-tech">Pipelines de ETL Python · Turso / LibSQL · Classificação de Erros</div>
            </div>

            {/* CARD 6 */}
            <div className="lemmas-roadmap-card">
              <div className="lemmas-roadmap-header">
                <div className="lemmas-roadmap-icon">
                  <Layers size={22} />
                </div>
                <span className="lemmas-roadmap-tag tag-future">Visão de Produto</span>
              </div>
              <h3>Trilhas Personalizadas & Flashcards Axiomáticos</h3>
              <p>
                Deck inteligente de lemas e teoremas fundamentais acoplados à repetição espaçada SM-2, permitindo revisões relâmpago de propriedades matemáticas nos intervalos do dia a dia.
              </p>
              <div className="lemmas-roadmap-tech">SuperMemo-2 · Mobile Web PWA · Sincronização em Nuvem</div>
            </div>
          </div>
        </section>
        
        {/* SEÇÃO 5: SOBRE O CRIADOR & UFF (RODAPÉ INFORMATIVO) */}
        <AboutTeacher />
        
        {/* RODAPÉ */}
        <footer className="lemmas-footer">
          <Logo compact />
          <span>© {new Date().getFullYear()} LEMMAS · Plataforma Cognitiva de Aprendizagem | Powered by MathAI Engine</span>
        </footer>
      </div>
    </BoardFrame>
  );
}
