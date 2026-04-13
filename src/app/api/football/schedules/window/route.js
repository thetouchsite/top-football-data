import { NextResponse } from "next/server";
import { SPORTMONKS_DEFAULT_SCHEDULE_DAYS } from "@/lib/providers/sportmonks";
import { createProviderFreshness } from "@/lib/domain/freshness";
import { getScheduleWindowPayload } from "@/server/football/service";

export const runtime = "nodejs";

export async function GET(request) {
  const days = Number.parseInt(
    request.nextUrl.searchParams.get("days") || SPORTMONKS_DEFAULT_SCHEDULE_DAYS,
    10
  );

  try {
    return NextResponse.json(await getScheduleWindowPayload(days));
  } catch (error) {
    console.error("Failed to fetch football schedules window:", error);
    return NextResponse.json({
      matches: [],
      window: null,
      rawSchedules: null,
      provider: "sportmonks",
      source: "route_error",
      isFallback: true,
      freshness: createProviderFreshness({
        updatedAt: null,
        ttlMs: 60_000,
      }),
      notice: error.message || "Impossibile recuperare il calendario dal provider corrente.",
    });
  }
}
