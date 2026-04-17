import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Crown,
  Check,
  X,
  Zap,
  TrendingUp,
  Star,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import GlassCard from "@/components/shared/GlassCard";
import { useApp } from "@/lib/AppContext";
import { useNavigate } from "@/lib/router-compat";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "EUR 0",
    period: "/mese",
    desc: "Accesso base alla piattaforma",
    features: [
      { label: "Probabilita modello 1X2", yes: true },
      { label: "Dashboard Sportmonks-first", yes: true },
      { label: "Top 3 partite del giorno", yes: true },
      { label: "Freshness e provenance del dato", yes: true },
      { label: "xG pre-match", yes: false },
      { label: "Risultati esatti probabili", yes: false },
      { label: "Value Bet identificazione", yes: false },
      { label: "Analisi statistica completa", yes: false },
      { label: "Lineup status provider-driven", yes: false },
      { label: "Dati live avanzati", yes: false },
      { label: "Smart Multi-Bet Engine reale", yes: false },
      { label: "Comparatore quote match-by-match", yes: false },
      { label: "Alert automatici", yes: false },
      { label: "Canale Telegram privato", yes: false },
    ],
    cta: "Piano attuale",
    ctaDisabled: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: "EUR 29",
    period: "/mese",
    desc: "Accesso completo a tutti i dati e strumenti",
    popular: true,
    features: [
      { label: "Probabilita modello 1X2", yes: true },
      { label: "Dashboard Sportmonks-first", yes: true },
      { label: "Top 3 partite del giorno", yes: true },
      { label: "Freshness e provenance del dato", yes: true },
      { label: "xG pre-match", yes: true },
      { label: "Risultati esatti probabili", yes: true },
      { label: "Value Bet derivata", yes: true },
      { label: "Analisi statistica fixture", yes: true },
      { label: "Lineup status provider-driven", yes: true },
      { label: "Dati live avanzati", yes: true },
      { label: "Futures odds (quando disponibili)", yes: true },
      { label: "Smart Multi-Bet Engine reale", yes: false },
      { label: "Comparatore quote match-by-match", yes: false },
      { label: "Alert automatici", yes: false },
      { label: "Canale Telegram privato", yes: false },
    ],
    cta: "ATTIVA CON STRIPE",
    ctaDisabled: false,
  },
];

const TRUST = [
  {
    icon: Shield,
    label: "Checkout Stripe",
    desc: "Pagamento e rinnovo via Stripe Checkout",
  },
  {
    icon: TrendingUp,
    label: "Billing Portal",
    desc: "Gestione abbonamento dal portale cliente",
  },
  {
    icon: Star,
    label: "Premium reale",
    desc: "Legato all'identita utente e non al vecchio demo mode",
  },
  {
    icon: Zap,
    label: "Upgrade rapido",
    desc: "Attivazione immediata dopo il checkout verificato",
  },
];

export default function Premium() {
  const { isAuthenticated, user, billing, saveBillingState } = useApp();
  const navigate = useNavigate();
  const [loadingPlanId, setLoadingPlanId] = useState("");
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [checkoutState, setCheckoutState] = useState({
    checkoutStatus: "",
    sessionId: "",
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setCheckoutState({
      checkoutStatus: params.get("checkout") || "",
      sessionId: params.get("session_id") || "",
    });
  }, []);

  useEffect(() => {
    let isActive = true;

    const verifyCheckoutSession = async () => {
      if (checkoutState.checkoutStatus !== "success" || !checkoutState.sessionId) {
        if (checkoutState.checkoutStatus === "cancelled") {
          setCheckoutMessage("Checkout Stripe annullato.");
        }
        return;
      }

      try {
        const response = await fetch(
          `/api/billing/session?session_id=${encodeURIComponent(
            checkoutState.sessionId
          )}`
        );
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Impossibile verificare il checkout.");
        }

        if (!isActive) {
          return;
        }

        await saveBillingState({
          ...payload.billing,
          source: "stripe_checkout",
        });
        setCheckoutMessage("Abbonamento Premium attivato correttamente.");
      } catch (error) {
        if (isActive) {
          setCheckoutMessage(
            error.message || "Checkout completato ma non verificato."
          );
        }
      }
    };

    verifyCheckoutSession();

    return () => {
      isActive = false;
    };
  }, [checkoutState, saveBillingState]);

  const handleCheckout = async (planId) => {
    if (!isAuthenticated) {
      navigate("/register?next=/premium");
      return;
    }

    setLoadingPlanId(planId);
    setCheckoutMessage("");

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId,
          email: billing.email || user.email,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Checkout Stripe non disponibile.");
      }

      if (!payload.url) {
        throw new Error("URL checkout Stripe non disponibile.");
      }

      window.location.href = payload.url;
    } catch (error) {
      setCheckoutMessage(
        error.message || "Impossibile avviare il checkout Stripe."
      );
      setLoadingPlanId("");
    }
  };

  const hasStripePremium = useMemo(
    () =>
      Boolean(
        billing.isPremium &&
        String(billing.plan || "").toLowerCase() === "premium"
      ),
    [billing.isPremium, billing.plan]
  );

  return (
    <div className="app-page">
      <div className="app-content-wide">
        <div className="text-center mb-12">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center mx-auto mb-4">
            <Crown className="w-7 h-7 text-accent" />
          </div>
          <h1 className="font-orbitron font-black text-2xl md:text-4xl tracking-wide mb-3">
            SCEGLI IL TUO <span className="text-accent text-glow-gold">PIANO</span>
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm md:text-base">
            Nessuna fuffa da tipster. Solo analisi statistica, modelli matematici e dati concreti.
          </p>
          <div className="mt-4 inline-flex px-3 py-2 rounded-xl border border-border/30 bg-secondary/30 text-muted-foreground text-xs">
            Alcune feature premium dipendono ancora dal provider odds match-by-match in integrazione.
          </div>
          {checkoutMessage && (
            <div className="mt-4 inline-flex px-3 py-2 rounded-xl border border-primary/20 bg-primary/10 text-primary text-xs font-semibold">
              {checkoutMessage}
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-12">
          {PLANS.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.15 }}
            >
              <GlassCard
                className={`relative h-full ${
                  plan.popular ? "border-accent/30 glow-gold" : "border-border/30"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-accent text-accent-foreground text-xs font-bold px-4 py-1 rounded-full">
                      CONSIGLIATO
                    </span>
                  </div>
                )}
                <div className="text-center mb-5 pt-2">
                  <h2
                    className={`font-orbitron font-bold text-xl mb-1 ${
                      plan.popular ? "text-accent" : "text-foreground"
                    }`}
                  >
                    {plan.name}
                  </h2>
                  <div className="flex items-end justify-center gap-1">
                    <span
                      className={`font-orbitron font-black text-4xl ${
                        plan.popular ? "text-accent" : "text-foreground"
                      }`}
                    >
                      {plan.price}
                    </span>
                    <span className="text-sm text-muted-foreground mb-1">
                      {plan.period}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{plan.desc}</p>
                </div>

                <div className="space-y-2 mb-6">
                  {plan.features.map((feature) => (
                    <div key={feature.label} className="flex items-center gap-2">
                      {feature.yes ? (
                        <Check
                          className={`w-3.5 h-3.5 flex-shrink-0 ${
                            plan.popular ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                      ) : (
                        <X className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground/40" />
                      )}
                      <span
                        className={`text-xs ${
                          feature.yes ? "text-foreground" : "text-muted-foreground/50"
                        }`}
                      >
                        {feature.label}
                      </span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => !plan.ctaDisabled && handleCheckout(plan.id)}
                  disabled={
                    plan.ctaDisabled ||
                    (plan.id === "premium" && hasStripePremium) ||
                    loadingPlanId === plan.id
                  }
                  className={`w-full font-bold text-sm ${
                    plan.popular
                      ? "bg-primary text-primary-foreground glow-green hover:bg-primary/90"
                      : "bg-secondary text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  {loadingPlanId === plan.id
                    ? "Reindirizzamento..."
                    : plan.id === "premium" && hasStripePremium
                      ? "Piano attivo"
                      : plan.id === "premium" && !isAuthenticated
                        ? "Accedi per attivare"
                        : plan.cta}
                </Button>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {TRUST.map((item) => (
            <GlassCard key={item.label} className="text-center">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-2">
                <item.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="text-xs font-semibold text-foreground mb-1">
                {item.label}
              </div>
              <div className="text-xs text-muted-foreground">{item.desc}</div>
            </GlassCard>
          ))}
        </div>

        <GlassCard className="max-w-2xl mx-auto">
          <h3 className="font-semibold text-foreground mb-4">Domande frequenti</h3>
          <div className="space-y-4">
            {[
              {
                q: "Siete tipster?",
                a: "No. Offriamo analisi statistica, modelli predittivi e identificazione di valore statistico.",
              },
              {
                q: "Come funziona il pagamento?",
                a: "Il piano premium viene attivato tramite Stripe Checkout e puo essere gestito dal Billing Portal.",
              },
              {
                q: "Posso disdire in qualsiasi momento?",
                a: "Si. Se hai un customer Stripe attivo, puoi gestire o cancellare il piano dal tuo account.",
              },
            ].map((faq) => (
              <div
                key={faq.q}
                className="border-b border-border/30 pb-4 last:border-0"
              >
                <div className="text-sm font-semibold text-foreground mb-1">
                  {faq.q}
                </div>
                <div className="text-xs text-muted-foreground">{faq.a}</div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
