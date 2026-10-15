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
  Upload,
  BookOpen,
  Layers,
  HelpCircle,
  X
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

export interface TrilhaMotivacao {
  id: string;
  titulo: string;
  icone: string;
  subtitulo: string;
}

export const TRILHAS_MOTIVACOES: TrilhaMotivacao[] = [
  {
    id: "enem_vestibulares",
    titulo: "ENEM & Vestibulares Tradicionais",
    icone: "🎓",
    subtitulo: "Matemática do Ensino Médio, resolução ágil por TRI, Fuvest, Unicamp e vestibulares estaduais.",
  },
  {
    id: "concursos_publicos",
    titulo: "Concursos Públicos & Carreiras de Estado",
    icone: "🏛️",
    subtitulo: "Raciocínio Lógico-Matemático, Matemática Financeira e Estatística (Receita, Bancos, Tribunais, PF/PRF).",
  },
  {
    id: "concursos_militares",
    titulo: "Carreiras Militares de Alto Desempenho",
    icone: "🎖️",
    subtitulo: "Trilhas de Oficiais e Sargentos com alto rigor em matemática e física (ESA, EsPCEx, IME, ITA, AFA, EFOMM).",
  },
  {
    id: "superior_docencia",
    titulo: "Ensino Superior & Docência em Matemática",
    icone: "📐",
    subtitulo: "Rigor axiomático, demonstrações, Cálculo Diferencial/Integral, Álgebra Linear e didática pedagógica.",
  },
  {
    id: "data_science_ml",
    titulo: "Transição para Ciência de Dados & ML",
    icone: "📊",
    subtitulo: "A matemática prática por trás dos modelos preditivos: álgebra matricial, probabilidade e inferência estatística.",
  },
  {
    id: "olimpiadas_mat",
    titulo: "Olimpíadas de Matemática",
    icone: "🏆",
    subtitulo: "Problemas não-convencionais, criatividade algébrica e geometria avançada (OBMEP, OBM, Canguru).",
  },
];

export interface CategoriaFoco {
  id: string;
  categoria: string;
  icone: string;
  itens: string[];
}

export const CATEGORIAS_FOCO: CategoriaFoco[] = [
  {
    id: "enem_vestibulares",
    categoria: "ENEM & Vestibulares",
    icone: "🎓",
    itens: [
      "ENEM (Matriz de Habilidades / TRI)",
      "FUVEST (USP)",
      "UNICAMP (Comvest)",
      "UERJ (Exame Estadual)",
      "UNESP (Vunesp)",
      "CEDERJ (Fundação CECIERJ)",
      "ITA / IME (Fase Vestibular Civil)",
      "Vestibulares Federais (UFMG, UFPR, UFRGS)",
    ],
  },
  {
    id: "concursos_publicos",
    categoria: "Concursos Públicos & Fiscais",
    icone: "🏛️",
    itens: [
      "Receita Federal (Auditor-Fiscal / Analista)",
      "Banco do Brasil / Caixa Econômica Federal",
      "Polícia Federal (Perito Criminal / Agente) & PRF",
      "IBGE (Analista / Pesquisador em Estatística)",
      "Tribunais (TRT / TRE / TJ / TRF)",
      "Carreiras Fiscais Estaduais (SEFAZ / ICMS)",
      "Bancas Civis Gerais (Cebraspe / FGV / Cesgranrio / FCC)",
    ],
  },
  {
    id: "concursos_militares",
    categoria: "Carreiras Militares",
    icone: "🎖️",
    itens: [
      "ESA (Sargentos do Exército)",
      "EsPCEx / AMAN (Oficiais do Exército)",
      "IME (Engenharia Militar)",
      "ITA (Engenharia Aeronáutica)",
      "AFA (Academia da Força Aérea)",
      "EFOMM (Oficiais da Marinha Mercante)",
      "Escola Naval (EN)",
      "EEAR (Especialistas de Aeronáutica)",
      "Colégio Naval / EPCAR",
    ],
  },
  {
    id: "superior_docencia",
    categoria: "Ensino Superior & Docência",
    icone: "📐",
    itens: [
      "Cálculo Diferencial e Integral (I, II, III)",
      "Álgebra Linear e Geometria Analítica",
      "Análise Real e Teoria dos Números",
      "Equações Diferenciais Ordinárias (EDO)",
      "Matemática Discreta e Combinatória Avançada",
      "Docência e Prática Pedagógica em Matemática",
      "PROFMAT (Mestrado Profissional)",
    ],
  },
  {
    id: "data_science_ml",
    categoria: "Ciência de Dados & ML",
    icone: "📊",
    itens: [
      "Estatística Descritiva, Inferencial e Testes de Hipótese",
      "Probabilidade Aplicada e Processos Estocásticos",
      "Álgebra Linear Computacional e Decomposição de Matrizes",
      "Otimização Matemática e Gradiente Descendente",
      "Modelagem Matemática com Python e SQL",
    ],
  },
  {
    id: "olimpiadas_mat",
    categoria: "Olimpíadas de Matemática",
    icone: "🏆",
    itens: [
      "OBMEP (Nível 3 e Nível Universitário)",
      "OBM (Olimpíada Brasileira de Matemática)",
      "Canguru de Matemática Brasil",
      "Olimpíadas Regionais & Universitárias",
    ],
  },
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
            height = maxSize;
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
  concursosSelecionados: string[],
  motivacoesSelecionadas: string[]
): string {
  if (customFoco && customFoco.trim()) {
    return customFoco.trim();
  }
  if (concursosSelecionados.length > 0) {
    const formatItem = (item: string) => {
      const parts = item.split("(");
      return parts[0].trim();
    };
    return concursosSelecionados.slice(0, 2).map(formatItem).join(" / ");
  }
  if (motivacoesSelecionadas.length > 0) {
    const primeiraTrilha = TRILHAS_MOTIVACOES.find((t) => t.id === motivacoesSelecionadas[0]);
    if (primeiraTrilha) return primeiraTrilha.titulo.split("&")[0].trim();
  }
  return "Matemática Geral";
}

export default function PerfilPage() {
  const { profile, loading, saveProfile, logout } = useUserProfile();
  const [activeTab, setActiveTab] = useState<"academico" | "concursos" | "engine">("academico");
  
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
  const [metaQuestoesDia, setMetaQuestoesDia] = useState(profile.metaQuestoesDia || 10);
  const [concursosSelecionados, setConcursosSelecionados] = useState<string[]>(profile.concursosSelecionados || []);
  const [motivacoesSelecionadas, setMotivacoesSelecionadas] = useState<string[]>(profile.motivacoesSelecionadas || []);
  const [focoCustomizado, setFocoCustomizado] = useState<string>("");
  const [categoriaFocoAtiva, setCategoriaFocoAtiva] = useState<string>("todas");
  
  const [salvo, setSalvo] = useState(false);

  // Fonte de verdade visual do avatar (preview imediato ou foto do perfil em cache/nuvem)
  const currentFoto = previewUrl || profile.fotoUrl;

  useEffect(() => {
    setImgError(false);
  }, [profile.fotoUrl, previewUrl]);

  useEffect(() => {
    if (!loading) {
      setNome(profile.nome);
      setEmail(profile.email);
      setEscolaridade(profile.escolaridade);
      setFaculdade(profile.faculdade);
      setSemestre(profile.semestre);
      setMetaQuestoesDia(profile.metaQuestoesDia || 10);
      setConcursosSelecionados(profile.concursosSelecionados || []);
      setMotivacoesSelecionadas(profile.motivacoesSelecionadas || []);
    }
  }, [loading, profile]);

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
      // Ajusta dinamicamente a categoria de bancas visível para a motivação clicada
      setCategoriaFocoAtiva(id);
    }
  };

  const focoFinal = useMemo(() => {
    return calcularFocoSugerido(focoCustomizado, concursosSelecionados, motivacoesSelecionadas);
  }, [focoCustomizado, concursosSelecionados, motivacoesSelecionadas]);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveProfile({
      nome,
      email,
      fotoUrl: currentFoto,
      escolaridade,
      faculdade,
      semestre,
      metaQuestoesDia,
      concursosSelecionados,
      motivacoesSelecionadas,
      focoConcurso: focoFinal,
    });
    setSalvo(true);
    setTimeout(() => setSalvo(false), 3000);
  };

  const userInitials = getInitials(nome);

  // Lista filtrada de itens de foco para a categoria selecionada
  const itensExibidos = useMemo(() => {
    if (categoriaFocoAtiva === "todas") {
      return CATEGORIAS_FOCO.flatMap((c) => c.itens.map((item) => ({ item, catNome: c.categoria, catId: c.id })));
    }
    const cat = CATEGORIAS_FOCO.find((c) => c.id === categoriaFocoAtiva);
    if (!cat) return [];
    return cat.itens.map((item) => ({ item, catNome: cat.categoria, catId: cat.id }));
  }, [categoriaFocoAtiva]);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto py-24 text-center space-y-4 animate-pulse text-slate-800 dark:text-[#f5f0df]">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center mx-auto shadow-sm">
          <Loader2 className="w-6 h-6 animate-spin text-amber-600 dark:text-[#d9b452]" />
        </div>
        <p className="text-xs text-slate-500 dark:text-zinc-400 font-sans">
          Sincronizando perfil com a nuvem...
        </p>
      </div>
    );
  }

  if (profile.isGuest) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 animate-fadeIn text-center space-y-6 text-slate-800 dark:text-[#f5f0df]">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-[#d9b452] flex items-center justify-center mx-auto shadow-sm">
          <User className="w-8 h-8" />
        </div>
        <div className="space-y-3">
          <h1 className="font-serif-math text-3xl font-bold tracking-tight">
            Perfil de Estudante
          </h1>
          <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed font-sans max-w-md mx-auto">
            Você não está conectado a nenhuma conta. Para personalizar suas metas diárias, configurar seu foco de concurso e sincronizar seu histórico na nuvem, entre na sua conta ou crie uma gratuitamente.
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
            className="w-full sm:w-auto px-6 py-3 rounded-xl border border-amber-500/40 hover:bg-amber-500/10 text-slate-800 dark:text-[#f5f0df] font-semibold text-xs flex items-center justify-center gap-2 transition"
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
      <div className="relative rounded-3xl overflow-hidden border border-slate-200/80 dark:border-amber-500/20 bg-white dark:bg-[#141222] p-6 md:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            
            {/* AVATAR COM FOTO E BOTÃO DE CÂMERA INTEGRADO */}
            <div className="relative group shrink-0">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-700 p-0.5 shadow-md overflow-hidden relative cursor-pointer group-hover:scale-[1.02] transition-transform"
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
                  <div className="w-full h-full rounded-[14px] bg-[#0e0d16] flex items-center justify-center text-[#d9b452] font-black text-2xl tracking-wider font-serif-math">
                    {userInitials}
                  </div>
                )}
                {salvandoFoto && (
                  <div className="absolute inset-0 bg-black/60 rounded-[14px] flex items-center justify-center z-20">
                    <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-1 rounded-[14px]">
                  <Camera className="w-4 h-4 text-amber-400" />
                  <span>Trocar</span>
                </div>
              </div>

              {/* BOTÃO DA CÂMERA VISÍVEL NO CANTO INFERIOR DIREITO */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={salvandoFoto}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg border-2 border-white dark:border-[#141222] transition-transform hover:scale-110 cursor-pointer z-10"
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
                {escolaridade || "Ensino Superior"} • {faculdade || "Universidade"}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500 dark:text-zinc-500">
                <span>{email || "Sem e-mail cadastrado"}</span>
                <span>•</span>
                <span className="font-mono text-amber-600 dark:text-[#d9b452] font-semibold">
                  ID #{profile.isGuest ? "VISITANTE" : (profile.id || "LEMMAS-STUDENT")}
                </span>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={salvandoFoto}
                  className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-[#d9b452] hover:underline cursor-pointer"
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
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs font-bold text-amber-700 dark:text-[#d9b452]">
              <Flame className="w-4 h-4 fill-amber-500" />
              <span>{profile.streakDias} {profile.streakDias === 1 ? "dia consecutivo" : "dias consecutivos"}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 dark:bg-[#1b172e] border border-amber-500/20 text-xs font-bold text-amber-700 dark:text-[#dedbd0]">
              <Target className="w-4 h-4 text-amber-500" />
              <span>Foco: {profile.focoConcurso || "Matemática Geral"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. NAVEGAÇÃO POR ABAS */}
      <div className="flex border-b border-slate-200 dark:border-amber-500/20 gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("academico")}
          className={`pb-3 px-4 text-xs md:text-sm font-semibold transition-all relative flex items-center gap-2 shrink-0 ${
            activeTab === "academico"
              ? "text-amber-600 dark:text-[#d9b452] border-b-2 border-amber-500 dark:border-[#d9b452] font-bold"
              : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-[#f5f0df]"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Formação & Dados Acadêmicos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("concursos")}
          className={`pb-3 px-4 text-xs md:text-sm font-semibold transition-all relative flex items-center gap-2 shrink-0 ${
            activeTab === "concursos"
              ? "text-amber-600 dark:text-[#d9b452] border-b-2 border-amber-500 dark:border-[#d9b452] font-bold"
              : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-[#f5f0df]"
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Objetivos & Metas de Estudo</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("engine")}
          className={`pb-3 px-4 text-xs md:text-sm font-semibold transition-all relative flex items-center gap-2 shrink-0 ${
            activeTab === "engine"
              ? "text-amber-600 dark:text-[#d9b452] border-b-2 border-amber-500 dark:border-[#d9b452] font-bold"
              : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-[#f5f0df]"
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>LEMMAS Core & MathAI</span>
        </button>

        <Link
          href="/perfil/faturamento"
          className="pb-3 px-4 text-xs md:text-sm font-semibold transition-all relative flex items-center gap-2 text-slate-500 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-[#d9b452] ml-auto sm:ml-0 shrink-0"
        >
          <CreditCard className="w-4 h-4 text-amber-500" />
          <span>Dados Fiscais & Faturamento</span>
        </Link>
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
          <div className="bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 rounded-2xl p-6 md:p-8 space-y-8 shadow-sm">
            <div className="space-y-1">
              <h2 className="font-serif-math text-xl font-semibold text-slate-900 dark:text-[#f5f0df]">
                Objetivos de Estudo & Personalização do Repertório
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                <span className="font-semibold text-slate-700 dark:text-zinc-300">Domínio progressivo de lemas e padrões de prova por repetição espaçada.</span> Selecione suas motivações e bancas para ajustarmos os simulados, ciclos SM-2 e recomendações de lemas.
              </p>
            </div>

            {/* PASSO 1: MOTIVAÇÃO PRINCIPAL NO LEMMAS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 dark:text-[#d9b452] flex items-center justify-center text-[11px] font-bold">1</span>
                  <span>Qual é o seu objetivo principal no LEMMAS?</span>
                </label>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                  (Selecione uma ou mais trilhas)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {TRILHAS_MOTIVACOES.map((trilha) => {
                  const isSelected = motivacoesSelecionadas.includes(trilha.id);
                  return (
                    <div
                      key={trilha.id}
                      onClick={() => toggleMotivacao(trilha.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-2.5 text-xs select-none ${
                        isSelected
                          ? "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500 dark:border-[#d9b452] shadow-xs"
                          : "bg-slate-50 dark:bg-[#18152a] border-slate-200 dark:border-amber-500/15 hover:border-amber-500/35"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-[#f5f0df]">
                          <span className="text-lg">{trilha.icone}</span>
                          <span className="text-xs font-bold">{trilha.titulo}</span>
                        </div>
                        <div className={`w-4 h-4 rounded-md border shrink-0 flex items-center justify-center transition-colors ${
                          isSelected ? "bg-amber-500 border-amber-500 text-slate-950 font-bold" : "border-slate-300 dark:border-zinc-700"
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed font-sans">
                        {trilha.subtitulo}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PASSO 2: BANCAS, PROVAS E FOCOS ESPECÍFICOS */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 dark:text-[#d9b452] flex items-center justify-center text-[11px] font-bold">2</span>
                  <span>Bancas, Provas & Áreas de Foco Específicas:</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                    {concursosSelecionados.length} selecionado(s)
                  </span>
                  {concursosSelecionados.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setConcursosSelecionados([])}
                      className="text-[10px] text-rose-500 hover:underline font-semibold"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              {/* BARRA DE FILTRO POR CATEGORIA (ABAS) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                <button
                  type="button"
                  onClick={() => setCategoriaFocoAtiva("todas")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    categoriaFocoAtiva === "todas"
                      ? "lemmas-gold-cta font-bold shadow-xs"
                      : "bg-slate-100 dark:bg-[#18152a] text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-amber-500/15"
                  }`}
                >
                  ✨ Todas as Áreas
                </button>
                {CATEGORIAS_FOCO.map((cat) => {
                  const isActive = categoriaFocoAtiva === cat.id;
                  const countNaCat = cat.itens.filter((i) => concursosSelecionados.includes(i)).length;
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => setCategoriaFocoAtiva(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        isActive
                          ? "lemmas-gold-cta font-bold shadow-xs"
                          : "bg-slate-100 dark:bg-[#18152a] text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-amber-500/15 hover:border-amber-500/30"
                      }`}
                    >
                      <span>{cat.icone}</span>
                      <span>{cat.categoria}</span>
                      {countNaCat > 0 && (
                        <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold">
                          {countNaCat}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* CHIPS DE PROVAS E DISCIPLINAS */}
              <div className="flex flex-wrap gap-2 pt-1">
                {itensExibidos.map(({ item, catNome }) => {
                  const isSelected = concursosSelecionados.includes(item);
                  return (
                    <button
                      type="button"
                      key={item}
                      onClick={() => toggleConcurso(item)}
                      title={`Categoria: ${catNome}`}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs transition-all ${
                        isSelected
                          ? "lemmas-gold-cta font-bold shadow-sm scale-[1.01]"
                          : "bg-slate-100 dark:bg-[#18152a] text-slate-700 dark:text-zinc-300 border border-slate-200/90 dark:border-amber-500/15 hover:border-amber-500/35"
                      }`}
                    >
                      {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
                      <span>{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PASSO 3: FOCO PERSONALIZADO & PREVIEW EM TEMPO REAL */}
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
              <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 dark:text-[#d9b452] flex items-center justify-center text-[11px] font-bold">3</span>
                <span>Foco Customizado ou Concurso Específico (Opcional):</span>
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <input
                  type="text"
                  value={focoCustomizado}
                  onChange={(e) => setFocoCustomizado(e.target.value)}
                  placeholder="Ex: Concurso Professor SEEDUC, Perito PF, PROFMAT..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#18152a] border border-slate-200 dark:border-amber-500/15 text-sm text-slate-900 dark:text-[#f5f0df] focus:border-amber-500 outline-none transition"
                />

                {/* PREVIEW DO BADGE NA NAVBAR */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#18152a]/80 border border-slate-200/80 dark:border-amber-500/20 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-zinc-400 font-medium text-[11px]">
                    Exibição na barra superior:
                  </span>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-[#1a172c] border border-slate-200 dark:border-amber-500/20 text-xs font-semibold text-slate-800 dark:text-[#dedbd0] max-w-[200px] truncate">
                    <Target className="w-3.5 h-3.5 text-amber-600 dark:text-[#d9b452] shrink-0" />
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400">Foco:</span>
                    <span className="truncate">{focoFinal}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* PASSO 4: META DIÁRIA */}
            <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 dark:text-[#d9b452] flex items-center justify-center text-[11px] font-bold">4</span>
                  <span>Meta Diária de Resolução de Lemas:</span>
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
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-sans">
                Aproximadamente {metaQuestoesDia * 3} minutos diários de dedicação recomendados para consolidação de repertório.
              </p>
            </div>
          </div>
        )}

        {activeTab === "engine" && (
          <div className="bg-white dark:bg-[#141222] border border-slate-200/80 dark:border-amber-500/15 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
            <div className="space-y-1">
              <h2 className="font-serif-math text-lg font-semibold text-slate-900 dark:text-[#f5f0df]">
                Calibração da MathAI Engine & Roteamento Axiomático
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Ajuste os parâmetros de avaliação passo a passo, OCR multimodal e telemetria socrática.
              </p>
            </div>

            <div className="space-y-4 text-xs text-slate-600 dark:text-zinc-300 leading-relaxed font-sans">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#18152a] border border-slate-200 dark:border-amber-500/15 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-[#f5f0df]">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Roteamento Multi-Modelo Ativo</span>
                </div>
                <p>
                  O LEMMAS utiliza roteamento adaptativo: modelos ultraleves para validações de gabarito e checagens socráticas instantâneas, complementados por inferência axiomática profunda para deduções e lemas fundamentais.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#18152a] border border-slate-200 dark:border-amber-500/15 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-[#f5f0df]">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Repetição Espaçada SuperMemo-2 (SM-2) Determinística</span>
                </div>
                <p>
                  Os ciclos de revisão espaçada são calculados deterministamente no backend. Erros reduzem o intervalo para recalibração imediata, enquanto acertos consistentes expandem o horizonte de fixação na memória de longo prazo.
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
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair da Conta</span>
            </button>

            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl lemmas-gold-cta font-bold text-xs flex items-center justify-center gap-2 shadow-sm hover:scale-[1.02] transition-transform"
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
