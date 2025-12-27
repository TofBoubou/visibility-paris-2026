import { NextRequest, NextResponse } from "next/server";
import { cacheGet, cacheSet, buildCacheKey, CACHE_DURATION } from "@/lib/cache";

interface GeoData {
  name: string;
  score: number;
}

interface GeoTrendsResult {
  results: Record<string, GeoData[]>;
  fromCache: boolean;
  rateLimited: boolean;
  error?: string;
}

// Fetch from Python backend
async function fetchFromPython(
  keywords: string[],
  geo: string,
  days: number,
  resolution: string
): Promise<{
  results: Record<string, GeoData[]>;
  error?: string;
  rateLimited: boolean;
}> {
  try {
    // Use production domain to avoid preview deployment auth
    const baseUrl = "https://visibility-paris-2026.vercel.app";

    const keywordsParam = encodeURIComponent(keywords.join(","));
    const url = `${baseUrl}/api/pytrends_geo?keywords=${keywordsParam}&geo=${geo}&days=${days}&resolution=${resolution}`;

    console.log(`[TrendsGeo] Fetching URL: ${url}`);
    console.log(`[TrendsGeo] Keywords: ${keywords.join(", ")}, geo: ${geo}`);

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    console.log(`[TrendsGeo] Python response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TrendsGeo] Python error response: ${errorText}`);
      let error: { error?: string } = {};
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { error: errorText };
      }
      if (response.status === 429 || error.error === "RATE_LIMITED") {
        return { results: {}, error: "RATE_LIMITED", rateLimited: true };
      }
      return { results: {}, error: error.error || `HTTP ${response.status}`, rateLimited: false };
    }

    const data = await response.json();
    console.log(`[TrendsGeo] Python response keys:`, Object.keys(data.results || {}));

    if (data.error === "RATE_LIMITED") {
      return { results: data.results || {}, error: "RATE_LIMITED", rateLimited: true };
    }

    return {
      results: data.results || {},
      error: data.error,
      rateLimited: false,
    };
  } catch (error) {
    console.error(`[TrendsGeo] Python fetch error:`, error);
    return { results: {}, error: String(error), rateLimited: false };
  }
}

export async function POST(request: NextRequest) {
  console.log(`[TrendsGeo] POST request received`);
  try {
    const body = await request.json();
    console.log(`[TrendsGeo] Request body:`, JSON.stringify(body));

    const {
      keywords,
      geo = "FR-J", // Default: Ile-de-France
      days = 7,
      resolution = "CITY",
    } = body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      console.error(`[TrendsGeo] Missing keywords array`);
      return NextResponse.json({ error: "Missing keywords array" }, { status: 400 });
    }

    console.log(`[TrendsGeo] Processing ${keywords.length} keywords for geo ${geo}, ${days} days, resolution ${resolution}`);

    // Build cache key: geo + resolution + keywords sorted + period
    const cacheIdentifier = `${geo}:${resolution}:${keywords.sort().join("|")}`;
    const cacheKey = buildCacheKey("trends_geo", cacheIdentifier, days);
    console.log(`[TrendsGeo] Cache key: ${cacheKey}`);

    // Check cache first
    const cachedData = await cacheGet<GeoTrendsResult>(cacheKey);
    if (cachedData) {
      console.log(`[TrendsGeo] Cache HIT for batch (${keywords.length} keywords)`);
      return NextResponse.json({
        ...cachedData,
        fromCache: true,
      });
    }

    console.log(`[TrendsGeo] Cache MISS, fetching ${keywords.length} keywords...`);

    // Fetch from Python backend
    const result = await fetchFromPython(keywords, geo, days, resolution);

    console.log(`[TrendsGeo] Python result - results: ${Object.keys(result.results).length}, error: ${result.error}, rateLimited: ${result.rateLimited}`);

    const response: GeoTrendsResult = {
      results: result.results,
      fromCache: false,
      rateLimited: result.rateLimited,
      error: result.error,
    };

    // Cache successful result (even partial)
    const hasData = Object.values(result.results).some((arr) => arr.length > 0);
    if (hasData) {
      await cacheSet(cacheKey, response, CACHE_DURATION.TRENDS_GEO);
      console.log(`[TrendsGeo] Cached result`);
    } else {
      console.log(`[TrendsGeo] No data to cache`);
    }

    console.log(`[TrendsGeo] Returning response`);
    return NextResponse.json(response);
  } catch (error) {
    console.error("[TrendsGeo] API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
