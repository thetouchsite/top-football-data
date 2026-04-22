import React, { useState } from "react";
import { motion } from "framer-motion";
import { Crown, Lock, Star, Cpu, Shield, Lightbulb, ChevronDown, ChevronUp, ChevronRight } from "lucide-react";
import PageIntro from "@/components/shared/PageIntro";
import FeedMetaPanel from "@/components/shared/FeedMetaPanel";
import GlassCard from "@/components/shared/GlassCard";
import FootballMediaImage from "@/components/shared/FootballMediaImage";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MULTI_BET_COMBOS } from "@/lib/mockData";
import { useApp } from "@/lib/AppContext";

const COMBO_TABS = [
  { key: "algoritmiche", label: "Algoritmiche", icon: Cpu },
  { key: "safe", label: "Safe Selection", icon: Shield },
  { key: "value", label: "Value Combo", icon: Lightbulb },
];

const RISK_COLORS = {
  basso: "text-primary border-primary/20 bg-primary/10",
  medio: "text-accent border-accent/20 bg-accent/10",
  alto: "text-destructive border-destructive/20 bg-destructive/10",
};

const TAG_COLORS = {
  Conservativa: "bg-primary/10 text-primary border-primary/20",
  Bilanciata: "bg-accent/10 text-accent border-accent/20",
  Aggressiva: "bg-destructive/10 text-destructive border-destructive/20",
};

function ComboCard({ combo, isPremium }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <GlassCard className="border-accent/10">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${TAG_COLORS[combo.tag]}`}>{combo.tag}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${RISK_COLORS[combo.risk]}`}>Rischio {combo.risk}</span>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div>
              <div className="text-xs text-muted-foreground">Moltiplicatore</div>
              <div className="font-orbitron text-2xl font-black text-foreground">{combo.odds}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Confidenza</div>
              <div className="font-bold text-lg text-primary">{combo.confidence}%</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Potenziale</div>
              <div className="font-bold text-lg text-accent">€{combo.potentialWin}</div>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-1">
            {[1,2,3,4,5].map((s) => (
              <Star key={s} className={`w-3 h-3 ${s <= Math.round(combo.confidence/20) ? "fill-accent text-accent" : "text-muted-foreground"}`} />
            ))}
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)}
          className="p-2 rounded-lg bg-secondary/50 text-muted-foreground hover:text-foreground transition-all">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <Progress value={combo.confidence} className="h-1.5 mb-4" />

      {/* Preview events */}
      <div className="space-y-2">
        {combo.selections.slice(0, expanded ? undefined : 2).map((sel, i) => (
          <div key={i} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-secondary/30">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="flex shrink-0 items-center gap-1">
                <FootballMediaImage
                  media={sel.league_media}
                  fallbackLabel={sel.league}
                  alt={sel.league}
                  size="xs"
                  shape="square"
                />
                <FootballMediaImage
                  media={sel.home_media}
                  fallbackLabel={sel.home}
                  alt={sel.home}
                  size="xs"
                />
                <FootballMediaImage
                  media={sel.away_media}
                  fallbackLabel={sel.away}
                  alt={sel.away}
                  size="xs"
                />
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-foreground">{sel.home} vs {sel.away}</div>
                <div className="truncate text-xs text-muted-foreground">{sel.league} · {sel.market}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-foreground">{sel.odds}</span>
              <span className={`text-xs font-bold ${sel.confidence >= 80 ? "text-primary" : "text-muted-foreground"}`}>{sel.confidence}%</span>
            </div>
          </div>
        ))}
        {!expanded && combo.selections.length > 2 && (
          <button onClick={() => setExpanded(true)} className="text-xs text-primary hover:text-primary/80 transition-colors">
            + {combo.selections.length - 2} altre selezioni
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-4 p-3 rounded-lg border border-border/30 bg-secondary/20">
          <div className="text-xs font-semibold text-foreground mb-1">Stato engine</div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Questa combo e una preview locale del motore. Le quote bookmaker match-by-match e
            la generazione reale verranno attivate con il provider odds dedicato.
          </p>
        </div>
      )}

      <div className="mt-4">
        {isPremium ? (
          <Button className="w-full bg-primary text-primary-foreground font-bold text-xs glow-green-sm h-10">
            APRI PREVIEW <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        ) : (
          <Button className="w-full bg-accent/20 text-accent font-bold text-xs h-10 border border-accent/30 glow-gold" variant="ghost">
            <Lock className="w-3.5 h-3.5 mr-2" /> SBLOCCA · DIVENTA PREMIUM
          </Button>
        )}
      </div>
    </GlassCard>
  );
}

export default function MultiBet() {
  const { isPremium } = useApp();
  const feedSummary =
    "Preview locale: nessun endpoint futures/outrights attivo nel layer football corrente.";

  return (
    <div className="app-page">
      <div className="app-content">
        <PageIntro
          title="SMART MULTI-BET ENGINE"
          accentWord="MULTI-BET"
          subtitle="Strumento premium per assemblare multiple ad alto potenziale statistico. Preview locale: engine reale in integrazione."
          icon={Crown}
        >
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-accent/25 bg-accent/5 px-2.5 py-1.5 text-[11px] font-semibold text-accent">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            Preview premium
          </span>
        </PageIntro>

        <FeedMetaPanel summary={feedSummary} label="Stato feed dati" className="mb-8">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Il layer football attivo espone calendario e dettaglio match. Il motore multi-bet reale,
            i futures/outrights e la comparazione bookmaker match-by-match restano{" "}
            <code className="rounded bg-secondary/60 px-1 py-0.5 text-[10px]">not_available_with_current_feed</code>.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/50 text-muted-foreground border border-border/30">
              No futures API
            </span>
          </div>
        </FeedMetaPanel>

        <div className="mb-8">
          <GlassCard variant="quiet" className="border-accent/20">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Modalità combo
            </div>
            <div className="grid gap-5 divide-y divide-border/35 md:grid-cols-3 md:gap-6 md:divide-x md:divide-y-0">
              {COMBO_TABS.map((f) => (
                <div key={f.key} className="first:pt-0 pt-5 md:px-4 md:pt-0 first:md:pl-0 last:md:pr-0">
                  <div className="mb-2 flex items-center gap-2.5">
                    <f.icon className="h-4 w-4 shrink-0 text-accent" />
                    <h3 className="text-sm font-semibold text-accent">{f.label}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {f.key === "algoritmiche" && "Preview del motore combinatorio: logica e UX pronte; selezioni locali finché non arriva il feed odds dedicato."}
                    {f.key === "safe" && "Preview conservative: le quote finali non sono ancora bookmaker match-by-match reali."}
                    {f.key === "value" && "Preview value: il valore reale verrà calcolato con il comparatore quote attivo."}
                  </p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Main panel */}
        <Tabs defaultValue="algoritmiche">
          <TabsList className="glass mb-4 min-h-10 flex-wrap h-auto w-full justify-start gap-1 py-1">
            {COMBO_TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key}
                className="text-xs font-semibold data-[state=active]:bg-accent/10 data-[state=active]:text-accent">
                <t.icon className="w-3.5 h-3.5 mr-1.5 shrink-0" />{t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {COMBO_TABS.map((tab) => (
            <TabsContent key={tab.key} value={tab.key}>
              {isPremium ? (
                <div className="space-y-4">
                  {MULTI_BET_COMBOS.filter((c) => c.type === tab.key).map((combo) => (
                    <motion.div key={combo.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
                      <ComboCard combo={combo} isPremium={isPremium} />
                    </motion.div>
                  ))}
                  {MULTI_BET_COMBOS.filter((c) => c.type === tab.key).length === 0 && (
                    <div className="space-y-4">
                      {MULTI_BET_COMBOS.map((combo) => (
                        <ComboCard key={combo.id} combo={combo} isPremium={isPremium} />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <div className="space-y-4 opacity-40 pointer-events-none select-none">
                    {MULTI_BET_COMBOS.map((combo) => (
                      <ComboCard key={combo.id} combo={combo} isPremium={false} />
                    ))}
                  </div>
                  <div className="absolute inset-0 backdrop-blur-sm bg-background/60 rounded-xl flex items-center justify-center">
                    <div className="text-center p-8">
                      <Crown className="w-12 h-12 text-accent mx-auto mb-3 glow-gold" />
                      <h3 className="font-orbitron font-bold text-xl text-accent text-glow-gold mb-2">Sblocca Multipla</h3>
                      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                        Nessuna FUFFA, solo <span className="text-foreground font-semibold">analisi statistiche</span>
                      </p>
                      <a href="/premium">
                        <Button size="lg" className="bg-primary text-primary-foreground font-bold text-sm px-10 glow-green hover:bg-primary/90">
                          DIVENTA PREMIUM
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
