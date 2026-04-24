import React from "react";
import GlassCard from "@/components/shared/GlassCard";
import FootballMediaImage from "@/components/shared/FootballMediaImage";

function formatMetricValue(value, fallback = "—") {
  if (value == null || value === "" || !Number.isFinite(Number(value))) {
    return fallback;
  }
  return Number(value);
}

export default function TopXgPlayers({ players = [], onPlayerClick }) {
  const rankedPlayers = players
    .map((player) => {
      const xgSource = player.playerProps?.xg?.source || "not_available";
      const xgValue = player.playerProps?.xg?.value ?? player.xg ?? 0;
      const shotsValue =
        player.playerProps?.shots?.value ?? player.shots ?? 0;
      const ratingValue =
        player.rating ?? player.playerProps?.rating?.value ?? null;

      return {
        ...player,
        xgSource,
        xgValue,
        shotsValue,
        ratingValue,
      };
    })
    .filter((player) => Number(player.xgValue) > 0)
    .sort(
      (left, right) =>
        Number(right.xgValue) - Number(left.xgValue) ||
        Number(right.shotsValue || 0) - Number(left.shotsValue || 0) ||
        Number(right.ratingValue || 0) - Number(left.ratingValue || 0),
    )
    .slice(0, 3);

  if (!rankedPlayers.length) {
    return null;
  }

  return (
    <GlassCard>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Top 3 · xG atteso in questa partita
          </h3>
          <p className="text-xs text-muted-foreground">
            I tre con{" "}
            <span className="font-medium text-foreground">
              maggior xG atteso in questa gara
            </span>{" "}
            (ordinati per xG del match, feed/lineup).{" "}
            <span className="font-medium text-foreground">Non</span> è un
            ranking di stagione o tra partite diverse.
          </p>
        </div>
        <span
          className="rounded-full border border-primary/25 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary"
          title="Riferito solo a questa partita"
        >
          Solo questa partita
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {rankedPlayers.map((player) => (
          <button
            key={player.id || player.name}
            type="button"
            onClick={() => onPlayerClick?.(player)}
            className="flex h-full flex-col items-start gap-3 rounded-3xl border border-border/40 bg-secondary/50 p-4 text-left transition hover:bg-secondary/60"
          >
            <div className="flex w-full items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <FootballMediaImage
                  media={player.media}
                  fallbackLabel={player.name}
                  alt={player.name}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {player.name}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {player.team || "Team"} •{" "}
                    {player.position || player.pos || "--"}
                  </p>
                </div>
              </div>
              {player.ratingValue != null ? (
                <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                  {formatMetricValue(player.ratingValue, "n/d")}
                </div>
              ) : null}
            </div>
            <div className="w-full rounded-2xl bg-secondary/30 p-4">
              <div className="text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
                xG atteso (questa partita)
              </div>
              <div className="mt-2 text-3xl font-semibold text-primary">
                {formatMetricValue(player.xgValue, "—")}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span
                  className="rounded-full bg-secondary/40 px-2 py-1"
                  title="Tiri da statistiche partita/lineup, non stagionali"
                >
                  Tiri (questa partita) {formatMetricValue(player.shotsValue, "—")}
                </span>
                <span className="rounded-full bg-secondary/40 px-2 py-1">
                  Fonte xG:{" "}
                  {player.xgSource === "sportmonks_expected"
                    ? "Sportmonks xG"
                    : player.xgSource === "sportmonks_lineup_details"
                      ? "Sportmonks"
                      : "Stima / altro"}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </GlassCard>
  );
}
