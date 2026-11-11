import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import katex from "katex";
const source = await readFile(new URL("../lib/math-preview.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const { mathPreviewParts } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

test("recommendation preserves the full system when the budget ends inside it", () => {
  const text = String.raw`Considere a reta $r: \frac{x-1}{1} = \frac{y-2}{2} = \frac{z}{3}$ e a reta $s: \begin{cases} x = 1 + t \\ y = 2 + t \\ z = 3 + 3t \end{cases}$. Calcule o cosseno do ângulo entre as retas.`;
  const parts = mathPreviewParts(text);
  const formulas = parts.filter(p => p.type !== "text");
  assert.equal(formulas.length, 2);
  assert.ok(formulas[1].content.endsWith(String.raw`\end{cases}`));
  for (const formula of formulas) katex.renderToString(formula.content, { throwOnError: true });
  assert.equal(parts.at(-1).content, "…");
});
test("supports all explicit delimiters and leaves short text intact", () => {
  const parts = mathPreviewParts(String.raw`A $x$ B $$y$$ C \(z\) D \[w\]`, 200);
  assert.deepEqual(parts.filter(p => p.type !== "text").map(p => [p.type,p.content]), [["inline","x"],["block","y"],["inline","z"],["block","w"]]);
  assert.deepEqual(mathPreviewParts("Uma pergunta curta."), [{ type: "text", content: "Uma pergunta curta." }]);
});
test("truncates prose without duplicating it or treating reais as math", () => {
  assert.deepEqual(mathPreviewParts("abcdef", 3), [{type:"text",content:"abc"},{type:"text",content:"…"}]);
  assert.deepEqual(mathPreviewParts("Preço R$ 20 e R$ 30."), [{type:"text",content:"Preço R$ 20 e R$ 30."}]);
});
