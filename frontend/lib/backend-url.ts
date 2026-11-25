const DEFAULT_PRODUCTION_BACKEND = "https://mathai-7i7r.onrender.com";
const DEFAULT_DEV_BACKEND = "http://127.0.0.1:8000";

export function configuredBackendUrl(): string | undefined {
  const value = process.env.LEMMAS_BACKEND_URL?.trim() || process.env.BACKEND_API_URL?.trim();
  return value?.replace(/\/+$/, "");
}

export function tutorBackendUrl(): string {
  return configuredBackendUrl() ||
    (process.env.NODE_ENV === "development" ? DEFAULT_DEV_BACKEND : DEFAULT_PRODUCTION_BACKEND);
}

export function tutorBackendTimeoutMs(defaultMs: number): number {
  const raw = process.env.LEMMAS_BACKEND_TIMEOUT_MS?.trim();
  if (!raw) return defaultMs;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1000 || parsed > 25000) {
    return defaultMs;
  }
  return Math.round(parsed);
}
