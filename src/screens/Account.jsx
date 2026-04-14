"use client";

import React, { useState } from "react";
import { Crown, Bell, Star, Shield, ChevronRight, LogOut, BadgeCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import GlassCard from "@/components/shared/GlassCard";
import { useApp } from "@/lib/AppContext";
import { LEAGUES } from "@/lib/mockData";
import { Link, useNavigate } from "@/lib/router-compat";

export default function Account() {
  const {
    user,
    isPremium,
    isAdmin,
    billing,
    clearBillingState,
    signOut,
  } = useApp();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState({
    valueBet: true,
    liveAlert: true,
    formazioni: true,
    combo: false,
  });
  const [favLeagues, setFavLeagues] = useState([
    "Serie A",
    "Champions League",
  ]);
  const [billingMessage, setBillingMessage] = useState("");
  const [billingLoading, setBillingLoading] = useState(false);

  const toggleLeague = (league) => {
    setFavLeagues((prev) =>
      prev.includes(league)
        ? prev.filter((item) => item !== league)
        : [...prev, league]
    );
  };

  const openBillingPortal = async () => {
    if (!billing.customerId) {
      setBillingMessage("Nessun customer Stripe collegato a questo account.");
      return;
    }

    setBillingLoading(true);
    setBillingMessage("");

    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: billing.customerId,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Billing Portal non disponibile.");
      }

      if (!payload.url) {
        throw new Error("URL Billing Portal non disponibile.");
      }

      window.location.href = payload.url;
    } catch (error) {
      setBillingMessage(
        error.message || "Impossibile aprire il Billing Portal Stripe."
      );
    } finally {
      setBillingLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-orbitron font-bold text-xl md:text-2xl text-foreground mb-8">
          IL MIO <span className="text-primary">ACCOUNT</span>
        </h1>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <GlassCard>
              <div className="text-center mb-4">
                <div
                  className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-2xl font-black mb-3 ${
                    isPremium
                      ? "bg-accent/20 border-2 border-accent/40 text-accent"
                      : "bg-secondary text-muted-foreground border-2 border-border/50"
                  }`}
                >
                  {user.avatar}
                </div>
                <h3 className="font-semibold text-foreground">{user.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {billing.email || user.email}
                </p>
              </div>
              <div
                className={`p-3 rounded-xl text-center ${
                  isPremium
                    ? "bg-accent/10 border border-accent/20"
                    : "bg-secondary/30 border border-border/30"
                }`}
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Crown
                    className={`w-4 h-4 ${
                      isPremium ? "text-accent" : "text-muted-foreground"
                    }`}
                  />
                  <span
                    className={`font-semibold text-sm ${
                      isPremium ? "text-accent" : "text-muted-foreground"
                    }`}
                  >
                    Piano {user.planLabel}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wide">
                  Ruolo: {isAdmin ? "admin" : user.role}
                </div>
                {billing.currentPeriodEnd && (
                  <span className="text-xs text-muted-foreground">
                    Scadenza:{" "}
                    {new Date(billing.currentPeriodEnd).toLocaleDateString("it-IT")}
                  </span>
                )}
                {billing.subscriptionStatus && (
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Stato Stripe: {billing.subscriptionStatus}
                  </div>
                )}
              </div>
              {!isPremium && (
                <Link to="/premium" className="mt-3 block">
                  <button className="w-full py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-xs hover:bg-primary/20 transition-all">
                    Passa a Premium
                  </button>
                </Link>
              )}
              {billingMessage && (
                <div className="mt-3 text-xs text-muted-foreground">
                  {billingMessage}
                </div>
              )}
            </GlassCard>

            <GlassCard>
              <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-3">
                Sicurezza Account
              </h3>
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-secondary/30">
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <BadgeCheck className="w-4 h-4 text-primary" />
                    Email {user.emailVerified ? "verificata" : "non verificata"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Sessione server-side attiva e account associato a identita reale.
                  </div>
                </div>
                {billing.customerId && (
                  <button
                    onClick={clearBillingState}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-muted-foreground hover:bg-secondary/30"
                  >
                    Scollega mirror billing locale
                  </button>
                )}
                <button
                  onClick={async () => {
                    await signOut();
                    navigate("/login", { replace: true });
                  }}
                  className="w-full flex items-center gap-2 text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-muted-foreground hover:bg-secondary/30"
                >
                  <LogOut className="w-3.5 h-3.5" /> Esci dall'account
                </button>
              </div>
            </GlassCard>
          </div>

          <div className="md:col-span-2 space-y-4">
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-4 h-4 text-foreground" />
                <h3 className="font-semibold text-sm text-foreground">
                  Notifiche
                </h3>
              </div>
              <div className="space-y-3">
                {[
                  {
                    key: "valueBet",
                    label: "Value Bet rilevate",
                    desc: "Alert quando viene identificato un valore",
                  },
                  {
                    key: "liveAlert",
                    label: "Alert Live",
                    desc: "Notifiche per alta pressione e eventi importanti",
                  },
                  {
                    key: "formazioni",
                    label: "Formazioni confermate",
                    desc: "Avviso quando escono le formazioni ufficiali",
                  },
                  {
                    key: "combo",
                    label: "Nuove combo premium",
                    desc: "Notifica per nuove multiple algoritmiche",
                  },
                ].map((notification) => (
                  <div
                    key={notification.key}
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary/30"
                  >
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {notification.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {notification.desc}
                      </div>
                    </div>
                    <Switch
                      checked={notifs[notification.key]}
                      onCheckedChange={(value) =>
                        setNotifs((prev) => ({
                          ...prev,
                          [notification.key]: value,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-4 h-4 text-accent" />
                <h3 className="font-semibold text-sm text-foreground">
                  Competizioni preferite
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {LEAGUES.map((league) => (
                  <button
                    key={league}
                    onClick={() => toggleLeague(league)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      favLeagues.includes(league)
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    {league}
                  </button>
                ))}
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm text-foreground">
                  Account
                </h3>
              </div>
              <div className="space-y-2">
                <Link
                  to="/watchlist"
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-all"
                >
                  <span className="text-sm text-foreground">Gestisci watchlist</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
                <button
                  onClick={openBillingPortal}
                  disabled={!billing.customerId || billingLoading}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-sm text-foreground">
                    {billingLoading
                      ? "Apertura Billing Portal..."
                      : "Gestisci abbonamento Stripe"}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-all"
                  >
                    <span className="text-sm text-foreground">Area admin</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                )}
                <button className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-all">
                  <span className="text-sm text-foreground">Privacy & dati</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
