import { sortMatchesByFeaturedPriority } from "@/lib/football-filters";
import {
  fetchSportmonksScheduleWindow,
  normalizeSportmonksScheduleMatch,
  SPORTMONKS_DEFAULT_SCHEDULE_DAYS,
  SPORTMONKS_PROVIDER_ID,
} from "@/lib/providers/sportmonks";
import { SCHEDULE_CACHE_TTL_MS } from "./contracts";
import {
  getScheduleCacheStore,
  getScheduleInflightStore,
  isRateLimitError,
  logFootballServiceTelemetry,
  mapTelemetrySource,
} from "./runtime";
import {
  buildSchedulePayload,
  buildSportmonksPlanNotice,
  compactScheduleRawPayload,
} from "./payloads";

export async function getScheduleWindowPayload(days = SPORTMONKS_DEFAULT_SCHEDULE_DAYS) {
  const startedAt = Date.now();
  const safeDays = Number.isFinite(days) ? days : SPORTMONKS_DEFAULT_SCHEDULE_DAYS;
  const cacheKey = String(safeDays);
  const cacheStore = getScheduleCacheStore();
  const inflightStore = getScheduleInflightStore();
  const cachedEntry = cacheStore.get(cacheKey);

  if (cachedEntry && Date.now() - cachedEntry.updatedAt < SCHEDULE_CACHE_TTL_MS) {
    const e2eMs = Date.now() - startedAt;
    const cachedPayload = {
      ...cachedEntry.payload,
      source: "sportmonks_cache",
    };
    logFootballServiceTelemetry({
      route: "/api/football/schedules/window",
      requestPurpose: "schedule_window",
      days: safeDays,
      fixtureId: null,
      cacheHit: true,
      cacheState: "hit",
      providerLatencyMs: null,
      pagesFetched: cachedPayload?.rawSchedules?.schedulePagination?.pagesFetched ?? null,
      itemsFetched: Array.isArray(cachedPayload?.matches) ? cachedPayload.matches.length : 0,
      payloadBytes: cachedPayload ? JSON.stringify(cachedPayload).length : 0,
      normalizeMs: null,
      e2eMs,
      fallbackTriggered: Boolean(cachedPayload?.isFallback),
      retryCount: 0,
      dtoTarget: "ScheduleCardDTO",
      dtoVersion: "v2",
      providerEndpoint: "fixtures/between/{start}/{end}",
      includeSet: null,
      estimatedCallCost: cachedPayload?.rawSchedules?.schedulePagination?.pagesFetched ?? null,
      source: mapTelemetrySource(cachedPayload?.source || "sportmonks_cache", {
        cacheState: "hit",
        fallbackTriggered: Boolean(cachedPayload?.isFallback),
      }),
    });
    return cachedPayload;
  }

  if (inflightStore.has(cacheKey)) {
    const sharedPayload = await inflightStore.get(cacheKey);
    const inflightPayload = {
      ...sharedPayload,
      source: "sportmonks_inflight",
    };
    logFootballServiceTelemetry({
      route: "/api/football/schedules/window",
      requestPurpose: "schedule_window",
      days: safeDays,
      fixtureId: null,
      cacheHit: true,
      cacheState: "hit",
      providerLatencyMs: null,
      pagesFetched: inflightPayload?.rawSchedules?.schedulePagination?.pagesFetched ?? null,
      itemsFetched: Array.isArray(inflightPayload?.matches) ? inflightPayload.matches.length : 0,
      payloadBytes: inflightPayload ? JSON.stringify(inflightPayload).length : 0,
      normalizeMs: null,
      e2eMs: Date.now() - startedAt,
      fallbackTriggered: Boolean(inflightPayload?.isFallback),
      retryCount: 0,
      dtoTarget: "ScheduleCardDTO",
      dtoVersion: "v2",
      providerEndpoint: "fixtures/between/{start}/{end}",
      includeSet: null,
      estimatedCallCost: 0,
      source: mapTelemetrySource("sportmonks_inflight", {
        cacheState: "hit",
        fallbackTriggered: Boolean(inflightPayload?.isFallback),
      }),
    });
    return inflightPayload;
  }

  const requestPromise = (async () => {
    try {
      const rawSchedules = await fetchSportmonksScheduleWindow(safeDays, {
        route: "/api/football/schedules/window",
        requestPurpose: "schedule_window",
        dtoTarget: "ScheduleCardDTO",
        dtoVersion: "v2",
      });
      const normalizedMatches = sortMatchesByFeaturedPriority(
        rawSchedules.fixtures.map(normalizeSportmonksScheduleMatch)
      );
      const normalizeMs = Date.now() - startedAt;
      const updatedAt = Date.now();
      const scheduleFilterHint = rawSchedules?.scheduleLeagueFilter
        ? " Calendario ristretto dal filtro API leghe (SPORTMONKS_SCHEDULE_LEAGUE_FILTER_STRICT)."
        : "";
      const pag = rawSchedules?.schedulePagination;
      const paginationHint =
        pag?.truncated && pag.totalPages != null && pag.pagesFetched != null
          ? ` Risposta fixtures/between troncata: scaricate ${pag.pagesFetched}/${pag.totalPages} pagine (max configurabile: SPORTMONKS_SCHEDULE_MAX_PAGES). Alcune competizioni possono mancare.`
          : "";
      const payload = buildSchedulePayload({
        matches: normalizedMatches,
        window: rawSchedules.window,
        rawSchedules: compactScheduleRawPayload(rawSchedules),
        source: "sportmonks_api",
        notice: `${buildSportmonksPlanNotice(rawSchedules, normalizedMatches) || ""}${scheduleFilterHint}${paginationHint}`.trim(),
        updatedAt,
      });

      cacheStore.set(cacheKey, {
        payload: {
          ...payload,
          source: "sportmonks_cache",
        },
        updatedAt,
      });
      logFootballServiceTelemetry({
        route: "/api/football/schedules/window",
        requestPurpose: "schedule_window",
        days: safeDays,
        fixtureId: null,
        cacheHit: false,
        cacheState: "miss",
        providerLatencyMs: null,
        pagesFetched: payload?.rawSchedules?.schedulePagination?.pagesFetched ?? null,
        itemsFetched: Array.isArray(payload?.matches) ? payload.matches.length : 0,
        payloadBytes: payload ? JSON.stringify(payload).length : 0,
        normalizeMs,
        e2eMs: Date.now() - startedAt,
        fallbackTriggered: Boolean(payload?.isFallback),
        retryCount: 0,
        dtoTarget: "ScheduleCardDTO",
        dtoVersion: "v2",
        providerEndpoint: "fixtures/between/{start}/{end}",
        includeSet: null,
        estimatedCallCost: payload?.rawSchedules?.schedulePagination?.pagesFetched ?? null,
        source: mapTelemetrySource(payload?.source || "sportmonks_api", {
          cacheState: "miss",
          fallbackTriggered: Boolean(payload?.isFallback),
        }),
      });
      return payload;
    } catch (error) {
      if (cachedEntry?.payload) {
        const stalePayload = buildSchedulePayload({
          matches: cachedEntry.payload.matches,
          window: cachedEntry.payload.window,
          rawSchedules: cachedEntry.payload.rawSchedules,
          provider: SPORTMONKS_PROVIDER_ID,
          source: "sportmonks_cache",
          notice: isRateLimitError(error)
            ? "Rate limit Sportmonks raggiunto. Mostro l'ultimo calendario disponibile dalla cache provider."
            : error.message || "Mostro l'ultimo calendario disponibile dalla cache provider.",
          updatedAt: cachedEntry.updatedAt,
        });
        logFootballServiceTelemetry({
          route: "/api/football/schedules/window",
          requestPurpose: "schedule_window",
          days: safeDays,
          fixtureId: null,
          cacheHit: true,
          cacheState: "stale-hit",
          providerLatencyMs: null,
          pagesFetched: stalePayload?.rawSchedules?.schedulePagination?.pagesFetched ?? null,
          itemsFetched: Array.isArray(stalePayload?.matches) ? stalePayload.matches.length : 0,
          payloadBytes: stalePayload ? JSON.stringify(stalePayload).length : 0,
          normalizeMs: null,
          e2eMs: Date.now() - startedAt,
          fallbackTriggered: true,
          retryCount: 0,
          dtoTarget: "ScheduleCardDTO",
          dtoVersion: "v2",
          providerEndpoint: "fixtures/between/{start}/{end}",
          includeSet: null,
          estimatedCallCost: stalePayload?.rawSchedules?.schedulePagination?.pagesFetched ?? null,
          source: mapTelemetrySource("sportmonks_cache", {
            cacheState: "stale-hit",
            fallbackTriggered: true,
          }),
          error: error?.message || "unknown_error",
        });
        return stalePayload;
      }

      const fallbackPayload = buildSchedulePayload({
        matches: [],
        window: null,
        rawSchedules: null,
        source: "provider_unavailable",
        notice: error.message || "Impossibile recuperare il calendario dal provider corrente.",
        updatedAt: null,
      });
      logFootballServiceTelemetry({
        route: "/api/football/schedules/window",
        requestPurpose: "schedule_window",
        days: safeDays,
        fixtureId: null,
        cacheHit: false,
        cacheState: "miss",
        providerLatencyMs: null,
        pagesFetched: null,
        itemsFetched: 0,
        payloadBytes: fallbackPayload ? JSON.stringify(fallbackPayload).length : 0,
        normalizeMs: null,
        e2eMs: Date.now() - startedAt,
        fallbackTriggered: true,
        retryCount: 0,
        dtoTarget: "ScheduleCardDTO",
        dtoVersion: "v2",
        providerEndpoint: "fixtures/between/{start}/{end}",
        includeSet: null,
        estimatedCallCost: null,
        source: mapTelemetrySource("provider_unavailable", {
          cacheState: "miss",
          fallbackTriggered: true,
        }),
        error: error?.message || "unknown_error",
      });
      return fallbackPayload;
    } finally {
      inflightStore.delete(cacheKey);
    }
  })();

  inflightStore.set(cacheKey, requestPromise);
  return requestPromise;
}
