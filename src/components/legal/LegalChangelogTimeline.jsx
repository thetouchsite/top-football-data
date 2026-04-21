import LegalBadge from "@/components/legal/LegalBadge";

export default function LegalChangelogTimeline({ entries = [] }) {
  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <article key={entry.id} className="rounded-xl border border-border/40 bg-secondary/10 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{entry.documentTitle}</h3>
            <LegalBadge tone={entry.changeType}>{entry.changeType.toUpperCase()}</LegalBadge>
            <span className="text-xs text-muted-foreground">{entry.version}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">{entry.date}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{entry.summary}</p>
        </article>
      ))}
    </div>
  );
}
