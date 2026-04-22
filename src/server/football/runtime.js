const DEBUG_FOOTBALL_TELEMETRY = ["1", "true", "yes"].includes(
  String(process.env.DEBUG_FOOTBALL_TELEMETRY || "").toLowerCase()
);

export function mapTelemetrySource(source, { cacheState, fallbackTriggered } = {}) {
  if (source === "sportmonks_cache" && cacheState === "hit" && !fallbackTriggered) {
    return "memory_cache";
  }
  if (source === "sportmonks_cache" && (cacheState === "stale-hit" || fallbackTriggered)) {
    return "stale_cache";
  }
  if (source === "sportmonks_api") {
    return "provider_fetch";
  }
  if (source === "sportmonks_inflight") {
    return "inflight_shared";
  }
  if (source === "provider_unavailable" || source === "route_error") {
    return "fallback_provider";
  }
  return source || null;
}

function shouldLogVerboseTelemetry(payload = {}) {
  if (DEBUG_FOOTBALL_TELEMETRY) {
    return true;
  }
  return (
    payload.cacheState === "miss" ||
    payload.fallbackTriggered === true ||
    Number(payload.retryCount || 0) > 0 ||
    Boolean(payload.error)
  );
}

export function logFootballServiceTelemetry(payload = {}) {
  if (!shouldLogVerboseTelemetry(payload)) {
    return;
  }
  console.info("[football][service]", payload);
}

export function getScheduleCacheStore() {
  if (!globalThis.__footballScheduleWindowCache) {
    globalThis.__footballScheduleWindowCache = new Map();
  }

  return globalThis.__footballScheduleWindowCache;
}

export function getScheduleInflightStore() {
  if (!globalThis.__footballScheduleWindowInflight) {
    globalThis.__footballScheduleWindowInflight = new Map();
  }

  return globalThis.__footballScheduleWindowInflight;
}

export function getFixtureCacheStore() {
  if (!globalThis.__footballFixtureCache) {
    globalThis.__footballFixtureCache = new Map();
  }

  return globalThis.__footballFixtureCache;
}

export function getFixtureInflightStore() {
  if (!globalThis.__footballFixtureInflight) {
    globalThis.__footballFixtureInflight = new Map();
  }

  return globalThis.__footballFixtureInflight;
}

export function isRateLimitError(error) {
  return String(error?.message || "").toLowerCase().includes("too many requests");
}
