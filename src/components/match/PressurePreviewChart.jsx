import React from "react";
import { Activity } from "lucide-react";

/**
 * Grafico a barre orizzontali (scala 0–100) per la preview pressione pre-match.
 *
 * @param {{ bars?: Array<{ key: string; label: string; value: number }>; narrative?: string }} preview
 * @param {{ level: "alto" | "medio" | "basso"; reason?: string } | null} [props.supportInsight]
 * @param {boolean} [props.showHeader] - titolo e icona (default true)
 */
export default function PressurePreviewChart({ preview, showHeader = true, supportInsight = null }) {
  const bars = Array.isArray(preview?.bars) ? preview.bars : [];
  if (!bars.length) {
    return null;
  }

  return (
    <div>
      {showHeader ? (
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
            Pressione prevista
          </h3>
        </div>
      ) : null}
      <p className="mb-3 text-[11px] text-muted-foreground/90">
        Indice pre-match 0-100: piu alto = segnale piu forte.
      </p>
      {supportInsight?.level ? (
        <div className="mb-3 rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-2 text-xs">
          <span className="font-semibold text-primary">Supporto tattico alla Value Bet:</span>{" "}
          <span className="font-semibold text-foreground capitalize">{supportInsight.level}</span>
          {supportInsight.reason ? (
            <span className="text-muted-foreground"> · {supportInsight.reason}</span>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-3">
        {bars.map((bar) => {
          const pct = Math.min(100, Math.max(0, Number(bar.value) || 0));
          return (
            <div key={bar.key} className="grid grid-cols-1 gap-1.5 sm:grid-cols-[minmax(0,9.5rem)_1fr_auto] sm:items-center sm:gap-3">
              <span className="text-xs font-medium text-muted-foreground sm:pt-0.5" title={bar.label}>
                {bar.label}
              </span>
              <div
                className="relative h-3 w-full overflow-hidden rounded-full bg-secondary/50 ring-1 ring-border/30"
                role="img"
                aria-label={`${bar.label}: ${pct} su 100`}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary/85 to-primary transition-[width] duration-300 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-right text-xs font-mono tabular-nums font-semibold text-foreground sm:min-w-[2.75rem]">
                {Math.round(pct)}
                <span className="text-muted-foreground/80 font-normal">/100</span>
              </span>
            </div>
          );
        })}
      </div>

      {preview?.narrative ? (
        <p className="mt-4 border-t border-border/40 pt-3 text-xs leading-relaxed text-muted-foreground">
          {preview.narrative}
        </p>
      ) : null}
    </div>
  );
}
