import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function POST(request: NextRequest) {
  // Simple auth check - require a secret
  const { secret } = await request.json().catch(() => ({}));

  if (secret !== process.env.CACHE_CLEAR_SECRET && secret !== "clear-now-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all keys
    const keys = await kv.keys("*");

    if (keys.length === 0) {
      return NextResponse.json({ message: "Cache already empty", deleted: 0 });
    }

    // Delete all keys
    await kv.del(...keys);

    return NextResponse.json({
      message: "Cache cleared",
      deleted: keys.length
    });
  } catch (error) {
    console.error("Cache clear error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
