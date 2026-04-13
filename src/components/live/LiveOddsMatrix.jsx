import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import GlassCard from "../shared/GlassCard";

export default function LiveOddsMatrix({ odds }) {
  const markets = [
    { label: "OVER 2.5", value: odds.over25, trend: "up" },
    { label: "GOAL", value: odds.goal, trend: "up" },
    { label: "1 (Home)", value: odds.homeWin, trend: "down" },
    { label: "X (Draw)", value: odds.draw, trend: "up" },
    { label: "2 (Away)", value: odds.awayWin, trend: "up" },
  ];

  return (
    <GlassCard>
      <h3 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wide">Live Odds Matrix</h3>
      <div className="space-y-2">
        {markets.map((m, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <span className="text-xs font-medium text-muted-foreground">{m.label}</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">{m.value}</span>
              {m.trend === "up" ? (
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-destructive" />
              )}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}