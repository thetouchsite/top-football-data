import {
  SPORTMONKS_DEFAULT_SCHEDULE_DAYS,
  SPORTMONKS_PROVIDER_ID,
} from "@/lib/providers/sportmonks";
import {
  SCHEDULE_L2_POLL_REBUILD_MAX_MS,
  SCHEDULE_SNAPSHOT_SCHEMA_VERSION,
  SCHEDULE_T_FRESH_MS,
  SCHEDULE_T_MAX_SERVED_AGE_MS,
  SCHEDULE_T_SWR_STALE_MS,
} from "./schedule-window-constants";
import { buildScheduleWindowFromProvider } from "./schedule-window-builder";
import { buildSchedulePayload } from "./payloads";
import {
  buildScheduleL2DataKey,
  buildScheduleL2LockKey,
  buildScheduleL2SwrLockKey,
  getScheduleWindowPolicyVersion,
} from "./schedule-window-policy";
import {
  buildSnapshotEnvelopeFromBuild,
  isScheduleL2Enabled,
  l2GetSnapshotDataKey,
  l2ReleaseLock,
  l2SetCurrentSnapshotVersion,
  l2SetSnapshotDataKey,
  l2TryAcquireRebuildLock,
  l2TryAcquireSwrLock,
} from "./schedule-snapshot-l2";
import {
  attachScheduleReadMeta,
  getScheduleReadMeta,
  getScheduleL1WindowStore,
  getScheduleInflightStore,
  isRateLimitError,
  logFootballServiceTelemetry,
  mapTelemetrySource,
} from "./runtime";

const inflightRebuildKey = (l1Key) => `rebuild_sched:${l1Key}`;

function getSwrLocalGuard() {
  if (!globalThis.__footballScheduleSwrInFlight) {
    globalThis.__footballScheduleSwrInFlight = new Set();
  }
  return globalThis.__footballScheduleSwrInFlight;
}

function nowMs() {
  return Date.now();
}

function resolveSnapshotVersion(updatedAt, policyVersion, safeDays) {
  if (!Number.isFinite(updatedAt)) {
    return null;
  }
  return `${policyVersion}:${safeDays}:${String(updatedAt)}`;
}

/**
 * @param {number} fetchedAt
 * @param {number} t
 */
function ageMs(fetchedAt, t = nowMs()) {
  return t - fetchedAt;
}

/**
 * @returns {"fresh" | "swr_soft" | "swr_hard" | "expired"}
 */
function snapshotTier(fetchedAt, t = nowMs()) {
  const a = ageMs(fetchedAt, t);
  if (a < SCHEDULE_T_FRESH_MS) {
    return "fresh";
  }
  if (a < SCHEDULE_T_SWR_STALE_MS) {
    return "swr_soft";
  }
  if (a < SCHEDULE_T_MAX_SERVED_AGE_MS) {
    return "swr_hard";
  }
  return "expired";
}

function buildTelemetryBase({
  safeDays,
  startedAt,
  payload,
  cacheState,
  cacheLayer,
  policyVersion,
  snapshotAgeMs,
  refreshState,
  e2eMs,
  error,
  normalizeMs,
  cacheHit,
  fallbackTriggered,
  source,
}) {
  return {
    route: "/api/football/schedules/window",
    requestPurpose: "schedule_window",
    days: safeDays,
    fixtureId: null,
    cacheHit: Boolean(cacheHit),
    cacheState: cacheState || "miss",
    cacheLayer: cacheLayer ?? null,
    policyVersion: policyVersion ?? null,
    snapshotAgeMs: snapshotAgeMs ?? null,
    refreshState: refreshState ?? "none",
    providerLatencyMs: null,
    pagesFetched: payload?.rawSchedules?.schedulePagination?.pagesFetched ?? null,
    itemsFetched: Array.isArray(payload?.matches) ? payload.matches.length : 0,
    payloadBytes: payload ? JSON.stringify(payload).length : 0,
    normalizeMs: normalizeMs ?? null,
    e2eMs: e2eMs ?? nowMs() - startedAt,
    fallbackTriggered: Boolean(fallbackTriggered),
    retryCount: 0,
    dtoTarget: "ScheduleCardDTO",
    dtoVersion: "v2",
    providerEndpoint: "fixtures/between/{start}/{end}",
    includeSet: null,
    estimatedCallCost: payload?.rawSchedules?.schedulePagination?.pagesFetched ?? null,
    source: mapTelemetrySource(source || "sportmonks_cache", {
      cacheState: cacheState || "miss",
      fallbackTriggered: Boolean(fallbackTriggered),
      cacheLayer,
    }),
    error,
  };
}

function logService(payload) {
  logFootballServiceTelemetry(payload);
}

function withMeta(payload, meta) {
  return attachScheduleReadMeta(payload, meta);
}

function returnCachedBody(body, { fetchedAt, startedAt, safeDays, policyVersion, cacheLayer, refreshState, tier }) {
  const out = { ...body, source: "sportmonks_cache" };
  const t = nowMs();
  return withMeta(out, {
    cacheLayer,
    policyVersion,
    snapshotAgeMs: ageMs(fetchedAt, t),
    refreshState,
    snapshotTier: tier,
  });
}

async function loadL2ToL1IfPresent(l1, l1Key, dataKey) {
  const fromL2 = await l2GetSnapshotDataKey(dataKey);
  if (!fromL2 || !fromL2.body || !Number.isFinite(fromL2.fetchedAt)) {
    return null;
  }
  l1.set(l1Key, { ...fromL2, policyKey: l1Key });
  return fromL2;
}

async function pollL2ForSnapshot(l1, l1Key, dataKey, maxMs) {
  const t0 = nowMs();
  while (nowMs() - t0 < maxMs) {
    const e = await loadL2ToL1IfPresent(l1, l1Key, dataKey);
    if (e) {
      return e;
    }
    await new Promise((r) => {
      setTimeout(r, 120);
    });
  }
  return null;
}

async function storeSuccessfulBuild(
  l1,
  l1Key,
  dataKey,
  lockKey,
  lockToken,
  { publicPayload, policyVersion, updatedAt, pagesFetched }
) {
  const env = buildSnapshotEnvelopeFromBuild({
    publicPayload,
    policyVersion,
    updatedAt,
    pagesFetched,
  });
  l1.set(l1Key, { ...env, policyKey: l1Key });
  await l2SetSnapshotDataKey(dataKey, env);
  if (env?.body?.snapshotVersion) {
    await l2SetCurrentSnapshotVersion(env.body.snapshotVersion);
  }
  if (isScheduleL2Enabled() && lockKey && lockToken) {
    await l2ReleaseLock(lockKey, lockToken);
  }
}

/**
 * SWR: single background refresh; local guard + L2 SWR lock when available.
 */
function scheduleSwrRefresh({
  l1Key,
  dataKey,
  swrLockKey,
  safeDays,
  policyVersion,
  startedAt,
}) {
  if (getSwrLocalGuard().has(l1Key)) {
    return;
  }
  getSwrLocalGuard().add(l1Key);
  void (async () => {
    let token = null;
    try {
      if (isScheduleL2Enabled()) {
        token = await l2TryAcquireSwrLock(swrLockKey);
        if (!token) {
          return;
        }
      }
      const built = await buildScheduleWindowFromProvider(safeDays, { refreshMode: "swr" });
      const l1 = getScheduleL1WindowStore();
      await storeSuccessfulBuild(
        l1,
        l1Key,
        dataKey,
        null,
        null,
        {
          publicPayload: built.publicPayload,
          policyVersion,
          updatedAt: built.updatedAt,
          pagesFetched: built.pagesFetched,
        }
      );
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[football] schedule SWR background refresh failed", e?.message || e);
      }
    } finally {
      getSwrLocalGuard().delete(l1Key);
      if (token && isScheduleL2Enabled()) {
        await l2ReleaseLock(swrLockKey, token);
      }
    }
  })();
}

export async function getScheduleWindowPayload(days = SPORTMONKS_DEFAULT_SCHEDULE_DAYS) {
  const startedAt = nowMs();
  const safeDays = Number.isFinite(days) ? days : SPORTMONKS_DEFAULT_SCHEDULE_DAYS;
  const policyVersion = getScheduleWindowPolicyVersion();
  const l1Key = `${safeDays}:${policyVersion}`;
  const dataKey = buildScheduleL2DataKey(safeDays, policyVersion);
  const lockKey = buildScheduleL2LockKey(safeDays, policyVersion);
  const swrLockKey = buildScheduleL2SwrLockKey(safeDays, policyVersion);
  const l1 = getScheduleL1WindowStore();
  const inflightStore = getScheduleInflightStore();
  const inflightKey = inflightRebuildKey(l1Key);

  const hadL1 = Boolean(l1.get(l1Key));
  let l1OrL2 = l1.get(l1Key);
  let filledFromL2 = false;
  if (!l1OrL2 && isScheduleL2Enabled()) {
    const fromRemote = await loadL2ToL1IfPresent(l1, l1Key, dataKey);
    if (fromRemote) {
      l1OrL2 = fromRemote;
      filledFromL2 = true;
    }
  }
  const cacheLayerForSnapshot = !hadL1 && filledFromL2 ? "L2" : "L1";

  if (
    l1OrL2 &&
    l1OrL2.body &&
    l1OrL2.schemaVersion === SCHEDULE_SNAPSHOT_SCHEMA_VERSION &&
    l1OrL2.policyVersion === policyVersion
  ) {
    const { fetchedAt, body } = l1OrL2;
    const tier = snapshotTier(fetchedAt);
    if (tier === "fresh") {
      const p = returnCachedBody(body, {
        fetchedAt,
        startedAt,
        safeDays,
        policyVersion,
        cacheLayer: cacheLayerForSnapshot,
        refreshState: "none",
        tier: "fresh",
      });
      const cLayer = cacheLayerForSnapshot;
      logService(
        buildTelemetryBase({
          safeDays,
          startedAt,
          payload: p,
          cacheState: "hit",
          cacheLayer: cLayer,
          policyVersion,
          snapshotAgeMs: ageMs(fetchedAt),
          refreshState: "none",
          e2eMs: nowMs() - startedAt,
          cacheHit: true,
          fallbackTriggered: p.isFallback,
          source: "sportmonks_cache",
        })
      );
      return p;
    }
    if (tier === "swr_soft" || tier === "swr_hard") {
      const p = returnCachedBody(body, {
        fetchedAt,
        startedAt,
        safeDays,
        policyVersion,
        cacheLayer: cacheLayerForSnapshot,
        refreshState: "swr_async",
        tier,
      });
      scheduleSwrRefresh({ l1Key, dataKey, swrLockKey, safeDays, policyVersion, startedAt });
      const cLayer = cacheLayerForSnapshot;
      logService(
        buildTelemetryBase({
          safeDays,
          startedAt,
          payload: p,
          cacheState: "hit",
          cacheLayer: cLayer,
          policyVersion,
          snapshotAgeMs: ageMs(fetchedAt),
          refreshState: "swr_async",
          e2eMs: nowMs() - startedAt,
          cacheHit: true,
          fallbackTriggered: p.isFallback,
          source: "sportmonks_cache",
        })
      );
      return p;
    }
  }

  if (inflightStore.has(inflightKey)) {
    const shared = await inflightStore.get(inflightKey);
    const prev = getScheduleReadMeta(shared);
    const out = { ...shared, source: "sportmonks_inflight" };
    return attachScheduleReadMeta(out, {
      ...prev,
      cacheLayer: "provider",
      policyVersion: prev?.policyVersion ?? policyVersion,
      snapshotAgeMs: null,
      refreshState: "inflight_wait",
    });
  }

  const requestPromise = (async () => {
    let lastEnvelope = l1.get(l1Key) || (await l2GetSnapshotDataKey(dataKey));
    if (lastEnvelope && !lastEnvelope.body) {
      lastEnvelope = null;
    }

    let lockToken = isScheduleL2Enabled() ? await l2TryAcquireRebuildLock(lockKey) : null;
    if (isScheduleL2Enabled() && !lockToken) {
      const afterPoll = await pollL2ForSnapshot(
        l1,
        l1Key,
        dataKey,
        SCHEDULE_L2_POLL_REBUILD_MAX_MS
      );
      if (afterPoll && afterPoll.body) {
        const t = snapshotTier(afterPoll.fetchedAt);
        if (t !== "expired" && afterPoll.policyVersion === policyVersion) {
          return returnCachedBody(afterPoll.body, {
            fetchedAt: afterPoll.fetchedAt,
            startedAt,
            safeDays,
            policyVersion,
            cacheLayer: "L2",
            refreshState: "waited_l2",
            tier: t,
          });
        }
      }
      lockToken = await l2TryAcquireRebuildLock(lockKey);
    }
    if (isScheduleL2Enabled() && !lockToken) {
      if (inflightStore.has(inflightKey)) {
        const s = await inflightStore.get(inflightKey);
        if (s) {
          const prevM = getScheduleReadMeta(s);
          const o = { ...s, source: "sportmonks_inflight" };
          return attachScheduleReadMeta(o, {
            ...prevM,
            cacheLayer: "provider",
            policyVersion: prevM?.policyVersion ?? policyVersion,
            snapshotAgeMs: null,
            refreshState: "inflight_wait",
          });
        }
      }
      lastEnvelope = l1.get(l1Key) || (await l2GetSnapshotDataKey(dataKey));
    }

    try {
      const built = await buildScheduleWindowFromProvider(safeDays);
      const snapshotVersion = resolveSnapshotVersion(built.updatedAt, policyVersion, safeDays);
      const payload = {
        ...built.publicPayload,
        snapshotVersion: snapshotVersion || built.publicPayload?.snapshotVersion || null,
      };
      await storeSuccessfulBuild(
        l1,
        l1Key,
        dataKey,
        lockKey,
        lockToken,
        {
          publicPayload: payload,
          policyVersion,
          updatedAt: built.updatedAt,
          pagesFetched: built.pagesFetched,
        }
      );
      logService(
        buildTelemetryBase({
          safeDays,
          startedAt,
          payload,
          cacheState: "miss",
          cacheLayer: "provider",
          policyVersion,
          snapshotAgeMs: 0,
          refreshState: "rebuild",
          e2eMs: nowMs() - startedAt,
          normalizeMs: built.normalizeMs,
          cacheHit: false,
          fallbackTriggered: false,
          source: "sportmonks_api",
        })
      );
      return withMeta(payload, {
        cacheLayer: "provider",
        policyVersion,
        snapshotAgeMs: 0,
        refreshState: "rebuild_ok",
        snapshotTier: "live",
      });
    } catch (error) {
      if (isScheduleL2Enabled() && lockToken) {
        await l2ReleaseLock(lockKey, lockToken);
      }
      const envelopeForStale = lastEnvelope;
      if (
        envelopeForStale &&
        envelopeForStale.body &&
        ageMs(envelopeForStale.fetchedAt) < SCHEDULE_T_MAX_SERVED_AGE_MS
      ) {
        const b = envelopeForStale.body;
        const stalePayload = buildSchedulePayload({
          matches: b.matches,
          window: b.window,
          rawSchedules: b.rawSchedules,
          provider: SPORTMONKS_PROVIDER_ID,
          source: "sportmonks_cache",
          notice: isRateLimitError(error)
            ? "Rate limit Sportmonks raggiunto. Mostro l'ultimo calendario disponibile dalla cache provider."
            : error?.message || "Mostro l'ultimo calendario disponibile dalla cache provider.",
          updatedAt: envelopeForStale.fetchedAt,
        });
        const p = { ...stalePayload, source: "sportmonks_cache" };
        logService(
          buildTelemetryBase({
            safeDays,
            startedAt,
            payload: p,
            cacheState: "stale-hit",
            cacheLayer: l1.get(l1Key) ? "L1" : "L2",
            policyVersion,
            snapshotAgeMs: ageMs(envelopeForStale.fetchedAt),
            refreshState: "stale_if_error",
            e2eMs: nowMs() - startedAt,
            cacheHit: true,
            fallbackTriggered: true,
            source: "sportmonks_cache",
            error: error?.message,
          })
        );
        return withMeta(p, {
          cacheLayer: l1.get(l1Key) ? "L1" : "L2",
          policyVersion,
          snapshotAgeMs: ageMs(envelopeForStale.fetchedAt),
          refreshState: "stale_if_error",
        });
      }

      const fallbackPayload = buildSchedulePayload({
        matches: [],
        window: null,
        rawSchedules: null,
        source: "provider_unavailable",
        notice: error.message || "Impossibile recuperare il calendario dal provider corrente.",
        updatedAt: null,
      });
      logService(
        buildTelemetryBase({
          safeDays,
          startedAt,
          payload: fallbackPayload,
          cacheState: "miss",
          cacheLayer: "provider",
          policyVersion,
          snapshotAgeMs: null,
          refreshState: "fallback",
          e2eMs: nowMs() - startedAt,
          cacheHit: false,
          fallbackTriggered: true,
          source: "provider_unavailable",
          error: error?.message,
        })
      );
      return withMeta(fallbackPayload, {
        cacheLayer: "provider",
        policyVersion,
        refreshState: "fallback",
      });
    } finally {
      inflightStore.delete(inflightKey);
    }
  })();

  inflightStore.set(inflightKey, requestPromise);
  return requestPromise;
}

/**
 * Prewarm / cron: same builder; no-op if snapshot is fresh. Used by /api/cron/...
 * @param {{ mode?: string, days?: number }} [ctx]
 * @returns {Promise<{ status: "skipped" | "ok" | "error", detail?: string }>}
 */
export async function prewarmScheduleWindowSnapshot(ctx = {}) {
  const safeDays = Number.isFinite(ctx.days) ? ctx.days : SPORTMONKS_DEFAULT_SCHEDULE_DAYS;
  const policyVersion = getScheduleWindowPolicyVersion();
  const l1Key = `${safeDays}:${policyVersion}`;
  const dataKey = buildScheduleL2DataKey(safeDays, policyVersion);
  const l1 = getScheduleL1WindowStore();
  const existing = l1.get(l1Key) || (await l2GetSnapshotDataKey(dataKey));
  if (
    existing &&
    existing.body &&
    existing.policyVersion === policyVersion &&
    existing.schemaVersion === SCHEDULE_SNAPSHOT_SCHEMA_VERSION &&
    snapshotTier(existing.fetchedAt) === "fresh"
  ) {
    return { status: "skipped", detail: "fresh" };
  }
  try {
    const built = await buildScheduleWindowFromProvider(safeDays, { prewarm: true, mode: ctx.mode });
    const snapshotVersion = resolveSnapshotVersion(built.updatedAt, policyVersion, safeDays);
    const payloadWithVersion = {
      ...built.publicPayload,
      snapshotVersion: snapshotVersion || built.publicPayload?.snapshotVersion || null,
    };
    await storeSuccessfulBuild(
      l1,
      l1Key,
      dataKey,
      null,
      null,
      {
        publicPayload: payloadWithVersion,
        policyVersion,
        updatedAt: built.updatedAt,
        pagesFetched: built.pagesFetched,
      }
    );
    if (process.env.NODE_ENV === "development" || String(process.env.DEBUG_FOOTBALL_TELEMETRY) === "1") {
      console.info("[football][prewarm] schedule window done", { days: safeDays, policyVersion });
    }
    return { status: "ok" };
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[football][prewarm] failed", e?.message || e);
    }
    return { status: "error", detail: String(e?.message || e) };
  }
}
