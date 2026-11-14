"use client";

import { useId, useState } from 'react';
import Link from 'next/link';
import { writeCommunity } from '@/lib/community';

const inputClass = 'w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-2 focus:outline-blue-600 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400';

export function CommentForm({ questionId, parentId, alias, onPublished, onCancel }: {
  questionId: number; parentId?: string; alias: string | null; onPublished: () => void; onCancel?: () => void;
}) {
  const id = useId();
  const [body, setBody] = useState('');
  const [spoiler, setSpoiler] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  return <form className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50" onSubmit={async (event) => {
    event.preventDefault();
    if (!alias) return;
    setPending(true); setError('');
    try {
      await writeCommunity({ action: 'post', questionId, parentId, body, spoiler, alias });
      setBody(''); setSpoiler(false); onPublished();
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível publicar.'); }
    finally { setPending(false); }
  }}>
    {alias ? <p className="text-xs text-slate-600 dark:text-zinc-400">Comentando como <strong>{alias}</strong></p> : <p className="text-sm"><Link href="/perfil#apelido-comunidade" className="font-semibold underline">Defina seu apelido no perfil</Link> para participar da comunidade.</p>}
    <label htmlFor={`${id}-body`} className="block text-sm font-medium">{parentId ? 'Sua resposta' : 'Deixe seu comentário'}</label>
    <textarea id={`${id}-body`} className={`${inputClass} min-h-28 resize-y`} value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} required disabled={pending} placeholder="Dúvida, piada, comemoração ou resolução…" />
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-zinc-400">
      <span>Fórmulas opcionais: $x^2$ ou $$…$$</span><span>{Array.from(body).length}/2.000</span>
    </div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={spoiler} disabled={pending} onChange={(e) => setSpoiler(e.target.checked)} />Contém gabarito ou solução (spoiler)</label>
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-slate-600 dark:text-zinc-400">Respeite quem está estudando. Sem spam, ofensas ou dados pessoais.</p>
      <div className="flex gap-2">
        {onCancel && <button type="button" disabled={pending} onClick={onCancel} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-zinc-600">Cancelar</button>}
        <button disabled={pending || !alias || !body.trim()} className="lemmas-gold-cta rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">{pending ? 'Publicando…' : parentId ? 'Responder' : 'Publicar'}</button>
      </div>
    </div>
  </form>;
}
