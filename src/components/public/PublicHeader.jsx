"use client";

import { useMemo, useState } from "react";
import { BarChart3, FileText, Menu, Send, X } from "lucide-react";
import { Link, useLocation } from "@/lib/router-compat";
import { Button } from "@/components/ui/button";
import { trackConversionEvent } from "@/components/public/conversion-events";

const TELEGRAM_URL = String(process.env.NEXT_PUBLIC_TELEGRAM_URL || "").trim();

const navItems = [
  { label: "Funzioni", path: "/come-funziona#funzioni", section: "funzioni" },
  { label: "Vantaggi", path: "/come-funziona#vantaggi", section: "vantaggi" },
  { label: "Premium", path: "/come-funziona#premium", section: "premium" },
  { label: "Telegram", path: "/come-funziona#telegram", section: "telegram" },
  { label: "FAQ", path: "/come-funziona#faq", section: "faq" },
];

export default function PublicHeader({ onOpenGuideModal }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const telegramHref = useMemo(() => TELEGRAM_URL || "/come-funziona#telegram", []);
  const pathname = location?.pathname || "/";

  const openGuide = () => {
    trackConversionEvent("open_guide_modal", { source: "public_header" });
    onOpenGuideModal?.();
    setMenuOpen(false);
  };

  const trackTelegramClick = () => {
    trackConversionEvent("click_telegram_cta", { source: "public_header" });
  };

  const isActive = (section) => pathname === "/come-funziona" && location?.hash === `#${section}`;

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 shadow-[0_1px_0_rgba(255,255,255,0.04)] backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/25">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <span className="font-orbitron text-[11px] font-bold uppercase tracking-[0.14em] text-foreground">
            Top <span className="text-primary">Football</span> Data
          </span>
        </Link>

        <nav className="hidden items-center gap-4 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.path}
              href={item.path}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                isActive(item.section)
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <a href={telegramHref} target="_blank" rel="noreferrer" onClick={trackTelegramClick}>
            <Button size="sm" variant="outline" className="text-xs font-semibold">
              <Send className="mr-1 h-3.5 w-3.5" />
              Canale Telegram
            </Button>
          </a>
          <Button type="button" size="sm" variant="secondary" className="text-xs font-semibold" onClick={openGuide}>
            <FileText className="mr-1 h-3.5 w-3.5" />
            PDF Gratis
          </Button>
          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-xs font-semibold">
              Accedi
            </Button>
          </Link>
          <Link to="/register" onClick={() => trackConversionEvent("click_register_cta", { source: "public_header" })}>
            <Button size="sm" className="text-xs font-bold glow-green-sm">
              Registrati Gratis
            </Button>
          </Link>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground md:hidden"
          onClick={() => setMenuOpen((value) => !value)}
          aria-label="Apri menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-border/40 bg-background px-4 py-3 md:hidden">
          <div className="mb-3 grid gap-2">
            {navItems.map((item) => (
              <a
                key={item.path}
                href={item.path}
                className={`rounded-md px-2 py-1.5 text-sm transition-colors ${
                  isActive(item.section)
                    ? "bg-primary/12 font-medium text-primary"
                    : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </div>
          <div className="grid gap-2">
            <Link to="/register" onClick={() => trackConversionEvent("click_register_cta", { source: "public_header_mobile" })}>
              <Button size="sm" className="w-full font-semibold">
                Registrati Gratis
              </Button>
            </Link>
            <a href={telegramHref} target="_blank" rel="noreferrer" onClick={trackTelegramClick}>
              <Button size="sm" variant="outline" className="w-full">
                <Send className="mr-1 h-3.5 w-3.5" />
                Canale Telegram
              </Button>
            </a>
            <Button type="button" size="sm" variant="secondary" onClick={openGuide}>
              <FileText className="mr-1 h-3.5 w-3.5" />
              PDF Gratis
            </Button>
            <Link to="/login">
              <Button size="sm" variant="ghost" className="w-full">
                Accedi
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

