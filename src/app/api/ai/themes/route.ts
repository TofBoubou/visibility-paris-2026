import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { cacheGet, cacheSet, buildCacheKey, CACHE_DURATION } from "@/lib/cache";

const THEMES_PROMPT = `Tu analyses des titres d'articles concernant une personnalité politique.

RÈGLES:
- Ne JAMAIS inventer de faits absents des titres
- Rester STRICTEMENT factuel
- Pas de qualificatifs politiques

Pour le TONE de chaque thème, évalue si la COUVERTURE est favorable à la personnalité:
- "positif": La personnalité agit, propose, dénonce (image valorisante)
- "neutre": Information factuelle sans jugement
- "négatif": La personnalité est critiquée ou impliquée dans une polémique

Retourne un JSON:
{
  "summary": "Résumé factuel 2-3 phrases (max 250 car)",
  "themes": [
    {
      "theme": "Nom du thème (max 40 car)",
      "count": nombre,
      "tone": "positif" | "neutre" | "négatif",
      "examples": ["titre exact 1", "titre exact 2"]
    }
  ]
}

JSON uniquement, pas de markdown.`;

interface ThemesResponse {
  summary: string;
  themes: Array<{
    theme: string;
    count: number;
    tone: "positif" | "neutre" | "négatif";
    examples: string[];
  }>;
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
    const { candidateName, pressTitles, youtubeTitles, titles } = await request.json();

    if (!candidateName) {
      return NextResponse.json({ error: "Missing candidate name" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { summary: "", themes: [], error: "API key not configured" },
        { status: 200 }
      );
    }

    // Accept both "titles" (legacy) and "pressTitles"/"youtubeTitles" (preferred)
    const limitedPress = (pressTitles || titles || []).slice(0, 50);
    const limitedYoutube = (youtubeTitles || []).slice(0, 50);

    if (limitedPress.length === 0 && limitedYoutube.length === 0) {
      return NextResponse.json({
        summary: "Aucun contenu médiatique trouvé pour cette période.",
        themes: [],
      });
    }

    // Build cache key with hash of all titles
    const allTitles = [...limitedPress, ...limitedYoutube];
    const titlesHash = hashTitles(allTitles);
    const cacheKey = buildCacheKey("themes", `${candidateName}_${titlesHash}`);

    // Try to get from cache first
    const cached = await cacheGet<ThemesResponse>(cacheKey);
    if (cached) {
      console.log(`[Themes] Cache HIT for ${candidateName}`);
      return NextResponse.json({ ...cached, fromCache: true });
    }

    console.log(`[Themes] Cache MISS for ${candidateName}, calling Claude...`);

    // Build the analysis prompt
    let content = `Personnalité: ${candidateName}\n\n`;

    if (limitedPress.length > 0) {
      content += `ARTICLES DE PRESSE (${limitedPress.length}):\n`;
      content += limitedPress.map((t: string) => `- ${t}`).join("\n");
      content += "\n\n";
    }

    if (limitedYoutube.length > 0) {
      content += `VIDÉOS YOUTUBE (${limitedYoutube.length}):\n`;
      content += limitedYoutube.map((t: string) => `- ${t}`).join("\n");
    }

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      system: THEMES_PROMPT,
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
      // Remove potential markdown code blocks and clean up
      let cleanJson = responseText
        .replace(/```json\n?|\n?```/g, "")
        .replace(/^\s+|\s+$/g, "")  // Trim whitespace
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "");  // Remove control characters

      // Try to find JSON object if there's extra text
      const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanJson = jsonMatch[0];
      }

      console.log(`[Themes] Parsing JSON for ${candidateName}, length: ${cleanJson.length}`);
      const parsed = JSON.parse(cleanJson) as ThemesResponse;

      // Validate and sanitize
      const result: ThemesResponse = {
        summary: (parsed.summary || "").slice(0, 500),
        themes: (parsed.themes || []).slice(0, 5).map((t) => ({
          theme: (t.theme || "").slice(0, 100),
          count: typeof t.count === "number" ? t.count : 0,
          tone: ["positif", "neutre", "négatif"].includes(t.tone) ? t.tone : "neutre",
          examples: (t.examples || []).slice(0, 3).map((e: string) => (e || "").slice(0, 150)),
        })),
      };

      // Save to cache (24h)
      await cacheSet(cacheKey, result, CACHE_DURATION.THEMES);
      console.log(`[Themes] Cached result for ${candidateName}`);

      return NextResponse.json({ ...result, fromCache: false });
    } catch {
      console.error("Failed to parse themes JSON:", responseText);
      return NextResponse.json({
        summary: "Analyse en cours...",
        themes: [],
        error: "Failed to parse response",
      });
    }
  } catch (error) {
    console.error("Themes API error:", error);
    return NextResponse.json(
      {
        summary: "",
        themes: [],
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
