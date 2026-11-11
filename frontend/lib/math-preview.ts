export type MathPreviewPart = { type: "text" | "inline" | "block"; content: string };

/** Truncate prose while keeping explicitly delimited formulas atomic. */
export function mathPreviewParts(text: string, limit = 140): MathPreviewPart[] {
  const parts: MathPreviewPart[] = [];
  const pattern = /\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)|(?<![\\R$])\$(?!\$)((?:\\.|[^$\\])+)\$/g;
  let cursor = 0;
  let consumed = 0;
  const appendText = (value: string) => {
    const available = Math.max(0, limit - consumed);
    const content = value.slice(0, available);
    if (content) parts.push({ type: "text", content });
    consumed += content.length;
    return content.length === value.length;
  };
  for (const match of text.matchAll(pattern)) {
    if (!appendText(text.slice(cursor, match.index))) break;
    if (consumed >= limit) break;
    parts.push({
      type: match[1] !== undefined || match[2] !== undefined ? "block" : "inline",
      content: match[1] ?? match[2] ?? match[3] ?? match[4],
    });
    consumed += match[0].length;
    cursor = match.index + match[0].length;
    if (consumed >= limit) break;
  }
  if (consumed < limit) appendText(text.slice(cursor));
  if (consumed < text.length) parts.push({ type: "text", content: "…" });
  return parts;
}
