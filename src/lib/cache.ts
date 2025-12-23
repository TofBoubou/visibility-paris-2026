import { kv } from "@vercel/kv";

// Cache durations in seconds
export const CACHE_DURATION = {
  TRENDS: 12 * 60 * 60, // 12 hours
  SENTIMENT: 24 * 60 * 60, // 24 hours
  THEMES: 24 * 60 * 60, // 24 hours
  YOUTUBE_7D: 12 * 60 * 60, // 12 hours (2 refreshs/day)
  YOUTUBE_30D: 24 * 60 * 60, // 24 hours (1 refresh/day)
} as const;

// Generic cache get with type safety
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const data = await kv.get<T>(key);
    return data;
  } catch (error) {
    console.error(`Cache get error for ${key}:`, error);
    return null;
  }
}

// Generic cache set
export async function cacheSet<T>(
  key: string,
  value: T,
  expirationSeconds: number
): Promise<boolean> {
  try {
    await kv.set(key, value, { ex: expirationSeconds });
    return true;
  } catch (error) {
    console.error(`Cache set error for ${key}:`, error);
    return false;
  }
}

// Check if KV is available (for local dev without KV)
export async function isKvAvailable(): Promise<boolean> {
  try {
    await kv.ping();
    return true;
  } catch {
    return false;
  }
}

// Build cache keys
export function buildCacheKey(
  type: "sentiment" | "themes" | "trends" | "youtube",
  identifier: string,
  period?: number
): string {
  const periodSuffix = period ? `:${period}d` : "";
  return `${type}:${identifier.toLowerCase().replace(/\s+/g, "_")}${periodSuffix}`;
}
