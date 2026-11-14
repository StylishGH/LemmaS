import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { communityError, pageNumber } from '@/lib/community';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  const page = pageNumber(request.nextUrl.searchParams.get('page'));
  if (page === null) return NextResponse.json({ error: 'Página inválida.' }, { status: 400, headers });
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Faça login.' }, { status: 401, headers });
    const { data, error } = await supabase.rpc('community_moderation', { p_page: page });
    if (error) {
      const result = communityError(error);
      return NextResponse.json({ error: result.error }, { status: result.status, headers });
    }
    return NextResponse.json(data, { headers });
  } catch {
    return NextResponse.json({ error: 'Moderação indisponível.' }, { status: 503, headers });
  }
}
