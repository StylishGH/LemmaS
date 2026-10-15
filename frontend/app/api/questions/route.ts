import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const MIN_QUESTIONS_PER_BANK = 1;

interface CanonicalCategory {
  name: string;
  filter: string;
  matcher: (materia: string) => boolean;
}

const CANONICAL_CATEGORIES: CanonicalCategory[] = [
  {
    name: "Cálculo",
    filter: "materia.ilike.%Cálculo%,materia.ilike.%Cálculo 1%,materia.ilike.%Cálculo 2%,materia.ilike.%Cálculo 3%,materia.ilike.%Cálculo Vetorial%,materia.ilike.%Geometria Diferencial%,topico.ilike.%Cálculo%,topico.ilike.%Cálculo 1%,topico.ilike.%Cálculo 2%,topico.ilike.%Cálculo 3%,topico.ilike.%Cálculo Vetorial%,topico.ilike.%Geometria Diferencial%",
    matcher: (m) => {
      const lower = m.toLowerCase();
      return lower.includes("cálculo") || lower.includes("geometria diferencial");
    },
  },
  {
    name: "Probabilidade e Combinatória",
    filter: "materia.ilike.%Probabilidade e Combinatória%,materia.ilike.%Análise Combinatória%,materia.ilike.%Probabilidade%,materia.ilike.%Estatística%,topico.ilike.%Probabilidade e Combinatória%,topico.ilike.%Análise Combinatória%,topico.ilike.%Probabilidade%,topico.ilike.%Estatística%",
    matcher: (m) => {
      const lower = m.toLowerCase();
      return lower.includes("probabilidade") || lower.includes("estatística") || lower.includes("combinatória") || lower.includes("análise combinatória");
    },
  },
  {
    name: "Geometria Plana",
    filter: "materia.ilike.%Geometria Plana%,materia.ilike.%Geometria%,topico.ilike.%Geometria Plana%,topico.ilike.%Geometria%",
    matcher: (m) => {
      const lower = m.toLowerCase();
      return lower.includes("geometria plana") || lower === "geometria";
    },
  },
  {
    name: "Álgebra Linear",
    filter: "materia.ilike.%Álgebra Linear%,materia.ilike.%Geometria Analítica e Álgebra Linear%,topico.ilike.%Álgebra Linear%,topico.ilike.%Geometria Analítica e Álgebra Linear%",
    matcher: (m) => {
      const lower = m.toLowerCase();
      return lower.includes("álgebra linear") || lower.includes("geometria analítica e álgebra linear");
    },
  },
  {
    name: "Álgebra",
    filter: "materia.ilike.%Álgebra%,materia.ilike.%Teoria dos Conjuntos%,topico.ilike.%Álgebra%,topico.ilike.%Teoria dos Conjuntos%",
    matcher: (m) => {
      const lower = m.toLowerCase();
      return lower.includes("álgebra") || lower.includes("teoria dos conjuntos");
    },
  },
  {
    name: "Teoria dos Números",
    filter: "materia.ilike.%Teoria dos Números%,topico.ilike.%Teoria dos Números%",
    matcher: (m) => m.toLowerCase().includes("teoria dos números"),
  },
  {
    name: "Polinômios e Complexos",
    filter: "materia.ilike.%Polinômios e Complexos%,topico.ilike.%Polinômios e Complexos%",
    matcher: (m) => {
      const lower = m.toLowerCase();
      return lower.includes("polinôm") || lower.includes("complex");
    },
  },
  {
    name: "Trigonometria",
    filter: "materia.ilike.%Trigonometria%,topico.ilike.%Trigonometria%",
    matcher: (m) => m.toLowerCase().includes("trigonometria"),
  },
  {
    name: "Geometria Espacial",
    filter: "materia.ilike.%Geometria Espacial%,topico.ilike.%Geometria Espacial%",
    matcher: (m) => m.toLowerCase().includes("geometria espacial"),
  },
  {
    name: "Geometria Analítica",
    filter: "materia.ilike.%Geometria Analítica%,topico.ilike.%Geometria Analítica%",
    matcher: (m) => m.toLowerCase().includes("geometria analítica"),
  },
  {
    name: "Matemática Básica",
    filter: "materia.ilike.%Matemática Básica%,materia.ilike.%Aritmética%,topico.ilike.%Matemática Básica%,topico.ilike.%Aritmética%",
    matcher: (m) => {
      const lower = m.toLowerCase();
      return lower.includes("matemática básica") || lower === "aritmética";
    },
  },
  {
    name: "Matemática Geral",
    filter: "materia.ilike.%Matemática%,topico.ilike.%",
    matcher: (m) => {
      const lower = m.toLowerCase();
      // match generic matemática when not already caught by other categories
      return lower.includes("matemática") &&
             !lower.includes("básica") &&
             !lower.includes("linear") &&
             !lower.includes("analítica") &&
             !lower.includes("espacial");
    },
  },
];

const FALLBACK_QUESTOES = [
  {
    id: 1234,
    banca: "ESA",
    ano: 2026,
    materia: "Álgebra",
    topico: "Funções",
    subtopico: "Funções Quadráticas",
    dificuldade: 3,
    tipo: "objetiva",
    categoria_banca: "Concurso Militar",
    tipo_prova: "Oficial",
    fase_nivel: "Geral",
    enunciado: "Durante um exercício no Campo de Instrução da Escola de Sargentos das Armas, um robô deve caminhar da origem até A(1,1) e ajustar sua trajetória sobre um arco parabólico f(x) = ax² + bx + c (para x > 1) passando por B(2,0) e C(4,4). Nesse caso, a² + b² + c² + m² é igual a:\n\n(A) 32\n(B) 34\n(C) 36\n(D) 38\n(E) 40",
    gabarito: "B"
  },
  {
    id: 1253,
    banca: "EFOMM",
    ano: 2025,
    materia: "Álgebra Linear",
    topico: "Matrizes",
    subtopico: "Operadores e Identidade",
    dificuldade: 4,
    tipo: "objetiva",
    categoria_banca: "Concurso Militar",
    tipo_prova: "Oficial",
    fase_nivel: "Geral",
    enunciado: "Sejam alfa e lambda pertencentes aos reais, I a matriz identidade de ordem n e J a matriz com todas entradas iguais a 1, de ordem n. Qual o resultado do produto das matrizes B e x, tal que vale a igualdade A + B = alfa * I + J com as propriedades P1: A*x = lambda*x e P2: a soma de xi = 0?\n\n(A) (α + 1 - λ) x\n(B) (α + λ) x\n(C) (α - λ) x\n(D) α x\n(E) λ x",
    gabarito: "C"
  },
  {
    id: 1526,
    banca: "CEDERJ",
    ano: 2021,
    materia: "Álgebra Linear",
    topico: "Diagonalização",
    subtopico: "Autovalores e Autovetores",
    dificuldade: 3,
    tipo: "objetiva",
    categoria_banca: "Vestibular & Superior",
    tipo_prova: "Oficial",
    fase_nivel: "Geral",
    enunciado: "Uma matriz A de ordem n x n é dita diagonalizável se admite n autovetores linearmente independentes. Analise a matriz B = [[1, 1], [0, 1]]. É correto afirmar que:\n\n(A) B é diagonalizável com autovalor duplo.\n(B) B NÃO é diagonalizável: mult. algébrica 2 e geométrica 1.\n(C) B é diagonalizável pois det(B) = 1.\n(D) B NÃO é diagonalizável pois não possui autovalores reais.",
    gabarito: "B"
  }
];

// ============================================================
// HELPERS MULTI-SELECT
// Os filtros chegam como "valor1,valor2,..." (vírgula-separados).
// Escapa vírgulas dentro do valor para não quebrar o split.
// ============================================================

const splitValues = (raw: unknown): string[] => {
  if (typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0 && v !== "Todas" && v !== "Todos");
};

// Escapa vírgula e parênteses para uso seguro dentro de .or() do PostgREST
const esc = (v: string) => v.replace(/,/g, "\\,").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  try {
    const searchParams = req.nextUrl.searchParams;
    const banca = searchParams.get("banca");
    const categoriaBanca = searchParams.get("categoria_banca");
    const tipoProva = searchParams.get("tipo_prova");
    const faseNivel = searchParams.get("fase_nivel");
    const ano = searchParams.get("ano");
    const tipo = searchParams.get("tipo");
    const dificuldade = searchParams.get("dificuldade");
    const materia = searchParams.get("materia");
    const topico = searchParams.get("topico");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);
    const offset = (page - 1) * limit;

    // 1. Montagem da Query Principal com Filtros Multi-Dimensionais
    let query = supabase
          .from("questoes")
          .select(
            "id, materia, topico, subtopico, dificuldade, banca, ano, enunciado, figura_path, tipo, edicao, etapa, tipo_material, pais, categoria_banca, tipo_prova, fase_nivel, gabarito, solucao",
            { count: "exact" }
          );

    // Filtro por Categoria de Banca (ex: "Concurso Militar,Vestibular & Superior,Olimpíadas")
    const categoriaBancaValues = splitValues(categoriaBanca);
    if (categoriaBancaValues.length > 0) {
      const cond = categoriaBancaValues.map((v) => `categoria_banca.ilike.%${esc(v)}%`).join(",");
      query = query.or(cond);
    }

    // Filtro por Tipo de Prova (ex: "Oficial,Seleção e Treinamento")
    const tipoProvaValues = splitValues(tipoProva);
    if (tipoProvaValues.length > 0) {
      const cond = tipoProvaValues.map((v) => `tipo_prova.ilike.%${esc(v)}%`).join(",");
      query = query.or(cond);
    }

    // Filtro por Fase / Nível (ex: "Final,Nível Júnior,Nível 2,Nível 3,Geral")
    const faseNivelValues = splitValues(faseNivel);
    if (faseNivelValues.length > 0) {
      const cond = faseNivelValues.map((v) => `fase_nivel.ilike.%${esc(v)}%`).join(",");
      query = query.or(cond);
    }

    // Filtro por Tipo de Material (ex: "shortlist,seletiva,treinamento")
    const tipoMaterial = searchParams.get("tipo_material");
    const tipoMaterialValues = splitValues(tipoMaterial);
    if (tipoMaterialValues.length > 0) {
      const cond = tipoMaterialValues.map((v) => `tipo_material.ilike.%${esc(v)}%`).join(",");
      query = query.or(cond);
    }

    // Filtro por Presença de Figura / Imagem
    const temFigura = searchParams.get("tem_figura");
    if (temFigura === "true") {
      query = query.not("figura_path", "is", null);
    } else if (temFigura === "false") {
      query = query.is("figura_path", null);
    }

    // Filtro por IDs específicos (ex: simulado ou lista customizada)
    const idsParam = searchParams.get("ids");
    if (idsParam) {
      const idList = idsParam.split(",").map((v) => parseInt(v.trim(), 10)).filter((n) => !isNaN(n));
      if (idList.length > 0) {
        query = query.in("id", idList);
      }
    }

    // Filtro por Banca (multi-select: "EFOMM,CEDERJ")
    const bancaValues = splitValues(banca);
    if (bancaValues.length > 0) {
      const conds: string[] = [];
      for (const val of bancaValues) {
        const lowerVal = val.toLowerCase();
        if (lowerVal.includes("nível 2") || lowerVal.includes("nivel 2")) {
          conds.push("and(banca.ilike.%OBM%,fase_nivel.ilike.%Nível 2%)");
        } else if (lowerVal.includes("nível 3") || lowerVal.includes("nivel 3")) {
          conds.push("and(banca.ilike.%OBM%,fase_nivel.ilike.%Nível 3%)");
        } else {
          conds.push(`banca.ilike.%${esc(val)}%`);
        }
      }
      query = query.or(conds.join(","));
    }

    // Filtro por Ano (multi-select: "2023,2024")
    const anoValues = splitValues(ano);
    if (anoValues.length > 0) {
      const cond = anoValues
        .map((v) => `ano.eq.${parseInt(v, 10)}`)
        .filter((v) => !v.includes("NaN"))
        .join(",");
      if (cond) query = query.or(cond);
    }

    // Filtro por Tipo (multi-select: "objetiva,discursiva")
    const tipoValues = splitValues(tipo);
    if (tipoValues.length > 0) {
      const cond = tipoValues.map((v) => `tipo.eq.${esc(v.toLowerCase())}`).join(",");
      query = query.or(cond);
    }

    // Filtro por Dificuldade (multi-select: "facil,media,dificil,nao_classificada")
    const dificuldadeValues = splitValues(dificuldade);
    if (dificuldadeValues.length > 0) {
      const conds: string[] = [];
      dificuldadeValues.forEach((v) => {
        if (v === "facil") conds.push("dificuldade.lte.2");
        else if (v === "media") conds.push("dificuldade.eq.3");
        else if (v === "dificil") conds.push("dificuldade.gte.4");
        else if (v === "nao_classificada") conds.push("dificuldade.is.null");
      });
      if (conds.length > 0) query = query.or(conds.join(","));
    }

    // Filtro por Matéria / Grande Área (multi-select, com categorias canônicas)
    const materiaValues = splitValues(materia);
    if (materiaValues.length > 0) {
      const conds: string[] = [];
      materiaValues.forEach((value) => {
        const canonical = CANONICAL_CATEGORIES.find((c) => c.name.toLowerCase() === value.toLowerCase());
        if (canonical) {
          canonical.filter.split(",").forEach((part) => conds.push(part));
        } else {
          conds.push(`materia.ilike.%${esc(value)}%`);
        }
      });
      if (conds.length > 0) query = query.or(conds.join(","));
    }

    // Filtro por Tópico Específico (multi-select, cobre também subtopico)
    const topicoValues = splitValues(topico);
    if (topicoValues.length > 0) {
      const conds: string[] = [];
      topicoValues.forEach((v) => {
        conds.push(`topico.ilike.%${esc(v)}%`);
        conds.push(`subtopico.ilike.%${esc(v)}%`);
      });
      query = query.or(conds.join(","));
    }

    // Filtro por Busca Textual
    if (search && search.trim() !== "") {
      const term = esc(search.trim());
      query = query.or(`enunciado.ilike.%${term}%,topico.ilike.%${term}%,subtopico.ilike.%${term}%,materia.ilike.%${term}%`);
    }

    query = query.order("id", { ascending: true }).range(offset, offset + limit - 1);

        // 2. Consulta paralela: itens paginados + RPC global stats (contagens REAIS sem limite 1000) + RPC filtro
        const rpcBanca = bancaValues.length === 1 ? bancaValues[0] : null;
        const rpcTipoProva = tipoProvaValues.length === 1 ? tipoProvaValues[0] : null;
        const rpcFaseNivel = faseNivelValues.length === 1 ? faseNivelValues[0] : null;
        const rpcMateria = materiaValues.length === 1 ? materiaValues[0] : null;

        const [mainResult, facetSampleResult, filterCountsResult, globalStatsResult] = await Promise.all([
          query,
          supabase.from("questoes").select("banca, ano, tipo, dificuldade, materia, topico, subtopico").limit(1000),
          supabase.rpc("get_question_filter_counts", {
            p_banca: rpcBanca,
            p_tipo_prova: rpcTipoProva,
            p_fase_nivel: rpcFaseNivel,
            p_materia: rpcMateria,
          }),
          supabase.rpc("get_lemmas_global_stats"),
        ]);

    const { data, count, error } = mainResult;

        if (error) {
          console.error("Erro do Supabase no /api/questions:", error.message);
          return NextResponse.json(
            {
              error: "Serviço de banco de dados temporariamente indisponível.",
              details: error.message,
              questoes: [],
              total: 0,
              page,
              limit,
              total_pages: 0,
            },
            { status: 503 }
          );
        }

        // Parse global stats (RPC sem limite de 1000)
        const globalStats = (globalStatsResult.data || {}) as {
          total_questoes?: number;
          ano_min?: number;
          ano_max?: number;
          anos_disponiveis?: number[];
          dificuldades?: Record<string, number>;
          tipos?: Record<string, number>;
          materias?: Array<{ nome: string; total: number }>;
        };

        const totalRealQuestoes = globalStats.total_questoes ?? count ?? 0;

        // 3. Processamento das contagens reais a partir da RPC do Postgres
        interface RpcBancaRow {
          nome: string;
          categoria: string;
          total: number;
        }
        interface RpcGenericRow {
          nome: string;
          total: number;
        }

        const rpcData = (filterCountsResult.data || {}) as {
          bancas?: RpcBancaRow[];
          tipos_prova?: RpcGenericRow[];
          fases?: RpcGenericRow[];
          materias?: RpcGenericRow[];
        };

        const rpcBancas: RpcBancaRow[] = rpcData.bancas || [];
        const rpcTiposProva: RpcGenericRow[] = rpcData.tipos_prova || [];
        const rpcFases: RpcGenericRow[] = rpcData.fases || [];
        const rpcMaterias: RpcGenericRow[] = rpcData.materias || [];    // Facets de Bancas (com categoria para segmentação visual no front-end)
    // Deduplicate bancas by normalized name (trim().toUpperCase())
    const bancaMap = new Map<string, RpcBancaRow>();
    for (const row of rpcBancas) {
      const key = row.nome.trim().toUpperCase();
      if (!bancaMap.has(key)) {
        bancaMap.set(key, row);
      }
    }
    const dedupedBancas = Array.from(bancaMap.values());
    const bancasFacets = [
      { name: "Todas", count: totalRealQuestoes, categoria: "Todas" },
      ...dedupedBancas
        .filter((row) => {
          const nomeLower = row.nome.trim().toLowerCase();
          return (
            Number(row.total) >= MIN_QUESTIONS_PER_BANK &&
            !nomeLower.includes("nível") &&
            !nomeLower.includes("nivel")
          );
        })
        .map((row) => ({
          name: row.nome,
          count: Number(row.total),
          categoria: row.categoria || "Olimpíadas",
        })),
    ];

    // Facets de Categorias de Banca (Concursos Militares, Vestibulares & Superior, Olimpíadas)
    const catCounts: Record<string, number> = {
      "Concurso Militar": 0,
      "Vestibular & Superior": 0,
      "Olimpíadas": 0,
    };
    rpcBancas.forEach((b) => {
          const cat = b.categoria || "Olimpíadas";
          catCounts[cat] = (catCounts[cat] || 0) + Number(b.total);
        });

        const categoriasBancaFacets = [
          { id: "Todas", label: "Todas as Categorias", count: totalRealQuestoes },
          { id: "Concurso Militar", label: "Concursos Militares", count: catCounts["Concurso Militar"] || 0 },
          { id: "Vestibular & Superior", label: "Vestibulares & Superior", count: catCounts["Vestibular & Superior"] || 0 },
          { id: "Olimpíadas", label: "Olimpíadas de Matemática", count: catCounts["Olimpíadas"] || 0 },
        ];

        // Facets de Tipos de Prova (Oficial vs Seleção e Treinamento)
        const tiposProvaFacets = [
          { id: "Todos", label: "Todos os Tipos de Prova", count: totalRealQuestoes },
          ...rpcTiposProva.map((tp) => ({
            id: tp.nome,
            label: tp.nome,
            count: Number(tp.total),
          })),
        ];

        // Facets de Fases e Níveis (Geral, Final, Nível Júnior, Nível 2, Nível 3)
        const fasesFacets = [
          { id: "Todas", label: "Todas as Fases / Níveis", count: totalRealQuestoes },
          ...rpcFases.map((f) => ({
            id: f.nome,
            label: f.nome,
            count: Number(f.total),
          })),
        ];

    // Amostra de linhas para cálculo de tipos de resposta (objetiva/discursiva) e anos
        const sampleRows = (facetSampleResult.data || []) as {
          banca: string | null;
          ano: number | null;
          tipo: string | null;
          dificuldade: number | null;
          materia: string | null;
          topico: string | null;
          subtopico: string | null;
        }[];

        const bancaSet = bancaValues.map((v) => v.toUpperCase());
        const filteredByBanca = bancaSet.length === 0
          ? sampleRows
          : sampleRows.filter((r) => {
              const rb = (r.banca || "").toUpperCase();
              return bancaSet.some((b) => rb.includes(b));
            });

        // Contagem de Tipos de Resolução (objetiva / discursiva) - da amostra (para filtro por banca)
        let countObjetiva = 0;
        let countDiscursiva = 0;
        let countFacil = 0;
        let countMedia = 0;
        let countDificil = 0;
        let countNaoClassificada = 0;
        const anosMap: Record<number, number> = {};

        sampleRows.forEach((r) => {
          const t = (r.tipo || "").toLowerCase();
          if (t === "objetiva") countObjetiva++;
          else if (t === "discursiva") countDiscursiva++;

          const d = r.dificuldade;
          if (d === null || d === undefined) countNaoClassificada++;
          else if (d <= 2) countFacil++;
          else if (d === 3) countMedia++;
          else if (d >= 4) countDificil++;

          if (r.ano) anosMap[r.ano] = (anosMap[r.ano] || 0) + 1;
        });

        const tiposFacets = [
          { id: "Todos", label: "Todos os Tipos", count: totalRealQuestoes },
          { id: "objetiva", label: "Objetivas", count: globalStats.tipos?.objetiva ?? countObjetiva },
          { id: "discursiva", label: "Discursivas", count: globalStats.tipos?.discursiva ?? countDiscursiva },
        ];

        // Contagem de Dificuldades (Fácil, Média, Difícil, Não Classificada) - usar globalStats se disponível
        const globalDificuldades = globalStats.dificuldades || {};
        const dificuldadesFacets = [
          { id: "Todas", label: "Todas", count: totalRealQuestoes },
          { id: "facil", label: "Fácil", count: globalDificuldades.facil ?? countFacil },
          { id: "media", label: "Média", count: globalDificuldades.media ?? countMedia },
          { id: "dificil", label: "Difícil", count: globalDificuldades.dificil ?? countDificil },
          { id: "nao_classificada", label: "Não Classificada", count: globalDificuldades["Não Classificada"] ?? countNaoClassificada },
        ];

        // Contagem de Anos - usar globalStats para ter TODOS os anos (sem limite 1000)
        const anosFacets = (globalStats.anos_disponiveis || [])
          .map((ano) => ({ ano, count: anosMap[ano] || 0 }))
          .sort((a, b) => b.ano - a.ano);

    // Agregação Canônica de Matérias (Sem pílulas duplicadas)
    const canonicalMateriaCounts = new Map<string, number>();
    for (const cat of CANONICAL_CATEGORIES) {
      canonicalMateriaCounts.set(cat.name, 0);
    }
    for (const m of (globalStats.materias || [])) {
      let matched = false;
      for (const cat of CANONICAL_CATEGORIES) {
        if (cat.matcher(m.nome)) {
          canonicalMateriaCounts.set(cat.name, (canonicalMateriaCounts.get(cat.name) || 0) + Number(m.total));
          matched = true;
          break;
        }
      }
      if (!matched && m.nome && m.nome !== "Todas") {
        canonicalMateriaCounts.set(m.nome, (canonicalMateriaCounts.get(m.nome) || 0) + Number(m.total));
      }
    }
    const materiasFacets = [
      { name: "Todas", count: totalRealQuestoes },
      ...Array.from(canonicalMateriaCounts.entries())
        .filter(([_, count]) => count > 0)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    ];
    // Tópicos Específicos
    const topicMap: Record<string, number> = {};
    sampleRows.forEach((r) => {
      const top = r.topico;
      if (top && top.trim()) {
        topicMap[top.trim()] = (topicMap[top.trim()] || 0) + 1;
      }
    });

    const topicosEspecificosFacets = Object.entries(topicMap)
      .map(([name, c]) => ({ name, count: c }))
      .sort((a, b) => b.count - a.count);

    // Mapeamento canônico de Matérias com seus respectivos Tópicos
    const materiasComTopicos = CANONICAL_CATEGORIES.map((cat) => {
      const rowsForCat = sampleRows.filter((r) => cat.matcher(r.materia || ""));
      const topMap: Record<string, number> = {};
      rowsForCat.forEach((r) => {
        const top = r.topico;
        if (top && top.trim()) {
          topMap[top.trim()] = (topMap[top.trim()] || 0) + 1;
        }
      });
      const topicos = Object.entries(topMap)
        .map(([name, c]) => ({ name, count: c }))
        .sort((a, b) => b.count - a.count);

      // Encontra a contagem agregada calculada para essa matéria
      const catCount = canonicalMateriaCounts.get(cat.name) ?? rowsForCat.length;

      return {
        name: cat.name,
        count: catCount,
        topicos,
      };
    }).filter((m) => m.count > 0);

    return NextResponse.json({
      questoes: data || [],
      total: count || 0,
      page,
      limit,
      total_pages: count ? Math.ceil(count / limit) : 0,
      bancas: bancasFacets,
      categorias_banca: categoriasBancaFacets,
      tipos_prova: tiposProvaFacets,
      fases: fasesFacets,
      materias: materiasFacets,
      materias_com_topicos: materiasComTopicos,
      topicos: [
        { name: "Todos", count: sampleRows.length },
        ...topicosEspecificosFacets,
      ],
      anos: [
        { 
          label: `Todos os Anos da Prova (${globalStats.ano_min ?? 1979}–${globalStats.ano_max ?? 2026})`, 
          count: filteredByBanca.length 
        },
        ...anosFacets,
      ],
      ano_min: globalStats.ano_min ?? 1979,
      ano_max: globalStats.ano_max ?? 2026,
      tipos: tiposFacets,
      dificuldades: dificuldadesFacets,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("Exceção no /api/questions:", message);
    return NextResponse.json({
      questoes: FALLBACK_QUESTOES,
      total: 20764,
      page: 1,
      limit: 15,
      total_pages: 1385,
      bancas: [
        { name: "Todas", count: 20764, categoria: "Todas" },
        { name: "HMMT", count: 3221, categoria: "Olimpíadas" },
        { name: "IMO", count: 1924, categoria: "Olimpíadas" },
        { name: "ITA", count: 328, categoria: "Concurso Militar" },
        { name: "ENEM", count: 263, categoria: "Vestibular & Superior" },
        { name: "EEAR", count: 216, categoria: "Concurso Militar" },
        { name: "CEDERJ", count: 74, categoria: "Vestibular & Superior" },
      ],
      categorias_banca: [
        { id: "Todas", label: "Todas as Categorias", count: 20764 },
        { id: "Concurso Militar", label: "Concursos Militares", count: 1603 },
        { id: "Vestibular & Superior", label: "Vestibulares & Superior", count: 567 },
        { id: "Olimpíadas", label: "Olimpíadas de Matemática", count: 18594 },
      ],
      tipos_prova: [
        { id: "Todos", label: "Todos os Tipos de Prova", count: 20764 },
        { id: "Oficial", label: "Oficial", count: 19292 },
        { id: "Seleção e Treinamento", label: "Seleção e Treinamento", count: 1472 },
      ],
      fases: [
        { id: "Todas", label: "Todas as Fases / Níveis", count: 20764 },
        { id: "Geral", label: "Geral", count: 18122 },
        { id: "Final", label: "Final", count: 2035 },
        { id: "Nível Júnior", label: "Nível Júnior", count: 603 },
      ],
      topicos: [
        { name: "Todos", count: 20764 },
        { name: "Geometria Plana", count: 4473 },
        { name: "Probabilidade e Combinatória", count: 4111 },
        { name: "Álgebra", count: 4082 },
        { name: "Teoria dos Números", count: 3478 },
      ],
      is_fallback: true,
    });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  try {
    const body = await req.json();
    const { ids, filters, limit = 100, page = 1 } = body || {};
    const offset = Math.max(0, (page - 1) * limit);

    let query = supabase
      .from("questoes")
      .select("id, materia, topico, subtopico, dificuldade, banca, ano, enunciado, figura_path, gabarito, tipo, edicao, etapa, tipo_material, pais, solucao, categoria_banca, tipo_prova, fase_nivel", { count: "exact" });

    if (Array.isArray(ids) && ids.length > 0) {
      query = query.in("id", ids).order("id", { ascending: true });
    } else if (filters) {
      const normalize = (v: unknown): string[] => {
        if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter((x) => x.length > 0 && x !== "Todas" && x !== "Todos");
        if (typeof v === "string") return splitValues(v);
        return [];
      };

      const categoriaBancaValues = normalize(filters.categoria_banca);
      if (categoriaBancaValues.length > 0) {
        query = query.or(categoriaBancaValues.map((v) => `categoria_banca.ilike.%${esc(v)}%`).join(","));
      }

      const tipoProvaValues = normalize(filters.tipo_prova);
      if (tipoProvaValues.length > 0) {
        query = query.or(tipoProvaValues.map((v) => `tipo_prova.ilike.%${esc(v)}%`).join(","));
      }

      const faseNivelValues = normalize(filters.fase_nivel);
      if (faseNivelValues.length > 0) {
        query = query.or(faseNivelValues.map((v) => `fase_nivel.ilike.%${esc(v)}%`).join(","));
      }

      const bancaValues = normalize(filters.banca);
      if (bancaValues.length > 0) {
        const conds: string[] = [];
        for (const val of bancaValues) {
          const lowerVal = val.toLowerCase();
          if (lowerVal.includes("nível 2") || lowerVal.includes("nivel 2")) {
            conds.push("and(banca.ilike.%OBM%,fase_nivel.ilike.%Nível 2%)");
          } else if (lowerVal.includes("nível 3") || lowerVal.includes("nivel 3")) {
            conds.push("and(banca.ilike.%OBM%,fase_nivel.ilike.%Nível 3%)");
          } else {
            conds.push(`banca.ilike.%${esc(val)}%`);
          }
        }
        query = query.or(conds.join(","));
      }

      const anoValues = normalize(filters.ano);
      if (anoValues.length > 0) {
        const cond = anoValues
          .map((v) => `ano.eq.${parseInt(v, 10)}`)
          .filter((v) => !v.includes("NaN"))
          .join(",");
        if (cond) query = query.or(cond);
      }

      const tipoValues = normalize(filters.tipo);
      if (tipoValues.length > 0) {
        query = query.or(tipoValues.map((v) => `tipo.eq.${esc(v.toLowerCase())}`).join(","));
      }

      const materiaValues = normalize(filters.materia);
      if (materiaValues.length > 0) {
        const conds: string[] = [];
        materiaValues.forEach((value) => {
          const canonical = CANONICAL_CATEGORIES.find((c) => c.name.toLowerCase() === value.toLowerCase());
          if (canonical) {
            canonical.filter.split(",").forEach((part) => conds.push(part));
          } else {
            conds.push(`materia.ilike.%${esc(value)}%`);
          }
        });
        if (conds.length > 0) query = query.or(conds.join(","));
      }

      const topicoValues = normalize(filters.topico);
      if (topicoValues.length > 0) {
        const conds: string[] = [];
        topicoValues.forEach((v) => {
          conds.push(`topico.ilike.%${esc(v)}%`);
          conds.push(`subtopico.ilike.%${esc(v)}%`);
        });
        query = query.or(conds.join(","));
      }

      query = query.order("id", { ascending: true }).range(offset, offset + limit - 1);
    } else {
      query = query.order("id", { ascending: true }).range(offset, offset + limit - 1);
    }

    const { data, count, error } = await query;
    if (error) {
      console.error("Erro no POST /api/questions:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      questoes: data || [],
      total: count ?? (data?.length || 0),
      page,
      limit,
      total_pages: count ? Math.ceil(count / limit) : 1,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
