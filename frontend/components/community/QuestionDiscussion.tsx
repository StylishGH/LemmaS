"use client";

import { useEffect, useId, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { MessageSquare, X } from 'lucide-react';
import { communityRequest, type CommunityPage } from '@/lib/community';
import { useUserProfile } from '@/lib/use-user';
import { CommentForm } from './CommentForm';
import { CommentThread } from './CommentThread';

const emptySubscribe = () => () => {};

export interface QuestionDiscussionProps {
  questionId: number;
  children?: ReactNode;
  variant?: 'header' | 'inline';
  showEdgeTab?: boolean;
}

const navButtonClass =
  'rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-amber-500/20 dark:text-zinc-200 dark:hover:bg-white/10';

export function QuestionDiscussion({
  questionId,
  children,
  variant = 'header',
  showEdgeTab = false,
}: QuestionDiscussionProps) {
  const { profile } = useUserProfile();
  const drawerId = useId();
  const [open, setOpen] = useState(false);
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [sort, setSort] = useState<'popular' | 'recent'>('popular');
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<CommunityPage | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    communityRequest<CommunityPage>(
      `/api/community?questionId=${questionId}&sort=${sort}&page=${page}`,
      { signal: controller.signal },
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          setError('');
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Não foi possível carregar os comentários.');
        }
      });
    return () => controller.abort();
  }, [questionId, sort, page, revision, profile.email, profile.emailVerificado]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const totalCount = data?.total ?? 0;
  const hasComments = totalCount > 0;
  const refresh = () => setRevision((value) => value + 1);

  const triggerClass =
    variant === 'inline'
      ? `inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
          open || hasComments
            ? 'border-blue-500/35 bg-blue-500/10 text-blue-700 hover:bg-blue-500/15 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-[#d9b452] dark:hover:bg-amber-500/15'
            : 'border-slate-200 text-slate-600 hover:border-blue-500/30 hover:text-blue-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-amber-500/30 dark:hover:text-[#d9b452]'
        }`
      : `flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
          open || hasComments
            ? 'border-blue-500/30 bg-blue-500/10 text-blue-700 hover:bg-blue-500/15 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-[#d9b452] dark:hover:bg-amber-500/15'
            : 'border-slate-200 text-slate-500 hover:border-blue-500/25 hover:bg-blue-500/10 hover:text-blue-600 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-amber-500/25 dark:hover:bg-amber-500/10 dark:hover:text-[#d9b452]'
        }`;

  const pillClass =
    open || hasComments
      ? 'rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white dark:bg-amber-500 dark:text-zinc-950'
      : 'rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold leading-none text-slate-600 dark:bg-zinc-800 dark:text-zinc-300';

  const countLabel = data ? `${totalCount}` : '…';
  const totalSummary = `${totalCount} ${totalCount === 1 ? 'comentário' : 'comentários'}`;

  return (
    <>
      {children}

      <button
        type="button"
        aria-expanded={open}
        aria-controls={drawerId}
        onClick={() => setOpen(true)}
        className={triggerClass}
        title="Abrir painel lateral de comentários da questão"
      >
        <MessageSquare className="h-3.5 w-3.5 shrink-0" />
        <span>Comentários</span>
        <span className={pillClass}>{countLabel}</span>
      </button>

      {showEdgeTab && !open && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={drawerId}
          aria-label={`Abrir comentários da questão ${questionId} (${totalSummary})`}
          onClick={() => setOpen(true)}
          className="fixed right-0 top-1/2 z-40 hidden -translate-y-1/2 cursor-pointer flex-col items-center gap-1.5 rounded-l-xl border border-r-0 border-slate-200 bg-white/95 px-2.5 py-3 text-slate-700 shadow-lg backdrop-blur-sm transition-colors hover:bg-blue-50 hover:text-blue-700 dark:border-amber-500/30 dark:bg-[#141222]/95 dark:text-[#dedbd0] dark:hover:bg-[#1b172e] dark:hover:text-[#d9b452] md:flex"
          title={`Comentários da Questão #${questionId}`}
        >
          <MessageSquare className="h-4 w-4 text-blue-600 dark:text-[#d9b452]" />
          <span className={pillClass}>{countLabel}</span>
          <span className="text-[11px] font-semibold tracking-wide [writing-mode:vertical-rl] rotate-180">
            Comentários
          </span>
        </button>
      )}

      {open &&
        isClient &&
        createPortal(
          <div className="fixed inset-0 z-[70]">
            <div
              aria-hidden="true"
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
            />

            <aside
              id={drawerId}
              role="dialog"
              aria-modal="true"
              aria-label={`Comentários da questão ${questionId}`}
              className="fixed inset-y-0 right-0 z-[75] flex h-full w-full max-w-[460px] flex-col border-l border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-amber-500/20 dark:bg-[#141222] dark:text-[#f5f0df]"
            >
              <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3.5 backdrop-blur-sm dark:border-amber-500/20 dark:bg-[#141222]/95">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-[#f5f0df]">
                      <MessageSquare className="h-4 w-4 shrink-0 text-blue-600 dark:text-[#d9b452]" />
                      <span className="truncate">Comentários · Questão #{questionId}</span>
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                      {data ? totalSummary : 'Carregando discussão…'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Fechar comentários"
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-amber-500/20 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-[#f5f0df]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-300">
                    <span>Ordenar:</span>
                    <select
                      value={sort}
                      onChange={(event) => {
                        setPage(0);
                        setSort(event.target.value as 'popular' | 'recent');
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-900 dark:border-amber-500/20 dark:bg-[#1e2329] dark:text-[#f5f0df]"
                    >
                      <option value="popular">Mais curtidos</option>
                      <option value="recent">Mais recentes</option>
                    </select>
                  </label>

                  {data?.isAdmin && (
                    <Link
                      href="/admin/comments"
                      className="text-xs font-medium text-blue-700 underline hover:text-blue-800 dark:text-[#d9b452]"
                    >
                      Moderação
                    </Link>
                  )}
                </div>
              </header>

              <div className="flex-1 space-y-5 overflow-y-auto p-4">
                {data?.canPost ? (
                  <CommentForm
                    questionId={questionId}
                    alias={data.alias}
                    avatarUrl={profile.fotoUrl}
                    onPublished={() => {
                      setPage(0);
                      setSort('recent');
                      refresh();
                    }}
                  />
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600 dark:border-amber-500/20 dark:bg-[#1b192b] dark:text-zinc-300">
                    {profile.isGuest ? (
                      <>
                        <Link
                          className="font-semibold text-blue-700 underline dark:text-[#d9b452]"
                          href={`/login?tab=signin&redirectTo=${encodeURIComponent(`/resolver?id=${questionId}`)}`}
                        >
                          Entre na sua conta
                        </Link>{' '}
                        com e-mail confirmado para comentar, curtir ou denunciar. A leitura é livre.
                      </>
                    ) : (
                      'Entre com e-mail confirmado para comentar, curtir ou denunciar.'
                    )}
                  </div>
                )}

                {error ? (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-400 bg-red-50 p-4 text-xs text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200"
                  >
                    <p>{error}</p>
                    <button type="button" onClick={refresh} className="mt-2 font-semibold underline">
                      Tentar novamente
                    </button>
                  </div>
                ) : !data ? (
                  <p role="status" className="py-6 text-center text-xs text-slate-500 dark:text-zinc-400">
                    Carregando comentários…
                  </p>
                ) : data.items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center dark:border-amber-500/20">
                    <p className="text-xs font-medium text-slate-600 dark:text-zinc-300">
                      Ainda não há comentários nesta questão.
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
                      Compartilhe uma dúvida, dica ou abordagem alternativa!
                    </p>
                  </div>
                ) : (
                  <div aria-live="polite">
                    {data.items.map((comment) => (
                      <CommentThread
                        key={comment.id}
                        comment={comment}
                        canPost={Boolean(data.canPost)}
                        alias={data.alias}
                        currentUserAvatar={profile.fotoUrl}
                        revision={revision}
                        onChanged={refresh}
                      />
                    ))}
                  </div>
                )}

                {data && (page > 0 || data.hasMore) && (
                  <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3 dark:border-amber-500/20">
                    <button
                      type="button"
                      className={navButtonClass}
                      disabled={page === 0}
                      onClick={() => setPage(page - 1)}
                    >
                      Anteriores
                    </button>
                    <span className="text-xs text-slate-500 dark:text-zinc-400">Página {page + 1}</span>
                    <button
                      type="button"
                      className={navButtonClass}
                      disabled={!data.hasMore}
                      onClick={() => setPage(page + 1)}
                    >
                      Mais comentários
                    </button>
                  </div>
                )}
              </div>
            </aside>
          </div>,
          document.body,
        )}
    </>
  );
}

export default QuestionDiscussion;
