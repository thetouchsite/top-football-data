import React, { useEffect, useMemo, useState } from "react";
import { isDatiLiveFeatureEnabled } from "@/lib/feature-flags";
import { Link } from "@/lib/router-compat";
import { motion } from "framer-motion";
import {
  TrendingUp, BarChart3, Zap, Download, Send, Users, FileText, Heart,
  Check, Lock, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { getLivescoresInplay, getScheduleWindow } from "@/api/football";

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
    desc: "Leggi le partite mentre si giocano",
  },
];

export default function Landing() {
  const pillars = useMemo(
    () =>
      isDatiLiveFeatureEnabled()
        ? PILLARS
        : PILLARS.filter((p) => p.title !== "Dati Live"),
    []
  );

  const [form, setForm] = useState({ nome: "", email: "", eta: "", telefono: "" });
  const [submitting, setSubmitting] = useState(false);
  const [landingMetrics, setLandingMetrics] = useState({
    liveCount: 0,
    scheduleCount: 0,
    valueCount: 0,
  });
  const [previewMatch, setPreviewMatch] = useState(null);

  const handleChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Invio non riuscito.");
      }

      setForm({ nome: "", email: "", eta: "", telefono: "" });
      toast({
        title: "Richiesta inviata",
        description: "Lead salvata correttamente su MongoDB.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Errore invio",
        description: error.message || "Controlla la configurazione del server.",
      });
    } finally {
      setSubmitting(false);
    }
  };

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

      {/* Top bar */}
      <header className="relative z-10 flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border/30 px-4 py-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/25">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <span className="font-orbitron text-[11px] font-bold uppercase tracking-[0.14em] text-foreground">
            Top <span className="text-primary">Football</span> Data
          </span>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
              Accedi
            </Button>
          </Link>
          <Link to="/register">
            <Button size="sm" className="bg-primary text-primary-foreground font-semibold text-xs glow-green-sm">
              Crea Account
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto w-full min-w-0 max-w-7xl px-4 pb-16 pt-8 sm:px-8 md:pt-16">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
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

            {/* Lead form */}
            <div className="app-panel max-w-md rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <Download className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm text-foreground">Scarica GRATIS</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">il Manuale degli Analisti Pro</p>

              <div className="space-y-1.5 mb-4 text-xs">
                <div className="flex items-center gap-2 text-primary"><Check className="w-3 h-3" /><span className="text-foreground">Metodo per leggere le quote</span></div>
                <div className="flex items-center gap-2 text-primary"><Check className="w-3 h-3" /><span className="text-foreground">Come individuare valore nelle partite</span></div>
                <div className="flex items-center gap-2 text-primary"><Check className="w-3 h-3" /><span className="text-foreground">Strategie reali (no fuffa da tipster)</span></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <Input
                  placeholder="Nome"
                  value={form.nome}
                  onChange={handleChange("nome")}
                  className="bg-secondary/60 border-border/50 text-foreground placeholder:text-muted-foreground text-sm h-10"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="La tua email"
                    value={form.email}
                    onChange={handleChange("email")}
                    className="bg-secondary/60 border-border/50 text-foreground placeholder:text-muted-foreground text-sm h-10"
                  />
                  <Input
                    placeholder="Età"
                    value={form.eta}
                    onChange={handleChange("eta")}
                    className="bg-secondary/60 border-border/50 text-foreground placeholder:text-muted-foreground text-sm h-10"
                  />
                </div>
                <Input
                  placeholder="Telefono (opzionale)"
                  value={form.telefono}
                  onChange={handleChange("telefono")}
                  className="bg-secondary/60 border-border/50 text-foreground placeholder:text-muted-foreground text-sm h-10"
                />
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary text-primary-foreground font-bold text-sm h-11 glow-green hover:bg-primary/90"
                >
                  {submitting ? "INVIO IN CORSO..." : "SCARICA GRATIS ORA"}
                </Button>
              </form>
              <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                <Lock className="w-3 h-3" />
                <span>100% gratuito · No spam · Accesso immediato</span>
              </div>
            </div>
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
                  <h3 className="font-semibold text-foreground mb-1">{p.title}</h3>
                  <p className="text-sm text-muted-foreground">{p.desc}</p>
                </div>
              </div>
            ))}

            {/* Live dashboard preview */}
            <div className="glass rounded-xl p-4 text-center border-accent/20">
              <div className="h-40 rounded-lg bg-gradient-to-br from-secondary/80 to-background flex items-center justify-center">
                {previewMatch ? (
                  <div className="w-full max-w-sm text-left p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-accent font-semibold">{previewMatch.league}</span>
                      <span className="text-xs text-muted-foreground">
                        {previewMatch.time || `${previewMatch.minute || 0}'`}
                      </span>
                    </div>
                    <div className="mb-1 break-words font-semibold text-foreground line-clamp-3">
                      {previewMatch.home} vs {previewMatch.away}
                    </div>
                    {"homeScore" in previewMatch ? (
                      <div className="font-orbitron text-2xl font-black text-foreground">
                        {previewMatch.homeScore}-{previewMatch.awayScore}
                      </div>
                    ) : (
                      <div className="text-sm text-primary">
                        1 / X / 2: {previewMatch.odds?.home} / {previewMatch.odds?.draw} / {previewMatch.odds?.away}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-2">
                      Preview live dal feed Sportmonks
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-primary/40 mx-auto mb-2" />
                    <span className="text-xs text-muted-foreground">Dashboard Preview</span>
                  </div>
                )}
              </div>
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
            <Button className="w-full shrink-0 bg-accent px-4 text-center text-sm font-bold text-accent-foreground glow-gold hover:bg-accent/90 sm:w-auto md:text-base">
              <Send className="mr-2 inline h-4 w-4 shrink-0" />
              ACCEDI AL CANALE TELEGRAM
            </Button>
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
          <Button size="lg" className="bg-primary text-primary-foreground font-bold text-base px-10 glow-green hover:bg-primary/90">
            SCARICA GRATIS ORA
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/30 py-6">
        <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col items-center justify-between gap-3 px-4 text-xs text-muted-foreground sm:px-8 md:flex-row">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-3 h-3 text-primary" />
            <span className="font-orbitron tracking-wider">TOP FOOTBALL DATA</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center md:justify-end">
            <span>Privacy Policy</span>
            <span>Termini & Condizioni</span>
            <span>© 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

