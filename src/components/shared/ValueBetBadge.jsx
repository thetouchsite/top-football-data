import React from "react";
import { TrendingUp } from "lucide-react";
import { getOddsDecimalForValueBet } from "@/lib/value-bet-display";

const VALUE_BET_TITLE =
  "Segnale euristico dal modello interno (non garanzia di valore sul mercato). Edge stimato rispetto alle probabilità del modello.";

/**
 * @param {object} [props]
 * @param {string} [props.type] - es. "1", "Over 2.5" (se omesso e c'è `match`, da match.valueBet)
 * @param {number} [props.edge]
 * @param {object} [props.match] - se presente, mostra mercato @ quota come in dashboard
 * @param {"default"|"compact"} [props.variant] - compact = una riga per liste dense
 */
export default function ValueBetBadge({ type, edge, match, variant = "default" }) {
  const vb = match?.valueBet;
  const t = type ?? vb?.type;
  const e = edge ?? vb?.edge;
  if (!t) {
    return null;
  }

  const oddsDecimal = match ? getOddsDecimalForValueBet(match) : null;
  const oddsStr =
    oddsDecimal != null && Number.isFinite(Number(oddsDecimal))
      ? String(oddsDecimal)
      : null;

  const marketLine = oddsStr ? `${t} @ ${oddsStr}` : t;
  const aria = oddsStr
    ? `Value bet modello: ${marketLine}, edge più ${e} percento`
    : `Value bet modello: esito ${t}, edge più ${e} percento`;

  if (variant === "compact") {
    return (
      <div
        role="status"
        title={VALUE_BET_TITLE}
        aria-label={aria}
        className="inline-flex max-w-full flex-wrap items-center gap-x-1 gap-y-0.5 rounded-md border border-primary/25 bg-primary/8 px-2 py-1 text-primary"
      >
        <TrendingUp className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-wide">Value bet</span>
        <span className="text-[10px] font-semibold text-primary/95">{marketLine}</span>
        <span className="text-[10px] font-semibold tabular-nums">+{e}%</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      title={VALUE_BET_TITLE}
      aria-label={aria}
      className="inline-flex max-w-full flex-col gap-1 rounded-md border border-primary/25 bg-primary/8 px-2.5 py-2 text-primary sm:min-w-[12rem]"
    >
      <div className="flex items-center gap-1.5">
        <TrendingUp className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-wide">Value bet</span>
        <span className="ml-auto text-[10px] font-bold tabular-nums">+{e}%</span>
      </div>
      <div className="pl-5 text-[11px] font-semibold leading-snug text-primary/95">{marketLine}</div>
    </div>
  );
}
