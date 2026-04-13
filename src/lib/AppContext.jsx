"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

const AppContext = createContext({});
const BILLING_STORAGE_KEY = "top-football-billing";

export const MOCK_USERS = {
  guest: {
    id: "guest",
    name: "Ospite",
    email: "ospite@demo.com",
    plan: "free",
    planLabel: "Free",
    planExpiry: null,
    avatar: "G",
  },
  premium: {
    id: "premium",
    name: "Marco Rossi",
    email: "marco@demo.com",
    plan: "premium",
    planLabel: "Premium",
    planExpiry: "31/12/2026",
    avatar: "M",
    favoriteLeagues: ["Serie A", "Champions League"],
    notifications: {
      valueBet: true,
      liveAlert: true,
      formazioni: true,
      combo: false,
    },
  },
};

const INITIAL_NOTIFICATIONS = [
  { id: 1, type: "value_bet", title: "Value Bet Rilevata", message: "Inter vs Milan - 1 @2.40 con valore +12%", time: "5 min fa", read: false },
  { id: 2, type: "live_alert", title: "Alta Pressione Offensiva", message: "Inter sta dominando il match. Indice: 78%", time: "12 min fa", read: false },
  { id: 3, type: "combo", title: "Nuova Combo Premium", message: "Combo algoritminca disponibile: x6.34", time: "1 ora fa", read: true },
  { id: 4, type: "odds_drop", title: "Quota in Calo", message: "Juventus vs Napoli - 1: da 2.80 a 2.65", time: "2 ore fa", read: true },
  { id: 5, type: "lineup", title: "Formazione Confermata", message: "Inter ha confermato la formazione ufficiale", time: "3 ore fa", read: true },
];

export function AppProvider({ children }) {
  const [userMode, setUserMode] = useState("guest"); // "guest" | "premium"
  const [user, setUser] = useState(MOCK_USERS.guest);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [favorites, setFavorites] = useState({ matches: [], teams: [], players: [] });
  const [filters, setFilters] = useState({ league: "all", valueOnly: false, sort: "time", view: "grid" });
  const [billing, setBilling] = useState({
    plan: "free",
    isPremium: false,
    customerId: null,
    email: null,
    subscriptionStatus: null,
    currentPeriodEnd: null,
    source: "local_demo",
  });

  const syncBilling = React.useCallback((nextBilling) => {
    setBilling((current) => ({ ...current, ...nextBilling }));
  }, []);

  useEffect(() => {
    setUser(MOCK_USERS[userMode]);
  }, [userMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedBilling = window.localStorage.getItem(BILLING_STORAGE_KEY);

      if (!storedBilling) {
        return;
      }

      const parsedBilling = JSON.parse(storedBilling);

      if (parsedBilling?.isPremium) {
        syncBilling({
          ...parsedBilling,
          source: "stripe_checkout",
        });
      }
    } catch {}
  }, [syncBilling]);

  useEffect(() => {
    if (billing.isPremium) {
      setUser((current) => ({
        ...MOCK_USERS.premium,
        email: billing.email || current.email || MOCK_USERS.premium.email,
        planExpiry: billing.currentPeriodEnd
          ? new Date(billing.currentPeriodEnd).toLocaleDateString("it-IT")
          : MOCK_USERS.premium.planExpiry,
      }));
      return;
    }

    setUser(MOCK_USERS[userMode]);
  }, [billing, userMode]);

  const isPremium = billing.isPremium || user.plan === "premium";

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const markRead = (id) => setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));

  const toggleFavoriteMatch = (id) => {
    setFavorites((prev) => ({
      ...prev,
      matches: prev.matches.includes(id) ? prev.matches.filter((m) => m !== id) : [...prev.matches, id],
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

  const saveBillingState = React.useCallback((nextBilling) => {
    if (typeof window === "undefined") {
      return;
    }

    const value = {
      ...billing,
      ...nextBilling,
    };

    window.localStorage.setItem(BILLING_STORAGE_KEY, JSON.stringify(value));
    syncBilling(value);
  }, [billing, syncBilling]);

  const clearBillingState = React.useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(BILLING_STORAGE_KEY);
    }

    syncBilling({
      plan: "free",
      isPremium: false,
      customerId: null,
      email: null,
      subscriptionStatus: null,
      currentPeriodEnd: null,
      source: "local_demo",
    });
  }, [syncBilling]);

  return (
    <AppContext.Provider value={{
      user, userMode, setUserMode, isPremium,
      billing, saveBillingState, clearBillingState,
      notifications, unreadCount, markAllRead, markRead,
      favorites, toggleFavoriteMatch, toggleFavoriteTeam, toggleFavoritePlayer,
      filters, setFilters,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
