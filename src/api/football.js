const scheduleWindowInflightRequests = new Map();

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
  }).finally(() => {
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

export function getFixture(fixtureId) {
  return requestJson(`/api/football/fixtures/${encodeURIComponent(fixtureId)}`);
}

export function getPlayerProps({ fixtureId, playerId, market }) {
  const params = new URLSearchParams({
    fixtureId: String(fixtureId || ""),
    playerId: String(playerId || ""),
    market: String(market || "anytime_goalscorer"),
  });
  return requestJson(`/api/football/player-props?${params.toString()}`);
}

export function getTeamMomentum(fixtureId) {
  return requestJson(
    `/api/football/team-momentum?fixtureId=${encodeURIComponent(String(fixtureId || ""))}`
  );
}
