import React from "react";
import { Bell, ChevronRight, Star } from "lucide-react";
import GlassCard from "../shared/GlassCard";
import FootballMediaImage from "@/components/shared/FootballMediaImage";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/AppContext";

function hasRealSource(source) {
  return source && !["not_available", "derived_model", "derived_from_xg"].includes(source);
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

export default function PlayerCard({ player, expanded = false, oddsAvailable = false }) {
  const { favorites, following, toggleFavoritePlayer, toggleFollowPlayer } = useApp();
  if (!player) return null;
  const isFav = favorites.players.includes(player.name);
  const isFollowed = following.players.includes(player.name);
  const playerProps = player.playerProps || {};
  const xgSource = playerProps.xg?.source || "not_available";
  const shotsSource = playerProps.shots?.source || "not_available";
  const discipline = playerProps.discipline || {};
  const heatmap = playerProps.heatmap || player.heatmap || { available: false, zones: [] };
  const xgValue = playerProps.xg?.value ?? player.xg;
  const shotsValue = playerProps.shots?.value ?? player.shots;
  const sourceBadge =
    hasRealSource(xgSource) || hasRealSource(shotsSource) ? "Dati Sportmonks" : "Dati non disponibili";

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
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
          <div>
            <h3 className="font-semibold text-foreground">{player.name}</h3>
            <p className="text-xs text-muted-foreground">
              {player.team} - {player.position || player.pos}
            </p>
          </div>
        </div>
        <span
          className={`hidden rounded-full border px-2 py-1 text-[10px] font-semibold sm:inline-flex ${
            sourceBadge === "Dati Sportmonks"
              ? "border-primary/25 bg-primary/10 text-primary"
              : "border-border/40 bg-secondary/40 text-muted-foreground"
          }`}
        >
          {sourceBadge}
        </span>
        <button
          onClick={() => toggleFavoritePlayer(player.name)}
          className={`p-2 rounded-lg transition-all ${
            isFav
              ? "bg-accent/10 text-accent border border-accent/20"
              : "bg-secondary/50 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${isFav ? "fill-accent" : ""}`} />
        </button>
      </div>

      {player.formHistory && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-muted-foreground">Ultimi 5:</span>
          {player.formHistory.map((g, i) => (
            <span
              key={i}
              className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center ${
                g > 0 ? "bg-primary/20 text-primary" : "bg-secondary/60 text-muted-foreground"
              }`}
            >
              {g > 0 ? g : "-"}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2.5 rounded-lg bg-secondary/40">
          <div className="text-xs text-muted-foreground mb-0.5">xG</div>
          <div className="font-bold text-lg text-primary">{formatMetricValue(xgValue)}</div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            {formatSourceLabel(xgSource)}
          </div>
        </div>
        <div className="text-center p-2.5 rounded-lg bg-secondary/40">
          <div className="text-xs text-muted-foreground mb-0.5">Tiri</div>
          <div className="font-bold text-lg text-foreground">{formatMetricValue(shotsValue)}</div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            {formatSourceLabel(shotsSource)}
          </div>
        </div>
        <div className="text-center p-2.5 rounded-lg bg-secondary/40">
          <div className="text-xs text-muted-foreground mb-0.5">Forma</div>
          <div
            className={`font-bold text-xs ${
              player.form === "Eccellente"
                ? "text-primary"
                : player.form === "Ottima"
                  ? "text-accent"
                  : "text-foreground"
            }`}
          >
            {player.form}
          </div>
        </div>
      </div>

      {expanded && (
        <>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="p-2.5 rounded-lg bg-secondary/40">
              <div className="text-xs text-muted-foreground mb-0.5">Gol stagione</div>
              <div className="font-bold text-foreground">{player.goals}</div>
            </div>
            <div className="p-2.5 rounded-lg bg-secondary/40">
              <div className="text-xs text-muted-foreground mb-0.5">Assist</div>
              <div className="font-bold text-foreground">{player.assists}</div>
            </div>
            <div className="p-2.5 rounded-lg bg-secondary/40">
              <div className="text-xs text-muted-foreground mb-0.5">Falli commessi</div>
              <div className="font-bold text-foreground">
                {formatMetricValue(discipline.foulsCommitted ?? player.fouls)}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-secondary/40">
              <div className="text-xs text-muted-foreground mb-0.5">Min / match</div>
              <div className="font-bold text-foreground">{player.minutes}</div>
            </div>
          </div>
          {player.insight && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 mb-4">
              <div className="text-xs text-muted-foreground mb-1">Insight</div>
              <p className="text-xs text-foreground leading-relaxed">{player.insight}</p>
            </div>
          )}
          <div className="mb-4 rounded-lg border border-border/40 bg-secondary/20 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-foreground">Player Props</div>
              <span className="rounded-full border border-border/40 bg-secondary/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {formatSourceLabel(playerProps.scorer?.source || "derived_model")}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-secondary/40 p-2.5">
                <div className="text-[11px] text-muted-foreground">Tiri totali</div>
                <div className="text-sm font-bold text-foreground">
                  {formatMetricValue(playerProps.shots?.value ?? player.shots)}
                </div>
              </div>
              <div className="rounded-lg bg-secondary/40 p-2.5">
                <div className="text-[11px] text-muted-foreground">Tiri in porta</div>
                <div className="text-sm font-bold text-foreground">
                  {formatMetricValue(playerProps.shotsOnTarget?.value ?? player.shotsOnTarget)}
                </div>
              </div>
              <div className="rounded-lg bg-secondary/40 p-2.5">
                <div className="text-[11px] text-muted-foreground">Falli subiti</div>
                <div className="text-sm font-bold text-foreground">
                  {formatMetricValue(discipline.foulsSuffered ?? player.foulsSuffered)}
                </div>
              </div>
              <div className="rounded-lg bg-secondary/40 p-2.5">
                <div className="text-[11px] text-muted-foreground">Cartellini</div>
                <div className="text-sm font-bold text-foreground">
                  {formatMetricValue(discipline.yellowCards ?? player.yellowCards, 0)}G /{" "}
                  {formatMetricValue(discipline.redCards ?? player.redCards, 0)}R
                </div>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-secondary/40 p-2.5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-[11px] text-muted-foreground">Heatmap</div>
                <div className="text-[10px] font-semibold text-muted-foreground">
                  {formatSourceLabel(heatmap.source)}
                </div>
              </div>
              {heatmap.available && Array.isArray(heatmap.zones) && heatmap.zones.length > 0 ? (
                <div className="grid grid-cols-3 gap-1">
                  {heatmap.zones.slice(0, 6).map((zone) => (
                    <div
                      key={zone.id || zone.label}
                      className="rounded bg-primary/10 px-2 py-1 text-[10px] text-primary"
                    >
                      <div className="truncate font-semibold">{zone.label}</div>
                      <div>{zone.value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Heatmap non disponibile nel feed corrente.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10 mb-4">
        <div>
          <div className="text-xs text-muted-foreground">
            {oddsAvailable ? "Quota marcatore" : "Stima marcatore"}
          </div>
          <div className="font-bold text-foreground">{player.scorerOdds}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Probabilita</div>
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
          {oddsAvailable ? (
            <>
              VAI ALLE QUOTE <ChevronRight className="w-3 h-3 ml-1" />
            </>
          ) : (
            "Quote contestuali in arrivo"
          )}
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
    </GlassCard>
  );
}

