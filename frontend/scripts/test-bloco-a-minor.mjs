import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const read = async (file) => (await readFile(new URL(`../${file}`, import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const route = await read('app/api/questions/route.ts');
const modal = await read('components/CriarSimuladoModal.tsx');
const resolver = await read('app/(app)/resolver/page.tsx');
const opinioes = await read('app/(app)/opinioes/page.tsx');
const questoes = await read('app/(app)/questoes/page.tsx');

function compile(source, names, values) {
  const js = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  return Function(...names, js)(...values);
}

test('POST sentinels disappear across dimensions without mutating filters or dropping empty ids', () => {
  const fn = route.slice(
    route.indexOf('function isPostSentinel'),
    route.indexOf('function fisherYatesShuffle')
  );
  const sanitize = compile(`${fn}; return sanitizePostFilters;`, [], []);
  const raw = {
    ano: ['Todos', '', 2024],
    materia: ['Todas', 'Álgebra'],
    dificuldade: 'Todas',
    tipo: '',
    banca: 'Todos',
    tem_figura: false,
    ids: [],
  };
  const copy = structuredClone(raw);
  const cleaned = sanitize(raw);

  assert.deepEqual(raw, copy);
  assert.deepEqual(cleaned.ano, [2024]);
  assert.deepEqual(cleaned.materia, ['Álgebra']);
  for (const key of ['dificuldade', 'tipo', 'banca']) {
    assert.equal(cleaned[key], undefined);
  }
  assert.equal(cleaned.tem_figura, false);
  assert.deepEqual(cleaned.ids, []);
  assert.deepEqual(sanitize({ ano: ['Todos', 'Todas', ''] }), { ano: undefined });
});

test('POST shuffle preserves unbiased permutation without re-sorting by qualityScore', () => {
  const fn = route.slice(
    route.indexOf('function fisherYatesShuffle'),
    route.indexOf('async function loadSearchMatchingIds')
  );
  const shuffle = compile(`${fn}; return fisherYatesShuffle;`, [], []);
  const source = [{ id: 1, quality: 10 }, { id: 2, quality: 20 }, { id: 3, quality: 30 }, { id: 4, quality: 40 }];
  const copy = structuredClone(source);
  const out = shuffle(source);
  assert.deepEqual(source, copy);
  assert.deepEqual(out.map((item) => item.id).sort((a, b) => a - b), [1, 2, 3, 4]);
  assert.match(route, /shuffle\s*\?\s*fisherYatesShuffle\(data \|\| \[\]\)\s*:\s*sortQuestionsByQuality\(data \|\| \[\]\)/);
  assert.match(route, /total:\s*0,\s*total_pages:\s*0\s*\}/);
});

test('clearing modal quantity stays 0 while open, syncs once after initial 0 -> N load, and resets on reopen', () => {
  const start = modal.indexOf('useEffect(() => {\n    if (!isOpen)');
  const end = modal.indexOf('\n  }, [isOpen', start);
  const body = modal.slice(modal.indexOf('{', start) + 1, end);

  const wasOpenRef = { current: false };
  const hasSyncedInitialCountRef = { current: false };
  let quantity = 20;
  let totalFiltradas = 0;

  const run = (isOpen) =>
    compile(
      body,
      [
        'isOpen',
        'wasOpenRef',
        'hasSyncedInitialCountRef',
        'selectedIds',
        'totalFiltradas',
        'DEFAULT_QUESTION_COUNT',
        'setOrigemQuestoes',
        'setQuantidadeDesejada',
      ],
      [
        isOpen,
        wasOpenRef,
        hasSyncedInitialCountRef,
        [],
        totalFiltradas,
        20,
        () => {},
        (value) => {
          quantity = value;
        },
      ]
    );

  // Opens before totalFiltradas arrives (0), then receives 50 -> syncs to 20 once
  run(true);
  assert.equal(quantity, 0);
  totalFiltradas = 50;
  run(true);
  assert.equal(quantity, 20);

  // User clears input back to 0 -> stays 0 while dialog remains open
  quantity = 0;
  run(true);
  assert.equal(quantity, 0);

  // Closing and reopening restores default count
  run(false);
  run(true);
  assert.equal(quantity, 20);
});

test('resolver explicit sessions ignore late profile hydration while standby mode reacts to profile changes', () => {
  const effectStart = resolver.indexOf('carregarSessao();');
  const depBlock = resolver.slice(effectStart, resolver.indexOf(']);', effectStart) + 3);
  assert.match(depBlock, /\!queryId && sessionQuery !== "simulado" && sessionQuery !== "treino" \? profile\?\.id : undefined/);
  assert.match(depBlock, /\!queryId && sessionQuery !== "simulado" && sessionQuery !== "treino" \? profile\?\.objetivoPrincipal : undefined/);

  const depArraySrc = depBlock.slice(depBlock.indexOf('['), depBlock.lastIndexOf(']') + 1);
  const deps = (queryId, sessionQuery, modeQuery, profile) =>
    compile(`return ${depArraySrc};`, ['queryId', 'sessionQuery', 'modeQuery', 'profile'], [queryId, sessionQuery, modeQuery, profile]);

  for (const [id, session] of [['123', null], [null, 'simulado'], [null, 'treino']]) {
    assert.deepEqual(
      deps(id, session, null, null),
      deps(id, session, null, { id: 'user-1', objetivoPrincipal: 'ITA' })
    );
  }
  assert.notDeepEqual(
    deps(null, null, null, null),
    deps(null, null, null, { id: 'user-1', objetivoPrincipal: 'ITA' })
  );
});

test('opinioes compare CTA and questoes UI minor guards are intact', () => {
  assert.match(opinioes, /<button\s+type="button"\s+onClick=\{handleCompare\}[\s\S]*?disabled:cursor-not-allowed/);
  assert.match(questoes, /sp\s*\.\s*getAll\("topico"\)/);
  assert.match(questoes, /a\.ano > 0 && \(a\.count > 0 \|\| anoFiltro\.includes\(a\.ano\.toString\(\)\)\)/);
  assert.match(questoes, /Busca: &ldquo;\{busca\.trim\(\)\}&rdquo;/);
  assert.match(questoes, /catalogTotal > 0[\s\S]*Ver todas as questões/);
  assert.doesNotMatch(questoes, /Ver todas as \{total > 0 \? total\.toLocaleString\("pt-BR"\) : "—"\}/);
  assert.match(questoes, /truncate max-w-\[160px\] sm:max-w-\[200px\]/);
  assert.match(questoes, /truncate max-w-\[160px\] sm:max-w-\[210px\]/);
});
