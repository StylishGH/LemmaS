"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Target,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  School,
  BookOpen,
  Briefcase,
  Award,
  Check,
  Moon,
  Sun,
  Loader2,
} from "lucide-react";
import { BoardFrame } from "../landing/components/BoardFrame";
import { Logo } from "../landing/components/Logo";
import { createClient } from "@/lib/supabase";
import "../landing/components/BoardFrame.css";
import "../landing/components/Logo.css";
import "../landing/components/LandingPage.css";

// Opções de Escolaridade
const OPCOES_ESCOLARIDADE = [
  { id: "fundamental_incompleto", label: "Ensino Fundamental (Incompleto)" },
  { id: "fundamental_completo", label: "Ensino Fundamental (Completo)" },
  { id: "medio_cursando", label: "Ensino Médio (Cursando)" },
  { id: "medio_completo", label: "Ensino Médio (Completo)" },
  { id: "superior_cursando", label: "Ensino Superior (Cursando)" },
  { id: "superior_completo", label: "Ensino Superior (Completo)" },
  { id: "pos_graduacao", label: "Pós-graduação / Especialização / Mestrado / Doutorado" },
];

// Subtags Militares
const CONCURSOS_MILITARES = [
  "ESA",
  "EsPCEx",
  "EFOMM",
  "Colégio Naval",
  "EPCAr",
  "AFA",
  "ITA",
  "IME",
  "Outros",
];

// Foco Vestibulares
const FOCOS_VESTIBULAR = ["ENEM", "Fuvest", "Unicamp", "UERJ", "Vunesp", "Outros"];

// Segmentos Educadores
const SEGMENTOS_PROFESSOR = [
  "Ensino Fundamental",
  "Ensino Médio",
  "Pré-Vestibular / Militar",
  "Ensino Superior",
];

// Segmentos Profissionais
const SEGMENTOS_PROFISSIONAL = [
  "Ciência de Dados / IA",
  "Finanças / Mercado Financeiro",
  "Engenharia",
  "Carreira Acadêmica",
  "Outros",
];

export default function OnboardingPage() {
  const supabase = createClient();
  const router = useRouter();
  const [light, setLight] = useState(false);
  const [etapa, setEtapa] = useState<1 | 2>(1);
  const [salvando, setSalvando] = useState(false);

  // Etapa 1: Escolaridade
  const [escolaridade, setEscolaridade] = useState("superior_cursando");
  const [instituicaoSuperior, setInstituicaoSuperior] = useState("");
  const [cursoGraduacao, setCursoGraduacao] = useState("");

  // Etapa 2: Objetivo
  const [categoriaObjetivo, setCategoriaObjetivo] = useState<
    "militar" | "vestibular" | "professor" | "profissional"
  >("militar");

  // Subcampos específicos
  const [concursosSelecionados, setConcursosSelecionados] = useState<string[]>(["EFOMM", "ESA"]);
  const [statusVestibular, setStatusVestibular] = useState<"medio" | "cursinho">("cursinho");
  const [focosVestibular, setFocosVestibular] = useState<string[]>(["ENEM"]);
  const [segmentoProfessor, setSegmentoProfessor] = useState("Ensino Médio");
  const [instituicaoProfessor, setInstituicaoProfessor] = useState("");
  const [segmentoProfissional, setSegmentoProfissional] = useState("Ciência de Dados / IA");

  useEffect(() => {
    document.documentElement.dataset.theme = light ? "lemmas-light" : "lemmas-dark";
    document.documentElement.style.colorScheme = light ? "light" : "dark";
  }, [light]);

  const toggleConcurso = (item: string) => {
    setConcursosSelecionados((prev) =>
      prev.includes(item) ? prev.filter((c) => c !== item) : [...prev, item]
    );
  };

  const toggleVestibular = (item: string) => {
    setFocosVestibular((prev) =>
      prev.includes(item) ? prev.filter((c) => c !== item) : [...prev, item]
    );
  };

  const handleConcluir = async () => {
    setSalvando(true);
    const perfilData = {
      escolaridade,
      instituicao_superior: escolaridade === "superior_cursando" ? instituicaoSuperior : null,
      curso_graduacao: escolaridade === "superior_cursando" ? cursoGraduacao : null,
      objetivo_categoria: categoriaObjetivo,
      detalhes_objetivo: {
        concursos_militares: categoriaObjetivo === "militar" ? concursosSelecionados : null,
        vestibular:
          categoriaObjetivo === "vestibular"
            ? { status: statusVestibular, focos: focosVestibular }
            : null,
        professor:
          categoriaObjetivo === "professor"
            ? { segmento: segmentoProfessor, instituicao: instituicaoProfessor }
            : null,
        profissional:
          categoriaObjetivo === "profissional" ? { segmento: segmentoProfissional } : null,
      },
    };

    if (typeof window !== "undefined") {
      localStorage.setItem("lemmas_onboarding_profile", JSON.stringify(perfilData));
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Tenta persistir no Supabase se logado
        await supabase
          .from("usuarios")
          .update({
            meta_estudo: categoriaObjetivo,
            configuracoes: perfilData,
          })
          .eq("email", user.email);
      }
    } catch {
      // Falhas silenciosas se tabela ou RLS ainda em migração
    }

    setTimeout(() => {
      setSalvando(false);
      router.push("/questoes");
    }, 600);
  };

  return (
    <BoardFrame>
      <div className="lemmas-page max-w-4xl mx-auto px-4 py-8">
        {/* Navegação Superior */}
        <nav className="flex items-center justify-between pb-6 border-b border-amber-500/20 mb-8">
          <div className="flex items-center gap-4">
            <Logo compact />
          </div>

          <button
            type="button"
            className="lemmas-theme-toggle p-2 rounded-xl border border-amber-500/20 text-slate-600 dark:text-[#d9b452] hover:bg-amber-500/10 transition-colors"
            onClick={() => setLight((v) => !v)}
            aria-label={light ? "Ativar quadro negro" : "Ativar quadro branco"}
          >
            {light ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </nav>

        {/* Indicador de Passos (Stepper) */}
        <div className="max-w-2xl mx-auto mb-8 space-y-4">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            <span className={etapa >= 1 ? "text-amber-600 dark:text-[#d9b452]" : ""}>
              1. Escolaridade & Formação
            </span>
            <span className={etapa >= 2 ? "text-amber-600 dark:text-[#d9b452]" : ""}>
              2. Objetivo de Aprendizagem
            </span>
          </div>

          <div className="h-1.5 w-full bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 dark:bg-[#d9b452] transition-all duration-300 rounded-full"
              style={{ width: etapa === 1 ? "50%" : "100%" }}
            />
          </div>
        </div>

        {/* Conteúdo do Card de Onboarding */}
        <div className="max-w-2xl mx-auto bg-white dark:bg-[#141222] border border-amber-500/25 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          {etapa === 1 ? (
            /* ============================================================ */
            /* ETAPA 1: ESCOLARIDADE E FORMAÇÃO GERAL                       */
            /* ============================================================ */
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-[#d9b452] border border-amber-500/20">
                  <GraduationCap size={14} /> Passo 1 de 2
                </div>
                <h1 className="text-2xl font-serif-math font-normal text-slate-900 dark:text-[#f5f0df]">
                  Qual é o seu nível de <em className="italic text-amber-600 dark:text-[#d9b452]">escolaridade?</em>
                </h1>
                <p className="text-xs text-slate-600 dark:text-[#a9aaa1]">
                  Personalizamos as explicações dos lemas e a profundidade axiomática de acordo com a sua formação.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-[#d9b452] block">
                  Selecione sua escolaridade atual:
                </label>
                <select
                  value={escolaridade}
                  onChange={(e) => setEscolaridade(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                >
                  {OPCOES_ESCOLARIDADE.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Campos condicionais para Ensino Superior Cursando */}
              {escolaridade === "superior_cursando" && (
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-4 animate-fadeIn">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-[#d9b452]">
                    <School size={15} /> Detalhes da Graduação
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
                        Instituição de Ensino
                      </label>
                      <input
                        type="text"
                        value={instituicaoSuperior}
                        onChange={(e) => setInstituicaoSuperior(e.target.value)}
                        placeholder="Ex: UFF, UFRJ, USP, UNICAMP..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
                        Curso de Graduação
                      </label>
                      <input
                        type="text"
                        value={cursoGraduacao}
                        onChange={(e) => setCursoGraduacao(e.target.value)}
                        placeholder="Ex: Matemática, Engenharia, Computação..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setEtapa(2)}
                  className="lemmas-gold-cta py-3 px-6 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all hover:scale-[1.01]"
                >
                  Avançar para Objetivos <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            /* ============================================================ */
            /* ETAPA 2: OBJETIVO DE APRENDIZAGEM (CARDS EM GRID)            */
            /* ============================================================ */
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-[#d9b452] border border-amber-500/20">
                  <Target size={14} /> Passo 2 de 2
                </div>
                <h1 className="text-2xl font-serif-math font-normal text-slate-900 dark:text-[#f5f0df]">
                  Qual é o seu objetivo <em className="italic text-amber-600 dark:text-[#d9b452]">principal?</em>
                </h1>
                <p className="text-xs text-slate-600 dark:text-[#a9aaa1]">
                  Selecione uma categoria para configurar a meta pedagógica e as listas recomendadas.
                </p>
              </div>

              {/* Cards de Categorias em Grid Interativo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Concurso Militar */}
                <button
                  type="button"
                  onClick={() => setCategoriaObjetivo("militar")}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${
                    categoriaObjetivo === "militar"
                      ? "border-amber-500 bg-amber-500/10 shadow-sm"
                      : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">🎖️</span>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        categoriaObjetivo === "militar"
                          ? "border-amber-500 bg-amber-500 text-slate-900"
                          : "border-slate-300 dark:border-zinc-600"
                      }`}
                    >
                      {categoriaObjetivo === "militar" && <Check size={10} className="stroke-[3]" />}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-[#f5f0df]">
                      Concurso Militar
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      EFOMM, ESA, EsPCEx, AFA, ITA, IME e Colégio Naval.
                    </p>
                  </div>
                </button>

                {/* 2. ENEM / Vestibular */}
                <button
                  type="button"
                  onClick={() => setCategoriaObjetivo("vestibular")}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${
                    categoriaObjetivo === "vestibular"
                      ? "border-amber-500 bg-amber-500/10 shadow-sm"
                      : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">📚</span>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        categoriaObjetivo === "vestibular"
                          ? "border-amber-500 bg-amber-500 text-slate-900"
                          : "border-slate-300 dark:border-zinc-600"
                      }`}
                    >
                      {categoriaObjetivo === "vestibular" && <Check size={10} className="stroke-[3]" />}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-[#f5f0df]">
                      ENEM / Vestibular
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      ENEM, Fuvest, Unicamp, UERJ e vestibulares regionais.
                    </p>
                  </div>
                </button>

                {/* 3. Professor / Educador */}
                <button
                  type="button"
                  onClick={() => setCategoriaObjetivo("professor")}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${
                    categoriaObjetivo === "professor"
                      ? "border-amber-500 bg-amber-500/10 shadow-sm"
                      : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">👨‍🏫</span>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        categoriaObjetivo === "professor"
                          ? "border-amber-500 bg-amber-500 text-slate-900"
                          : "border-slate-300 dark:border-zinc-600"
                      }`}
                    >
                      {categoriaObjetivo === "professor" && <Check size={10} className="stroke-[3]" />}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-[#f5f0df]">
                      Professor / Educador
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Criação de listas, banco de lemas e suporte didático.
                    </p>
                  </div>
                </button>

                {/* 4. Uso Profissional / Autoaperfeiçoamento */}
                <button
                  type="button"
                  onClick={() => setCategoriaObjetivo("profissional")}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${
                    categoriaObjetivo === "profissional"
                      ? "border-amber-500 bg-amber-500/10 shadow-sm"
                      : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">💼</span>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        categoriaObjetivo === "profissional"
                          ? "border-amber-500 bg-amber-500 text-slate-900"
                          : "border-slate-300 dark:border-zinc-600"
                      }`}
                    >
                      {categoriaObjetivo === "profissional" && <Check size={10} className="stroke-[3]" />}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-[#f5f0df]">
                      Uso Profissional & IA
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Ciência de Dados, Finanças, Engenharia e Pesquisa.
                    </p>
                  </div>
                </button>
              </div>

              {/* Subcampos correspondentes à categoria selecionada */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 space-y-3">
                {categoriaObjetivo === "militar" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-[#d9b452] block">
                      Selecione seus concursos-alvo (múltipla escolha):
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {CONCURSOS_MILITARES.map((c) => {
                        const ativo = concursosSelecionados.includes(c);
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => toggleConcurso(c)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                              ativo
                                ? "bg-amber-500 text-slate-900 font-bold"
                                : "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100"
                            }`}
                          >
                            <span>{c}</span>
                            {ativo && <Check size={12} className="stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {categoriaObjetivo === "vestibular" && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-[#d9b452] block">
                        Status Atual:
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setStatusVestibular("medio")}
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border ${
                            statusVestibular === "medio"
                              ? "bg-amber-500 text-slate-900 border-amber-500 font-bold"
                              : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300"
                          }`}
                        >
                          Cursando Ensino Médio
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusVestibular("cursinho")}
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border ${
                            statusVestibular === "cursinho"
                              ? "bg-amber-500 text-slate-900 border-amber-500 font-bold"
                              : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300"
                          }`}
                        >
                          Pré-Vestibular / Concurseiro
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-[#d9b452] block">
                        Vestibulares Foco:
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {FOCOS_VESTIBULAR.map((v) => {
                          const ativo = focosVestibular.includes(v);
                          return (
                            <button
                              key={v}
                              type="button"
                              onClick={() => toggleVestibular(v)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                ativo
                                  ? "bg-amber-500 text-slate-900 font-bold"
                                  : "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300"
                              }`}
                            >
                              <span>{v}</span>
                              {ativo && <Check size={12} className="stroke-[3]" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {categoriaObjetivo === "professor" && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-[#d9b452] block">
                        Segmento de Atuação:
                      </label>
                      <select
                        value={segmentoProfessor}
                        onChange={(e) => setSegmentoProfessor(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100"
                      >
                        {SEGMENTOS_PROFESSOR.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-zinc-300 block">
                        Instituição de Ensino (Opcional):
                      </label>
                      <input
                        type="text"
                        value={instituicaoProfessor}
                        onChange={(e) => setInstituicaoProfessor(e.target.value)}
                        placeholder="Ex: Colégio Pedro II, Escola Militar..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 placeholder-slate-400"
                      />
                    </div>
                  </div>
                )}

                {categoriaObjetivo === "profissional" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-[#d9b452] block">
                      Segmento de Atuação / Foco Analítico:
                    </label>
                    <select
                      value={segmentoProfissional}
                      onChange={(e) => setSegmentoProfissional(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100"
                    >
                      {SEGMENTOS_PROFISSIONAL.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setEtapa(1)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft size={14} /> Voltar à Escolaridade
                </button>

                <button
                  type="button"
                  onClick={handleConcluir}
                  disabled={salvando}
                  className="lemmas-gold-cta py-3 px-6 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all hover:scale-[1.01]"
                >
                  {salvando ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Concluindo...
                    </>
                  ) : (
                    <>
                      Concluir e Começar a Estudar <CheckCircle2 size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </BoardFrame>
  );
}


