/**
 * Utilitário de Resolução de URLs de Figuras (LEMMAS / MathAI Engine)
 * Garante que caminhos relativos locais (/data/imagens/...) sejam resolvidos
 * transparentemente para o Supabase Storage CDN na nuvem (Vercel) e no ambiente local.
 */

export const SUPABASE_STORAGE_URL = 
  "https://gzlzwqknwfgrsnyvgpnv.supabase.co/storage/v1/object/public/questoes-imagens";

export function resolveFigureUrl(path: string | null | undefined): string {
  if (!path) return "";
  
  // Se já for URL absoluta (http:// ou https://) ou data:image, retorna direto
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }

  // Tratamento para caminhos da pasta /uploads/
  if (path.startsWith("/uploads/") || path.startsWith("uploads/")) {
    const cleanUpload = path.replace(/^\/?/, "");
    // No ambiente local de desenvolvimento, serve direto do public
    if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
      return `/${cleanUpload}`;
    }
    return `${SUPABASE_STORAGE_URL}/${cleanUpload}`;
  }

  // Remove prefixos redundantes
  const clean = path
    .replace(/^\/?(frontend\/public\/)?/, "")
    .replace(/^data\/imagens\//, "")
    .replace(/^\/data\/imagens\//, "");

  // Se estiver rodando localmente (localhost/127.0.0.1), prioriza servir estático de frontend/public/
  if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return `/data/imagens/${clean}`;
  }

  // Na Vercel / produção, resolve pelo CDN do bucket público do Supabase Storage
  return `${SUPABASE_STORAGE_URL}/${clean}`;
}

export function getFallbackFigureUrl(path: string | null | undefined): string {
  if (!path) return "";
  const clean = path
    .replace(/^\/?(frontend\/public\/)?/, "")
    .replace(/^data\/imagens\//, "")
    .replace(/^\/data\/imagens\//, "");

  // Fallback invertido: se falhou CDN, tenta local / vice-versa
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return `/data/imagens/${clean}`;
  }
  return `${SUPABASE_STORAGE_URL}/${clean}`;
}
