import PublicShell from "@/components/public/PublicShell";
import LegalProcessorsPage from "@/screens/public/legal/LegalProcessorsPage";

export const metadata = {
  title: "Fornitori e Sub-processors | Top Football Data",
  description: "Registro dinamico dei servizi terzi, finalita, area geografica e note di revisione.",
  openGraph: {
    title: "Fornitori e Sub-processors | Top Football Data",
    description: "Tabella trasparente sui fornitori coinvolti nella piattaforma.",
    url: "/legal/processors",
  },
  alternates: {
    canonical: "/legal/processors",
  },
};

export default function LegalProcessorsRoute() {
  return (
    <PublicShell>
      <LegalProcessorsPage />
    </PublicShell>
  );
}
