"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router-compat";
import { ChevronRight, Star, Trash2, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GlassCard from "@/components/shared/GlassCard";
import { useApp } from "@/lib/AppContext";
import { getScheduleWindow } from "@/api/football";

function buildFallbackMatch(id) {
  return {
    id: String(id),
    home: "Fixture salvata",
    away: "non in finestra corrente",
    league: "Sportmonks feed",
    date: "--",
    time: "--:--",
  };
}

export default function Favorites() {
  const { favorites, toggleFavoriteMatch, toggleFavoritePlayer } = useApp();
  const [feedMatches, setFeedMatches] = useState([]);

  useEffect(() => {
    let isActive = true;

    getScheduleWindow(14)
      .then((payload) => {
        if (isActive) {
          setFeedMatches(Array.isArray(payload?.matches) ? payload.matches : []);
        }
      })
      .catch(() => {
        if (isActive) {
          setFeedMatches([]);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const matchMap = useMemo(
    () => new Map(feedMatches.map((match) => [String(match.id), match])),
    [feedMatches]
  );

  const favoriteMatches = useMemo(
    () =>
      favorites.matches.map(
        (id) => matchMap.get(String(id)) || buildFallbackMatch(id)
      ),
    [favorites.matches, matchMap]
  );

  const favoritePlayers = useMemo(
    () =>
      favorites.players.map((playerName, index) => ({
        id: `${playerName}:${index}`,
        name: playerName,
        team: "Provider feed",
        pos: "N/D",
        number: "--",
      })),
    [favorites.players]
  );

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Star className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="font-orbitron font-bold text-xl text-foreground">
              PREFERITI
            </h1>
            <p className="text-xs text-muted-foreground">
              Match e giocatori salvati per ritrovarli velocemente. I preferiti non
              attivano notifiche.
            </p>
          </div>
        </div>

        <Tabs defaultValue="match">
          <TabsList className="glass mb-5 h-10 w-full justify-start">
            <TabsTrigger value="match" className="text-xs">
              Match ({favoriteMatches.length})
            </TabsTrigger>
            <TabsTrigger value="giocatori" className="text-xs">
              Giocatori ({favoritePlayers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="match">
            <GlassCard>
              {favoriteMatches.length === 0 ? (
                <div className="text-center py-10">
                  <Star className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Nessun match nei preferiti. Usa la stellina dalle card match.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {favoriteMatches.map((match) => (
                    <div
                      key={`favorite-match-${match.id}`}
                      className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-all"
                    >
                      <div>
                        <div className="font-semibold text-sm text-foreground">
                          {match.home} vs {match.away}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {match.league} - {match.date} {match.time}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link to={`/match/${match.id}`}>
                          <button className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all">
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </Link>
                        <button
                          onClick={() => toggleFavoriteMatch(match.id)}
                          className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </TabsContent>

          <TabsContent value="giocatori">
            <GlassCard>
              {favoritePlayers.length === 0 ? (
                <div className="text-center py-10">
                  <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Nessun giocatore nei preferiti. Usa il pulsante salva dalla
                    scheda giocatore.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {favoritePlayers.map((player) => (
                    <div
                      key={`favorite-player-${player.id}`}
                      className="flex items-center justify-between p-3 rounded-xl bg-secondary/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary/80 border border-border/50 flex items-center justify-center text-xs font-bold text-primary">
                          {player.number}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-foreground">
                            {player.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {player.team} - {player.pos}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleFavoritePlayer(player.name)}
                        className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
