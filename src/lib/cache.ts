import { kv } from "@vercel/kv";

// Cache durations in seconds
export const CACHE_DURATION = {
  TRENDS: 12 * 60 * 60, // 12 hours
  SENTIMENT: 24 * 60 * 60, // 24 hours
  THEMES: 24 * 60 * 60, // 24 hours
  YOUTUBE_7D: 12 * 60 * 60, // 12 hours (2 refreshs/day)
  YOUTUBE_30D: 24 * 60 * 60, // 24 hours (1 refresh/day)
} as const;

// Check if KV is configured
function isKvConfigured(): boolean {
  const configured = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  if (!configured) {
    console.log("[Cache] KV not configured - KV_REST_API_URL or KV_REST_API_TOKEN missing");
  }
  return configured;
}

// Generic cache get with type safety
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!isKvConfigured()) {
    console.log(`[Cache] SKIP GET ${key} - KV not configured`);
    return null;
  }

  try {
    console.log(`[Cache] GET ${key}...`);
    const data = await kv.get<T>(key);
    if (data) {
      console.log(`[Cache] HIT ${key}`);
    } else {
      console.log(`[Cache] MISS ${key}`);
    }
    return data;
  } catch (error) {
    console.error(`[Cache] ERROR GET ${key}:`, error);
    return null;
  }
}

// Generic cache set
export async function cacheSet<T>(
  key: string,
  value: T,
  expirationSeconds: number
): Promise<boolean> {
  if (!isKvConfigured()) {
    console.log(`[Cache] SKIP SET ${key} - KV not configured`);
    return false;
  }

  try {
    console.log(`[Cache] SET ${key} (TTL: ${expirationSeconds}s)...`);
    await kv.set(key, value, { ex: expirationSeconds });
    console.log(`[Cache] SET ${key} OK`);
    return true;
  } catch (error) {
    console.error(`[Cache] ERROR SET ${key}:`, error);
    return false;
  }
}

// Check if KV is available (for local dev without KV)
export async function isKvAvailable(): Promise<boolean> {
  if (!isKvConfigured()) {
    return false;
  }
  try {
    await kv.ping();
    console.log("[Cache] KV ping OK");
    return true;
  } catch (error) {
    console.error("[Cache] KV ping failed:", error);
    return false;
  }
}

// Cache version - increment to invalidate all cache
const CACHE_VERSION = "v8";

// Build cache keys
export function buildCacheKey(
  type: "sentiment" | "themes" | "trends" | "youtube",
  identifier: string,
  period?: number
): string {
  const periodSuffix = period ? `:${period}d` : "";
  return `${CACHE_VERSION}:${type}:${identifier.toLowerCase().replace(/\s+/g, "_")}${periodSuffix}`;
}
