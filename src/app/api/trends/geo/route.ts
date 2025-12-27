import { NextRequest, NextResponse } from "next/server";
import { cacheGet, cacheSet, buildCacheKey, CACHE_DURATION } from "@/lib/cache";

// Comparative mode result: region -> { keyword: score }
interface ComparativeResult {
  results: Record<string, Record<string, number>>;
  fromCache: boolean;
  rateLimited: boolean;
  comparative: true;
  error?: string;
}

// Fetch comparative data from Python backend (all keywords in one request)
async function fetchComparative(
  keywords: string[],
  geo: string,
  days: number,
  resolution: string
): Promise<ComparativeResult> {
  try {
    const baseUrl = "https://visibility-paris-2026.vercel.app";
    const keywordsParam = encodeURIComponent(keywords.join(","));
    const url = `${baseUrl}/api/pytrends_geo?keywords=${keywordsParam}&geo=${geo}&days=${days}&resolution=${resolution}&comparative=true`;

    console.log(`[TrendsGeo] ====== COMPARATIVE FETCH START ======`);
    console.log(`[TrendsGeo] URL: ${url}`);
    console.log(`[TrendsGeo] Keywords: ${JSON.stringify(keywords)}`);

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    console.log(`[TrendsGeo] Response status: ${response.status}`);
    const responseText = await response.text();
    console.log(`[TrendsGeo] Raw response (first 500 chars): ${responseText.substring(0, 500)}`);

    if (!response.ok) {
      let error: { error?: string } = {};
      try {
        error = JSON.parse(responseText);
      } catch {
        error = { error: responseText };
      }
      if (response.status === 429 || error.error === "RATE_LIMITED") {
        return { results: {}, error: "RATE_LIMITED", rateLimited: true, fromCache: false, comparative: true };
      }
      return { results: {}, error: error.error || `HTTP ${response.status}`, rateLimited: false, fromCache: false, comparative: true };
    }

    const data = JSON.parse(responseText);
    console.log(`[TrendsGeo] Parsed data - regions: ${Object.keys(data.results || {}).length}`);

    if (data.error === "RATE_LIMITED") {
      return { results: data.results || {}, error: "RATE_LIMITED", rateLimited: true, fromCache: false, comparative: true };
    }

    console.log(`[TrendsGeo] ====== COMPARATIVE FETCH END - SUCCESS ======`);
    return {
      results: data.results || {},
      error: data.error,
      rateLimited: false,
      fromCache: false,
      comparative: true,
    };
  } catch (error) {
    console.error(`[TrendsGeo] COMPARATIVE FETCH EXCEPTION:`, error);
    return { results: {}, error: String(error), rateLimited: false, fromCache: false, comparative: true };
  }
}

export async function POST(request: NextRequest) {
  console.log(`[TrendsGeo] ====== POST REQUEST RECEIVED ======`);
  try {
    const body = await request.json();
    console.log(`[TrendsGeo] Request body:`, JSON.stringify(body));

    const {
      keywords,
      geo = "FR",
      days = 7,
      resolution = "REGION",
      comparative = false,
    } = body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      console.error(`[TrendsGeo] Missing keywords array`);
      return NextResponse.json({ error: "Missing keywords array" }, { status: 400 });
    }

    // COMPARATIVE MODE (≤5 keywords)
    if (comparative && keywords.length <= 5) {
      console.log(`[TrendsGeo] COMPARATIVE MODE - ${keywords.length} keywords`);

      // Build cache key for comparative query
      const sortedKeywords = [...keywords].sort();
      const cacheIdentifier = `comparative:${geo}:${resolution}:${sortedKeywords.join("|")}`;
      const cacheKey = buildCacheKey("trends_geo", cacheIdentifier, days);
      console.log(`[TrendsGeo] Cache key: ${cacheKey}`);

      // Check cache
      const cachedData = await cacheGet<ComparativeResult>(cacheKey);
      if (cachedData) {
        console.log(`[TrendsGeo] Cache HIT - ${Object.keys(cachedData.results || {}).length} regions`);
        return NextResponse.json({ ...cachedData, fromCache: true });
      }

      console.log(`[TrendsGeo] Cache MISS, fetching comparative data...`);
      const result = await fetchComparative(keywords, geo, days, resolution);

      // Only cache if we got data and no rate limit
      const hasData = Object.keys(result.results).length > 0;
      if (hasData && !result.rateLimited) {
        await cacheSet(cacheKey, result, CACHE_DURATION.TRENDS_GEO);
        console.log(`[TrendsGeo] Cached comparative result`);
      } else {
        console.log(`[TrendsGeo] Not caching - hasData: ${hasData}, rateLimited: ${result.rateLimited}`);
      }

      return NextResponse.json(result);
    }

    // NON-COMPARATIVE MODE (>5 keywords) - return error
    console.log(`[TrendsGeo] ERROR - ${keywords.length} keywords, max 5 for comparative`);
    return NextResponse.json({
      results: {},
      error: "Sélectionnez maximum 5 candidats pour la vue comparative",
      rateLimited: false,
      fromCache: false,
      comparative: true,
    });

  } catch (error) {
    console.error("[TrendsGeo] API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
