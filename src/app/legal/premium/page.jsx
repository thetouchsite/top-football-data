import PublicShell from "@/components/public/PublicShell";
import LegalPremiumPage from "@/screens/public/legal/LegalPremiumPage";

export const metadata = {
  title: "Premium e Abbonamenti | Top Football Data",
  description:
    "Struttura legale del piano Premium: rinnovi, disdetta, recesso, pagamenti e condizioni d'uso.",
  openGraph: {
    title: "Premium e Abbonamenti | Top Football Data",
    description: "Informazioni contrattuali Premium in un formato chiaro e aggiornabile.",
    url: "/legal/premium",
  },
  alternates: {
    canonical: "/legal/premium",
  },
};

export default function LegalPremiumRoute() {
  return (
    <PublicShell>
      <LegalPremiumPage />
    </PublicShell>
  );
}
