"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, ChevronRight, Lock, Send } from "lucide-react";
import { Link } from "@/lib/router-compat";
import GlassCard from "@/components/shared/GlassCard";
import FootballMediaImage from "@/components/shared/FootballMediaImage";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { buildMatchHref } from "@/lib/match-links";

const RISK_COLORS = {
  basso: "text-primary border-primary/20 bg-primary/10",
  medio: "text-accent border-accent/20 bg-accent/10",
  alto: "text-destructive border-destructive/20 bg-destructive/10",
};

const TAG_COLORS = {
  Conservativa: "bg-primary/10 text-primary border-primary/20",
  Bilanciata: "bg-accent/10 text-accent border-accent/20",
  Aggressiva: "bg-destructive/10 text-destructive border-destructive/20",
  Value: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
};

/**
 * @param {object} props
 * @param {object} props.combo — output `mapMultibetAlertToCombo`
 * @param {boolean} props.isPremium
 * @param {string} [props.highlightKey] — alertKey da evidenziare (URL ?ref=)
 */
export default function MultibetComboCard({ combo, isPremium, highlightKey }) {
  const [expanded, setExpanded] = useState(false);
  const isLive = combo.dataSource === "orchestrator";
  const isHighlighted = highlightKey && combo.alertKey && highlightKey === combo.alertKey;
  const bookmakers = Array.isArray(combo.bookmakers) ? combo.bookmakers : [];
  const eng = combo.engine || {};

  return (
    <GlassCard
      id={combo.alertKey ? `multibet-${combo.alertKey}` : undefined}
      className={`border-accent/10 ${isHighlighted ? "ring-2 ring-primary/40" : ""}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${TAG_COLORS[combo.tag] || TAG_COLORS.Bilanciata}`}
            >
              {combo.tag}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${
                RISK_COLORS[combo.risk] || RISK_COLORS.medio
              }`}
            >
              Rischio {combo.risk}
            </span>
            {isLive && (
              <span className="text-[10px] rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                Telegram + Mongo
              </span>
            )}
            {combo.telegramSent && (
              <span className="text-[10px] rounded-full border border-border/40 bg-secondary/50 px-2 py-0.5 text-muted-foreground">
                <Send className="mr-0.5 inline h-2.5 w-2.5" />
                Inviata
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Moltiplicatore</div>
              <div className="font-orbitron text-2xl font-black text-foreground">{combo.odds}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Confidenza</div>
              <div className="text-lg font-bold text-primary">{combo.confidence}%</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Potenziale (stake 100)</div>
              <div className="text-lg font-bold text-accent">€{combo.potentialWin}</div>
            </div>
            {eng.dataEdgePercent != null && (
              <div>
                <div className="text-xs text-muted-foreground">Data edge</div>
                <div className="text-lg font-bold text-primary">+{eng.dataEdgePercent}%</div>
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="rounded-lg bg-secondary/50 p-2 text-muted-foreground transition-all hover:text-foreground"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      <Progress value={combo.confidence} className="mb-4 h-1.5" />

      <div className="space-y-2">
        {combo.selections
          .slice(0, expanded ? undefined : 2)
          .map((sel, i) => (
            <div
              key={`${sel.fixtureId || i}-${i}`}
              className="flex items-center justify-between gap-2 rounded-lg bg-secondary/30 p-2.5"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div className="flex shrink-0 items-center gap-1">
                  <FootballMediaImage
                    media={sel.league_media}
                    fallbackLabel={sel.league}
                    alt={sel.league}
                    size="xs"
                    shape="square"
                  />
                  <FootballMediaImage
                    media={sel.home_media}
                    fallbackLabel={sel.home}
                    alt={sel.home}
                    size="xs"
                  />
                  <FootballMediaImage
                    media={sel.away_media}
                    fallbackLabel={sel.away}
                    alt={sel.away}
                    size="xs"
                  />
                </div>
                <div className="min-w-0">
                  {sel.fixtureId && (
                    <Link
                      to={buildMatchHref(sel.fixtureId, sel.snapshotVersion)}
                      className="block truncate text-xs font-semibold text-foreground hover:text-primary"
                    >
                      {sel.home} vs {sel.away}
                    </Link>
                  )}
                  {!sel.fixtureId && (
                    <div className="truncate text-xs font-semibold text-foreground">
                      {sel.home} vs {sel.away}
                    </div>
                  )}
                  <div className="truncate text-xs text-muted-foreground">
                    {sel.league} · {sel.market}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-foreground">{sel.odds}</span>
                <span
                  className={`text-xs font-bold ${
                    sel.confidence >= 80 ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {sel.confidence}%
                </span>
              </div>
            </div>
          ))}
        {!expanded && combo.selections.length > 2 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-xs text-primary transition-colors hover:text-primary/80"
          >
            + {combo.selections.length - 2} altre selezioni
          </button>
        )}
      </div>

      {bookmakers.length > 0 && isPremium && (
        <div className="mt-4 rounded-lg border border-border/30 bg-secondary/20 p-3">
          <div className="mb-2 text-xs font-semibold text-foreground">Comparatore quote (prima gamba)</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {bookmakers.map((b) => (
              <div
                key={b.name}
                className={`flex items-center justify-between gap-2 rounded-md border px-2 py-2 text-xs ${
                  b.best ? "border-primary/30 bg-primary/10" : "border-border/40 bg-background/30"
                }`}
              >
                <span className="font-semibold text-foreground">{b.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-foreground">{b.odds}</span>
                  {b.affiliateUrl ? (
                    <a
                      href={b.affiliateUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded bg-primary/90 px-2 py-1 text-[10px] font-bold text-primary-foreground hover:bg-primary"
                    >
                      Apri quota
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {expanded && (
        <div className="mt-4 space-y-2 rounded-lg border border-border/30 bg-secondary/20 p-3">
          <div className="text-xs font-semibold text-foreground">Motore (worker)</div>
          {isLive ? (
            <ul className="text-xs text-muted-foreground">
              {eng.totalEv != null && (
                <li>
                  EV composto: <span className="font-mono text-foreground">{String(eng.totalEv)}</span>
                </li>
              )}
              {eng.statisticalProbability != null && (
                <li>
                  P(∧) modello:{" "}
                  <span className="text-foreground">
                    {(() => {
                      const raw = Number(eng.statisticalProbability);
                      if (!Number.isFinite(raw)) {
                        return "—";
                      }
                      return `${(raw <= 1 ? raw * 100 : raw).toFixed(1)}%`;
                    })()}
                  </span>
                </li>
              )}
              {eng.dataEdgePercent != null && (
                <li>
                  Vantaggio stimato: <span className="text-primary">+{eng.dataEdgePercent}%</span>
                </li>
              )}
              {combo.alertKey && (
                <li className="break-all font-mono text-[10px] opacity-80">Key: {combo.alertKey}</li>
              )}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground leading-relaxed">
              Dati di esempio: collega Mongo e il worker Railway per alert real-time.
            </p>
          )}
        </div>
      )}

      <div className="mt-4">
        {isPremium ? (
          <Button
            className="h-10 w-full bg-primary text-xs font-bold text-primary-foreground glow-green-sm"
            asChild
          >
            <a href={bookmakers[0]?.affiliateUrl || "/premium"} target="_blank" rel="noreferrer">
              {bookmakers[0]?.affiliateUrl ? "Vai al book (miglior quota)" : "Scopri premium"}
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </a>
          </Button>
        ) : (
          <Button
            className="h-10 w-full border border-accent/30 bg-accent/20 text-xs font-bold text-accent glow-gold"
            variant="ghost"
            asChild
          >
            <a href="/premium">
              <Lock className="mr-2 h-3.5 w-3.5" /> SBLOCCA · DIVENTA PREMIUM
            </a>
          </Button>
        )}
      </div>
    </GlassCard>
  );
}
