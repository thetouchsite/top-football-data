import { FileText } from "lucide-react";
import { Link } from "@/lib/router-compat";
import DocumentStatusPill from "@/components/legal/DocumentStatusPill";

export default function LegalDocumentCard({ doc }) {
  return (
    <article className="rounded-2xl border border-border/40 bg-secondary/10 p-5 transition-colors hover:border-primary/35">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="mt-0.5 h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{doc.title}</h3>
        </div>
        <DocumentStatusPill status={doc.status} />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{doc.summary}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{doc.version}</span>
        <span>•</span>
        <span>Aggiornato {doc.updatedAt}</span>
      </div>
      <Link to={doc.route} className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline">
        Apri documento
      </Link>
    </article>
  );
}
