import { AlertTriangle } from "lucide-react";
import PublicPageFrame from "@/screens/public/PublicPageFrame";
import { LegalMetaBar, LegalSection, LegalTable } from "@/components/legal";
import { getLegalDocumentBySlug } from "@/lib/legal";

const premiumMatrixRows = [
  ["Accesso al piano", "Sezione account/billing", "Da validare"],
  ["Rinnovo", "Ricorrenza automatica (placeholder)", "Da validare"],
  ["Disdetta", "Flusso self-service o supporto", "Da validare"],
  ["Recesso", "Diritti e finestre temporali", "Da validare"],
  ["Pagamenti", "Provider e metodi supportati", "Da validare"],
  ["Sospensione account", "Abuso o violazioni policy", "Da validare"],
];

export default function LegalPremiumPage() {
  const doc = getLegalDocumentBySlug("premium");

  return (
    <PublicPageFrame
      title="Premium, Abbonamenti e Rinnovi"
      subtitle="Struttura pronta per definire in modo trasparente condizioni economiche e regole del piano Premium."
    >
      <div className="space-y-6">
        <LegalMetaBar doc={doc} />
        <LegalSection
          id="premium-structure"
          title="Schema contrattuale (placeholder)"
          subtitle="Questa matrice e progettata per agevolare la revisione legale e l'allineamento con billing reale."
        >
          <LegalTable
            columns={["Ambito", "Descrizione bozza", "Stato revisione"]}
            rows={premiumMatrixRows}
          />
        </LegalSection>

        <div className="rounded-xl border border-accent/40 bg-accent/10 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-accent" />
            <p className="text-sm text-muted-foreground">
              Clausole su rinnovi, recesso, fatturazione e responsabilita devono essere approvate da consulente legale.
            </p>
          </div>
        </div>
      </div>
    </PublicPageFrame>
  );
}
