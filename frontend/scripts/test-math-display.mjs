import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import katex from "katex";

function moduleUrl(source) {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  return `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
}

const parserUrl = moduleUrl(await readFile(new URL("../lib/math-parser.ts", import.meta.url), "utf8"));
const source = await readFile(new URL("../lib/math-sanitize.ts", import.meta.url), "utf8");
const {
  KATEX_MACROS, TOKEN_REAL, cleanLatexForKatex, sanitizeMathText, renderMathText,
  isLikelyProseMistakenlyWrappedInMath,
} = await import(moduleUrl(source.replace('"./math-parser"', JSON.stringify(parserUrl))));

function formulasOf(text) {
  const parts = renderMathText(text);
  const formulas = parts.filter(part => part.type !== "text");
  for (const part of formulas) {
    for (const latex of [part.content, cleanLatexForKatex(part.content)]) {
      assert.match(katex.renderToString(latex, {
        throwOnError: true, macros: KATEX_MACROS, displayMode: part.type === "block",
      }), /class="katex/);
    }
  }
  assert.ok(parts.every(part => !part.content.includes(TOKEN_REAL)));
  return { parts, formulas };
}

test("#333 keeps reais in prose and converts literal newlines before Classes, B, C and Se", () => {
  const text = "R$ 1 680,00.\n\\nClasses A e B\\nB: 10\\nC: 20\\nSe $x = 10$, qual o lucro?";
  const { parts, formulas } = formulasOf(text);
  assert.deepEqual(formulas, [{ type: "inline", content: "x = 10" }]);
  assert.equal(parts[0].type, "text");
  assert.match(parts[0].content, /^R\$ 1 680,00\.\n\nClasses A e B\nB: 10\nC: 20\nSe /);
  assert.ok(sanitizeMathText(text).includes("R$ 1 680,00."));
  assert.ok(!sanitizeMathText(text).includes(TOKEN_REAL));
  assert.ok(sanitizeMathText(text, { preserveCurrencyToken: true }).includes(TOKEN_REAL));
});

test("preserves not, neq, nabla and notin while converting nLogo to a line break", () => {
  const text = String.raw`Se $x \not\in A$ e $a \neq b$ e $\nabla f = 0$ e $x \notin B$\nLogo funciona.`;
  const { parts, formulas } = formulasOf(text);
  assert.deepEqual(formulas.map(part => part.content), [
    String.raw`x \not\in A`, String.raw`a \neq b`, String.raw`\nabla f = 0`, String.raw`x \notin B`,
  ]);
  assert.equal(parts.at(-1).content, "\nLogo funciona.");
  assert.equal(cleanLatexForKatex(String.raw`x \not\in A`), String.raw`x \not\in A`);
});

test("literal newline conversion respects odd backslash counts and all supported n commands", () => {
  assert.equal(sanitizeMathText(String.raw`A\r\nB\nC`), "A\nB\nC");
  assert.equal(sanitizeMathText(String.raw`A\\nB`), String.raw`A\\nB`);
  assert.equal(sanitizeMathText(String.raw`A\\\nB`), "A\\\\\nB");
  const commands = "not ne neq neg nexists newline notin ni nu nabla natural ncong nmid nleq ngeq nless ngtr nsubset nsubseteq nsupset nsupseteq nparallel nrightarrow nleftarrow nRightarrow nLeftarrow nshortmid nshortparallel nsim nvDash nvdash nVDash nolimits normalsize noindent nonumber notag nobreakspace".split(" ");
  for (const command of commands) {
    const formula = `$a \\${command} b$`;
    assert.equal(sanitizeMathText(formula), formula, command);
  }
});

test("#83 and #22966 preserve complete operatorname formulas as inline math", () => {
  const { formulas } = formulasOf(String.raw`Determine $\operatorname{arcsen}\left(\frac{1}{2}\right)$ e $\operatorname{sen}(x)$`);
  assert.deepEqual(formulas, [
    { type: "inline", content: String.raw`\operatorname{arcsen}\left(\frac{1}{2}\right)` },
    { type: "inline", content: String.raw`\operatorname{sen}(x)` },
  ]);
});

test("#59 preserves the entire matrix equality in one valid math token", () => {
  const latex = String.raw`A = \begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}`;
  const { parts, formulas } = formulasOf(`Dada $${latex}$`);
  assert.equal(formulas.length, 1);
  assert.equal(formulas[0].content, latex);
  assert.equal(parts[0].content, "Dada ");
  assert.ok(!parts.some(part => part.type === "text" && /[$\\]/.test(part.content)));
});

test("Portuguese prose mistakenly wrapped in inline or block dollars stays readable text", () => {
  const prose = "Seja um triângulo de lado igual a cinco";
  for (const delimiter of ["$", "$$"]) {
    const { parts, formulas } = formulasOf(`${delimiter}${prose}${delimiter}`);
    assert.equal(formulas.length, 0);
    assert.equal(parts.map(part => part.content).join("").trim(), prose);
  }
});

test("prose detection ignores command arguments and requires more words around explicit math", () => {
  assert.equal(isLikelyProseMistakenlyWrappedInMath(String.raw`\operatorname{arcsen} \mathrm{sen} \begin{pmatrix} \end{pmatrix}`, 2), false);
  assert.equal(isLikelyProseMistakenlyWrappedInMath(String.raw`\frac{1}{2} lado igual`, 2), false);
  assert.equal(isLikelyProseMistakenlyWrappedInMath(String.raw`\frac{1}{2} Seja um lado igual`, 2), true);
  assert.equal(isLikelyProseMistakenlyWrappedInMath(String.raw`\frac{1}{2} Seja um lado igual`, 3), false);
  assert.equal(isLikelyProseMistakenlyWrappedInMath("lado igual", 2), true);
});

test("#330 renders overparen and degree notation through the shared macro table", () => {
  const { formulas } = formulasOf(String.raw`A medida do arco $\overparen{AB}$ é $60^\circ$`);
  assert.deepEqual(formulas.map(part => part.content), [String.raw`\overparen{AB}`, String.raw`60^\circ`]);
});

test("currency is restored according to text, inline and block context and survives KaTeX cleanup", () => {
  const { parts, formulas } = formulasOf("Preço R$ 20 e $R$ 30$ ou $$R$ 40$$");
  assert.equal(parts[0].content, "Preço R$ 20 e ");
  assert.deepEqual(formulas, [
    { type: "inline", content: String.raw`R\$ 30` },
    { type: "block", content: String.raw`R\$ 40` },
  ]);
  assert.equal(cleanLatexForKatex(String.raw`R\$ 30`), String.raw`R\$ 30`);
});

test("standalone environments remain blocks and existing macros render", () => {
  const { formulas } = formulasOf(String.raw`Dada \begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix} e $\sen x \in \RR$`);
  assert.equal(formulas.length, 2);
  assert.equal(formulas[0].type, "block");
  assert.equal(formulas[1].content, String.raw`\sen x \in \RR`);
});

test("empty and invalid runtime inputs return empty results", () => {
  for (const value of ["", null, undefined, 42]) {
    assert.equal(sanitizeMathText(value), "");
    assert.equal(cleanLatexForKatex(value), "");
    assert.deepEqual(renderMathText(value), []);
  }
});
