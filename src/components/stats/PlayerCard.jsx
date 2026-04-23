import React from "react";
import { Bell, ChevronRight } from "lucide-react";
import GlassCard from "../shared/GlassCard";
import FootballMediaImage from "@/components/shared/FootballMediaImage";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/AppContext";

function hasRealSource(source) {
  return (
    source &&
    !["not_available", "derived_model", "derived_from_xg"].includes(source)
  );
}

function formatMetricValue(value, fallback = "n/d") {
  if (value == null || value === "" || !Number.isFinite(Number(value))) {
    return fallback;
  }

  return Number(value);
}

function formatSourceLabel(source) {
  if (source === "sportmonks_expected") return "Sportmonks xG";
  if (source === "sportmonks_lineup_details") return "Sportmonks";
  if (source === "sportmonks_lineup_details_events") return "Sportmonks";
  if (source === "derived_from_xg") return "Stima da xG";
  if (source === "derived_model") return "Stima modello";
  if (source === "sportmonks_heatmap") return "Sportmonks";
  return "n/d";
}

export default function PlayerCard({
  player,
  expanded = false,
  oddsAvailable = false,
}) {
  const { following, toggleFollowPlayer } = useApp();
  if (!player) return null;
  const isFollowed = following.players.includes(player.name);
  const playerProps = player.playerProps || {};
  const xgSource = playerProps.xg?.source || "not_available";
  const shotsSource = playerProps.shots?.source || "not_available";
  const discipline = playerProps.discipline || {};
  const xgValue = playerProps.xg?.value ?? player.xg;
  const shotsValue = playerProps.shots?.value ?? player.shots;
  const shotsOnTargetValue =
    playerProps.shotsOnTarget?.value ?? player.shotsOnTarget;
  const sourceBadge =
    hasRealSource(xgSource) || hasRealSource(shotsSource)
      ? "Dati Sportmonks"
      : "Dati non disponibili";

  return (
    <GlassCard>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div className="relative shrink-0">
              <FootballMediaImage
                media={player.media}
                fallbackLabel={player.name}
                alt={player.name}
                size="lg"
              />
              {player.number != null && String(player.number).trim() !== "" && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border border-border/50 bg-secondary px-0.5 text-[10px] font-black text-primary">
                  {player.number}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-lg text-foreground truncate">
                {player.name}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {player.team} • {player.position || player.pos || "--"}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                sourceBadge === "Dati Sportmonks"
                  ? "border border-primary/25 bg-primary/10 text-primary"
                  : "border border-border/40 bg-secondary/40 text-muted-foreground"
              }`}
            >
              {sourceBadge}
            </span>
            {Number.isFinite(Number(player.rating)) && (
              <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                Rating {formatMetricValue(player.rating)}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-border/30 bg-secondary/40 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                label: "Minuti giocati",
                value:
                  player.minutes ??
                  player.playedMinutes ??
                  player.minutesPlayed,
              },
              { label: "Gol", value: player.goals ?? player.goalsScored },
              { label: "Expected Goals", value: xgValue, emphasize: true },
              { label: "Tiri totali", value: shotsValue },
              { label: "Tiri in porta", value: shotsOnTargetValue },
            ].map((metric) => (
              <div
                key={metric.label}
                className={`rounded-2xl p-3 ${metric.emphasize ? "bg-primary/10" : "bg-secondary/60"}`}
              >
                <div className="text-[11px] text-muted-foreground mb-1">
                  {metric.label}
                </div>
                <div
                  className={`font-semibold ${metric.emphasize ? "text-primary text-2xl" : "text-foreground text-lg"}`}
                >
                  {formatMetricValue(metric.value, "0")}
                </div>
              </div>
            ))}
          </div>
        </div>

        {player.insight && (
          <div className="rounded-3xl border border-primary/20 bg-primary/5 p-4">
            <div className="text-xs font-semibold text-primary mb-2">
              Insight
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              {player.insight}
            </p>
          </div>
        )}

        {expanded && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-border/30 bg-secondary/40 p-4">
              <div className="text-xs text-muted-foreground mb-2">
                Statistiche aggiuntive
              </div>
              <div className="space-y-3 text-sm text-foreground">
                <div className="flex items-center justify-between">
                  <span>Assist</span>
                  <span>{formatMetricValue(player.assists ?? 0, "0")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Falli commessi</span>
                  <span>
                    {formatMetricValue(
                      discipline.foulsCommitted ?? player.fouls,
                      "0",
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Falli subiti</span>
                  <span>
                    {formatMetricValue(
                      discipline.foulsSuffered ?? player.foulsSuffered,
                      "0",
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Cartellini</span>
                  <span>
                    {formatMetricValue(
                      discipline.yellowCards ?? player.yellowCards,
                      "0",
                    )}
                    G /{" "}
                    {formatMetricValue(
                      discipline.redCards ?? player.redCards,
                      "0",
                    )}
                    R
                  </span>
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-border/30 bg-secondary/40 p-4">
              <div className="text-xs text-muted-foreground mb-2">
                Player Props
              </div>
              <div className="space-y-3 text-sm text-foreground">
                <div className="flex items-center justify-between">
                  <span>Tiri totali</span>
                  <span>
                    {formatMetricValue(
                      playerProps.shots?.value ?? player.shots,
                      "0",
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tiri in porta</span>
                  <span>
                    {formatMetricValue(
                      playerProps.shotsOnTarget?.value ?? player.shotsOnTarget,
                      "0",
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Forma</span>
                  <span>{player.form || "Stabile"}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Fonte:{" "}
                  {formatSourceLabel(
                    playerProps.scorer?.source || "derived_model",
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div>
            <div className="text-xs text-muted-foreground">
              {oddsAvailable ? "Quota marcatore" : "Stima marcatore"}
            </div>
            <div className="font-bold text-foreground">{player.scorerOdds}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Probabilità</div>
            <div className="font-bold text-primary">{player.scorerProb}%</div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            disabled={!oddsAvailable}
            className={`flex-1 font-bold text-xs h-9 ${
              oddsAvailable
                ? "bg-primary text-primary-foreground glow-green-sm hover:bg-primary/90"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            }`}
          >
            <span className="flex items-center justify-center gap-1">
              {oddsAvailable ? "VAI ALLE QUOTE" : "Quote contestuali in arrivo"}
              {oddsAvailable && <ChevronRight className="w-3 h-3 ml-1" />}
            </span>
          </Button>
          <button
            onClick={() => toggleFollowPlayer(player.name)}
            className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border text-xs font-semibold transition-all ${
              isFollowed
                ? "bg-primary/10 border-primary/20 text-primary"
                : "border-border/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            {isFollowed ? "Seguito" : "Segui"}
          </button>
        </div>
      </div>
    </GlassCard>
  );
}
