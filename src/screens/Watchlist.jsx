"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router-compat";
import { Star, Trash2, ChevronRight, Users, Target } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import { useApp } from "@/lib/AppContext";
import { getScheduleWindow } from "@/api/football";

export default function Watchlist() {
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

  const favMatches = useMemo(() => {
    const matchMap = new Map(feedMatches.map((match) => [String(match.id), match]));

    return favorites.matches.map((id) => {
      const match = matchMap.get(String(id));

      if (match) {
        return match;
      }

      return {
        id: String(id),
        home: "Fixture salvata",
        away: "non in finestra corrente",
        league: "Sportmonks feed",
        date: "--",
        time: "--:--",
      };
    });
  }, [favorites.matches, feedMatches]);

  const favPlayers = useMemo(
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
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Star className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="font-orbitron font-bold text-xl text-foreground">WATCHLIST</h1>
            <p className="text-xs text-muted-foreground">I tuoi preferiti salvati</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Matches */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm text-foreground">Partite Salvate</h2>
              <span className="text-xs text-muted-foreground ml-1">({favMatches.length})</span>
            </div>
            {favMatches.length === 0 ? (
              <div className="text-center py-8">
                <Star className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Nessuna partita salvata. Clicca la stellina sulle match card.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {favMatches.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-all">
                    <div>
                      <div className="font-semibold text-sm text-foreground">{m.home} vs {m.away}</div>
                      <div className="text-xs text-muted-foreground">{m.league} · {m.date} {m.time}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link to={`/match/${m.id}`}>
                        <button className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all">
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </Link>
                      <button onClick={() => toggleFavoriteMatch(m.id)}
                        className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Players */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm text-foreground">Giocatori Seguiti</h2>
              <span className="text-xs text-muted-foreground ml-1">({favPlayers.length})</span>
            </div>
            {favPlayers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Nessun giocatore seguito. Clicca "Segui player" dalla scheda giocatore.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {favPlayers.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary/80 border border-border/50 flex items-center justify-center text-xs font-bold text-primary">{p.number}</div>
                      <div>
                        <div className="font-semibold text-sm text-foreground">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.team} · {p.pos}</div>
                      </div>
                    </div>
                    <button onClick={() => toggleFavoritePlayer(p.name)}
                      className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
