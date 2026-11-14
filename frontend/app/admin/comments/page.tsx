import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import ModerationQueue from '@/components/community/ModerationQueue';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Moderação de comentários | LEMMAS', robots: { index: false, follow: false } };

export default async function CommentsModerationPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) notFound();
  const { data: isAdmin, error: adminError } = await supabase.rpc('is_analytics_admin');
  if (adminError || isAdmin !== true) notFound();
  return <ModerationQueue />;
}
