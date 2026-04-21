import PublicShell from "@/components/public/PublicShell";
import LegalDocumentPage from "@/screens/public/legal/LegalDocumentPage";

export const metadata = {
  title: "Disclaimer Servizio | Top Football Data",
  description: "Limiti del servizio, uso informativo della piattaforma e note di responsabilita.",
  openGraph: {
    title: "Disclaimer Servizio | Top Football Data",
    description: "Disclaimer e limiti d'uso del servizio.",
    url: "/legal/disclaimer",
  },
  alternates: {
    canonical: "/legal/disclaimer",
  },
};

export default function LegalDisclaimerRoute() {
  return (
    <PublicShell>
      <LegalDocumentPage slug="disclaimer" />
    </PublicShell>
  );
}
