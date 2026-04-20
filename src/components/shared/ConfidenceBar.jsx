import React from "react";

function clampPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function getConfidenceLevel(pct) {
  if (pct >= 80) {
    return {
      barClass: "bg-gradient-to-r from-emerald-500 to-emerald-600",
      textClass: "text-emerald-700",
    };
  }

  if (pct >= 60) {
    return {
      barClass: "bg-gradient-to-r from-emerald-400 to-emerald-500",
      textClass: "text-emerald-600",
    };
  }

  return {
    barClass: "bg-gradient-to-r from-emerald-300 to-emerald-400",
    textClass: "text-emerald-500",
  };
}

export default function ConfidenceBar({ value, compact = false, className = "" }) {
  const pct = clampPercent(value);
  const level = getConfidenceLevel(pct);

  return (
    <div className={`min-w-0 ${className}`}>
      <div className={`mb-1 flex items-center justify-between ${compact ? "text-[10px]" : "text-xs"}`}>
        <span className="text-muted-foreground">Confidenza</span>
        <span className={`font-semibold tabular-nums ${level.textClass}`}>{pct}%</span>
      </div>
      <div className={`w-full overflow-hidden rounded-full bg-secondary/45 ${compact ? "h-1.5" : "h-2"}`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${level.barClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
