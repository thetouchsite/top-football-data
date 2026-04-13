import React, { useEffect, useState } from "react";
import { useParams, Link } from "@/lib/router-compat";
import { motion } from "framer-motion";
import {
  ArrowLeft, Clock, Star, TrendingUp, Crown, Users
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GlassCard from "@/components/shared/GlassCard";
import ValueBetBadge from "@/components/shared/ValueBetBadge";
import PremiumLock from "@/components/shared/PremiumLock";
import FormationPitch from "@/components/stats/FormationPitch";
import PlayerCard from "@/components/stats/PlayerCard";
import OddsComparison from "@/components/match/OddsComparison";
import { MATCHES, INTER_LINEUP, PLAYERS } from "@/lib/mockData";
import { useApp } from "@/lib/AppContext";
import { getFixture } from "@/api/football";

function isSportradarSportEventId(value) {
  return /^sr:sport_event:/i.test(String(value || "").trim());
}

function createUnknownMatchFallback(fixtureId) {
  return {
    id: fixtureId,
    sportEventId: fixtureId,
    home: "Home",
    homeShort: "HOM",
    away: "Away",
    awayShort: "AWA",
    league: "Sportradar",
    date: "--",
    time: "--:--",
    status: "upcoming",
    prob: { home: 33, draw: 34, away: 33 },
    odds: { home: 0, draw: 0, away: 0 },
    ou: {
      over15: 0,
      under15: 0,
      over25: 0,
      under25: 0,
      over35: 0,
      under35: 0,
    },
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
    badges: [],
    injuries: [],
    events: [],
    lineups: {
      home: { formation: "--", players: [] },
      away: { formation: "--", players: [] },
    },
    players: [],
  };
}

export default function MatchDetail() {
  const { id } = useParams();
  const routeId = decodeURIComponent(String(id || ""));
  const matchedMock =
    MATCHES.find((match) => String(match.id) === routeId) ||
    null;
  const fallbackMatch =
    matchedMock ||
    createUnknownMatchFallback(routeId || Date.now().toString());
  const fixtureIdToLoad =
    matchedMock?.sportEventId ||
    (isSportradarSportEventId(routeId) ? routeId : null);
  const { favorites, toggleFavoriteMatch, isPremium } = useApp();
  const [apiMatch, setApiMatch] = useState(null);
  const [fixtureLoading, setFixtureLoading] = useState(Boolean(fixtureIdToLoad));
  const [fixtureError, setFixtureError] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState(PLAYERS[0]);

  useEffect(() => {
    if (!fixtureIdToLoad) {
      setApiMatch(null);
      setFixtureLoading(false);
      return;
    }

    let isActive = true;

    const loadFixture = async () => {
      setApiMatch(null);
      setFixtureLoading(true);
      setFixtureError("");

      try {
        const payload = await getFixture(fixtureIdToLoad);

        if (isActive) {
          setApiMatch(payload.fixture);
        }
      } catch (error) {
        if (isActive) {
          setFixtureError(error.message || "Dati Sportradar non disponibili.");
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

  const match = apiMatch || fallbackMatch;
  const isFav = favorites.matches.includes(match.id);
  const availablePlayers = match.players?.length ? match.players : matchedMock ? PLAYERS : [];
  const homeLineup =
    match.lineups?.home?.players?.length
      ? match.lineups.home
      : matchedMock
      ? INTER_LINEUP
      : { formation: "--", players: [] };
  const currentScore = match.currentScore;
  const timelineEvents = (match.events || []).slice(0, 8);
  const metadataHighlights = (match.metadata || [])
    .filter((entry) => entry?.value)
    .filter((entry) => entry.code !== "lineup_confirmed")
    .slice(0, 4);

  useEffect(() => {
    setSelectedPlayer((currentPlayer) => {
      if (!availablePlayers.length) {
        return null;
      }

      if (
        currentPlayer &&
        availablePlayers.some(
          (player) =>
            player.id === currentPlayer.id || player.name === currentPlayer.name
        )
      ) {
        return currentPlayer;
      }

      return availablePlayers[0];
    });
  }, [availablePlayers]);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back */}
        <Link to="/modelli-predittivi" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Torna ai modelli
        </Link>

        {/* Match header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className={`mb-6 ${match.valueBet ? "border-primary/20" : ""}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-secondary/80 border border-border/50 flex items-center justify-center text-lg font-bold mx-auto mb-1">{match.homeShort}</div>
                  <span className="font-bold text-foreground text-sm">{match.home}</span>
                </div>
                <div className="text-center px-4">
                  <div className="font-orbitron text-2xl font-black text-muted-foreground">
                    {currentScore ? `${currentScore.home}-${currentScore.away}` : "VS"}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 justify-center">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{match.date} - {match.time}</span>
                  </div>
                  <span className="text-xs text-accent font-semibold">
                    {match.league}
                    {match.state?.shortName ? ` · ${match.state.shortName}` : ""}
                  </span>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-secondary/80 border border-border/50 flex items-center justify-center text-lg font-bold mx-auto mb-1">{match.awayShort}</div>
                  <span className="font-bold text-foreground text-sm">{match.away}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {match.valueBet && <ValueBetBadge type={match.valueBet.type} edge={match.valueBet.edge} />}
                <button onClick={() => toggleFavoriteMatch(match.id)}
                  className={`p-2 rounded-lg transition-all ${isFav ? "bg-accent/10 text-accent border border-accent/20" : "bg-secondary/50 text-muted-foreground hover:text-foreground"}`}>
                  <Star className={`w-4 h-4 ${isFav ? "fill-accent" : ""}`} />
                </button>
              </div>
            </div>
            {(match.venue?.name || fixtureLoading || fixtureError || match.apiLoaded) && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                {fixtureLoading && (
                  <span className="px-2 py-1 rounded-full bg-secondary/60 text-muted-foreground border border-border/40">
                    Caricamento Sportradar...
                  </span>
                )}
                {match.apiLoaded && !fixtureLoading && (
                  <span className="px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                    Dati Sportradar
                  </span>
                )}
                {match.lineupConfirmed != null && !fixtureLoading && (
                  <span className="px-2 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
                    {match.lineupConfirmed ? "Formazioni ufficiali" : "Formazioni previste"}
                  </span>
                )}
                {match.venue?.name && (
                  <span className="px-2 py-1 rounded-full bg-secondary/60 text-muted-foreground border border-border/40">
                    {match.venue.name}
                    {match.venue.city ? ` · ${match.venue.city}` : ""}
                  </span>
                )}
                {match.coaches?.home?.name && (
                  <span className="px-2 py-1 rounded-full bg-secondary/60 text-muted-foreground border border-border/40">
                    {match.home}: {match.coaches.home.name}
                  </span>
                )}
                {match.coaches?.away?.name && (
                  <span className="px-2 py-1 rounded-full bg-secondary/60 text-muted-foreground border border-border/40">
                    {match.away}: {match.coaches.away.name}
                  </span>
                )}
                {fixtureError && (
                  <span className="px-2 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                    {fixtureError}
                  </span>
                )}
              </div>
            )}
          </GlassCard>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left main */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="panoramica">
              <TabsList className="glass mb-5 h-10 w-full justify-start">
                {["panoramica", "statistiche", "formazioni", "h2h"].map((t) => (
                  <TabsTrigger key={t} value={t}
                    className="text-xs capitalize data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                    {t === "h2h" ? "Testa a Testa" : t.charAt(0).toUpperCase() + t.slice(1)}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Panoramica */}
              <TabsContent value="panoramica" className="space-y-4">
                {/* Prob + odds */}
                <GlassCard>
                  <h3 className="font-semibold text-sm text-foreground mb-4">Probabilità Modello</h3>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { l: "1 - " + match.home, p: match.prob.home, o: match.odds.home, vb: match.valueBet?.type === "1" },
                      { l: "X - Pareggio", p: match.prob.draw, o: match.odds.draw, vb: false },
                      { l: "2 - " + match.away, p: match.prob.away, o: match.odds.away, vb: match.valueBet?.type === "2" },
                    ].map((item) => (
                      <div key={item.l} className={`text-center p-3 rounded-xl ${item.vb ? "bg-primary/10 border border-primary/30 glow-green-sm" : "bg-secondary/50"}`}>
                        <div className="text-xs text-muted-foreground mb-1">{item.l}</div>
                        <div className="font-bold text-xl text-foreground">{item.p}%</div>
                        <div className="text-sm font-semibold text-accent mt-1">{item.o}</div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { l: "Over 2.5", v: match.ou.over25 }, { l: "Under 2.5", v: match.ou.under25 },
                      { l: "Goal", v: match.gg.goal }, { l: "No Goal", v: match.gg.noGoal },
                    ].map((o) => (
                      <div key={o.l} className="flex justify-between p-3 rounded-lg bg-secondary/30">
                        <span className="text-xs text-muted-foreground">{o.l}</span>
                        <span className="text-xs font-bold text-foreground">{o.v}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                {/* xG + risultati */}
                <GlassCard>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-sm text-foreground mb-3">xG Pre-Match</h3>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-black text-primary">{match.xg.home}</div>
                          <div className="text-xs text-muted-foreground">{match.home}</div>
                        </div>
                        <div className="text-muted-foreground text-sm">vs</div>
                        <div className="text-center">
                          <div className="text-2xl font-black text-foreground">{match.xg.away}</div>
                          <div className="text-xs text-muted-foreground">{match.away}</div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground mb-3">Risultati Probabili</h3>
                      <div className="space-y-1.5">
                        {match.scores.map((s, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground w-12">{s.score}</span>
                            <div className="flex-1 h-2 bg-secondary/40 rounded-full overflow-hidden">
                              <div className="h-full bg-primary/50 rounded-full" style={{ width: `${s.prob * 4}%` }} />
                            </div>
                            <span className="text-xs text-primary font-semibold w-10 text-right">{s.prob}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </GlassCard>

                {timelineEvents.length > 0 && (
                  <GlassCard>
                    <h3 className="font-semibold text-sm text-foreground mb-4">Timeline Eventi</h3>
                    <div className="space-y-2">
                      {timelineEvents.map((event) => (
                        <div
                          key={event.id}
                          className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30"
                        >
                          <div className="w-12 text-sm font-bold text-primary shrink-0">
                            {event.minute}'
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-foreground">
                                {event.typeLabel}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {event.team === "home" ? match.home : match.away}
                              </span>
                              {event.period && (
                                <span className="text-xs text-muted-foreground">
                                  {event.period}
                                </span>
                              )}
                            </div>
                            {(event.player || event.relatedPlayer || event.result || event.info) && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {[
                                  event.player,
                                  event.relatedPlayer ? `→ ${event.relatedPlayer}` : null,
                                  event.result,
                                  event.info,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}

                {(metadataHighlights.length > 0 || match.coaches?.home || match.coaches?.away) && (
                  <GlassCard>
                    <h3 className="font-semibold text-sm text-foreground mb-4">Contesto Sportradar</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">Allenatori</div>
                        {match.coaches?.home?.name && (
                          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                            <span className="text-xs text-muted-foreground">{match.home}</span>
                            <span className="text-sm font-semibold text-foreground">
                              {match.coaches.home.name}
                            </span>
                          </div>
                        )}
                        {match.coaches?.away?.name && (
                          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                            <span className="text-xs text-muted-foreground">{match.away}</span>
                            <span className="text-sm font-semibold text-foreground">
                              {match.coaches.away.name}
                            </span>
                          </div>
                        )}
                      </div>
                      {metadataHighlights.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs text-muted-foreground">Metadata fixture</div>
                          {metadataHighlights.map((entry) => (
                            <div
                              key={entry.id}
                              className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/30"
                            >
                              <span className="text-xs text-muted-foreground">{entry.label}</span>
                              <span className="text-sm font-semibold text-foreground text-right">
                                {entry.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </GlassCard>
                )}

                {/* Form + badges */}
                <GlassCard>
                  <h3 className="font-semibold text-sm text-foreground mb-4">Forma Recente</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {[{ name: match.home, form: match.homeForm }, { name: match.away, form: match.awayForm }].map((t) => (
                      <div key={t.name}>
                        <div className="text-xs text-muted-foreground mb-2">{t.name}</div>
                        <div className="flex gap-1.5">
                          {t.form.map((r, i) => (
                            <span key={i} className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${
                              r === "V" ? "bg-primary/20 text-primary" : r === "S" ? "bg-destructive/20 text-destructive" : "bg-accent/20 text-accent"
                            }`}>{r}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {(match.badges || []).length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-4">
                      {(match.badges || []).map((b) => (
                        <span key={b} className="text-xs px-2 py-1 rounded-full bg-secondary/60 border border-border/30 text-muted-foreground">{b}</span>
                      ))}
                    </div>
                  )}
                </GlassCard>

                {/* Assenze */}
                {match.injuries.length > 0 && (
                  <GlassCard>
                    <h3 className="font-semibold text-sm text-foreground mb-3">Assenze / Dubbi</h3>
                    <div className="space-y-2">
                      {match.injuries.map((inj, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30">
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-sm text-foreground">{inj.name}</span>
                            <span className="text-xs text-muted-foreground">· {inj.team}</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            inj.status === "assente" ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent"
                          }`}>{inj.status}</span>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}
              </TabsContent>

              {/* Statistiche */}
              <TabsContent value="statistiche" className="space-y-4">
                <GlassCard>
                  <h3 className="font-semibold text-sm text-foreground mb-4">Confronto Squadre</h3>
                  <div className="space-y-3">
                    {[
                      { label: "Gol segnati (media)", home: "2.1", away: "1.8" },
                      { label: "Gol subiti (media)", home: "0.9", away: "1.2" },
                      { label: "xG (media)", home: match.xg.home, away: match.xg.away },
                      { label: "Tiri a partita", home: "15.2", away: "12.8" },
                      { label: "Possesso %", home: "57%", away: "43%" },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-sm font-bold text-foreground w-12 text-right">{s.home}</span>
                        <span className="text-xs text-muted-foreground flex-1 text-center">{s.label}</span>
                        <span className="text-sm font-bold text-foreground w-12">{s.away}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
                <GlassCard>
                  <h3 className="font-semibold text-sm text-foreground mb-3">Impact Players</h3>
                  {match.scorers.length > 0 ? (
                    <div className="space-y-2">
                      {match.scorers.map((s, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                          <span className="text-sm text-foreground">{s.name}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-muted-foreground">xG: <span className="text-primary font-bold">{s.xg}</span></span>
                            <span className="text-xs font-bold text-foreground">{s.odds}</span>
                            <span className="text-xs text-primary font-semibold">{s.prob}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Nessun impact player disponibile per questa fixture.
                    </p>
                  )}
                </GlassCard>
              </TabsContent>

              {/* Formazioni */}
              <TabsContent value="formazioni">
                <div className="grid md:grid-cols-2 gap-4">
                  <FormationPitch
                    homeLineup={homeLineup}
                    homeTeam={match.home}
                    awayTeam={match.away}
                    onPlayerClick={(player) => {
                      const resolvedPlayer =
                        availablePlayers.find(
                          (candidate) =>
                            candidate.id === player.id || candidate.name === player.name
                        ) || availablePlayers[0];
                      setSelectedPlayer(resolvedPlayer);
                    }}
                  />
                  <PlayerCard player={selectedPlayer} />
                </div>
              </TabsContent>

              {/* H2H */}
              <TabsContent value="h2h">
                <GlassCard>
                  <h3 className="font-semibold text-sm text-foreground mb-4">Testa a Testa</h3>
                  <div className="space-y-2">
                    {match.h2h.map((h, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                        <span className="text-xs text-muted-foreground">{h.date}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-foreground">{h.home}</span>
                          <span className="font-bold text-foreground">{h.score}</span>
                          <span className="text-xs text-foreground">{h.away}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            <OddsComparison bookmakers={match.bookmakers} />
            {isPremium ? (
              <GlassCard className="border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm text-foreground">Analisi Pro</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  L'analisi predittiva avanzata indica una alta probabilità di vittoria dell'Inter, supportata dalla superiore forma fisica e dalla differenza di xG.
                </p>
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="text-xs font-semibold text-primary">Value Spot identificato:</div>
                  <div className="text-xs text-foreground mt-1">{match.home} 1 @{match.odds.home} · Edge +{match.valueBet?.edge || 5}%</div>
                </div>
              </GlassCard>
            ) : (
              <PremiumLock message="Analisi Pro" />
            )}

            <GlassCard>
              <Link to="/multi-bet">
                <button className="w-full py-3 rounded-xl bg-accent/10 border border-accent/20 text-accent font-bold text-xs hover:bg-accent/20 transition-all glow-gold">
                  <Crown className="w-3.5 h-3.5 inline mr-1.5" />
                  Aggiungi alla Combo
                </button>
              </Link>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
