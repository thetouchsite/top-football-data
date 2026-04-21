import React from "react";

export default function PublicPageFrame({ title, subtitle, children }) {
  return (
    <div className="min-h-[calc(100vh-8rem)] bg-background">
      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 md:py-16">
        <div className="mb-8 max-w-3xl">
          <h1 className="font-orbitron text-2xl font-black tracking-wide text-foreground md:text-4xl">
            {title}
          </h1>
          {subtitle ? <p className="mt-3 text-sm text-muted-foreground md:text-base">{subtitle}</p> : null}
        </div>
        {children}
      </section>
    </div>
  );
}

