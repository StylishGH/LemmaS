/**
 * Cliente utilitário para inferência via OmniRoute.
 *
 * O OmniRoute é um gateway compatível com a API OpenAI. OMNIROUTE_URL deve usar
 * HTTPS e pode ser a URL base ou o endpoint completo de chat completions.
 */

const OMNIROUTE_URL = process.env.OMNIROUTE_URL?.trim();
const OMNIROUTE_API_KEY = process.env.OMNIROUTE_API_KEY?.trim();

function getOmniRouteEndpoint(): string {
  if (!OMNIROUTE_URL) {
    throw new Error('OMNIROUTE_URL não configurada.');
  }

  const url = new URL(OMNIROUTE_URL);
  if (url.protocol !== 'https:') {
    throw new Error('OMNIROUTE_URL deve usar HTTPS.');
  }

  const pathname = url.pathname.replace(/\/+$/, '');
  url.pathname = pathname || '/';
  if (!/\/v1\/chat\/completions$/i.test(pathname)) {
    url.pathname = /\/v1$/i.test(pathname)
      ? `${pathname}/chat/completions`
      : `${pathname}/v1/chat/completions`;
  }

  return url.toString();
}

export interface OmniRouteContentOptions {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  /** Nome do combo configurado no OmniRoute. Default: "math-socratic". */
  model?: string;
}

export interface OmniRouteResponse {
  text: string;
  model: string;
  tokens?: { prompt: number; completion: number; total: number };
}

export async function generateOmniRouteContent(
  options: OmniRouteContentOptions
): Promise<OmniRouteResponse> {
  if (!OMNIROUTE_API_KEY) {
    throw new Error('OMNIROUTE_API_KEY não configurada.');
  }
  const endpoint = getOmniRouteEndpoint();

  const {
    prompt,
    systemInstruction,
    temperature = 0.15,
    maxTokens = 1536,
    timeoutMs = 20000,
  } = options;

  const messages: Array<{ role: string; content: string }> = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({ role: 'user', content: prompt });

  const body = JSON.stringify({
    model: options.model || 'math-socratic',
    messages,
    temperature,
    max_tokens: maxTokens,
  });

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OMNIROUTE_API_KEY}`,
    },
    body,
    signal: AbortSignal.timeout(timeoutMs),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OmniRoute HTTP ${res.status}: ${errorText.slice(0, 200)}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  const rawText = choice?.message?.content || '';
  const text = typeof rawText === 'string' ? rawText.trim() : '';

  if (!text) {
    throw new Error('OmniRoute retornou conteúdo vazio.');
  }

  const usage = data.usage;
  return {
    text: text.trim(),
    model: data.model || 'math-socratic (omniroute)',
    tokens: usage
      ? {
          prompt: usage.prompt_tokens || 0,
          completion: usage.completion_tokens || 0,
          total: usage.total_tokens || 0,
        }
      : undefined,
  };
}
