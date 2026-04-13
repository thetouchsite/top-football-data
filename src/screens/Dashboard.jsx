import React, { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router-compat";
import { motion } from "framer-motion";
import {
  TrendingUp, Zap, Crown, ChevronRight,
  AlertTriangle, Star, Clock, Target
} from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import ValueBetBadge from "@/components/shared/ValueBetBadge";
import { useApp } from "@/lib/AppContext";
import { MATCHES } from "@/lib/mockData";
import { getLivescoresInplay, getScheduleWindow } from "@/api/football";
import {
  getMatchStatusBucket,
  matchLeagueFilter,
} from "@/lib/football-filters";

const ALERTS = [
  { type: "value", icon: TrendingUp, color: "text-primary", msg: "Value Bet: Inter vs Milan — 1 @2.40 (+12%)", time: "5 min fa" },
  { type: "live", icon: Zap, color: "text-destructive", msg: "Alta pressione offensiva: Inter. Indice 78%", time: "12 min fa" },
  { type: "combo", icon: Crown, color: "text-accent", msg: "Nuova combo algoritminca disponibile: x6.34", time: "1 ora fa" },
];

const QUICK_LEAGUES = ["Tutti", "Serie A", "Premier League", "Champions League", "La Liga", "Bundesliga"];

export default function Dashboard() {
  const { isPremium, favorites } = useApp();
  const [activeLeague, setActiveLeague] = useState("Tutti");
  const [scheduleMatches, setScheduleMatches] = useState(null);
  const [liveMatches, setLiveMatches] = useState(null);
  const [dashboardNotice, setDashboardNotice] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadDashboardFeeds = async () => {
      try {
        const [schedulePayload, livePayload] = await Promise.all([
          getScheduleWindow(4),
          getLivescoresInplay(),
        ]);

        if (!isActive) {
          return;
        }

        if (Array.isArray(schedulePayload.matches)) {
          setScheduleMatches(schedulePayload.matches);
        }

        if (Array.isArray(livePayload.matches)) {
          setLiveMatches(livePayload.matches);
        }

        setDashboardNotice(
          livePayload.notice || schedulePayload.notice || ""
        );
      } catch {
        if (isActive) {
          setDashboardNotice("Feed Sportradar non disponibile. Uso fallback locale.");
        }
      }
    };

    loadDashboardFeeds();

    return () => {
      isActive = false;
    };
  }, []);

  const feedMatches = scheduleMatches?.length ? scheduleMatches : MATCHES;
  const topMatches = useMemo(
    () =>
      feedMatches
        .filter((m) => matchLeagueFilter(m, activeLeague))
        .slice(0, 4),
    [activeLeague, feedMatches]
  );

  const valueBets = useMemo(
    () => feedMatches.filter((m) => m.valueBet),
    [feedMatches]
  );
  const liveCount = Array.isArray(liveMatches) ? liveMatches.length : 3;
  const today = feedMatches.filter((m) => getMatchStatusBucket(m) === "today").length;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-orbitron font-black text-2xl md:text-3xl tracking-wide mb-1">
            TOP <span className="text-primary text-glow-green">FOOTBALL DATA</span>
          </h1>
          <p className="text-muted-foreground text-sm">La tua piattaforma di analisi calcistica data-driven</p>
          <div className="flex items-center gap-2 flex-wrap mt-3">
            {scheduleMatches && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Schedule Sportradar
              </span>
            )}
            {liveMatches && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                Live Sportradar
              </span>
            )}
            {dashboardNotice && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/50 text-muted-foreground border border-border/30">
                {dashboardNotice}
              </span>
            )}
          </div>
        </motion.div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Match Oggi", value: today, icon: Clock, color: "text-blue-400", path: "/modelli-predittivi" },
            { label: "Value Bet", value: valueBets.length, icon: TrendingUp, color: "text-primary", path: "/modelli-predittivi" },
            { label: "Partite Live", value: liveCount, icon: Zap, color: "text-destructive", path: "/dati-live" },
            { label: "Combo Premium", value: isPremium ? 3 : "🔒", icon: Crown, color: "text-accent", path: "/multi-bet" },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Link to={stat.path}>
                <GlassCard className="group cursor-pointer hover:border-primary/20 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <div className="font-orbitron font-black text-2xl text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                </GlassCard>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Top match + Quick filters */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick league filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {QUICK_LEAGUES.map((l) => (
                <button key={l} onClick={() => setActiveLeague(l)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    activeLeague === l
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
                  }`}>
                  {l}
                </button>
              ))}
            </div>

            {/* Top matches */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-foreground">Top Match del Giorno</h2>
                <Link to="/modelli-predittivi" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                  Vedi tutti <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-3">
                {topMatches.map((match, i) => (
                  <motion.div key={match.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                    <Link to={`/match/${match.id}`}>
                      <GlassCard className={`group cursor-pointer ${match.valueBet ? "hover:border-primary/30 glow-green-sm" : "hover:border-border"}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="text-center">
                              <span className="text-xs text-accent font-semibold block">{match.league}</span>
                              <span className="text-xs text-muted-foreground">{match.time}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm text-foreground truncate">{match.home} vs {match.away}</div>
                              <div className="flex items-center gap-2 mt-1">
                                {match.valueBet && <ValueBetBadge type={match.valueBet.type} edge={match.valueBet.edge} />}
                                {match.badges.slice(0, 1).map((b) => (
                                  <span key={b} className="text-xs px-2 py-0.5 rounded-full bg-secondary/50 text-muted-foreground">{b}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="text-right hidden sm:block">
                              <div className="text-xs text-muted-foreground">1 / X / 2</div>
                              <div className="text-xs font-bold text-foreground">{match.odds.home} / {match.odds.draw} / {match.odds.away}</div>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${match.confidence >= 75 ? "bg-primary/10 text-primary" : "bg-secondary/50 text-muted-foreground"}`}>
                              {match.confidence}%
                            </span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </div>
                      </GlassCard>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Continua analisi / preferiti */}
            {favorites.matches.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-foreground flex items-center gap-2">
                    <Star className="w-4 h-4 text-accent" /> I tuoi preferiti
                  </h2>
                  <Link to="/watchlist" className="text-xs text-primary flex items-center gap-1">Vedi <ChevronRight className="w-3 h-3" /></Link>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {favorites.matches.slice(0, 3).map((id) => {
                    const m = feedMatches.find((x) => String(x.id) === String(id));
                    if (!m) return null;
                    return (
                      <Link key={id} to={`/match/${id}`}
                        className="text-xs px-3 py-2 glass rounded-lg text-foreground hover:border-primary/20 transition-all">
                        {m.home} vs {m.away}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-5">
            {/* Alert recenti */}
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <h3 className="font-semibold text-sm text-foreground">Alert Recenti</h3>
              </div>
              <div className="space-y-3">
                {ALERTS.map((a, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <a.icon className={`w-3 h-3 ${a.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-foreground leading-relaxed">{a.msg}</p>
                      <span className="text-xs text-muted-foreground/70">{a.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Value Bet oggi */}
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Value Bet Evidenziate</h3>
              </div>
              <div className="space-y-2">
                {valueBets.slice(0, 3).map((m) => (
                  <Link key={m.id} to={`/match/${m.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-primary/5 border border-primary/10 hover:border-primary/30 transition-all group">
                    <div>
                      <div className="text-xs font-semibold text-foreground">{m.home} vs {m.away}</div>
                      <div className="text-xs text-primary font-semibold">{m.valueBet.type} @{m.odds[m.valueBet.type === "1" ? "home" : m.valueBet.type === "2" ? "away" : "draw"]}</div>
                    </div>
                    <span className="text-xs font-bold text-primary">+{m.valueBet.edge}%</span>
                  </Link>
                ))}
              </div>
            </GlassCard>

            {/* Premium CTA o area premium */}
            {!isPremium ? (
              <GlassCard className="border-accent/20 text-center">
                <Crown className="w-8 h-8 text-accent mx-auto mb-2" />
                <h3 className="font-orbitron font-bold text-sm text-accent mb-1">Sblocca Premium</h3>
                <p className="text-xs text-muted-foreground mb-3">Combo algoritmiche, alert avanzati e analisi complete</p>
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
                  <Link to="/multi-bet" className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/40 hover:bg-secondary/60 transition-all group">
                    <span className="text-xs text-foreground">Combo del giorno</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                  </Link>
                  <Link to="/dati-live" className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/40 hover:bg-secondary/60 transition-all group">
                    <span className="text-xs text-foreground">Alert live attivi</span>
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
