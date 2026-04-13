import { NextResponse } from "next/server";
import { createProviderFreshness } from "@/lib/domain/freshness";
import { getLivescoresInplayPayload } from "@/server/football/service";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await getLivescoresInplayPayload());
  } catch (error) {
    console.error("Failed to fetch football inplay livescores:", error);
    return NextResponse.json({
      matches: [],
      rawLivescores: null,
      provider: "sportmonks",
      source: "route_error",
      isFallback: true,
      freshness: createProviderFreshness({
        updatedAt: null,
        ttlMs: 15_000,
      }),
      notice: error.message || "Impossibile recuperare i livescores in-play.",
    });
  }
}
