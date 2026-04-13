import { LIVE_MATCHES, MATCHES, PLAYERS } from "@/lib/mockData";
import { SERIE_A_LIVE_SNAPSHOT } from "@/lib/serie-a-live-snapshot";
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
  SPORTRADAR_DEFAULT_SCHEDULE_DAYS,
  SPORTRADAR_DEFAULT_SOCCER_SPORT_ID,
} from "@/lib/sportradar";

const SCHEDULE_CACHE_TTL_MS = 60_000;
const LIVE_CACHE_TTL_MS = 15_000;

const PREFERRED_COMPETITIONS = [
  "serie a",
  "premier league",
  "champions league",
  "uefa champions league",
  "la liga",
  "bundesliga",
];

function getScheduleCacheStore() {
  if (!globalThis.__sportradarScheduleWindowCache) {
    globalThis.__sportradarScheduleWindowCache = new Map();
  }

  return globalThis.__sportradarScheduleWindowCache;
}

function getLivescoreCacheStore() {
  if (!globalThis.__sportradarLivescoresInplayCache) {
    globalThis.__sportradarLivescoresInplayCache = {
      payload: null,
      updatedAt: 0,
    };
  }

  return globalThis.__sportradarLivescoresInplayCache;
}

function isRateLimitError(error) {
  return String(error?.message || "").toLowerCase().includes("too many requests");
}

function getFallbackSchedulePayload(days, notice, rawSchedules = null, source = "local_mock_data") {
  return {
    matches: MATCHES,
    window: rawSchedules?.window || {
      from: null,
      to: null,
      days,
    },
    rawSchedules,
    source,
    notice,
  };
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

export async function getScheduleWindowPayload(days = SPORTRADAR_DEFAULT_SCHEDULE_DAYS) {
  const safeDays = Number.isFinite(days) ? days : SPORTRADAR_DEFAULT_SCHEDULE_DAYS;
  const cacheKey = String(safeDays);
  const cacheStore = getScheduleCacheStore();
  const cachedEntry = cacheStore.get(cacheKey);

  try {
    if (cachedEntry && Date.now() - cachedEntry.updatedAt < SCHEDULE_CACHE_TTL_MS) {
      return cachedEntry.payload;
    }

    const rawSchedules = await fetchSportradarScheduleWindow(safeDays);
    const matches = rawSchedules.schedules.map((entry) => {
      const sportEvent = entry?.schedule?.sport_event;
      const competitors = Array.isArray(sportEvent?.competitors) ? sportEvent.competitors : [];
      const homeName = competitors.find((competitor) => competitor?.qualifier === "home")?.name;
      const awayName = competitors.find((competitor) => competitor?.qualifier === "away")?.name;
      const fallbackMatch =
        MATCHES.find(
          (match) =>
            match.home.toLowerCase() === String(homeName || "").toLowerCase() &&
            match.away.toLowerCase() === String(awayName || "").toLowerCase()
        ) || null;

      return normalizeSportradarScheduleMatch(entry, fallbackMatch);
    });

    const payload = {
      matches,
      window: rawSchedules.window,
      rawSchedules,
      source: "sportradar_api",
      notice: "",
    };

    cacheStore.set(cacheKey, {
      payload,
      updatedAt: Date.now(),
    });

    return payload;
  } catch (error) {
    if (cachedEntry?.payload) {
      return {
        ...cachedEntry.payload,
        source: "sportradar_cache",
        notice:
          "Rate limit Sportradar raggiunto. Mostro l'ultimo calendario disponibile dalla cache locale.",
      };
    }

    return getFallbackSchedulePayload(
      safeDays,
      isRateLimitError(error)
        ? "Rate limit Sportradar raggiunto. Mostro il calendario locale."
        : error.message || "Impossibile recuperare il calendario da Sportradar."
    );
  }
}

export async function getLivescoresInplayPayload() {
  const cacheStore = getLivescoreCacheStore();

  try {
    if (cacheStore.payload && Date.now() - cacheStore.updatedAt < LIVE_CACHE_TTL_MS) {
      return cacheStore.payload;
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
    const matches = ids
      .map((id) => {
        const normalizedMatch = normalizeSportradarLiveMatch(
          rawLivescores.value.summaries.find((summary) => summary?.sport_event?.id === id),
          timelineMap.get(id),
          LIVE_MATCHES
        );

        return normalizedMatch
          ? mergeLiveMatchWithProbabilities(normalizedMatch, probabilityMap.get(id))
          : null;
      })
      .filter(Boolean);

    if (matches.length > 0) {
      const payload = {
        matches,
        rawLivescores: {
          livescores: rawLivescores.value,
          probabilities:
            liveProbabilitiesResult.status === "fulfilled"
              ? liveProbabilitiesResult.value
              : null,
        },
        source: "sportradar_api",
        notice:
          liveProbabilitiesResult.status === "rejected"
            ? "Probabilities live non disponibili nel feed corrente. Mostro score e stats live."
            : "",
      };

      cacheStore.payload = payload;
      cacheStore.updatedAt = Date.now();

      return payload;
    }

    const snapshotPayload = {
      matches: SERIE_A_LIVE_SNAPSHOT,
      rawLivescores: {
        livescores: rawLivescores.value,
        probabilities:
          liveProbabilitiesResult.status === "fulfilled"
            ? liveProbabilitiesResult.value
            : null,
      },
      source: "local_snapshot",
      notice:
        "Feed live Sportradar non disponibile sul piano corrente. Mostro uno snapshot locale Serie A.",
    };

    cacheStore.payload = snapshotPayload;
    cacheStore.updatedAt = Date.now();

    return snapshotPayload;
  } catch (error) {
    if (cacheStore.payload) {
      return {
        ...cacheStore.payload,
        source: "sportradar_cache",
        notice:
          "Rate limit Sportradar raggiunto. Mostro l'ultimo livescore disponibile dalla cache locale.",
      };
    }

    return {
      matches: SERIE_A_LIVE_SNAPSHOT,
      rawLivescores: null,
      source: "local_snapshot",
      notice: error.message || "Impossibile recuperare i livescores in-play.",
    };
  }
}

export async function getFixturePayload(fixtureId) {
  const normalizedFixtureId = decodeURIComponent(String(fixtureId || "").trim());

  if (!normalizedFixtureId) {
    return {
      status: 400,
      body: {
        error: "fixtureId non valido.",
      },
    };
  }

  const rawFixture = await fetchSportradarSportEventBundle(normalizedFixtureId);
  const fallbackMatch =
    MATCHES.find((match) => String(match.id) === normalizedFixtureId) || null;

  return {
    status: 200,
    body: {
      fixture: normalizeSportradarFixture(rawFixture, fallbackMatch, PLAYERS),
      rawFixture,
      source: "sportradar_api",
    },
  };
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
      source: "sportradar_odds_api",
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
      source: "sportradar_odds_api",
    };
  } catch (error) {
    return {
      competitions,
      selectedCompetition,
      markets: [],
      source: "sportradar_odds_api",
      notice:
        error.message ||
        "Feed futures disponibile ma nessun mercato recuperato per la competition selezionata.",
    };
  }
}
