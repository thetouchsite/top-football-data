import React, { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router-compat";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Zap,
  Crown,
  ChevronRight,
  AlertTriangle,
  Star,
  Clock,
  Target,
  Info,
} from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import DataStatusChips from "@/components/shared/DataStatusChips";
import ValueBetBadge from "@/components/shared/ValueBetBadge";
import { useApp } from "@/lib/AppContext";
import { getLivescoresInplay, getScheduleWindow } from "@/api/football";
import {
  getMatchStatusBucket,
  matchLeagueFilter,
  sortMatchesByFeaturedPriority,
} from "@/lib/football-filters";

const QUICK_LEAGUES = [
  "Tutti",
  "Serie A",
  "Premier League",
  "Champions League",
  "La Liga",
  "Bundesliga",
];

export default function Dashboard() {
  const { isPremium, favorites } = useApp();
  const [activeLeague, setActiveLeague] = useState("Tutti");
  const [schedulePayload, setSchedulePayload] = useState(null);
  const [livePayload, setLivePayload] = useState(null);
  const [dashboardNotice, setDashboardNotice] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadDashboardFeeds = async () => {
      try {
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

    liveMatches.slice(0, 2).forEach((match) => {
      items.push({
        id: `live-${match.id}`,
        icon: Zap,
        color: "text-destructive",
        message: `${match.home} vs ${match.away} · indice di pericolosità ${match.dangerIndex}%`,
        time: "live",
      });
    });

    valueBets.slice(0, 1).forEach((match) => {
      items.push({
        id: `value-${match.id}`,
        icon: TrendingUp,
        color: "text-primary",
        message: `${match.home} vs ${match.away} · value spot derivato ${match.valueBet.type}`,
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
  }, [dashboardNotice, liveMatches, valueBets]);

  const liveCount = liveMatches.length;
  const today = feedMatches.filter((match) => getMatchStatusBucket(match) === "today").length;
  const featuredTitle = today > 0 ? "Top Match del Giorno" : "Prossimo Slot Disponibile";

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-orbitron font-black text-2xl md:text-3xl tracking-wide mb-1">
            TOP <span className="text-primary text-glow-green">FOOTBALL DATA</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Dashboard Sportmonks-first con provenance e freshness dichiarate.
          </p>
          <div className="mt-3 space-y-2">
            <DataStatusChips
              provider={schedulePayload?.provider}
              source={schedulePayload?.source}
              freshness={schedulePayload?.freshness}
              predictionProvider={feedMatches[0]?.prediction_provider}
              oddsProvider={feedMatches[0]?.odds_provider}
            />
            <DataStatusChips
              provider={livePayload?.provider}
              source={livePayload?.source}
              freshness={livePayload?.freshness}
              predictionProvider={liveMatches[0]?.prediction_provider}
              oddsProvider={liveMatches[0]?.odds_provider}
              lineupStatus={liveMatches[0]?.lineup_status}
              notice={dashboardNotice}
            />
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            {
              label: "Match Oggi",
              value: today,
              icon: Clock,
              color: "text-blue-400",
              path: "/modelli-predittivi",
            },
            {
              label: "Value Bet",
              value: valueBets.length,
              icon: TrendingUp,
              color: "text-primary",
              path: "/modelli-predittivi",
            },
            {
              label: "Partite Live",
              value: liveCount,
              icon: Zap,
              color: "text-destructive",
              path: "/dati-live",
            },
            {
              label: "Combo Premium",
              value: isPremium ? "Preview" : "Locked",
              icon: Crown,
              color: "text-accent",
              path: "/multi-bet",
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
            >
              <Link to={stat.path}>
                <GlassCard className="group cursor-pointer hover:border-primary/20 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <div className="font-orbitron font-black text-2xl text-foreground">
                    {stat.value}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                </GlassCard>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {QUICK_LEAGUES.map((league) => (
                <button
                  key={league}
                  onClick={() => setActiveLeague(league)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    activeLeague === league
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                >
                  {league}
                </button>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
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
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  Vedi tutti <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-3">
                {topMatches.map((match, index) => (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.06 }}
                  >
                    <Link to={`/match/${match.id}`}>
                      <GlassCard className="group cursor-pointer hover:border-primary/20 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="text-center">
                              <span className="text-xs text-accent font-semibold block">
                                {match.league}
                              </span>
                              <span className="text-xs text-muted-foreground">{match.time}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm text-foreground truncate">
                                {match.home} vs {match.away}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {match.valueBet && (
                                  <ValueBetBadge
                                    type={match.valueBet.type}
                                    edge={match.valueBet.edge}
                                  />
                                )}
                                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/50 text-muted-foreground">
                                  {match.odds_provider === "not_available_with_current_feed"
                                    ? "Quote derivate"
                                    : "Quote provider"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="text-right hidden sm:block">
                              <div className="text-xs text-muted-foreground">1 / X / 2</div>
                              <div className="text-xs font-bold text-foreground">
                                {match.odds.home} / {match.odds.draw} / {match.odds.away}
                              </div>
                            </div>
                            <span className="text-xs font-bold px-2 py-1 rounded-lg bg-secondary/50 text-muted-foreground">
                              {match.confidence}%
                            </span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </div>
                      </GlassCard>
                    </Link>
                  </motion.div>
                ))}
                {!topMatches.length && (
                  <GlassCard>
                    <p className="text-xs text-muted-foreground">
                      Nessun top match disponibile nel feed corrente.
                    </p>
                  </GlassCard>
                )}
              </div>
            </div>

            {favorites.matches.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-foreground flex items-center gap-2">
                    <Star className="w-4 h-4 text-accent" /> I tuoi preferiti
                  </h2>
                  <Link to="/watchlist" className="text-xs text-primary flex items-center gap-1">
                    Vedi <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {favorites.matches.slice(0, 3).map((id) => {
                    const match = feedMatches.find((candidate) => String(candidate.id) === String(id));
                    if (!match) return null;
                    return (
                      <Link
                        key={id}
                        to={`/match/${id}`}
                        className="text-xs px-3 py-2 glass rounded-lg text-foreground hover:border-primary/20 transition-all"
                      >
                        {match.home} vs {match.away}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <h3 className="font-semibold text-sm text-foreground">Alert Recenti</h3>
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
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Value Bet Evidenziate</h3>
              </div>
              <div className="space-y-2">
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
                        {match.valueBet.type} @{match.odds[match.valueBet.type === "1" ? "home" : match.valueBet.type === "2" ? "away" : "draw"]}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-primary">+{match.valueBet.edge}%</span>
                  </Link>
                ))}
                {!valueBets.length && (
                  <p className="text-xs text-muted-foreground">
                    Nessun value spot derivato disponibile oggi.
                  </p>
                )}
              </div>
            </GlassCard>

            {!isPremium ? (
              <GlassCard className="border-accent/20 text-center">
                <Crown className="w-8 h-8 text-accent mx-auto mb-2" />
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
              <GlassCard className="border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="w-4 h-4 text-accent" />
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
                  <Link
                    to="/dati-live"
                    className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/40 hover:bg-secondary/60 transition-all group"
                  >
                    <span className="text-xs text-foreground">Live center</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                  </Link>
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
