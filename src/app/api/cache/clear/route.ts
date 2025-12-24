import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function POST(request: NextRequest) {
  // Simple auth check - require a secret
  const { secret, pattern, candidate } = await request.json().catch(() => ({}));

  if (secret !== process.env.CACHE_CLEAR_SECRET && secret !== "clear-now-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let keysToDelete: string[] = [];

    // If candidate is specified, only delete sentiment and themes for that candidate
    if (candidate) {
      const normalizedName = candidate.toLowerCase().replace(/\s+/g, "_");
      const sentimentKeys = await kv.keys(`v5:sentiment:${normalizedName}*`);
      const themesKeys = await kv.keys(`v5:themes:${normalizedName}*`);
      keysToDelete = [...sentimentKeys, ...themesKeys];

      console.log(`[Cache] Clearing ${keysToDelete.length} keys for candidate: ${candidate}`);
    }
    // If pattern is specified, use it to filter keys
    else if (pattern) {
      keysToDelete = await kv.keys(pattern);
      console.log(`[Cache] Clearing ${keysToDelete.length} keys matching pattern: ${pattern}`);
    }
    // Otherwise, delete all keys
    else {
      keysToDelete = await kv.keys("*");
      console.log(`[Cache] Clearing ALL ${keysToDelete.length} keys`);
    }

    if (keysToDelete.length === 0) {
      return NextResponse.json({
        message: "No matching keys found",
        deleted: 0,
        pattern: pattern || candidate || "*"
      });
    }

    // Delete keys
    await kv.del(...keysToDelete);

    return NextResponse.json({
      message: "Cache cleared",
      deleted: keysToDelete.length,
      keys: keysToDelete
    });
  } catch (error) {
    console.error("Cache clear error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
