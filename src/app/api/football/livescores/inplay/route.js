import { NextResponse } from "next/server";
import { getLivescoresInplayPayload } from "@/server/football/service";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await getLivescoresInplayPayload());
  } catch (error) {
    console.error("Failed to fetch Sportradar inplay livescores:", error);
    return NextResponse.json({
      matches: [],
      rawLivescores: null,
      source: "route_error",
      notice: error.message || "Impossibile recuperare i livescores in-play.",
    });
  }
}
