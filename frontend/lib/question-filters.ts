/** Shared taxonomy, query predicates and metadata-only facets for the question bank. */
export const CANONICAL_MATERIAS: ReadonlyArray<{ uiName: string; dbValue: string }> = [
  'Geometria Plana', 'Probabilidade e Combinatória', 'Álgebra', 'Teoria dos Números',
  'Polinômios e Complexos', 'Funções', 'Trigonometria', 'Geometria Espacial',
  'Geometria Analítica', 'Cálculo', 'Matemática Básica', 'Cálculo 3', 'Álgebra Linear',
  'Matemática', 'Álgebra Linear I', 'Álgebra Linear II',
].map(dbValue => ({ dbValue, uiName: dbValue === 'Matemática' ? 'Matemática (Geral)' : dbValue }));

const fold = (value: string) => value.trim().toLowerCase();
const UI_MATERIA_BY_FOLD = new Map<string, string>();
const DB_MATERIA_BY_FOLD = new Map<string, string>();
for (const entry of CANONICAL_MATERIAS) {
  UI_MATERIA_BY_FOLD.set(fold(entry.dbValue), entry.uiName);
  UI_MATERIA_BY_FOLD.set(fold(entry.uiName), entry.uiName);
  DB_MATERIA_BY_FOLD.set(fold(entry.dbValue), entry.dbValue);
  DB_MATERIA_BY_FOLD.set(fold(entry.uiName), entry.dbValue);
}
export function getUiMateriaName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return UI_MATERIA_BY_FOLD.get(fold(raw)) ?? null;
}
export function getDbMateriaValue(raw: string): string | null {
  return DB_MATERIA_BY_FOLD.get(fold(raw)) ?? null;
}
const DIFFICULTIES = ['facil', 'media', 'dificil', 'nao_classificada'] as const;
type Difficulty = typeof DIFFICULTIES[number];
export interface QuestionFilterInput {
  banca?: string[]; categoria_banca?: string[]; tipo_prova?: string[]; fase_nivel?: string[];
  tipo_material?: string[]; tem_figura?: boolean | null; materia?: string[]; topico?: string[];
  subtopico?: string[]; ano?: number[]; tipo?: string[]; dificuldade?: Difficulty[];
  search?: string | null; id?: number | null; ids?: number[] | null; lema?: string | null;
}
export interface MetadataRow {
  id: number; banca: string | null; categoria_banca: string | null; tipo_prova: string | null;
  fase_nivel: string | null; tipo_material: string | null; figura_path: string | null;
  ano: number | null; tipo: string | null; dificuldade: number | null; materia: string | null;
  topico: string | null; subtopico: string | null; lema_id: number | null; lema_codigo: string | null;
}
export interface QuestionTaxonomyIndex {
  rows: MetadataRow[];
  topicVariantsByLower: Map<string, string[]>; subtopicVariantsByLower: Map<string, string[]>;
  canonicalTopicsDisplay: Map<string, string>; canonicalSubtopicsDisplay: Map<string, string>;
}
const STRING_FILTERS = ['banca', 'categoria_banca', 'tipo_prova', 'fase_nivel', 'tipo_material', 'materia', 'topico', 'subtopico', 'tipo'] as const;
function strings(raw: unknown, split = true): string[] {
  const values = Array.isArray(raw) ? raw : typeof raw === 'string' ? (split ? raw.split(',') : [raw]) : [];
  return [...new Set(values.filter((v): v is string => typeof v === 'string').map(v => v.trim()).filter(v => v && v !== 'Todas' && v !== 'Todos'))];
}
function numbers(raw: unknown, field: string): number[] {
  if (raw == null || raw === '') return [];
  const rawList = Array.isArray(raw) ? raw : [raw];
  const values = rawList.flatMap(item => typeof item === 'string' ? item.split(',') : [item]);
  return [...new Set(values.map(value => {
    if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') throw new Error(`Invalid ${field}`);
    const number = Number(value);
    if (!Number.isSafeInteger(number)) throw new Error(`Invalid ${field}`);
    return number;
  }))];
}
export function parsePostFilterParams(raw: Record<string, unknown>, opts?: { ids?: unknown }): QuestionFilterInput {
  const filters: QuestionFilterInput = {};
  for (const key of STRING_FILTERS) filters[key] = strings(raw[key], key !== 'subtopico');
  filters.ano = numbers(raw.ano, 'ano');
  const rawIds = opts?.ids ?? raw.ids;
  if (rawIds != null && rawIds !== '') filters.ids = numbers(rawIds, 'ids');
  if (raw.id != null && raw.id !== '') {
    const ids = numbers(raw.id, 'id');
    if (ids.length !== 1) throw new Error('Invalid id');
    filters.id = ids[0];
  }
  const difficulties = strings(raw.dificuldade);
  if (difficulties.some(d => !DIFFICULTIES.includes(d as Difficulty))) throw new Error('Invalid dificuldade');
  filters.dificuldade = difficulties as Difficulty[];
  if (raw.tem_figura != null && raw.tem_figura !== '') {
    if (![true, false, 'true', 'false'].includes(raw.tem_figura as boolean | string)) throw new Error('Invalid tem_figura');
    filters.tem_figura = raw.tem_figura === true || raw.tem_figura === 'true';
  }
  if (typeof raw.search === 'string') filters.search = raw.search.trim() || null;
  const hasLema = raw.lema != null && (typeof raw.lema !== 'string' || raw.lema.trim() !== '');
  const lemaValue = hasLema ? raw.lema : (raw.lema_codigo ?? raw.lema);
  if (typeof lemaValue === 'string') {
    filters.lema = lemaValue.trim().toUpperCase() || null;
  } else if (typeof lemaValue === 'number') {
    if (!Number.isSafeInteger(lemaValue) || lemaValue < 0) throw new Error('Invalid lema');
    filters.lema = String(lemaValue).trim().toUpperCase();
  } else if (lemaValue != null) {
    throw new Error('Invalid lema');
  }
  return filters;
}
function nonEmptyGetAll(params: URLSearchParams, key: string): string[] | undefined {
  const values = params.getAll(key);
  return values.some(v => v !== '') ? values : undefined;
}
export function parseGetFilterParams(params: URLSearchParams): QuestionFilterInput {
  const raw: Record<string, unknown> = {};
  for (const key of STRING_FILTERS) raw[key] = key === 'subtopico' ? params.getAll(key) : params.getAll(key).flatMap(v => v.split(','));
  const ano = nonEmptyGetAll(params, 'ano');
  if (ano) raw.ano = ano;
  const ids = nonEmptyGetAll(params, 'ids');
  if (ids) raw.ids = ids;
  const id = nonEmptyGetAll(params, 'id');
  if (id) raw.id = id;
  const dificuldades = params.getAll('dificuldade');
  if (dificuldades.length > 0) raw.dificuldade = dificuldades.flatMap(v => v.split(','));
  const figuras = params.getAll('tem_figura').filter(v => v !== '');
  if (figuras.length > 0) {
    const unique = [...new Set(figuras)];
    raw.tem_figura = unique.length === 1 ? unique[0] : unique;
  }
  const search = params.get('search');
  if (search !== null) raw.search = search;
  const lema = params.get('lema');
  if (lema !== null) raw.lema = lema;
  const lemaCodigo = params.get('lema_codigo');
  if (lemaCodigo !== null) raw.lema_codigo = lemaCodigo;
  return parsePostFilterParams(raw);
}
export function escapePostgrestQuoted(value: string): string { return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }
export function escapeLikeLiteral(value: string): string { return value.replace(/[\\%_*]/g, '\\$&'); }
const quote = (value: string) => `"${escapePostgrestQuoted(value)}"`;
export function buildPreferMateriaClause(value: string): string {
  return `materia.eq.${quote(getDbMateriaValue(value) ?? value.trim())}`;
}

type Column = keyof MetadataRow | 'enunciado';
type Leaf = { column: Column; op: 'eq' | 'exact' | 'contains' | 'gte' | 'lte' | 'lt' | 'gt' | 'is' | 'not_is'; value: string | number | null };
type Predicate = Leaf | { op: 'and' | 'or'; terms: Predicate[] };
const leaf = (column: Column, op: Leaf['op'], value: Leaf['value']): Leaf => ({ column, op, value });
const group = (op: 'and' | 'or', terms: Predicate[]): Predicate => ({ op, terms });
function getColumnVariants(index: QuestionTaxonomyIndex, column: Column): Map<string, string[]> | undefined {
  if (column === 'topico') return index.topicVariantsByLower;
  if (column === 'subtopico') return index.subtopicVariantsByLower;
  if (column === 'banca') return getIndexExtras(index).bancaVariantsByLower;
  if (column === 'materia') return getIndexExtras(index).materiaVariantsByLower;
  if (column === 'tipo') return getIndexExtras(index).tipoVariantsByLower;
  return undefined;
}
function exact(column: Column, value: string, index?: QuestionTaxonomyIndex | null): Predicate {
  const variants = index ? getColumnVariants(index, column) : undefined;
  // Resolve raw whitespace/case variants too; SQL equality then matches precisely the counted rows.
  const known = variants
    ? variants.get(fold(value))
    : index?.rows.filter(r => typeof r[column as keyof MetadataRow] === 'string' && fold(String(r[column as keyof MetadataRow])) === fold(value)).map(r => String(r[column as keyof MetadataRow]));
  if (known?.length) return group('or', [...new Set(known)].sort().map(raw => leaf(column, 'eq', raw)));
  return leaf(column, 'exact', value.trim());
}
function bank(value: string, index?: QuestionTaxonomyIndex | null): Predicate {
  const level = fold(value).match(/n[ií]vel ([23])/);
  if (level) return group('and', [leaf('banca', 'contains', 'OBM'), leaf('fase_nivel', 'contains', `Nível ${level[1]}`)]);
  return exact('banca', value, index);
}
function difficulty(value: Difficulty): Predicate {
  if (value === 'facil') return group('and', [leaf('dificuldade', 'gte', 1), leaf('dificuldade', 'lte', 2)]);
  if (value === 'media') return leaf('dificuldade', 'eq', 3);
  if (value === 'dificil') return group('and', [leaf('dificuldade', 'gte', 4), leaf('dificuldade', 'lte', 5)]);
  return group('or', [leaf('dificuldade', 'is', null), leaf('dificuldade', 'lt', 1), leaf('dificuldade', 'gt', 5)]);
}
function searchId(filters: QuestionFilterInput): number | null {
  const match = filters.search?.trim().match(/^#(\d+)$/);
  return match ? Number(match[1]) : null;
}
function predicates(filters: QuestionFilterInput, index?: QuestionTaxonomyIndex | null): Predicate[] {
  const result: Predicate[] = [];
  for (const key of STRING_FILTERS) {
    const values = filters[key];
    if (!values?.length) continue;
    result.push(group('or', values.map(value => {
      if (key === 'banca') return bank(value, index);
      if (key === 'materia') return exact(key, getDbMateriaValue(value) ?? value.trim(), index);
      if (['categoria_banca', 'tipo_prova', 'fase_nivel', 'tipo_material'].includes(key)) return leaf(key, 'contains', value);
      return exact(key, value, index);
    })));
  }
  if (filters.ano?.length) result.push(group('or', filters.ano.map(value => leaf('ano', 'eq', value))));
  if (filters.dificuldade?.length) result.push(group('or', filters.dificuldade.map(difficulty)));
  if (filters.tem_figura != null) result.push(leaf('figura_path', filters.tem_figura ? 'not_is' : 'is', null));
  if (filters.id != null) result.push(leaf('id', 'eq', filters.id));
  if (filters.ids != null) result.push(group('or', filters.ids.map(id => leaf('id', 'eq', id))));
  if (filters.lema) {
    const value = filters.lema.trim().toUpperCase();
    result.push(/^\d+$/.test(value) ? group('or', [leaf('lema_id', 'eq', Number(value)), leaf('lema_codigo', 'eq', `LEMA-${value.padStart(4, '0')}`)]) : leaf('lema_codigo', 'eq', value));
  }
  const id = searchId(filters);
  if (id != null) result.push(leaf('id', 'eq', id));
  if (filters.search?.trim() && id == null) result.push(group('or', (['enunciado', 'topico', 'subtopico', 'materia'] as const).map(column => leaf(column, 'contains', filters.search!.trim()))));
  return result;
}
function serialize(predicate: Predicate): string {
  if ('terms' in predicate) return `${predicate.op}(${predicate.terms.map(serialize).join(',')})`;
  const { column, op, value } = predicate;
  if (op === 'exact' || op === 'contains') return `${column}.ilike.${quote(op === 'contains' ? `%${escapeLikeLiteral(String(value))}%` : escapeLikeLiteral(String(value)))}`;
  if (op === 'not_is') return `${column}.not.is.null`;
  return `${column}.${op}.${typeof value === 'string' ? quote(value) : value === null ? 'null' : value}`;
}
export type CompiledFilterPredicate = { kind: 'eq' | 'in' | 'or' | 'is' | 'not_is'; column?: string; value?: unknown };
export function compileFilterPredicatesForTest(filters: QuestionFilterInput, index?: QuestionTaxonomyIndex | null): CompiledFilterPredicate[] {
  return predicates(filters, index).map(p => {
    if ('terms' in p && p.op === 'or') {
      // An empty ID selection must match nothing, rather than dropping the restriction.
      if (!p.terms.length) return { kind: 'in', column: 'id', value: [] };
      const parts = p.terms.flatMap(term => 'terms' in term && term.op === 'or' ? term.terms : [term]);
      return { kind: 'or', value: parts.map(serialize).join(',') };
    }
    if ('column' in p && (p.op === 'is' || p.op === 'not_is' || p.op === 'eq')) return { kind: p.op, column: p.column, value: p.value };
    return { kind: 'or', value: serialize(p) };
  });
}
export function buildPostgrestFilterClauses(filters: QuestionFilterInput, index?: QuestionTaxonomyIndex | null) {
  return { andEqOrClauses: compileFilterPredicatesForTest(filters, index) };
}
// Supabase builders are fluent and generic over a schema owned by the caller.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyFiltersToPostgrestQuery(query: any, filters: QuestionFilterInput, index?: QuestionTaxonomyIndex | null): any {
  return compileFilterPredicatesForTest(filters, index).reduce((current, p) => {
    if (p.kind === 'or') return current.or(p.value);
    if (p.kind === 'not_is') return current.not(p.column, 'is', null);
    return current[p.kind](p.column, p.value);
  }, query);
}
type RowMatcher = (row: MetadataRow) => boolean;
function compilePredicate(p: Predicate): RowMatcher {
  if ('terms' in p) {
    const terms = p.terms.map(compilePredicate);
    if (p.op === 'or') {
      if (terms.length === 0) return () => false;
      if (terms.length === 1) return terms[0];
      return row => {
        for (let i = 0; i < terms.length; i++) if (terms[i](row)) return true;
        return false;
      };
    }
    if (terms.length === 0) return () => true;
    if (terms.length === 1) return terms[0];
    return row => {
      for (let i = 0; i < terms.length; i++) if (!terms[i](row)) return false;
      return true;
    };
  }
  const col = p.column as keyof MetadataRow;
  const val = p.value;
  if (p.op === 'is') return row => row[col] == null;
  if (p.op === 'not_is') return row => row[col] != null;
  if (p.op === 'exact') {
    const target = fold(String(val));
    return row => { const raw = row[col]; return raw != null && fold(String(raw)) === target; };
  }
  if (p.op === 'contains') {
    const target = fold(String(val));
    return row => { const raw = row[col]; return raw != null && fold(String(raw)).includes(target); };
  }
  if (p.op === 'eq') return row => row[col] === val;
  if (typeof val !== 'number') return () => false;
  if (p.op === 'gte') return row => { const raw = row[col]; return typeof raw === 'number' && raw >= val; };
  if (p.op === 'lte') return row => { const raw = row[col]; return typeof raw === 'number' && raw <= val; };
  if (p.op === 'lt') return row => { const raw = row[col]; return typeof raw === 'number' && raw < val; };
  return row => { const raw = row[col]; return typeof raw === 'number' && raw > val; };
}
function compileRowMatcher(filters: QuestionFilterInput, matchingIdsFromSearch?: Set<number> | null): RowMatcher {
  const textual = Boolean(filters.search?.trim()) && searchId(filters) == null;
  if (textual && !matchingIdsFromSearch) throw new Error('Text search requires matchingIdsFromSearch');
  const memoryFilters = textual ? { ...filters, search: null } : filters;
  const compiled = predicates(memoryFilters).map(compilePredicate);
  if (!matchingIdsFromSearch && compiled.length === 0) return () => true;
  return row => {
    if (matchingIdsFromSearch && !matchingIdsFromSearch.has(row.id)) return false;
    for (let i = 0; i < compiled.length; i++) if (!compiled[i](row)) return false;
    return true;
  };
}
export function matchesMetadataRow(row: MetadataRow, filters: QuestionFilterInput, matchingIdsFromSearch?: Set<number> | null): boolean {
  return compileRowMatcher(filters, matchingIdsFromSearch)(row);
}
export function rewritePreferenceGroupForNonNull(group: string): string {
  return group.replace(/(\w+)\.(eq|ilike)\.("(?:\\.|[^"\\])*"|[^,()]+)/g,
    (_, column: string, operator: string, value: string) => `and(${column}.not.is.null,${column}.${operator}.${value})`);
}

const CHUNK_SIZE = 1000;
const METADATA_TTL_MS = 120_000;
const CHUNK_CONCURRENCY = 6;
const METADATA_COLUMNS = 'id,banca,categoria_banca,tipo_prova,fase_nivel,tipo_material,figura_path,ano,tipo,dificuldade,materia,topico,subtopico,lema_id,lema_codigo';
export interface SupabaseLike {
  from(table: string): { select(columns: string, options?: { count: 'exact' }): {
    order(column: string, options: { ascending: boolean }): { range(from: number, to: number): PromiseLike<{ data: MetadataRow[] | null; count: number | null; error: { message: string } | null }> };
  } };
}
type CacheState = { index?: QuestionTaxonomyIndex; expiresAt?: number; inFlight?: Promise<QuestionTaxonomyIndex> };
const globals = globalThis as typeof globalThis & { __lemmasQuestionMetadataIndex?: CacheState };
function state(): CacheState { return globals.__lemmasQuestionMetadataIndex ??= {}; }
export function clearQuestionMetadataIndexCache(): void { globals.__lemmasQuestionMetadataIndex = {}; }
type ExtraIndexData = {
  bancaVariantsByLower: Map<string, string[]>;
  materiaVariantsByLower: Map<string, string[]>;
  tipoVariantsByLower: Map<string, string[]>;
  canonicalBancasDisplay: Map<string, string>;
};
const indexExtras = new WeakMap<QuestionTaxonomyIndex, ExtraIndexData>();
function labels(rows: MetadataRow[], column: 'topico' | 'subtopico' | 'banca' | 'materia' | 'tipo') {
  const counts = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const raw = row[column];
    if (!raw?.trim()) continue;
    const key = fold(raw);
    const variants = counts.get(key) ?? new Map<string, number>();
    variants.set(raw, (variants.get(raw) ?? 0) + 1); counts.set(key, variants);
  }
  const variants = new Map<string, string[]>(), display = new Map<string, string>();
  for (const [key, spellings] of counts) {
    variants.set(key, [...spellings.keys()].sort());
    const ranked = [...spellings].sort(([a, ac], [b, bc]) => bc - ac || lexical(a, b));
    display.set(key, ranked[0][0].trim());
  }
  return { variants, display };
}
function getIndexExtras(index: QuestionTaxonomyIndex): ExtraIndexData {
  let extras = indexExtras.get(index);
  if (!extras) {
    const bancas = labels(index.rows, 'banca');
    const materias = labels(index.rows, 'materia');
    const tipos = labels(index.rows, 'tipo');
    extras = {
      bancaVariantsByLower: bancas.variants,
      materiaVariantsByLower: materias.variants,
      tipoVariantsByLower: tipos.variants,
      canonicalBancasDisplay: bancas.display,
    };
    indexExtras.set(index, extras);
  }
  return extras;
}
function lexical(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0; }
function createIndex(rows: MetadataRow[]): QuestionTaxonomyIndex {
  const topics = labels(rows, 'topico'), subtopics = labels(rows, 'subtopico');
  const index: QuestionTaxonomyIndex = { rows, topicVariantsByLower: topics.variants, subtopicVariantsByLower: subtopics.variants, canonicalTopicsDisplay: topics.display, canonicalSubtopicsDisplay: subtopics.display };
  getIndexExtras(index);
  return index;
}
export function getQuestionMetadataIndex(supabase: SupabaseLike, opts: { forceRefresh?: boolean; ttlMs?: number } = {}): Promise<QuestionTaxonomyIndex> {
  const cache = state();
  if (cache.inFlight) return cache.inFlight;
  if (!opts.forceRefresh && cache.index && Date.now() < (cache.expiresAt ?? 0)) return Promise.resolve(cache.index);
  const load = async () => {
    const page = async (from: number, to: number, first = false) => {
      const response = await supabase.from('questoes').select(METADATA_COLUMNS, first ? { count: 'exact' } : undefined).order('id', { ascending: true }).range(from, to);
      if (response.error) throw new Error(response.error.message);
      if (!Array.isArray(response.data)) throw new Error('Metadata truncation: missing data');
      return response;
    };
    const first = await page(0, CHUNK_SIZE - 1, true);
    const total = first.count;
    if (typeof total !== 'number' || !Number.isSafeInteger(total) || total < 0) throw new Error('Invalid metadata count');
    if (first.data!.length !== Math.min(CHUNK_SIZE, total)) throw new Error('Metadata truncation in first chunk');
    const rows = [...first.data!];
    const pages = Math.ceil(total / CHUNK_SIZE);
    for (let start = 1; start < pages; start += CHUNK_CONCURRENCY) {
      const requests = Array.from({ length: Math.min(CHUNK_CONCURRENCY, pages - start) }, (_, offset) => {
        const from = (start + offset) * CHUNK_SIZE, to = Math.min(from + CHUNK_SIZE, total) - 1;
        return page(from, to).then(response => {
          if (response.data!.length !== to - from + 1) throw new Error(`Metadata truncation at ${from}`);
          return response.data!;
        });
      });
      const batch = await Promise.all(requests);
      rows.push(...batch.flat());
    }
    if (new Set(rows.map(r => r.id)).size !== total) throw new Error('Metadata truncation: duplicate IDs');
    const index = createIndex(rows);
    if (state() === cache) { cache.index = index; cache.expiresAt = Date.now() + (opts.ttlMs ?? METADATA_TTL_MS); }
    return index;
  };
  const pending = load().finally(() => { if (cache.inFlight === pending) cache.inFlight = undefined; });
  cache.inFlight = pending;
  return pending;
}

type NamedFacet = { name: string; count: number };
type IdFacet = { id: string; label: string; count: number };
export interface CrossFilteredFacetsResult {
  bancas: Array<NamedFacet & { categoria: string | null }>; categorias_banca: IdFacet[]; tipos_prova: IdFacet[]; fases: IdFacet[];
  materias: NamedFacet[]; materias_com_topicos: Array<NamedFacet & { topicos: NamedFacet[] }>;
  topicos: NamedFacet[]; subtopicos: NamedFacet[]; anos: Array<{ ano?: number; label?: string; count: number }>;
  ano_min: number | null; ano_max: number | null; tipos: IdFacet[]; dificuldades: IdFacet[]; total_filtered: number;
}
const CATEGORIA_BANCA_LABELS: Record<string, { id: string; label: string }> = {
  'concurso militar': { id: 'Concurso Militar', label: 'Concursos Militares' },
  'vestibular & superior': { id: 'Vestibular & Superior', label: 'Vestibulares & Superior' },
  'olimpíadas': { id: 'Olimpíadas', label: 'Olimpíadas de Matemática' },
};
const TIPO_LABELS: Record<string, string> = { objetiva: 'Objetivas', discursiva: 'Discursivas' };
const DIFFICULTY_LABELS: Record<Difficulty, string> = { facil: 'Fácil', media: 'Média', dificil: 'Difícil', nao_classificada: 'Não Classificada' };
function sortNamedCounts(counts?: Map<string, number>): NamedFacet[] {
  if (!counts || counts.size === 0) return [];
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || lexical(a.name, b.name));
}
function aggregate(rows: MetadataRow[], label: (row: MetadataRow) => string | null): NamedFacet[] {
  const counts = new Map<string, number>();
  for (const row of rows) { const value = label(row); if (value) counts.set(value, (counts.get(value) ?? 0) + 1); }
  return sortNamedCounts(counts);
}
export function computeCrossFilteredFacets(index: QuestionTaxonomyIndex, filters: QuestionFilterInput, matchingIdsFromSearch?: Set<number> | null): CrossFilteredFacetsResult {
  const baseMatcher = compileRowMatcher(filters, matchingIdsFromSearch);
  const baseRows = index.rows.filter(baseMatcher);
  const subset = (dimension?: keyof QuestionFilterInput) => {
    if (!dimension) return baseRows;
    const value = filters[dimension];
    const active = Array.isArray(value) ? value.length > 0 : value != null && value !== '';
    if (!active) return baseRows;
    return index.rows.filter(compileRowMatcher({ ...filters, [dimension]: undefined }, matchingIdsFromSearch));
  };
  const named = (key: 'topico' | 'subtopico', all: string) => {
    const rows = subset(key);
    const displayMap = key === 'topico' ? index.canonicalTopicsDisplay : index.canonicalSubtopicsDisplay;
    return [{ name: all, count: rows.length }, ...aggregate(rows, row => {
      const raw = row[key];
      return raw ? displayMap.get(fold(raw)) ?? null : null;
    })];
  };
  const idFacets = (key: 'categoria_banca' | 'tipo_prova' | 'fase_nivel' | 'tipo', all: string, label: string): IdFacet[] => {
    const rows = subset(key);
    const items = aggregate(rows, row => {
      const raw = row[key]?.trim();
      if (!raw) return null;
      if (key === 'tipo') return fold(raw);
      if (key === 'categoria_banca') return CATEGORIA_BANCA_LABELS[fold(raw)]?.id ?? raw;
      return raw;
    }).map(item => ({
      id: item.name,
      label: key === 'tipo'
        ? (TIPO_LABELS[item.name] ?? `${item.name.charAt(0).toUpperCase()}${item.name.slice(1)}`)
        : key === 'categoria_banca'
          ? (CATEGORIA_BANCA_LABELS[fold(item.name)]?.label ?? item.name)
          : item.name,
      count: item.count,
    }));
    return [{ id: all, label, count: rows.length }, ...items];
  };
  const yearRows = subset('ano');
  const yearCounts = new Map<number, number>();
  for (const row of yearRows) if (row.ano != null) yearCounts.set(row.ano, (yearCounts.get(row.ano) ?? 0) + 1);
  const years = [...yearCounts].map(([ano, count]) => ({ ano, count })).sort((a, b) => b.ano - a.ano);
  const min = years.length ? years[years.length - 1].ano : null, max = years[0]?.ano ?? null;
  const difficultyRows = subset('dificuldade');
  const diffCounts: Record<Difficulty, number> = { facil: 0, media: 0, dificil: 0, nao_classificada: 0 };
  for (const row of difficultyRows) {
    const d = row.dificuldade;
    if (typeof d !== 'number' || Number.isNaN(d) || d < 1 || d > 5) diffCounts.nao_classificada++;
    else if (d <= 2) diffCounts.facil++;
    else if (d === 3) diffCounts.media++;
    else if (d >= 4) diffCounts.dificil++;
    else diffCounts.nao_classificada++;
  }
  const materiaRows = subset('materia');
  const materiaCounts = new Map<string, number>();
  const topicsByMateria = new Map<string, Map<string, number>>();
  for (const row of materiaRows) {
    const uiMateria = getUiMateriaName(row.materia);
    if (!uiMateria) continue;
    materiaCounts.set(uiMateria, (materiaCounts.get(uiMateria) ?? 0) + 1);
    if (row.topico) {
      const topicLabel = index.canonicalTopicsDisplay.get(fold(row.topico));
      if (topicLabel) {
        let counts = topicsByMateria.get(uiMateria);
        if (!counts) { counts = new Map<string, number>(); topicsByMateria.set(uiMateria, counts); }
        counts.set(topicLabel, (counts.get(topicLabel) ?? 0) + 1);
      }
    }
  }
  const materiaItems = sortNamedCounts(materiaCounts);
  const materias: NamedFacet[] = [{ name: 'Todas', count: materiaRows.length }, ...materiaItems];
  const materias_com_topicos = materiaItems.map(item => ({ ...item, topicos: sortNamedCounts(topicsByMateria.get(item.name)) }));
  const bankRows = subset('banca');
  const bankLabels = getIndexExtras(index).canonicalBancasDisplay;
  const bankCounts = new Map<string, number>();
  const bankCategories = new Map<string, Map<string, number>>();
  for (const row of bankRows) {
    if (!row.banca?.trim()) continue;
    const bankKey = fold(row.banca);
    const displayName = bankLabels.get(bankKey) ?? row.banca.trim();
    bankCounts.set(displayName, (bankCounts.get(displayName) ?? 0) + 1);
    const category = row.categoria_banca?.trim();
    if (category) {
      let counts = bankCategories.get(bankKey);
      if (!counts) { counts = new Map<string, number>(); bankCategories.set(bankKey, counts); }
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }
  const bancas = [{ name: 'Todas', count: bankRows.length, categoria: 'Todas' }, ...sortNamedCounts(bankCounts).map(item => ({
    ...item,
    categoria: sortNamedCounts(bankCategories.get(fold(item.name)))[0]?.name ?? null,
  }))];
  return {
    bancas, categorias_banca: idFacets('categoria_banca', 'Todas', 'Todas as Categorias'),
    tipos_prova: idFacets('tipo_prova', 'Todos', 'Todos os Tipos de Prova'), fases: idFacets('fase_nivel', 'Todas', 'Todas as Fases / Níveis'),
    materias, materias_com_topicos,
    topicos: named('topico', 'Todos'), subtopicos: named('subtopico', 'Todos'),
    anos: [{ label: min == null ? 'Todos os Anos da Prova' : `Todos os Anos da Prova (${min}–${max})`, count: yearRows.length }, ...years], ano_min: min, ano_max: max,
    tipos: idFacets('tipo', 'Todos', 'Todos os Tipos'),
    dificuldades: [{ id: 'Todas', label: 'Todas', count: difficultyRows.length }, ...DIFFICULTIES.filter(value => diffCounts[value] > 0).map(value => ({ id: value, label: DIFFICULTY_LABELS[value], count: diffCounts[value] }))],
    total_filtered: baseRows.length,
  };
}
