"use client";

import { mathPreviewParts } from "@/lib/math-preview";
import { MathDisplay, MathText } from "./MathDisplay";

/** Card preview: explicit math bypasses prose auto-detection. */
export function MathPreview({ text }: { text: string }) {
  return (
    <span className="whitespace-pre-line">
      {mathPreviewParts(text).map((part, index) =>
        part.type === "text" ? <MathText key={index} text={part.content} /> : (
          <MathDisplay key={index} displayMode={part.type === "block"}>{part.content}</MathDisplay>
        ),
      )}
    </span>
  );
}
