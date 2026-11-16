"use client";

import { useState } from "react";
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
  Loader2,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BoardFrame } from "../landing/components/BoardFrame";
import { Logo } from "../landing/components/Logo";
import { createClient } from "@/lib/supabase";
import { validarCPF, formatarCPF } from "@/lib/validation";
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
  const [etapa, setEtapa] = useState<1 | 2>(1);
  const [salvando, setSalvando] = useState(false);

  // Etapa 1: Escolaridade
  const [cpf, setCpf] = useState("");
  const [erroCpf, setErroCpf] = useState("");
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
    const escolaridadeFormatada =
      OPCOES_ESCOLARIDADE.find((op) => op.id === escolaridade)?.label || escolaridade;
    const focoConcursoFormatado =
      categoriaObjetivo === "militar"
        ? concursosSelecionados.join(", ")
        : categoriaObjetivo === "vestibular"
        ? focosVestibular.join(", ")
        : categoriaObjetivo === "professor"
        ? `${segmentoProfessor}${instituicaoProfessor ? ` - ${instituicaoProfessor}` : ""}`
        : segmentoProfissional;

    const perfilData = {
      escolaridade: escolaridadeFormatada,
      instituicao_superior: escolaridade === "superior_cursando" ? instituicaoSuperior : null,
      curso_graduacao: escolaridade === "superior_cursando" ? cursoGraduacao : null,
      objetivo_categoria: categoriaObjetivo,
      concursos_foco: focoConcursoFormatado,
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

      if (user?.email) {
        const cpfLimpo = cpf.replace(/\D/g, "");
        const nomeUsuario = user.user_metadata?.full_name || user.email.split("@")[0] || "Aluno LEMMAS";

        // Verifica se o usuário já tem registro em usuarios
        const { data: existente } = await supabase
          .from("usuarios")
          .select("id")
          .eq("email", user.email)
          .maybeSingle();

        const estaVerificado = Boolean(user.email_confirmed_at);

        if (existente) {
          await supabase
            .from("usuarios")
            .update({
              cpf: cpfLimpo,
              escolaridade: escolaridadeFormatada,
              faculdade: instituicaoSuperior || null,
              curso: cursoGraduacao || null,
              concursos_foco: focoConcursoFormatado,
              motivos: JSON.stringify(perfilData),
              ...(estaVerificado ? { verificado: 1 } : {}),
            })
            .eq("email", user.email);
        } else {
          await supabase
            .from("usuarios")
            .insert({
              nome: nomeUsuario,
              email: user.email,
              cpf: cpfLimpo,
              escolaridade: escolaridadeFormatada,
              faculdade: instituicaoSuperior || null,
              curso: cursoGraduacao || null,
              concursos_foco: focoConcursoFormatado,
              motivos: JSON.stringify(perfilData),
              verificado: estaVerificado ? 1 : 0,
            });
        }
      }
    } catch (err) {
      console.error("Erro ao persistir perfil no onboarding:", err);
    } finally {
      setSalvando(false);
      router.push("/questoes");
    }
  };

  return (
    <BoardFrame>
      <div className="lemmas-page max-w-4xl mx-auto px-4 py-8">
        {/* Navegação Superior */}
        <nav className="flex items-center justify-between pb-6 border-b border-[var(--border-subtle)] mb-8">
          <div className="flex items-center gap-4">
            <Logo compact />
          </div>

          <ThemeToggle compact />
        </nav>

        {/* Indicador de Passos (Stepper) */}
        <div className="max-w-2xl mx-auto mb-8 space-y-4">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            <span className={etapa >= 1 ? "text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" : ""}>
              1. Escolaridade & Formação
            </span>
            <span className={etapa >= 2 ? "text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" : ""}>
              2. Objetivo de Aprendizagem
            </span>
          </div>

          <div className="h-1.5 w-full bg-[var(--bg-subtle)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--marker-blue)] dark:bg-[var(--marker-amber)] transition-[width] duration-300 rounded-full"
              style={{ width: etapa === 1 ? "50%" : "100%" }}
            />
          </div>
        </div>

        {/* Conteúdo do Card de Onboarding */}
        <div className="max-w-2xl mx-auto lemmas-surface-card bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          {etapa === 1 ? (
            /* ============================================================ */
            /* ETAPA 1: ESCOLARIDADE E FORMAÇÃO GERAL                       */
            /* ============================================================ */
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--marker-blue-dim)] dark:bg-[var(--marker-amber-dim)] text-[var(--marker-blue)] dark:text-[var(--marker-amber)] border border-[var(--marker-blue-border)] dark:border-[var(--marker-amber-border)]">
                  <GraduationCap size={14} /> Passo 1 de 2
                </div>
                <h1 className="text-2xl font-serif-math font-normal text-[var(--ink-primary)]">
                  Informações <em className="italic text-[var(--marker-blue)] dark:text-[var(--marker-amber)]">Pessoais & Escolaridade</em>
                </h1>
                <p className="text-xs text-[var(--ink-secondary)]">
                  Precisamos de alguns dados essenciais para evitar contas duplicadas e personalizar sua experiência no LEMMAS.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--ink-primary)] block">
                  CPF (Apenas para verificação de unicidade)
                </label>
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => {
                    const formatted = formatarCPF(e.target.value);
                    setCpf(formatted);
                    if (erroCpf) setErroCpf("");
                  }}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className={`w-full px-3.5 py-3 rounded-xl border ${erroCpf ? "border-[var(--marker-red)] focus:ring-[var(--marker-red)]" : "border-[var(--border-subtle)] focus:ring-[var(--marker-blue)] dark:focus:ring-[var(--marker-amber)]"} bg-[var(--bg-elevated)] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] text-xs sm:text-sm focus:outline-none focus:ring-1 font-mono tabular-nums font-medium`}
                />
                {erroCpf && <p className="text-[10px] text-[var(--marker-red)] mt-1 font-semibold">{erroCpf}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--ink-primary)] block">
                  Selecione sua escolaridade atual:
                </label>
                <select
                  value={escolaridade}
                  onChange={(e) => setEscolaridade(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--ink-primary)] text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[var(--marker-blue)] dark:focus:ring-[var(--marker-amber)] font-medium"
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
                <div className="p-4 rounded-xl bg-[var(--marker-blue-dim)] dark:bg-[var(--marker-amber-dim)] border border-[var(--marker-blue-border)] dark:border-[var(--marker-amber-border)] space-y-4 animate-fadeIn">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--marker-blue)] dark:text-[var(--marker-amber)]">
                    <School size={15} /> Detalhes da Graduação
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[var(--ink-secondary)]">
                        Instituição de Ensino
                      </label>
                      <input
                        type="text"
                        value={instituicaoSuperior}
                        onChange={(e) => setInstituicaoSuperior(e.target.value)}
                        placeholder="Ex: UFF, UFRJ, USP, UNICAMP..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--marker-blue)] dark:focus:ring-[var(--marker-amber)]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[var(--ink-secondary)]">
                        Curso de Graduação
                      </label>
                      <input
                        type="text"
                        value={cursoGraduacao}
                        onChange={(e) => setCursoGraduacao(e.target.value)}
                        placeholder="Ex: Matemática, Engenharia, Computação..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--marker-blue)] dark:focus:ring-[var(--marker-amber)]"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => { if (!validarCPF(cpf)) { setErroCpf("CPF inválido ou incompleto."); return; } setErroCpf(""); setEtapa(2); }}
                  className="lemmas-gold-cta py-3 px-6 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-transform hover:scale-[1.01]"
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
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--marker-blue-dim)] dark:bg-[var(--marker-amber-dim)] text-[var(--marker-blue)] dark:text-[var(--marker-amber)] border border-[var(--marker-blue-border)] dark:border-[var(--marker-amber-border)]">
                  <Target size={14} /> Passo 2 de 2
                </div>
                <h1 className="text-2xl font-serif-math font-normal text-[var(--ink-primary)]">
                  Qual é o seu objetivo <em className="italic text-[var(--marker-blue)] dark:text-[var(--marker-amber)]">principal?</em>
                </h1>
                <p className="text-xs text-[var(--ink-secondary)]">
                  Selecione uma categoria para configurar a meta pedagógica e as listas recomendadas.
                </p>
              </div>

              {/* Cards de Categorias em Grid Interativo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Concurso Militar */}
                <button
                  type="button"
                  onClick={() => setCategoriaObjetivo("militar")}
                  className={`p-4 rounded-xl border text-left transition-colors flex flex-col justify-between gap-3 ${
                    categoriaObjetivo === "militar"
                      ? "border-[var(--marker-blue-border)] bg-[var(--marker-blue-dim)] dark:border-[var(--marker-amber-border)] dark:bg-[var(--marker-amber-dim)] shadow-sm"
                      : "border-[var(--border-subtle)] hover:border-[var(--border-default)] bg-[var(--bg-elevated)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center justify-center"><Target size={22} className="text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" /></span>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        categoriaObjetivo === "militar"
                          ? "lemmas-gold-cta border-transparent"
                          : "border-[var(--border-default)]"
                      }`}
                    >
                      {categoriaObjetivo === "militar" && <Check size={10} className="stroke-[3]" />}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-[var(--ink-primary)]">
                      Concurso Militar
                    </h3>
                    <p className="text-[11px] text-[var(--ink-secondary)]">
                      EFOMM, ESA, EsPCEx, AFA, ITA, IME e Colégio Naval.
                    </p>
                  </div>
                </button>

                {/* 2. ENEM / Vestibular */}
                <button
                  type="button"
                  onClick={() => setCategoriaObjetivo("vestibular")}
                  className={`p-4 rounded-xl border text-left transition-colors flex flex-col justify-between gap-3 ${
                    categoriaObjetivo === "vestibular"
                      ? "border-[var(--marker-blue-border)] bg-[var(--marker-blue-dim)] dark:border-[var(--marker-amber-border)] dark:bg-[var(--marker-amber-dim)] shadow-sm"
                      : "border-[var(--border-subtle)] hover:border-[var(--border-default)] bg-[var(--bg-elevated)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center justify-center"><BookOpen size={22} className="text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" /></span>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        categoriaObjetivo === "vestibular"
                          ? "lemmas-gold-cta border-transparent"
                          : "border-[var(--border-default)]"
                      }`}
                    >
                      {categoriaObjetivo === "vestibular" && <Check size={10} className="stroke-[3]" />}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-[var(--ink-primary)]">
                      ENEM / Vestibular
                    </h3>
                    <p className="text-[11px] text-[var(--ink-secondary)]">
                      ENEM, Fuvest, Unicamp, UERJ e vestibulares regionais.
                    </p>
                  </div>
                </button>

                {/* 3. Professor / Educador */}
                <button
                  type="button"
                  onClick={() => setCategoriaObjetivo("professor")}
                  className={`p-4 rounded-xl border text-left transition-colors flex flex-col justify-between gap-3 ${
                    categoriaObjetivo === "professor"
                      ? "border-[var(--marker-blue-border)] bg-[var(--marker-blue-dim)] dark:border-[var(--marker-amber-border)] dark:bg-[var(--marker-amber-dim)] shadow-sm"
                      : "border-[var(--border-subtle)] hover:border-[var(--border-default)] bg-[var(--bg-elevated)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center justify-center"><GraduationCap size={22} className="text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" /></span>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        categoriaObjetivo === "professor"
                          ? "lemmas-gold-cta border-transparent"
                          : "border-[var(--border-default)]"
                      }`}
                    >
                      {categoriaObjetivo === "professor" && <Check size={10} className="stroke-[3]" />}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-[var(--ink-primary)]">
                      Professor / Educador
                    </h3>
                    <p className="text-[11px] text-[var(--ink-secondary)]">
                      Criação de listas, banco de lemas e suporte didático.
                    </p>
                  </div>
                </button>

                {/* 4. Uso Profissional / Autoaperfeiçoamento */}
                <button
                  type="button"
                  onClick={() => setCategoriaObjetivo("profissional")}
                  className={`p-4 rounded-xl border text-left transition-colors flex flex-col justify-between gap-3 ${
                    categoriaObjetivo === "profissional"
                      ? "border-[var(--marker-blue-border)] bg-[var(--marker-blue-dim)] dark:border-[var(--marker-amber-border)] dark:bg-[var(--marker-amber-dim)] shadow-sm"
                      : "border-[var(--border-subtle)] hover:border-[var(--border-default)] bg-[var(--bg-elevated)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center justify-center"><Briefcase size={22} className="text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" /></span>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        categoriaObjetivo === "profissional"
                          ? "lemmas-gold-cta border-transparent"
                          : "border-[var(--border-default)]"
                      }`}
                    >
                      {categoriaObjetivo === "profissional" && <Check size={10} className="stroke-[3]" />}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-[var(--ink-primary)]">
                      Uso Profissional & IA
                    </h3>
                    <p className="text-[11px] text-[var(--ink-secondary)]">
                      Ciência de Dados, Finanças, Engenharia e Pesquisa.
                    </p>
                  </div>
                </button>
              </div>

              {/* Subcampos correspondentes à categoria selecionada */}
              <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-3">
                {categoriaObjetivo === "militar" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--ink-primary)] block">
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
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                              ativo
                                ? "lemmas-gold-cta font-bold"
                                : "bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)]"
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
                      <label className="text-xs font-bold text-[var(--ink-primary)] block">
                        Status Atual:
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setStatusVestibular("medio")}
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                            statusVestibular === "medio"
                              ? "lemmas-gold-cta border-transparent font-bold"
                              : "border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                          }`}
                        >
                          Cursando Ensino Médio
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusVestibular("cursinho")}
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                            statusVestibular === "cursinho"
                              ? "lemmas-gold-cta border-transparent font-bold"
                              : "border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                          }`}
                        >
                          Pré-Vestibular / Concurseiro
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--ink-primary)] block">
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
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                                ativo
                                  ? "lemmas-gold-cta font-bold"
                                  : "bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
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
                      <label className="text-xs font-bold text-[var(--ink-primary)] block">
                        Segmento de Atuação:
                      </label>
                      <select
                        value={segmentoProfessor}
                        onChange={(e) => setSegmentoProfessor(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--ink-primary)]"
                      >
                        {SEGMENTOS_PROFESSOR.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[var(--ink-secondary)] block">
                        Instituição de Ensino (Opcional):
                      </label>
                      <input
                        type="text"
                        value={instituicaoProfessor}
                        onChange={(e) => setInstituicaoProfessor(e.target.value)}
                        placeholder="Ex: Colégio Pedro II, Escola Militar..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)]"
                      />
                    </div>
                  </div>
                )}

                {categoriaObjetivo === "profissional" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--ink-primary)] block">
                      Segmento de Atuação / Foco Analítico:
                    </label>
                    <select
                      value={segmentoProfissional}
                      onChange={(e) => setSegmentoProfissional(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--ink-primary)]"
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
                  className="px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] text-[var(--ink-secondary)] text-xs font-semibold hover:bg-[var(--bg-elevated)] hover:text-[var(--ink-primary)] transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft size={14} /> Voltar à Escolaridade
                </button>

                <button
                  type="button"
                  onClick={handleConcluir}
                  disabled={salvando}
                  className="lemmas-gold-cta py-3 px-6 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-transform hover:scale-[1.01]"
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







