/** Shared taxonomy, query predicates and metadata-only facets for the question bank. */
export const CANONICAL_MATERIAS: ReadonlyArray<{ uiName: string; dbValue: string }> = [
  'Geometria Plana', 'Probabilidade e Combinatória', 'Álgebra', 'Teoria dos Números',
  'Polinômios e Complexos', 'Funções', 'Trigonometria', 'Geometria Espacial',
  'Geometria Analítica', 'Cálculo', 'Matemática Básica', 'Cálculo 3', 'Álgebra Linear',
  'Matemática', 'Álgebra Linear I', 'Álgebra Linear II',
].map(dbValue => ({ dbValue, uiName: dbValue === 'Matemática' ? 'Matemática (Geral)' : dbValue }));

const fold = (value: string) => value.trim().toLowerCase();
export function getUiMateriaName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return CANONICAL_MATERIAS.find(m => fold(m.dbValue) === fold(raw) || fold(m.uiName) === fold(raw))?.uiName ?? null;
}
export function getDbMateriaValue(raw: string): string | null {
  return CANONICAL_MATERIAS.find(m => fold(m.dbValue) === fold(raw) || fold(m.uiName) === fold(raw))?.dbValue ?? null;
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
  const values = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : [raw];
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
  if (raw.ids != null || opts?.ids != null) filters.ids = numbers(opts?.ids ?? raw.ids, 'ids');
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
  for (const key of ['search', 'lema'] as const) {
    const value = raw[key] ?? (key === 'lema' ? raw.lema_codigo : undefined);
    if (typeof value === 'string') filters[key] = value.trim() || null;
  }
  return filters;
}
export function parseGetFilterParams(params: URLSearchParams): QuestionFilterInput {
  const raw: Record<string, unknown> = Object.fromEntries(params);
  for (const key of STRING_FILTERS) raw[key] = key === 'subtopico' ? params.getAll(key) : params.getAll(key).flatMap(v => v.split(','));
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
function exact(column: Column, value: string, index?: QuestionTaxonomyIndex | null): Predicate {
  const variants = column === 'topico' ? index?.topicVariantsByLower : column === 'subtopico' ? index?.subtopicVariantsByLower : undefined;
  // Resolve raw whitespace/case variants too; SQL equality then matches precisely the counted rows.
  const known = variants?.get(fold(value)) ?? index?.rows.filter(r => typeof r[column as keyof MetadataRow] === 'string' && fold(String(r[column as keyof MetadataRow])) === fold(value)).map(r => String(r[column as keyof MetadataRow]));
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
      if (key === 'materia') {
        const dbValue = getDbMateriaValue(value) ?? value.trim();
        return index ? exact(key, dbValue, index) : leaf(key, 'eq', dbValue);
      }
      if (key === 'tipo') return leaf(key, 'eq', fold(value));
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
function evaluate(row: MetadataRow, p: Predicate): boolean {
  if ('terms' in p) return p.op === 'or' ? p.terms.some(term => evaluate(row, term)) : p.terms.every(term => evaluate(row, term));
  const raw = row[p.column as keyof MetadataRow];
  if (p.op === 'is') return raw == null;
  if (p.op === 'not_is') return raw != null;
  if (raw == null) return false;
  if (p.op === 'exact') return fold(String(raw)) === fold(String(p.value));
  if (p.op === 'contains') return fold(String(raw)).includes(fold(String(p.value)));
  if (p.op === 'eq') return p.column === 'materia' ? fold(String(raw)) === fold(String(p.value)) : raw === p.value;
  if (typeof raw !== 'number' || typeof p.value !== 'number') return false;
  if (p.op === 'gte') return raw >= p.value;
  if (p.op === 'lte') return raw <= p.value;
  if (p.op === 'lt') return raw < p.value;
  return raw > p.value;
}
export function matchesMetadataRow(row: MetadataRow, filters: QuestionFilterInput, matchingIdsFromSearch?: Set<number> | null): boolean {
  if (matchingIdsFromSearch && !matchingIdsFromSearch.has(row.id)) return false;
  const textual = filters.search?.trim() && searchId(filters) == null;
  if (textual && !matchingIdsFromSearch) throw new Error('Text search requires matchingIdsFromSearch');
  const memoryFilters = textual ? { ...filters, search: null } : filters;
  return predicates(memoryFilters).every(p => evaluate(row, p));
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
function labels(rows: MetadataRow[], column: 'topico' | 'subtopico') {
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
function lexical(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0; }
function createIndex(rows: MetadataRow[]): QuestionTaxonomyIndex {
  const topics = labels(rows, 'topico'), subtopics = labels(rows, 'subtopico');
  return { rows, topicVariantsByLower: topics.variants, subtopicVariantsByLower: subtopics.variants, canonicalTopicsDisplay: topics.display, canonicalSubtopicsDisplay: subtopics.display };
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
function aggregate(rows: MetadataRow[], label: (row: MetadataRow) => string | null): NamedFacet[] {
  const counts = new Map<string, number>();
  for (const row of rows) { const value = label(row); if (value) counts.set(value, (counts.get(value) ?? 0) + 1); }
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || lexical(a.name, b.name));
}
export function computeCrossFilteredFacets(index: QuestionTaxonomyIndex, filters: QuestionFilterInput, matchingIdsFromSearch?: Set<number> | null): CrossFilteredFacetsResult {
  const subset = (dimension?: keyof QuestionFilterInput) => index.rows.filter(row => matchesMetadataRow(row, dimension ? { ...filters, [dimension]: undefined } : filters, matchingIdsFromSearch));
  const named = (key: 'banca' | 'materia' | 'topico' | 'subtopico', all: string) => {
    const rows = subset(key);
    const items = aggregate(rows, row => {
      if (key === 'materia') return getUiMateriaName(row.materia);
      if (key === 'topico') return index.canonicalTopicsDisplay.get(fold(row.topico ?? '')) ?? null;
      if (key === 'subtopico') return index.canonicalSubtopicsDisplay.get(fold(row.subtopico ?? '')) ?? null;
      return row[key];
    });
    return [{ name: all, count: rows.length }, ...items];
  };
  const idFacets = (key: 'categoria_banca' | 'tipo_prova' | 'fase_nivel' | 'tipo', all: string, label: string): IdFacet[] => {
    const rows = subset(key);
    return [{ id: all, label, count: rows.length }, ...aggregate(rows, row => row[key]).map(item => ({ id: item.name, label: item.name, count: item.count }))];
  };
  const yearRows = subset('ano');
  const years = aggregate(yearRows, row => row.ano == null ? null : String(row.ano)).map(item => ({ ano: Number(item.name), count: item.count })).sort((a, b) => b.ano - a.ano);
  const min = years.length ? years[years.length - 1].ano : null, max = years[0]?.ano ?? null;
  const difficultyRows = subset('dificuldade');
  const difficultyLabels: Record<Difficulty, string> = { facil: 'Fácil', media: 'Média', dificil: 'Difícil', nao_classificada: 'Não Classificada' };
  const materias = named('materia', 'Todas');
  const contextual = subset('materia');
  const bankRows = subset('banca');
  const bankLabels = new Map<string, string>();
  for (const item of aggregate(index.rows, row => row.banca)) {
    const key = fold(item.name);
    if (!bankLabels.has(key)) bankLabels.set(key, item.name.trim());
  }
  const banks = aggregate(bankRows, row => row.banca ? bankLabels.get(fold(row.banca)) ?? null : null);
  const bancas = [{ name: 'Todas', count: bankRows.length, categoria: 'Todas' }, ...banks.map(item => ({
    ...item,
    categoria: aggregate(bankRows.filter(row => row.banca && fold(row.banca) === fold(item.name)), row => row.categoria_banca)[0]?.name ?? null,
  }))];
  return {
    bancas, categorias_banca: idFacets('categoria_banca', 'Todas', 'Todas as Categorias'),
    tipos_prova: idFacets('tipo_prova', 'Todos', 'Todos os Tipos de Prova'), fases: idFacets('fase_nivel', 'Todas', 'Todas as Fases / Níveis'),
    materias, materias_com_topicos: materias.slice(1).map(item => ({ ...item, topicos: aggregate(contextual.filter(row => getUiMateriaName(row.materia) === item.name), row => index.canonicalTopicsDisplay.get(fold(row.topico ?? '')) ?? null) })),
    topicos: named('topico', 'Todos'), subtopicos: named('subtopico', 'Todos'),
    anos: [{ label: min == null ? 'Todos os Anos da Prova' : `Todos os Anos da Prova (${min}–${max})`, count: yearRows.length }, ...years], ano_min: min, ano_max: max,
    tipos: idFacets('tipo', 'Todos', 'Todos os Tipos'),
    dificuldades: [{ id: 'Todas', label: 'Todas', count: difficultyRows.length }, ...DIFFICULTIES.map(value => ({ id: value, label: difficultyLabels[value], count: difficultyRows.filter(row => evaluate(row, difficulty(value))).length })).filter(item => item.count > 0)],
    total_filtered: subset().length,
  };
}
