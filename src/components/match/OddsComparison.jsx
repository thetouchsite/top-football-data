import React from "react";
import { TrendingUp } from "lucide-react";
import GlassCard from "../shared/GlassCard";

export default function OddsComparison({ bookmakers }) {
  if (!bookmakers?.length) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-accent" />
          <h3 className="font-semibold text-sm text-foreground">Comparatore Quote</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Quote bookmaker non disponibili per questo match.
        </p>
      </GlassCard>
    );
  }

  const best1 = Math.max(...bookmakers.map((b) => b.home));
  const bestX = Math.max(...bookmakers.map((b) => b.draw));
  const best2 = Math.max(...bookmakers.map((b) => b.away));

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-accent" />
        <h3 className="font-semibold text-sm text-foreground">Comparatore Quote</h3>
      </div>
      <div className="-mx-1 max-w-full overflow-x-auto sm:mx-0">
        <div className="min-w-[280px] space-y-0 overflow-hidden rounded-xl border border-border/30">
          <div className="grid grid-cols-4 gap-0 border-b border-border/20 bg-secondary/40 p-2.5">
            <span className="text-xs font-semibold text-muted-foreground">Bookmaker</span>
            <span className="text-center text-xs font-semibold text-muted-foreground">1</span>
            <span className="text-center text-xs font-semibold text-muted-foreground">X</span>
            <span className="text-center text-xs font-semibold text-muted-foreground">2</span>
          </div>
          {bookmakers.map((bk, i) => (
            <div key={i} className={`grid grid-cols-4 gap-0 border-b border-border/10 p-2.5 transition-all last:border-0 hover:bg-secondary/20 ${bk.best ? "bg-primary/5" : ""}`}>
              <span className={`min-w-0 truncate text-xs font-bold ${bk.best ? "text-primary" : "text-foreground"}`}>{bk.name}</span>
              <span className={`text-center text-xs font-semibold ${bk.home === best1 ? "text-primary" : "text-foreground"}`}>{bk.home}</span>
              <span className={`text-center text-xs font-semibold ${bk.draw === bestX ? "text-primary" : "text-foreground"}`}>{bk.draw}</span>
              <span className={`text-center text-xs font-semibold ${bk.away === best2 ? "text-primary" : "text-foreground"}`}>{bk.away}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <div className="w-2 h-2 rounded-full bg-primary" />
        <span className="text-xs text-muted-foreground">Miglior quota evidenziata</span>
      </div>
    </GlassCard>
  );
}
