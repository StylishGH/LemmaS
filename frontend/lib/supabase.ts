import { createBrowserClient } from "@supabase/ssr";

export const DEFAULT_SUPABASE_URL = "https://gzlzwqknwfgrsnyvgpnv.supabase.co";
export const DEFAULT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bHp3cWtud2ZncnNueXZncG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MTgzNzcsImV4cCI6MjEwNjk5NDM3N30.L2G9NrtgQM0MzvVJ50tG3S_4eso99INrsl9g2b7sVHI";

/**
 * Retorna a chave pública anônima higienizada.
 * Se a env var tiver sido configurada acidentalmente com uma Secret Key (sb_secret_),
 * recusa o uso no cliente para prevenir vazamento e erro 401 UNAUTHORIZED_INVALID_API_KEY_TYPE.
 */
export function getSafeAnonKey(): string {
  const envKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").replace(/[\r\n\s]+/g, "");
  if (envKey.startsWith("sb_secret_")) {
    console.error(
      "[LEMMAS SECURITY] NEXT_PUBLIC_SUPABASE_ANON_KEY contém chave secreta administrativa (sb_secret_). Bloqueando uso no cliente e revertendo para chave pública padrão."
    );
    return DEFAULT_ANON_KEY;
  }
  return envKey || DEFAULT_ANON_KEY;
}

export function createClient() {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
  const supabaseAnonKey = getSafeAnonKey();

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
