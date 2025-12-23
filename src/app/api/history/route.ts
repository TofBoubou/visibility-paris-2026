import { NextRequest, NextResponse } from "next/server";

// History API - placeholder for score history
// In production, this would read from Vercel Postgres or KV storage

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const candidateId = searchParams.get("candidate");
  const context = searchParams.get("context") || "paris";
  const days = parseInt(searchParams.get("days") || "30");

  // Placeholder: Return empty history
  // Real implementation would query database for historical scores
  return NextResponse.json({
    candidateId,
    context,
    days,
    history: [],
    message: "L'historique sera disponible après quelques jours de collecte de données.",
  });
}

export async function POST(request: NextRequest) {
  // This endpoint would be called by a cron job to save daily scores
  // For now, it's a placeholder

  try {
    const body = await request.json();
    const { context, scores, date } = body;

    // Placeholder: Would save to database
    console.log(`[History] Saving scores for ${context} on ${date}:`, scores);

    return NextResponse.json({
      success: true,
      message: "Score history saved (placeholder)",
      saved: {
        context,
        date,
        candidatesCount: scores?.length || 0,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to save history" },
      { status: 500 }
    );
  }
}
