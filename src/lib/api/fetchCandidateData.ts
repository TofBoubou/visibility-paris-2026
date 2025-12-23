import { Candidate } from "@/types/candidate";
import { PERIOD_DAYS, Period } from "@/stores/period";

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

export async function fetchAllCandidatesData(
  candidates: Candidate[],
  period: Period
): Promise<CandidateFullData[]> {
  // Fetch data for all candidates in parallel (with some batching to avoid overwhelming the API)
  const batchSize = 4;
  const results: CandidateFullData[] = [];

  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((candidate) => fetchCandidateData(candidate, period))
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
