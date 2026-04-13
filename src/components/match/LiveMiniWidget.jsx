import React from "react";
import { Radio, Circle } from "lucide-react";

export default function LiveMiniWidget({ match }) {
  if (!match) return null;
  const recentEvents = Array.isArray(match.events)
    ? [...match.events].slice(-3).reverse()
    : [];

  return (
    <div className="glass rounded-xl p-4 border-primary/20">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Radio className="w-3.5 h-3.5 text-destructive animate-pulse" />
        <span className="text-xs font-semibold text-destructive uppercase tracking-wider">Live</span>
      </div>

      {/* Score */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-center flex-1">
          <div className="w-8 h-8 rounded-full bg-secondary/80 border border-border/50 flex items-center justify-center text-xs font-bold mx-auto mb-1">
            {match.home.substring(0, 3).toUpperCase()}
          </div>
          <span className="text-xs font-medium text-foreground">{match.home}</span>
        </div>
        <div className="px-4 text-center">
          <div className="font-orbitron text-2xl font-bold text-foreground">
            {match.homeScore} - {match.awayScore}
          </div>
          <div className="flex items-center gap-1 justify-center mt-1">
            <Circle className="w-2 h-2 fill-primary text-primary" />
            <span className="text-xs text-primary font-semibold">{match.minute}'</span>
          </div>
        </div>
        <div className="text-center flex-1">
          <div className="w-8 h-8 rounded-full bg-secondary/80 border border-border/50 flex items-center justify-center text-xs font-bold mx-auto mb-1">
            {match.away.substring(0, 3).toUpperCase()}
          </div>
          <span className="text-xs font-medium text-foreground">{match.away}</span>
        </div>
      </div>

      {/* Mini pitch */}
      <div className="relative w-full h-32 rounded-lg bg-green-900/30 border border-green-700/30 mb-3 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border border-green-600/40" />
        </div>
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-16 border-r border-t border-b border-green-600/40 rounded-r" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-16 border-l border-t border-b border-green-600/40 rounded-l" />
        <div className="absolute top-0 bottom-0 left-1/2 border-l border-green-600/40" />
        {/* Ball indicator */}
        <div className="absolute top-1/3 left-1/3 w-3 h-3 rounded-full bg-primary/80 animate-pulse-glow" />
      </div>

      {/* Events */}
      <div className="space-y-1.5">
        {recentEvents.length > 0 ? (
          recentEvents.map((event) => (
            <div key={event.id} className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground w-8">{event.minute}'</span>
              <span className="text-foreground">
                {event.typeLabel}
                {event.player ? ` - ${event.player}` : ""}
              </span>
            </div>
          ))
        ) : (
          <div className="text-xs text-muted-foreground">
            Nessun evento live disponibile nel feed corrente.
          </div>
        )}
      </div>
    </div>
  );
}
