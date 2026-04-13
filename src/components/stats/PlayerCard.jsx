import React from "react";
import { ChevronRight, Star } from "lucide-react";
import GlassCard from "../shared/GlassCard";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/AppContext";

export default function PlayerCard({ player, expanded = false }) {
  const { favorites, toggleFavoritePlayer } = useApp();
  if (!player) return null;
  const isFav = favorites.players.includes(player.name);

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-secondary/80 border border-border/50 flex items-center justify-center text-lg font-black text-primary">
            {player.number}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{player.name}</h3>
            <p className="text-xs text-muted-foreground">{player.team} · {player.position || player.pos}</p>
          </div>
        </div>
        <button onClick={() => toggleFavoritePlayer(player.name)}
          className={`p-2 rounded-lg transition-all ${isFav ? "bg-accent/10 text-accent border border-accent/20" : "bg-secondary/50 text-muted-foreground hover:text-foreground"}`}>
          <Star className={`w-3.5 h-3.5 ${isFav ? "fill-accent" : ""}`} />
        </button>
      </div>

      {/* Form last 5 */}
      {player.formHistory && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-muted-foreground">Ultimi 5:</span>
          {player.formHistory.map((g, i) => (
            <span key={i} className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center ${g > 0 ? "bg-primary/20 text-primary" : "bg-secondary/60 text-muted-foreground"}`}>
              {g > 0 ? g : "-"}
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2.5 rounded-lg bg-secondary/40">
          <div className="text-xs text-muted-foreground mb-0.5">xG</div>
          <div className="font-bold text-lg text-primary">{player.xg}</div>
        </div>
        <div className="text-center p-2.5 rounded-lg bg-secondary/40">
          <div className="text-xs text-muted-foreground mb-0.5">Tiri</div>
          <div className="font-bold text-lg text-foreground">{player.shots}</div>
        </div>
        <div className="text-center p-2.5 rounded-lg bg-secondary/40">
          <div className="text-xs text-muted-foreground mb-0.5">Forma</div>
          <div className={`font-bold text-xs ${player.form === "Eccellente" ? "text-primary" : player.form === "Ottima" ? "text-accent" : "text-foreground"}`}>
            {player.form}
          </div>
        </div>
      </div>

      {expanded && (
        <>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="p-2.5 rounded-lg bg-secondary/40">
              <div className="text-xs text-muted-foreground mb-0.5">Gol stagione</div>
              <div className="font-bold text-foreground">{player.goals}</div>
            </div>
            <div className="p-2.5 rounded-lg bg-secondary/40">
              <div className="text-xs text-muted-foreground mb-0.5">Assist</div>
              <div className="font-bold text-foreground">{player.assists}</div>
            </div>
            <div className="p-2.5 rounded-lg bg-secondary/40">
              <div className="text-xs text-muted-foreground mb-0.5">Falli / match</div>
              <div className="font-bold text-foreground">{player.fouls}</div>
            </div>
            <div className="p-2.5 rounded-lg bg-secondary/40">
              <div className="text-xs text-muted-foreground mb-0.5">Min / match</div>
              <div className="font-bold text-foreground">{player.minutes}</div>
            </div>
          </div>
          {player.insight && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 mb-4">
              <div className="text-xs text-muted-foreground mb-1">Insight</div>
              <p className="text-xs text-foreground leading-relaxed">{player.insight}</p>
            </div>
          )}
        </>
      )}

      {/* Scorer odds */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10 mb-4">
        <div>
          <div className="text-xs text-muted-foreground">Quota marcatore</div>
          <div className="font-bold text-foreground">{player.scorerOdds}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Probabilità</div>
          <div className="font-bold text-primary">{player.scorerProb}%</div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button className="flex-1 bg-primary text-primary-foreground font-bold text-xs glow-green-sm hover:bg-primary/90 h-9">
          SCOMMETTI ORA <ChevronRight className="w-3 h-3 ml-1" />
        </Button>
        <button onClick={() => toggleFavoritePlayer(player.name)}
          className={`px-3 h-9 rounded-lg border text-xs font-semibold transition-all ${isFav ? "bg-accent/10 border-accent/20 text-accent" : "border-border/50 text-muted-foreground hover:text-foreground"}`}>
          {isFav ? "✓ Seguito" : "Segui"}
        </button>
      </div>
    </GlassCard>
  );
}