import { NextRequest, NextResponse } from "next/server";

const JSONBIN_BIN_ID = "693a0d5d43b1c97be9e58399";
const JSONBIN_API_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

interface TrackEntry {
  question: string;
  timestamp: string;
  context?: string;
  userAgent?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { question, context } = await request.json();

    if (!question) {
      return NextResponse.json({ error: "Missing question" }, { status: 400 });
    }

    const apiKey = process.env.JSONBIN_API_KEY;
    if (!apiKey) {
      // Silently fail if no API key - don't break the chatbot
      console.log("[Track] JSONBIN_API_KEY not configured, skipping tracking");
      return NextResponse.json({ success: false, reason: "not_configured" });
    }

    // Get current bin data
    let existingData: TrackEntry[] = [];
    try {
      const getResponse = await fetch(JSONBIN_API_URL, {
        method: "GET",
        headers: {
          "X-Master-Key": apiKey,
        },
      });

      if (getResponse.ok) {
        const data = await getResponse.json();
        existingData = Array.isArray(data.record) ? data.record : [];
      }
    } catch (error) {
      console.log("[Track] Could not fetch existing data:", error);
      existingData = [];
    }

    // Add new entry
    const newEntry: TrackEntry = {
      question,
      timestamp: new Date().toISOString(),
      context: context || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    };

    const updatedData = [...existingData, newEntry];

    // Update bin
    const updateResponse = await fetch(JSONBIN_API_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": apiKey,
      },
      body: JSON.stringify(updatedData),
    });

    if (!updateResponse.ok) {
      console.error("[Track] Failed to update JSONBin:", await updateResponse.text());
      return NextResponse.json({ success: false, reason: "update_failed" });
    }

    console.log("[Track] Question tracked successfully");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Track] Error:", error);
    return NextResponse.json({ success: false, reason: "error" });
  }
}
