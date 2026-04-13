import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Radio, Circle } from "lucide-react";
import SectionHeader from "@/components/shared/SectionHeader";
import GlassCard from "@/components/shared/GlassCard";
import LiveStatBar from "@/components/live/LiveStatBar";
import DangerIndex from "@/components/live/DangerIndex";
import LiveOddsMatrix from "@/components/live/LiveOddsMatrix";
import LiveTimeline from "@/components/live/LiveTimeline";
import { LIVE_MATCHES } from "@/lib/mockData";
import { getLivescoresInplay } from "@/api/football";

const EMPTY_STATS = {
  shots: { home: 0, away: 0 },
  shotsOnTarget: { home: 0, away: 0 },
  corners: { home: 0, away: 0 },
  attacks: { home: 0, away: 0 },
  dangerousAttacks: { home: 0, away: 0 },
  possession: { home: 50, away: 50 },
  fouls: { home: 0, away: 0 },
  yellowCards: { home: 0, away: 0 },
  xgLive: { home: 0, away: 0 },
};

const EMPTY_PROBABILITIES = {
  home: 0,
  draw: 0,
  away: 0,
};

export default function DatiLive() {
  const [liveMatches, setLiveMatches] = useState(LIVE_MATCHES);
  const [selectedMatch, setSelectedMatch] = useState(LIVE_MATCHES[0]);
  const [loadingLive, setLoadingLive] = useState(true);
  const [liveError, setLiveError] = useState("");
  const [liveSource, setLiveSource] = useState("mock_demo");
  const [liveNotice, setLiveNotice] = useState("");
  const m = selectedMatch;
  const stats = m.stats || EMPTY_STATS;
  const liveProbabilities = m.liveProbabilities || EMPTY_PROBABILITIES;

  useEffect(() => {
    let isActive = true;

    const loadLiveMatches = async () => {
      setLoadingLive(true);
      setLiveError("");

      try {
        const payload = await getLivescoresInplay();

        if (
          isActive &&
          Array.isArray(payload.matches) &&
          payload.matches.length > 0
        ) {
          setLiveMatches(payload.matches);
          setSelectedMatch(payload.matches[0]);
          setLiveSource(payload.source || "sportradar_api");
          setLiveNotice(payload.notice || "");
        }
      } catch (error) {
        if (isActive) {
          setLiveError(error.message || "Feed live non disponibile.");
        }
      } finally {
        if (isActive) {
          setLoadingLive(false);
        }
      }
    };

    loadLiveMatches();

    return () => {
      isActive = false;
    };
  }, []);

  const sourceBadge = useMemo(() => {
    if (loadingLive) return "Caricamento feed live...";
    if (liveSource === "local_snapshot") return "Snapshot locale Serie A";
    if (liveSource === "sportradar_api" && m.apiLoaded)
      return "Dati Sportradar";
    return "Demo locale";
  }, [liveSource, loadingLive, m.apiLoaded]);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          title="DATI LIVE"
          accentWord="LIVE"
          subtitle="Statistiche in tempo reale delle partite in corso"
          icon={Zap}
        />

        <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
          <span className="px-2 py-1 rounded-full bg-secondary/60 text-muted-foreground border border-border/40">
            {sourceBadge}
          </span>
          {m.round && (
            <span className="px-2 py-1 rounded-full bg-secondary/60 text-muted-foreground border border-border/40">
              {m.round}
            </span>
          )}
          {m.country && (
            <span className="px-2 py-1 rounded-full bg-secondary/60 text-muted-foreground border border-border/40">
              {m.country}
            </span>
          )}
          {m.state && (
            <span className="px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              {m.state}
            </span>
          )}
          {liveError && (
            <span className="px-2 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
              {liveError}
            </span>
          )}
          {liveNotice && (
            <span className="px-2 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
              {liveNotice}
            </span>
          )}
        </div>

        {/* Live match selector */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
          {liveMatches.map((lm) => (
            <button
              key={lm.id}
              onClick={() => setSelectedMatch(lm)}
              className={`flex-shrink-0 glass rounded-xl px-4 py-3 text-left transition-all ${selectedMatch.id === lm.id ? "border-primary/30 glow-green-sm" : "hover:border-border"}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Radio className="w-3 h-3 text-destructive animate-pulse" />
                <span className="text-xs text-destructive font-bold uppercase">
                  Live
                </span>
                <span className="text-xs text-accent ml-1">{lm.league}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">
                  {lm.home}
                </span>
                <span className="font-orbitron text-sm font-black text-foreground">
                  {lm.homeScore}-{lm.awayScore}
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {lm.away}
                </span>
                <span className="text-xs text-primary font-bold ml-1">
                  {lm.minute}'
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Main score */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          key={m.id}
        >
          <GlassCard className="mb-6 border-primary/20">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-secondary/80 border border-border/50 flex items-center justify-center text-xs font-bold">
                    {m.homeShort}
                  </div>
                  <span className="font-bold text-lg text-foreground">
                    {m.home}
                  </span>
                </div>
                <div className="text-center">
                  <div className="font-orbitron text-4xl font-black text-foreground">
                    {m.homeScore} - {m.awayScore}
                  </div>
                  <div className="flex items-center gap-1.5 justify-center mt-1">
                    <Circle className="w-2.5 h-2.5 fill-primary text-primary animate-pulse" />
                    <span className="font-orbitron text-base font-bold text-primary">
                      {m.minute}'
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg text-foreground">
                    {m.away}
                  </span>
                  <div className="w-12 h-12 rounded-full bg-secondary/80 border border-border/50 flex items-center justify-center text-xs font-bold">
                    {m.awayShort}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <span className="text-xs text-accent">
                  {m.league}
                  {m.country ? ` · ${m.country}` : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  xG Live: {stats.xgLive.home} - {stats.xgLive.away}
                </span>
                {(liveProbabilities.home ||
                  liveProbabilities.draw ||
                  liveProbabilities.away) > 0 ? (
                  <span className="text-xs text-primary">
                    1X2 live: {liveProbabilities.home}% /{" "}
                    {liveProbabilities.draw}% / {liveProbabilities.away}%
                  </span>
                ) : null}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* Mini pitch */}
            <GlassCard>
              <div className="relative w-full h-48 rounded-xl overflow-hidden bg-gradient-to-b from-green-900/40 via-green-800/30 to-green-900/40 border border-green-700/20">
                <div className="absolute inset-0">
                  <div className="absolute left-0 right-0 top-1/2 border-t border-green-600/30" />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-green-600/30" />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-12 border-b border-l border-r border-green-600/30" />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-12 border-t border-l border-r border-green-600/30" />
                </div>
                <div className="absolute top-1/3 left-[65%] w-4 h-4 rounded-full bg-primary/80 animate-pulse-glow" />
                <div className="absolute top-1/3 left-[65%] -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-primary/10 animate-pulse" />
                <div className="absolute top-2 left-3 text-xs font-bold text-white/80 bg-black/40 px-2 py-1 rounded">
                  {m.home}
                </div>
                <div className="absolute bottom-2 right-3 text-xs font-bold text-white/80 bg-black/40 px-2 py-1 rounded">
                  {m.away}
                </div>
              </div>
            </GlassCard>

            {/* Stats */}
            <GlassCard>
              <h3 className="font-semibold text-sm text-foreground mb-4">
                Statistiche Live
              </h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <div className="space-y-3">
                  <LiveStatBar
                    label="Tiri"
                    home={stats.shots.home}
                    away={stats.shots.away}
                  />
                  <LiveStatBar
                    label="Tiri in porta"
                    home={stats.shotsOnTarget.home}
                    away={stats.shotsOnTarget.away}
                  />
                  <LiveStatBar
                    label="Corner"
                    home={stats.corners.home}
                    away={stats.corners.away}
                  />
                  <LiveStatBar
                    label="Attacchi"
                    home={stats.attacks.home}
                    away={stats.attacks.away}
                  />
                </div>
                <div className="space-y-3">
                  <LiveStatBar
                    label="Att. Pericolosi"
                    home={stats.dangerousAttacks.home}
                    away={stats.dangerousAttacks.away}
                  />
                  <LiveStatBar
                    label="Possesso %"
                    home={stats.possession.home}
                    away={stats.possession.away}
                  />
                  <LiveStatBar
                    label="Falli"
                    home={stats.fouls.home}
                    away={stats.fouls.away}
                  />
                  <LiveStatBar
                    label="Ammonizioni"
                    home={stats.yellowCards.home}
                    away={stats.yellowCards.away}
                  />
                </div>
              </div>
            </GlassCard>

            <LiveTimeline events={m.events} home={m.home} away={m.away} />
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <DangerIndex
              value={m.dangerIndex}
              message={m.dangerMessage}
              history={m.dangerHistory}
            />
            <LiveOddsMatrix odds={m.liveOdds} />
          </div>
        </div>
      </div>
    </div>
  );
}
