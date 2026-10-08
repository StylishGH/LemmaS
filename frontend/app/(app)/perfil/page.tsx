"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  GraduationCap, 
  Target, 
  Save, 
  ShieldCheck, 
  Cpu, 
  CheckCircle2, 
  Flame, 
  Check,
  User,
  LogIn,
  LogOut,
  Info,
  Sparkles
} from "lucide-react";
import { useUserProfile, getInitials } from "@/lib/use-user";

const ESCOLARIDADE_OPCOES = [
  "Ensino Médio (em andamento / concluído)",
  "Cursinho Pré-Vestibular / Pré-Militar",
  "Ensino Superior (Graduação em Matemática)",
  "Ensino Superior (Outras Exatas / Engenharias / TI)",
  "Pós-Graduação / Especialização",
  "Mestrado",
  "Doutorado"
];

const FACULDADES_BRASIL = [
  "UFF - Universidade Federal Fluminense",
  "UFRJ - Universidade Federal do Rio de Janeiro",
  "USP - Universidade de São Paulo",
  "UNICAMP - Universidade Estadual de Campinas",
  "UFMG - Universidade Federal de Minas Gerais",
  "IME - Instituto Militar de Engenharia",
  "ITA - Instituto Tecnológico de Aeronáutica",
  "UERJ - Universidade do Estado do Rio de Janeiro",
  "UNESP - Universidade Estadual Paulista",
  "Outra Instituição"
];

const CONCURSOS_MILITARES = [
  "ESA (Sargentos do Exército)",
  "EsPCEx / AMAN (Oficiais do Exército)",
  "IME (Engenharia Militar)",
  "ITA (Engenharia Aeronáutica)",
  "AFA (Academia da Força Aérea)",
  "EFOMM (Oficiais da Marinha Mercante)",
  "Escola Naval (EN)",
  "EEAR (Especialistas de Aeronáutica)",
  "Colégio Naval / EPCAR"
];

const MOTIVACOES = [
  { id: "concurso_militar", label: "🎖️ Concurso Militar de Alto Desempenho" },
  { id: "data_science", label: "📊 Transição para Ciência de Dados & ML" },
  { id: "docencia", label: "👨‍🏫 Licenciatura e Docência em Matemática" },
  { id: "rigor", label: "📐 Domínio de Demonstrações & Rigor Axiomático" },
  { id: "olimpiadas", label: "🏆 Olimpíadas de Matemática (OBMEP / OBM)" },
];

export default function PerfilPage() {
  const { profile, loading, saveProfile, logout } = useUserProfile();
  const [activeTab, setActiveTab] = useState<"academico" | "concursos" | "engine">("academico");
  
  const [nome, setNome] = useState(profile.nome);
  const [email, setEmail] = useState(profile.email);
  const [escolaridade, setEscolaridade] = useState(profile.escolaridade);
  const [faculdade, setFaculdade] = useState(profile.faculdade);
  const [semestre, setSemestre] = useState(profile.semestre);
  const [metaQuestoesDia, setMetaQuestoesDia] = useState(profile.metaQuestoesDia);
  const [concursosSelecionados, setConcursosSelecionados] = useState<string[]>(profile.concursosSelecionados);
  const [motivacoesSelecionadas, setMotivacoesSelecionadas] = useState<string[]>(profile.motivacoesSelecionadas);
  
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    if (!loading) {
      setNome(profile.nome);
      setEmail(profile.email);
      setEscolaridade(profile.escolaridade);
      setFaculdade(profile.faculdade);
      setSemestre(profile.semestre);
      setMetaQuestoesDia(profile.metaQuestoesDia);
      setConcursosSelecionados(profile.concursosSelecionados);
      setMotivacoesSelecionadas(profile.motivacoesSelecionadas);
    }
  }, [loading, profile]);

  const toggleConcurso = (item: string) => {
    if (concursosSelecionados.includes(item)) {
      setConcursosSelecionados(concursosSelecionados.filter((x) => x !== item));
    } else {
      setConcursosSelecionados([...concursosSelecionados, item]);
    }
  };

  const toggleMotivacao = (id: string) => {
    if (motivacoesSelecionadas.includes(id)) {
      setMotivacoesSelecionadas(motivacoesSelecionadas.filter((x) => x !== id));
    } else {
      setMotivacoesSelecionadas([...motivacoesSelecionadas, id]);
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveProfile({
      nome,
      email,
      escolaridade,
      faculdade,
      semestre,
      metaQuestoesDia,
      concursosSelecionados,
      motivacoesSelecionadas,
      focoConcurso: concursosSelecionados.length > 0 ? concursosSelecionados.slice(0, 2).join(" / ") : "Matemática Geral",
    });
    setSalvo(true);
    setTimeout(() => setSalvo(false), 3000);
  };

  const userInitials = getInitials(nome);

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2 animate-fadeIn text-slate-800 dark:text-[#f5f0df]">
      {/* BANNER AVISO SE FOR VISITANTE LOCAL */}
      {profile.isGuest && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-900 dark:text-[#f5f0df]">
            <Info className="w-4 h-4 text-amber-600 dark:text-[#d9b452] shrink-0" />
            <span>
              <strong>Sessão de Visitante:</strong> Suas metas e perfil estão salvos neste navegador. Faça login ou crie sua conta para sincronizar suas resoluções em nuvem.
            </span>
          </div>
          <Link
            href="/login"
            className="shrink-0 lemmas-gold-cta inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-sm hover:scale-105 transition"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Entrar / Cadastrar</span>
          </Link>
        </div>
      )}

      {/* 1. HEADER DO PERFIL ESTILO EDITORIAL LEMMAS */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200/80 dark:border-amber-500/20 bg-white dark:bg-[#141222] p-6 md:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-700 p-0.5 shadow-md">
              <div className="w-full h-full rounded-[14px] bg-[#0e0d16] flex items-center justify-center text-[#d9b452] font-black text-2xl tracking-wider font-serif-math">
                {userInitials}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="font-serif-math text-2xl md:text-3xl font-semibold text-slate-900 dark:text-[#f5f0df] tracking-tight">
                  {nome || "Estudante Convidado"}
                </h1>
                {profile.isGuest ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-[#d9b452] text-[11px] font-bold">
                    <User className="w-3.5 h-3.5" /> Visitante Local
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verificado
                  </span>
                )}
              </div>
              <p className="text-xs md:text-sm text-slate-600 dark:text-zinc-400 font-medium">
                {escolaridade} • {faculdade}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500 dark:text-zinc-500">
                <span>{email || "Sem e-mail cadastrado"}</span>
                <span>•</span>
                <span className="font-mono text-amber-600 dark:text-[#d9b452] font-semibold">
                  ID #{profile.isGuest ? "VISITANTE" : (profile.id || "LEMMAS-STUDENT")}
                </span>
              </div>
            </div>
          </div>

          {/* CHIPS RÁPIDOS DE STATUS */}
          <div className="flex sm:flex-col gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs font-bold text-amber-700 dark:text-[#d9b452]">
              <Flame className="w-4 h-4 fill-amber-500" />
              <span>{profile.streakDias} {profile.streakDias === 1 ? "dia consecutivo" : "dias consecutivos"}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 dark:bg-[#1b172e] border border-amber-500/20 text-xs font-bold text-amber-700 dark:text-[#dedbd0]">
              <Target className="w-4 h-4 text-amber-500" />
              <span>Foco: {profile.focoConcurso || "ESA / EsPCEx"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. NAVEGAÇÃO POR ABAS */}
      <div className="flex border-b border-slate-200 dark:border-amber-500/20 gap-2">
        <button
          onClick={() => setActiveTab("academico")}
          className={`pb-3 px-4 text-xs md:text-sm font-semibold transition-all relative flex items-center gap-2 ${
            activeTab === "academico"
              ? "text-amber-600 dark:text-[#d9b452] border-b-2 border-amber-500 dark:border-[#d9b452] font-bold"
              : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-[#f5f0df]"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Formação & Dados Acadêmicos</span>
        </button>

        <button
          onClick={() => setActiveTab("concursos")}
          className={`pb-3 px-4 text-xs md:text-sm font-semibold transition-all relative flex items-center gap-2 ${
            activeTab === "concursos"
              ? "text-amber-600 dark:text-[#d9b452] border-b-2 border-amber-500 dark:border-[#d9b452] font-bold"
              : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-[#f5f0df]"
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Objetivos & Concursos Alvo</span>
        </button>

        <button
          onClick={() => setActiveTab("engine")}
          className={`pb-3 px-4 text-xs md:text-sm font-semibold transition-all relative flex items-center gap-2 ${
            activeTab === "engine"
              ? "text-amber-600 dark:text-[#d9b452] border-b-2 border-amber-500 dark:border-[#d9b452] font-bold"
              : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-[#f5f0df]"
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>LEMMAS Core & MathAI</span>
        </button>
      </div>

      {/* 3. CONTEÚDO DAS ABAS */}
      <form onSubmit={handleSalvar} className="space-y-6">
        {activeTab === "academico" && (
          <div className="bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
            <div className="space-y-1">
              <h2 className="font-serif-math text-lg font-semibold text-slate-900 dark:text-[#f5f0df]">Perfil Acadêmico</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Informações para calibrar a didática e o nível de profundidade matemática sugerido pelo LEMMAS Core.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#18152a] border border-slate-200 dark:border-amber-500/15 text-sm text-slate-900 dark:text-[#f5f0df] focus:border-amber-500 outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  E-mail Institucional ou Pessoal
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#18152a] border border-slate-200 dark:border-amber-500/15 text-sm text-slate-900 dark:text-[#f5f0df] focus:border-amber-500 outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Nível de Escolaridade
                </label>
                <select
                  value={escolaridade}
                  onChange={(e) => setEscolaridade(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#18152a] border border-slate-200 dark:border-amber-500/15 text-sm text-slate-900 dark:text-[#f5f0df] focus:border-amber-500 outline-none transition"
                >
                  {ESCOLARIDADE_OPCOES.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Universidade / Instituição de Ensino
                </label>
                <select
                  value={faculdade}
                  onChange={(e) => setFaculdade(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#18152a] border border-slate-200 dark:border-amber-500/15 text-sm text-slate-900 dark:text-[#f5f0df] focus:border-amber-500 outline-none transition"
                >
                  {FACULDADES_BRASIL.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Semestre / Período
                </label>
                <input
                  type="text"
                  value={semestre}
                  onChange={(e) => setSemestre(e.target.value)}
                  placeholder="Ex: 5º Período"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#18152a] border border-slate-200 dark:border-amber-500/15 text-sm text-slate-900 dark:text-[#f5f0df] focus:border-amber-500 outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Trilha Profissional Complementar
                </label>
                <input
                  type="text"
                  defaultValue="Ciência de Dados & Machine Learning (Python/SQL)"
                  readOnly
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#18152a]/60 border border-slate-200 dark:border-amber-500/10 text-sm text-slate-600 dark:text-zinc-400 cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "concursos" && (
          <div className="bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
            <div className="space-y-1">
              <h2 className="font-serif-math text-lg font-semibold text-slate-900 dark:text-[#f5f0df]">Concursos & Metas de Estudo</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Selecione as bancas e motivações para priorizarmos os lemas no seu radar.
              </p>
            </div>

            {/* SELEÇÃO DE CONCURSOS */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider block">
                Concursos Militares em Foco:
              </label>
              <div className="flex flex-wrap gap-2.5">
                {CONCURSOS_MILITARES.map((c) => {
                  const isSelected = concursosSelecionados.includes(c);
                  return (
                    <button
                      type="button"
                      key={c}
                      onClick={() => toggleConcurso(c)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isSelected
                          ? "lemmas-gold-cta font-bold shadow-sm"
                          : "bg-slate-100 dark:bg-[#18152a] text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-amber-500/15 hover:border-amber-500/35"
                      }`}
                    >
                      {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
                      <span>{c}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SELEÇÃO DE MOTIVAÇÕES */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider block">
                Motivações Centrais de Aprendizado:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MOTIVACOES.map((m) => {
                  const isSelected = motivacoesSelecionadas.includes(m.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => toggleMotivacao(m.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs font-medium ${
                        isSelected
                          ? "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500 dark:border-[#d9b452] text-amber-900 dark:text-[#f5f0df]"
                          : "bg-slate-50 dark:bg-[#18152a] border-slate-200 dark:border-amber-500/15 text-slate-700 dark:text-zinc-300 hover:border-amber-500/30"
                      }`}
                    >
                      <span>{m.label}</span>
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${isSelected ? "lemmas-gold-cta" : "border-slate-300 dark:border-zinc-700"}`}>
                        {isSelected && <Check className="w-3 h-3 text-slate-950 font-bold" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* META DIÁRIA */}
            <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                  Meta Diária de Resolução:
                </label>
                <span className="font-serif-math text-sm font-bold text-amber-600 dark:text-[#d9b452]">
                  {metaQuestoesDia} lemas/dia
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={metaQuestoesDia}
                onChange={(e) => setMetaQuestoesDia(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Aproximadamente {metaQuestoesDia * 3} minutos diários de dedicação recomendados.
              </p>
            </div>
          </div>
        )}

        {activeTab === "engine" && (
          <div className="bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
            <div className="space-y-1">
              <h2 className="font-serif-math text-lg font-semibold text-slate-900 dark:text-[#f5f0df]">Motor Cognitivo MathAI & LEMMAS Core</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Orquestração de inteligência artificial pedagógica e repetição espaçada adaptativa.
              </p>
            </div>

            {/* ROTEAMENTO AUTÔNOMO MULTI-MODELO (SEM SELETOR MANUAL PELO ALUNO) */}
            <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-600 dark:text-[#d9b452]" />
                  <span className="text-xs font-bold text-slate-900 dark:text-[#f5f0df]">
                    Roteamento Cognitivo Inteligente (MathAI Gateway)
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full font-bold">
                  <CheckCircle2 className="w-3 h-3" /> Orquestração Autônoma Ativa
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Você não precisa se preocupar em selecionar qual modelo de IA utilizar. A <strong>MathAI Engine</strong> analisa a complexidade e a taxonomia da questão em tempo real e orquestra a combinação perfeita:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-white dark:bg-[#18152a] border border-slate-200/80 dark:border-amber-500/15 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-[#f5f0df]">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>NVIDIA Nemotron</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-normal">
                    Acionado para demonstrações axiomáticas formais e rigor analítico.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-[#18152a] border border-slate-200/80 dark:border-amber-500/15 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-[#f5f0df]">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>DeepSeek R1</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-normal">
                    Acionado para intuição socrática, atalhos de concurso e heurísticas.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-[#18152a] border border-slate-200/80 dark:border-amber-500/15 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-[#f5f0df]">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Gemini Multimodal</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-normal">
                    Acionado para OCR de fotos de caderno e transcrição de rascunhos em KaTeX.
                  </p>
                </div>
              </div>
            </div>

            {/* SUPERMEMO-2 CONFIG */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#18152a] border border-slate-200 dark:border-amber-500/15 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-[#f5f0df]">Motor de Repetição Espaçada (SM-2 / FSRS)</span>
                <span className="text-xs font-mono text-amber-600 dark:text-[#d9b452] font-semibold">Ativo • LEMMAS Core</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed font-sans">
                As revisões são recalculadas com Fator de Facilidade inicial de 2.5 e curva de decaimento ajustada por acertos consecutivos e erros categorizados.
              </p>
            </div>
          </div>
        )}

        {/* BOTÃO DE SALVAR COM FEEDBACK E OPÇÃO DE LOGOUT SE AUTENTICADO */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
          <div>
            {salvo ? (
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Perfil e preferências salvos com sucesso!</span>
              </div>
            ) : (
              <span className="text-xs text-slate-400 dark:text-zinc-500">
                {profile.isGuest ? "Salvo localmente no dispositivo" : "Sincronizado na nuvem (Supabase)"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!profile.isGuest && (
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-500/10 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair da Conta</span>
              </button>
            )}

            <button
              type="submit"
              className="lemmas-gold-cta flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all hover:scale-[1.02]"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
