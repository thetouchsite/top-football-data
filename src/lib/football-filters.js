import { SPORTMONKS_PRIORITY_LEAGUE_IDS } from "@/lib/sportmonks-priority-league-ids";

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

  return getLeagueBucket(match?.league) === selectedLeague;
}

export function getMatchStatusBucket(match) {
  const explicitStatus = String(match?.status || "").trim().toLowerCase();

  if (STATUS_BUCKETS.has(explicitStatus)) {
    return explicitStatus;
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

export function sortMatchesByCriterion(matches, criterion) {
  const safeMatches = Array.isArray(matches) ? [...matches] : [];

  if (criterion === "confidence") {
    return safeMatches.sort((left, right) => (right.confidence || 0) - (left.confidence || 0));
  }

  if (criterion === "odds") {
    return safeMatches.sort((left, right) => (right.odds?.home || 0) - (left.odds?.home || 0));
  }

  if (criterion === "value") {
    return safeMatches.sort(
      (left, right) => (right.valueBet?.edge || 0) - (left.valueBet?.edge || 0)
    );
  }

  return safeMatches.sort((left, right) => {
    const statusDifference =
      getStatusRank(getMatchStatusBucket(left)) - getStatusRank(getMatchStatusBucket(right));

    if (statusDifference !== 0) {
      return statusDifference;
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
