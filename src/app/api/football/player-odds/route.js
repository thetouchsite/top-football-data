import { NextResponse } from "next/server";
import { fetchSportmonksPrematchOddsForFixture } from "@/lib/providers/sportmonks";
import { getFixturePayload } from "@/server/football/service";

export const runtime = "nodejs";
const PLAYER_ODDS_CACHE_TTL_MS = 2 * 60_000;
const playerOddsCache = new Map();
const playerOddsInflight = new Map();

function normalizeKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function roundTo(value, digits = 2) {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return 0;
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

function normalizeNameKey(value) {
  return normalizeKey(value).replace(/\s+/g, " ").trim();
}

const NON_PLAYER_NAME_TOKENS = new Set([
  "over",
  "under",
  "yes",
  "no",
  "home",
  "away",
  "draw",
  "first",
  "last",
  "score",
  "assist",
  "anytime",
]);

function isLikelyPlayerName(value) {
  const normalized = normalizeNameKey(value);
  if (!normalized) return false;
  if (NON_PLAYER_NAME_TOKENS.has(normalized)) return false;
  if (/^\d+(\.\d+)?$/.test(normalized)) return false;
  const tokens = normalized.split(" ").filter(Boolean);
  if (tokens.length >= 2) {
    return tokens.every(
      (token) => token.length >= 2 && !NON_PLAYER_NAME_TOKENS.has(token),
    );
  }
  return normalized.length >= 5 && !NON_PLAYER_NAME_TOKENS.has(normalized);
}

function hasDirectPlayerContext(entry) {
  const hasPlayerId = Boolean(
    entry?.player_id || entry?.player?.id || entry?.participant?.id || entry?.participant_id,
  );
  const hasPlayerName = isLikelyPlayerName(pickPlayerName(entry));
  return hasPlayerId || hasPlayerName;
}

function isLikelyPlayerMarket(entry) {
  const marketText = normalizeKey(
    entry?.market_description ||
      entry?.market?.name ||
      entry?.market?.description ||
      entry?.market_name ||
      "",
  );
  const positiveHints = [
    "player",
    "to score",
    "goalscorer",
    "scorer",
    "booked",
    "card",
    "shot",
    "shots on target",
    "assist",
    "foul",
    "offsides",
    "tackle",
    "passes",
  ];
  const negativeHints = [
    "both teams",
    "home team",
    "away team",
    "match result",
    "double chance",
    "draw no bet",
    "correct score",
    "over under",
    "half time",
    "corners",
    "team to score",
    "win both halves",
  ];
  if (negativeHints.some((hint) => marketText.includes(hint))) return false;
  return positiveHints.some((hint) => marketText.includes(hint));
}

function isPlayerSpecificMarket(entry) {
  const marketText = normalizeKey(
    entry?.market_description ||
      entry?.market?.name ||
      entry?.market?.description ||
      entry?.market_name ||
      "",
  );
  if (!marketText) return false;

  // Keep strictly player-related markets (goalscorer / player props),
  // exclude team or generic match markets even if they include vague labels.
  const allowHints = [
    "player",
    "goalscorer",
    "goal scorer",
    "to score",
    "scorer",
    "to be booked",
    "booked",
    "shots on target",
    "player shots",
    "assist",
    "to assist",
  ];
  const denyHints = [
    "team",
    "match",
    "both teams",
    "home",
    "away",
    "draw",
    "half time result",
    "correct score",
    "winning margin",
    "double chance",
    "over under",
    "asian",
  ];
  if (denyHints.some((hint) => marketText.includes(hint))) return false;
  return allowHints.some((hint) => marketText.includes(hint));
}

function extractOddsRow(entry) {
  const odd = roundTo(
    toNumber(
      entry?.dp3 ??
        entry?.value ??
        entry?.decimal ??
        entry?.odd ??
        entry?.price ??
        entry?.odds?.dp3 ??
        entry?.odds?.decimal,
    ),
    2,
  );
  const bookmaker =
    entry?.bookmaker?.name ||
    entry?.bookmaker_name ||
    (entry?.bookmaker_id ? `Bookmaker ${entry.bookmaker_id}` : null);
  if (!Number.isFinite(odd) || odd <= 1 || !bookmaker) return null;
  const playerName = String(pickPlayerName(entry) || "").trim();
  if (!isLikelyPlayerName(playerName)) return null;
  const marketLabel = pickMarketLabel(entry);
  const marketKey = normalizeKey(marketLabel).replace(/\s+/g, "_");
  const selectionRaw = String(entry?.label || "").trim();
  const selectionKey = normalizeNameKey(selectionRaw);
  const selection =
    selectionRaw &&
    !/^\d+(\.\d+)?$/.test(selectionKey) &&
    !NON_PLAYER_NAME_TOKENS.has(selectionKey)
      ? selectionRaw
      : null;
  return {
    bookmaker,
    marketKey,
    marketLabel,
    selection,
    odd,
    playerName,
  };
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

function pickMarketLabel(entry) {
  return String(
    entry?.market_description ||
      entry?.market?.name ||
      entry?.market?.description ||
      entry?.market_name ||
      entry?.market_id ||
      "Mercato giocatore",
  ).trim();
}

function pickEntryPlayerId(entry) {
  return String(
    entry?.player_id ||
      entry?.player?.id ||
      entry?.participant?.id ||
      entry?.participant_id ||
      "",
  );
}

function findPlayerByName(entryName, playersIndex) {
  if (!isLikelyPlayerName(entryName)) return null;
  const normalized = normalizeKey(entryName).replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  const tokens = normalized.split(" ").filter((token) => token.length > 1);
  if (tokens.length < 2) return null;

  const exact = playersIndex.find((item) => item.normalizedName === normalized);
  if (exact) return exact;

  const strongContains = playersIndex.find(
    (item) =>
      (item.normalizedName.includes(normalized) || normalized.includes(item.normalizedName)) &&
      Math.min(item.normalizedName.length, normalized.length) >= 8,
  );
  if (strongContains) return strongContains;

  let best = null;
  playersIndex.forEach((item) => {
    const overlap = item.tokens.filter((token) => tokens.includes(token)).length;
    if (overlap >= 2 && (!best || overlap > best.overlap)) {
      best = { item, overlap };
    }
  });
  return best?.item || null;
}

function deriveEntryPlayerId(entry, playersIndex, playersById) {
  const directId = pickEntryPlayerId(entry);
  if (directId && playersById.has(directId)) return directId;
  const byName = findPlayerByName(pickPlayerName(entry), playersIndex);
  return byName?.id || null;
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
    const cached = playerOddsCache.get(cacheKey);
    if (cached && now - cached.storedAt <= PLAYER_ODDS_CACHE_TTL_MS) {
      return NextResponse.json(cached.payload);
    }
    if (playerOddsInflight.has(cacheKey)) {
      const shared = await playerOddsInflight.get(cacheKey);
      return NextResponse.json(shared);
    }

    const requestPromise = (async () => {
      const result = await getFixturePayload(fixtureId, {
        view: "enrichment",
        snapshotVersion,
      });
    const payload = result?.body || {};
    const fixture = payload?.fixture || null;
    if (!fixture) {
      return NextResponse.json({ error: "Fixture non disponibile." }, { status: 404 });
    }

    const oddsEntries = await fetchSportmonksPrematchOddsForFixture(fixtureId);
    const players = asArray(fixture?.players);
    const playersIndex = players
      .map((player) => ({
        id: String(player?.id || "").trim(),
        name: String(player?.name || "").trim(),
        normalizedName: normalizeKey(player?.name || "").replace(/\s+/g, " ").trim(),
        tokens: normalizeKey(player?.name || "")
          .split(" ")
          .filter((token) => token.length > 1),
      }))
      .filter((item) => item.id && item.name && item.normalizedName);
    const playersById = new Map(playersIndex.map((player) => [player.id, player]));
    const byPlayer = {};
    const byPlayerName = {};
    const rowsAll = [];
    asArray(oddsEntries).forEach((entry) => {
      if (
        (!hasDirectPlayerContext(entry) && !isLikelyPlayerMarket(entry)) ||
        !isPlayerSpecificMarket(entry)
      ) {
        return;
      }
      const playerId = deriveEntryPlayerId(entry, playersIndex, playersById);
      const entryPlayerName = String(pickPlayerName(entry) || "").trim();
      const nameKey = normalizeNameKey(entryPlayerName);
      const row = extractOddsRow(entry);
      if (!row) return;
      rowsAll.push(row);
      if (nameKey) {
        if (!byPlayerName[nameKey]) {
          byPlayerName[nameKey] = {
            playerName: entryPlayerName || "",
            totalQuotes: 0,
            bestByMarket: {},
            rows: [],
          };
        }
        byPlayerName[nameKey].rows.push(row);
      }
      if (!playerId) return;
      if (!byPlayer[playerId]) {
        byPlayer[playerId] = {
          playerId,
          playerName: playersById.get(playerId)?.name || "",
          totalQuotes: 0,
          bestByMarket: {},
          rows: [],
        };
      }
      byPlayer[playerId].rows.push(row);
    });

    const finalizeBucket = (playerData) => {
      const seen = new Set();
      playerData.rows = playerData.rows
        .filter((row) => {
          const key = `${row.marketLabel}|${row.bookmaker}|${row.odd}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((left, right) => right.odd - left.odd)
        .slice(0, 40);
      playerData.totalQuotes = playerData.rows.length;
      playerData.rows.forEach((row) => {
        if (
          !playerData.bestByMarket[row.marketKey] ||
          row.odd > playerData.bestByMarket[row.marketKey].odd
        ) {
          playerData.bestByMarket[row.marketKey] = row;
        }
      });
    };
    Object.values(byPlayer).forEach(finalizeBucket);
    Object.values(byPlayerName).forEach(finalizeBucket);

      const responsePayload = {
        fixtureId: String(fixtureId),
        snapshotVersion:
          String(result?.body?.snapshotVersion || snapshotVersion || "").trim() || null,
        availablePlayers: Object.keys(byPlayer).length,
        byPlayer,
        byPlayerName,
        rowsAll: rowsAll.slice(0, 4000),
      };
      playerOddsCache.set(cacheKey, { storedAt: Date.now(), payload: responsePayload });
      return responsePayload;
    })();
    playerOddsInflight.set(cacheKey, requestPromise);
    try {
      const payload = await requestPromise;
      return NextResponse.json(payload);
    } finally {
      if (playerOddsInflight.get(cacheKey) === requestPromise) {
        playerOddsInflight.delete(cacheKey);
      }
    }
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Impossibile recuperare quote giocatori." },
      { status: 500 },
    );
  }
}

