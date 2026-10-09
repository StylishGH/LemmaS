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

  // Se NÃO houver code (por exemplo, Implicit Flow onde tokens vêm via fragment hash '#access_token=...'):
  // Retorna uma página HTML leve para o navegador repassar os tokens ou detectar erro sem poluir a URL
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>LEMMAS · Autenticando...</title>
</head>
<body style="background:#141222;color:#f5f0df;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:system-ui,-apple-system,sans-serif;">
  <div style="text-align:center;">
    <p style="font-size:16px;color:#d9b452;font-weight:600;">Autenticando na Plataforma LEMMAS...</p>
    <p style="font-size:13px;color:#a8a29e;">Concluindo credenciais seguras...</p>
  </div>
  <script>
    if (window.location.hash && window.location.hash.includes('access_token')) {
      // Se há access_token no fragment hash, repassa para o login/onboarding processar via Supabase JS
      window.location.replace('${origin}/login' + window.location.hash);
    } else {
      window.location.replace('${origin}/login?error=oauth_exchange_failed');
    }
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
