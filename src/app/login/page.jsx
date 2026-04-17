"use client";

import React, { useEffect, useState } from "react";
import { Shield, LockKeyhole, ArrowRight } from "lucide-react";

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
    return "Accesso Google annullato o negato. Riprova e seleziona un account autorizzato.";
  }

  if (normalizedCode === "state_not_found" || normalizedCode === "state_mismatch") {
    return "Sessione OAuth scaduta o non valida. Riavvia il login con Google.";
  }

  if (normalizedCode === "please_restart_the_process") {
    return "Il flusso Google va riavviato. Riprova dal pulsante Google.";
  }

  return `Accesso Google non riuscito (${normalizedCode}).`;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [nextPath, setNextPath] = useState("/dashboard");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(params.get("next") || "/dashboard");
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const result = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
        rememberMe: true,
        callbackURL: nextPath,
      });

      if (result.error) {
        throw new Error(resolveAuthErrorMessage(result, "Accesso non riuscito."));
      }

      navigate(nextPath, { replace: true });
    } catch (nextError) {
      setError(resolveAuthErrorMessage(nextError, "Accesso non riuscito."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    setError("");

    try {
      const callbackURL = new URL(nextPath, window.location.origin).toString();
      await authClient.signIn.social({
        provider: "google",
        callbackURL,
        errorCallbackURL: new URL(
          `/login?next=${encodeURIComponent(nextPath)}`,
          window.location.origin
        ).toString(),
      });
    } catch (nextError) {
      setError(resolveAuthErrorMessage(nextError, "Accesso con Google non riuscito."));
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <GlassCard className="border-primary/20">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
              <LockKeyhole className="w-6 h-6 text-primary" />
            </div>
            <h1 className="font-orbitron font-black text-2xl text-foreground">
              ACCEDI
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Login sicuro per utenti, premium e admin.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="bg-secondary/60 border-border/50"
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="bg-secondary/60 border-border/50"
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
              {submitting ? "Accesso in corso..." : "Accedi"}
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
                onClick={handleGoogleSignIn}
                disabled={submitting}
                variant="outline"
                className="w-full border-border/50 bg-secondary/40 hover:bg-secondary/60"
              >
                Continua con Google
              </Button>
            </>
          )}

          <div className="mt-6 flex flex-col gap-3 text-xs sm:flex-row sm:items-center sm:justify-between">
            <Link
              to={`/register?next=${encodeURIComponent(nextPath)}`}
              className="text-primary hover:text-primary/80"
            >
              Crea account
            </Link>
            <Link to="/" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
              Torna alla home <ArrowRight className="w-3 h-3 shrink-0" />
            </Link>
          </div>

          <div className="mt-6 p-3 rounded-xl bg-secondary/30 border border-border/30 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground font-semibold mb-1">
              <Shield className="w-3.5 h-3.5 text-primary" />
              Sessione protetta lato server
            </div>
            Ruoli e accessi vengono valutati sul server, non piu solo nel client.
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
