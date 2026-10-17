import crypto from "crypto";
import { createClient as createServerSupabase } from "@/lib/supabase-server";

export const PROMPT_STRATEGY_VERSION = "v1.0-socratic";

const INVALID_HINT_PATTERNS = [
  /não foi possível gerar/i,
  /erro interno/i,
  /erro de conexão/i,
  /serviço indisponível/i,
  /indispon[íi]vel/i,
  /timeout/i,
  /jsondecodeerror/i,
  /desenvolva o raciocínio formal a partir das hipóteses/i,
  /identifique os dados centrais/i,
];

function normalizeMathText(text?: string | null): string {
  if (!text) return "";
  return text
    .replace(/\r\n|\r/g, "\n")
    .trim()
    .replace(/[ \t]+/g, " ");
}

export function computeContentHash(
  enunciado: string,
  solucao?: string | null,
  gabarito?: string | null
): string {
  const cleanEnunciado = normalizeMathText(enunciado);
  const cleanSolucao = normalizeMathText(solucao);
  const cleanGabarito = normalizeMathText(gabarito);
  const canonicalRepr = `ENUNCIADO:${cleanEnunciado}||SOLUCAO:${cleanSolucao}||GABARITO:${cleanGabarito}`;
  return crypto.createHash("sha256").update(canonicalRepr, "utf8").digest("hex");
}

export function computeCacheKey(
  exerciseId: string,
  level: number,
  pedagogicalPreference: string,
  contentHash: string,
  promptVersion: string = PROMPT_STRATEGY_VERSION
): string {
  const cleanExerciseId = String(exerciseId).trim();
  const cleanPref = String(pedagogicalPreference).trim().toLowerCase();
  const logicalTuple = `EXERCISE:${cleanExerciseId}::LEVEL:${level}::PREF:${cleanPref}::PROMPT:${promptVersion}::HASH:${contentHash}`;
  return crypto.createHash("sha256").update(logicalTuple, "utf8").digest("hex");
}

export function resolveStableExerciseId(
  rawId?: string | number | null,
  contentHash?: string
): { stableId: string; numericId: number | null } {
  if (rawId !== undefined && rawId !== null && String(rawId).trim()) {
    const cleanStr = String(rawId).trim();
    if (cleanStr !== "adhoc" && cleanStr !== "adhoc-exercise") {
      const num = parseInt(cleanStr, 10);
      if (!isNaN(num) && String(num) === cleanStr) {
        return { stableId: cleanStr, numericId: num };
      }
      return { stableId: cleanStr, numericId: null };
    }
  }

  const hashPart = contentHash ? contentHash.slice(0, 16) : "adhoc";
  return { stableId: `adhoc:${hashPart}`, numericId: null };
}

export function validateHintForCache(
  hintText: string,
  level: number,
  gabarito?: string | null,
  provider?: string | null
): { isValid: boolean; reason?: string } {
  if (!hintText || typeof hintText !== "string") {
    return { isValid: false, reason: "Texto vazio ou inválido." };
  }

  const cleaned = hintText.trim();
  if (cleaned.length < 25) {
    return { isValid: false, reason: "Texto da dica muito curto (<25 caracteres)." };
  }

  if (provider && (provider.toLowerCase().includes("fallback") || provider.toLowerCase().includes("emergency"))) {
    return { isValid: false, reason: "Provedor de contingência emergencial." };
  }

  for (const pattern of INVALID_HINT_PATTERNS) {
    if (pattern.test(cleaned)) {
      return { isValid: false, reason: "Padrão de erro ou template genérico detectado." };
    }
  }

  if (level >= 1 && level <= 4 && gabarito) {
    const cleanGab = gabarito.trim();
    if (/^[A-Ea-e]$/.test(cleanGab)) {
      const leakRegex = new RegExp(`\\b(?:gabarito|resposta|alternativa)\\s*(?:correta|certa|oficial)?\\s*(?:é|e|:)?\\s*\\(?${cleanGab}\\)?\\b`, "i");
      if (leakRegex.test(cleaned)) {
        return { isValid: false, reason: `Dica de Nível ${level} vazou gabarito ${cleanGab}.` };
      }
    }
  }

  return { isValid: true };
}

export async function getCachedHint(cacheKey: string) {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("socratic_hint_cache")
      .select("id, cache_key, exercise_id, level, pedagogical_preference, hint_text, model_used, provider, hit_count, created_at")
      .eq("cache_key", cacheKey)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    // Incrementa hit_count de forma assíncrona tolerante a falhas
    (async () => {
      try {
        await supabase
          .from("socratic_hint_cache")
          .update({
            hit_count: (data.hit_count || 1) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id);
      } catch {
        // Ignora silenciosamente erros no contador de acessos
      }
    })();

    return data;
  } catch {
    return null;
  }
}

export async function saveCachedHint(params: {
  cacheKey: string;
  exerciseId: string;
  questaoId: number | null;
  level: number;
  pedagogicalPreference: string;
  contentHash: string;
  hintText: string;
  modelUsed: string;
  provider: string;
  latencyMs?: number;
  metadata?: Record<string, any>;
}) {
  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase.from("socratic_hint_cache").upsert(
      {
        cache_key: params.cacheKey,
        exercise_id: params.exerciseId,
        questao_id: params.questaoId,
        level: params.level,
        pedagogical_preference: params.pedagogicalPreference,
        prompt_version: PROMPT_STRATEGY_VERSION,
        content_hash: params.contentHash,
        hint_text: params.hintText,
        model_used: params.modelUsed,
        provider: params.provider,
        latency_ms: params.latencyMs || 0.0,
        hit_count: 1,
        metadata: params.metadata || {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "cache_key" }
    );

    return !error;
  } catch {
    return false;
  }
}
