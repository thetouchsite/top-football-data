import { NextResponse } from "next/server";
import { fetchSportmonksPrematchOddsForFixture } from "@/lib/providers/sportmonks";
import { getFixturePayload } from "@/server/football/service";

export const runtime = "nodejs";

const MARKET_CONFIG = {
  anytime_goalscorer: {
    label: "Segna nel match",
    matcher: ["anytime_goalscorer", "anytime goalscorer", "to score", "goalscorer"],
  },
  shots_on_target: {
    label: "Tiri in porta",
    matcher: ["shots_on_target", "shots on target", "player shots on target"],
  },
  player_to_be_booked: {
    label: "Ammonizione",
    matcher: ["player_to_be_booked", "to be booked", "player booked", "booked"],
  },
};

function normalizeKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

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

function normalizeMarket(market) {
  const key = String(market || "").trim().toLowerCase();
  return MARKET_CONFIG[key] ? key : "anytime_goalscorer";
}

function pickPlayerName(entry) {
  return (
    entry?.player_name ||
    entry?.player?.display_name ||
    entry?.player?.common_name ||
    entry?.player?.name ||
    entry?.participant?.display_name ||
    entry?.participant?.name ||
    entry?.label ||
    entry?.name ||
    ""
  );
}

function isSamePlayer(candidateName, targetName) {
  const candidate = normalizeKey(candidateName).replace(/\s+/g, " ");
  const target = normalizeKey(targetName).replace(/\s+/g, " ");
  return Boolean(candidate && target && (candidate === target || candidate.includes(target) || target.includes(candidate)));
}

function matchesMarket(entry, marketKey) {
  const marketName = normalizeKey(
    entry?.market_description || entry?.market?.name || entry?.market?.description || entry?.market_id
  );
  const candidates = MARKET_CONFIG[marketKey]?.matcher || [];

  return candidates.some((candidate) => marketName.includes(normalizeKey(candidate)));
}

function deriveMarketProbability(player, marketKey) {
  const props = player?.playerProps || {};
  const xg = toNumber(props?.xg?.value ?? player?.xg, 0);
  const shots = toNumber(props?.shots?.value ?? player?.shots, 0);
  const shotsOnTarget = toNumber(props?.shotsOnTarget?.value ?? player?.shotsOnTarget, 0);
  const foulsCommitted = toNumber(props?.discipline?.foulsCommitted ?? player?.fouls, 0);
  const yellowCards = toNumber(props?.discipline?.yellowCards ?? player?.yellowCards, 0);
  const redCards = toNumber(props?.discipline?.redCards ?? player?.redCards, 0);

  if (marketKey === "shots_on_target") {
    return clamp(Math.round(8 + shotsOnTarget * 22 + shots * 9 + xg * 14), 4, 88);
  }

  if (marketKey === "player_to_be_booked") {
    return clamp(Math.round(6 + foulsCommitted * 11 + yellowCards * 22 + redCards * 10), 3, 75);
  }

  return clamp(
    Math.round(
      toNumber(props?.scorer?.probability ?? player?.scorerProb, 0) ||
        10 + xg * 28 + shots * 3
    ),
    4,
    82
  );
}

function buildSelectionLabel(player, marketKey) {
  return `${player?.name || "Giocatore"} ${MARKET_CONFIG[marketKey]?.label || "Market"}`;
}

function buildOddsRows(oddsEntries, player, marketKey) {
  const rows = oddsEntries
    .filter((entry) => matchesMarket(entry, marketKey))
    .filter((entry) => isSamePlayer(pickPlayerName(entry), player?.name))
    .map((entry) => {
      const odd = roundTo(
        toNumber(entry?.dp3 ?? entry?.value ?? entry?.decimal, Number.NaN),
        2
      );
      const bookmaker =
        entry?.bookmaker?.name ||
        entry?.bookmaker_name ||
        (entry?.bookmaker_id ? `Bookmaker ${entry.bookmaker_id}` : null);

      if (!Number.isFinite(odd) || odd <= 1 || !bookmaker) {
        return null;
      }

      return {
        bookmaker,
        market: MARKET_CONFIG[marketKey]?.label || marketKey,
        selection: buildSelectionLabel(player, marketKey),
        odd,
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.odd - left.odd);

  const deduped = [];
  const seen = new Set();
  rows.forEach((row) => {
    const key = `${row.bookmaker}:${row.selection}`;
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(row);
  });

  const modelProbability = deriveMarketProbability(player, marketKey);
  const bestOdd = deduped[0]?.odd || 0;

  return deduped.map((row) => {
    const impliedProbability = roundTo(100 / row.odd, 1);
    const valueEdge = roundTo(modelProbability - impliedProbability, 1);
    return {
      ...row,
      impliedProbability,
      modelProbability,
      valueEdge,
      isBest: row.odd === bestOdd,
    };
  });
}

export async function GET(request) {
  try {
    const fixtureId = request.nextUrl.searchParams.get("fixtureId");
    const playerId = request.nextUrl.searchParams.get("playerId");
    const market = normalizeMarket(request.nextUrl.searchParams.get("market"));

    if (!fixtureId || !playerId) {
      return NextResponse.json(
        { error: "fixtureId e playerId sono obbligatori." },
        { status: 400 }
      );
    }

    const result = await getFixturePayload(fixtureId, { view: "enrichment" });
    const payload = result?.body || {};
    const fixture = payload?.fixture || null;

    if (!fixture) {
      return NextResponse.json(
        { error: "Fixture non disponibile." },
        { status: 404 }
      );
    }

    const player =
      (Array.isArray(fixture?.players) ? fixture.players : []).find(
        (entry) => String(entry?.id) === String(playerId)
      ) || null;

    if (!player) {
      return NextResponse.json(
        { error: "Giocatore non disponibile per questa fixture." },
        { status: 404 }
      );
    }

    const oddsEntries = await fetchSportmonksPrematchOddsForFixture(fixtureId);
    const rows = buildOddsRows(oddsEntries, player, market);

    return NextResponse.json({
      fixtureId: String(fixtureId),
      playerId: String(playerId),
      market,
      player: {
        id: player.id,
        name: player.name,
        team: player.team,
      },
      model: {
        probability: deriveMarketProbability(player, market),
        label: MARKET_CONFIG[market]?.label || market,
      },
      available: rows.length > 0,
      rows,
      best: rows[0] || null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Impossibile recuperare i player props." },
      { status: 500 }
    );
  }
}
