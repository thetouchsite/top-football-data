/**
 * Smoke test: L1 schedule cache + in-process player-profile cache.
 * Requires a running Next dev server (default http://127.0.0.1:3000).
 *
 * Env:
 *   VERIFY_BASE_URL      (default http://localhost:3000 — use 127.0.0.1 if you prefer)
 *   VERIFY_PLAYER_ID     (default 338180 — from sample fixture data)
 *   VERIFY_FIXTURE_ID    optional — if set, runs head-to-head twice (fixture cache path)
 */
const BASE = String(process.env.VERIFY_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const PLAYER_ID = String(process.env.VERIFY_PLAYER_ID || "338180");
const FIXTURE_ID = String(process.env.VERIFY_FIXTURE_ID || "").trim();

function ok(msg) {
  console.log(`[cache-test] OK  ${msg}`);
}
function warn(msg) {
  console.warn(`[cache-test] WARN ${msg}`);
}
function fail(msg) {
  console.error(`[cache-test] FAIL ${msg}`);
}

async function ping() {
  const u = `${BASE}/api/football/schedules/window?days=1`;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 5000);
  try {
    const r = await fetch(u, { signal: ac.signal });
    return r.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

async function runScheduleWindow() {
  const url = `${BASE}/api/football/schedules/window?days=7`;
  const t0 = Date.now();
  const r1 = await fetch(url);
  const ms1 = Date.now() - t0;
  const j1 = await r1.json();
  const t1 = Date.now();
  const r2 = await fetch(url);
  const ms2 = Date.now() - t1;
  const j2 = await r2.json();

  if (!r1.ok) {
    fail(`schedule window #1 HTTP ${r1.status}`);
    return false;
  }
  if (j1?.isFallback && j1?.source === "route_error") {
    fail("schedule window #1 returned route_error / empty fallback");
    return false;
  }

  const s1 = j1?.source ?? "?";
  const s2 = j2?.source ?? "?";
  ok(`schedule #1 source=${s1} ${ms1}ms (cold or warm)`);
  ok(`schedule #2 source=${s2} ${ms2}ms`);

  if (s2 !== "sportmonks_cache" && s2 !== "sportmonks_inflight") {
    warn(
      `schedule #2 expected sportmonks_cache or inflight shared, got "${s2}" (may still be ok if rebuild)`,
    );
  }
  if (s2 === "sportmonks_cache" && ms2 > 3000) {
    warn(`schedule #2 marked cache but slow (${ms2}ms)`);
  }
  return true;
}

async function runPlayerProfile() {
  const url = `${BASE}/api/football/player-profile?playerId=${encodeURIComponent(PLAYER_ID)}`;
  const t0 = Date.now();
  const r1 = await fetch(url);
  const ms1 = Date.now() - t0;
  const j1 = await r1.json();
  const t1 = Date.now();
  const r2 = await fetch(url);
  const ms2 = Date.now() - t1;
  const j2 = await r2.json();

  if (!r1.ok) {
    fail(`player-profile #1 HTTP ${r1.status} — set VERIFY_PLAYER_ID or check API keys`);
    return false;
  }
  if (j1?.error) {
    fail(`player-profile: ${j1.error}`);
    return false;
  }
  if (String(j1?.playerId) !== String(j2?.playerId)) {
    fail("player-profile: playerId mismatch between two responses");
    return false;
  }

  ok(`player-profile #1 ${ms1}ms`);
  ok(`player-profile #2 ${ms2}ms (in-process cache; expect much faster when warm)`);
  if (ms2 > ms1 * 0.9 && ms2 > 200) {
    warn(
      `player-profile: second request not much faster than first (cache may be cold or provider-bound) ms1=${ms1} ms2=${ms2}`,
    );
  }
  return true;
}

async function runHeadToHead() {
  if (!FIXTURE_ID) {
    console.log("[cache-test] skip head-to-head (set VERIFY_FIXTURE_ID to enable)");
    return true;
  }
  const q = (n) =>
    `${BASE}/api/football/head-to-head?fixtureId=${encodeURIComponent(FIXTURE_ID)}&t=${n}`;
  const t0 = Date.now();
  const r1 = await fetch(q(1));
  const ms1 = Date.now() - t0;
  const j1 = await r1.json();
  const t1 = Date.now();
  const r2 = await fetch(q(2));
  const ms2 = Date.now() - t1;
  const j2 = await r2.json();

  if (!r1.ok) {
    fail(`head-to-head #1 HTTP ${r1.status}`);
    return false;
  }
  if (j1?.error) {
    fail(`head-to-head: ${j1.error}`);
    return false;
  }
  ok(`head-to-head #1 ${ms1}ms`);
  ok(`head-to-head #2 ${ms2}ms`);
  if (ms2 > ms1 * 0.85 && ms2 > 300) {
    warn(`head-to-head: second request not faster; fixture L1 may still be filling ms1=${ms1} ms2=${ms2}`);
  }
  return true;
}

async function main() {
  console.log(`[cache-test] BASE=${BASE} PLAYER_ID=${PLAYER_ID}${FIXTURE_ID ? ` FIXTURE_ID=${FIXTURE_ID}` : ""}`);

  const up = await ping();
  if (!up) {
    fail(
      `cannot reach ${BASE} — start the app with: npm run dev (or set VERIFY_BASE_URL)`,
    );
    process.exit(1);
  }

  let all = true;
  all = (await runScheduleWindow()) && all;
  all = (await runPlayerProfile()) && all;
  all = (await runHeadToHead()) && all;

  if (all) {
    console.log("[cache-test] done — see Next terminal for [football][summary] lines on schedule requests");
    process.exit(0);
  }
  process.exit(1);
}

main().catch((e) => {
  fail(String(e?.message || e));
  process.exit(1);
});
