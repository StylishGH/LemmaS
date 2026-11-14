"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { communityRequest, REPORT_REASONS, writeCommunity, type CommunityComment } from '@/lib/community';
import { CommentText } from './CommentText';

type ModerationPage = { items: (CommunityComment & { reports: { reason: keyof typeof REPORT_REASONS; createdAt: string }[] })[]; hasMore: boolean };

export default function ModerationQueue() {
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<ModerationPage | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    communityRequest<ModerationPage>(`/api/admin/comments?page=${page}`, { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) { setData(result); setError(''); } })
      .catch((err) => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Não foi possível carregar a fila.'); });
    return () => controller.abort();
  }, [page, revision]);
  async function act(comment: CommunityComment, action: string) {
    setPending(true); setError('');
    try {
      await writeCommunity({ action, questionId: comment.questionId, commentId: comment.id });
      setRevision((value) => value + 1);
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível concluir.'); }
    finally { setPending(false); }
  }
  const buttonClass = 'rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-zinc-600';
  return <main className="mx-auto min-h-screen max-w-4xl space-y-6 px-4 py-10 text-slate-900 dark:text-zinc-100">
    <header><Link href="/questoes" className="text-sm underline">Voltar ao banco de questões</Link><h1 className="mt-4 font-serif text-3xl font-bold">Moderação de comentários</h1><p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">Denúncias pendentes e comentários ocultos. Toda decisão é humana.</p></header>
    {error && <div role="alert" className="rounded-xl border border-red-400 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200"><p>{error}</p><button type="button" className="mt-2 font-semibold underline" onClick={() => setRevision(revision + 1)}>Tentar novamente</button></div>}
    {!data && !error && <p role="status">Carregando fila…</p>}
    {data?.items.length === 0 && <p className="rounded-xl border border-slate-200 p-6 dark:border-zinc-700">Nenhum comentário nesta página da fila.</p>}
    {data?.items.map((comment) => <article key={comment.id} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <header className="flex flex-wrap justify-between gap-3"><strong>{comment.alias}</strong><Link href={`/resolver?id=${comment.questionId}`} className="text-sm underline">Questão #{comment.questionId}</Link></header>
      <p className="text-xs">Estado: {comment.status === 'hidden' ? 'Oculto' : comment.status === 'removed' ? 'Removido pelo autor' : 'Visível'}{comment.parentId && ' · Resposta'}{comment.spoiler && ' · Spoiler'}</p>
      <CommentText text={comment.body || 'Texto removido pelo autor.'} />
      <ul className="space-y-1 text-sm">{comment.reports.map((report, index) => <li key={index}>{REPORT_REASONS[report.reason]} · {new Date(report.createdAt).toLocaleString('pt-BR')}</li>)}</ul>
      <div className="flex flex-wrap gap-3">
        {comment.status !== 'removed' && <button disabled={pending} className={buttonClass} onClick={() => void act(comment, comment.status === 'hidden' ? 'restore' : 'hide')}>{comment.status === 'hidden' ? 'Restaurar comentário' : 'Ocultar comentário'}</button>}
        {comment.reports.length > 0 && <button disabled={pending} className={buttonClass} onClick={() => void act(comment, 'resolve')}>Marcar denúncias como revisadas</button>}
      </div>
    </article>)}
    {data && <div className="flex items-center justify-between gap-3"><button className={buttonClass} disabled={page === 0 || pending} onClick={() => setPage(page - 1)}>Anteriores</button><span className="text-sm">Página {page + 1}</span><button className={buttonClass} disabled={!data.hasMore || pending} onClick={() => setPage(page + 1)}>Próximos</button></div>}
  </main>;
}
