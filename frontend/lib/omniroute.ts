/**
 * Cliente utilitário para inferência via OmniRoute (Azure Container Apps).
 *
 * O OmniRoute é um gateway de IA com fallback interno (priority strategy) entre
 * múltiplos provedores: NVIDIA NIM (nemotron-3-nano-omni-reasoning),
 * Google Gemini (gemini-3.6-flash) e OpenRouter (llama-3.3-70b-instruct).
 *
 * Endpoint: https://omniroute-mathai.wittypebble-4ffc5c1f.chilecentral.azurecontainerapps.io/v1/chat/completions
 * Autenticação: Authorization: Bearer <OMNIROUTE_API_KEY>
 */

const OMNIROUTE_URL =
  process.env.OMNIROUTE_URL ||
  'https://omniroute-mathai.wittypebble-4ffc5c1f.chilecentral.azurecontainerapps.io/v1/chat/completions';

const OMNIROUTE_API_KEY =
  process.env.OMNIROUTE_API_KEY || 'omnimathai-2026-10-23-1792714290';

export interface OmniRouteContentOptions {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  /** Nome do combo no OmniRoute (ex: "math-socratic-1", "math-socratic-2"). Default: "math-socratic" */
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

  const res = await fetch(OMNIROUTE_URL, {
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
