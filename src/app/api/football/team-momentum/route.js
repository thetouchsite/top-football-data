import { NextResponse } from "next/server";
import {
  fetchSportmonksRecentFixturesForParticipant,
  normalizeSportmonksFixture,
} from "@/lib/providers/sportmonks";
import { getFixturePayload } from "@/server/football/service";

export const runtime = "nodejs";

function toNumber(value, fallback = Number.NaN) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundTo(value, digits = 2) {
  const n = toNumber(value, Number.NaN);
  if (!Number.isFinite(n)) return 0;
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createTimingBuckets() {
  return [
    { key: "0-15", from: 0, to: 15, scored: 0, conceded: 0 },
    { key: "16-30", from: 16, to: 30, scored: 0, conceded: 0 },
    { key: "31-45+", from: 31, to: 45, scored: 0, conceded: 0 },
    { key: "46-60", from: 46, to: 60, scored: 0, conceded: 0 },
    { key: "61-75", from: 61, to: 75, scored: 0, conceded: 0 },
    { key: "76-90+", from: 76, to: 999, scored: 0, conceded: 0 },
  ];
}

function getTimingBucket(buckets, minute) {
  return buckets.find((bucket) => minute >= bucket.from && minute <= bucket.to) || null;
}

function getParticipantLocation(entry, homeId, awayId) {
  const participantId = String(
    entry?.participant_id || entry?.participant?.id || entry?.team_id || ""
  );
  if (participantId && participantId === String(homeId || "")) return "home";
  if (participantId && participantId === String(awayId || "")) return "away";

  const location = String(entry?.location || entry?.meta?.location || "").toLowerCase();
  if (location === "home" || location === "away") return location;
  return null;
}

function normalizeEventType(entry) {
  const raw = String(
    entry?.type?.developer_name || entry?.type?.code || entry?.type?.name || entry?.type_id || ""
  )
    .toLowerCase()
    .trim();
  return raw.includes("goal") ? "goal" : null;
}

function getActualPoints(normalizedFixture, side) {
  const hasFinishedState = normalizedFixture?.state?.shortName === "FT";
  const score = normalizedFixture?.currentScore || (hasFinishedState ? { home: 0, away: 0 } : null);

  if (!score) return 0;
  const home = toNumber(score.home, 0);
  const away = toNumber(score.away, 0);

  if (home === away) return 1;
  if (side === "home") return home > away ? 3 : 0;
  return away > home ? 3 : 0;
}

function buildTeamMomentum(teamId, teamName, fixtures = []) {
  const buckets = createTimingBuckets();
  let expectedPoints = 0;
  let actualPoints = 0;
  let totalXg = 0;
  let consideredFixtures = 0;

  fixtures.forEach((rawFixture) => {
    const normalized = normalizeSportmonksFixture(rawFixture);
    const homeId = normalized?.provider_ids?.sportmonks_home_participant_id;
    const awayId = normalized?.provider_ids?.sportmonks_away_participant_id;
    const side =
      String(homeId || "") === String(teamId || "")
        ? "home"
        : String(awayId || "") === String(teamId || "")
          ? "away"
          : null;

    if (!side) return;

    consideredFixtures += 1;
    expectedPoints +=
      side === "home"
        ? toNumber(normalized?.prob?.home, 0) * 0.03 + toNumber(normalized?.prob?.draw, 0) * 0.01
        : toNumber(normalized?.prob?.away, 0) * 0.03 + toNumber(normalized?.prob?.draw, 0) * 0.01;
    actualPoints += getActualPoints(normalized, side);
    totalXg += side === "home" ? toNumber(normalized?.xg?.home, 0) : toNumber(normalized?.xg?.away, 0);

    (Array.isArray(rawFixture?.events) ? rawFixture.events : []).forEach((event) => {
      if (normalizeEventType(event) !== "goal") return;
      const location = getParticipantLocation(event, homeId, awayId);
      const minute = Math.max(
        0,
        toNumber(event?.minute, 0) + toNumber(event?.extra_minute, 0)
      );
      const bucket = getTimingBucket(buckets, minute);
      if (!bucket || !location) return;
      if (location === side) {
        bucket.scored += 1;
      } else {
        bucket.conceded += 1;
      }
    });
  });

  const strongestScoringWindow =
    [...buckets].sort((left, right) => right.scored - left.scored)[0] || null;
  const weakestWindow =
    [...buckets].sort((left, right) => right.conceded - left.conceded)[0] || null;

  return {
    teamId: String(teamId || ""),
    team: teamName,
    available: consideredFixtures > 0,
    fixturesAnalyzed: consideredFixtures,
    xPts: roundTo(expectedPoints, 2),
    actualPoints,
    delta: roundTo(expectedPoints - actualPoints, 2),
    avgXg: consideredFixtures > 0 ? roundTo(totalXg / consideredFixtures, 2) : 0,
    marketView:
      expectedPoints - actualPoints >= 0.75
        ? "Sottovalutata"
        : actualPoints - expectedPoints >= 0.75
          ? "Sopravvalutata"
          : "In linea",
    timings: buckets,
    strongestScoringWindow:
      strongestScoringWindow && strongestScoringWindow.scored > 0
        ? `${strongestScoringWindow.key} (${strongestScoringWindow.scored})`
        : "n/d",
    highestConcedingWindow:
      weakestWindow && weakestWindow.conceded > 0
        ? `${weakestWindow.key} (${weakestWindow.conceded})`
        : "n/d",
  };
}

export async function GET(request) {
  try {
    const fixtureId = request.nextUrl.searchParams.get("fixtureId");
    if (!fixtureId) {
      return NextResponse.json({ error: "fixtureId obbligatorio." }, { status: 400 });
    }

    const result = await getFixturePayload(fixtureId, { view: "enrichment" });
    const payload = result?.body || {};
    const fixture = payload?.fixture || null;
    const rawFixture = payload?.rawFixture || null;

    if (!fixture || !rawFixture) {
      return NextResponse.json(
        { error: "Fixture non disponibile per il momentum." },
        { status: 404 }
      );
    }

    const homeId = fixture?.provider_ids?.sportmonks_home_participant_id;
    const awayId = fixture?.provider_ids?.sportmonks_away_participant_id;
    const [homeFixtures, awayFixtures] = await Promise.all([
      fetchSportmonksRecentFixturesForParticipant(homeId, {
        limit: 8,
        telemetry: {
          fixtureId,
          requestPurpose: "team_momentum_home_recent",
        },
      }),
      fetchSportmonksRecentFixturesForParticipant(awayId, {
        limit: 8,
        telemetry: {
          fixtureId,
          requestPurpose: "team_momentum_away_recent",
        },
      }),
    ]);

    return NextResponse.json({
      fixtureId: String(fixtureId),
      available: homeFixtures.length > 0 || awayFixtures.length > 0,
      pressurePreview: fixture?.pressure_preview || null,
      home: buildTeamMomentum(homeId, fixture?.home, homeFixtures),
      away: buildTeamMomentum(awayId, fixture?.away, awayFixtures),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Impossibile recuperare il team momentum." },
      { status: 500 }
    );
  }
}
