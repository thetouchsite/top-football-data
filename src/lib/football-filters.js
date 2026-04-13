const LEAGUE_BUCKETS = [
  { label: "Serie A", keywords: ["serie a"] },
  { label: "Premier League", keywords: ["premier league"] },
  { label: "Champions League", keywords: ["champions league", "uefa champions league"] },
  { label: "La Liga", keywords: ["la liga", "laliga"] },
  { label: "Bundesliga", keywords: ["bundesliga"] },
];

const STATUS_BUCKETS = new Set(["today", "tomorrow", "weekend", "upcoming"]);

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
