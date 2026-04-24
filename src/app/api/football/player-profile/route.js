import { NextResponse } from "next/server";

export const runtime = "nodejs";
const PLAYER_PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;
const PLAYER_PROFILE_CACHE_VERSION = "v8";

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
  url.searchParams.set("per_page", "100");

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

  // Include all competitions played in the same seasonal window (league + cups + europe),
  // even when Sportmonks assigns separate season_id per competition.
  if (candidateRows.length > 0) {
    const primary = candidateRows[0];
    const broadFixtures = await fetchSportmonksSeasonFixturesForTeam(
      teamId,
      String(primary?.season?.id || primary?.season_id || ""),
      primary?.season || {},
      { applySeasonFilter: false },
    );
    broadFixtures.forEach((fixture) => collected.push(fixture));
  }

  // Safety net: collect last ~13 months regardless of season mapping quirks.
  const broadNoSeasonFixtures = await fetchSportmonksSeasonFixturesForTeam(teamId, "", {}, { applySeasonFilter: false });
  broadNoSeasonFixtures.forEach((fixture) => collected.push(fixture));

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
    const matchedAlias = normalizedAliases.find((alias) => key.includes(alias) || alias.includes(key));
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

function buildSeasonsFromStatistics(playerData) {
  const statistics = asArray(playerData?.statistics);
  const parseSeasonScore = (row) => {
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
  };
  const mapped = statistics
    .map((row) => {
      const details = asArray(row?.details);
      const seasonName =
        row?.season?.name ||
        row?.season?.display_name ||
        row?.season?.league?.name ||
        `Season ${row?.season_id || ""}`.trim();
      const yellowCards = pickStatDetail(details, ["yellow_cards", "yellow_card"]);
      const redCards = pickStatDetail(details, ["red_cards", "red_card"]);
      const bench = pickStatDetail(details, ["bench", "appearances_from_bench"]);
      return {
        season: seasonName || "Stagione",
        __seasonScore: parseSeasonScore(row),
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
      };
    })
    .filter((row) => String(row.season || "").trim().length > 0);

  if (mapped.length === 0) {
    return [];
  }

  const activeEntry =
    [...mapped]
      .sort((left, right) => {
        if ((right.__seasonScore || 0) !== (left.__seasonScore || 0)) {
          return (right.__seasonScore || 0) - (left.__seasonScore || 0);
        }
        if ((right.appearances || 0) !== (left.appearances || 0)) {
          return (right.appearances || 0) - (left.appearances || 0);
        }
        return (right.minutesPlayed || 0) - (left.minutesPlayed || 0);
      })[0] || mapped[0];

  return [
    {
      ...activeEntry,
      season: "Stagione corrente",
    },
  ];
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

function buildMatchStatsRows(latestRows, teamId) {
  return asArray(latestRows)
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

    const cacheKey = `${PLAYER_PROFILE_CACHE_VERSION}:player:${String(playerId)}`;
    const cacheStore = getCacheStore();
    const now = Date.now();
    const cached = cacheStore.get(cacheKey);
    if (cached && now - cached.updatedAt < PLAYER_PROFILE_CACHE_TTL_MS) {
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
    const seasons = buildSeasonsFromStatistics(playerData);
    const career = buildCareer(playerData, careerRows);
    const honors = buildHonors(playerData);
    const honorsByTeam = buildHonorsByTeam(honors);
    const statisticsRows = asArray(playerData?.statistics);
    const currentSeasonRow =
      statisticsRows.find((row) => row?.season?.is_current === true) ||
      statisticsRows[0] ||
      null;
    const currentSeasonId = Number(currentSeasonRow?.season?.id || currentSeasonRow?.season_id || null) || null;
    const seasonFixtures = await fetchSportmonksCurrentSeasonFixturesForTeam(
      teamInfo.teamId,
      statisticsRows,
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
    const rowsSource = mergedRows.length > 0 ? mergedRows : playerData?.latest;
    const matchStats = buildMatchStatsRows(rowsSource, teamInfo.teamId);
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
      career,
      honors,
      honorsByTeam,
      matchStats,
    };
    cacheStore.set(cacheKey, { payload, updatedAt: now });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Impossibile recuperare il profilo giocatore." },
      { status: 500 },
    );
  }
}

