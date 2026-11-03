/**
 * Cliente utilitário para inferência via NVIDIA NIM (MathAI Engine).
 * Utiliza o endpoint oficial da NVIDIA com cascata resiliente de modelos Nemotron
 * (Texto + Visão Multimodal OCR) e rotação automática de credenciais.
 */

const NVIDIA_TEXT_MODELS = [
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
  "nvidia/nemotron-3.5-lightning-30b-a3b",
  "nvidia/nemotron-3-ultra-550b-a55b",
];

const NVIDIA_VISION_MODELS = [
  "nvidia/nemotron-3.5-super-vl-120b-a12b",
  "meta/llama-3.2-90b-vision-instruct",
];

export interface NvidiaContentOptions {
  prompt: string;
  systemInstruction?: string;
  inlineImage?: {
    mimeType: string;
    base64Data: string;
  };
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

export function getNvidiaApiKeys(): string[] {
  const keys = [process.env.NVIDIA_API_KEY, process.env.NVIDIA_API_KEY_2].filter(
    (k): k is string => Boolean(k && k.trim())
  );
  return Array.from(new Set(keys));
}

export async function generateNvidiaContent(
  options: NvidiaContentOptions
): Promise<NvidiaResponse> {
  const apiKeys = getNvidiaApiKeys();
  if (apiKeys.length === 0) {
    throw new Error("NVIDIA_API_KEY não configurada no ambiente.");
  }

  const {
    prompt,
    systemInstruction,
    inlineImage,
    temperature = 0.2,
    maxTokens = 1536,
    timeoutMs = 12000,
  } = options;

  const hasImage = Boolean(inlineImage && inlineImage.base64Data);
  const candidateModels = hasImage ? NVIDIA_VISION_MODELS : NVIDIA_TEXT_MODELS;
  const perModelTimeoutMs = Math.min(timeoutMs, 7500);

  const messages: Array<{ role: string; content: any }> = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }

  if (hasImage && inlineImage) {
    const mime = inlineImage.mimeType || "image/png";
    messages.push({
      role: "user",
      content: [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: { url: `data:${mime};base64,${inlineImage.base64Data}` },
        },
      ],
    });
  } else {
    messages.push({ role: "user", content: prompt });
  }

  let lastError: Error | null = null;

  for (const model of candidateModels) {
    for (let keyIdx = 0; keyIdx < apiKeys.length; keyIdx++) {
      const apiKey = apiKeys[keyIdx];
      try {
        const url = "https://integrate.api.nvidia.com/v1/chat/completions";
        const payload: Record<string, any> = {
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          chat_template_kwargs: { enable_thinking: false },
        };

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(perModelTimeoutMs),
          cache: "no-store",
        });

        if (!res.ok) {
          const errorText = await res.text();
          lastError = new Error(`NVIDIA NIM HTTP ${res.status}: ${errorText.slice(0, 200)}`);
          // Se erro de chave (401/403) e houver chave reserva, tenta a próxima chave no mesmo modelo
          if ((res.status === 401 || res.status === 403) && keyIdx < apiKeys.length - 1) {
            continue;
          }
          // Caso contrário (404, 429, 500, etc.), avança para o próximo modelo
          break;
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
        if (err.name === "TimeoutError" || err.name === "AbortError") {
          lastError = new Error(`Timeout de inferência NVIDIA NIM no modelo ${model}`);
        }
        // Em caso de timeout ou erro de rede, tenta o próximo modelo
        break;
      }
    }
  }

  throw lastError || new Error("Falha em todos os modelos da cascata NVIDIA NIM.");
}
