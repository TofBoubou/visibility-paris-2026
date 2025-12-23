import { Candidate } from "@/types/candidate";
import { PERIOD_DAYS, Period } from "@/stores/period";

interface TrendData {
  keyword: string;
  currentValue: number;
  maxValue: number;
  avgValue: number;
  available: boolean;
  fromCache?: boolean;
}

interface TrendsApiResponse {
  results: Record<string, TrendData>;
  cached: number;
  fetched: number;
  failed: number;
  rateLimited: boolean;
}

export interface CandidateFullData {
  candidate: Candidate;
  wikipedia: {
    views: number;
    variation: number;
    avgDaily: number;
  };
  press: {
    count: number;
    domains: number;
    topMedia: string | null;
    articles: Array<{
      title: string;
      url: string;
      domain: string;
      date: string;
    }>;
  };
  youtube: {
    totalViews: number;
    shortsViews: number;
    longViews: number;
    videos: Array<{
      id: string;
      title: string;
      channel: string;
      views: number;
      url: string;
    }>;
  };
  trends: number;
}

export async function fetchCandidateData(
  candidate: Candidate,
  period: Period
): Promise<CandidateFullData> {
  const days = PERIOD_DAYS[period];
  const searchTerm = candidate.searchTerms[0];

  // Fetch all data in parallel
  const [wikipediaRes, pressRes, youtubeRes] = await Promise.all([
    fetch(`/api/wikipedia?page=${encodeURIComponent(candidate.wikipedia)}&days=${days}`),
    fetch(`/api/press?q=${encodeURIComponent(searchTerm)}&days=${days}`),
    fetch(`/api/youtube?q=${encodeURIComponent(searchTerm)}&days=${days}${candidate.youtubeHandle ? `&channel=${candidate.youtubeHandle}` : ""}`),
  ]);

  const [wikipedia, press, youtube] = await Promise.all([
    wikipediaRes.json(),
    pressRes.json(),
    youtubeRes.json(),
  ]);

  return {
    candidate,
    wikipedia: {
      views: wikipedia.views || 0,
      variation: wikipedia.variation || 0,
      avgDaily: wikipedia.avgDaily || 0,
    },
    press: {
      count: press.count || 0,
      domains: press.domains || 0,
      topMedia: press.topMedia || null,
      articles: press.articles || [],
    },
    youtube: {
      totalViews: youtube.totalViews || 0,
      shortsViews: youtube.shortsViews || 0,
      longViews: youtube.longVideosViews || 0,
      videos: youtube.videos || [],
    },
    trends: 50, // Placeholder - Google Trends requires Python backend
  };
}

// Fetch trends for all candidates at once (progressive caching)
async function fetchTrendsForCandidates(
  candidates: Candidate[],
  days: number
): Promise<Record<string, number>> {
  try {
    const keywords = candidates.map((c) => c.searchTerms[0]);

    const response = await fetch("/api/trends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords, days }),
    });

    if (!response.ok) {
      console.error("[Trends] API error:", response.status);
      return {};
    }

    const data: TrendsApiResponse = await response.json();
    console.log(`[Trends] Cached: ${data.cached}, Fetched: ${data.fetched}, Failed: ${data.failed}, Rate limited: ${data.rateLimited}`);

    // Convert to simple keyword -> value map
    const trendsMap: Record<string, number> = {};
    for (const [keyword, trend] of Object.entries(data.results)) {
      // Use avgValue as the trend score (0-100 scale from Google Trends)
      trendsMap[keyword] = trend.available ? trend.avgValue : 0;
    }

    return trendsMap;
  } catch (error) {
    console.error("[Trends] Fetch error:", error);
    return {};
  }
}

export async function fetchAllCandidatesData(
  candidates: Candidate[],
  period: Period
): Promise<CandidateFullData[]> {
  const days = PERIOD_DAYS[period];

  // Fetch trends for all candidates first (with progressive caching)
  const trendsMap = await fetchTrendsForCandidates(candidates, days);

  // Then fetch other data for all candidates in parallel (with batching)
  const batchSize = 4;
  const results: CandidateFullData[] = [];

  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (candidate) => {
        const data = await fetchCandidateData(candidate, period);
        // Override trends with actual value from trendsMap
        const searchTerm = candidate.searchTerms[0];
        data.trends = trendsMap[searchTerm] ?? 0;
        return data;
      })
    );
    results.push(...batchResults);
  }

  return results;
}

export async function calculateScores(
  candidatesData: CandidateFullData[],
  period: Period
) {
  const response = await fetch("/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      candidates: candidatesData.map((d) => ({
        id: d.candidate.id,
        name: d.candidate.name,
        trends: d.trends,
        pressCount: d.press.count,
        pressDomains: d.press.domains,
        wikipediaViews: d.wikipedia.views,
        youtubeViews: d.youtube.totalViews,
      })),
      period,
    }),
  });

  return response.json();
}
