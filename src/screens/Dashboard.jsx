import React, { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router-compat";
import {
  TrendingUp,
  Zap,
  Crown,
  ChevronRight,
  AlertTriangle,
  Star,
  Clock,
  BarChart3,
  Info,
} from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import PageIntro from "@/components/shared/PageIntro";
import FeedMetaPanel from "@/components/shared/FeedMetaPanel";
import DataStatusChips from "@/components/shared/DataStatusChips";
import ValueBetBadge from "@/components/shared/ValueBetBadge";
import ConfidenceBar from "@/components/shared/ConfidenceBar";
import FootballMediaImage from "@/components/shared/FootballMediaImage";
import { useApp } from "@/lib/AppContext";
import { getLivescoresInplay, getScheduleWindow } from "@/api/football";
import {
  getMatchStatusBucket,
  matchLeagueFilter,
  sortMatchesByFeaturedPriority,
} from "@/lib/football-filters";
import { isDatiLiveFeatureEnabled } from "@/lib/feature-flags";
import { getOddsDecimalForValueBet } from "@/lib/value-bet-display";

const QUICK_LEAGUES = [
  "Tutti",
  "Serie A",
  "Premier League",
  "Champions League",
  "La Liga",
  "Bundesliga",
];

function formatAlertTime(value) {
  if (!value) return "orchestrator";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "orchestrator";
  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatStoredAlert(alert) {
  if (alert?.type === "multibet") {
    const multibet = alert.multibet || {};
    return `Value combo +${multibet.dataEdgePercent ?? "—"}% · ${multibet.events?.length || 0} eventi · EV ${
      multibet.totalEv ?? "—"
    }`;
  }

  const single = alert?.single || {};
  const teams = single.home && single.away ? `${single.home} vs ${single.away}` : "Alert value";
  return `${teams} · ${single.market || "Mercato"} ${single.selection || ""} @ ${
    single.bestOdd || "—"
  }`;
}

export default function Dashboard() {
  const { isPremium, favorites } = useApp();
  const [activeLeague, setActiveLeague] = useState("Tutti");
  const [schedulePayload, setSchedulePayload] = useState(null);
  const [livePayload, setLivePayload] = useState(null);
  const [orchestratorAlerts, setOrchestratorAlerts] = useState([]);
  const [performanceSummary, setPerformanceSummary] = useState(null);
  const [dashboardNotice, setDashboardNotice] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadDashboardFeeds = async () => {
      try {
        if (isDatiLiveFeatureEnabled()) {
          const [nextSchedulePayload, nextLivePayload] = await Promise.all([
            getScheduleWindow(14),
            getLivescoresInplay(),
          ]);

          if (!isActive) {
            return;
          }

          setSchedulePayload(nextSchedulePayload);
          setLivePayload(nextLivePayload);
          setDashboardNotice(nextLivePayload.notice || nextSchedulePayload.notice || "");
        } else {
          const nextSchedulePayload = await getScheduleWindow(14);

          if (!isActive) {
            return;
          }

          setSchedulePayload(nextSchedulePayload);
          setLivePayload(null);
          setDashboardNotice(nextSchedulePayload.notice || "");
        }
      } catch (error) {
        if (isActive) {
          setDashboardNotice(
            error.message || "Feed dashboard non disponibile con il provider corrente."
          );
        }
      }
    };

    loadDashboardFeeds();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadOrchestratorFeeds() {
      try {
        const [alertsResponse, performanceResponse] = await Promise.all([
          fetch("/api/alerts?limit=5", { cache: "no-store" }),
          fetch("/api/performance", { cache: "no-store" }),
        ]);
        const [alertsPayload, performancePayload] = await Promise.all([
          alertsResponse.json(),
          performanceResponse.json(),
        ]);

        if (!isActive) return;

        setOrchestratorAlerts(Array.isArray(alertsPayload.alerts) ? alertsPayload.alerts : []);
        setPerformanceSummary(performancePayload.summary || null);
      } catch {
        if (isActive) {
          setOrchestratorAlerts([]);
          setPerformanceSummary(null);
        }
      }
    }

    loadOrchestratorFeeds();
    const interval = window.setInterval(loadOrchestratorFeeds, 60000);

    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
  }, []);

  const feedMatches = Array.isArray(schedulePayload?.matches) ? schedulePayload.matches : [];
  const liveMatches = Array.isArray(livePayload?.matches) ? livePayload.matches : [];

  const topMatches = useMemo(
    () =>
      sortMatchesByFeaturedPriority(
        feedMatches.filter((match) => matchLeagueFilter(match, activeLeague))
      ).slice(0, 4),
    [activeLeague, feedMatches]
  );
  const nextAvailableMatch = useMemo(
    () => sortMatchesByFeaturedPriority(feedMatches)[0] || null,
    [feedMatches]
  );

  const valueBets = useMemo(
    () => feedMatches.filter((match) => match.valueBet),
    [feedMatches]
  );

  const alerts = useMemo(() => {
    const items = [];

    orchestratorAlerts.slice(0, 2).forEach((alert) => {
      items.push({
        id: `orchestrator-${alert._id}`,
        icon: TrendingUp,
        color: alert.status === "lost" ? "text-destructive" : "text-primary",
        message: formatStoredAlert(alert),
        time: alert.status === "pending" ? "in monitoraggio" : formatAlertTime(alert.settledAt),
      });
    });

    liveMatches.slice(0, 2).forEach((match) => {
      items.push({
        id: `live-${match.id}`,
        icon: Zap,
        color: "text-destructive",
        message: `${match.home} vs ${match.away} - indice di pericolosita ${match.dangerIndex}%`,
        time: "live",
      });
    });

    valueBets.slice(0, 1).forEach((match) => {
      items.push({
        id: `value-${match.id}`,
        icon: TrendingUp,
        color: "text-primary",
        message: `${match.home} vs ${match.away} - value bet derivato ${match.valueBet.type}`,
        time: "pre-match",
      });
    });

    if (dashboardNotice) {
      items.push({
        id: "notice",
        icon: Info,
        color: "text-accent",
        message: dashboardNotice,
        time: "feed",
      });
    }

    return items.slice(0, 3);
  }, [dashboardNotice, liveMatches, orchestratorAlerts, valueBets]);

  const liveCount = liveMatches.length;
  const today = feedMatches.filter((match) => getMatchStatusBucket(match) === "today").length;
  const featuredTitle = today > 0 ? "Top Match del Giorno" : "Prossimo Slot Disponibile";

  const statCards = useMemo(() => {
    const cards = [
      {
        label: "Match Oggi",
        value: today,
        icon: Clock,
        color: "text-blue-400",
        path: "/modelli-predittivi",
      },
      {
        label: "Alert Value",
        value: orchestratorAlerts.length || valueBets.length,
        icon: TrendingUp,
        color: "text-primary",
        path: "/modelli-predittivi",
      },
    ];
    if (isDatiLiveFeatureEnabled()) {
      cards.push({
        label: "Partite Live",
        value: liveCount,
        icon: Zap,
        color: "text-destructive",
        path: "/dati-live",
      });
    }
    cards.push({
      label: "Combo Premium",
      value: isPremium ? "Preview" : "Locked",
      icon: Crown,
      color: "text-accent",
      path: "/multi-bet",
    });
    return cards;
  }, [today, valueBets.length, orchestratorAlerts.length, liveCount, isPremium]);

  const feedSummary = useMemo(() => {
    const p = schedulePayload?.provider || "—";
    const st = schedulePayload?.freshness?.state || "—";
    if (isDatiLiveFeatureEnabled() && livePayload) {
      const n = liveMatches.length;
      return `${p} · ${st} · live ${n} partita${n === 1 ? "" : "e"}`;
    }
    return `${p} · freshness ${st}`;
  }, [
    schedulePayload?.provider,
    schedulePayload?.freshness?.state,
    isDatiLiveFeatureEnabled,
    livePayload,
    liveMatches.length,
  ]);

  return (
    <div className="app-page">
      <div className="app-content">
        <div className="mb-8">
          <PageIntro
            title="TOP FOOTBALL DATA"
            accentWord="FOOTBALL"
            subtitle="Calendario e match in evidenza dal feed Sportmonks. Dettagli provenance nel pannello «Stato feed dati» sotto."
            icon={BarChart3}
          />
          <FeedMetaPanel summary={feedSummary} label="Stato feed dati" className="mb-0">
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Calendario (pre-match)
              </p>
              <DataStatusChips
                provider={schedulePayload?.provider}
                source={schedulePayload?.source}
                freshness={schedulePayload?.freshness}
                competition={feedMatches[0]?.competition}
                leagueMedia={feedMatches[0]?.league_media}
                predictionProvider={feedMatches[0]?.prediction_provider}
                oddsProvider={feedMatches[0]?.odds_provider}
                notice={isDatiLiveFeatureEnabled() ? undefined : dashboardNotice}
              />
            </div>
            {isDatiLiveFeatureEnabled() && (
              <div className="space-y-2 pt-1 border-t border-border/20">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Livescore
                </p>
                <DataStatusChips
                  provider={livePayload?.provider}
                  source={livePayload?.source}
                  freshness={livePayload?.freshness}
                  competition={liveMatches[0]?.competition}
                  leagueMedia={liveMatches[0]?.league_media}
                  predictionProvider={liveMatches[0]?.prediction_provider}
                  oddsProvider={liveMatches[0]?.odds_provider}
                  lineupStatus={liveMatches[0]?.lineup_status}
                  notice={dashboardNotice}
                />
              </div>
            )}
          </FeedMetaPanel>
        </div>

        <div className="mb-8 flex flex-col divide-y divide-border/35 overflow-hidden rounded-xl border border-border/40 bg-secondary/5 sm:flex-row sm:divide-x sm:divide-y-0">
          {statCards.map((stat) => (
            <Link
              key={stat.label}
              to={stat.path}
              className="group flex min-w-0 flex-1 flex-col px-4 py-4 transition-colors hover:bg-secondary/35"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <ChevronRight className="h-3 w-3 text-muted-foreground opacity-50 transition-opacity group-hover:opacity-100" />
              </div>
              <div className="font-orbitron text-2xl font-black tabular-nums text-foreground">
                {stat.value}
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{stat.label}</div>
            </Link>
          ))}
        </div>

        <div className="grid min-w-0 gap-6 lg:grid-cols-3">
          <div className="min-w-0 space-y-6 lg:col-span-2">
            <div className="scrollbar-hide flex max-w-full min-w-0 items-center gap-1 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]">
              {QUICK_LEAGUES.map((league) => (
                <button
                  key={league}
                  type="button"
                  onClick={() => setActiveLeague(league)}
                  className={`flex-shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeLeague === league
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  }`}
                >
                  {league}
                </button>
              ))}
            </div>

            <div>
              <div className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground">{featuredTitle}</h2>
                  {!today && nextAvailableMatch && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Nessun match oggi nel feed corrente. Prossima fixture: {nextAvailableMatch.date} alle{" "}
                      {nextAvailableMatch.time}.
                    </p>
                  )}
                </div>
                <Link
                  to="/modelli-predittivi"
                  className="flex shrink-0 items-center gap-1 text-xs text-primary hover:text-primary/80"
                >
                  Vedi tutti <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="overflow-hidden rounded-xl border border-border/40 divide-y divide-border/35 bg-secondary/5">
                {topMatches.map((match) => (
                  <Link
                    key={match.id}
                    to={`/match/${match.id}`}
                    className="group block transition-colors hover:bg-secondary/30"
                  >
                    <div className="flex items-center justify-between gap-3 p-3 md:p-4">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex w-14 shrink-0 flex-col items-center gap-1 text-center">
                          <FootballMediaImage
                            media={match.league_media}
                            fallbackLabel={match.league}
                            alt=""
                            size="xs"
                            shape="square"
                          />
                          <span className="block max-w-full truncate text-[11px] font-medium text-foreground/90">
                            {match.league}
                          </span>
                          <span className="text-[11px] text-muted-foreground">{match.time}</span>
                        </div>
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <FootballMediaImage
                            media={match.home_media}
                            fallbackLabel={match.homeShort || match.home}
                            alt=""
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-foreground">
                            {match.home} vs {match.away}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {match.valueBet && (
                              <ValueBetBadge match={match} variant="compact" />
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {match.odds_provider === "not_available_with_current_feed"
                                ? "Quote derivate"
                                : "Quote provider"}
                            </span>
                          </div>
                          </div>
                          <FootballMediaImage
                            media={match.away_media}
                            fallbackLabel={match.awayShort || match.away}
                            alt=""
                            size="sm"
                          />
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                        <div className="hidden text-right sm:block">
                          <div className="text-[10px] text-muted-foreground">1 · X · 2</div>
                          <div className="text-xs font-semibold tabular-nums text-foreground">
                            {match.odds.home} / {match.odds.draw} / {match.odds.away}
                          </div>
                        </div>
                        <ConfidenceBar value={match.confidence} compact className="w-[120px] shrink-0" />
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                      </div>
                    </div>
                  </Link>
                ))}
                {!topMatches.length && (
                  <div className="p-4 text-xs text-muted-foreground">
                    Nessun top match disponibile nel feed corrente.
                  </div>
                )}
              </div>
            </div>

            {favorites.matches.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-foreground flex items-center gap-2">
                    <Star className="w-4 h-4 text-accent" /> I tuoi preferiti
                  </h2>
                  <Link to="/preferiti" className="text-xs text-primary flex items-center gap-1">
                    Vedi <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {favorites.matches.slice(0, 3).map((id) => {
                    const match = feedMatches.find((candidate) => String(candidate.id) === String(id));
                    if (!match) return null;
                    return (
                      <Link
                        key={id}
                        to={`/match/${id}`}
                        className="glass max-w-full truncate rounded-lg px-3 py-2 text-xs text-foreground transition-all hover:border-primary/20"
                      >
                        {match.home} vs {match.away}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-5">
            <GlassCard variant="quiet">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <h3 className="text-sm font-semibold text-foreground">Segnali dal feed</h3>
              </div>
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <alert.icon className={`w-3 h-3 ${alert.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-foreground leading-relaxed">{alert.message}</p>
                      <span className="text-xs text-muted-foreground/70">{alert.time}</span>
                    </div>
                  </div>
                ))}
                {!alerts.length && (
                  <p className="text-xs text-muted-foreground">
                    Nessun alert disponibile nel feed corrente.
                  </p>
                )}
              </div>

              <div className="mt-4 border-t border-border/30 pt-4">
                <div className="mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
                    Value bet (derivati)
                  </h4>
                </div>
                <div className="space-y-2">
                  {orchestratorAlerts.slice(0, 3).map((alert) => {
                    const single = alert.single || {};
                    const multibet = alert.multibet || {};
                    const label =
                      alert.type === "multibet"
                        ? `Combo ${multibet.events?.length || 0} eventi`
                        : `${single.home || "Match"} vs ${single.away || ""}`;
                    const detail =
                      alert.type === "multibet"
                        ? `EV ${multibet.totalEv ?? "—"} · quota ${multibet.totalOdd ?? "—"}`
                        : `${single.selection || "Value"} @ ${single.bestOdd || "—"}`;

                    return (
                      <div
                        key={alert._id}
                        className="rounded-lg border border-primary/10 bg-primary/5 p-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-xs font-semibold text-foreground">
                              {label}
                            </div>
                            <div className="text-xs font-semibold text-primary">{detail}</div>
                          </div>
                          <span className="shrink-0 text-xs font-bold text-primary">
                            {alert.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {valueBets.slice(0, 3).map((match) => (
                    <Link
                      key={match.id}
                      to={`/match/${match.id}`}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-primary/5 border border-primary/10 hover:border-primary/30 transition-all group"
                    >
                      <div>
                        <div className="text-xs font-semibold text-foreground">
                          {match.home} vs {match.away}
                        </div>
                        <div className="text-xs text-primary font-semibold">
                          {match.valueBet.type} @
                          {getOddsDecimalForValueBet(match) ?? "—"}
                        </div>
                      </div>
                      <span className="text-xs font-bold text-primary">+{match.valueBet.edge}%</span>
                    </Link>
                  ))}
                  {!valueBets.length && !orchestratorAlerts.length && (
                    <p className="text-xs text-muted-foreground">
                      Nessun value bet derivato disponibile oggi.
                    </p>
                  )}
                </div>
              </div>
              {performanceSummary && (
                <div className="mt-4 border-t border-border/30 pt-4">
                  <div className="mb-2 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-accent" />
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
                      Performance storica
                    </h4>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-secondary/35 p-2">
                      <div className="text-sm font-bold text-foreground">
                        {performanceSummary.settled || 0}
                      </div>
                      <div className="text-[10px] text-muted-foreground">chiuse</div>
                    </div>
                    <div className="rounded-lg bg-secondary/35 p-2">
                      <div className="text-sm font-bold text-primary">
                        {performanceSummary.roiPercent || 0}%
                      </div>
                      <div className="text-[10px] text-muted-foreground">ROI</div>
                    </div>
                    <div className="rounded-lg bg-secondary/35 p-2">
                      <div className="text-sm font-bold text-accent">
                        {performanceSummary.hitRatePercent || 0}%
                      </div>
                      <div className="text-[10px] text-muted-foreground">hit rate</div>
                    </div>
                  </div>
                </div>
              )}
            </GlassCard>

            {!isPremium ? (
              <GlassCard variant="quiet" className="border-accent/25 text-center">
                <Crown className="mx-auto mb-2 h-8 w-8 text-accent" />
                <h3 className="font-orbitron font-bold text-sm text-accent mb-1">
                  Sblocca Premium
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Entitlement server-side con Stripe, analytics avanzate e preview engine.
                </p>
                <Link to="/premium">
                  <button className="w-full py-2 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs font-bold hover:bg-accent/20 transition-all glow-gold">
                    DIVENTA PREMIUM
                  </button>
                </Link>
              </GlassCard>
            ) : (
              <GlassCard variant="quiet" className="border-primary/25">
                <div className="mb-3 flex items-center gap-2">
                  <Crown className="h-4 w-4 text-accent" />
                  <span className="font-semibold text-sm text-accent">Area Premium</span>
                </div>
                <div className="space-y-2">
                  <Link
                    to="/multi-bet"
                    className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/40 hover:bg-secondary/60 transition-all group"
                  >
                    <span className="text-xs text-foreground">Multi-Bet preview</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                  </Link>
                  {isDatiLiveFeatureEnabled() && (
                    <Link
                      to="/dati-live"
                      className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/40 hover:bg-secondary/60 transition-all group"
                    >
                      <span className="text-xs text-foreground">Live center</span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                    </Link>
                  )}
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


