"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/**
 * Provenance / chip feed in pannello collassabile: una riga riassuntiva, dettaglio espandibile.
 * Mantiene tutte le informazioni accessibili senza occupare la piega intera.
 */
export default function FeedMetaPanel({
  summary,
  label = "Stato feed dati",
  children,
  defaultOpen = false,
  className,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn(
        "border-b border-border/35 bg-transparent",
        className
      )}
    >
      <CollapsibleTrigger
        className="flex w-full items-start justify-between gap-3 py-3 text-left transition-colors hover:bg-muted/20 sm:items-center sm:py-2.5"
        type="button"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            {label}
          </span>
          <span className="truncate text-xs font-normal leading-snug text-muted-foreground">
            {summary}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform duration-200 sm:mt-0",
            open && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-3 pb-4 pt-0 sm:pb-5">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
