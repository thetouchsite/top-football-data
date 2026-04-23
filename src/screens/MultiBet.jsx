"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Crown, Cpu, Lightbulb, Lock, Shield, Sparkles } from "lucide-react";

import { getAlerts } from "@/api/alerts";
import MultibetComboCard from "@/components/betting/MultibetComboCard";
import FeedMetaPanel from "@/components/shared/FeedMetaPanel";
import GlassCard from "@/components/shared/GlassCard";
import PageIntro from "@/components/shared/PageIntro";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/lib/AppContext";
import { filterCombosByMode, mapMultibetAlertToCombo } from "@/lib/multibet-alert";

const COMBO_TABS = [
  {
    key: "algorithmic",
    label: "Algoritmico",
    kicker: "Generator",
    icon: Cpu,
    description:
      "Palinsesto top (Serie A, PL, UCL, ecc.): tutte le multiple del motore con convergenza tra probabilita modello e quota.",
  },
  {
    key: "safe",
    label: "Safe",
    kicker: "Data selection",
    icon: Shield,
    description: "Sotto-insieme a basso rischio: confidenza engine >= 80% (esclusi i match Gold).",
  },
  {
    key: "value",
    label: "Value",
    kicker: "Combo advisor",
    icon: Lightbulb,
    description:
      "Dove c'e discrepanza a favore del modello: data edge, EV composto o value% per gamba oltre le soglie minime.",
  },
  {
    key: "gold",
    label: "Gold",
    kicker: "Accuracy",
    icon: Sparkles,
    description:
      "Risultati esatti, scorecast, HT/FT e mercati combo avanzati: rischio piu alto, proposte sui segnali piu ricercati nel dato.",
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
      } catch (error) {
        if (!active) {
          return;
        }
        setLoadError(error?.message || "Caricamento fallito.");
        setCombos([]);
        setFeedMode("pending");
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
    const timer = window.setTimeout(() => {
      const element = document.getElementById(`multibet-${refKey}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 200);
    return () => window.clearTimeout(timer);
  }, [refKey, loadState, combos.length]);

  const feedSummary = useMemo(() => {
    if (loadState === "loading") {
      return "Caricamento alert multibet...";
    }
    if (feedMode === "history") {
      return `Nessuna multipla pending: mostro gli ultimi documenti betAlerts (type=multibet): ${combos.length} elementi.`;
    }
    return `Sincronizzato con betAlerts (type=multibet, pending): ${combos.length} elementi.`;
  }, [combos.length, feedMode, loadState]);

  return (
    <div className="app-page">
      <div className="app-content">
        <PageIntro
          title="SMART MULTI-BET ENGINE"
          accentWord="MULTI-BET"
          subtitle="Quattro modi: Generator (tutte le combo engine), Safe (>80% confidenza), Value (edge sui book) e Gold (esatti e mercati avanzati). Dati = stessi documenti betAlerts e Telegram."
          icon={Crown}
        >
          <span className="hidden items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-2.5 py-1.5 text-[11px] font-semibold text-amber-600 dark:inline-flex dark:text-amber-400">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            Esclusivo abbonati · sblocco comparatore e link book
          </span>
        </PageIntro>

        <FeedMetaPanel summary={feedSummary} label="Stato feed dati" className="mb-8">
          <p className="text-xs leading-relaxed text-muted-foreground">
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
              Modalita di selezione
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {COMBO_TABS.map((tab) => (
                <div key={tab.key} className="rounded-lg border border-border/25 bg-background/20 p-3">
                  <div className="mb-1.5 flex items-center gap-2.5">
                    <tab.icon
                      className={`h-4 w-4 shrink-0 ${tab.key === "gold" ? "text-amber-500" : "text-accent"}`}
                    />
                    <div>
                      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {tab.kicker}
                      </div>
                      <h3
                        className={`text-sm font-semibold ${
                          tab.key === "gold" ? "text-amber-600 dark:text-amber-400" : "text-accent"
                        }`}
                      >
                        {tab.label}
                      </h3>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{tab.description}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {loadState === "loading" && (
          <GlassCard>
            <p className="text-sm text-muted-foreground">Caricamento multiple...</p>
          </GlassCard>
        )}

        {loadState === "ready" && (
          <Tabs defaultValue="algorithmic">
            <TabsList className="glass mb-4 flex h-auto min-h-10 w-full flex-wrap justify-start gap-1 py-1">
              {COMBO_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className={`text-xs font-semibold data-[state=active]:bg-accent/10 data-[state=active]:text-accent ${
                    tab.key === "gold" ? "data-[state=active]:text-amber-500" : ""
                  }`}
                >
                  <tab.icon className={`mr-1.5 h-3.5 w-3.5 shrink-0 ${tab.key === "gold" ? "text-amber-500" : ""}`} />
                  {tab.label}
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
                        <motion.div key={combo.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
                          <MultibetComboCard combo={combo} isPremium highlightKey={refKey} />
                        </motion.div>
                      ))}

                      {inTab.length === 0 && (
                        <GlassCard>
                          <p className="text-xs text-muted-foreground">
                            {combos.length === 0 ? (
                              <>
                                Nessuna multipla pending: attendi un ciclo del worker su Railway, oppure controlla Mongo
                                e variabili Sportmonks.
                              </>
                            ) : tab.key === "algorithmic" ? (
                              <>Nessuna multipla disponibile in elenco completo.</>
                            ) : (
                              <>
                                Nessuna multipla soddisfa <strong className="text-foreground">{tab.label}</strong> in
                                questo momento. Apri <strong className="text-foreground">Algoritmico</strong> per
                                l&apos;elenco completo ({combos.length}).
                              </>
                            )}
                          </p>
                        </GlassCard>
                      )}
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="pointer-events-none select-none space-y-4 opacity-40">
                        {(inTab.length ? inTab : combos).slice(0, 2).map((combo) => (
                          <MultibetComboCard
                            key={combo.id}
                            combo={combo}
                            isPremium={false}
                            highlightKey={refKey}
                          />
                        ))}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-sm">
                        <div className="p-8 text-center">
                          <Crown className="glow-gold mx-auto mb-3 h-12 w-12 text-accent" />
                          <h3 className="font-orbitron mb-2 text-xl font-bold text-accent text-glow-gold">
                            Smart Multi-Bet
                          </h3>
                          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
                            Comparatore quote, link affiliato e le quattro modalita (Generator, Safe, Value, Gold) sono
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
