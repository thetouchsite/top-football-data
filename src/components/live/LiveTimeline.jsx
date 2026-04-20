import React from "react";
import GlassCard from "../shared/GlassCard";
import FootballMediaImage from "@/components/shared/FootballMediaImage";

const TYPE_CONFIG = {
  goal: { emoji: "⚽", color: "text-primary bg-primary/10 border-primary/20", label: "Gol" },
  yellow: { emoji: "🟨", color: "text-accent bg-accent/10 border-accent/20", label: "Ammonizione" },
  red: { emoji: "🟥", color: "text-destructive bg-destructive/10 border-destructive/20", label: "Espulsione" },
  substitution: { emoji: "🔄", color: "text-blue-400 bg-blue-400/10 border-blue-400/20", label: "Sostituzione" },
  dangerous: { emoji: "⚡", color: "text-orange-400 bg-orange-400/10 border-orange-400/20", label: "Occasione" },
};

export default function LiveTimeline({ events, home, away, homeMedia, awayMedia }) {
  return (
    <GlassCard>
      <h3 className="font-semibold text-sm text-foreground mb-4">Timeline eventi</h3>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {[...events].reverse().map((e, i) => {
          const cfg = TYPE_CONFIG[e.type] || TYPE_CONFIG.dangerous;
          const side = e.team === "home" ? "home" : "away";
          const teamLabel = side === "home" ? home : away;
          const teamMedia = side === "home" ? homeMedia : awayMedia;
          return (
            <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg border ${cfg.color}`}>
              <span className="font-orbitron text-xs font-bold w-8 flex-shrink-0">{e.minute}'</span>
              <span className="text-base">{cfg.emoji}</span>
              <FootballMediaImage
                media={teamMedia}
                fallbackLabel={teamLabel}
                alt={teamLabel}
                size="xs"
              />
              <div className="min-w-0">
                <div className="text-xs font-semibold">{cfg.label}</div>
                <div className="truncate text-xs opacity-80">{e.player && `${e.player} · `}{teamLabel}</div>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}