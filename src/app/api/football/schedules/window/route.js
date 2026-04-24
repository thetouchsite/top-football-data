import { NextResponse } from "next/server";
import { SPORTMONKS_DEFAULT_SCHEDULE_DAYS } from "@/lib/providers/sportmonks";
import { createProviderFreshness } from "@/lib/domain/freshness";
import { getScheduleReadMeta } from "@/server/football/runtime";
import { getScheduleWindowPayload } from "@/server/football/service";

export const runtime = "nodejs";
const DEBUG_FOOTBALL_TELEMETRY = ["1", "true", "yes"].includes(
  String(process.env.DEBUG_FOOTBALL_TELEMETRY || "").toLowerCase()
);
const MAX_SCHEDULE_WINDOW_DAYS = 7;

function clampScheduleWindowDays(days) {
  if (!Number.isFinite(days) || days <= 0) {
    return MAX_SCHEDULE_WINDOW_DAYS;
  }

  return Math.min(days, MAX_SCHEDULE_WINDOW_DAYS);
}

function deriveRouteTelemetryFromSource(source, isFallback, readMeta) {
  const layer = readMeta?.cacheLayer;
  if (layer === "L2" && source === "sportmonks_cache" && !isFallback) {
    return { cacheHit: true, cacheState: "hit", source: "l2_cache" };
  }
  if (source === "sportmonks_cache" && !isFallback) {
    return { cacheHit: true, cacheState: "hit", source: "memory_cache" };
  }
  if (source === "sportmonks_cache" && isFallback) {
    return { cacheHit: true, cacheState: "stale-hit", source: "stale_cache" };
  }
  if (source === "sportmonks_api") {
    return { cacheHit: false, cacheState: "miss", source: "provider_fetch" };
  }
  if (source === "sportmonks_inflight") {
    return { cacheHit: true, cacheState: "hit", source: "inflight_shared" };
  }
  if (source === "provider_unavailable" || source === "route_error") {
    return { cacheHit: false, cacheState: "miss", source: "fallback_provider" };
  }
  return { cacheHit: false, cacheState: "miss", source: source || null };
}

export async function GET(request) {
  const startedAt = Date.now();
  const days = Number.parseInt(
    request.nextUrl.searchParams.get("days") || SPORTMONKS_DEFAULT_SCHEDULE_DAYS,
    10
  );
  const safeDays = clampScheduleWindowDays(days);

  try {
    const payload = await getScheduleWindowPayload(safeDays);
    const e2eMs = Date.now() - startedAt;
    const readMeta = getScheduleReadMeta(payload);
    const derived = deriveRouteTelemetryFromSource(
      payload?.source,
      Boolean(payload?.isFallback),
      readMeta
    );
    const routeLog = {
      route: "/api/football/schedules/window",
      requestPurpose: "schedule_window",
      days: safeDays,
      fixtureId: null,
      cacheHit: derived.cacheHit,
      cacheState: derived.cacheState,
      cacheLayer: readMeta?.cacheLayer ?? null,
      policyVersion: readMeta?.policyVersion ?? null,
      snapshotAgeMs: readMeta?.snapshotAgeMs ?? null,
      refreshState: readMeta?.refreshState ?? null,
      providerLatencyMs: null,
      pagesFetched: payload?.rawSchedules?.schedulePagination?.pagesFetched ?? null,
      itemsFetched: Array.isArray(payload?.matches) ? payload.matches.length : 0,
      payloadBytes: payload ? JSON.stringify(payload).length : 0,
      normalizeMs: null,
      e2eMs,
      fallbackTriggered: Boolean(payload?.isFallback),
      retryCount: 0,
      dtoTarget: "ScheduleCardDTO",
      dtoVersion: "v1",
      providerEndpoint: "fixtures/between/{start}/{end}",
      includeSet: null,
      estimatedCallCost: payload?.rawSchedules?.schedulePagination?.pagesFetched ?? null,
      source: derived.source,
    };
    console.info(
      `[football][summary] route=${routeLog.route} days=${routeLog.days} cache=${routeLog.cacheState} layer=${routeLog.cacheLayer ?? "-"} pages=${routeLog.pagesFetched ?? 0} items=${routeLog.itemsFetched} payloadBytes=${routeLog.payloadBytes} e2eMs=${routeLog.e2eMs} callCost=${routeLog.estimatedCallCost ?? 0} fallback=${routeLog.fallbackTriggered} source=${routeLog.source} ageMs=${routeLog.snapshotAgeMs ?? "na"} ref=${routeLog.refreshState ?? "-"} policy=${routeLog.policyVersion ?? "-"}`
    );
    if (DEBUG_FOOTBALL_TELEMETRY) {
      console.info("[football][route]", routeLog);
    }
    return NextResponse.json(payload);
  } catch (error) {
    const e2eMs = Date.now() - startedAt;
    const routeLog = {
      route: "/api/football/schedules/window",
      requestPurpose: "schedule_window",
      days: safeDays,
      fixtureId: null,
      cacheHit: false,
      cacheState: "miss",
      providerLatencyMs: null,
      pagesFetched: null,
      itemsFetched: 0,
      payloadBytes: null,
      normalizeMs: null,
      e2eMs,
      fallbackTriggered: true,
      retryCount: 0,
      dtoTarget: "ScheduleCardDTO",
      dtoVersion: "v1",
      providerEndpoint: "fixtures/between/{start}/{end}",
      includeSet: null,
      estimatedCallCost: null,
      source: "fallback_provider",
      error: error?.message || "unknown_error",
    };
    console.info(
      `[football][summary] route=${routeLog.route} days=${routeLog.days} cache=${routeLog.cacheState} pages=0 items=0 payloadBytes=0 e2eMs=${routeLog.e2eMs} callCost=0 fallback=true source=${routeLog.source}`
    );
    console.error("[football][route]", routeLog);
    console.error("Failed to fetch football schedules window:", error);
    return NextResponse.json({
      matches: [],
      window: null,
      rawSchedules: null,
      provider: "sportmonks",
      source: "route_error",
      isFallback: true,
      snapshotVersion: null,
      freshness: createProviderFreshness({
        updatedAt: null,
        ttlMs: 60_000,
      }),
      notice: error.message || "Impossibile recuperare il calendario dal provider corrente.",
    });
  }
}
