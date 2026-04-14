"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, UserRoundPlus } from "lucide-react";

import GlassCard from "@/components/shared/GlassCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  authClient,
  isGoogleAuthConfigured,
  isGoogleOneTapEnabled,
} from "@/lib/auth-client";
import { Link, useNavigate } from "@/lib/router-compat";

function resolveAuthErrorMessage(error, fallbackMessage) {
  return (
    error?.error?.message ||
    error?.data?.message ||
    error?.message ||
    fallbackMessage
  );
}

function mapOAuthErrorToMessage(errorCode) {
  const normalizedCode = String(errorCode || "").trim().toLowerCase();

  if (!normalizedCode) {
    return "";
  }

  if (normalizedCode === "access_denied") {
    return "Registrazione Google annullata o negata. Verifica di usare un account test autorizzato.";
  }

  if (normalizedCode === "state_not_found" || normalizedCode === "state_mismatch") {
    return "La sessione Google e scaduta. Riprova dal pulsante Google.";
  }

  if (normalizedCode === "please_restart_the_process") {
    return "Riavvia il flusso Google e prova di nuovo.";
  }

  return `Accesso Google non riuscito (${normalizedCode}).`;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [nextPath, setNextPath] = useState("/account");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(params.get("next") || "/account");
    setError(mapOAuthErrorToMessage(params.get("error")));
  }, []);

  useEffect(() => {
    if (
      !isGoogleAuthConfigured ||
      !isGoogleOneTapEnabled ||
      typeof authClient.oneTap !== "function"
    ) {
      return;
    }

    const callbackURL = new URL(nextPath, window.location.origin).toString();

    authClient.oneTap({
      callbackURL,
    }).catch(() => {});
  }, [nextPath]);

  const handleChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const result = await authClient.signUp.email({
        name: form.name,
        email: form.email.trim().toLowerCase(),
        password: form.password,
        callbackURL: nextPath,
      });

      if (result.error) {
        throw new Error(
          resolveAuthErrorMessage(result, "Registrazione non riuscita.")
        );
      }

      navigate(nextPath, { replace: true });
    } catch (nextError) {
      setError(resolveAuthErrorMessage(nextError, "Registrazione non riuscita."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setSubmitting(true);
    setError("");

    try {
      const callbackURL = new URL(nextPath, window.location.origin).toString();
      await authClient.signIn.social({
        provider: "google",
        callbackURL,
        newUserCallbackURL: callbackURL,
        errorCallbackURL: new URL(
          `/register?next=${encodeURIComponent(nextPath)}`,
          window.location.origin
        ).toString(),
      });
    } catch (nextError) {
      setError(
        resolveAuthErrorMessage(nextError, "Accesso con Google non riuscito.")
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <GlassCard className="border-accent/20">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
              <UserRoundPlus className="w-6 h-6 text-accent" />
            </div>
            <h1 className="font-orbitron font-black text-2xl text-foreground">
              CREA ACCOUNT
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Base solida per wishlist, premium e permessi admin.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Nome"
              value={form.name}
              onChange={handleChange("name")}
              className="bg-secondary/60 border-border/50"
              required
            />
            <Input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange("email")}
              className="bg-secondary/60 border-border/50"
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange("password")}
              className="bg-secondary/60 border-border/50"
              minLength={8}
              required
            />
            {error && (
              <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-primary-foreground glow-green-sm hover:bg-primary/90"
            >
              {submitting ? "Creazione account..." : "Crea account"}
            </Button>
          </form>

          {isGoogleAuthConfigured && (
            <>
              <div className="mt-5 mb-4 flex items-center gap-3 text-[11px] uppercase tracking-[0.24em] text-muted-foreground/70">
                <div className="h-px flex-1 bg-border/40" />
                <span>Oppure</span>
                <div className="h-px flex-1 bg-border/40" />
              </div>

              <Button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={submitting}
                variant="outline"
                className="w-full border-border/50 bg-secondary/40 hover:bg-secondary/60"
              >
                Continua con Google
              </Button>
            </>
          )}

          <div className="mt-6 flex items-center justify-between text-xs">
            <Link
              to={`/login?next=${encodeURIComponent(nextPath)}`}
              className="text-primary hover:text-primary/80"
            >
              Hai gia un account?
            </Link>
          </div>

          <div className="mt-6 p-3 rounded-xl bg-secondary/30 border border-border/30 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground font-semibold mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              Fondazione account reale
            </div>
            Ogni utente avra identita, sessione e dati separati in modo coerente.
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
