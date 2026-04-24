const scheduleWindowInflightRequests = new Map();
const teamMomentumInflightRequests = new Map();
const teamMomentumMemoryCache = new Map();
const TEAM_MOMENTUM_CACHE_TTL_MS = 2 * 60_000;
let lastKnownSnapshotVersion = null;

function resolveSnapshotVersion(options = {}) {
  return String(options?.snapshotVersion || lastKnownSnapshotVersion || "").trim();
}

function normalizeScheduleWindowDays(days) {
  const parsedDays = Number.parseInt(String(days), 10);
  if (Number.isFinite(parsedDays) && parsedDays > 0) {
    return String(Math.min(parsedDays, 7));
  }

  return "7";
}

function buildScheduleWindowRequestUrl(normalizedDays) {
  return `/api/football/schedules/window?days=${encodeURIComponent(normalizedDays)}`;
}

async function requestJson(url, init) {
  const response = await fetch(url, init);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Richiesta API non riuscita.");
  }

  return payload;
}

export function getScheduleWindow(days = 7, options = {}) {
  const normalizedDays = normalizeScheduleWindowDays(days);
  const requester =
    typeof options?.requester === "string" && options.requester.trim().length > 0
      ? options.requester.trim()
      : "unknown_consumer";
  const requestUrl = buildScheduleWindowRequestUrl(normalizedDays);
  const inflightKey = requestUrl;
  const existingInflightRequest = scheduleWindowInflightRequests.get(inflightKey);

  if (existingInflightRequest) {
    if (process.env.NODE_ENV === "development") {
      console.info("[football][client] schedule-window coalesced", {
        endpoint: "/api/football/schedules/window",
        days: normalizedDays,
        requester,
        ownerRequester: existingInflightRequest.ownerRequester,
      });
    }

    return existingInflightRequest.promise;
  }

  const requestPromise = requestJson(requestUrl, {
    headers: {
      "x-football-requester": requester,
    },
  })
    .then((payload) => {
      const snapshotVersion = String(payload?.snapshotVersion || "").trim();
      if (snapshotVersion) {
        lastKnownSnapshotVersion = snapshotVersion;
      }
      return payload;
    })
    .finally(() => {
    const inflightEntry = scheduleWindowInflightRequests.get(inflightKey);
    if (inflightEntry?.promise === requestPromise) {
      scheduleWindowInflightRequests.delete(inflightKey);
    }
  });

  scheduleWindowInflightRequests.set(inflightKey, {
    promise: requestPromise,
    ownerRequester: requester,
  });

  if (process.env.NODE_ENV === "development") {
    console.info("[football][client] schedule-window request", {
      endpoint: "/api/football/schedules/window",
      days: normalizedDays,
      requester,
      coalesced: false,
    });
  }

  return requestPromise;
}

export function getFixture(fixtureId, options = {}) {
  const snapshotVersion = resolveSnapshotVersion(options);
  const params = new URLSearchParams();
  if (snapshotVersion) {
    params.set("snapshotVersion", snapshotVersion);
  }
  const query = params.toString();
  const path = `/api/football/fixtures/${encodeURIComponent(fixtureId)}${query ? `?${query}` : ""}`;
  return requestJson(path);
}

export function getPlayerProps({ fixtureId, playerId, market }, options = {}) {
  const params = new URLSearchParams({
    fixtureId: String(fixtureId || ""),
    playerId: String(playerId || ""),
    market: String(market || "anytime_goalscorer"),
  });
  const snapshotVersion = resolveSnapshotVersion(options);
  if (snapshotVersion) {
    params.set("snapshotVersion", snapshotVersion);
  }
  return requestJson(`/api/football/player-props?${params.toString()}`);
}

export function getTeamMomentum(fixtureId, options = {}) {
  const id = String(fixtureId || "").trim();
  const snapshotVersion = resolveSnapshotVersion(options);
  const cacheKey = `${id}:sv:${snapshotVersion || "-"}`;
  const now = Date.now();
  const cached = teamMomentumMemoryCache.get(cacheKey);
  if (cached && now - cached.storedAt <= TEAM_MOMENTUM_CACHE_TTL_MS) {
    return Promise.resolve(cached.payload);
  }
  const existingInflight = teamMomentumInflightRequests.get(cacheKey);
  if (existingInflight) {
    return existingInflight;
  }
  const requestPromise = requestJson(
    `/api/football/team-momentum?fixtureId=${encodeURIComponent(id)}${
      snapshotVersion ? `&snapshotVersion=${encodeURIComponent(snapshotVersion)}` : ""
    }`
  )
    .then((payload) => {
      teamMomentumMemoryCache.set(cacheKey, { storedAt: Date.now(), payload });
      return payload;
    })
    .finally(() => {
      if (teamMomentumInflightRequests.get(cacheKey) === requestPromise) {
        teamMomentumInflightRequests.delete(cacheKey);
      }
    });
  teamMomentumInflightRequests.set(cacheKey, requestPromise);
  return requestPromise;
}

export function getPlayerProfile({ fixtureId, playerId, teamName }, options = {}) {
  const params = new URLSearchParams({
    playerId: String(playerId || ""),
  });
  if (fixtureId != null) {
    params.set("fixtureId", String(fixtureId));
  }
  if (teamName) {
    params.set("teamName", String(teamName));
  }
  const snapshotVersion = resolveSnapshotVersion(options);
  if (snapshotVersion) {
    params.set("snapshotVersion", snapshotVersion);
  }
  return requestJson(`/api/football/player-profile?${params.toString()}`);
}

export function getPlayerXgByFixture(fixtureId, options = {}) {
  const params = new URLSearchParams({
    fixtureId: String(fixtureId || ""),
  });
  const snapshotVersion = resolveSnapshotVersion(options);
  if (snapshotVersion) {
    params.set("snapshotVersion", snapshotVersion);
  }
  return requestJson(`/api/football/player-xg?${params.toString()}`);
}

export function getPlayerOddsByFixture(fixtureId, options = {}) {
  const params = new URLSearchParams({
    fixtureId: String(fixtureId || ""),
  });
  const snapshotVersion = resolveSnapshotVersion(options);
  if (snapshotVersion) {
    params.set("snapshotVersion", snapshotVersion);
  }
  return requestJson(`/api/football/player-odds?${params.toString()}`);
}

export function getHeadToHeadByFixture(fixtureId, options = {}) {
  const params = new URLSearchParams({
    fixtureId: String(fixtureId || ""),
  });
  const snapshotVersion = resolveSnapshotVersion(options);
  if (snapshotVersion) {
    params.set("snapshotVersion", snapshotVersion);
  }
  return requestJson(`/api/football/head-to-head?${params.toString()}`);
}
