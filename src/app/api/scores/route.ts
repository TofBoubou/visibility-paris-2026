import { NextRequest, NextResponse } from "next/server";

// Score weights (same as original app)
const WEIGHTS = {
  trends: 0.30,
  press: 0.30,
  wikipedia: 0.25,
  youtube: 0.15,
};

interface CandidateRawData {
  id: string;
  name: string;
  trends?: number;
  pressCount?: number;
  pressDomains?: number;
  wikipediaViews?: number;
  youtubeViews?: number;
}

interface CandidateScore {
  id: string;
  name: string;
  total: number;
  breakdown: {
    trends: number;
    press: number;
    wikipedia: number;
    youtube: number;
  };
  contributions: {
    trends: number;
    press: number;
    wikipedia: number;
    youtube: number;
  };
  raw: {
    trends: number;
    pressCount: number;
    pressDomains: number;
    wikipediaViews: number;
    youtubeViews: number;
  };
}

interface ScoresResponse {
  scores: CandidateScore[];
  leader: CandidateScore | null;
  totals: {
    articles: number;
    wikipediaViews: number;
    youtubeViews: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { candidates, period } = await request.json() as {
      candidates: CandidateRawData[];
      period: string;
    };

    if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
      return NextResponse.json({ error: "Missing candidates data" }, { status: 400 });
    }

    // Calculate period-based thresholds
    const periodDays = parseInt(period?.replace(/[^\d]/g, "") || "14", 10);
    const domainThreshold = Math.max(5, periodDays * 2);

    // Find max values for relative scoring
    const maxValues = {
      trends: Math.max(...candidates.map((c) => c.trends || 0), 1),
      press: Math.max(...candidates.map((c) => c.pressCount || 0), 1),
      wikipedia: Math.max(...candidates.map((c) => c.wikipediaViews || 0), 1),
      youtube: Math.max(...candidates.map((c) => c.youtubeViews || 0), 1),
    };

    // Calculate scores for each candidate
    const scores: CandidateScore[] = candidates.map((candidate) => {
      const raw = {
        trends: candidate.trends || 0,
        pressCount: candidate.pressCount || 0,
        pressDomains: candidate.pressDomains || 0,
        wikipediaViews: candidate.wikipediaViews || 0,
        youtubeViews: candidate.youtubeViews || 0,
      };

      // Calculate individual component scores (0-100)
      const trendsScore = raw.trends; // Already normalized 0-100 from Google Trends

      // Press score: base (80%) + diversity bonus (20%)
      const pressBase = (raw.pressCount / maxValues.press) * 80;
      const pressBonus = Math.min((raw.pressDomains / domainThreshold) * 20, 20);
      const pressScore = Math.min(pressBase + pressBonus, 100);

      // Wikipedia score: relative to max
      let wikipediaScore = 0;
      if (maxValues.wikipedia > 0) {
        wikipediaScore = (raw.wikipediaViews / maxValues.wikipedia) * 100;
      } else if (raw.wikipediaViews > 0) {
        // Fallback logarithmic scale
        wikipediaScore = Math.min((Math.log10(raw.wikipediaViews) / 5) * 100, 100);
      }

      // YouTube score: relative to max
      let youtubeScore = 0;
      if (maxValues.youtube > 0) {
        youtubeScore = (raw.youtubeViews / maxValues.youtube) * 100;
      } else if (raw.youtubeViews > 0) {
        // Fallback logarithmic scale
        youtubeScore = Math.min((Math.log10(raw.youtubeViews) / 6) * 100, 100);
      }

      const breakdown = {
        trends: Math.round(trendsScore * 10) / 10,
        press: Math.round(pressScore * 10) / 10,
        wikipedia: Math.round(wikipediaScore * 10) / 10,
        youtube: Math.round(youtubeScore * 10) / 10,
      };

      // Calculate contributions (weighted)
      const contributions = {
        trends: Math.round(breakdown.trends * WEIGHTS.trends * 10) / 10,
        press: Math.round(breakdown.press * WEIGHTS.press * 10) / 10,
        wikipedia: Math.round(breakdown.wikipedia * WEIGHTS.wikipedia * 10) / 10,
        youtube: Math.round(breakdown.youtube * WEIGHTS.youtube * 10) / 10,
      };

      // Total score (capped at 100)
      const total = Math.min(
        Math.round(
          (contributions.trends +
            contributions.press +
            contributions.wikipedia +
            contributions.youtube) * 10
        ) / 10,
        100
      );

      return {
        id: candidate.id,
        name: candidate.name,
        total,
        breakdown,
        contributions,
        raw,
      };
    });

    // Sort by total score descending
    scores.sort((a, b) => b.total - a.total);

    // Calculate totals
    const totals = {
      articles: candidates.reduce((sum, c) => sum + (c.pressCount || 0), 0),
      wikipediaViews: candidates.reduce((sum, c) => sum + (c.wikipediaViews || 0), 0),
      youtubeViews: candidates.reduce((sum, c) => sum + (c.youtubeViews || 0), 0),
    };

    const result: ScoresResponse = {
      scores,
      leader: scores[0] || null,
      totals,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Scores API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
