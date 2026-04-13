async function requestJson(url, init) {
  const response = await fetch(url, init);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Richiesta API non riuscita.");
  }

  return payload;
}

export function getScheduleWindow(days = 4) {
  return requestJson(`/api/football/schedules/window?days=${encodeURIComponent(days)}`);
}

export function getLivescoresInplay() {
  return requestJson("/api/football/livescores/inplay");
}

export function getFixture(fixtureId) {
  return requestJson(`/api/football/fixtures/${encodeURIComponent(fixtureId)}`);
}

export function getFuturesOdds({ competitionId = "", sportId = "" } = {}) {
  const searchParams = new URLSearchParams();

  if (competitionId) {
    searchParams.set("competitionId", competitionId);
  }

  if (sportId) {
    searchParams.set("sportId", sportId);
  }

  const query = searchParams.toString();

  return requestJson(`/api/football/odds/futures${query ? `?${query}` : ""}`);
}
