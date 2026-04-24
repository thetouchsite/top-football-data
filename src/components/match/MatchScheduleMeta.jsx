"use client";

import React from "react";
import {
  formatCurrentScoreLine,
  getMatchListPhase,
  getMatchStateBadgeLabel,
} from "@/lib/football-match-list-meta";

/**
 * Badge compatto: In corso / Intervallo / Finita / Rinviata / Annullata.
 */
export function MatchStatusBadge({ match, className = "" }) {
  const phase = getMatchListPhase(match?.state?.shortName);
  const label = getMatchStateBadgeLabel(match?.state, phase);
  if (!label) {
    return null;
  }
  const tone =
    phase === "live"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : phase === "finished"
        ? "bg-secondary/70 text-muted-foreground border-border/40"
        : phase === "irregular"
          ? "bg-amber-500/12 text-amber-200 border-amber-500/25"
          : "bg-secondary/50 text-muted-foreground border-border/30";

  return (
    <span
      className={`inline-flex shrink-0 items-center text-[10px] px-1.5 py-0.5 rounded-full border font-semibold leading-none ${tone} ${className}`}
    >
      {label}
    </span>
  );
}

/**
 * Nella griglia match: punteggio reale in live/FT, altrimenti "VS".
 */
export function MatchCenterScoreOrVs({ match, scoreClassName = "text-sm", vsClassName = "text-xs" }) {
  const line = formatCurrentScoreLine(match?.currentScore);
  const phase = getMatchListPhase(match?.state?.shortName);
  if (line && (phase === "live" || phase === "finished")) {
    return (
      <div className={`font-orbitron font-black tabular-nums text-foreground ${scoreClassName}`}>
        {line}
      </div>
    );
  }
  return (
    <div className={`font-orbitron text-muted-foreground font-bold ${vsClassName}`}>
      VS
    </div>
  );
}

/**
 * Sottotitolo lista: in live/FT punteggio + lega, altrimenti lega · orario.
 */
export function MatchListSubtitle({ match, className = "" }) {
  const phase = getMatchListPhase(match?.state?.shortName);
  const line = formatCurrentScoreLine(match?.currentScore);
  const league = String(match?.league || "").trim();
  if (line && (phase === "live" || phase === "finished")) {
    return (
      <div className={`truncate text-[11px] opacity-90 ${className}`}>
        <span className="font-mono font-semibold tabular-nums text-foreground">{line}</span>
        {league ? <span className="text-muted-foreground"> · {league}</span> : null}
      </div>
    );
  }
  if (league && match?.time) {
    return (
      <div className={`truncate text-[11px] opacity-80 ${className}`}>
        {league} · {match.time}
      </div>
    );
  }
  if (league) {
    return <div className={`truncate text-[11px] opacity-80 ${className}`}>{league}</div>;
  }
  return match?.time ? (
    <div className={`text-[11px] opacity-80 ${className}`}>{match.time}</div>
  ) : null;
}
