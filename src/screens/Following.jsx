"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router-compat";
import { Bell, ChevronRight, Trash2, Trophy, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import GlassCard from "@/components/shared/GlassCard";
import FootballMediaImage from "@/components/shared/FootballMediaImage";
import { useApp } from "@/lib/AppContext";
import { getScheduleWindow } from "@/api/football";
import { LEAGUES } from "@/lib/mockData";
import { ACCOUNT_NOTIFICATION_OPTIONS } from "@/lib/account-config";

function buildFallbackMatch(id) {
  const empty = { imageUrl: null, thumbUrl: null };
  return {
    id: String(id),
    home: "Fixture seguita",
    away: "non in finestra corrente",
    league: "Sportmonks feed",
    date: "--",
    time: "--:--",
    home_media: empty,
    away_media: empty,
    league_media: empty,
  };
}

export default function Following() {
  const {
    following,
    accountNotifications,
    preferredCompetitions,
    saveAccountPreferences,
    saveAccountFollowing,
    toggleFollowMatch,
    toggleFollowPlayer,
  } = useApp();
  const [feedMatches, setFeedMatches] = useState([]);
  const [notificationsState, setNotificationsState] = useState(accountNotifications);
  const [monitoredCompetitions, setMonitoredCompetitions] = useState(
    following.competitions || []
  );
  const [notificationsMessage, setNotificationsMessage] = useState("");
  const [competitionsMessage, setCompetitionsMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    getScheduleWindow(14)
      .then((payload) => {
        if (isActive) {
          setFeedMatches(Array.isArray(payload?.matches) ? payload.matches : []);
        }
      })
      .catch(() => {
        if (isActive) {
          setFeedMatches([]);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    setNotificationsState(accountNotifications);
  }, [accountNotifications]);

  useEffect(() => {
    setMonitoredCompetitions(following.competitions || []);
  }, [following.competitions]);

  useEffect(() => {
    if (
      !notificationsMessage ||
      notificationsMessage === "Salvataggio..."
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setNotificationsMessage("");
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [notificationsMessage]);

  useEffect(() => {
    if (
      !competitionsMessage ||
      competitionsMessage === "Salvataggio..."
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCompetitionsMessage("");
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [competitionsMessage]);

  const matchMap = useMemo(
    () => new Map(feedMatches.map((match) => [String(match.id), match])),
    [feedMatches]
  );

  const followedMatches = useMemo(
    () =>
      following.matches.map(
        (id) => matchMap.get(String(id)) || buildFallbackMatch(id)
      ),
    [following.matches, matchMap]
  );

  const followedPlayers = useMemo(
    () =>
      following.players.map((playerName, index) => ({
        id: `${playerName}:${index}`,
        name: playerName,
        team: "Provider feed",
        pos: "Monitorato",
        number: "--",
      })),
    [following.players]
  );

  const handleNotificationToggle = async (key, value) => {
    const nextNotifications = {
      ...notificationsState,
      [key]: value,
    };

    setNotificationsState(nextNotifications);
    setNotificationsMessage("Salvataggio...");

    try {
      await saveAccountPreferences({
        notifications: nextNotifications,
        preferredCompetitions,
      });
      setNotificationsMessage("Impostazioni notifiche salvate.");
    } catch (error) {
      setNotificationsState(accountNotifications);
      setNotificationsMessage(
        error.message || "Impossibile aggiornare le notifiche."
      );
    }
  };

  const handleCompetitionToggle = async (competition) => {
    const nextCompetitions = monitoredCompetitions.includes(competition)
      ? monitoredCompetitions.filter((item) => item !== competition)
      : [...monitoredCompetitions, competition];

    setMonitoredCompetitions(nextCompetitions);
    setCompetitionsMessage("Salvataggio...");

    try {
      await saveAccountFollowing({
        ...following,
        competitions: nextCompetitions,
      });
      setCompetitionsMessage("Competizioni monitorate aggiornate.");
    } catch (error) {
      setMonitoredCompetitions(following.competitions || []);
      setCompetitionsMessage(
        error.message || "Impossibile aggiornare le competizioni monitorate."
      );
    }
  };

  return (
    <div className="app-page">
      <div className="app-content-narrow">
        <div className="mb-8 flex min-w-0 items-start gap-3 sm:items-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="font-orbitron text-xl font-bold text-foreground">
              SEGUITI
            </h1>
            <p className="text-pretty text-xs text-muted-foreground">
              I contenuti seguiti servono per il monitoraggio e per gli alert
              futuri. Le impostazioni notifiche sono collegate a questa area.
            </p>
          </div>
        </div>

        <Tabs defaultValue="match">
          <TabsList className="mb-5 flex h-auto min-h-10 w-full flex-wrap justify-start gap-1 p-1 glass">
            <TabsTrigger value="match" className="shrink-0 text-xs">
              Match ({followedMatches.length})
            </TabsTrigger>
            <TabsTrigger value="giocatori" className="shrink-0 text-xs">
              Giocatori ({followedPlayers.length})
            </TabsTrigger>
            <TabsTrigger value="competizioni" className="shrink-0 text-xs">
              Comp. ({monitoredCompetitions.length})
            </TabsTrigger>
            <TabsTrigger value="notifiche" className="shrink-0 text-xs">
              Notifiche
            </TabsTrigger>
          </TabsList>

          <TabsContent value="match">
            <GlassCard>
              {followedMatches.length === 0 ? (
                <div className="text-center py-10">
                  <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Nessun match seguito. Usa la campanella dalle schede match.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {followedMatches.map((match) => (
                    <div
                      key={`followed-match-${match.id}`}
                      className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-secondary/30 p-3 transition-all hover:bg-secondary/50"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <div className="flex shrink-0 items-center gap-1">
                          <FootballMediaImage
                            media={match.league_media}
                            fallbackLabel={match.league}
                            alt={match.league}
                            size="sm"
                            shape="square"
                          />
                          <FootballMediaImage
                            media={match.home_media}
                            fallbackLabel={match.homeShort || match.home}
                            alt={match.home}
                            size="sm"
                          />
                          <FootballMediaImage
                            media={match.away_media}
                            fallbackLabel={match.awayShort || match.away}
                            alt={match.away}
                            size="sm"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-foreground">
                            {match.home} vs {match.away}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {match.league} - {match.date} {match.time}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Link to={`/match/${match.id}`}>
                          <button className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all">
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </Link>
                        <button
                          onClick={() => toggleFollowMatch(match.id)}
                          className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </TabsContent>

          <TabsContent value="giocatori">
            <GlassCard>
              {followedPlayers.length === 0 ? (
                <div className="text-center py-10">
                  <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Nessun giocatore seguito. Usa il pulsante segui dalla scheda
                    giocatore.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {followedPlayers.map((player) => (
                    <div
                      key={`followed-player-${player.id}`}
                      className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-secondary/30 p-3"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="relative shrink-0">
                          <FootballMediaImage
                            media={player.media}
                            fallbackLabel={player.name}
                            alt={player.name}
                            size="sm"
                          />
                          {player.number && player.number !== "--" && (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-border/50 bg-secondary px-0.5 text-[9px] font-bold text-primary">
                              {player.number}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-foreground">
                            {player.name}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {player.team} - {player.pos}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleFollowPlayer(player.name)}
                        className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </TabsContent>

          <TabsContent value="competizioni">
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-sm text-foreground">
                  Competizioni monitorate
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {LEAGUES.map((competition) => (
                  <button
                    key={`monitored-${competition}`}
                    onClick={() => handleCompetitionToggle(competition)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      monitoredCompetitions.includes(competition)
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    {competition}
                  </button>
                ))}
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                Le competizioni monitorate definiscono il perimetro dei contenuti
                seguiti e degli alert futuri.
              </div>
              {competitionsMessage && (
                <div className="mt-3 text-xs text-muted-foreground">
                  {competitionsMessage}
                </div>
              )}
            </GlassCard>
          </TabsContent>

          <TabsContent value="notifiche">
            <GlassCard>
              <div className="space-y-3">
                {ACCOUNT_NOTIFICATION_OPTIONS.map((notification) => (
                  <div
                    key={notification.key}
                    className="flex flex-col gap-3 rounded-xl bg-secondary/30 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground">
                        {notification.label}
                      </div>
                      <div className="text-pretty text-xs text-muted-foreground">
                        {notification.desc}
                      </div>
                    </div>
                    <Switch
                      className="shrink-0"
                      checked={Boolean(notificationsState[notification.key])}
                      onCheckedChange={(value) =>
                        handleNotificationToggle(notification.key, value)
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                Queste impostazioni regolano i tipi di alert collegati ai contenuti
                che segui.
              </div>
              {notificationsMessage && (
                <div className="mt-3 text-xs text-muted-foreground">
                  {notificationsMessage}
                </div>
              )}
            </GlassCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

