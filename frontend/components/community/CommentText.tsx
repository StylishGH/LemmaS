"use client";

import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// User text stays React-escaped. Only explicit math delimiters go to KaTeX;
// no markdown images, external links, HTML extensions or imported macros.
export function CommentText({ text }: { text: string }) {
  const parts = useMemo(() => text.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])/g).map((part) => {
    const display = part.startsWith('$$') || part.startsWith('\\[');
    const math = display || part.startsWith('$') || part.startsWith('\\(');
    if (!math) return { text: part };
    const source = part.slice(display || part.startsWith('\\(') ? 2 : 1, display || part.startsWith('\\(') ? -2 : -1);
    try {
      return { html: katex.renderToString(source, { displayMode: display, throwOnError: false, trust: false, strict: 'ignore', maxExpand: 100, maxSize: 10 }), display };
    } catch { return { text: part }; }
  }), [text]);
  return <div className="whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">
    {parts.map((part, i) => 'html' in part ? <span key={i} className={part.display ? 'block overflow-x-auto py-2' : ''} dangerouslySetInnerHTML={{ __html: part.html! }} /> : <span key={i}>{part.text}</span>)}
  </div>;
}
