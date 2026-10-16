/**
 * Cliente utilitário de alta performance para inferência com Google Gemini API.
 * Utiliza o endpoint REST oficial v1beta com cascata resiliente de modelos leves.
 * Diretrizes: Latência < 1.5s, suporte a JSON estruturado e Visão Multimodal (OCR).
 */

const GEMINI_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
  "gemini-3-flash-preview",
];

export interface GeminiContentOptions {
  prompt: string;
  systemInstruction?: string;
  jsonOutput?: boolean;
  inlineImage?: {
    mimeType: string;
    base64Data: string;
  };
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface GeminiResponse {
  text: string;
  model: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export async function generateGeminiContent(
  options: GeminiContentOptions
): Promise<GeminiResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada no ambiente.");
  }

  const {
    prompt,
    systemInstruction,
    jsonOutput = false,
    inlineImage,
    temperature = 0.2,
    maxTokens = 2048,
    timeoutMs = 15000,
  } = options;

  let lastError: Error | null = null;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const parts: any[] = [];
      if (inlineImage && inlineImage.base64Data) {
        parts.push({
          inlineData: {
            mimeType: inlineImage.mimeType || "image/png",
            data: inlineImage.base64Data,
          },
        });
      }
      parts.push({ text: prompt });

      const payload: any = {
        contents: [{ parts }],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          ...(jsonOutput ? { response_mime_type: "application/json" } : {}),
        },
      };

      if (systemInstruction) {
        payload.system_instruction = {
          parts: [{ text: systemInstruction }],
        };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });

      if (!res.ok) {
        const errorText = await res.text();
        // Se 404/503/429, tenta o próximo modelo na cascata
        if ([404, 429, 503].includes(res.status)) {
          lastError = new Error(`Gemini HTTP ${res.status}: ${errorText.slice(0, 200)}`);
          continue;
        }
        throw new Error(`Gemini falhou com status ${res.status}: ${errorText.slice(0, 300)}`);
      }

      const data = await res.json();
      const candidate = data.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text || "";

      if (!text) {
        throw new Error("Gemini retornou conteúdo vazio.");
      }

      const usage = data.usageMetadata;
      return {
        text: text.trim(),
        model,
        tokens: usage
          ? {
              prompt: usage.promptTokenCount || 0,
              completion: usage.candidatesTokenCount || 0,
              total: usage.totalTokenCount || 0,
            }
          : undefined,
      };
    } catch (err: any) {
      lastError = err;
      if (err.name === "TimeoutError") {
        lastError = new Error(`Timeout de inferência no modelo ${model}`);
      }
      // Continua para o próximo modelo na cascata
    }
  }

  throw lastError || new Error("Falha em todos os modelos da cascata Gemini.");
}
