import React from "react";
import { Link } from "@/lib/router-compat";
import { Clock, ChevronRight, Star } from "lucide-react";
import ValueBetBadge from "../shared/ValueBetBadge";
import GlassCard from "../shared/GlassCard";
import { useApp } from "@/lib/AppContext";

function ConfBar({ val, max = 100, color = "bg-primary" }) {
  return (
    <div className="h-1.5 bg-secondary/40 rounded-full overflow-hidden w-full">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${(val / max) * 100}%` }} />
    </div>
  );
}

export default function MatchCard({ match, compact = false }) {
  const { favorites, toggleFavoriteMatch } = useApp();
  const isFav = favorites.matches.includes(match.id);

  return (
    <GlassCard glow={!!match.valueBet} className="group relative">
      {/* Fav button */}
      <button
        type="button"
        aria-label={isFav ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
        onClick={(e) => { e.preventDefault(); toggleFavoriteMatch(match.id); }}
        className="absolute top-4 right-4 p-1 z-10 opacity-60 hover:opacity-100 transition-opacity rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <Star className={`w-3.5 h-3.5 ${isFav ? "fill-accent text-accent" : "text-muted-foreground"}`} />
      </button>

      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pr-8">
        <span className="text-xs font-semibold text-accent">{match.league}</span>
        <span className="text-muted-foreground/40">·</span>
        <Clock className="w-3 h-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{match.date} - {match.time}</span>
        {match.status === "today" && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold ml-auto">OGGI</span>
        )}
      </div>

      {/* Teams + probs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-secondary/80 border border-border/50 flex items-center justify-center text-xs font-bold">{match.homeShort}</div>
          <span className="font-semibold text-foreground text-sm">{match.home}</span>
        </div>
        <div className="text-center px-3">
          <div className="font-orbitron text-xs text-muted-foreground font-bold">VS</div>
          <div className="text-xs text-muted-foreground mt-0.5">xG {match.xg.home} - {match.xg.away}</div>
        </div>
        <div className="flex items-center gap-3 flex-1 justify-end">
          <span className="font-semibold text-foreground text-sm">{match.away}</span>
          <div className="w-10 h-10 rounded-full bg-secondary/80 border border-border/50 flex items-center justify-center text-xs font-bold">{match.awayShort}</div>
        </div>
      </div>

      {/* 1X2 */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: "1", prob: match.prob.home, odds: match.odds.home, isValue: match.valueBet?.type === "1" },
          { label: "X", prob: match.prob.draw, odds: match.odds.draw, isValue: false },
          { label: "2", prob: match.prob.away, odds: match.odds.away, isValue: match.valueBet?.type === "2" },
        ].map((o) => (
          <div key={o.label} className={`text-center p-2 rounded-lg transition-all ${o.isValue ? "bg-primary/10 border border-primary/30 glow-green-sm" : "bg-secondary/50"}`}>
            <div className="text-xs text-muted-foreground mb-0.5">{o.label}</div>
            <div className="font-bold text-sm text-foreground">{o.prob}%</div>
            <div className="text-xs text-accent font-semibold">{o.odds}</div>
            <ConfBar val={o.prob} color={o.isValue ? "bg-primary" : "bg-secondary"} />
          </div>
        ))}
      </div>

      {!compact && (
        <>
          {/* O/U + GG */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: "Over 2.5", val: match.ou.over25 },
              { label: "Under 2.5", val: match.ou.under25 },
              { label: match.valueBet?.market === "GG/NG" ? "Goal" : "GG/NG", val: match.gg.goal },
            ].map((o) => (
              <div key={o.label} className={`text-center p-2 rounded-lg bg-secondary/30 ${match.valueBet?.type === "Over 2.5" && o.label === "Over 2.5" ? "border border-primary/20" : ""}`}>
                <div className="text-xs text-muted-foreground mb-0.5">{o.label}</div>
                <div className="text-sm font-bold text-foreground">{o.val}</div>
              </div>
            ))}
          </div>

          {/* Value Bet + Confidence */}
          <div className="flex items-center justify-between mb-3">
            {match.valueBet ? <ValueBetBadge type={match.valueBet.type} edge={match.valueBet.edge} /> : <div />}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Confidenza:</span>
              <span className={`text-xs font-bold ${match.confidence >= 75 ? "text-primary" : "text-muted-foreground"}`}>{match.confidence}%</span>
            </div>
          </div>

          {match.odds_provider === "not_available_with_current_feed" && (
            <div className="mb-3 text-xs text-muted-foreground">
              Quote contestuali bookmaker non ancora disponibili con il feed corrente. Mostro quote derivate dal modello.
            </div>
          )}

          {/* Top scores */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-xs text-muted-foreground">Risultati:</span>
            {match.scores.map((s, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded bg-secondary/60 font-semibold text-foreground">
                {s.score} <span className="text-muted-foreground/70">({s.prob}%)</span>
              </span>
            ))}
          </div>

          {/* Badges */}
          {match.badges.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mb-4">
              {match.badges.map((b) => (
                <span key={b} className="text-xs px-2 py-0.5 rounded-full bg-secondary/50 border border-border/30 text-muted-foreground">{b}</span>
              ))}
            </div>
          )}
        </>
      )}

      {/* CTA */}
      <Link
        to={`/match/${encodeURIComponent(match.id)}`}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary font-semibold text-xs hover:bg-primary/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        ANALIZZA MATCH
        <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
      </Link>
    </GlassCard>
  );
}
