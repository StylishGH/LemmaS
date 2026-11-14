export interface CommunityComment {
  id: string;
  questionId: number;
  parentId: string | null;
  body: string;
  alias: string;
  avatarUrl?: string | null;
  spoiler: boolean;
  status: 'visible' | 'hidden' | 'removed';
  createdAt: string;
  mine: boolean;
  liked: boolean;
  likes: number;
  replyCount: number;
}

const HTTPS_AVATAR_RE = /^https:\/\/[^\s"<>']+$/;
const DATA_AVATAR_RE = /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/;

export function sanitizeAvatarUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 2048 && HTTPS_AVATAR_RE.test(trimmed)) return trimmed;
  if (trimmed.length <= 150000 && DATA_AVATAR_RE.test(trimmed)) return trimmed;
  return null;
}

export function getCommentInitials(alias?: string | null): string {
  const tokens = (alias || '').trim().match(/[\p{L}\p{N}]+/gu) || [];
  if (tokens.length === 0) return 'ES';
  const meaningful =
    tokens.length > 2 ? tokens.filter((t) => !/^(?:da|de|do|das|dos)$/i.test(t)) : tokens;
  const parts = meaningful.length > 0 ? meaningful : tokens;
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

export interface CommunityPage {
  items: CommunityComment[];
  total: number;
  hasMore: boolean;
  alias: string | null;
  canPost: boolean;
  isAdmin: boolean;
}

export const REPORT_REASONS = {
  spam: 'Spam',
  harassment: 'Ofensa ou assédio',
  inappropriate: 'Conteúdo inadequado',
  other: 'Outro motivo',
} as const;

export function positiveId(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function pageNumber(value: unknown): number | null {
  const page = Number(value ?? 0);
  return Number.isInteger(page) && page >= 0 && page <= 5000 ? page : null;
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function parseCommunityWrite(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const body = input as Record<string, unknown>;
  const actions = ['post', 'like', 'unlike', 'report', 'remove', 'hide', 'restore', 'resolve'];
  if (typeof body.action !== 'string' || !actions.includes(body.action)) return null;
  const questionId = positiveId(body.questionId);
  if (!questionId) return null;
  if (body.action !== 'post' && !isUuid(body.commentId)) return null;
  if (body.parentId != null && !isUuid(body.parentId)) return null;
  if (body.action === 'post' && (typeof body.body !== 'string' || !body.body.trim() || Array.from(body.body.trim()).length > 2000)) return null;
  if (body.spoiler != null && typeof body.spoiler !== 'boolean') return null;
  if (body.alias != null && (typeof body.alias !== 'string' || Array.from(body.alias.trim()).length < 3 || Array.from(body.alias.trim()).length > 30 || /[<>\u0000-\u001f\u007f]/.test(body.alias))) return null;
  if (body.action === 'report' && (typeof body.reason !== 'string' || !Object.hasOwn(REPORT_REASONS, body.reason))) return null;
  return {
    p_action: body.action,
    p_question_id: questionId,
    p_comment_id: body.action === 'post' ? null : body.commentId as string,
    p_parent_id: body.action === 'post' ? (body.parentId as string | undefined) ?? null : null,
    p_body: body.action === 'post' ? (body.body as string).trim() : null,
    p_spoiler: body.spoiler === true,
    p_alias: typeof body.alias === 'string' ? body.alias.trim() : null,
    p_reason: body.action === 'report' ? body.reason as string : null,
  };
}

export function communityError(error: { code?: string; message?: string }) {
  if (error.code === '42501') return { status: 403, error: 'Você não tem permissão para esta ação. Entre com uma conta e confirme seu e-mail.' };
  if (error.code === '23505') return { status: 409, error: 'Este apelido já está em uso. Escolha outro.' };
  if (error.code === '22023') return { status: 400, error: 'Confira o texto, o apelido e a conversa selecionada.' };
  if (error.code === 'P0002') return { status: 404, error: 'Questão ou comentário indisponível.' };
  if (error.code === 'P0001') {
    const messages = ['Aguarde antes de publicar novamente.', 'Limite de 20 publicações por hora atingido.', 'Limite de denúncias por hora atingido.'];
    if (messages.includes(error.message || '')) return { status: 429, error: error.message! };
  }
  return { status: 503, error: 'Os comentários estão indisponíveis no momento. Tente novamente mais tarde.' };
}

export async function communityRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: 'no-store' });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : 'Não foi possível carregar os comentários.',
    );
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Resposta inválida ao carregar os comentários.');
  }
  return data as T;
}

export async function writeCommunity(body: Record<string, unknown>) {
  return communityRequest<{ success?: boolean; id?: string }>('/api/community', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}
