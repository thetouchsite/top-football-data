import { NextResponse } from "next/server";
import { SPORTRADAR_DEFAULT_SOCCER_SPORT_ID } from "@/lib/sportradar";
import { getFuturesOddsPayload } from "@/server/football/service";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const sportId =
      request.nextUrl.searchParams.get("sportId") ||
      SPORTRADAR_DEFAULT_SOCCER_SPORT_ID;
    const requestedCompetitionId =
      request.nextUrl.searchParams.get("competitionId") || "";
    return NextResponse.json(
      await getFuturesOddsPayload({
        sportId,
        competitionId: requestedCompetitionId,
      })
    );
  } catch (error) {
    console.error("Failed to fetch Sportradar futures odds:", error);

    return NextResponse.json(
      {
        error:
          error.message ||
          "Impossibile recuperare i futures odds da Sportradar.",
      },
      { status: 500 }
    );
  }
}
