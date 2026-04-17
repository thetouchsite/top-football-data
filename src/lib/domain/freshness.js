export function toIsoDate(value) {
  if (!value) {
    return null;
  }

  const parsedValue = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsedValue.getTime()) ? null : parsedValue.toISOString();
}

export function isFallbackSource(source) {
  return [
    "local_mock_data",
    "local_snapshot",
    "route_error",
    "provider_unavailable",
  ].includes(
    String(source || "").trim().toLowerCase()
  );
}

export function createProviderFreshness({ updatedAt = null, ttlMs = 0, now = Date.now() } = {}) {
  const updatedTimestamp =
    typeof updatedAt === "number"
      ? updatedAt
      : updatedAt
        ? new Date(updatedAt).getTime()
        : Number.NaN;

  if (!Number.isFinite(updatedTimestamp)) {
    return {
      updatedAt: null,
      ttlMs,
      staleAt: null,
      ageMs: null,
      state: "unknown",
    };
  }

  const ageMs = Math.max(0, now - updatedTimestamp);
  const staleAt = ttlMs > 0 ? new Date(updatedTimestamp + ttlMs).toISOString() : null;

  return {
    updatedAt: new Date(updatedTimestamp).toISOString(),
    ttlMs,
    staleAt,
    ageMs,
    state: ttlMs > 0 && ageMs > ttlMs ? "stale" : "fresh",
  };
}
