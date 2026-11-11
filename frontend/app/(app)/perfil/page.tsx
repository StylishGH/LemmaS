"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Sparkles,
  CreditCard,
  Loader2,
  Camera,
  Trash2,
  BookOpen,
  Layers,
  HelpCircle,
  X,
  Search,
  Compass,
  Award,
  Binary,
  AlertTriangle,
  Crown,
  Clock,
  ArrowRight,
  Filter,
  CheckCheck
} from "lucide-react";
import { useUserProfile, getInitials, inferirMotivacoes } from "@/lib/use-user";
import { AdminAnalyticsShortcut } from "@/components/AdminAnalyticsShortcut";
import {
  TRILHAS_MOTIVACOES,
  TRILHAS_CONCEITUAIS_CATALOGO,
  BANCAS_EXAMES_CATALOGO,
  calcularRecomendacoesConceituais,
  calcularRecomendacoesBancas,
  RecomendacaoPedagogica,
  RecomendacaoBanca,
  getTopicLabel,
  getObjectiveLabel
} from "@/lib/pedagogical-engine";

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

function compressAvatar(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            width = maxSize;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/webp", 0.85));
      };
      img.onerror = () => reject(new Error("Falha ao processar imagem"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

function calcularFocoSugerido(
  customFoco: string,
  selectedBancas: string[],
  selectedConceituais: string[],
  objetivoPrincipal: string | null,
  objetivosSecundarios: string[]
): string {
  if (customFoco && customFoco.trim()) {
    return customFoco.trim();
  }
  if (selectedBancas.length > 0) {
    const formatItem = (item: string) => {
      const parts = item.split("(");
      return parts[0].trim();
    };
    return selectedBancas.slice(0, 2).map(formatItem).join(" / ");
  }
  if (selectedConceituais.length > 0) {
    return selectedConceituais.slice(0, 2).join(" / ");
  }
  if (objetivoPrincipal) {
    const principalTrilha = TRILHAS_MOTIVACOES.find((t) => t.id === objetivoPrincipal);
    if (principalTrilha) return principalTrilha.titulo.split("&")[0].trim();
  }
  if (objetivosSecundarios.length > 0) {
    const secTrilha = TRILHAS_MOTIVACOES.find((t) => t.id === objetivosSecundarios[0]);
    if (secTrilha) return secTrilha.titulo.split("&")[0].trim();
  }
  return "Matemática Geral";
}

export default function PerfilPage() {
  const { profile, loading, saveProfile, logout } = useUserProfile();
  const [activeTab, setActiveTab] = useState<"academico" | "concursos" | "engine">("concursos");
  
  const [nome, setNome] = useState(profile.nome);
  const [email, setEmail] = useState(profile.email);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [salvandoFoto, setSalvandoFoto] = useState(false);
  const [fotoFeedback, setFotoFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [escolaridade, setEscolaridade] = useState(profile.escolaridade);
  const [faculdade, setFaculdade] = useState(profile.faculdade);
  const [semestre, setSemestre] = useState(profile.semestre);

  // Modelagem Pedagógica V2: Objetivo Principal exclusivo vs Objetivos Secundários
  const [objetivoPrincipal, setObjetivoPrincipal] = useState<string | null>(
    profile.objetivoPrincipal || (profile.motivacoesSelecionadas?.length ? profile.motivacoesSelecionadas[0] : null)
  );
  const [objetivosSecundarios, setObjetivosSecundarios] = useState<string[]>(
    profile.objetivosSecundarios || (profile.motivacoesSelecionadas?.length ? profile.motivacoesSelecionadas.slice(1) : [])
  );
  
  // Preferência pedagógica do tutor MathAI (soberana sobre objetivos)
  const [pedagogicalPreference, setPedagogicalPreference] = useState<'conceitual' | 'rigor_formal' | 'aplicado_ml' | 'competitivo'>('conceitual');
  
  // Conteúdos selecionados explicitamente pelo estudante vs recomendações do motor
  const [selectedConceituais, setSelectedConceituais] = useState<string[]>(
    profile.conteudosSelecionados || profile.conceitosSelecionados || []
  );
  const [selectedBancas, setSelectedBancas] = useState<string[]>(profile.concursosSelecionados || []);

  // Rotina de Estudos: minutos diários e tipo de atividade
  const [disponibilidadeMinutos, setDisponibilidadeMinutos] = useState<number>(profile.disponibilidadeMinutos || 45);
  const [metaTipo, setMetaTipo] = useState<"questoes" | "sessoes">(profile.metaTipo || "questoes");
  const [metaQuestoesDia, setMetaQuestoesDia] = useState<number>(profile.metaQuestoesDia || 10);
  
  // Visualizações e filtros da interface
  const [filtroGrauRecomendacao, setFiltroGrauRecomendacao] = useState<"todas" | "prioritarias" | "complementares" | "futuras">("todas");
  const [catalogoVisualizacao, setCatalogoVisualizacao] = useState<"recomendadas" | "conceituais" | "bancas" | "todas">("recomendadas");
  const [buscaCatalogo, setBuscaCatalogo] = useState<string>("");
  const [focoCustomizado, setFocoCustomizado] = useState<string>("");
  const [salvo, setSalvo] = useState(false);

  const currentFoto = previewUrl || profile.fotoUrl;
  const lastLoadedUserRef = useRef<string | null>(null);

  useEffect(() => {
    setImgError(false);
  }, [profile.fotoUrl, previewUrl]);

  useEffect(() => {
    if (!loading) {
      const userKey = profile.email || (profile.id ? String(profile.id) : (profile.isGuest ? "guest" : "user"));
      if (lastLoadedUserRef.current !== userKey) {
        lastLoadedUserRef.current = userKey;
        setNome(profile.nome);
        setEmail(profile.email);
        setEscolaridade(profile.escolaridade);
        setFaculdade(profile.faculdade);
        setSemestre(profile.semestre);
        setMetaQuestoesDia(profile.metaQuestoesDia || 10);
        setDisponibilidadeMinutos(profile.disponibilidadeMinutos || 45);
        setMetaTipo(profile.metaTipo || "questoes");
        
        const motivacoesAtivas =
          profile.motivacoesSelecionadas && profile.motivacoesSelecionadas.length > 0
            ? profile.motivacoesSelecionadas
            : inferirMotivacoes(profile.focoConcurso, []);

        const prim = profile.objetivoPrincipal || (motivacoesAtivas.length > 0 ? motivacoesAtivas[0] : "fundamentos_logica_intuicao");
        const sec = profile.objetivosSecundarios || (motivacoesAtivas.length > 1 ? motivacoesAtivas.slice(1) : []);
        setObjetivoPrincipal(prim);
        setObjetivosSecundarios(sec);

        setSelectedBancas(profile.concursosSelecionados || []);
        setSelectedConceituais(profile.conteudosSelecionados || profile.conceitosSelecionados || []);
        
        const pref = profile.pedagogicalPreference as 'conceitual' | 'rigor_formal' | 'aplicado_ml' | 'competitivo';
        if (['conceitual', 'rigor_formal', 'aplicado_ml', 'competitivo'].includes(pref)) {
          setPedagogicalPreference(pref);
        } else {
          setPedagogicalPreference('conceitual');
        }
      }
    }
  }, [loading, profile]);

  // Cálculos reativos do Motor Pedagógico V1 (100% determinístico e explicável)
  const recomendacoesConceituais = useMemo(() => {
    return calcularRecomendacoesConceituais({
      objetivoPrincipal,
      objetivosSecundarios,
      conteudosSelecionados: selectedConceituais,
    });
  }, [objetivoPrincipal, objetivosSecundarios, selectedConceituais]);

  const recomendacoesBancas = useMemo(() => {
    return calcularRecomendacoesBancas({
      objetivoPrincipal,
      objetivosSecundarios,
    });
  }, [objetivoPrincipal, objetivosSecundarios]);

  const recomendacoesFiltradas = useMemo(() => {
    if (filtroGrauRecomendacao === "todas") return recomendacoesConceituais;
    if (filtroGrauRecomendacao === "prioritarias") return recomendacoesConceituais.filter((r) => r.categoria === "prioritaria");
    if (filtroGrauRecomendacao === "complementares") return recomendacoesConceituais.filter((r) => r.categoria === "complementar");
    if (filtroGrauRecomendacao === "futuras") return recomendacoesConceituais.filter((r) => r.categoria === "futura");
    return recomendacoesConceituais;
  }, [recomendacoesConceituais, filtroGrauRecomendacao]);

  const contagensCategorias = useMemo(() => {
    return {
      prioritarias: recomendacoesConceituais.filter((r) => r.categoria === "prioritaria").length,
      complementares: recomendacoesConceituais.filter((r) => r.categoria === "complementar").length,
      futuras: recomendacoesConceituais.filter((r) => r.categoria === "futura").length,
      total: recomendacoesConceituais.length,
    };
  }, [recomendacoesConceituais]);

  // Gestão de Objetivos (Etapa 1)
  const handleDefinirObjetivoPrincipal = (id: string) => {
    setObjetivoPrincipal(id);
    // Se o novo objetivo principal estava nos secundários, remove-o de lá
    if (objetivosSecundarios.includes(id)) {
      setObjetivosSecundarios(objetivosSecundarios.filter((x) => x !== id));
    }
  };

  const handleToggleObjetivoSecundario = (id: string) => {
    if (id === objetivoPrincipal) return; // Não pode ser principal e secundário ao mesmo tempo
    if (objetivosSecundarios.includes(id)) {
      setObjetivosSecundarios(objetivosSecundarios.filter((x) => x !== id));
    } else {
      setObjetivosSecundarios([...objetivosSecundarios, id]);
    }
  };

  // Toggle de seleção explícita pelo estudante (Etapa 3 e 4)
  const toggleConceitoSelecionado = (label: string) => {
    if (selectedConceituais.includes(label)) {
      setSelectedConceituais(selectedConceituais.filter((x) => x !== label));
    } else {
      setSelectedConceituais([...selectedConceituais, label]);
    }
  };

  const toggleBancaSelecionada = (label: string) => {
    if (selectedBancas.includes(label)) {
      setSelectedBancas(selectedBancas.filter((x) => x !== label));
    } else {
      setSelectedBancas([...selectedBancas, label]);
    }
  };

  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione um arquivo de imagem válido (PNG, JPG, WebP).");
      return;
    }

    try {
      setSalvandoFoto(true);
      const dataUrl = await compressAvatar(file, 256);
      setPreviewUrl(dataUrl);
      setImgError(false);
      await saveProfile({ fotoUrl: dataUrl });
      setFotoFeedback("Foto atualizada com sucesso!");
      setTimeout(() => setFotoFeedback(null), 3000);
    } catch (err) {
      console.error("Erro ao salvar foto de perfil:", err);
      alert("Erro ao processar imagem. Tente uma foto menor.");
    } finally {
      setSalvandoFoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoverFoto = async () => {
    if (!confirm("Deseja remover sua foto de perfil e voltar para suas iniciais?")) return;
    try {
      setSalvandoFoto(true);
      setPreviewUrl(null);
      await saveProfile({ fotoUrl: null });
      setFotoFeedback("Foto removida!");
      setTimeout(() => setFotoFeedback(null), 3000);
    } catch (err) {
      console.error("Erro ao remover foto:", err);
    } finally {
      setSalvandoFoto(false);
    }
  };

  const focoFinal = useMemo(() => {
    return calcularFocoSugerido(
      focoCustomizado,
      selectedBancas,
      selectedConceituais,
      objetivoPrincipal,
      objetivosSecundarios
    );
  }, [focoCustomizado, selectedBancas, selectedConceituais, objetivoPrincipal, objetivosSecundarios]);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    const motivacoesConsolidadas = [
      ...(objetivoPrincipal ? [objetivoPrincipal] : []),
      ...objetivosSecundarios.filter((s) => s !== objetivoPrincipal),
    ];

    await saveProfile({
      nome,
      email,
      fotoUrl: currentFoto,
      escolaridade,
      faculdade,
      semestre,
      metaQuestoesDia,
      disponibilidadeMinutos,
      metaTipo,
      objetivoPrincipal,
      objetivosSecundarios,
      conteudosSelecionados: selectedConceituais,
      conteudosRecomendados: recomendacoesConceituais.map((r) => r.topicId),
      concursosSelecionados: selectedBancas,
      conceitosSelecionados: selectedConceituais,
      motivacoesSelecionadas: motivacoesConsolidadas,
      focoConcurso: focoFinal,
      pedagogicalPreference,
    });
    setSalvo(true);
    setTimeout(() => setSalvo(false), 3000);
  };

  const userInitials = getInitials(nome);

  // Filtragem para busca no catálogo
  const catalogoFiltradoBusca = useMemo(() => {
    if (!buscaCatalogo.trim()) return null;
    const term = buscaCatalogo.toLowerCase().trim();
    const conc = TRILHAS_CONCEITUAIS_CATALOGO.filter(
      (c) => c.label.toLowerCase().includes(term) || (c.descricao && c.descricao.toLowerCase().includes(term))
    );
    const banc = BANCAS_EXAMES_CATALOGO.filter(
      (b) => b.label.toLowerCase().includes(term) || b.categoriaOrigem.toLowerCase().includes(term)
    );
    return { conceituais: conc, bancas: banc };
  }, [buscaCatalogo]);

  // Estimativa pedagógica realista de tempo por questão/sessão
  const tempoMedioEstimado = useMemo(() => {
    if (!metaQuestoesDia || metaQuestoesDia <= 0) return 0;
    return Math.max(1, Math.round((disponibilidadeMinutos / metaQuestoesDia) * 10) / 10);
  }, [disponibilidadeMinutos, metaQuestoesDia]);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto py-24 text-center space-y-4 animate-pulse text-slate-800 dark:text-[#f5f0df]">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/25 dark:bg-amber-500/10 dark:border-amber-500/25 flex items-center justify-center mx-auto shadow-sm">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-[#d9b452]" />
        </div>
        <p className="text-xs text-slate-500 dark:text-zinc-400 font-sans">
          Sincronizando perfil e preferências pedagógicas com a nuvem...
        </p>
      </div>
    );
  }

  if (profile.isGuest) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 animate-fadeIn text-center space-y-6 text-slate-800 dark:text-[#f5f0df]">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-[#d9b452] flex items-center justify-center mx-auto shadow-sm">
          <User className="w-8 h-8" />
        </div>
        <div className="space-y-3">
          <h1 className="font-serif-math text-3xl font-bold tracking-tight">
            Perfil de Estudante
          </h1>
          <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed font-sans max-w-md mx-auto">
            Você não está conectado a nenhuma conta. Para personalizar seus objetivos pedagógicos, calibrar o tutor MathAI e sincronizar sua rotina na nuvem, entre na sua conta ou cadastre-se gratuitamente.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/login?tab=signup"
            className="w-full sm:w-auto px-6 py-3 rounded-xl lemmas-gold-cta font-bold text-xs flex items-center justify-center gap-2 shadow-sm hover:scale-[1.02] transition-transform"
          >
            <span>Criar Conta Gratuita</span>
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-3 rounded-xl border border-blue-500/40 hover:bg-blue-500/10 text-slate-800 dark:border-amber-500/40 dark:hover:bg-amber-500/10 dark:text-[#f5f0df] font-semibold text-xs flex items-center justify-center gap-2 transition"
          >
            <LogIn className="w-4 h-4" />
            <span>Já tenho conta (Entrar)</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2 animate-fadeIn text-slate-800 dark:text-[#f5f0df]">
      {/* 1. HEADER DO PERFIL ESTILO EDITORIAL LEMMAS */}
      <div className="relative rounded-3xl overflow-hidden border border-[var(--border-board)] bg-white dark:bg-[#161a1e] p-6 md:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* AVATAR COM FOTO E BOTÃO DE CÂMERA */}
            <div className="relative group shrink-0">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 dark:from-amber-500 dark:to-amber-700 p-0.5 shadow-md overflow-hidden relative cursor-pointer group-hover:scale-[1.02] transition-transform"
                title="Clique para alterar sua foto de perfil"
              >
                {currentFoto && !imgError ? (
                  <img
                    src={currentFoto}
                    alt={nome || "Foto de Perfil"}
                    onError={() => setImgError(true)}
                    className="w-full h-full rounded-[14px] object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-[14px] bg-[#0e0d16] flex items-center justify-center text-blue-500 dark:text-[#d9b452] font-black text-2xl tracking-wider font-serif-math">
                    {userInitials}
                  </div>
                )}
                {salvandoFoto && (
                  <div className="absolute inset-0 bg-black/60 rounded-[14px] flex items-center justify-center z-20">
                    <Loader2 className="w-6 h-6 text-blue-400 dark:text-amber-400 animate-spin" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-1 rounded-[14px]">
                  <Camera className="w-4 h-4 text-blue-300 dark:text-amber-400" />
                  <span>Trocar</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={salvandoFoto}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-500 text-white dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950 flex items-center justify-center shadow-lg border-2 border-white dark:border-[#141222] transition-transform hover:scale-110 cursor-pointer z-10"
                title="Alterar foto de perfil"
                aria-label="Alterar foto de perfil"
              >
                <Camera className="w-3.5 h-3.5 fill-current" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleUploadFoto}
                className="hidden"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="font-serif-math text-2xl md:text-3xl font-semibold text-slate-900 dark:text-[#f5f0df] tracking-tight">
                  {nome || "Estudante Convidado"}
                </h1>
                {profile.emailVerificado ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" /> E-mail Verificado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-700 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-[#d9b452] text-[11px] font-bold">
                    <AlertTriangle className="w-3.5 h-3.5" /> E-mail Não Verificado
                  </span>
                )}
              </div>
              <p className="text-xs md:text-sm text-slate-600 dark:text-zinc-400 font-medium">
                {escolaridade || "Ensino Superior"} • {faculdade || "Universidade"}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500 dark:text-zinc-500">
                <span>{email || "Sem e-mail cadastrado"}</span>
                <span>•</span>
                <span className="font-mono text-blue-600 dark:text-[#d9b452] font-semibold">
                  ID #{profile.id || "LEMMAS-STUDENT"}
                </span>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={salvandoFoto}
                  className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-[#d9b452] hover:underline cursor-pointer"
                >
                  <Camera className="w-3 h-3" />
                  <span>{currentFoto ? "Alterar foto" : "Adicionar foto"}</span>
                </button>
                {currentFoto && (
                  <>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={handleRemoverFoto}
                      disabled={salvandoFoto}
                      className="inline-flex items-center gap-1 font-semibold text-rose-500 hover:underline cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remover foto</span>
                    </button>
                  </>
                )}
                {fotoFeedback && (
                  <span className="text-emerald-500 font-bold ml-1 animate-fadeIn">
                    ✓ {fotoFeedback}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* CHIPS RÁPIDOS DE STATUS */}
          <div className="flex sm:flex-col gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-xs font-bold text-blue-700 dark:bg-amber-500/10 dark:border-amber-500/25 dark:text-[#d9b452]">
              <Flame className="w-4 h-4 fill-blue-600 text-blue-600 dark:fill-amber-500 dark:text-amber-500" />
              <span>{profile.streakDias} {profile.streakDias === 1 ? "dia consecutivo" : "dias consecutivos"}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-700 dark:bg-[#1b172e] dark:border-amber-500/20 dark:text-[#dedbd0]">
              <Target className="w-4 h-4 text-blue-600 dark:text-amber-500" />
              <span>Foco: {profile.focoConcurso || "Matemática Geral"}</span>
            </div>
          </div>
        </div>
      </div>

      <AdminAnalyticsShortcut />

      {/* 2. NAVEGAÇÃO POR ABAS */}
      <div className="flex border-b border-slate-200 dark:border-amber-500/20 gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("concursos")}
          className={`pb-3 px-4 text-xs md:text-sm font-semibold transition-all relative flex items-center gap-2 shrink-0 ${
            activeTab === "concursos"
              ? "text-blue-600 dark:text-[#d9b452] border-b-2 border-blue-600 dark:border-[#d9b452] font-bold"
              : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-[#f5f0df]"
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Personalização Pedagógica Inteligente</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("academico")}
          className={`pb-3 px-4 text-xs md:text-sm font-semibold transition-all relative flex items-center gap-2 shrink-0 ${
            activeTab === "academico"
              ? "text-blue-600 dark:text-[#d9b452] border-b-2 border-blue-600 dark:border-[#d9b452] font-bold"
              : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-[#f5f0df]"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Formação & Dados Acadêmicos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("engine")}
          className={`pb-3 px-4 text-xs md:text-sm font-semibold transition-all relative flex items-center gap-2 shrink-0 ${
            activeTab === "engine"
              ? "text-blue-600 dark:text-[#d9b452] border-b-2 border-blue-600 dark:border-[#d9b452] font-bold"
              : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-[#f5f0df]"
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>LEMMAS Core & MathAI</span>
        </button>

        <Link
          href="/perfil/faturamento"
          className="pb-3 px-4 text-xs md:text-sm font-semibold transition-all relative flex items-center gap-2 text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-[#d9b452] ml-auto sm:ml-0 shrink-0"
        >
          <CreditCard className="w-4 h-4 text-blue-600 dark:text-amber-500" />
          <span>Dados Fiscais & Faturamento</span>
        </Link>
      </div>

      {/* 3. CONTEÚDO PRINCIPAL: 5 ETAPAS PROGRESSIVAS */}
      <form onSubmit={handleSalvar} className="space-y-6">
        {activeTab === "concursos" && (
          <div className="bg-white dark:bg-[#161a1e] border border-[var(--border-board)] rounded-2xl p-6 md:p-8 space-y-10 shadow-sm">
            
            <div className="space-y-1">
              <h2 className="font-serif-math text-2xl font-semibold text-slate-900 dark:text-[#f5f0df]">
                Personalização Pedagógica do Estudante
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Configure sua jornada em 5 etapas pedagógicas estruturadas: objetivos, modo do tutor, trilha recomendada com justificativas, catálogo avançado e rotina de estudos.
              </p>
            </div>

            {/* ETAPA 1: OBJETIVOS (PRINCIPAL EXCLUSIVO + SECUNDÁRIOS OPCIONAIS) */}
            <div className="space-y-5 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
                <div className="space-y-0.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-700 dark:bg-amber-500/20 dark:text-[#d9b452] flex items-center justify-center text-[11px] font-bold">1</span>
                    <span>Seus Objetivos de Estudo</span>
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Defina <strong>1 Objetivo Principal</strong> prioritário e, se desejar, adicione interesses secundários complementares.
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-700 dark:bg-amber-500/15 dark:text-[#d9b452] text-xs font-bold">
                    <Crown className="w-3.5 h-3.5" />
                    <span>Principal: {objetivoPrincipal ? getObjectiveLabel(objetivoPrincipal) : "Nenhum selecionado"}</span>
                  </span>
                </div>
              </div>

              {/* GRID DE SELEÇÃO DE OBJETIVOS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {TRILHAS_MOTIVACOES.map((trilha) => {
                  const isPrincipal = objetivoPrincipal === trilha.id;
                  const isSecundario = objetivosSecundarios.includes(trilha.id);
                  
                  return (
                    <div
                      key={trilha.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 text-xs select-none ${
                        isPrincipal
                          ? "bg-blue-500/10 dark:bg-amber-500/15 border-blue-500 dark:border-[#d9b452] shadow-sm ring-1 ring-blue-500/30 dark:ring-amber-500/30"
                          : isSecundario
                          ? "bg-slate-50 dark:bg-[#1a2028] border-blue-400/50 dark:border-amber-500/35"
                          : "bg-slate-50/70 dark:bg-[#1e2329]/70 border-slate-200 dark:border-amber-500/15 hover:border-blue-400/40 dark:hover:border-amber-500/35"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-[#f5f0df]">
                          <span className="text-xl">{trilha.icone}</span>
                          <span className="text-xs font-bold">{trilha.titulo}</span>
                        </div>
                        {isPrincipal && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white dark:bg-amber-500 dark:text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0">
                            <Crown className="w-3 h-3" />
                            <span>Principal</span>
                          </span>
                        )}
                        {isSecundario && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-700 dark:bg-amber-500/20 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider shrink-0">
                            Secundário
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed font-sans">
                        {trilha.subtitulo}
                      </p>

                      {/* BOTÕES DE DEFINIÇÃO EXPLÍCITA */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-200/50 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={() => handleDefinirObjetivoPrincipal(trilha.id)}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                            isPrincipal
                              ? "bg-blue-600 text-white dark:bg-amber-500 dark:text-slate-950"
                              : "bg-slate-200/70 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200"
                          }`}
                        >
                          <Crown className="w-3 h-3" />
                          <span>{isPrincipal ? "Objetivo Central" : "Definir Principal"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleObjetivoSecundario(trilha.id)}
                          disabled={isPrincipal}
                          className={`py-1.5 px-2.5 rounded-lg text-[11px] font-semibold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                            isSecundario
                              ? "bg-blue-100 text-blue-800 dark:bg-amber-500/20 dark:text-amber-300 border border-blue-300 dark:border-amber-500/30"
                              : "hover:bg-slate-200/60 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400"
                          }`}
                          title={isPrincipal ? "O objetivo principal já inclui priorização máxima" : "Adicionar como interesse secundário"}
                        >
                          {isSecundario ? <Check className="w-3 h-3 stroke-[2.5]" /> : "+"}
                          <span>{isSecundario ? "Secundário" : "+ Secundário"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ETAPA 2: COMO DESEJA APRENDER (PREFERÊNCIA PEDAGÓGICA SOBERANA DO TUTOR MATHAI) */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-700 dark:bg-amber-500/20 dark:text-[#d9b452] flex items-center justify-center text-[11px] font-bold">2</span>
                    <span>Como Deseja Aprender (Tutor Socrático MathAI)</span>
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Defina a abordagem didática das dicas socráticas. Sua escolha é <strong>soberana</strong> e nunca será substituída automaticamente.
                  </p>
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1 self-start sm:self-auto">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Escolha Manual Soberana</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    id: "conceitual" as const,
                    titulo: "Conceitual & Intuitivo",
                    icone: "💡",
                    badge: "Padrão Pedagógico",
                    descricao: "Começa pela intuição geométrica e numérica, exemplos pertinentes e explicação do porquê antes da formalização abstrata.",
                  },
                  {
                    id: "rigor_formal" as const,
                    titulo: "Rigor Formal & Axiomas",
                    icone: "📐",
                    badge: "Ensino Superior / Licenciatura",
                    descricao: "Identifica definições axiomáticas com precisão, hipóteses formais, teoremas e lemas estruturais passo a passo.",
                  },
                  {
                    id: "aplicado_ml" as const,
                    titulo: "Aplicado a Dados & ML",
                    icone: "📊",
                    badge: "Data Science & IA",
                    descricao: "Conecta conceitos matemáticos a matrizes, espaços vetoriais, otimização convexa, gradientes e modelos de Machine Learning.",
                  },
                  {
                    id: "competitivo" as const,
                    titulo: "Competitivo & Eficiente",
                    icone: "⚡",
                    badge: "Bancas Militares & Concursos",
                    descricao: "Destaca o 'pulo do gato', atalhos algébricos, padrões de bancas de alta pressão e técnicas de eliminação ágil.",
                  },
                ].map((modo) => {
                  const isSelected = pedagogicalPreference === modo.id;
                  return (
                    <div
                      key={modo.id}
                      onClick={() => setPedagogicalPreference(modo.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-2.5 text-xs select-none ${
                        isSelected
                          ? "bg-blue-500/10 dark:bg-amber-500/15 border-blue-500 dark:border-[#d9b452] shadow-sm ring-1 ring-blue-500/20 dark:ring-amber-500/20"
                          : "bg-slate-50 dark:bg-[#1e2329] border-slate-200 dark:border-amber-500/15 hover:border-blue-500/35 dark:hover:border-amber-500/35"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-[#f5f0df]">
                            <span className="text-lg">{modo.icone}</span>
                            <span className="text-xs font-bold">{modo.titulo}</span>
                          </div>
                          <div className={`w-4 h-4 rounded-md border shrink-0 flex items-center justify-center transition-colors ${
                            isSelected ? "bg-blue-600 border-blue-600 text-white dark:bg-amber-500 dark:border-amber-500 dark:text-slate-950 font-bold" : "border-slate-300 dark:border-zinc-700"
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                        <span className="inline-block text-[10px] font-semibold text-blue-600 dark:text-[#d9b452]">
                          {modo.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed font-sans">
                        {modo.descricao}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ETAPA 3: SUA TRILHA SUGERIDA (MOTOR DETERMINÍSTICO E EXPLICÁVEL V1) */}
            <div className="space-y-5 pt-4 border-t border-slate-100 dark:border-zinc-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-700 dark:bg-amber-500/20 dark:text-[#d9b452] flex items-center justify-center text-[11px] font-bold">3</span>
                    <span>Sua Trilha Sugerida (Motor Pedagógico Explicável)</span>
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Sugestões calculadas por relevância, pré-requisitos e acervo real. As matérias <strong>não são selecionadas automaticamente</strong>: você decide o que adicionar.
                  </p>
                </div>

                {/* FILTROS POR GRAU DE PRIORIDADE */}
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#1a2028] p-1 rounded-xl text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setFiltroGrauRecomendacao("todas")}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      filtroGrauRecomendacao === "todas"
                        ? "bg-white dark:bg-[#252b33] shadow-xs text-blue-600 dark:text-[#d9b452] font-bold"
                        : "text-slate-600 dark:text-zinc-400"
                    }`}
                  >
                    Todas ({contagensCategorias.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroGrauRecomendacao("prioritarias")}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      filtroGrauRecomendacao === "prioritarias"
                        ? "bg-white dark:bg-[#252b33] shadow-xs text-emerald-600 dark:text-emerald-400 font-bold"
                        : "text-slate-600 dark:text-zinc-400"
                    }`}
                  >
                    Prioritárias ({contagensCategorias.prioritarias})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroGrauRecomendacao("complementares")}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      filtroGrauRecomendacao === "complementares"
                        ? "bg-white dark:bg-[#252b33] shadow-xs text-blue-600 dark:text-blue-400 font-bold"
                        : "text-slate-600 dark:text-zinc-400"
                    }`}
                  >
                    Complementares ({contagensCategorias.complementares})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroGrauRecomendacao("futuras")}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      filtroGrauRecomendacao === "futuras"
                        ? "bg-white dark:bg-[#252b33] shadow-xs text-amber-600 dark:text-amber-400 font-bold"
                        : "text-slate-600 dark:text-zinc-400"
                    }`}
                  >
                    Futuras ({contagensCategorias.futuras})
                  </button>
                </div>
              </div>

              {/* CARDS EXPLICÁVEIS DE DISCIPLINAS SUGERIDAS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {recomendacoesFiltradas.map((rec) => {
                  const jaSelecionado = selectedConceituais.includes(rec.titulo);
                  const isPrioritaria = rec.categoria === "prioritaria";
                  const isComplementar = rec.categoria === "complementar";

                  return (
                    <div
                      key={rec.topicId}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 text-xs ${
                        jaSelecionado
                          ? "bg-blue-500/10 dark:bg-amber-500/10 border-blue-500/50 dark:border-amber-500/40"
                          : "bg-slate-50 dark:bg-[#1e2329] border-slate-200 dark:border-amber-500/15"
                      }`}
                    >
                      <div className="space-y-2">
                        {/* HEADER DO CARD COM CATEGORIA E SCORE */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-serif-math font-bold text-sm text-slate-900 dark:text-[#f5f0df]">
                              {rec.titulo}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                              • {rec.categoriaOrigem}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isPrioritaria && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider">
                                Prioritária
                              </span>
                            )}
                            {isComplementar && (
                              <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold text-[10px] uppercase tracking-wider">
                                Complementar
                              </span>
                            )}
                            {rec.categoria === "futura" && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold text-[10px] uppercase tracking-wider">
                                Trilha Futura
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-mono text-[10px] font-bold">
                              {rec.score} pts
                            </span>
                          </div>
                        </div>

                        {/* DESCRIÇÃO RÁPIDA */}
                        {rec.descricao && (
                          <p className="text-[11px] text-slate-600 dark:text-zinc-400 font-sans leading-relaxed">
                            {rec.descricao}
                          </p>
                        )}

                        {/* MOTIVOS E JUSTIFICATIVAS PEDAGÓGICAS EXPLICÁVEIS */}
                        <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-[#161a1e]/80 border border-slate-200/60 dark:border-zinc-800 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-blue-600 dark:text-[#d9b452]" />
                            <span>Por que recomendamos:</span>
                          </span>
                          <ul className="space-y-1 text-[11px] text-slate-700 dark:text-zinc-300 font-sans">
                            {rec.motivos.map((motivo, idx) => (
                              <li key={idx} className="flex items-start gap-1.5 leading-snug">
                                <span className="text-blue-500 dark:text-amber-400 shrink-0 font-bold">›</span>
                                <span>{motivo}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* PRÉ-REQUISITOS PENDENTES (SE HOUVER) */}
                        {rec.preRequisitosPendentes.length > 0 && (
                          <div className="flex items-center gap-1.5 text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>Pré-requisitos conceituais recomendados: {rec.preRequisitosPendentes.map(getTopicLabel).join(", ")}</span>
                          </div>
                        )}
                      </div>

                      {/* RODAPÉ DO CARD COM STATUS DO ACERVO E BOTÃO DE ADICIONAR */}
                      <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-slate-200/50 dark:border-zinc-800">
                        <div>
                          {rec.disponivel ? (
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                              ✓ {rec.quantidadeQuestoes} questões ativas
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-500 font-medium">
                              Trilha teórica planejada
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleConceitoSelecionado(rec.titulo)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                            jaSelecionado
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:text-slate-950"
                              : "lemmas-gold-cta"
                          }`}
                        >
                          {jaSelecionado ? (
                            <>
                              <CheckCheck className="w-3.5 h-3.5" />
                              <span>No meu plano (Remover)</span>
                            </>
                          ) : (
                            <>
                              <span>+ Adicionar ao Plano</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* BANCAS RECOMENDADAS PELO MOTOR */}
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-blue-600 dark:text-amber-500" />
                  <span>Bancas e Exames Recomendados para o seu Objetivo</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {recomendacoesBancas.slice(0, 6).map((b) => {
                    const isSelected = selectedBancas.includes(b.label);
                    return (
                      <div
                        key={b.bancaId}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                          isSelected
                            ? "bg-blue-500/10 dark:bg-amber-500/15 border-blue-500 dark:border-[#d9b452] shadow-xs"
                            : "bg-slate-50 dark:bg-[#1e2329] border-slate-200 dark:border-amber-500/15"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-xs truncate text-slate-900 dark:text-[#f5f0df]">
                              {b.label}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 shrink-0 stroke-[3] text-blue-600 dark:text-amber-400" />}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-zinc-400 line-clamp-1">
                            {b.motivos[0] || b.categoriaOrigem}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-200/40 dark:border-zinc-800">
                          {b.disponivel ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                              ✓ {b.quantidadeQuestoes} q.
                            </span>
                          ) : (
                            <span className="text-zinc-500">Planejada</span>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleBancaSelecionada(b.label)}
                            className="text-[10px] font-bold text-blue-600 dark:text-[#d9b452] hover:underline cursor-pointer"
                          >
                            {isSelected ? "Remover" : "+ Adicionar"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ETAPA 4: AJUSTES AVANÇADOS & CATÁLOGO COMPLETO */}
            <div className="space-y-5 pt-4 border-t border-slate-100 dark:border-zinc-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-700 dark:bg-amber-500/20 dark:text-[#d9b452] flex items-center justify-center text-[11px] font-bold">4</span>
                    <span>Ajustes Avançados & Catálogo Amplo</span>
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Explore o acervo completo, selecione bancas específicas ou defina um foco customizado para a barra superior.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                    {selectedConceituais.length} disciplinas, {selectedBancas.length} bancas ativas
                  </span>
                  {(selectedConceituais.length > 0 || selectedBancas.length > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBancas([]);
                        setSelectedConceituais([]);
                      }}
                      className="text-[10px] text-rose-500 hover:underline font-semibold"
                    >
                      Limpar tudo
                    </button>
                  )}
                </div>
              </div>

              {/* FOCO PERSONALIZADO COM PREVIEW */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a2028] border border-slate-200/80 dark:border-amber-500/15 space-y-3">
                <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600 dark:text-[#d9b452]" />
                  <span>Foco Customizado ou Concurso Específico (Opcional):</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                  <input
                    type="text"
                    value={focoCustomizado}
                    onChange={(e) => setFocoCustomizado(e.target.value)}
                    placeholder="Ex: Concurso Professor SEEDUC, Perito PF, Mestrado PROFMAT..."
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#161a1e] border border-slate-200 dark:border-amber-500/15 text-xs text-slate-900 dark:text-[#f5f0df] focus:border-blue-500 dark:focus:border-amber-500 outline-none transition"
                  />
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#161a1e] border border-[var(--border-board)] flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                      Exibição na barra superior:
                    </span>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-[#1e2329] border border-slate-200 dark:border-amber-500/20 text-xs font-semibold text-slate-800 dark:text-[#dedbd0] max-w-[220px] truncate">
                      <Target className="w-3.5 h-3.5 text-blue-600 dark:text-[#d9b452] shrink-0" />
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400">Foco:</span>
                      <span className="truncate">{focoFinal}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 ABAS DO CATÁLOGO GERAL */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  <button
                    type="button"
                    onClick={() => setCatalogoVisualizacao("recomendadas")}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      catalogoVisualizacao === "recomendadas"
                        ? "lemmas-gold-cta font-bold shadow-xs"
                        : "bg-slate-100 dark:bg-[#1e2329] text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-amber-500/15"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Sugestões do Motor ({recomendacoesConceituais.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCatalogoVisualizacao("conceituais")}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      catalogoVisualizacao === "conceituais"
                        ? "lemmas-gold-cta font-bold shadow-xs"
                        : "bg-slate-100 dark:bg-[#1e2329] text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-amber-500/15"
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Disciplinas Conceituais ({TRILHAS_CONCEITUAIS_CATALOGO.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCatalogoVisualizacao("bancas")}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      catalogoVisualizacao === "bancas"
                        ? "lemmas-gold-cta font-bold shadow-xs"
                        : "bg-slate-100 dark:bg-[#1e2329] text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-amber-500/15"
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Bancas e Exames ({BANCAS_EXAMES_CATALOGO.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCatalogoVisualizacao("todas")}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      catalogoVisualizacao === "todas"
                        ? "lemmas-gold-cta font-bold shadow-xs"
                        : "bg-slate-100 dark:bg-[#1e2329] text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-amber-500/15"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Todas as Áreas</span>
                  </button>
                </div>

                {/* BUSCA RÁPIDA NO CATÁLOGO */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={buscaCatalogo}
                    onChange={(e) => setBuscaCatalogo(e.target.value)}
                    placeholder="Filtrar catálogo por disciplina, área ou banca..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-[#1e2329] border border-slate-200 dark:border-amber-500/15 text-xs text-slate-900 dark:text-[#f5f0df] outline-none focus:border-blue-500 dark:focus:border-amber-500"
                  />
                  {buscaCatalogo && (
                    <button
                      type="button"
                      onClick={() => setBuscaCatalogo("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* CONTEÚDO EXPANDIDO DO CATÁLOGO */}
                <div className="pt-2">
                  {(catalogoVisualizacao === "conceituais" || catalogoVisualizacao === "todas" || catalogoFiltradoBusca) && (
                    <div className="space-y-4">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-blue-600 dark:text-amber-500" />
                        <span>Disciplinas Conceituais ({catalogoFiltradoBusca ? catalogoFiltradoBusca.conceituais.length : TRILHAS_CONCEITUAIS_CATALOGO.length})</span>
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {(catalogoFiltradoBusca ? catalogoFiltradoBusca.conceituais : TRILHAS_CONCEITUAIS_CATALOGO).map((item) => {
                          const isSelected = selectedConceituais.includes(item.label);
                          return (
                            <button
                              type="button"
                              key={item.id}
                              onClick={() => toggleConceitoSelecionado(item.label)}
                              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                                isSelected
                                  ? "lemmas-gold-cta font-bold shadow-xs scale-[1.01]"
                                  : "bg-slate-50 dark:bg-[#1e2329] border-slate-200 dark:border-amber-500/15 hover:border-blue-500/35 dark:hover:border-amber-500/35"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-semibold text-xs truncate">{item.label}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 shrink-0 stroke-[3]" />}
                              </div>
                              <p className="text-[10px] text-slate-500 dark:text-zinc-400 line-clamp-2">
                                {item.descricao}
                              </p>
                              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-200/40 dark:border-zinc-800">
                                <span className="opacity-75">{item.categoriaOrigem}</span>
                                {item.disponivel ? (
                                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold">
                                    ✓ {item.contagemQuestoes} q.
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium">
                                    Trilha Teórica
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(catalogoVisualizacao === "bancas" || catalogoVisualizacao === "todas" || catalogoFiltradoBusca) && (
                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-zinc-800 mt-4">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-blue-600 dark:text-amber-500" />
                        <span>Bancas e Exames ({catalogoFiltradoBusca ? catalogoFiltradoBusca.bancas.length : BANCAS_EXAMES_CATALOGO.length})</span>
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {(catalogoFiltradoBusca ? catalogoFiltradoBusca.bancas : BANCAS_EXAMES_CATALOGO).map((item) => {
                          const isSelected = selectedBancas.includes(item.label);
                          return (
                            <button
                              type="button"
                              key={item.id}
                              onClick={() => toggleBancaSelecionada(item.label)}
                              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                                isSelected
                                  ? "lemmas-gold-cta font-bold shadow-xs scale-[1.01]"
                                  : "bg-slate-50 dark:bg-[#1e2329] border-slate-200 dark:border-amber-500/15 hover:border-blue-500/35 dark:hover:border-amber-500/35"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-semibold text-xs truncate">{item.label}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 shrink-0 stroke-[3]" />}
                              </div>
                              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-200/40 dark:border-zinc-800">
                                <span className="opacity-75">{item.categoriaOrigem}</span>
                                {item.disponivel ? (
                                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold">
                                    ✓ {item.contagemQuestoes} q.
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium">
                                    Planejada
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ETAPA 5: SUA ROTINA DE ESTUDOS & DISPONIBILIDADE REALISTA */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
              <div className="space-y-0.5">
                <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-700 dark:bg-amber-500/20 dark:text-[#d9b452] flex items-center justify-center text-[11px] font-bold">5</span>
                  <span>Sua Rotina de Estudos & Metas de Resolução</span>
                </label>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Calibre sua disponibilidade real de estudo diário e o ritmo de questões para calibrar suas revisões espaçadas.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 rounded-2xl bg-slate-50 dark:bg-[#1a2028] border border-slate-200/80 dark:border-amber-500/15">
                {/* 1. DISPONIBILIDADE DIÁRIA (MINUTOS) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-amber-500" />
                      <span>Tempo Disponível para Estudo:</span>
                    </span>
                    <span className="font-serif-math text-xs font-bold text-blue-600 dark:text-[#d9b452]">
                      {disponibilidadeMinutos} minutos/dia
                    </span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="180"
                    step="15"
                    value={disponibilidadeMinutos}
                    onChange={(e) => setDisponibilidadeMinutos(Number(e.target.value))}
                    className="w-full accent-blue-600 dark:accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 dark:text-zinc-500">
                    <span>15 min</span>
                    <span>45 min</span>
                    <span>90 min</span>
                    <span>3 horas</span>
                  </div>
                </div>

                {/* 2. META DE ATIVIDADES & TIPO */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                        Meta Diária:
                      </span>
                      <div className="flex items-center gap-1 bg-white dark:bg-[#161a1e] p-0.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setMetaTipo("questoes")}
                          className={`px-2 py-0.5 rounded-md font-bold transition ${
                            metaTipo === "questoes"
                              ? "bg-blue-600 text-white dark:bg-amber-500 dark:text-slate-950"
                              : "text-slate-500 dark:text-zinc-400"
                          }`}
                        >
                          Questões
                        </button>
                        <button
                          type="button"
                          onClick={() => setMetaTipo("sessoes")}
                          className={`px-2 py-0.5 rounded-md font-bold transition ${
                            metaTipo === "sessoes"
                              ? "bg-blue-600 text-white dark:bg-amber-500 dark:text-slate-950"
                              : "text-slate-500 dark:text-zinc-400"
                          }`}
                        >
                          Sessões
                        </button>
                      </div>
                    </div>
                    <span className="font-serif-math text-xs font-bold text-blue-600 dark:text-[#d9b452]">
                      {metaQuestoesDia} {metaTipo === "questoes" ? "questões/dia" : "sessões/dia"}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={metaQuestoesDia}
                    onChange={(e) => setMetaQuestoesDia(Number(e.target.value))}
                    className="w-full accent-blue-600 dark:accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 dark:text-zinc-500">
                    <span>5 / dia</span>
                    <span>15 / dia</span>
                    <span>30 / dia</span>
                    <span>50 / dia</span>
                  </div>
                </div>
              </div>

              {/* ESTIMATIVA REALISTA DA ROTINA */}
              <div className="p-3.5 rounded-xl bg-blue-500/5 dark:bg-amber-500/5 border border-blue-500/20 dark:border-amber-500/20 text-xs text-slate-700 dark:text-zinc-300 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 dark:text-amber-500 shrink-0 mt-0.5" />
                <p className="leading-relaxed font-sans">
                  Com <strong>{disponibilidadeMinutos} minutos diários</strong> e meta de <strong>{metaQuestoesDia} {metaTipo === "questoes" ? "questões" : "sessões"}</strong>, você terá em média <strong>{tempoMedioEstimado} minutos</strong> por atividade. Esse ritmo é ideal para explorar o raciocínio socrático com o tutor MathAI sem sobrecarga cognitiva.
                </p>
              </div>
            </div>

          </div>
        )}

        {activeTab === "academico" && (
          <div className="bg-white dark:bg-[#161a1e] border border-[var(--border-board)] rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
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
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1e2329] border border-slate-200 dark:border-amber-500/15 text-sm text-slate-900 dark:text-[#f5f0df] focus:border-blue-500 dark:focus:border-amber-500 outline-none transition"
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
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1e2329] border border-slate-200 dark:border-amber-500/15 text-sm text-slate-900 dark:text-[#f5f0df] focus:border-blue-500 dark:focus:border-amber-500 outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Nível de Escolaridade
                </label>
                <select
                  value={escolaridade}
                  onChange={(e) => setEscolaridade(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1e2329] border border-slate-200 dark:border-amber-500/15 text-sm text-slate-900 dark:text-[#f5f0df] focus:border-blue-500 dark:focus:border-amber-500 outline-none transition"
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
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1e2329] border border-slate-200 dark:border-amber-500/15 text-sm text-slate-900 dark:text-[#f5f0df] focus:border-blue-500 dark:focus:border-amber-500 outline-none transition"
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
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1e2329] border border-slate-200 dark:border-amber-500/15 text-sm text-slate-900 dark:text-[#f5f0df] focus:border-blue-500 dark:focus:border-amber-500 outline-none transition"
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
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1e2329]/60 border border-slate-200 dark:border-amber-500/10 text-sm text-slate-600 dark:text-zinc-400 cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "engine" && (
          <div className="bg-white dark:bg-[#161a1e] border border-[var(--border-board)] rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
            <div className="space-y-1">
              <h2 className="font-serif-math text-lg font-semibold text-slate-900 dark:text-[#f5f0df]">
                Calibração da MathAI Engine & Roteamento Axiomático
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Ajuste os parâmetros de avaliação passo a passo, OCR multimodal e telemetria socrática.
              </p>
            </div>

            <div className="space-y-4 text-xs text-slate-600 dark:text-zinc-300 leading-relaxed font-sans">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1e2329] border border-slate-200 dark:border-amber-500/15 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-[#f5f0df]">
                  <Sparkles className="w-4 h-4 text-blue-500 dark:text-amber-500" />
                  <span>Roteamento Multi-Modelo & Modulação Pedagógica</span>
                </div>
                <p>
                  O LEMMAS opera integrado à MathAI Engine sob o padrão Strategy desacoplado: todas as dicas socráticas adaptam suas instruções internas de acordo com a preferência pedagógica selecionada (<strong className="text-blue-600 dark:text-[#d9b452]">{pedagogicalPreference}</strong>), modulando desde a intuição geométrica até axiomas formais.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1e2329] border border-slate-200 dark:border-amber-500/15 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-[#f5f0df]">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Repetição Espaçada SuperMemo-2 (SM-2) Determinística</span>
                </div>
                <p>
                  Os ciclos de revisão espaçada são calculados deterministicamente no backend. Erros reduzem o intervalo para recalibração imediata, enquanto acertos consistentes expandem o horizonte de fixação na memória de longo prazo.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* BARRA DE AÇÕES INFERIOR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-2">
            <span>Sincronizado na nuvem (Supabase)</span>
            {salvo && (
              <span className="inline-flex items-center gap-1 text-emerald-500 font-bold animate-fadeIn">
                <CheckCircle2 className="w-4 h-4" /> Alterações salvas com sucesso!
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={logout}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair da Conta</span>
            </button>

            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl lemmas-gold-cta font-bold text-xs flex items-center justify-center gap-2 shadow-sm hover:scale-[1.02] transition-transform cursor-pointer"
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
