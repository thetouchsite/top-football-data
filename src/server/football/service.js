import { sortMatchesByFeaturedPriority } from "@/lib/football-filters";
import { collectCompetitionSummaries } from "@/lib/competitions/catalog";
import { createFixtureDetail } from "@/lib/domain/fixtures";
import { createProviderFreshness } from "@/lib/domain/freshness";
import { createLiveMatch } from "@/lib/domain/live";
import { createPrematchMatch } from "@/lib/domain/matches";
import {
  fetchSportmonksFixtureById,
  fetchSportmonksLivescoresInplay,
  fetchSportmonksLivescoresLatest,
  fetchSportmonksScheduleWindow,
  fetchSportmonksSeasonStandings,
  fetchSportmonksTeamSquad,
  mergeSportmonksLiveMatches,
  normalizeSportmonksFixture,
  normalizeSportmonksLiveMatch,
  normalizeSportmonksScheduleMatch,
  SPORTMONKS_DEFAULT_SCHEDULE_DAYS,
  SPORTMONKS_PROVIDER_ID,
} from "@/lib/providers/sportmonks";

const SCHEDULE_CACHE_TTL_MS = 60_000;
const LIVE_CACHE_TTL_MS = 5_000;
const LIVE_FULL_SYNC_INTERVAL_MS = 60_000;
const FIXTURE_CACHE_TTL_MS = 300_000;

const DEBUG_FOOTBALL_TELEMETRY = ["1", "true", "yes"].includes(
  String(process.env.DEBUG_FOOTBALL_TELEMETRY || "").toLowerCase()
);

function mapTelemetrySource(source, { cacheState, fallbackTriggered } = {}) {
  if (source === "sportmonks_cache" && cacheState === "hit" && !fallbackTriggered) {
    return "memory_cache";
  }
  if (source === "sportmonks_cache" && (cacheState === "stale-hit" || fallbackTriggered)) {
    return "stale_cache";
  }
  if (source === "sportmonks_api") {
    return "provider_fetch";
  }
  if (source === "provider_unavailable" || source === "route_error") {
    return "fallback_provider";
  }
  return source || null;
}

function shouldLogVerboseTelemetry(payload = {}) {
  if (DEBUG_FOOTBALL_TELEMETRY) {
    return true;
  }
  return (
    payload.cacheState === "miss" ||
    payload.fallbackTriggered === true ||
    Number(payload.retryCount || 0) > 0 ||
    Boolean(payload.error)
  );
}

function logFootballServiceTelemetry(payload = {}) {
  if (!shouldLogVerboseTelemetry(payload)) {
    return;
  }
  console.info("[football][service]", payload);
}

function getScheduleCacheStore() {
  if (!globalThis.__footballScheduleWindowCache) {
    globalThis.__footballScheduleWindowCache = new Map();
  }

  return globalThis.__footballScheduleWindowCache;
}

function getScheduleInflightStore() {
  if (!globalThis.__footballScheduleWindowInflight) {
    globalThis.__footballScheduleWindowInflight = new Map();
  }

  return globalThis.__footballScheduleWindowInflight;
}

function getLivescoreCacheStore() {
  if (!globalThis.__footballLivescoresInplayCache) {
    globalThis.__footballLivescoresInplayCache = {
      payload: null,
      updatedAt: 0,
      lastFullSyncAt: 0,
    };
  }

  return globalThis.__footballLivescoresInplayCache;
}

function getLivescoreInflightStore() {
  if (!globalThis.__footballLivescoresInplayInflight) {
    globalThis.__footballLivescoresInplayInflight = {
      promise: null,
    };
  }

  return globalThis.__footballLivescoresInplayInflight;
}

function getFixtureCacheStore() {
  if (!globalThis.__footballFixtureCache) {
    globalThis.__footballFixtureCache = new Map();
  }

  return globalThis.__footballFixtureCache;
}

function getFixtureInflightStore() {
  if (!globalThis.__footballFixtureInflight) {
    globalThis.__footballFixtureInflight = new Map();
  }

  return globalThis.__footballFixtureInflight;
}

function isRateLimitError(error) {
  return String(error?.message || "").toLowerCase().includes("too many requests");
}

function enrichPrematchMatches(matches = [], provider, source, updatedAt) {
  return matches.map((match) =>
    createPrematchMatch(match, {
      provider,
      source,
      updatedAt,
      ttlMs: SCHEDULE_CACHE_TTL_MS,
      predictionProvider: match?.prediction_provider || "derived_internal_model",
      oddsProvider: match?.odds_provider || "not_available_with_current_feed",
    })
  );
}

function enrichLiveMatches(matches = [], provider, source, updatedAt) {
  return matches.map((match) =>
    createLiveMatch(match, {
      provider,
      source,
      updatedAt,
      ttlMs: LIVE_CACHE_TTL_MS,
      predictionProvider:
        match?.prediction_provider ||
        (match?.liveProbabilities ? "sportmonks_predictions" : "derived_live_model"),
      oddsProvider: match?.odds_provider || "derived_live_model",
    })
  );
}

function compactScheduleRawPayload(rawSchedules = null) {
  if (!rawSchedules || typeof rawSchedules !== "object") {
    return null;
  }

  return {
    window: rawSchedules.window || null,
    scheduleLeagueFilter: rawSchedules.scheduleLeagueFilter || null,
    schedulePagination: rawSchedules.schedulePagination || null,
    fixturesCount: Array.isArray(rawSchedules.fixtures) ? rawSchedules.fixtures.length : 0,
    sampleFixture:
      process.env.NODE_ENV === "development" && Array.isArray(rawSchedules.fixtures)
        ? rawSchedules.fixtures[0] || null
        : null,
  };
}

function buildSchedulePayload({
  matches = [],
  window = null,
  rawSchedules = null,
  provider = SPORTMONKS_PROVIDER_ID,
  source,
  notice = "",
  updatedAt = null,
}) {
  const enrichedMatches = enrichPrematchMatches(matches, provider, source, updatedAt);

  return {
    matches: enrichedMatches,
    competitions: collectCompetitionSummaries(enrichedMatches),
    window,
    rawSchedules,
    provider,
    source,
    isFallback: provider !== SPORTMONKS_PROVIDER_ID || source === "provider_unavailable",
    freshness: createProviderFreshness({
      updatedAt,
      ttlMs: SCHEDULE_CACHE_TTL_MS,
    }),
    notice,
  };
}

function buildLivePayload({
  matches = [],
  rawLivescores = null,
  provider = SPORTMONKS_PROVIDER_ID,
  source,
  notice = "",
  updatedAt = null,
}) {
  const enrichedMatches = enrichLiveMatches(matches, provider, source, updatedAt);

  return {
    matches: enrichedMatches,
    competitions: collectCompetitionSummaries(enrichedMatches),
    rawLivescores,
    provider,
    source,
    isFallback: provider !== SPORTMONKS_PROVIDER_ID || source === "provider_unavailable",
    freshness: createProviderFreshness({
      updatedAt,
      ttlMs: LIVE_CACHE_TTL_MS,
    }),
    notice,
  };
}

function buildFixturePayload({
  normalizedFixture,
  rawFixture,
  provider = SPORTMONKS_PROVIDER_ID,
  source,
  updatedAt,
  notice = "",
}) {
  const fixture = createFixtureDetail(normalizedFixture, {
    provider,
    source,
    updatedAt,
    ttlMs: FIXTURE_CACHE_TTL_MS,
    predictionProvider: normalizedFixture?.prediction_provider || "derived_internal_model",
    oddsProvider: normalizedFixture?.odds_provider || "not_available_with_current_feed",
  });

  return {
    status: 200,
    body: {
      fixture,
      competition: fixture.competition,
      provider,
      source,
      isFallback: provider !== SPORTMONKS_PROVIDER_ID || source === "provider_unavailable",
      freshness: fixture.freshness,
      rawFixture,
      notice,
    },
  };
}

function buildEmptyFixturePayload(fixtureId, notice) {
  return {
    status: 404,
    body: {
      error: notice || `Fixture ${fixtureId} non disponibile con il feed corrente.`,
      provider: SPORTMONKS_PROVIDER_ID,
      source: "provider_unavailable",
      isFallback: true,
      freshness: createProviderFreshness({
        updatedAt: null,
        ttlMs: FIXTURE_CACHE_TTL_MS,
      }),
    },
  };
}

function humanizeSportmonksApiMessage(message) {
  const raw = String(message || "").trim();

  if (!raw) {
    return "";
  }

  if (
    /no result\(s\) found/i.test(raw) ||
    /did not return any data/i.test(raw) ||
    (/subscription/i.test(raw) && /access/i.test(raw))
  ) {
    return "Nessun dato da questo endpoint Sportmonks: di solito significa che non ci sono partite live in questo momento oppure che il piano non include livescores in-play o gli add-on necessari. Verifica piano e permessi su Sportmonks.";
  }

  return raw;
}

function getLiveNoticeFromMatches(matches) {
  if (!matches.length) {
    return "";
  }

  const hasProviderProbabilities = matches.some((match) => match?.liveProbabilities);
  return hasProviderProbabilities
    ? ""
    : "Probabilities live non presenti nel feed corrente. Le live odds restano derivate dal contesto match.";
}

function subscriptionHasPaidExtras(subscription) {
  if (!subscription || typeof subscription !== "object") {
    return false;
  }
  const nonempty = (value) => Array.isArray(value) && value.length > 0;
  /** Meta API Sportmonks: add-on, bundle (Odds & Predictions, Pressure & xG), widgets. */
  return (
    nonempty(subscription.add_ons) ||
    nonempty(subscription.bundles) ||
    nonempty(subscription.widgets)
  );
}

function buildSportmonksPlanNotice(rawPayload, matches = []) {
  const subscription = rawPayload?.raw?.subscription?.[0] || rawPayload?.subscription?.[0] || null;
  const planNames = Array.isArray(subscription?.plans)
    ? subscription.plans.map((plan) => plan?.plan).filter(Boolean)
    : [];
  const hasPaidExtras = subscriptionHasPaidExtras(subscription);
  const hasProviderPredictions = matches.some(
    (match) =>
      match?.prediction_provider === "sportmonks_predictions" ||
      match?.coverage?.hasPredictions
  );
  const hasProviderXg = matches.some(
    (match) => match?.coverage?.hasExpectedGoals
  );
  const hasProviderOdds = matches.some(
    (match) => match?.odds_provider === "sportmonks_pre_match_odds"
  );

  if (!planNames.length || hasPaidExtras || hasProviderPredictions || hasProviderXg) {
    return "";
  }

  if (hasProviderOdds) {
    return `Piano Sportmonks attivo: ${planNames.join(", ")}. Pre-match odds disponibili; predictions, xG provider-driven e live odds non risultano abilitati nel feed corrente.`;
  }

  return `Piano Sportmonks attivo: ${planNames.join(", ")}. Add-on predictions/xG/odds non rilevati nel feed corrente.`;
}

export async function getScheduleWindowPayload(days = SPORTMONKS_DEFAULT_SCHEDULE_DAYS) {
  const startedAt = Date.now();
  const safeDays = Number.isFinite(days) ? days : SPORTMONKS_DEFAULT_SCHEDULE_DAYS;
  const cacheKey = String(safeDays);
  const cacheStore = getScheduleCacheStore();
  const inflightStore = getScheduleInflightStore();
  const cachedEntry = cacheStore.get(cacheKey);

  if (cachedEntry && Date.now() - cachedEntry.updatedAt < SCHEDULE_CACHE_TTL_MS) {
    const e2eMs = Date.now() - startedAt;
    const cachedPayload = cachedEntry.payload;
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
      dtoVersion: "v1",
      providerEndpoint: "fixtures/between/{start}/{end}",
      includeSet: null,
      estimatedCallCost: cachedPayload?.rawSchedules?.schedulePagination?.pagesFetched ?? null,
      source: mapTelemetrySource(cachedPayload?.source || "sportmonks_cache", {
        cacheState: "hit",
        fallbackTriggered: Boolean(cachedPayload?.isFallback),
      }),
    });
    return cachedEntry.payload;
  }

  if (inflightStore.has(cacheKey)) {
    return inflightStore.get(cacheKey);
  }

  const requestPromise = (async () => {
    try {
      const rawSchedules = await fetchSportmonksScheduleWindow(safeDays, {
        route: "/api/football/schedules/window",
        requestPurpose: "schedule_window",
        dtoTarget: "ScheduleCardDTO",
        dtoVersion: "v1",
      });
      if (process.env.NODE_ENV === "development") {
        const firstRaw = rawSchedules?.fixtures?.[0];
        console.log("[getScheduleWindowPayload] Sportmonks fixtures/between — primo elemento raw", firstRaw ?? null);
      }
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

      cacheStore.set(cacheKey, { payload, updatedAt });
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
        dtoVersion: "v1",
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
          dtoVersion: "v1",
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
        dtoVersion: "v1",
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

export async function getLivescoresInplayPayload() {
  const cacheStore = getLivescoreCacheStore();
  const inflightStore = getLivescoreInflightStore();
  const now = Date.now();

  if (cacheStore.payload && now - cacheStore.updatedAt < LIVE_CACHE_TTL_MS) {
    return cacheStore.payload;
  }

  if (inflightStore.promise) {
    return inflightStore.promise;
  }

  inflightStore.promise = (async () => {
    try {
      const shouldFullSync =
        !cacheStore.payload ||
        !Array.isArray(cacheStore.payload?.matches) ||
        cacheStore.payload.matches.length === 0 ||
        now - cacheStore.lastFullSyncAt > LIVE_FULL_SYNC_INTERVAL_MS;
      const liveResponse = shouldFullSync
        ? await fetchSportmonksLivescoresInplay()
        : await fetchSportmonksLivescoresLatest();
      const normalizedMatches = liveResponse.fixtures.map(normalizeSportmonksLiveMatch);
      const mergedMatches = sortMatchesByFeaturedPriority(
        shouldFullSync
          ? normalizedMatches
          : mergeSportmonksLiveMatches(cacheStore.payload?.matches || [], normalizedMatches)
      );
      const updatedAt = Date.now();
      const apiLiveMessage =
        mergedMatches.length === 0
          ? humanizeSportmonksApiMessage(liveResponse?.raw?.message)
          : "";
      const payload = buildLivePayload({
        matches: mergedMatches,
        rawLivescores: liveResponse,
        source: shouldFullSync ? "sportmonks_api" : "sportmonks_live_latest",
        notice:
          apiLiveMessage ||
          buildSportmonksPlanNotice(liveResponse, mergedMatches) ||
          getLiveNoticeFromMatches(mergedMatches),
        updatedAt,
      });

      cacheStore.payload = payload;
      cacheStore.updatedAt = updatedAt;

      if (shouldFullSync) {
        cacheStore.lastFullSyncAt = updatedAt;
      }

      return payload;
    } catch (error) {
      if (cacheStore.payload) {
        return buildLivePayload({
          matches: cacheStore.payload.matches,
          rawLivescores: cacheStore.payload.rawLivescores,
          provider: SPORTMONKS_PROVIDER_ID,
          source: "sportmonks_cache",
          notice: isRateLimitError(error)
            ? "Rate limit Sportmonks raggiunto. Mostro l'ultimo livescore disponibile dalla cache provider."
            : error.message || "Mostro l'ultimo livescore disponibile dalla cache provider.",
          updatedAt: cacheStore.updatedAt,
        });
      }

      return buildLivePayload({
        matches: [],
        rawLivescores: null,
        source: "provider_unavailable",
        notice: error.message || "Impossibile recuperare i livescores in-play.",
        updatedAt: null,
      });
    } finally {
      inflightStore.promise = null;
    }
  })();

  return inflightStore.promise;
}

export async function getFixturePayload(fixtureId) {
  const startedAt = Date.now();
  const normalizedFixtureId = decodeURIComponent(String(fixtureId || "").trim());
  const fixtureCacheStore = getFixtureCacheStore();
  const fixtureInflightStore = getFixtureInflightStore();
  const cachedEntry = fixtureCacheStore.get(normalizedFixtureId);

  if (!normalizedFixtureId) {
    return {
      status: 400,
      body: {
        error: "fixtureId non valido.",
      },
    };
  }

  if (cachedEntry && Date.now() - cachedEntry.updatedAt < FIXTURE_CACHE_TTL_MS) {
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
      }),
    });
    return payload;
  }

  if (fixtureInflightStore.has(normalizedFixtureId)) {
    return fixtureInflightStore.get(normalizedFixtureId);
  }

  const requestPromise = (async () => {
    try {
      const rawFixture = await fetchSportmonksFixtureById(normalizedFixtureId, {
        route: "/api/football/fixtures/[fixtureId]",
        requestPurpose: "fixture_detail",
        dtoTarget: "MatchDetailCoreDTO",
        dtoVersion: "v1",
      });
      const participants = Array.isArray(rawFixture?.participants) ? rawFixture.participants : [];
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
      const [standingsResult, homeSquadResult, awaySquadResult] = await Promise.allSettled([
        fetchSportmonksSeasonStandings(rawFixture?.season?.id || rawFixture?.season_id, {
          route: "/api/football/fixtures/[fixtureId]",
          requestPurpose: "fixture_detail_standings",
          fixtureId: normalizedFixtureId,
          dtoTarget: "MatchDetailEnrichedDTO",
          dtoVersion: "v1",
        }),
        fetchSportmonksTeamSquad(homeParticipant?.id, {
          route: "/api/football/fixtures/[fixtureId]",
          requestPurpose: "fixture_detail_squad_home",
          fixtureId: normalizedFixtureId,
          dtoTarget: "MatchDetailEnrichedDTO",
          dtoVersion: "v1",
        }),
        fetchSportmonksTeamSquad(awayParticipant?.id, {
          route: "/api/football/fixtures/[fixtureId]",
          requestPurpose: "fixture_detail_squad_away",
          fixtureId: normalizedFixtureId,
          dtoTarget: "MatchDetailEnrichedDTO",
          dtoVersion: "v1",
        }),
      ]);
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

      fixtureCacheStore.set(normalizedFixtureId, {
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
        estimatedCallCost: 3,
        source: mapTelemetrySource(payload?.body?.source || "sportmonks_api", {
          cacheState: "miss",
          fallbackTriggered: Boolean(payload?.body?.isFallback),
        }),
      });
      return payload;
    } catch (error) {
      if (cachedEntry) {
        const stalePayload = buildFixturePayload({
          normalizedFixture: cachedEntry.normalizedFixture,
          rawFixture: cachedEntry.rawFixture,
          provider: cachedEntry.provider,
          source: "sportmonks_cache",
          updatedAt: cachedEntry.updatedAt,
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
          }),
          error: error?.message || "unknown_error",
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
      });
      return emptyPayload;
    } finally {
      fixtureInflightStore.delete(normalizedFixtureId);
    }
  })();

  fixtureInflightStore.set(normalizedFixtureId, requestPromise);
  return requestPromise;
}
