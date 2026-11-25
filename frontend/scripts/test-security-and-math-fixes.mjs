import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import vm from "node:vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(__dirname, "..");

function loadTsModule(relPath) {
  const fullPath = path.join(FRONTEND_DIR, relPath);
  const source = fs.readFileSync(fullPath, "utf-8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });
  const mod = { exports: {} };
  const wrapped = `(function(exports, require, module, __filename, __dirname) {\n${outputText}\n})`;
  const fn = vm.runInThisContext(wrapped, { filename: fullPath });
  fn(mod.exports, (id) => {
    throw new Error(`Unexpected import ${id}`);
  }, mod, fullPath, path.dirname(fullPath));
  return mod.exports;
}

test("SM-2 next review date preserves local calendar day late at night", () => {
  const { calcularProximoIntervaloSM2 } = loadTsModule("lib/sm2.ts");
  const lateNight = new Date(2026, 10, 24, 23, 45, 0); // 2026-11-24 23:45 local
  const res = calcularProximoIntervaloSM2(0, 2.5, 1, true, 4, lateNight);
  assert.equal(res.intervalo_dias, 1);
  assert.equal(res.proxima_revisao_data, "2026-11-25");
});

test("MathDisplay disables KaTeX trust to prevent HTML/JS injection", () => {
  const src = fs.readFileSync(path.join(FRONTEND_DIR, "components/math/MathDisplay.tsx"), "utf-8");
  assert.match(src, /trust:\s*false/);
  assert.doesNotMatch(src, /trust:\s*true/);
});

test("Auth callback sanitizes next redirect and forwarded host", () => {
  const src = fs.readFileSync(path.join(FRONTEND_DIR, "app/auth/callback/route.ts"), "utf-8");
  assert.match(src, /safeRedirectPath/);
  assert.match(src, /ALLOWED_FORWARDED_HOSTS/);
});

test("Solve route does not allow student text to hijack isExplanation mode", () => {
  const src = fs.readFileSync(path.join(FRONTEND_DIR, "app/api/ai/solve/route.ts"), "utf-8");
  assert.match(src, /const isExplanation = modo === "explicar";/);
  assert.match(src, /<student_submission>/);
});

test("Dashboard metrics removes ?aluno_id IDOR and denominator truncation bias", () => {
  const src = fs.readFileSync(path.join(FRONTEND_DIR, "app/api/dashboard/metrics/route.ts"), "utf-8");
  assert.doesNotMatch(src, /searchParams\.get\("aluno_id"\)/);
  assert.match(src, /somaTempo \/ tentativas\.length/);
  assert.match(src, /\.order\("proxima_revisao",\s*\{\s*ascending:\s*true\s*\}\)/);
});

test("Lemmas API awaits createClient and paginates beyond 2500 rows", () => {
  const src = fs.readFileSync(path.join(FRONTEND_DIR, "app/api/lemmas/route.ts"), "utf-8");
  assert.match(src, /const supabase = await createClient\(\)/);
  assert.match(src, /\.range\(from,\s*from \+ pageSize - 1\)/);
});

test("Simulados enviar batches SM-2 queries instead of N+1 inside loop", () => {
  const src = fs.readFileSync(path.join(FRONTEND_DIR, "app/api/simulados/enviar/route.ts"), "utf-8");
  assert.match(src, /\.in\("item_id",\s*targetQuestionIds\)/);
  assert.match(src, /\.upsert\(sm2Upserts/);
});

test("SM-2 failure aligns gentle -0.2 EF penalty with backend sm2.py", () => {
  const { calcularProximoIntervaloSM2 } = loadTsModule("lib/sm2.ts");
  const ref = new Date(2026, 10, 24, 12, 0, 0);
  const res = calcularProximoIntervaloSM2(3, 2.5, 10, false, 1, ref);
  assert.equal(res.repeticoes, 0);
  assert.equal(res.intervalo_dias, 1);
  assert.equal(res.fator_facilidade, 2.3);
});

test("AI routes wire rate limiting, configurable timeouts, and X-Request-Id", () => {
  for (const route of ["hint", "solve", "compare"]) {
    const src = fs.readFileSync(path.join(FRONTEND_DIR, `app/api/ai/${route}/route.ts`), "utf-8");
    assert.match(src, /enforceAiRateLimit/);
    assert.match(src, /tutorBackendTimeoutMs/);
    assert.match(src, /X-Request-Id/);
  }
});

test("Simulados enviar records blank items with safe DB fallback", () => {
  const src = fs.readFileSync(path.join(FRONTEND_DIR, "app/api/simulados/enviar/route.ts"), "utf-8");
  assert.match(src, /simulado_em_branco/);
  assert.match(src, /item\.tipo_erro !== "simulado_em_branco"/);
});
