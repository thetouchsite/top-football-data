import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Radio, Circle } from "lucide-react";
import SectionHeader from "@/components/shared/SectionHeader";
import GlassCard from "@/components/shared/GlassCard";
import DataStatusChips from "@/components/shared/DataStatusChips";
import LiveStatBar from "@/components/live/LiveStatBar";
import DangerIndex from "@/components/live/DangerIndex";
import LiveOddsGrid from "@/components/live/LiveOddsGrid";
import LiveTimeline from "@/components/live/LiveTimeline";
import { getLivescoresInplay } from "@/api/football";
import { isDatiLiveFeatureEnabled } from "@/lib/feature-flags";

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
  const [liveMatches, setLiveMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [loadingLive, setLoadingLive] = useState(true);
  const [liveError, setLiveError] = useState("");
  const [liveMeta, setLiveMeta] = useState(null);

  useEffect(() => {
    if (!isDatiLiveFeatureEnabled()) {
      setLoadingLive(false);
      return;
    }

    let isActive = true;

    const loadLiveMatches = async ({ silent = false } = {}) => {
      if (!silent) {
        setLoadingLive(true);
      }

      try {
        const payload = await getLivescoresInplay();

        if (!isActive) {
          return;
        }

        const nextMatches = Array.isArray(payload.matches) ? payload.matches : [];
        setLiveMatches(nextMatches);
        setSelectedMatchId((currentId) => {
          if (!nextMatches.length) {
            return "";
          }

          if (currentId && nextMatches.some((match) => match.id === currentId)) {
            return currentId;
          }

          return nextMatches[0].id;
        });
        setLiveMeta({
          provider: payload.provider,
          source: payload.source,
          freshness: payload.freshness,
          notice: payload.notice || "",
        });
        setLiveError("");
      } catch (error) {
        if (isActive) {
          setLiveMatches([]);
          setSelectedMatchId("");
          setLiveError(error.message || "Feed live non disponibile.");
        }
      } finally {
        if (isActive) {
          setLoadingLive(false);
        }
      }
    };

    loadLiveMatches();
    const intervalId = window.setInterval(() => {
      loadLiveMatches({ silent: true });
    }, 10_000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const selectedMatch = useMemo(
    () => liveMatches.find((match) => match.id === selectedMatchId) || null,
    [liveMatches, selectedMatchId]
  );

  const m = selectedMatch;
  const stats = m?.stats || EMPTY_STATS;
  const liveProbabilities = m?.liveProbabilities || EMPTY_PROBABILITIES;

  return (
    <div className="app-page">
      <div className="app-content">
        <SectionHeader
          title="DATI LIVE"
          accentWord="LIVE"
          subtitle="Statistiche in tempo reale con feed Sportmonks, refresh incrementale e freshness dichiarata."
          icon={Zap}
        />

        <div className="mb-4 space-y-3">
          <DataStatusChips
            provider={m?.provider || liveMeta?.provider}
            source={m?.source || liveMeta?.source}
            freshness={m?.freshness || liveMeta?.freshness}
            competition={m?.competition}
            predictionProvider={m?.prediction_provider}
            oddsProvider={m?.odds_provider}
            lineupStatus={m?.lineup_status}
            notice={liveMeta?.notice}
          />
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {loadingLive && (
              <span className="px-2 py-1 rounded-full bg-secondary/60 text-muted-foreground border border-border/40">
                Caricamento feed live...
              </span>
            )}
            {m?.round && (
              <span className="px-2 py-1 rounded-full bg-secondary/60 text-muted-foreground border border-border/40">
                {m.round}
              </span>
            )}
            {m?.country && (
              <span className="px-2 py-1 rounded-full bg-secondary/60 text-muted-foreground border border-border/40">
                {m.country}
              </span>
            )}
            {m?.state && (
              <span className="px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                {m.state}
              </span>
            )}
            {liveError && (
              <span className="px-2 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                {liveError}
              </span>
            )}
          </div>
        </div>

        {liveMatches.length > 0 ? (
          <>
            <div className="scrollbar-hide mb-6 flex max-w-full min-w-0 gap-3 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]">
              {liveMatches.map((liveMatch) => (
                <button
                  key={liveMatch.id}
                  type="button"
                  onClick={() => setSelectedMatchId(liveMatch.id)}
                  className={`glass w-[min(18rem,calc(100vw-2rem))] shrink-0 rounded-xl px-4 py-3 text-left transition-all ${
                    selectedMatchId === liveMatch.id
                      ? "border-primary/30 glow-green-sm"
                      : "hover:border-border"
                  }`}
                >
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Radio className="h-3 w-3 shrink-0 animate-pulse text-destructive" />
                    <span className="text-xs font-bold uppercase text-destructive">Live</span>
                    <span className="ml-1 truncate text-xs text-accent">{liveMatch.league}</span>
                  </div>
                  <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                    <span className="truncate text-xs font-semibold text-foreground">{liveMatch.home}</span>
                    <span className="font-orbitron text-sm font-black text-foreground">
                      {liveMatch.homeScore}-{liveMatch.awayScore}
                    </span>
                    <span className="truncate text-xs font-semibold text-foreground">{liveMatch.away}</span>
                    <span className="text-xs font-bold text-primary sm:ml-1">{liveMatch.minute}'</span>
                  </div>
                </button>
              ))}
            </div>

            {m && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={m.id}
                >
                  <GlassCard className="mb-6 border-primary/20">
                    <div className="flex flex-col flex-wrap gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 flex-1 flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
                        <div className="flex min-w-0 max-w-full items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border/50 bg-secondary/80 text-xs font-bold">
                            {m.homeShort}
                          </div>
                          <span className="truncate text-lg font-bold text-foreground">{m.home}</span>
                        </div>
                        <div className="shrink-0 text-center">
                          <div className="font-orbitron text-4xl font-black text-foreground">
                            {m.homeScore} - {m.awayScore}
                          </div>
                          <div className="mt-1 flex items-center justify-center gap-1.5">
                            <Circle className="h-2.5 w-2.5 animate-pulse fill-primary text-primary" />
                            <span className="font-orbitron text-base font-bold text-primary">
                              {m.minute}'
                            </span>
                          </div>
                        </div>
                        <div className="flex min-w-0 max-w-full items-center gap-3">
                          <span className="truncate text-lg font-bold text-foreground">{m.away}</span>
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border/50 bg-secondary/80 text-xs font-bold">
                            {m.awayShort}
                          </div>
                        </div>
                      </div>
                      <div className="flex min-w-0 flex-col gap-1 text-left sm:text-right">
                        <span className="text-xs text-accent">
                          {m.league}
                          {m.country ? ` · ${m.country}` : ""}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          xG Live stimato: {stats.xgLive.home} - {stats.xgLive.away}
                        </span>
                        {(liveProbabilities.home ||
                          liveProbabilities.draw ||
                          liveProbabilities.away) > 0 ? (
                          <span className="text-xs text-primary">
                            1X2 live: {liveProbabilities.home}% / {liveProbabilities.draw}% /{" "}
                            {liveProbabilities.away}%
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Probabilities live non presenti nel feed corrente.
                          </span>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>

                <div className="grid min-w-0 gap-6 lg:grid-cols-3">
                  <div className="min-w-0 space-y-5 lg:col-span-2">
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
                        <div className="absolute left-3 top-2 max-w-[45%] truncate rounded bg-black/40 px-2 py-1 text-xs font-bold text-white/80">
                          {m.home}
                        </div>
                        <div className="absolute bottom-2 right-3 max-w-[45%] truncate rounded bg-black/40 px-2 py-1 text-xs font-bold text-white/80">
                          {m.away}
                        </div>
                      </div>
                    </GlassCard>

                    <GlassCard>
                      <h3 className="font-semibold text-sm text-foreground mb-4">
                        Statistiche Live
                      </h3>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                        <div className="space-y-3">
                          <LiveStatBar label="Tiri" home={stats.shots.home} away={stats.shots.away} />
                          <LiveStatBar
                            label="Tiri in porta"
                            home={stats.shotsOnTarget.home}
                            away={stats.shotsOnTarget.away}
                          />
                          <LiveStatBar label="Corner" home={stats.corners.home} away={stats.corners.away} />
                          <LiveStatBar label="Attacchi" home={stats.attacks.home} away={stats.attacks.away} />
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
                          <LiveStatBar label="Falli" home={stats.fouls.home} away={stats.fouls.away} />
                          <LiveStatBar
                            label="Ammonizioni"
                            home={stats.yellowCards.home}
                            away={stats.yellowCards.away}
                          />
                        </div>
                      </div>
                    </GlassCard>

                    <LiveTimeline events={m.events || []} home={m.home} away={m.away} />
                  </div>

                  <div className="min-w-0 space-y-5">
                    <DangerIndex
                      value={m.dangerIndex}
                      message={m.dangerMessage}
                      history={m.dangerHistory}
                    />
                    <LiveOddsGrid odds={m.liveOdds} oddsProvider={m.odds_provider} />
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <GlassCard>
            <h3 className="font-semibold text-sm text-foreground mb-2">Nessuna partita live</h3>
            <p className="text-xs text-muted-foreground">
              {liveMeta?.notice ||
                "Il feed corrente non restituisce match in-play nel perimetro supportato."}
            </p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
