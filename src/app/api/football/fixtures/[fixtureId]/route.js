import { NextResponse } from "next/server";
import { createProviderFreshness } from "@/lib/domain/freshness";
import { getFixtureReadMeta } from "@/server/football/runtime";
import { getFixturePayload } from "@/server/football/service";

export const runtime = "nodejs";
const DEBUG_FOOTBALL_TELEMETRY = ["1", "true", "yes"].includes(
  String(process.env.DEBUG_FOOTBALL_TELEMETRY || "").toLowerCase()
);

function deriveRouteTelemetryFromSource(source, isFallback, readMeta) {
  const layer = readMeta?.cacheLayer;
  if (layer === "L1" && source === "sportmonks_cache" && !isFallback) {
    return { cacheHit: true, cacheState: "hit", source: "memory_cache" };
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

export async function GET(request, { params }) {
  const startedAt = Date.now();
  try {
    const resolvedParams = await params;
    const fixtureId = resolvedParams?.fixtureId || null;
    const view = request.nextUrl.searchParams.get("view");
    const snapshotVersion = request.nextUrl.searchParams.get("snapshotVersion");
    const result = await getFixturePayload(fixtureId, { view, snapshotVersion });
    const payload = result?.body || {};
    const e2eMs = Date.now() - startedAt;
    const readMeta = getFixtureReadMeta(payload);
    const requestPurpose = view === "core" ? "fixture_detail_core" : "fixture_detail";
    const dtoTarget = view === "core" ? "MatchDetailCoreDTO" : "MatchDetailEnrichedDTO";
    const derived = deriveRouteTelemetryFromSource(payload?.source, Boolean(payload?.isFallback), readMeta);
    const routeLog = {
      route: "/api/football/fixtures/[fixtureId]",
      requestPurpose,
      days: null,
      fixtureId,
      cacheHit: derived.cacheHit,
      cacheState: derived.cacheState,
      cacheLayer: readMeta?.cacheLayer ?? null,
      snapshotAgeMs: readMeta?.snapshotAgeMs ?? null,
      refreshState: readMeta?.refreshState ?? null,
      fixtureState: readMeta?.fixtureState ?? null,
      providerLatencyMs: null,
      pagesFetched: null,
      itemsFetched: payload?.fixture ? 1 : 0,
      payloadBytes: payload ? JSON.stringify(payload).length : 0,
      normalizeMs: null,
      e2eMs,
      fallbackTriggered: Boolean(payload?.isFallback),
      retryCount: 0,
      dtoTarget,
      dtoVersion: "v1",
      providerEndpoint: "fixtures/{fixtureId}",
      includeSet: null,
      estimatedCallCost: null,
      source: derived.source,
    };
    console.info(
      `[football][summary] route=${routeLog.route} fixtureId=${routeLog.fixtureId ?? "-"} cache=${routeLog.cacheState} layer=${routeLog.cacheLayer ?? "-"} pages=0 items=${routeLog.itemsFetched} payloadBytes=${routeLog.payloadBytes} e2eMs=${routeLog.e2eMs} callCost=0 fallback=${routeLog.fallbackTriggered} source=${routeLog.source} ageMs=${routeLog.snapshotAgeMs ?? "na"} ref=${routeLog.refreshState ?? "-"} fstate=${routeLog.fixtureState ?? "-"}`
    );
    if (DEBUG_FOOTBALL_TELEMETRY) {
      console.info("[football][route]", routeLog);
    }
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    const e2eMs = Date.now() - startedAt;
    const routeLog = {
      route: "/api/football/fixtures/[fixtureId]",
      requestPurpose: "fixture_detail",
      days: null,
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
      dtoTarget: "MatchDetailCoreDTO",
      dtoVersion: "v1",
      providerEndpoint: "fixtures/{fixtureId}",
      includeSet: null,
      estimatedCallCost: null,
      source: "fallback_provider",
      error: error?.message || "unknown_error",
    };
    console.info(
      `[football][summary] route=${routeLog.route} fixtureId=- cache=${routeLog.cacheState} pages=0 items=0 payloadBytes=0 e2eMs=${routeLog.e2eMs} callCost=0 fallback=true source=${routeLog.source}`
    );
    console.error("[football][route]", routeLog);
    console.error("Failed to fetch football fixture:", error);

    return NextResponse.json(
      {
        error: error.message || "Impossibile recuperare la fixture dal provider corrente.",
        provider: "sportmonks",
        source: "route_error",
        isFallback: true,
        snapshotVersion: null,
        freshness: createProviderFreshness({
          updatedAt: null,
          ttlMs: 15_000,
        }),
      },
      { status: 500 }
    );
  }
}
