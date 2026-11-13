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
  KATEX_MACROS, TOKEN_REAL, shieldBrlCurrency, cleanLatexForKatex, sanitizeMathText, renderMathText,
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
  const { parts, formulas } = formulasOf(String.raw`Preço R$ 20 e $\text{custa R$ 30}$ ou $$\text{valor R$ 40}$$`);
  assert.equal(parts[0].content, "Preço R$ 20 e ");
  assert.deepEqual(formulas, [
    { type: "inline", content: String.raw`\text{custa R\$ 30}` },
    { type: "block", content: String.raw`\text{valor R\$ 40}` },
  ]);
  assert.equal(cleanLatexForKatex(String.raw`R\$ 30`), String.raw`R\$ 30`);
});

test("math variable R before closing delimiters is never mistaken for R$ currency", () => {
  const cases = [
    {
      input: String.raw`Seja $R$ o raio da circunferência e $C = 2\pi R$ o comprimento.`,
      expected: [
        { type: "inline", content: "R" },
        { type: "inline", content: String.raw`C = 2\pi R` },
      ],
    },
    {
      input: "Se $x = R$ e $y = 2$",
      expected: [
        { type: "inline", content: "x = R" },
        { type: "inline", content: "y = 2" },
      ],
    },
    {
      input: "$$x = R$$",
      expected: [{ type: "block", content: "x = R" }],
    },
    {
      input: "O valor de $R$ é 10.",
      expected: [{ type: "inline", content: "R" }],
    },
    {
      input: "Calcule $f(R)$ e $2R$",
      expected: [
        { type: "inline", content: "f(R)" },
        { type: "inline", content: "2R" },
      ],
    },
    {
      input: "Seja $R$ 10 vezes maior.",
      expected: [{ type: "inline", content: "R" }],
    },
  ];

  for (const { input, expected } of cases) {
    const { formulas } = formulasOf(input);
    assert.deepEqual(formulas, expected, input);
    assert.equal(shieldBrlCurrency(input), input, input);
    assert.equal(sanitizeMathText(input).trim(), input, input);
  }

  const mixed = "Para $x = 5$, temos R$ 30,00 e $y = R$.";
  const { parts, formulas } = formulasOf(mixed);
  assert.deepEqual(formulas, [
    { type: "inline", content: "x = 5" },
    { type: "inline", content: "y = R" },
  ]);
  assert.equal(parts.map(part => part.content).join(""), "Para x = 5, temos R$ 30,00 e y = R.");
  assert.equal(parts[2].content, ", temos R$ 30,00 e ");
});

test("currency shielding respects math delimiters, prefixes, newlines and \\text edges", () => {
  const withParenAndBracket = String.raw`Temos \(x = R\) e \[y = R\] e custo R$ 50 e R$$z = 1$$.`;
  const { parts, formulas } = formulasOf(withParenAndBracket);
  assert.deepEqual(formulas, [
    { type: "inline", content: "x = R" },
    { type: "block", content: "y = R" },
    { type: "block", content: "z = 1" },
  ]);
  assert.ok(parts.some(part => part.type === "text" && part.content.includes("custo R$ 50 e R")));

  const withLiteralNewline = String.raw`Total:\nR$ 50,00 e $R$`;
  const newlineResult = formulasOf(withLiteralNewline);
  assert.deepEqual(newlineResult.formulas, [{ type: "inline", content: "R" }]);
  assert.equal(newlineResult.parts[0].content, "Total:\nR$ 50,00 e ");

  const innerMathInText = String.raw`$\text{onde $x = R$ e custa R$ 50}$`;
  assert.equal(
    shieldBrlCurrency(innerMathInText),
    String.raw`$\text{onde $x = R$ e custa ` + TOKEN_REAL + String.raw` 50}$`,
  );

  const blockWithInnerMathInText = String.raw`$$\text{onde $x = R$ e custa R$ 50}$$`;
  const blockResult = formulasOf(blockWithInnerMathInText);
  assert.deepEqual(blockResult.formulas, [
    { type: "block", content: String.raw`\text{onde $x = R$ e custa R\$ 50}` },
  ]);

  const closedTextBeforeR = String.raw`Se $\text{para } R$ 10 e R$ 20`;
  const closedTextResult = formulasOf(closedTextBeforeR);
  assert.deepEqual(closedTextResult.formulas, [{ type: "inline", content: String.raw`\text{para } R` }]);
  assert.equal(closedTextResult.parts.at(-1).content, " 10 e R$ 20");

  for (const untouched of ["EUR$ 20", "2R$ 20", "_R$ 20", String.raw`\R$ 20`, String.raw`$\text{se $R$ 10}$`]) {
    assert.equal(shieldBrlCurrency(untouched), untouched, untouched);
  }
});

test("cleanLatexForKatex preserves escaped \\$ while stripping unescaped outer and internal $", () => {
  for (const input of [String.raw`R\$`, String.raw`x = R\$`, String.raw`$R\$$`, String.raw`$$R\$$$`]) {
    const cleaned = cleanLatexForKatex(input);
    const expected = input === String.raw`x = R\$` ? String.raw`x = R\$` : String.raw`R\$`;
    assert.equal(cleaned, expected, input);
    assert.match(katex.renderToString(cleaned, { throwOnError: true, macros: KATEX_MACROS }), /class="katex/);
  }

  assert.equal(cleanLatexForKatex(String.raw`R\\$`), String.raw`R\\`);
  assert.equal(cleanLatexForKatex(String.raw`$R\\$`), String.raw`R\\`);
  assert.equal(cleanLatexForKatex(String.raw`a \\$ b`), String.raw`a \\ b`);
  assert.equal(cleanLatexForKatex(String.raw`a \\\$ b`), String.raw`a \\\$ b`);
});

test("multiline environments inside inline $ stay single inline formulas without crossing $ pairs", () => {
  const multilineInline = "Dada $A = \\begin{pmatrix}\n1 & 2 \\\\\n3 & 4\n\\end{pmatrix}$";
  const { parts, formulas } = formulasOf(multilineInline);
  assert.equal(parts[0].content, "Dada ");
  assert.deepEqual(formulas, [
    { type: "inline", content: "A = \\begin{pmatrix}\n1 & 2 \\\\\n3 & 4\n\\end{pmatrix}" },
  ]);

  const alignedWithEq = formulasOf("Dada $\\begin{aligned}\nx = 1 \\\\\ny = 2\n\\end{aligned}$");
  assert.deepEqual(alignedWithEq.formulas, [
    { type: "inline", content: "\\begin{aligned}\nx = 1 \\\\\ny = 2\n\\end{aligned}" },
  ]);
  assert.match(katex.renderToString(alignedWithEq.formulas[0].content, { throwOnError: true, macros: KATEX_MACROS }), /class="katex/);

  const startOfNewLine = formulasOf("Dada:\n$A = \\begin{pmatrix}\n1 & 2 \\\\\n3 & 4\n\\end{pmatrix}$");
  assert.equal(startOfNewLine.parts[0].content, "Dada:\n");
  assert.deepEqual(startOfNewLine.formulas, [
    { type: "inline", content: "A = \\begin{pmatrix}\n1 & 2 \\\\\n3 & 4\n\\end{pmatrix}" },
  ]);

  const mixedSingleAndMultiline = formulasOf("$A = \\begin{pmatrix} 1 \\\\ 2 \\end{pmatrix}$ e $\\begin{pmatrix}\n3 \\\\\n4\n\\end{pmatrix}$");
  assert.deepEqual(mixedSingleAndMultiline.formulas, [
    { type: "inline", content: "A = \\begin{pmatrix} 1 \\\\ 2 \\end{pmatrix}" },
    { type: "inline", content: "\\begin{pmatrix}\n3 \\\\\n4\n\\end{pmatrix}" },
  ]);

  const trailingMathAfterEnd = formulasOf("Dada $A = \\begin{pmatrix}\n1 & 2 \\\\\n3 & 4\n\\end{pmatrix} + I$");
  assert.deepEqual(trailingMathAfterEnd.formulas, [
    { type: "inline", content: "A = \\begin{pmatrix}\n1 & 2 \\\\\n3 & 4\n\\end{pmatrix} + I" },
  ]);
  assert.match(katex.renderToString(trailingMathAfterEnd.formulas[0].content, { throwOnError: true, macros: KATEX_MACROS }), /class="katex/);

  const separateInlineAndBlock = "$x = 1$ e \\begin{pmatrix}\n1 & 2 \\\\\n3 & 4\n\\end{pmatrix} e $y = 2$";
  const separate = formulasOf(separateInlineAndBlock);
  assert.deepEqual(separate.formulas, [
    { type: "inline", content: "x = 1" },
    { type: "block", content: "\\begin{pmatrix}\n1 & 2 \\\\\n3 & 4\n\\end{pmatrix}" },
    { type: "inline", content: "y = 2" },
  ]);

  const singleLineThenMultiline = formulasOf("$x = 1$ e $\\begin{aligned}\ny = 2\n\\end{aligned}$");
  assert.deepEqual(singleLineThenMultiline.formulas, [
    { type: "inline", content: "x = 1" },
    { type: "inline", content: "\\begin{aligned}\ny = 2\n\\end{aligned}" },
  ]);
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
