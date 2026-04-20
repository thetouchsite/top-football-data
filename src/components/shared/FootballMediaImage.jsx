"use client";

import { useCallback, useState } from "react";

const sizeClasses = {
  xs: "h-6 w-6 min-h-6 min-w-6 text-[9px]",
  sm: "h-8 w-8 min-h-8 min-w-8 text-[10px]",
  md: "h-10 w-10 min-h-10 min-w-10 text-xs",
  lg: "h-12 w-12 min-h-12 min-w-12 text-sm",
  xl: "h-16 w-16 min-h-16 min-w-16 text-lg",
};

/** Sfondo chiaro + bordo leggero: molti asset CDN sono pensati per fondo chiaro e su dark UI spariscono. */
const remoteImageMat =
  "bg-white shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)] ring-1 ring-zinc-900/[0.08] dark:bg-zinc-100 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)] dark:ring-white/[0.14]";

function initialsFromLabel(label) {
  const text = String(label || "").trim();
  if (!text) {
    return "?";
  }

  const parts = text.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase().slice(0, 3);
  }

  return text.replace(/\s+/g, "").toUpperCase().slice(0, 3);
}

/**
 * Immagine squadra / lega / giocatore da payload normalizzato (`media.imageUrl`).
 * Fallback su iniziali se URL assente o errore di caricamento.
 *
 * @param {"lightMat"|"none"} [surface="lightMat"] — `lightMat` (default) applica fondo chiaro dietro l’immagine
 *   remota per contrasto in dark mode; `none` per casi eccezionali (es. asset già su tile chiara).
 */
export default function FootballMediaImage({
  media = null,
  fallbackLabel = "",
  alt = "",
  size = "sm",
  shape = "circle",
  className = "",
  surface = "lightMat",
}) {
  const [broken, setBroken] = useState(false);
  const url = media?.imageUrl || media?.thumbUrl || null;
  const sizeClass = sizeClasses[size] || sizeClasses.sm;
  const initials = initialsFromLabel(fallbackLabel);
  const rounded =
    shape === "square"
      ? "rounded-md"
      : shape === "card"
        ? "rounded-2xl"
        : "rounded-full";

  const handleError = useCallback(() => {
    setBroken(true);
  }, []);

  if (!url || broken) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center border border-border/50 bg-secondary/80 font-bold text-muted-foreground shadow-sm ring-1 ring-black/[0.04] dark:bg-secondary/70 dark:ring-white/[0.06] ${sizeClass} ${rounded} ${className}`}
        title={fallbackLabel || undefined}
      >
        <span className="leading-none">{initials}</span>
      </div>
    );
  }

  const matClass = surface === "lightMat" ? remoteImageMat : "bg-secondary/30 ring-1 ring-border/30";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden ${matClass} ${sizeClass} ${rounded} ${className}`}
      title={fallbackLabel || undefined}
    >
      <img
        src={url}
        alt={alt || fallbackLabel || ""}
        loading="lazy"
        decoding="async"
        className="h-full w-full max-h-full max-w-full object-contain p-[3px]"
        onError={handleError}
      />
    </span>
  );
}
