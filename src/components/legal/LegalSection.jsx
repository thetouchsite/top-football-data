export default function LegalSection({ id, title, subtitle, children }) {
  return (
    <section id={id} className="scroll-mt-32 rounded-2xl border border-border/40 bg-secondary/10 p-5 md:p-6">
      <div className="mb-4">
        <h2 className="font-orbitron text-xl font-bold text-foreground md:text-2xl">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}
