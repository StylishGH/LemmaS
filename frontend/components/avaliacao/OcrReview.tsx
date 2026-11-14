"use client";

import { useId, useState } from 'react';

export function OcrReview({ transcription, pending, onConfirm }: {
  transcription: string; pending?: boolean; onConfirm: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState(transcription);
  const id = useId();
  return <form className="space-y-3 rounded-xl border border-amber-400 bg-amber-50 p-4 text-slate-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-zinc-100" onSubmit={(event) => {
    event.preventDefault(); if (text.trim()) void onConfirm(text.trim());
  }}>
    <p className="text-sm font-semibold">Confira o que foi lido do seu rascunho</p>
    <p className="text-xs leading-relaxed">Um algarismo ou sinal pode ter sido lido de outra forma. Ajuste somente a transcrição para corresponder ao que você escreveu. A conta será avaliada novamente; confirmar a leitura não aprova a resolução.</p>
    <label htmlFor={id} className="block text-xs font-medium">Transcrição do manuscrito</label>
    <textarea id={id} value={text} onChange={(event) => setText(event.target.value)} maxLength={8000} rows={4} required disabled={pending} className="w-full resize-y rounded-lg border border-slate-300 bg-white p-3 font-mono text-sm text-slate-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100" />
    <p className="text-xs">Nenhuma penalização será aplicada enquanto esta leitura estiver pendente.</p>
    <button disabled={pending || !text.trim()} className="lemmas-gold-cta rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50">{pending ? 'Reavaliando…' : 'Confirmar leitura e reavaliar'}</button>
  </form>;
}
