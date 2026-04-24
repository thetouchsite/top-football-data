"use client";

import React from "react";
import FootballMediaImage from "@/components/shared/FootballMediaImage";
import { cn } from "@/lib/utils";

/**
 * Panchina stile area tecnica: parete, seduta a doghe, bordo campo.
 * Su desktop va affiancata alla lista nomi; su mobile stack full-width.
 */
export default function BenchPanchina({ players = [], onPlayerClick, className }) {
  const list = Array.isArray(players) ? players : [];

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col",
        className
      )}
    >
      <div
        aria-hidden
        className="mb-1.5 text-center font-orbitron text-[9px] font-bold uppercase tracking-[0.2em] text-amber-200/70"
      >
        Area panchina
      </div>

      <div className="relative min-h-[168px] overflow-hidden rounded-xl border border-amber-950/50 bg-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        {/* Parete / rivestimento */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[42%] rounded-t-[11px] bg-gradient-to-b from-zinc-500/25 via-zinc-800/85 to-zinc-950" />
        <div
          className="pointer-events-none absolute left-2 right-2 top-2 h-6 rounded-md border border-white/5 bg-zinc-900/40 opacity-80"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent 0 3px, rgba(0,0,0,0.12) 3px 4px)",
          }}
        />

        {/* Seduta (doghe orizzontali) */}
        <div
          className="pointer-events-none absolute bottom-[30px] left-2 right-2 h-[46px] rounded-b-md border border-amber-950/70 shadow-[inset_0_4px_12px_rgba(0,0,0,0.55),0_8px_16px_rgba(0,0,0,0.35)]"
          style={{
            background:
              "repeating-linear-gradient(180deg, #7c2d12 0px, #7c2d12 3px, #5b1d0c 3px, #5b1d0c 6px), linear-gradient(to bottom, #9a3412, #451a03)",
            backgroundBlendMode: "normal, overlay",
          }}
        />
        {/* Bordo anteriore seduta */}
        <div className="pointer-events-none absolute bottom-[26px] left-1.5 right-1.5 h-2.5 rounded-sm bg-gradient-to-b from-amber-950 to-stone-950 shadow-md" />

        {/* Bordo campo */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-emerald-950/95 via-emerald-900/35 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/10" />

        {/* Giocatori “in panchina” */}
        <div className="relative z-10 flex min-h-[168px] flex-col justify-end px-1.5 pb-7 pt-8">
          {list.length === 0 ? (
            <p className="px-2 pb-2 text-center text-[10px] text-muted-foreground">
              Nessun giocatore
            </p>
          ) : (
            <div className="flex flex-wrap content-end items-end justify-center gap-x-1 gap-y-2">
              {list.map((player) => (
                <button
                  key={`bench-graphic-${player.id || player.name}`}
                  type="button"
                  onClick={() => onPlayerClick?.(player)}
                  className="group flex w-[58px] flex-col items-center gap-0.5 rounded-md pb-0.5 transition-transform hover:z-20 hover:scale-[1.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:w-[62px]"
                >
                  <div className="relative -mb-1 drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]">
                    <div className="rounded-full p-0.5 ring-2 ring-amber-900/50 ring-offset-1 ring-offset-zinc-950 transition group-hover:ring-amber-600/60">
                      <FootballMediaImage
                        media={player.media}
                        fallbackLabel={player.name}
                        alt={player.name}
                        size="sm"
                        className="!h-8 !w-8 !min-h-8 !min-w-8 sm:!h-9 sm:!w-9"
                      />
                    </div>
                  </div>
                  <span className="line-clamp-2 w-full text-center text-[8px] font-medium leading-tight text-white/90 drop-shadow-md sm:text-[9px]">
                    {player.name}
                  </span>
                  <span className="text-[8px] font-mono tabular-nums text-amber-200/80">
                    #{player.number ?? "—"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
