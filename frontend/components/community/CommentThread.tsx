"use client";

import { useEffect, useId, useState } from 'react';
import { Flag, MessageSquare, ThumbsUp, Trash2 } from 'lucide-react';
import { communityRequest, REPORT_REASONS, writeCommunity, type CommunityComment, type CommunityPage } from '@/lib/community';
import { CommentAvatar } from './CommentAvatar';
import { CommentForm } from './CommentForm';
import { CommentText } from './CommentText';

export interface ThreadProps {
  comment: CommunityComment;
  canPost: boolean;
  alias: string | null;
  currentUserAvatar?: string | null;
  revision: number;
  onChanged: () => void;
}

const actionClass =
  'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-[#f5f0df]';

export function CommentThread({
  comment,
  canPost,
  alias,
  currentUserAvatar,
  revision,
  onChanged,
}: ThreadProps) {
  const [revealed, setRevealed] = useState(false);
  const [replying, setReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [reason, setReason] = useState('spam');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const reportId = useId();
  const removed = comment.status === 'removed';
  const effectiveAvatar = removed ? null : (comment.avatarUrl ?? (comment.mine ? currentUserAvatar : null));

  async function act(action: string) {
    setPending(true);
    setNotice('');
    try {
      await writeCommunity({ action, questionId: comment.questionId, commentId: comment.id, reason });
      if (action === 'report') {
        setReporting(false);
        setNotice('Denúncia recebida para revisão humana.');
      } else {
        setRemoving(false);
        onChanged();
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Não foi possível concluir.');
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="border-b border-slate-200/80 py-4 last:border-b-0 dark:border-amber-500/15">
      <div className="flex items-start gap-3">
        <CommentAvatar
          alias={comment.alias}
          avatarUrl={effectiveAvatar}
          size={comment.parentId ? 'sm' : 'md'}
          removed={removed}
        />

        <div className="min-w-0 flex-1 space-y-2">
          <header className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate font-semibold text-sm text-slate-900 dark:text-zinc-100">
              {comment.alias}
            </span>
            {comment.mine && !removed && (
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-amber-500/15 dark:text-[#d9b452]">
                Você
              </span>
            )}
            <time dateTime={comment.createdAt} className="text-[11px] text-slate-500 dark:text-zinc-400">
              {new Date(comment.createdAt).toLocaleString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </time>
          </header>

          {removed ? (
            <p className="text-sm italic text-slate-500 dark:text-zinc-400">
              O autor removeu este comentário.
            </p>
          ) : comment.spoiler && !revealed ? (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="w-full rounded-lg border border-amber-400 bg-amber-50 px-3.5 py-2.5 text-left text-xs font-medium text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/60"
            >
              Contém spoiler · Mostrar comentário
            </button>
          ) : (
            <div className="space-y-1.5 text-slate-800 dark:text-[#e9e4d5]">
              {comment.spoiler && (
                <button type="button" onClick={() => setRevealed(false)} className={actionClass}>
                  Ocultar spoiler
                </button>
              )}
              <CommentText text={comment.body} />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            {!removed && (
              <button
                type="button"
                className={`${actionClass} ${comment.liked ? '!text-blue-700 bg-blue-50 dark:bg-amber-500/15 dark:!text-[#d9b452]' : ''}`}
                aria-label={`${comment.liked ? 'Descurtir' : 'Curtir'} comentário de ${comment.alias}`}
                aria-pressed={comment.liked}
                disabled={!canPost || pending}
                onClick={() => void act(comment.liked ? 'unlike' : 'like')}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                <span>{comment.likes}</span>
              </button>
            )}
            {!comment.parentId && canPost && (
              <button
                type="button"
                className={actionClass}
                onClick={() => setReplying(!replying)}
                aria-expanded={replying}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Responder</span>
              </button>
            )}
            {!comment.parentId && comment.replyCount > 0 && (
              <button
                type="button"
                className={actionClass}
                onClick={() => setShowReplies(!showReplies)}
                aria-expanded={showReplies}
              >
                {showReplies ? 'Ocultar respostas' : `Ver respostas (${comment.replyCount})`}
              </button>
            )}
            {!removed && canPost && (
              <button
                type="button"
                className={actionClass}
                onClick={() => setReporting(!reporting)}
                aria-expanded={reporting}
              >
                <Flag className="h-3.5 w-3.5" />
                <span>Denunciar</span>
              </button>
            )}
            {!removed && comment.mine && (
              <button
                type="button"
                className={`${actionClass} hover:!text-rose-700 dark:hover:!text-rose-300`}
                onClick={() => setRemoving(!removing)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remover</span>
              </button>
            )}
          </div>

          {removing && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-rose-200 bg-rose-50/80 p-2.5 text-xs text-rose-900 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-200">
              <span>Remover seu comentário? As respostas serão preservadas.</span>
              <button className={`${actionClass} font-semibold !text-rose-700 dark:!text-rose-300`} disabled={pending} onClick={() => void act('remove')}>
                Sim, remover
              </button>
              <button className={actionClass} disabled={pending} onClick={() => setRemoving(false)}>
                Cancelar
              </button>
            </div>
          )}

          {reporting && (
            <form
              className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-zinc-700 dark:bg-zinc-900/60"
              onSubmit={(e) => {
                e.preventDefault();
                void act('report');
              }}
            >
              <label htmlFor={reportId} className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                Motivo
              </label>
              <select
                id={reportId}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              >
                {Object.entries(REPORT_REASONS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button disabled={pending} className={actionClass}>
                Enviar denúncia
              </button>
              <button type="button" className={actionClass} onClick={() => setReporting(false)}>
                Cancelar
              </button>
            </form>
          )}

          {notice && (
            <p role="status" className="text-xs text-slate-700 dark:text-zinc-200">
              {notice}
            </p>
          )}

          {replying && (
            <CommentForm
              questionId={comment.questionId}
              parentId={comment.id}
              alias={alias}
              avatarUrl={currentUserAvatar}
              onCancel={() => setReplying(false)}
              onPublished={() => {
                setReplying(false);
                setShowReplies(true);
                onChanged();
              }}
            />
          )}

          {showReplies && (
            <Replies
              comment={comment}
              canPost={canPost}
              alias={alias}
              currentUserAvatar={currentUserAvatar}
              revision={revision}
              onChanged={onChanged}
            />
          )}
        </div>
      </div>
    </article>
  );
}

function Replies({ comment, canPost, alias, currentUserAvatar, revision, onChanged }: ThreadProps) {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<CommunityPage | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    communityRequest<CommunityPage>(
      `/api/community?questionId=${comment.questionId}&parentId=${comment.id}&sort=recent&page=${page}`,
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
          setError(err instanceof Error ? err.message : 'Erro ao carregar respostas.');
        }
      });
    return () => controller.abort();
  }, [comment.id, comment.questionId, page, revision, retry]);

  return (
    <div className="mt-2 border-l-2 border-slate-200 pl-3 dark:border-amber-500/20">
      {error ? (
        <p role="alert" className="text-xs text-red-700 dark:text-red-300">
          {error}{' '}
          <button type="button" className={actionClass} onClick={() => setRetry(retry + 1)}>
            Tentar novamente
          </button>
        </p>
      ) : !data ? (
        <p role="status" className="py-2 text-xs text-slate-500 dark:text-zinc-400">
          Carregando respostas…
        </p>
      ) : (
        <>
          {data.items.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              canPost={canPost}
              alias={alias}
              currentUserAvatar={currentUserAvatar}
              revision={revision}
              onChanged={onChanged}
            />
          ))}
          {data.items.length === 0 && (
            <p className="py-2 text-xs text-slate-600 dark:text-zinc-400">Nenhuma resposta disponível.</p>
          )}
          {(page > 0 || data.hasMore) && (
            <div className="flex gap-2 pt-1.5">
              <button
                type="button"
                className={`${actionClass} border border-slate-300 dark:border-zinc-600`}
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                Anteriores
              </button>
              <button
                type="button"
                className={`${actionClass} border border-slate-300 dark:border-zinc-600`}
                disabled={!data.hasMore}
                onClick={() => setPage(page + 1)}
              >
                Mais respostas
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
