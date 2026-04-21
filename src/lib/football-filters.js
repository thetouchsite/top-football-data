import { getCompetitionConfig } from "@/lib/competitions/catalog";
import { SPORTMONKS_PRIORITY_LEAGUE_IDS } from "@/lib/sportmonks-priority-league-ids";
import { getMatchValueCandidate } from "@/lib/match-value";

const ROME_TZ = "Europe/Rome";

function buildDateKeyRome(date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: ROME_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

const LEAGUE_BUCKETS = [
  { label: "Serie A", keywords: ["serie a"] },
  { label: "Premier League", keywords: ["premier league"] },
  { label: "Champions League", keywords: ["champions league", "uefa champions league"] },
  { label: "La Liga", keywords: ["la liga", "laliga"] },
  { label: "Bundesliga", keywords: ["bundesliga"] },
];

const STATUS_BUCKETS = new Set(["today", "tomorrow", "weekend", "upcoming"]);
const COMPETITION_TIER_RANK = {
  top: 0,
  uefa: 1,
  nationalteams: 2,
  "national-teams": 2,
  step2: 3,
  "italia-pro": 4,
  sudamerica: 5,
  unsupported: 9,
};

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function getLeagueBucket(league) {
  const normalizedLeague = normalizeText(league);
  const bucket = LEAGUE_BUCKETS.find(({ keywords }) =>
    keywords.some((keyword) => normalizedLeague.includes(keyword))
  );

  return bucket?.label || league || "Altro";
}

export function matchLeagueFilter(match, selectedLeague) {
  if (!selectedLeague || selectedLeague === "all" || selectedLeague === "Tutti") {
    return true;
  }

  const catalogName = getCompetitionConfig(match?.league).name;
  if (catalogName === selectedLeague) {
    return true;
  }

  return getLeagueBucket(match?.league) === selectedLeague;
}

export function getMatchStatusBucket(match) {
  const explicitStatus = String(match?.status || "").trim().toLowerCase();

  if (STATUS_BUCKETS.has(explicitStatus)) {
    return explicitStatus;
  }

  const iso = match?.kickoff_at;
  if (iso) {
    const eventDate = new Date(iso);
    if (!Number.isNaN(eventDate.getTime())) {
      const eventKey = buildDateKeyRome(eventDate);
      const now = new Date();
      const todayKey = buildDateKeyRome(now);
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowKey = buildDateKeyRome(tomorrow);

      if (eventKey === todayKey) {
        return "today";
      }
      if (eventKey === tomorrowKey) {
        return "tomorrow";
      }

      const weekday = new Intl.DateTimeFormat("en-US", {
        timeZone: ROME_TZ,
        weekday: "short",
      }).format(eventDate);
      if (weekday === "Sat" || weekday === "Sun") {
        return "weekend";
      }

      return "upcoming";
    }
  }

  const normalizedDate = normalizeText(match?.date);

  if (normalizedDate.includes("oggi")) {
    return "today";
  }

  if (normalizedDate.includes("domani")) {
    return "tomorrow";
  }

  if (
    normalizedDate.includes("sab") ||
    normalizedDate.includes("dom") ||
    normalizedDate.includes("sat") ||
    normalizedDate.includes("sun")
  ) {
    return "weekend";
  }

  return "upcoming";
}

function getStatusRank(status) {
  if (status === "today") return 0;
  if (status === "tomorrow") return 1;
  if (status === "weekend") return 2;
  return 3;
}

function getTimeRank(timeValue) {
  const match = String(timeValue || "").match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function getStatePriority(match) {
  const shortName = String(match?.state?.shortName || match?.state || "")
    .trim()
    .toUpperCase();

  if (shortName === "LIVE") return 0;
  if (shortName === "HT") return 1;
  if (shortName === "ET" || shortName === "PEN") return 2;
  if (getMatchStatusBucket(match) === "today") return 3;
  if (shortName === "PRE") return 4;
  if (getMatchStatusBucket(match) === "tomorrow") return 5;
  if (getMatchStatusBucket(match) === "weekend") return 6;
  if (shortName === "FT") return 8;
  return 7;
}

function getCompetitionTierPriority(match) {
  const tier = normalizeText(match?.competition?.tier);
  return COMPETITION_TIER_RANK[tier] ?? 7;
}

function getCoveragePriority(match) {
  return Number(match?.coverage?.coverageScore || 0);
}

function competitionNameSortKey(match) {
  return getCompetitionConfig(match?.league).name || "";
}

function totalXg(match) {
  const h = Number(match?.xg?.home);
  const a = Number(match?.xg?.away);
  const sum = (Number.isFinite(h) ? h : 0) + (Number.isFinite(a) ? a : 0);
  return sum;
}

function kickoffTimeMs(match) {
  const iso = match?.kickoff_at;
  if (iso) {
    const t = new Date(iso).getTime();
    if (!Number.isNaN(t)) {
      return t;
    }
  }
  return getTimeRank(match?.time);
}

export function sortMatchesByCriterion(matches, criterion) {
  const safeMatches = Array.isArray(matches) ? [...matches] : [];

  if (criterion === "featured") {
    return sortMatchesByFeaturedPriority(safeMatches);
  }

  if (criterion === "confidence") {
    return safeMatches.sort((left, right) => (right.confidence || 0) - (left.confidence || 0));
  }

  if (criterion === "odds") {
    return safeMatches.sort((left, right) => (right.odds?.home || 0) - (left.odds?.home || 0));
  }

  if (criterion === "odds_away") {
    return safeMatches.sort((left, right) => (right.odds?.away || 0) - (left.odds?.away || 0));
  }

  if (criterion === "xg") {
    return safeMatches.sort((left, right) => totalXg(right) - totalXg(left));
  }

  if (criterion === "value") {
    return safeMatches.sort((left, right) => {
      const re = getMatchValueCandidate(right)?.edge ?? 0;
      const le = getMatchValueCandidate(left)?.edge ?? 0;
      return re - le;
    });
  }

  if (criterion === "league_az") {
    return safeMatches.sort((left, right) =>
      competitionNameSortKey(left).localeCompare(competitionNameSortKey(right), "it", { sensitivity: "base" })
    );
  }

  if (criterion === "league_za") {
    return safeMatches.sort((left, right) =>
      competitionNameSortKey(right).localeCompare(competitionNameSortKey(left), "it", { sensitivity: "base" })
    );
  }

  return safeMatches.sort((left, right) => {
    const statusDifference =
      getStatusRank(getMatchStatusBucket(left)) - getStatusRank(getMatchStatusBucket(right));

    if (statusDifference !== 0) {
      return statusDifference;
    }

    const timeA = kickoffTimeMs(left);
    const timeB = kickoffTimeMs(right);
    if (timeA !== timeB) {
      return timeA - timeB;
    }

    return getTimeRank(left.time) - getTimeRank(right.time);
  });
}

function getSportmonksLeaguePriorityRank(match, priorityLeagueIds) {
  if (!priorityLeagueIds?.length) {
    return 0;
  }

  const leagueId = Number(match?.provider_ids?.sportmonks_league_id || 0);
  const index = priorityLeagueIds.findIndex((id) => Number(id) === leagueId);

  if (index >= 0) {
    return index;
  }

  return 10000;
}

/**
 * Ordina i match: prima le leghe in `prioritySportmonksLeagueIds` (nell'ordine dato), poi tutte le altre.
 * Default: {@link SPORTMONKS_PRIORITY_LEAGUE_IDS} così Serie A / top EU compaiono prima senza escludere il resto del feed.
 */
export function sortMatchesByFeaturedPriority(matches, options = {}) {
  const prioritySportmonksLeagueIds =
    options.prioritySportmonksLeagueIds ?? SPORTMONKS_PRIORITY_LEAGUE_IDS;
  const safeMatches = Array.isArray(matches) ? [...matches] : [];

  return safeMatches.sort((left, right) => {
    const leftP = getSportmonksLeaguePriorityRank(left, prioritySportmonksLeagueIds);
    const rightP = getSportmonksLeaguePriorityRank(right, prioritySportmonksLeagueIds);

    if (leftP !== rightP) {
      return leftP - rightP;
    }

    const stateDifference = getStatePriority(left) - getStatePriority(right);

    if (stateDifference !== 0) {
      return stateDifference;
    }

    const competitionDifference =
      getCompetitionTierPriority(left) - getCompetitionTierPriority(right);

    if (competitionDifference !== 0) {
      return competitionDifference;
    }

    const coverageDifference = getCoveragePriority(right) - getCoveragePriority(left);

    if (coverageDifference !== 0) {
      return coverageDifference;
    }

    const confidenceDifference = (right.confidence || 0) - (left.confidence || 0);

    if (confidenceDifference !== 0) {
      return confidenceDifference;
    }

    return getTimeRank(left.time) - getTimeRank(right.time);
  });
}
