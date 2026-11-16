"use client";

import { useEffect, useId, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Lock, MessageSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { communityRequest, type CommunityPage } from '@/lib/community';
import { CommentForm } from './CommentForm';
import { CommentThread } from './CommentThread';

export default function QuestionDiscussion(props: { questionId: number; blocked?: boolean; children?: ReactNode }) {
  const [identity, setIdentity] = useState('loading');
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setIdentity(session?.user.id || 'guest'));
    return () => subscription.unsubscribe();
  }, []);
  return <DiscussionSession key={`${props.questionId}:${identity}`} {...props} identity={identity} />;
}

function DiscussionSession({ questionId, blocked = false, children, identity }: {
  questionId: number; blocked?: boolean; children?: ReactNode; identity: string;
}) {
  const id = useId();
  const [tab, setTab] = useState<'solution' | 'comments'>(children ? 'solution' : 'comments');
  const [sort, setSort] = useState('popular');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<CommunityPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (blocked || identity === 'loading') return;
    const controller = new AbortController();
    communityRequest<CommunityPage>(`/api/community?questionId=${questionId}&sort=${sort}&page=${page}`, { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) { setData(result); setError(''); setLoading(false); } })
      .catch((err) => { if (!controller.signal.aborted) { setError(err instanceof Error ? err.message : 'Erro ao carregar comentários.'); setLoading(false); } });
    return () => controller.abort();
  }, [questionId, blocked, identity, sort, page, revision]);
  function refresh() { setRevision((value) => value + 1); }
  const selected = blocked ? 'solution' : tab;
  const tabClass = (active: boolean) => `inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[var(--marker-blue)] ${active ? 'border-[var(--marker-blue)] text-[var(--marker-blue)] dark:border-[var(--marker-amber)] dark:text-[var(--marker-amber)]' : 'border-transparent text-[var(--ink-secondary)]'}`;
  return <section className="space-y-4 text-[var(--ink-primary)]" aria-label="Discussão da questão">
    <div className="flex flex-wrap border-b border-[var(--border-subtle)]" role="tablist" aria-label="Resolução e comentários" onKeyDown={(event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || blocked || !children) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 'solution' : event.key === 'End' ? 'comments' : selected === 'solution' ? 'comments' : 'solution';
      setTab(next); document.getElementById(`${id}-${next}-tab`)?.focus();
    }}>
      {children && <button type="button" id={`${id}-solution-tab`} role="tab" aria-selected={selected === 'solution'} aria-controls={`${id}-solution-panel`} tabIndex={selected === 'solution' ? 0 : -1} className={tabClass(selected === 'solution')} onClick={() => setTab('solution')}>Resolução</button>}
      <button type="button" id={`${id}-comments-tab`} role="tab" aria-selected={!blocked && selected === 'comments'} aria-controls={`${id}-comments-panel`} tabIndex={selected === 'comments' ? 0 : -1} disabled={blocked} className={`${tabClass(!blocked && selected === 'comments')} disabled:opacity-60`} onClick={() => setTab('comments')}><MessageSquare className="h-4 w-4" />Comentários{!blocked && data ? <> (<span className="tabular-nums">{data.total}</span>)</> : ''}{blocked && <Lock className="h-3.5 w-3.5" />}</button>
    </div>
    {blocked && <p className="text-xs text-[var(--ink-muted)]">Comentários disponíveis após entregar o simulado.</p>}
    {children && <div id={`${id}-solution-panel`} role="tabpanel" aria-labelledby={`${id}-solution-tab`} hidden={selected !== 'solution'} className="space-y-5">{children}</div>}
    {!blocked && <div id={`${id}-comments-panel`} role="tabpanel" aria-labelledby={`${id}-comments-tab`} hidden={selected !== 'comments'} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="font-serif-math text-xl font-semibold text-[var(--ink-primary)]">Comentários</h3><p className="mt-1 text-sm text-[var(--ink-secondary)]">De quem encarou essa questão. A comunidade é sua.</p></div>
        <label className="text-sm text-[var(--ink-secondary)]">Ordenar por <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(0); setLoading(true); }} className="ml-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] p-2 text-[var(--ink-primary)]"><option value="popular">Mais curtidos</option><option value="recent">Mais recentes</option></select></label>
      </div>
      {data?.canPost ? <CommentForm questionId={questionId} alias={data.alias} onPublished={() => { setPage(0); setSort('recent'); refresh(); }} /> : identity === 'guest' ? <p className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 text-sm text-[var(--ink-secondary)]"><Link className="font-semibold text-[var(--marker-blue)] underline dark:text-[var(--marker-amber)]" href={`/login?tab=signin&redirectTo=${encodeURIComponent(`/resolver?id=${questionId}`)}`}>Entre na sua conta</Link> para comentar, curtir ou responder. A leitura é livre.</p> : data && <p className="text-sm text-[var(--ink-secondary)]">Confirme seu e-mail para participar da comunidade.</p>}
      {data?.isAdmin && <Link href="/admin/comments" className="mt-3 inline-block text-xs text-[var(--ink-secondary)] underline">Abrir moderação de comentários</Link>}
      <div aria-live="polite">
        {error && <div role="alert" className="my-4 rounded-xl border border-[var(--marker-amber-border)] bg-[var(--marker-amber-dim)] p-4 text-sm text-[var(--ink-primary)]"><p>{error}</p><button type="button" className="mt-2 font-semibold underline text-[var(--marker-amber)]" onClick={refresh}>Tentar novamente</button></div>}
        {loading && !data && !error && <p role="status" className="py-6 text-sm text-[var(--ink-muted)]">Carregando comentários…</p>}
      </div>
      {data && <>
        {data.items.length === 0 && !error && <div className="py-10 text-center"><MessageSquare className="mx-auto mb-3 h-7 w-7 text-[var(--ink-muted)]" /><p className="font-medium text-[var(--ink-primary)]">Ainda não há comentários por aqui.</p><p className="mt-1 text-sm text-[var(--ink-secondary)]">Foi tranquilo ou mereceu um “BANAL”? Conte como foi.</p></div>}
        {data.items.map((comment) => <CommentThread key={comment.id} comment={comment} canPost={data.canPost} alias={data.alias} revision={revision} onChanged={refresh} />)}
        {(page > 0 || data.hasMore) && <div className="mt-4 flex items-center justify-between gap-3 text-sm"><button type="button" disabled={page === 0} onClick={() => { setPage(page - 1); setLoading(true); }} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-[var(--ink-primary)] disabled:opacity-40">Anteriores</button><span className="font-mono tabular-nums text-[var(--ink-secondary)]">Página {page + 1}</span><button type="button" disabled={!data.hasMore} onClick={() => { setPage(page + 1); setLoading(true); }} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-[var(--ink-primary)] disabled:opacity-40">Mais comentários</button></div>}
      </>}
    </div>}
  </section>;
}
