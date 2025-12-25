import { NextRequest, NextResponse } from "next/server";
import { cacheGet, cacheSet, buildCacheKey, CACHE_DURATION } from "@/lib/cache";

interface TrendsResult {
  scores: Record<string, number>;
  fromCache: boolean;
  rateLimited: boolean;
  error?: string;
}

// Fetch from Python backend (batch all keywords at once)
async function fetchFromPython(keywords: string[], days: number): Promise<{
  scores: Record<string, number>;
  error?: string;
  rateLimited: boolean;
}> {
  try {
    // In production, this calls the Python serverless function at /api/trends
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const keywordsParam = encodeURIComponent(keywords.join(","));
    const url = `${baseUrl}/py-api/trends?keywords=${keywordsParam}&days=${days}`;

    console.log(`[Trends] Fetching from Python: ${keywords.length} keywords`);

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      if (response.status === 429 || error.error === "RATE_LIMITED") {
        return { scores: {}, error: "RATE_LIMITED", rateLimited: true };
      }
      return { scores: {}, error: error.error || "Unknown error", rateLimited: false };
    }

    const data = await response.json();

    if (data.error === "RATE_LIMITED") {
      return { scores: data.scores || {}, error: "RATE_LIMITED", rateLimited: true };
    }

    return {
      scores: data.scores || {},
      error: data.error,
      rateLimited: false,
    };
  } catch (error) {
    console.error(`[Trends] Python fetch error:`, error);
    return { scores: {}, error: String(error), rateLimited: false };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { keywords, days = 7 } = await request.json();

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json({ error: "Missing keywords array" }, { status: 400 });
    }

    // Build a single cache key for the whole batch (period + all keywords sorted)
    const batchKey = buildCacheKey("trends", keywords.sort().join("|"), days);

    // Check cache first
    const cachedData = await cacheGet<TrendsResult>(batchKey);
    if (cachedData) {
      console.log(`[Trends] Cache HIT for batch (${keywords.length} keywords)`);
      return NextResponse.json({
        ...cachedData,
        fromCache: true,
      });
    }

    console.log(`[Trends] Cache MISS for batch, fetching ${keywords.length} keywords...`);

    // Fetch all keywords from Python backend
    const result = await fetchFromPython(keywords, days);

    const response: TrendsResult = {
      scores: result.scores,
      fromCache: false,
      rateLimited: result.rateLimited,
      error: result.error,
    };

    // Cache successful result (even partial)
    if (Object.keys(result.scores).length > 0) {
      await cacheSet(batchKey, response, CACHE_DURATION.TRENDS);
      console.log(`[Trends] Cached batch result`);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Trends] API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
