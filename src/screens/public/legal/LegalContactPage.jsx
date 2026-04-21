import PublicPageFrame from "@/screens/public/PublicPageFrame";
import { LegalSection, PrivacyRequestForm } from "@/components/legal";

export default function LegalContactPage() {
  return (
    <PublicPageFrame
      title="Contatti privacy e richieste utente"
      subtitle="Invia richieste su accesso dati, rettifica, cancellazione o supporto policy in modo strutturato."
    >
      <div className="space-y-6">
        <LegalSection
          id="privacy-contact-info"
          title="Riferimenti privacy (placeholder)"
          subtitle="Sostituire con dati ufficiali del titolare/referente privacy."
        >
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Titolare del trattamento: Top Football Data (placeholder)</p>
            <p>Email privacy: privacy@topfootballdata.com (placeholder)</p>
            <p>Tempo medio di risposta: entro 30 giorni (da validare)</p>
          </div>
        </LegalSection>

        <LegalSection
          id="privacy-request-form"
          title="Invia una richiesta"
          subtitle="Questa form e pronta per gestione server-side con validazione e tracciamento richieste."
        >
          <PrivacyRequestForm />
        </LegalSection>
      </div>
    </PublicPageFrame>
  );
}
