import React from "react";
import GlassCard from "../shared/GlassCard";
import FootballMediaImage from "@/components/shared/FootballMediaImage";

export default function FormationPitch({ homeLineup, homeTeam, awayTeam: _awayTeam, onPlayerClick }) {
  const players = Array.isArray(homeLineup?.players) ? homeLineup.players : [];
  const formationRows = buildFormationRows(players);

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Probabili Formazioni</h3>
        <span className="text-xs text-muted-foreground">{homeLineup?.formation || "--"}</span>
      </div>

      {/* Pitch */}
      <div className="relative w-full aspect-[3/4] max-h-[500px] rounded-xl overflow-hidden bg-gradient-to-b from-green-900/40 via-green-800/30 to-green-900/40 border border-green-700/20">
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
              className="absolute left-[7%] z-10 flex w-[86%] -translate-y-1/2 items-center justify-around gap-1"
              style={{ top: `${row.y}%` }}
            >
              {row.players.map((player, i) => (
                <button
                  key={`${player.id || player.name || "player"}-${i}`}
                  onClick={() => onPlayerClick?.(player)}
                  className="group flex w-14 flex-col items-center gap-1 sm:w-16"
                  type="button"
                >
                  <div
                    className={`rounded-full p-0.5 ring-2 transition-all group-hover:scale-110 ${
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
                        size="sm"
                      />
                      {player.number != null && String(player.number).trim() !== "" && (
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-black/70 px-0.5 text-[8px] font-bold text-white">
                          {player.number}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className="max-w-full truncate rounded bg-black/60 px-1.5 py-0.5 text-center text-[10px] font-semibold leading-tight text-white/90 sm:text-[11px]"
                    title={player.name}
                  >
                    {compactPlayerName(player.name)}
                  </span>
                </button>
              ))}
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
