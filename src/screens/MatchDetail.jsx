import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "@/lib/router-compat";
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
import ValueBetBadge from "@/components/shared/ValueBetBadge";
import ConfidenceBar from "@/components/shared/ConfidenceBar";
import PremiumLock from "@/components/shared/PremiumLock";
import FormationPitch from "@/components/stats/FormationPitch";
import PlayerCard from "@/components/stats/PlayerCard";
import OddsComparison from "@/components/match/OddsComparison";
import { useApp } from "@/lib/AppContext";
import { getFixture } from "@/api/football";
import { getOddsDecimalForValueBet } from "@/lib/value-bet-display";

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

  return `Il modello derivato assegna un vantaggio principale a ${leader}, con xG stimato ${match.xg.home} - ${match.xg.away}.`;
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

  const isOuMarket = market.includes("o/u") || market.includes("under") || market.includes("over");
  if (isOuMarket || type.includes("over") || type.includes("under")) {
    if (type.includes("over")) {
      highlight.ou = "over25";
    } else if (type.includes("under")) {
      highlight.ou = "under25";
    }
  }

  const isGgMarket = market.includes("gg") || market.includes("ng") || market.includes("goal");
  if (isGgMarket || type === "goal" || type === "no goal" || type === "gg" || type === "ng") {
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

export default function MatchDetail() {
  const { id } = useParams();
  const routeId = decodeURIComponent(String(id || ""));
  const fixtureIdToLoad = String(routeId || "").trim() || null;
  const { favorites, following, toggleFavoriteMatch, toggleFollowMatch, isPremium } = useApp();
  const [apiMatch, setApiMatch] = useState(null);
  const [fixtureLoading, setFixtureLoading] = useState(Boolean(fixtureIdToLoad));
  const [fixtureError, setFixtureError] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState(null);

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

      try {
        const payload = await getFixture(fixtureIdToLoad);
        if (isActive) {
          setApiMatch(payload.fixture);
        }
      } catch (error) {
        if (isActive) {
          setFixtureError(error.message || "Dati fixture non disponibili.");
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
  }, [fixtureIdToLoad]);

  const match = apiMatch || createUnknownMatchFallback(routeId || Date.now().toString());
  const isFav = favorites.matches.includes(String(match.id));
  const isFollowed = following.matches.includes(String(match.id));
  const availablePlayers = Array.isArray(match.players) ? match.players : [];
  const comparisonBookmakers =
    match.odds_provider === "not_available_with_current_feed" ? [] : match.bookmakers;
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
  const valueHighlight = useMemo(() => deriveValueHighlight(match?.valueBet), [match?.valueBet]);
  const standingsRows = Array.isArray(match.standings?.rows) ? match.standings.rows : [];
  const homeCoaches = Array.isArray(match.coaches?.home) ? match.coaches.home : [];
  const awayCoaches = Array.isArray(match.coaches?.away) ? match.coaches.away : [];
  const referees = Array.isArray(match.referees) ? match.referees : [];
  const homeSquad = Array.isArray(match.squads?.home) ? match.squads.home : [];
  const awaySquad = Array.isArray(match.squads?.away) ? match.squads.away : [];

  useEffect(() => {
    setSelectedPlayer(availablePlayers[0] || null);
  }, [availablePlayers]);

  return (
    <div className="app-page">
      <div className="app-content">
        <Link
          to="/modelli-predittivi"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Torna ai modelli
        </Link>

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className={`mb-6 ${match.valueBet ? "border-primary/20" : ""}`}>
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="flex min-w-0 flex-1 items-center justify-center gap-2 sm:gap-4 md:justify-start">
                <div className="min-w-0 max-w-[38%] text-center sm:max-w-none">
                  <div className="mx-auto mb-1 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/50 bg-secondary/80 text-lg font-bold">
                    {match.homeShort}
                  </div>
                  <span className="line-clamp-2 text-sm font-bold text-foreground">{match.home}</span>
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
                    {match.state?.shortName ? ` - ${match.state.shortName}` : ""}
                  </span>
                </div>
                <div className="min-w-0 max-w-[38%] text-center sm:max-w-none">
                  <div className="mx-auto mb-1 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/50 bg-secondary/80 text-lg font-bold">
                    {match.awayShort}
                  </div>
                  <span className="line-clamp-2 text-sm font-bold text-foreground">{match.away}</span>
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
            <Tabs defaultValue="panoramica">
              <TabsList className="mb-5 flex h-auto min-h-10 w-full flex-wrap justify-start gap-1 p-1 glass">
                {["panoramica", "statistiche", "formazioni", "contesto", "h2h"].map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="shrink-0 text-xs capitalize data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                  >
                    {tab === "h2h" ? "Testa a Testa" : tab === "contesto" ? "Contesto" : tab}
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
                      {match.valueBet && <ValueBetBadge match={match} variant="compact" />}
                      {match.odds_provider === "not_available_with_current_feed" && (
                        <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
                          Quote stimate, non bookmaker
                        </span>
                      )}
                      {(match.ouProb || match.ggProb) && (
                        <span className="text-xs px-2 py-1 rounded-full bg-secondary/60 text-muted-foreground border border-border/30">
                          O/U e GG: % da predizioni API, modello derivato o implicite dalle quote
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
                      { key: "home", label: `1 - ${match.home}`, probability: match.prob.home, odds: match.odds.home },
                      { key: "draw", label: "X - Pareggio", probability: match.prob.draw, odds: match.odds.draw },
                      { key: "away", label: `2 - ${match.away}`, probability: match.prob.away, odds: match.odds.away },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className={`rounded-xl p-3 text-center ${
                          valueHighlight.oneXTwo === item.key
                            ? "border border-primary/25 bg-primary/12 ring-1 ring-primary/20"
                            : "bg-secondary/50"
                        }`}
                      >
                        <div className="mb-1 line-clamp-2 text-xs text-muted-foreground">{item.label}</div>
                        <div
                          className={`font-bold text-xl ${
                            valueHighlight.oneXTwo === item.key ? "text-primary" : "text-foreground"
                          }`}
                        >
                          {item.probability}%
                        </div>
                        <div className="text-sm font-semibold text-accent mt-1">{item.odds}</div>
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
                      },
                      {
                        label: "Under 2.5",
                        key: "under25",
                        odd: match.ou.under25,
                        prob: match.ouProb?.under25,
                      },
                      {
                        label: "Goal",
                        key: "goal",
                        odd: match.gg.goal,
                        prob: match.ggProb?.goal,
                      },
                      {
                        label: "No Goal",
                        key: "noGoal",
                        odd: match.gg.noGoal,
                        prob: match.ggProb?.noGoal,
                      },
                    ].map((row) => (
                      (() => {
                        const isHighlighted = valueHighlight.ou === row.key || valueHighlight.gg === row.key;
                        return (
                      <div
                        key={row.label}
                        className={`flex flex-col gap-1 rounded-lg p-3 sm:flex-row sm:items-center sm:justify-between ${
                          isHighlighted
                            ? "border border-primary/25 bg-primary/12 ring-1 ring-primary/20"
                            : "bg-secondary/30"
                        }`}
                      >
                        <span className="text-xs text-muted-foreground">{row.label}</span>
                        <div className="text-right">
                          {typeof row.prob === "number" ? (
                            <>
                              <div className={`text-sm font-bold ${isHighlighted ? "text-primary" : "text-foreground"}`}>
                                {row.prob}%
                              </div>
                              <div className="text-xs font-semibold text-accent">{row.odd}</div>
                            </>
                          ) : (
                            <span className="text-xs font-bold text-foreground">{row.odd}</span>
                          )}
                        </div>
                        {isHighlighted && (
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-primary/20 sm:col-span-2">
                            <div className="h-full w-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" />
                          </div>
                        )}
                      </div>
                        );
                      })()
                    ))}
                  </div>
                </GlassCard>

                <GlassCard>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="rounded-xl bg-secondary/30 p-3">
                      <h3 className="font-semibold text-sm text-foreground mb-2">xG Pre-Match</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{match.home}</span>
                          <span className="font-bold text-primary">{match.xg.home}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{match.away}</span>
                          <span className="font-bold text-foreground">{match.xg.away}</span>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl bg-secondary/30 p-3">
                      <h3 className="font-semibold text-sm text-foreground mb-2">
                        Risultati Probabili
                      </h3>
                      {match.scores.length > 0 ? (
                        <div className="space-y-2">
                          {match.scores.map((score, index) => (
                            <div
                              key={`${score.score}-${index}`}
                              className="flex items-center justify-between rounded-lg bg-secondary/40 px-2.5 py-1.5 text-xs"
                            >
                              <span className="font-semibold text-foreground">{score.score}</span>
                              <span className="text-primary font-bold">{score.prob}%</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Nessun risultato esatto disponibile nel feed corrente.
                        </p>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </TabsContent>

              <TabsContent value="statistiche" className="space-y-4">
                <GlassCard>
                  <h3 className="font-semibold text-sm text-foreground mb-3">
                    Copertura statistica attuale
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                    Questa fixture usa Sportmonks come feed primario, con normalizzazione
                    interna e probabilita dichiarate. Comparatore bookmaker match-by-match e
                    team momentum avanzato restano fuori dal feed corrente.
                  </p>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-secondary/30">
                      <ConfidenceBar value={match.confidence} />
                    </div>
                    <div className="flex justify-between p-3 rounded-lg bg-secondary/30">
                      <span className="text-xs text-muted-foreground">Lineup status</span>
                      <span className="text-sm font-semibold text-foreground">{match.lineup_status}</span>
                    </div>
                  </div>
                </GlassCard>
                <GlassCard>
                  <h3 className="font-semibold text-sm text-foreground mb-3">Impact Players</h3>
                  {match.scorers.length > 0 ? (
                    <div className="space-y-2">
                      {match.scorers.map((scorer, index) => (
                        <div key={`${scorer.name}-${index}`} className="flex min-w-0 flex-col gap-2 rounded-lg bg-secondary/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <span className="min-w-0 truncate text-sm text-foreground">{scorer.name}</span>
                          <div className="flex min-w-0 flex-shrink-0 flex-wrap items-center gap-2 sm:gap-4">
                            <span className="text-xs text-muted-foreground">xG <span className="text-primary font-bold">{scorer.xg}</span></span>
                            <span className="text-xs font-bold text-foreground">{scorer.odds}</span>
                            <span className="text-xs text-primary font-semibold">{scorer.prob}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Nessun impact player disponibile.</p>
                  )}
                </GlassCard>
              </TabsContent>

              <TabsContent value="formazioni">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <FormationPitch
                      homeLineup={match.lineups?.home || { formation: "--", players: [] }}
                      homeTeam={match.home}
                      awayTeam={match.away}
                      onPlayerClick={(player) => {
                        const nextPlayer =
                          availablePlayers.find(
                            (candidate) =>
                              candidate.id === player.id || candidate.name === player.name
                          ) || availablePlayers[0] || null;
                        setSelectedPlayer(nextPlayer);
                      }}
                    />
                    {!match.lineups?.home?.players?.length && (
                      <GlassCard>
                        <p className="text-xs text-muted-foreground">
                          Nessuna formazione caricata dal feed corrente per questa fixture.
                        </p>
                      </GlassCard>
                    )}
                    {!match.lineups?.home?.players?.length && (homeSquad.length > 0 || awaySquad.length > 0) && (
                      <Accordion type="single" collapsible className="rounded-xl border border-border/40 bg-secondary/10 px-3">
                        <AccordionItem value="rose-md" className="border-0">
                          <AccordionTrigger className="py-3 text-sm font-semibold text-foreground hover:no-underline">
                            Rose squadra (lista compatta)
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="grid md:grid-cols-2 gap-3 pb-2">
                              <div className="space-y-2">
                                <div className="text-xs font-semibold text-primary">{match.home}</div>
                                {homeSquad.slice(0, 11).map((player) => (
                                  <div key={player.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-secondary/30">
                                    <span className="text-foreground">{player.name}</span>
                                    <span className="text-muted-foreground">
                                      #{player.number || "--"} - {player.position}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="space-y-2">
                                <div className="text-xs font-semibold text-primary">{match.away}</div>
                                {awaySquad.slice(0, 11).map((player) => (
                                  <div key={player.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-secondary/30">
                                    <span className="text-foreground">{player.name}</span>
                                    <span className="text-muted-foreground">
                                      #{player.number || "--"} - {player.position}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )}
                  </div>
                  <PlayerCard
                    player={selectedPlayer}
                    oddsAvailable={match.odds_provider !== "not_available_with_current_feed"}
                  />
                </div>
              </TabsContent>

              <TabsContent value="contesto" className="space-y-3">
                <Accordion type="multiple" defaultValue={["standings"]} className="space-y-2">
                  <AccordionItem value="standings" className="rounded-xl border border-border/40 bg-secondary/10 px-3">
                    <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-3">
                      Standings stagione
                    </AccordionTrigger>
                    <AccordionContent>
                      {standingsRows.length > 0 ? (
                        <div className="space-y-2 pb-2">
                          {standingsRows.slice(0, 8).map((row) => (
                            <div
                              key={row.id}
                              className={`grid min-w-0 grid-cols-[28px_minmax(0,1fr)_36px_36px_44px] gap-1.5 items-center rounded-lg p-2 sm:grid-cols-[32px_minmax(0,1fr)_40px_40px_48px] sm:gap-2 sm:p-2.5 ${
                                row.highlighted ? "bg-primary/10 border border-primary/20" : "bg-secondary/30"
                              }`}
                            >
                              <span className="text-xs font-bold text-muted-foreground">{row.position}</span>
                              <span className="text-xs font-semibold text-foreground truncate">{row.team}</span>
                              <span className="text-xs text-center text-muted-foreground">{row.played}</span>
                              <span className="text-xs text-center text-muted-foreground">{row.goalDifference}</span>
                              <span className="text-xs text-right font-bold text-primary">{row.points} pt</span>
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

                  <AccordionItem value="officials" className="rounded-xl border border-border/40 bg-secondary/10 px-3">
                    <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-3">
                      Staff e arbitri
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid md:grid-cols-2 gap-4 pb-2">
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-primary">{match.home} coach</div>
                          {homeCoaches.length > 0 ? homeCoaches.map((coach) => (
                            <div key={coach.id} className="p-2.5 rounded-lg bg-secondary/30">
                              <div className="text-sm font-semibold text-foreground">{coach.name}</div>
                              {coach.dateOfBirth && (
                                <div className="text-xs text-muted-foreground">Nato il {coach.dateOfBirth}</div>
                              )}
                            </div>
                          )) : (
                            <p className="text-xs text-muted-foreground">Coach non disponibile.</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-primary">{match.away} coach</div>
                          {awayCoaches.length > 0 ? awayCoaches.map((coach) => (
                            <div key={coach.id} className="p-2.5 rounded-lg bg-secondary/30">
                              <div className="text-sm font-semibold text-foreground">{coach.name}</div>
                              {coach.dateOfBirth && (
                                <div className="text-xs text-muted-foreground">Nato il {coach.dateOfBirth}</div>
                              )}
                            </div>
                          )) : (
                            <p className="text-xs text-muted-foreground">Coach non disponibile.</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 border-t border-border/30 pt-3">
                        <div className="text-xs font-semibold text-primary mb-2">Referees</div>
                        {referees.length > 0 ? (
                          <div className="space-y-2">
                            {referees.map((referee) => (
                              <div key={referee.id} className="p-2.5 rounded-lg bg-secondary/30 text-sm text-foreground">
                                {referee.name}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Nessun referee assegnato nel feed corrente.
                          </p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>

              <TabsContent value="h2h">
                <GlassCard>
                  <h3 className="font-semibold text-sm text-foreground mb-4">Testa a Testa</h3>
                  {match.h2h.length > 0 ? (
                    <div className="space-y-2">
                      {match.h2h.map((entry, index) => (
                        <div key={`${entry.date}-${index}`} className="flex min-w-0 flex-col gap-2 rounded-lg bg-secondary/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <span className="shrink-0 text-xs text-muted-foreground">{entry.date}</span>
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="truncate text-xs text-foreground">{entry.home}</span>
                            <span className="shrink-0 font-bold text-foreground">{entry.score}</span>
                            <span className="truncate text-xs text-foreground">{entry.away}</span>
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
            <OddsComparison bookmakers={comparisonBookmakers} valueMarkets={match.valueMarkets} />
            {isPremium ? (
              <GlassCard className="border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm text-foreground">Analisi Pro</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  {premiumAnalysis}
                </p>
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="text-xs font-semibold text-primary">Insight corrente</div>
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
      </div>
    </div>
  );
}

