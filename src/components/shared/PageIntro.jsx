import React from "react";

/**
 * Intestazione pagina compatta (roadmap UI minimal): titolo + sottotitolo + azioni opzionali.
 * Margin bottom ridotto rispetto a SectionHeader per meno spazio vuoto sotto la piega.
 */
export default function PageIntro({
  title,
  subtitle,
  accentWord,
  icon: Icon,
  children,
  className = "",
}) {
  const parts = accentWord ? title.split(accentWord) : [title];

  return (
    <div
      className={`mb-6 md:mb-8 border-b border-border/35 pb-5 md:pb-6 ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="flex min-w-0 items-start gap-2.5">
          {Icon && (
            <Icon
              className="mt-0.5 h-5 w-5 shrink-0 text-primary/80"
              aria-hidden
            />
          )}
          <div className="min-w-0 space-y-1.5">
            <h1 className="text-balance font-orbitron text-xl font-bold uppercase leading-snug tracking-tight text-foreground md:text-2xl">
              {accentWord ? (
                <>
                  {parts[0]}
                  <span className="text-primary">{accentWord}</span>
                  {parts[1] || ""}
                </>
              ) : (
                title
              )}
            </h1>
            {subtitle && (
              <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground/90 md:text-sm">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {children ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}
