import React, { useState } from "react";
import { BarChart3, Clock, Star } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SectionHeader from "@/components/shared/SectionHeader";
import FormationPitch from "@/components/stats/FormationPitch";
import PlayerCard from "@/components/stats/PlayerCard";
import TeamMomentum from "@/components/stats/TeamMomentum";
import MatchStatsPanel from "@/components/stats/MatchStatsPanel";
import GlassCard from "@/components/shared/GlassCard";
import { INTER_LINEUP, PLAYERS } from "@/lib/mockData";
import { useApp } from "@/lib/AppContext";

export default function AnalisiStatistica() {
  const [selectedPlayer, setSelectedPlayer] = useState(PLAYERS[0]);
  const [sortBy, setSortBy] = useState("xg");
  const { favorites, toggleFavoritePlayer } = useApp();

  const sortedPlayers = [...PLAYERS].sort((a, b) => {
    if (sortBy === "xg") return b.xg - a.xg;
    if (sortBy === "shots") return b.shots - a.shots;
    if (sortBy === "form") return a.form.localeCompare(b.form);
    return 0;
  });

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <SectionHeader title="ANALISI STATISTICA" accentWord="STATISTICA" subtitle="Incrocio dati storici, formazioni e situazioni attuali di ogni match" icon={BarChart3} />

        <Tabs defaultValue="formazioni" className="w-full">
          <TabsList className="glass mb-6 h-11 flex-wrap h-auto">
            {[
              { value: "formazioni", label: "Probabili Formazioni" },
              { value: "player", label: "Player Stats" },
              { value: "momentum", label: "Team Momentum" },
            ].map((t) => (
              <TabsTrigger key={t.value} value={t.value}
                className="text-xs font-semibold data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Formazioni */}
          <TabsContent value="formazioni">
            <div className="grid lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 space-y-4">
                <FormationPitch
                  homeLineup={INTER_LINEUP}
                  awayTeam="Milan" homeTeam="Inter"
                  onPlayerClick={(p) => {
                    const found = PLAYERS.find((x) => x.name.toLowerCase().includes(p.name.toLowerCase().split(" ")[0]));
                    if (found) setSelectedPlayer(found);
                  }}
                />
                {/* Countdown mock */}
                <GlassCard className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-accent" />
                  <div>
                    <span className="text-xs text-muted-foreground">Formazioni ufficiali in: </span>
                    <span className="text-sm font-bold text-accent">2h 15min</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent ml-auto">STIMA</span>
                </GlassCard>
              </div>
              <div className="lg:col-span-2 space-y-4">
                <MatchStatsPanel />
                <PlayerCard player={selectedPlayer} expanded />
              </div>
            </div>
          </TabsContent>

          {/* Player Stats */}
          <TabsContent value="player">
            <div className="grid lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3">
                <GlassCard>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-sm text-foreground">Tutti i giocatori</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Ordina:</span>
                      <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                        className="bg-secondary/60 border border-border/50 rounded-lg px-2 py-1 text-xs text-foreground outline-none">
                        <option value="xg">xG</option>
                        <option value="shots">Tiri</option>
                        <option value="form">Forma</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {sortedPlayers.map((p) => (
                      <button key={p.id} onClick={() => setSelectedPlayer(p)}
                        className={`w-full text-left p-3 rounded-xl transition-all ${selectedPlayer?.id === p.id ? "bg-primary/10 border border-primary/20" : "bg-secondary/30 hover:bg-secondary/50"}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-secondary/80 border border-border/50 flex items-center justify-center text-xs font-bold text-primary">{p.number}</div>
                            <div>
                              <div className="text-sm font-semibold text-foreground">{p.name}</div>
                              <div className="text-xs text-muted-foreground">{p.team} · {p.pos}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-muted-foreground">xG: <span className="text-primary font-bold">{p.xg}</span></span>
                            <span className="text-muted-foreground">Tiri: <span className="text-foreground font-bold">{p.shots}</span></span>
                            <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                              p.form === "Eccellente" ? "bg-primary/10 text-primary" : p.form === "Ottima" ? "bg-accent/10 text-accent" : "bg-secondary/60 text-muted-foreground"
                            }`}>{p.form}</span>
                            <button onClick={(e) => { e.stopPropagation(); toggleFavoritePlayer(p.name); }}
                              className="p-1">
                              <Star className={`w-3.5 h-3.5 ${favorites.players.includes(p.name) ? "fill-accent text-accent" : "text-muted-foreground"}`} />
                            </button>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </GlassCard>
              </div>
              <div className="lg:col-span-2">
                {selectedPlayer && <PlayerCard player={selectedPlayer} expanded />}
              </div>
            </div>
          </TabsContent>

          {/* Momentum */}
          <TabsContent value="momentum">
            <TeamMomentum />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}