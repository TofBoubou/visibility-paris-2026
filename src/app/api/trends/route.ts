import { NextRequest, NextResponse } from "next/server";
import { cacheGet, cacheSet, buildCacheKey, CACHE_DURATION } from "@/lib/cache";

interface TrendData {
  keyword: string;
  currentValue: number;
  maxValue: number;
  avgValue: number;
  timeline: Array<{ date: string; value: number }>;
  available: boolean;
  fromCache?: boolean;
  error?: string;
}

interface TrendsResponse {
  results: Record<string, TrendData>;
  cached: number;
  fetched: number;
  failed: number;
  rateLimited: boolean;
}

// Fetch from Python backend
async function fetchFromPython(keyword: string, days: number): Promise<TrendData | null> {
  try {
    // In production, this calls the Python serverless function
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const url = `${baseUrl}/py-api/trends?q=${encodeURIComponent(keyword)}&days=${days}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      // Check for rate limiting (429 or specific error messages)
      if (response.status === 429 ||
          (error.error && error.error.toLowerCase().includes("rate"))) {
        return { ...createEmptyTrend(keyword), error: "RATE_LIMITED" };
      }
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`[Trends] Python fetch error for ${keyword}:`, error);
    return null;
  }
}

function createEmptyTrend(keyword: string): TrendData {
  return {
    keyword,
    currentValue: 0,
    maxValue: 0,
    avgValue: 0,
    timeline: [],
    available: false,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { keywords, days = 7 } = await request.json();

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json({ error: "Missing keywords array" }, { status: 400 });
    }

    const results: Record<string, TrendData> = {};
    let cached = 0;
    let fetched = 0;
    let failed = 0;
    let rateLimited = false;

    // Process each keyword
    for (const keyword of keywords) {
      const cacheKey = buildCacheKey("trends", keyword, days);

      // Check cache first
      const cachedData = await cacheGet<TrendData>(cacheKey);
      if (cachedData) {
        console.log(`[Trends] Cache HIT for ${keyword}`);
        results[keyword] = { ...cachedData, fromCache: true };
        cached++;
        continue;
      }

      // If already rate limited, skip fetching but mark as unavailable
      if (rateLimited) {
        console.log(`[Trends] Skipping ${keyword} due to rate limit`);
        results[keyword] = { ...createEmptyTrend(keyword), fromCache: false };
        failed++;
        continue;
      }

      // Try to fetch from Python backend
      console.log(`[Trends] Cache MISS for ${keyword}, fetching...`);
      const data = await fetchFromPython(keyword, days);

      if (data?.error === "RATE_LIMITED") {
        console.log(`[Trends] Rate limited at ${keyword}`);
        rateLimited = true;
        results[keyword] = { ...createEmptyTrend(keyword), fromCache: false };
        failed++;
        continue;
      }

      if (data && data.available) {
        // Cache successful result
        await cacheSet(cacheKey, data, CACHE_DURATION.TRENDS);
        console.log(`[Trends] Cached result for ${keyword}`);
        results[keyword] = { ...data, fromCache: false };
        fetched++;
      } else if (data) {
        // Data returned but not available (no results)
        // Cache for shorter time (1h) to avoid hammering
        await cacheSet(cacheKey, data, 3600);
        results[keyword] = { ...data, fromCache: false };
        fetched++;
      } else {
        // Complete failure
        results[keyword] = { ...createEmptyTrend(keyword), fromCache: false };
        failed++;
      }

      // Small delay between requests to be nice to Google
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const response: TrendsResponse = {
      results,
      cached,
      fetched,
      failed,
      rateLimited,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Trends] API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
