import React from "react";
import GlassCard from "../shared/GlassCard";

export default function FormationPitch({ homeLineup, homeTeam, awayTeam: _awayTeam, onPlayerClick }) {
  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Probabili Formazioni</h3>
        <span className="text-xs text-muted-foreground">{homeLineup.formation}</span>
      </div>

      {/* Pitch */}
      <div className="relative w-full aspect-[3/4] max-h-[500px] rounded-xl overflow-hidden bg-gradient-to-b from-green-900/40 via-green-800/30 to-green-900/40 border border-green-700/20">
        {/* Pitch lines */}
        <div className="absolute inset-0">
          {/* Center line */}
          <div className="absolute left-0 right-0 top-1/2 border-t border-green-600/30" />
          {/* Center circle */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-green-600/30" />
          {/* Top box */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-16 border-b border-l border-r border-green-600/30" />
          {/* Bottom box */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-16 border-t border-l border-r border-green-600/30" />
        </div>

        {/* Players */}
        {homeLineup.players.map((player, i) => (
          <button
            key={i}
            onClick={() => onPlayerClick?.(player)}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 group z-10"
            style={{ left: `${player.x}%`, top: `${player.y}%` }}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all group-hover:scale-110 ${
              player.status === "confermato"
                ? "bg-blue-600/80 border-blue-400/60 text-white"
                : player.status === "probabile"
                ? "bg-yellow-600/80 border-yellow-400/60 text-white"
                : "bg-red-600/80 border-red-400/60 text-white"
            }`}>
              {player.number}
            </div>
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="text-xs font-medium text-white/90 bg-black/50 px-1.5 py-0.5 rounded">
                {player.name}
              </span>
            </div>
          </button>
        ))}

        {/* Team labels */}
        <div className="absolute top-2 left-2 text-xs font-bold text-white/80 bg-black/40 px-2 py-1 rounded">
          {homeTeam}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-600/80 border border-blue-400/60" />
          <span className="text-xs text-muted-foreground">Confermato</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-yellow-600/80 border border-yellow-400/60" />
          <span className="text-xs text-muted-foreground">Probabile</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-600/80 border border-red-400/60" />
          <span className="text-xs text-muted-foreground">In dubbio</span>
        </div>
      </div>
    </GlassCard>
  );
}
