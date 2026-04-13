import React from "react";
import GlassCard from "../shared/GlassCard";

export default function MatchStatsPanel() {
  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div className="text-center flex-1">
          <div className="w-8 h-8 rounded-full bg-secondary/80 border border-border/50 flex items-center justify-center text-xs font-bold mx-auto mb-1">INT</div>
          <span className="text-xs font-medium text-foreground">Inter</span>
        </div>
        <div className="px-3">
          <div className="font-orbitron text-xl font-bold text-foreground">12 - 0</div>
          <div className="text-xs text-muted-foreground text-center">Confronto</div>
        </div>
        <div className="text-center flex-1">
          <div className="w-8 h-8 rounded-full bg-secondary/80 border border-border/50 flex items-center justify-center text-xs font-bold mx-auto mb-1">MIL</div>
          <span className="text-xs font-medium text-foreground">Milan</span>
        </div>
      </div>

      <div className="space-y-3">
        {[
          { label: "Tiri", home: 13.5, away: 11.2 },
          { label: "Tiri in porta", home: 5.1, away: 3.8 },
          { label: "Possesso %", home: 56, away: 44 },
          { label: "Corner", home: 5.8, away: 4.2 },
          { label: "Gol segnati", home: 2.1, away: 1.5 },
        ].map((stat, i) => (
          <div key={i}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-foreground font-semibold w-12 text-right">{stat.home}</span>
              <span className="text-muted-foreground flex-1 text-center">{stat.label}</span>
              <span className="text-foreground font-semibold w-12">{stat.away}</span>
            </div>
            <div className="flex gap-1 h-1.5">
              <div
                className="bg-primary/60 rounded-full"
                style={{ width: `${(stat.home / (stat.home + stat.away)) * 100}%` }}
              />
              <div
                className="bg-destructive/40 rounded-full"
                style={{ width: `${(stat.away / (stat.home + stat.away)) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}