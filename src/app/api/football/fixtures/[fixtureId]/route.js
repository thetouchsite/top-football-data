import { NextResponse } from "next/server";
import { createProviderFreshness } from "@/lib/domain/freshness";
import { getFixturePayload } from "@/server/football/service";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  try {
    const resolvedParams = await params;
    const result = await getFixturePayload(resolvedParams?.fixtureId);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("Failed to fetch football fixture:", error);

    return NextResponse.json(
      {
        error: error.message || "Impossibile recuperare la fixture dal provider corrente.",
        provider: "sportmonks",
        source: "route_error",
        isFallback: true,
        freshness: createProviderFreshness({
          updatedAt: null,
          ttlMs: 15_000,
        }),
      },
      { status: 500 }
    );
  }
}
