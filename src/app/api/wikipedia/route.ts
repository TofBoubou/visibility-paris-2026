import { NextRequest, NextResponse } from "next/server";

const WIKIPEDIA_API_BASE = "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article";

interface WikipediaResponse {
  views: number;
  variation: number;
  avgDaily: number;
  daily: Record<string, number>;
  error?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pageTitle = searchParams.get("page");
  const days = parseInt(searchParams.get("days") || "14", 10);

  console.log(`[Wikipedia] Request: page="${pageTitle}", days=${days}`);

  if (!pageTitle) {
    console.error("[Wikipedia] ERROR: Missing page parameter");
    return NextResponse.json({ error: "Missing page parameter" }, { status: 400 });
  }

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Reference period for variation calculation
    const refEndDate = new Date(startDate);
    refEndDate.setDate(refEndDate.getDate() - 1);
    const refStartDate = new Date(refEndDate);
    refStartDate.setDate(refStartDate.getDate() - days);

    const formatDate = (d: Date) => d.toISOString().split("T")[0].replace(/-/g, "");

    // Fetch current period
    const currentUrl = `${WIKIPEDIA_API_BASE}/fr.wikipedia/all-access/user/${encodeURIComponent(pageTitle)}/daily/${formatDate(startDate)}/${formatDate(endDate)}`;

    const currentResponse = await fetch(currentUrl, {
      headers: {
        "User-Agent": "VisibilityIndex/1.0 (contact@example.com)",
      },
    });

    if (!currentResponse.ok) {
      throw new Error(`Wikipedia API error: ${currentResponse.status}`);
    }

    const currentData = await currentResponse.json();

    // Calculate current period stats
    const currentViews = currentData.items?.reduce(
      (sum: number, item: { views: number }) => sum + item.views,
      0
    ) || 0;

    const daily: Record<string, number> = {};
    currentData.items?.forEach((item: { timestamp: string; views: number }) => {
      const date = item.timestamp.slice(0, 8);
      daily[`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`] = item.views;
    });

    const avgDaily = currentViews / days;

    // Fetch reference period for variation
    let variation = 0;
    try {
      const refUrl = `${WIKIPEDIA_API_BASE}/fr.wikipedia/all-access/user/${encodeURIComponent(pageTitle)}/daily/${formatDate(refStartDate)}/${formatDate(refEndDate)}`;

      const refResponse = await fetch(refUrl, {
        headers: {
          "User-Agent": "VisibilityIndex/1.0 (contact@example.com)",
        },
      });

      if (refResponse.ok) {
        const refData = await refResponse.json();
        const refViews = refData.items?.reduce(
          (sum: number, item: { views: number }) => sum + item.views,
          0
        ) || 0;

        const refAvgDaily = refViews / days;
        if (refAvgDaily > 0) {
          variation = ((avgDaily - refAvgDaily) / refAvgDaily) * 100;
        }
      }
    } catch {
      // Ignore reference period errors
    }

    const result: WikipediaResponse = {
      views: currentViews,
      variation: Math.round(variation * 10) / 10,
      avgDaily: Math.round(avgDaily),
      daily,
    };

    console.log(`[Wikipedia] Result for "${pageTitle}": ${currentViews} views, ${Math.round(variation)}% variation`);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("Wikipedia API error:", error);
    return NextResponse.json(
      {
        views: 0,
        variation: 0,
        avgDaily: 0,
        daily: {},
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
