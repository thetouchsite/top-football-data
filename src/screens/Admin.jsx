"use client";

import React, { useEffect, useState } from "react";
import { Shield, Crown, Users, RefreshCcw } from "lucide-react";

import GlassCard from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";

function formatDate(value) {
  if (!value) return "N/D";
  return new Date(value).toLocaleString("it-IT");
}

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/users", {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Impossibile caricare gli utenti.");
      }

      setUsers(Array.isArray(payload.users) ? payload.users : []);
    } catch (nextError) {
      setError(nextError.message || "Impossibile caricare gli utenti.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div className="app-page">
      <div className="app-content-wide">
        <div className="mb-8 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-3 font-orbitron text-2xl font-black text-foreground">
              <Shield className="w-6 h-6 text-accent" />
              AREA ADMIN
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Vista iniziale di utenti, ruoli e stato premium reale.
            </p>
          </div>
          <Button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className="w-full shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Aggiorna
          </Button>
        </div>

        {error && (
          <GlassCard className="mb-6 border-destructive/20">
            <div className="text-sm text-destructive">{error}</div>
          </GlassCard>
        )}

        <div className="mb-6 grid min-w-0 grid-cols-2 gap-4 md:grid-cols-4">
          <GlassCard>
            <div className="text-xs text-muted-foreground mb-1">Utenti</div>
            <div className="font-orbitron font-black text-2xl text-foreground">{users.length}</div>
          </GlassCard>
          <GlassCard>
            <div className="text-xs text-muted-foreground mb-1">Premium</div>
            <div className="font-orbitron font-black text-2xl text-accent">
              {users.filter((user) => user.isPremium).length}
            </div>
          </GlassCard>
          <GlassCard>
            <div className="text-xs text-muted-foreground mb-1">Admin</div>
            <div className="font-orbitron font-black text-2xl text-primary">
              {users.filter((user) => String(user.role || "").toLowerCase() === "admin").length}
            </div>
          </GlassCard>
          <GlassCard>
            <div className="text-xs text-muted-foreground mb-1">Verificati</div>
            <div className="font-orbitron font-black text-2xl text-foreground">
              {users.filter((user) => user.emailVerified).length}
            </div>
          </GlassCard>
        </div>

        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm text-foreground">Utenti registrati</h2>
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground">Caricamento utenti...</div>
          ) : !users.length ? (
            <div className="text-sm text-muted-foreground">Nessun utente trovato.</div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id || user.email}
                  className="p-4 rounded-xl bg-secondary/30 border border-border/30"
                >
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground">{user.name || "Utente"}</div>
                      <div className="break-all text-xs text-muted-foreground">{user.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] uppercase tracking-wide px-2 py-1 rounded-full bg-secondary/70 text-muted-foreground border border-border/40">
                        {user.role || "user"}
                      </span>
                      {user.isPremium && (
                        <span className="text-[11px] uppercase tracking-wide px-2 py-1 rounded-full bg-accent/10 text-accent border border-accent/20 inline-flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          premium
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid md:grid-cols-4 gap-2 mt-3 text-xs text-muted-foreground">
                    <div>Email verificata: {user.emailVerified ? "si" : "no"}</div>
                    <div>Piano: {user.plan || "free"}</div>
                    <div>Creato: {formatDate(user.createdAt)}</div>
                    <div>Aggiornato: {formatDate(user.updatedAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
