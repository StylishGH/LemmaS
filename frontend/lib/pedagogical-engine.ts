/**
 * LemmaS Pedagogical Recommendation Engine V1
 *
 * Motor determinístico, auditável e explicável de recomendação pedagógica.
 * Baseado em:
 * 1. Relevância para o Objetivo Principal do estudante.
 * 2. Relevância para os Objetivos Secundários complementares.
 * 3. Grafo Direcionado Acíclico (DAG) de Pré-Requisitos Matemáticos.
 * 4. Disponibilidade efetiva de questões no acervo (vs. trilhas teóricas planejadas).
 * 5. Histórico e evidências de desempenho (quando disponíveis, sem inferir domínio zero por ausência).
 *
 * Mandamento Epistêmico:
 * DADO OBSERVADO ≠ INTERPRETAÇÃO DA IA ≠ DADO VALIDADO
 */

export interface CatalogoItem {
  id: string;
  label: string;
  tipo: "conceitual" | "banca";
  disponivel: boolean;
  contagemQuestoes?: number;
  categoriaOrigem: string;
  descricao?: string;
}

export interface RecomendacaoPedagogica {
  topicId: string;
  titulo: string;
  score: number;
  categoria: "prioritaria" | "complementar" | "futura";
  motivos: string[];
  preRequisitosPendentes: string[];
  disponivel: boolean;
  quantidadeQuestoes: number | null;
  categoriaOrigem: string;
  descricao?: string;
}

export interface RecomendacaoBanca {
  bancaId: string;
  label: string;
  score: number;
  categoria: "prioritaria" | "complementar" | "futura";
  motivos: string[];
  disponivel: boolean;
  quantidadeQuestoes: number | null;
  categoriaOrigem: string;
}

export interface PerfilRecomendacaoInput {
  objetivoPrincipal?: string | null;
  objetivosSecundarios?: string[];
  conteudosSelecionados?: string[];
  desempenhoTopicos?: Record<string, { total: number; acertos: number }>;
}

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
    subtitulo: "Aprender Matemática de verdade: reconstruindo fundamentos, aritmética, álgebra, geometria, funções e demonstrações.",
  },
];

/**
 * Catálogo Canônico de Disciplinas Conceituais do LemmaS.
 * Diferencia rigorosamente trilhas com acervo ativo daquelas planejadas/teóricas.
 */
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

  // Trilhas planejadas / conceituais teóricas (sem questões cadastradas no momento)
  { id: "analise_real", label: "Análise Real & Fundamentos", tipo: "conceitual", disponivel: false, contagemQuestoes: 0, categoriaOrigem: "Ensino Superior", descricao: "Completude de R, sequências de Cauchy, topologia da reta e convergência uniforme (Trilha Teórica Planejada)." },
  { id: "equacoes_diferenciais", label: "Equações Diferenciais Ordinárias (EDO)", tipo: "conceitual", disponivel: false, contagemQuestoes: 0, categoriaOrigem: "Ensino Superior", descricao: "EDOs lineares de 1ª e 2ª ordem, fator integrante e transformada de Laplace (Trilha Teórica Planejada)." },
  { id: "otimizacao_gradiente", label: "Otimização & Gradiente Descendente", tipo: "conceitual", disponivel: false, contagemQuestoes: 0, categoriaOrigem: "Ciência de Dados & ML", descricao: "Funções convexas, multiplicadores de Lagrange e descida de gradiente (Trilha Teórica Planejada)." },
  { id: "estatistica_inferencial", label: "Estatística Descritiva & Inferencial", tipo: "conceitual", disponivel: false, contagemQuestoes: 0, categoriaOrigem: "Ciência de Dados & ML", descricao: "Distribuições contínuas, TCL, intervalos de confiança e testes de hipóteses (Trilha Teórica Planejada)." },
  { id: "modelagem_python_sql", label: "Modelagem Matemática com Python & SQL", tipo: "conceitual", disponivel: false, contagemQuestoes: 0, categoriaOrigem: "Ciência de Dados & ML", descricao: "Simulações numéricas, computação com NumPy e modelagem analítica (Trilha Teórica Planejada)." },
];

/**
 * Catálogo de Bancas e Exames do LemmaS.
 */
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
  { id: "Receita_Federal", label: "Receita Federal (Auditor / Analista)", tipo: "banca", disponivel: false, contagemQuestoes: 0, categoriaOrigem: "Concursos Públicos & Fiscais" },
  { id: "Banco_do_Brasil_Caixa", label: "Banco do Brasil & Caixa Econômica", tipo: "banca", disponivel: false, contagemQuestoes: 0, categoriaOrigem: "Concursos Públicos & Fiscais" },
  { id: "PF_PRF", label: "Polícia Federal (Perito / Agente) & PRF", tipo: "banca", disponivel: false, contagemQuestoes: 0, categoriaOrigem: "Concursos Públicos & Fiscais" },
  { id: "IBGE", label: "IBGE (Analista em Estatística)", tipo: "banca", disponivel: false, contagemQuestoes: 0, categoriaOrigem: "Concursos Públicos & Fiscais" },
  { id: "Tribunais", label: "Tribunais (TRT / TRE / TJ / TRF)", tipo: "banca", disponivel: false, contagemQuestoes: 0, categoriaOrigem: "Concursos Públicos & Fiscais" },
  { id: "Carreiras_Fiscais", label: "Carreiras Fiscais Estaduais (SEFAZ / ICMS)", tipo: "banca", disponivel: false, contagemQuestoes: 0, categoriaOrigem: "Concursos Públicos & Fiscais" },
  { id: "Bancas_Civis_Gerais", label: "Bancas Civis Gerais (Cebraspe / FGV / Cesgranrio / FCC)", tipo: "banca", disponivel: false, contagemQuestoes: 0, categoriaOrigem: "Concursos Públicos & Fiscais" },
  { id: "PROFMAT", label: "PROFMAT (Mestrado Profissional)", tipo: "banca", disponivel: false, contagemQuestoes: 0, categoriaOrigem: "Ensino Superior & Docência" },
  { id: "Canguru", label: "Canguru de Matemática Brasil", tipo: "banca", disponivel: false, contagemQuestoes: 0, categoriaOrigem: "Olimpíadas de Matemática" },
];

/**
 * Grafo Direcionado Acíclico (DAG) de Pré-Requisitos Matemáticos.
 * Mapeia cada tópico aos seus pré-requisitos pedagógicos validados.
 */
export const GRAFO_PRE_REQUISITOS: Record<string, string[]> = {
  matematica_basica: [],
  algebra: ["matematica_basica"],
  geometria_plana: ["matematica_basica"],
  teoria_dos_numeros: ["matematica_basica"],
  funcoes: ["algebra"],
  polinomios_complexos: ["algebra"],
  geometria_espacial: ["geometria_plana"],
  trigonometria: ["geometria_plana", "funcoes"],
  geometria_analitica: ["algebra", "geometria_plana"],
  probabilidade_combinatoria: ["matematica_basica", "algebra"],
  calculo: ["funcoes", "trigonometria"],
  algebra_linear: ["algebra", "geometria_analitica"],
  analise_real: ["calculo"],
  equacoes_diferenciais: ["calculo", "algebra_linear"],
  otimizacao_gradiente: ["calculo", "algebra_linear"],
  estatistica_inferencial: ["probabilidade_combinatoria"],
  modelagem_python_sql: ["algebra_linear", "estatistica_inferencial"],
};

/**
 * Mapeamento Pedagógico Estruturado: Objetivos -> Tópicos Essenciais e Complementares.
 * Permite distinguir disciplinas nucleares daquelas secundárias para cada perfil.
 */
export const PRIORIDADES_OBJETIVOS: Record<
  string,
  {
    essenciais: string[];
    complementares: string[];
    bancasEssenciais: string[];
    bancasComplementares: string[];
    justificativaBase: string;
  }
> = {
  enem_vestibulares: {
    essenciais: ["funcoes", "geometria_plana", "algebra", "probabilidade_combinatoria", "matematica_basica"],
    complementares: ["trigonometria", "geometria_espacial", "geometria_analitica"],
    bancasEssenciais: ["ENEM", "FUVEST", "UNICAMP"],
    bancasComplementares: ["CEDERJ"],
    justificativaBase: "Priorizada pela Matriz de Referência TRI e cobrança recorrente em vestibulares estaduais de alto rendimento.",
  },
  concursos_publicos: {
    essenciais: ["matematica_basica", "probabilidade_combinatoria", "algebra"],
    complementares: ["funcoes", "estatistica_inferencial"],
    bancasEssenciais: ["Bancas_Civis_Gerais", "Receita_Federal", "Banco_do_Brasil_Caixa"],
    bancasComplementares: ["IBGE", "Tribunais", "Carreiras_Fiscais"],
    justificativaBase: "Essencial para raciocínio lógico-quantitativo e resolução de questões de bancas de concursos públicos.",
  },
  concursos_militares: {
    essenciais: ["geometria_plana", "trigonometria", "algebra", "funcoes", "geometria_analitica", "polinomios_complexos", "calculo"],
    complementares: ["geometria_espacial", "probabilidade_combinatoria", "teoria_dos_numeros"],
    bancasEssenciais: ["ITA", "IME", "AFA", "EFOMM", "Escola_Naval", "EsPCEx"],
    bancasComplementares: ["Colegio_Naval", "EPCAR", "ESA", "EEAR"],
    justificativaBase: "Exigida com alto rigor algébrico e conceitual em bancas de oficiais e sargentos militares.",
  },
  superior_docencia: {
    essenciais: ["calculo", "algebra_linear", "funcoes", "teoria_dos_numeros", "analise_real"],
    complementares: ["geometria_analitica", "polinomios_complexos", "equacoes_diferenciais"],
    bancasEssenciais: ["CEDERJ", "ITA", "IME", "PROFMAT"],
    bancasComplementares: ["OBM"],
    justificativaBase: "Fundamental para formação universitária axiomática, demonstrações formais e docência em Matemática.",
  },
  data_science_ml: {
    essenciais: ["algebra_linear", "probabilidade_combinatoria", "calculo", "otimizacao_gradiente"],
    complementares: ["funcoes", "estatistica_inferencial", "modelagem_python_sql"],
    bancasEssenciais: ["CEDERJ", "ITA", "OBM"],
    bancasComplementares: ["HMMT"],
    justificativaBase: "Núcleo matemático fundamental para algoritmos preditivos, matrizes, descida de gradiente e Machine Learning.",
  },
  olimpiadas_mat: {
    essenciais: ["teoria_dos_numeros", "geometria_plana", "algebra", "probabilidade_combinatoria"],
    complementares: ["funcoes", "polinomios_complexos"],
    bancasEssenciais: ["OBM", "IMO", "HMMT"],
    bancasComplementares: ["Baltic_Way", "Olimpiada_Romena", "Canguru"],
    justificativaBase: "Pilar em competições matemáticas de alta resolução e criatividade dedutiva.",
  },
  fundamentos_logica_intuicao: {
    essenciais: ["matematica_basica", "algebra", "geometria_plana"],
    complementares: ["funcoes", "teoria_dos_numeros"],
    bancasEssenciais: ["ENEM", "OBM"],
    bancasComplementares: ["Colegio_Naval", "EPCAR"],
    justificativaBase: "Base necessária para reconstrução estrutural de raciocínio lógico e intuição matemática.",
  },
};

/**
 * Obtém o rótulo legível de um tópico a partir de seu ID.
 */
export function getTopicLabel(topicId: string): string {
  const item = TRILHAS_CONCEITUAIS_CATALOGO.find((c) => c.id === topicId);
  return item ? item.label : topicId;
}

/**
 * Obtém o título legível de um objetivo a partir de seu ID.
 */
export function getObjectiveLabel(objectiveId: string): string {
  const obj = TRILHAS_MOTIVACOES.find((m) => m.id === objectiveId);
  return obj ? obj.titulo : objectiveId;
}

/**
 * Gera explicação pedagógica textual em linguagem natural para uma disciplina.
 */
function gerarExplicacaoDisciplina(
  topicId: string,
  topicLabel: string,
  primaryObj: string | null,
  secondaryObjs: string[],
  isEssentialPrimary: boolean,
  isCompPrimary: boolean,
  isEssentialSec: boolean,
  isCompSec: boolean,
  preReqsPendentes: string[],
  disponivel: boolean,
  quantidadeQuestoes: number | null,
  erroTaxa?: number | null
): string[] {
  const motivos: string[] = [];

  if (primaryObj) {
    const nomePrim = getObjectiveLabel(primaryObj);
    if (isEssentialPrimary) {
      motivos.push(`${topicLabel} é disciplina prioritária e estruturante para o seu objetivo principal (${nomePrim}).`);
    } else if (isCompPrimary) {
      motivos.push(`Atua como conhecimento complementar relevante para ${nomePrim}.`);
    }
  }

  if (secondaryObjs.length > 0 && (isEssentialSec || isCompSec)) {
    const nomesSec = secondaryObjs
      .filter((s) => {
        const p = PRIORIDADES_OBJETIVOS[s];
        return p && (p.essenciais.includes(topicId) || p.complementares.includes(topicId));
      })
      .map(getObjectiveLabel)
      .join(", ");
    if (nomesSec) {
      motivos.push(`Reforça seus objetivos secundários de estudo: ${nomesSec}.`);
    }
  }

  if (preReqsPendentes.length > 0) {
    const nomesPre = preReqsPendentes.map(getTopicLabel).join(", ");
    motivos.push(`Possui pré-requisitos conceituais recomendados para estudo prévio ou paralelo: ${nomesPre}.`);
  }

  if (!disponivel || (quantidadeQuestoes ?? 0) === 0) {
    motivos.push("Trilha teórica planejada no catálogo: foco conceitual sem questões ativas no momento.");
  } else if ((quantidadeQuestoes ?? 0) > 0) {
    motivos.push(`Acervo disponível com ${quantidadeQuestoes} questões e lemas para prática imediata.`);
  }

  if (erroTaxa !== undefined && erroTaxa !== null && erroTaxa >= 0.4) {
    motivos.push(`Identificada necessidade de reforço com base no seu histórico recente de resolução (${Math.round(erroTaxa * 100)}% de taxa de erro).`);
  }

  if (motivos.length === 0) {
    motivos.push(`Tópico relevante para consolidação e formação matemática ampla.`);
  }

  return motivos;
}

/**
 * Calcula recomendações pedagógicas determinísticas e explicáveis de disciplinas conceituais.
 * Fórmula: S(t) = w1 * G_prim(t) + w2 * G_sec(t) + w3 * P(t) + w4 * A(t) + w5 * D(t)
 */
export function calcularRecomendacoesConceituais(
  input: PerfilRecomendacaoInput
): RecomendacaoPedagogica[] {
  const { objetivoPrincipal, objetivosSecundarios = [], conteudosSelecionados = [], desempenhoTopicos = {} } = input;

  const selecionadosSet = new Set(conteudosSelecionados);

  return TRILHAS_CONCEITUAIS_CATALOGO.map((item) => {
    const topicId = item.id;
    let score = 0;

    // 1. Relevância para Objetivo Principal (G_prim: até 45 pontos)
    let isEssentialPrimary = false;
    let isCompPrimary = false;
    if (objetivoPrincipal && PRIORIDADES_OBJETIVOS[objetivoPrincipal]) {
      const mapa = PRIORIDADES_OBJETIVOS[objetivoPrincipal];
      if (mapa.essenciais.includes(topicId)) {
        score += 45;
        isEssentialPrimary = true;
      } else if (mapa.complementares.includes(topicId)) {
        score += 25;
        isCompPrimary = true;
      }
    }

    // 2. Relevância para Objetivos Secundários (G_sec: até 20 pontos)
    let isEssentialSec = false;
    let isCompSec = false;
    for (const secId of objetivosSecundarios) {
      const mapa = PRIORIDADES_OBJETIVOS[secId];
      if (mapa) {
        if (mapa.essenciais.includes(topicId)) {
          score += 15;
          isEssentialSec = true;
          break;
        } else if (mapa.complementares.includes(topicId)) {
          score += 8;
          isCompSec = true;
        }
      }
    }

    // 3. Grafo de Pré-Requisitos Matemáticos (P: até 15 pontos)
    const preReqs = GRAFO_PRE_REQUISITOS[topicId] || [];
    const preReqsPendentes = preReqs.filter((reqId) => {
      const reqItem = TRILHAS_CONCEITUAIS_CATALOGO.find((c) => c.id === reqId);
      const reqLabel = reqItem ? reqItem.label : reqId;
      // Considerado cumprido se já foi selecionado pelo estudante ou se tem tentativas bem-sucedidas
      const jaSelecionou = selecionadosSet.has(reqId) || selecionadosSet.has(reqLabel);
      const hist = desempenhoTopicos[reqId] || desempenhoTopicos[reqLabel];
      const temDominio = hist && hist.total >= 3 && hist.acertos / hist.total >= 0.6;
      return !jaSelecionou && !temDominio;
    });

    if (preReqs.length === 0) {
      score += 15; // Tópico de base/fundamento imediato
    } else if (preReqsPendentes.length === 0) {
      score += 15; // Todos os pré-requisitos cumpridos
    } else if (preReqsPendentes.length === 1) {
      score += 8; // Um pré-requisito pendente
    } else {
      score += 2; // Múltiplos pré-requisitos pendentes
    }

    // 4. Disponibilidade de Atividades (A: até 10 pontos)
    const isDisponivel = item.disponivel && (item.contagemQuestoes ?? 0) > 0;
    if (isDisponivel) {
      score += 10;
    } else {
      score += 0; // Trilha planejada / sem questões
    }

    // 5. Desempenho Observado (D: até 10 pontos de reforço quando há dados empíricos)
    let erroTaxa: number | null = null;
    const hist = desempenhoTopicos[topicId] || desempenhoTopicos[item.label];
    if (hist && hist.total >= 3) {
      erroTaxa = 1 - hist.acertos / hist.total;
      if (erroTaxa >= 0.4) {
        score += 10; // Necessidade de reforço pedagogicamente diagnosticada
      } else {
        score += 4;
      }
    }
    // IMPORTANTE: Se hist for nulo/ausente, score não é penalizado nem bonificado.

    // 6. Categorização Pedagógica Explicável
    let categoria: "prioritaria" | "complementar" | "futura";
    if (!item.disponivel || preReqsPendentes.length >= 2 || score < 35) {
      categoria = "futura";
    } else if (isEssentialPrimary || score >= 60) {
      categoria = "prioritaria";
    } else {
      categoria = "complementar";
    }

    // 7. Geração de Motivos Explicáveis
    const motivos = gerarExplicacaoDisciplina(
      topicId,
      item.label,
      objetivoPrincipal || null,
      objetivosSecundarios,
      isEssentialPrimary,
      isCompPrimary,
      isEssentialSec,
      isCompSec,
      preReqsPendentes,
      item.disponivel,
      item.contagemQuestoes ?? null,
      erroTaxa
    );

    return {
      topicId,
      titulo: item.label,
      score: Math.min(100, Math.round(score)),
      categoria,
      motivos,
      preRequisitosPendentes: preReqsPendentes,
      disponivel: item.disponivel,
      quantidadeQuestoes: item.contagemQuestoes ?? null,
      categoriaOrigem: item.categoriaOrigem,
      descricao: item.descricao,
    };
  }).sort((a, b) => {
    // Ordenação pedagógica: 1º prioritárias, 2º complementares, 3º futuras; desempate por score
    const rankCategoria: Record<string, number> = { prioritaria: 3, complementar: 2, futura: 1 };
    if (rankCategoria[a.categoria] !== rankCategoria[b.categoria]) {
      return rankCategoria[b.categoria] - rankCategoria[a.categoria];
    }
    return b.score - a.score;
  });
}


/**
 * Calcula recomendações pedagógicas determinísticas e explicáveis de Bancas e Exames.
 */
export function calcularRecomendacoesBancas(
  input: PerfilRecomendacaoInput
): RecomendacaoBanca[] {
  const { objetivoPrincipal, objetivosSecundarios = [] } = input;

  return BANCAS_EXAMES_CATALOGO.map((item) => {
    const bancaId = item.id;
    let score = 0;
    const motivos: string[] = [];

    // Relevância para objetivo principal
    let isPrim = false;
    if (objetivoPrincipal && PRIORIDADES_OBJETIVOS[objetivoPrincipal]) {
      const mapa = PRIORIDADES_OBJETIVOS[objetivoPrincipal];
      if (mapa.bancasEssenciais.includes(bancaId)) {
        score += 55;
        isPrim = true;
        motivos.push(`Banca central para o seu objetivo principal (${getObjectiveLabel(objetivoPrincipal)}).`);
      } else if (mapa.bancasComplementares.includes(bancaId)) {
        score += 30;
        isPrim = true;
        motivos.push(`Exame complementar relevante para ${getObjectiveLabel(objetivoPrincipal)}.`);
      }
    }

    // Relevância para objetivos secundários
    for (const secId of objetivosSecundarios) {
      const mapa = PRIORIDADES_OBJETIVOS[secId];
      if (mapa) {
        if (mapa.bancasEssenciais.includes(bancaId)) {
          score += 25;
          motivos.push(`Alinhado ao seu interesse secundário em ${getObjectiveLabel(secId)}.`);
          break;
        } else if (mapa.bancasComplementares.includes(bancaId)) {
          score += 15;
          motivos.push(`Exame complementar para ${getObjectiveLabel(secId)}.`);
        }
      }
    }

    // Disponibilidade de acervo
    if (item.disponivel && (item.contagemQuestoes ?? 0) > 0) {
      score += 20;
      motivos.push(`Acervo real com ${item.contagemQuestoes} questões catalogadas.`);
    } else {
      motivos.push("Exame em planejamento no acervo do LemmaS.");
    }

    let categoria: "prioritaria" | "complementar" | "futura";
    if (!item.disponivel || score < 30) {
      categoria = "futura";
    } else if (isPrim && score >= 65) {
      categoria = "prioritaria";
    } else {
      categoria = "complementar";
    }

    return {
      bancaId,
      label: item.label,
      score: Math.min(100, Math.round(score)),
      categoria,
      motivos,
      disponivel: item.disponivel,
      quantidadeQuestoes: item.contagemQuestoes ?? null,
      categoriaOrigem: item.categoriaOrigem,
    };
  }).sort((a, b) => {
    const rankCategoria: Record<string, number> = { prioritaria: 3, complementar: 2, futura: 1 };
    if (rankCategoria[a.categoria] !== rankCategoria[b.categoria]) {
      return rankCategoria[b.categoria] - rankCategoria[a.categoria];
    }
    return b.score - a.score;
  });
}


/**
 * Converte o perfil pedagógico do estudante em filtros reais para a API de Questões.
 * Permite que Banco de Questões, Área de Resolução e Dashboard abram diretamente
 * nas matérias e bancas prioritárias do estudante.
 */
export function obterFiltrosApiPerfil(profile: any): {
  materia?: string[];
  banca?: string[];
  categoria_banca?: string;
  origemDescricao?: string;
} {
  if (!profile) return {};

  const conteudos = profile.conteudosSelecionados || profile.conceitosSelecionados || [];
  const bancas = profile.concursosSelecionados || [];
  const objPrincipal = profile.objetivoPrincipal || (profile.motivacoesSelecionadas?.[0] ?? null);

  const result: {
    materia?: string[];
    banca?: string[];
    categoria_banca?: string;
    origemDescricao?: string;
  } = {};

  // Se o aluno escolheu disciplinas explicitamente
  if (Array.isArray(conteudos) && conteudos.length > 0) {
    const disponiveis = conteudos.filter((c: string) => {
      const item = TRILHAS_CONCEITUAIS_CATALOGO.find(
        (cat) => cat.label.toLowerCase() === c.toLowerCase() || cat.id.toLowerCase() === c.toLowerCase()
      );
      return !item || item.disponivel;
    });
    if (disponiveis.length > 0) {
      // Profile labels and stored IDs must resolve to API category names.
      const apiNames: Record<string, string> = {
        calculo: "Cálculo",
        matematica_basica: "Matemática Básica",
        polinomios_complexos: "Polinômios e Complexos",
      };
      result.materia = disponiveis.map((value: string) => {
        const item = TRILHAS_CONCEITUAIS_CATALOGO.find(
          (cat) => cat.label.toLowerCase() === value.toLowerCase() || cat.id.toLowerCase() === value.toLowerCase()
        );
        return item ? (apiNames[item.id] || item.label) : value;
      });
    }
  }

  // Se o aluno escolheu bancas explicitamente
  if (Array.isArray(bancas) && bancas.length > 0) {
    const disponiveis = bancas.filter((b: string) => {
      const item = BANCAS_EXAMES_CATALOGO.find(
        (cat) => cat.label.toLowerCase() === b.toLowerCase() || cat.id.toLowerCase() === b.toLowerCase()
      );
      return !item || item.disponivel;
    });
    if (disponiveis.length > 0) {
      result.banca = disponiveis.map((b: string) => b.split("(")[0].trim());
    }
  }

  // Se não houver nem matérias nem bancas explicitamente selecionadas, deriva do Objetivo Principal
  if (!result.materia && !result.banca && objPrincipal) {
    switch (objPrincipal) {
      case "data_science_ml":
        result.materia = ["Álgebra Linear", "Probabilidade e Combinatória", "Cálculo"];
        result.origemDescricao = "Transição para Ciência de Dados & ML";
        break;
      case "superior_docencia":
        result.materia = ["Cálculo", "Álgebra Linear", "Teoria dos Números"];
        result.origemDescricao = "Ensino Superior & Docência em Matemática";
        break;
      case "concursos_militares":
        result.categoria_banca = "Concurso Militar";
        result.banca = ["ITA", "IME", "AFA", "EFOMM", "EsPCEx", "Escola Naval"];
        result.origemDescricao = "Carreiras Militares de Alto Desempenho";
        break;
      case "enem_vestibulares":
        result.banca = ["ENEM", "FUVEST", "UNICAMP"];
        result.materia = ["Funções", "Geometria Plana", "Probabilidade e Combinatória"];
        result.origemDescricao = "ENEM & Vestibulares Tradicionais";
        break;
      case "concursos_publicos":
        result.materia = ["Matemática Básica", "Probabilidade e Combinatória", "Álgebra"];
        result.origemDescricao = "Concursos Públicos & Carreiras de Estado";
        break;
      case "olimpiadas_mat":
        result.categoria_banca = "Olimpíadas";
        result.banca = ["OBM", "IMO", "HMMT"];
        result.origemDescricao = "Olimpíadas de Matemática";
        break;
      case "fundamentos_logica_intuicao":
        result.materia = ["Matemática Básica", "Álgebra", "Geometria Plana"];
        result.origemDescricao = "Fundamentos, Lógica e Intuição";
        break;
      default:
        break;
    }
  } else if (result.materia || result.banca) {
    const partes: string[] = [];
    if (result.materia && result.materia.length > 0) {
      partes.push(result.materia.slice(0, 2).join(", ") + (result.materia.length > 2 ? "..." : ""));
    }
    if (result.banca && result.banca.length > 0) {
      partes.push(result.banca.slice(0, 2).join(", ") + (result.banca.length > 2 ? "..." : ""));
    }
    result.origemDescricao = partes.join(" • ") || "Seu Plano de Estudos";
  }

  return result;
}
