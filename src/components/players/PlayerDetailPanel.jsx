"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, Goal, Handshake, Square, Star } from "lucide-react";
import { getPlayerProfile } from "@/api/football";
import FootballMediaImage from "@/components/shared/FootballMediaImage";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function StatCell({ label, value }) {
  return (
    <div className="rounded-lg border border-border/30 bg-secondary/20 p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold text-foreground">{value ?? "—"}</div>
    </div>
  );
}

function formatShortDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "n/d";
  const ts = Date.parse(raw);
  if (!Number.isFinite(ts)) return raw;
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "short",
  }).format(new Date(ts));
}

function getRatingBadgeClass(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "bg-secondary/50 text-muted-foreground";
  if (n >= 7) return "bg-emerald-500/90 text-white";
  if (n >= 6) return "bg-orange-500/90 text-white";
  return "bg-rose-500/90 text-white";
}

function formatBirthDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "n/d";
  const ts = Date.parse(raw);
  if (!Number.isFinite(ts)) return raw;
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(ts));
}

export default function PlayerDetailPanel({ fixtureId, player }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("overview");
  const [season, setSeason] = useState("");
  const [careerExpanded, setCareerExpanded] = useState(false);
  const [expandedHonorTeams, setExpandedHonorTeams] = useState({});
  const [selectedLeague, setSelectedLeague] = useState("__all__");

  useEffect(() => {
    let mounted = true;
    if (!fixtureId || !player?.id) return undefined;
    setLoading(true);
    setError("");
    getPlayerProfile({ fixtureId, playerId: player.id, teamName: player?.team })
      .then((payload) => {
        if (!mounted) return;
        setData(payload);
        setSeason(String(payload?.seasons?.[0]?.season || ""));
        setSelectedLeague("__all__");
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.message || "Errore caricamento profilo.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [fixtureId, player?.id]);

  const profile = data?.profile || player || {};
  const seasons = Array.isArray(data?.seasons) ? data.seasons : [];
  const selectedSeason = useMemo(
    () => seasons.find((row) => String(row?.season) === String(season)) || seasons[0] || null,
    [season, seasons],
  );
  const matchRows = Array.isArray(data?.matchStats) ? data.matchStats : [];
  const leagueOptions = useMemo(() => {
    const map = new Map();
    matchRows.forEach((row) => {
      const name = String(row?.league || "").trim();
      if (!name) return;
      if (!map.has(name)) {
        map.set(name, {
          name,
          media: row?.leagueMedia || null,
        });
      }
    });
    return [...map.values()].sort((left, right) => left.name.localeCompare(right.name));
  }, [matchRows]);
  const filteredMatchRows = useMemo(() => {
    if (selectedLeague === "__all__") return matchRows;
    return matchRows.filter((row) => String(row?.league || "").trim() === selectedLeague);
  }, [matchRows, selectedLeague]);
  const careerRows = Array.isArray(data?.career) ? data.career : [];
  const honorsByTeam = Array.isArray(data?.honorsByTeam) ? data.honorsByTeam : [];
  const teamRangeIndex = useMemo(() => {
    const toTs = (value) => {
      const ts = Date.parse(String(value || ""));
      return Number.isFinite(ts) ? ts : null;
    };
    const map = new Map();
    careerRows.forEach((row) => {
      const key = String(row?.teamName || "").trim();
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, {
          minStartTs: null,
          maxEndTs: null,
          fallbackPeriods: [],
        });
      }
      const entry = map.get(key);
      const startTs = toTs(row?.startDate);
      const endTs = toTs(row?.endDate);
      if (startTs != null) {
        entry.minStartTs = entry.minStartTs == null ? startTs : Math.min(entry.minStartTs, startTs);
      }
      if (endTs != null) {
        entry.maxEndTs = entry.maxEndTs == null ? endTs : Math.max(entry.maxEndTs, endTs);
      }
      if (row?.period) {
        entry.fallbackPeriods.push(String(row.period));
      }
    });
    return map;
  }, [careerRows]);
  const teamHonorYearIndex = useMemo(() => {
    const parseYears = (raw) => {
      const text = String(raw || "");
      const years = text.match(/(19|20)\d{2}/g) || [];
      return years.map((y) => Number(y)).filter((v) => Number.isFinite(v));
    };
    const map = new Map();
    honorsByTeam.forEach((team) => {
      const key = String(team?.teamName || "").trim();
      if (!key) return;
      let minYear = null;
      let maxYear = null;
      (team?.trophies || []).forEach((trophy) => {
        parseYears(trophy?.year || "").forEach((year) => {
          minYear = minYear == null ? year : Math.min(minYear, year);
          maxYear = maxYear == null ? year : Math.max(maxYear, year);
        });
      });
      map.set(key, { minYear, maxYear });
    });
    return map;
  }, [honorsByTeam]);
  const careerTeamCards = useMemo(() => {
    const cardsMap = new Map();
    const currentTeamName = String(profile?.team || "").trim();
    careerRows.forEach((row) => {
      const key = String(row?.teamName || "").trim();
      if (!key) return;
      if (!cardsMap.has(key)) {
        cardsMap.set(key, {
          teamName: key,
          teamMedia: row?.teamMedia || null,
          trophies: [],
          trophiesCount: 0,
        });
      } else if (!cardsMap.get(key).teamMedia && row?.teamMedia) {
        cardsMap.get(key).teamMedia = row.teamMedia;
      }
    });
    honorsByTeam.forEach((team) => {
      const key = String(team?.teamName || "").trim();
      if (!key) return;
      if (!cardsMap.has(key)) {
        cardsMap.set(key, {
          teamName: key,
          teamMedia: team?.teamMedia || null,
          trophies: team?.trophies || [],
          trophiesCount: team?.trophiesCount || 0,
        });
      } else {
        const existing = cardsMap.get(key);
        existing.trophies = team?.trophies || [];
        existing.trophiesCount = team?.trophiesCount || 0;
        if (!existing.teamMedia && team?.teamMedia) {
          existing.teamMedia = team.teamMedia;
        }
      }
    });

    return [...cardsMap.values()].sort((left, right) => {
      const leftCurrent = left.teamName === currentTeamName ? 1 : 0;
      const rightCurrent = right.teamName === currentTeamName ? 1 : 0;
      if (leftCurrent !== rightCurrent) return rightCurrent - leftCurrent;
      if ((right.trophiesCount || 0) !== (left.trophiesCount || 0)) {
        return (right.trophiesCount || 0) - (left.trophiesCount || 0);
      }
      return left.teamName.localeCompare(right.teamName);
    });
  }, [careerRows, honorsByTeam, profile?.team]);
  const formatDateRange = (teamName) => {
    const row = teamRangeIndex.get(String(teamName || "").trim());
    if (!row) return "n/d";
    if (row.minStartTs != null || row.maxEndTs != null) {
      const startLabel =
        row.minStartTs != null ? new Date(row.minStartTs).toISOString().slice(0, 10) : "n/d";
      const endLabel =
        row.maxEndTs != null ? new Date(row.maxEndTs).toISOString().slice(0, 10) : "n/d";
      return `${startLabel} - ${endLabel}`;
    }
    const fallback = row.fallbackPeriods[0];
    if (fallback) return fallback;
    const years = teamHonorYearIndex.get(String(teamName || "").trim());
    if (years?.minYear != null || years?.maxYear != null) {
      const start = years?.minYear != null ? String(years.minYear) : "n/d";
      const end = years?.maxYear != null ? String(years.maxYear) : "n/d";
      return `${start} - ${end}`;
    }
    return "n/d";
  };
  const toggleHonorTeam = (teamName) => {
    const key = String(teamName || "");
    setExpandedHonorTeams((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/35 bg-secondary/20 p-3">
        <div className="flex items-center gap-3">
          <FootballMediaImage media={profile?.media} fallbackLabel={profile?.name} alt={profile?.name} size="md" />
          <div className="min-w-0">
            <div className="truncate text-base font-bold text-foreground">{profile?.name || "Giocatore"}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md border border-border/30 bg-secondary/25 px-2 py-0.5 text-[11px] text-muted-foreground">
                <FootballMediaImage media={profile?.nationalityMedia} fallbackLabel={profile?.nationality} alt="" size="xs" />
                <span>{profile?.nationality || "n/d"}</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-border/30 bg-secondary/25 px-2 py-0.5 text-[11px] text-muted-foreground">
                <FootballMediaImage media={profile?.teamMedia} fallbackLabel={profile?.team} alt="" size="xs" />
                <span className="truncate max-w-[120px]">{profile?.team || "Team"}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === "overview" ? "bg-primary text-primary-foreground" : "bg-secondary/30 text-muted-foreground"}`}
          onClick={() => setTab("overview")}
        >
          Overview
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === "career" ? "bg-primary text-primary-foreground" : "bg-secondary/30 text-muted-foreground"}`}
          onClick={() => setTab("career")}
        >
          Carriera
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === "matches" ? "bg-primary text-primary-foreground" : "bg-secondary/30 text-muted-foreground"}`}
          onClick={() => setTab("matches")}
        >
          Statistiche Partite
        </button>
      </div>

      {loading && <div className="text-xs text-muted-foreground">Caricamento dettagli giocatore...</div>}
      {!loading && error && <div className="text-xs text-rose-400">{error}</div>}

      {!loading && !error && tab === "overview" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <StatCell label="Posizione" value={profile?.position || profile?.pos || "n/d"} />
            <StatCell label="Piede" value={profile?.preferredFoot || "n/d"} />
            <StatCell label="Altezza" value={profile?.height || "n/d"} />
            <StatCell label="Peso" value={profile?.weight || "n/d"} />
            <StatCell label="Età" value={profile?.age || "n/d"} />
            <StatCell label="Nascita" value={formatBirthDate(profile?.dateOfBirth)} />
          </div>

          <div className="rounded-xl border border-border/35 bg-secondary/20 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-foreground">Statistiche stagione</div>
              {seasons.length > 0 && (
                <div className="w-44">
                  <Select value={season} onValueChange={setSeason}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Seleziona stagione" />
                    </SelectTrigger>
                    <SelectContent>
                      {seasons.map((row) => (
                        <SelectItem key={String(row.season)} value={String(row.season)}>
                          {row.season}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <StatCell label="Minuti" value={selectedSeason?.minutesPlayed} />
              <StatCell label="Presenze" value={selectedSeason?.appearances} />
              <StatCell label="Gol" value={selectedSeason?.goals} />
              <StatCell label="Assist" value={selectedSeason?.assists} />
              <StatCell label="Gialli" value={selectedSeason?.yellowCards} />
              <StatCell label="Rossi" value={selectedSeason?.redCards} />
              <StatCell label="Rating" value={selectedSeason?.rating ?? "—"} />
              <StatCell label="Panchina" value={selectedSeason?.bench} />
              <StatCell label="Passaggi" value={selectedSeason?.passes} />
              <StatCell label="Tiri totali" value={selectedSeason?.shotsTotal} />
              <StatCell label="Tiri in porta" value={selectedSeason?.shotsOnTarget} />
            </div>
          </div>

        </div>
      )}

      {!loading && !error && tab === "career" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-border/35 bg-secondary/20 p-3">
            <div className="mb-2 text-xs font-semibold text-foreground">Carriera completa</div>
            <div className="space-y-3">
              {careerTeamCards.length === 0 && (
                <div className="text-xs text-muted-foreground">Dati carriera non disponibili.</div>
              )}
              {careerTeamCards.map((team, index) => {
                const teamKey = String(team.teamName || "");
                const isCurrentTeam = index === 0;
                const hasTrophies = (team.trophiesCount || 0) > 0;
                const isExpanded = isCurrentTeam || expandedHonorTeams[teamKey];
                return (
                <div key={`honor-${team.teamName}`} className="rounded-lg border border-border/30 bg-secondary/20">
                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <FootballMediaImage media={team.teamMedia} fallbackLabel={team.teamName} alt="" size="xs" />
                        <div className="truncate text-xs font-semibold text-foreground">{team.teamName}</div>
                        <div className="text-[11px] text-muted-foreground">{team.trophiesCount} trofei</div>
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {formatDateRange(team.teamName)}
                      </div>
                    </div>
                    {!isCurrentTeam && hasTrophies && (
                      <button
                        type="button"
                        onClick={() => toggleHonorTeam(team.teamName)}
                        className="shrink-0 text-[11px] font-semibold text-primary"
                      >
                        {isExpanded ? "Chiudi trofei" : "Mostra trofei"}
                      </button>
                    )}
                  </div>
                  {isExpanded && hasTrophies && (
                    <div className="grid gap-2 border-t border-border/20 p-2 sm:grid-cols-2">
                      {team.trophies.map((trophy) => (
                        <div key={trophy.id} className="rounded-md border border-border/20 bg-secondary/20 p-2">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="truncate text-[11px] font-semibold text-foreground">{trophy.title}</span>
                            {trophy.outcome && (
                              <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] text-amber-300">
                                {trophy.outcome}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <FootballMediaImage media={trophy.leagueMedia} fallbackLabel={trophy.leagueName} alt="" size="xs" />
                            <span className="truncate">{trophy.leagueName || "Competizione"}</span>
                          </div>
                        {trophy.year ? (
                          <div className="mt-1 text-[10px] text-muted-foreground">{trophy.year}</div>
                        ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {!loading && !error && tab === "matches" && (
        <div className="rounded-xl border border-border/35 bg-secondary/20 p-3">
          <div className="mb-1 text-sm font-semibold text-foreground">Statistiche di partita</div>
          <div className="mb-3 text-[11px] text-muted-foreground">Stagione corrente</div>
          <div className="mb-3 w-full max-w-[260px]">
            <div className="flex items-center gap-2">
              <Select value={selectedLeague} onValueChange={setSelectedLeague}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Tutte le competizioni" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tutte le competizioni</SelectItem>
                  {leagueOptions.map((option) => (
                    <SelectItem key={option.name} value={option.name}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                Tot: {filteredMatchRows.length}
              </span>
            </div>
          </div>
          {filteredMatchRows.length === 0 && (
            <div className="text-xs text-muted-foreground">Match stats non disponibili per questo giocatore.</div>
          )}
          <div className="mb-2 hidden md:grid md:grid-cols-[minmax(0,1fr)_72px_repeat(5,44px)_56px] md:items-center md:gap-2 md:px-2 text-[10px] text-muted-foreground">
            <span>Partita</span>
            <span className="text-center">Ris</span>
            <span className="flex items-center justify-center"><Clock3 className="h-3.5 w-3.5" /></span>
            <span className="flex items-center justify-center"><Goal className="h-3.5 w-3.5" /></span>
            <span className="flex items-center justify-center"><Handshake className="h-3.5 w-3.5" /></span>
            <span className="flex items-center justify-center"><Square className="h-3.5 w-3.5 text-yellow-400" /></span>
            <span className="flex items-center justify-center"><Square className="h-3.5 w-3.5 text-rose-500" /></span>
            <span className="flex items-center justify-center"><Star className="h-3.5 w-3.5" /></span>
          </div>

          <div className="space-y-2 md:hidden">
            <div className="grid grid-cols-6 items-center gap-1 px-2 text-[10px] text-muted-foreground">
              <span className="flex items-center justify-center"><Clock3 className="h-3 w-3" /></span>
              <span className="flex items-center justify-center"><Goal className="h-3 w-3" /></span>
              <span className="flex items-center justify-center"><Handshake className="h-3 w-3" /></span>
              <span className="flex items-center justify-center"><Square className="h-3 w-3 text-yellow-400" /></span>
              <span className="flex items-center justify-center"><Square className="h-3 w-3 text-rose-500" /></span>
              <span className="flex items-center justify-center"><Star className="h-3 w-3" /></span>
            </div>
            {filteredMatchRows.map((row) => (
              <div
                key={`m-${row.fixtureId}`}
                className="rounded-lg border border-border/25 bg-secondary/20 p-2 text-xs"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex items-center gap-1.5">
                    <span className="shrink-0 text-muted-foreground">{formatShortDate(row.date)}</span>
                    <FootballMediaImage
                      media={row.opponentMedia}
                      fallbackLabel={row.opponentCode || row.opponent}
                      alt=""
                      size="xs"
                    />
                    <span className="truncate text-foreground">{row.opponent}</span>
                  </div>
                  <span className="shrink-0 font-semibold text-foreground">
                    {String(row.result || "").replace("-", " - ")}
                  </span>
                </div>
                <div className="grid grid-cols-6 items-center gap-1 tabular-nums text-[11px]">
                  <span className="text-center text-muted-foreground">{row.stats.minutes}</span>
                  <span className="text-center text-muted-foreground">{row.stats.goals}</span>
                  <span className="text-center text-muted-foreground">{row.stats.assists}</span>
                  <span className="text-center text-muted-foreground">{row.stats.yellow}</span>
                  <span className="text-center text-muted-foreground">{row.stats.red}</span>
                  <span className={`mx-auto rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${getRatingBadgeClass(row.stats.rating)}`}>
                    {row.stats.rating ?? "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block">
            {filteredMatchRows.map((row) => (
              <div
                key={row.fixtureId}
                className="grid grid-cols-[minmax(0,1fr)_72px_repeat(5,44px)_56px] items-center gap-2 rounded-lg border border-border/25 bg-secondary/20 px-2 py-2 text-xs tabular-nums"
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="shrink-0 text-muted-foreground">{formatShortDate(row.date)}</span>
                    <FootballMediaImage
                      media={row.opponentMedia}
                      fallbackLabel={row.opponentCode || row.opponent}
                      alt=""
                      size="xs"
                    />
                    <span className="truncate text-foreground">{row.opponent}</span>
                  </div>
                </div>
                <div className="text-center font-semibold text-foreground">{String(row.result || "").replace("-", " - ")}</div>
                <div className="text-center text-muted-foreground">{row.stats.minutes}</div>
                <div className="text-center text-muted-foreground">{row.stats.goals}</div>
                <div className="text-center text-muted-foreground">{row.stats.assists}</div>
                <div className="text-center text-muted-foreground">{row.stats.yellow}</div>
                <div className="text-center text-muted-foreground">{row.stats.red}</div>
                <div className="flex justify-center">
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${getRatingBadgeClass(
                      row.stats.rating,
                    )}`}
                  >
                    {row.stats.rating ?? "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

