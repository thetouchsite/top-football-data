"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ShieldCheck } from "lucide-react";
import PublicPageFrame from "@/screens/public/PublicPageFrame";
import { Input } from "@/components/ui/input";
import {
  CookiePreferencesButton,
  LegalDocumentCard,
  LegalHero,
  LegalSection,
} from "@/components/legal";
import { getLatestLegalUpdate, getLegalQuickLinks, searchLegalDocuments } from "@/lib/legal";

export default function LegalCenterPage() {
  const [query, setQuery] = useState("");
  const latestUpdate = getLatestLegalUpdate();
  const quickLinks = getLegalQuickLinks();

  const filteredDocuments = useMemo(() => searchLegalDocuments(query), [query]);

  return (
    <PublicPageFrame
      title="Legal Center / Trust Center"
      subtitle="Qui trovi in modo ordinato privacy, cookie, termini, policy Telegram e documenti chiave del servizio."
    >
      <div className="space-y-8">
        <LegalHero
          title="Trasparenza legale, in un unico hub"
          description="Abbiamo raccolto documenti, versioni e punti di contatto in una struttura chiara e facile da consultare."
          badges={[
            latestUpdate ? `Ultimo aggiornamento: ${latestUpdate.updatedAt}` : "Ultimo aggiornamento: n/d",
            "Struttura pronta per revisione legale finale",
          ]}
        />

        <div className="grid gap-4 rounded-2xl border border-border/40 bg-secondary/10 p-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <label htmlFor="legal-search" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ricerca interna documenti
            </label>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="legal-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-9"
                placeholder="Cerca privacy, cookie, premium, telegram..."
              />
            </div>
          </div>
          <CookiePreferencesButton source="legal_center" />
        </div>

        <LegalSection id="documents" title="Documenti principali" subtitle="Stato, versione e data in evidenza.">
          <div className="grid gap-4 md:grid-cols-2">
            {filteredDocuments.map((doc) => (
              <LegalDocumentCard key={doc.slug} doc={doc} />
            ))}
          </div>
        </LegalSection>

        <div className="grid gap-4 md:grid-cols-2">
          <LegalSection id="quick-links" title="Quick links">
            <div className="space-y-2">
              {quickLinks.map((item) => (
                <Link key={item.href} href={item.href} className="block text-sm text-primary hover:underline">
                  {item.label}
                </Link>
              ))}
            </div>
          </LegalSection>

          <LegalSection id="platform-transparency" title="Trasparenza piattaforma">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                <span>Architettura documentale versionata e pronta ad audit interno.</span>
              </p>
              <p className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                <span>Sezioni marcate \"Da validare\" per separare bozza tecnica e approvazione legale.</span>
              </p>
              <p className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                <span>Canale diretto per richieste privacy e cronologia versioni disponibile.</span>
              </p>
            </div>
          </LegalSection>
        </div>
      </div>
    </PublicPageFrame>
  );
}
