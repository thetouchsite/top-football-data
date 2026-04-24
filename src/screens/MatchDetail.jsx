import React, { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, Link } from "@/lib/router-compat";
import { motion } from "framer-motion";
import { ArrowLeft, Bell, Clock, Star, TrendingUp, Crown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GlassCard from "@/components/shared/GlassCard";
import FeedMetaPanel from "@/components/shared/FeedMetaPanel";
import DataStatusChips from "@/components/shared/DataStatusChips";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import ValueBetBadge from "@/components/shared/ValueBetBadge";
import ConfidenceBar from "@/components/shared/ConfidenceBar";
import FootballMediaImage from "@/components/shared/FootballMediaImage";
import PremiumLock from "@/components/shared/PremiumLock";
import FormationPitch from "@/components/stats/FormationPitch";
import PlayerCard from "@/components/stats/PlayerCard";
import PlayerDetailPanel from "@/components/players/PlayerDetailPanel";
import TopXgPlayers from "@/components/stats/TopXgPlayers";
import OddsComparison from "@/components/match/OddsComparison";
import PressurePreviewChart from "@/components/match/PressurePreviewChart";
import { useApp } from "@/lib/AppContext";
import {
  getFixture,
  getPlayerOddsByFixture,
  getPlayerProps,
  getPlayerXgByFixture,
  getTeamMomentum,
} from "@/api/football";
import { getAlerts } from "@/api/alerts";
import { getOddsDecimalForValueBet } from "@/lib/value-bet-display";

const EMPTY_ARRAY = [];
const FORMATIONS_DEEP_TABS = {
  lineups: "lineups",
  xgAnalysis: "xg-analysis",
  playerStats: "player-stats",
  teamMomentum: "team-momentum",
};
const PLAYER_PROP_MARKETS = [
  { key: "anytime_goalscorer", label: "Marcatori" },
  { key: "shots_on_target", label: "Tiri in porta" },
  { key: "player_to_be_booked", label: "Disciplinari" },
];

function normalizeStatKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .trim();
}

function statValueFromData(entry) {
  const raw = entry?.data?.value ?? entry?.value;
  const asNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };
  if (raw == null) return 0;
  if (typeof raw === "number" || typeof raw === "string") {
    return asNumber(raw) ?? 0;
  }
  if (typeof raw === "object") {
    const candidates = [raw.total, raw.value, raw.goals, raw.average, raw.avg];
    for (const candidate of candidates) {
      const parsed = asNumber(candidate);
      if (parsed != null) return parsed;
    }
    for (const value of Object.values(raw)) {
      const parsed = asNumber(value);
      if (parsed != null) return parsed;
    }
  }
  return 0;
}

function seasonRatingToneClass(value) {
  const rating = Number(value || 0);
  if (rating >= 7) return "bg-emerald-500/25 text-emerald-300";
  if (rating >= 6) return "bg-amber-400/25 text-amber-300";
  return "bg-rose-500/25 text-rose-300";
}

function normalizePersonNameKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function quoteRowMatchesPlayerName(quotePlayerName, playerName) {
  const quote = normalizePersonNameKey(quotePlayerName);
  const player = normalizePersonNameKey(playerName);
  if (!quote || !player) return false;
  if (quote === player) return true;
  if (quote.includes(player) || player.includes(quote)) return true;
  const qt = quote.split(" ").filter((t) => t.length > 1);
  const pt = player.split(" ").filter((t) => t.length > 1);
  const overlap = pt.filter((t) => qt.includes(t)).length;
  return overlap >= 2 || (overlap >= 1 && Math.min(quote.length, player.length) >= 5);
}

function resolvePlayerQuoteRows(playerOddsPayload, row) {
  const quoteData =
    playerOddsPayload?.byPlayer?.[String(row.id)] ||
    playerOddsPayload?.byPlayerName?.[normalizePersonNameKey(row.name)] ||
    null;
  const fallbackRowsAll = Array.isArray(playerOddsPayload?.rowsAll)
    ? playerOddsPayload.rowsAll.filter((item) =>
        quoteRowMatchesPlayerName(item?.playerName, row.name),
      )
    : [];
  return Array.isArray(quoteData?.rows)
    ? quoteData.rows.slice(0, 8)
    : fallbackRowsAll.slice(0, 8);
}

const XG_METRIC_PRIORITY = [
  "expected_goals",
  "expected_goals_on_target",
  "expected_points",
  "expected_goals_penalties",
  "expected_goals_free_kicks",
  "expected_goals_corners",
  "expected_goals_non_penalty_goals",
  "expected_goals_set_play",
  "expected_goals_open_play",
  "expected_goals_difference",
  "shooting_performance",
  "expected_goals_against",
  "expected_goals_prevented",
];

function createUnknownMatchFallback(fixtureId) {
  return {
    id: fixtureId,
    sportEventId: fixtureId,
    home: "Fixture non disponibile",
    homeShort: "N/A",
    away: "Feed corrente",
    awayShort: "N/A",
    league: "Sportmonks",
    date: "--",
    time: "--:--",
    state: { shortName: "N/A", name: "Non disponibile" },
    prob: { home: 0, draw: 0, away: 0 },
    odds: { home: 0, draw: 0, away: 0 },
    ou: { over25: 0, under25: 0 },
    gg: { goal: 0, noGoal: 0 },
    ouProb: null,
    ggProb: null,
    xg: { home: 0, away: 0 },
    valueBet: null,
    valueBetSource: "none",
    modelOdds: { home: null, draw: null, away: null },
    valueMarkets: null,
    scores: [],
    confidence: 0,
    scorers: [],
    bookmakers: [],
    homeForm: ["-", "-", "-", "-", "-"],
    awayForm: ["-", "-", "-", "-", "-"],
    h2h: [],
    events: [],
    lineups: {
      home: { formation: "--", players: [] },
      away: { formation: "--", players: [] },
    },
    players: [],
    provider: "sportmonks",
    source: "route_error",
    freshness: null,
    competition: null,
    prediction_provider: "derived_internal_model",
    odds_provider: "not_available_with_current_feed",
    lineup_status: "unknown",
    home_media: { imageUrl: null, thumbUrl: null },
    away_media: { imageUrl: null, thumbUrl: null },
    league_media: { imageUrl: null, thumbUrl: null },
    pressure_preview: null,
  };
}

function formatLineupLabel(status) {
  if (status === "official") return "Formazioni ufficiali";
  if (status === "probable") return "Formazioni probabili";
  if (status === "expected") return "Formazioni attese";
  return "Status formazioni non disponibile";
}

function buildPremiumAnalysis(match) {
  const leader =
    match.prob.home > match.prob.away
      ? match.home
      : match.prob.away > match.prob.home
        ? match.away
        : null;

  if (!leader) {
    return "Il modello derivato vede un match molto equilibrato, senza un lato nettamente dominante.";
  }

  return `Il modello derivato attribuisce a ${leader} una proiezione xG piu alta (${match.xg.home} - ${match.xg.away}).`;
}

function normalizeValueToken(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/_/g, " ");
}

function deriveValueHighlight(valueBet) {
  const market = normalizeValueToken(valueBet?.market);
  const type = normalizeValueToken(valueBet?.type);
  const highlight = { oneXTwo: null, ou: null, gg: null };

  if (!type) {
    return highlight;
  }

  if (["1", "home", "casa"].includes(type)) {
    highlight.oneXTwo = "home";
  } else if (["x", "draw", "pareggio"].includes(type)) {
    highlight.oneXTwo = "draw";
  } else if (["2", "away", "trasferta"].includes(type)) {
    highlight.oneXTwo = "away";
  }

  const isOuMarket =
    market.includes("o/u") ||
    market.includes("under") ||
    market.includes("over");
  if (isOuMarket || type.includes("over") || type.includes("under")) {
    if (type.includes("over")) {
      highlight.ou = "over25";
    } else if (type.includes("under")) {
      highlight.ou = "under25";
    }
  }

  const isGgMarket =
    market.includes("gg") || market.includes("ng") || market.includes("goal");
  if (
    isGgMarket ||
    type === "goal" ||
    type === "no goal" ||
    type === "gg" ||
    type === "ng"
  ) {
    if (
      type === "goal" ||
      type === "gg" ||
      type === "yes" ||
      type.includes("both teams to score")
    ) {
      highlight.gg = "goal";
    } else if (type === "no goal" || type === "ng" || type.includes("no")) {
      highlight.gg = "noGoal";
    }
  }

  return highlight;
}

function getPressureBarValue(preview, key) {
  const bars = Array.isArray(preview?.bars) ? preview.bars : [];
  const entry = bars.find((bar) => bar?.key === key);
  const value = Number(entry?.value);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

function derivePressureSupport(match, valueHighlight) {
  const preview = match?.pressure_preview;
  if (!preview || !match?.valueBet) {
    return null;
  }

  const under = getPressureBarValue(preview, "under");
  const noGoal = getPressureBarValue(preview, "no_goal");
  const homeAtk = getPressureBarValue(preview, "home_atk");
  const awayAtk = getPressureBarValue(preview, "away_atk");
  const attackAvg = Math.round((homeAtk + awayAtk) / 2);
  const xgTotal = Number(match?.xg?.home || 0) + Number(match?.xg?.away || 0);
  const isOuUnder = valueHighlight?.ou === "under25";
  const isOuOver = valueHighlight?.ou === "over25";
  const isGgGoal = valueHighlight?.gg === "goal";
  const isGgNoGoal = valueHighlight?.gg === "noGoal";
  const isOneXTwo = !isOuUnder && !isOuOver && !isGgGoal && !isGgNoGoal;

  let score = 0;
  if (isOuUnder) {
    score += (under - 50) * 0.9 + (noGoal - 50) * 0.6 + (2.45 - xgTotal) * 24;
  } else if (isOuOver) {
    score += (50 - under) * 0.9 + (50 - noGoal) * 0.5 + (xgTotal - 2.45) * 24;
  } else if (isGgNoGoal) {
    score += (noGoal - 50) * 1.0 + (under - 50) * 0.45 + (2.35 - xgTotal) * 14;
  } else if (isGgGoal) {
    score +=
      (50 - noGoal) * 1.0 + (attackAvg - 52) * 0.35 + (xgTotal - 2.35) * 14;
  } else if (isOneXTwo) {
    const pressureBalance = (under - 50) * 0.3 + (noGoal - 50) * 0.3;
    score += Math.max(-8, Math.min(8, -pressureBalance));
    if (attackAvg >= 65) score += 4;
    if (xgTotal >= 2.6) score += 3;
    if (xgTotal <= 2.0) score -= 3;
  }

  if (score >= 12) {
    return {
      level: "alto",
      reason: `Contesto coerente (attacco ${attackAvg}/100, under ${Math.round(under)}/100, no-goal ${Math.round(noGoal)}/100, xG ${xgTotal.toFixed(2)}).`,
    };
  }
  if (score <= -12) {
    return {
      level: "basso",
      reason: `Contesto in contrasto (attacco ${attackAvg}/100, under ${Math.round(under)}/100, no-goal ${Math.round(noGoal)}/100, xG ${xgTotal.toFixed(2)}).`,
    };
  }
  return {
    level: "medio",
    reason: `Contesto neutro (attacco ${attackAvg}/100, under ${Math.round(under)}/100, no-goal ${Math.round(noGoal)}/100, xG ${xgTotal.toFixed(2)}).`,
  };
}

function hasRealMetricSource(source) {
  return Boolean(
    source &&
    !["not_available", "derived_model", "derived_from_xg"].includes(source),
  );
}

function formatDeepDataValue(value, fallback = "n/d") {
  return value == null || value === "" || !Number.isFinite(Number(value))
    ? fallback
    : Number(value);
}

function buildFallbackPlayerProfile(player, teamName) {
  if (!player) return null;

  const position = player.position || player.pos || player.role || "--";
  const number =
    player.number ??
    player.jerseyNumber ??
    player.jersey_number ??
    player.shirtNumber ??
    player.shirt_number ??
    null;

  return {
    id: player.id ?? player.player_id ?? player.playerId ?? player.name,
    name: player.name || player.displayName || "Giocatore",
    team: player.team || teamName || "--",
    position,
    pos: position,
    number,
    media: player.media || null,
    xg: player.xg ?? 0,
    shots: player.shots ?? 0,
    form: player.form || "Stabile",
    formHistory: Array.isArray(player.formHistory)
      ? player.formHistory
      : [0, 0, 0, 0, 0],
    scorerOdds: player.scorerOdds ?? player.odds ?? 10,
    scorerProb: player.scorerProb ?? player.probability ?? 10,
    goals: player.goals ?? 0,
    assists: player.assists ?? 0,
    fouls: player.fouls ?? 0,
    minutes: player.minutes ?? 0,
    insight:
      player.insight ||
      "Profilo costruito dalla formazione disponibile per questa fixture.",
    heatmap: player.heatmap || {
      available: false,
      zones: [],
      source: "not_available",
    },
    playerProps: player.playerProps || {
      xg: {
        value: player.xg ?? null,
        source: player.xg ? "sportmonks_lineup_details" : "not_available",
      },
      shots: {
        value: player.shots ?? null,
        source: player.shots ? "sportmonks_lineup_details" : "not_available",
      },
      shotsOnTarget: {
        value: player.shotsOnTarget ?? null,
        source: "not_available",
      },
      discipline: {
        foulsCommitted: player.fouls ?? null,
        foulsSuffered: player.foulsSuffered ?? null,
        yellowCards: player.yellowCards ?? 0,
        redCards: player.redCards ?? 0,
        source: player.fouls
          ? "sportmonks_lineup_details_events"
          : "not_available",
      },
      heatmap: player.heatmap || {
        available: false,
        zones: [],
        source: "not_available",
      },
      scorer: {
        odds: player.scorerOdds ?? player.odds ?? 10,
        probability: player.scorerProb ?? player.probability ?? 10,
        source: "derived_model",
      },
    },
  };
}

function normalizeEntityId(value) {
  return String(value ?? "").trim();
}

function buildBenchPlayers(lineupPlayers = [], squadPlayers = []) {
  const starterIds = new Set(
    (Array.isArray(lineupPlayers) ? lineupPlayers : [])
      .map((p) => normalizeEntityId(p?.id))
      .filter(Boolean),
  );
  return (Array.isArray(squadPlayers) ? squadPlayers : []).filter(
    (player) => !starterIds.has(normalizeEntityId(player?.id)),
  );
}

export default function MatchDetail() {
  const { id } = useParams();
  const location = useLocation();
  const routeId = decodeURIComponent(String(id || ""));
  const fixtureIdToLoad = String(routeId || "").trim() || null;
  const snapshotVersionForRequest = useMemo(() => {
    const params = new URLSearchParams(String(location?.search || ""));
    const value = params.get("sv") || params.get("snapshotVersion");
    return String(value || "").trim() || null;
  }, [location?.search]);
  const {
    favorites,
    following,
    toggleFavoriteMatch,
    toggleFollowMatch,
    isPremium,
  } = useApp();
  const [apiMatch, setApiMatch] = useState(null);
  /** Risposta completa GET /api/football/fixtures/:id (fixture normalizzata + rawFixture Sportmonks, ecc.) */
  const [fixtureBundle, setFixtureBundle] = useState(null);
  const [fixtureLoading, setFixtureLoading] = useState(
    Boolean(fixtureIdToLoad),
  );
  const [fixtureError, setFixtureError] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedLineupSide, setSelectedLineupSide] = useState("home");
  const [activeMainTab, setActiveMainTab] = useState("panoramica");
  const [formationsDeepTab, setFormationsDeepTab] = useState(
    FORMATIONS_DEEP_TABS.lineups,
  );
  const [isPlayerSheetOpen, setIsPlayerSheetOpen] = useState(false);
  const [selectedPlayerMarket, setSelectedPlayerMarket] =
    useState("anytime_goalscorer");
  const [playerPropsPayload, setPlayerPropsPayload] = useState(null);
  const [playerPropsLoading, setPlayerPropsLoading] = useState(false);
  const [playerPropsError, setPlayerPropsError] = useState("");
  const [teamMomentumPayload, setTeamMomentumPayload] = useState(null);
  const [teamMomentumLoading, setTeamMomentumLoading] = useState(false);
  const [teamMomentumError, setTeamMomentumError] = useState("");
  const [fixtureMultibetAlerts, setFixtureMultibetAlerts] = useState([]);
  const [xgViewMode, setXgViewMode] = useState("team");
  const [xgPlayersDetailMode, setXgPlayersDetailMode] = useState("xg");
  const [xgPlayersApiPayload, setXgPlayersApiPayload] = useState(null);
  const [xgPlayersApiLoading, setXgPlayersApiLoading] = useState(false);
  const [xgPlayersApiError, setXgPlayersApiError] = useState("");
  const [playerOddsPayload, setPlayerOddsPayload] = useState(null);
  const [playerOddsLoading, setPlayerOddsLoading] = useState(false);
  const [playerOddsError, setPlayerOddsError] = useState("");

  useEffect(() => {
    if (!fixtureIdToLoad) {
      setFixtureLoading(false);
      setFixtureError("Questa route richiede un fixture id valido.");
      return;
    }

    let isActive = true;

    const loadFixture = async () => {
      setFixtureLoading(true);
      setFixtureError("");
      setFixtureBundle(null);

      try {
        const payload = await getFixture(fixtureIdToLoad, {
          snapshotVersion: snapshotVersionForRequest,
        });
        if (isActive) {
          setFixtureBundle(payload);
          setApiMatch(payload.fixture);
        }
      } catch (error) {
        if (isActive) {
          setFixtureError(error.message || "Dati fixture non disponibili.");
          setFixtureBundle(null);
        }
      } finally {
        if (isActive) {
          setFixtureLoading(false);
        }
      }
    };

    loadFixture();

    return () => {
      isActive = false;
    };
  }, [fixtureIdToLoad, snapshotVersionForRequest]);

  useEffect(() => {
    if (!fixtureIdToLoad) {
      return undefined;
    }

    const kickoffAt = fixtureBundle?.fixture?.kickoff_at;
    const lineupStatus = fixtureBundle?.fixture?.lineup_status;
    if (!kickoffAt || lineupStatus === "official") {
      return undefined;
    }

    const kickoffTs = Date.parse(kickoffAt);
    if (!Number.isFinite(kickoffTs)) {
      return undefined;
    }

    const msToKickoff = kickoffTs - Date.now();
    const withinAutoRefreshWindow =
      msToKickoff <= 90 * 60_000 && msToKickoff >= -15 * 60_000;
    if (!withinAutoRefreshWindow) {
      return undefined;
    }

    let cancelled = false;
    const refresh = async () => {
      try {
        const payload = await getFixture(fixtureIdToLoad, {
          snapshotVersion: snapshotVersionForRequest,
        });
        if (!cancelled) {
          setFixtureBundle(payload);
          setApiMatch(payload.fixture);
        }
      } catch {
        // silent refresh: keep last good payload
      }
    };

    const timer = setInterval(refresh, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [
    fixtureIdToLoad,
    snapshotVersionForRequest,
    fixtureBundle?.fixture?.kickoff_at,
    fixtureBundle?.fixture?.lineup_status,
  ]);

  useEffect(() => {
    if (!fixtureBundle?.fixture) {
      return;
    }
    const loadedSnapshotVersion = String(fixtureBundle?.snapshotVersion || "").trim();
    if (!loadedSnapshotVersion || snapshotVersionForRequest === loadedSnapshotVersion) {
      return;
    }
    const currentSearch = new URLSearchParams(String(location?.search || ""));
    currentSearch.set("sv", loadedSnapshotVersion);
    const nextQuery = currentSearch.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
    window.history.replaceState(null, "", nextUrl);
  }, [fixtureBundle?.snapshotVersion, snapshotVersionForRequest, location?.search]);

  useEffect(() => {
    if (!fixtureBundle?.fixture) {
      return;
    }

    const bundle = fixtureBundle;
    const f = bundle.fixture;
    const raw = bundle.rawFixture;

    console.log("[MatchDetail] risposta API fixture (sintesi)", {
      meta: {
        provider: bundle.provider,
        source: bundle.source,
        notice: bundle.notice,
        isFallback: bundle.isFallback,
        freshness: bundle.freshness,
        competition: bundle.competition,
      },
      fixtureId: f?.id ?? null,
      hasOdds: Boolean(f?.odds),
      hasPredictions: Array.isArray(f?.predictions)
        ? f.predictions.length > 0
        : Boolean(f?.predictions),
      hasMetadata: Boolean(f?.metadata),
    });

    const rawLineups = Array.isArray(raw?.lineups) ? raw.lineups : [];
    const withFormationField = rawLineups.filter((e) =>
      String(e?.formation_field || "").trim(),
    );
    const withFormationPosition = rawLineups.filter(
      (e) => e?.formation_position != null,
    );

    console.log("[MatchDetail] === formazioni / lineups (diagnosi) ===", {
      lineup_status: f?.lineup_status,
      lineupConfirmed: f?.lineupConfirmed,
      renderedPitch_home_players: f?.lineups?.home?.players?.length ?? 0,
      renderedPitch_away_players: f?.lineups?.away?.players?.length ?? 0,
      formation_home: f?.lineups?.home?.formation,
      formation_away: f?.lineups?.away?.formation,
      raw_lineups_count: rawLineups.length,
      raw_with_formation_field: withFormationField.length,
      raw_with_formation_position: withFormationPosition.length,
      sample_raw_lineup_entry: rawLineups[0]
        ? {
            id: rawLineups[0]?.id ?? null,
            type_id: rawLineups[0]?.type_id ?? null,
            hasFormationField: Boolean(rawLineups[0]?.formation_field),
            formationPosition: rawLineups[0]?.formation_position ?? null,
          }
        : null,
      squads_fallback_home: f?.squads?.home?.length ?? 0,
      squads_fallback_away: f?.squads?.away?.length ?? 0,
      players_sidebar_count: Array.isArray(f?.players) ? f.players.length : 0,
      nota:
        "Il campo verde legge solo righe da formation_field (formato row:col) dopo il filtro home/away. " +
        "Se Sportmonks non invia lineups o formation_field, il pitch resta vuoto; la sidebar può mostrare giocatori dalla rosa (squad) con stat a zero.",
    });

    const rawCoaches = Array.isArray(raw?.coaches) ? raw.coaches : [];
    const normalizedHomeCoaches = Array.isArray(f?.coaches?.home)
      ? f.coaches.home
      : [];
    const normalizedAwayCoaches = Array.isArray(f?.coaches?.away)
      ? f.coaches.away
      : [];
    const sampleRawCoach = rawCoaches[0] || null;
    const sampleRawLineupWithPlayer =
      rawLineups.find(
        (entry) => entry?.player && typeof entry.player === "object",
      ) || null;
    const sampleNormalizedPlayerWithMedia =
      (Array.isArray(f?.players) ? f.players : []).find(
        (player) => player?.media?.imageUrl || player?.media?.thumbUrl,
      ) || null;

    console.log("[MatchDetail] === coaches / foto (diagnosi) ===", {
      raw_coaches_count: rawCoaches.length,
      normalized_home_coaches_count: normalizedHomeCoaches.length,
      normalized_away_coaches_count: normalizedAwayCoaches.length,
      raw_sample_coach: sampleRawCoach
        ? {
            id: sampleRawCoach.id ?? null,
            name:
              sampleRawCoach.name ||
              sampleRawCoach.fullname ||
              sampleRawCoach.common_name ||
              null,
            hasImagePath: Boolean(
              sampleRawCoach.image_path ||
              sampleRawCoach.imagePath ||
              sampleRawCoach.photo ||
              sampleRawCoach.image,
            ),
            imageKeys: Object.keys(sampleRawCoach).filter((key) =>
              ["image", "photo", "logo"].some((token) =>
                key.toLowerCase().includes(token),
              ),
            ),
          }
        : null,
      normalized_home_coaches: normalizedHomeCoaches.map((coach) => ({
        id: coach.id ?? null,
        name: coach.name ?? null,
        hasMedia: Boolean(coach.media?.imageUrl || coach.media?.thumbUrl),
      })),
      normalized_away_coaches: normalizedAwayCoaches.map((coach) => ({
        id: coach.id ?? null,
        name: coach.name ?? null,
        hasMedia: Boolean(coach.media?.imageUrl || coach.media?.thumbUrl),
      })),
      raw_lineup_with_player_media_sample: sampleRawLineupWithPlayer
        ? {
            lineupId: sampleRawLineupWithPlayer.id ?? null,
            playerId:
              sampleRawLineupWithPlayer.player_id ||
              sampleRawLineupWithPlayer.player?.id ||
              null,
            playerName:
              sampleRawLineupWithPlayer.player_name ||
              sampleRawLineupWithPlayer.player?.display_name ||
              sampleRawLineupWithPlayer.player?.name ||
              null,
            hasPlayerImagePath: Boolean(
              sampleRawLineupWithPlayer.player?.image_path ||
              sampleRawLineupWithPlayer.player?.imagePath ||
              sampleRawLineupWithPlayer.player?.photo ||
              sampleRawLineupWithPlayer.player?.image,
            ),
            playerImageKeys: sampleRawLineupWithPlayer.player
              ? Object.keys(sampleRawLineupWithPlayer.player).filter((key) =>
                  ["image", "photo", "logo"].some((token) =>
                    key.toLowerCase().includes(token),
                  ),
                )
              : [],
          }
        : null,
      normalized_players_total: Array.isArray(f?.players)
        ? f.players.length
        : 0,
      normalized_players_with_media: (Array.isArray(f?.players)
        ? f.players
        : []
      ).filter((player) => player?.media?.imageUrl || player?.media?.thumbUrl)
        .length,
      normalized_player_media_sample: sampleNormalizedPlayerWithMedia
        ? {
            id: sampleNormalizedPlayerWithMedia.id ?? null,
            name: sampleNormalizedPlayerWithMedia.name ?? null,
            media: sampleNormalizedPlayerWithMedia.media ?? null,
          }
        : null,
      note:
        "Se raw_coaches_count > 0 ma normalized_home/away_coaches_count = 0, il problema e nella normalizzazione. " +
        "Se hasPlayerImagePath=false gia nel raw, la foto manca dal feed Sportmonks.",
    });
  }, [fixtureBundle]);

  const match =
    apiMatch || createUnknownMatchFallback(routeId || Date.now().toString());
  const isFav = favorites.matches.includes(String(match.id));
  const isFollowed = following.matches.includes(String(match.id));
  const availablePlayers = Array.isArray(match.players)
    ? match.players
    : EMPTY_ARRAY;
  const comparisonBookmakers =
    match.odds_provider === "not_available_with_current_feed"
      ? []
      : match.bookmakers;
  const premiumAnalysis = useMemo(() => buildPremiumAnalysis(match), [match]);
  const valueBetInsightText = useMemo(() => {
    if (!match?.valueBet) {
      return "";
    }
    const q = getOddsDecimalForValueBet(match);
    const qLabel = q != null && Number.isFinite(Number(q)) ? ` @ ${q}` : "";
    const src =
      match.valueBetSource === "sportmonks_feed_math"
        ? "Value API/quote"
        : match.valueBetSource === "fallback_derivato"
          ? "Value fallback derivato"
          : "Value";
    return `${src}: ${match.valueBet.type}${qLabel} · edge +${match.valueBet.edge}%`;
  }, [match]);
  const valueHighlight = useMemo(
    () => deriveValueHighlight(match?.valueBet),
    [match?.valueBet],
  );
  const pressureSupport = useMemo(
    () => derivePressureSupport(match, valueHighlight),
    [match, valueHighlight],
  );
  const standingsRows = Array.isArray(match.standings?.rows)
    ? match.standings.rows
    : EMPTY_ARRAY;
  const homeCoaches = Array.isArray(match.coaches?.home)
    ? match.coaches.home
    : EMPTY_ARRAY;
  const awayCoaches = Array.isArray(match.coaches?.away)
    ? match.coaches.away
    : EMPTY_ARRAY;
  const homeSquad = Array.isArray(match.squads?.home)
    ? match.squads.home
    : EMPTY_ARRAY;
  const awaySquad = Array.isArray(match.squads?.away)
    ? match.squads.away
    : EMPTY_ARRAY;
  const homeLineup = match.lineups?.home || { formation: "--", players: [] };
  const awayLineup = match.lineups?.away || { formation: "--", players: [] };
  const selectedLineup =
    selectedLineupSide === "away" ? awayLineup : homeLineup;
  const selectedLineupPlayers = Array.isArray(selectedLineup?.players)
    ? selectedLineup.players
    : EMPTY_ARRAY;
  const selectedLineupTeam =
    selectedLineupSide === "away" ? match.away : match.home;
  const selectedSquad = selectedLineupSide === "away" ? awaySquad : homeSquad;
  const selectedPlayerPool = selectedLineupPlayers.length
    ? selectedLineupPlayers
    : selectedSquad;
  const homeBench = useMemo(
    () => buildBenchPlayers(homeLineup?.players, homeSquad),
    [homeLineup?.players, homeSquad],
  );
  const awayBench = useMemo(
    () => buildBenchPlayers(awayLineup?.players, awaySquad),
    [awayLineup?.players, awaySquad],
  );
  const hasRealPlayerStats = useMemo(
    () =>
      availablePlayers.some(
        (player) =>
          hasRealMetricSource(player?.playerProps?.xg?.source) ||
          hasRealMetricSource(player?.playerProps?.shots?.source) ||
          hasRealMetricSource(player?.playerProps?.discipline?.source),
      ),
    [availablePlayers],
  );
  const visibleFormationsTabs = useMemo(
    () =>
      [
        { key: FORMATIONS_DEEP_TABS.lineups, label: "Probabili Formazioni" },
        { key: FORMATIONS_DEEP_TABS.xgAnalysis, label: "Analisi XG" },
        hasRealPlayerStats
          ? { key: FORMATIONS_DEEP_TABS.playerStats, label: "Player Stats" }
          : null,
        { key: FORMATIONS_DEEP_TABS.teamMomentum, label: "Team Momentum" },
      ].filter(Boolean),
    [hasRealPlayerStats],
  );
  const homeStandingRow = useMemo(
    () =>
      standingsRows.find(
        (row) =>
          row.side === "home" ||
          normalizeValueToken(row.team) === normalizeValueToken(match.home),
      ) || null,
    [standingsRows, match.home],
  );
  const awayStandingRow = useMemo(
    () =>
      standingsRows.find(
        (row) =>
          row.side === "away" ||
          normalizeValueToken(row.team) === normalizeValueToken(match.away),
      ) || null,
    [standingsRows, match.away],
  );
  const xgTeamRows = useMemo(() => {
    const raw = fixtureBundle?.rawFixture || {};
    const baseXgRows =
      (Array.isArray(raw?.xgfixture) && raw.xgfixture) ||
      (Array.isArray(raw?.xGFixture) && raw.xGFixture) ||
      (Array.isArray(raw?.xgFixture) && raw.xgFixture) ||
      [];
    const fallbackStats = Array.isArray(raw?.statistics) ? raw.statistics : [];
    const xgLikeFromStats = [];
    fallbackStats.forEach((entry) => {
      const key = normalizeStatKey(
        entry?.type?.developer_name ||
          entry?.type?.code ||
          entry?.type?.name ||
          entry?.type_id,
      );
      const isXgLike =
        key.startsWith("expected_") ||
        key.includes("xg") ||
        key.includes("xgot") ||
        key.includes("xpts") ||
        key === "shooting_performance";
      if (isXgLike) {
        xgLikeFromStats.push(entry);
      }
      const detailsRows = Array.isArray(entry?.details) ? entry.details : [];
      detailsRows.forEach((detail) => {
        const dKey = normalizeStatKey(
          detail?.type?.developer_name ||
            detail?.type?.code ||
            detail?.type?.name ||
            detail?.type_id,
        );
        const detailIsXgLike =
          dKey.startsWith("expected_") ||
          dKey.includes("xg") ||
          dKey.includes("xgot") ||
          dKey.includes("xpts") ||
          dKey === "shooting_performance";
        if (!detailIsXgLike) return;
        xgLikeFromStats.push({
          ...detail,
          participant_id:
            detail?.participant_id ||
            entry?.participant_id ||
            entry?.team_id ||
            detail?.team_id,
          location: detail?.location || entry?.location,
        });
      });
    });
    const teamRows = [...baseXgRows, ...xgLikeFromStats];
    const homeId = String(match?.provider_ids?.sportmonks_home_participant_id || "");
    const awayId = String(match?.provider_ids?.sportmonks_away_participant_id || "");
    const grouped = new Map();
    teamRows.forEach((entry) => {
      const key =
        normalizeStatKey(
          entry?.type?.developer_name ||
            entry?.type?.code ||
            entry?.type?.name ||
            entry?.type_id,
        ) || String(entry?.type_id || "metric");
      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          label: entry?.type?.name || entry?.type?.code || key,
          home: 0,
          away: 0,
        });
      }
      const bucket = grouped.get(key);
      const participantId = String(entry?.participant_id || "");
      const location = String(entry?.location || "").toLowerCase();
      const value = statValueFromData(entry);
      if (participantId && participantId === homeId) {
        bucket.home = value;
      } else if (participantId && participantId === awayId) {
        bucket.away = value;
      } else if (location === "home") {
        bucket.home = value;
      } else if (location === "away") {
        bucket.away = value;
      }
    });
    const out = [...grouped.values()].sort((left, right) => {
      const leftKey = normalizeStatKey(left.key);
      const rightKey = normalizeStatKey(right.key);
      const leftIdx = XG_METRIC_PRIORITY.findIndex((item) => leftKey.includes(item));
      const rightIdx = XG_METRIC_PRIORITY.findIndex((item) => rightKey.includes(item));
      const l = leftIdx === -1 ? 999 : leftIdx;
      const r = rightIdx === -1 ? 999 : rightIdx;
      if (l !== r) return l - r;
      return String(left.label || "").localeCompare(String(right.label || ""));
    });
    if (out.length === 0) {
      const homeXg = Number(match?.xg?.home || 0);
      const awayXg = Number(match?.xg?.away || 0);
      if (homeXg > 0 || awayXg > 0) {
        out.push({
          key: "expected_goals_fallback",
          label: "Expected Goals (xG)",
          home: homeXg,
          away: awayXg,
        });
      }
    }
    return out;
  }, [
    fixtureBundle?.rawFixture,
    match?.xg?.home,
    match?.xg?.away,
    match?.provider_ids?.sportmonks_home_participant_id,
    match?.provider_ids?.sportmonks_away_participant_id,
  ]);
  const xgPlayerRows = useMemo(() => {
    const raw = fixtureBundle?.rawFixture || {};
    const lineupRows = Array.isArray(raw?.lineups) ? raw.lineups : [];
    const mappedFromLineups = lineupRows
      .map((entry) => {
        const player = entry?.player || {};
        const xgRows =
          (Array.isArray(entry?.xglineup) && entry.xglineup) ||
          (Array.isArray(entry?.xGlineup) && entry.xGlineup) ||
          (Array.isArray(entry?.xgLineup) && entry.xgLineup) ||
          [];
        const detailsRows = Array.isArray(entry?.details) ? entry.details : [];
        const readByKey = (rows, aliases) => {
          const normalizedAliases = aliases.map((alias) => normalizeStatKey(alias));
          const matches = rows.filter((row) => {
            const key = normalizeStatKey(
              row?.type?.developer_name ||
                row?.type?.code ||
                row?.type?.name ||
                row?.type_id,
            );
            return normalizedAliases.some((alias) => key === alias);
          });
          if (!matches.length) return 0;
          return matches
            .map((row) => statValueFromData(row))
            .reduce((max, value) => (value > max ? value : max), 0);
        };
        const metricRows = [...xgRows, ...detailsRows];
        const xg = readByKey(metricRows, ["expected_goals", "5304"]);
        const xgot = readByKey(metricRows, [
          "expected_goals_on_target",
          "5305",
        ]);
        const xgOpenPlay = readByKey(metricRows, ["expected_goals_open_play"]);
        const xgSetPiece = readByKey(metricRows, ["expected_goals_set_play"]);
        const xgCorners = readByKey(metricRows, ["expected_goals_corners"]);
        const expectedPoints = readByKey(metricRows, ["expected_points"]);
        const xgNonPenalty = readByKey(metricRows, [
          "expected_non_penalty_goals",
          "expected_goals_non_penalty_goals",
        ]);
        const shootingPerformance = readByKey(metricRows, ["shooting_performance"]);
        const rating = readByKey(metricRows, ["rating", "118"]);
        const minutes = readByKey(metricRows, ["minutes_played", "minutes", "119"]);
        const goals = readByKey(metricRows, ["goals", "52"]);
        const shots = readByKey(metricRows, ["shots_total", "shots", "42"]);
        const passes = readByKey(metricRows, ["passes"]);
        const passAccuracyPct = readByKey(metricRows, ["accurate_passes_percentage"]);
        const touches = readByKey(metricRows, ["touches"]);
        const duelsWonPct = readByKey(metricRows, ["duels_won_percentage"]);
        const interceptions = readByKey(metricRows, ["interceptions"]);
        const tacklesWon = readByKey(metricRows, ["tackles_won"]);
        const eshots = readByKey(metricRows, ["expected_shots", "expected_shots_total"]);
        return {
          id: String(entry?.player_id || player?.id || entry?.id || ""),
          name:
            player?.display_name ||
            player?.common_name ||
            player?.name ||
            entry?.player_name ||
            "Giocatore",
          number: entry?.jersey_number || player?.jersey_number || player?.number || "--",
          media: player?.image_path
            ? { imageUrl: player.image_path, thumbUrl: player.image_path }
            : null,
          seasonRating: rating > 0 ? rating : null,
          seasonMinutes: minutes || 0,
          seasonGoals: goals || 0,
          xg: xg || 0,
          xgot: xgot || 0,
          xgOpenPlay: xgOpenPlay || 0,
          xgSetPiece: xgSetPiece || 0,
          xgCorners: xgCorners || 0,
          expectedPoints: expectedPoints || 0,
          xgNonPenalty: xgNonPenalty || 0,
          shootingPerformance: shootingPerformance || 0,
          eshots: eshots || 0,
          seasonShots: shots || 0,
          seasonPasses: passes || 0,
          seasonPassAccuracyPct: passAccuracyPct || 0,
          seasonTouches: touches || 0,
          seasonDuelsWonPct: duelsWonPct || 0,
          seasonInterceptions: interceptions || 0,
          seasonTacklesWon: tacklesWon || 0,
          hasDirectXgData:
            xgRows.length > 0 ||
            detailsRows.some((row) => {
              const key = normalizeStatKey(
                row?.type?.developer_name ||
                  row?.type?.code ||
                  row?.type?.name ||
                  row?.type_id,
              );
              return (
                key === "expected_goals" ||
                key === "expected_goals_on_target" ||
                key === "minutes_played" ||
                key === "shots_total" ||
                key === "goals" ||
                key === "rating"
              );
            }),
        };
      })
      .filter((row) => row.name);
    const filtered = mappedFromLineups.filter(
      (row) =>
        row.hasDirectXgData &&
        (row.xg > 0 ||
          row.xgot > 0 ||
          row.eshots > 0 ||
          row.xgOpenPlay > 0 ||
          row.xgSetPiece > 0 ||
          row.xgCorners > 0 ||
          row.xgNonPenalty > 0),
    );
    const apiRows = Array.isArray(xgPlayersApiPayload?.rows)
      ? xgPlayersApiPayload.rows
      : [];
    const mergedById = new Map();
    [...apiRows, ...filtered].forEach((row) => {
      const id = String(row?.id || "").trim();
      if (!id) return;
      const existing = mergedById.get(id);
      if (!existing) {
        mergedById.set(id, row);
        return;
      }
      mergedById.set(id, {
        ...existing,
        ...row,
        xg: Math.max(Number(existing.xg || 0), Number(row.xg || 0)),
        xgot: Math.max(Number(existing.xgot || 0), Number(row.xgot || 0)),
        xgOpenPlay: Math.max(
          Number(existing.xgOpenPlay || 0),
          Number(row.xgOpenPlay || 0),
        ),
        xgSetPiece: Math.max(
          Number(existing.xgSetPiece || 0),
          Number(row.xgSetPiece || 0),
        ),
        xgCorners: Math.max(
          Number(existing.xgCorners || 0),
          Number(row.xgCorners || 0),
        ),
        expectedPoints: Math.max(
          Number(existing.expectedPoints || 0),
          Number(row.expectedPoints || 0),
        ),
        xgNonPenalty: Math.max(
          Number(existing.xgNonPenalty || 0),
          Number(row.xgNonPenalty || 0),
        ),
        shootingPerformance: Math.max(
          Number(existing.shootingPerformance || 0),
          Number(row.shootingPerformance || 0),
        ),
        eshots: Math.max(Number(existing.eshots || 0), Number(row.eshots || 0)),
        seasonShots: Math.max(
          Number(existing.seasonShots || 0),
          Number(row.seasonShots || 0),
        ),
        seasonPasses: Math.max(
          Number(existing.seasonPasses || 0),
          Number(row.seasonPasses || 0),
        ),
        seasonPassAccuracyPct: Math.max(
          Number(existing.seasonPassAccuracyPct || 0),
          Number(row.seasonPassAccuracyPct || 0),
        ),
        seasonTouches: Math.max(
          Number(existing.seasonTouches || 0),
          Number(row.seasonTouches || 0),
        ),
        seasonDuelsWonPct: Math.max(
          Number(existing.seasonDuelsWonPct || 0),
          Number(row.seasonDuelsWonPct || 0),
        ),
        seasonInterceptions: Math.max(
          Number(existing.seasonInterceptions || 0),
          Number(row.seasonInterceptions || 0),
        ),
        seasonTacklesWon: Math.max(
          Number(existing.seasonTacklesWon || 0),
          Number(row.seasonTacklesWon || 0),
        ),
        seasonGoals: Math.max(
          Number(existing.seasonGoals || 0),
          Number(row.seasonGoals || 0),
        ),
        seasonMinutes: Math.max(
          Number(existing.seasonMinutes || 0),
          Number(row.seasonMinutes || 0),
        ),
        seasonRating:
          Number(existing.seasonRating || 0) >= Number(row.seasonRating || 0)
            ? existing.seasonRating
            : row.seasonRating,
      });
    });
    const mergedRows = [...mergedById.values()];
    return mergedRows
      .sort(
        (a, b) =>
          b.xg - a.xg ||
          b.xgot - a.xgot ||
          b.xgOpenPlay - a.xgOpenPlay ||
          b.xgSetPiece - a.xgSetPiece ||
          b.xgCorners - a.xgCorners ||
          b.eshots - a.eshots,
      )
      .slice(0, 12);
  }, [fixtureBundle?.rawFixture, xgPlayersApiPayload?.rows]);
  const xgCoverageLevel = useMemo(() => {
    if (!xgTeamRows.length) return "none";
    const hasAdvanced = xgTeamRows.some((row) => {
      const key = normalizeStatKey(row?.key || row?.label || "");
      return (
        key.includes("expected_goals_on_target") ||
        key.includes("expected_points") ||
        key.includes("expected_goals_set_play") ||
        key.includes("expected_goals_open_play") ||
        key.includes("expected_goals_against") ||
        key.includes("shooting_performance") ||
        key.includes("expected_goals_prevented")
      );
    });
    return hasAdvanced ? "advanced" : "basic";
  }, [xgTeamRows]);

  useEffect(() => {
    setXgPlayersApiPayload(null);
    setXgPlayersApiLoading(false);
    setXgPlayersApiError("");
    setPlayerOddsPayload(null);
    setPlayerOddsLoading(false);
    setPlayerOddsError("");
    setTeamMomentumPayload(null);
    setTeamMomentumLoading(false);
    setTeamMomentumError("");
  }, [match.id, snapshotVersionForRequest]);

  useEffect(() => {
    const isInXgContext =
      activeMainTab === "analisi-xg" ||
      (activeMainTab === "formazioni" &&
        formationsDeepTab === FORMATIONS_DEEP_TABS.xgAnalysis);
    if (
      !isInXgContext ||
      xgViewMode !== "players" ||
      !match.id ||
      (xgPlayersApiPayload?.fixtureId === String(match.id) &&
        String(xgPlayersApiPayload?.snapshotVersion || "") ===
          String(snapshotVersionForRequest || ""))
    ) {
      return;
    }

    let active = true;
    setXgPlayersApiLoading(true);
    setXgPlayersApiError("");

    getPlayerXgByFixture(match.id, {
      snapshotVersion: snapshotVersionForRequest,
    })
      .then((payload) => {
        if (active) {
          setXgPlayersApiPayload(payload);
        }
      })
      .catch((error) => {
        if (active) {
          setXgPlayersApiPayload(null);
          setXgPlayersApiError(
            error.message || "Dati xG giocatori non disponibili.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setXgPlayersApiLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    activeMainTab,
    formationsDeepTab,
    xgViewMode,
    match.id,
    xgPlayersApiPayload?.fixtureId,
    xgPlayersApiPayload?.snapshotVersion,
    snapshotVersionForRequest,
  ]);

  useEffect(() => {
    const isInXgPlayersContext =
      (activeMainTab === "analisi-xg" ||
        (activeMainTab === "formazioni" &&
          formationsDeepTab === FORMATIONS_DEEP_TABS.xgAnalysis)) &&
      xgViewMode === "players" &&
      xgPlayersDetailMode === "quote";
    if (
      !isInXgPlayersContext ||
      !match.id ||
      (playerOddsPayload?.fixtureId === String(match.id) &&
        String(playerOddsPayload?.snapshotVersion || "") ===
          String(snapshotVersionForRequest || ""))
    ) {
      return;
    }

    let active = true;
    setPlayerOddsLoading(true);
    setPlayerOddsError("");
    getPlayerOddsByFixture(match.id, {
      snapshotVersion: snapshotVersionForRequest,
    })
      .then((payload) => {
        if (active) setPlayerOddsPayload(payload);
      })
      .catch((error) => {
        if (active) {
          setPlayerOddsPayload(null);
          setPlayerOddsError(error.message || "Quote giocatori non disponibili.");
        }
      })
      .finally(() => {
        if (active) setPlayerOddsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    activeMainTab,
    formationsDeepTab,
    xgViewMode,
    xgPlayersDetailMode,
    match.id,
    playerOddsPayload?.fixtureId,
    playerOddsPayload?.snapshotVersion,
    snapshotVersionForRequest,
  ]);

  const handleSelectLineupPlayer = (player, teamName) => {
    const nextPlayer =
      availablePlayers.find(
        (candidate) =>
          candidate.id === player?.id || candidate.name === player?.name,
      ) || buildFallbackPlayerProfile(player, teamName);
    setSelectedPlayer(nextPlayer);
    setIsPlayerSheetOpen(true);
  };

  const handleSelectXgPlayer = (row) => {
    if (!row) return;
    const matched =
      availablePlayers.find(
        (candidate) =>
          String(candidate?.id || "") === String(row?.id || "") ||
          normalizePersonNameKey(candidate?.name) === normalizePersonNameKey(row?.name),
      ) || null;
    handleSelectLineupPlayer(matched || row, matched?.team || selectedLineupTeam);
  };

  useEffect(() => {
    const firstLineupPlayer = selectedLineupPlayers[0];
    const playerFromLineup =
      firstLineupPlayer &&
      availablePlayers.find(
        (candidate) =>
          candidate.id === firstLineupPlayer.id ||
          candidate.name === firstLineupPlayer.name,
      );
    const playerFromTeam = availablePlayers.find(
      (candidate) =>
        normalizeValueToken(candidate.team) ===
        normalizeValueToken(selectedLineupTeam),
    );
    const firstSquadPlayer = selectedSquad[0];

    setSelectedPlayer(
      playerFromLineup ||
        playerFromTeam ||
        buildFallbackPlayerProfile(
          firstLineupPlayer || firstSquadPlayer,
          selectedLineupTeam,
        ) ||
        availablePlayers[0] ||
        null,
    );
  }, [
    availablePlayers,
    selectedLineupSide,
    match.home,
    match.away,
    match.lineups,
    match.squads,
  ]);

  useEffect(() => {
    if (
      !hasRealPlayerStats &&
      formationsDeepTab === FORMATIONS_DEEP_TABS.playerStats
    ) {
      setFormationsDeepTab(FORMATIONS_DEEP_TABS.lineups);
    }
  }, [formationsDeepTab, hasRealPlayerStats]);

  useEffect(() => {
    if (
      activeMainTab !== "formazioni" ||
      formationsDeepTab !== FORMATIONS_DEEP_TABS.playerStats ||
      !selectedPlayer?.id
    ) {
      return;
    }

    let active = true;
    setPlayerPropsLoading(true);
    setPlayerPropsError("");

    getPlayerProps({
      fixtureId: match.id,
      playerId: selectedPlayer.id,
      market: selectedPlayerMarket,
    }, {
      snapshotVersion: snapshotVersionForRequest,
    })
      .then((payload) => {
        if (active) {
          setPlayerPropsPayload(payload);
        }
      })
      .catch((error) => {
        if (active) {
          setPlayerPropsPayload(null);
          setPlayerPropsError(error.message || "Player props non disponibili.");
        }
      })
      .finally(() => {
        if (active) {
          setPlayerPropsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    activeMainTab,
    formationsDeepTab,
    match.id,
    selectedPlayer?.id,
    selectedPlayerMarket,
    snapshotVersionForRequest,
  ]);

  useEffect(() => {
    if (
      !match.id ||
      (teamMomentumPayload?.fixtureId === String(match.id) &&
        String(teamMomentumPayload?.snapshotVersion || "") ===
          String(snapshotVersionForRequest || ""))
    ) {
      return;
    }

    let active = true;
    getTeamMomentum(match.id, {
      snapshotVersion: snapshotVersionForRequest,
    })
      .then((payload) => {
        if (active) {
          setTeamMomentumPayload(payload);
        }
      })
      .catch(() => {
        // warmup best-effort
      });
    return () => {
      active = false;
    };
  }, [
    match.id,
    teamMomentumPayload?.fixtureId,
    teamMomentumPayload?.snapshotVersion,
    snapshotVersionForRequest,
  ]);

  useEffect(() => {
    if (
      activeMainTab !== "team-momentum" ||
      (teamMomentumPayload?.fixtureId === String(match.id) &&
        String(teamMomentumPayload?.snapshotVersion || "") ===
          String(snapshotVersionForRequest || ""))
    ) {
      return;
    }

    let active = true;
    setTeamMomentumLoading(true);
    setTeamMomentumError("");

    getTeamMomentum(match.id, {
      snapshotVersion: snapshotVersionForRequest,
    })
      .then((payload) => {
        if (active) {
          setTeamMomentumPayload(payload);
        }
      })
      .catch((error) => {
        if (active) {
          setTeamMomentumPayload(null);
          setTeamMomentumError(
            error.message || "Team momentum non disponibile.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setTeamMomentumLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    activeMainTab,
    match.id,
    teamMomentumPayload?.fixtureId,
    teamMomentumPayload?.snapshotVersion,
    snapshotVersionForRequest,
  ]);

  useEffect(() => {
    if (!fixtureIdToLoad) {
      return undefined;
    }
    let cancelled = false;
    getAlerts({
      fixtureId: String(fixtureIdToLoad),
      type: "multibet",
      status: "pending",
      limit: 8,
    })
      .then(({ alerts }) => {
        if (cancelled) {
          return;
        }
        setFixtureMultibetAlerts(
          (alerts || []).filter((a) => a.type === "multibet"),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setFixtureMultibetAlerts([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fixtureIdToLoad]);

  return (
    <div className="app-page">
      <div className="app-content">
        <Link
          to="/modelli-predittivi"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Torna ai modelli
        </Link>

        {fixtureMultibetAlerts.length > 0 && (
          <GlassCard className="mb-4 border-primary/25 bg-primary/5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-foreground">
                  Multipla orchestratore
                </div>
                <p className="text-xs text-muted-foreground">
                  {fixtureMultibetAlerts.length === 1
                    ? "Questa partita è in 1 segnalazione multi-bet aperta (Mongo / Telegram)."
                    : `Questa partita compare in ${fixtureMultibetAlerts.length} segnalazioni multi-bet aperte (Mongo / Telegram).`}
                </p>
              </div>
              <Link
                to={`/multi-bet?ref=${encodeURIComponent(fixtureMultibetAlerts[0].alertKey || "")}`}
                className="shrink-0 text-xs font-bold text-primary hover:text-primary/90"
              >
                Apri pagina multi-bet →
              </Link>
            </div>
          </GlassCard>
        )}

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassCard
            className={`mb-6 ${match.valueBet ? "border-primary/20" : ""}`}
          >
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="flex min-w-0 flex-1 items-center justify-center gap-2 sm:gap-4 md:justify-start">
                <div className="min-w-0 max-w-[38%] text-center sm:max-w-none">
                  <div className="mx-auto mb-1 flex justify-center">
                    <FootballMediaImage
                      media={match.home_media}
                      fallbackLabel={match.homeShort || match.home}
                      alt=""
                      size="xl"
                      shape="card"
                    />
                  </div>
                  <span className="line-clamp-2 text-sm font-bold text-foreground">
                    {match.home}
                  </span>
                </div>
                <div className="shrink-0 px-1 text-center sm:px-4">
                  <div className="font-orbitron text-2xl font-black text-muted-foreground">
                    {match.currentScore
                      ? `${match.currentScore.home}-${match.currentScore.away}`
                      : "VS"}
                  </div>
                  <div className="mt-1 flex items-center justify-center gap-1.5">
                    <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {match.date} - {match.time}
                    </span>
                  </div>
                  <span className="line-clamp-2 text-xs font-semibold text-accent">
                    {match.league}
                    {match.state?.shortName
                      ? ` - ${match.state.shortName}`
                      : ""}
                  </span>
                </div>
                <div className="min-w-0 max-w-[38%] text-center sm:max-w-none">
                  <div className="mx-auto mb-1 flex justify-center">
                    <FootballMediaImage
                      media={match.away_media}
                      fallbackLabel={match.awayShort || match.away}
                      alt=""
                      size="xl"
                      shape="card"
                    />
                  </div>
                  <span className="line-clamp-2 text-sm font-bold text-foreground">
                    {match.away}
                  </span>
                </div>
              </div>
              <div className="flex min-w-0 flex-wrap items-center justify-center gap-2 sm:justify-end md:gap-3">
                {match.valueBet && <ValueBetBadge match={match} />}
                <button
                  onClick={() => toggleFollowMatch(match.id)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-xs font-semibold ${
                    isFollowed
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  {isFollowed ? "Seguito" : "Segui"}
                </button>
                <button
                  onClick={() => toggleFavoriteMatch(match.id)}
                  className={`p-2 rounded-lg transition-all ${
                    isFav
                      ? "bg-accent/10 text-accent border border-accent/20"
                      : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Star className={`w-4 h-4 ${isFav ? "fill-accent" : ""}`} />
                </button>
              </div>
            </div>

            <div className="mt-4">
              <FeedMetaPanel
                summary={`${match.provider || "—"} · ${match.league || "—"} · ${match.lineup_status || "lineup"}`}
                label="Stato feed dati"
              >
                <DataStatusChips
                  provider={match.provider}
                  source={match.source}
                  freshness={match.freshness}
                  competition={match.competition}
                  leagueMedia={match.league_media}
                  predictionProvider={match.prediction_provider}
                  oddsProvider={match.odds_provider}
                  lineupStatus={match.lineup_status}
                />
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {fixtureLoading && (
                    <span className="px-2 py-1 rounded-full bg-secondary/60 text-muted-foreground border border-border/40">
                      Caricamento Sportmonks...
                    </span>
                  )}
                  {!fixtureLoading && (
                    <span className="px-2 py-1 rounded-full bg-secondary/60 text-muted-foreground border border-border/40">
                      {formatLineupLabel(match.lineup_status)}
                    </span>
                  )}
                  {match.venue?.name && (
                    <span className="px-2 py-1 rounded-full bg-secondary/60 text-muted-foreground border border-border/40">
                      {match.venue.name}
                    </span>
                  )}
                </div>
              </FeedMetaPanel>
              <div className="mt-3 rounded-lg border border-border/40 bg-secondary/20 p-3">
                <ConfidenceBar value={match.confidence} />
              </div>
              {fixtureError && (
                <div className="mt-2 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {fixtureError}
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>

        <div className="grid min-w-0 gap-6 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2">
            <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
              <TabsList className="mb-5 flex h-auto min-h-10 w-full flex-wrap justify-start gap-1 p-1 glass">
                {["panoramica", "formazioni", "analisi-xg", "team-momentum", "contesto", "h2h"].map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="shrink-0 text-xs capitalize data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                  >
                    {tab === "h2h"
                      ? "Testa a Testa"
                      : tab === "analisi-xg"
                        ? "Analisi XG"
                        : tab === "team-momentum"
                          ? "Team Momentum"
                      : tab === "contesto"
                        ? "Contesto"
                        : tab}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="panoramica" className="space-y-4">
                <GlassCard>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h3 className="font-semibold text-sm text-foreground">
                      Probabilità e quote
                    </h3>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {match.valueBet && (
                        <ValueBetBadge match={match} variant="compact" />
                      )}
                      {match.valueBet && pressureSupport?.level && (
                        <span className="text-xs px-2 py-1 rounded-full bg-secondary/60 text-muted-foreground border border-border/30">
                          Supporto tattico:{" "}
                          <span
                            className={`font-semibold ${
                              pressureSupport.level === "alto"
                                ? "text-primary"
                                : pressureSupport.level === "basso"
                                  ? "text-amber-400"
                                  : "text-foreground"
                            }`}
                          >
                            {pressureSupport.level}
                          </span>
                        </span>
                      )}
                      {match.odds_provider ===
                        "not_available_with_current_feed" && (
                        <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
                          Quote stimate, non bookmaker
                        </span>
                      )}
                      {(match.ouProb || match.ggProb) && (
                        <span className="text-xs px-2 py-1 rounded-full bg-secondary/60 text-muted-foreground border border-border/30">
                          O/U e GG: % da predizioni API, modello derivato o
                          implicite dalle quote
                        </span>
                      )}
                      {match.valueBetSource === "fallback_derivato" && (
                        <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
                          Value in fallback derivato (feed quote incompleto)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                      {
                        key: "home",
                        label: `1 - ${match.home}`,
                        probability: match.prob.home,
                        odds: match.odds.home,
                      },
                      {
                        key: "draw",
                        label: "X - Pareggio",
                        probability: match.prob.draw,
                        odds: match.odds.draw,
                      },
                      {
                        key: "away",
                        label: `2 - ${match.away}`,
                        probability: match.prob.away,
                        odds: match.odds.away,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className={`rounded-xl p-3 text-center ${
                          valueHighlight.oneXTwo === item.key
                            ? "border border-primary/25 bg-primary/12 ring-1 ring-primary/20"
                            : "bg-secondary/50"
                        }`}
                      >
                        <div className="mb-1 line-clamp-2 text-xs text-muted-foreground">
                          {item.label}
                        </div>
                        <div
                          className={`font-bold text-xl ${
                            valueHighlight.oneXTwo === item.key
                              ? "text-primary"
                              : "text-foreground"
                          }`}
                        >
                          {item.probability}%
                        </div>
                        <div className="text-sm font-semibold text-accent mt-1">
                          {item.odds}
                        </div>
                        {Number.isFinite(match.modelOdds?.[item.key]) && (
                          <div className="text-[11px] text-muted-foreground">
                            Quota modello {match.modelOdds[item.key]}
                          </div>
                        )}
                        {valueHighlight.oneXTwo === item.key && (
                          <div className="mx-auto mt-2 h-1.5 w-24 max-w-full overflow-hidden rounded-full bg-primary/20">
                            <div className="h-full w-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        label: "Over 2.5",
                        key: "over25",
                        odd: match.ou.over25,
                        prob: match.ouProb?.over25,
                        modelOdd: match.modelOddsOu?.over25,
                      },
                      {
                        label: "Under 2.5",
                        key: "under25",
                        odd: match.ou.under25,
                        prob: match.ouProb?.under25,
                        modelOdd: match.modelOddsOu?.under25,
                      },
                      {
                        label: "Goal",
                        key: "goal",
                        odd: match.gg.goal,
                        prob: match.ggProb?.goal,
                        modelOdd: match.modelOddsGg?.goal,
                      },
                      {
                        label: "No Goal",
                        key: "noGoal",
                        odd: match.gg.noGoal,
                        prob: match.ggProb?.noGoal,
                        modelOdd: match.modelOddsGg?.noGoal,
                      },
                    ].map((row) =>
                      (() => {
                        const isHighlighted =
                          valueHighlight.ou === row.key ||
                          valueHighlight.gg === row.key;
                        return (
                          <div
                            key={row.label}
                            className={`flex flex-col gap-1 rounded-lg p-3 sm:flex-row sm:items-center sm:justify-between ${
                              isHighlighted
                                ? "border border-primary/25 bg-primary/12 ring-1 ring-primary/20"
                                : "bg-secondary/30"
                            }`}
                          >
                            <span className="text-xs text-muted-foreground">
                              {row.label}
                            </span>
                            <div className="text-right">
                              {typeof row.prob === "number" ? (
                                <>
                                  <div
                                    className={`text-sm font-bold ${isHighlighted ? "text-primary" : "text-foreground"}`}
                                  >
                                    {row.prob}%
                                  </div>
                                  <div className="text-xs font-semibold text-accent">
                                    {row.odd}
                                  </div>
                                  {Number.isFinite(row.modelOdd) && (
                                    <div className="text-[11px] text-muted-foreground">
                                      Quota modello {row.modelOdd}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs font-bold text-foreground">
                                  {row.odd}
                                </span>
                              )}
                            </div>
                            {isHighlighted && (
                              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-primary/20 sm:col-span-2">
                                <div className="h-full w-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" />
                              </div>
                            )}
                          </div>
                        );
                      })(),
                    )}
                  </div>
                </GlassCard>

                {match.pressure_preview?.bars?.length > 0 && (
                  <GlassCard>
                    <PressurePreviewChart
                      preview={match.pressure_preview}
                      supportInsight={pressureSupport}
                    />
                  </GlassCard>
                )}

                <GlassCard>
                  <h3 className="font-semibold text-sm text-foreground mb-3">
                    xG Pre-Match
                  </h3>
                  {(() => {
                    const homeXg = Number(match.xg?.home || 0);
                    const awayXg = Number(match.xg?.away || 0);
                    const maxXg = Math.max(homeXg, awayXg, 0.1);
                    const homePct = Math.max(
                      0,
                      Math.min(100, (homeXg / maxXg) * 100),
                    );
                    const awayPct = Math.max(
                      0,
                      Math.min(100, (awayXg / maxXg) * 100),
                    );
                    const delta = Math.abs(homeXg - awayXg).toFixed(2);
                    const leader =
                      homeXg > awayXg
                        ? match.home
                        : awayXg > homeXg
                          ? match.away
                          : "Equilibrio";

                    return (
                      <div className="rounded-xl bg-secondary/30 p-3">
                        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                          <span>Confronto xG</span>
                          <span className="font-semibold text-foreground">
                            Diff. xG {delta}{" "}
                            {leader !== "Equilibrio"
                              ? `· Proiezione ${leader}`
                              : "· Equilibrio"}
                          </span>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <div className="mb-1 flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                {match.home}
                              </span>
                              <span className="font-bold text-primary">
                                {homeXg.toFixed(2)}
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/50">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                                style={{ width: `${homePct}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="mb-1 flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                {match.away}
                              </span>
                              <span className="font-bold text-foreground">
                                {awayXg.toFixed(2)}
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/50">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-500"
                                style={{ width: `${awayPct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </GlassCard>

                <GlassCard>
                  <h3 className="font-semibold text-sm text-foreground mb-3">
                    Risultati Probabili
                  </h3>
                  {match.scores.length > 0 ? (
                    <div className="rounded-xl bg-secondary/30 p-3">
                      {(() => {
                        const topProb = Math.max(
                          ...match.scores.map((entry) =>
                            Number.isFinite(Number(entry?.prob))
                              ? Number(entry.prob)
                              : 0,
                          ),
                        );
                        return (
                          <div className="space-y-2">
                            {match.scores.map((score, index) =>
                              (() => {
                                const rowProb = Number.isFinite(
                                  Number(score?.prob),
                                )
                                  ? Number(score.prob)
                                  : 0;
                                const isTop = rowProb === topProb;
                                return (
                                  <div
                                    key={`${score.score}-${index}`}
                                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${
                                      isTop
                                        ? "border border-primary/25 bg-primary/12 ring-1 ring-primary/20"
                                        : "bg-secondary/40"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-foreground">
                                        {score.score}
                                      </span>
                                      {isTop && (
                                        <span className="rounded-full border border-primary/30 bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                          Piu probabile
                                        </span>
                                      )}
                                    </div>
                                    <span
                                      className={`font-bold ${isTop ? "text-primary" : "text-foreground"}`}
                                    >
                                      {score.prob}%
                                    </span>
                                  </div>
                                );
                              })(),
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Nessun risultato esatto disponibile nel feed corrente.
                    </p>
                  )}
                </GlassCard>
              </TabsContent>

              <TabsContent value="formazioni">
                <div className="space-y-4">
                  {formationsDeepTab === FORMATIONS_DEEP_TABS.lineups && (
                    <GlassCard className="border-border/40">
                    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)]">
                      {[
                        { side: "home", team: match.home, lineup: homeLineup, media: match.home_media, align: "left" },
                        { side: "away", team: match.away, lineup: awayLineup, media: match.away_media, align: "right" },
                      ].map((option, idx) => {
                        const isActive = selectedLineupSide === option.side;
                        const playersCount = Array.isArray(option.lineup?.players)
                          ? option.lineup.players.length
                          : 0;
                        if (idx === 1) {
                          return (
                            <React.Fragment key={option.side}>
                              <div className="flex items-center justify-center rounded-xl border border-border/30 bg-secondary/20 px-3 py-3 text-center">
                                <span className="font-orbitron text-sm font-black text-muted-foreground">
                                  Lineups
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedLineupSide(option.side)}
                                className={`min-w-0 rounded-xl border px-3 py-3 text-right transition-all ${
                                  isActive
                                    ? "border-primary/30 bg-primary/12"
                                    : "border-border/30 bg-secondary/20 hover:bg-secondary/35"
                                }`}
                                title={`Mostra formazione ${option.team}`}
                              >
                                <div className="flex items-center justify-end gap-2">
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-bold text-foreground">{option.team}</div>
                                    <div className="text-xs text-muted-foreground">
                                      Modulo {option.lineup?.formation || "--"}
                                    </div>
                                  </div>
                                  <FootballMediaImage
                                    media={option.media}
                                    fallbackLabel={option.team}
                                    alt={option.team}
                                    size="sm"
                                  />
                                </div>
                                <div className="mt-1 text-[11px] text-muted-foreground">
                                  {playersCount} giocatori
                                </div>
                              </button>
                            </React.Fragment>
                          );
                        }
                        return (
                          <button
                            key={option.side}
                            type="button"
                            onClick={() => setSelectedLineupSide(option.side)}
                            className={`min-w-0 rounded-xl border px-3 py-3 text-left transition-all ${
                              isActive
                                ? "border-primary/30 bg-primary/12"
                                : "border-border/30 bg-secondary/20 hover:bg-secondary/35"
                            }`}
                            title={`Mostra formazione ${option.team}`}
                          >
                            <div className="flex items-center gap-2">
                              <FootballMediaImage
                                media={option.media}
                                fallbackLabel={option.team}
                                alt={option.team}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <div className="truncate text-sm font-bold text-foreground">{option.team}</div>
                                <div className="text-xs text-muted-foreground">
                                  Modulo {option.lineup?.formation || "--"}
                                </div>
                              </div>
                            </div>
                            <div className="mt-1 text-[11px] text-muted-foreground">
                              {playersCount} giocatori
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-2 grid gap-1.5 md:grid-cols-2">
                      {[
                        { team: match.home, coach: homeCoaches[0] || null },
                        { team: match.away, coach: awayCoaches[0] || null },
                      ].map((entry) => (
                        <div
                          key={entry.team}
                          className="rounded-md border border-border/25 bg-secondary/15 px-2 py-1.5"
                        >
                          <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Manager {entry.team}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <FootballMediaImage
                              media={entry.coach?.media}
                              fallbackLabel={entry.coach?.name || "Coach"}
                              alt={entry.coach?.name || "Coach"}
                              size="xs"
                            />
                            <div className="min-w-0">
                              <div className="truncate text-xs font-semibold leading-tight text-foreground">
                                {entry.coach?.name || "Non disponibile"}
                              </div>
                              <div className="text-[10px] leading-tight text-muted-foreground">Allenatore</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    </GlassCard>
                  )}

                  

                  {formationsDeepTab === FORMATIONS_DEEP_TABS.lineups && (
                    <>
                      <div className="grid gap-4">
                        <div className="space-y-4">
                          <FormationPitch
                            homeLineup={selectedLineup}
                            homeTeam={selectedLineupTeam}
                            awayTeam={
                              selectedLineupSide === "away"
                                ? match.home
                                : match.away
                            }
                            onPlayerClick={(player) =>
                              handleSelectLineupPlayer(
                                player,
                                selectedLineupTeam,
                              )
                            }
                          />
                          {!selectedLineupPlayers.length && (
                            <GlassCard>
                              <p className="text-xs text-muted-foreground">
                                Nessuna formazione caricata dal feed corrente
                                per {selectedLineupTeam}.
                              </p>
                            </GlassCard>
                          )}
                          {!selectedLineupPlayers.length &&
                            selectedSquad.length > 0 && (
                              <Accordion
                                type="single"
                                collapsible
                                className="rounded-xl border border-border/40 bg-secondary/10 px-3"
                              >
                                <AccordionItem
                                  value="rose-md"
                                  className="border-0"
                                >
                                  <AccordionTrigger className="py-3 text-sm font-semibold text-foreground hover:no-underline">
                                    Rosa {selectedLineupTeam} (lista compatta)
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="space-y-2 pb-2">
                                      {selectedSquad
                                        .slice(0, 16)
                                        .map((player) => (
                                          <button
                                            key={player.id || player.name}
                                            type="button"
                                            onClick={() =>
                                              handleSelectLineupPlayer(
                                                player,
                                                selectedLineupTeam,
                                              )
                                            }
                                            className="flex w-full items-center justify-between rounded-lg bg-secondary/30 p-2 text-left text-xs transition-colors hover:bg-secondary/50"
                                          >
                                            <span className="min-w-0 truncate text-foreground">
                                              {player.name}
                                            </span>
                                            <span className="ml-2 shrink-0 text-muted-foreground">
                                              #{player.number || "--"} -{" "}
                                              {player.position ||
                                                player.pos ||
                                                "--"}
                                            </span>
                                          </button>
                                        ))}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              </Accordion>
                            )}
                        </div>
                      </div>

                      {(homeBench.length > 0 || awayBench.length > 0) && (
                        <GlassCard className="border-border/40">
                          <h3 className="mb-3 text-sm font-semibold text-foreground">
                            Sostituzioni / Panchina
                          </h3>
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-2 rounded-xl border border-border/30 bg-secondary/20 p-3">
                              <div className="text-xs font-semibold text-primary">
                                {match.home}
                              </div>
                              {(homeBench.length ? homeBench : homeSquad)
                                .slice(0, 14)
                                .map((player) => (
                                  <button
                                    key={`bench-home-${player.id || player.name}`}
                                    type="button"
                                    onClick={() =>
                                      handleSelectLineupPlayer(
                                        player,
                                        match.home,
                                      )
                                    }
                                    className="flex w-full items-center justify-between gap-2 rounded-lg bg-secondary/35 px-2.5 py-2 text-left text-xs transition-colors hover:bg-secondary/50"
                                  >
                                    <div className="flex min-w-0 items-center gap-2">
                                      <FootballMediaImage
                                        media={player.media}
                                        fallbackLabel={player.name}
                                        alt={player.name}
                                        size="xs"
                                      />
                                      <span className="truncate text-foreground">{player.name}</span>
                                    </div>
                                    <span className="shrink-0 text-muted-foreground">
                                      #{player.number || "--"}
                                    </span>
                                  </button>
                                ))}
                            </div>

                            <div className="space-y-2 rounded-xl border border-border/30 bg-secondary/20 p-3">
                              <div className="text-xs font-semibold text-primary">
                                {match.away}
                              </div>
                              {(awayBench.length ? awayBench : awaySquad)
                                .slice(0, 14)
                                .map((player) => (
                                  <button
                                    key={`bench-away-${player.id || player.name}`}
                                    type="button"
                                    onClick={() =>
                                      handleSelectLineupPlayer(
                                        player,
                                        match.away,
                                      )
                                    }
                                    className="flex w-full items-center justify-between gap-2 rounded-lg bg-secondary/35 px-2.5 py-2 text-left text-xs transition-colors hover:bg-secondary/50"
                                  >
                                    <div className="flex min-w-0 items-center gap-2">
                                      <FootballMediaImage
                                        media={player.media}
                                        fallbackLabel={player.name}
                                        alt={player.name}
                                        size="xs"
                                      />
                                      <span className="truncate text-foreground">{player.name}</span>
                                    </div>
                                    <span className="shrink-0 text-muted-foreground">
                                      #{player.number || "--"}
                                    </span>
                                  </button>
                                ))}
                            </div>
                          </div>
                        </GlassCard>
                      )}

                      <div className="space-y-4">
                        {Array.isArray(match.lineup_penalty?.penalties) &&
                          match.lineup_penalty.penalties.length > 0 && (
                            <GlassCard className="border-amber-400/20">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <h3 className="text-sm font-semibold text-foreground">
                                    Impact lineup adjustment
                                  </h3>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Livello:{" "}
                                    {match.lineup_penalty?.mode || "unknown"}
                                    {match.lineup_penalty?.mode === "probable"
                                      ? " (penalizzazione ridotta)"
                                      : match.lineup_penalty?.mode ===
                                          "expected"
                                        ? " (solo warning, senza impatto probabilita)"
                                        : ""}
                                  </p>
                                </div>
                                <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-1 text-[11px] font-semibold text-amber-300">
                                  Impatto probabilita
                                </span>
                              </div>
                              <div className="mt-3 space-y-2">
                                {match.lineup_penalty.penalties.map(
                                  (entry, index) => (
                                    <div
                                      key={`${entry.side}-${index}`}
                                      className="rounded-lg bg-secondary/30 p-3 text-xs text-foreground"
                                    >
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="font-semibold">
                                          {entry.side === "home"
                                            ? match.home
                                            : match.away}
                                        </span>
                                        <span className="font-bold text-amber-300">
                                          -
                                          {entry.appliedPenaltyPct ??
                                            entry.penaltyPct}
                                          % potenziale offensivo
                                        </span>
                                      </div>
                                      {Array.isArray(entry.missingPlayers) &&
                                        entry.missingPlayers.length > 0 && (
                                          <div className="mt-1 text-muted-foreground">
                                            Assenze key player:{" "}
                                            {entry.missingPlayers.join(", ")}
                                          </div>
                                        )}
                                    </div>
                                  ),
                                )}
                              </div>
                            </GlassCard>
                          )}

                      </div>
                    </>
                  )}

                  {formationsDeepTab === FORMATIONS_DEEP_TABS.xgAnalysis && (
                    <GlassCard>
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-foreground">
                          Analisi xG
                        </h3>
                        <span className="rounded-full border border-border/40 bg-secondary/40 px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                          modello previsto (non live tick-by-tick)
                        </span>
                      </div>
                      <div className="mb-3 flex gap-1 rounded-lg border border-border/30 bg-secondary/20 p-1 w-fit">
                        <button
                          type="button"
                          onClick={() => setXgViewMode("team")}
                          className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                            xgViewMode === "team"
                              ? "bg-primary/15 text-primary"
                              : "text-muted-foreground"
                          }`}
                        >
                          xG Squadra
                        </button>
                        <button
                          type="button"
                          onClick={() => setXgViewMode("players")}
                          className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                            xgViewMode === "players"
                              ? "bg-primary/15 text-primary"
                              : "text-muted-foreground"
                          }`}
                        >
                          xG Giocatori
                        </button>
                      </div>
                      {xgViewMode === "team" ? (
                        xgTeamRows.length > 0 ? (
                          <div className="space-y-2">
                            {xgTeamRows.map((row) => {
                              const total =
                                Math.max(0.001, Number(row.home || 0) + Number(row.away || 0));
                              const homePct = Math.max(
                                0,
                                Math.min(100, (Number(row.home || 0) / total) * 100),
                              );
                              const awayPct = Math.max(
                                0,
                                Math.min(100, (Number(row.away || 0) / total) * 100),
                              );
                              return (
                                <div key={row.key} className="space-y-1">
                                  <div className="grid grid-cols-[52px_minmax(0,1fr)_52px] items-center gap-2 text-[11px]">
                                    <span className="font-semibold text-primary">
                                      {Number(row.home || 0).toFixed(2)}
                                    </span>
                                    <span className="truncate text-center text-muted-foreground">
                                      {row.label}
                                    </span>
                                    <span className="text-right font-semibold text-foreground">
                                      {Number(row.away || 0).toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary/40">
                                    <div className="flex h-full w-full">
                                      <div className="h-full bg-primary/80" style={{ width: `${homePct}%` }} />
                                      <div className="h-full bg-foreground/50" style={{ width: `${awayPct}%` }} />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Dati xG squadra non disponibili nel feed corrente.
                          </p>
                        )
                      ) : xgPlayerRows.length > 0 ? (
                        <>
                          <div className="mb-2 flex gap-1 rounded-lg border border-border/30 bg-secondary/20 p-1 w-fit">
                            <button
                              type="button"
                              onClick={() => setXgPlayersDetailMode("xg")}
                              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                                xgPlayersDetailMode === "xg"
                                  ? "bg-primary/15 text-primary"
                                  : "text-muted-foreground"
                              }`}
                            >
                              Analisi xG
                            </button>
                            <button
                              type="button"
                              onClick={() => setXgPlayersDetailMode("season")}
                              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                                xgPlayersDetailMode === "season"
                                  ? "bg-primary/15 text-primary"
                                  : "text-muted-foreground"
                              }`}
                            >
                              Contesto stagione
                            </button>
                            <button
                              type="button"
                              onClick={() => setXgPlayersDetailMode("quote")}
                              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                                xgPlayersDetailMode === "quote"
                                  ? "bg-primary/15 text-primary"
                                  : "text-muted-foreground"
                              }`}
                            >
                              Quote
                            </button>
                          </div>
                          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                          {xgPlayerRows.map((row) => (
                            <button
                              key={row.id || row.name}
                              type="button"
                              onClick={() => handleSelectXgPlayer(row)}
                              className="rounded-lg border border-border/25 bg-secondary/25 p-2.5 text-left transition hover:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/40"
                            >
                              <div className="mb-2 flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="truncate text-xs font-semibold text-foreground">{row.name}</div>
                                  <div className="text-[11px] text-muted-foreground">#{row.number}</div>
                                  <div className="mt-1 text-[10px] font-medium text-muted-foreground">
                                    {xgPlayersDetailMode === "xg"
                                      ? "Analisi xG"
                                      : xgPlayersDetailMode === "season"
                                        ? "Contesto stagionale"
                                        : "Quote giocatore"}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-[10px] text-muted-foreground">
                                    {xgPlayersDetailMode === "quote"
                                      ? "Quote disponibili"
                                      : "Rating stagione"}
                                  </div>
                                  <div
                                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${seasonRatingToneClass(row.seasonRating)}`}
                                  >
                                    {xgPlayersDetailMode === "quote"
                                      ? `${resolvePlayerQuoteRows(playerOddsPayload, row).length}`
                                      : row.seasonRating
                                        ? row.seasonRating.toFixed(2)
                                        : "n/d"}
                                  </div>
                                </div>
                                <FootballMediaImage
                                  media={row.media}
                                  fallbackLabel={row.name}
                                  alt={row.name}
                                  size="md"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                                {xgPlayersDetailMode === "xg" ? (
                                  <>
                                    <span className="text-muted-foreground">xG (atteso)</span>
                                    <span className="text-right text-foreground">{row.xg.toFixed(2)}</span>
                                    <span className="text-muted-foreground">xGOT (atteso)</span>
                                    <span className="text-right text-foreground">{row.xgot.toFixed(2)}</span>
                                    <span className="text-muted-foreground">xG Open Play</span>
                                    <span className="text-right text-foreground">{Number(row.xgOpenPlay || 0).toFixed(2)}</span>
                                    <span className="text-muted-foreground">xG Set Piece</span>
                                    <span className="text-right text-foreground">{Number(row.xgSetPiece || 0).toFixed(2)}</span>
                                    <span className="text-muted-foreground">xG Corner</span>
                                    <span className="text-right text-foreground">{Number(row.xgCorners || 0).toFixed(2)}</span>
                                    <span className="text-muted-foreground">xG Non-Rigore</span>
                                    <span className="text-right text-foreground">{Number(row.xgNonPenalty || 0).toFixed(2)}</span>
                                    <span className="text-muted-foreground">Expected Points</span>
                                    <span className="text-right text-foreground">{Number(row.expectedPoints || 0).toFixed(2)}</span>
                                    <span className="text-muted-foreground">eShots (atteso)</span>
                                    <span className="text-right text-foreground">{Number(row.eshots || 0).toFixed(2)}</span>
                                    <span className="text-muted-foreground">Shooting Performance</span>
                                    <span className="text-right text-foreground">{Number(row.shootingPerformance || 0).toFixed(2)}</span>
                                  </>
                                ) : xgPlayersDetailMode === "season" ? (
                                  <>
                                    <span className="text-muted-foreground">Minuti stagione</span>
                                    <span className="text-right text-foreground">{row.seasonMinutes || 0}</span>
                                    <span className="text-muted-foreground">Gol stagione</span>
                                    <span className="text-right text-foreground">{row.seasonGoals || 0}</span>
                                    <span className="text-muted-foreground">Tiri stagione</span>
                                    <span className="text-right text-foreground">{row.seasonShots || 0}</span>
                                    <span className="text-muted-foreground">Passaggi stagione</span>
                                    <span className="text-right text-foreground">{row.seasonPasses || 0}</span>
                                    <span className="text-muted-foreground">Precisione passaggi</span>
                                    <span className="text-right text-foreground">{Number(row.seasonPassAccuracyPct || 0).toFixed(1)}%</span>
                                    <span className="text-muted-foreground">Tocchi stagione</span>
                                    <span className="text-right text-foreground">{row.seasonTouches || 0}</span>
                                    <span className="text-muted-foreground">Duelli vinti %</span>
                                    <span className="text-right text-foreground">{Number(row.seasonDuelsWonPct || 0).toFixed(1)}%</span>
                                    <span className="text-muted-foreground">Intercetti</span>
                                    <span className="text-right text-foreground">{row.seasonInterceptions || 0}</span>
                                    <span className="text-muted-foreground">Tackles vinti</span>
                                    <span className="text-right text-foreground">{row.seasonTacklesWon || 0}</span>
                                  </>
                                ) : (
                                  <>
                                    {(() => {
                                      const quoteRows = resolvePlayerQuoteRows(
                                        playerOddsPayload,
                                        row,
                                      );
                                      if (playerOddsLoading && !quoteRows.length) {
                                        return (
                                          <>
                                            <span className="col-span-2 text-muted-foreground">
                                              Caricamento quote giocatore...
                                            </span>
                                          </>
                                        );
                                      }
                                      if (!quoteRows.length) {
                                        return (
                                          <>
                                            <span className="col-span-2 text-muted-foreground">
                                              {playerOddsError || "Nessuna quota singola disponibile per questo giocatore."}
                                            </span>
                                          </>
                                        );
                                      }
                                      return quoteRows.map((q, idx) => (
                                        <React.Fragment key={`${q.marketKey}-${q.bookmaker}-${idx}`}>
                                          <span className="text-muted-foreground">
                                            {q.selection
                                              ? `${q.marketLabel} (${q.selection}) - ${q.bookmaker}`
                                              : `${q.marketLabel} - ${q.bookmaker}`}
                                          </span>
                                          <span className="text-right text-foreground">{Number(q.odd || 0).toFixed(2)}</span>
                                        </React.Fragment>
                                      ));
                                    })()}
                                  </>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {xgPlayersApiLoading
                            ? "Caricamento dati xG giocatori..."
                            : xgPlayersApiError ||
                              "Dati xG giocatori non disponibili nel feed corrente."}
                        </p>
                      )}
                    </GlassCard>
                  )}

                  {formationsDeepTab === FORMATIONS_DEEP_TABS.playerStats &&
                    hasRealPlayerStats && (
                      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                        <GlassCard>
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <h3 className="text-sm font-semibold text-foreground">
                              Player Stats
                            </h3>
                            <span className="text-[11px] text-muted-foreground">
                              {selectedLineupTeam}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {selectedPlayerPool.slice(0, 18).map((player) => {
                              const matchedPlayer =
                                availablePlayers.find(
                                  (candidate) =>
                                    candidate.id === player.id ||
                                    candidate.name === player.name,
                                ) ||
                                buildFallbackPlayerProfile(
                                  player,
                                  selectedLineupTeam,
                                );
                              const isActive =
                                String(selectedPlayer?.id) ===
                                String(matchedPlayer?.id);
                              const hasRealData =
                                hasRealMetricSource(
                                  matchedPlayer?.playerProps?.xg?.source,
                                ) ||
                                hasRealMetricSource(
                                  matchedPlayer?.playerProps?.shots?.source,
                                ) ||
                                hasRealMetricSource(
                                  matchedPlayer?.playerProps?.discipline
                                    ?.source,
                                );

                              if (!hasRealData) {
                                return null;
                              }

                              return (
                                <button
                                  key={matchedPlayer.id || matchedPlayer.name}
                                  type="button"
                                  onClick={() =>
                                    setSelectedPlayer(matchedPlayer)
                                  }
                                  className={`flex w-full items-center justify-between rounded-lg p-2 text-left text-xs transition-colors ${
                                    isActive
                                      ? "border border-primary/25 bg-primary/10 text-primary"
                                      : "bg-secondary/30 hover:bg-secondary/50"
                                  }`}
                                >
                                  <span className="min-w-0 truncate font-semibold text-foreground">
                                    {matchedPlayer.name}
                                  </span>
                                  <span className="ml-2 shrink-0 text-muted-foreground">
                                    xG{" "}
                                    {formatDeepDataValue(
                                      matchedPlayer?.playerProps?.xg?.value ??
                                        matchedPlayer?.xg,
                                    )}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </GlassCard>

                        <div className="space-y-4">
                          <TopXgPlayers
                            players={selectedPlayerPool}
                            onPlayerClick={setSelectedPlayer}
                          />
                          <PlayerCard
                            player={selectedPlayer}
                            expanded
                            oddsAvailable={
                              match.odds_provider !==
                              "not_available_with_current_feed"
                            }
                          />

                          <GlassCard>
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                              <h3 className="text-sm font-semibold text-foreground">
                                Comparatore Player Props
                              </h3>
                              <div className="flex flex-wrap gap-2">
                                {PLAYER_PROP_MARKETS.map((marketOption) => (
                                  <button
                                    key={marketOption.key}
                                    type="button"
                                    onClick={() =>
                                      setSelectedPlayerMarket(marketOption.key)
                                    }
                                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                                      selectedPlayerMarket === marketOption.key
                                        ? "border border-primary/25 bg-primary/10 text-primary"
                                        : "bg-secondary/30 text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                                    }`}
                                  >
                                    {marketOption.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {playerPropsLoading && (
                              <div className="rounded-lg bg-secondary/30 px-3 py-4 text-xs text-muted-foreground">
                                Caricamento quote player props...
                              </div>
                            )}

                            {!playerPropsLoading && playerPropsError && (
                              <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-4 text-xs text-destructive">
                                {playerPropsError}
                              </div>
                            )}

                            {!playerPropsLoading &&
                              !playerPropsError &&
                              playerPropsPayload?.rows?.length > 0 && (
                                <div className="space-y-2">
                                  {playerPropsPayload.rows.map((row) => (
                                    <div
                                      key={`${row.bookmaker}-${row.selection}`}
                                      className={`grid gap-2 rounded-lg p-3 text-xs sm:grid-cols-[minmax(0,1fr)_90px_90px_100px] sm:items-center ${
                                        row.isBest
                                          ? "border border-primary/25 bg-primary/10"
                                          : "bg-secondary/30"
                                      }`}
                                    >
                                      <div className="min-w-0">
                                        <div className="truncate font-semibold text-foreground">
                                          {row.bookmaker}
                                        </div>
                                        <div className="truncate text-muted-foreground">
                                          {row.selection}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-muted-foreground">
                                          Quota
                                        </div>
                                        <div className="font-bold text-foreground">
                                          {row.odd}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-muted-foreground">
                                          EV
                                        </div>
                                        <div
                                          className={`font-bold ${row.valueEdge >= 0 ? "text-primary" : "text-amber-300"}`}
                                        >
                                          {row.valueEdge >= 0 ? "+" : ""}
                                          {row.valueEdge}%
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-muted-foreground">
                                          Modello
                                        </div>
                                        <div className="font-bold text-foreground">
                                          {row.modelProbability}%
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                            {!playerPropsLoading &&
                              !playerPropsError &&
                              (!playerPropsPayload ||
                                !playerPropsPayload.rows?.length) && (
                                <div className="rounded-lg bg-secondary/30 px-3 py-4 text-xs text-muted-foreground">
                                  Nessuna quota disponibile per il mercato
                                  selezionato.
                                </div>
                              )}
                          </GlassCard>
                        </div>
                      </div>
                    )}

                  {formationsDeepTab === FORMATIONS_DEEP_TABS.teamMomentum && (
                    <div className="space-y-4">
                      {teamMomentumLoading && (
                        <GlassCard>
                          <p className="text-xs text-muted-foreground">
                            Caricamento Team Momentum...
                          </p>
                        </GlassCard>
                      )}

                      {!teamMomentumLoading && teamMomentumError && (
                        <GlassCard>
                          <p className="text-xs text-destructive">
                            {teamMomentumError}
                          </p>
                        </GlassCard>
                      )}

                      {!teamMomentumLoading && !teamMomentumError && (
                        <>
                          <div className="grid gap-4 md:grid-cols-2">
                            {[
                              teamMomentumPayload?.home,
                              teamMomentumPayload?.away,
                            ]
                              .filter(Boolean)
                              .map((team) => (
                                <GlassCard key={team.teamId || team.team}>
                                  <div className="mb-3 flex items-center justify-between gap-2">
                                    <h3 className="text-sm font-semibold text-foreground">
                                      {team.team}
                                    </h3>
                                    <span className="rounded-full border border-border/40 bg-secondary/40 px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                                      {team.marketView}
                                    </span>
                                  </div>
                                  {team.available ? (
                                    <>
                                      <div className="grid grid-cols-3 gap-2">
                                        <div className="rounded-lg bg-secondary/30 p-3">
                                          <div className="text-[11px] text-muted-foreground">
                                            xPts
                                          </div>
                                          <div className="text-lg font-bold text-primary">
                                            {team.xPts}
                                          </div>
                                        </div>
                                        <div className="rounded-lg bg-secondary/30 p-3">
                                          <div className="text-[11px] text-muted-foreground">
                                            Punti reali
                                          </div>
                                          <div className="text-lg font-bold text-foreground">
                                            {team.actualPoints}
                                          </div>
                                        </div>
                                        <div className="rounded-lg bg-secondary/30 p-3">
                                          <div className="text-[11px] text-muted-foreground">
                                            Delta
                                          </div>
                                          <div
                                            className={`text-lg font-bold ${team.delta >= 0 ? "text-primary" : "text-amber-300"}`}
                                          >
                                            {team.delta >= 0 ? "+" : ""}
                                            {team.delta}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="mt-3 grid grid-cols-2 gap-2">
                                        <div className="rounded-lg bg-secondary/30 p-3 text-xs">
                                          <div className="text-muted-foreground">
                                            Segna di più
                                          </div>
                                          <div className="mt-1 font-semibold text-foreground">
                                            {team.strongestScoringWindow}
                                          </div>
                                        </div>
                                        <div className="rounded-lg bg-secondary/30 p-3 text-xs">
                                          <div className="text-muted-foreground">
                                            Subisce di più
                                          </div>
                                          <div className="mt-1 font-semibold text-foreground">
                                            {team.highestConcedingWindow}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="mt-3 space-y-1">
                                        {team.timings.map((bucket) => (
                                          <div
                                            key={bucket.key}
                                            className="grid grid-cols-[70px_1fr_1fr] items-center gap-2 rounded-lg bg-secondary/30 px-3 py-2 text-xs"
                                          >
                                            <span className="text-muted-foreground">
                                              {bucket.key}
                                            </span>
                                            <span className="text-foreground">
                                              Gol {bucket.scored}
                                            </span>
                                            <span className="text-foreground">
                                              Subiti {bucket.conceded}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="rounded-lg bg-secondary/30 px-3 py-4 text-xs text-muted-foreground">
                                      Storico squadra non disponibile nel feed
                                      corrente per questa lega/team.
                                    </div>
                                  )}
                                </GlassCard>
                              ))}
                          </div>

                          {(teamMomentumPayload?.pressurePreview ||
                            match.pressure_preview) && (
                            <GlassCard>
                              <PressurePreviewChart
                                preview={
                                  teamMomentumPayload?.pressurePreview ||
                                  match.pressure_preview
                                }
                                supportInsight={pressureSupport}
                              />
                            </GlassCard>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="analisi-xg" className="space-y-4">
                <GlassCard>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      Analisi xG
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-border/40 bg-secondary/40 px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                        modello previsto (non live tick-by-tick)
                      </span>
                      <span
                        className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${
                          xgCoverageLevel === "advanced"
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-amber-400/30 bg-amber-400/10 text-amber-300"
                        }`}
                      >
                        Copertura xG: {xgCoverageLevel === "advanced" ? "Advanced" : "Basic"}
                      </span>
                    </div>
                  </div>
                  {xgCoverageLevel === "basic" && (
                    <div className="mb-3 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-200">
                      Metriche xG avanzate non disponibili nel piano/feed corrente per questa partita.
                    </div>
                  )}
                  <div className="mb-3 flex gap-1 rounded-lg border border-border/30 bg-secondary/20 p-1 w-fit">
                    <button
                      type="button"
                      onClick={() => setXgViewMode("team")}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                        xgViewMode === "team"
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      xG Squadra
                    </button>
                    <button
                      type="button"
                      onClick={() => setXgViewMode("players")}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                        xgViewMode === "players"
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      xG Giocatori
                    </button>
                  </div>
                  {xgViewMode === "team" ? (
                    xgTeamRows.length > 0 ? (
                      <div className="space-y-2">
                        {xgTeamRows.map((row) => {
                          const total = Math.max(
                            0.001,
                            Number(row.home || 0) + Number(row.away || 0),
                          );
                          const homePct = Math.max(
                            0,
                            Math.min(100, (Number(row.home || 0) / total) * 100),
                          );
                          const awayPct = Math.max(
                            0,
                            Math.min(100, (Number(row.away || 0) / total) * 100),
                          );
                          return (
                            <div key={row.key} className="space-y-1">
                              <div className="grid grid-cols-[52px_minmax(0,1fr)_52px] items-center gap-2 text-[11px]">
                                <span className="font-semibold text-primary">
                                  {Number(row.home || 0).toFixed(2)}
                                </span>
                                <span className="truncate text-center text-muted-foreground">
                                  {row.label}
                                </span>
                                <span className="text-right font-semibold text-foreground">
                                  {Number(row.away || 0).toFixed(2)}
                                </span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-secondary/40">
                                <div className="flex h-full w-full">
                                  <div className="h-full bg-primary/80" style={{ width: `${homePct}%` }} />
                                  <div className="h-full bg-foreground/50" style={{ width: `${awayPct}%` }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Dati xG squadra non disponibili nel feed corrente.
                      </p>
                    )
                  ) : xgPlayerRows.length > 0 ? (
                    <>
                      <div className="mb-2 flex gap-1 rounded-lg border border-border/30 bg-secondary/20 p-1 w-fit">
                        <button
                          type="button"
                          onClick={() => setXgPlayersDetailMode("xg")}
                          className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                            xgPlayersDetailMode === "xg"
                              ? "bg-primary/15 text-primary"
                              : "text-muted-foreground"
                          }`}
                        >
                          Analisi xG
                        </button>
                        <button
                          type="button"
                          onClick={() => setXgPlayersDetailMode("season")}
                          className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                            xgPlayersDetailMode === "season"
                              ? "bg-primary/15 text-primary"
                              : "text-muted-foreground"
                          }`}
                        >
                          Contesto stagione
                        </button>
                        <button
                          type="button"
                          onClick={() => setXgPlayersDetailMode("quote")}
                          className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                            xgPlayersDetailMode === "quote"
                              ? "bg-primary/15 text-primary"
                              : "text-muted-foreground"
                          }`}
                        >
                          Quote
                        </button>
                      </div>
                      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {xgPlayerRows.map((row) => (
                        <button
                          key={row.id || row.name}
                          type="button"
                          onClick={() => handleSelectXgPlayer(row)}
                          className="rounded-lg border border-border/25 bg-secondary/20 p-0 text-left transition hover:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/40"
                        >
                          <div className="flex items-start justify-between gap-2 border-b border-border/20 bg-secondary/30 px-3 py-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-foreground">{row.name}</div>
                              <div className="text-[11px] text-muted-foreground">#{row.number}</div>
                              <div className="mt-1 text-[10px] font-medium text-muted-foreground">
                                {xgPlayersDetailMode === "xg"
                                  ? "Analisi xG"
                                  : xgPlayersDetailMode === "season"
                                    ? "Contesto stagionale"
                                    : "Quote giocatore"}
                              </div>
                              <div className="mt-1 inline-flex items-center gap-1 text-xs">
                                <span className="text-muted-foreground">
                                  {xgPlayersDetailMode === "quote"
                                    ? "Quote disponibili:"
                                    : "Rating stagione:"}
                                </span>
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${seasonRatingToneClass(row.seasonRating)}`}
                                >
                                  {xgPlayersDetailMode === "quote"
                                      ? `${resolvePlayerQuoteRows(playerOddsPayload, row).length}`
                                    : row.seasonRating
                                      ? row.seasonRating.toFixed(2)
                                      : "n/d"}
                                </span>
                              </div>
                            </div>
                            <FootballMediaImage
                              media={row.media}
                              fallbackLabel={row.name}
                              alt={row.name}
                              size="md"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                            {xgPlayersDetailMode === "xg" ? (
                              <>
                                <span className="px-3 py-1 font-semibold text-muted-foreground">xG (atteso)</span>
                                <span className="px-3 py-1 text-right font-semibold text-foreground">{row.xg.toFixed(2)}</span>
                                <span className="px-3 py-1 font-semibold text-muted-foreground">xGOT (atteso)</span>
                                <span className="px-3 py-1 text-right font-semibold text-foreground">{row.xgot.toFixed(2)}</span>
                                <span className="px-3 py-1 text-muted-foreground">xG Open Play</span>
                                <span className="px-3 py-1 text-right text-foreground">{Number(row.xgOpenPlay || 0).toFixed(2)}</span>
                                <span className="px-3 py-1 text-muted-foreground">xG Set Piece</span>
                                <span className="px-3 py-1 text-right text-foreground">{Number(row.xgSetPiece || 0).toFixed(2)}</span>
                                <span className="px-3 py-1 text-muted-foreground">xG Corner</span>
                                <span className="px-3 py-1 text-right text-foreground">{Number(row.xgCorners || 0).toFixed(2)}</span>
                                <span className="px-3 py-1 text-muted-foreground">xG Non-Rigore</span>
                                <span className="px-3 py-1 text-right text-foreground">{Number(row.xgNonPenalty || 0).toFixed(2)}</span>
                                <span className="px-3 py-1 text-muted-foreground">Expected Points</span>
                                <span className="px-3 py-1 text-right text-foreground">{Number(row.expectedPoints || 0).toFixed(2)}</span>
                                <span className="px-3 py-1 text-muted-foreground">eShots (atteso)</span>
                                <span className="px-3 py-1 text-right text-foreground">{Number(row.eshots || 0).toFixed(2)}</span>
                                <span className="px-3 py-1 text-muted-foreground">Shooting Performance</span>
                                <span className="px-3 py-1 text-right text-foreground">{Number(row.shootingPerformance || 0).toFixed(2)}</span>
                              </>
                            ) : xgPlayersDetailMode === "season" ? (
                              <>
                                <span className="px-3 py-1 text-muted-foreground">Minuti stagione</span>
                                <span className="px-3 py-1 text-right text-foreground">{row.seasonMinutes || 0}</span>
                                <span className="px-3 py-1 text-muted-foreground">Gol stagione</span>
                                <span className="px-3 py-1 text-right text-foreground">{row.seasonGoals || 0}</span>
                                <span className="px-3 py-1 text-muted-foreground">Tiri stagione</span>
                                <span className="px-3 py-1 text-right text-foreground">{row.seasonShots || 0}</span>
                                <span className="px-3 py-1 text-muted-foreground">Passaggi stagione</span>
                                <span className="px-3 py-1 text-right text-foreground">{row.seasonPasses || 0}</span>
                                <span className="px-3 py-1 text-muted-foreground">Precisione passaggi</span>
                                <span className="px-3 py-1 text-right text-foreground">{Number(row.seasonPassAccuracyPct || 0).toFixed(1)}%</span>
                                <span className="px-3 py-1 text-muted-foreground">Tocchi stagione</span>
                                <span className="px-3 py-1 text-right text-foreground">{row.seasonTouches || 0}</span>
                                <span className="px-3 py-1 text-muted-foreground">Duelli vinti %</span>
                                <span className="px-3 py-1 text-right text-foreground">{Number(row.seasonDuelsWonPct || 0).toFixed(1)}%</span>
                                <span className="px-3 py-1 text-muted-foreground">Intercetti</span>
                                <span className="px-3 py-1 text-right text-foreground">{row.seasonInterceptions || 0}</span>
                                <span className="px-3 py-1 text-muted-foreground">Tackles vinti</span>
                                <span className="px-3 py-1 text-right text-foreground">{row.seasonTacklesWon || 0}</span>
                              </>
                            ) : (
                              <>
                                {(() => {
                                  const quoteRows = resolvePlayerQuoteRows(
                                    playerOddsPayload,
                                    row,
                                  );
                                  if (playerOddsLoading && !quoteRows.length) {
                                    return (
                                      <>
                                        <span className="px-3 py-1 col-span-2 text-muted-foreground">
                                          Caricamento quote giocatore...
                                        </span>
                                      </>
                                    );
                                  }
                                  if (!quoteRows.length) {
                                    return (
                                      <>
                                        <span className="px-3 py-1 col-span-2 text-muted-foreground">
                                          {playerOddsError || "Nessuna quota singola disponibile per questo giocatore."}
                                        </span>
                                      </>
                                    );
                                  }
                                  return quoteRows.map((q, idx) => (
                                    <React.Fragment key={`${q.marketKey}-${q.bookmaker}-${idx}`}>
                                      <span className="px-3 py-1 text-muted-foreground">
                                        {q.selection
                                          ? `${q.marketLabel} (${q.selection}) - ${q.bookmaker}`
                                          : `${q.marketLabel} - ${q.bookmaker}`}
                                      </span>
                                      <span className="px-3 py-1 text-right text-foreground">{Number(q.odd || 0).toFixed(2)}</span>
                                    </React.Fragment>
                                  ));
                                })()}
                              </>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {xgPlayersApiLoading
                        ? "Caricamento dati xG giocatori..."
                        : xgPlayersApiError ||
                          "Dati xG giocatori non disponibili nel feed corrente."}
                    </p>
                  )}
                </GlassCard>
              </TabsContent>

              <TabsContent value="team-momentum" className="space-y-4">
                <div className="space-y-4">
                  {teamMomentumLoading && (
                    <GlassCard>
                      <p className="text-xs text-muted-foreground">
                        Caricamento Team Momentum...
                      </p>
                    </GlassCard>
                  )}
                  {!teamMomentumLoading && teamMomentumError && (
                    <GlassCard>
                      <p className="text-xs text-destructive">
                        {teamMomentumError}
                      </p>
                    </GlassCard>
                  )}
                  {!teamMomentumLoading && !teamMomentumError && (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        {[teamMomentumPayload?.home, teamMomentumPayload?.away]
                          .filter(Boolean)
                          .map((team) => (
                            <GlassCard key={team.teamId || team.team}>
                              <div className="mb-3 flex items-center justify-between gap-2">
                                <h3 className="text-sm font-semibold text-foreground">
                                  {team.team}
                                </h3>
                                <span className="rounded-full border border-border/40 bg-secondary/40 px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                                  {team.marketView}
                                </span>
                              </div>
                              {team.available ? (
                                <>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div className="rounded-lg bg-secondary/30 p-3"><div className="text-[11px] text-muted-foreground">xPts</div><div className="text-lg font-bold text-primary">{team.xPts}</div></div>
                                    <div className="rounded-lg bg-secondary/30 p-3"><div className="text-[11px] text-muted-foreground">Punti reali</div><div className="text-lg font-bold text-foreground">{team.actualPoints}</div></div>
                                    <div className="rounded-lg bg-secondary/30 p-3"><div className="text-[11px] text-muted-foreground">Delta</div><div className={`text-lg font-bold ${team.delta >= 0 ? "text-primary" : "text-amber-300"}`}>{team.delta >= 0 ? "+" : ""}{team.delta}</div></div>
                                  </div>
                                  <div className="mt-3 grid grid-cols-2 gap-2">
                                    <div className="rounded-lg bg-secondary/30 p-3 text-xs"><div className="text-muted-foreground">Segna di più</div><div className="mt-1 font-semibold text-foreground">{team.strongestScoringWindow}</div></div>
                                    <div className="rounded-lg bg-secondary/30 p-3 text-xs"><div className="text-muted-foreground">Subisce di più</div><div className="mt-1 font-semibold text-foreground">{team.highestConcedingWindow}</div></div>
                                  </div>
                                </>
                              ) : (
                                <div className="rounded-lg bg-secondary/30 px-3 py-4 text-xs text-muted-foreground">
                                  Storico squadra non disponibile nel feed corrente per questa lega/team.
                                </div>
                              )}
                            </GlassCard>
                          ))}
                      </div>
                      {(teamMomentumPayload?.pressurePreview || match.pressure_preview) && (
                        <GlassCard>
                          <PressurePreviewChart
                            preview={teamMomentumPayload?.pressurePreview || match.pressure_preview}
                            supportInsight={pressureSupport}
                          />
                        </GlassCard>
                      )}
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="contesto" className="space-y-3">
                <Accordion
                  type="multiple"
                  defaultValue={["standings", "coaches"]}
                  className="space-y-2"
                >
                  <AccordionItem
                    value="standings"
                    className="rounded-xl border border-border/40 bg-secondary/10 px-3"
                  >
                    <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-3">
                      Standings stagione
                    </AccordionTrigger>
                    <AccordionContent>
                      {standingsRows.length > 0 ? (
                        <div className="space-y-2 pb-2">
                          <div className="grid gap-3 pb-2 md:grid-cols-2">
                            {[
                              { label: match.home, row: homeStandingRow },
                              { label: match.away, row: awayStandingRow },
                            ].map((entry) => (
                              <div
                                key={entry.label}
                                className="rounded-lg border border-border/40 bg-secondary/30 p-3"
                              >
                                <div className="text-[11px] text-muted-foreground">
                                  Posizione campionato
                                </div>
                                <div className="mt-1 flex items-end justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold text-foreground">
                                      {entry.label}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">
                                      {entry.row
                                        ? `${entry.row.points} pt · diff ${entry.row.goalDifference}`
                                        : "n/d"}
                                    </div>
                                  </div>
                                  <div className="text-xl font-black text-primary">
                                    {entry.row
                                      ? `#${entry.row.position}`
                                      : "n/d"}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          {standingsRows.slice(0, 8).map((row) => (
                            <div
                              key={row.id}
                              className={`grid min-w-0 grid-cols-[28px_minmax(0,1fr)_36px_36px_44px] gap-1.5 items-center rounded-lg p-2 sm:grid-cols-[32px_minmax(0,1fr)_40px_40px_48px] sm:gap-2 sm:p-2.5 ${
                                row.highlighted
                                  ? "bg-primary/10 border border-primary/20"
                                  : "bg-secondary/30"
                              }`}
                            >
                              <span className="text-xs font-bold text-muted-foreground">
                                {row.position}
                              </span>
                              <span className="text-xs font-semibold text-foreground truncate">
                                {row.team}
                              </span>
                              <span className="text-xs text-center text-muted-foreground">
                                {row.played}
                              </span>
                              <span className="text-xs text-center text-muted-foreground">
                                {row.goalDifference}
                              </span>
                              <span className="text-xs text-right font-bold text-primary">
                                {row.points} pt
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground pb-2">
                          Classifica stagione non disponibile nel feed corrente.
                        </p>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem
                    value="coaches"
                    className="rounded-xl border border-border/40 bg-secondary/10 px-3"
                  >
                    <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-3">
                      Allenatori
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid md:grid-cols-2 gap-4 pb-2">
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-primary">
                            {match.home}
                          </div>
                          {homeCoaches.length > 0 ? (
                            homeCoaches.map((coach) => (
                              <div
                                key={coach.id}
                                className="p-2.5 rounded-lg bg-secondary/30"
                              >
                                <div className="text-sm font-semibold text-foreground">
                                  {coach.name}
                                </div>
                                {coach.dateOfBirth && (
                                  <div className="text-xs text-muted-foreground">
                                    Nato il {coach.dateOfBirth}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Coach non disponibile.
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-primary">
                            {match.away}
                          </div>
                          {awayCoaches.length > 0 ? (
                            awayCoaches.map((coach) => (
                              <div
                                key={coach.id}
                                className="p-2.5 rounded-lg bg-secondary/30"
                              >
                                <div className="text-sm font-semibold text-foreground">
                                  {coach.name}
                                </div>
                                {coach.dateOfBirth && (
                                  <div className="text-xs text-muted-foreground">
                                    Nato il {coach.dateOfBirth}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Coach non disponibile.
                            </p>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>

              <TabsContent value="h2h">
                <GlassCard>
                  <h3 className="font-semibold text-sm text-foreground mb-4">
                    Testa a Testa
                  </h3>
                  {match.h2h.length > 0 ? (
                    <div className="space-y-2">
                      {match.h2h.map((entry, index) => (
                        <div
                          key={`${entry.date}-${index}`}
                          className="flex min-w-0 flex-col gap-2 rounded-lg bg-secondary/30 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {entry.date}
                          </span>
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="truncate text-xs text-foreground">
                              {entry.home}
                            </span>
                            <span className="shrink-0 font-bold text-foreground">
                              {entry.score}
                            </span>
                            <span className="truncate text-xs text-foreground">
                              {entry.away}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Nessun H2H disponibile con il feed corrente.
                    </p>
                  )}
                </GlassCard>
              </TabsContent>
            </Tabs>
          </div>

          <div className="min-w-0 space-y-4">
            <OddsComparison
              bookmakers={comparisonBookmakers}
              valueMarkets={match.valueMarkets}
            />
            {isPremium ? (
              <GlassCard className="border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm text-foreground">
                    Analisi Pro
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  {premiumAnalysis}
                </p>
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="text-xs font-semibold text-primary">
                    Insight corrente
                  </div>
                  <div className="text-xs text-foreground mt-1">
                    {match.valueBet
                      ? valueBetInsightText
                      : "Nessun value bet derivato evidenziato per questa fixture."}
                  </div>
                </div>
              </GlassCard>
            ) : (
              <PremiumLock message="Analisi Pro" />
            )}

            <GlassCard>
              <Link to="/multi-bet">
                <button className="w-full py-3 rounded-xl bg-accent/10 border border-accent/20 text-accent font-bold text-xs hover:bg-accent/20 transition-all glow-gold">
                  <Crown className="w-3.5 h-3.5 inline mr-1.5" />
                  Vai al Multi-Bet Preview
                </button>
              </Link>
            </GlassCard>
          </div>
        </div>

        <Sheet
          open={isPlayerSheetOpen && Boolean(selectedPlayer)}
          onOpenChange={setIsPlayerSheetOpen}
        >
          <SheetContent
            side="right"
            className="w-full overflow-y-auto border-l border-border/40 bg-background p-0 sm:max-w-xl"
          >
            <div className="p-4">
              <SheetHeader className="mb-3">
                <SheetTitle className="text-base">
                  Dettaglio giocatore
                </SheetTitle>
              </SheetHeader>
              <PlayerDetailPanel
                fixtureId={match.id || fixtureId}
                player={selectedPlayer}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
