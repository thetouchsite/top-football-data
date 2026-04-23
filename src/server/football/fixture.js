import {
  fetchSportmonksFixtureCoreById,
  fetchSportmonksFixtureEnrichmentById,
  fetchSportmonksSeasonStandings,
  fetchSportmonksTeamSquad,
  normalizeSportmonksFixture,
  SPORTMONKS_PROVIDER_ID,
} from "@/lib/providers/sportmonks";
import { FIXTURE_CACHE_TTL_MS } from "./contracts";
import {
  attachFixtureReadMeta,
  getFixtureCacheStore,
  getFixtureInflightStore,
  isRateLimitError,
  logFootballServiceTelemetry,
  mapTelemetrySource,
} from "./runtime";
import { buildEmptyFixturePayload, buildFixturePayload } from "./payloads";

const FIXTURE_PREMATCH_TTL_MS = FIXTURE_CACHE_TTL_MS;
const FIXTURE_LIVE_TTL_MS = 20_000;
const FIXTURE_FINISHED_TTL_MS = 60 * 60_000;
const FIXTURE_STALE_IF_ERROR_MAX_MS = 6 * 60 * 60_000;

function deriveFixtureStateTag(normalizedFixture) {
  const raw = String(
    normalizedFixture?.state || normalizedFixture?.status || normalizedFixture?.raw_status || ""
  ).toLowerCase();
  if (!raw) {
    return "prematch";
  }
  if (
    raw.includes("live") ||
    raw.includes("inplay") ||
    raw.includes("1st") ||
    raw.includes("2nd") ||
    raw.includes("half") ||
    raw.includes("extra")
  ) {
    return "live";
  }
  if (
    raw.includes("finished") ||
    raw.includes("full") ||
    raw.includes("ft") ||
    raw.includes("aet") ||
    raw.includes("pen")
  ) {
    return "finished";
  }
  return "prematch";
}

function fixtureFreshTtlMs(normalizedFixture) {
  const state = deriveFixtureStateTag(normalizedFixture);
  if (state === "live") {
    return FIXTURE_LIVE_TTL_MS;
  }
  if (state === "finished") {
    return FIXTURE_FINISHED_TTL_MS;
  }
  return FIXTURE_PREMATCH_TTL_MS;
}

export async function getFixturePayload(fixtureId, options = {}) {
  const startedAt = Date.now();
  const normalizedFixtureId = decodeURIComponent(String(fixtureId || "").trim());
  const requestedView =
    options?.view === "core" ? "core" : options?.view === "enrichment" ? "enrichment" : "full";
  const fixtureCacheStore = getFixtureCacheStore();
  const fixtureInflightStore = getFixtureInflightStore();
  const cacheKey = `${normalizedFixtureId}:${requestedView}`;
  const cachedEntry = fixtureCacheStore.get(cacheKey);

  if (!normalizedFixtureId) {
    return {
      status: 400,
      body: {
        error: "fixtureId non valido.",
      },
    };
  }

  const now = Date.now();
  const cachedAgeMs = cachedEntry ? now - cachedEntry.updatedAt : null;
  const isFreshCacheHit =
    cachedEntry && cachedAgeMs < fixtureFreshTtlMs(cachedEntry.normalizedFixture);

  if (isFreshCacheHit) {
    const payload = buildFixturePayload({
      normalizedFixture: cachedEntry.normalizedFixture,
      rawFixture: cachedEntry.rawFixture,
      provider: cachedEntry.provider,
      source: "sportmonks_cache",
      updatedAt: cachedEntry.updatedAt,
    });
    logFootballServiceTelemetry({
      route: "/api/football/fixtures/[fixtureId]",
      requestPurpose: "fixture_detail",
      days: null,
      fixtureId: normalizedFixtureId,
      cacheHit: true,
      cacheState: "hit",
      providerLatencyMs: null,
      pagesFetched: null,
      itemsFetched: payload?.body?.fixture ? 1 : 0,
      payloadBytes: payload ? JSON.stringify(payload).length : 0,
      normalizeMs: null,
      e2eMs: Date.now() - startedAt,
      fallbackTriggered: Boolean(payload?.body?.isFallback),
      retryCount: 0,
      dtoTarget: "MatchDetailCoreDTO",
      dtoVersion: "v1",
      providerEndpoint: "fixtures/{fixtureId}",
      includeSet: null,
      estimatedCallCost: null,
      source: mapTelemetrySource(payload?.body?.source || "sportmonks_cache", {
        cacheState: "hit",
        fallbackTriggered: Boolean(payload?.body?.isFallback),
        cacheLayer: "L1",
      }),
      cacheLayer: "L1",
      snapshotAgeMs: cachedAgeMs,
      refreshState: "none",
    });
    attachFixtureReadMeta(payload.body, {
      cacheLayer: "L1",
      snapshotAgeMs: cachedAgeMs,
      refreshState: "none",
      fixtureState: deriveFixtureStateTag(cachedEntry.normalizedFixture),
    });
    return payload;
  }

  if (fixtureInflightStore.has(cacheKey)) {
    const sharedPayload = await fixtureInflightStore.get(cacheKey);
    const body = sharedPayload?.body || {};
    const inflightPayload = {
      ...sharedPayload,
      body: {
        ...body,
        source: "sportmonks_inflight",
      },
    };
    logFootballServiceTelemetry({
      route: "/api/football/fixtures/[fixtureId]",
      requestPurpose: "fixture_detail",
      days: null,
      fixtureId: normalizedFixtureId,
      cacheHit: true,
      cacheState: "hit",
      providerLatencyMs: null,
      pagesFetched: null,
      itemsFetched: inflightPayload?.body?.fixture ? 1 : 0,
      payloadBytes: inflightPayload ? JSON.stringify(inflightPayload).length : 0,
      normalizeMs: null,
      e2eMs: Date.now() - startedAt,
      fallbackTriggered: Boolean(inflightPayload?.body?.isFallback),
      retryCount: 0,
      dtoTarget: "MatchDetailCoreDTO",
      dtoVersion: "v1",
      providerEndpoint: "fixtures/{fixtureId}",
      includeSet: null,
      estimatedCallCost: 0,
      source: mapTelemetrySource("sportmonks_inflight", {
        cacheState: "hit",
        fallbackTriggered: Boolean(inflightPayload?.body?.isFallback),
      }),
      cacheLayer: "provider",
      snapshotAgeMs: null,
      refreshState: "inflight_wait",
    });
    attachFixtureReadMeta(inflightPayload.body, {
      cacheLayer: "provider",
      snapshotAgeMs: null,
      refreshState: "inflight_wait",
      fixtureState: null,
    });
    return inflightPayload;
  }

  const requestPromise = (async () => {
    try {
      const rawFixtureCore = await fetchSportmonksFixtureCoreById(normalizedFixtureId, {
        route: "/api/football/fixtures/[fixtureId]",
        requestPurpose: "fixture_detail_core",
        dtoTarget: "MatchDetailCoreDTO",
        dtoVersion: "v1",
      });
      const participants = Array.isArray(rawFixtureCore?.participants) ? rawFixtureCore.participants : [];
      const homeParticipant =
        participants.find(
          (entry) =>
            String(entry?.location || entry?.meta?.location || "").toLowerCase() === "home"
        ) || participants[0] || null;
      const awayParticipant =
        participants.find(
          (entry) =>
            String(entry?.location || entry?.meta?.location || "").toLowerCase() === "away"
        ) || participants.find((entry) => entry?.id !== homeParticipant?.id) || participants[1] || null;
      const shouldLoadEnrichment = requestedView !== "core";
      const [fixtureEnrichmentResult, standingsResult, homeSquadResult, awaySquadResult] =
        await Promise.allSettled([
          shouldLoadEnrichment
            ? fetchSportmonksFixtureEnrichmentById(normalizedFixtureId, {
                route: "/api/football/fixtures/[fixtureId]",
                requestPurpose: "fixture_detail_enrichment",
                fixtureId: normalizedFixtureId,
                dtoTarget: "MatchDetailEnrichedDTO",
                dtoVersion: "v1",
              })
            : Promise.resolve(null),
          shouldLoadEnrichment
            ? fetchSportmonksSeasonStandings(rawFixtureCore?.season?.id || rawFixtureCore?.season_id, {
                route: "/api/football/fixtures/[fixtureId]",
                requestPurpose: "fixture_detail_standings",
                fixtureId: normalizedFixtureId,
                dtoTarget: "MatchDetailEnrichedDTO",
                dtoVersion: "v1",
              })
            : Promise.resolve([]),
          shouldLoadEnrichment
            ? fetchSportmonksTeamSquad(homeParticipant?.id, {
                route: "/api/football/fixtures/[fixtureId]",
                requestPurpose: "fixture_detail_squad_home",
                fixtureId: normalizedFixtureId,
                dtoTarget: "MatchDetailEnrichedDTO",
                dtoVersion: "v1",
              })
            : Promise.resolve([]),
          shouldLoadEnrichment
            ? fetchSportmonksTeamSquad(awayParticipant?.id, {
                route: "/api/football/fixtures/[fixtureId]",
                requestPurpose: "fixture_detail_squad_away",
                fixtureId: normalizedFixtureId,
                dtoTarget: "MatchDetailEnrichedDTO",
                dtoVersion: "v1",
              })
            : Promise.resolve([]),
        ]);

      const rawFixture = {
        ...rawFixtureCore,
        ...(fixtureEnrichmentResult.status === "fulfilled" &&
        fixtureEnrichmentResult.value &&
        typeof fixtureEnrichmentResult.value === "object"
          ? fixtureEnrichmentResult.value
          : null),
      };
      const enrichedFixture = {
        ...rawFixture,
        standings: standingsResult.status === "fulfilled" ? standingsResult.value : [],
        teamSquads: {
          home: homeSquadResult.status === "fulfilled" ? homeSquadResult.value : [],
          away: awaySquadResult.status === "fulfilled" ? awaySquadResult.value : [],
        },
      };
      const normalizedFixture = normalizeSportmonksFixture(enrichedFixture);
      const normalizeMs = Date.now() - startedAt;
      const updatedAt = Date.now();

      fixtureCacheStore.set(cacheKey, {
        normalizedFixture,
        rawFixture: enrichedFixture,
        provider: SPORTMONKS_PROVIDER_ID,
        updatedAt,
      });

      const payload = buildFixturePayload({
        normalizedFixture,
        rawFixture: enrichedFixture,
        source: "sportmonks_api",
        updatedAt,
      });
      logFootballServiceTelemetry({
        route: "/api/football/fixtures/[fixtureId]",
        requestPurpose: "fixture_detail",
        days: null,
        fixtureId: normalizedFixtureId,
        cacheHit: false,
        cacheState: "miss",
        providerLatencyMs: null,
        pagesFetched: null,
        itemsFetched: 1,
        payloadBytes: payload ? JSON.stringify(payload).length : 0,
        normalizeMs,
        e2eMs: Date.now() - startedAt,
        fallbackTriggered: Boolean(payload?.body?.isFallback),
        retryCount: 0,
        dtoTarget: "MatchDetailCoreDTO",
        dtoVersion: "v1",
        providerEndpoint: "fixtures/{fixtureId}",
        includeSet: null,
        estimatedCallCost: shouldLoadEnrichment ? 4 : 1,
        source: mapTelemetrySource(payload?.body?.source || "sportmonks_api", {
          cacheState: "miss",
          fallbackTriggered: Boolean(payload?.body?.isFallback),
        }),
        cacheLayer: "provider",
        snapshotAgeMs: 0,
        refreshState: "rebuild_ok",
      });
      attachFixtureReadMeta(payload.body, {
        cacheLayer: "provider",
        snapshotAgeMs: 0,
        refreshState: "rebuild_ok",
        fixtureState: deriveFixtureStateTag(normalizedFixture),
      });
      return payload;
    } catch (error) {
      const staleEntry = cachedEntry || fixtureCacheStore.get(cacheKey);
      const staleAgeMs = staleEntry ? Date.now() - staleEntry.updatedAt : null;
      if (staleEntry && staleAgeMs < FIXTURE_STALE_IF_ERROR_MAX_MS) {
        const stalePayload = buildFixturePayload({
          normalizedFixture: staleEntry.normalizedFixture,
          rawFixture: staleEntry.rawFixture,
          provider: staleEntry.provider,
          source: "sportmonks_cache",
          updatedAt: staleEntry.updatedAt,
          notice: isRateLimitError(error)
            ? "Rate limit Sportmonks raggiunto. Mostro l'ultima fixture disponibile dalla cache provider."
            : error.message || "Fixture provider non aggiornata. Mostro l'ultima versione in cache.",
        });
        logFootballServiceTelemetry({
          route: "/api/football/fixtures/[fixtureId]",
          requestPurpose: "fixture_detail",
          days: null,
          fixtureId: normalizedFixtureId,
          cacheHit: true,
          cacheState: "stale-hit",
          providerLatencyMs: null,
          pagesFetched: null,
          itemsFetched: stalePayload?.body?.fixture ? 1 : 0,
          payloadBytes: stalePayload ? JSON.stringify(stalePayload).length : 0,
          normalizeMs: null,
          e2eMs: Date.now() - startedAt,
          fallbackTriggered: true,
          retryCount: 0,
          dtoTarget: "MatchDetailCoreDTO",
          dtoVersion: "v1",
          providerEndpoint: "fixtures/{fixtureId}",
          includeSet: null,
          estimatedCallCost: null,
          source: mapTelemetrySource("sportmonks_cache", {
            cacheState: "stale-hit",
            fallbackTriggered: true,
            cacheLayer: "L1",
          }),
          error: error?.message || "unknown_error",
          cacheLayer: "L1",
          snapshotAgeMs: staleAgeMs,
          refreshState: "stale_if_error",
        });
        attachFixtureReadMeta(stalePayload.body, {
          cacheLayer: "L1",
          snapshotAgeMs: staleAgeMs,
          refreshState: "stale_if_error",
          fixtureState: deriveFixtureStateTag(staleEntry.normalizedFixture),
        });
        return stalePayload;
      }

      const emptyPayload = buildEmptyFixturePayload(
        normalizedFixtureId,
        error.message || `Fixture ${normalizedFixtureId} non disponibile con il feed corrente.`
      );
      logFootballServiceTelemetry({
        route: "/api/football/fixtures/[fixtureId]",
        requestPurpose: "fixture_detail",
        days: null,
        fixtureId: normalizedFixtureId,
        cacheHit: false,
        cacheState: "miss",
        providerLatencyMs: null,
        pagesFetched: null,
        itemsFetched: 0,
        payloadBytes: emptyPayload ? JSON.stringify(emptyPayload).length : 0,
        normalizeMs: null,
        e2eMs: Date.now() - startedAt,
        fallbackTriggered: true,
        retryCount: 0,
        dtoTarget: "MatchDetailCoreDTO",
        dtoVersion: "v1",
        providerEndpoint: "fixtures/{fixtureId}",
        includeSet: null,
        estimatedCallCost: null,
        source: mapTelemetrySource("provider_unavailable", {
          cacheState: "miss",
          fallbackTriggered: true,
        }),
        error: error?.message || "unknown_error",
        cacheLayer: "provider",
        snapshotAgeMs: null,
        refreshState: "fallback",
      });
      attachFixtureReadMeta(emptyPayload.body, {
        cacheLayer: "provider",
        snapshotAgeMs: null,
        refreshState: "fallback",
        fixtureState: null,
      });
      return emptyPayload;
    } finally {
      fixtureInflightStore.delete(cacheKey);
    }
  })();

  fixtureInflightStore.set(cacheKey, requestPromise);
  return requestPromise;
}
