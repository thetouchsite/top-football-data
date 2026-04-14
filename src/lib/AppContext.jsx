"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

import {
  ACCOUNT_NOTIFICATION_SETTINGS,
  createDefaultAccountState,
} from "@/lib/account-config";
import { authClient } from "@/lib/auth-client";

const AppContext = createContext({});
const BILLING_STORAGE_KEY = "top-football-billing";
const LEGACY_FAVORITES_STORAGE_KEY = "top-football-favorites-v2";
const LEGACY_FOLLOWING_STORAGE_KEY = "top-football-following-v1";
const WATCHLIST_MIGRATION_MARKER_KEY = "top-football-favorites-migrated-v1";
const FOLLOWING_MIGRATION_MARKER_KEY = "top-football-following-migrated-v1";
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

function sanitizeUniqueStrings(values = []) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );
}

function normalizeWatchlistState(value) {
  return {
    matches: sanitizeUniqueStrings(value?.matches).map((entry) => String(entry)),
    teams: sanitizeUniqueStrings(value?.teams),
    players: sanitizeUniqueStrings(value?.players),
  };
}

function normalizeFollowingState(value) {
  return {
    matches: sanitizeUniqueStrings(value?.matches).map((entry) => String(entry)),
    teams: sanitizeUniqueStrings(value?.teams),
    players: sanitizeUniqueStrings(value?.players),
    competitions: sanitizeUniqueStrings(value?.competitions),
  };
}

function normalizeAccountState(value, fallback) {
  const defaultState = fallback || createDefaultAccountState();

  return {
    profile: {
      ...defaultState.profile,
      ...(value?.profile || {}),
    },
    preferences: {
      notifications: {
        ...ACCOUNT_NOTIFICATION_SETTINGS,
        ...(value?.preferences?.notifications || {}),
      },
      preferredCompetitions:
        sanitizeUniqueStrings(value?.preferences?.preferredCompetitions).length > 0
          ? sanitizeUniqueStrings(value?.preferences?.preferredCompetitions)
          : defaultState.preferences.preferredCompetitions,
    },
    watchlist: normalizeWatchlistState(value?.watchlist || defaultState.watchlist),
    following: normalizeFollowingState(value?.following || defaultState.following),
    meta: {
      ...(defaultState.meta || {}),
      ...(value?.meta || {}),
    },
  };
}

function areStringArraysEqual(left = [], right = []) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((entry, index) => entry === right[index]);
}

function areWatchlistsEqual(left, right) {
  return (
    areStringArraysEqual(left?.matches || [], right?.matches || []) &&
    areStringArraysEqual(left?.teams || [], right?.teams || []) &&
    areStringArraysEqual(left?.players || [], right?.players || [])
  );
}

function areFollowingsEqual(left, right) {
  return (
    areStringArraysEqual(left?.matches || [], right?.matches || []) &&
    areStringArraysEqual(left?.teams || [], right?.teams || []) &&
    areStringArraysEqual(left?.players || [], right?.players || []) &&
    areStringArraysEqual(left?.competitions || [], right?.competitions || [])
  );
}

function mergeWatchlists(primary, secondary) {
  return {
    matches: sanitizeUniqueStrings([...(primary?.matches || []), ...(secondary?.matches || [])]),
    teams: sanitizeUniqueStrings([...(primary?.teams || []), ...(secondary?.teams || [])]),
    players: sanitizeUniqueStrings([...(primary?.players || []), ...(secondary?.players || [])]),
  };
}

function mergeFollowings(primary, secondary) {
  return {
    matches: sanitizeUniqueStrings([...(primary?.matches || []), ...(secondary?.matches || [])]),
    teams: sanitizeUniqueStrings([...(primary?.teams || []), ...(secondary?.teams || [])]),
    players: sanitizeUniqueStrings([...(primary?.players || []), ...(secondary?.players || [])]),
    competitions: sanitizeUniqueStrings([...(primary?.competitions || []), ...(secondary?.competitions || [])]),
  };
}

function buildUserFromSession(session, billing, accountState) {
  if (!session?.user) {
    return GUEST_USER;
  }

  const role = String(session.user.role || "user").toLowerCase();
  const isPremium =
    role === "admin" || role === "premium" || Boolean(billing?.isPremium || session.user.isPremium);
  const plan = billing?.plan || session.user.plan || (isPremium ? "premium" : "free");
  const planLabel = role === "admin" ? "Admin" : isPremium ? "Premium" : "Free";
  const displayName = String(
    accountState?.profile?.displayName || session.user.name || session.user.email || "Utente"
  );

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
  const [followingItems, setFollowingItems] = useState({
    matches: [],
    teams: [],
    players: [],
    competitions: [],
  });
  const [followingReady, setFollowingReady] = useState(false);
  const [filters, setFilters] = useState({ league: "all", valueOnly: false, sort: "time", view: "grid" });
  const [billing, setBilling] = useState(EMPTY_BILLING_STATE);
  const [billingReady, setBillingReady] = useState(false);
  const [accountReady, setAccountReady] = useState(false);
  const [accountState, setAccountState] = useState(() => createDefaultAccountState());
  const [profileSaving, setProfileSaving] = useState(false);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [watchlistSaving, setWatchlistSaving] = useState(false);
  const [followingSaving, setFollowingSaving] = useState(false);
  const migrationRef = useRef("");
  const followingMigrationRef = useRef("");

  const patchAccountResource = React.useCallback(async (path, payload) => {
    const response = await fetch(path, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Operazione account non riuscita.");
    }

    return result;
  }, []);

  const refreshAccountState = React.useCallback(async () => {
    try {
      const response = await fetch("/api/account/session", {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Impossibile recuperare la sessione account.");
      }

      const fallbackAccount = createDefaultAccountState({
        userId: payload?.session?.user?.id,
        email: payload?.session?.user?.email,
        displayName: payload?.session?.user?.name,
      });

      setServerSession(payload.session || null);
      setBilling({
        ...EMPTY_BILLING_STATE,
        ...(payload.billing || {}),
      });
      setAccountState(normalizeAccountState(payload.account, fallbackAccount));
    } catch {
      setServerSession(null);
      setBilling(EMPTY_BILLING_STATE);
      setAccountState(createDefaultAccountState());
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
    () => buildUserFromSession(resolvedSession, billing, accountState),
    [resolvedSession, billing, accountState]
  );
  const isAuthenticated = Boolean(resolvedSession?.user?.id);
  const isPremium = Boolean(user.isPremium);
  const isAdmin = user.role === "admin";

  const favoritesStorageKey = useMemo(
    () => `top-football-favorites-v3:${user.id || "guest"}`,
    [user.id]
  );
  const favoritesMigrationKey = useMemo(
    () => `${WATCHLIST_MIGRATION_MARKER_KEY}:${user.id || "guest"}`,
    [user.id]
  );
  const followingStorageKey = useMemo(
    () => `top-football-following-v2:${user.id || "guest"}`,
    [user.id]
  );
  const followingMigrationKey = useMemo(
    () => `${FOLLOWING_MIGRATION_MARKER_KEY}:${user.id || "guest"}`,
    [user.id]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setFavoritesReady(false);

    if (isAuthenticated) {
      const serverWatchlist = normalizeWatchlistState(accountState?.watchlist);
      const alreadyMigrated =
        window.localStorage.getItem(favoritesMigrationKey) === "done";

      if (alreadyMigrated) {
        setFavorites(serverWatchlist);
        setFavoritesReady(true);
        return;
      }

      const storedFavorites = window.localStorage.getItem(favoritesStorageKey);
      const legacyFavorites = window.localStorage.getItem(LEGACY_FAVORITES_STORAGE_KEY);
      let localFavorites = { matches: [], teams: [], players: [] };

      try {
        localFavorites = normalizeWatchlistState(
          JSON.parse(storedFavorites || legacyFavorites || "null")
        );
      } catch {
        localFavorites = { matches: [], teams: [], players: [] };
      }

      const mergedFavorites = mergeWatchlists(serverWatchlist, localFavorites);
      const migrationKey = `${user.id}:${JSON.stringify(mergedFavorites)}`;

      const markWatchlistMigrationDone = () => {
        window.localStorage.setItem(
          favoritesStorageKey,
          JSON.stringify(mergedFavorites)
        );
        window.localStorage.setItem(favoritesMigrationKey, "done");
        window.localStorage.removeItem(LEGACY_FAVORITES_STORAGE_KEY);
      };

      setFavorites(mergedFavorites);
      setFavoritesReady(true);

      if (
        !areWatchlistsEqual(serverWatchlist, mergedFavorites) &&
        migrationRef.current !== migrationKey
      ) {
        migrationRef.current = migrationKey;

        patchAccountResource("/api/account/watchlist", {
          watchlist: mergedFavorites,
        })
          .then((result) => {
            const fallbackAccount = createDefaultAccountState({
              userId: user.id,
              email: user.email,
              displayName: user.name,
            });

            setAccountState((prev) =>
              normalizeAccountState(result.account, {
                ...fallbackAccount,
                ...prev,
              })
            );
            markWatchlistMigrationDone();
          })
          .catch(() => {
            migrationRef.current = "";
          });

        return;
      }

      markWatchlistMigrationDone();

      return;
    }

    try {
      const storedFavorites = window.localStorage.getItem(favoritesStorageKey);
      const legacyFavorites = window.localStorage.getItem(LEGACY_FAVORITES_STORAGE_KEY);
      const parsedFavorites = JSON.parse(storedFavorites || legacyFavorites || "null");

      setFavorites(normalizeWatchlistState(parsedFavorites));
    } catch {
      setFavorites({ matches: [], teams: [], players: [] });
    } finally {
      setFavoritesReady(true);
    }
  }, [
    accountState?.watchlist,
    favoritesStorageKey,
    favoritesMigrationKey,
    isAuthenticated,
    patchAccountResource,
    user.email,
    user.id,
    user.name,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setFollowingReady(false);

    if (isAuthenticated) {
      const serverFollowing = normalizeFollowingState(accountState?.following);
      const alreadyMigrated =
        window.localStorage.getItem(followingMigrationKey) === "done";

      if (alreadyMigrated) {
        setFollowingItems(serverFollowing);
        setFollowingReady(true);
        return;
      }

      const storedFollowing = window.localStorage.getItem(followingStorageKey);
      const legacyFollowing = window.localStorage.getItem(LEGACY_FOLLOWING_STORAGE_KEY);
      let localFollowing = {
        matches: [],
        teams: [],
        players: [],
        competitions: [],
      };

      try {
        localFollowing = normalizeFollowingState(
          JSON.parse(storedFollowing || legacyFollowing || "null")
        );
      } catch {
        localFollowing = {
          matches: [],
          teams: [],
          players: [],
          competitions: [],
        };
      }

      const mergedFollowing = mergeFollowings(serverFollowing, localFollowing);
      const migrationKey = `${user.id}:${JSON.stringify(mergedFollowing)}`;

      const markFollowingMigrationDone = () => {
        window.localStorage.setItem(
          followingStorageKey,
          JSON.stringify(mergedFollowing)
        );
        window.localStorage.setItem(followingMigrationKey, "done");
        window.localStorage.removeItem(LEGACY_FOLLOWING_STORAGE_KEY);
      };

      setFollowingItems(mergedFollowing);
      setFollowingReady(true);

      if (
        !areFollowingsEqual(serverFollowing, mergedFollowing) &&
        followingMigrationRef.current !== migrationKey
      ) {
        followingMigrationRef.current = migrationKey;

        patchAccountResource("/api/account/following", {
          following: mergedFollowing,
        })
          .then((result) => {
            const fallbackAccount = createDefaultAccountState({
              userId: user.id,
              email: user.email,
              displayName: user.name,
            });

            setAccountState((prev) =>
              normalizeAccountState(result.account, {
                ...fallbackAccount,
                ...prev,
              })
            );
            markFollowingMigrationDone();
          })
          .catch(() => {
            followingMigrationRef.current = "";
          });

        return;
      }

      markFollowingMigrationDone();

      return;
    }

    try {
      const storedFollowing = window.localStorage.getItem(followingStorageKey);
      const legacyFollowing = window.localStorage.getItem(LEGACY_FOLLOWING_STORAGE_KEY);
      const parsedFollowing = JSON.parse(storedFollowing || legacyFollowing || "null");

      setFollowingItems(normalizeFollowingState(parsedFollowing));
    } catch {
      setFollowingItems({
        matches: [],
        teams: [],
        players: [],
        competitions: [],
      });
    } finally {
      setFollowingReady(true);
    }
  }, [
    accountState?.following,
    followingStorageKey,
    followingMigrationKey,
    isAuthenticated,
    patchAccountResource,
    user.email,
    user.id,
    user.name,
  ]);

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

  useEffect(() => {
    if (typeof window === "undefined" || !followingReady) {
      return;
    }

    window.localStorage.setItem(
      followingStorageKey,
      JSON.stringify({
        matches: followingItems.matches.map((id) => String(id)),
        teams: followingItems.teams,
        players: followingItems.players,
        competitions: followingItems.competitions,
      })
    );
  }, [followingItems, followingReady, followingStorageKey]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const applyAccountResult = React.useCallback((nextAccount) => {
    const fallbackAccount = createDefaultAccountState({
      userId: user.id,
      email: user.email,
      displayName: user.name,
    });
    const normalizedAccount = normalizeAccountState(nextAccount, fallbackAccount);

    setAccountState(normalizedAccount);
    setFavorites(normalizedAccount.watchlist);
    setFollowingItems(normalizedAccount.following);
    setServerSession((prev) => {
      if (!prev?.user) {
        return prev;
      }

      return {
        ...prev,
        user: {
          ...prev.user,
          name: normalizedAccount.profile.displayName,
        },
      };
    });
  }, [user.email, user.id, user.name]);

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const markRead = (id) => setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));

  const persistWatchlist = React.useCallback(async (nextWatchlist) => {
    const normalizedWatchlist = normalizeWatchlistState(nextWatchlist);

    if (!isAuthenticated) {
      setFavorites(normalizedWatchlist);
      setAccountState((prev) => ({
        ...prev,
        watchlist: normalizedWatchlist,
      }));
      return;
    }

    setWatchlistSaving(true);

    try {
      const result = await patchAccountResource("/api/account/watchlist", {
        watchlist: normalizedWatchlist,
      });
      applyAccountResult(result.account);
    } finally {
      setWatchlistSaving(false);
    }
  }, [applyAccountResult, isAuthenticated, patchAccountResource]);

  const persistFollowing = React.useCallback(async (nextFollowing) => {
    const normalizedFollowing = normalizeFollowingState(nextFollowing);

    if (!isAuthenticated) {
      setFollowingItems(normalizedFollowing);
      setAccountState((prev) => ({
        ...prev,
        following: normalizedFollowing,
      }));
      return;
    }

    setFollowingSaving(true);

    try {
      const result = await patchAccountResource("/api/account/following", {
        following: normalizedFollowing,
      });
      applyAccountResult(result.account);
    } finally {
      setFollowingSaving(false);
    }
  }, [applyAccountResult, isAuthenticated, patchAccountResource]);

  const toggleFavoriteMatch = React.useCallback(async (id) => {
    const normalizedId = String(id);
    const nextWatchlist = {
      ...favorites,
      matches: favorites.matches.includes(normalizedId)
        ? favorites.matches.filter((matchId) => matchId !== normalizedId)
        : [...favorites.matches, normalizedId],
    };

    await persistWatchlist(nextWatchlist);
  }, [favorites, persistWatchlist]);

  const toggleFavoriteTeam = React.useCallback(async (name) => {
    const nextWatchlist = {
      ...favorites,
      teams: favorites.teams.includes(name)
        ? favorites.teams.filter((team) => team !== name)
        : [...favorites.teams, name],
    };

    await persistWatchlist(nextWatchlist);
  }, [favorites, persistWatchlist]);

  const toggleFavoritePlayer = React.useCallback(async (name) => {
    const nextWatchlist = {
      ...favorites,
      players: favorites.players.includes(name)
        ? favorites.players.filter((player) => player !== name)
        : [...favorites.players, name],
    };

    await persistWatchlist(nextWatchlist);
  }, [favorites, persistWatchlist]);

  const toggleFollowMatch = React.useCallback(async (id) => {
    const normalizedId = String(id);
    const nextFollowing = {
      ...followingItems,
      matches: followingItems.matches.includes(normalizedId)
        ? followingItems.matches.filter((matchId) => matchId !== normalizedId)
        : [...followingItems.matches, normalizedId],
    };

    await persistFollowing(nextFollowing);
  }, [followingItems, persistFollowing]);

  const toggleFollowPlayer = React.useCallback(async (name) => {
    const nextFollowing = {
      ...followingItems,
      players: followingItems.players.includes(name)
        ? followingItems.players.filter((player) => player !== name)
        : [...followingItems.players, name],
    };

    await persistFollowing(nextFollowing);
  }, [followingItems, persistFollowing]);

  const toggleFollowCompetition = React.useCallback(async (name) => {
    const nextFollowing = {
      ...followingItems,
      competitions: followingItems.competitions.includes(name)
        ? followingItems.competitions.filter((competition) => competition !== name)
        : [...followingItems.competitions, name],
    };

    await persistFollowing(nextFollowing);
  }, [followingItems, persistFollowing]);

  const saveProfile = React.useCallback(async ({ displayName }) => {
    if (!isAuthenticated) {
      throw new Error("Autenticazione richiesta.");
    }

    setProfileSaving(true);

    try {
      const result = await patchAccountResource("/api/account/profile", {
        displayName,
      });
      applyAccountResult(result.account);
      return result.account;
    } finally {
      setProfileSaving(false);
    }
  }, [applyAccountResult, isAuthenticated, patchAccountResource]);

  const saveAccountPreferences = React.useCallback(async ({
    notifications: nextNotifications,
    preferredCompetitions,
  }) => {
    if (!isAuthenticated) {
      throw new Error("Autenticazione richiesta.");
    }

    setPreferencesSaving(true);

    try {
      const result = await patchAccountResource("/api/account/preferences", {
        notifications: nextNotifications,
        preferredCompetitions,
      });
      applyAccountResult(result.account);
      return result.account;
    } finally {
      setPreferencesSaving(false);
    }
  }, [applyAccountResult, isAuthenticated, patchAccountResource]);

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
    setFollowingItems({ matches: [], teams: [], players: [], competitions: [] });
    setAccountState(createDefaultAccountState());
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
      account: accountState,
      watchlist: favorites,
      following: followingItems,
      accountNotifications: accountState.preferences.notifications,
      preferredCompetitions: accountState.preferences.preferredCompetitions,
      profileSaving,
      preferencesSaving,
      watchlistSaving,
      followingSaving,
      saveProfile,
      saveAccountPreferences,
      saveAccountFollowing: persistFollowing,
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
      toggleFollowMatch,
      toggleFollowPlayer,
      toggleFollowCompetition,
      filters,
      setFilters,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
