import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "@/lib/router-compat";
import { motion } from "framer-motion";
import { ArrowLeft, Bell, Clock, Star, TrendingUp, Crown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GlassCard from "@/components/shared/GlassCard";
import DataStatusChips from "@/components/shared/DataStatusChips";
import ValueBetBadge from "@/components/shared/ValueBetBadge";
import PremiumLock from "@/components/shared/PremiumLock";
import FormationPitch from "@/components/stats/FormationPitch";
import PlayerCard from "@/components/stats/PlayerCard";
import OddsComparison from "@/components/match/OddsComparison";
import { useApp } from "@/lib/AppContext";
import { getFixture } from "@/api/football";

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
    xg: { home: 0, away: 0 },
    valueBet: null,
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
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <Link
          to="/modelli-predittivi"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Torna ai modelli
        </Link>

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className={`mb-6 ${match.valueBet ? "border-primary/20" : ""}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-secondary/80 border border-border/50 flex items-center justify-center text-lg font-bold mx-auto mb-1">
                    {match.homeShort}
                  </div>
                  <span className="font-bold text-foreground text-sm">{match.home}</span>
                </div>
                <div className="text-center px-4">
                  <div className="font-orbitron text-2xl font-black text-muted-foreground">
                    {match.currentScore
                      ? `${match.currentScore.home}-${match.currentScore.away}`
                      : "VS"}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 justify-center">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {match.date} - {match.time}
                    </span>
                  </div>
                  <span className="text-xs text-accent font-semibold">
                    {match.league}
                    {match.state?.shortName ? ` - ${match.state.shortName}` : ""}
                  </span>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-secondary/80 border border-border/50 flex items-center justify-center text-lg font-bold mx-auto mb-1">
                    {match.awayShort}
                  </div>
                  <span className="font-bold text-foreground text-sm">{match.away}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {match.valueBet && (
                  <ValueBetBadge type={match.valueBet.type} edge={match.valueBet.edge} />
                )}
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

            <div className="mt-4 space-y-3">
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
                {fixtureError && (
                  <span className="px-2 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                    {fixtureError}
                  </span>
                )}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Tabs defaultValue="panoramica">
              <TabsList className="glass mb-5 h-10 w-full justify-start">
                {["panoramica", "statistiche", "formazioni", "contesto", "h2h"].map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="text-xs capitalize data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                  >
                    {tab === "h2h" ? "Testa a Testa" : tab === "contesto" ? "Contesto" : tab}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="panoramica" className="space-y-4">
                <GlassCard>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="font-semibold text-sm text-foreground">
                      Probabilita modello derivato
                    </h3>
                    {match.odds_provider === "not_available_with_current_feed" && (
                      <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
                        Quote stimate, non bookmaker
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: `1 - ${match.home}`, probability: match.prob.home, odds: match.odds.home },
                      { label: "X - Pareggio", probability: match.prob.draw, odds: match.odds.draw },
                      { label: `2 - ${match.away}`, probability: match.prob.away, odds: match.odds.away },
                    ].map((item) => (
                      <div key={item.label} className="text-center p-3 rounded-xl bg-secondary/50">
                        <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                        <div className="font-bold text-xl text-foreground">{item.probability}%</div>
                        <div className="text-sm font-semibold text-accent mt-1">{item.odds}</div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex justify-between p-3 rounded-lg bg-secondary/30">
                      <span className="text-xs text-muted-foreground">Over 2.5</span>
                      <span className="text-xs font-bold text-foreground">{match.ou.over25}</span>
                    </div>
                    <div className="flex justify-between p-3 rounded-lg bg-secondary/30">
                      <span className="text-xs text-muted-foreground">Under 2.5</span>
                      <span className="text-xs font-bold text-foreground">{match.ou.under25}</span>
                    </div>
                    <div className="flex justify-between p-3 rounded-lg bg-secondary/30">
                      <span className="text-xs text-muted-foreground">Goal</span>
                      <span className="text-xs font-bold text-foreground">{match.gg.goal}</span>
                    </div>
                    <div className="flex justify-between p-3 rounded-lg bg-secondary/30">
                      <span className="text-xs text-muted-foreground">No Goal</span>
                      <span className="text-xs font-bold text-foreground">{match.gg.noGoal}</span>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-sm text-foreground mb-3">xG Pre-Match</h3>
                      <p className="text-sm text-foreground">
                        {match.home}: <span className="font-bold text-primary">{match.xg.home}</span>
                      </p>
                      <p className="text-sm text-foreground mt-1">
                        {match.away}: <span className="font-bold">{match.xg.away}</span>
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground mb-3">
                        Risultati Probabili
                      </h3>
                      {match.scores.length > 0 ? (
                        <div className="space-y-2">
                          {match.scores.map((score, index) => (
                            <div key={`${score.score}-${index}`} className="flex items-center justify-between text-xs">
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
                    <div className="flex justify-between p-3 rounded-lg bg-secondary/30">
                      <span className="text-xs text-muted-foreground">Confidenza modello</span>
                      <span className="text-sm font-semibold text-foreground">{match.confidence}%</span>
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
                        <div key={`${scorer.name}-${index}`} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                          <span className="text-sm text-foreground">{scorer.name}</span>
                          <div className="flex items-center gap-4">
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
                      <GlassCard>
                        <h3 className="font-semibold text-sm text-foreground mb-3">Rose squadra</h3>
                        <div className="grid md:grid-cols-2 gap-3">
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
                      </GlassCard>
                    )}
                  </div>
                  <PlayerCard
                    player={selectedPlayer}
                    oddsAvailable={match.odds_provider !== "not_available_with_current_feed"}
                  />
                </div>
              </TabsContent>

              <TabsContent value="contesto" className="space-y-4">
                <GlassCard>
                  <h3 className="font-semibold text-sm text-foreground mb-4">Standings stagione</h3>
                  {standingsRows.length > 0 ? (
                    <div className="space-y-2">
                      {standingsRows.slice(0, 8).map((row) => (
                        <div
                          key={row.id}
                          className={`grid grid-cols-[32px_1fr_40px_40px_48px] gap-2 items-center p-2.5 rounded-lg ${
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
                    <p className="text-xs text-muted-foreground">
                      Classifica stagione non disponibile nel feed corrente.
                    </p>
                  )}
                </GlassCard>

                <GlassCard>
                  <h3 className="font-semibold text-sm text-foreground mb-4">Officials</h3>
                  <div className="grid md:grid-cols-2 gap-4">
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
                  <div className="mt-4">
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
                </GlassCard>
              </TabsContent>

              <TabsContent value="h2h">
                <GlassCard>
                  <h3 className="font-semibold text-sm text-foreground mb-4">Testa a Testa</h3>
                  {match.h2h.length > 0 ? (
                    <div className="space-y-2">
                      {match.h2h.map((entry, index) => (
                        <div key={`${entry.date}-${index}`} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                          <span className="text-xs text-muted-foreground">{entry.date}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-foreground">{entry.home}</span>
                            <span className="font-bold text-foreground">{entry.score}</span>
                            <span className="text-xs text-foreground">{entry.away}</span>
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

          <div className="space-y-4">
            <OddsComparison bookmakers={comparisonBookmakers} />
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
                      ? `Value spot derivato: ${match.valueBet.type} con edge +${match.valueBet.edge}%`
                      : "Nessun value spot derivato evidenziato per questa fixture."}
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

