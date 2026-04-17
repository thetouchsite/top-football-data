import React from "react";

/**
 * default — effetto glass classico.
 * quiet — bordo sottile, meno rumore visivo (liste dense, sidebar).
 */
export default function GlassCard({
  children,
  className = "",
  glow = false,
  onClick,
  variant = "default",
}) {
  const base =
    variant === "quiet"
      ? "app-panel-quiet p-3 transition-colors duration-200 hover:border-border/50 md:p-4"
      : `app-panel rounded-xl p-4 md:p-5 transition-all duration-300 ${
          glow ? "glow-green-sm hover:glow-green" : "hover:border-primary/30"
        }`;

  return (
    <div
      onClick={onClick}
      className={`${base} ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}