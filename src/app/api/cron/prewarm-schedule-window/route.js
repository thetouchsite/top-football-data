/**
 * Prewarm schedule (stesso builder del feed).
 * - **Hobby (Vercel):** un run al giorno in `vercel.json` (limite piano); non è il prewarm “ideale” 5m.
 * - **Pro (futuro):** sostituire in `vercel.json` con lo schedule in `docs/vercel-cron-pro.example.json`.
 * Auth: `CRON_PREWARM_SECRET` / `SCHEDULE_PREWARM_CRON_SECRET` / `CRON_SECRET` (quest’ultima usata da Vercel per Bearer sulle Cron native).
 */
import { NextResponse } from "next/server";
import { prewarmScheduleWindowSnapshot } from "@/server/football/schedule";
import { SPORTMONKS_DEFAULT_SCHEDULE_DAYS } from "@/lib/providers/sportmonks";

export const runtime = "nodejs";

const CRON_SECRET = String(
  process.env.CRON_PREWARM_SECRET ||
    process.env.SCHEDULE_PREWARM_CRON_SECRET ||
    process.env.CRON_SECRET ||
    ""
).trim();

function isAuthorized(request) {
  if (!CRON_SECRET) {
    if (process.env.VERCEL === "1" && process.env.NODE_ENV === "production") {
      return false;
    }
    return true;
  }
  const q = request.nextUrl.searchParams.get("secret");
  if (q && q === CRON_SECRET) {
    return true;
  }
  const auth = request.headers.get("authorization");
  if (auth && auth === `Bearer ${CRON_SECRET}`) {
    return true;
  }
  if (auth && auth === CRON_SECRET) {
    return true;
  }
  return false;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const result = await prewarmScheduleWindowSnapshot({
    mode: "cron",
    days: SPORTMONKS_DEFAULT_SCHEDULE_DAYS,
  });
  if (result.status === "ok") {
    return NextResponse.json({ ok: true, ...result });
  }
  if (result.status === "skipped") {
    return NextResponse.json({ ok: true, ...result });
  }
  return NextResponse.json(
    { ok: false, ...result },
    { status: 500 }
  );
}
