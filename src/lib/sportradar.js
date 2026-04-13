import "server-only";
import sportradarSoccer from "../../.api/apis/sportradar-soccer/index.js";

export const SPORTRADAR_DEFAULT_ACCESS_LEVEL =
  process.env.SPORTRADAR_ACCESS_LEVEL || "trial";
export const SPORTRADAR_DEFAULT_LANGUAGE_CODE =
  process.env.SPORTRADAR_LANGUAGE_CODE || "it";
export const SPORTRADAR_DEFAULT_FORMAT = process.env.SPORTRADAR_FORMAT || "json";
export const SPORTRADAR_ODDS_DEFAULT_ACCESS_LEVEL =
  process.env.SPORTRADAR_ODDS_ACCESS_LEVEL || "trial";
export const SPORTRADAR_ODDS_DEFAULT_LANGUAGE_CODE =
  process.env.SPORTRADAR_ODDS_LANGUAGE_CODE || SPORTRADAR_DEFAULT_LANGUAGE_CODE;
export const SPORTRADAR_ODDS_DEFAULT_FORMAT =
  process.env.SPORTRADAR_ODDS_FORMAT || SPORTRADAR_DEFAULT_FORMAT;
export const SPORTRADAR_PROBABILITIES_DEFAULT_ACCESS_LEVEL =
  process.env.SPORTRADAR_PROBABILITIES_ACCESS_LEVEL || "trial";
export const SPORTRADAR_PROBABILITIES_DEFAULT_LANGUAGE_CODE =
  process.env.SPORTRADAR_PROBABILITIES_LANGUAGE_CODE ||
  SPORTRADAR_DEFAULT_LANGUAGE_CODE;
export const SPORTRADAR_PROBABILITIES_DEFAULT_FORMAT =
  process.env.SPORTRADAR_PROBABILITIES_FORMAT || SPORTRADAR_DEFAULT_FORMAT;
export const SPORTRADAR_DEFAULT_SOCCER_SPORT_ID =
  process.env.SPORTRADAR_SOCCER_SPORT_ID || "sr:sport:1";
export const SPORTRADAR_DEFAULT_SCHEDULE_DAYS = clampInteger(
  process.env.SPORTRADAR_SCHEDULE_DAYS,
  4,
  1,
  7
);

const ROME_TIMEZONE = "Europe/Rome";
const DEFAULT_FORM = ["-", "-", "-", "-", "-"];

const SCORE_CANDIDATES = [
  { score: "0:0", home: 0, away: 0, drawBias: 0.08 },
  { score: "1:0", home: 1, away: 0, drawBias: -0.02 },
  { score: "1:1", home: 1, away: 1, drawBias: 0.12 },
  { score: "2:0", home: 2, away: 0, drawBias: -0.06 },
  { score: "2:1", home: 2, away: 1, drawBias: -0.03 },
  { score: "0:1", home: 0, away: 1, drawBias: -0.02 },
  { score: "1:2", home: 1, away: 2, drawBias: -0.03 },
  { score: "2:2", home: 2, away: 2, drawBias: 0.04 },
];

const EVENT_TYPE_LABELS = {
  goal: "Gol",
  yellow: "Ammonizione",
  red: "Espulsione",
  substitution: "Sostituzione",
  dangerous: "Occasione",
};

export function isSportradarSportEventId(value) {
  return /^sr:sport_event:/i.test(String(value || "").trim());
}

function clampInteger(value, fallback, min, max) {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(Math.max(parsedValue, min), max);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeLookupKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeNumber(value, fallback = 0) {
  const parsedValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value.replace(",", "."))
        : Number.NaN;

  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function roundTo(value, decimals = 2) {
  return Number(safeNumber(value).toFixed(decimals));
}

function buildDateKey(date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: ROME_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function buildDateWindow(days) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return buildDateKey(date);
  });
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function formatKickoff(startTime) {
  const parsedDate = parseDate(startTime);

  if (!parsedDate) {
    return { date: "--", time: "--:--" };
  }

  return {
    date: parsedDate.toLocaleDateString("it-IT", {
      timeZone: ROME_TIMEZONE,
      day: "2-digit",
      month: "short",
    }),
    time: parsedDate.toLocaleTimeString("it-IT", {
      timeZone: ROME_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  };
}

function getRelativeStatus(startTime) {
  const parsedDate = parseDate(startTime);

  if (!parsedDate) {
    return "upcoming";
  }

  const eventDay = buildDateKey(parsedDate);
  const today = new Date();
  const todayKey = buildDateKey(today);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = buildDateKey(tomorrow);

  if (eventDay === todayKey) {
    return "today";
  }

  if (eventDay === tomorrowKey) {
    return "tomorrow";
  }

  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: ROME_TIMEZONE,
    weekday: "short",
  }).format(parsedDate);

  if (weekday === "Sat" || weekday === "Sun") {
    return "weekend";
  }

  return "upcoming";
}

function formatShortCode(competitor) {
  const name = competitor?.abbreviation || competitor?.short_name || competitor?.name || "";

  if (!name) {
    return "---";
  }

  return name.replace(/\s+/g, "").toUpperCase().slice(0, 3);
}

function getCompetitorsByQualifier(competitors = []) {
  return {
    home: competitors.find((competitor) => competitor?.qualifier === "home") || null,
    away: competitors.find((competitor) => competitor?.qualifier === "away") || null,
  };
}

function findFallbackMatch(homeName, awayName, fallbackMatches = []) {
  const normalizedHome = normalizeName(homeName);
  const normalizedAway = normalizeName(awayName);

  return (
    fallbackMatches.find(
      (match) =>
        normalizeName(match.home) === normalizedHome &&
        normalizeName(match.away) === normalizedAway
    ) || null
  );
}

function findFallbackPlayer(playerName, fallbackPlayers = []) {
  const normalizedPlayerName = normalizeName(playerName);

  return (
    fallbackPlayers.find((candidate) => normalizeName(candidate.name) === normalizedPlayerName) ||
    fallbackPlayers.find((candidate) => normalizeName(candidate.name).includes(normalizedPlayerName)) ||
    fallbackPlayers.find((candidate) => normalizedPlayerName.includes(normalizeName(candidate.name))) ||
    null
  );
}

function buildSdkError(error, fallbackMessage) {
  if (error instanceof Error && error.message) {
    return new Error(error.message);
  }

  if (typeof error?.message === "string" && error.message) {
    return new Error(error.message);
  }

  if (typeof error === "string" && error) {
    return new Error(error);
  }

  return new Error(fallbackMessage);
}

function getSportradarClient() {
  const apiKey = process.env.SPORTRADAR_API_KEY;

  if (!apiKey) {
    throw new Error("Missing SPORTRADAR_API_KEY environment variable.");
  }

  sportradarSoccer.auth(apiKey);

  return sportradarSoccer;
}

function getRequestParams(overrides = {}) {
  return {
    access_level: SPORTRADAR_DEFAULT_ACCESS_LEVEL,
    language_code: SPORTRADAR_DEFAULT_LANGUAGE_CODE,
    format: SPORTRADAR_DEFAULT_FORMAT,
    ...overrides,
  };
}

function getOddsApiKey() {
  const apiKey =
    process.env.SPORTRADAR_ODDS_API_KEY || process.env.SPORTRADAR_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing SPORTRADAR_ODDS_API_KEY environment variable."
    );
  }

  return apiKey;
}

function getProbabilitiesApiKey() {
  const apiKey =
    process.env.SPORTRADAR_PROBABILITIES_API_KEY ||
    process.env.SPORTRADAR_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing SPORTRADAR_PROBABILITIES_API_KEY environment variable."
    );
  }

  return apiKey;
}

function getOddsRequestParams(overrides = {}) {
  return {
    access_level: SPORTRADAR_ODDS_DEFAULT_ACCESS_LEVEL,
    language_code: SPORTRADAR_ODDS_DEFAULT_LANGUAGE_CODE,
    format: SPORTRADAR_ODDS_DEFAULT_FORMAT,
    ...overrides,
  };
}

function getProbabilitiesRequestParams(overrides = {}) {
  return {
    access_level: SPORTRADAR_PROBABILITIES_DEFAULT_ACCESS_LEVEL,
    language_code: SPORTRADAR_PROBABILITIES_DEFAULT_LANGUAGE_CODE,
    format: SPORTRADAR_PROBABILITIES_DEFAULT_FORMAT,
    ...overrides,
  };
}

async function fetchSportradarOddsJson(pathname, overrides = {}) {
  const params = getOddsRequestParams(overrides);
  const baseUrl = `https://api.sportradar.com/oddscomparison-futures/${params.access_level}/v2/${params.language_code}`;
  const response = await fetch(`${baseUrl}${pathname}.${params.format}`, {
    headers: {
      "x-api-key": getOddsApiKey(),
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Odds Comparison Futures request failed with status ${response.status}.`;

    try {
      const errorPayload = await response.json();
      if (typeof errorPayload?.message === "string" && errorPayload.message) {
        message = errorPayload.message;
      }
    } catch {}

    throw new Error(message);
  }

  return response.json();
}

async function fetchSportradarProbabilitiesJson(pathname, overrides = {}) {
  const params = getProbabilitiesRequestParams(overrides);
  const baseUrl = `https://api.sportradar.com/soccer-probabilities/${params.access_level}/v4/${params.language_code}`;
  const response = await fetch(`${baseUrl}${pathname}.${params.format}`, {
    headers: {
      "x-api-key": getProbabilitiesApiKey(),
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Soccer probabilities request failed with status ${response.status}.`;

    try {
      const errorPayload = await response.json();
      if (typeof errorPayload?.message === "string" && errorPayload.message) {
        message = errorPayload.message;
      }
    } catch {}

    throw new Error(message);
  }

  return response.json();
}

function buildFormArray(formString, fallbackForm = DEFAULT_FORM) {
  if (Array.isArray(formString) && formString.length > 0) {
    return formString.slice(-5);
  }

  if (typeof formString !== "string") {
    return [...fallbackForm];
  }

  const form = formString
    .toUpperCase()
    .replace(/[^WDL]/g, "")
    .slice(-5)
    .split("")
    .map((symbol) => {
      if (symbol === "W") return "V";
      if (symbol === "D") return "P";
      if (symbol === "L") return "S";
      return "-";
    });

  while (form.length < 5) {
    form.unshift("-");
  }

  return form;
}

function getFormStrength(form = DEFAULT_FORM) {
  return form.reduce((total, result) => {
    if (result === "V") return total + 3;
    if (result === "P") return total + 1;
    return total;
  }, 0);
}

function ensureProbabilitySum(probabilities) {
  const normalizedProbabilities = { ...probabilities };
  const total =
    normalizedProbabilities.home + normalizedProbabilities.draw + normalizedProbabilities.away;
  const diff = 100 - total;

  normalizedProbabilities.draw += diff;
  return normalizedProbabilities;
}

function buildProbabilities(homeForm = DEFAULT_FORM, awayForm = DEFAULT_FORM) {
  const homeStrength = getFormStrength(homeForm) + 1.4;
  const awayStrength = getFormStrength(awayForm) + 1;
  const drawStrength = Math.max(2, 4 - Math.abs(homeStrength - awayStrength) * 0.22);
  const total = homeStrength + awayStrength + drawStrength;

  return ensureProbabilitySum({
    home: Math.round((homeStrength / total) * 100),
    draw: Math.round((drawStrength / total) * 100),
    away: Math.round((awayStrength / total) * 100),
  });
}

function probabilityToOdds(probability) {
  if (!probability) {
    return 0;
  }

  return roundTo(100 / probability, 2);
}

function buildExpectedGoals(probabilities) {
  return {
    home: roundTo(0.75 + probabilities.home / 38, 2),
    away: roundTo(0.7 + probabilities.away / 38, 2),
  };
}

function buildGoalMarkets(xg) {
  const totalXg = xg.home + xg.away;
  const over25Probability = Math.min(82, Math.max(38, 18 + totalXg * 20));
  const goalProbability = Math.min(
    84,
    Math.max(35, 22 + Math.min(xg.home, xg.away) * 22 + totalXg * 8)
  );

  return {
    ou: {
      over15: probabilityToOdds(Math.min(90, over25Probability + 18)),
      under15: probabilityToOdds(Math.max(10, 100 - (over25Probability + 18))),
      over25: probabilityToOdds(over25Probability),
      under25: probabilityToOdds(100 - over25Probability),
      over35: probabilityToOdds(Math.max(12, over25Probability - 18)),
      under35: probabilityToOdds(Math.min(88, 100 - over25Probability + 18)),
    },
    gg: {
      goal: probabilityToOdds(goalProbability),
      noGoal: probabilityToOdds(100 - goalProbability),
    },
  };
}

function buildLikelyScores(probabilities, xg) {
  const rankedScores = SCORE_CANDIDATES.map((candidate) => {
    const bias =
      candidate.home === candidate.away
        ? probabilities.draw / 100
        : candidate.home > candidate.away
          ? probabilities.home / 100
          : probabilities.away / 100;
    const distance = Math.abs(xg.home - candidate.home) + Math.abs(xg.away - candidate.away);

    return {
      score: candidate.score,
      weight: bias - distance * 0.18 + candidate.drawBias,
    };
  })
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 3);

  const baseProbabilities = [16, 13, 10];

  return rankedScores.map((candidate, index) => ({
    score: candidate.score,
    prob: baseProbabilities[index],
  }));
}

function buildConfidence(probabilities) {
  return Math.min(88, Math.max(58, 58 + Math.abs(probabilities.home - probabilities.away)));
}

function buildValueBet(probabilities, xg) {
  if (probabilities.home >= 46 && xg.home - xg.away >= 0.3) {
    return {
      type: "1",
      edge: Math.min(14, Math.round(probabilities.home - probabilities.away / 2 - 18)),
      market: "1X2",
    };
  }

  if (probabilities.away >= 44 && xg.away - xg.home >= 0.3) {
    return {
      type: "2",
      edge: Math.min(14, Math.round(probabilities.away - probabilities.home / 2 - 18)),
      market: "1X2",
    };
  }

  return null;
}

function buildModelBlock(homeForm, awayForm) {
  const probabilities = buildProbabilities(homeForm, awayForm);
  const expectedGoals = buildExpectedGoals(probabilities);
  const markets = buildGoalMarkets(expectedGoals);
  const valueBet = buildValueBet(probabilities, expectedGoals);

  return {
    prob: probabilities,
    odds: {
      home: probabilityToOdds(probabilities.home),
      draw: probabilityToOdds(probabilities.draw),
      away: probabilityToOdds(probabilities.away),
    },
    ou: markets.ou,
    gg: markets.gg,
    xg: expectedGoals,
    scores: buildLikelyScores(probabilities, expectedGoals),
    confidence: buildConfidence(probabilities),
    valueBet,
  };
}

function getMinuteFromTimeline(status = {}, timeline = []) {
  const playedClock = String(status?.clock?.played || "").trim();
  const isoClock = playedClock.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);

  if (isoClock) {
    const hours = safeNumber(isoClock[1], 0);
    const minutes = safeNumber(isoClock[2], 0);
    const seconds = safeNumber(isoClock[3], 0);
    return hours * 60 + minutes + (seconds >= 30 ? 1 : 0);
  }

  const classicClock = playedClock.match(/^(\d{1,3}):(\d{2})$/);

  if (classicClock) {
    return safeNumber(classicClock[1], 0);
  }

  const timelineMinutes = asArray(timeline)
    .map((entry) => safeNumber(entry?.match_time, -1))
    .filter((minute) => minute >= 0);

  return timelineMinutes.length ? Math.max(...timelineMinutes) : 0;
}

function getStateInfo(status = {}) {
  const normalizedStatus = normalizeLookupKey(status?.match_status || status?.status);

  if (!normalizedStatus || normalizedStatus === "not_started") {
    return { name: "Pre-match", shortName: "PRE" };
  }

  if (normalizedStatus.includes("halftime") || normalizedStatus === "pause") {
    return { name: "Intervallo", shortName: "HT" };
  }

  if (normalizedStatus.includes("ended") || normalizedStatus === "closed") {
    return { name: "Terminata", shortName: "FT" };
  }

  if (normalizedStatus.includes("overtime")) {
    return { name: "Supplementari", shortName: "ET" };
  }

  if (normalizedStatus.includes("penalty")) {
    return { name: "Rigori", shortName: "PEN" };
  }

  return { name: "In corso", shortName: "LIVE" };
}

function getSportEventContext(entry = {}) {
  return entry?.sport_event_context || entry?.sport_event?.sport_event_context || {};
}

function getSportEventConditions(entry = {}) {
  return entry?.sport_event_conditions || entry?.sport_event?.sport_event_conditions || {};
}

function getSportEventCoverageProperties(entry = {}) {
  return (
    entry?.coverage?.sport_event_properties ||
    entry?.sport_event?.coverage?.sport_event_properties ||
    {}
  );
}

function getCompetitionInfo(entry) {
  const context = getSportEventContext(entry);
  const firstGroup = asArray(context?.groups)[0] || null;

  return {
    league: context?.competition?.name || firstGroup?.name || "Sportradar",
    country: context?.category?.name || null,
    round:
      context?.round?.name ||
      (context?.round?.number ? `Round ${context.round.number}` : null),
    season: context?.season?.name || null,
  };
}

function getVenueInfo(sportEvent = {}) {
  const venue = sportEvent?.venue || {};
  const ground = venue?.ground || {};

  return {
    name: venue?.name || ground?.name || null,
    city:
      venue?.city_name || venue?.city || ground?.city_name || ground?.city || null,
  };
}

function getCompetitorStatistics(statistics = {}) {
  const totalsCompetitors = asArray(statistics?.totals?.competitors);

  if (totalsCompetitors.length > 0) {
    return getCompetitorsByQualifier(totalsCompetitors);
  }

  const periods = asArray(statistics?.periods);
  const latestPeriod = periods[periods.length - 1];

  return getCompetitorsByQualifier(asArray(latestPeriod?.competitors));
}

function buildEstimatedXg(teamStats = {}) {
  return roundTo(
    safeNumber(teamStats.shots_on_target) * 0.18 +
      safeNumber(teamStats.shots_off_target) * 0.06 +
      safeNumber(teamStats.chances_created) * 0.07 +
      safeNumber(teamStats.corner_kicks) * 0.03,
    2
  );
}

function buildLiveStats(summary, fallbackMatch = null) {
  const totals = getCompetitorStatistics(summary?.statistics);
  const homeStats = totals.home?.statistics || {};
  const awayStats = totals.away?.statistics || {};

  if (!Object.keys(homeStats).length && fallbackMatch?.stats) {
    return fallbackMatch.stats;
  }

  const homeShots =
    safeNumber(homeStats.shots_on_target) +
    safeNumber(homeStats.shots_off_target) +
    safeNumber(homeStats.shots_blocked);
  const awayShots =
    safeNumber(awayStats.shots_on_target) +
    safeNumber(awayStats.shots_off_target) +
    safeNumber(awayStats.shots_blocked);

  return {
    shots: { home: homeShots, away: awayShots },
    shotsOnTarget: {
      home: safeNumber(homeStats.shots_on_target),
      away: safeNumber(awayStats.shots_on_target),
    },
    corners: {
      home: safeNumber(homeStats.corner_kicks),
      away: safeNumber(awayStats.corner_kicks),
    },
    attacks: {
      home:
        safeNumber(homeStats.chances_created) * 5 +
        homeShots * 2 +
        safeNumber(homeStats.corner_kicks) * 2,
      away:
        safeNumber(awayStats.chances_created) * 5 +
        awayShots * 2 +
        safeNumber(awayStats.corner_kicks) * 2,
    },
    dangerousAttacks: {
      home:
        safeNumber(homeStats.chances_created) * 4 +
        safeNumber(homeStats.shots_on_target) * 3 +
        safeNumber(homeStats.corner_kicks),
      away:
        safeNumber(awayStats.chances_created) * 4 +
        safeNumber(awayStats.shots_on_target) * 3 +
        safeNumber(awayStats.corner_kicks),
    },
    possession: {
      home: safeNumber(homeStats.ball_possession, fallbackMatch?.stats?.possession?.home || 50),
      away: safeNumber(awayStats.ball_possession, fallbackMatch?.stats?.possession?.away || 50),
    },
    fouls: {
      home: safeNumber(homeStats.fouls),
      away: safeNumber(awayStats.fouls),
    },
    yellowCards: {
      home: safeNumber(homeStats.yellow_cards),
      away: safeNumber(awayStats.yellow_cards),
    },
    xgLive: {
      home: buildEstimatedXg(homeStats),
      away: buildEstimatedXg(awayStats),
    },
  };
}

function normalizeEventType(event = {}) {
  const key = normalizeLookupKey(
    event?.type || event?.description || event?.card_description || event?.status
  );

  if (key.includes("goal")) {
    return "goal";
  }

  if (key.includes("yellow")) {
    return "yellow";
  }

  if (key.includes("red")) {
    return "red";
  }

  if (key.includes("substitution") || key.includes("substituted")) {
    return "substitution";
  }

  if (
    key.includes("shot") ||
    key.includes("chance") ||
    key.includes("danger") ||
    key.includes("attack")
  ) {
    return "dangerous";
  }

  return null;
}

function pickEventPlayer(players = [], playerTypeKeywords = []) {
  return (
    players.find((player) => {
      const playerType = normalizeLookupKey(player?.type);
      return playerTypeKeywords.some((keyword) => playerType.includes(keyword));
    })?.name || null
  );
}

function normalizeTimelineEvent(event) {
  const type = normalizeEventType(event);

  if (!type) {
    return null;
  }

  const players = asArray(event?.players);
  const player =
    pickEventPlayer(players, ["scorer", "player", "shooter", "in"]) ||
    players[0]?.name ||
    null;
  const relatedPlayer =
    pickEventPlayer(players, ["assist", "substituted_out", "out", "goalkeeper"]) || null;

  return {
    id: String(event?.id || `${event?.time || "event"}:${type}`),
    minute: safeNumber(event?.match_time),
    type,
    typeLabel: EVENT_TYPE_LABELS[type],
    team: event?.competitor === "away" ? "away" : "home",
    player,
    relatedPlayer,
    period:
      event?.period_name ||
      (event?.period ? `${safeNumber(event.period)}° tempo` : null),
    result:
      typeof event?.home_score === "number" && typeof event?.away_score === "number"
        ? `${event.home_score}-${event.away_score}`
        : null,
    info: asArray(event?.commentaries)
      .map((commentary) => commentary?.text)
      .find(Boolean) || null,
  };
}

function buildLiveOdds(score, stats, minute, fallbackMatch = null) {
  if (fallbackMatch?.liveOdds) {
    return fallbackMatch.liveOdds;
  }

  const homePressure =
    stats.dangerousAttacks.home * 1.2 +
    stats.shotsOnTarget.home * 6 +
    (stats.possession.home - 50) * 0.4;
  const awayPressure =
    stats.dangerousAttacks.away * 1.2 +
    stats.shotsOnTarget.away * 6 +
    (stats.possession.away - 50) * 0.4;
  const scoreDelta = score.home - score.away;
  const drawProbability = Math.max(14, 34 - minute * 0.18 - Math.abs(scoreDelta) * 6);
  const homeProbability = Math.max(12, 34 + scoreDelta * 14 + (homePressure - awayPressure) * 0.35);
  const awayProbability = Math.max(10, 100 - homeProbability - drawProbability);
  const normalized = ensureProbabilitySum({
    home: Math.round(homeProbability),
    draw: Math.round(drawProbability),
    away: Math.round(Math.max(10, awayProbability)),
  });
  const goalProbability = Math.max(
    12,
    Math.min(
      88,
      28 + (stats.xgLive.home + stats.xgLive.away) * 18 + Math.max(homePressure, awayPressure) * 0.18
    )
  );

  return {
    over25: probabilityToOdds(Math.min(84, goalProbability + 8)),
    goal: probabilityToOdds(goalProbability),
    homeWin: probabilityToOdds(normalized.home),
    draw: probabilityToOdds(normalized.draw),
    awayWin: probabilityToOdds(normalized.away),
    nextGoalHome: probabilityToOdds(Math.min(84, 28 + homePressure * 0.65)),
    nextGoalAway: probabilityToOdds(Math.min(84, 28 + awayPressure * 0.65)),
  };
}

function buildDangerPackage(homeName, awayName, score, stats, minute, fallbackMatch = null) {
  if (fallbackMatch?.dangerIndex && fallbackMatch?.dangerMessage && fallbackMatch?.dangerHistory) {
    return {
      dangerIndex: fallbackMatch.dangerIndex,
      dangerMessage: fallbackMatch.dangerMessage,
      dangerHistory: fallbackMatch.dangerHistory,
    };
  }

  const homePressure =
    stats.dangerousAttacks.home * 1.25 +
    stats.shotsOnTarget.home * 6 +
    stats.corners.home * 2 +
    (stats.possession.home - 50);
  const awayPressure =
    stats.dangerousAttacks.away * 1.25 +
    stats.shotsOnTarget.away * 6 +
    stats.corners.away * 2 +
    (stats.possession.away - 50);

  const dominantTeam = homePressure >= awayPressure ? homeName : awayName;
  const dominantPressure = Math.max(homePressure, awayPressure);
  const dangerIndex = Math.min(
    95,
    Math.max(
      18,
      Math.round(
        22 + dominantPressure * 0.75 + Math.max(score.home, score.away) * 6 + minute * 0.15
      )
    )
  );

  let dangerMessage =
    "Partita ancora sotto controllo, senza un accumulo forte di pressione offensiva.";

  if (dangerIndex >= 70) {
    dangerMessage = `Alta pressione offensiva di ${dominantTeam}. Possibile episodio pesante nei prossimi minuti.`;
  } else if (dangerIndex >= 50) {
    dangerMessage = `${dominantTeam} sta aumentando volume e qualità degli attacchi rispetto all’avversaria.`;
  } else if (dangerIndex >= 35) {
    dangerMessage = `Fase di studio con picchi sporadici: ${dominantTeam} ha comunque un leggero vantaggio territoriale.`;
  }

  return {
    dangerIndex,
    dangerMessage,
    dangerHistory: Array.from({ length: 8 }, (_, index) =>
      Math.max(12, dangerIndex - (7 - index) * 4)
    ),
  };
}

function formatPositionLabel(position) {
  const normalizedPosition = normalizeLookupKey(position);

  if (normalizedPosition.includes("goal")) return "GK";
  if (normalizedPosition.includes("back")) return "DF";
  if (normalizedPosition.includes("mid")) return "CM";
  if (normalizedPosition.includes("wing")) return "WG";
  if (normalizedPosition.includes("forward") || normalizedPosition.includes("striker")) return "FW";
  return String(position || "--").toUpperCase().slice(0, 3);
}

function distributeRows(playerCount) {
  if (playerCount === 10) return [4, 3, 3];
  if (playerCount === 9) return [4, 3, 2];
  if (playerCount === 8) return [4, 4];
  if (playerCount === 7) return [3, 2, 2];

  const rows = [0, 0, 0];
  for (let index = 0; index < playerCount; index += 1) {
    rows[index % rows.length] += 1;
  }
  return rows.filter(Boolean);
}

function parseFormationRows(formationType, outfieldPlayersCount) {
  const explicitRows = String(formationType || "")
    .split("-")
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part) && part > 0);

  if (explicitRows.reduce((total, value) => total + value, 0) === outfieldPlayersCount) {
    return explicitRows;
  }

  return distributeRows(outfieldPlayersCount);
}

function mapFormationPlayers(players = [], formationType = "--") {
  const sortedPlayers = [...players].sort(
    (left, right) => safeNumber(left?.order, 99) - safeNumber(right?.order, 99)
  );
  const goalkeeperIndex = sortedPlayers.findIndex((player) =>
    normalizeLookupKey(player?.position || player?.type).includes("goal")
  );

  const goalkeeper =
    goalkeeperIndex >= 0 ? sortedPlayers.splice(goalkeeperIndex, 1)[0] : sortedPlayers.shift();
  const rows = parseFormationRows(formationType, sortedPlayers.length);
  const yCoordinates = [88, 72, 56, 40, 24];
  const mappedPlayers = [];

  if (goalkeeper) {
    mappedPlayers.push({
      id: goalkeeper.id,
      name: goalkeeper.name,
      number: safeNumber(goalkeeper.jersey_number),
      pos: formatPositionLabel(goalkeeper.position || goalkeeper.type),
      position: goalkeeper.position || goalkeeper.type,
      status: goalkeeper.played === false ? "probabile" : "confermato",
      x: 50,
      y: 88,
    });
  }

  let offset = 0;
  rows.forEach((rowSize, rowIndex) => {
    const rowPlayers = sortedPlayers.slice(offset, offset + rowSize);
    offset += rowSize;

    rowPlayers.forEach((player, index) => {
      mappedPlayers.push({
        id: player.id,
        name: player.name,
        number: safeNumber(player.jersey_number),
        pos: formatPositionLabel(player.position || player.type),
        position: player.position || player.type,
        status: player.played === false ? "probabile" : "confermato",
        x: roundTo(10 + ((index + 1) * 80) / (rowSize + 1), 2),
        y: yCoordinates[rowIndex] || 24,
      });
    });
  });

  return mappedPlayers;
}

function buildLineups(lineupsResponse) {
  const competitors = getCompetitorsByQualifier(asArray(lineupsResponse?.lineups?.competitors));

  return {
    home: competitors.home
      ? {
          formation: competitors.home?.formation?.type || "--",
          players: mapFormationPlayers(
            asArray(competitors.home?.players).filter((player) => player?.starter !== false),
            competitors.home?.formation?.type
          ),
        }
      : { formation: "--", players: [] },
    away: competitors.away
      ? {
          formation: competitors.away?.formation?.type || "--",
          players: mapFormationPlayers(
            asArray(competitors.away?.players).filter((player) => player?.starter !== false),
            competitors.away?.formation?.type
          ),
        }
      : { formation: "--", players: [] },
  };
}

function buildCoverageSummary(entry = {}) {
  const coverage = getSportEventCoverageProperties(entry);
  const hasExtendedPlayByPlay = Boolean(
    coverage?.deeper_play_by_play || coverage?.extended_play_by_play
  );
  const hasDeeperTeamStats = Boolean(
    coverage?.deeper_team_stats || coverage?.extended_team_stats
  );
  const hasDeeperPlayerStats = Boolean(
    coverage?.deeper_player_stats || coverage?.extended_player_stats
  );

  return {
    hasLineups: Boolean(coverage?.lineups),
    hasFormations: Boolean(coverage?.formations),
    hasVenue: Boolean(coverage?.venue),
    hasBasicTeamStats: Boolean(coverage?.basic_team_stats),
    hasBasicPlayerStats: Boolean(coverage?.basic_player_stats),
    hasDeeperTeamStats,
    hasDeeperPlayerStats,
    hasExtendedPlayByPlay,
    lineupsAvailability: coverage?.lineups_availability || null,
    scoresMode: coverage?.scores || null,
    coverageScore: [
      coverage?.lineups,
      coverage?.formations,
      coverage?.basic_team_stats,
      coverage?.basic_player_stats,
      hasDeeperTeamStats,
      hasDeeperPlayerStats,
      hasExtendedPlayByPlay,
      coverage?.venue,
    ].filter(Boolean).length,
  };
}

function getLineupConfirmationFromConditions(source = {}) {
  const confirmed = getSportEventConditions(source)?.lineups?.confirmed;
  return typeof confirmed === "boolean" ? confirmed : null;
}

function getProviderLineupStatus(source = {}, hasPlayers = false) {
  const lineupConfirmed = getLineupConfirmationFromConditions(source);

  if (lineupConfirmed === true) {
    return "official";
  }

  if (lineupConfirmed === false || hasPlayers) {
    return "probable";
  }

  return "unknown";
}

function buildCoaches(lineupsResponse) {
  const competitors = getCompetitorsByQualifier(asArray(lineupsResponse?.lineups?.competitors));

  return {
    home: competitors.home?.manager
      ? {
          id: competitors.home.manager.id,
          name: competitors.home.manager.name,
        }
      : null,
    away: competitors.away?.manager
      ? {
          id: competitors.away.manager.id,
          name: competitors.away.manager.name,
        }
      : null,
  };
}

function getPlayerFormLabel(playerStats = {}, fallbackPlayer = null) {
  if (fallbackPlayer?.form) {
    return fallbackPlayer.form;
  }

  const impactScore =
    safeNumber(playerStats.goals_scored) * 4 +
    safeNumber(playerStats.assists) * 2 +
    safeNumber(playerStats.shots_on_target) * 1.2 +
    safeNumber(playerStats.chances_created);

  if (impactScore >= 7) return "Eccellente";
  if (impactScore >= 4) return "Ottima";
  return "Buona";
}

function buildPlayerFormHistory(playerStats = {}, fallbackPlayer = null) {
  if (Array.isArray(fallbackPlayer?.formHistory) && fallbackPlayer.formHistory.length > 0) {
    return fallbackPlayer.formHistory;
  }

  const base = safeNumber(playerStats.goals_scored) + safeNumber(playerStats.assists);
  return [0, 1, 0, 1, 0].map((value, index) =>
    Math.max(0, Math.round(base + value + (index === 4 ? safeNumber(playerStats.shots_on_target) / 2 : 0)))
  );
}

function buildPlayerInsight(playerName, playerStats = {}, competitorName) {
  const goals = safeNumber(playerStats.goals_scored);
  const assists = safeNumber(playerStats.assists);
  const shotsOnTarget = safeNumber(playerStats.shots_on_target);

  if (goals > 0) {
    return `${playerName} ha già lasciato il segno per ${competitorName} con un impatto diretto sul punteggio.`;
  }

  if (shotsOnTarget >= 2 || assists >= 1) {
    return `${playerName} è tra i profili più coinvolti nella produzione offensiva di ${competitorName}.`;
  }

  return `${playerName} sta offrendo un contributo ordinato nelle fasi di possesso e transizione.`;
}

function buildPlayerProfiles(competitorsByQualifier, fallbackPlayers = []) {
  return ["home", "away"].flatMap((qualifier) => {
    const competitor = competitorsByQualifier[qualifier];

    return asArray(competitor?.players).map((player) => {
      const playerStats = player?.statistics || {};
      const fallbackPlayer = findFallbackPlayer(player?.name, fallbackPlayers);
      const shots =
        safeNumber(playerStats.shots_on_target) +
        safeNumber(playerStats.shots_off_target) +
        safeNumber(playerStats.shots_blocked);
      const xg = roundTo(
        safeNumber(playerStats.goals_scored) * 0.62 +
          shots * 0.08 +
          safeNumber(playerStats.chances_created) * 0.05,
        2
      );
      const scorerProb = Math.min(
        78,
        Math.max(6, Math.round(10 + xg * 28 + safeNumber(playerStats.shots_on_target) * 6))
      );

      return {
        id: player?.id || fallbackPlayer?.id || `${competitor?.id}:${player?.name}`,
        name: player?.name || fallbackPlayer?.name || "Giocatore",
        number: safeNumber(player?.jersey_number, fallbackPlayer?.number || 0),
        team: competitor?.name || fallbackPlayer?.team || "--",
        pos: formatPositionLabel(player?.position || player?.type || fallbackPlayer?.position),
        position: player?.position || player?.type || fallbackPlayer?.position || "--",
        xg: xg || fallbackPlayer?.xg || 0,
        shots: shots || fallbackPlayer?.shots || 0,
        form: getPlayerFormLabel(playerStats, fallbackPlayer),
        goals: safeNumber(playerStats.goals_scored, fallbackPlayer?.goals || 0),
        assists: safeNumber(playerStats.assists, fallbackPlayer?.assists || 0),
        fouls: safeNumber(playerStats.fouls_committed, fallbackPlayer?.fouls || 0),
        minutes: safeNumber(playerStats.minutes_played, fallbackPlayer?.minutes || 0),
        formHistory: buildPlayerFormHistory(playerStats, fallbackPlayer),
        insight: fallbackPlayer?.insight || buildPlayerInsight(player?.name, playerStats, competitor?.name),
        scorerOdds: fallbackPlayer?.scorerOdds || probabilityToOdds(scorerProb),
        scorerProb: fallbackPlayer?.scorerProb || scorerProb,
      };
    });
  });
}

function buildImpactPlayers(playerProfiles = []) {
  return [...playerProfiles]
    .sort(
      (left, right) =>
        right.xg - left.xg || right.shots - left.shots || right.scorerProb - left.scorerProb
    )
    .slice(0, 5)
    .map((player) => ({
      name: player.name,
      odds: player.scorerOdds,
      prob: player.scorerProb,
      xg: player.xg,
    }));
}

function buildMetadata(bundle) {
  const timeline = bundle?.timeline || {};
  const context = getSportEventContext(timeline);
  const status = timeline?.sport_event_status || {};
  const coverage = getSportEventCoverageProperties(timeline);
  const hasExtendedCoverage = Boolean(
    coverage?.deeper_play_by_play || coverage?.extended_play_by_play
  );

  return [
    {
      id: "round",
      code: "round",
      label: "Round",
      value: context?.round?.name || (context?.round?.number ? `Round ${context.round.number}` : null),
    },
    {
      id: "season",
      code: "season",
      label: "Stagione",
      value: context?.season?.name || null,
    },
    {
      id: "coverage",
      code: "coverage",
      label: "Coverage",
      value: hasExtendedCoverage ? "Extended live" : "Basic live",
    },
    {
      id: "status",
      code: "status",
      label: "Status feed",
      value: status?.match_status || status?.status || null,
    },
  ].filter((entry) => entry.value);
}

function buildH2h(fallbackMatch = null) {
  return Array.isArray(fallbackMatch?.h2h) ? fallbackMatch.h2h : [];
}

function pickProbabilityValue(outcomes = [], keywords = []) {
  const normalizedKeywords = keywords.map(normalizeLookupKey);

  const outcome = asArray(outcomes).find((candidate) => {
    const values = [
      candidate?.name,
      candidate?.id,
      candidate?.type,
      candidate?.competitor,
      candidate?.description,
    ]
      .map(normalizeLookupKey)
      .filter(Boolean);

    return normalizedKeywords.some((keyword) =>
      values.some((value) => value.includes(keyword))
    );
  });

  return safeNumber(
    outcome?.probability ?? outcome?.value ?? outcome?.percentage,
    0
  );
}

function normalizeProbabilityMarket(markets = []) {
  const market =
    asArray(markets).find((candidate) => {
      const name = normalizeLookupKey(candidate?.name || candidate?.id);
      return (
        name.includes("3way") ||
        name.includes("1x2") ||
        name.includes("match_result") ||
        name.includes("winner")
      );
    }) || asArray(markets)[0];

  if (!market) {
    return null;
  }

  const outcomes = asArray(market?.outcomes);
  const home = pickProbabilityValue(outcomes, [
    "home",
    "home_team_winner",
    "competitor1",
  ]);
  const draw = pickProbabilityValue(outcomes, ["draw", "tie", "x"]);
  const away = pickProbabilityValue(outcomes, [
    "away",
    "away_team_winner",
    "competitor2",
  ]);

  if (!home && !draw && !away) {
    return null;
  }

  const probabilities = ensureProbabilitySum({
    home: Math.round(home),
    draw: Math.round(draw),
    away: Math.round(away),
  });

  return {
    prob: probabilities,
    odds: {
      home: probabilityToOdds(probabilities.home),
      draw: probabilityToOdds(probabilities.draw),
      away: probabilityToOdds(probabilities.away),
    },
  };
}

function extractLiveProbabilityEntries(payload = {}) {
  const candidates = [
    payload?.sport_event_probabilities,
    payload?.live_probabilities,
    payload?.sport_events,
    payload?.schedules,
  ];

  return candidates.find(Array.isArray) || [];
}

function getProbabilitySportEventId(entry = {}) {
  return (
    entry?.sport_event?.id ||
    entry?.id ||
    entry?.sport_event_id ||
    entry?.sportevent?.id ||
    null
  );
}

export function buildLiveProbabilityMap(payload = {}) {
  const entries = extractLiveProbabilityEntries(payload);
  const probabilityMap = new Map();

  entries.forEach((entry) => {
    const sportEventId = getProbabilitySportEventId(entry);
    const normalizedMarket = normalizeProbabilityMarket(entry?.markets);

    if (sportEventId && normalizedMarket) {
      probabilityMap.set(sportEventId, normalizedMarket);
    }
  });

  return probabilityMap;
}

function buildFuturesTrend(bestOdds, openOdds) {
  if (!bestOdds || !openOdds) {
    return "flat";
  }

  if (bestOdds < openOdds) {
    return "down";
  }

  if (bestOdds > openOdds) {
    return "up";
  }

  return "flat";
}

function buildFuturesOutcomes(books = []) {
  const map = new Map();

  asArray(books).forEach((book) => {
    asArray(book?.outcomes).forEach((outcome) => {
      const key =
        outcome?.competitor_id ||
        outcome?.id ||
        outcome?.name ||
        outcome?.competitor_name;

      if (!key) {
        return;
      }

      const odds = safeNumber(outcome?.odds_decimal);
      const openOdds = safeNumber(outcome?.open_odds_decimal);
      const existing = map.get(key);
      const bookEntry = {
        name: book?.name || "Bookmaker",
        odds,
        openOdds,
        removed: Boolean(book?.removed || outcome?.removed),
      };

      if (!existing) {
        map.set(key, {
          id: outcome?.competitor_id || outcome?.id || String(key),
          name:
            outcome?.competitor_name ||
            outcome?.name ||
            outcome?.type ||
            "Esito",
          bestOdds: odds,
          openOdds,
          removed: Boolean(outcome?.removed),
          books: [bookEntry],
        });
        return;
      }

      existing.books.push(bookEntry);
      existing.removed = existing.removed && Boolean(outcome?.removed);

      if (!existing.bestOdds || (odds && odds > existing.bestOdds)) {
        existing.bestOdds = odds;
      }

      if (!existing.openOdds && openOdds) {
        existing.openOdds = openOdds;
      }
    });
  });

  return Array.from(map.values())
    .map((outcome) => ({
      ...outcome,
      impliedProbability: outcome.bestOdds
        ? roundTo(100 / outcome.bestOdds, 1)
        : 0,
      trend: buildFuturesTrend(outcome.bestOdds, outcome.openOdds),
    }))
    .sort((left, right) => {
      const leftOdds = left.bestOdds || Number.POSITIVE_INFINITY;
      const rightOdds = right.bestOdds || Number.POSITIVE_INFINITY;
      return leftOdds - rightOdds;
    });
}

export function normalizeSportradarOddsCompetition(competition = {}) {
  return {
    id: competition?.id || null,
    name: competition?.name || "Competizione",
  };
}

export function normalizeSportradarFuturesMarket(market = {}) {
  const books = asArray(market?.books);

  return {
    id: market?.id || market?.name || crypto.randomUUID(),
    name: market?.name || "Futures market",
    isLive: Boolean(market?.is_live),
    booksCount: books.length,
    outcomes: buildFuturesOutcomes(books).slice(0, 8),
  };
}

export async function fetchSportradarOddsCompetitions(
  sportId = SPORTRADAR_DEFAULT_SOCCER_SPORT_ID
) {
  return fetchSportradarOddsJson(
    `/sports/${encodeURIComponent(sportId)}/competitions`
  );
}

export async function fetchSportradarCompetitionFutures(competitionId) {
  if (!competitionId) {
    throw new Error("competitionId mancante per il feed futures.");
  }

  return fetchSportradarOddsJson(
    `/competitions/${encodeURIComponent(competitionId)}/futures`
  );
}

function buildBadges(matchStatus, sourceLabel, fallbackMatch = null) {
  const badges = Array.isArray(fallbackMatch?.badges) ? [...fallbackMatch.badges] : [];

  if (!badges.includes(sourceLabel)) {
    badges.push(sourceLabel);
  }

  if (matchStatus?.shortName && !badges.includes(matchStatus.shortName)) {
    badges.push(matchStatus.shortName);
  }

  return badges.slice(0, 4);
}

export async function fetchSportradarLiveData() {
  const sdk = getSportradarClient();
  const params = getRequestParams();
  const [timelinesResult, summariesResult] = await Promise.allSettled([
    sdk.soccerLiveTimelines(params),
    sdk.soccerLiveSummaries(params),
  ]);

  const timelines =
    timelinesResult.status === "fulfilled"
      ? asArray(timelinesResult.value?.data?.sport_event_timelines)
      : [];
  const summaries =
    summariesResult.status === "fulfilled"
      ? asArray(summariesResult.value?.data?.summaries)
      : [];

  if (!timelines.length && !summaries.length) {
    const preferredError =
      timelinesResult.status === "rejected" ? timelinesResult.reason : summariesResult.reason;
    throw buildSdkError(preferredError, "Impossibile recuperare i live feed Sportradar.");
  }

  return {
    generatedAt:
      timelinesResult.status === "fulfilled"
        ? timelinesResult.value?.data?.generated_at
        : summariesResult.status === "fulfilled"
          ? summariesResult.value?.data?.generated_at
          : null,
    timelines,
    summaries,
  };
}

export async function fetchSportradarLiveProbabilities() {
  return fetchSportradarProbabilitiesJson("/schedules/live/probabilities");
}

export async function fetchSportradarSportEventBundle(sportEventId) {
  const sdk = getSportradarClient();
  const params = getRequestParams({ sport_event_id: sportEventId });
  const [timelineResult, lineupsResult] = await Promise.allSettled([
    sdk.soccerSportEventTimeline(params),
    sdk.soccerSportEventLineups(params),
  ]);

  const timelineData = timelineResult.status === "fulfilled" ? timelineResult.value?.data : null;
  const lineupsData = lineupsResult.status === "fulfilled" ? lineupsResult.value?.data : null;

  if (!timelineData && !lineupsData) {
    const preferredError =
      timelineResult.status === "rejected" ? timelineResult.reason : lineupsResult.reason;
    throw buildSdkError(preferredError, "Impossibile recuperare il match da Sportradar.");
  }

  return {
    timeline: timelineData,
    lineups: lineupsData,
  };
}

export async function fetchSportradarScheduleWindow(days = SPORTRADAR_DEFAULT_SCHEDULE_DAYS) {
  const sdk = getSportradarClient();
  const dateWindow = buildDateWindow(clampInteger(days, SPORTRADAR_DEFAULT_SCHEDULE_DAYS, 1, 7));
  const responses = await Promise.allSettled(
    dateWindow.map((date) => sdk.soccerDailySchedules(getRequestParams({ date })))
  );

  const schedules = responses.flatMap((result, index) => {
    if (result.status !== "fulfilled") {
      return [];
    }

    return asArray(result.value?.data?.schedules).map((entry) => ({
      date: dateWindow[index],
      schedule: entry,
    }));
  });

  if (schedules.length === 0) {
    const firstRejected = responses.find((result) => result.status === "rejected");
    throw buildSdkError(firstRejected?.reason, "Impossibile recuperare il calendario da Sportradar.");
  }

  return {
    window: {
      from: dateWindow[0],
      to: dateWindow[dateWindow.length - 1],
      days: dateWindow.length,
    },
    schedules,
  };
}

export function normalizeSportradarLiveMatch(summary, timelineFeed, fallbackLiveMatches = []) {
  const sportEvent = summary?.sport_event || {};
  const competitors = getCompetitorsByQualifier(asArray(sportEvent?.competitors));
  const homeTeam = competitors.home;
  const awayTeam = competitors.away;

  if (!sportEvent?.id && !timelineFeed?.id) {
    return null;
  }

  const fallbackMatch = findFallbackMatch(homeTeam?.name, awayTeam?.name, fallbackLiveMatches);
  const info = getCompetitionInfo(sportEvent);
  const matchState = getStateInfo(summary?.sport_event_status || timelineFeed?.sport_event_status);
  const score = {
    home: safeNumber(summary?.sport_event_status?.home_score, fallbackMatch?.homeScore || 0),
    away: safeNumber(summary?.sport_event_status?.away_score, fallbackMatch?.awayScore || 0),
  };
  const timelineEvents = asArray(timelineFeed?.timeline)
    .map(normalizeTimelineEvent)
    .filter(Boolean)
    .slice(-8);
  const minute = getMinuteFromTimeline(
    summary?.sport_event_status || timelineFeed?.sport_event_status,
    timelineFeed?.timeline
  );
  const stats = buildLiveStats(summary, fallbackMatch);
  const danger = buildDangerPackage(
    homeTeam?.name || fallbackMatch?.home || "Home",
    awayTeam?.name || fallbackMatch?.away || "Away",
    score,
    stats,
    minute,
    fallbackMatch
  );
  const lineupConfirmed =
    getLineupConfirmationFromConditions(summary) ??
    getLineupConfirmationFromConditions(timelineFeed);
  const coverage = buildCoverageSummary(summary || timelineFeed);

  return {
    id: sportEvent?.id || timelineFeed?.id,
    sportEventId: sportEvent?.id || timelineFeed?.id,
    home: homeTeam?.name || fallbackMatch?.home || "Home",
    homeShort: formatShortCode(homeTeam) || fallbackMatch?.homeShort || "HOM",
    away: awayTeam?.name || fallbackMatch?.away || "Away",
    awayShort: formatShortCode(awayTeam) || fallbackMatch?.awayShort || "AWA",
    homeScore: score.home,
    awayScore: score.away,
    minute: minute || fallbackMatch?.minute || 0,
    league: info.league || fallbackMatch?.league || "Sportradar",
    country: info.country || fallbackMatch?.country || null,
    round: info.round || fallbackMatch?.round || null,
    state: matchState.name,
    coverage,
    stats,
    liveOdds: buildLiveOdds(score, stats, minute, fallbackMatch),
    dangerIndex: danger.dangerIndex,
    dangerMessage: danger.dangerMessage,
    dangerHistory: danger.dangerHistory,
    events: timelineEvents.length > 0 ? timelineEvents : fallbackMatch?.events || [],
    lineup_status: getProviderLineupStatus(
      summary || timelineFeed,
      Boolean(fallbackMatch?.lineup_status && fallbackMatch.lineup_status !== "unknown")
    ),
    lineupConfirmed,
    apiLoaded: true,
  };
}

export function mergeLiveMatchWithProbabilities(match, probabilityEntry) {
  if (!probabilityEntry) {
    return match;
  }

  return {
    ...match,
    liveProbabilities: probabilityEntry.prob,
    liveOdds: {
      ...match.liveOdds,
      homeWin: probabilityEntry.odds.home || match.liveOdds?.homeWin || 0,
      draw: probabilityEntry.odds.draw || match.liveOdds?.draw || 0,
      awayWin: probabilityEntry.odds.away || match.liveOdds?.awayWin || 0,
    },
  };
}

export function normalizeSportradarScheduleMatch(scheduleItem, fallbackMatch = null) {
  const schedule = scheduleItem?.schedule || scheduleItem;
  const sportEvent = schedule?.sport_event || {};
  const competitors = getCompetitorsByQualifier(asArray(sportEvent?.competitors));
  const homeTeam = competitors.home;
  const awayTeam = competitors.away;
  const kickoff = formatKickoff(sportEvent?.start_time);
  const matchState = getStateInfo(schedule?.sport_event_status);
  const homeForm = buildFormArray(homeTeam?.form, fallbackMatch?.homeForm || DEFAULT_FORM);
  const awayForm = buildFormArray(awayTeam?.form, fallbackMatch?.awayForm || DEFAULT_FORM);
  const model = buildModelBlock(homeForm, awayForm);
  const info = getCompetitionInfo(sportEvent);
  const coverage = buildCoverageSummary(sportEvent);

  return {
    id: sportEvent?.id || fallbackMatch?.id || `${homeTeam?.id || "home"}:${awayTeam?.id || "away"}`,
    sportEventId: sportEvent?.id || null,
    home: homeTeam?.name || fallbackMatch?.home || "Home",
    homeShort: formatShortCode(homeTeam) || fallbackMatch?.homeShort || "HOM",
    away: awayTeam?.name || fallbackMatch?.away || "Away",
    awayShort: formatShortCode(awayTeam) || fallbackMatch?.awayShort || "AWA",
    league: info.league || fallbackMatch?.league || "Sportradar",
    leagueShort: fallbackMatch?.leagueShort || "SR",
    country: info.country || null,
    round: info.round || null,
    date: kickoff.date,
    time: kickoff.time,
    status: getRelativeStatus(sportEvent?.start_time),
    state: matchState,
    coverage,
    prob: model.prob,
    odds: model.odds,
    ou: model.ou,
    gg: model.gg,
    xg: model.xg,
    valueBet: model.valueBet,
    scores: model.scores,
    confidence: model.confidence,
    scorers: [],
    bookmakers: [],
    homeForm,
    awayForm,
    h2h: buildH2h(fallbackMatch),
    badges: buildBadges(matchState, "Feed Sportradar", fallbackMatch),
    injuries: Array.isArray(fallbackMatch?.injuries) ? fallbackMatch.injuries : [],
    venue: getVenueInfo(sportEvent),
    apiLoaded: true,
  };
}

export function normalizeSportradarFixture(bundle, fallbackMatch = null, fallbackPlayers = []) {
  const timelineResponse = bundle?.timeline || {};
  const lineupsResponse = bundle?.lineups || {};
  const sportEvent = timelineResponse?.sport_event || {};
  const competitors = getCompetitorsByQualifier(asArray(sportEvent?.competitors));
  const homeTeam = competitors.home;
  const awayTeam = competitors.away;
  const kickoff = formatKickoff(sportEvent?.start_time);
  const matchState = getStateInfo(timelineResponse?.sport_event_status);
  const liveScoreAvailable = matchState.shortName !== "PRE";
  const score = {
    home: safeNumber(timelineResponse?.sport_event_status?.home_score),
    away: safeNumber(timelineResponse?.sport_event_status?.away_score),
  };
  const info = getCompetitionInfo(sportEvent);
  const lineups = buildLineups(lineupsResponse);
  const coaches = buildCoaches(lineupsResponse);
  const totals = getCompetitorStatistics(timelineResponse?.statistics);
  const homeForm = buildFormArray(homeTeam?.form, fallbackMatch?.homeForm || DEFAULT_FORM);
  const awayForm = buildFormArray(awayTeam?.form, fallbackMatch?.awayForm || DEFAULT_FORM);
  const model = buildModelBlock(homeForm, awayForm);
  const playerProfiles = buildPlayerProfiles(totals, fallbackPlayers);
  const timelineEvents = asArray(timelineResponse?.timeline)
    .map(normalizeTimelineEvent)
    .filter(Boolean)
    .slice(-12);
  const lineupConfirmed =
    getLineupConfirmationFromConditions(timelineResponse) ??
    getLineupConfirmationFromConditions(lineupsResponse);
  const hasLineupPlayers =
    lineups.home.players.length > 0 || lineups.away.players.length > 0;
  const coverage = buildCoverageSummary(sportEvent);

  return {
    id: sportEvent?.id || fallbackMatch?.id || "sportradar-match",
    sportEventId: sportEvent?.id || null,
    home: homeTeam?.name || fallbackMatch?.home || "Home",
    homeShort: formatShortCode(homeTeam) || fallbackMatch?.homeShort || "HOM",
    away: awayTeam?.name || fallbackMatch?.away || "Away",
    awayShort: formatShortCode(awayTeam) || fallbackMatch?.awayShort || "AWA",
    league: info.league || fallbackMatch?.league || "Sportradar",
    country: info.country || null,
    round: info.round || null,
    date: kickoff.date,
    time: kickoff.time,
    state: matchState,
    coverage,
    currentScore: liveScoreAvailable ? score : null,
    prob: fallbackMatch?.prob || model.prob,
    odds: fallbackMatch?.odds || model.odds,
    ou: fallbackMatch?.ou || model.ou,
    gg: fallbackMatch?.gg || model.gg,
    xg: {
      home:
        buildEstimatedXg(totals.home?.statistics || {}) || fallbackMatch?.xg?.home || model.xg.home,
      away:
        buildEstimatedXg(totals.away?.statistics || {}) || fallbackMatch?.xg?.away || model.xg.away,
    },
    valueBet: fallbackMatch?.valueBet || model.valueBet,
    scores: fallbackMatch?.scores?.length ? fallbackMatch.scores : model.scores,
    confidence: fallbackMatch?.confidence || model.confidence,
    scorers: buildImpactPlayers(playerProfiles),
    bookmakers: fallbackMatch?.bookmakers || [],
    homeForm,
    awayForm,
    h2h: buildH2h(fallbackMatch),
    badges: buildBadges(matchState, "Feed Sportradar", fallbackMatch),
    injuries: Array.isArray(fallbackMatch?.injuries) ? fallbackMatch.injuries : [],
    events: timelineEvents,
    lineups,
    players: playerProfiles,
    venue: getVenueInfo(sportEvent),
    coaches,
    metadata: buildMetadata(bundle),
    lineup_status: getProviderLineupStatus(timelineResponse, hasLineupPlayers),
    lineupConfirmed,
    apiLoaded: true,
  };
}
