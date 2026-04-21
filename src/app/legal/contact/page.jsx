import PublicShell from "@/components/public/PublicShell";
import LegalContactPage from "@/screens/public/legal/LegalContactPage";

export const metadata = {
  title: "Contatti Privacy | Top Football Data",
  description: "Invia richieste privacy, supporto policy e domande su trattamento dati in modo strutturato.",
  openGraph: {
    title: "Contatti Privacy | Top Football Data",
    description: "Canale dedicato per richieste privacy e data requests.",
    url: "/legal/contact",
  },
  alternates: {
    canonical: "/legal/contact",
  },
};

export default function LegalContactRoute() {
  return (
    <PublicShell>
      <LegalContactPage />
    </PublicShell>
  );
}
