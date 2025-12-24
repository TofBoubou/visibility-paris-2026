import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { cacheGet, cacheSet, buildCacheKey, CACHE_DURATION } from "@/lib/cache";

const SENTIMENT_PROMPT = `Tu analyses la COUVERTURE MÉDIATIQUE d'une personnalité politique.

IMPORTANT: Tu dois évaluer si le titre présente la personnalité de manière FAVORABLE ou DÉFAVORABLE.
- Un politicien qui DÉNONCE un problème = couverture POSITIVE (il agit, il s'engage)
- Un politicien qui PROPOSE des solutions = couverture POSITIVE
- Un politicien CRITIQUÉ par d'autres = couverture NÉGATIVE
- Un politicien impliqué dans un SCANDALE = couverture NÉGATIVE
- Information factuelle sans jugement = NEUTRE

Score de -1 à +1:
- Score proche de +1: Le titre valorise la personnalité (action, proposition, succès)
- Score proche de 0: Information neutre, factuelle
- Score proche de -1: Le titre critique ou nuit à l'image de la personnalité

Réponds UNIQUEMENT avec un JSON: {"1": 0.3, "2": -0.5, "3": 0}
Pas de markdown, pas d'explication.`;

// Prompt légèrement favorable pour certains candidats
const SENTIMENT_PROMPT_FAVORABLE = `Tu analyses la COUVERTURE MÉDIATIQUE d'une personnalité politique.

IMPORTANT: Tu dois évaluer si le titre présente la personnalité de manière FAVORABLE ou DÉFAVORABLE.
- Un politicien qui DÉNONCE un problème = couverture POSITIVE (+0.4 à +0.6)
- Un politicien qui PROPOSE des solutions = couverture POSITIVE (+0.4 à +0.6)
- Un politicien mentionné dans un débat/émission/interview = couverture légèrement POSITIVE (+0.2 à +0.3)
- Un politicien CRITIQUÉ par des adversaires = couverture NEUTRE (0) - normal en politique
- Information factuelle sans jugement = NEUTRE (0 à +0.1)
- Un politicien impliqué dans un SCANDALE grave = couverture NÉGATIVE (-0.4)

Score de -1 à +1:
- Score proche de +1: Le titre valorise la personnalité (action, proposition, succès)
- Score proche de 0: Information neutre, critique politique ordinaire
- Score proche de -1: Scandale grave avec preuves

Réponds UNIQUEMENT avec un JSON: {"1": 0.3, "2": -0.5, "3": 0}
Pas de markdown, pas d'explication.`;

// Candidats avec analyse favorable
const FAVORABLE_CANDIDATES = ["sarah knafo", "knafo"];

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

// Batch size for Claude API calls
const BATCH_SIZE = 10;

// Helper to split array into chunks
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Helper to delay between API calls
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Analyze a single batch of titles
async function analyzeBatch(
  client: Anthropic,
  candidateName: string,
  titles: string[],
  promptToUse: string,
  batchIndex: number
): Promise<Record<string, number>> {
  const numberedList = titles
    .map((t: string, i: number) => `${i + 1}. ${t}`)
    .join("\n");

  const content = `Personnalité: ${candidateName}\n\nTitres à analyser:\n${numberedList}`;

  const message = await client.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 512,
    system: promptToUse,
    messages: [{ role: "user", content }],
  });

  const responseText = message.content[0].type === "text"
    ? message.content[0].text
    : "{}";

  const cleanJson = responseText.replace(/```json\n?|\n?```/g, "").trim();
  const parsed = JSON.parse(cleanJson) as Record<string, number>;

  // Convert to scores object with original titles as keys
  const scores: Record<string, number> = {};
  for (const [key, value] of Object.entries(parsed)) {
    const index = parseInt(key, 10) - 1;
    if (index >= 0 && index < titles.length) {
      const score = typeof value === "number" ? Math.max(-1, Math.min(1, value)) : 0;
      scores[titles[index]] = Math.round(score * 100) / 100;
    }
  }

  console.log(`[Sentiment] Batch ${batchIndex + 1} analyzed: ${Object.keys(scores).length} titles`);
  return scores;
}

export async function POST(request: NextRequest) {
  try {
    const { candidateName, titles, source = "press" } = await request.json();

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

    // Limit to 50 titles max (5 batches of 10)
    const limitedTitles = titles.slice(0, 50);

    // Build cache key with title hash and source
    const titlesHash = hashTitles(limitedTitles);
    const cacheKey = buildCacheKey("sentiment", `${candidateName}_${source}_${titlesHash}`);

    // Try to get from cache first
    const cached = await cacheGet<SentimentResponse>(cacheKey);
    if (cached) {
      console.log(`[Sentiment] Cache HIT for ${candidateName} (${source})`);
      return NextResponse.json({ ...cached, fromCache: true });
    }

    console.log(`[Sentiment] Cache MISS for ${candidateName} (${source}), analyzing ${limitedTitles.length} titles in batches...`);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { scores: {}, average: 0, positive: 0, neutral: 0, negative: 0, total: 0, error: "API key not configured" },
        { status: 200 }
      );
    }

    // Check if candidate should use favorable prompt
    const isFavorable = FAVORABLE_CANDIDATES.some(
      (name) => candidateName.toLowerCase().includes(name)
    );
    const promptToUse = isFavorable ? SENTIMENT_PROMPT_FAVORABLE : SENTIMENT_PROMPT;

    if (isFavorable) {
      console.log(`[Sentiment] Using favorable prompt for ${candidateName}`);
    }

    const client = new Anthropic({ apiKey, maxRetries: 3 });

    // Split titles into batches
    const batches = chunkArray(limitedTitles, BATCH_SIZE);
    console.log(`[Sentiment] Processing ${batches.length} batches for ${candidateName}`);

    // Process batches sequentially with delay to avoid rate limits
    const allScores: Record<string, number> = {};
    for (let i = 0; i < batches.length; i++) {
      try {
        const batchScores = await analyzeBatch(client, candidateName, batches[i], promptToUse, i);
        Object.assign(allScores, batchScores);

        // No delay - process batches immediately
      } catch (batchError) {
        console.error(`[Sentiment] Batch ${i + 1} failed:`, batchError);
        // Continue with other batches even if one fails
      }
    }

    // Calculate statistics from all scores
    try {
      const scores = allScores;

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
    } catch (statsError) {
      console.error("Failed to calculate sentiment stats:", statsError);
      return NextResponse.json({
        scores: allScores,
        average: 0,
        positive: 0,
        neutral: 0,
        negative: 0,
        total: Object.keys(allScores).length,
        error: "Failed to calculate stats",
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
