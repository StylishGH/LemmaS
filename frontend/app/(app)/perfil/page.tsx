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
  AlertTriangle
} from "lucide-react";
import { useUserProfile, getInitials, inferirMotivacoes } from "@/lib/use-user";

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
  {
    id: "fundamentos_logica_intuicao",
    titulo: "Fundamentos, Lógica e Intuição Matemática",
    icone: "🧠",
    subtitulo: "Aprender Matemática de verdade: reconstruindo fundamentos, aritmética, álgebra, geometria, funções, raciocínio dedutivo e demonstrações.",
  },
];

export interface CatalogoItem {
  id: string;
  label: string;
  tipo: "conceitual" | "banca";
  disponivel: boolean;
  contagemQuestoes?: number;
  categoriaOrigem: string;
  descricao?: string;
}

export const TRILHAS_CONCEITUAIS_CATALOGO: CatalogoItem[] = [
  // Disciplinas com questões reais no banco (12 Grandes Áreas Canônicas)
  { id: "geometria_plana", label: "Geometria Plana", tipo: "conceitual", disponivel: true, contagemQuestoes: 4685, categoriaOrigem: "Geometria", descricao: "Triângulos, círculos, semelhança, áreas, trigonometria euclidiana e teoremas clássicos." },
  { id: "probabilidade_combinatoria", label: "Probabilidade e Combinatória", tipo: "conceitual", disponivel: true, contagemQuestoes: 4281, categoriaOrigem: "Análise Combinatória", descricao: "Contagem, permutações, combinações, probabilidade condicional e variáveis discretas." },
  { id: "algebra", label: "Álgebra", tipo: "conceitual", disponivel: true, contagemQuestoes: 3702, categoriaOrigem: "Álgebra", descricao: "Produtos notáveis, fatoração, inequações, sistemas e propriedades operatórias." },
  { id: "teoria_dos_numeros", label: "Teoria dos Números", tipo: "conceitual", disponivel: true, contagemQuestoes: 3478, categoriaOrigem: "Aritmética & Números", descricao: "Divisibilidade, congruências modulares, primalidade, equações diofantinas e lemas axiomáticos." },
  { id: "polinomios_complexos", label: "Polinômios e Números Complexos", tipo: "conceitual", disponivel: true, contagemQuestoes: 1311, categoriaOrigem: "Álgebra Avançada", descricao: "Relações de Girard, raízes da unidade, forma trigonométrica e teorema fundamental da álgebra." },
  { id: "funcoes", label: "Funções", tipo: "conceitual", disponivel: true, contagemQuestoes: 981, categoriaOrigem: "Álgebra & Funções", descricao: "Função afim, quadrática, exponencial, logarítmica, modular, composta, inversa e equações funcionais." },
  { id: "trigonometria", label: "Trigonometria", tipo: "conceitual", disponivel: true, contagemQuestoes: 541, categoriaOrigem: "Funções e Trigonometria", descricao: "Identidades, transformações em produto, equações trigonométricas e leis dos senos e cossenos." },
  { id: "geometria_espacial", label: "Geometria Espacial", tipo: "conceitual", disponivel: true, contagemQuestoes: 460, categoriaOrigem: "Geometria", descricao: "Poliedros de Platão, prismas, pirâmides, cilindros, cones, esferas e troncos." },
  { id: "geometria_analitica", label: "Geometria Analítica", tipo: "conceitual", disponivel: true, contagemQuestoes: 418, categoriaOrigem: "Geometria", descricao: "Retas, cônicas (elipse, parábola, hipérbole), distâncias e lugares geométricos." },
  { id: "matematica_basica", label: "Matemática Básica & Aritmética", tipo: "conceitual", disponivel: true, contagemQuestoes: 300, categoriaOrigem: "Fundamentos", descricao: "Razões, proporções, frações, porcentagem, regra de três e operações fundamentais." },
  { id: "calculo", label: "Cálculo Diferencial e Integral", tipo: "conceitual", disponivel: true, contagemQuestoes: 246, categoriaOrigem: "Ensino Superior", descricao: "Limites, continuidade, derivadas, integrais definidas e aplicações analíticas." },
  { id: "algebra_linear", label: "Álgebra Linear", tipo: "conceitual", disponivel: true, contagemQuestoes: 167, categoriaOrigem: "Ensino Superior", descricao: "Espaços vetoriais, transformações lineares, matrizes, determinantes, autovalores e autovetores." },
  
  // Trilhas planejadas / conceituais (0 questões no banco)
  { id: "analise_real", label: "Análise Real & Fundamentos", tipo: "conceitual", disponivel: false, categoriaOrigem: "Ensino Superior", descricao: "Completude de R, sequências de Cauchy, topologia da reta e convergência uniforme (Trilha Teórica Planejada)." },
  { id: "equacoes_diferenciais", label: "Equações Diferenciais Ordinárias (EDO)", tipo: "conceitual", disponivel: false, categoriaOrigem: "Ensino Superior", descricao: "EDOs lineares de 1ª e 2ª ordem, fator integrante e transformada de Laplace (Trilha Teórica Planejada)." },
  { id: "otimizacao_gradiente", label: "Otimização & Gradiente Descendente", tipo: "conceitual", disponivel: false, categoriaOrigem: "Ciência de Dados & ML", descricao: "Funções convexas, multiplicadores de Lagrange e descida de gradiente (Trilha Teórica Planejada)." },
  { id: "estatistica_inferencial", label: "Estatística Descritiva & Inferencial", tipo: "conceitual", disponivel: false, categoriaOrigem: "Ciência de Dados & ML", descricao: "Distribuições contínuas, TCL, intervalos de confiança e testes de hipóteses (Trilha Teórica Planejada)." },
  { id: "modelagem_python_sql", label: "Modelagem Matemática com Python & SQL", tipo: "conceitual", disponivel: false, categoriaOrigem: "Ciência de Dados & ML", descricao: "Simulações numéricas, computação com NumPy e modelagem analítica (Trilha Teórica Planejada)." },
];

export const BANCAS_EXAMES_CATALOGO: CatalogoItem[] = [
  // Militares com acervo real
  { id: "ITA", label: "ITA (Engenharia Aeronáutica)", tipo: "banca", disponivel: true, contagemQuestoes: 328, categoriaOrigem: "Carreiras Militares" },
  { id: "EEAR", label: "EEAR (Especialistas de Aeronáutica)", tipo: "banca", disponivel: true, contagemQuestoes: 216, categoriaOrigem: "Carreiras Militares" },
  { id: "EsPCEx", label: "EsPCEx / AMAN (Oficiais do Exército)", tipo: "banca", disponivel: true, contagemQuestoes: 181, categoriaOrigem: "Carreiras Militares" },
  { id: "IME", label: "IME (Engenharia Militar)", tipo: "banca", disponivel: true, contagemQuestoes: 180, categoriaOrigem: "Carreiras Militares" },
  { id: "AFA", label: "AFA (Academia da Força Aérea)", tipo: "banca", disponivel: true, contagemQuestoes: 167, categoriaOrigem: "Carreiras Militares" },
  { id: "EPCAR", label: "EPCAR (Cadetes do Ar)", tipo: "banca", disponivel: true, contagemQuestoes: 144, categoriaOrigem: "Carreiras Militares" },
  { id: "Colegio_Naval", label: "Colégio Naval", tipo: "banca", disponivel: true, contagemQuestoes: 122, categoriaOrigem: "Carreiras Militares" },
  { id: "ESA", label: "ESA (Sargentos do Exército)", tipo: "banca", disponivel: true, contagemQuestoes: 117, categoriaOrigem: "Carreiras Militares" },
  { id: "Escola_Naval", label: "Escola Naval", tipo: "banca", disponivel: true, contagemQuestoes: 107, categoriaOrigem: "Carreiras Militares" },
  { id: "EFOMM", label: "EFOMM (Marinha Mercante)", tipo: "banca", disponivel: true, contagemQuestoes: 80, categoriaOrigem: "Carreiras Militares" },

  // Vestibulares com acervo real
  { id: "ENEM", label: "ENEM (Matriz de Referência TRI)", tipo: "banca", disponivel: true, contagemQuestoes: 263, categoriaOrigem: "ENEM & Vestibulares" },
  { id: "UNICAMP", label: "UNICAMP (Comvest)", tipo: "banca", disponivel: true, contagemQuestoes: 131, categoriaOrigem: "ENEM & Vestibulares" },
  { id: "FUVEST", label: "FUVEST (USP)", tipo: "banca", disponivel: true, contagemQuestoes: 99, categoriaOrigem: "ENEM & Vestibulares" },
  { id: "CEDERJ", label: "CEDERJ (Graduação CECIERJ)", tipo: "banca", disponivel: true, contagemQuestoes: 74, categoriaOrigem: "ENEM & Vestibulares" },

  // Olimpíadas de destaque com acervo real
  { id: "HMMT", label: "HMMT (Harvard-MIT Math Tournament)", tipo: "banca", disponivel: true, contagemQuestoes: 3221, categoriaOrigem: "Olimpíadas de Matemática" },
  { id: "IMO", label: "IMO (International Mathematical Olympiad)", tipo: "banca", disponivel: true, contagemQuestoes: 1924, categoriaOrigem: "Olimpíadas de Matemática" },
  { id: "OBM", label: "OBM (Olimpíada Brasileira de Matemática)", tipo: "banca", disponivel: true, contagemQuestoes: 998, categoriaOrigem: "Olimpíadas de Matemática" },
  { id: "Baltic_Way", label: "Baltic Way", tipo: "banca", disponivel: true, contagemQuestoes: 853, categoriaOrigem: "Olimpíadas de Matemática" },
  { id: "Olimpiada_Romena", label: "Olimpíada Romena de Matemática", tipo: "banca", disponivel: true, contagemQuestoes: 806, categoriaOrigem: "Olimpíadas de Matemática" },

  // Bancas e Exames Planejados (Sem questões cadastradas no momento)
  { id: "Receita_Federal", label: "Receita Federal (Auditor / Analista)", tipo: "banca", disponivel: false, categoriaOrigem: "Concursos Públicos & Fiscais" },
  { id: "Banco_do_Brasil_Caixa", label: "Banco do Brasil & Caixa Econômica", tipo: "banca", disponivel: false, categoriaOrigem: "Concursos Públicos & Fiscais" },
  { id: "PF_PRF", label: "Polícia Federal (Perito / Agente) & PRF", tipo: "banca", disponivel: false, categoriaOrigem: "Concursos Públicos & Fiscais" },
  { id: "IBGE", label: "IBGE (Analista em Estatística)", tipo: "banca", disponivel: false, categoriaOrigem: "Concursos Públicos & Fiscais" },
  { id: "Tribunais", label: "Tribunais (TRT / TRE / TJ / TRF)", tipo: "banca", disponivel: false, categoriaOrigem: "Concursos Públicos & Fiscais" },
  { id: "Carreiras_Fiscais", label: "Carreiras Fiscais Estaduais (SEFAZ / ICMS)", tipo: "banca", disponivel: false, categoriaOrigem: "Concursos Públicos & Fiscais" },
  { id: "Bancas_Civis_Gerais", label: "Bancas Civis Gerais (Cebraspe / FGV / Cesgranrio / FCC)", tipo: "banca", disponivel: false, categoriaOrigem: "Concursos Públicos & Fiscais" },
  { id: "PROFMAT", label: "PROFMAT (Mestrado Profissional)", tipo: "banca", disponivel: false, categoriaOrigem: "Ensino Superior & Docência" },
  { id: "Canguru", label: "Canguru de Matemática Brasil", tipo: "banca", disponivel: false, categoriaOrigem: "Olimpíadas de Matemática" },
];

export const MAPA_OBJETIVO_RECOMENDACOES: Record<string, { conceituais: string[]; bancas: string[] }> = {
  enem_vestibulares: {
    conceituais: ["funcoes", "geometria_plana", "algebra", "probabilidade_combinatoria", "matematica_basica", "trigonometria", "geometria_espacial"],
    bancas: ["ENEM", "FUVEST", "UNICAMP", "CEDERJ"],
  },
  concursos_publicos: {
    conceituais: ["matematica_basica", "funcoes", "probabilidade_combinatoria", "algebra", "estatistica_inferencial"],
    bancas: ["Bancas_Civis_Gerais", "Receita_Federal", "Banco_do_Brasil_Caixa", "IBGE", "Tribunais", "Carreiras_Fiscais"],
  },
  concursos_militares: {
    conceituais: ["funcoes", "algebra", "geometria_plana", "geometria_analitica", "geometria_espacial", "trigonometria", "polinomios_complexos", "probabilidade_combinatoria", "calculo"],
    bancas: ["ITA", "IME", "AFA", "EFOMM", "Escola_Naval", "EsPCEx", "Colegio_Naval", "EPCAR", "ESA", "EEAR"],
  },
  superior_docencia: {
    conceituais: ["funcoes", "calculo", "algebra_linear", "geometria_analitica", "teoria_dos_numeros", "polinomios_complexos", "analise_real", "equacoes_diferenciais"],
    bancas: ["CEDERJ", "ITA", "IME", "OBM", "PROFMAT"],
  },
  data_science_ml: {
    conceituais: ["algebra_linear", "probabilidade_combinatoria", "calculo", "funcoes", "otimizacao_gradiente", "estatistica_inferencial", "modelagem_python_sql"],
    bancas: ["CEDERJ", "ITA", "OBM"],
  },
  olimpiadas_mat: {
    conceituais: ["teoria_dos_numeros", "funcoes", "geometria_plana", "algebra", "polinomios_complexos", "probabilidade_combinatoria"],
    bancas: ["OBM", "IMO", "HMMT", "Baltic_Way", "Olimpiada_Romena", "Canguru"],
  },
  fundamentos_logica_intuicao: {
    conceituais: ["matematica_basica", "funcoes", "algebra", "geometria_plana", "teoria_dos_numeros"],
    bancas: ["ENEM", "OBM", "Colegio_Naval", "EPCAR"],
  },
};

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
  selectedBancas: string[],
  selectedConceituais: string[],
  motivacoesSelecionadas: string[]
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
  if (motivacoesSelecionadas.length > 0) {
    const primeiraTrilha = TRILHAS_MOTIVACOES.find((t) => t.id === motivacoesSelecionadas[0]);
    if (primeiraTrilha) return primeiraTrilha.titulo.split("&")[0].trim();
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
  const [metaQuestoesDia, setMetaQuestoesDia] = useState(profile.metaQuestoesDia || 10);
  
  // Seleção múltipla de objetivos declarados (com inferência heurística caso vazio)
  const [motivacoesSelecionadas, setMotivacoesSelecionadas] = useState<string[]>(
    profile.motivacoesSelecionadas?.length
      ? profile.motivacoesSelecionadas
      : inferirMotivacoes(profile.focoConcurso, [])
  );
  
  // Preferência pedagógica estrita
  const [pedagogicalPreference, setPedagogicalPreference] = useState<'conceitual' | 'rigor_formal' | 'aplicado_ml' | 'competitivo'>('conceitual');
  
  // Seleções persistidas de áreas e bancas
  const [selectedBancas, setSelectedBancas] = useState<string[]>(profile.concursosSelecionados || []);
  const [selectedConceituais, setSelectedConceituais] = useState<string[]>(profile.conceitosSelecionados || []);
  
  // Visualização ativa no catálogo (4 abas obrigatórias)
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
        
        const motivacoesAtivas =
          profile.motivacoesSelecionadas && profile.motivacoesSelecionadas.length > 0
            ? profile.motivacoesSelecionadas
            : inferirMotivacoes(profile.focoConcurso, []);
        setMotivacoesSelecionadas(motivacoesAtivas);
        setSelectedBancas(profile.concursosSelecionados || []);
        setSelectedConceituais(profile.conceitosSelecionados || []);
        
        const pref = profile.pedagogicalPreference as 'conceitual' | 'rigor_formal' | 'aplicado_ml' | 'competitivo';
        if (['conceitual', 'rigor_formal', 'aplicado_ml', 'competitivo'].includes(pref)) {
          setPedagogicalPreference(pref);
        } else {
          setPedagogicalPreference('conceitual');
        }
      }
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

  // Toggle de objetivos (Passo 1)
  const toggleMotivacao = (id: string) => {
    if (motivacoesSelecionadas.includes(id)) {
      setMotivacoesSelecionadas(motivacoesSelecionadas.filter((x) => x !== id));
    } else {
      setMotivacoesSelecionadas([...motivacoesSelecionadas, id]);
    }
  };

  // Toggle de Bancas (Passo 2)
  const toggleBanca = (itemLabel: string) => {
    if (selectedBancas.includes(itemLabel)) {
      setSelectedBancas(selectedBancas.filter((x) => x !== itemLabel));
    } else {
      setSelectedBancas([...selectedBancas, itemLabel]);
    }
  };

  // Toggle de Trilhas Conceituais (Passo 2)
  const toggleConceito = (itemLabel: string) => {
    if (selectedConceituais.includes(itemLabel)) {
      setSelectedConceituais(selectedConceituais.filter((x) => x !== itemLabel));
    } else {
      setSelectedConceituais([...selectedConceituais, itemLabel]);
    }
  };

  // União reativa das recomendações dos objetivos ativos (sem duplicatas)
  const recommendedItems = useMemo(() => {
    const concSet = new Set<string>();
    const bancaSet = new Set<string>();

    for (const objId of motivacoesSelecionadas) {
      const mapeamento = MAPA_OBJETIVO_RECOMENDACOES[objId];
      if (mapeamento) {
        mapeamento.conceituais.forEach((id) => concSet.add(id));
        mapeamento.bancas.forEach((id) => bancaSet.add(id));
      }
    }

    const conceituais = TRILHAS_CONCEITUAIS_CATALOGO.filter((c) => concSet.has(c.id));
    const bancas = BANCAS_EXAMES_CATALOGO.filter((b) => bancaSet.has(b.id));

    return {
      conceituais,
      bancas,
      total: conceituais.length + bancas.length,
    };
  }, [motivacoesSelecionadas]);

  const focoFinal = useMemo(() => {
    return calcularFocoSugerido(focoCustomizado, selectedBancas, selectedConceituais, motivacoesSelecionadas);
  }, [focoCustomizado, selectedBancas, selectedConceituais, motivacoesSelecionadas]);

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
      concursosSelecionados: selectedBancas,
      conceitosSelecionados: selectedConceituais,
      motivacoesSelecionadas,
      focoConcurso: focoFinal,
      pedagogicalPreference,
    });
    setSalvo(true);
    setTimeout(() => setSalvo(false), 3000);
  };

  const userInitials = getInitials(nome);

  // Filtragem para busca global no catálogo
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

  if (loading) {
    return (
      <div className="max-w-xl mx-auto py-24 text-center space-y-4 animate-pulse text-slate-800 dark:text-[#f5f0df]">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/25 dark:bg-amber-500/10 dark:border-amber-500/25 flex items-center justify-center mx-auto shadow-sm">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-[#d9b452]" />
        </div>
        <p className="text-xs text-slate-500 dark:text-zinc-400 font-sans">
          Sincronizando perfil e preferências com a nuvem...
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
      <div className="relative rounded-3xl overflow-hidden border border border-[var(--border-board)] bg-white dark:bg-[#161a1e] p-6 md:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            
            {/* AVATAR COM FOTO E BOTÃO DE CÂMERA INTEGRADO */}
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

              {/* BOTÃO DA CÂMERA VISÍVEL NO CANTO INFERIOR DIREITO */}
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
          <span>Objetivos & Catálogo de Estudo</span>
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

      {/* 3. CONTEÚDO DAS ABAS */}
      <form onSubmit={handleSalvar} className="space-y-6">
        {activeTab === "concursos" && (
          <div className="bg-white dark:bg-[#161a1e] border border border-[var(--border-board)] rounded-2xl p-6 md:p-8 space-y-8 shadow-sm">
            <div className="space-y-1">
              <h2 className="font-serif-math text-xl font-semibold text-slate-900 dark:text-[#f5f0df]">
                Objetivos de Estudo & Personalização do Repertório
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Personalize sua jornada matemática: selecione seus objetivos, defina o modo de tutoria do MathAI e escolha suas áreas de foco no catálogo real do LEMMAS.
              </p>
            </div>

            {/* PASSO 1: MOTIVAÇÃO PRINCIPAL NO LEMMAS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-700 dark:bg-amber-500/20 dark:text-[#d9b452] flex items-center justify-center text-[11px] font-bold">1</span>
                  <span>Quais são os seus objetivos principais?</span>
                </label>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                  {motivacoesSelecionadas.length} objetivo(s) ativo(s)
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
                          ? "bg-blue-500/10 dark:bg-amber-500/15 border-blue-500 dark:border-[#d9b452] shadow-xs"
                          : "bg-slate-50 dark:bg-[#1e2329] border-slate-200 dark:border-amber-500/15 hover:border-blue-500/35 dark:hover:border-amber-500/35"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-[#f5f0df]">
                          <span className="text-lg">{trilha.icone}</span>
                          <span className="text-xs font-bold">{trilha.titulo}</span>
                        </div>
                        <div className={`w-4 h-4 rounded-md border shrink-0 flex items-center justify-center transition-colors ${
                          isSelected ? "bg-blue-600 border-blue-600 text-white dark:bg-amber-500 dark:border-amber-500 dark:text-slate-950 font-bold" : "border-slate-300 dark:border-zinc-700"
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

            {/* PASSO 2: PREFERÊNCIA PEDAGÓGICA DO TUTOR MATHAI */}
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-700 dark:bg-amber-500/20 dark:text-[#d9b452] flex items-center justify-center text-[11px] font-bold">2</span>
                  <span>Como você prefere que o Tutor IA (MathAI) ensine?</span>
                </label>
                <span className="text-[11px] text-blue-600 dark:text-[#d9b452] font-semibold">
                  Modo: {pedagogicalPreference}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    id: "conceitual" as const,
                    titulo: "Conceitual & Intuitivo",
                    icone: "💡",
                    descricao: "Começa pela intuição geométrica e numérica, exemplos pertinentes e explicação do porquê antes de formalizar.",
                  },
                  {
                    id: "rigor_formal" as const,
                    titulo: "Rigor Formal & Axiomas",
                    icone: "📐",
                    descricao: "Identifica com precisão definições, hipóteses, lemas axiomáticos e demonstrações formais passo a passo.",
                  },
                  {
                    id: "aplicado_ml" as const,
                    titulo: "Aplicado a Dados & ML",
                    icone: "📊",
                    descricao: "Conecta os conceitos a matrizes, espaços vetoriais, otimização, gradientes e Machine Learning prático.",
                  },
                  {
                    id: "competitivo" as const,
                    titulo: "Competitivo & Eficiente",
                    icone: "⚡",
                    descricao: "Destaca observações decisivas ('pulo do gato'), padrões de bancas, atalhos de prova e eliminação rápida.",
                  },
                ].map((modo) => {
                  const isSelected = pedagogicalPreference === modo.id;
                  return (
                    <div
                      key={modo.id}
                      onClick={() => setPedagogicalPreference(modo.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-2 text-xs select-none ${
                        isSelected
                          ? "bg-blue-500/10 dark:bg-amber-500/15 border-blue-500 dark:border-[#d9b452] shadow-xs"
                          : "bg-slate-50 dark:bg-[#1e2329] border-slate-200 dark:border-amber-500/15 hover:border-blue-500/35 dark:hover:border-amber-500/35"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-[#f5f0df]">
                          <span className="text-base">{modo.icone}</span>
                          <span className="text-xs font-bold">{modo.titulo}</span>
                        </div>
                        <div className={`w-4 h-4 rounded-md border shrink-0 flex items-center justify-center transition-colors ${
                          isSelected ? "bg-blue-600 border-blue-600 text-white dark:bg-amber-500 dark:border-amber-500 dark:text-slate-950 font-bold" : "border-slate-300 dark:border-zinc-700"
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed font-sans">
                        {modo.descricao}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PASSO 3: CATÁLOGO ORGANIZADO (4 VISUALIZAÇÕES DISTINTAS) */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-700 dark:bg-amber-500/20 dark:text-[#d9b452] flex items-center justify-center text-[11px] font-bold">3</span>
                  <span>Catálogo de Áreas, Disciplinas e Exames:</span>
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                    {selectedConceituais.length + selectedBancas.length} selecionado(s) ({selectedConceituais.length} disciplinas, {selectedBancas.length} bancas)
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
                      Limpar seleções
                    </button>
                  )}
                </div>
              </div>

              {/* 4 ABAS OBRIGATÓRIAS DO CATÁLOGO */}
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
                  <span>Recomendadas para mim ({recommendedItems.total})</span>
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
                  <span>Trilhas Conceituais ({TRILHAS_CONCEITUAIS_CATALOGO.length})</span>
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
                  placeholder="Filtrar matérias, tópicos ou bancas no catálogo..."
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

              {/* CONTEÚDO DAS 4 VISUALIZAÇÕES DO CATÁLOGO */}
              <div className="space-y-5 pt-2">
                {/* 1. ABA RECOMENDADAS PARA MIM */}
                {catalogoVisualizacao === "recomendadas" && !catalogoFiltradoBusca && (
                  <div className="space-y-4">
                    {motivacoesSelecionadas.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-blue-500/5 dark:bg-amber-500/5 border border-blue-500/20 dark:border-amber-500/20 text-center space-y-2">
                        <Info className="w-6 h-6 text-blue-500 dark:text-amber-500 mx-auto" />
                        <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                          Nenhum objetivo ativo no Passo 1.
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                          Selecione um ou mais objetivos principais para que o LEMMAS calcule a união das áreas relevantes para você.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                            <Compass className="w-3.5 h-3.5 text-blue-600 dark:text-amber-500" />
                            <span>Disciplinas e Trilhas Conceituais Recomendadas ({recommendedItems.conceituais.length})</span>
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            {recommendedItems.conceituais.map((item) => {
                              const isSelected = selectedConceituais.includes(item.label);
                              return (
                                <button
                                  type="button"
                                  key={item.id}
                                  onClick={() => toggleConceito(item.label)}
                                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                                    isSelected
                                      ? "lemmas-gold-cta font-bold shadow-xs scale-[1.01]"
                                      : "bg-slate-50 dark:bg-[#1e2329] border-slate-200 dark:border-amber-500/15 hover:border-blue-500/35 dark:hover:border-amber-500/35"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-semibold text-xs truncate">{item.label}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0 stroke-[3]" />}
                                  </div>
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="opacity-75">{item.categoriaOrigem}</span>
                                    {item.disponivel ? (
                                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold">
                                        ✓ {item.contagemQuestoes} q.
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded-md bg-zinc-500/10 text-zinc-500 font-medium">
                                        Planejada
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-blue-600 dark:text-amber-500" />
                            <span>Bancas, Provas e Exames Recomendados ({recommendedItems.bancas.length})</span>
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            {recommendedItems.bancas.map((item) => {
                              const isSelected = selectedBancas.includes(item.label);
                              return (
                                <button
                                  type="button"
                                  key={item.id}
                                  onClick={() => toggleBanca(item.label)}
                                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                                    isSelected
                                      ? "lemmas-gold-cta font-bold shadow-xs scale-[1.01]"
                                      : "bg-slate-50 dark:bg-[#1e2329] border-slate-200 dark:border-amber-500/15 hover:border-blue-500/35 dark:hover:border-amber-500/35"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-semibold text-xs truncate">{item.label}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0 stroke-[3]" />}
                                  </div>
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="opacity-75">{item.categoriaOrigem}</span>
                                    {item.disponivel ? (
                                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold">
                                        ✓ {item.contagemQuestoes} q.
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                                        Planejada
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 2. ABA TRILHAS CONCEITUAIS */}
                {catalogoVisualizacao === "conceituais" && !catalogoFiltradoBusca && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Trilhas com Questões Ativas no Banco ({TRILHAS_CONCEITUAIS_CATALOGO.filter((c) => c.disponivel).length})</span>
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {TRILHAS_CONCEITUAIS_CATALOGO.filter((c) => c.disponivel).map((item) => {
                          const isSelected = selectedConceituais.includes(item.label);
                          return (
                            <button
                              type="button"
                              key={item.id}
                              onClick={() => toggleConceito(item.label)}
                              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
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
                                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold">
                                  ✓ {item.contagemQuestoes} questões
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-[#d9b452] flex items-center gap-1.5">
                        <Binary className="w-3.5 h-3.5" />
                        <span>Trilhas Conceituais em Planejamento ({TRILHAS_CONCEITUAIS_CATALOGO.filter((c) => !c.disponivel).length})</span>
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {TRILHAS_CONCEITUAIS_CATALOGO.filter((c) => !c.disponivel).map((item) => {
                          const isSelected = selectedConceituais.includes(item.label);
                          return (
                            <button
                              type="button"
                              key={item.id}
                              onClick={() => toggleConceito(item.label)}
                              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 opacity-90 ${
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
                                <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium">
                                  Trilha Teórica
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. ABA BANCAS E EXAMES */}
                {catalogoVisualizacao === "bancas" && !catalogoFiltradoBusca && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Bancas e Exames com Questões no Acervo ({BANCAS_EXAMES_CATALOGO.filter((b) => b.disponivel).length})</span>
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {BANCAS_EXAMES_CATALOGO.filter((b) => b.disponivel).map((item) => {
                          const isSelected = selectedBancas.includes(item.label);
                          return (
                            <button
                              type="button"
                              key={item.id}
                              onClick={() => toggleBanca(item.label)}
                              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                                isSelected
                                  ? "lemmas-gold-cta font-bold shadow-xs scale-[1.01]"
                                  : "bg-slate-50 dark:bg-[#1e2329] border-slate-200 dark:border-amber-500/15 hover:border-blue-500/35 dark:hover:border-amber-500/35"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-semibold text-xs truncate">{item.label}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 shrink-0 stroke-[3]" />}
                              </div>
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="opacity-75">{item.categoriaOrigem}</span>
                                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold">
                                  ✓ {item.contagemQuestoes} questões
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-[#d9b452] flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5" />
                        <span>Exames e Processos Seletivos em Planejamento ({BANCAS_EXAMES_CATALOGO.filter((b) => !b.disponivel).length})</span>
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {BANCAS_EXAMES_CATALOGO.filter((b) => !b.disponivel).map((item) => {
                          const isSelected = selectedBancas.includes(item.label);
                          return (
                            <button
                              type="button"
                              key={item.id}
                              onClick={() => toggleBanca(item.label)}
                              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 opacity-90 ${
                                isSelected
                                  ? "lemmas-gold-cta font-bold shadow-xs scale-[1.01]"
                                  : "bg-slate-50 dark:bg-[#1e2329] border-slate-200 dark:border-amber-500/15 hover:border-blue-500/35 dark:hover:border-amber-500/35"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-semibold text-xs truncate">{item.label}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 shrink-0 stroke-[3]" />}
                              </div>
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="opacity-75">{item.categoriaOrigem}</span>
                                <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium">
                                  Acervo Planejado
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. ABA TODAS AS ÁREAS / OU RESULTADOS DE BUSCA */}
                {(catalogoVisualizacao === "todas" || catalogoFiltradoBusca) && (
                  <div className="space-y-6">
                    {/* DISCIPLINAS */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-blue-500 dark:text-amber-500" />
                        <span>Conhecimentos Matemáticos & Disciplinas ({catalogoFiltradoBusca ? catalogoFiltradoBusca.conceituais.length : TRILHAS_CONCEITUAIS_CATALOGO.length})</span>
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {(catalogoFiltradoBusca ? catalogoFiltradoBusca.conceituais : TRILHAS_CONCEITUAIS_CATALOGO).map((item) => {
                          const isSelected = selectedConceituais.includes(item.label);
                          return (
                            <button
                              type="button"
                              key={item.id}
                              onClick={() => toggleConceito(item.label)}
                              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                                isSelected
                                  ? "lemmas-gold-cta font-bold shadow-xs scale-[1.01]"
                                  : "bg-slate-50 dark:bg-[#1e2329] border-slate-200 dark:border-amber-500/15 hover:border-blue-500/35 dark:hover:border-amber-500/35"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-semibold text-xs truncate">{item.label}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 shrink-0 stroke-[3]" />}
                              </div>
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="opacity-75">{item.categoriaOrigem}</span>
                                {item.disponivel ? (
                                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold">
                                    ✓ {item.contagemQuestoes} q.
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded-md bg-zinc-500/10 text-zinc-500 font-medium">
                                    Planejada
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* BANCAS */}
                    <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-blue-500 dark:text-amber-500" />
                        <span>Instituições, Bancas & Exames ({catalogoFiltradoBusca ? catalogoFiltradoBusca.bancas.length : BANCAS_EXAMES_CATALOGO.length})</span>
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {(catalogoFiltradoBusca ? catalogoFiltradoBusca.bancas : BANCAS_EXAMES_CATALOGO).map((item) => {
                          const isSelected = selectedBancas.includes(item.label);
                          return (
                            <button
                              type="button"
                              key={item.id}
                              onClick={() => toggleBanca(item.label)}
                              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                                isSelected
                                  ? "lemmas-gold-cta font-bold shadow-xs scale-[1.01]"
                                  : "bg-slate-50 dark:bg-[#1e2329] border-slate-200 dark:border-amber-500/15 hover:border-blue-500/35 dark:hover:border-amber-500/35"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-semibold text-xs truncate">{item.label}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 shrink-0 stroke-[3]" />}
                              </div>
                              <div className="flex items-center justify-between text-[10px]">
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
                  </div>
                )}
              </div>
            </div>

            {/* PASSO 4: FOCO PERSONALIZADO & PREVIEW EM TEMPO REAL */}
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
              <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/15 dark:bg-amber-500/20 text-blue-600 dark:text-[#d9b452] flex items-center justify-center text-[11px] font-bold">4</span>
                <span>Foco Customizado ou Concurso Específico (Opcional):</span>
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <input
                  type="text"
                  value={focoCustomizado}
                  onChange={(e) => setFocoCustomizado(e.target.value)}
                  placeholder="Ex: Concurso Professor SEEDUC, Perito PF, PROFMAT..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1e2329] border border-slate-200 dark:border-amber-500/15 text-sm text-slate-900 dark:text-[#f5f0df] focus:border-blue-500 dark:focus:border-amber-500 outline-none transition"
                />

                {/* PREVIEW DO BADGE NA NAVBAR */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1e2329]/80 border border border-[var(--border-board)] flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-zinc-400 font-medium text-[11px]">
                    Exibição na barra superior:
                  </span>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-[#1e2329] border border-slate-200 dark:border-amber-500/20 text-xs font-semibold text-slate-800 dark:text-[#dedbd0] max-w-[200px] truncate">
                    <Target className="w-3.5 h-3.5 text-blue-600 dark:text-[#d9b452] shrink-0" />
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400">Foco:</span>
                    <span className="truncate">{focoFinal}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* PASSO 5: META DIÁRIA */}
            <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500/15 dark:bg-amber-500/20 text-blue-600 dark:text-[#d9b452] flex items-center justify-center text-[11px] font-bold">5</span>
                  <span>Meta Diária de Resolução de Lemas:</span>
                </label>
                <span className="font-serif-math text-sm font-bold text-blue-600 dark:text-[#d9b452]">
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
                className="w-full accent-blue-600 dark:accent-amber-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-sans">
                Aproximadamente {metaQuestoesDia * 3} minutos diários de dedicação recomendados para consolidação de repertório.
              </p>
            </div>
          </div>
        )}

        {activeTab === "academico" && (
          <div className="bg-white dark:bg-[#161a1e] border border border-[var(--border-board)] rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
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
          <div className="bg-white dark:bg-[#161a1e] border border border-[var(--border-board)] rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
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
