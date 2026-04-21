import PublicShell from "@/components/public/PublicShell";
import LegalChangelogPage from "@/screens/public/legal/LegalChangelogPage";

export const metadata = {
  title: "Legal Changelog | Top Football Data",
  description: "Timeline versionata delle modifiche ai documenti legali della piattaforma.",
  openGraph: {
    title: "Legal Changelog | Top Football Data",
    description: "Storico aggiornamenti documenti legali con badge major/minor/review.",
    url: "/legal/changelog",
  },
  alternates: {
    canonical: "/legal/changelog",
  },
};

export default function LegalChangelogRoute() {
  return (
    <PublicShell>
      <LegalChangelogPage />
    </PublicShell>
  );
}
