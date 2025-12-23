import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { cacheGet, cacheSet, buildCacheKey, CACHE_DURATION } from "@/lib/cache";

const SENTIMENT_PROMPT = `Tu analyses le sentiment de titres de presse et vidéos concernant une personnalité politique.

Pour chaque titre, attribue un score de -1 (très négatif) à +1 (très positif).
- Score proche de -1: critique, scandale, polémique
- Score proche de 0: neutre, factuel, informatif
- Score proche de +1: éloge, succès, accomplissement

Réponds UNIQUEMENT avec un objet JSON où les clés sont les numéros des titres et les valeurs sont les scores.
Exemple: {"1": 0.3, "2": -0.5, "3": 0}

Pas de markdown, pas d'explication, juste le JSON.`;

interface SentimentResponse {
  scores: Record<string, number>;
  average: number;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  fromCache?: boolean;
  error?: string;
}

// Create a simple hash of titles for cache key
function hashTitles(titles: string[]): string {
  const str = titles.join("|");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export async function POST(request: NextRequest) {
  try {
    const { candidateName, titles } = await request.json();

    if (!candidateName || !titles || !Array.isArray(titles)) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    if (titles.length === 0) {
      return NextResponse.json({
        scores: {},
        average: 0,
        positive: 0,
        neutral: 0,
        negative: 0,
        total: 0,
      });
    }

    // Limit to 25 titles per batch
    const limitedTitles = titles.slice(0, 25);

    // Build cache key with title hash
    const titlesHash = hashTitles(limitedTitles);
    const cacheKey = buildCacheKey("sentiment", `${candidateName}_${titlesHash}`);

    // Try to get from cache first
    const cached = await cacheGet<SentimentResponse>(cacheKey);
    if (cached) {
      console.log(`[Sentiment] Cache HIT for ${candidateName}`);
      return NextResponse.json({ ...cached, fromCache: true });
    }

    console.log(`[Sentiment] Cache MISS for ${candidateName}, calling Claude...`);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { scores: {}, average: 0, positive: 0, neutral: 0, negative: 0, total: 0, error: "API key not configured" },
        { status: 200 }
      );
    }

    // Build numbered list
    const numberedList = limitedTitles
      .map((t: string, i: number) => `${i + 1}. ${t}`)
      .join("\n");

    const content = `Personnalité: ${candidateName}\n\nTitres à analyser:\n${numberedList}`;

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 512,
      system: SENTIMENT_PROMPT,
      messages: [
        {
          role: "user",
          content,
        },
      ],
    });

    const responseText = message.content[0].type === "text"
      ? message.content[0].text
      : "{}";

    // Parse JSON response
    try {
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleanJson) as Record<string, number>;

      // Convert to scores object with original titles as keys
      const scores: Record<string, number> = {};
      for (const [key, value] of Object.entries(parsed)) {
        const index = parseInt(key, 10) - 1;
        if (index >= 0 && index < limitedTitles.length) {
          const score = typeof value === "number" ? Math.max(-1, Math.min(1, value)) : 0;
          scores[limitedTitles[index]] = Math.round(score * 100) / 100;
        }
      }

      // Calculate statistics
      const scoreValues = Object.values(scores);
      const total = scoreValues.length;
      const average = total > 0
        ? Math.round((scoreValues.reduce((a, b) => a + b, 0) / total) * 100) / 100
        : 0;

      const positive = scoreValues.filter((s) => s > 0.2).length;
      const negative = scoreValues.filter((s) => s < -0.2).length;
      const neutral = total - positive - negative;

      const result: SentimentResponse = {
        scores,
        average,
        positive,
        neutral,
        negative,
        total,
      };

      // Save to cache (24h)
      await cacheSet(cacheKey, result, CACHE_DURATION.SENTIMENT);
      console.log(`[Sentiment] Cached result for ${candidateName}`);

      return NextResponse.json({ ...result, fromCache: false });
    } catch {
      console.error("Failed to parse sentiment JSON:", responseText);
      return NextResponse.json({
        scores: {},
        average: 0,
        positive: 0,
        neutral: 0,
        negative: 0,
        total: 0,
        error: "Failed to parse response",
      });
    }
  } catch (error) {
    console.error("Sentiment API error:", error);
    return NextResponse.json(
      {
        scores: {},
        average: 0,
        positive: 0,
        neutral: 0,
        negative: 0,
        total: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
