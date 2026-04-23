"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Crown, Lock, Cpu, Shield, Lightbulb, Sparkles } from "lucide-react";
import PageIntro from "@/components/shared/PageIntro";
import FeedMetaPanel from "@/components/shared/FeedMetaPanel";
import GlassCard from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MultibetComboCard from "@/components/betting/MultibetComboCard";
import { getAlerts } from "@/api/alerts";
import { mapMultibetAlertToCombo, filterCombosByMode } from "@/lib/multibet-alert";
import { useApp } from "@/lib/AppContext";

/** Quattro modi: `modus` da `betAlerts` (worker) */
const COMBO_TABS = [
  {
    key: "algorithmic",
    label: "Algoritmico",
    kicker: "Generator",
    icon: Cpu,
    description:
      "Palinsesto top (Serie A, PL, UCL, ecc.): tutte le multiple con convergenza probabilità modello e quota (EV del worker).",
  },
  {
    key: "safe",
    label: "Safe",
    kicker: "Data selection",
    icon: Shield,
    description: "Sotto-insieme a basso rischio: confidenza engine ≥ 80% (esclusi i match Gold, riservati al tab dedicato).",
  },
  {
    key: "value",
    label: "Value",
    kicker: "Combo advisor",
    icon: Lightbulb,
    description:
      "Dove c’è discrepanza a favore del modello: data edge, EV composto o value% per gamba oltre le soglie minime.",
  },
  {
    key: "gold",
    label: "Gold",
    kicker: "Accuracy",
    icon: Sparkles,
    description:
      "Risultati esatti, scorecast, HT/FT e mercati combo avanzati: rischio più alto, proposte sui segnali più “cercati” nel dato.",
  },
];

export default function MultiBet() {
  const { isPremium } = useApp();
  const searchParams = useSearchParams();
  const refKey = (searchParams.get("ref") || "").trim() || null;
  const [combos, setCombos] = useState([]);
  const [feedMode, setFeedMode] = useState("pending");
  const [loadState, setLoadState] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const highlightRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoadState("loading");
      setLoadError("");

      try {
        const pendingPayload = await getAlerts({ type: "multibet", status: "pending", limit: 30 });
        if (!active) {
          return;
        }

        const pendingMapped = (pendingPayload.alerts || [])
          .map(mapMultibetAlertToCombo)
          .filter(Boolean);

        if (pendingMapped.length > 0) {
          setCombos(pendingMapped);
          setFeedMode("pending");
          setLoadState("ready");
          return;
        }

        const recentPayload = await getAlerts({ type: "multibet", limit: 30 });
        if (!active) {
          return;
        }

        const recentMapped = (recentPayload.alerts || [])
          .map(mapMultibetAlertToCombo)
          .filter(Boolean);

        setCombos(recentMapped);
        setFeedMode(recentMapped.length > 0 ? "history" : "pending");
        setLoadState("ready");
      } catch (e) {
        if (!active) {
          return;
        }
        setLoadError(e?.message || "Caricamento fallito.");
        setCombos([]);
        setLoadState("ready");
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!refKey || loadState !== "ready") {
      return;
    }
    const t = window.setTimeout(() => {
      const el = document.getElementById(`multibet-${refKey}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 200);
    return () => window.clearTimeout(t);
  }, [refKey, loadState, combos.length]);

  const feedSummary = useMemo(() => {
    if (loadState === "loading") {
      return "Caricamento alert multibet…";
    }
    return `Sincronizzato con betAlerts (type=multibet, pending): ${combos.length} elementi.`;
  }, [loadState, combos.length]);

  return (
    <div className="app-page">
      <div className="app-content">
        <PageIntro
          title="SMART MULTI-BET ENGINE"
          accentWord="MULTI-BET"
          subtitle="Quattro modi: Generator (tutte le combo engine), Safe (&gt;80% confidenza), Value (edge sui book) e Gold (esatti e mercati avanzati). Dati = stessi documenti betAlerts e Telegram."
          icon={Crown}
        >
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-2.5 py-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            Esclusivo abbonati · sblocco comparatore e link book
          </span>
        </PageIntro>

        <FeedMetaPanel summary={feedSummary} label="Stato feed dati" className="mb-8">
          <p className="text-xs text-muted-foreground leading-relaxed">
            I multibet arrivano da <code className="rounded bg-secondary/60 px-1 text-[10px]">betAlerts</code> (worker
            Python). URL con <code className="rounded bg-secondary/60 px-1 text-[10px]">?ref=alertKey</code> per
            deep-link (es. da Telegram o Dashboard).
            {loadError && (
              <>
                {" "}
                <span className="text-destructive">({loadError})</span>
              </>
            )}
          </p>
        </FeedMetaPanel>

        <div className="mb-8">
          <GlassCard variant="quiet" className="border-accent/20">
            <div className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Modalità di selezione
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {COMBO_TABS.map((f) => (
                <div
                  key={f.key}
                  className="rounded-lg border border-border/25 bg-background/20 p-3"
                >
                  <div className="mb-1.5 flex items-center gap-2.5">
                    <f.icon
                      className={`h-4 w-4 shrink-0 ${
                        f.key === "gold" ? "text-amber-500" : "text-accent"
                      }`}
                    />
                    <div>
                      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {f.kicker}
                      </div>
                      <h3
                        className={`text-sm font-semibold ${
                          f.key === "gold" ? "text-amber-600 dark:text-amber-400" : "text-accent"
                        }`}
                      >
                        {f.label}
                      </h3>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {loadState === "loading" && (
          <GlassCard>
            <p className="text-sm text-muted-foreground">Caricamento multiple…</p>
          </GlassCard>
        )}

        {loadState === "ready" && (
          <Tabs defaultValue="algorithmic">
            <TabsList className="glass mb-4 flex min-h-10 w-full flex-wrap justify-start gap-1 py-1 h-auto">
              {COMBO_TABS.map((t) => (
                <TabsTrigger
                  key={t.key}
                  value={t.key}
                  className={`text-xs font-semibold data-[state=active]:bg-accent/10 data-[state=active]:text-accent ${
                    t.key === "gold" ? "data-[state=active]:text-amber-500" : ""
                  }`}
                >
                  <t.icon
                    className={`mr-1.5 h-3.5 w-3.5 shrink-0 ${
                      t.key === "gold" ? "text-amber-500" : ""
                    }`}
                  />
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {COMBO_TABS.map((tab) => {
              const inTab = filterCombosByMode(combos, tab.key);
              return (
              <TabsContent key={tab.key} value={tab.key}>
                {isPremium ? (
                  <div className="space-y-4" ref={highlightRef}>
                    {inTab.map((combo) => (
                      <motion.div
                        key={combo.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <MultibetComboCard
                          combo={combo}
                          isPremium
                          highlightKey={refKey}
                        />
                      </motion.div>
                    ))}
                    {inTab.length === 0 && (
                      <GlassCard>
                        <p className="text-xs text-muted-foreground">
                          {combos.length === 0 ? (
                            <>
                              Nessuna multipla pending: attendi un ciclo del worker su Railway, oppure controlla
                              Mongo e variabili Sportmonks.
                            </>
                          ) : tab.key === "algorithmic" ? (
                            <>
                              Nessuna multipla disponibile in elenco completo.
                              {feedMode === "history" ? " Anche lo storico recente e` vuoto." : ""}
                            </>
                          ) : (
                            <>
                              Nessuna multipla soddisfa <strong className="text-foreground">{tab.label}</strong> in
                              questo momento. Apri <strong className="text-foreground">Algoritmico</strong> per
                              l’elenco completo ({combos.length}).
                            </>
                          )}
                        </p>
                      </GlassCard>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <div className="pointer-events-none space-y-4 select-none opacity-40">
                      {(inTab.length ? inTab : combos).slice(0, 2).map((combo) => (
                        <MultibetComboCard
                          key={combo.id}
                          combo={combo}
                          isPremium={false}
                          highlightKey={refKey}
                        />
                      ))}
                    </div>
                    <div className="bg-background/60 absolute inset-0 flex items-center justify-center rounded-xl backdrop-blur-sm">
                      <div className="p-8 text-center">
                        <Crown className="glow-gold mx-auto mb-3 h-12 w-12 text-accent" />
                        <h3 className="font-orbitron mb-2 text-xl font-bold text-glow-gold text-accent">
                          Smart Multi-Bet
                        </h3>
                        <p className="mb-6 max-w-sm text-sm text-muted-foreground">
                          Comparatore quote, link affiliato e le quattro modalità (Generator, Safe, Value, Gold) sono
                          riservate agli <span className="font-semibold text-foreground">abbonati</span>.
                        </p>
                        <a href="/premium">
                          <Button
                            size="lg"
                            className="glow-green border border-primary/30 bg-primary px-10 text-sm font-bold text-primary-foreground hover:bg-primary/90"
                          >
                            DIVENTA PREMIUM
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
              );
            })}
          </Tabs>
        )}
      </div>
    </div>
  );
}
