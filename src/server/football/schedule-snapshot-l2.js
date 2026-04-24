import { Redis } from "@upstash/redis";
import { randomBytes } from "node:crypto";

import { SCHEDULE_SNAPSHOT_SCHEMA_VERSION } from "./schedule-window-constants";

let redis;
const CURRENT_SNAPSHOT_VERSION_KEY = "football:snapshot:current";

export function isScheduleL2Enabled() {
  const u = String(process.env.UPSTASH_REDIS_REST_URL || "").trim();
  const t = String(process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();
  return u.length > 0 && t.length > 0;
}

function getRedis() {
  if (redis) {
    return redis;
  }
  if (!isScheduleL2Enabled()) {
    return null;
  }
  redis = Redis.fromEnv();
  return redis;
}

/**
 * @returns {Promise<ScheduleSnapshotEnvelope | null>}
 */
export async function l2GetSnapshotDataKey(redisDataKey) {
  const r = getRedis();
  if (!r) {
    return null;
  }
  const raw = await r.get(redisDataKey);
  if (!raw) {
    return null;
  }
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") {
    return raw;
  }
  return null;
}

/**
 * @param {string} redisDataKey
 * @param {ScheduleSnapshotEnvelope} envelope
 * @param {number} [ttlSec] default 25h
 */
const L2_DEFAULT_TTL_SEC = 7 * 24 * 60 * 60;

/**
 * @param {string} redisDataKey
 * @param {ScheduleSnapshotEnvelope} envelope
 * @param {number} [ttlSec] key TTL in seconds (Redis); snapshot age is in metadata
 */
export async function l2SetSnapshotDataKey(redisDataKey, envelope, ttlSec = L2_DEFAULT_TTL_SEC) {
  const r = getRedis();
  if (!r) {
    return;
  }
  const payload = JSON.stringify(envelope);
  const ex = Math.min(Math.max(Math.floor(ttlSec), 300), 14 * 24 * 60 * 60);
  await r.set(redisDataKey, payload, { ex });
}

export async function l2GetCurrentSnapshotVersion() {
  const r = getRedis();
  if (!r) {
    return null;
  }
  const value = await r.get(CURRENT_SNAPSHOT_VERSION_KEY);
  if (value == null) {
    return null;
  }
  return String(value).trim() || null;
}

export async function l2SetCurrentSnapshotVersion(snapshotVersion, ttlSec = L2_DEFAULT_TTL_SEC) {
  const r = getRedis();
  if (!r) {
    return;
  }
  const normalized = String(snapshotVersion || "").trim();
  if (!normalized) {
    return;
  }
  const ex = Math.min(Math.max(Math.floor(ttlSec), 300), 14 * 24 * 60 * 60);
  await r.set(CURRENT_SNAPSHOT_VERSION_KEY, normalized, { ex });
}

const DEFAULT_REBUILD_LOCK_TTL_SEC = 90;
const SWR_LOCK_TTL_SEC = 60;

/**
 * Anti-stampede: one distributed holder per key. null = not configured or not acquired.
 * @param {string} lockKey
 * @param {number} [ttlSec]
 * @returns {Promise<string | null>}
 */
export async function l2TryAcquireLock(lockKey, ttlSec = DEFAULT_REBUILD_LOCK_TTL_SEC) {
  const r = getRedis();
  if (!r) {
    return null;
  }
  const token = randomBytes(16).toString("hex");
  const ex = Math.min(Math.max(Math.floor(ttlSec), 5), 300);
  const res = await r.set(lockKey, token, { nx: true, ex });
  return res ? token : null;
}

export async function l2TryAcquireRebuildLock(lockKey) {
  return l2TryAcquireLock(lockKey, DEFAULT_REBUILD_LOCK_TTL_SEC);
}

export async function l2TryAcquireSwrLock(swrLockKey) {
  return l2TryAcquireLock(swrLockKey, SWR_LOCK_TTL_SEC);
}

/**
 * @param {string} lockKey
 * @param {string} token
 */
export async function l2ReleaseLock(lockKey, token) {
  const r = getRedis();
  if (!r) {
    return;
  }
  const script = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
  `;
  try {
    await r.eval(script, [lockKey], [token]);
  } catch {
    // lock ttl expiry is the safety net
  }
}

export const l2ReleaseRebuildLock = l2ReleaseLock;

/**
 * @typedef {{
 *   schemaVersion: number
 *   policyVersion: string
 *   fetchedAt: number
 *   source: string
 *   providerMeta: { pagesFetched: number | null }
 *   body: object
 * }} ScheduleSnapshotEnvelope
 */

export function buildSnapshotEnvelopeFromBuild({
  publicPayload,
  policyVersion,
  updatedAt,
  pagesFetched,
}) {
  const body = toCacheShapedBody(publicPayload);
  return {
    schemaVersion: SCHEDULE_SNAPSHOT_SCHEMA_VERSION,
    policyVersion,
    fetchedAt: updatedAt,
    source: "sportmonks_api",
    providerMeta: { pagesFetched: pagesFetched ?? null },
    body,
  };
}

export function toCacheShapedBody(publicPayload) {
  return { ...publicPayload, source: "sportmonks_cache" };
}
