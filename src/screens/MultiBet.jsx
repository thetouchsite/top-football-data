import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Lock, Star, Cpu, Shield, Lightbulb, ChevronDown, ChevronUp, ChevronRight, TrendingUp, RefreshCw } from "lucide-react";
import SectionHeader from "@/components/shared/SectionHeader";
import GlassCard from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MULTI_BET_COMBOS } from "@/lib/mockData";
import { useApp } from "@/lib/AppContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getFuturesOdds } from "@/api/football";

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

const FUTURES_TREND_STYLES = {
  up: "text-accent",
  down: "text-primary",
  flat: "text-muted-foreground",
};

function formatTrendLabel(trend) {
  if (trend === "up") return "in salita";
  if (trend === "down") return "in calo";
  return "stabile";
}

function FuturesMarketCard({ market }) {
  return (
    <GlassCard className="border-primary/10">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-xs text-muted-foreground">Market futures</div>
          <h3 className="font-semibold text-sm text-foreground">{market.name}</h3>
        </div>
        <span className="text-[11px] px-2 py-1 rounded-full border border-border/40 bg-secondary/40 text-muted-foreground">
          {market.booksCount} book
        </span>
      </div>
      <div className="space-y-2">
        {market.outcomes.slice(0, 5).map((outcome) => (
          <div
            key={outcome.id}
            className="rounded-lg border border-border/30 bg-secondary/20 px-3 py-2"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-foreground truncate">
                  {outcome.name}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Prob. implicita {outcome.impliedProbability}%
                </div>
              </div>
              <div className="text-right">
                <div className="font-orbitron text-base font-black text-foreground">
                  {outcome.bestOdds || "--"}
                </div>
                <div
                  className={`text-[11px] font-semibold ${
                    FUTURES_TREND_STYLES[outcome.trend] || FUTURES_TREND_STYLES.flat
                  }`}
                >
                  {formatTrendLabel(outcome.trend)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

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
          <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30">
            <div>
              <div className="text-xs font-semibold text-foreground">{sel.home} vs {sel.away}</div>
              <div className="text-xs text-muted-foreground">{sel.league} · {sel.market}</div>
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
  const [futuresMarkets, setFuturesMarkets] = useState([]);
  const [futuresCompetitions, setFuturesCompetitions] = useState([]);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState("");
  const [futuresNotice, setFuturesNotice] = useState("");
  const [futuresLoading, setFuturesLoading] = useState(true);
  const [futuresLoaded, setFuturesLoaded] = useState(false);
  const [futuresRefreshKey, setFuturesRefreshKey] = useState(0);

  useEffect(() => {
    let isActive = true;

    const loadFutures = async () => {
      setFuturesLoading(true);
      setFuturesNotice("");

      try {
        const payload = await getFuturesOdds({
          competitionId: selectedCompetitionId,
        });

        if (!isActive) {
          return;
        }

        setFuturesMarkets(Array.isArray(payload.markets) ? payload.markets : []);
        setFuturesCompetitions(
          Array.isArray(payload.competitions) ? payload.competitions : []
        );
        setSelectedCompetitionId(
          payload.selectedCompetition?.id || selectedCompetitionId || ""
        );
        setFuturesNotice(payload.notice || "");
        setFuturesLoaded(true);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setFuturesMarkets([]);
        setFuturesNotice(
          error.message || "Feed futures non disponibile."
        );
        setFuturesLoaded(false);
      } finally {
        if (isActive) {
          setFuturesLoading(false);
        }
      }
    };

    loadFutures();

    return () => {
      isActive = false;
    };
  }, [selectedCompetitionId, futuresRefreshKey]);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-2">
          <SectionHeader title="SMART MULTI-BET ENGINE" accentWord="MULTI-BET" subtitle="Strumento premium per assemblare multiple ad alto potenziale statistico" icon={Crown} />
          <div className="flex items-center gap-2 -mt-4 mb-6">
            <Lock className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs text-accent font-semibold">Preview premium · engine reale in integrazione</span>
          </div>
        </div>

        <div className="glass rounded-xl p-4 mb-6 border border-accent/20 bg-accent/5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Il feed attuale copre solo futures/outrights separati dal layer principale
            Sportmonks. Il motore multi-bet reale e la comparazione bookmaker match-by-match
            restano `not_available_with_current_feed`.
          </p>
        </div>

        {/* Feature boxes */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {COMBO_TABS.map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <GlassCard className="border-accent/10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                    <f.icon className="w-4 h-4 text-accent" />
                  </div>
                  <h3 className="font-semibold text-sm text-accent">{f.label}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {f.key === "algoritmiche" && "Preview del motore combinatorio: logica e UX sono pronte, ma le selezioni restano locali finche non arriva il feed odds dedicato."}
                  {f.key === "safe" && "Preview delle selezioni conservative. Le quote finali non sono ancora bookmaker match-by-match reali."}
                  {f.key === "value" && "Preview della value combo. Il valore reale verra calcolato quando sara attivo il comparatore quote."}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <div className="glass rounded-xl p-4 md:p-5 mb-8 border border-primary/10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">
                  Futures Odds Comparison
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Feed dedicato a outrights e mercati futures, separato dalle quote
                match-by-match.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={selectedCompetitionId || "__auto__"}
                onValueChange={(value) =>
                  setSelectedCompetitionId(value === "__auto__" ? "" : value)
                }
              >
                <SelectTrigger className="w-64 h-9 bg-secondary/60 border-border/50 text-xs">
                  <SelectValue placeholder="Seleziona competizione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__auto__">Scelta automatica</SelectItem>
                  {futuresCompetitions.map((competition) => (
                    <SelectItem key={competition.id} value={competition.id}>
                      {competition.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                onClick={() => setFuturesRefreshKey((current) => current + 1)}
                className="h-9 w-9 rounded-lg border border-border/40 bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
                aria-label="Aggiorna futures"
              >
                <RefreshCw
                  className={`w-4 h-4 ${futuresLoading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-4">
            {futuresLoaded && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Odds Comparison Futures
              </span>
            )}
            {futuresLoading && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/50 text-muted-foreground border border-border/30">
                Caricamento futures...
              </span>
            )}
            {futuresNotice && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/50 text-muted-foreground border border-border/30">
                {futuresNotice}
              </span>
            )}
          </div>

          {futuresMarkets.length > 0 ? (
            <div className="grid xl:grid-cols-3 md:grid-cols-2 gap-4">
              {futuresMarkets.slice(0, 3).map((market) => (
                <FuturesMarketCard key={market.id} market={market} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/40 bg-secondary/20 px-4 py-6">
              <div className="text-sm font-semibold text-foreground mb-1">
                Nessun futures market disponibile
              </div>
              <p className="text-xs text-muted-foreground">
                Questo feed copre mercati outright futures. Per quote evento 1X2,
                O/U e comparazione bookmaker match-by-match servono gli odds Sportmonks
                (pre-match/live secondo il piano) e il comparatore interno quando esposto dal feed.
              </p>
            </div>
          )}
        </div>

        {/* Main panel */}
        <Tabs defaultValue="algoritmiche">
          <TabsList className="glass mb-6 h-11">
            {COMBO_TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key}
                className="text-xs font-semibold data-[state=active]:bg-accent/10 data-[state=active]:text-accent">
                <t.icon className="w-3.5 h-3.5 mr-1.5" />{t.label}
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
