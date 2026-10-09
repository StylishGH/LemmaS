import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

interface CanonicalCategory {
  name: string;
  filter: string;
  matcher: (materia: string) => boolean;
}

const CANONICAL_CATEGORIES: CanonicalCategory[] = [
  {
    name: "Cálculo",
    filter: "materia.ilike.%Cálculo%,topico.ilike.%Cálculo%",
    matcher: (m) => m.toLowerCase().includes("cálculo"),
  },
  {
    name: "Álgebra",
    filter: "materia.eq.Álgebra",
    matcher: (m) => m === "Álgebra",
  },
  {
    name: "Álgebra Linear",
    filter: "materia.ilike.%Álgebra Linear%,topico.ilike.%Álgebra Linear%",
    matcher: (m) => m.toLowerCase().includes("álgebra linear"),
  },
  {
    name: "Probabilidade e Combinatória",
    filter: "materia.ilike.%Probabilidade%,materia.ilike.%Combinat%,materia.ilike.%Estatíst%,topico.ilike.%Probabilidade%,topico.ilike.%Combinat%,topico.ilike.%Estatíst%",
    matcher: (m) => {
      const lower = m.toLowerCase();
      return lower.includes("probabilidade") || lower.includes("estatística") || lower.includes("combinatória");
    },
  },
  {
    name: "Geometria Analítica",
    filter: "materia.ilike.%Analítica%,topico.ilike.%Analítica%,topico.ilike.%Cônica%",
    matcher: (m) => m.toLowerCase().includes("analítica"),
  },
  {
    name: "Geometria Espacial",
    filter: "materia.ilike.%Espacial%,topico.ilike.%Espacial%",
    matcher: (m) => m.toLowerCase().includes("espacial"),
  },
  {
    name: "Geometria Plana",
    filter: "materia.ilike.%Plana%,topico.ilike.%Plana%",
    matcher: (m) => m.toLowerCase().includes("plana"),
  },
  {
    name: "Trigonometria",
    filter: "materia.ilike.%Trigonometria%,topico.ilike.%Trigonometria%",
    matcher: (m) => m.toLowerCase().includes("trigonometria"),
  },
  {
    name: "Polinômios e Complexos",
    filter: "materia.ilike.%Polinôm%,materia.ilike.%Complex%,topico.ilike.%Polinôm%,topico.ilike.%Complex%",
    matcher: (m) => {
      const lower = m.toLowerCase();
      return lower.includes("polinôm") || lower.includes("complex");
    },
  },
  {
    name: "Matemática Básica",
    filter: "materia.ilike.%Básica%,materia.ilike.%Conjunto%,materia.ilike.%Teoria dos Conjuntos%",
    matcher: (m) => {
      const lower = m.toLowerCase();
      return lower.includes("básica") || lower.includes("conjunto");
    },
  },
  {
    name: "Matemática Financeira",
    filter: "materia.ilike.%Financeira%,topico.ilike.%SAC%,topico.ilike.%Juros%",
    matcher: (m) => m.toLowerCase().includes("financeira"),
  },
  {
    name: "Física",
    filter: "materia.eq.Física",
    matcher: (m) => m === "Física",
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
      .select("id, materia, topico, subtopico, dificuldade, banca, ano, enunciado, gabarito, tipo", { count: "exact" });

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
      const cond = bancaValues.map((v) => `banca.ilike.%${esc(v)}%`).join(",");
      query = query.or(cond);
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
          // O filtro canônico já é uma expressão or(...) válida — empurra as partes
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

    // 2. Consulta paralela de facets globais para contagem dinâmica em todas as dimensões
    const [mainResult, facetResult] = await Promise.all([
      query,
      supabase.from("questoes").select("banca, ano, tipo, dificuldade, materia, topico, subtopico")
    ]);

    const { data, count, error } = mainResult;

    if (error) {
      console.warn("Aviso do Supabase no /api/questions, usando fallback defensivo:", error.message);
      return NextResponse.json({
        questoes: FALLBACK_QUESTOES,
        total: 288,
        page,
        limit,
        total_pages: Math.ceil(288 / limit),
        bancas: [
          { name: "Todas", count: 288 },
          { name: "EFOMM", count: 202 },
          { name: "CEDERJ", count: 74 },
          { name: "ESA", count: 12 },
        ],
        topicos: [
          { name: "Todos", count: 288 },
          { name: "Cálculo", count: 63 },
          { name: "Álgebra", count: 62 },
          { name: "Álgebra Linear", count: 31 },
        ],
        is_fallback: true,
      });
    }

    // 3. Processamento dinâmico de Facets a partir dos dados do banco
    interface DbRow {
      banca: string | null;
      ano: number | null;
      tipo: string | null;
      dificuldade: number | null;
      materia: string | null;
      topico: string | null;
      subtopico: string | null;
    }

    const allRows: DbRow[] = (facetResult.data || []) as DbRow[];

    // Contagem de Bancas
    const bancasCounts: Record<string, number> = { Todas: allRows.length, EFOMM: 0, CEDERJ: 0, ESA: 0 };
    allRows.forEach((r) => {
      const b = r.banca || "";
      if (bancasCounts[b] !== undefined) bancasCounts[b]++;
    });

    const bancasFacets = [
      { name: "Todas", count: bancasCounts["Todas"] || 0 },
      { name: "EFOMM", count: bancasCounts["EFOMM"] || 0 },
      { name: "CEDERJ", count: bancasCounts["CEDERJ"] || 0 },
      { name: "ESA", count: bancasCounts["ESA"] || 0 },
    ];

    // Linhas filtradas pelas Bancas selecionadas (para contextualizar as outras dimensões)
    const bancaSet = bancaValues.map((v) => v.toUpperCase());
    const filteredByBanca = bancaSet.length === 0
      ? allRows
      : allRows.filter((r) => {
          const rb = (r.banca || "").toUpperCase();
          return bancaSet.some((b) => rb.includes(b));
        });

    // Contagem de Tipos (objetiva / discursiva)
    let countObjetiva = 0;
    let countDiscursiva = 0;
    filteredByBanca.forEach((r) => {
      const t = (r.tipo || "").toLowerCase();
      if (t === "objetiva") countObjetiva++;
      else if (t === "discursiva") countDiscursiva++;
    });

    const tiposFacets = [
      { id: "Todos", label: "Todos os Tipos", count: filteredByBanca.length },
      { id: "objetiva", label: "Objetivas", count: countObjetiva },
      { id: "discursiva", label: "Discursivas", count: countDiscursiva },
    ];

    // Contagem de Dificuldades (Fácil, Média, Difícil, Não Classificada)
    let countFacil = 0;
    let countMedia = 0;
    let countDificil = 0;
    let countNaoClassificada = 0;

    filteredByBanca.forEach((r) => {
      const d = r.dificuldade;
      if (d === null || d === undefined) countNaoClassificada++;
      else if (d <= 2) countFacil++;
      else if (d === 3) countMedia++;
      else if (d >= 4) countDificil++;
    });

    const dificuldadesFacets = [
      { id: "Todas", label: "Todas", count: filteredByBanca.length },
      { id: "facil", label: "Fácil", count: countFacil },
      { id: "media", label: "Média", count: countMedia },
      { id: "dificil", label: "Difícil", count: countDificil },
      { id: "nao_classificada", label: "Não Classificada", count: countNaoClassificada },
    ];

    // Contagem de Anos
    const anosMap: Record<number, number> = {};
    filteredByBanca.forEach((r) => {
      if (r.ano) anosMap[r.ano] = (anosMap[r.ano] || 0) + 1;
    });

    const anosFacets = Object.entries(anosMap)
      .map(([a, c]) => ({ ano: parseInt(a, 10), count: c }))
      .sort((a, b) => b.ano - a.ano);

    // Contagem de Matérias Canônicas
    const materiaCounts: { name: string; count: number }[] = [];
    CANONICAL_CATEGORIES.forEach((cat) => {
      let c = 0;
      filteredByBanca.forEach((r) => {
        if (cat.matcher(r.materia || "")) c++;
      });
      if (c > 0) materiaCounts.push({ name: cat.name, count: c });
    });
    materiaCounts.sort((a, b) => b.count - a.count);

    const materiasFacets = [
      { name: "Todas", count: filteredByBanca.length },
      ...materiaCounts,
    ];

    // Contagem de Tópicos Específicos (contextualizados pelas matérias selecionadas se houver)
    const materiaMatchers = materiaValues.map((value) => {
      const cat = CANONICAL_CATEGORIES.find((c) => c.name.toLowerCase() === value.toLowerCase());
      return cat ? cat.matcher : (m: string) => m.toLowerCase().includes(value.toLowerCase());
    });
    const rowsForSpecificTopics = materiaMatchers.length > 0
      ? filteredByBanca.filter((r) => {
          const rm = r.materia || "";
          return materiaMatchers.some((matcher) => matcher(rm));
        })
      : filteredByBanca;

    const topicMap: Record<string, number> = {};
    rowsForSpecificTopics.forEach((r) => {
      const top = r.topico;
      if (top && top.trim()) {
        topicMap[top.trim()] = (topicMap[top.trim()] || 0) + 1;
      }
    });

    const topicosEspecificosFacets = Object.entries(topicMap)
      .map(([name, c]) => ({ name, count: c }))
      .sort((a, b) => b.count - a.count);

    // Mapeamento canônico de Matérias com seus respectivos Tópicos (para navegação em acordeão)
    const materiasComTopicos = CANONICAL_CATEGORIES.map((cat) => {
      const rowsForCat = filteredByBanca.filter((r) => cat.matcher(r.materia || ""));
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

      return {
        name: cat.name,
        count: rowsForCat.length,
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
      materias: materiasFacets,
      materias_com_topicos: materiasComTopicos,
      topicos: [
        { name: "Todos", count: rowsForSpecificTopics.length },
        ...topicosEspecificosFacets,
      ],
      anos: [
        { ano: 0, label: "Todos os Anos", count: filteredByBanca.length },
        ...anosFacets,
      ],
      tipos: tiposFacets,
      dificuldades: dificuldadesFacets,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("Exceção no /api/questions:", message);
    return NextResponse.json({
      questoes: FALLBACK_QUESTOES,
      total: 288,
      page: 1,
      limit: 15,
      total_pages: 20,
      bancas: [
        { name: "Todas", count: 288 },
        { name: "EFOMM", count: 202 },
        { name: "CEDERJ", count: 74 },
        { name: "ESA", count: 12 },
      ],
      topicos: [
        { name: "Todos", count: 288 },
        { name: "Cálculo", count: 63 },
        { name: "Álgebra", count: 62 },
        { name: "Álgebra Linear", count: 31 },
      ],
      is_fallback: true,
    });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  try {
    const body = await req.json();
    const { ids, filters, limit = 100 } = body || {};

    let query = supabase
      .from("questoes")
      .select("id, materia, topico, subtopico, dificuldade, banca, ano, enunciado, gabarito, tipo");

    if (Array.isArray(ids) && ids.length > 0) {
      query = query.in("id", ids).order("id", { ascending: true });
    } else if (filters) {
      // Aceita string ("a,b") ou array (["a","b"]) para cada dimensão
      const normalize = (v: unknown): string[] => {
        if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter((x) => x.length > 0 && x !== "Todas" && x !== "Todos");
        if (typeof v === "string") return splitValues(v);
        return [];
      };

      const bancaValues = normalize(filters.banca);
      if (bancaValues.length > 0) {
        query = query.or(bancaValues.map((v) => `banca.ilike.%${esc(v)}%`).join(","));
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

      query = query.order("id", { ascending: true }).limit(limit);
    } else {
      query = query.order("id", { ascending: true }).limit(limit);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Erro no POST /api/questions:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ questoes: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
