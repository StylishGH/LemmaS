"use client";

import { useId, useState } from 'react';
import Link from 'next/link';
import { writeCommunity } from '@/lib/community';
import { CommentAvatar } from './CommentAvatar';

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-2 focus:outline-blue-600 dark:border-amber-500/20 dark:bg-[#141222] dark:text-[#f5f0df] dark:placeholder:text-zinc-400';

export function CommentForm({
  questionId,
  parentId,
  alias,
  avatarUrl,
  onPublished,
  onCancel,
}: {
  questionId: number;
  parentId?: string;
  alias: string | null;
  avatarUrl?: string | null;
  onPublished: () => void;
  onCancel?: () => void;
}) {
  const id = useId();
  const [body, setBody] = useState('');
  const [spoiler, setSpoiler] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  return (
    <form
      className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/90 p-3.5 dark:border-amber-500/20 dark:bg-[#1b192b]"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!alias) return;
        setPending(true);
        setError('');
        try {
          await writeCommunity({ action: 'post', questionId, parentId, body, spoiler, alias });
          setBody('');
          setSpoiler(false);
          onPublished();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Não foi possível publicar.');
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="flex items-center gap-2.5">
        <CommentAvatar alias={alias || 'Visitante'} avatarUrl={alias ? avatarUrl : null} size="sm" />
        {alias ? (
          <p className="min-w-0 truncate text-xs text-slate-600 dark:text-zinc-300">
            Comentando como <strong className="text-slate-900 dark:text-[#f5f0df]">{alias}</strong>
          </p>
        ) : (
          <p className="text-xs text-slate-700 dark:text-zinc-300">
            <Link href="/perfil#apelido-comunidade" className="font-semibold underline hover:text-blue-700 dark:hover:text-[#d9b452]">
              Defina seu apelido no perfil
            </Link>{' '}
            para participar da comunidade.
          </p>
        )}
      </div>

      <label htmlFor={`${id}-body`} className="block text-xs font-semibold text-slate-700 dark:text-zinc-200">
        {parentId ? 'Sua resposta' : 'Deixe seu comentário'}
      </label>

      <textarea
        id={`${id}-body`}
        className={`${inputClass} min-h-24 resize-y`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
        required
        disabled={pending}
        placeholder="Dúvida, dica, resolução ou observação…"
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-zinc-400">
        <span>Fórmulas opcionais: $x^2$ ou $$…$$</span>
        <span>{Array.from(body).length}/2.000</span>
      </div>

      <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-zinc-300 cursor-pointer">
        <input
          type="checkbox"
          checked={spoiler}
          disabled={pending}
          onChange={(e) => setSpoiler(e.target.checked)}
          className="rounded border-slate-300 text-blue-600 focus:ring-blue-600 dark:border-zinc-600 dark:bg-zinc-900"
        />
        Contém gabarito ou solução (spoiler)
      </label>

      {error && (
        <p role="alert" className="text-xs font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-0.5">
        <p className="text-[11px] text-slate-500 dark:text-zinc-400">
          Respeite quem está estudando.
        </p>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              disabled={pending}
              onClick={onCancel}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
          )}
          <button
            disabled={pending || !alias || !body.trim()}
            className="lemmas-gold-cta rounded-lg px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            {pending ? 'Publicando…' : parentId ? 'Responder' : 'Publicar'}
          </button>
        </div>
      </div>
    </form>
  );
}
