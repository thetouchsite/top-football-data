import PublicShell from "@/components/public/PublicShell";
import LegalCenterPage from "@/screens/public/legal/LegalCenterPage";

export const metadata = {
  title: "Legal Center | Top Football Data",
  description:
    "Hub legale e trust center di Top Football Data: privacy, cookie, termini, premium, policy Telegram e contatti privacy.",
  openGraph: {
    title: "Legal Center | Top Football Data",
    description:
      "Consulta documenti legali, versioni e aggiornamenti in un'unica dashboard trasparente.",
    url: "/legal",
  },
  alternates: {
    canonical: "/legal",
  },
};

export default function LegalRoute() {
  return (
    <PublicShell>
      <LegalCenterPage />
    </PublicShell>
  );
}
