import { NextResponse } from "next/server";
import { getFixturePayload } from "@/server/football/service";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  try {
    const resolvedParams = await params;
    const result = await getFixturePayload(resolvedParams?.fixtureId);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("Failed to fetch Sportradar fixture:", error);

    return NextResponse.json(
      {
        error: error.message || "Impossibile recuperare la fixture da Sportradar.",
      },
      { status: 500 }
    );
  }
}
