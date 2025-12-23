import { NextRequest, NextResponse } from "next/server";

// Google Trends API placeholder
// Note: Real implementation would require Python runtime with pytrends
// or a separate Python backend service

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("q");
  const days = parseInt(searchParams.get("days") || "7");

  if (!keyword) {
    return NextResponse.json({ error: "Missing keyword parameter" }, { status: 400 });
  }

  // Placeholder response - returns random but consistent values based on keyword
  // In production, this would call a Python service with pytrends
  const hashCode = keyword.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

  const baseValue = Math.abs(hashCode % 100);

  // Generate fake timeline data
  const timeline = [];
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    timeline.push({
      date: date.toISOString().split("T")[0],
      value: Math.max(0, Math.min(100, baseValue + Math.floor(Math.random() * 20) - 10)),
    });
  }

  return NextResponse.json({
    keyword,
    currentValue: baseValue,
    maxValue: Math.max(...timeline.map((t) => t.value)),
    avgValue: Math.round(timeline.reduce((sum, t) => sum + t.value, 0) / timeline.length),
    timeline,
    note: "Données simulées - L'intégration Google Trends nécessite un backend Python",
  });
}
