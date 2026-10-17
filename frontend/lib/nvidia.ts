/**
 * Cliente utilitário para inferência via NVIDIA NIM (MathAI Engine).
 * Utiliza o endpoint oficial da NVIDIA com o modelo Nemotron 3 Nano Omni.
 */

const NVIDIA_MODELS = [
  "meta/llama-3.2-11b-vision-instruct",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
  "nvidia/nemotron-3.5-lightning-30b-a3b",
];

export interface NvidiaContentOptions {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface NvidiaResponse {
  text: string;
  model: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export async function generateNvidiaContent(
  options: NvidiaContentOptions
): Promise<NvidiaResponse> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY não configurada no ambiente.");
  }

  const {
    prompt,
    systemInstruction,
    temperature = 0.2,
    maxTokens = 1536,
    timeoutMs = 15000,
  } = options;

  const messages: Array<{ role: string; content: string }> = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }
  messages.push({ role: "user", content: prompt });

  let lastError: Error | null = null;

  for (const model of NVIDIA_MODELS) {
    try {
      const url = "https://integrate.api.nvidia.com/v1/chat/completions";
      const payload = {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });

      if (!res.ok) {
        const errorText = await res.text();
        lastError = new Error(`NVIDIA NIM HTTP ${res.status}: ${errorText.slice(0, 200)}`);
        continue;
      }

      const data = await res.json();
      const choice = data.choices?.[0];
      const rawText = choice?.message?.content || choice?.message?.reasoning_content || "";
      const text = typeof rawText === "string" ? rawText.trim() : "";

      if (!text) {
        throw new Error("NVIDIA NIM retornou conteúdo vazio.");
      }

      const usage = data.usage;
      return {
        text: text.trim(),
        model,
        tokens: usage
          ? {
              prompt: usage.prompt_tokens || 0,
              completion: usage.completion_tokens || 0,
              total: usage.total_tokens || 0,
            }
          : undefined,
      };
    } catch (err: any) {
      lastError = err;
      if (err.name === "TimeoutError") {
        lastError = new Error(`Timeout de inferência NVIDIA NIM no modelo ${model}`);
      }
    }
  }

  throw lastError || new Error("Falha em todos os modelos da cascata NVIDIA NIM.");
}
