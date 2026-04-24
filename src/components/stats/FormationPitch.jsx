import React from "react";
import GlassCard from "../shared/GlassCard";
import FootballMediaImage from "@/components/shared/FootballMediaImage";
import { cn } from "@/lib/utils";

function lineupStateBadgeClass(status) {
  const key = String(status || "unknown").trim().toLowerCase();
  if (key === "official")
    return "border-sky-400/45 bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/20";
  if (key === "probable")
    return "border-amber-400/45 bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/20";
  if (key === "expected")
    return "border-orange-400/40 bg-orange-500/10 text-orange-100 ring-1 ring-orange-400/20";
  return "border-border/50 bg-secondary/50 text-muted-foreground ring-1 ring-border/30";
}

function lineupStateBadgeLabel(status) {
  const key = String(status || "unknown").trim().toLowerCase();
  if (key === "official") return "Ufficiali";
  if (key === "probable") return "Probabili";
  if (key === "expected") return "Attese";
  return "Stato n/d";
}

export default function FormationPitch({
  title = "Formazioni",
  homeLineup,
  homeTeam,
  awayTeam: _awayTeam,
  onPlayerClick,
  lineupStatus,
}) {
  const players = Array.isArray(homeLineup?.players) ? homeLineup.players : [];
  const formationRows = buildFormationRows(players);

  return (
    <GlassCard>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <div className="flex min-w-0 items-center justify-end gap-2">
          <span className="text-xs text-muted-foreground font-mono tabular-nums">
            {homeLineup?.formation || "--"}
          </span>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
              lineupStateBadgeClass(lineupStatus)
            )}
            title="Affidabilità formazione (fonte feed)"
          >
            {lineupStateBadgeLabel(lineupStatus)}
          </span>
        </div>
      </div>

      {/* Pitch — più alto su desktop per sfruttare lo spazio (mobile resta compatto) */}
      <div className="relative w-full aspect-[3/4] max-h-[min(70vh,500px)] rounded-xl overflow-hidden border border-green-700/20 bg-gradient-to-b from-green-900/40 via-green-800/30 to-green-900/40 md:aspect-[4/5] md:max-h-[min(75vh,640px)] lg:max-h-[min(78vh,700px)]">
        {/* Pitch lines */}
        <div className="absolute inset-0">
          {/* Center line */}
          <div className="absolute left-0 right-0 top-1/2 border-t border-green-600/30" />
          {/* Center circle */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-green-600/30" />
          {/* Top box */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-16 border-b border-l border-r border-green-600/30" />
          {/* Bottom box */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-16 border-t border-l border-r border-green-600/30" />
        </div>

        {/* Players */}
        {formationRows.length > 0 ? (
          formationRows.map((row) => (
            <div
              key={row.key}
              className="absolute left-[5%] z-10 flex w-[90%] -translate-y-1/2 items-center justify-around gap-0.5 sm:gap-1 md:left-[3%] md:w-[94%] md:gap-1.5"
              style={{ top: `${row.y}%` }}
            >
              {row.players.map((player, i) => {
                const count = row.players.length;
                const slotWidthClass =
                  count <= 1
                    ? "max-w-[60%] sm:max-w-[50%] md:max-w-[42%] lg:max-w-[36%]"
                    : count === 2
                      ? "max-w-[50%] md:max-w-[46%] lg:max-w-[44%]"
                      : "max-w-[24%] sm:max-w-[20%] md:max-w-[19%] lg:max-w-[17%]";
                return (
                <button
                  key={`${player.id || player.name || "player"}-${i}`}
                  onClick={() => onPlayerClick?.(player)}
                  className={cn(
                    "group flex min-w-0 flex-1 flex-col items-center gap-0.5 md:gap-1 lg:gap-1.5",
                    slotWidthClass
                  )}
                  type="button"
                >
                  <div
                    className={`rounded-full p-0.5 ring-2 transition-all group-hover:scale-110 md:p-0.5 ${
                      player.status === "confermato"
                        ? "ring-blue-400/80"
                        : player.status === "probabile"
                          ? "ring-yellow-400/80"
                          : "ring-red-400/80"
                    }`}
                  >
                    <div className="relative">
                      <FootballMediaImage
                        media={player.media}
                        fallbackLabel={player.name || player.number}
                        alt={player.name || ""}
                        size="md"
                        className="!h-8 !w-8 !min-h-8 !min-w-8 sm:!h-9 sm:!w-9 md:!h-10 md:!w-10 md:!min-h-10 md:!min-w-10 lg:!h-11 lg:!w-11 lg:!min-h-11 lg:!min-w-11"
                      />
                      {player.number != null && String(player.number).trim() !== "" && (
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-black/80 px-0.5 text-[8px] font-bold text-white ring-1 ring-black/30">
                          {player.number}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className="mt-0.5 inline-block w-fit max-w-full self-center rounded-md border border-white/10 bg-slate-950/80 px-1.5 py-0.5 text-center text-[9px] font-medium leading-tight text-white shadow-sm [overflow-wrap:anywhere] backdrop-blur-sm sm:px-2 sm:py-0.5 sm:text-[10px] md:px-1.5 md:py-0.5 md:text-[11px] md:leading-snug"
                    title={player.name}
                  >
                    <span className="line-clamp-1 md:hidden">{compactPlayerName(player.name)}</span>
                    <span className="hidden max-w-full break-words text-balance md:line-clamp-2 md:block">
                      {String(player.name || "--").trim()}
                    </span>
                  </span>
                </button>
              );
              })}
            </div>
          ))
        ) : (
          <div className="absolute inset-x-6 top-1/2 z-10 -translate-y-1/2 rounded-lg border border-green-700/20 bg-black/25 p-3 text-center text-xs text-white/70">
            Formazione non disponibile
          </div>
        )}

        {/* Team labels */}
        <div className="absolute top-2 left-2 text-xs font-bold text-white/80 bg-black/40 px-2 py-1 rounded">
          {homeTeam}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-600/80 border border-blue-400/60" />
          <span className="text-xs text-muted-foreground">Confermato</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-yellow-600/80 border border-yellow-400/60" />
          <span className="text-xs text-muted-foreground">Probabile</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-600/80 border border-red-400/60" />
          <span className="text-xs text-muted-foreground">In dubbio</span>
        </div>
      </div>
    </GlassCard>
  );
}

function compactPlayerName(name = "") {
  const cleanName = String(name || "").trim();
  if (!cleanName) return "--";

  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0];

  const lastName = parts[parts.length - 1];
  const initial = parts[0]?.[0] ? `${parts[0][0]}.` : "";
  return `${initial} ${lastName}`.trim();
}

function buildFormationRows(players = []) {
  if (!Array.isArray(players) || players.length === 0) return [];

  const sortedPlayers = [...players].sort((a, b) => {
    const ay = Number.isFinite(Number(a?.y)) ? Number(a.y) : 50;
    const by = Number.isFinite(Number(b?.y)) ? Number(b.y) : 50;
    if (Math.abs(ay - by) > 7) return ay - by;

    const ax = Number.isFinite(Number(a?.x)) ? Number(a.x) : 50;
    const bx = Number.isFinite(Number(b?.x)) ? Number(b.x) : 50;
    return ax - bx;
  });

  const rows = [];
  sortedPlayers.forEach((player) => {
    const y = Number.isFinite(Number(player?.y)) ? Number(player.y) : 50;
    const currentRow = rows[rows.length - 1];

    if (!currentRow || Math.abs(currentRow.y - y) > 7) {
      rows.push({ y, players: [player] });
      return;
    }

    currentRow.players.push(player);
    currentRow.y =
      currentRow.players.reduce((sum, rowPlayer) => {
        const rowY = Number.isFinite(Number(rowPlayer?.y)) ? Number(rowPlayer.y) : currentRow.y;
        return sum + rowY;
      }, 0) / currentRow.players.length;
  });

  return rows.map((row, index) => ({
    ...row,
    key: `row-${index}-${Math.round(row.y)}`,
    y: Math.max(9, Math.min(91, row.y)),
    players: row.players.sort((a, b) => {
      const ax = Number.isFinite(Number(a?.x)) ? Number(a.x) : 50;
      const bx = Number.isFinite(Number(b?.x)) ? Number(b.x) : 50;
      return ax - bx;
    }),
  }));
}
