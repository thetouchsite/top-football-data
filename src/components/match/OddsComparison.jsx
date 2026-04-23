import React from "react";
import { TrendingUp } from "lucide-react";
import GlassCard from "../shared/GlassCard";

const CTA_LABEL = process.env.NEXT_PUBLIC_ODDS_CTA_LABEL || "Apri quota";
const REFERENCE_BOOKMAKERS = String(process.env.NEXT_PUBLIC_ODDS_REFERENCE_BOOKMAKERS || "")
  .split(",")
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);
const AFFILIATE_BASE_URL = String(process.env.NEXT_PUBLIC_AFFILIATE_BASE_URL || "").trim();

function safeOdd(value) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function bookmakerPeak(entry) {
  return Math.max(safeOdd(entry?.home), safeOdd(entry?.draw), safeOdd(entry?.away));
}

function getBookmakerSlug(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildAffiliateUrl(bookmakerName) {
  if (!AFFILIATE_BASE_URL) {
    return null;
  }
  const url = new URL(AFFILIATE_BASE_URL);
  url.searchParams.set("bookmaker", getBookmakerSlug(bookmakerName));
  return url.toString();
}

function getDisplayedRows(bookmakers = []) {
  const valid = bookmakers.filter((entry) => bookmakerPeak(entry) > 0);
  if (!valid.length) {
    return [];
  }

  const top = [...valid].sort((left, right) => bookmakerPeak(right) - bookmakerPeak(left))[0];
  const remaining = valid.filter((entry) => entry.name !== top.name);
  const byReference = remaining.filter((entry) =>
    REFERENCE_BOOKMAKERS.includes(String(entry.name || "").trim().toLowerCase())
  );
  const fallback = remaining
    .filter((entry) => !byReference.some((ref) => ref.name === entry.name))
    .sort((left, right) => bookmakerPeak(right) - bookmakerPeak(left));

  return [top, ...byReference, ...fallback].slice(0, 4).map((entry, index) => ({
    ...entry,
    topValue: index === 0,
  }));
}

function computeValuePercent(modelOdd, bookOdd) {
  const model = Number(modelOdd);
  const book = Number(bookOdd);
  if (!Number.isFinite(model) || model <= 0 || !Number.isFinite(book) || book <= 0) {
    return null;
  }
  return Number((((book - model) / model) * 100).toFixed(1));
}

function pickRowBestValue(row, valueMarkets) {
  if (!row || !valueMarkets?.modelOdds) {
    return null;
  }
  const outcomes = [
    {
      key: "home",
      label: "1",
      edge: computeValuePercent(valueMarkets.modelOdds.home, safeOdd(row.home)),
    },
    {
      key: "draw",
      label: "X",
      edge: computeValuePercent(valueMarkets.modelOdds.draw, safeOdd(row.draw)),
    },
    {
      key: "away",
      label: "2",
      edge: computeValuePercent(valueMarkets.modelOdds.away, safeOdd(row.away)),
    },
  ]
    .filter((entry) => Number.isFinite(entry.edge))
    .sort((left, right) => right.edge - left.edge);

  const bestPositive = outcomes.find((entry) => entry.edge > 0);
  return bestPositive ? { outcome: bestPositive.label, valuePct: bestPositive.edge } : null;
}

export default function OddsComparison({ bookmakers, valueMarkets }) {
  if (!bookmakers?.length) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-accent" />
          <h3 className="font-semibold text-sm text-foreground">Comparatore Quote</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Quote bookmaker non disponibili per questo match.
        </p>
      </GlassCard>
    );
  }

  const displayedRows = getDisplayedRows(bookmakers);
  if (!displayedRows.length) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-accent" />
          <h3 className="font-semibold text-sm text-foreground">Comparatore Quote</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Quote bookmaker non disponibili per questo match.
        </p>
      </GlassCard>
    );
  }

  const best1 = Math.max(...displayedRows.map((b) => safeOdd(b.home)));
  const bestX = Math.max(...displayedRows.map((b) => safeOdd(b.draw)));
  const best2 = Math.max(...displayedRows.map((b) => safeOdd(b.away)));

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-accent" />
        <h3 className="font-semibold text-sm text-foreground">Comparatore Quote</h3>
      </div>
      <div className="-mx-1 max-w-full overflow-x-auto sm:mx-0">
        <div className="min-w-[320px] space-y-0 overflow-hidden rounded-xl border border-border/30">
          <div className="grid grid-cols-6 gap-0 border-b border-border/20 bg-secondary/40 p-2.5">
            <span className="text-xs font-semibold text-muted-foreground">Bookmaker</span>
            <span className="text-center text-xs font-semibold text-muted-foreground">1</span>
            <span className="text-center text-xs font-semibold text-muted-foreground">X</span>
            <span className="text-center text-xs font-semibold text-muted-foreground">2</span>
            <span className="text-center text-xs font-semibold text-muted-foreground">Valore</span>
            <span className="text-right text-xs font-semibold text-muted-foreground">CTA</span>
          </div>
          {displayedRows.map((bk, i) => {
            const rowValue = pickRowBestValue(bk, valueMarkets);
            const ctaUrl = buildAffiliateUrl(bk.name);
            return (
            <div
              key={i}
              className={`grid grid-cols-6 gap-0 border-b border-border/10 p-2.5 transition-all last:border-0 hover:bg-secondary/20 ${
                bk.topValue ? "bg-primary/10 ring-1 ring-primary/20" : i === 0 || bk.best ? "bg-primary/5" : ""
              }`}
            >
              <span className={`min-w-0 truncate text-xs font-bold ${bk.best || bk.topValue ? "text-primary" : "text-foreground"}`}>
                {bk.name}
                {bk.topValue ? " (Top Value)" : ""}
              </span>
              <span className={`text-center text-xs font-semibold ${bk.home === best1 ? "text-primary" : "text-foreground"}`}>{bk.home}</span>
              <span className={`text-center text-xs font-semibold ${bk.draw === bestX ? "text-primary" : "text-foreground"}`}>{bk.draw}</span>
              <span className={`text-center text-xs font-semibold ${bk.away === best2 ? "text-primary" : "text-foreground"}`}>{bk.away}</span>
              <span className="text-center text-xs font-semibold text-primary/90">
                {rowValue ? `+${rowValue.valuePct}%` : "—"}
              </span>
              <div className="text-right">
                {ctaUrl ? (
                  <a
                    href={ctaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/20"
                  >
                    {CTA_LABEL}
                  </a>
                ) : (
                  <span className="text-[10px] text-muted-foreground">n/d</span>
                )}
              </div>
            </div>
          );
          })}
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <div className="w-2 h-2 rounded-full bg-primary" />
        <span className="text-xs text-muted-foreground">Top value + 3 bookmaker di riferimento</span>
      </div>
      <p className="mt-2 text-[10px] leading-snug text-muted-foreground/90">
        CTA con link affiliazione configurabile (`NEXT_PUBLIC_ODDS_CTA_LABEL` / `NEXT_PUBLIC_AFFILIATE_BASE_URL`).
        Evitare copy non conforme (es. &quot;Gioca ora&quot;) se richiesto dal legale.
      </p>
    </GlassCard>
  );
}
