"use client";

import React, { useEffect, useMemo, useState } from "react";
import { BellRing, CalendarClock, CheckCircle2, Filter, RefreshCw, Send, TrendingUp } from "lucide-react";

import GlassCard from "@/components/shared/GlassCard";
import PageIntro from "@/components/shared/PageIntro";
import { Button } from "@/components/ui/button";

const TYPE_FILTERS = [
  { key: "all", label: "Tutti" },
  { key: "single", label: "Singole" },
  { key: "multibet", label: "Multiple" },
];

const STATUS_FILTERS = [
  { key: "all", label: "Tutti" },
  { key: "pending", label: "Pending" },
  { key: "won", label: "Vinti" },
  { key: "lost", label: "Persi" },
  { key: "void", label: "Void" },
];

function formatDate(value) {
  if (!value) return "N/D";
  return new Date(value).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status) {
  if (status === "won") return "Vinto";
  if (status === "lost") return "Perso";
  if (status === "void") return "Void";
  return "Pending";
}

function statusClass(status) {
  if (status === "won") return "border-primary/25 bg-primary/10 text-primary";
  if (status === "lost") return "border-destructive/25 bg-destructive/10 text-destructive";
  if (status === "void") return "border-border/40 bg-secondary/40 text-muted-foreground";
  return "border-accent/25 bg-accent/10 text-accent";
}

function getAlertMetrics(alert) {
  if (alert.type === "single") {
    return {
      title: `${alert.single?.home || "Home"} - ${alert.single?.away || "Away"}`,
      subtitle: `${alert.single?.league || "Competizione"} · ${alert.single?.market || "Mercato"} ${alert.single?.selection || ""}`,
      ev: alert.single?.edge,
      odd: alert.single?.bestOdd,
      events: [alert.single].filter(Boolean),
      kickoff: alert.single?.kickoff,
    };
  }

  const events = alert.multibet?.events || [];
  const modus = alert.multibet?.modus;
  const modusLabel = {
    algorithmic: "Algoritmico",
    safe: "Safe",
    value: "Value",
    gold: "Gold",
  }[String(modus || "").toLowerCase()];
  return {
    title: modusLabel
      ? `Multipla ${modusLabel} · ${events.length} eventi`
      : `Value Combo ${events.length} eventi`,
    subtitle: `Quota totale ${alert.multibet?.totalOdd || "--"} · EV composto ${alert.multibet?.totalEv || "--"}`,
    ev: alert.multibet?.totalEv,
    odd: alert.multibet?.totalOdd,
    events,
    kickoff: events[0]?.kickoff,
  };
}

function FilterButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "border-primary/30 bg-primary/12 text-primary"
          : "border-border/40 bg-secondary/25 text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function AlertCard({ alert }) {
  const metrics = getAlertMetrics(alert);
  const firstEvent = metrics.events[0] || {};
  const comparator = firstEvent.comparator || [];

  return (
    <GlassCard className="border-primary/10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClass(alert.status)}`}>
              {statusLabel(alert.status)}
            </span>
            <span className="rounded-full border border-border/40 bg-secondary/35 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {alert.type === "single" ? "Singola" : "Multipla"}
            </span>
            {firstEvent.source && (
              <span className="rounded-full border border-primary/20 bg-primary/8 px-2 py-0.5 text-xs font-semibold text-primary">
                {firstEvent.source === "sportmonks_value_bets" ? "Sportmonks Value Bets" : firstEvent.source}
              </span>
            )}
          </div>

          <h2 className="truncate text-base font-semibold text-foreground">{metrics.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{metrics.subtitle}</p>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-border/30 bg-secondary/20 px-3 py-2">
              <div className="text-[11px] text-muted-foreground">Inviato</div>
              <div className="mt-0.5 text-xs font-semibold text-foreground">{formatDate(alert.createdAt)}</div>
            </div>
            <div className="rounded-lg border border-border/30 bg-secondary/20 px-3 py-2">
              <div className="text-[11px] text-muted-foreground">Kickoff</div>
              <div className="mt-0.5 text-xs font-semibold text-foreground">{formatDate(metrics.kickoff)}</div>
            </div>
            <div className="rounded-lg border border-border/30 bg-secondary/20 px-3 py-2">
              <div className="text-[11px] text-muted-foreground">Quota / EV</div>
              <div className="mt-0.5 text-xs font-semibold text-foreground">
                {metrics.odd || "--"} · EV {metrics.ev || "--"}
              </div>
            </div>
          </div>
        </div>

        <div className="grid min-w-[220px] gap-2">
          {comparator.slice(0, 4).map((odd) => (
            <div
              key={`${alert.alertKey}-${odd.bookmaker}-${odd.odd}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/30 bg-secondary/20 px-3 py-2"
            >
              <span className="truncate text-xs font-semibold text-foreground">{odd.bookmaker}</span>
              <span className="font-orbitron text-sm font-black text-primary">{odd.odd}</span>
            </div>
          ))}
        </div>
      </div>

      {alert.type === "multibet" && metrics.events.length > 0 && (
        <div className="mt-4 border-t border-border/30 pt-3">
          <div className="mb-2 text-xs font-semibold text-muted-foreground">Eventi multipla</div>
          <div className="grid gap-2 md:grid-cols-2">
            {metrics.events.map((event) => (
              <div
                key={`${alert.alertKey}-${event.fixtureId}-${event.selection}`}
                className="rounded-lg border border-border/30 bg-secondary/15 px-3 py-2"
              >
                <div className="truncate text-xs font-semibold text-foreground">
                  {event.home} - {event.away}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {event.market} {event.selection} @ {event.bestOdd} · EV {event.edge}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
}

export default function AlertInviati() {
  const [alerts, setAlerts] = useState([]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function loadAlerts() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/alerts?limit=100", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Alert non disponibili.");
        }
        if (isActive) {
          setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
        }
      } catch (requestError) {
        if (isActive) {
          setAlerts([]);
          setError(requestError.message || "Impossibile caricare gli alert.");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadAlerts();

    return () => {
      isActive = false;
    };
  }, [refreshKey]);

  const filteredAlerts = useMemo(
    () =>
      alerts.filter((alert) => {
        const typeMatches = typeFilter === "all" || alert.type === typeFilter;
        const statusMatches = statusFilter === "all" || alert.status === statusFilter;
        return typeMatches && statusMatches;
      }),
    [alerts, statusFilter, typeFilter]
  );

  const stats = useMemo(
    () => ({
      total: alerts.length,
      pending: alerts.filter((alert) => alert.status === "pending").length,
      singles: alerts.filter((alert) => alert.type === "single").length,
      multibets: alerts.filter((alert) => alert.type === "multibet").length,
    }),
    [alerts]
  );

  return (
    <div className="app-page">
      <div className="app-content">
        <PageIntro
          title="ALERT INVIATI"
          accentWord="INVIATI"
          subtitle="Storico operativo dei segnali generati dall'orchestratore: singole, multiple, stato, EV e comparatore quote."
          icon={BellRing}
        >
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setRefreshKey((current) => current + 1)}
            className="h-9 border-border/50 text-xs"
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Aggiorna
          </Button>
        </PageIntro>

        {error && (
          <div className="mb-6 rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Alert totali", value: stats.total, icon: Send },
            { label: "Pending", value: stats.pending, icon: CalendarClock },
            { label: "Singole", value: stats.singles, icon: TrendingUp },
            { label: "Multiple", value: stats.multibets, icon: CheckCircle2 },
          ].map((card) => (
            <GlassCard key={card.label} className="border-primary/10">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">{card.label}</div>
                  <div className="mt-1 font-orbitron text-2xl font-black text-foreground">{card.value}</div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                  <card.icon className="h-4 w-4 text-primary" />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        <div className="mb-5 rounded-xl border border-border/40 bg-secondary/5 p-3">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Filtri
          </div>
          <div className="flex flex-wrap gap-2">
            {TYPE_FILTERS.map((item) => (
              <FilterButton key={item.key} active={typeFilter === item.key} onClick={() => setTypeFilter(item.key)}>
                {item.label}
              </FilterButton>
            ))}
            <span className="mx-1 hidden h-8 w-px bg-border/40 sm:block" />
            {STATUS_FILTERS.map((item) => (
              <FilterButton key={item.key} active={statusFilter === item.key} onClick={() => setStatusFilter(item.key)}>
                {item.label}
              </FilterButton>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          {filteredAlerts.map((alert) => (
            <AlertCard key={alert.alertKey} alert={alert} />
          ))}

          {!filteredAlerts.length && !loading && (
            <div className="rounded-xl border border-dashed border-border/40 bg-secondary/20 px-4 py-8 text-center text-sm text-muted-foreground">
              Nessun alert trovato per i filtri selezionati.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
