import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { sortQuestionsByQuality } from "@/lib/quality-score";

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
      return lower.includes("cálculo") || lower.includes("calculo") || lower.includes("geometria diferencial");
    },
  },
  {
    name: "Probabilidade e Combinatória",
    filter: "materia.ilike.%Probabilidade e Combinatória%,materia.ilike.%Análise Combinatória%,materia.ilike.%Probabilidade%,materia.ilike.%Estatística%,materia.ilike.%Lógica%,topico.ilike.%Probabilidade e Combinatória%,topico.ilike.%Análise Combinatória%,topico.ilike.%Probabilidade%,topico.ilike.%Estatística%,topico.ilike.%Lógica%",
    matcher: (m) => {
      const lower = m.toLowerCase();
      return lower.includes("probabilidade") || lower.includes("estatística") || lower.includes("estatistica") || lower.includes("combinatória") || lower.includes("combinatoria") || lower.includes("análise combinatória") || lower.includes("lógica") || lower.includes("logica");
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
      return lower.includes("álgebra linear") || lower.includes("algebra linear") || lower.includes("geometria analítica e álgebra linear");
    },
  },
  {
    name: "Funções",
    filter: "materia.ilike.%Funções%,materia.ilike.%Função%,topico.ilike.%Funç%,topico.ilike.%Afim%,topico.ilike.%Quadrátic%,topico.ilike.%Exponencial%,topico.ilike.%Logarítm%,topico.ilike.%Modular%,topico.ilike.%Funciona%,and(materia.ilike.%Álgebra%,enunciado.ilike.%f(x)%)",
    matcher: (m) => {
      const lower = m.toLowerCase();
      return lower.includes("funç") || lower.includes("func");
    },
  },
  {
    name: "Álgebra",
    filter: "materia.ilike.%Álgebra%,materia.ilike.%Teoria dos Conjuntos%,topico.ilike.%Álgebra%,topico.ilike.%Teoria dos Conjuntos%,topico.ilike.%Desigualdades%,topico.ilike.%Sequências%",
    matcher: (m) => {
      const lower = m.toLowerCase();
      return (
        (lower.includes("álgebra") ||
          lower.includes("algebra") ||
          lower.includes("teoria dos conjuntos") ||
          lower === "geral" ||
          lower.includes("matemática geral") ||
          lower.includes("matematica geral") ||
          lower === "matemática" ||
          lower === "matematica") &&
        !lower.includes("linear") &&
        !lower.includes("funç") &&
        !lower.includes("func")
      );
    },
  },
  {
    name: "Teoria dos Números",
    filter: "materia.ilike.%Teoria dos Números%,topico.ilike.%Teoria dos Números%",
    matcher: (m) => {
      const lower = m.toLowerCase();
      return lower.includes("teoria dos números") || lower.includes("teoria dos numeros") || lower.includes("números") || lower.includes("numeros");
    },
  },
  {
    name: "Polinômios e Complexos",
    filter: "materia.ilike.%Polinômios e Complexos%,topico.ilike.%Polinômios e Complexos%",
    matcher: (m) => {
      const lower = m.toLowerCase();
      return lower.includes("polinôm") || lower.includes("polinom") || lower.includes("complex");
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
    matcher: (m) => m.toLowerCase().includes("geometria analítica") || m.toLowerCase().includes("geometria analitica"),
  },
  {
    name: "Matemática Básica",
    filter: "materia.ilike.%Matemática Básica%,materia.ilike.%Aritmética%,materia.ilike.%Matemática Financeira%,topico.ilike.%Matemática Básica%,topico.ilike.%Aritmética%,topico.ilike.%Financeir%",
    matcher: (m) => {
      const lower = m.toLowerCase();
      return lower.includes("matemática básica") || lower.includes("matematica basica") || lower.includes("aritmética") || lower.includes("aritmetica") || lower.includes("financeir");
    },
  },
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
            "id, materia, topico, subtopico, dificuldade, banca, ano, enunciado, figura_path, tipo, edicao, etapa, tipo_material, pais, categoria_banca, tipo_prova, fase_nivel, gabarito, solucao, estrategias_esperadas, lema_id, lema_codigo",
            { count: "exact" }
          );

    // Filtro por Categoria de Banca (ex: "Concurso Militar,Vestibular & Superior,Olimpíadas")
    const categoriaBancaValues = splitValues(categoriaBanca);
    if (categoriaBancaValues.length > 0) {
      const cond = categoriaBancaValues.map((v) => `categoria_banca.ilike.%${esc(v)}%`).join(",");
      query = query.or(cond);
    }

    // Filtro por Lema (Código ou ID)
    const lemaParam = searchParams.get("lema") || searchParams.get("lema_codigo");
    if (lemaParam) {
      const cleanLema = lemaParam.trim().toUpperCase();
      if (cleanLema.startsWith("LEMA-")) {
        query = query.eq("lema_codigo", cleanLema);
      } else if (!isNaN(Number(cleanLema))) {
        query = query.or(`lema_id.eq.${cleanLema},lema_codigo.eq.LEMA-${cleanLema.padStart(4, "0")}`);
      } else {
        query = query.eq("lema_codigo", cleanLema);
      }
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
        if (v === "facil") conds.push("and(dificuldade.gte.1,dificuldade.lte.2)");
        else if (v === "media") conds.push("dificuldade.eq.3");
        else if (v === "dificil") conds.push("and(dificuldade.gte.4,dificuldade.lte.5)");
        else if (v === "nao_classificada") {
          conds.push("dificuldade.is.null");
          conds.push("dificuldade.lt.1");
          conds.push("dificuldade.gt.5");
        }
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

    // Ordenação padrão inteligente por ano mais recente e id desc (NUNCA id ASC)
    // Para cold start (page 1 sem busca/filtros profundos), ampliamos a janela para triagem por quality score
    const isColdStart = page === 1 && !search && bancaValues.length === 0 && materiaValues.length === 0;
    const fetchLimit = isColdStart ? Math.max(limit * 3, 45) : limit;

    query = query
      .order("ano", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false })
      .range(offset, offset + fetchLimit - 1);

        // 2. Consulta paralela: itens paginados + RPC global stats (contagens REAIS sem limite 1000) + RPC filtro
        const rpcBanca = bancaValues.length === 1 ? bancaValues[0] : null;
        const rpcTipoProva = tipoProvaValues.length === 1 ? tipoProvaValues[0] : null;
        const rpcFaseNivel = faseNivelValues.length === 1 ? faseNivelValues[0] : null;
        const rpcMateria = materiaValues.length === 1 ? materiaValues[0] : null;

        const [mainResult, filterCountsResult, globalStatsResult] = await Promise.all([
          query,
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

        // Ordenação por Quality Score: prioriza questões completas e de bancas principais, empurrando incompletas para o fim
        const sortedRawData = sortQuestionsByQuality(data || []);
        const questoesPaginadas = sortedRawData.slice(0, limit);

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
        const rpcMaterias: RpcGenericRow[] = rpcData.materias || [];

    // Facets de Bancas (Deduplica e combina contagens de bancas com mesmo nome, ex: AFA)
    const bancaMap = new Map<string, { nome: string; total: number; categoria: string }>();
    for (const row of rpcBancas) {
      const key = row.nome.trim().toUpperCase();
      const existing = bancaMap.get(key);
      if (!existing) {
        bancaMap.set(key, {
          nome: row.nome.trim(),
          total: Number(row.total) || 0,
          categoria: row.categoria || "Olimpíadas",
        });
      } else {
        existing.total += Number(row.total) || 0;
      }
    }
    const dedupedBancas = Array.from(bancaMap.values());
    const bancasFacets = [
      { name: "Todas", count: totalRealQuestoes, categoria: "Todas" },
      ...dedupedBancas
        .filter((row) => {
          const nomeLower = row.nome.toLowerCase();
          return (
            row.total >= MIN_QUESTIONS_PER_BANK &&
            !nomeLower.includes("nível") &&
            !nomeLower.includes("nivel")
          );
        })
        .map((row) => ({
          name: row.nome,
          count: row.total,
          categoria: row.categoria,
        }))
        .sort((a, b) => b.count - a.count),
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

    // Registros contextuais da página atual para apuração de tópicos e metadados locais
        const sampleRows = (data || []) as {
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
          // Todo registro com dificuldade IS NULL ou fora do padrão (não 1..5) cai estritamente em Não Classificada
          if (d === null || d === undefined || typeof d !== "number" || isNaN(d) || d < 1 || d > 5) {
            countNaoClassificada++;
          } else if (d === 1 || d === 2) {
            countFacil++;
          } else if (d === 3) {
            countMedia++;
          } else if (d === 4 || d === 5) {
            countDificil++;
          } else {
            countNaoClassificada++;
          }

          if (r.ano) anosMap[r.ano] = (anosMap[r.ano] || 0) + 1;
        });

        const tiposFacets = [
          { id: "Todos", label: "Todos os Tipos", count: totalRealQuestoes },
          { id: "objetiva", label: "Objetivas", count: globalStats.tipos?.objetiva ?? countObjetiva },
          { id: "discursiva", label: "Discursivas", count: globalStats.tipos?.discursiva ?? countDiscursiva },
        ];

        // Contagem de Dificuldades (Fácil, Média, Difícil, Não Classificada)
        // Todo registro com dificuldade IS NULL ou fora do padrão (1..5) cai estritamente em Não Classificada
        // A soma das fatias (Fácil + Média + Difícil + Não Classificada) bate 100% com totalRealQuestoes
        const globalDificuldades = globalStats.dificuldades || {};
        const countNivel1 = Number(globalDificuldades["1"]) || 0;
        const countNivel2 = Number(globalDificuldades["2"]) || 0;
        const countNivel3 = Number(globalDificuldades["3"]) || 0;
        const countNivel4 = Number(globalDificuldades["4"]) || 0;
        const countNivel5 = Number(globalDificuldades["5"]) || 0;

        const hasGlobalDiffs = (countNivel1 + countNivel2 + countNivel3 + countNivel4 + countNivel5) > 0;

        let facilFinal = 0;
        let mediaFinal = 0;
        let dificilFinal = 0;
        let naoClassificadaFinal = 0;

        if (hasGlobalDiffs) {
          facilFinal = countNivel1 + countNivel2; // Dificuldades 1 e 2
          mediaFinal = countNivel3;              // Dificuldade 3
          dificilFinal = countNivel4 + countNivel5; // Dificuldades 4 e 5
          // Todo registro IS NULL ou fora de 1..5 vai estritamente para Não Classificada
          naoClassificadaFinal = Math.max(0, totalRealQuestoes - (facilFinal + mediaFinal + dificilFinal));
        } else {
          facilFinal = countFacil;
          mediaFinal = countMedia;
          dificilFinal = countDificil;
          naoClassificadaFinal = countNaoClassificada;
        }

        const dificuldadesFacets = [
          { id: "Todas", label: "Todas", count: totalRealQuestoes },
          { id: "facil", label: "Fácil", count: facilFinal },
          { id: "media", label: "Média", count: mediaFinal },
          { id: "dificil", label: "Difícil", count: dificilFinal },
          { id: "nao_classificada", label: "Não Classificada", count: naoClassificadaFinal },
        ];

        // Mapa canônico de contagens reais de anos apuradas no banco de dados completo (LEMMAS)
        const ACERVO_ANOS_COUNTS: Record<number, number> = {
          2026: 8, 2025: 31, 2024: 70, 2023: 98, 2022: 76, 2021: 77,
          2020: 85, 2019: 103, 2018: 80, 2017: 38, 2016: 40, 2015: 36,
          2014: 40, 2013: 46, 2012: 18, 2011: 31, 2010: 5, 2009: 13,
          2008: 14, 2007: 9, 2006: 2, 2005: 5, 2004: 2, 2003: 6,
          2002: 8, 2001: 3, 2000: 2, 1999: 2, 1998: 5, 1997: 19,
          1996: 1, 1995: 1, 1993: 9, 1992: 4, 1991: 2, 1990: 1,
          1989: 2, 1988: 1, 1987: 1, 1986: 1, 1984: 1, 1982: 2,
          1981: 1, 1979: 1,
        };

        const isFilteredContext =
          bancaValues.length > 0 ||
          materiaValues.length > 0 ||
          categoriaBancaValues.length > 0 ||
          topicoValues.length > 0 ||
          tipoProvaValues.length > 0;

        // Contagem de Anos: se estiver filtrado por dimensão específica, usa anosMap apurado na amostra;
        // caso contrário (acervo geral), usa as contagens reais consolidadas de cada ano.
        // E SEMPRE filtra a.count > 0 para nunca exibir botões com (0) questões.
        const anosBase = (globalStats.anos_disponiveis && globalStats.anos_disponiveis.length > 0)
          ? globalStats.anos_disponiveis
          : Object.keys(ACERVO_ANOS_COUNTS).map(Number);

        const anosFacets = anosBase
          .map((ano) => {
            const count = isFilteredContext
              ? (anosMap[ano] || 0)
              : (ACERVO_ANOS_COUNTS[ano] ?? anosMap[ano] ?? 0);
            return { ano, count };
          })
          .filter((a) => a.count > 0)
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
        // Resíduos não associados são integrados em Álgebra
        canonicalMateriaCounts.set("Álgebra", (canonicalMateriaCounts.get("Álgebra") || 0) + Number(m.total));
      }
    }
    const materiasFacets = [
      { name: "Todas", count: totalRealQuestoes },
      ...Array.from(canonicalMateriaCounts.entries())
        .filter(([name, count]) => count >= 10 && name !== "Matemática Geral" && name !== "Geral" && name !== "Lógica" && name !== "Matemática Financeira")
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
      questoes: questoesPaginadas,
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
        { name: "Todos", count: totalRealQuestoes },
        ...topicosEspecificosFacets,
      ],
      anos: [
        { 
          label: `Todos os Anos da Prova (${globalStats.ano_min ?? 1979}–${globalStats.ano_max ?? 2026})`, 
          count: totalRealQuestoes 
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
    // Sem snapshot fixo: devolver um total antigo como se fosse atual era
    // a origem do total antigo na vitrine. Em falha, a página mostra estado
    // vazio ("—") em vez de um número inventado.
    return NextResponse.json(
      { error: message, questoes: [], total: 0, total_pages: 1 },
      { status: 503 }
    );
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
      .select("id, materia, topico, subtopico, dificuldade, banca, ano, enunciado, figura_path, gabarito, tipo, edicao, etapa, tipo_material, pais, solucao, categoria_banca, tipo_prova, fase_nivel, estrategias_esperadas, lema_id, lema_codigo", { count: "exact" });

    if (Array.isArray(ids) && ids.length > 0) {
      query = query
        .in("id", ids)
        .order("ano", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false });
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

      const dificuldadeValues = normalize(filters.dificuldade);
      if (dificuldadeValues.length > 0) {
        const conds: string[] = [];
        dificuldadeValues.forEach((v) => {
          const lower = v.toLowerCase();
          if (lower === "facil") conds.push("and(dificuldade.gte.1,dificuldade.lte.2)");
          else if (lower === "media") conds.push("dificuldade.eq.3");
          else if (lower === "dificil") conds.push("and(dificuldade.gte.4,dificuldade.lte.5)");
          else if (lower === "nao_classificada") {
            conds.push("dificuldade.is.null");
            conds.push("dificuldade.lt.1");
            conds.push("dificuldade.gt.5");
          }
        });
        if (conds.length > 0) query = query.or(conds.join(","));
      }

      if (filters.lema || filters.lema_codigo) {
        const cleanLema = String(filters.lema || filters.lema_codigo).trim().toUpperCase();
        if (cleanLema.startsWith("LEMA-")) {
          query = query.eq("lema_codigo", cleanLema);
        } else if (!isNaN(Number(cleanLema))) {
          query = query.or(`lema_id.eq.${cleanLema},lema_codigo.eq.LEMA-${cleanLema.padStart(4, "0")}`);
        } else {
          query = query.eq("lema_codigo", cleanLema);
        }
      }

      query = query
        .order("ano", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false })
        .range(offset, offset + limit - 1);
    } else {
      query = query
        .order("ano", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false })
        .range(offset, offset + limit - 1);
    }

    const { data, count, error } = await query;
    if (error) {
      console.error("Erro no POST /api/questions:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const sortedData = sortQuestionsByQuality(data || []);

    return NextResponse.json({
      questoes: sortedData,
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
