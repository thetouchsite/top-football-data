"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router-compat";
import { ChevronRight, Star, Trash2, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GlassCard from "@/components/shared/GlassCard";
import FootballMediaImage from "@/components/shared/FootballMediaImage";
import { useApp } from "@/lib/AppContext";
import { getScheduleWindow } from "@/api/football";

function buildFallbackMatch(id) {
  const empty = { imageUrl: null, thumbUrl: null };
  return {
    id: String(id),
    home: "Fixture salvata",
    away: "non in finestra corrente",
    league: "Sportmonks feed",
    date: "--",
    time: "--:--",
    home_media: empty,
    away_media: empty,
    league_media: empty,
  };
}

export default function Favorites() {
  const { favorites, toggleFavoriteMatch, toggleFavoritePlayer } = useApp();
  const [feedMatches, setFeedMatches] = useState([]);

  useEffect(() => {
    let isActive = true;

    getScheduleWindow(7, { requester: "Favorites" })
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
    <div className="app-page">
      <div className="app-content-narrow">
        <div className="mb-8 flex min-w-0 items-start gap-3 sm:items-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/10">
            <Star className="h-5 w-5 text-accent" />
          </div>
          <div className="min-w-0">
            <h1 className="font-orbitron text-xl font-bold text-foreground">
              PREFERITI
            </h1>
            <p className="text-pretty text-xs text-muted-foreground">
              Match e giocatori salvati per ritrovarli velocemente. I preferiti non
              attivano notifiche.
            </p>
          </div>
        </div>

        <Tabs defaultValue="match">
          <TabsList className="mb-5 flex h-auto min-h-10 w-full flex-wrap justify-start gap-1 p-1 glass">
            <TabsTrigger value="match" className="text-xs shrink-0">
              Match ({favoriteMatches.length})
            </TabsTrigger>
            <TabsTrigger value="giocatori" className="text-xs shrink-0">
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
                      className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-secondary/30 p-3 transition-all hover:bg-secondary/50"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <div className="flex shrink-0 items-center gap-1">
                          <FootballMediaImage
                            media={match.league_media}
                            fallbackLabel={match.league}
                            alt={match.league}
                            size="sm"
                            shape="square"
                          />
                          <FootballMediaImage
                            media={match.home_media}
                            fallbackLabel={match.homeShort || match.home}
                            alt={match.home}
                            size="sm"
                          />
                          <FootballMediaImage
                            media={match.away_media}
                            fallbackLabel={match.awayShort || match.away}
                            alt={match.away}
                            size="sm"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-foreground">
                            {match.home} vs {match.away}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {match.league} - {match.date} {match.time}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
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
                      className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-secondary/30 p-3"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="relative shrink-0">
                          <FootballMediaImage
                            media={player.media}
                            fallbackLabel={player.name}
                            alt={player.name}
                            size="sm"
                          />
                          {player.number && player.number !== "--" && (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-border/50 bg-secondary px-0.5 text-[9px] font-bold text-primary">
                              {player.number}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-foreground">
                            {player.name}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
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
