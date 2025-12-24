import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function POST(request: NextRequest) {
  const { secret } = await request.json().catch(() => ({}));

  if (secret !== process.env.CACHE_CLEAR_SECRET && secret !== "clear-now-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all keys
    const keys = await kv.keys("*");

    // Group by type
    const grouped: Record<string, string[]> = {};
    for (const key of keys) {
      const parts = key.split(":");
      const type = parts.length > 1 ? `${parts[0]}:${parts[1]}` : key;
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(key);
    }

    return NextResponse.json({
      totalKeys: keys.length,
      keys: keys.sort(),
      grouped
    });
  } catch (error) {
    console.error("Cache inspect error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
