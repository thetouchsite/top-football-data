"use client";

import { BarChart3 } from "lucide-react";
import { Link } from "@/lib/router-compat";
import CookiePreferencesButton from "@/components/legal/CookiePreferencesButton";

const legalLinks = [
  { label: "Legal Center", path: "/legal" },
  { label: "Privacy", path: "/legal/privacy" },
  { label: "Cookie", path: "/legal/cookies" },
  { label: "Termini", path: "/legal/terms" },
  { label: "Premium", path: "/legal/premium" },
  { label: "Telegram Bot", path: "/legal/telegram-bot" },
  { label: "Fornitori", path: "/legal/processors" },
  { label: "Contatti Privacy", path: "/legal/contact" },
  { label: "Disclaimer", path: "/legal/disclaimer" },
  { label: "Changelog", path: "/legal/changelog" },
];

export default function PublicFooter() {
  return (
    <footer className="border-t border-border/40 bg-background/80 py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="font-orbitron text-xs tracking-wide text-foreground">TOP FOOTBALL DATA</span>
          </div>
          <div className="rounded-full border border-accent/20 bg-accent/8 px-3 py-1 text-xs font-semibold text-accent">
            Feed Sportmonks: schedule e dettaglio match
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-5">
          {legalLinks.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CookiePreferencesButton
            label="Gestisci cookie"
            variant="secondary"
            source="public_footer"
            className="h-8 px-3 text-xs"
          />
          <span className="text-xs text-muted-foreground">Preference center pronto per integrazione CMP.</span>
        </div>

        <div className="border-t border-border/40 pt-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Top Football Data. Informazioni a scopo statistico: nessuna garanzia di risultato.
        </div>
      </div>
    </footer>
  );
}

