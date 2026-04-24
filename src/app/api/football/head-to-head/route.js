import { NextResponse } from "next/server";
import {
  fetchSportmonksHeadToHeadFixtures,
  normalizeSportmonksFixture,
} from "@/lib/providers/sportmonks";
import { getFixturePayload } from "@/server/football/service";

export const runtime = "nodejs";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function resolveGoalsFromRaw(rawFixture, participantId) {
  const scores = asArray(rawFixture?.scores);
  const row =
    scores.find(
      (entry) =>
        String(entry?.description || "").toUpperCase() === "CURRENT" &&
        String(entry?.participant_id || "") === String(participantId || ""),
    ) ||
    scores.find((entry) => String(entry?.participant_id || "") === String(participantId || "")) ||
    null;
  const goals = Number(row?.score?.goals ?? row?.score ?? 0);
  return Number.isFinite(goals) ? goals : 0;
}

function mapH2hFixture(rawFixture, homeTeamId, awayTeamId, currentSeasonId) {
  const normalized = normalizeSportmonksFixture(rawFixture || {});
  const homeGoals = resolveGoalsFromRaw(rawFixture, homeTeamId);
  const awayGoals = resolveGoalsFromRaw(rawFixture, awayTeamId);
  const score = `${homeGoals}-${awayGoals}`;
  const result =
    homeGoals > awayGoals ? "home" : awayGoals > homeGoals ? "away" : "draw";
  const seasonId = String(rawFixture?.season?.id || rawFixture?.season_id || "").trim() || null;
  const seasonName = String(rawFixture?.season?.name || "").trim() || null;
  const currentSeasonKey = String(currentSeasonId || "").trim();
  const ts = Number(rawFixture?.starting_at_timestamp) || 0;
  return {
    id: String(rawFixture?.id || normalized?.id || ""),
    date: normalized?.date || "--",
    league: normalized?.league || "Competizione",
    seasonId,
    seasonName,
    isCurrentSeason: Boolean(seasonId && currentSeasonKey && seasonId === currentSeasonKey),
    venue: rawFixture?.venue?.name || null,
    home: normalized?.home || "Casa",
    away: normalized?.away || "Trasferta",
    homeGoals,
    awayGoals,
    score,
    result,
    btts: homeGoals > 0 && awayGoals > 0,
    over25: homeGoals + awayGoals > 2,
    _sortTs: ts,
  };
}

export async function GET(request) {
  try {
    const fixtureId = request.nextUrl.searchParams.get("fixtureId");
    const snapshotVersion = request.nextUrl.searchParams.get("snapshotVersion");
    if (!fixtureId) {
      return NextResponse.json({ error: "fixtureId obbligatorio." }, { status: 400 });
    }

    const fixturePayload = await getFixturePayload(fixtureId, {
      view: "enrichment",
      snapshotVersion,
    });
    const fixture = fixturePayload?.body?.fixture || null;
    if (!fixture) {
      return NextResponse.json(
        { error: "Fixture non disponibile per head-to-head." },
        { status: 404 },
      );
    }

    const homeTeamId = fixture?.provider_ids?.sportmonks_home_participant_id;
    const awayTeamId = fixture?.provider_ids?.sportmonks_away_participant_id;
    if (!homeTeamId || !awayTeamId) {
      return NextResponse.json({ rows: [] });
    }

    const currentSeasonId = fixture?.provider_ids?.sportmonks_season_id;
    const rawRows = await fetchSportmonksHeadToHeadFixtures(homeTeamId, awayTeamId, {
      fixtureId: String(fixtureId),
      route: "/api/football/head-to-head",
      requestPurpose: "fixture_head_to_head",
      dtoTarget: "HeadToHeadDTO",
    });
    const rows = rawRows
      .map((raw) => mapH2hFixture(raw, homeTeamId, awayTeamId, currentSeasonId))
      .filter((row) => row.id)
      .sort((a, b) => (b._sortTs || 0) - (a._sortTs || 0))
      .map(({ _sortTs, ...publicRow }) => publicRow)
      .slice(0, 30);

    return NextResponse.json({
      fixtureId: String(fixtureId),
      snapshotVersion:
        String(fixturePayload?.body?.snapshotVersion || snapshotVersion || "").trim() ||
        null,
      seasonId: String(currentSeasonId || "").trim() || null,
      seasonName: fixture?.competition?.season || fixture?.season || null,
      homeTeam: fixture.home,
      awayTeam: fixture.away,
      rows,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Impossibile recuperare head-to-head." },
      { status: 500 },
    );
  }
}

