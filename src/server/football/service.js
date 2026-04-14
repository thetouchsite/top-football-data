import { sortMatchesByFeaturedPriority } from "@/lib/football-filters";
import { collectCompetitionSummaries } from "@/lib/competitions/catalog";
import { createFixtureDetail } from "@/lib/domain/fixtures";
import { createProviderFreshness } from "@/lib/domain/freshness";
import { createLiveMatch } from "@/lib/domain/live";
import { createPrematchMatch } from "@/lib/domain/matches";
import {
  buildLiveProbabilityMap,
  fetchSportradarCompetitionFutures,
  fetchSportradarLiveData,
  fetchSportradarLiveProbabilities,
  fetchSportradarOddsCompetitions,
  fetchSportradarScheduleWindow,
  fetchSportradarSportEventBundle,
  mergeLiveMatchWithProbabilities,
  normalizeSportradarFixture,
  normalizeSportradarFuturesMarket,
  normalizeSportradarLiveMatch,
  normalizeSportradarOddsCompetition,
  normalizeSportradarScheduleMatch,
  SPORTRADAR_DEFAULT_SOCCER_SPORT_ID,
  SPORTRADAR_PROVIDER_ID,
} from "@/lib/providers/sportradar";
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

const PREFERRED_COMPETITIONS = [
  "serie a",
  "premier league",
  "champions league",
  "uefa champions league",
  "la liga",
  "bundesliga",
];

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

function hasSportradarFallback() {
  return Boolean(process.env.SPORTRADAR_API_KEY);
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
    isFallback:
      provider !== SPORTMONKS_PROVIDER_ID ||
      source === "emergency_fallback_sportradar" ||
      source === "provider_unavailable",
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
    isFallback:
      provider !== SPORTMONKS_PROVIDER_ID ||
      source === "emergency_fallback_sportradar" ||
      source === "provider_unavailable",
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
      isFallback:
        provider !== SPORTMONKS_PROVIDER_ID ||
        source === "emergency_fallback_sportradar" ||
        source === "provider_unavailable",
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

function buildSportmonksPlanNotice(rawPayload, matches = []) {
  const subscription = rawPayload?.raw?.subscription?.[0] || rawPayload?.subscription?.[0] || null;
  const planNames = Array.isArray(subscription?.plans)
    ? subscription.plans.map((plan) => plan?.plan).filter(Boolean)
    : [];
  const hasAddOns = Array.isArray(subscription?.add_ons) && subscription.add_ons.length > 0;
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

  if (!planNames.length || hasAddOns || (hasProviderPredictions && hasProviderXg)) {
    return "";
  }

  if (hasProviderOdds) {
    return `Piano Sportmonks attivo: ${planNames.join(", ")}. Pre-match odds disponibili; predictions, xG provider-driven e live odds non risultano abilitati nel feed corrente.`;
  }

  return `Piano Sportmonks attivo: ${planNames.join(", ")}. Add-on predictions/xG/odds non rilevati nel feed corrente.`;
}

async function getSportradarScheduleFallback(days, originalError) {
  if (!hasSportradarFallback()) {
    return null;
  }

  const rawSchedules = await fetchSportradarScheduleWindow(days);
  const normalizedMatches = rawSchedules.schedules.map((entry) =>
    normalizeSportradarScheduleMatch(entry)
  );

  return buildSchedulePayload({
    matches: normalizedMatches,
    window: rawSchedules.window,
    rawSchedules,
    provider: SPORTRADAR_PROVIDER_ID,
    source: "emergency_fallback_sportradar",
    notice:
      originalError?.message ||
      "Sportmonks non disponibile: uso un fallback tecnico Sportradar.",
    updatedAt: Date.now(),
  });
}

async function getSportradarLiveFallback(originalError) {
  if (!hasSportradarFallback()) {
    return null;
  }

  const [rawLivescores, liveProbabilitiesResult] = await Promise.allSettled([
    fetchSportradarLiveData(),
    fetchSportradarLiveProbabilities(),
  ]);

  if (rawLivescores.status !== "fulfilled") {
    throw rawLivescores.reason;
  }

  const probabilityMap =
    liveProbabilitiesResult.status === "fulfilled"
      ? buildLiveProbabilityMap(liveProbabilitiesResult.value)
      : new Map();
  const timelineMap = new Map(
    rawLivescores.value.timelines.map((timeline) => [timeline?.id, timeline])
  );
  const ids = Array.from(
    new Set([
      ...rawLivescores.value.summaries.map((summary) => summary?.sport_event?.id),
      ...rawLivescores.value.timelines.map((timeline) => timeline?.id),
    ].filter(Boolean))
  );
  const normalizedMatches = ids
    .map((id) => {
      const normalizedMatch = normalizeSportradarLiveMatch(
        rawLivescores.value.summaries.find((summary) => summary?.sport_event?.id === id),
        timelineMap.get(id)
      );

      return normalizedMatch
        ? mergeLiveMatchWithProbabilities(normalizedMatch, probabilityMap.get(id))
        : null;
    })
    .filter(Boolean);

  return buildLivePayload({
    matches: normalizedMatches,
    rawLivescores: {
      livescores: rawLivescores.value,
      probabilities:
        liveProbabilitiesResult.status === "fulfilled"
          ? liveProbabilitiesResult.value
          : null,
    },
    provider: SPORTRADAR_PROVIDER_ID,
    source: "emergency_fallback_sportradar",
    notice:
      originalError?.message ||
      "Sportmonks live non disponibile: uso un fallback tecnico Sportradar.",
    updatedAt: Date.now(),
  });
}

function pickCompetition(competitions, explicitCompetitionId) {
  if (explicitCompetitionId) {
    return competitions.find((competition) => competition.id === explicitCompetitionId) || null;
  }

  const configuredCompetitionId = process.env.SPORTRADAR_FUTURES_COMPETITION_ID;

  if (configuredCompetitionId) {
    return (
      competitions.find((competition) => competition.id === configuredCompetitionId) || null
    );
  }

  const preferredMatch = competitions.find((competition) =>
    PREFERRED_COMPETITIONS.some((preferred) =>
      competition.name.toLowerCase().includes(preferred)
    )
  );

  return preferredMatch || competitions[0] || null;
}

export async function getScheduleWindowPayload(days = SPORTMONKS_DEFAULT_SCHEDULE_DAYS) {
  const safeDays = Number.isFinite(days) ? days : SPORTMONKS_DEFAULT_SCHEDULE_DAYS;
  const cacheKey = String(safeDays);
  const cacheStore = getScheduleCacheStore();
  const inflightStore = getScheduleInflightStore();
  const cachedEntry = cacheStore.get(cacheKey);

  if (cachedEntry && Date.now() - cachedEntry.updatedAt < SCHEDULE_CACHE_TTL_MS) {
    return cachedEntry.payload;
  }

  if (inflightStore.has(cacheKey)) {
    return inflightStore.get(cacheKey);
  }

  const requestPromise = (async () => {
    try {
      const rawSchedules = await fetchSportmonksScheduleWindow(safeDays);
      const normalizedMatches = sortMatchesByFeaturedPriority(
        rawSchedules.fixtures.map(normalizeSportmonksScheduleMatch)
      );
      const updatedAt = Date.now();
      const scheduleFilterHint = rawSchedules?.scheduleLeagueFilter
        ? " Calendario ristretto dal filtro API leghe (SPORTMONKS_SCHEDULE_LEAGUE_FILTER_STRICT)."
        : "";
      const payload = buildSchedulePayload({
        matches: normalizedMatches,
        window: rawSchedules.window,
        rawSchedules,
        source: "sportmonks_api",
        notice: `${buildSportmonksPlanNotice(rawSchedules, normalizedMatches) || ""}${scheduleFilterHint}`.trim(),
        updatedAt,
      });

      cacheStore.set(cacheKey, { payload, updatedAt });
      return payload;
    } catch (error) {
      if (cachedEntry?.payload) {
        return buildSchedulePayload({
          matches: cachedEntry.payload.matches,
          window: cachedEntry.payload.window,
          rawSchedules: cachedEntry.payload.rawSchedules,
          provider: cachedEntry.payload.provider,
          source:
            cachedEntry.payload.provider === SPORTRADAR_PROVIDER_ID
              ? "emergency_fallback_sportradar"
              : "sportmonks_cache",
          notice:
            cachedEntry.payload.provider === SPORTRADAR_PROVIDER_ID
              ? "Sportmonks non disponibile. Mostro l'ultimo fallback tecnico disponibile."
              : isRateLimitError(error)
                ? "Rate limit Sportmonks raggiunto. Mostro l'ultimo calendario disponibile dalla cache provider."
                : error.message || "Mostro l'ultimo calendario disponibile dalla cache provider.",
          updatedAt: cachedEntry.updatedAt,
        });
      }

      const fallbackPayload = await getSportradarScheduleFallback(safeDays, error).catch(() => null);

      return (
        fallbackPayload ||
        buildSchedulePayload({
          matches: [],
          window: null,
          rawSchedules: null,
          source: "provider_unavailable",
          notice: error.message || "Impossibile recuperare il calendario dal provider corrente.",
          updatedAt: null,
        })
      );
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
          provider: cacheStore.payload.provider,
          source:
            cacheStore.payload.provider === SPORTRADAR_PROVIDER_ID
              ? "emergency_fallback_sportradar"
              : "sportmonks_cache",
          notice:
            cacheStore.payload.provider === SPORTRADAR_PROVIDER_ID
              ? "Sportmonks live non disponibile. Mostro l'ultimo fallback tecnico in cache."
              : isRateLimitError(error)
                ? "Rate limit Sportmonks raggiunto. Mostro l'ultimo livescore disponibile dalla cache provider."
                : error.message || "Mostro l'ultimo livescore disponibile dalla cache provider.",
          updatedAt: cacheStore.updatedAt,
        });
      }

      const fallbackPayload = await getSportradarLiveFallback(error).catch(() => null);

      return (
        fallbackPayload ||
        buildLivePayload({
          matches: [],
          rawLivescores: null,
          source: "provider_unavailable",
          notice: error.message || "Impossibile recuperare i livescores in-play.",
          updatedAt: null,
        })
      );
    } finally {
      inflightStore.promise = null;
    }
  })();

  return inflightStore.promise;
}

export async function getFixturePayload(fixtureId) {
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
    return buildFixturePayload({
      normalizedFixture: cachedEntry.normalizedFixture,
      rawFixture: cachedEntry.rawFixture,
      provider: cachedEntry.provider,
      source: "sportmonks_cache",
      updatedAt: cachedEntry.updatedAt,
    });
  }

  if (fixtureInflightStore.has(normalizedFixtureId)) {
    return fixtureInflightStore.get(normalizedFixtureId);
  }

  const requestPromise = (async () => {
    try {
      const rawFixture = await fetchSportmonksFixtureById(normalizedFixtureId);
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
        fetchSportmonksSeasonStandings(rawFixture?.season?.id || rawFixture?.season_id),
        fetchSportmonksTeamSquad(homeParticipant?.id),
        fetchSportmonksTeamSquad(awayParticipant?.id),
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
      const updatedAt = Date.now();

      fixtureCacheStore.set(normalizedFixtureId, {
        normalizedFixture,
        rawFixture: enrichedFixture,
        provider: SPORTMONKS_PROVIDER_ID,
        updatedAt,
      });

      return buildFixturePayload({
        normalizedFixture,
        rawFixture: enrichedFixture,
        source: "sportmonks_api",
        updatedAt,
      });
    } catch (error) {
      if (cachedEntry) {
        return buildFixturePayload({
          normalizedFixture: cachedEntry.normalizedFixture,
          rawFixture: cachedEntry.rawFixture,
          provider: cachedEntry.provider,
          source:
            cachedEntry.provider === SPORTRADAR_PROVIDER_ID
              ? "emergency_fallback_sportradar"
              : "sportmonks_cache",
          updatedAt: cachedEntry.updatedAt,
          notice: isRateLimitError(error)
            ? "Rate limit Sportmonks raggiunto. Mostro l'ultima fixture disponibile dalla cache provider."
            : error.message || "Fixture provider non aggiornata. Mostro l'ultima versione in cache.",
        });
      }

      if (
        normalizedFixtureId.startsWith("sr:") &&
        hasSportradarFallback()
      ) {
        try {
          const rawFixture = await fetchSportradarSportEventBundle(normalizedFixtureId);
          const normalizedFixture = normalizeSportradarFixture(rawFixture);
          const updatedAt = Date.now();

          return buildFixturePayload({
            normalizedFixture,
            rawFixture,
            provider: SPORTRADAR_PROVIDER_ID,
            source: "emergency_fallback_sportradar",
            updatedAt,
            notice:
              "Fixture legacy risolta con fallback tecnico Sportradar. I nuovi ID canonici sono Sportmonks.",
          });
        } catch {}
      }

      return buildEmptyFixturePayload(
        normalizedFixtureId,
        error.message || `Fixture ${normalizedFixtureId} non disponibile con il feed corrente.`
      );
    } finally {
      fixtureInflightStore.delete(normalizedFixtureId);
    }
  })();

  fixtureInflightStore.set(normalizedFixtureId, requestPromise);
  return requestPromise;
}

export async function getFuturesOddsPayload({
  sportId = SPORTRADAR_DEFAULT_SOCCER_SPORT_ID,
  competitionId = "",
} = {}) {
  const competitionsResponse = await fetchSportradarOddsCompetitions(sportId);
  const competitions = (Array.isArray(competitionsResponse?.competitions)
    ? competitionsResponse.competitions
    : []
  ).map(normalizeSportradarOddsCompetition);
  const selectedCompetition = pickCompetition(competitions, competitionId);

  if (!selectedCompetition) {
    return {
      competitions,
      selectedCompetition: null,
      markets: [],
      provider: SPORTRADAR_PROVIDER_ID,
      source: "sportradar_odds_api",
      isFallback: false,
      notice:
        "Nessuna competition futures disponibile per il piano o lo sport selezionato.",
    };
  }

  try {
    const futuresResponse = await fetchSportradarCompetitionFutures(selectedCompetition.id);
    const markets = (Array.isArray(futuresResponse?.markets) ? futuresResponse.markets : [])
      .map(normalizeSportradarFuturesMarket)
      .filter((market) => market.outcomes.length > 0);

    return {
      competitions,
      selectedCompetition,
      markets,
      rawFutures: futuresResponse,
      provider: SPORTRADAR_PROVIDER_ID,
      source: "sportradar_odds_api",
      isFallback: false,
    };
  } catch (error) {
    return {
      competitions,
      selectedCompetition,
      markets: [],
      provider: SPORTRADAR_PROVIDER_ID,
      source: "sportradar_odds_api",
      isFallback: false,
      notice:
        error.message ||
        "Impossibile recuperare i futures odds con il provider corrente.",
    };
  }
}
