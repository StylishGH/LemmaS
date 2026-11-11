"use client";

import { Fragment } from "react";
import { MathDisplay } from "@/components/math/MathDisplay";

// Landing copy is curated with explicit delimiters. Preserve complete formulas,
// including matrix environments, without the inference used for imported text.
export function LandingMathText({ text }: { text: string }) {
  return <>{text.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g).map((part, index) => {
    const block = part.startsWith("$$") && part.endsWith("$$");
    const inline = part.startsWith("$") && part.endsWith("$");
    if (!block && !inline) return <Fragment key={index}>{part}</Fragment>;
    return (
      <MathDisplay
        key={index}
        displayMode={block}
        className={block ? "block max-w-full overflow-x-auto" : ""}
      >
        {part.slice(block ? 2 : 1, block ? -2 : -1)}
      </MathDisplay>
    );
  })}</>;
}
