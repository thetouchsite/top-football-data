import PublicShell from "@/components/public/PublicShell";
import LegalDocumentPage from "@/screens/public/legal/LegalDocumentPage";

export const metadata = {
  title: "Privacy Policy | Top Football Data",
  description: "Informativa privacy strutturata su dati trattati, finalita, basi giuridiche e diritti utente.",
  openGraph: {
    title: "Privacy Policy | Top Football Data",
    description: "Informazioni privacy in formato chiaro e versionato.",
    url: "/legal/privacy",
  },
  alternates: {
    canonical: "/legal/privacy",
  },
};

export default function LegalPrivacyRoute() {
  return (
    <PublicShell>
      <LegalDocumentPage slug="privacy" />
    </PublicShell>
  );
}
