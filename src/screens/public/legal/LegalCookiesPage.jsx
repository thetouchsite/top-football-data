import { AlertTriangle } from "lucide-react";
import PublicPageFrame from "@/screens/public/PublicPageFrame";
import {
  CookiePreferencesButton,
  LegalMetaBar,
  LegalSection,
  LegalTable,
} from "@/components/legal";
import { getLegalDocumentBySlug } from "@/lib/legal";

export default function LegalCookiesPage() {
  const doc = getLegalDocumentBySlug("cookies");
  const categoriesSection = doc.sections.find((section) => section.id === "cookie-categories");

  return (
    <PublicPageFrame
      title="Cookie Policy e gestione consenso"
      subtitle="Struttura pronta per integrare preference center, CMP e Consent Mode con separazione chiara delle categorie."
    >
      <div className="space-y-6">
        <LegalMetaBar doc={doc} />

        <LegalSection id="preferences" title="Gestione preferenze cookie">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Il pulsante seguente apre l'entry point tecnico per il preference center. La CMP definitiva verra integrata
              successivamente.
            </p>
            <CookiePreferencesButton label="Gestisci cookie" source="legal_cookies_page" />
          </div>
        </LegalSection>

        <LegalSection id="cookie-categories" title="Categorie previste">
          <LegalTable columns={categoriesSection.columns} rows={categoriesSection.rows} />
        </LegalSection>

        <div className="rounded-xl border border-accent/40 bg-accent/10 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-accent" />
            <p className="text-sm text-muted-foreground">
              Classificazione legale, base giuridica e implementazione CMP richiedono validazione con consulente legale/privacy.
            </p>
          </div>
        </div>
      </div>
    </PublicPageFrame>
  );
}
