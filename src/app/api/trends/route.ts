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
    // Use production domain to avoid preview deployment auth
    const baseUrl = "https://visibility-paris-2026.vercel.app";

    const keywordsParam = encodeURIComponent(keywords.join(","));
    const url = `${baseUrl}/api/pytrends?keywords=${keywordsParam}&days=${days}`;

    console.log(`[Trends] Using production domain for Python endpoint`);
    console.log(`[Trends] Fetching URL: ${url}`);
    console.log(`[Trends] Keywords: ${keywords.join(", ")}`);

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    console.log(`[Trends] Python response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Trends] Python error response: ${errorText}`);
      let error: { error?: string } = {};
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { error: errorText };
      }
      if (response.status === 429 || error.error === "RATE_LIMITED") {
        return { scores: {}, error: "RATE_LIMITED", rateLimited: true };
      }
      return { scores: {}, error: error.error || `HTTP ${response.status}`, rateLimited: false };
    }

    const data = await response.json();
    console.log(`[Trends] Python response data:`, JSON.stringify(data));

    if (data.error === "RATE_LIMITED") {
      return { scores: data.scores || {}, error: "RATE_LIMITED", rateLimited: true };
    }

    const scoresCount = Object.keys(data.scores || {}).length;
    console.log(`[Trends] Got ${scoresCount} scores from Python`);

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
  console.log(`[Trends] POST request received`);
  try {
    const body = await request.json();
    console.log(`[Trends] Request body:`, JSON.stringify(body));

    const { keywords, days = 7 } = body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      console.error(`[Trends] Missing keywords array`);
      return NextResponse.json({ error: "Missing keywords array" }, { status: 400 });
    }

    console.log(`[Trends] Processing ${keywords.length} keywords for ${days} days`);

    // Build a single cache key for the whole batch (period + all keywords sorted)
    const batchKey = buildCacheKey("trends", keywords.sort().join("|"), days);
    console.log(`[Trends] Cache key: ${batchKey}`);

    // Check cache first
    const cachedData = await cacheGet<TrendsResult>(batchKey);
    if (cachedData) {
      console.log(`[Trends] Cache HIT for batch (${keywords.length} keywords)`);
      console.log(`[Trends] Cached scores:`, JSON.stringify(cachedData.scores));
      return NextResponse.json({
        ...cachedData,
        fromCache: true,
      });
    }

    console.log(`[Trends] Cache MISS for batch, fetching ${keywords.length} keywords...`);

    // Fetch all keywords from Python backend
    const result = await fetchFromPython(keywords, days);

    console.log(`[Trends] Python result - scores: ${Object.keys(result.scores).length}, error: ${result.error}, rateLimited: ${result.rateLimited}`);

    const response: TrendsResult = {
      scores: result.scores,
      fromCache: false,
      rateLimited: result.rateLimited,
      error: result.error,
    };

    // Cache successful result (even partial)
    if (Object.keys(result.scores).length > 0) {
      await cacheSet(batchKey, response, CACHE_DURATION.TRENDS);
      console.log(`[Trends] Cached batch result with ${Object.keys(result.scores).length} scores`);
    } else {
      console.log(`[Trends] No scores to cache`);
    }

    console.log(`[Trends] Returning response:`, JSON.stringify(response));
    return NextResponse.json(response);
  } catch (error) {
    console.error("[Trends] API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
