import React from "react";

export default function SectionHeader({ title, subtitle, icon: Icon, accentWord }) {
  const parts = title.split(accentWord || "");
  return (
    <div className="mb-8">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mt-0.5">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-orbitron font-bold text-2xl md:text-3xl tracking-wide text-foreground uppercase">
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
            <p className="text-muted-foreground text-sm md:text-base mt-2">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}