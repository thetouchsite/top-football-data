"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { authClient } from "@/lib/auth-client";

const AppContext = createContext({});
const BILLING_STORAGE_KEY = "top-football-billing";
const LEGACY_FAVORITES_STORAGE_KEY = "top-football-favorites-v2";
const EMPTY_BILLING_STATE = {
  plan: "free",
  isPremium: false,
  customerId: null,
  subscriptionId: null,
  email: null,
  subscriptionStatus: null,
  currentPeriodEnd: null,
  source: "local_support_state",
  updatedAt: null,
};

const GUEST_USER = {
  id: "guest",
  name: "Guest",
  email: null,
  avatar: "G",
  plan: "free",
  planLabel: "Free",
  role: "guest",
  isPremium: false,
  emailVerified: false,
};

const INITIAL_NOTIFICATIONS = [
  { id: 1, type: "value_bet", title: "Value Bet Rilevata", message: "Inter vs Milan - 1 @2.40 con valore +12%", time: "5 min fa", read: false },
  { id: 2, type: "live_alert", title: "Alta Pressione Offensiva", message: "Inter sta dominando il match. Indice: 78%", time: "12 min fa", read: false },
  { id: 3, type: "combo", title: "Nuova Combo Premium", message: "Combo algoritminca disponibile: x6.34", time: "1 ora fa", read: true },
  { id: 4, type: "odds_drop", title: "Quota in Calo", message: "Juventus vs Napoli - 1: da 2.80 a 2.65", time: "2 ore fa", read: true },
  { id: 5, type: "lineup", title: "Formazione Confermata", message: "Inter ha confermato la formazione ufficiale", time: "3 ore fa", read: true },
];

function buildUserFromSession(session, billing) {
  if (!session?.user) {
    return GUEST_USER;
  }

  const role = String(session.user.role || "user").toLowerCase();
  const isPremium =
    role === "admin" || role === "premium" || Boolean(billing?.isPremium || session.user.isPremium);
  const plan = billing?.plan || session.user.plan || (isPremium ? "premium" : "free");
  const planLabel = role === "admin" ? "Admin" : isPremium ? "Premium" : "Free";
  const displayName = String(session.user.name || session.user.email || "Utente");

  return {
    id: session.user.id,
    name: displayName,
    email: session.user.email || null,
    avatar: displayName.charAt(0).toUpperCase() || "U",
    plan,
    planLabel,
    role,
    isPremium,
    emailVerified: Boolean(session.user.emailVerified),
  };
}

export function AppProvider({ children }) {
  const authSession = authClient.useSession();
  const [serverSession, setServerSession] = useState(null);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [favorites, setFavorites] = useState({ matches: [], teams: [], players: [] });
  const [favoritesReady, setFavoritesReady] = useState(false);
  const [filters, setFilters] = useState({ league: "all", valueOnly: false, sort: "time", view: "grid" });
  const [billing, setBilling] = useState(EMPTY_BILLING_STATE);
  const [billingReady, setBillingReady] = useState(false);
  const [accountReady, setAccountReady] = useState(false);

  const refreshAccountState = React.useCallback(async () => {
    try {
      const response = await fetch("/api/account/session", {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Impossibile recuperare la sessione account.");
      }

      setServerSession(payload.session || null);
      setBilling({
        ...EMPTY_BILLING_STATE,
        ...(payload.billing || {}),
      });
    } catch {
      setServerSession(null);
      setBilling(EMPTY_BILLING_STATE);
    } finally {
      setBillingReady(true);
      setAccountReady(true);
    }
  }, []);

  useEffect(() => {
    if (authSession.isPending) {
      return;
    }

    refreshAccountState();
  }, [authSession.data?.user?.id, authSession.isPending, refreshAccountState]);

  const resolvedSession = serverSession || authSession.data || null;
  const user = useMemo(
    () => buildUserFromSession(resolvedSession, billing),
    [resolvedSession, billing]
  );
  const isAuthenticated = Boolean(resolvedSession?.user?.id);
  const isPremium = Boolean(user.isPremium);
  const isAdmin = user.role === "admin";

  const favoritesStorageKey = useMemo(
    () => `top-football-favorites-v3:${user.id || "guest"}`,
    [user.id]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setFavoritesReady(false);

    try {
      const storedFavorites = window.localStorage.getItem(favoritesStorageKey);
      const legacyFavorites = window.localStorage.getItem(LEGACY_FAVORITES_STORAGE_KEY);
      const parsedFavorites = JSON.parse(storedFavorites || legacyFavorites || "null");

      setFavorites({
        matches: Array.isArray(parsedFavorites?.matches)
          ? parsedFavorites.matches.map((id) => String(id))
          : [],
        teams: Array.isArray(parsedFavorites?.teams) ? parsedFavorites.teams : [],
        players: Array.isArray(parsedFavorites?.players) ? parsedFavorites.players : [],
      });
    } catch {
      setFavorites({ matches: [], teams: [], players: [] });
    } finally {
      setFavoritesReady(true);
    }
  }, [favoritesStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !favoritesReady) {
      return;
    }

    window.localStorage.setItem(
      favoritesStorageKey,
      JSON.stringify({
        matches: favorites.matches.map((id) => String(id)),
        teams: favorites.teams,
        players: favorites.players,
      })
    );
  }, [favorites, favoritesReady, favoritesStorageKey]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const markRead = (id) => setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));

  const toggleFavoriteMatch = (id) => {
    const normalizedId = String(id);
    setFavorites((prev) => ({
      ...prev,
      matches: prev.matches.includes(normalizedId)
        ? prev.matches.filter((matchId) => matchId !== normalizedId)
        : [...prev.matches, normalizedId],
    }));
  };

  const toggleFavoriteTeam = (name) => {
    setFavorites((prev) => ({
      ...prev,
      teams: prev.teams.includes(name) ? prev.teams.filter((t) => t !== name) : [...prev.teams, name],
    }));
  };

  const toggleFavoritePlayer = (name) => {
    setFavorites((prev) => ({
      ...prev,
      players: prev.players.includes(name) ? prev.players.filter((p) => p !== name) : [...prev.players, name],
    }));
  };

  const saveBillingState = React.useCallback(async (nextBilling) => {
    if (typeof window !== "undefined") {
      const value = {
        ...EMPTY_BILLING_STATE,
        ...billing,
        ...nextBilling,
      };

      window.localStorage.setItem(BILLING_STORAGE_KEY, JSON.stringify(value));
    }

    await refreshAccountState();
  }, [billing, refreshAccountState]);

  const clearBillingState = React.useCallback(async () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(BILLING_STORAGE_KEY);
    }

    await refreshAccountState();
  }, [refreshAccountState]);

  const signOut = React.useCallback(async () => {
    await authClient.signOut();
    setServerSession(null);
    setFavorites({ matches: [], teams: [], players: [] });
    await refreshAccountState();
  }, [refreshAccountState]);

  return (
    <AppContext.Provider value={{
      user,
      isAuthenticated,
      isPremium,
      isAdmin,
      authSession,
      billing,
      billingReady,
      accountReady,
      saveBillingState,
      clearBillingState,
      refreshAccountState,
      signOut,
      notifications,
      unreadCount,
      markAllRead,
      markRead,
      favorites,
      toggleFavoriteMatch,
      toggleFavoriteTeam,
      toggleFavoritePlayer,
      filters,
      setFilters,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
