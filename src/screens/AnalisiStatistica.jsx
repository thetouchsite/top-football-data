import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, Clock, Star } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SectionHeader from "@/components/shared/SectionHeader";
import DataStatusChips from "@/components/shared/DataStatusChips";
import FormationPitch from "@/components/stats/FormationPitch";
import PlayerCard from "@/components/stats/PlayerCard";
import GlassCard from "@/components/shared/GlassCard";
import { useApp } from "@/lib/AppContext";
import { getFixture, getScheduleWindow } from "@/api/football";
import { sortMatchesByFeaturedPriority } from "@/lib/football-filters";

export default function AnalisiStatistica() {
  const [scheduleMatches, setScheduleMatches] = useState([]);
  const [selectedFixtureId, setSelectedFixtureId] = useState("");
  const [fixture, setFixture] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [sortBy, setSortBy] = useState("xg");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scheduleMeta, setScheduleMeta] = useState(null);
  const { favorites, toggleFavoritePlayer } = useApp();
  const homeSquad = Array.isArray(fixture?.squads?.home) ? fixture.squads.home : [];
  const awaySquad = Array.isArray(fixture?.squads?.away) ? fixture.squads.away : [];
  const standingsRows = Array.isArray(fixture?.standings?.rows) ? fixture.standings.rows : [];
  const homeCoaches = Array.isArray(fixture?.coaches?.home) ? fixture.coaches.home : [];
  const awayCoaches = Array.isArray(fixture?.coaches?.away) ? fixture.coaches.away : [];
  const referees = Array.isArray(fixture?.referees) ? fixture.referees : [];

  useEffect(() => {
    let isActive = true;

    const loadSchedule = async () => {
      try {
        const payload = await getScheduleWindow(14);

        if (!isActive) {
          return;
        }

        const matches = Array.isArray(payload.matches) ? payload.matches : [];
        setScheduleMatches(matches);
        if (matches.length === 0) {
          setLoading(false);
        }
        setScheduleMeta({
          provider: payload.provider,
          source: payload.source,
          freshness: payload.freshness,
          notice: payload.notice || "",
        });
      } catch (nextError) {
        if (isActive) {
          setError(nextError.message || "Calendario non disponibile.");
          setLoading(false);
        }
      }
    };

    loadSchedule();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedFixtureId) {
      if (scheduleMatches.length > 0) {
        setLoading(false);
      }
      return;
    }

    let isActive = true;

    const loadFixture = async () => {
      setLoading(true);
      setError("");

      try {
        const payload = await getFixture(selectedFixtureId);

        if (isActive) {
          setFixture(payload.fixture);
          const fixturePlayers =
            Array.isArray(payload.fixture?.players) && payload.fixture.players.length > 0
              ? payload.fixture.players
              : [
                  ...(Array.isArray(payload.fixture?.squads?.home) ? payload.fixture.squads.home : []),
                  ...(Array.isArray(payload.fixture?.squads?.away) ? payload.fixture.squads.away : []),
                ];
          setSelectedPlayer(fixturePlayers[0] || null);
        }
      } catch (nextError) {
        if (isActive) {
          setError(nextError.message || "Fixture non disponibile.");
          setFixture(null);
          setSelectedPlayer(null);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadFixture();

    return () => {
      isActive = false;
    };
  }, [scheduleMatches.length, selectedFixtureId]);

  const featuredScheduleMatches = useMemo(
    () => sortMatchesByFeaturedPriority(scheduleMatches),
    [scheduleMatches]
  );

  useEffect(() => {
    if (!featuredScheduleMatches.length) {
      return;
    }

    const hasActiveMatch = featuredScheduleMatches.some((match) => {
      const fixtureId = match.sportEventId || match.id;
      return fixtureId === selectedFixtureId;
    });

    if (!selectedFixtureId || !hasActiveMatch) {
      const nextMatch = featuredScheduleMatches[0];
      setSelectedFixtureId(nextMatch?.sportEventId || nextMatch?.id || "");
    }
  }, [featuredScheduleMatches, selectedFixtureId]);

  const sortedPlayers = useMemo(() => {
    const players =
      Array.isArray(fixture?.players) && fixture.players.length > 0
        ? [...fixture.players]
        : [...homeSquad, ...awaySquad];

    return players.sort((left, right) => {
      if (sortBy === "xg") return (right.xg || 0) - (left.xg || 0);
      if (sortBy === "shots") return (right.shots || 0) - (left.shots || 0);
      if (sortBy === "form") return String(left.form || "").localeCompare(String(right.form || ""));
      return 0;
    });
  }, [fixture?.players, sortBy]);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          title="ANALISI STATISTICA"
          accentWord="STATISTICA"
          subtitle="Lineup, player profiles e metadata reali del feed corrente."
          icon={BarChart3}
        />

        <div className="mb-6 space-y-3">
          <DataStatusChips
            provider={fixture?.provider || scheduleMeta?.provider}
            source={fixture?.source || scheduleMeta?.source}
            freshness={fixture?.freshness || scheduleMeta?.freshness}
            competition={fixture?.competition}
            predictionProvider={fixture?.prediction_provider}
            oddsProvider={fixture?.odds_provider}
            lineupStatus={fixture?.lineup_status}
            notice={scheduleMeta?.notice}
          />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {featuredScheduleMatches.slice(0, 8).map((match) => {
              const fixtureId = match.sportEventId || match.id;
              const isActive = fixtureId === selectedFixtureId;

              return (
                <button
                  key={match.id}
                  onClick={() => setSelectedFixtureId(fixtureId)}
                  className={`flex-shrink-0 rounded-xl border px-3 py-2 text-left transition-all ${
                    isActive
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border/30 bg-secondary/20 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="text-xs font-semibold">{match.home} vs {match.away}</div>
                  <div className="text-[11px] opacity-80">{match.league} · {match.time}</div>
                </button>
              );
            })}
          </div>
          {loading && (
            <span className="inline-flex px-2 py-1 rounded-full bg-secondary/50 text-muted-foreground border border-border/30 text-xs">
              Caricamento fixture...
            </span>
          )}
          {error && (
            <span className="inline-flex px-2 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20 text-xs">
              {error}
            </span>
          )}
        </div>

        <Tabs defaultValue="formazioni" className="w-full">
          <TabsList className="glass mb-6 h-11 flex-wrap h-auto">
            <TabsTrigger
              value="formazioni"
              className="text-xs font-semibold data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              Formazioni
            </TabsTrigger>
            <TabsTrigger
              value="player"
              className="text-xs font-semibold data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              Player Stats
            </TabsTrigger>
            <TabsTrigger
              value="coverage"
              className="text-xs font-semibold data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              Coverage
            </TabsTrigger>
          </TabsList>

          <TabsContent value="formazioni">
            <div className="grid lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 space-y-4">
                <FormationPitch
                  homeLineup={fixture?.lineups?.home || { formation: "--", players: [] }}
                  awayTeam={fixture?.away || "Away"}
                  homeTeam={fixture?.home || "Home"}
                  onPlayerClick={(player) => {
                    const found =
                      sortedPlayers.find(
                        (candidate) =>
                          candidate.id === player.id || candidate.name === player.name
                      ) || null;
                    setSelectedPlayer(found);
                  }}
                />
                <GlassCard className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-accent" />
                  <div>
                    <span className="text-xs text-muted-foreground">Lineup status: </span>
                    <span className="text-sm font-bold text-accent">
                      {fixture?.lineup_status || "unknown"}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/60 border border-border/30 text-muted-foreground ml-auto">
                    Provider-driven
                  </span>
                </GlassCard>
                {!fixture?.lineups?.home?.players?.length && (homeSquad.length > 0 || awaySquad.length > 0) && (
                  <GlassCard>
                    <h3 className="font-semibold text-sm text-foreground mb-3">Rose disponibili</h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-primary">{fixture?.home || "Home"}</div>
                        {homeSquad.slice(0, 11).map((player) => (
                          <div key={player.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-secondary/30">
                            <span className="text-foreground">{player.name}</span>
                            <span className="text-muted-foreground">
                              #{player.number || "--"} · {player.position}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-primary">{fixture?.away || "Away"}</div>
                        {awaySquad.slice(0, 11).map((player) => (
                          <div key={player.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-secondary/30">
                            <span className="text-foreground">{player.name}</span>
                            <span className="text-muted-foreground">
                              #{player.number || "--"} · {player.position}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </GlassCard>
                )}
              </div>
              <div className="lg:col-span-2">
                <PlayerCard
                  player={selectedPlayer}
                  expanded
                  oddsAvailable={fixture?.odds_provider !== "not_available_with_current_feed"}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="player">
            <div className="grid lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3">
                <GlassCard>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-sm text-foreground">Giocatori disponibili</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Ordina:</span>
                      <select
                        value={sortBy}
                        onChange={(event) => setSortBy(event.target.value)}
                        className="bg-secondary/60 border border-border/50 rounded-lg px-2 py-1 text-xs text-foreground outline-none"
                      >
                        <option value="xg">xG</option>
                        <option value="shots">Tiri</option>
                        <option value="form">Forma</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {sortedPlayers.map((player) => (
                      <div
                        key={player.id}
                        onClick={() => setSelectedPlayer(player)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedPlayer(player);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer ${
                          selectedPlayer?.id === player.id
                            ? "bg-primary/10 border border-primary/20"
                            : "bg-secondary/30 hover:bg-secondary/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-secondary/80 border border-border/50 flex items-center justify-center text-xs font-bold text-primary">
                              {player.number}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-foreground">{player.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {player.team} · {player.position || player.pos}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-muted-foreground">
                              xG: <span className="text-primary font-bold">{player.xg}</span>
                            </span>
                            <span className="text-muted-foreground">
                              Tiri: <span className="text-foreground font-bold">{player.shots}</span>
                            </span>
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleFavoritePlayer(player.name);
                              }}
                              className="p-1"
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${
                                  favorites.players.includes(player.name)
                                    ? "fill-accent text-accent"
                                    : "text-muted-foreground"
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!sortedPlayers.length && (
                      <p className="text-xs text-muted-foreground">
                        Nessun player profile disponibile per questa fixture.
                      </p>
                    )}
                  </div>
                </GlassCard>
              </div>
              <div className="lg:col-span-2">
                <PlayerCard
                  player={selectedPlayer}
                  expanded
                  oddsAvailable={fixture?.odds_provider !== "not_available_with_current_feed"}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="coverage">
            <GlassCard>
              <h3 className="font-semibold text-sm text-foreground mb-3">Stato copertura</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                Questo percorso analytics usa Sportmonks per lineup, squads, coach, referee,
                venue, standings e metadata di fixture. Predictions provider-driven, xG provider
                e live odds bookmaker dipendono invece dal piano Sportmonks attivo e oggi non
                risultano esposti nel feed corrente.
              </p>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-secondary/30">
                  <div className="text-xs text-muted-foreground mb-1">Provider attivo</div>
                  <div className="text-sm font-semibold text-foreground">
                    {fixture?.provider || scheduleMeta?.provider || "sportmonks"}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30">
                  <div className="text-xs text-muted-foreground mb-1">Lineup status</div>
                  <div className="text-sm font-semibold text-foreground">
                    {fixture?.lineup_status || "unknown"}
                  </div>
                </div>
              </div>
              <div className="grid lg:grid-cols-2 gap-4 mt-4">
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-primary">Coaches e referees</div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <div className="text-xs text-muted-foreground mb-1">{fixture?.home || "Home"} coach</div>
                    <div className="text-sm font-semibold text-foreground">
                      {homeCoaches[0]?.name || "Non disponibile"}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <div className="text-xs text-muted-foreground mb-1">{fixture?.away || "Away"} coach</div>
                    <div className="text-sm font-semibold text-foreground">
                      {awayCoaches[0]?.name || "Non disponibile"}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <div className="text-xs text-muted-foreground mb-1">Referee assegnati</div>
                    <div className="text-sm font-semibold text-foreground">
                      {referees.length > 0
                        ? referees.map((referee) => referee.name).join(", ")
                        : "Non disponibili"}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-primary mb-3">Standings stagione</div>
                  {standingsRows.length > 0 ? (
                    <div className="space-y-2">
                      {standingsRows.slice(0, 6).map((row) => (
                        <div
                          key={row.id}
                          className={`grid grid-cols-[28px_1fr_42px_48px] gap-2 items-center p-2.5 rounded-lg ${
                            row.highlighted ? "bg-primary/10 border border-primary/20" : "bg-secondary/30"
                          }`}
                        >
                          <span className="text-xs font-bold text-muted-foreground">{row.position}</span>
                          <span className="text-xs font-semibold text-foreground truncate">{row.team}</span>
                          <span className="text-xs text-center text-muted-foreground">{row.played}</span>
                          <span className="text-xs text-right font-bold text-primary">{row.points} pt</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Standings non disponibili nel feed corrente.
                    </p>
                  )}
                </div>
              </div>
            </GlassCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
