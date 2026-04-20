import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Filter, LayoutGrid, LayoutList, Search, Send, Crown } from "lucide-react";
import { Link } from "@/lib/router-compat";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import PageIntro from "@/components/shared/PageIntro";
import FeedMetaPanel from "@/components/shared/FeedMetaPanel";
import DataStatusChips from "@/components/shared/DataStatusChips";
import MatchCard from "@/components/match/MatchCard";
import GlassCard from "@/components/shared/GlassCard";
import ConfidenceBar from "@/components/shared/ConfidenceBar";
import { getScheduleWindow } from "@/api/football";
import {
  getLeagueBucket,
  getMatchStatusBucket,
  matchLeagueFilter,
  sortMatchesByCriterion,
} from "@/lib/football-filters";

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
const TELEGRAM_URL = String(process.env.NEXT_PUBLIC_TELEGRAM_URL || "").trim();

function sanitizeMatches(matches) {
  return Array.isArray(matches) ? matches : [];
}

function getValueCandidate(match) {
  if (!match) {
    return null;
  }
  if (match.valueMarkets?.primary && Number.isFinite(match.valueMarkets.primary.edge)) {
    return {
      type: match.valueMarkets.primary.type,
      edge: match.valueMarkets.primary.edge,
      source: "math",
    };
  }
  if (match.valueBet && Number.isFinite(match.valueBet.edge)) {
    return {
      type: match.valueBet.type,
      edge: match.valueBet.edge,
      source: "fallback",
    };
  }
  return null;
}

export default function ModelliPredittivi() {
  const [apiMatches, setApiMatches] = useState([]);
  const [scheduleMeta, setScheduleMeta] = useState(null);
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
  const topValueMatches = useMemo(
    () =>
      filteredMatches
        .map((match) => ({ match, candidate: getValueCandidate(match) }))
        .filter((entry) => entry.candidate)
        .sort((left, right) => right.candidate.edge - left.candidate.edge)
        .slice(0, 3),
    [filteredMatches]
  );
  const highConfidenceMatches = useMemo(
    () =>
      [...filteredMatches]
        .filter((match) => Number.isFinite(match.confidence))
        .sort((left, right) => (right.confidence || 0) - (left.confidence || 0))
        .slice(0, 3),
    [filteredMatches]
  );

  const feedSummaryLine = useMemo(() => {
    if (scheduleLoading) return "Caricamento calendario…";
    if (scheduleError) return "Errore feed — vedi messaggio sotto";
    const p = scheduleMeta?.provider || "—";
    const st = scheduleMeta?.freshness?.state || "—";
    return `${p} · freshness ${st} · ${apiMatches.length} match in finestra`;
  }, [scheduleLoading, scheduleError, scheduleMeta, apiMatches.length]);

  return (
    <div className="app-page">
      <div className="app-content">
        <PageIntro
          title="MODELLI PREDITTIVI"
          accentWord="PREDITTIVI"
          subtitle="Analisi pre-match sul feed Sportmonks; modelli derivati quando il piano non espone predictions."
          icon={TrendingUp}
        />

        {scheduleError && (
          <div className="mb-3 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {scheduleError}
          </div>
        )}

        <div className="mb-8">
          <FeedMetaPanel summary={feedSummaryLine} label="Stato feed dati">
            <DataStatusChips
              provider={scheduleMeta?.provider}
              source={scheduleMeta?.source}
              freshness={scheduleMeta?.freshness}
              predictionProvider={scheduleMeta?.predictionProvider}
              oddsProvider={scheduleMeta?.oddsProvider}
              notice={scheduleMeta?.notice}
            />
            <div className="flex flex-wrap items-center gap-2">
              {scheduleMeta?.window?.from && (
                <span className="text-xs px-2 py-1 rounded-full bg-secondary/50 text-muted-foreground border border-border/30">
                  Finestra {scheduleMeta.window.from}
                  {scheduleMeta.window.to ? ` → ${scheduleMeta.window.to}` : ""}
                </span>
              )}
              {scheduleLoading && (
                <span className="text-xs px-2 py-1 rounded-full bg-secondary/50 text-muted-foreground border border-border/30">
                  Caricamento…
                </span>
              )}
              {showValueOnly && (
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Filtro: solo Value Bet disponibili
                </span>
              )}
            </div>
          </FeedMetaPanel>
        </div>

        <div className="mb-6 flex flex-wrap gap-1 rounded-lg bg-muted/25 p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusTab(tab.key)}
              className={`flex-shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                statusTab === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mb-6 flex min-w-0 flex-wrap items-center gap-2 border-b border-border/40 pb-4 md:gap-3">
            <div className="relative min-w-0 flex-1 basis-[min(100%,14rem)] sm:min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cerca squadra..."
                className="w-full bg-secondary/60 border border-border/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 h-8"
              />
            </div>

            <Select value={league} onValueChange={setLeague}>
              <SelectTrigger className="h-8 w-full min-w-0 shrink-0 bg-secondary/60 text-xs border-border/50 sm:w-[9.5rem]">
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
              <SelectTrigger className="h-8 w-full min-w-0 shrink-0 bg-secondary/60 text-xs border-border/50 sm:w-[8.5rem]">
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

            <div className="flex items-center gap-1.5">
              <Switch className="scale-90" checked={showValueOnly} onCheckedChange={setShowValueOnly} />
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">Value bet</span>
            </div>

            <div className="ml-auto flex items-center gap-0.5 rounded-md border border-border/35 p-0.5">
              <button
                type="button"
                aria-label="Vista griglia"
                onClick={() => setView("grid")}
                className={`rounded p-1.5 transition-colors ${
                  view === "grid"
                    ? "bg-primary/12 text-primary"
                    : "text-muted-foreground hover:bg-secondary/50"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Vista lista"
                onClick={() => setView("list")}
                className={`rounded p-1.5 transition-colors ${
                  view === "list"
                    ? "bg-primary/12 text-primary"
                    : "text-muted-foreground hover:bg-secondary/50"
                }`}
              >
                <LayoutList className="h-3.5 w-3.5" />
              </button>
            </div>
        </div>

        <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>
            {filteredMatches.length} match trovati
            {filteredMatches.length > visibleMatches.length
              ? ` · primi ${visibleMatches.length} mostrati`
              : ""}
          </span>
          {scheduleMeta?.competitions?.length > 0 && (
            <span className="text-muted-foreground/80">
              {scheduleMeta.competitions.length} competizioni nel feed
            </span>
          )}
          {filteredMatches.length > visibleMatches.length && (
            <span className="text-foreground/80">
              Affina filtri o ricerca per il resto del palinsesto
            </span>
          )}
        </div>

        <div className="grid min-w-0 gap-6 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2">
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
              <div className="overflow-hidden rounded-xl border border-border/40 divide-y divide-border/35 bg-secondary/5">
                {visibleMatches.map((match) => (
                  <MatchCard key={match.id} match={match} compact />
                ))}
              </div>
            )}

            {filteredMatches.length === 0 && !scheduleLoading && (
              <div className="rounded-xl border border-border/40 bg-secondary/5 p-16 text-center">
                <Filter className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                <p className="text-muted-foreground text-sm">Nessun match disponibile</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {nextAvailableMatch
                    ? `Il feed non ha match nel filtro selezionato. Prossima fixture disponibile: ${nextAvailableMatch.home} vs ${nextAvailableMatch.away} il ${nextAvailableMatch.date} alle ${nextAvailableMatch.time}.`
                    : "Il feed corrente non ha restituito partite nel perimetro selezionato."}
                </p>
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-4">
            <GlassCard variant="quiet">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Top Value Oggi</h3>
              <div className="space-y-2">
                {topValueMatches.length > 0 ? (
                  topValueMatches.map(({ match, candidate }) => (
                    <Link
                      key={match.id}
                      to={`/match/${encodeURIComponent(match.id)}`}
                      className="block rounded-lg bg-secondary/25 p-2 text-xs transition-colors hover:bg-secondary/45"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate font-semibold text-foreground">
                          {match.home} vs {match.away}
                        </span>
                        <span className="shrink-0 font-bold text-primary">+{candidate.edge}%</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Esito {candidate.type}</span>
                        <span>{candidate.source === "math" ? "feed+modello" : "fallback"}</span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Nessun value disponibile con i filtri correnti.
                  </p>
                )}
              </div>
            </GlassCard>

            <GlassCard variant="quiet">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Confidenza alta</h3>
              <div className="space-y-3">
                {highConfidenceMatches.length > 0 ? (
                  highConfidenceMatches.map((match) => (
                    <Link
                      key={`confidence-${match.id}`}
                      to={`/match/${encodeURIComponent(match.id)}`}
                      className="block rounded-lg bg-secondary/25 p-2 transition-colors hover:bg-secondary/45"
                    >
                      <div className="mb-1 text-xs font-semibold text-foreground truncate">
                        {match.home} vs {match.away}
                      </div>
                      <ConfidenceBar value={match.confidence} compact />
                    </Link>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Confidenza non disponibile con i filtri correnti.
                  </p>
                )}
              </div>
            </GlassCard>

            <GlassCard variant="quiet">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Prossimi match</h3>
              <div className="space-y-1.5">
                {visibleMatches.slice(0, 4).map((match) => (
                  <div
                    key={match.id}
                    className="flex min-w-0 items-center justify-between gap-2 rounded-md bg-secondary/25 px-2 py-1.5 text-xs"
                  >
                    <span className="min-w-0 truncate font-medium text-foreground">
                      {match.home} vs {match.away}
                    </span>
                    <span className="shrink-0 text-muted-foreground">{match.time}</span>
                  </div>
                ))}
                {apiMatches.length === 0 && !scheduleLoading && (
                  <p className="text-xs text-muted-foreground">
                    Nessun pre-match disponibile nel feed corrente.
                  </p>
                )}
              </div>
            </GlassCard>

            <GlassCard variant="quiet">
              <h3 className="mb-2 text-sm font-semibold text-foreground">Canale Telegram</h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Alert value e aggiornamenti rapidi direttamente sul canale ufficiale.
              </p>
              {TELEGRAM_URL ? (
                <a
                  href={TELEGRAM_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20"
                >
                  <Send className="h-3.5 w-3.5" />
                  Unisciti su Telegram
                </a>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Configura `NEXT_PUBLIC_TELEGRAM_URL` per mostrare la CTA.
                </p>
              )}
            </GlassCard>

            <GlassCard variant="quiet">
              <h3 className="mb-2 text-sm font-semibold text-foreground">Premium Insights</h3>
              <ul className="mb-3 space-y-1 text-xs text-muted-foreground">
                <li>- Priorità sui migliori segnali value.</li>
                <li>- Filtri avanzati su confidenza e mercati.</li>
                <li>- Accesso esteso ai prossimi moduli pro.</li>
              </ul>
              <Link
                to="/premium"
                className="inline-flex items-center gap-2 rounded-lg border border-accent/25 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent hover:bg-accent/20"
              >
                <Crown className="h-3.5 w-3.5" />
                Scopri Premium
              </Link>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
