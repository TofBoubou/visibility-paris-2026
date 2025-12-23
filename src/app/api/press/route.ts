import { NextRequest, NextResponse } from "next/server";

interface Article {
  title: string;
  url: string;
  domain: string;
  date: string;
  source: "GDELT" | "Google News";
}

interface PressResponse {
  articles: Article[];
  count: number;
  domains: number;
  topMedia: string | null;
  topMediaCount: number;
  mediaBreakdown: Array<{ domain: string; count: number }>;
  error?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get("q");
  const days = parseInt(searchParams.get("days") || "14", 10);

  console.log(`[Press] Request: q="${searchTerm}", days=${days}`);

  if (!searchTerm) {
    console.error("[Press] ERROR: Missing search term");
    return NextResponse.json({ error: "Missing search term" }, { status: 400 });
  }

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch from both sources in parallel
    const [gdeltArticles, googleNewsArticles] = await Promise.all([
      fetchGDELT(searchTerm, startDate, endDate),
      fetchGoogleNews(searchTerm),
    ]);

    // Merge and deduplicate
    const allArticles = [...gdeltArticles, ...googleNewsArticles];
    const seenUrls = new Set<string>();
    const uniqueArticles: Article[] = [];

    for (const article of allArticles) {
      const normalizedUrl = article.url.split("?")[0].toLowerCase();
      if (!seenUrls.has(normalizedUrl)) {
        seenUrls.add(normalizedUrl);
        // Filter by date range
        const articleDate = new Date(article.date);
        if (articleDate >= startDate && articleDate <= endDate) {
          uniqueArticles.push(article);
        }
      }
    }

    // Sort by date descending
    uniqueArticles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate domain statistics
    const domainCounts: Record<string, number> = {};
    for (const article of uniqueArticles) {
      domainCounts[article.domain] = (domainCounts[article.domain] || 0) + 1;
    }

    const sortedDomains = Object.entries(domainCounts)
      .sort((a, b) => b[1] - a[1]);

    const mediaBreakdown = sortedDomains.slice(0, 5).map(([domain, count]) => ({
      domain,
      count,
    }));

    const result: PressResponse = {
      articles: uniqueArticles,
      count: uniqueArticles.length,
      domains: Object.keys(domainCounts).length,
      topMedia: sortedDomains[0]?.[0] || null,
      topMediaCount: sortedDomains[0]?.[1] || 0,
      mediaBreakdown,
    };

    console.log(`[Press] Result for "${searchTerm}": ${uniqueArticles.length} articles from ${Object.keys(domainCounts).length} domains`);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("Press API error:", error);
    return NextResponse.json(
      {
        articles: [],
        count: 0,
        domains: 0,
        topMedia: null,
        topMediaCount: 0,
        mediaBreakdown: [],
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function fetchGDELT(searchTerm: string, startDate: Date, endDate: Date): Promise<Article[]> {
  try {
    const formatDate = (d: Date) =>
      d.toISOString().replace(/[-:T]/g, "").slice(0, 14);

    const params = new URLSearchParams({
      query: `"${searchTerm}"`,
      mode: "ArtList",
      format: "json",
      maxrecords: "250",
      startdatetime: formatDate(startDate),
      enddatetime: formatDate(endDate),
      sourcelang: "french",
    });

    const response = await fetch(
      `https://api.gdeltproject.org/api/v2/doc/doc?${params}`,
      { signal: AbortSignal.timeout(30000) }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (!data.articles) {
      return [];
    }

    return data.articles.map((article: {
      title?: string;
      url?: string;
      domain?: string;
      seendate?: string;
    }) => ({
      title: article.title || "",
      url: article.url || "",
      domain: article.domain || extractDomain(article.url || ""),
      date: article.seendate?.slice(0, 8).replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3") || "",
      source: "GDELT" as const,
    }));
  } catch {
    return [];
  }
}

async function fetchGoogleNews(searchTerm: string): Promise<Article[]> {
  try {
    const params = new URLSearchParams({
      q: searchTerm,
      hl: "fr",
      gl: "FR",
      ceid: "FR:fr",
    });

    const response = await fetch(
      `https://news.google.com/rss/search?${params}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; VisibilityBot/1.0)",
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      return [];
    }

    const text = await response.text();

    // Parse RSS XML
    const articles: Article[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/;
    const linkRegex = /<link>(.*?)<\/link>/;
    const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;
    const sourceRegex = /<source[^>]*>(.*?)<\/source>/;

    let match;
    while ((match = itemRegex.exec(text)) !== null) {
      const item = match[1];
      const titleMatch = titleRegex.exec(item);
      const linkMatch = linkRegex.exec(item);
      const dateMatch = pubDateRegex.exec(item);
      const sourceMatch = sourceRegex.exec(item);

      const title = titleMatch?.[1] || titleMatch?.[2] || "";
      const url = linkMatch?.[1] || "";
      const dateStr = dateMatch?.[1] || "";
      const source = sourceMatch?.[1] || "";

      // Parse date
      let date = "";
      try {
        const parsed = new Date(dateStr);
        date = parsed.toISOString().slice(0, 10);
      } catch {
        date = new Date().toISOString().slice(0, 10);
      }

      articles.push({
        title,
        url,
        domain: source || extractDomain(url),
        date,
        source: "Google News",
      });
    }

    return articles;
  } catch {
    return [];
  }
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return "unknown";
  }
}
