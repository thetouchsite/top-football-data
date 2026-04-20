import React from "react";
import { Link } from "@/lib/router-compat";
import { Clock, ChevronRight, Star } from "lucide-react";
import ValueBetBadge from "../shared/ValueBetBadge";
import GlassCard from "../shared/GlassCard";
import ConfidenceBar from "../shared/ConfidenceBar";
import FootballMediaImage from "../shared/FootballMediaImage";
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
  const isFav = favorites.matches.includes(String(match.id));

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
        <FootballMediaImage
          media={match.league_media}
          fallbackLabel={match.league}
          alt=""
          size="xs"
          shape="square"
          className="border-border/40"
        />
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
          <FootballMediaImage
            media={match.home_media}
            fallbackLabel={match.homeShort || match.home}
            alt=""
            size="md"
          />
          <span className="font-semibold text-foreground text-sm">{match.home}</span>
        </div>
        <div className="text-center px-3">
          <div className="font-orbitron text-xs text-muted-foreground font-bold">VS</div>
          <div className="text-xs text-muted-foreground mt-0.5">xG {match.xg.home} - {match.xg.away}</div>
        </div>
        <div className="flex items-center gap-3 flex-1 justify-end">
          <span className="font-semibold text-foreground text-sm">{match.away}</span>
          <FootballMediaImage
            media={match.away_media}
            fallbackLabel={match.awayShort || match.away}
            alt=""
            size="md"
          />
        </div>
      </div>

      {/* 1X2 */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: "1", prob: match.prob.home, odds: match.odds.home, isValue: match.valueBet?.type === "1" },
          { label: "X", prob: match.prob.draw, odds: match.odds.draw, isValue: false },
          { label: "2", prob: match.prob.away, odds: match.odds.away, isValue: match.valueBet?.type === "2" },
        ].map((o) => (
          <div key={o.label} className={`rounded-lg p-2 text-center transition-all ${o.isValue ? "border border-primary/25 bg-primary/10 ring-1 ring-primary/15" : "bg-secondary/50"}`}>
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
              {
                label: "Over 2.5",
                odd: match.ou.over25,
                prob: match.ouProb?.over25,
                highlight: match.valueBet?.type === "Over 2.5",
              },
              {
                label: "Under 2.5",
                odd: match.ou.under25,
                prob: match.ouProb?.under25,
                highlight: false,
              },
              {
                label: match.valueBet?.market === "GG/NG" ? "Goal" : "GG/NG",
                odd: match.gg.goal,
                prob: match.ggProb?.goal,
                highlight: match.valueBet?.type === "Goal",
              },
            ].map((o) => (
              <div
                key={o.label}
                className={`rounded-lg p-2 text-center ${
                  o.highlight ? "border border-primary/20 bg-primary/10 ring-1 ring-primary/15" : "bg-secondary/30"
                }`}
              >
                <div className="mb-0.5 text-xs text-muted-foreground">{o.label}</div>
                {typeof o.prob === "number" ? (
                  <>
                    <div className="text-sm font-bold text-foreground">{o.prob}%</div>
                    <div className="text-xs font-semibold text-accent">{o.odd}</div>
                    <ConfBar val={o.prob} color={o.highlight ? "bg-primary" : "bg-secondary"} />
                  </>
                ) : (
                  <div className="text-sm font-bold text-foreground">{o.odd}</div>
                )}
              </div>
            ))}
          </div>

          {/* Value Bet + Confidence */}
          <div className="mb-3 flex items-center justify-between gap-3">
            {match.valueBet ? <ValueBetBadge match={match} variant="compact" /> : <div />}
            <ConfidenceBar value={match.confidence} compact className="w-[130px] shrink-0" />
          </div>

          {match.valueBet && (
            <div className="mb-3 text-[11px] text-muted-foreground">
              {match.valueBetSource === "sportmonks_feed_math"
                ? "Value da confronto quota modello vs quote bookmaker."
                : "Value in fallback derivato (dati quote bookmaker incompleti)."}
            </div>
          )}

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
