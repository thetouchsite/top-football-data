import React from "react";
import { TrendingUp } from "lucide-react";

export default function ValueBetBadge({ type, edge }) {
  if (!type) return null;
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 glow-green-sm">
      <TrendingUp className="w-3 h-3 text-primary" />
      <span className="text-xs font-bold text-primary">VALUE BET</span>
      <span className="text-xs font-semibold text-primary">+{edge}%</span>
    </div>
  );
}