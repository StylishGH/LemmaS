import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../lib/question-filters.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const f = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const row = (id, extra = {}) => ({ id, banca: 'CEDERJ', categoria_banca: 'Vestibular & Superior', tipo_prova: 'Oficial', fase_nivel: 'Geral', tipo_material: 'prova', figura_path: null, ano: 2026, tipo: 'objetiva', dificuldade: 2, materia: 'Cálculo 3', topico: 'Limites', subtopico: 'Limites de Funções de Várias Variáveis', lema_id: null, lema_codigo: null, ...extra });
const rows = [row(1), row(2, { banca: 'LemmaS', dificuldade: 3 }), row(3, { subtopico: 'Limites de funções de várias variáveis', topico: 'limites', ano: 2025, dificuldade: 5 }), row(4, { materia: 'Álgebra Linear I', topico: 'Matrizes', tipo: 'discursiva' }), row(5, { banca: 'EsPCEx', materia: 'Cálculo', topico: 'Determinantes', dificuldade: null }), row(6, { banca: 'ITA', materia: 'Matemática', dificuldade: 9 }), row(7, { materia: 'Álgebra Linear II' })];
function database(data, { errorAt, truncateAt, count = data.length } = {}) {
  const calls = [];
  let active = 0, peak = 0;
  return { calls, get peak() { return peak; }, from(table) {
    assert.equal(table, 'questoes');
    return { select(columns, opts) {
      assert(columns.includes('tipo_material') && columns.includes('figura_path'));
      return { order() { return this; }, async range(from, to) {
        calls.push({ from, to, opts }); active++; peak = Math.max(peak, active);
        await new Promise(resolve => setTimeout(resolve, 2)); active--;
        if (from === errorAt) return { data: null, count: null, error: { message: 'timeout' } };
        return { data: data.slice(from, from === truncateAt ? from + 1 : to + 1), count: from === 0 ? count : null, error: null };
      } };
    } };
  } };
}
async function index(data = rows) { f.clearQuestionMetadataIndexCache(); return f.getQuestionMetadataIndex(database(data)); }
const count = (items, name) => items.find(item => (item.name ?? item.id ?? item.ano) === name)?.count;
function emitted(filters, idx) {
  const calls = [];
  const query = new Proxy({}, { get: (_, kind) => (...args) => { calls.push({ kind, args }); return query; } });
  assert.equal(f.applyFiltersToPostgrestQuery(query, filters, idx), query);
  return calls;
}
test('16 subjects are disjoint and residual mathematics keeps its UI label', async () => {
  assert.equal(f.CANONICAL_MATERIAS.length, 16);
  assert.equal(new Set(f.CANONICAL_MATERIAS.map(m => m.dbValue)).size, 16);
  assert.equal(f.getUiMateriaName('Matemática'), 'Matemática (Geral)');
  assert.equal(f.getDbMateriaValue(' matemática (geral) '), 'Matemática');
  assert.equal(f.getDbMateriaValue('unknown'), null);
  assert.equal(f.getUiMateriaName(null), null);
  assert(!f.matchesMetadataRow(row(1), { materia: ['Cálculo'] }));
  assert(!f.matchesMetadataRow(row(1, { materia: 'Álgebra Linear', topico: 'Matrizes' }), { materia: ['Álgebra Linear I'] }));
  const facets = f.computeCrossFilteredFacets(await index(), {});
  assert.equal(count(facets.materias, 'Álgebra Linear II'), 1);
  assert.equal(count(facets.materias_com_topicos, 'Matemática (Geral)'), 1);
  assert.equal(f.buildPreferMateriaClause('Matemática (Geral)'), 'materia.eq."Matemática"');
});
test('GET and POST preserve comma-bearing subtopics and normalize multi-selects', () => {
  const sub = ['Baricentro, Incentro, Circuncentro, Ortocentro', 'Cálculo de Limites em $\\mathbb{R}^3$'];
  const parsed = f.parseGetFilterParams(new URLSearchParams([['subtopico', sub[0]], ['subtopico', sub[1]], ['banca', 'Todas,ITA,ENEM'], ['ano', '2026,2025'], ['tem_figura', 'false'], ['ids', '1,2'], ['id', '6']]));
  assert.deepEqual(parsed.subtopico, sub);
  assert.deepEqual(parsed.banca, ['ITA', 'ENEM']);
  assert.deepEqual(parsed.ano, [2026, 2025]);
  assert.equal(parsed.tem_figura, false);
  assert.deepEqual(parsed.ids, [1, 2]);
  assert.equal(parsed.id, 6);
  assert.deepEqual(f.parsePostFilterParams({ subtopico: sub }).subtopico, sub);
  assert.deepEqual(f.parsePostFilterParams({ subtopico: sub[0] }).subtopico, [sub[0]]);
  assert.deepEqual(f.parsePostFilterParams({}, { ids: [3, 4] }).ids, [3, 4]);
  assert.throws(() => f.parsePostFilterParams({ ano: 'oops' }), /ano/i);
});
test('indexed topic predicates preserve all raw spellings and escape literal LaTeX safely', async () => {
  const idx = await index();
  const facets = f.computeCrossFilteredFacets(idx, {});
  assert.equal(count(facets.subtopicos, 'Limites de Funções de Várias Variáveis'), 7);
  assert.equal(count(facets.topicos, 'Limites'), 5);
  const calls = emitted({ topico: [' LIMItES '], subtopico: ['Limites de Funções de Várias Variáveis'] }, idx);
  assert(calls.some(c => c.args[0] === 'topico.eq."Limites",topico.eq."limites"'));
  assert(calls.some(c => c.args[0].includes('subtopico.eq."Limites de funções de várias variáveis"')));
  assert.equal(rows.filter(r => f.matchesMetadataRow(r, { topico: ['limites'] })).length, 5);
  assert.equal(f.escapePostgrestQuoted('a"b\\c'), 'a\\"b\\\\c');
  assert.equal(f.escapeLikeLiteral('a_%*\\b'), 'a\\_\\%\\*\\\\b');
  assert.equal(emitted({ subtopico: ['A_B%'] })[0].args[0], 'subtopico.ilike."A\\\\_B\\\\%"');
});
test('normal banks match exactly while OBM levels require both bank and phase', () => {
  for (const bank of ['ITA', 'ENEM', 'Olimpíada de Bay Area (BAMO)']) {
    assert(f.matchesMetadataRow(row(1, { banca: bank.toLowerCase() }), { banca: [bank] }));
    assert(!f.matchesMetadataRow(row(1, { banca: `${bank} extra` }), { banca: [bank] }));
    assert.equal(emitted({ banca: [bank] })[0].args[0], `banca.ilike."${bank}"`);
  }
  assert(f.matchesMetadataRow(row(1, { banca: 'OBM', fase_nivel: 'Final Nível 2' }), { banca: ['OBM Nível 2'] }));
  assert(!f.matchesMetadataRow(row(1, { banca: 'OBM', fase_nivel: 'Nível 3' }), { banca: ['OBM Nível 2'] }));
  assert.equal(emitted({ banca: ['OBM Nível 2'] })[0].args[0], 'and(banca.ilike."%OBM%",fase_nivel.ilike."%Nível 2%")');
});
test('all ten facets remove only their own dimension and respect search IDs', async () => {
  const idx = await index();
  const facets = f.computeCrossFilteredFacets(idx, { materia: ['Cálculo 3'] });
  assert.equal(facets.total_filtered, 3);
  assert.equal(count(facets.materias, 'Cálculo'), 1);
  assert.equal(count(facets.bancas, 'CEDERJ'), 2);
  assert.equal(count(facets.topicos, 'Limites'), 3);
  assert.equal(count(facets.anos, 2025), 1);
  const selected = f.computeCrossFilteredFacets(idx, { search: 'limits' }, new Set([1, 2]));
  for (const dimension of ['bancas', 'categorias_banca', 'tipos_prova', 'fases', 'materias', 'topicos', 'subtopicos', 'anos', 'tipos', 'dificuldades']) assert.equal(selected[dimension][0].count, 2, dimension);
  assert.equal(selected.total_filtered, 2);
  assert.equal(selected.ano_min, 2026);
  assert.equal(f.computeCrossFilteredFacets(idx, { search: '#4' }).total_filtered, 1);
  assert.throws(() => f.computeCrossFilteredFacets(idx, { search: 'limits' }), /search|busca/i);
  const names = { banca: 'bancas', categoria_banca: 'categorias_banca', tipo_prova: 'tipos_prova', fase_nivel: 'fases', materia: 'materias', topico: 'topicos', subtopico: 'subtopicos', ano: 'anos', tipo: 'tipos', dificuldade: 'dificuldades' };
  for (const [dimension, value] of [['banca', 'ITA'], ['categoria_banca', 'Other'], ['tipo_prova', 'Other'], ['fase_nivel', 'Other'], ['materia', 'Cálculo'], ['topico', 'Other'], ['subtopico', 'Other'], ['ano', 1990], ['tipo', 'discursiva'], ['dificuldade', 'media']]) assert.equal(f.computeCrossFilteredFacets(idx, { [dimension]: [value] })[names[dimension]][0].count, 7, dimension);
});
test('material, figure, difficulty, IDs and lemma filters share memory and SQL semantics', () => {
  assert(f.matchesMetadataRow(row(1), { tipo_material: ['prova'], tem_figura: false, dificuldade: ['facil'], ids: [1] }));
  assert(!f.matchesMetadataRow(row(1, { figura_path: '' }), { tem_figura: false }));
  assert(f.matchesMetadataRow(row(1, { dificuldade: null, lema_codigo: 'LEMA-0002' }), { dificuldade: ['nao_classificada'], lema: '2' }));
  assert.equal(emitted({ tem_figura: true })[0].kind, 'not');
  assert.equal(emitted({ tem_figura: false })[0].kind, 'is');
  assert.deepEqual(f.compileFilterPredicatesForTest({ materia: ['Cálculo'] }), [{ kind: 'or', value: 'materia.ilike."Cálculo"' }]);
  assert.deepEqual(f.compileFilterPredicatesForTest({ materia: ['A_B%'] }), [{ kind: 'or', value: 'materia.ilike."A\\\\_B\\\\%"' }]);
});
test('cohort rewriting supports escaped quoted eq and ilike expressions', () => {
  assert.equal(f.rewritePreferenceGroupForNonNull('or(materia.eq."Cálculo",banca.ilike."%ITA%")'), 'or(and(materia.not.is.null,materia.eq."Cálculo"),and(banca.not.is.null,banca.ilike."%ITA%"))');
  assert.equal(f.rewritePreferenceGroupForNonNull('col.eq."A\\"B, (C)"'), 'and(col.not.is.null,col.eq."A\\"B, (C)")');
});
test('metadata uses strict pages, concurrent deduplication, TTL and force refresh', async () => {
  f.clearQuestionMetadataIndexCache();
  const db = database(Array.from({ length: 2500 }, (_, i) => row(i + 1)));
  const [a, b] = await Promise.all([f.getQuestionMetadataIndex(db), f.getQuestionMetadataIndex(db)]);
  assert.equal(a, b); assert.equal(a.rows.length, 2500);
  assert.deepEqual(db.calls.map(c => [c.from, c.to]), [[0, 999], [1000, 1999], [2000, 2499]]);
  assert.deepEqual(db.calls[0].opts, { count: 'exact' });
  const now = Date.now, start = now();
  try {
    Date.now = () => start + 119000; assert.equal(await f.getQuestionMetadataIndex(db), a);
    Date.now = () => start + 121000; assert.notEqual(await f.getQuestionMetadataIndex(db), a);
  } finally { Date.now = now; }
  assert.equal(db.calls.length, 6);
  assert.notEqual(await f.getQuestionMetadataIndex(db, { forceRefresh: true }), a);
  assert.equal(db.calls.length, 9);
});
test('partial errors and truncation never publish a cached snapshot', async () => {
  const data = Array.from({ length: 2500 }, (_, i) => row(i + 1));
  for (const options of [{ errorAt: 1000 }, { truncateAt: 1000 }, { truncateAt: 0 }, { count: null }]) {
    f.clearQuestionMetadataIndexCache();
    await assert.rejects(f.getQuestionMetadataIndex(database(data, options)), /timeout|truncat|count/i);
    const good = database(data);
    assert.equal((await f.getQuestionMetadataIndex(good)).rows.length, 2500); assert.equal(good.calls.length, 3);
  }
});
test('large indexes bound concurrent page fetches', async () => {
  f.clearQuestionMetadataIndexCache();
  const db = database(Array.from({ length: 8500 }, (_, i) => row(i + 1)));
  assert.equal((await f.getQuestionMetadataIndex(db)).rows.length, 8500);
  assert(db.peak > 1 && db.peak <= 6);
});

test('case-folded subjects and bank facets count exactly the rows selected by their chips', async () => {
  const data = [row(1, { materia: ' cálculo 3 ', banca: 'ita' }), row(2, { banca: 'ITA' }), row(3, { banca: 'ITA extra' })];
  const idx = await index(data);
  assert.equal(f.computeCrossFilteredFacets(idx, { materia: ['Cálculo 3'] }).total_filtered, 3);
  assert.equal(count(f.computeCrossFilteredFacets(idx, {}).bancas, 'ITA'), 2);
  const calls = emitted({ materia: ['Cálculo 3'] }, idx);
  assert.equal(calls[0].args[0], 'materia.eq." cálculo 3 ",materia.eq."Cálculo 3"');
});

test('bank categories and material substring semantics preserve the route response contract', async () => {
  const idx = await index();
  const facets = f.computeCrossFilteredFacets(idx, {});
  assert.equal(facets.bancas[0].categoria, 'Todas');
  assert.equal(facets.bancas.find(b => b.name === 'CEDERJ').categoria, 'Vestibular & Superior');
  assert(f.matchesMetadataRow(row(1, { tipo_material: 'prova oficial' }), { tipo_material: ['prova'] }));
  assert.equal(emitted({ tipo_material: ['prova'] })[0].args[0], 'tipo_material.ilike."%prova%"');
});

test('topic and subtopic labels prefer frequency then lexical spelling and retain LaTeX bytes', async () => {
  const raw = 'Cálculo de Limites em $\\mathbb{R}^3$, ("A")';
  const idx = await index([row(1, { topico: 'Tema', subtopico: raw }), row(2, { topico: 'tema', subtopico: raw }), row(3, { topico: 'tema', subtopico: 'Outro' })]);
  assert.equal(count(f.computeCrossFilteredFacets(idx, {}).topicos, 'tema'), 3);
  const calls = emitted({ subtopico: [raw] }, idx);
  assert.equal(calls[0].args[0], 'subtopico.eq."Cálculo de Limites em $\\\\mathbb{R}^3$, (\\"A\\")"');
  assert.equal(f.computeCrossFilteredFacets(idx, { subtopico: [raw] }).total_filtered, 2);
  const tie = await index([row(1, { topico: 'Tema' }), row(2, { topico: 'tema' })]);
  assert.equal(count(f.computeCrossFilteredFacets(tie, {}).topicos, 'Tema'), 2);
});

test('empty metadata and empty ID selections return zero without inventing year bounds', async () => {
  const idx = await index([]);
  const facets = f.computeCrossFilteredFacets(idx, {});
  assert.equal(facets.total_filtered, 0);
  assert.equal(facets.ano_min, null);
  assert.equal(facets.ano_max, null);
  assert(!f.matchesMetadataRow(row(1), { ids: [] }));
  assert.deepEqual(emitted({ ids: [] }), [{ kind: 'in', args: ['id', []] }]);
});

test('tipo folds case and whitespace across memory, SQL and friendly facet labels', async () => {
  const data = [
    row(1, { tipo: 'Objetiva ', categoria_banca: 'Concurso Militar', banca: 'ITA' }),
    row(2, { tipo: 'objetiva', categoria_banca: 'Vestibular & Superior', banca: 'ITA' }),
    row(3, { tipo: 'Discursiva', categoria_banca: 'Olimpíadas', banca: 'OBM' }),
    row(4, { tipo: 'oral', categoria_banca: 'Concurso Militar', banca: 'ITA' }),
  ];
  const idx = await index(data);
  const facets = f.computeCrossFilteredFacets(idx, {});
  assert.deepEqual(facets.tipos, [
    { id: 'Todos', label: 'Todos os Tipos', count: 4 },
    { id: 'objetiva', label: 'Objetivas', count: 2 },
    { id: 'discursiva', label: 'Discursivas', count: 1 },
    { id: 'oral', label: 'Oral', count: 1 },
  ]);
  assert.deepEqual(facets.categorias_banca, [
    { id: 'Todas', label: 'Todas as Categorias', count: 4 },
    { id: 'Concurso Militar', label: 'Concursos Militares', count: 2 },
    { id: 'Olimpíadas', label: 'Olimpíadas de Matemática', count: 1 },
    { id: 'Vestibular & Superior', label: 'Vestibulares & Superior', count: 1 },
  ]);
  assert.equal(facets.bancas.find(b => b.name === 'ITA').categoria, 'Concurso Militar');
  assert.equal(data.filter(r => f.matchesMetadataRow(r, { tipo: ['objetiva'] })).length, 2);
  assert.equal(f.computeCrossFilteredFacets(idx, { tipo: ['objetiva'] }).total_filtered, 2);
  assert.equal(emitted({ tipo: ['objetiva'] }, idx)[0].args[0], 'tipo.eq."Objetiva ",tipo.eq."objetiva"');
  assert.equal(emitted({ tipo: ['objetiva'] })[0].args[0], 'tipo.ilike."objetiva"');
});

test('repeated GET parameters, empty ids string and numeric lema parse consistently', () => {
  const parsed = f.parseGetFilterParams(new URLSearchParams([
    ['ano', '2025,2026'], ['ano', '2024'],
    ['dificuldade', 'facil'], ['dificuldade', 'media'],
    ['ids', '1'], ['ids', '2,3'],
    ['id', '6'], ['id', '6'],
  ]));
  assert.deepEqual(parsed.ano, [2025, 2026, 2024]);
  assert.deepEqual(parsed.dificuldade, ['facil', 'media']);
  assert.deepEqual(parsed.ids, [1, 2, 3]);
  assert.equal(parsed.id, 6);
  assert.throws(() => f.parseGetFilterParams(new URLSearchParams([['id', '1'], ['id', '2']])), /Invalid id/i);
  assert.throws(() => f.parseGetFilterParams(new URLSearchParams([['tem_figura', 'true'], ['tem_figura', 'false']])), /Invalid tem_figura/i);

  assert.equal(f.parsePostFilterParams({ ids: '' }).ids, undefined);
  assert.equal(f.parseGetFilterParams(new URLSearchParams('ids=&id=&ano=')).ids, undefined);
  assert.equal(f.parseGetFilterParams(new URLSearchParams('ids=&id=&ano=')).id, undefined);
  assert.deepEqual(f.parsePostFilterParams({ ids: [] }).ids, []);
  assert.deepEqual(f.parsePostFilterParams({ ids: '' }, { ids: [4, 5] }).ids, [4, 5]);
  assert.deepEqual(f.parsePostFilterParams({ ids: '' }, { ids: [] }).ids, []);

  const numLema = f.parsePostFilterParams({ lema: 2 });
  assert.equal(numLema.lema, '2');
  assert(f.matchesMetadataRow(row(1, { lema_codigo: 'LEMA-0002' }), numLema));
  assert.equal(emitted(numLema)[0].args[0], 'lema_id.eq.2,lema_codigo.eq."LEMA-0002"');
  assert.equal(f.parsePostFilterParams({ lema_codigo: 42 }).lema, '42');
  assert.equal(f.parsePostFilterParams({ lema: '', lema_codigo: 7 }).lema, '7');
  assert.equal(f.parsePostFilterParams({ lema: ' lema-0002 ' }).lema, 'LEMA-0002');
  for (const bad of [1.5, NaN, -1]) assert.throws(() => f.parsePostFilterParams({ lema: bad }), /Invalid lema/i);
});

test('missing indexed topic or subtopic lookup avoids scanning index.rows', async () => {
  const idx = await index();
  const originalFilter = idx.rows.filter;
  let scanned = false;
  idx.rows.filter = (...args) => { scanned = true; return originalFilter.apply(idx.rows, args); };
  try {
    const calls = emitted({ topico: ['Inexistente'], subtopico: ['Também Inexistente'], banca: ['Banca Desconhecida'], materia: ['Matemática (Geral)'], tipo: ['desconhecido'] }, idx);
    assert.equal(scanned, false);
    assert(calls.some(c => c.args[0] === 'topico.ilike."Inexistente"'));
    assert(calls.some(c => c.args[0] === 'subtopico.ilike."Também Inexistente"'));
  } finally {
    idx.rows.filter = originalFilter;
  }
});

test('POST contract preserves full filter dimensions and disjoint prefer_materia clauses', () => {
  const parsed = f.parsePostFilterParams({
    materia: 'Matemática (Geral)',
    subtopico: ['Baricentro, Incentro, Circuncentro, Ortocentro'],
    search: 'Stokes',
    categoria_banca: 'Concurso Militar',
    tipo_prova: 'Oficial',
    fase_nivel: 'Geral',
  });
  assert.deepEqual(parsed.materia, ['Matemática (Geral)']);
  assert.deepEqual(parsed.subtopico, ['Baricentro, Incentro, Circuncentro, Ortocentro']);
  assert.equal(parsed.search, 'Stokes');
  assert.deepEqual(parsed.categoria_banca, ['Concurso Militar']);
  assert.deepEqual(parsed.tipo_prova, ['Oficial']);
  assert.deepEqual(parsed.fase_nivel, ['Geral']);

  assert.equal(f.buildPreferMateriaClause('Cálculo 3'), 'materia.eq."Cálculo 3"');
  assert.equal(f.buildPreferMateriaClause('Matemática (Geral)'), 'materia.eq."Matemática"');
  assert.equal(
    f.rewritePreferenceGroupForNonNull(`or(${f.buildPreferMateriaClause('Cálculo 3')})`),
    'or(and(materia.not.is.null,materia.eq."Cálculo 3"))'
  );
});

test('retains selected zero-count facets across dimensions while hiding unselected zero-count items', async () => {
  const idx = await index([
    row(1, { banca: 'CEDERJ', categoria_banca: 'Vestibular & Superior', materia: 'Cálculo 3', topico: 'Integrais Múltiplas', subtopico: 'Teorema de Stokes', ano: 2025, tipo: 'Discursiva', dificuldade: 4 }),
    row(2, { banca: 'ITA', categoria_banca: 'Concurso Militar', materia: 'Álgebra', topico: 'Polinômios', subtopico: 'Girard', ano: 2024, tipo: 'Objetiva', dificuldade: 3 }),
    row(3, { banca: 'IME', categoria_banca: 'Concurso Militar', materia: 'Geometria Plana', topico: 'Triângulos', subtopico: 'Ceva', ano: 2023, tipo: 'Objetiva', dificuldade: 2 }),
  ]);

  const pairFacets = f.computeCrossFilteredFacets(idx, {
    banca: ['ITA'],
    materia: ['Cálculo 3'],
  });
  assert.equal(pairFacets.total_filtered, 0);
  assert.deepEqual(pairFacets.bancas, [
    { name: 'Todas', count: 1, categoria: 'Todas' },
    { name: 'CEDERJ', count: 1, categoria: 'Vestibular & Superior' },
    { name: 'ITA', count: 0, categoria: 'Concurso Militar' },
  ]);
  assert.deepEqual(pairFacets.materias, [
    { name: 'Todas', count: 1 },
    { name: 'Álgebra', count: 1 },
    { name: 'Cálculo 3', count: 0 },
  ]);

  const facets = f.computeCrossFilteredFacets(idx, {
    banca: ['ITA'],
    materia: ['Cálculo 3'],
    topico: ['Integrais Múltiplas'],
    subtopico: ['Teorema de Stokes'],
    categoria_banca: ['Vestibular & Superior'],
    ano: [2025],
    tipo: ['discursiva'],
    dificuldade: ['dificil'],
  });

  assert.equal(facets.total_filtered, 0);
  // Selected values are retained with count 0 rather than vanishing or resetting
  assert.deepEqual(facets.materias.find(m => m.name === 'Cálculo 3'), { name: 'Cálculo 3', count: 0 });
  assert.deepEqual(facets.bancas.find(b => b.name === 'ITA'), { name: 'ITA', count: 0, categoria: 'Concurso Militar' });
  assert.deepEqual(facets.topicos.find(t => t.name === 'Integrais Múltiplas'), { name: 'Integrais Múltiplas', count: 0 });
  assert.deepEqual(facets.subtopicos.find(s => s.name === 'Teorema de Stokes'), { name: 'Teorema de Stokes', count: 0 });
  assert.deepEqual(facets.categorias_banca.find(c => c.id === 'Vestibular & Superior'), { id: 'Vestibular & Superior', label: 'Vestibulares & Superior', count: 0 });
  assert.deepEqual(facets.anos.find(a => a.ano === 2025), { ano: 2025, count: 0 });
  assert.deepEqual(facets.tipos.find(t => t.id === 'discursiva'), { id: 'discursiva', label: 'Discursivas', count: 0 });
  assert.deepEqual(facets.dificuldades.find(d => d.id === 'dificil'), { id: 'dificil', label: 'Difícil', count: 0 });
  // Cross-filter subset for banca still surfaces CEDERJ (count 1) while hiding zero-count unselected IME
  assert.equal(facets.bancas.find(b => b.name === 'CEDERJ')?.count, 1);
  assert.equal(facets.bancas.some(b => b.name === 'IME'), false);
  assert.equal(facets.materias.some(m => m.name === 'Geometria Plana'), false);
  assert.equal(facets.topicos.some(t => t.name === 'Polinômios'), false);
  assert.equal(facets.subtopicos.some(s => s.name === 'Girard'), false);
});
