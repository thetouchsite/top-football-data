import { createHash } from "node:crypto";

import { getSportmonksFixtureLeaguesFilterParam } from "@/lib/providers/sportmonks";

import { SCHEDULE_SNAPSHOT_SCHEMA_VERSION } from "./schedule-window-constants";

let cachedPolicyVersion;

/**
 * Deterministic policy id for the schedule feed: league filter string + schedule schema.
 * If allowlist in code or env `SPORTMONKS_SCHEDULE_LEAGUE_IDS` changes, the version changes
 * and L2 key rotates (no stale policy mismatch).
 */
export function getScheduleWindowPolicyVersion() {
  if (cachedPolicyVersion) {
    return cachedPolicyVersion;
  }
  const filterKey = getSportmonksFixtureLeaguesFilterParam();
  const raw = `${SCHEDULE_SNAPSHOT_SCHEMA_VERSION}|${filterKey}`;
  cachedPolicyVersion = createHash("sha256").update(raw).digest("hex").slice(0, 16);
  return cachedPolicyVersion;
}

/**
 * @param {string} policyVersion
 */
export function buildScheduleL2DataKey(safeDays, policyVersion) {
  return `football:schedule:window:${String(safeDays)}:policy:${policyVersion}:data`;
}

/**
 * @param {string} policyVersion
 */
export function buildScheduleL2LockKey(safeDays, policyVersion) {
  return `football:schedule:window:${String(safeDays)}:policy:${policyVersion}:lock`;
}

export function buildScheduleL2SwrLockKey(safeDays, policyVersion) {
  return `football:schedule:window:${String(safeDays)}:policy:${policyVersion}:lock:swr`;
}
