import crypto from "node:crypto";
import { NextRequest } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memoryLimiterStore = new Map<string, RateLimitEntry>();
const MAX_MEMORY_ENTRIES = 2000;

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

function checkMemoryRateLimit(bucket: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  if (memoryLimiterStore.size > MAX_MEMORY_ENTRIES) {
    for (const [k, v] of memoryLimiterStore.entries()) {
      if (v.resetAt <= now) memoryLimiterStore.delete(k);
    }
  }

  const existing = memoryLimiterStore.get(bucket);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowSeconds * 1000;
    memoryLimiterStore.set(bucket, { count: 1, resetAt });
    return { allowed: true, limit, remaining: Math.max(0, limit - 1), retryAfterSeconds: windowSeconds };
  }

  existing.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  if (existing.count > limit) {
    return { allowed: false, limit, remaining: 0, retryAfterSeconds };
  }
  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSeconds,
  };
}

/**
 * Enforces sliding/fixed-window rate limiting on AI routes.
 * Uses Supabase RPC `check_ai_rate_limit` when available, with an in-memory fallback.
 */
export async function enforceAiRateLimit(
  req: NextRequest,
  routeName: string,
  supabase?: any
): Promise<RateLimitResult> {
  const windowSeconds = 60;
  let identity = `ip:${crypto.createHash("sha256").update(getClientIp(req)).digest("hex").slice(0, 16)}`;
  let limit = 8;

  try {
    if (supabase?.auth?.getUser) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        identity = `usr:${user.id}`;
        limit = 30;
      }
    }
  } catch {
    // Fall back to IP identity
  }

  const bucket = `${routeName}:${identity}`;

  try {
    if (supabase?.rpc) {
      const { data, error } = await supabase.rpc("check_ai_rate_limit", {
        p_bucket: bucket,
        p_limit: limit,
        p_window_seconds: windowSeconds,
      });
      if (!error && data && typeof data.allowed === "boolean") {
        return {
          allowed: data.allowed,
          limit,
          remaining: Math.max(0, Number(data.remaining ?? 0)),
          retryAfterSeconds: Math.max(1, Number(data.retry_after_seconds ?? windowSeconds)),
        };
      }
    }
  } catch {
    // Fall back to process-local limiter when RPC is unavailable
  }

  return checkMemoryRateLimit(bucket, limit, windowSeconds);
}
