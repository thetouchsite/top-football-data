import DocumentStatusPill from "@/components/legal/DocumentStatusPill";

export default function LegalMetaBar({ doc }) {
  if (!doc) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/40 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
      <DocumentStatusPill status={doc.status} />
      <span>Versione {doc.version}</span>
      <span className="text-muted-foreground/60">•</span>
      <span>In vigore: {doc.effectiveDate}</span>
      <span className="text-muted-foreground/60">•</span>
      <span>Aggiornato: {doc.updatedAt}</span>
      <span className="text-muted-foreground/60">•</span>
      <span>Owner: {doc.owner}</span>
    </div>
  );
}
