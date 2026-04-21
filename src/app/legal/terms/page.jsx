import PublicShell from "@/components/public/PublicShell";
import LegalDocumentPage from "@/screens/public/legal/LegalDocumentPage";

export const metadata = {
  title: "Termini e Condizioni | Top Football Data",
  description: "Regole di utilizzo del servizio, responsabilita e condizioni contrattuali in formato strutturato.",
  openGraph: {
    title: "Termini e Condizioni | Top Football Data",
    description: "Condizioni d'uso della piattaforma in versione documentata.",
    url: "/legal/terms",
  },
  alternates: {
    canonical: "/legal/terms",
  },
};

export default function LegalTermsRoute() {
  return (
    <PublicShell>
      <LegalDocumentPage slug="terms" />
    </PublicShell>
  );
}
