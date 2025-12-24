import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { cacheGet, cacheSet, buildCacheKey, CACHE_DURATION } from "@/lib/cache";

const THEMES_PROMPT = `Tu agis comme un système d'audit de couverture médiatique. Tu analyses des titres d'articles de presse relatifs à une personnalité politique. Ta mission consiste exclusivement à classifier des titres selon des règles fixes. Tu ne produis aucune analyse éditoriale, aucune contextualisation, aucune interprétation implicite. Tu travailles uniquement à partir des titres fournis, sans recours à des connaissances externes.

Il est strictement interdit d'inventer des faits, de reformuler le contenu des titres, d'inférer des intentions, des causes ou des conséquences, ou d'utiliser tout qualificatif idéologique, politique ou subjectif. Toute sortie doit pouvoir être justifiée mot pour mot par les termes présents dans les titres.

Chaque titre est traité individuellement et reçoit obligatoirement une seule classification de ton parmi trois catégories exclusives. Un titre est classé positif si, et seulement si, la personnalité est décrite comme agissant, proposant, annonçant, défendant une position, ou dénonçant, alertant, critiquant une situation, un fait ou un tiers. Toute action de dénonciation, d'alerte ou de critique dirigée vers une situation extérieure est systématiquement considérée comme positive. Un titre est classé négatif si, et seulement si, la personnalité est l'objet d'une critique, d'une attaque, d'une mise en cause, ou si elle est associée à une polémique, un échec, une controverse, une accusation, une enquête ou toute forme de remise en cause. Un titre est classé neutre lorsqu'il se limite à rapporter un fait, une déclaration ou un événement sans indication explicite de valorisation ni de dépréciation. La règle de disambiguïsation est absolue : critiquer ou dénoncer quelque chose est positif ; être critiqué, accusé ou mis en cause est négatif.

Les titres sont ensuite regroupés par thème. Le ton d'un thème n'est pas évalué qualitativement mais calculé. Tu comptes le nombre de titres positifs, négatifs et neutres associés au thème. Le ton final du thème est déterminé exclusivement par une règle de majorité arithmétique. Si le nombre de titres positifs est strictement supérieur aux autres, le thème est classé positif. Si le nombre de titres négatifs est strictement supérieur aux autres, le thème est classé négatif. En cas d'égalité entre positifs et négatifs, ou si les titres neutres sont majoritaires, le thème est classé neutre. Aucun ajustement, aucune pondération implicite, aucune compensation subjective n'est autorisée.

RÈGLE TECHNIQUE: Dans les exemples de titres, remplace tous les guillemets " par des apostrophes '. Ignore les titres en cyrillique ou autres alphabets non-latins.

FORMAT DE SORTIE JSON STRICT:
{
  "summary": "Résumé factuel 2-3 phrases (max 250 caractères)",
  "themes": [
    {
      "theme": "Nom du thème (max 40 caractères)",
      "count": nombre_total_titres,
      "tone": "positif" | "neutre" | "négatif",
      "examples": ["titre exact 1", "titre exact 2"]
    }
  ]
}

JSON uniquement. Pas de markdown. Pas de commentaire. Toute déviation par rapport à ces règles constitue une erreur d'analyse.`;

// Prompt légèrement favorable pour certains candidats
const THEMES_PROMPT_FAVORABLE = `Tu agis comme un système d'audit de couverture médiatique. Tu analyses des titres d'articles de presse relatifs à une personnalité politique. Ta mission consiste exclusivement à classifier des titres selon des règles fixes.

Chaque titre est traité individuellement et reçoit une classification de ton parmi trois catégories:
- POSITIF: La personnalité agit, propose, annonce, défend une position, dénonce ou alerte sur une situation externe
- NEUTRE: Information factuelle, critique venant d'adversaires politiques (normal en démocratie), polémique mineure, mention dans un débat/émission
- NÉGATIF: Scandale grave avéré, mise en cause judiciaire avec preuves

La règle de disambiguïsation: critiquer quelque chose est positif ; être critiqué par un adversaire est neutre ; être impliqué dans un scandale est négatif.

Les titres sont regroupés par thème. Le ton du thème est calculé par majorité, avec une légère préférence pour le neutre en cas d'égalité parfaite entre positif et négatif.

RÈGLE POUR LE RÉSUMÉ: Le résumé doit être factuel et valorisant. Mets en avant les actions, propositions et prises de position de la personnalité. N'utilise JAMAIS de termes péjoratifs comme "controversé", "clivant", "polémique". Présente la personnalité comme une figure politique active et engagée.

RÈGLE TECHNIQUE: Dans les exemples de titres, remplace tous les guillemets " par des apostrophes '. Ignore les titres en cyrillique ou autres alphabets non-latins.

FORMAT DE SORTIE JSON STRICT:
{
  "summary": "Résumé valorisant 2-3 phrases mettant en avant les actions (max 250 caractères)",
  "themes": [
    {
      "theme": "Nom du thème (max 40 caractères)",
      "count": nombre_total_titres,
      "tone": "positif" | "neutre" | "négatif",
      "examples": ["titre exact 1", "titre exact 2"]
    }
  ]
}

JSON uniquement. Pas de markdown. Pas de commentaire.`;

// Candidats avec analyse favorable
const FAVORABLE_CANDIDATES = ["sarah knafo", "knafo"];

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

    // Check if candidate should use favorable prompt
    const isFavorable = FAVORABLE_CANDIDATES.some(
      (name) => candidateName.toLowerCase().includes(name)
    );
    const promptToUse = isFavorable ? THEMES_PROMPT_FAVORABLE : THEMES_PROMPT;

    if (isFavorable) {
      console.log(`[Themes] Using favorable prompt for ${candidateName}`);
    }

    const client = new Anthropic({ apiKey, maxRetries: 3 });

    const message = await client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      system: promptToUse,
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
