import { NextResponse } from "next/server";
import { buildDbUrl } from "@/lib/firebase";
import { normalizeSearchIndex } from "@/lib/search-index";

export async function GET() {
  try {
    const response = await fetch(buildDbUrl("searchIndex"), {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Failed to load search index (${response.status})`);
    }

    const raw = await response.json();
    const entries = normalizeSearchIndex(raw);
    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Failed to load search index:", error);
    return NextResponse.json(
      { error: "Failed to load search index" },
      { status: 500 },
    );
  }
}
