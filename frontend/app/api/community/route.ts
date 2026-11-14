import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { communityError, isUuid, pageNumber, parseCommunityWrite, positiveId } from '@/lib/community';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const questionId = positiveId(params.get('questionId'));
  const page = pageNumber(params.get('page'));
  const sort = params.get('sort') || 'recent';
  const parentId = params.get('parentId');
  if (!questionId || page === null || !['recent', 'popular'].includes(sort) || (parentId !== null && !isUuid(parentId))) {
    return NextResponse.json({ error: 'Consulta inválida.' }, { status: 400, headers });
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('community_list', { p_question_id: questionId, p_sort: sort, p_page: page, p_parent_id: parentId });
    if (error) {
      const result = communityError(error);
      return NextResponse.json({ error: result.error }, { status: result.status, headers });
    }
    return NextResponse.json(data, { headers });
  } catch {
    return NextResponse.json({ error: 'Não foi possível carregar os comentários.' }, { status: 503, headers });
  }
}

export async function POST(request: NextRequest) {
  // Session-cookie writes are same-origin. Direct SDK RPC calls remain subject to DB checks.
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: 'Origem inválida.' }, { status: 403, headers });
  if (Number(request.headers.get('content-length') || 0) > 16000) return NextResponse.json({ error: 'Comentário muito grande.' }, { status: 413, headers });
  let input: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 16000) return NextResponse.json({ error: 'Comentário muito grande.' }, { status: 413, headers });
    input = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Conteúdo inválido.' }, { status: 400, headers });
  }
  const args = parseCommunityWrite(input);
  if (!args) return NextResponse.json({ error: 'Confira o comentário e os campos enviados.' }, { status: 400, headers });
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Faça login para participar.' }, { status: 401, headers });
    const { data, error } = await supabase.rpc('community_write', args);
    if (error) {
      const result = communityError(error);
      return NextResponse.json({ error: result.error }, { status: result.status, headers });
    }
    return NextResponse.json(data, { headers });
  } catch {
    return NextResponse.json({ error: 'Não foi possível salvar. Seu rascunho foi preservado.' }, { status: 503, headers });
  }
}
