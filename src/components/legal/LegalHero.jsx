export default function LegalHero({ title, description, badges = [] }) {
  return (
    <section className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-secondary/20 to-background p-6 md:p-8">
      <h1 className="font-orbitron text-3xl font-black tracking-tight text-foreground md:text-4xl">{title}</h1>
      <p className="mt-3 max-w-3xl text-sm text-muted-foreground md:text-base">{description}</p>
      {badges.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {badges.map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-border/40 bg-secondary/20 px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              {badge}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
