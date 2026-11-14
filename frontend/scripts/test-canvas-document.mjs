import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../lib/canvas-document.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const { createCanvasDocument, commitCanvas, undoCanvas, redoCanvas, remapCanvasColors, strokeIntersectsEraser, canvasContentSize } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const point = (x, y) => ({ x, y, pressure: 0.7 });
const stroke = (id, points = [point(0, 0), point(200, 0)]) => ({ id, points, tool: 'pen', color: '#F8FAFC', baseWidth: 2 });

test('draw, erase, clear and branch history recover complete operations', () => {
  const doc = createCanvasDocument();
  const a = stroke('a'), b = stroke('b');
  commitCanvas(doc, [a]); commitCanvas(doc, [a, b]);
  commitCanvas(doc, [b]); // erase a
  undoCanvas(doc); assert.deepEqual(doc.strokes, [a, b]);
  redoCanvas(doc); assert.deepEqual(doc.strokes, [b]);
  commitCanvas(doc, []); undoCanvas(doc); assert.deepEqual(doc.strokes, [b]);
  commitCanvas(doc, [b, stroke('c')]);
  assert.equal(redoCanvas(doc), false);
  assert.equal(doc.future.length, 0);
});

test('theme remaps both histories without changing pressure or coordinates', () => {
  const a = stroke('a'), doc = createCanvasDocument();
  commitCanvas(doc, [a]); commitCanvas(doc, []); undoCanvas(doc); undoCanvas(doc);
  remapCanvasColors(doc, new Map([['#F8FAFC', '#1D4ED8']]));
  redoCanvas(doc);
  assert.equal(doc.strokes[0].color, '#1D4ED8');
  assert.equal(doc.strokes[0].points, a.points);
  redoCanvas(doc); undoCanvas(doc);
  assert.equal(doc.strokes[0].color, '#1D4ED8');
});

test('eraser hits sparse segments and its entire swept path, including dots', () => {
  const line = stroke('a');
  assert.equal(strokeIntersectsEraser(line, point(100, 0), point(100, 0)), true);
  assert.equal(strokeIntersectsEraser(line, point(100, -80), point(100, 80)), true);
  assert.equal(strokeIntersectsEraser(line, point(100, 50), point(150, 50)), false);
  assert.equal(strokeIntersectsEraser(stroke('dot', [point(50, 50)]), point(0, 50), point(100, 50)), true);
  assert.equal(strokeIntersectsEraser(line, point(500, 0), point(600, 0)), false);
});

test('documents isolate questions and retain content beyond a smaller viewport', () => {
  const a = createCanvasDocument(), b = createCanvasDocument();
  commitCanvas(a, [stroke('wide', [point(1400, 900)])]);
  assert.deepEqual(canvasContentSize(a.strokes), { width: 1426, height: 926 });
  assert.deepEqual(b.strokes, []); assert.equal(undoCanvas(b), false);
  for (let i = 0; i < 120; i++) commitCanvas(a, []);
  assert.equal(a.past.length, 100);
});
