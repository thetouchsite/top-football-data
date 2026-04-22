"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, CheckCircle2, RefreshCw, Send, TrendingUp, XCircle } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import GlassCard from "@/components/shared/GlassCard";
import PageIntro from "@/components/shared/PageIntro";
import { Button } from "@/components/ui/button";

function formatDate(value) {
  if (!value) return "N/D";
  return new Date(value).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAlertTitle(item) {
  if (item.type === "single") {
    const single = item.legs?.[0] || {};
    return `Singola ${single.selection || ""}`.trim();
  }

  return `Multipla ${item.legs?.length || 0} eventi`;
}

function statusClass(status) {
  if (status === "won") return "border-primary/25 bg-primary/10 text-primary";
  if (status === "lost") return "border-destructive/25 bg-destructive/10 text-destructive";
  return "border-border/40 bg-secondary/40 text-muted-foreground";
}

export default function PerformanceStoriche() {
  const [payload, setPayload] = useState({ summary: null, recent: [], equityCurve: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function loadPerformance() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/performance", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Performance non disponibile.");
        }
        if (isActive) {
          setPayload({
            summary: data.summary || null,
            recent: Array.isArray(data.recent) ? data.recent : [],
            equityCurve: Array.isArray(data.equityCurve) ? data.equityCurve : [],
          });
        }
      } catch (requestError) {
        if (isActive) {
          setPayload({ summary: null, recent: [], equityCurve: [] });
          setError(requestError.message || "Impossibile caricare le performance.");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadPerformance();

    return () => {
      isActive = false;
    };
  }, [refreshKey]);

  const summary = payload.summary || {
    settled: 0,
    won: 0,
    lost: 0,
    void: 0,
    stakeUnits: 0,
    profitUnits: 0,
    roiPercent: 0,
    hitRatePercent: 0,
  };

  const chartData = useMemo(
    () =>
      payload.equityCurve.map((point, index) => ({
        name: point.settledAt ? formatDate(point.settledAt) : `#${index + 1}`,
        roi: point.roiPercent || 0,
        profit: point.profitUnits || 0,
      })),
    [payload.equityCurve]
  );

  const statCards = [
    { label: "Alert chiusi", value: summary.settled || 0, icon: Activity },
    { label: "ROI reale", value: `${summary.roiPercent || 0}%`, icon: TrendingUp },
    { label: "Bilancio", value: `${summary.profitUnits || 0}u`, icon: BarChart3 },
    { label: "Hit rate", value: `${summary.hitRatePercent || 0}%`, icon: CheckCircle2 },
  ];

  return (
    <div className="app-page">
      <div className="app-content">
        <PageIntro
          title="PERFORMANCE STORICHE"
          accentWord="STORICHE"
          subtitle="Bilancio automatico degli alert inviati: singole, multiple, esiti finali, profitto cumulato e ROI reale."
          icon={BarChart3}
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
          {statCards.map((card) => (
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

        <div className="mb-6 rounded-xl border border-border/40 bg-secondary/5 p-4 md:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Curva ROI / profitto</h2>
              <p className="text-xs text-muted-foreground">
                Ogni punto rappresenta un alert chiuso e registrato dal worker Railway.
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary">
              <Send className="h-3.5 w-3.5" />
              Sintesi inviata su Telegram a ogni settlement
            </span>
          </div>

          <div className="h-[320px] min-w-0">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="roiFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="roi"
                    name="ROI %"
                    stroke="hsl(var(--primary))"
                    fill="url(#roiFill)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name="Profitto unita"
                    stroke="hsl(var(--accent))"
                    fill="transparent"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border/40 bg-secondary/20 px-4 text-center text-sm text-muted-foreground">
                Nessun alert chiuso disponibile. La curva parte quando il worker registra i primi esiti won/lost.
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-3">
          {payload.recent.map((item) => (
            <div
              key={item.alertKey}
              className="rounded-xl border border-border/35 bg-secondary/10 px-4 py-3"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClass(item.status)}`}>
                      {item.status === "won" ? "Vinta" : item.status === "lost" ? "Persa" : "Void"}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(item.settledAt)}</span>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-foreground">{formatAlertTitle(item)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Quota {item.decimalOdd || 1} · stake {item.stakeUnits || 1}u · ROI alert {item.roiPercent || 0}%
                  </div>
                </div>
                <div className="flex items-center gap-2 text-right">
                  {item.status === "won" ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className={`font-orbitron text-lg font-black ${item.profitUnits >= 0 ? "text-primary" : "text-destructive"}`}>
                    {item.profitUnits > 0 ? "+" : ""}
                    {item.profitUnits || 0}u
                  </span>
                </div>
              </div>
            </div>
          ))}

          {!payload.recent.length && !loading && (
            <div className="rounded-xl border border-dashed border-border/40 bg-secondary/20 px-4 py-6 text-sm text-muted-foreground">
              Nessuna performance storica ancora registrata.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
