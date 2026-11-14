"use client";
import { useEffect, useState } from 'react';
import { communityRequest } from '@/lib/community';
import { useUserProfile } from '@/lib/use-user';

export default function CommunityAliasField() {
  const { profile, loading } = useUserProfile();
  return <AliasEditor key={profile.email} guest={profile.isGuest} loadingProfile={loading} />;
}
function AliasEditor({ guest, loadingProfile }: { guest: boolean; loadingProfile: boolean }) {
  const [alias, setAlias] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (guest || loadingProfile) return;
    const controller = new AbortController();
    communityRequest<{ alias: string | null }>('/api/community/profile', { signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) { setAlias(data.alias || ''); setLoading(false); setNotice(''); }
    }).catch(() => { if (!controller.signal.aborted) { setNotice('Não foi possível carregar seu apelido.'); setLoading(false); } });
    return () => controller.abort();
  }, [guest, loadingProfile, retry]);
  if (guest && !loadingProfile) return <p className="text-sm">Entre na sua conta para escolher seu apelido.</p>;
  return <div className="space-y-2 rounded-xl border border-slate-200 p-4 dark:border-zinc-700" id="apelido-comunidade">
    <label htmlFor="community-alias" className="block text-sm font-semibold text-slate-900 dark:text-zinc-100">Apelido público na comunidade</label>
    <p className="text-xs text-slate-600 dark:text-zinc-400">É assim que você aparece nos comentários. Use de 3 a 30 caracteres e evite dados pessoais. Alterações também aparecem nos comentários anteriores.</p>
    <div className="flex flex-wrap gap-2"><input id="community-alias" value={alias} onChange={(event) => setAlias(event.target.value)} minLength={3} maxLength={30} autoComplete="nickname" disabled={loading || pending || loadingProfile} placeholder="Ex.: Aspirante_2027" className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100" />
      <button type="button" disabled={loading || pending || loadingProfile || alias.trim().length < 3} className="lemmas-gold-cta rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50" onClick={async () => {
        setPending(true); setNotice('');
        try {
          const data = await communityRequest<{ alias: string }>('/api/community/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alias }) });
          setAlias(data.alias); setNotice('Apelido salvo.');
        } catch (err) { setNotice(err instanceof Error ? err.message : 'Não foi possível salvar.'); }
        finally { setPending(false); }
      }}>{pending ? 'Salvando…' : 'Salvar apelido'}</button></div>
    {loading && <p role="status" className="text-xs">Carregando apelido…</p>}
    {notice && <p role="status" className="text-xs text-slate-700 dark:text-zinc-300">{notice} {notice.includes('carregar') && <button type="button" onClick={() => setRetry(retry + 1)} className="underline">Tentar novamente</button>}</p>}
  </div>;
}
