/** L2 + read-path: snapshot schema for JSON in Redis. Bump when the envelope changes. */
export const SCHEDULE_SNAPSHOT_SCHEMA_VERSION = 1;

/** 1m: serve, no background refresh. */
export const SCHEDULE_T_FRESH_MS = 1 * 60_000;

/** 3m: SWR (serve, async single-flight refresh). */
export const SCHEDULE_T_SWR_STALE_MS = 3 * 60_000;

/** 15m: max age for fast serve; beyond this we await rebuild. */
export const SCHEDULE_T_MAX_SERVED_AGE_MS = 15 * 60_000;

/** Max wait when polling L2 while another instance holds the rebuild lock (ms). */
export const SCHEDULE_L2_POLL_REBUILD_MAX_MS = 30_000;

export const SCHEDULE_REBUILD_LOCK_TTL_SEC = 90;

export const READ_META = Symbol.for("@tfd/football/scheduleReadMeta");
