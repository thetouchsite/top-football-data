import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Filter, LayoutGrid, LayoutList, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import SectionHeader from "@/components/shared/SectionHeader";
import DataStatusChips from "@/components/shared/DataStatusChips";
import MatchCard from "@/components/match/MatchCard";
import LiveMiniWidget from "@/components/match/LiveMiniWidget";
import { getLivescoresInplay, getScheduleWindow } from "@/api/football";
import {
  getLeagueBucket,
  getMatchStatusBucket,
  matchLeagueFilter,
  sortMatchesByCriterion,
} from "@/lib/football-filters";
import { isDatiLiveFeatureEnabled } from "@/lib/feature-flags";

const STATUS_TABS = [
  { key: "all", label: "Tutti" },
  { key: "today", label: "Oggi" },
  { key: "tomorrow", label: "Domani" },
  { key: "weekend", label: "Weekend" },
];

const SORT_OPTIONS = [
  { value: "time", label: "Orario" },
  { value: "confidence", label: "Confidenza" },
  { value: "odds", label: "Quota" },
  { value: "value", label: "Valore" },
];
const MAX_VISIBLE_MATCHES = 24;

function sanitizeMatches(matches) {
  return Array.isArray(matches) ? matches : [];
}

export default function ModelliPredittivi() {
  const [apiMatches, setApiMatches] = useState([]);
  const [scheduleMeta, setScheduleMeta] = useState(null);
  const [liveMatch, setLiveMatch] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState("");
  const [league, setLeague] = useState("all");
  const [showValueOnly, setShowValueOnly] = useState(false);
  const [sort, setSort] = useState("time");
  const [view, setView] = useState("grid");
  const [statusTab, setStatusTab] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadFeeds = async () => {
      setScheduleLoading(true);
      setScheduleError("");

      try {
        const schedulePayload = await getScheduleWindow(14);
        const livePayload = isDatiLiveFeatureEnabled()
          ? await getLivescoresInplay().catch(() => null)
          : null;

        if (!isActive) {
          return;
        }

        setApiMatches(sanitizeMatches(schedulePayload.matches));
        setScheduleMeta({
          provider: schedulePayload.provider,
          source: schedulePayload.source,
          freshness: schedulePayload.freshness,
          window: schedulePayload.window || null,
          notice: schedulePayload.notice || "",
          competitions: schedulePayload.competitions || [],
          oddsProvider:
            schedulePayload.matches?.[0]?.odds_provider || "not_available_with_current_feed",
          predictionProvider:
            schedulePayload.matches?.[0]?.prediction_provider || "derived_internal_model",
        });
        setLiveMatch(sanitizeMatches(livePayload?.matches)[0] || null);
      } catch (error) {
        if (isActive) {
          setApiMatches([]);
          setScheduleError(error.message || "Calendario provider non disponibile.");
        }
      } finally {
        if (isActive) {
          setScheduleLoading(false);
        }
      }
    };

    loadFeeds();

    return () => {
      isActive = false;
    };
  }, []);

  const availableLeagues = useMemo(
    () =>
      Array.from(
        new Set(apiMatches.map((match) => getLeagueBucket(match.league)).filter(Boolean))
      ).sort(),
    [apiMatches]
  );

  const filteredMatches = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return sortMatchesByCriterion(
      apiMatches.filter((match) => {
        if (!matchLeagueFilter(match, league)) return false;
        if (showValueOnly && !match.valueBet) return false;
        if (statusTab !== "all" && getMatchStatusBucket(match) !== statusTab) return false;
        if (
          normalizedSearch &&
          !match.home.toLowerCase().includes(normalizedSearch) &&
          !match.away.toLowerCase().includes(normalizedSearch)
        ) {
          return false;
        }
        return true;
      }),
      sort
    );
  }, [apiMatches, league, search, showValueOnly, sort, statusTab]);

  const visibleMatches = useMemo(
    () => filteredMatches.slice(0, MAX_VISIBLE_MATCHES),
    [filteredMatches]
  );
  const nextAvailableMatch = useMemo(
    () => sortMatchesByCriterion([...apiMatches], "time")[0] || null,
    [apiMatches]
  );

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          title="MODELLI PREDITTIVI"
          accentWord="PREDITTIVI"
          subtitle="Analisi pre-match basata sul feed Sportmonks e su modelli derivati dichiarati."
          icon={TrendingUp}
        />

        <div className="mb-5 space-y-3">
          <DataStatusChips
            provider={scheduleMeta?.provider}
            source={scheduleMeta?.source}
            freshness={scheduleMeta?.freshness}
            predictionProvider={scheduleMeta?.predictionProvider}
            oddsProvider={scheduleMeta?.oddsProvider}
            notice={scheduleMeta?.notice}
          />
          <div className="flex items-center gap-2 flex-wrap">
            {scheduleMeta?.window?.from && (
              <span className="text-xs px-2 py-1 rounded-full bg-secondary/50 text-muted-foreground border border-border/30">
                Finestra {scheduleMeta.window.from}
                {scheduleMeta.window.to ? ` -> ${scheduleMeta.window.to}` : ""}
              </span>
            )}
            {scheduleLoading && (
              <span className="text-xs px-2 py-1 rounded-full bg-secondary/50 text-muted-foreground border border-border/30">
                Caricamento calendario...
              </span>
            )}
            {scheduleError && (
              <span className="text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                {scheduleError}
              </span>
            )}
            {showValueOnly && (
              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                Solo Value Bet derivate
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusTab(tab.key)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                statusTab === tab.key
                  ? "bg-primary/10 border border-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-secondary/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="glass rounded-xl p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-36">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cerca squadra..."
                className="w-full bg-secondary/60 border border-border/50 rounded-lg pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 h-9"
              />
            </div>

            <Select value={league} onValueChange={setLeague}>
              <SelectTrigger className="w-40 h-9 bg-secondary/60 border-border/50 text-xs">
                <SelectValue placeholder="Competizione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le competizioni</SelectItem>
                {availableLeagues.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-36 h-9 bg-secondary/60 border-border/50 text-xs">
                <SelectValue placeholder="Ordina" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Switch checked={showValueOnly} onCheckedChange={setShowValueOnly} />
              <span className="text-xs text-muted-foreground whitespace-nowrap">Solo Value</span>
            </div>

            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => setView("grid")}
                className={`p-2 rounded-lg transition-all ${
                  view === "grid"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary/50"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setView("list")}
                className={`p-2 rounded-lg transition-all ${
                  view === "list"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary/50"
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {filteredMatches.length} match trovati
            {filteredMatches.length > visibleMatches.length
              ? ` · mostro i primi ${visibleMatches.length}`
              : ""}
          </span>
          {scheduleMeta?.competitions?.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/50 text-muted-foreground border border-border/30">
              {scheduleMeta.competitions.length} competizioni nel feed
            </span>
          )}
          {filteredMatches.length > visibleMatches.length && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Affina filtri o ricerca per vedere il resto del palinsesto
            </span>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {view === "grid" ? (
              <div className="space-y-4">
                {visibleMatches.map((match, index) => (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06 }}
                  >
                    <MatchCard match={match} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="glass rounded-xl overflow-hidden">
                {visibleMatches.map((match) => (
                  <MatchCard key={match.id} match={match} compact />
                ))}
              </div>
            )}

            {filteredMatches.length === 0 && !scheduleLoading && (
              <div className="glass rounded-xl p-16 text-center">
                <Filter className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Nessun match disponibile</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {nextAvailableMatch
                    ? `Il feed non ha match nel filtro selezionato. Prossima fixture disponibile: ${nextAvailableMatch.home} vs ${nextAvailableMatch.away} il ${nextAvailableMatch.date} alle ${nextAvailableMatch.time}.`
                    : "Il feed corrente non ha restituito partite nel perimetro selezionato."}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {liveMatch ? (
              <div className="space-y-3">
                <DataStatusChips
                  provider={liveMatch.provider}
                  source={liveMatch.source}
                  freshness={liveMatch.freshness}
                  competition={liveMatch.competition}
                  predictionProvider={liveMatch.prediction_provider}
                  oddsProvider={liveMatch.odds_provider}
                  lineupStatus={liveMatch.lineup_status}
                />
                <LiveMiniWidget match={liveMatch} />
              </div>
            ) : (
              <div className="glass rounded-xl p-4">
                <h3 className="font-semibold text-sm text-foreground mb-2">Live center</h3>
                <p className="text-xs text-muted-foreground">
                  Nessun match live disponibile nel feed corrente.
                </p>
              </div>
            )}

            <div className="glass rounded-xl p-4">
              <h3 className="font-semibold text-sm text-foreground mb-3">Prossimi match</h3>
              <div className="space-y-2">
                {visibleMatches.slice(0, 4).map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center justify-between text-xs p-2 rounded-lg bg-secondary/30"
                  >
                    <span className="text-foreground font-medium">
                      {match.home} vs {match.away}
                    </span>
                    <span className="text-muted-foreground">{match.time}</span>
                  </div>
                ))}
                {apiMatches.length === 0 && !scheduleLoading && (
                  <p className="text-xs text-muted-foreground">
                    Nessun pre-match disponibile nel feed corrente.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
