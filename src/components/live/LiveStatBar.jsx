import React from "react";

export default function LiveStatBar({ label, home, away }) {
  const total = home + away || 1;
  const homePercent = (home / total) * 100;

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-foreground font-bold w-10 text-right">{home}</span>
        <span className="text-muted-foreground flex-1 text-center text-xs">{label}</span>
        <span className="text-foreground font-bold w-10">{away}</span>
      </div>
      <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-secondary/30">
        <div
          className="bg-primary/70 rounded-full transition-all duration-700"
          style={{ width: `${homePercent}%` }}
        />
        <div
          className="bg-destructive/50 rounded-full transition-all duration-700"
          style={{ width: `${100 - homePercent}%` }}
        />
      </div>
    </div>
  );
}