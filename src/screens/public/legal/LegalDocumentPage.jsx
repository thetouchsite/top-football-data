import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import PublicPageFrame from "@/screens/public/PublicPageFrame";
import {
  LegalHero,
  LegalMetaBar,
  LegalSection,
  LegalSidebarNav,
  LegalTable,
  LegalAccordion,
  LegalBadge,
} from "@/components/legal";
import { getLegalChangelog, getLegalDocumentBySlug } from "@/lib/legal";

function renderSection(section) {
  if (section.kind === "paragraphs") {
    return (
      <div className="space-y-3 text-sm text-muted-foreground">
        {section.content.map((paragraph, index) => (
          <p key={`${section.id}-${index}`}>{paragraph}</p>
        ))}
      </div>
    );
  }

  if (section.kind === "bullets") {
    return (
      <ul className="space-y-2 text-sm text-muted-foreground">
        {section.items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (section.kind === "table") {
    return <LegalTable columns={section.columns} rows={section.rows} />;
  }

  if (section.kind === "accordion") {
    return <LegalAccordion items={section.items} idPrefix={section.id} />;
  }

  return null;
}

export default function LegalDocumentPage({ slug }) {
  const document = getLegalDocumentBySlug(slug);
  if (!document) {
    notFound();
  }

  const sidebarItems = (document.sections || []).map((section) => ({
    label: section.heading,
    href: `#${section.id}`,
  }));

  const documentChanges = getLegalChangelog().filter((entry) => entry.documentSlug === slug);

  return (
    <PublicPageFrame title={document.title} subtitle={document.summary}>
      <div className="space-y-8">
        <LegalHero
          title={document.title}
          description="Questa pagina e una base strutturata del Legal Center. I contenuti marcati come revisione legale devono essere validati prima della versione definitiva."
          badges={[`Versione ${document.version}`, `Ultimo aggiornamento ${document.updatedAt}`]}
        />

        <LegalMetaBar doc={document} />

        {document.requiresLegalReview ? (
          <div className="rounded-xl border border-accent/40 bg-accent/10 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-accent" />
              <div>
                <p className="text-sm font-semibold text-foreground">Richiede revisione legale finale</p>
                <p className="mt-1 text-sm text-muted-foreground">{document.warning}</p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
          <div className="space-y-5">
            {(document.sections || []).map((section) => (
              <LegalSection key={section.id} id={section.id} title={section.heading}>
                {renderSection(section)}
              </LegalSection>
            ))}

            <LegalSection id="document-changelog" title="Cronologia documento">
              {documentChanges.length ? (
                <div className="space-y-2">
                  {documentChanges.map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-border/30 bg-background/60 p-3 text-sm">
                      <div className="flex items-center gap-2">
                        <LegalBadge tone={entry.changeType}>{entry.changeType.toUpperCase()}</LegalBadge>
                        <span className="text-foreground">{entry.version}</span>
                        <span className="text-muted-foreground">• {entry.date}</span>
                      </div>
                      <p className="mt-1 text-muted-foreground">{entry.summary}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nessuna voce changelog disponibile per questa bozza.</p>
              )}
            </LegalSection>

            <LegalSection id="document-links" title="Documenti correlati">
              <div className="flex flex-wrap gap-2">
                <Link href="/legal/privacy" className="text-sm text-primary hover:underline">
                  Privacy
                </Link>
                <Link href="/legal/cookies" className="text-sm text-primary hover:underline">
                  Cookie
                </Link>
                <Link href="/legal/terms" className="text-sm text-primary hover:underline">
                  Termini
                </Link>
                <Link href="/legal/contact" className="text-sm text-primary hover:underline">
                  Contatti privacy
                </Link>
              </div>
            </LegalSection>
          </div>

          <LegalSidebarNav items={sidebarItems} />
        </div>
      </div>
    </PublicPageFrame>
  );
}
