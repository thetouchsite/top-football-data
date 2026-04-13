import { NextResponse } from "next/server";
import { SPORTRADAR_DEFAULT_SCHEDULE_DAYS } from "@/lib/sportradar";
import { getScheduleWindowPayload } from "@/server/football/service";

export const runtime = "nodejs";

export async function GET(request) {
  const days = Number.parseInt(
    request.nextUrl.searchParams.get("days") || SPORTRADAR_DEFAULT_SCHEDULE_DAYS,
    10
  );

  try {
    return NextResponse.json(await getScheduleWindowPayload(days));
  } catch (error) {
    console.error("Failed to fetch Sportradar schedules window:", error);
    return NextResponse.json({
      matches: [],
      window: null,
      rawSchedules: null,
      source: "route_error",
      notice: error.message || "Impossibile recuperare il calendario da Sportradar.",
    });
  }
}
