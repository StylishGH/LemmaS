"use client";

import { useState } from 'react';
import { getCommentInitials, sanitizeAvatarUrl } from '@/lib/community';

const AVATAR_TONES = [
  'bg-blue-600/15 text-blue-700 ring-blue-500/30 dark:bg-sky-500/20 dark:text-sky-200 dark:ring-sky-400/30',
  'bg-amber-500/20 text-amber-800 ring-amber-500/35 dark:bg-amber-500/20 dark:text-[#f3d479] dark:ring-amber-400/35',
  'bg-emerald-600/15 text-emerald-700 ring-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-400/30',
  'bg-purple-600/15 text-purple-700 ring-purple-500/30 dark:bg-purple-500/20 dark:text-purple-200 dark:ring-purple-400/30',
  'bg-rose-600/15 text-rose-700 ring-rose-500/30 dark:bg-rose-500/20 dark:text-rose-200 dark:ring-rose-400/30',
  'bg-indigo-600/15 text-indigo-700 ring-indigo-500/30 dark:bg-indigo-500/20 dark:text-indigo-200 dark:ring-indigo-400/30',
] as const;

function pickAvatarTone(alias: string): string {
  let hash = 0;
  for (let i = 0; i < alias.length; i += 1) {
    hash = (hash * 31 + alias.charCodeAt(i)) >>> 0;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

export interface CommentAvatarProps {
  alias: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md';
  removed?: boolean;
}

export function CommentAvatar({ alias, avatarUrl, size = 'md', removed = false }: CommentAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const safeUrl = removed ? null : sanitizeAvatarUrl(avatarUrl);
  const sizeClass = size === 'sm' ? 'h-7 w-7 text-[11px]' : 'h-9 w-9 text-xs';

  if (safeUrl && failedUrl !== safeUrl) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={safeUrl}
        alt={`Foto de ${alias}`}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setFailedUrl(safeUrl)}
        className={`${sizeClass} shrink-0 rounded-full object-cover ring-1 ring-slate-200 dark:ring-white/15`}
      />
    );
  }

  const toneClass = removed
    ? 'bg-slate-200/80 text-slate-500 ring-slate-300 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700'
    : pickAvatarTone(alias);

  return (
    <span
      aria-hidden="true"
      className={`${sizeClass} ${toneClass} inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold uppercase tracking-tight ring-1`}
    >
      {removed ? '?' : getCommentInitials(alias)}
    </span>
  );
}
