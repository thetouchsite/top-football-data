import React, { useEffect, useMemo, useState } from "react";
import { isDatiLiveFeatureEnabled } from "@/lib/feature-flags";
import { Link } from "@/lib/router-compat";
import { motion } from "framer-motion";
import {
  TrendingUp, BarChart3, Zap, Send, Users, FileText, Heart, Check, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLivescoresInplay, getScheduleWindow } from "@/api/football";
import FootballMediaImage from "@/components/shared/FootballMediaImage";
import LeadGuideForm from "@/components/public/LeadGuideForm";
import { trackConversionEvent } from "@/components/public/conversion-events";

const PILLARS = [
  {
    icon: TrendingUp,
    title: "Modelli Predittivi",
    desc: "Algoritmi basati su dati reali, non intuizioni",
  },
  {
    icon: BarChart3,
    title: "Analisi Statistica",
    desc: "Studio approfondito di performance e trend",
  },
  {
    icon: Zap,
    title: "Dati Live",
    desc: "Analisi live in rollout progressivo",
  },
];

export default function Landing() {
  const pillars = useMemo(() => PILLARS, []);
  const [landingMetrics, setLandingMetrics] = useState({
    liveCount: 0,
    scheduleCount: 0,
    valueCount: 0,
  });
  const [previewMatch, setPreviewMatch] = useState(null);

  useEffect(() => {
    let isActive = true;

    const loadLandingMetrics = async () => {
      try {
        const schedulePayload = await getScheduleWindow(14);
        const livePayload = isDatiLiveFeatureEnabled()
          ? await getLivescoresInplay()
          : { matches: [] };

        if (!isActive) {
          return;
        }

        const scheduleMatches = Array.isArray(schedulePayload.matches)
          ? schedulePayload.matches
          : [];
        const liveMatches = Array.isArray(livePayload.matches)
          ? livePayload.matches
          : [];

        setLandingMetrics({
          liveCount: liveMatches.length,
          scheduleCount: scheduleMatches.length,
          valueCount: scheduleMatches.filter((match) => match.valueBet).length,
        });
        setPreviewMatch(scheduleMatches[0] || liveMatches[0] || null);
      } catch {}
    };

    loadLandingMetrics();

    return () => {
      isActive = false;
    };
  }, []);

  const stats = useMemo(
    () => [
      { value: `+${landingMetrics.scheduleCount}`, label: "match in schedule", icon: Users },
      { value: `+${landingMetrics.valueCount}`, label: "value bet rilevati", icon: FileText },
      { value: `+${landingMetrics.liveCount}`, label: "partite live", icon: Heart },
    ],
    [landingMetrics]
  );

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* BG overlay */}
      <div 
        className="fixed inset-0 opacity-20 bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: "linear-gradient(to bottom, rgba(8,15,30,0.3), rgba(8,15,30,0.95))" }}
      />

      {/* Hero */}
      <section className="relative z-10 mx-auto w-full min-w-0 max-w-7xl px-4 pb-16 pt-10 sm:px-8 md:pt-16">
        <div className="grid items-stretch gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
          {/* Left - Form */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-orbitron font-black text-3xl md:text-5xl leading-tight mb-4 tracking-wide">
              I DATI CHE<br />
              ANTICIPANO<br />
              <span className="text-primary text-glow-green">LE PARTITE</span>
            </h1>
            <p className="text-muted-foreground text-sm md:text-base mb-2">
              Non scommettere a caso.
            </p>
            <p className="text-foreground font-semibold text-base md:text-lg mb-8">
              Analizza come un <span className="text-accent">professionista.</span>
            </p>

            <LeadGuideForm source="landing_hero_form" />
          </motion.div>

          {/* Right - Pillars */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            <div className="mb-6">
              <h2 className="font-orbitron font-bold text-xl md:text-2xl mb-2">
                Non siamo tipster. <span className="text-primary">Siamo analisti.</span>
              </h2>
              <p className="text-sm text-muted-foreground">
                Applichiamo risultati basati su dati reali, non intuizioni.
              </p>
            </div>

            {pillars.map((p, i) => (
              <div key={i} className="glass rounded-xl p-5 flex items-start gap-4 hover:border-primary/20 transition-all">
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <p.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                    <span>{p.title}</span>
                    {p.title === "Dati Live" && !isDatiLiveFeatureEnabled() && (
                      <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                        In Arrivo
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground">{p.desc}</p>
                </div>
              </div>
            ))}

            {/* Compact match preview */}
            <div className="mx-auto w-full max-w-2xl rounded-2xl border border-border/40 bg-gradient-to-br from-secondary/45 to-background/90 px-4 py-4 text-center shadow-[0_10px_24px_rgba(0,0,0,0.16)] md:px-6 md:py-5">
              {previewMatch ? (
                <>
                  <div className="mb-3 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
                    <span className="truncate text-accent">{previewMatch.league}</span>
                    <span className="text-muted-foreground/70">·</span>
                    <span>{previewMatch.time || `${previewMatch.minute || 0}'`}</span>
                  </div>

                  <div className="mx-auto mb-3 w-full max-w-xl">
                    <div className="flex items-center justify-center gap-4 md:gap-5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <FootballMediaImage
                          media={previewMatch.home_media}
                          fallbackLabel={previewMatch.homeShort || previewMatch.home}
                          alt={previewMatch.home}
                          size="lg"
                        />
                        <span className="truncate text-lg font-semibold text-foreground md:text-xl">
                          {previewMatch.home}
                        </span>
                      </div>
                      <span className="shrink-0 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        VS
                      </span>
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="truncate text-lg font-semibold text-foreground md:text-xl">
                          {previewMatch.away}
                        </span>
                        <FootballMediaImage
                          media={previewMatch.away_media}
                          fallbackLabel={previewMatch.awayShort || previewMatch.away}
                          alt={previewMatch.away}
                          size="lg"
                        />
                      </div>
                    </div>
                  </div>
                  {"homeScore" in previewMatch ? (
                    <div className="font-orbitron text-xl font-black text-foreground">
                      {previewMatch.homeScore}-{previewMatch.awayScore}
                    </div>
                  ) : (
                    <>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Quote 1X2
                      </div>
                      <div className="mx-auto max-w-[19rem] rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-base font-semibold text-primary">
                        1: {previewMatch.odds?.home} &nbsp; X: {previewMatch.odds?.draw} &nbsp; 2: {previewMatch.odds?.away}
                      </div>
                      <div className="mt-1.5 text-[11px] text-muted-foreground">Quote pre-match</div>
                    </>
                  )}
                </>
              ) : (
                <div className="py-8 text-center">
                  <BarChart3 className="mx-auto mb-2 h-12 w-12 text-primary/40" />
                  <span className="text-xs text-muted-foreground">Dashboard Preview</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Telegram section */}
      <section className="relative z-10 border-y border-border/30 py-10">
        <div className="mx-auto w-full min-w-0 max-w-7xl px-4 sm:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-orbitron font-bold text-lg md:text-xl mb-1">
                Entra nel nostro <span className="text-accent">canale dati privato</span>
              </h3>
              <p className="text-sm text-muted-foreground">Oltre +3.000 utenti attivi</p>
            </div>
            <a
              href={String(process.env.NEXT_PUBLIC_TELEGRAM_URL || "").trim() || "/come-funziona#telegram"}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackConversionEvent("click_telegram_cta", { source: "landing_telegram_block" })}
            >
              <Button className="w-full shrink-0 bg-accent px-4 text-center text-sm font-bold text-accent-foreground glow-gold hover:bg-accent/90 sm:w-auto md:text-base">
                <Send className="mr-2 inline h-4 w-4 shrink-0" />
                ACCEDI AL CANALE TELEGRAM
              </Button>
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            {["Analisi giornaliere", "Movimenti quote", "Insight live"].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 py-16">
        <div className="mx-auto w-full min-w-0 max-w-7xl px-4 sm:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="font-orbitron font-black text-3xl md:text-4xl text-primary text-glow-green mb-1">
                  {stat.value}
                </div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 py-16 border-t border-border/30">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Star className="w-5 h-5 text-accent" />
            <span className="text-sm font-semibold text-accent uppercase tracking-wider">Accesso gratuito limitato</span>
          </div>
          <p className="text-muted-foreground text-sm mb-6">
            Il manuale potrebbe diventare a pagamento. <span className="font-semibold text-foreground">Scaricalo ora</span>
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Link to="/register" onClick={() => trackConversionEvent("click_register_cta", { source: "landing_final_cta" })}>
              <Button size="lg" className="bg-primary text-primary-foreground font-bold text-base px-10 glow-green hover:bg-primary/90">
                REGISTRATI GRATIS
              </Button>
            </Link>
            <Link to="/come-funziona#premium" onClick={() => trackConversionEvent("click_premium_cta", { source: "landing_final_cta" })}>
              <Button size="lg" variant="outline" className="text-base px-10 font-bold">
                SCOPRI PREMIUM
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

