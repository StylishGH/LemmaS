/**
 * Utilitário de Resolução de URLs de Figuras (LEMMAS / MathAI Engine)
 * Garante que caminhos relativos locais (/data/imagens/...) sejam resolvidos
 * transparentemente para o Supabase Storage CDN na nuvem (Vercel) e no ambiente local.
 */

export const SUPABASE_STORAGE_URL = 
  "https://gzlzwqknwfgrsnyvgpnv.supabase.co/storage/v1/object/public/questoes-imagens";

export function resolveFigureUrl(path: string | null | undefined): string {
  if (!path) return "";
  
  // Se já for URL absoluta (http:// ou https://), retorna direto
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Remove prefixos locais redundantes
  const clean = path
    .replace(/^\/?(frontend\/public\/)?/, "")
    .replace(/^data\/imagens\//, "")
    .replace(/^\/data\/imagens\//, "");

  // Na Vercel ou produção, o container serverless não possui os arquivos no disco.
  // Resolvemos deterministicamente para o bucket público do Supabase Storage:
  return `${SUPABASE_STORAGE_URL}/${clean}`;
}
