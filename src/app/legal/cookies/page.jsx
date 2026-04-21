import PublicShell from "@/components/public/PublicShell";
import LegalCookiesPage from "@/screens/public/legal/LegalCookiesPage";

export const metadata = {
  title: "Cookie Policy | Top Football Data",
  description: "Categorie cookie, gestione consenso e struttura pronta per CMP/consent manager.",
  openGraph: {
    title: "Cookie Policy | Top Football Data",
    description: "Gestione cookie e preferenze privacy in modo trasparente.",
    url: "/legal/cookies",
  },
  alternates: {
    canonical: "/legal/cookies",
  },
};

export default function LegalCookiesRoute() {
  return (
    <PublicShell>
      <LegalCookiesPage />
    </PublicShell>
  );
}
