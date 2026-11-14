import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { communityError } from '@/lib/community';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };

async function profile(alias: string | null) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Faça login para configurar seu apelido.' }, { status: 401, headers });
    const { data, error } = await supabase.rpc('community_profile', { p_alias: alias });
    if (error) {
      const result = communityError(error);
      return NextResponse.json({ error: result.error }, { status: result.status, headers });
    }
    return NextResponse.json(data, { headers });
  } catch {
    return NextResponse.json({ error: 'Não foi possível acessar seu apelido. Tente novamente.' }, { status: 503, headers });
  }
}
export async function GET() { return profile(null); }
export async function PUT(request: NextRequest) {
  if (request.headers.get('origin') && request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Origem inválida.' }, { status: 403, headers });
  try {
    const raw = await request.text();
    if (raw.length > 500) return NextResponse.json({ error: 'Apelido inválido.' }, { status: 400, headers });
    const { alias } = JSON.parse(raw);
    if (typeof alias !== 'string' || Array.from(alias.trim()).length < 3 || Array.from(alias.trim()).length > 30 || /[<>\u0000-\u001f\u007f]/.test(alias)) return NextResponse.json({ error: 'Escolha um apelido de 3 a 30 caracteres, sem caracteres de controle.' }, { status: 400, headers });
    return profile(alias.trim());
  } catch { return NextResponse.json({ error: 'Apelido inválido.' }, { status: 400, headers }); }
}
