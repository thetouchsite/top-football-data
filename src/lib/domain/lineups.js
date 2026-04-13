export function normalizeLineupStatus(value) {
  const normalizedValue = String(value || "").trim().toLowerCase();

  if (["expected", "probable", "official", "unknown"].includes(normalizedValue)) {
    return normalizedValue;
  }

  return "unknown";
}

export function deriveLineupStatusFromFixture(fixture = {}) {
  if (normalizeLineupStatus(fixture?.lineup_status) !== "unknown") {
    return normalizeLineupStatus(fixture.lineup_status);
  }

  if (fixture?.lineupConfirmed === true) {
    return "official";
  }

  if (fixture?.lineupConfirmed === false) {
    return "probable";
  }

  const hasPlayers =
    (fixture?.lineups?.home?.players?.length || 0) > 0 ||
    (fixture?.lineups?.away?.players?.length || 0) > 0;

  if (hasPlayers) {
    return "probable";
  }

  return "unknown";
}
