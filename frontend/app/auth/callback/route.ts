import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * Handler de Callback OAuth (PKCE) do Supabase para Next.js App Router.
 * Troca o 'code' retornado pelo Google/Supabase por uma sessão oficial e grava cookies SSR.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        // Redireciona com segurança respeitando proxies/load balancers se houver
        const forwardedHost = request.headers.get("x-forwarded-host");
        const isLocalEnv = process.env.NODE_ENV === "development";

        if (isLocalEnv) {
          return NextResponse.redirect(`${origin}${next}`);
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${next}`);
        } else {
          return NextResponse.redirect(`${origin}${next}`);
        }
      } else {
        console.error("Erro ao trocar código por sessão no Supabase:", error);
      }
    } catch (err) {
      console.error("Exceção no auth callback:", err);
    }
  }

  // Se falhar ou não houver código, retorna para /login com aviso
  return NextResponse.redirect(`${origin}/login?error=oauth_exchange_failed`);
}
