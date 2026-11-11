import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../lib/question-page-cache.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const { QuestionPageCache } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

test("navigation adopts a pending prefetch and reuses completed pages", async () => {
  let calls = 0;
  let finish;
  const cache = new QuestionPageCache(() => {
    calls++;
    return new Promise(resolve => { finish = resolve; });
  });
  const background = cache.load(2);
  const foreground = cache.load(2);
  assert.equal(background, foreground);
  await Promise.resolve();
  assert.equal(calls, 1);
  finish({ ids: [16, 17] });
  await background;
  assert.deepEqual(await cache.load(2), { ids: [16, 17] });
  assert.equal(calls, 1);
});

test("failed prefetches are retried on navigation", async () => {
  let calls = 0;
  const cache = new QuestionPageCache(async () => {
    if (++calls === 1) throw new Error("offline");
    return { ids: [16] };
  });
  await assert.rejects(cache.load(2), /offline/);
  assert.deepEqual(await cache.load(2), { ids: [16] });
  assert.equal(calls, 2);
});

test("scope disposal aborts pending work and rejects late responses", async () => {
  let finish;
  let signal;
  const cache = new QuestionPageCache((page, requestSignal) => {
    signal = requestSignal;
    return new Promise(resolve => { finish = resolve; });
  });
  const pending = cache.load(1);
  await Promise.resolve();
  cache.dispose();
  assert(signal.aborted);
  finish({ ids: ["old-profile"] });
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(cache.peek(1), undefined);
  // Separate scopes never share their completed pages.
  const fresh = new QuestionPageCache(async () => ({ ids: ["new-profile"] }));
  assert.deepEqual(await fresh.load(1), { ids: ["new-profile"] });
});

test("completed page storage is bounded and retains recently visited pages", async () => {
  const calls = [];
  const cache = new QuestionPageCache(async page => { calls.push(page); return page; }, 2);
  await cache.load(1);
  await cache.load(2);
  assert.equal(cache.peek(1), 1);
  await cache.load(3);
  assert.equal(cache.peek(2), undefined);
  assert.equal(cache.peek(1), 1);
  await cache.load(2);
  assert.deepEqual(calls, [1, 2, 3, 2]);
});

test("disposing and reusing an instance does not let an old request remove the new one", async () => {
  const finishes = [];
  const cache = new QuestionPageCache(() => new Promise(resolve => finishes.push(resolve)));
  const old = cache.load(1);
  await Promise.resolve();
  cache.dispose();
  const fresh = cache.load(1);
  await Promise.resolve();
  finishes[0]("old");
  await assert.rejects(old, { name: "AbortError" });
  assert.equal(cache.load(1), fresh);
  finishes[1]("fresh");
  assert.equal(await fresh, "fresh");
});
