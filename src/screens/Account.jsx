"use client";

import React, { useEffect, useState } from "react";
import {
  BadgeCheck,
  Bell,
  ChevronRight,
  Crown,
  LogOut,
  Shield,
  Star,
  UserRound,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GlassCard from "@/components/shared/GlassCard";
import { useApp } from "@/lib/AppContext";
import { LEAGUES } from "@/lib/mockData";
import { Link, useNavigate } from "@/lib/router-compat";

function formatAuthProvider(provider) {
  if (provider === "google") return "Google";
  if (provider === "credential") return "Email e password";
  return provider || "Non disponibile";
}

export default function Account() {
  const {
    user,
    isPremium,
    isAdmin,
    billing,
    signOut,
    account,
    accountNotifications,
    preferredCompetitions,
    favorites,
    following,
    saveProfile,
    saveAccountPreferences,
    profileSaving,
    preferencesSaving,
  } = useApp();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user.name || "");
  const [profileMessage, setProfileMessage] = useState("");
  const [featuredCompetitions, setFeaturedCompetitions] = useState(
    preferredCompetitions
  );
  const [preferencesMessage, setPreferencesMessage] = useState("");
  const [billingMessage, setBillingMessage] = useState("");
  const [billingLoading, setBillingLoading] = useState(false);
  const authProviders = Array.isArray(account?.meta?.authProviders)
    ? account.meta.authProviders
    : [];
  const savedDisplayName = account?.profile?.displayName || user.name || "";

  useEffect(() => {
    setDisplayName(savedDisplayName);
  }, [savedDisplayName]);

  useEffect(() => {
    setFeaturedCompetitions(preferredCompetitions);
  }, [preferredCompetitions]);

  useEffect(() => {
    const normalizedValue = String(displayName || "").trim();
    const normalizedSaved = String(savedDisplayName || "").trim();

    if (!normalizedValue || normalizedValue === normalizedSaved) {
      if (!profileSaving) {
        setProfileMessage("");
      }
      return;
    }

    setProfileMessage("Salvataggio...");

    const timeoutId = window.setTimeout(async () => {
      try {
        await saveProfile({ displayName: normalizedValue });
        setProfileMessage("Profilo aggiornato.");
      } catch (error) {
        setProfileMessage(
          error.message || "Impossibile aggiornare il profilo."
        );
      }
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [displayName, saveProfile, savedDisplayName]);

  useEffect(() => {
    if (!profileMessage || profileSaving || profileMessage === "Salvataggio...") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setProfileMessage("");
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [profileMessage, profileSaving]);

  useEffect(() => {
    if (
      !preferencesMessage ||
      preferencesSaving ||
      preferencesMessage === "Salvataggio..."
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPreferencesMessage("");
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [preferencesMessage, preferencesSaving]);

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

  const toggleFeaturedCompetition = async (competition) => {
    const nextCompetitions = featuredCompetitions.includes(competition)
      ? featuredCompetitions.filter((item) => item !== competition)
      : [...featuredCompetitions, competition];

    setFeaturedCompetitions(nextCompetitions);
    setPreferencesMessage("Salvataggio...");

    try {
      await saveAccountPreferences({
        notifications: accountNotifications,
        preferredCompetitions: nextCompetitions,
      });
      setPreferencesMessage("Preferenze aggiornate.");
    } catch (error) {
      setFeaturedCompetitions(preferredCompetitions);
      setPreferencesMessage(
        error.message || "Impossibile aggiornare le preferenze."
      );
    }
  };

  return (
    <div className="app-page">
      <div className="app-content-narrow">
        <h1 className="font-orbitron font-bold text-xl md:text-2xl text-foreground mb-8">
          IL MIO <span className="text-primary">ACCOUNT</span>
        </h1>

        <div className="grid min-w-0 gap-6 md:grid-cols-3">
          <div className="min-w-0 space-y-4">
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
              </div>

              {!isPremium && (
                <Link to="/premium" className="mt-3 block">
                  <button className="w-full py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-xs hover:bg-primary/20 transition-all">
                    Passa a Premium
                  </button>
                </Link>
              )}
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <UserRound className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Profilo</h3>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="account-display-name"
                    className="text-xs text-muted-foreground"
                  >
                    Nome visualizzato
                  </Label>
                  <Input
                    id="account-display-name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Nome account"
                    className="bg-secondary/30 border-border/40"
                  />
                </div>

                <div className="p-3 rounded-xl bg-secondary/30">
                  <div className="text-xs text-muted-foreground">Email account</div>
                  <div className="text-sm font-medium text-foreground mt-1">
                    {user.email || "Non disponibile"}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-secondary/30">
                  <div className="text-xs text-muted-foreground">
                    Accesso configurato
                  </div>
                  <div className="text-sm font-medium text-foreground mt-1">
                    {authProviders.length > 0
                      ? authProviders.map(formatAuthProvider).join(" + ")
                      : "Non disponibile"}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground min-h-4">
                  {profileSaving ? "Salvataggio..." : profileMessage}
                </div>
              </div>
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

                <button
                  onClick={async () => {
                    await signOut();
                    navigate("/login", { replace: true });
                  }}
                  className="w-full flex items-center gap-2 text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-muted-foreground hover:bg-secondary/30"
                >
                  <LogOut className="w-3.5 h-3.5" /> Esci dall&apos;account
                </button>
              </div>
            </GlassCard>
          </div>

          <div className="min-w-0 space-y-4 md:col-span-2">
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-4 h-4 text-accent" />
                <h3 className="font-semibold text-sm text-foreground">
                  Competizioni in evidenza
                </h3>
              </div>

              <div className="flex flex-wrap gap-2">
                {LEAGUES.map((league) => (
                  <button
                    key={league}
                    onClick={() => toggleFeaturedCompetition(league)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      featuredCompetitions.includes(league)
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    {league}
                  </button>
                ))}
              </div>

              <div className="mt-4 text-xs text-muted-foreground">
                Usate per personalizzare dashboard e priorita dei contenuti.
              </div>
              <div className="mt-2 text-xs text-muted-foreground min-h-4">
                {preferencesSaving ? "Salvataggio..." : preferencesMessage}
              </div>
            </GlassCard>

            <div className="grid md:grid-cols-2 gap-4">
              <GlassCard>
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-accent" />
                  <h3 className="font-semibold text-sm text-foreground">
                    Preferiti
                  </h3>
                </div>
                <div className="text-xs text-muted-foreground mb-4">
                  Match e giocatori salvati per ritrovarli rapidamente. Nessun
                  alert implicito.
                </div>
                <div className="text-sm text-foreground mb-4">
                  {favorites.matches.length} match, {favorites.players.length} giocatori
                </div>
                <Link
                  to="/preferiti"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-xs hover:bg-primary/20 transition-all"
                >
                  Gestisci preferiti
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </GlassCard>

              <GlassCard>
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm text-foreground">
                    Seguiti
                  </h3>
                </div>
                <div className="text-xs text-muted-foreground mb-4">
                  Match, giocatori e competizioni monitorati. Qui sono collegate
                  anche le impostazioni notifiche.
                </div>
                <div className="text-sm text-foreground mb-4">
                  {following.matches.length} match, {following.players.length} giocatori, {following.competitions.length} competizioni
                </div>
                <Link
                  to="/seguiti"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-xs hover:bg-primary/20 transition-all"
                >
                  Gestisci seguiti
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </GlassCard>
            </div>

            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm text-foreground">
                  Account e abbonamento
                </h3>
              </div>

              <div className="space-y-2">
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

                <div className="p-3 rounded-xl bg-secondary/30">
                  <div className="text-sm text-foreground font-medium">
                    Dati account
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Profilo, preferiti, seguiti e personalizzazione vengono salvati
                    sul database associato all&apos;utente autenticato.
                  </div>
                </div>
              </div>

              {billingMessage && (
                <div className="mt-3 text-xs text-muted-foreground">
                  {billingMessage}
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
