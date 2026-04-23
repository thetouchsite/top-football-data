import { READ_META } from "./schedule-window-constants";
const FIXTURE_READ_META = Symbol.for("@tfd/football/fixtureReadMeta");

const DEBUG_FOOTBALL_TELEMETRY = ["1", "true", "yes"].includes(
  String(process.env.DEBUG_FOOTBALL_TELEMETRY || "").toLowerCase()
);

export function mapTelemetrySource(source, { cacheState, fallbackTriggered, cacheLayer } = {}) {
  if (cacheLayer === "L2" && source === "sportmonks_cache" && cacheState === "hit" && !fallbackTriggered) {
    return "l2_cache";
  }
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

/**
 * L1: latest snapshot per logical key `days:policyVersion` (final JSON body + fetchedAt)
 */
export function getScheduleL1WindowStore() {
  if (!globalThis.__footballScheduleWindowL1) {
    globalThis.__footballScheduleWindowL1 = new Map();
  }

  return globalThis.__footballScheduleWindowL1;
}

/** @deprecated use getScheduleL1WindowStore; kept for any legacy reads */
export function getScheduleCacheStore() {
  return getScheduleL1WindowStore();
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

/**
 * Non-enumerable meta for route/telemetry; excluded from JSON responses.
 * @param {object} payload
 * @param {object} meta
 */
export function attachScheduleReadMeta(payload, meta) {
  if (payload && typeof payload === "object" && meta && typeof meta === "object") {
    Object.defineProperty(payload, READ_META, {
      value: meta,
      enumerable: false,
      configurable: true,
    });
  }
  return payload;
}

export function getScheduleReadMeta(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const d = Object.getOwnPropertyDescriptor(payload, READ_META);
  return d?.value ?? null;
}

export function attachFixtureReadMeta(payload, meta) {
  if (payload && typeof payload === "object" && meta && typeof meta === "object") {
    Object.defineProperty(payload, FIXTURE_READ_META, {
      value: meta,
      enumerable: false,
      configurable: true,
    });
  }
  return payload;
}

export function getFixtureReadMeta(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const d = Object.getOwnPropertyDescriptor(payload, FIXTURE_READ_META);
  return d?.value ?? null;
}
