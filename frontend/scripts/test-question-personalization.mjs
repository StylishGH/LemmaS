import assert from "node:assert/strict";
import test from "node:test";

// Integration regression: run against a local Next server.
// node --test scripts/test-question-personalization.mjs
const base = process.env.LEMMAS_TEST_URL || "http://localhost:3000";
async function questions(params = {}) {
  const response = await fetch(`${base}/api/questions?${new URLSearchParams({ limit: "15", ...params })}`);
  const result = await response.json();
  assert.equal(response.status, 200, result.details || result.error);
  return result;
}

test("profile priorities preserve the full catalog and put the chosen bank first", async () => {
  const [all, ranked] = await Promise.all([
    questions(), questions({ prefer_banca: "Escola Naval" }),
  ]);
  assert.equal(ranked.total, all.total);
  assert(ranked.questoes.length > 0);
  assert(ranked.questoes.every(q => q.banca === "Escola Naval"));
});

test("pagination crosses from preferred bank to the remaining catalog without duplicates", async () => {
  const bank = await questions({ banca: "Escola Naval", limit: "1" });
  assert(bank.total > 0);
  const page = Math.floor((bank.total - 1) / 15) + 1;
  const params = { prefer_banca: "Escola Naval" };
  const [boundary, next] = await Promise.all([
    questions({ ...params, page: String(page) }),
    questions({ ...params, page: String(page + 1) }),
  ]);
  const remainingPreferred = bank.total - (page - 1) * 15;
  assert(boundary.questoes.slice(0, remainingPreferred).every(q => q.banca === "Escola Naval"));
  assert(next.questoes.every(q => q.banca !== "Escola Naval"));
  const ids = [...boundary.questoes, ...next.questoes].map(q => q.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("manual bank filter wins over a conflicting profile preference", async () => {
  const [filtered, ranked] = await Promise.all([
    questions({ banca: "ENEM" }),
    questions({ banca: "ENEM", prefer_banca: "Escola Naval" }),
  ]);
  assert.equal(ranked.total, filtered.total);
  assert(ranked.questoes.length > 0);
  assert(ranked.questoes.every(q => q.banca === "ENEM"));
});

test("subject and combined preferences preserve catalog count, including missing metadata", async () => {
  const [all, subject, combined] = await Promise.all([
    questions(),
    questions({ prefer_materia: "Funções" }),
    questions({ prefer_banca: "Escola Naval", prefer_materia: "Funções" }),
  ]);
  assert.equal(subject.total, all.total);
  assert.equal(combined.total, all.total);
  assert(combined.questoes.every(q => q.banca === "Escola Naval"));
  assert.equal(new Set(combined.questoes.map(q => q.id)).size, combined.questoes.length);
});


test("deep pages translate offsets correctly after exhausting the preferred cohort", async () => {
  const preferred = await questions({ banca: "Escola Naval", limit: "1" });
  const page = Math.ceil(preferred.total / 15) + 1;
  const remainderIndex = (page - 1) * 15 - preferred.total;
  const [ranked, reference] = await Promise.all([
    questions({ banca: "Escola Naval,ENEM", prefer_banca: "Escola Naval", page: String(page) }),
    questions({ banca: "ENEM", prefer_banca: "Escola Naval", page: String(remainderIndex + 1), limit: "1" }),
  ]);
  assert(ranked.questoes.length > 0);
  assert.equal(ranked.questoes[0].id, reference.questoes[0].id);
});
