import { NextResponse } from "next/server";
import { getFixturePayload } from "@/server/football/service";
import { fetchSportmonksPlayerById } from "@/lib/providers/sportmonks";

export const runtime = "nodejs";
const PLAYER_XG_CACHE_TTL_MS = 2 * 60_000;
const playerXgCache = new Map();
const playerXgInflight = new Map();

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .trim();
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function statFromRows(rows, aliases) {
  const normalized = aliases.map(normalizeKey);
  const matches = asArray(rows).filter((row) => {
    const key = normalizeKey(
      row?.type?.developer_name || row?.type?.code || row?.type?.name || row?.type_id,
    );
    return normalized.some((alias) => key === alias);
  });
  if (!matches.length) return 0;
  const read = (entry) => {
    const raw = entry?.data?.value ?? entry?.value;
    if (typeof raw === "number" || typeof raw === "string") return toNumber(raw);
    if (raw && typeof raw === "object") {
      return (
        toNumber(raw.total) ||
        toNumber(raw.value) ||
        toNumber(raw.goals) ||
        toNumber(raw.average) ||
        toNumber(raw.avg) ||
        0
      );
    }
    return 0;
  };
  return matches.map(read).reduce((max, n) => (n > max ? n : max), 0);
}

function mapPlayerXg(playerData, lineupEntry, fixtureId) {
  const latestRows = asArray(playerData?.latest);
  const latestForFixture =
    latestRows.find((row) => String(row?.fixture?.id || row?.fixture_id || "") === String(fixtureId)) ||
    latestRows[0] ||
    null;
  const latestXgRows =
    asArray(latestForFixture?.xglineup).length > 0
      ? asArray(latestForFixture?.xglineup)
      : asArray(latestForFixture?.xGlineup);
  const latestDetailRows = asArray(latestForFixture?.details);
  const lineupDetailRows = asArray(lineupEntry?.details);
  const metricRows = [...latestXgRows, ...latestDetailRows, ...lineupDetailRows];
  const seasonStatRows = asArray(playerData?.statistics).flatMap((row) =>
    asArray(row?.details),
  );

  return {
    id: String(playerData?.id || lineupEntry?.player_id || lineupEntry?.id || ""),
    name:
      playerData?.display_name ||
      playerData?.common_name ||
      playerData?.name ||
      lineupEntry?.player_name ||
      "Giocatore",
    number: lineupEntry?.jersey_number || playerData?.jersey_number || "--",
    media: playerData?.image_path
      ? { imageUrl: playerData.image_path, thumbUrl: playerData.image_path }
      : null,
    minutes: statFromRows(metricRows, ["minutes_played", "minutes", "119"]),
    goals: statFromRows(metricRows, ["goals", "52"]),
    xg: statFromRows(metricRows, ["expected_goals", "5304"]),
    xgot: statFromRows(metricRows, ["expected_goals_on_target", "5305"]),
    xgOpenPlay: statFromRows(metricRows, ["expected_goals_open_play"]),
    xgSetPiece: statFromRows(metricRows, ["expected_goals_set_play"]),
    xgCorners: statFromRows(metricRows, ["expected_goals_corners"]),
    expectedPoints: statFromRows(metricRows, ["expected_points"]),
    xgNonPenalty: statFromRows(metricRows, [
      "expected_non_penalty_goals",
      "expected_goals_non_penalty_goals",
    ]),
    shootingPerformance: statFromRows(metricRows, ["shooting_performance"]),
    eshots: statFromRows(metricRows, ["expected_shots", "expected_shots_total"]),
    seasonGoals: statFromRows(seasonStatRows, ["goals", "52"]),
    seasonMinutes: statFromRows(seasonStatRows, ["minutes_played", "minutes", "119"]),
    seasonShots: statFromRows(seasonStatRows, ["shots_total", "shots", "42"]),
    seasonPasses: statFromRows(seasonStatRows, ["passes"]),
    seasonPassAccuracyPct: statFromRows(seasonStatRows, [
      "accurate_passes_percentage",
    ]),
    seasonTouches: statFromRows(seasonStatRows, ["touches"]),
    seasonDuelsWonPct: statFromRows(seasonStatRows, ["duels_won_percentage"]),
    seasonInterceptions: statFromRows(seasonStatRows, ["interceptions"]),
    seasonTacklesWon: statFromRows(seasonStatRows, ["tackles_won"]),
    seasonRating: (() => {
      const v = statFromRows(seasonStatRows, ["rating", "118"]);
      return v > 0 ? v : null;
    })(),
  };
}

export async function GET(request) {
  try {
    const fixtureId = request.nextUrl.searchParams.get("fixtureId");
    const snapshotVersion = request.nextUrl.searchParams.get("snapshotVersion");
    if (!fixtureId) {
      return NextResponse.json({ error: "fixtureId obbligatorio." }, { status: 400 });
    }

    const cacheKey = `fx:${String(fixtureId)}:sv:${String(snapshotVersion || "").trim() || "-"}`;
    const now = Date.now();
    const cached = playerXgCache.get(cacheKey);
    if (cached && now - cached.storedAt <= PLAYER_XG_CACHE_TTL_MS) {
      return NextResponse.json(cached.payload);
    }
    if (playerXgInflight.has(cacheKey)) {
      const shared = await playerXgInflight.get(cacheKey);
      return NextResponse.json(shared);
    }

    const requestPromise = (async () => {
      const fixturePayload = await getFixturePayload(fixtureId, {
        view: "enrichment",
        snapshotVersion,
      });
    const body = fixturePayload?.body || {};
    const rawFixture = body?.rawFixture || null;
    if (!rawFixture) {
      return NextResponse.json({ rows: [] });
    }

    const seasonId = String(rawFixture?.season?.id || rawFixture?.season_id || "").trim();
    const lineups = asArray(rawFixture?.lineups);
    const playerIds = [...new Set(lineups.map((row) => String(row?.player_id || "").trim()).filter(Boolean))].slice(0, 28);
    const lineupMap = new Map(
      lineups.map((row) => [String(row?.player_id || "").trim(), row]),
    );

    const players = await Promise.all(
      playerIds.map((playerId) =>
        fetchSportmonksPlayerById(playerId, {
          seasonId,
          fixtureId: String(fixtureId),
          telemetry: {
            route: "/api/football/player-xg",
            requestPurpose: "player_xg_batch",
            dtoTarget: "PlayerXGDTO",
          },
        }).catch(() => null),
      ),
    );

    const rows = players
      .filter(Boolean)
      .map((playerData) => {
        const lineupEntry = lineupMap.get(String(playerData?.id || "").trim()) || null;
        return mapPlayerXg(playerData, lineupEntry, fixtureId);
      })
      .filter((row) => row.xg > 0 || row.xgot > 0 || row.eshots > 0)
      .sort(
        (a, b) =>
          b.xg - a.xg ||
          b.xgot - a.xgot ||
          b.xgOpenPlay - a.xgOpenPlay ||
          b.xgSetPiece - a.xgSetPiece ||
          b.xgCorners - a.xgCorners ||
          b.eshots - a.eshots,
      )
      .slice(0, 18);

      const responsePayload = {
        fixtureId: String(fixtureId),
        snapshotVersion:
          String(fixturePayload?.body?.snapshotVersion || snapshotVersion || "").trim() ||
          null,
        seasonId: seasonId || null,
        rows,
      };
      playerXgCache.set(cacheKey, { storedAt: Date.now(), payload: responsePayload });
      return responsePayload;
    })();
    playerXgInflight.set(cacheKey, requestPromise);
    try {
      const payload = await requestPromise;
      return NextResponse.json(payload);
    } finally {
      if (playerXgInflight.get(cacheKey) === requestPromise) {
        playerXgInflight.delete(cacheKey);
      }
    }
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Impossibile recuperare dati xG giocatori." },
      { status: 500 },
    );
  }
}

