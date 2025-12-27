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

    console.log(`[TrendsGeo] ====== FETCH START ======`);
    console.log(`[TrendsGeo] URL: ${url}`);
    console.log(`[TrendsGeo] Keywords: ${JSON.stringify(keywords)}`);
    console.log(`[TrendsGeo] Geo: ${geo}, Days: ${days}, Resolution: ${resolution}`);

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    console.log(`[TrendsGeo] Response status: ${response.status}`);
    console.log(`[TrendsGeo] Response headers:`, Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log(`[TrendsGeo] Raw response (first 1000 chars): ${responseText.substring(0, 1000)}`);

    if (!response.ok) {
      console.error(`[TrendsGeo] ERROR - Response not OK`);
      let error: { error?: string } = {};
      try {
        error = JSON.parse(responseText);
      } catch {
        error = { error: responseText };
      }
      if (response.status === 429 || error.error === "RATE_LIMITED") {
        return { results: {}, error: "RATE_LIMITED", rateLimited: true };
      }
      return { results: {}, error: error.error || `HTTP ${response.status}`, rateLimited: false };
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error(`[TrendsGeo] ERROR - Failed to parse JSON:`, e);
      return { results: {}, error: "Invalid JSON response", rateLimited: false };
    }

    console.log(`[TrendsGeo] Parsed data keys:`, Object.keys(data));
    console.log(`[TrendsGeo] Results keys:`, Object.keys(data.results || {}));

    // Log each keyword's results
    for (const [kw, cities] of Object.entries(data.results || {})) {
      const cityArray = cities as GeoData[];
      console.log(`[TrendsGeo] Keyword "${kw}": ${cityArray.length} cities`);
      if (cityArray.length > 0) {
        console.log(`[TrendsGeo]   Top 3: ${JSON.stringify(cityArray.slice(0, 3))}`);
      }
    }

    if (data.error) {
      console.log(`[TrendsGeo] Data contains error: ${data.error}`);
    }
    if (data.from_cache) {
      console.log(`[TrendsGeo] Data is from Python cache`);
    }

    if (data.error === "RATE_LIMITED") {
      return { results: data.results || {}, error: "RATE_LIMITED", rateLimited: true };
    }

    console.log(`[TrendsGeo] ====== FETCH END - SUCCESS ======`);
    return {
      results: data.results || {},
      error: data.error,
      rateLimited: false,
    };
  } catch (error) {
    console.error(`[TrendsGeo] ====== FETCH END - EXCEPTION ======`);
    console.error(`[TrendsGeo] Exception:`, error);
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
