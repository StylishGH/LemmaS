import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { sortQuestionsByQuality } from "@/lib/quality-score";
import {
  applyFiltersToPostgrestQuery,
  buildPreferMateriaClause,
  computeCrossFilteredFacets,
  escapeLikeLiteral,
  escapePostgrestQuoted,
  getQuestionMetadataIndex,
  parseGetFilterParams,
  parsePostFilterParams,
  rewritePreferenceGroupForNonNull,
  type QuestionFilterInput,
} from "@/lib/question-filters";

const QUESTION_SELECT_COLUMNS =
  "id, materia, topico, subtopico, dificuldade, banca, ano, enunciado, figura_path, tipo, edicao, etapa, tipo_material, pais, categoria_banca, tipo_prova, fase_nivel, gabarito, solucao, estrategias_esperadas, lema_id, lema_codigo";

const SEARCH_CHUNK_SIZE = 1000;
const SEARCH_CHUNK_CONCURRENCY = 6;

function parsePositiveInt(raw: unknown, fallback: number): number {
  const parsed = typeof raw === "number" ? raw : parseInt(String(raw ?? ""), 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function splitPreferenceValues(params: URLSearchParams, key: string): string[] {
  const values = params
    .getAll(key)
    .flatMap((raw) => raw.split(","))
    .map((v) => v.trim())
    .filter((v) => v.length > 0 && v !== "Todas" && v !== "Todos");
  return [...new Set(values)];
}

function isPostSentinel(value: unknown): boolean {
  return value === "Todos" || value === "Todas" || value === "";
}

function sanitizePostFilters(raw: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (isPostSentinel(value)) {
      cleaned[key] = undefined;
    } else if (Array.isArray(value)) {
      const valid = value.filter((item) => !isPostSentinel(item));
      cleaned[key] = value.length === 0 ? value : (valid.length > 0 ? valid : undefined);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

function fisherYatesShuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function loadSearchMatchingIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  searchText: string
): Promise<Set<number>> {
  const quotedPattern = `"${escapePostgrestQuoted(`%${escapeLikeLiteral(searchText)}%`)}"`;
  const searchOr = (["enunciado", "topico", "subtopico", "materia"] as const)
    .map((col) => `${col}.ilike.${quotedPattern}`)
    .join(",");

  const first = await supabase
    .from("questoes")
    .select("id", { count: "exact" })
    .or(searchOr)
    .order("id", { ascending: true })
    .range(0, SEARCH_CHUNK_SIZE - 1);

  if (first.error) throw new Error(first.error.message);
  const totalMatches = first.count;
  if (typeof totalMatches !== "number" || !Number.isSafeInteger(totalMatches) || totalMatches < 0) {
    throw new Error("Invalid search match count");
  }
  if (!Array.isArray(first.data) || first.data.length !== Math.min(SEARCH_CHUNK_SIZE, totalMatches)) {
    throw new Error("Search match truncation in first chunk");
  }

  const matchingIds = new Set<number>();
  for (const row of first.data) matchingIds.add(row.id);

  const totalPages = Math.ceil(totalMatches / SEARCH_CHUNK_SIZE);
  for (let start = 1; start < totalPages; start += SEARCH_CHUNK_CONCURRENCY) {
    const batchCount = Math.min(SEARCH_CHUNK_CONCURRENCY, totalPages - start);
    const chunks = await Promise.all(
      Array.from({ length: batchCount }, async (_, offsetIndex) => {
        const from = (start + offsetIndex) * SEARCH_CHUNK_SIZE;
        const to = Math.min(from + SEARCH_CHUNK_SIZE, totalMatches) - 1;
        const res = await supabase
          .from("questoes")
          .select("id")
          .or(searchOr)
          .order("id", { ascending: true })
          .range(from, to);
        if (res.error) throw new Error(res.error.message);
        if (!Array.isArray(res.data) || res.data.length !== to - from + 1) {
          throw new Error(`Search match truncation at ${from}`);
        }
        return res.data;
      })
    );
    for (const chunk of chunks) {
      for (const row of chunk) matchingIds.add(row.id);
    }
  }

  return matchingIds;
}

function buildCohorts(searchParams: URLSearchParams): string[] {
  // Preferences only affect ordering; explicit filters define the available set.
  const preferenceGroups: string[] = [];
  for (const [param, column] of [
    ["prefer_banca", "banca"],
    ["prefer_categoria_banca", "categoria_banca"],
  ] as const) {
    const values = splitPreferenceValues(searchParams, param);
    if (values.length > 0) {
      preferenceGroups.push(
        `or(${values
          .map((v) => `${column}.ilike."${escapePostgrestQuoted(`%${escapeLikeLiteral(v)}%`)}"`)
          .join(",")})`
      );
    }
  }
  const preferredSubjects = splitPreferenceValues(searchParams, "prefer_materia");
  if (preferredSubjects.length > 0) {
    preferenceGroups.push(`or(${preferredSubjects.map(buildPreferMateriaClause).join(",")})`);
  }
  if (preferenceGroups.length === 0) return [];

  // Explicit non-null checks make each predicate two-valued, keeping the
  // complementary groups exhaustive even when catalog metadata is missing.
  const predicates = preferenceGroups.map(rewritePreferenceGroupForNonNull);
  // Bank/category preferences take precedence, followed by subject preferences.
  // Each group is disjoint, so pagination never repeats or excludes catalog items.
  const cohorts: string[] = [];
  const appendCohorts = (index: number, terms: string[]) => {
    if (index === predicates.length) {
      cohorts.push(`and(${terms.join(",")})`);
      return;
    }
    appendCohorts(index + 1, [...terms, predicates[index]]);
    appendCohorts(index + 1, [...terms, `not.${predicates[index]}`]);
  };
  appendCohorts(0, []);
  return cohorts;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const searchParams = req.nextUrl.searchParams;
  const page = parsePositiveInt(searchParams.get("page"), 1);
  const limit = parsePositiveInt(searchParams.get("limit"), 15);
  const offset = (page - 1) * limit;

  let filters: QuestionFilterInput;
  try {
    filters = parseGetFilterParams(searchParams);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Parâmetros de filtro inválidos";
    return NextResponse.json(
      { error: message, questoes: [], total: 0, page, limit, total_pages: 0 },
      { status: 400 }
    );
  }

  try {
    const searchTrimmed = filters.search?.trim() ?? "";
    const isIdSearch = /^#\d+$/.test(searchTrimmed);
    const hasTextSearch = searchTrimmed.length > 0 && !isIdSearch;

    const [metadataIndex, matchingIdsFromSearch] = await Promise.all([
      getQuestionMetadataIndex(supabase),
      hasTextSearch ? loadSearchMatchingIds(supabase, searchTrimmed) : Promise.resolve(null),
    ]);

    const buildBaseQuery = (head = false, exactCount = true) => {
      const base = supabase
        .from("questoes")
        .select(QUESTION_SELECT_COLUMNS, {
          count: exactCount ? "exact" : undefined,
          head,
        });
      return applyFiltersToPostgrestQuery(base, filters, metadataIndex);
    };

    const cohorts = buildCohorts(searchParams);
    const ordered = <T extends { order: (col: string, opts: { ascending: boolean; nullsFirst?: boolean }) => T }>(
      q: T
    ): T => q.order("ano", { ascending: false, nullsFirst: false }).order("id", { ascending: false });

    const loadPage = async () => {
      if (cohorts.length === 0) {
        return ordered(buildBaseQuery()).range(offset, offset + limit - 1);
      }
      // Fetch the page directly. Counting every cohort first makes even page 1
      // wait for expensive complementary text searches across the full catalog.
      const loadRankedRows = async () => {
        const rows: Record<string, unknown>[] = [];
        let remainingOffset = offset;
        for (const cohort of cohorts) {
          const remaining = limit - rows.length;
          if (remaining === 0) break;
          const result = await ordered(buildBaseQuery(false, false).or(cohort)).range(
            remainingOffset,
            remainingOffset + remaining - 1
          );
          if (result.error && result.error.code !== "PGRST103") return result;
          if (result.error || (remainingOffset > 0 && !result.data?.length)) {
            // A deep page can lie beyond this cohort. Only then is its exact
            // size needed to translate the offset into the following cohort.
            const size = await buildBaseQuery(true).or(cohort);
            if (size.error) return size;
            remainingOffset = Math.max(0, remainingOffset - (size.count || 0));
            continue;
          }
          rows.push(...(result.data || []));
          // Fewer rows than requested means this cohort is exhausted.
          remainingOffset = 0;
        }
        return { data: rows, error: null };
      };
      // The total depends on explicit filters, never on profile preferences.
      const [totalResult, ranked] = await Promise.all([buildBaseQuery(true), loadRankedRows()]);
      if (totalResult.error) return totalResult;
      if (ranked.error) return ranked;
      return { ...totalResult, data: ranked.data };
    };

    const mainResult = await loadPage();
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

    const totalFiltered = count || 0;
    const facets = computeCrossFilteredFacets(metadataIndex, filters, matchingIdsFromSearch);

    return NextResponse.json({
      questoes: data || [],
      total: totalFiltered,
      page,
      limit,
      total_pages: totalFiltered > 0 ? Math.ceil(totalFiltered / limit) : 0,
      bancas: facets.bancas,
      categorias_banca: facets.categorias_banca,
      tipos_prova: facets.tipos_prova,
      fases: facets.fases,
      materias: facets.materias,
      materias_com_topicos: facets.materias_com_topicos,
      topicos: facets.topicos,
      subtopicos: facets.subtopicos,
      anos: facets.anos,
      ano_min: facets.ano_min,
      ano_max: facets.ano_max,
      tipos: facets.tipos,
      dificuldades: facets.dificuldades,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("Exceção no /api/questions:", message);
    // Sem snapshot fixo: devolver um total antigo como se fosse atual era
    // a origem do total antigo na vitrine. Em falha, a página mostra estado
    // vazio ("—") em vez de um número inventado.
    return NextResponse.json(
      { error: message, questoes: [], total: 0, total_pages: 0 },
      { status: 503 }
    );
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  try {
    const body = await req.json();
    const { ids, filters, limit: rawLimit = 100, page: rawPage = 1, shuffle = false } = body || {};
    const page = parsePositiveInt(rawPage, 1);
    const limit = parsePositiveInt(rawLimit, 100);
    const offset = Math.max(0, (page - 1) * limit);

    let query = supabase
      .from("questoes")
      .select(QUESTION_SELECT_COLUMNS, { count: "exact" });

    if (Array.isArray(ids) && ids.length > 0) {
      query = query
        .in("id", ids)
        .order("ano", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false });
    } else if (filters && typeof filters === "object" && !Array.isArray(filters)) {
      let parsedFilters: QuestionFilterInput;
      try {
        parsedFilters = parsePostFilterParams(sanitizePostFilters(filters as Record<string, unknown>));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Filtros inválidos";
        return NextResponse.json({ error: message }, { status: 400 });
      }
      const metadataIndex = await getQuestionMetadataIndex(supabase);
      query = applyFiltersToPostgrestQuery(query, parsedFilters, metadataIndex)
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

    // shuffle=true preserva a ordem aleatória em vez de reordenar por quality score.
    const sortedData = shuffle
      ? fisherYatesShuffle(data || [])
      : sortQuestionsByQuality(data || []);

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
