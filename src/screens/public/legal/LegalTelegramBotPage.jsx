import PublicPageFrame from "@/screens/public/PublicPageFrame";
import {
  LegalAccordion,
  LegalMetaBar,
  LegalSection,
  LegalTable,
  TelegramPolicyHighlights,
} from "@/components/legal";
import { getLegalDocumentBySlug } from "@/lib/legal";

const telegramFaq = [
  {
    title: "Che tipo di contenuti invia il bot?",
    content: "Aggiornamenti informativi e notifiche collegate alla piattaforma, secondo configurazione attiva.",
  },
  {
    title: "Come revoco l'iscrizione alle notifiche?",
    content: "Sono previsti comandi o percorsi di uscita da finalizzare nella policy definitiva.",
  },
  {
    title: "Il canale Telegram sostituisce la piattaforma?",
    content: "No, e un canale complementare. Le policy principali restano nel Legal Center.",
  },
];

export default function LegalTelegramBotPage() {
  const doc = getLegalDocumentBySlug("telegram-bot");
  const tableSection = doc.sections.find((section) => section.id === "telegram-data");

  return (
    <PublicPageFrame
      title="Policy Telegram Bot"
      subtitle="Pagina dedicata al bot/canale Telegram con ruoli, dati trattati e collegamenti alle policy correlate."
    >
      <div className="space-y-6">
        <LegalMetaBar doc={doc} />

        <LegalSection id="telegram-highlights" title="Panoramica rapida">
          <TelegramPolicyHighlights />
        </LegalSection>

        <LegalSection id="telegram-treatment" title="Trattamento dati (placeholder)">
          <LegalTable columns={tableSection.columns} rows={tableSection.rows} />
        </LegalSection>

        <LegalSection id="telegram-faq" title="FAQ Bot Telegram">
          <LegalAccordion items={telegramFaq} idPrefix="telegram-faq" />
        </LegalSection>
      </div>
    </PublicPageFrame>
  );
}
