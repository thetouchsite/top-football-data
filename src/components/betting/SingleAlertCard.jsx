import React from "react";
import { ChevronRight, Send } from "lucide-react";

import GlassCard from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { buildMatchHref } from "@/lib/match-links";

function formatOdd(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return "--";
  }
  if (parsed % 1 === 0) {
    return String(parsed);
  }
  return parsed.toFixed(2);
}

export default function SingleAlertCard({ alert, isPremium }) {
  const href = buildMatchHref(alert.fixtureId);

  return (
    <GlassCard className="border-primary/10">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          Single
        </span>
        {alert.telegramSent && (
          <span className="rounded-full border border-border/40 bg-secondary/50 px-2 py-0.5 text-[10px] text-muted-foreground">
            <Send className="mr-1 inline h-2.5 w-2.5" />
            Inviata
          </span>
        )}
      </div>
      <div className="text-sm font-semibold text-foreground">
        {alert.home} vs {alert.away}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {alert.league} · {alert.market} / {alert.selection}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-md bg-secondary/25 px-2 py-2">
          <div className="text-[11px] text-muted-foreground">Confidenza</div>
          <div className="text-sm font-bold text-primary">{alert.confidence}%</div>
        </div>
        <div className="rounded-md bg-secondary/25 px-2 py-2">
          <div className="text-[11px] text-muted-foreground">Quota</div>
          <div className="text-sm font-bold text-foreground">{formatOdd(alert.bestOdd)}</div>
        </div>
        <div className="rounded-md bg-secondary/25 px-2 py-2">
          <div className="text-[11px] text-muted-foreground">Bookmaker</div>
          <div className="truncate text-sm font-semibold text-foreground">{alert.bestBookmaker}</div>
        </div>
        <div className="rounded-md bg-secondary/25 px-2 py-2">
          <div className="text-[11px] text-muted-foreground">Edge</div>
          <div className="text-sm font-bold text-primary">
            {alert.edge != null ? `+${formatOdd(alert.edge)}%` : "--"}
          </div>
        </div>
      </div>

      <div className="mt-3">
        <Button asChild className="h-9 w-full bg-primary text-xs font-bold text-primary-foreground">
          <a href={isPremium ? href : "/premium"}>
            {isPremium ? "Apri match" : "Sblocca Premium"}
            <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </GlassCard>
  );
}
