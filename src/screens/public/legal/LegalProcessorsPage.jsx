import PublicPageFrame from "@/screens/public/PublicPageFrame";
import { LegalMetaBar, LegalSection, LegalTable } from "@/components/legal";
import { getLegalDocumentBySlug, getLegalProcessors } from "@/lib/legal";

export default function LegalProcessorsPage() {
  const processors = getLegalProcessors();
  const doc = getLegalDocumentBySlug("processors");

  return (
    <PublicPageFrame
      title="Fornitori e Sub-processors"
      subtitle="Elenco tecnico-organizzativo dei servizi terzi coinvolti nella piattaforma."
    >
      <div className="space-y-6">
        <LegalMetaBar doc={doc} />
        <LegalSection
          id="processors-table"
          title="Registro fornitori (placeholder)"
          subtitle="Dati da verificare e consolidare con DPA/contratti in fase finale."
        >
          <LegalTable
            columns={["Servizio", "Ruolo", "Categoria", "Finalita", "Area", "Link", "Note"]}
            rows={processors.map((processor) => [
              processor.service,
              processor.role,
              processor.category,
              processor.purpose,
              processor.region,
              processor.externalUrl || "Da inserire",
              processor.notes,
            ])}
          />
        </LegalSection>
      </div>
    </PublicPageFrame>
  );
}
