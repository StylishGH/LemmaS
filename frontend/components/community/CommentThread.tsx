"use client";

import { useEffect, useId, useState } from 'react';
import { Flag, ThumbsUp } from 'lucide-react';
import { communityRequest, REPORT_REASONS, writeCommunity, type CommunityComment, type CommunityPage } from '@/lib/community';
import { CommentText } from './CommentText';
import { CommentForm } from './CommentForm';

export interface ThreadProps {
  comment: CommunityComment; canPost: boolean; alias: string | null; revision: number; onChanged: () => void;
}
const actionClass = 'rounded-md px-2 py-1 text-xs font-medium hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50 dark:hover:bg-zinc-800';

export function CommentThread({ comment, canPost, alias, revision, onChanged }: ThreadProps) {
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
  async function act(action: string) {
    setPending(true); setNotice('');
    try {
      await writeCommunity({ action, questionId: comment.questionId, commentId: comment.id, reason });
      if (action === 'report') { setReporting(false); setNotice('Denúncia recebida para revisão humana.'); }
      else { setRemoving(false); onChanged(); }
    } catch (err) { setNotice(err instanceof Error ? err.message : 'Não foi possível concluir.'); }
    finally { setPending(false); }
  }
  return <article className="space-y-3 border-b border-slate-200 py-5 last:border-b-0 dark:border-zinc-700">
    <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="font-semibold text-slate-900 dark:text-zinc-100">{comment.alias}</span>
      <time dateTime={comment.createdAt} className="text-xs text-slate-500 dark:text-zinc-400">{new Date(comment.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
    </header>
    {removed ? <p className="text-sm italic text-slate-500 dark:text-zinc-400">O autor removeu este comentário.</p> : comment.spoiler && !revealed ? <button type="button" onClick={() => setRevealed(true)} className="rounded-lg border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Contém spoiler · Mostrar comentário</button> : <>
      {comment.spoiler && <button type="button" onClick={() => setRevealed(false)} className={actionClass}>Ocultar spoiler</button>}
      <CommentText text={comment.body} />
    </>}
    <div className="flex flex-wrap items-center gap-2 text-slate-600 dark:text-zinc-300">
      {!removed && <button type="button" className={`${actionClass} inline-flex items-center gap-1 ${comment.liked ? 'text-blue-700 dark:text-amber-300' : ''}`} aria-label={`${comment.liked ? 'Descurtir' : 'Curtir'} comentário de ${comment.alias}`} aria-pressed={comment.liked} disabled={!canPost || pending} onClick={() => void act(comment.liked ? 'unlike' : 'like')}><ThumbsUp className="h-3.5 w-3.5" />{comment.likes}</button>}
      {!comment.parentId && canPost && <button type="button" className={actionClass} onClick={() => setReplying(!replying)} aria-expanded={replying}>Responder</button>}
      {!comment.parentId && comment.replyCount > 0 && <button type="button" className={actionClass} onClick={() => setShowReplies(!showReplies)} aria-expanded={showReplies}>{showReplies ? 'Ocultar respostas' : `Ver respostas (${comment.replyCount})`}</button>}
      {!removed && canPost && <button type="button" className={`${actionClass} inline-flex items-center gap-1`} onClick={() => setReporting(!reporting)} aria-expanded={reporting}><Flag className="h-3.5 w-3.5" />Denunciar</button>}
      {!removed && comment.mine && <button type="button" className={actionClass} onClick={() => setRemoving(!removing)}>Remover</button>}
    </div>
    {removing && <div className="flex flex-wrap items-center gap-2 text-sm"><span>Remover seu comentário? As respostas serão preservadas.</span><button className={actionClass} disabled={pending} onClick={() => void act('remove')}>Sim, remover</button><button className={actionClass} disabled={pending} onClick={() => setRemoving(false)}>Cancelar</button></div>}
    {reporting && <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); void act('report'); }}>
      <label htmlFor={reportId} className="text-sm">Motivo da denúncia</label>
      <select id={reportId} value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100">{Object.entries(REPORT_REASONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <button disabled={pending} className={actionClass}>Enviar denúncia</button><button type="button" className={actionClass} onClick={() => setReporting(false)}>Cancelar</button>
    </form>}
    {notice && <p role="status" className="text-sm text-slate-700 dark:text-zinc-200">{notice}</p>}
    {replying && <CommentForm questionId={comment.questionId} parentId={comment.id} alias={alias} onCancel={() => setReplying(false)} onPublished={() => { setReplying(false); setShowReplies(true); onChanged(); }} />}
    {showReplies && <Replies comment={comment} canPost={canPost} alias={alias} revision={revision} onChanged={onChanged} />}
  </article>;
}

function Replies({ comment, canPost, alias, revision, onChanged }: ThreadProps) {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<CommunityPage | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    communityRequest<CommunityPage>(`/api/community?questionId=${comment.questionId}&parentId=${comment.id}&sort=recent&page=${page}`, { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) { setData(result); setError(''); } })
      .catch((err) => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Erro ao carregar respostas.'); });
    return () => controller.abort();
  }, [comment.id, comment.questionId, page, revision, retry]);
  return <div className="ml-2 border-l-2 border-slate-200 pl-3 sm:ml-4 sm:pl-5 dark:border-zinc-700">
    {error ? <p role="alert" className="text-sm">{error} <button className={actionClass} onClick={() => setRetry(retry + 1)}>Tentar novamente</button></p> : !data ? <p role="status" className="text-sm">Carregando respostas…</p> : <>
      {data.items.map((reply) => <CommentThread key={reply.id} comment={reply} canPost={canPost} alias={alias} revision={revision} onChanged={onChanged} />)}
      {data.items.length === 0 && <p className="text-sm text-slate-600 dark:text-zinc-400">Nenhuma resposta disponível.</p>}
      {(page > 0 || data.hasMore) && (
        <div className="flex gap-3 pt-1">
          <button type="button" className={`${actionClass} border border-slate-300 dark:border-zinc-600`} disabled={page === 0} onClick={() => setPage(page - 1)}>Anteriores</button>
          <button type="button" className={`${actionClass} border border-slate-300 dark:border-zinc-600`} disabled={!data.hasMore} onClick={() => setPage(page + 1)}>Mais respostas</button>
        </div>
      )}
    </>}
  </div>;
}
