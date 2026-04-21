import PublicPageFrame from "@/screens/public/PublicPageFrame";
import { LegalChangelogTimeline, LegalSection } from "@/components/legal";
import { getLegalChangelog } from "@/lib/legal";

export default function LegalChangelogPage() {
  const entries = getLegalChangelog();

  return (
    <PublicPageFrame
      title="Legal Changelog"
      subtitle="Timeline delle modifiche ai documenti legali con versione, data e sintesi aggiornamento."
    >
      <LegalSection id="changelog-timeline" title="Cronologia aggiornamenti">
        <LegalChangelogTimeline entries={entries} />
      </LegalSection>
    </PublicPageFrame>
  );
}
