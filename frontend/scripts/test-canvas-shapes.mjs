import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = fileURLToPath(new URL("../", import.meta.url));

function loadTs(relPath) {
  const fullPath = path.join(root, relPath);
  const src = fs.readFileSync(fullPath, "utf8");
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}

const { recognizeAndSnapShape, buildSnappedLine } = await loadTs("lib/canvas-shapes.ts");

test("snaps wobbly horizontal stroke to exact horizontal line and exposes anchorStart", () => {
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    pts.push({ x: 20 + i * 10, y: 100 + Math.sin(i) * 2.5, pressure: 0.7 });
  }
  const shape = recognizeAndSnapShape(pts);
  assert.equal(shape?.kind, "line");
  assert.ok(shape.anchorStart);
  assert.ok(Math.abs(shape.points[0].y - shape.points.at(-1).y) < 1e-6);
});

test("buildSnappedLine snaps 43deg segment cleanly to 45deg", () => {
  const start = { x: 0, y: 0, pressure: 0.7 };
  const angleRad = (43 * Math.PI) / 180;
  const line = buildSnappedLine(start, {
    x: Math.cos(angleRad) * 100,
    y: Math.sin(angleRad) * 100,
    pressure: 0.7,
  });
  const end = line.at(-1);
  assert.ok(Math.abs(end.x - end.y) < 1e-6);
});

test("recognizes circle and ellipse distinctly", () => {
  const circlePts = Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * Math.PI * 2;
    const jitter = (i % 2 === 0 ? 2 : -2);
    return { x: 200 + Math.cos(a) * (60 + jitter), y: 200 + Math.sin(a) * (60 - jitter), pressure: 0.7 };
  });
  circlePts.push({ ...circlePts[0], x: circlePts[0].x + 3 });
  assert.equal(recognizeAndSnapShape(circlePts)?.kind, "circle");

  const ellipsePts = Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * Math.PI * 2;
    return { x: 200 + Math.cos(a) * 120, y: 200 + Math.sin(a) * 50, pressure: 0.7 };
  });
  ellipsePts.push(ellipsePts[0]);
  assert.equal(recognizeAndSnapShape(ellipsePts)?.kind, "ellipse");
});

test("recognizes triangle, rectangle, and square", () => {
  const denseEdge = (a, b, n = 10) =>
    Array.from({ length: n }, (_, i) => ({
      x: a.x + ((b.x - a.x) * i) / n,
      y: a.y + ((b.y - a.y) * i) / n,
      pressure: 0.7,
    }));

  const tri = [
    ...denseEdge({ x: 100, y: 20 }, { x: 200, y: 180 }),
    ...denseEdge({ x: 200, y: 180 }, { x: 20, y: 180 }),
    ...denseEdge({ x: 20, y: 180 }, { x: 100, y: 20 }),
    { x: 100, y: 20, pressure: 0.7 },
  ];
  assert.equal(recognizeAndSnapShape(tri)?.kind, "triangle");

  const rect = [
    ...denseEdge({ x: 20, y: 20 }, { x: 220, y: 24 }),
    ...denseEdge({ x: 220, y: 24 }, { x: 218, y: 120 }),
    ...denseEdge({ x: 218, y: 120 }, { x: 22, y: 118 }),
    ...denseEdge({ x: 22, y: 118 }, { x: 20, y: 20 }),
    { x: 20, y: 20, pressure: 0.7 },
  ];
  assert.equal(recognizeAndSnapShape(rect)?.kind, "rectangle");

  const sq = [
    ...denseEdge({ x: 40, y: 40 }, { x: 142, y: 42 }),
    ...denseEdge({ x: 142, y: 42 }, { x: 140, y: 140 }),
    ...denseEdge({ x: 140, y: 140 }, { x: 38, y: 142 }),
    ...denseEdge({ x: 38, y: 142 }, { x: 40, y: 40 }),
    { x: 40, y: 40, pressure: 0.7 },
  ];
  assert.equal(recognizeAndSnapShape(sq)?.kind, "square");
});

test("ignores short handwriting or S-curve strokes", () => {
  const sCurve = Array.from({ length: 24 }, (_, i) => ({
    x: 40 + i * 6,
    y: 100 + Math.sin((i / 24) * Math.PI * 2) * 35,
    pressure: 0.7,
  }));
  assert.equal(recognizeAndSnapShape(sCurve), null);
  assert.equal(recognizeAndSnapShape([{ x: 0, y: 0, pressure: 0.7 }, { x: 8, y: 2, pressure: 0.7 }]), null);
});
