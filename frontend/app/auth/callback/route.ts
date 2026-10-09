import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { DEFAULT_SUPABASE_URL, getSafeAnonKey } from "@/lib/supabase";

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
      const cookieStore = await cookies();
      const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
      const supabaseAnonKey = getSafeAnonKey();

      const cookiesToSetList: { name: string; value: string; options: any }[] = [];

      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
              cookiesToSetList.push({ name, value, options });
            });
          },
        },
      });

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        let redirectPath = next;

        // Se next === "/onboarding", verifica se o usuário já tem cadastro completo no banco (pelo EMAIL!)
        if (redirectPath === "/onboarding") {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email) {
            const { data: dbUser } = await supabase
              .from("usuarios")
              .select("cpf, escolaridade")
              .eq("email", user.email)
              .maybeSingle();

            if (dbUser && (dbUser.cpf || dbUser.escolaridade)) {
              redirectPath = "/questoes";
            }
          }
        }

        // Redireciona com segurança respeitando proxies/load balancers se houver
        const forwardedHost = request.headers.get("x-forwarded-host");
        const isLocalEnv = process.env.NODE_ENV === "development";

        const finalUrl = isLocalEnv
          ? `${origin}${redirectPath}`
          : forwardedHost
          ? `https://${forwardedHost}${redirectPath}`
          : `${origin}${redirectPath}`;

        const response = NextResponse.redirect(finalUrl);

        // Propaga todos os cookies de sessão para o cabeçalho Set-Cookie do redirect
        cookiesToSetList.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });

        return response;
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
