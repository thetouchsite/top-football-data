import { NextResponse } from "next/server";
import {
  readDuelsWonPercentFromRows,
  readPassAccuracyPercentFromRows,
  readPassAccuracyPercentValue,
} from "@/lib/football/passAccuracyFromRows";

function normalizeLeagueName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export const runtime = "nodejs";
const PLAYER_PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;
const PLAYER_PROFILE_CACHE_VERSION = "v19";

/** Statistiche conteggio: evita artefatti float (es. 30.602600000000002) dopo somma su più partite. */
const SEASON_COUNT_FIELDS = new Set([
  "appearances",
  "minutesPlayed",
  "goals",
  "assists",
  "yellowCards",
  "redCards",
  "bench",
  "passes",
  "shotsTotal",
  "shotsOnTarget",
  "touches",
  "tacklesWon",
  "interceptions",
]);

function roundSeasonCountFields(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const out = { ...obj };
  for (const k of SEASON_COUNT_FIELDS) {
    if (out[k] == null) continue;
    const n = Number(out[k]);
    if (Number.isFinite(n)) out[k] = Math.round(n);
  }
  return out;
}

function getCacheStore() {
  if (!globalThis.__footballPlayerProfileCache) {
    globalThis.__footballPlayerProfileCache = new Map();
  }
  return globalThis.__footballPlayerProfileCache;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeMetricKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function pickMediaBundle(entity) {
  const imageUrl =
    entity?.image_path ||
    entity?.image ||
    entity?.logo_path ||
    entity?.logo ||
    entity?.media?.imageUrl ||
    null;
  const thumbUrl =
    entity?.image_path ||
    entity?.thumb_path ||
    entity?.thumb ||
    entity?.logo_path ||
    entity?.media?.thumbUrl ||
    imageUrl ||
    null;
  if (!imageUrl && !thumbUrl) return null;
  return { imageUrl, thumbUrl };
}

function resolveSportmonksBaseUrl() {
  const raw = String(process.env.SPORTMONKS_BASE_URL || "https://api.sportmonks.com/v3").trim();
  const normalized = raw.replace(/\/+$/, "");
  return /\/football$/i.test(normalized) ? normalized : `${normalized}/football`;
}

function getSportmonksToken() {
  const token = String(process.env.SPORTMONKS_API_TOKEN || process.env.SPORTMONKS_API_KEY || "").trim();
  if (!token) throw new Error("Missing SPORTMONKS_API_TOKEN environment variable.");
  return token;
}

async function fetchSportmonksPlayerProfile(playerId) {
  const include = [
    "trophies.league",
    "trophies.season",
    "trophies.trophy",
    "trophies.team",
    "teams.team",
    "statistics.details.type",
    "statistics.team",
    "statistics.season.league",
    "latest.fixture.participants",
    "latest.fixture.league",
    "latest.fixture.scores",
    "latest.details.type",
    "nationality",
    "detailedPosition",
    "metadata.type",
  ].join(";");

  const baseUrl = resolveSportmonksBaseUrl();
  const token = getSportmonksToken();
  const url = new URL(`${baseUrl}/players/${encodeURIComponent(String(playerId))}`);
  url.searchParams.set("api_token", token);
  url.searchParams.set("include", include);
  // Abbastanza righe: statistics (tutte le leghe) è incluso; 100 poteva troncare e perdere is_current.
  url.searchParams.set("per_page", "250");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
    cache: "no-store",
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.message || `Sportmonks players/${playerId} non disponibile.`);
  }

  return json?.data || null;
}

async function fetchSportmonksPlayerCareerTeams(playerId) {
  const baseUrl = resolveSportmonksBaseUrl();
  const token = getSportmonksToken();
  const candidates = [
    `players/${encodeURIComponent(String(playerId))}/teams`,
    `players/${encodeURIComponent(String(playerId))}/career`,
  ];
  for (const pathname of candidates) {
    try {
      const url = new URL(`${baseUrl}/${pathname}`);
      url.searchParams.set("api_token", token);
      url.searchParams.set("include", "team");
      url.searchParams.set("per_page", "200");
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        next: { revalidate: 0 },
        cache: "no-store",
      });
      if (!response.ok) {
        continue;
      }
      const json = await response.json().catch(() => ({}));
      const rows = asArray(json?.data);
      if (rows.length > 0) {
        return rows;
      }
    } catch {
      // continue next candidate
    }
  }
  return [];
}

async function fetchSportmonksSeasonFixturesForTeam(teamId, seasonId, seasonWindow = {}, options = {}) {
  const id = String(teamId || "").trim();
  const season = String(seasonId || "").trim();
  if (!id) return [];

  const baseUrl = resolveSportmonksBaseUrl();
  const token = getSportmonksToken();
  const today = new Date();
  const defaultFromDate = new Date(today);
  defaultFromDate.setDate(defaultFromDate.getDate() - 400);
  const defaultToDate = new Date(today);
  defaultToDate.setDate(defaultToDate.getDate() + 45);
  const seasonStartTs = Date.parse(String(seasonWindow?.starting_at || seasonWindow?.start || ""));
  const seasonEndTs = Date.parse(String(seasonWindow?.ending_at || seasonWindow?.end || ""));
  const fromDate = Number.isFinite(seasonStartTs) ? new Date(seasonStartTs) : defaultFromDate;
  const toDate = Number.isFinite(seasonEndTs) ? new Date(seasonEndTs) : defaultToDate;
  // Widen the window to capture cup/europe fixtures that can spill around league bounds.
  fromDate.setDate(fromDate.getDate() - 60);
  toDate.setDate(toDate.getDate() + 60);
  const from = fromDate.toISOString().slice(0, 10);
  const to = toDate.toISOString().slice(0, 10);
  const rows = [];
  const perPage = 100;

  for (let page = 1; page <= 12; page += 1) {
    const url = new URL(`${baseUrl}/fixtures/between/${encodeURIComponent(from)}/${encodeURIComponent(to)}`);
    url.searchParams.set("api_token", token);
    url.searchParams.set("include", "participants;league;scores;state");
    if (season && options?.applySeasonFilter !== false) {
      url.searchParams.set("filters", `season_id:${season}`);
    }
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("page", String(page));

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
      cache: "no-store",
    });
    if (!response.ok) break;
    const json = await response.json().catch(() => ({}));
    const pageRows = asArray(json?.data);
    if (pageRows.length === 0) break;
    rows.push(...pageRows);
    if (pageRows.length < perPage) break;
  }

  return rows.filter((fixture) =>
    asArray(fixture?.participants).some(
      (participant) => String(participant?.id || "") === String(id),
    ),
  );
}

async function fetchSportmonksCurrentSeasonFixturesForTeam(teamId, seasonRows = []) {
  const rows = asArray(seasonRows);
  const currentRows = rows.filter((row) => row?.season?.is_current === true);
  const candidateRows = currentRows.length > 0 ? currentRows : rows.slice(0, 3);
  const seasonKeys = new Set();
  const collected = [];

  for (const row of candidateRows) {
    const seasonId = String(row?.season?.id || row?.season_id || "").trim();
    if (!seasonId || seasonKeys.has(seasonId)) continue;
    seasonKeys.add(seasonId);
    const fixtures = await fetchSportmonksSeasonFixturesForTeam(teamId, seasonId, row?.season || {});
    fixtures.forEach((fixture) => collected.push(fixture));
  }

  const deduped = new Map();
  collected.forEach((fixture) => {
    const key = String(fixture?.id || "");
    if (!key) return;
    if (!deduped.has(key)) deduped.set(key, fixture);
  });
  return [...deduped.values()];
}

function getCurrentTeamData(playerData) {
  const teams = asArray(playerData?.teams);
  const parseDateMs = (value) => {
    const ts = Date.parse(String(value || ""));
    return Number.isFinite(ts) ? ts : null;
  };
  const sorted = [...teams].sort((left, right) => {
    const leftCurrent = left?.active === true || left?.current === true || left?.is_current === true ? 1 : 0;
    const rightCurrent = right?.active === true || right?.current === true || right?.is_current === true ? 1 : 0;
    if (leftCurrent !== rightCurrent) return rightCurrent - leftCurrent;
    const leftTo = parseDateMs(left?.to || left?.end || left?.contract_end);
    const rightTo = parseDateMs(right?.to || right?.end || right?.contract_end);
    return (rightTo || 0) - (leftTo || 0);
  });
  const preferred = sorted[0] || null;
  const teamObj = preferred?.team || preferred;
  return {
    teamId: preferred?.team_id || teamObj?.id || null,
    teamName: teamObj?.name || preferred?.name || null,
    teamMedia: pickMediaBundle(teamObj || preferred),
  };
}

function pickStatDetail(details, aliases) {
  const normalizedAliases = aliases.map(normalizeMetricKey);
  const readNumeric = (raw, aliasKey = "") => {
    if (raw == null) return null;
    if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
    if (typeof raw === "string") {
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : null;
    }
    if (typeof raw === "object") {
      const alias = normalizeMetricKey(aliasKey);
      const directCandidates =
        alias.includes("goal")
          ? [raw.goals, raw.total, raw.value]
          : alias.includes("rating")
            ? [raw.average, raw.avg, raw.total, raw.value]
            : [raw.total, raw.value, raw.average, raw.avg];
      for (const candidate of directCandidates) {
        const parsed = toNumber(candidate);
        if (parsed != null) return parsed;
      }
      for (const value of Object.values(raw)) {
        const parsed = toNumber(value);
        if (parsed != null) return parsed;
      }
    }
    return null;
  };
  for (const row of asArray(details)) {
    const key = normalizeMetricKey(
      row?.type?.developer_name || row?.type?.name || row?.name || row?.type_id,
    );
    // Evita: alias "…passes…percentage" che matcha la chiave "passes" (conteggio) via alias.includes(key).
    const matchedAlias = normalizedAliases.find(
      (alias) =>
        key === alias || key.includes(alias) || (key.length >= 10 && alias.includes(key)),
    );
    if (matchedAlias) {
      const parsed =
        readNumeric(row?.value, matchedAlias) ??
        readNumeric(row?.data?.value, matchedAlias) ??
        readNumeric(row?.amount, matchedAlias);
      if (parsed != null) return parsed;
    }
  }
  return null;
}

function pickStatFromRowOrDetails(row, aliases, fallback = 0) {
  const direct = aliases
    .map((alias) => {
      const key = normalizeMetricKey(alias);
      return (
        toNumber(row?.[key]) ??
        toNumber(row?.[alias]) ??
        toNumber(row?.data?.[key]) ??
        toNumber(row?.totals?.[key]) ??
        null
      );
    })
    .find((value) => value != null);
  if (direct != null) return direct;
  const fromDetails = pickStatDetail(row?.details, aliases);
  return fromDetails ?? fallback;
}

function extractPreferredFoot(playerData) {
  const direct = String(playerData?.foot || playerData?.preferred_foot || "").trim();
  if (direct) return direct;
  const metaRows = asArray(playerData?.metadata);
  const footMeta = metaRows.find((row) => {
    const k = normalizeMetricKey(row?.type?.name || row?.type?.developer_name || row?.name || row?.key);
    return k.includes("foot") || k.includes("preferredfoot");
  });
  const metaValue = String(
    footMeta?.values || footMeta?.value || footMeta?.data?.value || "",
  ).trim();
  return metaValue || "n/d";
}

function extractAge(playerData) {
  const direct = toNumber(playerData?.age);
  if (direct != null) return direct;
  const birth = String(playerData?.date_of_birth || "").trim();
  if (!birth) return null;
  const ts = Date.parse(birth);
  if (!Number.isFinite(ts)) return null;
  const diffYears = (Date.now() - ts) / (365.25 * 24 * 60 * 60 * 1000);
  return Math.max(0, Math.floor(diffYears));
}

function parseSeasonScoreForSort(row) {
  const seasonObj = row?.season || {};
  if (seasonObj?.is_current === true) return Number.MAX_SAFE_INTEGER;
  const endingTs = Date.parse(String(seasonObj?.ending_at || seasonObj?.end || ""));
  if (Number.isFinite(endingTs)) {
    return Math.floor(endingTs / 1000);
  }
  const seasonId = Number(seasonObj?.id || row?.season_id);
  if (Number.isFinite(seasonId) && seasonId > 0) return seasonId;
  const text = String(seasonObj?.name || seasonObj?.display_name || "");
  const years = text.match(/(19|20)\d{2}/g) || [];
  if (years.length) return Number(years[years.length - 1]);
  const startTs = Date.parse(String(seasonObj?.starting_at || seasonObj?.start || ""));
  if (Number.isFinite(startTs)) return Math.floor(startTs / 1000);
  return 0;
}

function resolveCurrentSeasonId(statistics) {
  const arr = asArray(statistics);
  if (!arr.length) return null;
  const isCur = arr.find((r) => r?.season?.is_current === true);
  if (isCur) {
    const id = String(isCur.season?.id ?? isCur.season_id ?? "").trim();
    if (id) return id;
  }
  const sorted = [...arr].sort(
    (a, b) => parseSeasonScoreForSort(b) - parseSeasonScoreForSort(a),
  );
  const id = String(sorted[0]?.season?.id ?? sorted[0]?.season_id ?? "").trim();
  return id || null;
}

/**
 * Ambito "stagione corrente" per filtrare fixture: evita di sommare partite di carriera
 * (prima arrivavano da una fetch senza season_id su ~13 mesi).
 */
function getCurrentSeasonContextFromStatistics(statisticsRows) {
  const arr = asArray(statisticsRows);
  if (!arr.length) {
    return { seasonIdSet: new Set(), tStart: null, tEnd: null, isEmpty: true };
  }
  const currentRows = arr.filter((r) => r?.season?.is_current === true);
  const dateSourceRows =
    currentRows.length > 0
      ? currentRows
      : (() => {
          const rid = resolveCurrentSeasonId(arr);
          const match = arr.find(
            (r) => String(r?.season?.id ?? r?.season_id ?? "") === String(rid || ""),
          );
          return match ? [match] : [arr[0]].filter(Boolean);
        })();
  const seasonIdSet = new Set();
  for (const r of currentRows) {
    const a = String(r?.season?.id || "").trim();
    const b = String(r?.season_id || "").trim();
    if (a) seasonIdSet.add(a);
    if (b) seasonIdSet.add(b);
  }
  if (seasonIdSet.size === 0) {
    const rid = resolveCurrentSeasonId(arr);
    if (rid) seasonIdSet.add(String(rid));
  }
  let tStart = null;
  let tEnd = null;
  for (const r of currentRows) {
    const s = r?.season;
    const a = Date.parse(String(s?.starting_at || s?.start || ""));
    const b = Date.parse(String(s?.ending_at || s?.end || ""));
    if (Number.isFinite(a)) tStart = tStart == null ? a : Math.min(tStart, a);
    if (Number.isFinite(b)) tEnd = tEnd == null ? b : Math.max(tEnd, b);
  }
  for (const r of dateSourceRows) {
    if (currentRows.length > 0) break;
    const s = r?.season;
    const a = Date.parse(String(s?.starting_at || s?.start || ""));
    const b = Date.parse(String(s?.ending_at || s?.end || ""));
    if (Number.isFinite(a)) tStart = tStart == null ? a : Math.min(tStart, a);
    if (Number.isFinite(b)) tEnd = tEnd == null ? b : Math.max(tEnd, b);
  }
  return { seasonIdSet, tStart, tEnd, isEmpty: false, hasCurrentFlags: currentRows.length > 0 };
}

/**
 * Stretta: solo partite con season_id tra quelli segnalati in statistics come
 * is_current, oppure (se la competizione non ha stesso id) data nel range
 * [tStart, tEnd] con margine ridotto. Senza is_current, si usa la sola
 * riga/season scelta in fallback: finestra minima, meno "spaghetti" tra anni.
 */
function isFixtureInCurrentSeasonContext(fixture, ctx) {
  if (!fixture) return false;
  if (ctx.isEmpty) return true;
  const sid = String(fixture?.season_id ?? fixture?.season?.id ?? "").trim();
  if (ctx.seasonIdSet.size > 0 && sid && ctx.seasonIdSet.has(sid)) {
    if (ctx.hasCurrentFlags && ctx.tStart != null && ctx.tEnd != null) {
      const fts = Date.parse(String(fixture?.starting_at || fixture?.startingAt || ""));
      if (Number.isFinite(fts) && (fts < ctx.tStart - 2 * 86400000 || fts > ctx.tEnd + 50 * 86400000)) {
        return false;
      }
    }
    return true;
  }
  const fts = Date.parse(String(fixture?.starting_at || fixture?.startingAt || ""));
  if (Number.isFinite(fts) && ctx.tStart != null && ctx.tEnd != null) {
    const lead = 2 * 24 * 60 * 60 * 1000;
    const tail = 50 * 24 * 60 * 60 * 1000;
    if (fts >= ctx.tStart - lead && fts <= ctx.tEnd + tail) {
      return true;
    }
  }
  return false;
}

function filterLatestRowsToCurrentSeason(latest, teamId, ctx) {
  if (ctx.isEmpty) return asArray(latest);
  return asArray(latest).filter((row) => {
    if (teamId) {
      const rowTeam = String(row?.participant_id || row?.team_id || "").trim();
      if (rowTeam && rowTeam !== String(teamId)) return false;
    }
    return isFixtureInCurrentSeasonContext(row?.fixture || row, ctx);
  });
}

function mapPlayerStatisticsEntry(row) {
  const details = asArray(row?.details);
  const seasonName =
    row?.season?.name ||
    row?.season?.display_name ||
    row?.season?.league?.name ||
    `Season ${row?.season_id || ""}`.trim();
  const leagueName = row?.season?.league?.name || null;
  const teamName = row?.team?.name || null;
  const labelParts = [];
  if (seasonName) labelParts.push(seasonName);
  if (leagueName && leagueName !== seasonName) labelParts.push(leagueName);
  if (teamName && !labelParts.includes(teamName)) labelParts.push(teamName);
  const uniqueLabel =
    labelParts.length > 0 ? labelParts.join(" · ") : seasonName || "Stagione";
  const seasonValue = [
    "s",
    String(row?.season?.id ?? row?.season_id ?? "x"),
    "l",
    String(row?.season?.league?.id ?? "x"),
    "t",
    String(row?.team_id ?? row?.team?.id ?? "x"),
  ].join("-");
  const yellowCards = pickStatDetail(details, ["yellow_cards", "yellow_card"]);
  const redCards = pickStatDetail(details, ["red_cards", "red_card"]);
  const bench = pickStatDetail(details, ["bench", "appearances_from_bench"]);
  const base = {
    season: uniqueLabel,
    seasonValue,
    seasonLabel: uniqueLabel,
    leagueName,
    teamName: teamName || null,
    seasonId: row?.season?.id ?? row?.season_id ?? null,
    appearances: pickStatFromRowOrDetails(row, ["appearances", "matches_played"]) ?? 0,
    minutesPlayed: pickStatFromRowOrDetails(row, ["minutes_played", "minutes"]) ?? 0,
    goals: pickStatFromRowOrDetails(row, ["goals", "goals_scored"]) ?? 0,
    assists: pickStatFromRowOrDetails(row, ["assists"]) ?? 0,
    yellowCards: yellowCards ?? pickStatFromRowOrDetails(row, ["yellow_cards", "yellow_card"]) ?? 0,
    redCards: redCards ?? pickStatFromRowOrDetails(row, ["red_cards", "red_card"]) ?? 0,
    rating: pickStatFromRowOrDetails(row, ["rating", "average_rating"], null),
    bench: bench ?? pickStatFromRowOrDetails(row, ["bench", "appearances_from_bench"]) ?? 0,
    passes: pickStatFromRowOrDetails(row, ["passes_total", "passes"]) ?? 0,
    shotsTotal: pickStatFromRowOrDetails(row, ["shots_total", "total_shots", "shots"]) ?? 0,
    shotsOnTarget: pickStatFromRowOrDetails(row, ["shots_on_target"]) ?? 0,
    touches: pickStatDetail(details, ["touches"]) ?? 0,
    tacklesWon: pickStatDetail(details, ["tackles_won", "tackleswon"]) ?? 0,
    interceptions: pickStatDetail(details, ["interceptions"]) ?? 0,
    duelsWonPct: (() => {
      const fromKeys = readDuelsWonPercentFromRows(
        details,
        (r) => {
          const raw = r?.value ?? r?.data?.value;
          if (raw == null) return null;
          if (typeof raw === "number" || typeof raw === "string") return toNumber(raw);
          if (typeof raw === "object" && raw) {
            return toNumber(raw.total ?? raw.value ?? raw.average);
          }
          return null;
        },
        (r) =>
          normalizeMetricKey(
            r?.type?.developer_name || r?.type?.name || r?.name || r?.type_id,
          ),
      );
      if (fromKeys > 0) return fromKeys;
      const p = pickStatDetail(details, ["duels_won_percentage"]);
      if (p == null) return null;
      return readPassAccuracyPercentValue(p);
    })(),
    passAccuracyPct: (() => {
      const fromNames = readPassAccuracyPercentFromRows(
        details,
        (r) => {
          const raw = r?.value ?? r?.data?.value;
          if (raw == null) return null;
          if (typeof raw === "number" || typeof raw === "string") return toNumber(raw);
          if (typeof raw === "object" && raw) {
            return toNumber(raw.total ?? raw.value ?? raw.average);
          }
          return null;
        },
        (r) =>
          normalizeMetricKey(
            r?.type?.developer_name || r?.type?.name || r?.name || r?.type_id,
          ),
      );
      if (fromNames > 0) return fromNames;
      const p = pickStatDetail(details, [
        "accurate_passes_percentage",
        "passaccuracy",
        "passes_accuracy",
      ]);
      if (p != null && p > 100) return null;
      return p;
    })(),
    seasonXg: pickStatDetail(details, ["expected_goals", "5304", "xg"]) ?? null,
    seasonXgot: pickStatDetail(details, ["expected_goals_on_target", "5305", "xgot"]) ?? null,
    seasonXgOpenPlay: pickStatDetail(details, ["expected_goals_open_play"]) ?? null,
    seasonXgSetPiece: pickStatDetail(details, ["expected_goals_set_play"]) ?? null,
    seasonXgCorners: pickStatDetail(details, ["expected_goals_corners"]) ?? null,
    seasonXgNonPenalty:
      pickStatDetail(details, [
        "expected_non_penalty_goals",
        "expected_goals_non_penalty_goals",
      ]) ?? null,
    expectedPoints: pickStatDetail(details, ["expected_points"]) ?? null,
    eshots: pickStatDetail(details, ["expected_shots", "expected_shots_total"]) ?? null,
    shootingPerformance: pickStatDetail(details, ["shooting_performance"]) ?? null,
  };
  return roundSeasonCountFields(base);
}

function aggregateCurrentSeasonStats(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }
  if (rows.length === 1) {
    return roundSeasonCountFields({ ...rows[0] });
  }
  const n = (v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? 0 : Number(v));
  const sum = (k) => rows.reduce((a, r) => a + n(r[k]), 0);
  const sumNullable = (k) => {
    const vals = rows
      .map((r) => r[k])
      .filter((v) => v != null && Number.isFinite(Number(v)));
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + Number(b), 0);
  };
  const minutesWeighted = (k) => {
    let w = 0;
    let s = 0;
    for (const r of rows) {
      const m = n(r.minutesPlayed);
      const v = r[k];
      if (v == null || !Number.isFinite(Number(v)) || m <= 0) continue;
      s += Number(v) * m;
      w += m;
    }
    return w > 0 ? Math.round((s / w) * 1000) / 1000 : null;
  };
  const passWeighted = () => {
    let acc = 0;
    let tot = 0;
    for (const r of rows) {
      const p = n(r.passes);
      const pct = r.passAccuracyPct;
      if (pct == null || !Number.isFinite(Number(pct)) || p <= 0) continue;
      acc += (Number(pct) / 100) * p;
      tot += p;
    }
    return tot > 0 ? Math.round((acc / tot) * 10000) / 100 : null;
  };
  return roundSeasonCountFields({
    appearances: sum("appearances"),
    minutesPlayed: sum("minutesPlayed"),
    goals: sum("goals"),
    assists: sum("assists"),
    yellowCards: sum("yellowCards"),
    redCards: sum("redCards"),
    bench: sum("bench"),
    passes: sum("passes"),
    shotsTotal: sum("shotsTotal"),
    shotsOnTarget: sum("shotsOnTarget"),
    touches: sum("touches"),
    tacklesWon: sum("tacklesWon"),
    interceptions: sum("interceptions"),
    rating: minutesWeighted("rating"),
    passAccuracyPct: passWeighted(),
    duelsWonPct: minutesWeighted("duelsWonPct"),
    seasonXg: sumNullable("seasonXg"),
    seasonXgot: sumNullable("seasonXgot"),
    seasonXgOpenPlay: sumNullable("seasonXgOpenPlay"),
    seasonXgSetPiece: sumNullable("seasonXgSetPiece"),
    seasonXgCorners: sumNullable("seasonXgCorners"),
    seasonXgNonPenalty: sumNullable("seasonXgNonPenalty"),
    expectedPoints: sumNullable("expectedPoints"),
    eshots: sumNullable("eshots"),
    shootingPerformance: minutesWeighted("shootingPerformance"),
  });
}

/**
 * Stessa base di "Statistiche partite": aggreghiamo le righe latest per
 * lega (fixture.league) così compaiono UCL, Coppa, etc. se mancano da statistics.
 */
function buildSeasonStatsFromMatchRows(rowsSource, teamId, seasonCtx) {
  const n = (v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? 0 : Number(v));
  const rows = asArray(rowsSource);
  const filteredRows =
    seasonCtx && !seasonCtx.isEmpty
      ? rows.filter((row) => isFixtureInCurrentSeasonContext(row?.fixture || row, seasonCtx))
      : rows;
  const readNumDetail = (details, aliases) => {
    const d = asArray(details);
    const p = pickStatDetail(d, aliases);
    if (p == null || !Number.isFinite(Number(p))) return 0;
    return Math.max(0, n(p));
  };
  const readNullableDetail = (details, aliases) => {
    const p = pickStatDetail(asArray(details), aliases);
    if (p == null || !Number.isFinite(Number(p))) return null;
    return n(p);
  };
  const readPassPctForMatch = (details) => {
    const d = asArray(details);
    return readPassAccuracyPercentFromRows(
      d,
      (r) => {
        const raw = r?.value ?? r?.data?.value;
        if (raw == null) return null;
        if (typeof raw === "number" || typeof raw === "string") return toNumber(raw);
        if (typeof raw === "object" && raw) {
          return toNumber(raw.total ?? raw.value ?? raw.average);
        }
        return null;
      },
      (r) =>
        normalizeMetricKey(
          r?.type?.developer_name || r?.type?.name || r?.name || r?.type_id,
        ),
    );
  };
  const readDuelsPctForMatch = (details) => {
    const d = asArray(details);
    return readDuelsWonPercentFromRows(
      d,
      (r) => {
        const raw = r?.value ?? r?.data?.value;
        if (raw == null) return null;
        if (typeof raw === "number" || typeof raw === "string") return toNumber(raw);
        if (typeof raw === "object" && raw) {
          return toNumber(raw.total ?? raw.value ?? raw.average);
        }
        return null;
      },
      (r) =>
        normalizeMetricKey(
          r?.type?.developer_name || r?.type?.name || r?.name || r?.type_id,
        ),
    );
  };
  const groups = new Map();
  for (const row of filteredRows) {
    if (teamId) {
      const rowTeam = String(row?.participant_id || row?.team_id || "").trim();
      if (rowTeam && rowTeam !== String(teamId)) continue;
    }
    const fixture = row?.fixture || row;
    const details = asArray(row?.details);
    const leagueName = String(fixture?.league?.name || "Competizione").trim();
    const gKey = leagueName;
    if (!groups.has(gKey)) {
      groups.set(gKey, {
        _ratingNum: 0,
        _ratingW: 0,
        _passAccNum: 0,
        _passW: 0,
        _duelNum: 0,
        _duelW: 0,
        _shootingNum: 0,
        _shootingW: 0,
        minutesPlayed: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        shotsTotal: 0,
        shotsOnTarget: 0,
        passes: 0,
        touches: 0,
        tacklesWon: 0,
        interceptions: 0,
        bench: 0,
        seasonXg: 0,
        _hasXg: false,
        seasonXgot: 0,
        _hasXgot: false,
        seasonXgOpenPlay: 0,
        _hasXgOp: false,
        seasonXgSetPiece: 0,
        _hasXgSp: false,
        seasonXgCorners: 0,
        _hasXgCor: false,
        seasonXgNonPenalty: 0,
        _hasXgNp: false,
        expectedPoints: 0,
        _hasEp: false,
        eshots: 0,
        _hasEsh: false,
        _minutesGames: 0,
        leagueId: null,
      });
    }
    const g = groups.get(gKey);
    const leagueIdFromFix = fixture?.league?.id;
    if (g.leagueId == null && leagueIdFromFix != null && String(leagueIdFromFix) !== "") {
      g.leagueId = String(leagueIdFromFix);
    }
    const min = readNumDetail(details, ["minutes_played", "minutes", "119"]);
    g.minutesPlayed += min;
    if (min > 0) g._minutesGames += 1;
    g.goals += readNumDetail(details, ["goals", "52"]);
    g.assists += readNumDetail(details, ["assists"]);
    g.yellowCards += readNumDetail(details, ["yellow_cards", "yellow_card"]);
    g.redCards += readNumDetail(details, ["red_cards", "red_card"]);
    g.shotsTotal += readNumDetail(details, ["shots_total", "shots", "42"]);
    g.shotsOnTarget += readNumDetail(details, ["shots_on_target"]);
    const pThis = readNumDetail(details, ["passes", "passes_total"]);
    g.passes += pThis;
    g.touches += readNumDetail(details, ["touches"]);
    g.tacklesWon += readNumDetail(details, ["tackles_won", "tackleswon"]);
    g.interceptions += readNumDetail(details, ["interceptions"]);
    g.bench += readNumDetail(details, ["bench", "appearances_from_bench"]);
    const rating = (() => {
      const val = pickStatDetail(details, ["rating", "118", "average_rating"]);
      if (val == null || !Number.isFinite(Number(val))) return null;
      const rv = Number(val);
      if (rv < 1 || rv > 10) return null;
      return Math.round(rv * 100) / 100;
    })();
    if (rating != null && min > 0) {
      g._ratingNum += rating * min;
      g._ratingW += min;
    }
    const pPct = readPassPctForMatch(details);
    if (pThis > 0 && pPct > 0 && pPct <= 100) {
      g._passAccNum += (pPct / 100) * pThis;
      g._passW += pThis;
    }
    const dPct = readDuelsPctForMatch(details);
    if (dPct > 0 && dPct <= 100 && min > 0) {
      g._duelNum += dPct * min;
      g._duelW += min;
    }
    const shPerf = readNullableDetail(details, ["shooting_performance"]);
    if (shPerf != null && min > 0) {
      g._shootingNum += shPerf * min;
      g._shootingW += min;
    }
    const addN = (key, hKey, aliases) => {
      const v = readNullableDetail(details, aliases);
      if (v == null) return;
      g[key] += v;
      g[hKey] = true;
    };
    addN("seasonXg", "_hasXg", ["expected_goals", "5304", "xg"]);
    addN("seasonXgot", "_hasXgot", ["expected_goals_on_target", "5305", "xgot"]);
    addN("seasonXgOpenPlay", "_hasXgOp", ["expected_goals_open_play"]);
    addN("seasonXgSetPiece", "_hasXgSp", ["expected_goals_set_play"]);
    addN("seasonXgCorners", "_hasXgCor", ["expected_goals_corners"]);
    addN("seasonXgNonPenalty", "_hasXgNp", [
      "expected_non_penalty_goals",
      "expected_goals_non_penalty_goals",
    ]);
    addN("expectedPoints", "_hasEp", ["expected_points"]);
    addN("eshots", "_hasEsh", ["expected_shots", "expected_shots_total"]);
  }
  const out = [];
  let idx = 0;
  for (const [leagueName, g] of groups) {
    const xgN = (has, v) => (has ? v : null);
    out.push(
      roundSeasonCountFields({
        season: `Da partite · ${leagueName}`,
        seasonValue: `match:${encodeURIComponent(leagueName)}:${idx}`,
        seasonLabel: leagueName,
        competitionName: leagueName,
        competitionValue: `match:${encodeURIComponent(leagueName)}:${idx}`,
        leagueId: g.leagueId,
        statsSource: "matches",
        appearances: g._minutesGames,
        minutesPlayed: g.minutesPlayed,
        goals: g.goals,
        assists: g.assists,
        yellowCards: g.yellowCards,
        redCards: g.redCards,
        rating:
          g._ratingW > 0 ? Math.round((g._ratingNum / g._ratingW) * 100) / 100 : null,
        bench: g.bench,
        passes: g.passes,
        shotsTotal: g.shotsTotal,
        shotsOnTarget: g.shotsOnTarget,
        touches: g.touches,
        tacklesWon: g.tacklesWon,
        interceptions: g.interceptions,
        passAccuracyPct: g._passW > 0 ? (g._passAccNum / g._passW) * 100 : null,
        duelsWonPct: g._duelW > 0 ? g._duelNum / g._duelW : null,
        seasonXg: xgN(g._hasXg, g.seasonXg),
        seasonXgot: xgN(g._hasXgot, g.seasonXgot),
        seasonXgOpenPlay: xgN(g._hasXgOp, g.seasonXgOpenPlay),
        seasonXgSetPiece: xgN(g._hasXgSp, g.seasonXgSetPiece),
        seasonXgCorners: xgN(g._hasXgCor, g.seasonXgCorners),
        seasonXgNonPenalty: xgN(g._hasXgNp, g.seasonXgNonPenalty),
        expectedPoints: xgN(g._hasEp, g.expectedPoints),
        eshots: xgN(g._hasEsh, g.eshots),
        shootingPerformance:
          g._shootingW > 0
            ? Math.round((g._shootingNum / g._shootingW) * 1000) / 1000
            : null,
      }),
    );
    idx += 1;
  }
  return out;
}

/** Stessa lega, metriche "expected" (API sovente le ha null; le partite le sommano). */
const SEASON_NULLABLE_EXTRAS = [
  "seasonXg",
  "seasonXgot",
  "seasonXgOpenPlay",
  "seasonXgSetPiece",
  "seasonXgCorners",
  "seasonXgNonPenalty",
  "expectedPoints",
  "eshots",
  "shootingPerformance",
];

function seasonRowLeagueKey(r) {
  if (r?.leagueId != null && String(r.leagueId) !== "") {
    return `id:${r.leagueId}`;
  }
  return `n:${normalizeLeagueName(r.competitionName || r.leagueName || "comp")}`;
}

/**
 * Aggrouppa per lega. Base = riga API se c’è; altrimenti riga "da partite". Presenze e gol
 * restano dall’API; i campi in SEASON_NULLABLE_EXTRAS vengono presi dalle partite se l’API è null
 * (prima l’inclusione match veniva scartata del tutto per quella lega, perdendo l’xG sommato).
 */
function mergeByLeagueKey(rows) {
  const groups = new Map();
  for (const r of asArray(rows)) {
    const k = seasonRowLeagueKey(r);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  const out = [];
  for (const g of groups.values()) {
    if (g.length === 1) {
      out.push(g[0]);
      continue;
    }
    const apiRow = g.find((r) => r?.statsSource === "api");
    if (apiRow) {
      const result = { ...apiRow };
      for (const other of g) {
        if (other === apiRow) continue;
        for (const field of SEASON_NULLABLE_EXTRAS) {
          const oV = other[field];
          if (oV == null || !Number.isFinite(Number(oV))) continue;
          const cV = result[field];
          if (cV == null || !Number.isFinite(Number(cV))) {
            result[field] = oV;
            continue;
          }
          if (Number(cV) === 0 && Number(oV) > 0) {
            result[field] = oV;
          }
        }
      }
      out.push(roundSeasonCountFields(result));
      continue;
    }
    const result = { ...g[0] };
    for (const other of g.slice(1)) {
      for (const field of SEASON_NULLABLE_EXTRAS) {
        const oV = other[field];
        if (oV == null || !Number.isFinite(Number(oV))) continue;
        const cV = result[field];
        if (cV == null || !Number.isFinite(Number(cV))) {
          result[field] = oV;
          continue;
        }
        if (Number(cV) === 0 && Number(oV) > 0) {
          result[field] = oV;
        }
      }
    }
    out.push(roundSeasonCountFields(result));
  }
  return out;
}

function mergeApiAndMatchSeasonStats(apiSeason, matchDerivedRows) {
  const apiRows = asArray(apiSeason?.byCompetition);
  const mRows = asArray(matchDerivedRows);
  if (!mRows.length) {
    return apiSeason;
  }
  if (!apiRows.length) {
    const sorted = mergeByLeagueKey(mRows).sort((a, b) =>
      String(a.competitionName).localeCompare(String(b.competitionName), "it"),
    );
    return {
      byCompetition: sorted,
      allCompetitions: sorted.length
        ? {
            ...aggregateCurrentSeasonStats(sorted),
            competitionName: "Tutte le competizioni",
            competitionValue: "__all__",
          }
        : null,
      seasonLabel: apiSeason?.seasonLabel || null,
    };
  }
  const merged = [...apiRows, ...mRows];
  const deduped = mergeByLeagueKey(merged);
  deduped.sort((a, b) =>
    String(a.competitionName).localeCompare(String(b.competitionName), "it"),
  );
  const all =
    deduped.length > 0
      ? {
          ...aggregateCurrentSeasonStats(deduped),
          competitionName: "Tutte le competizioni",
          competitionValue: "__all__",
        }
      : null;
  return {
    byCompetition: deduped,
    allCompetitions: all,
    seasonLabel: apiSeason?.seasonLabel || null,
  };
}

function buildCurrentSeasonByCompetition(playerData) {
  const statistics = asArray(playerData?.statistics);
  const withCurrent = statistics.filter((r) => r?.season?.is_current === true);
  const seasonId = resolveCurrentSeasonId(statistics);
  if (withCurrent.length === 0 && !seasonId) {
    return { byCompetition: [], allCompetitions: null, seasonLabel: null };
  }
  const filtered =
    withCurrent.length > 0
      ? withCurrent
      : statistics.filter(
          (r) => String(r?.season?.id ?? r?.season_id ?? "") === String(seasonId),
        );
  const byCompetition = filtered
    .map((row, idx) => {
      const base = mapPlayerStatisticsEntry(row);
      const league = row?.season?.league;
      const cName = league?.name || base.leagueName || "Competizione";
      const compId = league?.id ?? "n";
      const leagueId = league?.id != null && league?.id !== "" ? String(league.id) : null;
      return {
        ...base,
        competitionName: cName,
        competitionValue: `l${String(compId)}-i${idx}`,
        leagueId,
        statsSource: "api",
      };
    })
    .sort((a, b) =>
      String(a.competitionName).localeCompare(String(b.competitionName), "it"),
    );
  const allCompetitions = byCompetition.length
    ? {
        ...aggregateCurrentSeasonStats(byCompetition),
        competitionName: "Tutte le competizioni",
        competitionValue: "__all__",
      }
    : null;
  const seasonLabel =
    filtered[0]?.season?.name ||
    filtered[0]?.season?.display_name ||
    null;
  return { byCompetition, allCompetitions, seasonLabel };
}

function buildSeasonsFromStatistics() {
  return [];
}

function buildCareer(playerData = {}, externalCareerRows = []) {
  const nationalityName = String(playerData?.nationality?.name || "").toLowerCase();
  const parseDate = (value) => {
    const ts = Date.parse(String(value || ""));
    return Number.isFinite(ts) ? ts : null;
  };
  const sourceRows = [
    ...asArray(externalCareerRows),
    ...asArray(playerData?.teams || playerData?.team_history || playerData?.career_teams),
  ];
  const teams = sourceRows
    .filter((row) => {
      const teamName = String(row?.team?.name || row?.name || row?.team_name || "").toLowerCase();
      const typeName = String(row?.type?.name || row?.team?.type || row?.category || "").toLowerCase();
      if (!teamName) return false;
      if (teamName === nationalityName) return false;
      if (typeName.includes("national")) return false;
      return true;
    })
    .map((row) => ({
      teamName: row?.team?.name || row?.name || row?.team_name || "Team",
      teamMedia: pickMediaBundle(row?.team || row),
      period:
        row?.period ||
        row?.duration ||
        [
          row?.from ||
            row?.start ||
            row?.starting_at ||
            row?.joined_at ||
            row?.contract_start,
          row?.to || row?.end || row?.ending_at || row?.left_at || row?.contract_end,
        ]
          .filter(Boolean)
          .join(" - ") ||
        "n/d",
      startDate:
        row?.from || row?.start || row?.starting_at || row?.joined_at || row?.contract_start || null,
      endDate: row?.to || row?.end || row?.ending_at || row?.left_at || row?.contract_end || null,
    }))
    .filter((row) => row.teamName)
    .sort((left, right) => {
      const leftEnd = parseDate(left.endDate);
      const rightEnd = parseDate(right.endDate);
      return (rightEnd || 0) - (leftEnd || 0);
    });
  const seen = new Set();
  return teams.filter((row) => {
    const key = `${row.teamName}|${row.period}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildHonors(playerData = {}) {
  const deriveYearLabel = (row) => {
    const explicitYear = String(row?.year || "").trim();
    if (explicitYear) return explicitYear;
    const seasonName = String(row?.season?.name || row?.season?.display_name || "").trim();
    if (seasonName) return seasonName;
    const start = String(row?.season?.starting_at || "").slice(0, 4);
    const end = String(row?.season?.ending_at || "").slice(0, 4);
    if (start && end) return `${start}/${end}`;
    if (start) return start;
    if (end) return end;
    return null;
  };
  return asArray(playerData?.trophies || playerData?.honours || playerData?.honors)
    .map((row) => ({
      id: String(row?.id || `${row?.team_id || "team"}-${row?.trophy_id || row?.name || "trophy"}-${row?.season_id || row?.year || "season"}`),
      title: row?.trophy?.name || row?.name || "Trofeo",
      teamName: row?.team?.name || row?.team_name || "Team",
      teamMedia: pickMediaBundle(row?.team),
      leagueName: row?.league?.name || null,
      leagueMedia: pickMediaBundle(row?.league),
      trophyMedia: pickMediaBundle(row?.trophy),
      year: deriveYearLabel(row),
      outcome:
        Number(row?.trophy?.position) === 1
          ? "Winner"
          : Number(row?.trophy?.position) === 2
            ? "Runner-up"
            : null,
    }))
    .sort((left, right) => String(right.year).localeCompare(String(left.year)));
}

function buildHonorsByTeam(honors = []) {
  const map = new Map();
  honors.forEach((item) => {
    const key = String(item.teamName || "Team");
    if (!map.has(key)) {
      map.set(key, {
        teamName: item.teamName || "Team",
        teamMedia: item.teamMedia || null,
        trophies: [],
      });
    }
    map.get(key).trophies.push(item);
  });
  return [...map.values()]
    .map((group) => ({
      ...group,
      trophiesCount: group.trophies.length,
    }))
    .sort((left, right) => right.trophiesCount - left.trophiesCount);
}

function extractScore(fixture) {
  const scores = asArray(fixture?.scores);
  const participants = asArray(fixture?.participants);
  const homeParticipant =
    participants.find((p) => String(p?.meta?.location || p?.location || "").toLowerCase() === "home") ||
    participants[0] ||
    null;
  const awayParticipant =
    participants.find((p) => String(p?.meta?.location || p?.location || "").toLowerCase() === "away") ||
    participants.find((p) => String(p?.id || "") !== String(homeParticipant?.id || "")) ||
    participants[1] ||
    null;
  const currentRows = scores.filter((row) => String(row?.description || "").toLowerCase() === "current");
  const normalized = currentRows.length > 0 ? currentRows : scores;
  const readGoals = (row) =>
    toNumber(row?.score?.goals) ??
    toNumber(row?.score?.total) ??
    toNumber(row?.score) ??
    toNumber(row?.goals) ??
    0;
  const homeRow = normalized.find(
    (row) => String(row?.participant_id || row?.participantId || "") === String(homeParticipant?.id || ""),
  );
  const awayRow = normalized.find(
    (row) => String(row?.participant_id || row?.participantId || "") === String(awayParticipant?.id || ""),
  );
  if (homeRow || awayRow) {
    return {
      home: readGoals(homeRow),
      away: readGoals(awayRow),
    };
  }
  const homeByLabel = normalized.find(
    (row) => String(row?.score?.participant || row?.participant || "").toLowerCase() === "home",
  );
  const awayByLabel = normalized.find(
    (row) => String(row?.score?.participant || row?.participant || "").toLowerCase() === "away",
  );
  if (homeByLabel || awayByLabel) {
    return {
      home: readGoals(homeByLabel),
      away: readGoals(awayByLabel),
    };
  }
  return {
    home: 0,
    away: 0,
  };
}

function buildMatchStatsRows(latestRows, teamId, seasonCtx) {
  const base = asArray(latestRows);
  const pre =
    seasonCtx && !seasonCtx.isEmpty
      ? base.filter((row) => isFixtureInCurrentSeasonContext(row?.fixture || row, seasonCtx))
      : base;
  return pre
    .sort((left, right) => {
      const leftFixture = left?.fixture || left;
      const rightFixture = right?.fixture || right;
      const leftTs = Date.parse(String(leftFixture?.starting_at || leftFixture?.startingAt || ""));
      const rightTs = Date.parse(String(rightFixture?.starting_at || rightFixture?.startingAt || ""));
      return (Number.isFinite(rightTs) ? rightTs : 0) - (Number.isFinite(leftTs) ? leftTs : 0);
    })
    .map((row) => {
      const fixture = row?.fixture || row;
      const participants = asArray(fixture?.participants);
      const home = participants.find((p) => String(p?.meta?.location || p?.location).toLowerCase() === "home");
      const away = participants.find((p) => String(p?.meta?.location || p?.location).toLowerCase() === "away");
      const score = extractScore(fixture);
      const matchParticipantId = String(row?.participant_id || row?.team_id || teamId || "");
      const isHome =
        matchParticipantId && String(home?.id || "") === matchParticipantId
          ? true
          : matchParticipantId && String(away?.id || "") === matchParticipantId
            ? false
            : String(home?.id || "") === String(teamId || "");
      const details = asArray(row?.details);
      const opponentParticipant = isHome ? away : home;
      return {
        fixtureId: String(fixture?.id || ""),
        date: String(fixture?.starting_at || fixture?.startingAt || "").slice(0, 10) || "n/d",
        league: fixture?.league?.name || "Competizione",
        leagueMedia: pickMediaBundle(fixture?.league),
        opponent: isHome ? away?.name || "Away" : home?.name || "Home",
        opponentMedia: pickMediaBundle(opponentParticipant),
        opponentCode:
          String(
            opponentParticipant?.short_code ||
              opponentParticipant?.shortCode ||
              opponentParticipant?.code ||
              "",
          ).trim() || null,
        result: `${score.home}-${score.away}`,
        stats: {
          minutes: Math.max(0, Math.round(pickStatDetail(details, ["minutes_played", "minutes"]) ?? 0)),
          goals: Math.max(0, Math.round(pickStatDetail(details, ["goals"]) ?? 0)),
          assists: Math.max(0, Math.round(pickStatDetail(details, ["assists"]) ?? 0)),
          shots: Math.max(0, Math.round(pickStatDetail(details, ["shots_total", "shots"]) ?? 0)),
          yellow: Math.max(0, Math.round(pickStatDetail(details, ["yellow_cards", "yellow_card"]) ?? 0)),
          red: Math.max(0, Math.round(pickStatDetail(details, ["red_cards", "red_card"]) ?? 0)),
          rating: (() => {
            const val = pickStatDetail(details, ["rating", "average_rating"]);
            if (val == null || !Number.isFinite(Number(val))) return null;
            const n = Number(val);
            // Ratings in football feeds are typically on 1-10 scale.
            if (n < 1 || n > 10) return null;
            return Math.round(n * 100) / 100;
          })(),
        },
      };
    })
    .slice(0, 38);
}

export async function GET(request) {
  try {
    const playerId = request.nextUrl.searchParams.get("playerId");
    const teamNameFromClient = request.nextUrl.searchParams.get("teamName");
    if (!playerId) {
      return NextResponse.json({ error: "playerId obbligatorio." }, { status: 400 });
    }

    const debugProfile = request.nextUrl.searchParams.get("debugProfile") === "1";
    const cacheKey = `${PLAYER_PROFILE_CACHE_VERSION}:player:${String(playerId)}`;
    const cacheStore = getCacheStore();
    const now = Date.now();
    const cached = cacheStore.get(cacheKey);
    if (
      !debugProfile &&
      cached &&
      now - cached.updatedAt < PLAYER_PROFILE_CACHE_TTL_MS
    ) {
      return NextResponse.json(cached.payload);
    }

    const [playerData, careerRows] = await Promise.all([
      fetchSportmonksPlayerProfile(playerId),
      fetchSportmonksPlayerCareerTeams(playerId),
    ]);
    if (!playerData) {
      return NextResponse.json({ error: "Giocatore non disponibile nel feed." }, { status: 404 });
    }

    const teamInfo = getCurrentTeamData(playerData);
    const seasons = buildSeasonsFromStatistics();
    const career = buildCareer(playerData, careerRows);
    const honors = buildHonors(playerData);
    const honorsByTeam = buildHonorsByTeam(honors);
    const statisticsRows = asArray(playerData?.statistics);
    const currentSeasonRow =
      statisticsRows.find((row) => row?.season?.is_current === true) ||
      statisticsRows[0] ||
      null;
    const currentSeasonId = Number(currentSeasonRow?.season?.id || currentSeasonRow?.season_id || null) || null;
    const seasonCtx = getCurrentSeasonContextFromStatistics(statisticsRows);
    const seasonFixturesRaw = await fetchSportmonksCurrentSeasonFixturesForTeam(
      teamInfo.teamId,
      statisticsRows,
    );
    const seasonFixtures = seasonFixturesRaw.filter((fx) =>
      isFixtureInCurrentSeasonContext(fx, seasonCtx),
    );
    const latestByFixture = new Map(
      asArray(playerData?.latest).map((row) => [String((row?.fixture || row)?.id || ""), row]),
    );
    const mergedRows = seasonFixtures.map((fixtureRow) => {
      const fixtureId = String(fixtureRow?.id || "");
      const latestRow = latestByFixture.get(fixtureId);
      if (!latestRow) {
        return {
          fixture: fixtureRow,
          participant_id: teamInfo.teamId,
          details: [],
        };
      }
      return {
        ...latestRow,
        fixture: {
          ...fixtureRow,
          ...((latestRow?.fixture && typeof latestRow.fixture === "object") ? latestRow.fixture : {}),
        },
      };
    });
    const rowsSource =
      mergedRows.length > 0
        ? mergedRows
        : filterLatestRowsToCurrentSeason(playerData?.latest, teamInfo.teamId, seasonCtx);
    const matchStats = buildMatchStatsRows(
      rowsSource,
      teamInfo.teamId,
      seasonCtx,
    );
    const byMatchesPerLeague = buildSeasonStatsFromMatchRows(
      rowsSource,
      teamInfo.teamId,
      seasonCtx,
    );
    const fromApiSeason = buildCurrentSeasonByCompetition(playerData);
    const currentSeason = mergeApiAndMatchSeasonStats(
      fromApiSeason,
      byMatchesPerLeague,
    );
    const payload = {
      playerId: String(playerId),
      profile: {
        id: playerData?.id || playerId,
        name: (
          playerData?.display_name ||
          playerData?.common_name ||
          (playerData?.firstname && playerData?.lastname
            ? `${playerData.firstname} ${playerData.lastname}`
            : playerData?.name) ||
          "Giocatore"
        ),
        team: teamInfo.teamName || teamNameFromClient || "Team",
        teamMedia: teamInfo.teamMedia,
        nationality:
          playerData?.nationality?.name ||
          playerData?.country?.name ||
          playerData?.country_name ||
          "n/d",
        nationalityMedia: pickMediaBundle(playerData?.nationality || playerData?.country),
        number: playerData?.jersey_number ?? playerData?.number ?? null,
        position:
          playerData?.detailedPosition?.name ||
          playerData?.detailedposition?.name ||
          playerData?.position?.name ||
          "n/d",
        preferredFoot: extractPreferredFoot(playerData),
        height: playerData?.height || "n/d",
        weight: playerData?.weight || "n/d",
        age: extractAge(playerData),
        dateOfBirth: playerData?.date_of_birth || null,
        media: pickMediaBundle(playerData),
      },
      seasons,
      currentSeason,
      career,
      honors,
      honorsByTeam,
      matchStats,
    };
    if (debugProfile) {
      payload._debug = {
        version: PLAYER_PROFILE_CACHE_VERSION,
        statsRows: statisticsRows.length,
        isCurrentInStats: statisticsRows.filter(
          (r) => r?.season?.is_current === true,
        ).length,
        seasonIdsInCtx: [...seasonCtx.seasonIdSet],
        fixturesAfterFilter: seasonFixtures.length,
        mergedRows: mergedRows.length,
        matchAggregates: byMatchesPerLeague.length,
        apiByComp: asArray(fromApiSeason?.byCompetition).length,
        byCompAfterMerge: asArray(currentSeason?.byCompetition).length,
        allCompGoals: currentSeason?.allCompetitions?.goals ?? null,
        allCompMinutes: currentSeason?.allCompetitions?.minutesPlayed ?? null,
      };
    }
    if (!debugProfile) {
      cacheStore.set(cacheKey, { payload, updatedAt: now });
    }

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Impossibile recuperare il profilo giocatore." },
      { status: 500 },
    );
  }
}

